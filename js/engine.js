// ============================================================
// MéritoPoly — Moteur de jeu (règles économiques centralisées)
// Aucune dépendance au DOM : testable sous Node.
// ============================================================

const SAVE_KEY = 'meritopoly_save_v1';

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function shuffle(a) { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; }
function fmt(n) { const v = Math.round(n); return (v < 0 ? '−' : '') + Math.abs(v).toLocaleString('fr-FR') + ' €'; }
function avg(a) { return a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0; }

let S = null; // état global de la partie

// Classement des personnages par richesse décroissante
function byWealth() {
  return CHARACTERS.slice().sort((a, b) => (b.wealth || 0) - (a.wealth || 0));
}

function save() {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) { /* quota */ }
  }
}
function loadSave() {
  if (typeof localStorage === 'undefined') return null;
  try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; }
}
function clearSave() { if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVE_KEY); }

// ---------- Création de partie ----------

function newGame(names) {
  S = {
    year: 1, cur: 0, legislator: 0, phase: 'assign', turnCount: 0,
    doubles: 0, crossedDepart: false, names: names.slice(),
    players: names.map((n, i) => ({
      id: i, name: n, color: PAWN_COLORS[i], position: 0, jail: 0, deceased: false,
      char: null, cname: '', age: 0, lieu: '', desc: '',
      adults: 1, children: 0, employed: false, retired: false, variable: false,
      salary: 0, capitalIncome: 0, housing: { type: 'locataire', rent: 0, bail: 99 },
      loans: [], money: 0, assets: 0, origin: 1500, health: 1, lastFlux: null, lastNet: 0
    })),
    tiles: BOARD.map(t => Object.assign(clone(t), {
      owner: null, shares: [], houses: 0
    })),
    params: clone(PARAMS),
    adoptedLaws: [],
    decks: {
      chance: shuffle(EVENTS.chance), malheur: shuffle(EVENTS.malheur), commu: shuffle(EVENTS.commu)
    },
    log: [], history: [], baseline: null, pendingDeaths: [],
    pending: null, vote: null, recap: null, over: false, results: null
  };
  logAdd(`Partie créée : ${names.length} joueurs, ${CONFIG.years} ans.`);
  save();
  return S;
}

// Génération en une étape : le dé le plus fort = personnage le plus riche,
// profils diversifiés (toujours le plus riche et le plus précaire inclus).
function generateCharacters(diceValues) {
  const n = diceValues.length;
  const ranked = byWealth();
  const selected = [ranked[0]];
  if (n > 1) selected.push(ranked[ranked.length - 1]);
  const middle = ranked.slice(1, -1);
  const k = n - 2;
  const used = new Set();
  for (let i = 0; i < k; i++) {
    let idx;
    if (i === 0 && middle.some(m => (m.props || []).length)) {
      // garantir un second profil propriétaire pour la diversité
      idx = middle.findIndex(m => (m.props || []).length);
    } else {
      idx = k === 1 ? Math.floor(middle.length / 2)
        : Math.round(i * (middle.length - 1) / (k - 1));
    }
    if (!used.has(idx)) { used.add(idx); selected.push(middle[idx]); }
  }
  while (selected.length < n) {
    const next = middle.find(m => !selected.includes(m));
    if (!next) break;
    selected.push(next);
  }
  selected.sort((a, b) => (b.wealth || 0) - (a.wealth || 0));
  const order = diceValues.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  order.forEach((o, rank) => {
    applyCharacter(S.players[o.i], selected[Math.min(rank, selected.length - 1)]);
    logAdd(`${S.players[o.i].name} (dé ${o.v}) joue <b>${selected[Math.min(rank, selected.length - 1)].name}</b>.`);
  });
  S.phase = 'dice';
  save();
  return S.players;
}



function applyCharacter(p, c) {
  p.char = c.id; p.cname = c.name; p.age = c.age; p.lieu = c.lieu; p.desc = c.desc;
  p.adults = c.adults; p.children = c.children;
  p.salary = c.salary; p.variable = !!c.variable; p.retired = !!c.retired;
  p.employed = c.salary > 0;
  p.capitalIncome = c.capitalIncome || 0;
  p.housing = clone(c.housing);
  p.loans = clone(c.loans || []);
  p.money = c.money; p.assets = c.assets; p.origin = c.origin;
  (c.props || []).forEach(tp => {
    const t = S.tiles[tp.tile];
    t.owner = p.id; t.shares = [{ pid: p.id, pct: 100 }]; t.houses = 0;
  });
}

function allAssigned() { return S.players.every(p => p.char !== null); }

// ---------- Utilitaires joueurs / tiles ----------

