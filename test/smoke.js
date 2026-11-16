// ============================================================
// Test de bout en bout : simule des parties complètes de 10 ans
// (1 an = 1 tour du plateau, fin d'année au passage du 1er joueur
// sur la case Départ).
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

// ---------- Génération des personnages (une seule étape) ----------
console.log('— Génération des personnages —');
const dice = [2, 6, 4, 1]; // Bob (6) le plus riche, Dave (1) le plus précaire
E.generateCharacters(dice);
const players = g().players;
check(players.every(p => p.char !== null), 'tous les personnages générés');
check(new Set(players.map(p => p.char)).size === 4, 'profils diversifiés (tous différents)');
const bob = players[1], dave = players[3];
const wealthOf = cname => {
  const base = { 'Patronne fortunée': 8, 'Héritier rentier': 7, 'Cadre endetté': 6, 'Retraitée': 5, 'Agriculteur-commerçant': 4, 'Infirmière en HLM': 3, 'Employé sous pression': 2, 'Intermittent précaire': 1 };
  return base[cname.split(' (descendant')[0]] || 0;
};
check(wealthOf(bob.cname) > wealthOf(dave.cname), 'dé le plus fort → personnage plus riche');
const ownedTiles = g().tiles.filter(t => t.owner !== null).length;
const distinctOwners = new Set(g().tiles.filter(t => t.owner !== null).map(t => t.owner)).size;
check(ownedTiles >= 2 && distinctOwners >= 2, 'certains personnages possèdent 1 ou plusieurs propriétés (' + ownedTiles + ' cases, ' + distinctOwners + ' propriétaires)');

// ---------- 10 ans ----------
console.log('— Partie complète —');
let landings = 0, events = 0, votes = 0, loans = 0, trades = 0, deaths = 0, yearEnds = 0, bankBuys = 0, consumptions = 0;

let guard = 0;
while (!g().over && guard++ < 5000) {
  const st = g();
  const p = st.players[st.cur];
  const r = E.roll(rnd(6), rnd(6));
  if (r.stayJail || r.jail) {
    const er = E.endTurn();
    if (er.next === 'yearend') { E.applyYearFlows(); yearEnds++; }
    continue;
  }
  const a = E.landOn();
  landings++;
  if (a.kind === 'event') events++;
  if ((a.kind === 'prop' || a.kind === 'housing') && a.consumption) consumptions++;
  if (a.deaths && a.deaths.length) { a.deaths.forEach(pid => E.confirmDeath(pid)); deaths++; }
  // décisions : achat uniquement via les cases banque
  if (a.kind === 'bank') {
    if (Math.random() < 0.4) { E.bankLoan(1000); loans++; }
    const free = g().tiles.find(t => (t.type === 'prop' || t.type === 'housing') && !t.public && t.owner === null);
    if (free && Math.random() < 0.4) {
      const partners = Math.random() < 0.2 ? [g().players[(g().cur + 1) % 4].id] : [];
      const res = E.buyProperty(g().tiles.indexOf(free), { partners });
      check(res.ok !== false, 'achat via la banque');
      bankBuys++;
    }
  }
  if (a.kind === 'bank' || a.kind === 'prop' || a.kind === 'housing') {
    // amélioration via la banque uniquement
    if (a.kind === 'bank' && Math.random() < 0.3) {
      const own = g().tiles.find(t => t.owner === g().cur && (t.houses || 0) < 5);
      if (own) E.improveProperty(g().tiles.indexOf(own));
    }
  }
  const er = E.endTurn();
  if (er.next === 'yearend') {
    yearEnds++;
    const recap = E.applyYearFlows();
    check(recap.rows.length === 4, `bilan de fin d'année ${g().year} pour 4 joueurs`);
    while (g().pendingDeaths && g().pendingDeaths.length) { E.confirmDeath(g().pendingDeaths[0]); deaths++; }
    // échanges aléatoires
    if (Math.random() < 0.3) {
      const st2 = g();
      const sellerTile = st2.tiles.find(t => t.owner !== null && t.owner !== st2.cur);
      if (sellerTile) {
        const r3 = E.tradeBuyProperty(sellerTile.owner, st2.tiles.indexOf(sellerTile), Math.round(sellerTile.price * 1.2));
        check(typeof r3.ok === 'boolean', 'transaction entre joueurs');
        trades++;
      }
    }
    // bilan → vote majoritaire → année suivante
    const c = E.continueAfterRecap();
    if (c.next === 'end') break;
    E.startVote();
    check(g().vote.options.length === 5, '5 cartes loi proposées');
    E.chooseLaw(rnd(5) - 1);
    const v = E.setMajority(Math.random() < 0.5);
    check(v.result && typeof v.result.adopted === 'boolean', 'vote majoritaire résolu');
    votes++;
    E.afterVote();
  }
}

console.log(`— Stats : ${landings} atterrissages, ${consumptions} consommations forcées, ${bankBuys} achats banque, ${events} événements, ${yearEnds} fins d'année, ${votes} votes, ${loans} emprunts, ${trades} transactions, ${deaths} successions —`);
check(g().year === 10 && g().over === true, `partie terminée après 10 ans (année finale : ${g().year})`);
check(yearEnds === 10, `10 fins d'année déclenchées (got ${yearEnds})`);
check(g().history.length === 10, '10 bilans d\'indicateurs archivés');
check(consumptions > 0, 'consommations forcées sur les cases propriété');
check(bankBuys > 0, 'achats réalisés via les cases banque');

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
vm.runInContext('S = ' + JSON.stringify(saved), ctx);
check(g().year === 10 && g().over === true, 'partie sauvegardée restaurée');

console.log(errors === 0 ? '\n✅ TOUS LES TESTS PASSENT' : `\n❌ ${errors} ÉCHEC(S)`);
process.exit(errors === 0 ? 0 : 1);
