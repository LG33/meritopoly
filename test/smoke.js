// ============================================================
// Test de bout en bout : simule une partie complète de 10 cycles
// Exécuter : node test/smoke.js
// ============================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const ctx = { console, Math, JSON, Infinity, isFinite, parseInt, parseFloat, module: { exports: {} } };
vm.createContext(ctx);

['config', 'characters', 'board', 'events', 'laws'].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(root, 'js/data', f + '.js'), 'utf8'), ctx);
});
vm.runInContext(fs.readFileSync(path.join(root, 'js/engine.js'), 'utf8'), ctx);

const E = ctx.module.exports;
const g = () => E.getState();

let errors = 0;
function check(cond, msg) {
  if (!cond) { errors++; console.error('  ✗ FAIL: ' + msg); }
  else console.log('  ✓ ' + msg);
}
const rnd = n => 1 + Math.floor(Math.random() * n);

// ---------- Création ----------
console.log('— Création de partie —');
E.newGame(['Alice', 'Bob', 'Chloé', 'Dave']);
check(g().players.length === 4, '4 joueurs créés');
check(g().tiles.length === 40, 'plateau de 40 cases');
const counts = {};
g().tiles.forEach(t => counts[t.type] = (counts[t.type] || 0) + 1);
check(counts.prop === 18, '18 propriétés économiques (got ' + counts.prop + ')');
check(counts.bank === 4, '4 banques');
check(counts.chance === 3 && counts.commu === 3 && counts.malheur === 4, 'cases événements 3/3/4');
check(counts.housing === 4, '4 ensembles logements');

// ---------- Attribution ----------
console.log('— Attribution des personnages —');
for (let i = 0; i < 4; i++) E.assignCharacter(i, rnd(6));
check(E.allAssigned(), 'tous les personnages attribués');
check(new Set(g().players.map(p => p.char)).size === 4, 'personnages uniques');

// ---------- 10 cycles ----------
console.log('— Partie complète —');
let landings = 0, buys = 0, events = 0, votes = 0, loans = 0, trades = 0, deaths = 0;

for (let cycle = 1; cycle <= 10; cycle++) {
  check(g().cycle === cycle, `cycle ${cycle}`);
  for (let t = 0; t < 4; t++) {
    // chaque joueur joue (doubles → tour supplémentaire géré par next:'same')
    let guard = 0, next = 'play';
    while (guard++ < 3) {
      const r = E.roll(rnd(6), rnd(6));
      if (r.stayJail || r.jail) { next = E.endTurn().next; break; }
      const a = E.landOn();
      landings++;
      if (a.kind === 'event') events++;
      if (a.deaths && a.deaths.length) { a.deaths.forEach(pid => E.confirmDeath(pid)); deaths++; }
      // décisions simples
      if (a.kind === 'prop' && a.canBuy && Math.random() < 0.7) {
        const p = g().players[g().cur];
        if (p.money >= a.tile.price || Math.random() < 0.5) {
          const partners = Math.random() < 0.15 && g().players.length > 2 ? [g().players[(g().cur + 1) % 4].id] : [];
          const res = E.buyProperty(g().tiles.indexOf(a.tile), { partners });
          check(res.ok !== false, 'achat de propriété');
          buys++;
        }
      }
      if (a.kind === 'housing' && a.canBuy && Math.random() < 0.5) { E.buyHousing(g().tiles.indexOf(a.tile)); buys++; }
      if (a.kind === 'housing' && a.hlmOffer && Math.random() < 0.5) E.moveHLM();
      if (a.kind === 'bank' && Math.random() < 0.4) { E.bankLoan(1000); loans++; }
      if (a.kind === 'prop' && a.canImprove && Math.random() < 0.3) E.improveProperty(g().tiles.indexOf(a.tile));
      next = E.endTurn().next;
      if (next !== 'same') break;
      // double : le joueur rejoue
    }
    const r2 = { next };
    if (r2.next === 'vote') {
      // phase démocratique
      E.startVote();
      check(g().vote.options.length === 5, '5 cartes loi proposées');
      const lawIdx = rnd(5) - 1;
      E.chooseLaw(lawIdx);
      g().players.forEach(() => E.castVote(Math.random() < 0.5));
      const v = E.resolveVote();
      check(v.result && typeof v.result.adopted === 'boolean', 'vote résolu');
      votes++;
      const recap = E.afterVote();
      check(recap.rows.length === 4, 'récapitulatif pour 4 joueurs');
      // décès de vieillesse éventuels
      while (g().pendingDeaths && g().pendingDeaths.length) { E.confirmDeath(g().pendingDeaths[0]); deaths++; }
      // échanges aléatoires
      if (Math.random() < 0.3) {
        const st = g();
        const sellerTile = st.tiles.find(t2 => t2.owner !== null && t2.owner !== st.cur);
        if (sellerTile) {
          const r3 = E.tradeBuyProperty(sellerTile.owner, st.tiles.indexOf(sellerTile), Math.round(sellerTile.price * 1.2));
          check(typeof r3.ok === 'boolean', 'transaction entre joueurs');
          trades++;
        }
      }
      const cont = E.continueAfterRecap();
      if (cycle === 10) check(cont.next === 'end', 'fin de partie après le cycle 10');
    } else if (t === 3) {
      throw new Error('le dernier joueur doit déclencher le vote');
    }
  }
}

console.log(`— Statistiques : ${landings} atterrissages, ${buys} achats, ${events} événements, ${votes} votes, ${loans} emprunts, ${trades} transactions, ${deaths} successions —`);

// ---------- Résultats ----------
const res = E.finalResults();
check(res && res.objectives.length === 5, '5 objectifs collectifs évalués');
check(typeof res.win === 'boolean', 'verdict calculé');
const st = E.computeStats();
check(st.levels.length === 4 && st.levels.every(v => isFinite(v)), 'niveaux de vie calculés');
check(isFinite(st.giniIncome) && isFinite(st.giniWealth), 'indices d\'inégalités calculés');

// ---------- Sauvegarde / reprise (simulation localStorage) ----------
console.log('— Sauvegarde —');
const saved = JSON.parse(JSON.stringify(g()));
E.newGame(['X', 'Y']);
check(g().players.length === 2, 'nouvelle partie propre');
// restaure l'ancienne partie (comme localStorage)
vm.runInContext('S = ' + JSON.stringify(saved), ctx);
check(g().cycle === 10 && g().over === true, 'partie sauvegardée restaurée');

console.log(errors === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${errors} ÉCHEC(S)`);
process.exit(errors === 0 ? 0 : 1);