function cur() { return S.players[S.cur]; }
function playerById(id) { return S.players.find(p => p.id === id); }
function shareOf(t, pid) {
  if (!t.shares) return t.owner === pid ? 100 : 0;
  const s = t.shares.find(x => x.pid === pid);
  return s ? s.pct : 0;
}
function ownersOf(t) { return (t.shares || []).filter(s => s.pct > 0).map(s => s.pid); }
function groupTiles(t) { return S.tiles.filter(x => x.group && x.group === t.group); }
function groupComplete(t) {
  const g = groupTiles(t);
  return g.length > 1 && g.every(x => x.owner !== null && x.owner === g[0].owner);
}
function tileValue(t) {
  if (t.type !== 'prop' && t.type !== 'housing') return 0;
  return Math.round(t.price * (1 + 0.6 * (t.houses || 0)));
}
function patrimoine(p) {
  let v = p.assets || 0;
  S.tiles.forEach(t => { v += tileValue(t) * shareOf(t, p.id) / 100; });
  return v;
}
function patrimoineNet(p) {
  let v = patrimoine(p) + p.money;
  p.loans.forEach(l => v -= l.remaining);
  return v;
}
function monthlyHousingCost(p) {
  let c = 0;
  if (p.housing.type === 'locataire' || p.housing.type === 'hlm') c += p.housing.rent * (p.housing.type === 'locataire' ? S.params.rentIndex : 1);
  p.loans.forEach(l => c += l.monthly);
  return c;
}
function levelOfLife(p) {
  if (p.lastFlux) return p.lastNet / ucOf(p);
  return p.origin; // avant la première année : milieu d'origine
}
function householdFactor(p) { return Math.max(1, p.adults + 0.5 * p.children); }

function logAdd(html) {
  S.log.unshift({ year: S.year, html });
  if (S.log.length > 120) S.log.pop();
}

function payOrReceive(p, amount, label) {
  p.money += amount;
  if (amount < 0) logAdd(`${p.name} : ${label} ${fmt(amount)}.`);
  else logAdd(`${p.name} : ${label} +${fmt(amount)}.`);
}

// ---------- Dés et déplacement ----------

function roll(d1, d2) {
  const p = cur();
  const res = { d1, d2, doubles: d1 === d2, jail: false, pos: p.position };
  if (p.jail > 0) {
    if (d1 === d2) {
      p.jail = 0;
      logAdd(`${p.name} fait un double et sort de prison !`);
    } else {
      p.jail--;
      if (p.jail === 0) {
        p.money -= CONFIG.jailFine;
        logAdd(`${p.name} paie ${fmt(CONFIG.jailFine)} et sort de prison.`);
      } else {
        logAdd(`${p.name} reste en prison (${p.jail} tour(s)).`);
        res.stayJail = true;
        return res;
      }
    }
  } else if (d1 === d2) {
    S.doubles++;
    if (S.doubles >= 3) {
      goToJail(p);
      res.jail = true; res.pos = 10;
      return res;
    }
  } else {
    S.doubles = 0;
  }
  const from = p.position;
  p.position = (p.position + d1 + d2) % 40;
  if (p.position < from || p.position === 0) {
    p.money += CONFIG.passingGo;
    res.passedGo = true;
    logAdd(`${p.name} passe à la case Départ : +${fmt(CONFIG.passingGo)}.`);
    if (p.id === 0) S.crossedDepart = true; // le 1er joueur déclenche la fin d'année
  }
  res.pos = p.position;
  return res;
}

function goToJail(p) {
  p.position = 10; p.jail = 2; S.doubles = 0;
  logAdd(`${p.name} va en prison.`);
}

// ---------- Actions sur les cases ----------

// Prépare l'action correspondant à la case d'arrivée (à afficher par l'UI)
function landOn() {
  const p = cur();
  const t = S.tiles[p.position];
  S.pending = null;
  switch (t.type) {
    case 'prop': return propAction(p, t);
    case 'housing': return housingAction(p, t);
    case 'bank': return { kind: 'bank', title: t.name, tile: t };
    case 'chance': return eventAction(p, 'chance');
    case 'malheur': return eventAction(p, 'malheur');
    case 'commu': return eventAction(p, 'commu');
    case 'gotojail':
      goToJail(p);
      return { kind: 'info', title: t.name, lines: [`Vous allez en prison. Caution : ${fmt(CONFIG.jailFine)} ou un double.`] };
    case 'tax': return taxAction(p, t);
    default:
      return { kind: 'info', title: t.name, lines: ['Case neutre : rien ne se passe.'] };
  }
}

// Consommation ponctuelle : chaque case propriété = un besoin du foyer
function consume(p, t) {
  const svc = t.service;
  const factor = householdFactor(p)
    * (1 + 0.6 * (t.houses || 0))
    * (1 + S.params.consumptionVAT)
    * (groupComplete(t) ? 2 : 1);
  const price = Math.round(svc.price * factor);
  const cat = svc.cat;
  let reimbRate = svc.reimb !== undefined ? svc.reimb : 0;
  if (cat === 'santé') reimbRate = S.params.healthReimb;
  if (cat === 'éducation') reimbRate = S.params.educationReimb;
  if (cat === 'transport') reimbRate = Math.max(reimbRate, S.params.transportReimb);
  const reimb = Math.round(price * reimbRate);
  const reste = price - reimb;
  const ownerHere = t.owner !== null && t.owner !== p.id;
  const lines = [];
  if (t.owner === p.id) {
    lines.push({ cls: 'infoline', html: `Vous consommez dans votre propre établissement : coût réduit de moitié.` });
    const half = Math.round(reste / 2);
    p.money -= half;
    lines.push({ cls: 'payline', html: `Reste à charge : <b>${fmt(half)}</b>` });
  } else {
    p.money -= reste;
    lines.push({ cls: 'payline', html: `Prix : <b>${fmt(price)}</b> · Remboursé/subventionné : ${fmt(reimb)} · <b>Reste à charge : ${fmt(reste)}</b>` });
    if (ownerHere) {
      const owner = playerById(t.owner);
      const gain = Math.round(price * shareOf(t, owner.id) / 100);
      owner.money += gain;
      lines.push({ cls: 'infoline', html: `Paiement versé à ${owner.name} (propriétaire) : ${fmt(gain)}.` });
      logAdd(`${p.name} consomme chez ${owner.name} : ${fmt(gain)} transférés.`);
    }
  }
  const effect = CATEGORY_EFFECTS[cat];
  if (effect) lines.push({ cls: 'gainline', html: `Effet positif : ${effect}.` });
  logAdd(`${p.name} consomme « ${svc.label} » (${t.name}).`);
  return { service: svc.label, cat, price, reimb, reste: t.owner === p.id ? Math.round(reste / 2) : reste, lines };
}

function propAction(p, t) {
  const cons = consume(p, t);
  const actions = { kind: 'prop', title: t.name, tile: t, consumption: cons, canBuy: false, canImprove: false };
  if (t.type === 'prop') {
    if (t.owner === null && !t.public) {
      actions.canBuy = true;
    } else if (t.owner === p.id) {
      actions.canImprove = true;
    }
  }
  return actions;
}

function housingAction(p, t) {
  const cons = consume(p, t);
  const actions = { kind: 'housing', title: t.name, tile: t, consumption: cons, canBuy: false, hlmOffer: false };
  if (t.public) {
    if (p.housing.type === 'locataire' && p.salary < 2500) actions.hlmOffer = true;
  } else if (t.owner === null) {
    actions.canBuy = true;
  }
  return actions;
}

function taxAction(p, t) {
  const lines = [];
  let due = 0;
  const income = p.lastFlux ? (p.lastFlux.work + Math.max(0, p.lastFlux.capital)) : p.salary;
  switch (p.position) {
    case 4: // impôt sur le revenu
      due = Math.max(100, Math.round(income * 0.10));
      lines.push(`Contrôle fiscal : 10 % de vos derniers revenus.`);
      break;
    case 12: // électricité
      due = Math.round(120 * S.params.energyPrice * householdFactor(p));
      lines.push(`Facture d'électricité (prix × ${S.params.energyPrice.toFixed(2)}).`);
      break;
    case 28: // eau
      due = Math.round(80 * householdFactor(p));
      lines.push(`Facture d'eau du foyer.`);
      break;
    case 38: // taxe de luxe
      due = Math.max(200, Math.round(patrimoine(p) * 0.01));
      lines.push(`Taxe de luxe : 1 % de votre patrimoine.`);
      break;
  }
  p.money -= due;
  lines.push({ cls: 'payline', html: `À payer : <b>${fmt(due)}</b>` });
  logAdd(`${p.name} : ${t.name} ${fmt(-due)}.`);
  return { kind: 'info', title: t.name, lines };
}

// ---------- Achat / propriétés ----------

function buyProperty(tileId, opts) {
  const p = cur();
  const t = S.tiles[tileId];
  if (!t || (t.type !== 'prop' && t.type !== 'housing') || t.public || t.owner !== null) {
    return { ok: false, msg: 'Ce bien n\'est pas disponible à la vente.' };
  }
  opts = opts || {};
  const partners = (opts.partners || []).map(id => playerById(id));
  const buyers = [p].concat(partners);
  const price = t.price;
  const share = Math.round(price / buyers.length);

  buyers.forEach(b => {
    const need = share - b.money;
    if (need > 0) {
      takeLoanInternal(b, need, `Crédit achat ${t.name}`);
      b.money = 0;
    } else {
      b.money -= share;
    }
  });
  t.owner = p.id;
  const pct = Math.round(100 / buyers.length);
  t.shares = buyers.map(b => ({ pid: b.id, pct }));
  t.houses = 0;
  const co = buyers.length > 1 ? ` (copropriété : ${buyers.map(b => b.name).join(', ')})` : '';
  logAdd(`${p.name} achète <b>${t.name}</b> pour ${fmt(price)}${co}.`);
  S.pending = null;
  save();
  return { ok: true };
}

function buyHousing(tileId, opts) {
  const p = cur();
  const t = S.tiles[tileId];
  const price = t.price;
  const need = price - p.money;
  if (need > 0) {
    takeLoanInternal(p, need, `Crédit logement ${t.name}`);
    p.money = 0;
  } else {
    p.money -= price;
  }
  t.owner = p.id; t.shares = [{ pid: p.id, pct: 100 }]; t.houses = 0;
  p.housing = { type: 'proprio', rent: 0 };
  p.assets += Math.round(price * 0.5); // valeur du logement occupé
  logAdd(`${p.name} devient propriétaire d'un logement (${t.name}).`);
  S.pending = null;
  save();
  return { ok: true };
}

function moveHLM() {
  const p = cur();
  p.housing = { type: 'hlm', rent: 400 };
  logAdd(`${p.name} emménage en HLM (loyer modéré).`);
  S.pending = null;
  save();
}

function improveProperty(tileId) {
  const p = cur();
  const t = S.tiles[tileId];
  if ((t.houses || 0) >= CONFIG.maxHouses) return { ok: false, msg: 'Hôtel déjà construit.' };
  const cost = t.houseCost * (t.houses + 1);
  if (p.money < cost) return { ok: false, msg: `Il vous manque ${fmt(cost - p.money)}.` };
  p.money -= cost;
  t.houses = (t.houses || 0) + 1;
  const label = t.houses === CONFIG.maxHouses ? 'un hôtel' : `une maison (${t.houses})`;
  logAdd(`${p.name} construit ${label} sur ${t.name} (${fmt(-cost)}).`);
  save();
  return { ok: true };
}

// ---------- Banques ----------

function takeLoanInternal(p, amount, label) {
  const rate = S.params.loanRate;
  const n = CONFIG.loanDuration;
  const monthly = Math.round(amount * (1 + rate * n) / n);
  p.loans.push({ label, remaining: amount, monthly, rate });
  p.money += amount;
  logAdd(`${p.name} emprunte ${fmt(amount)} (${label}) : mensualité ${fmt(monthly)}/an.`);
}

function bankLoan(amount) {
  const p = cur();
  takeLoanInternal(p, amount, 'Prêt bancaire');
  save();
  return { ok: true };
}

function bankRepay(loanIdx, amount) {
  const p = cur();
  const l = p.loans[loanIdx];
  if (!l) return { ok: false, msg: 'Crédit introuvable.' };
  const pay = Math.min(amount, l.remaining, Math.max(0, p.money));
  p.money -= pay;
  l.remaining -= pay;
  if (l.remaining <= 0) {
    p.loans.splice(loanIdx, 1);
    logAdd(`${p.name} rembourse intégralement son crédit (${fmt(pay)}).`);
  } else {
    logAdd(`${p.name} rembourse ${fmt(pay)} de crédit (reste ${fmt(l.remaining)}).`);
  }
  save();
  return { ok: true };
}

// ---------- Événements ----------

function drawCard(deck) {
  if (S.decks[deck].length === 0) S.decks[deck] = shuffle(EVENTS[deck]);
  return S.decks[deck].pop();
}

function eventAction(p, deck) {
  const card = drawCard(deck);
  const lines = [];
  let deaths = [], collectiveLines = [];
  if (card.collective) {
    collectiveLines = applyCollective(card);
  } else {
    deaths = applyEffects(p, card.effects, lines);
  }
  logAdd(`${p.name} — ${deck === 'chance' ? 'Chance' : deck === 'malheur' ? 'Porte-malheur' : 'Caisse de communauté'} : ${card.title}.`);
  S.pending = null;
  save();
  return { kind: 'event', title: card.title, text: card.text, lines, collectiveLines, deaths, deck };
}

function applyEffects(p, effects, lines) {
  const deaths = [];
  (effects || []).forEach(e => {
    switch (e.t) {
      case 'money': {
        let v = e.v;
        if (e.energyScaled) v = Math.round(v * S.params.energyPrice * householdFactor(p));
        if (e.ifOwner && ownersOfAny(p)) { lines.push(`Vos activités brassent des affaires : ${fmt(v)}.`); p.money += v; }
        else if (e.ifOwner) { p.money += e.fallback; lines.push(`Aucune activité à vous : petite compensation ${fmt(e.fallback)}.`); }
        else if (e.ifWorking && p.employed) { p.money += v; lines.push(`Prime versée : ${fmt(v)}.`); }
        else if (e.ifWorking) { p.money += e.fallback; lines.push(`Sans emploi : dédommagement symbolique ${fmt(e.fallback)}.`); }
        else { p.money += v; lines.push(`${v > 0 ? '+' : ''}${fmt(v)}.`); }
        break;
      }
      case 'salaryPct':
        if (p.employed && !p.retired) { p.salary = Math.max(200, Math.round(p.salary * (1 + e.p))); lines.push(`Salaire : ${fmt(p.salary)}/an.`); }
        break;
      case 'capitalIncomeAdd':
        p.capitalIncome += e.v; lines.push(`Revenus du capital : +${fmt(e.v)}/an.`); break;
      case 'loseJob':
        if (p.employed && !p.retired) { p.employed = false; p.salary = 0; lines.push(`Vous perdez votre emploi !`); }
        else lines.push(`Sans effet : vous n'avez pas d'emploi salarié.`);
        break;
      case 'findJob':
        if (!p.employed) { p.employed = true; p.salary = e.v; lines.push(`Nouvel emploi : ${fmt(e.v)}/an.`); }
        break;
      case 'inherit':
        p.assets += e.v; lines.push(`Patrimoine : +${fmt(e.v)} (maison héritée).`); break;
      case 'assetsAdd':
        p.assets += e.v; lines.push(`Patrimoine : +${fmt(e.v)}.`); break;
      case 'rentPct':
        if (p.housing.type === 'locataire') { p.housing.rent = Math.max(100, Math.round(p.housing.rent * (1 + e.p))); lines.push(`Nouveau loyer : ${fmt(p.housing.rent)}/an.`); }
        else lines.push(`Sans effet : vous n'êtes pas locataire privé.`);
        break;
      case 'birth':
        p.children++; lines.push(`Le foyer compte désormais ${p.children} enfant(s) : allocations en hausse.`); break;
      case 'divorce':
        p.adults = Math.max(1, p.adults - 1); lines.push(`Le foyer ne compte plus qu'1 adulte.`); break;
      case 'jail':
        goToJail(p); lines.push(`Direction la prison (case 10).`); break;
      case 'propValuePct':
        if (e.scope === 'own') {
          S.tiles.forEach(t => { if (t.owner === p.id) t.price = Math.max(100, Math.round(t.price * (1 + e.p))); });
          lines.push(`Vos biens prennent ${e.p > 0 ? '+' : ''}${Math.round(e.p * 100)} % de valeur.`);
        } else if (e.scope === 'all') {
          S.tiles.forEach(t => { if (t.type === 'prop' || t.type === 'housing') t.price = Math.max(100, Math.round(t.price * (1 + e.p))); });
          lines.push(`TOUS les biens immobiliers ${e.p < 0 ? 'perdent' : 'gagnent'} ${Math.abs(Math.round(e.p * 100))} % de valeur.`);
        }
        break;
      case 'moneyIfChildren':
        p.money += p.children > 0 ? e.v : e.v2;
        lines.push(p.children > 0 ? `Aide familiale : +${fmt(e.v)}.` : `Petit geste : +${fmt(e.v2)}.`);
        break;
      case 'death':
        deaths.push(p.id);
        lines.push(`Votre personnage décède...`);
        break;
    }
  });
  return deaths;
}

function ownersOfAny(p) {
  return S.tiles.some(t => t.owner === p.id && (t.type === 'prop' || t.type === 'housing'));
}

// Événements collectifs : le même choc, des destins différents
function applyCollective(card) {
  const lines = [];
  card.effects.forEach(e => {
    switch (e.t) {
      case 'energyCrisis': {
        let pot = 0;
        S.players.forEach(p => {
          const cost = Math.round(e.v * S.params.energyPrice * householdFactor(p));
          p.money -= cost; pot += cost;
          lines.push({ pid: p.id, html: `${p.name} (foyer de ${householdFactor(p)} unités) paie <b>${fmt(cost)}</b> d'énergie en plus.` });
        });
        S.players.forEach(p => {
          const t = S.tiles.find(x => x.name.includes('ÉnergieWatt'));
          if (t && t.owner === p.id) {
            const gain = Math.round(pot * shareOf(t, p.id) / 100);
            p.money += gain;
            lines.push({ pid: p.id, html: `⚡ ${p.name} possède ÉnergieWatt : <b>+${fmt(gain)}</b> de bénéfices !` });
          }
        });
        break;
      }
      case 'foodCrisis': {
        let pot = 0;
        S.players.forEach(p => {
          const cost = Math.round(e.v * householdFactor(p));
          p.money -= cost; pot += Math.max(0, cost);
          if (cost > 0) lines.push({ pid: p.id, html: `${p.name} paie ses courses <b>${fmt(cost)}</b> plus cher.` });
          else lines.push({ pid: p.id, html: `${p.name} profite de prix alimentaires plus bas : <b>+${fmt(-cost)}</b>.` });
        });
        const farm = S.tiles.find(x => x.name.includes('AgroFrais') || x.name.includes('Marché'));
        if (farm && farm.owner !== null && pot > 0) {
          S.players.forEach(p => {
            const gain = Math.round(pot * shareOf(farm, p.id) / 100);
            if (gain > 0) { p.money += gain; lines.push({ pid: p.id, html: `🌾 ${p.name} (${farm.name}) : <b>+${fmt(gain)}</b>.` }); }
          });
        }
        break;
      }
      case 'ratesDelta':
        S.params.loanRate = Math.max(0, S.params.loanRate + e.d);
        S.players.forEach(p => p.loans.forEach(l => { l.rate += e.d > 0 ? e.d / 2 : 0; l.monthly = Math.round(l.monthly * (1 + Math.max(0, e.d) * 3)); }));
        lines.push({ pid: -1, html: `Taux d'emprunt : ${Math.round(S.params.loanRate * 1000) / 10} % par an. Les emprunteurs paient plus cher.` });
        break;
      case 'propValuePct':
        S.tiles.forEach(t => { if (t.type === 'prop' || t.type === 'housing') t.price = Math.max(100, Math.round(t.price * (1 + e.p))); });
        S.players.forEach(p => {
          const before = patrimoine(p);
          lines.push({ pid: p.id, html: `${p.name} : patrimoine immobilier ${e.p < 0 ? '−' : '+'}${Math.abs(Math.round(e.p * 100))} % (patrimoine ≈ ${fmt(before)}).` });
        });
        break;
      case 'allMoney':
        S.players.forEach(p => { p.money += e.v; lines.push({ pid: p.id, html: `${p.name} : ${e.v > 0 ? '+' : ''}${fmt(e.v)}.` }); });
        break;
      case 'randomJobLoss': {
        const workers = S.players.filter(p => p.employed && !p.retired);
        if (workers.length) {
          const victim = workers[Math.floor(Math.random() * workers.length)];
          victim.employed = false; victim.salary = 0;
          lines.push({ pid: victim.id, html: `❌ ${victim.name} perd son emploi (licenciement collectif).` });
        }
        break;
      }
      case 'solidarity': {
        const sorted = S.players.slice().sort((a, b) => patrimoineNet(b) - patrimoineNet(a));
        const rich = sorted[0], poor = sorted[sorted.length - 1];
        if (rich.id !== poor.id && patrimoineNet(rich) > 0) {
          rich.money -= e.v; poor.money += e.v;
          lines.push({ pid: rich.id, html: `${rich.name} (le plus fortuné) verse <b>${fmt(e.v)}</b>.` });
          lines.push({ pid: poor.id, html: `${poor.name} (le plus précaire) reçoit <b>${fmt(e.v)}</b>.` });
        }
        break;
      }
    }
  });
  return lines;
}

// ---------- Échanges entre joueurs (saisis après entente) ----------

function tradeBuyProperty(fromPid, tileId, price) {
  const p = cur();
  const from = playerById(fromPid);
  const t = S.tiles[tileId];
  if (t.owner !== fromPid) return { ok: false, msg: 'Ce bien n\'appartient pas à ce joueur.' };
  if (p.money < price) return { ok: false, msg: `Il vous manque ${fmt(price - p.money)}.` };
  const payout = {};
  (t.shares || []).forEach(s => { payout[s.pid] = Math.round(price * s.pct / 100); });
  p.money -= price;
  Object.keys(payout).forEach(pid => { playerById(+pid).money += payout[pid]; });
  t.owner = p.id; t.shares = [{ pid: p.id, pct: 100 }];
  logAdd(`${p.name} achète <b>${t.name}</b> à ${from.name} pour ${fmt(price)}.`);
  save();
  return { ok: true };
}

function tradeSellShare(tileId, toPid, pct, price) {
  const p = cur();
  const t = S.tiles[tileId];
  const buyer = playerById(toPid);
  if (shareOf(t, p.id) < pct) return { ok: false, msg: 'Vous ne possédez pas autant de parts.' };
  if (buyer.money < price) return { ok: false, msg: `${buyer.name} n'a pas les moyens (${fmt(buyer.money)}).` };
  buyer.money -= price; p.money += price;
  // ajustement simple : on retire pct du vendeur, on les donne à l'acheteur
  let remaining = pct;
  t.shares = t.shares.map(s => {
    if (s.pid === p.id && remaining > 0) { const take = Math.min(s.pct, remaining); s.pct -= take; remaining -= take; }
    return s;
  }).filter(s => s.pct > 0);
  const ex = (t.shares || []).find(s => s.pid === toPid);
  if (ex) ex.pct += pct; else t.shares.push({ pid: toPid, pct });
  const owners = ownersOf(t);
  if (owners.length === 1) t.owner = owners[0];
  logAdd(`${p.name} vend ${pct} % de <b>${t.name}</b> à ${buyer.name} pour ${fmt(price)}.`);
  save();
  return { ok: true };
}

function tradeOfferJob(toPid, salary, tileId) {
  const p = cur();
  const target = playerById(toPid);
  if (!S.tiles[tileId] || shareOf(S.tiles[tileId], p.id) < 50) return { ok: false, msg: 'Vous devez détenir au moins 50 % de l\'activité.' };
  if (target.employed) return { ok: false, msg: `${target.name} a déjà un emploi.` };
  target.employed = true; target.salary = salary;
  logAdd(`${p.name} embauche ${target.name} dans ${S.tiles[tileId].name} (${fmt(salary)}/an).`);
  save();
  return { ok: true };
}

// ---------- Fin de tour ----------

function endTurn() {
  S.pending = null;
  S.turnCount++;
  const finished = cur();
  if (S.doubles > 0 && finished.jail === 0 && S._extra !== true) {
    // double : rejouer (une fois max pour la fluidité)
    S._extra = true;
    save();
    return { next: 'same', msg: 'Double ! Vous rejouez.' };
  }
  S._extra = false; S.doubles = 0;
  // Fin d'année : déclenchée par le 1er joueur arrivant sur ou dépassant la case Départ
  if (finished.id === 0 && S.crossedDepart) {
    S.crossedDepart = false;
    return { next: 'yearend' };
  }
  S.cur++;
  if (S.cur >= S.players.length) S.cur = 0;
  save();
  return { next: 'play' };
}

// ---------- Phase démocratique ----------

function startVote() {
  const options = shuffle(LAWS).slice(0, 5);
  S.vote = { legislator: S.legislator, options, chosen: null, result: null };
  S.phase = 'vote';
  save();
  return S.vote;
}

function chooseLaw(idx) {
  S.vote.chosen = S.vote.options[idx];
  save();
  return S.vote;
}

// Vote majoritaire unique : le groupe répond POUR ou CONTRE.
// En cas d'égalité réelle entre joueurs, le législateur (qui répond) départage.
function setMajority(yes) {
  const v = S.vote;
  v.result = { majority: yes ? 'pour' : 'contre', adopted: !!yes, tieBreak: false };
  if (v.result.adopted) {
    const law = v.chosen;
    law.fn(S.params, S.players);
    S.adoptedLaws.push({ year: S.year, title: law.title, text: law.text });
    logAdd(`⚖️ Loi adoptée : <b>${law.title}</b> (majorité pour).`);
  } else {
    logAdd(`⚖️ Loi rejetée : <b>${v.chosen.title}</b> (majorité contre).`);
  }
  save();
  return v;
}

// ---------- Flux automatiques de fin d'année (impôts, charges, allocations) ----------

function variableIncome(p) {
  return Math.round(p.salary * (0.6 + Math.random() * 0.8));
}

function applyYearFlows() {
  const recap = [];
  const deaths = [];
  S.players.forEach(p => {
    if (p.deceased) return;
    const f = { work: 0, capital: 0, rent: 0, taxes: 0, benefits: 0, credit: 0, detail: [] };

    // 1. Revenus du travail
    if (p.employed) {
      f.work = p.variable ? variableIncome(p) : p.salary;
    }

    // 2. Revenus du capital : dividendes des activités + rente
    let div = 0;
    S.tiles.forEach(t => {
      if (t.type === 'prop' && t.owner !== null) {
        const sh = shareOf(t, p.id);
        if (sh > 0) {
          let d = t.dividend * (1 + 0.5 * (t.houses || 0)) * S.params.capitalBoost;
          if (groupComplete(t)) d *= 1.5;
          div += d * sh / 100;
        }
      }
    });
    f.capital = Math.round(div + p.capitalIncome * S.params.capitalBoost);

    // 3. Loyers
    if (p.housing.type === 'locataire') f.rent = -Math.round(p.housing.rent * S.params.rentIndex);
    if (p.housing.type === 'hlm') f.rent = -p.housing.rent;

    // 4. Prélèvements
    let taxes = 0;
    if (f.work > 0) {
      taxes += progressiveTax(f.work, S.params.incomeTax);
      if (!p.retired) taxes += Math.round(f.work * S.params.cotisations);
    }
    if (f.capital > 0) taxes += Math.round(f.capital * S.params.capitalTax);
    const pat = patrimoine(p);
    if (pat > S.params.wealthThreshold) taxes += Math.round((pat - S.params.wealthThreshold) * S.params.wealthTax);
    f.taxes = -taxes;

    // 5. Prestations sociales
    let ben = 0;
    if (p.children > 0) ben += p.children * S.params.familyAllowance;
    const income = f.work + f.capital;
    if (f.rent < 0 && -f.rent > 0.3 * Math.max(1, income)) {
      ben += Math.min(S.params.housingBenefitMax, Math.round(-f.rent * 0.3));
    }
    const uc = ucOf(p);
    const disposable = f.work + f.capital + f.rent - taxes;
    if (disposable / uc < S.params.minimumIncome) {
      ben += Math.round(S.params.minimumIncome * uc - disposable);
    }
    f.benefits = Math.round(ben);

    // 6. Crédits
    p.loans.slice().forEach(l => {
      const interest = Math.round(l.remaining * l.rate);
      const principal = Math.max(0, l.monthly - interest);
      f.credit -= l.monthly;
      l.remaining = Math.max(0, l.remaining - principal);
      if (l.remaining <= 0) {
        p.loans.splice(p.loans.indexOf(l), 1);
        f.detail.push(`Crédit « ${l.label} » intégralement remboursé.`);
      }
    });

    const net = f.work + f.capital + f.rent + f.taxes + f.benefits + f.credit;
    p.money += net;
    p.lastFlux = f; p.lastNet = net;

    // 7. Bail locatif
    if (p.housing.type === 'locataire' && p.housing.bail < 90) {
      p.housing.bail--;
      if (p.housing.bail <= 0) {
        p.housing.rent = Math.round(p.housing.rent * 1.10);
        p.housing.bail = 3;
        f.detail.push(`Échéance du bail : loyer relevé à ${fmt(p.housing.rent)}.`);
      }
    }

    p.age++;
    recap.push({ pid: p.id, f, net });

    // 8. Mort de vieillesse
    if (p.age >= 70 && Math.random() < (p.age - 65) * 0.02) deaths.push(p.id);
  });

  S.pendingDeaths = (S.pendingDeaths || []).concat(deaths);
  S.recap = { year: S.year, rows: recap };
  S.history.push(computeStats());
  if (!S.baseline) S.baseline = S.history[0];
  S.phase = 'recap';
  save();
  return S.recap;
}

function continueAfterRecap() {
  S.recap = null;
  if (S.year >= CONFIG.years) {
    S.over = true;
    S.results = finalResults();
    S.phase = 'end';
    save();
    return { next: 'end' };
  }
  return { next: 'vote' };
}

function afterVote() {
  S.vote = null;
  S.legislator = (S.legislator + 1) % S.players.length;
  S.year++;
  S.phase = 'dice';
  save();
  return { next: 'play' };
}

// ---------- Mort et héritage ----------

function confirmDeath(pid) {
  const p = playerById(pid);
  const pat = Math.max(0, patrimoineNet(p));
  const tax = Math.round(pat * S.params.successions);
  const inherited = pat - tax;
  const propValue = S.tiles.reduce((s, t) => s + tileValue(t) * shareOf(t, p.id) / 100, 0);

  const templates = CHARACTERS.filter(c => c.id !== p.char);
  const c = templates[Math.floor(Math.random() * templates.length)];
  const heirName = p.name;

  p.deceased = false;
  p.char = c.id; p.cname = c.name + ' (descendant·e de ' + heirName + ')';
  p.age = c.age; p.lieu = c.lieu; p.desc = c.desc;
  p.adults = c.adults; p.children = c.children;
  p.salary = c.salary; p.variable = !!c.variable; p.retired = !!c.retired;
  p.employed = c.salary > 0;
  p.capitalIncome = c.capitalIncome || 0;
  p.housing = clone(c.housing);
  p.loans = []; // les dettes s'éteignent, le patrimoine net est transmis
  p.money = Math.max(0, inherited - propValue);
  p.assets = Math.max(0, inherited - p.money);
  p.origin = p.origin; // le milieu d'origine reste celui de la lignée
  p.jail = 0; p.health = 1;
  // les parts de propriétés restent attachées au joueur (transmission)
  logAdd(`🕯️ ${heirName} décède. Son descendant hérite de ${fmt(inherited)} (droits de succession : ${fmt(tax)}).`);
  S.pendingDeaths = (S.pendingDeaths || []).filter(id => id !== pid);
  save();
  return { tax, inherited, heir: p.cname };
}

// ---------- Indicateurs sociaux ----------

function gini(values) {
  const v = values.slice().sort((a, b) => a - b);
  const n = v.length, m = avg(v);
  if (m === 0) return 0;
  let s = 0;
  for (let i = 0; i < n; i++) s += (2 * (i + 1) - n - 1) * v[i];
  return s / (n * n * m);
}

function precarityFlags(p) {
  const flags = {};
  const income = p.lastFlux ? (p.lastFlux.work + p.lastFlux.capital + p.lastFlux.benefits) : p.salary + p.capitalIncome;
  const hc = monthlyHousingCost(p);
  flags.logement = income > 0 && hc / income > CONFIG.precarityHousingRatio;
  const lv = levelOfLife(p);
  flags.alimentation = lv < CONFIG.povertyLine;
  flags.transport = lv < CONFIG.povertyLine * 1.1 && p.employed;
  flags.sante = p.money < 0 || p.health < 1;
  return flags;
}

function computeStats() {
  const levels = S.players.map(p => Math.round(levelOfLife(p)));
  const pats = S.players.map(p => Math.round(patrimoineNet(p)));
  const flags = S.players.map(p => precarityFlags(p));
  const precarity = S.players.filter((p, i) => Object.values(flags[i]).some(Boolean)).length / S.players.length;
  return {
    year: S.year,
    levels, pats,
    giniIncome: gini(levels),
    giniWealth: gini(pats),
    mobility: avg(S.players.map((p, i) => levels[i] / Math.max(1, p.origin))),
    precarity,
    flags
  };
}

// ---------- Victoire ----------

function finalResults() {
  const last = S.history[S.history.length - 1];
  const base = S.baseline || last;
  const objectives = [
    { id: 'bankruptcy', label: 'Aucun joueur en banqueroute', ok: S.players.every(p => p.money > -1000),
      detail: S.players.map(p => `${p.name} : ${fmt(p.money)}`).join(' · ') },
    { id: 'giniIncome', label: 'Inégalités de revenus réduites', ok: last.giniIncome < base.giniIncome,
      detail: `indice ${base.giniIncome.toFixed(2)} → ${last.giniIncome.toFixed(2)}` },
    { id: 'giniWealth', label: 'Inégalités de patrimoine réduites', ok: last.giniWealth < base.giniWealth,
      detail: `indice ${base.giniWealth.toFixed(2)} → ${last.giniWealth.toFixed(2)}` },
    { id: 'precarity', label: 'Absence de précarité', ok: last.precarity === 0,
      detail: `${Math.round(last.precarity * 100)} % de joueurs précaires` },
    { id: 'mobility', label: 'Ascenseur social en progression', ok: last.mobility > base.mobility * 1.05,
      detail: `${Math.round(base.mobility * 100)} → ${Math.round(last.mobility * 100)} (base 100)` }
  ];
  const win = objectives.some(o => o.ok);
  return { win, objectives, last, base };
}

// ---------- Export (Node) ----------
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { newGame, generateCharacters, roll, landOn, buyProperty, buyHousing, moveHLM, improveProperty, bankLoan, bankRepay, endTurn, startVote, chooseLaw, setMajority, applyYearFlows, afterVote, continueAfterRecap, confirmDeath, computeStats, finalResults, tradeBuyProperty, tradeSellShare, tradeOfferJob, getState: () => S, fmt, CONFIG, PARAMS };
}
