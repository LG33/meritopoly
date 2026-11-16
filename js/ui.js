// ============================================================
// MéritoPoly — Interface (mobile-first, un téléphone partagé)
// ============================================================

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/</g, '&lt;');

const UI = {

  // ---------- Navigation ----------
  show(id) {
    ['screen-home', 'screen-chars', 'screen-board', 'screen-end'].forEach(s => $(s).classList.add('hidden'));
    $(id).classList.remove('hidden');
    window.scrollTo(0, 0);
  },

  // ---------- Accueil ----------
  initHome() {
    const sv = loadSave();
    if (sv && !sv.over) {
      $('resume-box').classList.remove('hidden');
      $('resume-cycle').textContent = sv.year;
    }
    const box = $('player-count');
    box.innerHTML = '';
    for (let n = 2; n <= 6; n++) {
      const b = document.createElement('button');
      b.className = 'btn tiny'; b.textContent = n + ' joueurs';
      b.onclick = () => UI.pickCount(n);
      box.appendChild(b);
    }
    UI.pickCount(3);
  },

  pickCount(n) {
    UI.nPlayers = n;
    const f = $('name-fields');
    f.innerHTML = '<label class="lbl">Prénoms des joueurs</label>';
    for (let i = 0; i < n; i++) {
      f.innerHTML += `<input type="text" id="pname${i}" maxlength="12" placeholder="Joueur ${i + 1}" value="${(UI.names && UI.names[i]) || ''}">`;
    }
  },

  startSetup() {
    const names = [];
    for (let i = 0; i < UI.nPlayers; i++) {
      const v = $('pname' + i).value.trim();
      names.push(v || 'Joueur ' + (i + 1));
    }
    UI.names = names;
    newGame(names);
    UI.show('screen-chars');
    UI.renderAssign();
  },

  resumeGame() {
    const sv = loadSave();
    if (!sv) return;
    S = sv;
    if (S.phase === 'assign') { UI.show('screen-chars'); UI.renderAssign(); return; }
    UI.show('screen-board');
    UI.renderBoard();
    UI.renderHUD();
    UI.refreshDiceZone();
    if (S.phase === 'vote') UI.renderVote();
    if (S.phase === 'recap') UI.renderRecap();
    if (S.phase === 'end') UI.renderEnd();
    if (S.pending) UI.renderPending();
    if (S.pendingDeaths && S.pendingDeaths.length) UI.renderDeath();
  },

  discardSave() {
    clearSave();
    $('resume-box').classList.add('hidden');
  },

  restart() {
    clearSave();
    location.reload();
  },

  // ---------- Attribution des personnages (une seule étape) ----------
  renderAssign() {
    let h = `<div class="card">
      <p>Chaque joueur lance le dé physique : saisissez les résultats, puis générez les personnages.
      Le <b>dé le plus fort</b> obtient le personnage <b>le plus riche</b>.</p>`;
    S.players.forEach(p => {
      h += `<label class="checkline"><span class="player-dot" style="background:${p.color}"></span>
        ${esc(p.name)} — résultat du dé :</label>
        <input type="number" id="diceval${p.id}" min="1" max="6" value="1" class="die">`;
    });
    h += `<button class="btn primary big" onclick="UI.doGenerate()">Générer les personnages</button></div>
      <div id="char-result"></div>`;
    $('char-assign').innerHTML = h;
  },

  doGenerate() {
    const values = S.players.map(p => parseInt($('diceval' + p.id).value, 10));
    if (values.some(v => !(v >= 1 && v <= 6))) { alert('Saisissez un résultat entre 1 et 6 pour chaque joueur'); return; }
    generateCharacters(values);
    $('char-assign').innerHTML = `
      <div class="card">
        <h3>Personnages générés !</h3>
        <p class="hint">Notez sur papier les caractéristiques de votre personnage (aide-mémoire).</p>
        ${S.players.map(p => UI.ficheHTML(p)).join('')}
        <button class="btn primary big" onclick="UI.goBoard()">Accéder au plateau</button>
      </div>`;
  },

  goBoard() {
    UI.show('screen-board');
    UI.renderBoard();
    UI.renderHUD();
    UI.refreshDiceZone();
  },

  // ---------- Fiche personnage ----------
  ficheHTML(p) {
    const housing = {
      locataire: `Locataire privé — loyer ${fmt(p.housing.rent)}/an (bail : ${p.housing.bail} an(s))`,
      hlm: 'Logé en HLM — loyer modéré ' + fmt(p.housing.rent),
      proprio: 'Propriétaire de son logement'
    }[p.housing.type];
    const rows = [
      ['Lieu de vie', esc(p.lieu)],
      ['Foyer', `${p.adults} adulte(s), ${p.children} enfant(s) (échelle ${ucOf(p).toFixed(1)} UC)`],
      ['Revenu du travail', p.employed ? fmt(p.salary) + '/an' + (p.variable ? ' (variable)' : '') + (p.retired ? ' (pension)' : '') : 'Sans emploi'],
      ['Revenus du capital', p.capitalIncome ? fmt(p.capitalIncome) + '/an' : '—'],
      ['Logement', housing],
      ['Crédits', p.loans.length ? p.loans.map(l => `${esc(l.label)} : ${fmt(l.remaining)} restants, ${fmt(l.monthly)}/an`).join('<br>') : 'Aucun'],
      ['Liquidités', fmt(p.money)],
      ['Patrimoine net', fmt(patrimoineNet(p))],
      ['Milieu d\'origine', fmt(p.origin) + ' /UC/an']
    ];
    const props = S.tiles.filter(t => t.owner === p.id);
    if (props.length) rows.push(['Activités', props.map(t => `${esc(t.name)}${shareOf(t, p.id) < 100 ? ` (${shareOf(t, p.id)} %)` : ''}${t.houses ? ' 🏠' + t.houses : ''}`).join('<br>')]);
    return `<div class="fiche">
      <h3>${esc(p.name)} — ${esc(p.cname)}</h3>
      <div class="sub">${p.age} ans · ${esc(p.desc)}</div>
      <table>${rows.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</table>
      <p class="hint">📝 Notez ces informations sur papier : c'est votre aide-mémoire de jeu.</p>
    </div>`;
  },

  openFiche(pid) {
    const id = (pid !== undefined) ? pid : S.cur;
    UI.modal('Fiche personnage', UI.ficheHTML(playerById(id)), [{ label: 'Fermer', cls: 'primary', fn: 'UI.closeModal()' }]);
  },

  // ---------- Plateau ----------
  renderBoard() {
    const board = $('board');
    board.innerHTML = '';
    const center = document.createElement('div');
    center.className = 'tile center';
    center.style.gridArea = '6 / 6 / 7 / 7';
    center.innerHTML = '<div class="ctitle">MÉRITO<br>POLY<br><small>Année ' + S.year + '/' + CONFIG.years + '</small></div>';
    board.appendChild(center);
    S.tiles.forEach((t, i) => {
      const d = document.createElement('div');
      d.className = 'tile' + (i % 10 === 0 ? ' corner' : '');
      const [r, c] = gridPos(i);
      d.style.gridArea = `${r} / ${c} / ${r + 1} / ${c + 1}`;
      const color = tileColor(t);
      let inner = `<div class="strip" style="background:${color}"></div>`;
      inner += `<div class="tname">${esc(shortName(t))}</div>`;
      if (t.owner !== null) inner += `<div class="own" style="background:${S.players[t.owner].color}"></div>`;
      if (t.houses) inner += `<div class="houses">${t.houses === 5 ? '🏨' : '🏠'.repeat(t.houses)}</div>`;
      if (t.public) inner += `<div class="pub">PUB</div>`;
      const pawns = S.players.filter(p => p.position === i && !p.deceased)
        .map(p => `<div class="pawn" style="background:${p.color}"></div>`).join('');
      if (pawns) inner += `<div class="pawns">${pawns}</div>`;
      d.innerHTML = inner;
      d.onclick = () => UI.tileInfo(i);
      board.appendChild(d);
    });
    UI.highlightActive();
  },

  highlightActive() {
    document.querySelectorAll('.tile').forEach(el => el.classList.remove('active-tile'));
    const p = cur();
    const idx = Array.from($('board').children).findIndex(el => el.style.gridArea && false);
    // marquer la case du joueur actif
    S.tiles.forEach((t, i) => {
      // retrouver l'élément par position de grille
    });
    const cells = $('board').children;
    for (const el of cells) {
      const [r, c] = gridPos(cur().position);
      if (el.style.gridArea === `${r} / ${c} / ${r + 1} / ${c + 1}`) el.classList.add('active-tile');
    }
  },

  renderHUD() {
    $('hud-cycle').textContent = `Année ${S.year}/${CONFIG.years}`;
    const p = cur();
    $('hud-active').innerHTML =
      `<span class="player-dot" style="background:${p.color}"></span>
       Au tour de <b>${esc(p.name)}</b> — ${esc(p.cname)} · ${fmt(p.money)}`;
  },

  refreshDiceZone() {
    const p = cur();
    const inVote = S.phase === 'vote', inRecap = S.phase === 'recap';
    $('dice-zone').classList.toggle('hidden', inVote || inRecap || S.over || S.phase === 'assign');
    if (S.phase === 'assign') return;
    if (inVote) UI.renderVote();
    if (inRecap) UI.renderRecap();
    if (S.phase === 'assign' || inVote || inRecap || S.over) return;
    ['die1', 'die2'].forEach(id => {
      const sel = $(id);
      if (sel.options.length === 0) {
        for (let i = 1; i <= 6; i++) sel.add(new Option(i, i));
        sel.value = 1;
      }
    });
    if (S.pending) {
      $('dice-label').innerHTML = `<span class="player-dot" style="background:${p.color}"></span>${esc(p.name)} : action en cours…`;
      $('btn-roll').classList.add('hidden');
      $('btn-endturn').classList.remove('hidden');
      UI.renderPending();
    } else {
      $('dice-label').innerHTML = `<span class="player-dot" style="background:${p.color}"></span>${esc(p.name)} : lancez les dés physiquement puis saisissez le résultat`;
      $('btn-roll').classList.remove('hidden');
      $('btn-endturn').classList.add('hidden');
    }
  },

  onRoll() {
    const d1 = parseInt($('die1').value, 10), d2 = parseInt($('die2').value, 10);
    const res = roll(d1, d2);
    UI.renderBoard();
    if (res.stayJail) {
      UI.modal('Prison', `<p>Vous restez en prison : faites un double pour sortir, ou attendez.</p>`,
        [{ label: 'Terminer le tour', cls: 'primary', fn: 'UI.onEndTurn()' }]);
      return;
    }
    if (res.jail) {
      UI.modal('Trois doubles !', `<p>Trop de chance : direction la prison.</p>`,
        [{ label: 'OK', cls: 'primary', fn: 'UI.onEndTurn()' }]);
      return;
    }
    const action = landOn();
    UI.renderBoard();
    UI.renderPending(action);
  },

  onEndTurn() {
    const r = endTurn();
    if (r.next === 'same') {
      UI.renderHUD(); UI.refreshDiceZone();
      UI.modal('Double !', `<p>${esc(r.msg)}</p>`, [{ label: 'Relancer les dés', cls: 'primary', fn: 'UI.closeModal();UI.refreshDiceZone();' }]);
      return;
    }
    if (r.next === 'yearend') {
      const recap = applyYearFlows();
      UI.renderBoard();
      UI.renderHUD();
      UI.renderRecap(recap);
      return;
    }
    UI.renderBoard(); UI.renderHUD(); UI.refreshDiceZone();
  },

  // ---------- Modale d'action contextuelle ----------
  renderPending(action) {
    const a = action || S.pendingAction;
    if (!a) { UI.closeModal(); return; }
    S.pendingAction = a;
    const p = cur();
    let body = '', acts = [];
    switch (a.kind) {
      case 'prop': {
        body += UI.consumptionHTML(a.consumption);
        body += `<div class="infoline">Les achats d'activités et de logements se font uniquement dans les <b>4 cases Banque</b> du plateau.</div>`;
        acts.push({ label: 'Terminer le tour', cls: 'primary', fn: 'UI.closeModal();UI.onEndTurn()' });
        break;
      }
      case 'housing': {
        body += UI.consumptionHTML(a.consumption);
        if (a.hlmOffer) {
          body += `<div class="infoline">Logement social : sous conditions de revenus, vous pouvez demander un HLM.</div>`;
          acts.push({ label: 'Demander un logement HLM', cls: '', fn: 'UI.doHLM()' });
        }
        acts.push({ label: 'Terminer le tour', cls: 'primary', fn: 'UI.closeModal();UI.onEndTurn()' });
        break;
      }
      case 'bank': {
        body += `<div class="infoline">Bienvenue à la banque : c'est ici qu'on achète activités et logements (seuls, à plusieurs, à crédit), qu'on emprunte, rembourse et améliore.</div>`;
        if (S.tiles.some(t => (t.type === 'prop' || t.type === 'housing') && !t.public && t.owner === null)) acts.push({ label: 'Acheter une propriété ou un logement', cls: 'green', fn: 'UI.openBankBuy()' });
        acts.push({ label: 'Emprunter', cls: '', fn: 'UI.openLoan()' });
        if (p.loans.length) acts.push({ label: 'Rembourser un crédit', cls: '', fn: 'UI.openRepay()' });
        if (S.tiles.some(t => t.owner === p.id && (t.houses || 0) < CONFIG.maxHouses)) acts.push({ label: 'Améliorer une propriété', cls: '', fn: 'UI.openImprove()' });
        acts.push({ label: 'Quitter la banque', cls: 'primary', fn: 'UI.closeModal();UI.onEndTurn()' });
        break;
      }
      case 'event': {
        body += `<div class="event-card"><div class="ev-title">${esc(a.title)}</div><p>${esc(a.text)}</p></div>`;
        a.lines.forEach(l => body += `<div class="${l.cls || 'infoline'}">${l.html}</div>`);
        if (a.collectiveLines.length) {
          body += '<h3>Effets sur chaque joueur</h3>';
          a.collectiveLines.forEach(l => body += `<div class="${l.pid === p.id ? 'payline' : 'infoline'}">${l.html}</div>`);
        }
        if (a.deaths.length) {
          acts.push({ label: 'Voir la succession', cls: 'warn', fn: 'UI.renderDeath()' });
        } else {
          acts.push({ label: 'Terminer le tour', cls: 'primary', fn: 'UI.closeModal();UI.onEndTurn()' });
        }
        break;
      }
      case 'info': {
        body += (a.lines || []).map(l => typeof l === 'string' ? `<div class="infoline">${l}</div>` : `<div class="${l.cls}">${l.html}</div>`).join('');
        acts.push({ label: 'Terminer le tour', cls: 'primary', fn: 'UI.closeModal();UI.onEndTurn()' });
        break;
      }
    }
    UI.modal(a.title, body, acts);
  },

  consumptionHTML(cons) {
    let h = `<h3>Consommation du foyer</h3>
      <p><b>${esc(cons.service)}</b> (${cons.cat})</p>`;
    cons.lines.forEach(l => h += `<div class="${l.cls || 'infoline'}">${l.html}</div>`);
    return h;
  },

  doBuy(idx) {
    buyProperty(idx); UI.closeModal(); UI.renderBoard(); UI.renderHUD();
    UI.modal('Achat réalisé', `<div class="gainline"><b>${esc(S.tiles[idx].name)}</b> vous appartient désormais${S.tiles[idx].shares.length > 1 ? ' (copropriété)' : ''}.</div>`,
      [{ label: 'Retour à la banque', cls: 'primary', fn: 'UI.openBank()' }]);
  },
  doHLM() { moveHLM(); UI.closeModal(); UI.onEndTurn(); },

  // ---------- Achat à plusieurs ----------
  openCoBuy(idx) {
    const t = S.tiles[idx];
    const others = S.players.filter(p => p.id !== S.cur);
    let h = `<p>Acheter <b>${esc(t.name)}</b> (${fmt(t.price)}) à parts égales. Cochez les copropriétaires :</p>`;
    others.forEach(p => {
      h += `<label class="checkline"><input type="checkbox" id="cobuy${p.id}" value="${p.id}">
        <span class="player-dot" style="background:${p.color}"></span>${esc(p.name)} (${fmt(p.money)})</label>`;
    });
    h += `<p class="hint">Chacun paie sa part ; si les liquidités manquent, un crédit est automatiquement contracté.</p>`;
    UI.modal('Achat à plusieurs', h, [
      { label: 'Confirmer l\'achat groupé', cls: 'green', fn: `UI.doCoBuy(${idx})` },
      { label: 'Annuler', cls: '', fn: 'UI.openBank()' }
    ]);
  },

  doCoBuy(idx) {
    const partners = S.players.filter(p => $('cobuy' + p.id) && $('cobuy' + p.id).checked).map(p => p.id);
    buyProperty(idx, { partners });
    UI.closeModal(); UI.renderBoard(); UI.renderHUD();
    UI.modal('Achat groupé réalisé', `<div class="gainline"><b>${esc(S.tiles[idx].name)}</b> est détenu à parts égales : ${S.tiles[idx].shares.map(s => esc(S.players[s.pid].name) + ' (' + s.pct + ' %)').join(', ')}.</div>`,
      [{ label: 'Retour à la banque', cls: 'primary', fn: 'UI.openBank()' }]);
  },

  // ---------- Banque : acheter / emprunter / rembourser / améliorer ----------
  openBank() {
    const p = cur();
    let body = `<div class="infoline">Bienvenue à la banque : c'est ici qu'on achète activités et logements (seuls, à plusieurs, à crédit), qu'on emprunte, rembourse et améliore.</div>`;
    const acts = [];
    if (S.tiles.some(t => !t.public && t.owner === null)) acts.push({ label: 'Acheter une propriété ou un logement', cls: 'green', fn: 'UI.openBankBuy()' });
    acts.push({ label: 'Emprunter', cls: '', fn: 'UI.openLoan()' });
    if (p.loans.length) acts.push({ label: 'Rembourser un crédit', cls: '', fn: 'UI.openRepay()' });
    if (S.tiles.some(t => t.owner === p.id && (t.houses || 0) < CONFIG.maxHouses)) acts.push({ label: 'Améliorer une propriété', cls: '', fn: 'UI.openImprove()' });
    acts.push({ label: 'Quitter la banque', cls: 'primary', fn: 'UI.closeModal();UI.onEndTurn()' });
    UI.modal('Banque', body, acts);
  },

  openBankBuy() {
    let h = '<p>Biens disponibles à l\'achat (seul ou à plusieurs, crédit automatique si besoin) :</p>';
    S.tiles.forEach((t, i) => {
      if ((t.type === 'prop' || t.type === 'housing') && !t.public && t.owner === null) {
        h += `<button class="btn" onclick="UI.confirmBankBuy(${i})">${esc(t.name)} — ${fmt(t.price)}${t.dividend ? ` · revenu ${fmt(t.dividend)}/an` : ''}</button>`;
      }
    });
    UI.modal('Acheter à la banque', h, [{ label: 'Retour', cls: '', fn: 'UI.openBank()' }]);
  },

  confirmBankBuy(idx) {
    const t = S.tiles[idx];
    UI.modal('Acheter ' + t.name, `<p><b>${esc(t.name)}</b> — ${fmt(t.price)}.</p>
      ${t.type === 'housing' ? '<p class="hint">Devenir propriétaire supprime votre loyer et constitue un patrimoine (crédit possible).</p>' : `<p class="hint">Rapportera ${fmt(t.dividend)} par an, et facturera la consommation aux joueurs qui y tombent.</p>`}
      <p class="hint">Si vos liquidités sont insuffisantes, un crédit est automatiquement contracté.</p>`,
      [{ label: `Acheter seul — ${fmt(t.price)}`, cls: 'green', fn: `UI.doBankBuy(${idx})` },
       { label: 'Acheter à plusieurs (parts égales)', cls: '', fn: `UI.openCoBuy(${idx})` },
       { label: 'Annuler', cls: '', fn: 'UI.openBankBuy()' }]);
  },

  doBankBuy(idx) {
    const t = S.tiles[idx];
    if (t.type === 'housing') {
      buyHousing(idx);
      UI.closeModal(); UI.renderBoard(); UI.renderHUD();
      UI.modal('Achat réalisé', `<div class="gainline">Vous êtes propriétaire de <b>${esc(t.name)}</b> : plus de loyer, patrimoine constitué.</div>`,
        [{ label: 'Retour à la banque', cls: 'primary', fn: 'UI.openBank()' }]);
    } else {
      UI.doBuy(idx);
    }
  },

  openLoan() {
    let h = `<p>Taux actuel : <b>${(S.params.loanRate * 100).toFixed(1)} % par an</b>, remboursement sur ${CONFIG.loanDuration} ans.</p>`;
    [1000, 2000, 5000].forEach(v => {
      const m = Math.round(v * (1 + S.params.loanRate * CONFIG.loanDuration) / CONFIG.loanDuration);
      h += `<button class="btn" onclick="UI.doLoan(${v})">Emprunter ${fmt(v)} — mensualité ${fmt(m)}</button>`;
    });
    UI.modal('Emprunter', h, [{ label: 'Retour', cls: '', fn: 'UI.openBank()' }]);
  },

  doLoan(v) { bankLoan(v); UI.closeModal(); UI.renderHUD(); UI.openBank(); },

  openRepay() {
    const p = cur();
    let h = '<p>Vos crédits :</p>';
    p.loans.forEach((l, i) => {
      h += `<div class="infoline"><b>${esc(l.label)}</b> — reste ${fmt(l.remaining)}, mensualité ${fmt(l.monthly)}.</div>`;
      h += `<button class="btn" onclick="UI.doRepay(${i}, ${l.monthly})">Rembourser une mensualité (${fmt(l.monthly)})</button>`;
      const full = Math.min(l.remaining, Math.max(0, p.money));
      if (full > 0) h += `<button class="btn" onclick="UI.doRepay(${i}, ${full})">Rembourser jusqu'à ${fmt(full)} d'un coup</button>`;
    });
    UI.modal('Rembourser', h, [{ label: 'Retour', cls: '', fn: 'UI.openBank()' }]);
  },

  doRepay(i, amount) { bankRepay(i, amount); UI.closeModal(); UI.renderHUD(); UI.openBank(); },

  openImprove() {
    const p = cur();
    let h = '<p>Choisissez une activité à améliorer (maison puis hôtel, prix croissant) :</p>';
    S.tiles.forEach((t, i) => {
      if (t.owner === p.id && (t.houses || 0) < CONFIG.maxHouses) {
        const cost = t.houseCost * ((t.houses || 0) + 1);
        h += `<button class="btn" onclick="UI.doImproveBank(${i})">${esc(t.name)} — ${fmt(cost)} (${t.houses || 0}/${CONFIG.maxHouses})</button>`;
      }
    });
    UI.modal('Améliorer', h, [{ label: 'Retour', cls: '', fn: 'UI.openBank()' }]);
  },

  doImproveBank(idx) {
    const r = improveProperty(idx);
    if (!r.ok) { alert(r.msg); return; }
    UI.closeModal(); UI.renderBoard(); UI.renderHUD(); UI.openBank();
  },

  // ---------- Échanges ----------
  openTrade() {
    const p = cur();
    let h = `<p class="hint">Après entente orale entre joueurs, saisissez l'accord ici. Joueur actif : <b>${esc(p.name)}</b>.</p>`;
    h += '<h3>Acheter une activité à un autre joueur</h3>';
    h += `<select id="tr-from">${S.players.filter(x => x.id !== p.id && S.tiles.some(t => t.owner === x.id)).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('') || '<option value="">—</option>'}</select>`;
    h += `<select id="tr-tile">${S.tiles.map((t, i) => t.owner !== null && t.owner !== p.id ? `<option value="${i}">${esc(t.name)}</option>` : '').join('')}</select>`;
    h += `<input type="number" id="tr-price" placeholder="Prix négocié (€)" min="0">`;
    h += `<button class="btn green" onclick="UI.doTradeBuy()">Acheter</button>`;
    h += '<h3>Vendre une part d\'une de mes activités</h3>';
    h += `<select id="sh-tile">${S.tiles.map((t, i) => t.owner === p.id ? `<option value="${i}">${esc(t.name)} (${shareOf(t, p.id)} %)</option>` : '').join('')}</select>`;
    h += `<select id="sh-to">${S.players.filter(x => x.id !== p.id).map(x => `<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>`;
    h += `<select id="sh-pct"><option value="25">25 %</option><option value="50">50 %</option><option value="100">100 %</option></select>`;
    h += `<input type="number" id="sh-price" placeholder="Prix de la part (€)" min="0">`;
    h += `<button class="btn green" onclick="UI.doTradeShare()">Vendre la part</button>`;
    h += '<h3>Proposer un emploi</h3>';
    h += `<select id="jb-to">${S.players.filter(x => x.id !== p.id && !x.employed).map(x => `<option value="${x.id}">${esc(x.name)} (sans emploi)</option>`).join('') || '<option value="">Aucun joueur disponible</option>'}</select>`;
    h += `<select id="jb-tile">${S.tiles.map((t, i) => shareOf(t, p.id) >= 50 ? `<option value="${i}">${esc(t.name)}</option>` : '').join('')}</select>`;
    h += `<input type="number" id="jb-salary" placeholder="Salaire par an (€)" value="1200">`;
    h += `<button class="btn green" onclick="UI.doTradeJob()">Embaucher</button>`;
    UI.modal('Échanges et négociations', h, [{ label: 'Fermer', cls: 'primary', fn: 'UI.closeModal()' }]);
  },

  doTradeBuy() {
    const r = tradeBuyProperty(parseInt($('tr-from').value, 10), parseInt($('tr-tile').value, 10), parseInt($('tr-price').value, 10) || 0);
    if (!r.ok) { alert(r.msg); return; }
    UI.closeModal(); UI.renderBoard(); UI.renderHUD();
  },

  doTradeShare() {
    const r = tradeSellShare(parseInt($('sh-tile').value, 10), parseInt($('sh-to').value, 10), parseInt($('sh-pct').value, 10), parseInt($('sh-price').value, 10) || 0);
    if (!r.ok) { alert(r.msg); return; }
    UI.closeModal(); UI.renderBoard(); UI.renderHUD();
  },

  doTradeJob() {
    const r = tradeOfferJob(parseInt($('jb-to').value, 10), parseInt($('jb-salary').value, 10) || 0, parseInt($('jb-tile').value, 10));
    if (!r.ok) { alert(r.msg); return; }
    UI.closeModal(); UI.renderBoard(); UI.renderHUD();
  },

  // ---------- Vote de loi (majorité unique) ----------
  renderVote() {
    const v = S.vote;
    if (!v) return;
    if (S.phase === 'vote' && !v.chosen) {
      const leg = S.players[v.legislator];
      let h = `<p><span class="player-dot" style="background:${leg.color}"></span><b>${esc(leg.name)}</b> est le législateur de l'année ${S.year}. Choisissez UNE loi à soumettre au vote :</p>`;
      v.options.forEach((l, i) => {
        h += `<div class="event-card"><div class="ev-title">${esc(l.title)}</div><p>${esc(l.text)}</p>
          <button class="btn primary" onclick="UI.doChooseLaw(${i})">Soumettre au vote</button></div>`;
      });
      UI.show('screen-board');
      $('dice-zone').classList.add('hidden');
      UI.modal('Phase démocratique — Année ' + S.year, h, []);
      return;
    }
    if (v.chosen && !v.result) {
      const leg = S.players[v.legislator];
      let h = `<div class="event-card"><div class="ev-title">${esc(v.chosen.title)}</div><p>${esc(v.chosen.text)}</p></div>`;
      h += `<p>Après discussion, le groupe a-t-il voté <b>majoritairement POUR</b> ou <b>CONTRE</b> ?</p>
        <p class="hint">En cas d'égalité, le législateur <b>${esc(leg.name)}</b> départage : il presse son choix.</p>`;
      UI.modal('Vote : ' + v.chosen.title, h, [
        { label: '👍 Majorité POUR', cls: 'green', fn: 'UI.doMajority(true)' },
        { label: '👎 Majorité CONTRE', cls: '', fn: 'UI.doMajority(false)' }
      ]);
      return;
    }
    if (v.result) {
      const r = v.result;
      let h = `<p><b>${esc(v.chosen.title)}</b></p>
        <p>${r.adopted ? '✅ <b>Adoptée</b>' : '❌ <b>Rejetée</b>'} — majorité ${r.majority}.</p>
        ${r.adopted ? `<div class="gainline">${esc(v.chosen.text)}<br><small>S'applique à partir de l'année ${S.year + 1}.</small></div>` : ''}`;
      UI.modal('Résultat du vote', h, [{ label: 'Année suivante →', cls: 'primary', fn: 'UI.doAfterVote()' }]);
    }
  },

  doChooseLaw(i) { chooseLaw(i); UI.renderVote(); },
  doMajority(yes) { setMajority(yes); UI.renderVote(); },
  doAfterVote() {
    const r = afterVote();
    UI.closeModal();
    if (r.next === 'play') {
      UI.renderBoard(); UI.renderHUD(); UI.refreshDiceZone();
    }
  },

  // ---------- Bilan de fin d'année ----------
  renderRecap(recap) {
    recap = recap || S.recap;
    if (!recap) return;
    let h = `<p class="hint">Fin de l'année ${recap.year} : salaires, dividendes, loyers, impôts, prestations et crédits appliqués automatiquement.</p>`;
    h += '<table><tr><th>Joueur</th><th>Travail</th><th>Capital</th><th>Loyer</th><th>Impôts</th><th>Prestations</th><th>Crédit</th><th>Net</th><th>Liquidités</th></tr>';
    recap.rows.forEach(r => {
      const p = playerById(r.pid);
      h += `<tr><td><span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}</td>
        <td>${fmt(r.f.work)}</td><td>${fmt(r.f.capital)}</td><td>${fmt(r.f.rent)}</td>
        <td>${fmt(r.f.taxes)}</td><td>${fmt(r.f.benefits)}</td><td>${fmt(r.f.credit)}</td>
        <td><b>${fmt(r.net)}</b></td><td>${fmt(p.money)}</td></tr>`;
      (r.f.detail || []).forEach(d => h += `<tr><td colspan="9" class="hint">${esc(d)}</td></tr>`);
    });
    h += '</table>';
    const st = S.history[S.history.length - 1];
    const prev = S.history[S.history.length - 2] || S.baseline;
    if (st) {
      const trend = (now, before, lowerIsBetter) => {
        if (before === undefined || before === null) return '';
        const better = lowerIsBetter ? now < before : now > before;
        const same = Math.abs(now - before) < 1e-9;
        const icon = same ? '➖' : (better ? '🟢' : '🔴');
        return ` <b>${icon}</b>`;
      };
      h += '<h3>Indicateurs sociaux (' + (prev === S.baseline ? 'vs début de partie' : 'vs année précédente') + ')</h3>';
      h += `<div class="kpi"><span>Inégalités de revenus (indice)</span><b>${st.giniIncome.toFixed(2)}${trend(st.giniIncome, prev && prev.giniIncome, true)}</b></div>
        <div class="kpi"><span>Inégalités de patrimoine</span><b>${st.giniWealth.toFixed(2)}${trend(st.giniWealth, prev && prev.giniWealth, true)}</b></div>
        <div class="kpi"><span>Précarité</span><b>${Math.round(st.precarity * 100)} %${trend(st.precarity, prev && prev.precarity, true)}</b></div>
        <div class="kpi"><span>Ascenseur social (100 = stable)</span><b>${Math.round(st.mobility * 100)}${trend(st.mobility, prev && prev.mobility, false)}</b></div>`;
    }
    UI.modal('Bilan de fin d\'année ' + recap.year, h, [
      { label: S.year >= CONFIG.years ? 'Voir les résultats finaux' : 'Passer au vote de la loi →', cls: 'primary', fn: 'UI.doContinue()' }
    ]);
  },

  doContinue() {
    const r = continueAfterRecap();
    UI.closeModal();
    if (S.pendingDeaths && S.pendingDeaths.length) { UI.renderDeath(); return; }
    if (r.next === 'end') { UI.renderEnd(); return; }
    startVote();
    UI.renderBoard(); UI.renderHUD();
    UI.renderVote();
  },

  // ---------- Mort et héritage ----------
  renderDeath() {
    if (!S.pendingDeaths || !S.pendingDeaths.length) return;
    const pid = S.pendingDeaths[0];
    const p = playerById(pid);
    let h = `<div class="event-card"><div class="ev-title">🕯️ Décès de ${esc(p.cname)}</div>
      <p>Le joueur <b>${esc(p.name)}</b> continue immédiatement avec un descendant : nouvelle profession, nouvelle situation, patrimoine net transmis après droits de succession (${Math.round(S.params.successions * 100)} %).</p></div>
      <p>Patrimoine net actuel : <b>${fmt(patrimoineNet(p))}</b></p>`;
    UI.modal('Succession', h, [{ label: 'Continuer avec le descendant', cls: 'primary', fn: `UI.doDeath(${pid})` }]);
  },

  doDeath(pid) {
    const r = confirmDeath(pid);
    UI.closeModal();
    const cont = S.pendingDeaths.length
      ? 'UI.renderDeath()'
      : (S.phase === 'recap' ? 'UI.doContinue()' : 'UI.closeModal();UI.onEndTurn()');
    UI.modal('Héritage', `<p><b>${esc(r.heir)}</b> prend la suite.</p>
      <div class="infoline">Patrimoine transmis : ${fmt(r.inherited)}<br>Droits de succession payés : ${fmt(r.tax)}</div>`,
      [{ label: 'Continuer', cls: 'primary', fn: cont }]);
  },

  // ---------- Tableau de bord social ----------
  openDashboard() {
    const st = computeStats();
    const base = S.baseline || st;
    const gauge = (val, max, warn, bad) => {
      const pctv = Math.max(0, Math.min(100, val / max * 100));
      const cls = val >= bad ? 'bad' : val >= warn ? 'warn' : '';
      return `<div class="gauge ${cls}"><div style="width:${pctv}%"></div></div>`;
    };
    let h = '<h3>1 · Ascenseur social</h3>';
    h += `<p class="hint">Niveau de vie actuel comparé au milieu d'origine (100 = stable).</p>`;
    S.players.forEach((p, i) => {
      const mob = st.levels[i] / Math.max(1, p.origin) * 100;
      h += `<div class="kpi"><span><span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}</span><b>${Math.round(mob)}</b></div>`;
      h += gauge(mob, 300, 100, 60);
    });
    h += `<h3>2 · Inégalités</h3>`;
    h += `<div class="kpi"><span>Revenus (indice 0 = égalité)</span><b>${st.giniIncome.toFixed(2)} <small>(départ : ${base.giniIncome.toFixed(2)})</small></b></div>`;
    h += gauge(st.giniIncome * 100, 100, 30, 45);
    h += `<div class="kpi"><span>Patrimoine</span><b>${st.giniWealth.toFixed(2)} <small>(départ : ${base.giniWealth.toFixed(2)})</small></b></div>`;
    h += gauge(st.giniWealth * 100, 100, 40, 60);
    h += `<div class="kpi"><span>Écart max de revenus</span><b>×${(Math.max(...st.levels) / Math.max(1, Math.min(...st.levels))).toFixed(1)}</b></div>`;
    h += `<h3>3 · Précarité</h3>`;
    h += `<div class="kpi"><span>Joueurs concernés</span><b>${Math.round(st.precarity * 100)} %</b></div>`;
    h += gauge(st.precarity * 100, 100, 1, 34);
    S.players.forEach((p, i) => {
      const f = st.flags[i];
      const on = Object.entries(f).filter(x => x[1]).map(x => x[0]);
      h += `<div class="kpi"><span><span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}</span>
        <b>${on.length ? '<span class="badge b-precar">' + on.join(' · ') + '</span>' : 'OK'}</b></div>`;
    });
    h += `<h3>4 · Niveaux de vie (€/UC/an)</h3>`;
    h += '<table><tr><th>Joueur</th><th>Actuel</th><th>Origine</th></tr>';
    S.players.forEach((p, i) => {
      h += `<tr><td>${esc(p.name)}</td><td><b>${fmt(st.levels[i])}</b></td><td>${fmt(p.origin)}</td></tr>`;
    });
    h += '</table>';
    UI.modal('Tableau de bord social', h, [{ label: 'Fermer', cls: 'primary', fn: 'UI.closeModal()' }]);
  },

  openLaws() {
    let h = '<p class="hint">Lois adoptées pendant la partie (elles modifient les paramètres des tours suivants) :</p>';
    if (!S.adoptedLaws.length) h += '<p>Aucune loi adoptée pour l\'instant.</p>';
    S.adoptedLaws.forEach(l => {
      h += `<div class="event-card"><div class="ev-title">Année ${l.year} — ${esc(l.title)}</div><p>${esc(l.text)}</p></div>`;
    });
    h += `<h3>Paramètres actuels</h3><table>
      <tr><td>Remboursement santé</td><td>${Math.round(S.params.healthReimb * 100)} %</td></tr>
      <tr><td>Remboursement éducation</td><td>${Math.round(S.params.educationReimb * 100)} %</td></tr>
      <tr><td>Remboursement transport</td><td>${Math.round(S.params.transportReimb * 100)} %</td></tr>
      <tr><td>Allocations / enfant</td><td>${fmt(S.params.familyAllowance)}</td></tr>
      <tr><td>Revenu minimum / UC</td><td>${fmt(S.params.minimumIncome)}</td></tr>
      <tr><td>Flat tax capital</td><td>${Math.round(S.params.capitalTax * 100)} %</td></tr>
      <tr><td>Droits de succession</td><td>${Math.round(S.params.successions * 100)} %</td></tr>
      <tr><td>Taux d'emprunt / an</td><td>${(S.params.loanRate * 100).toFixed(1)} %</td></tr>
      <tr><td>Prix de l'énergie</td><td>× ${S.params.energyPrice.toFixed(2)}</td></tr>
    </table>`;
    UI.modal('Lois et paramètres', h, [{ label: 'Fermer', cls: 'primary', fn: 'UI.closeModal()' }]);
  },

  openLog() {
    let h = S.log.map(l => `<div class="logline"><small>An ${l.year}</small> · ${l.html}</div>`).join('') || '<p>Rien pour l\'instant.</p>';
    UI.modal('Journal de partie', h, [{ label: 'Fermer', cls: 'primary', fn: 'UI.closeModal()' }]);
  },

  // ---------- Info d'une case ----------
  tileInfo(i) {
    const t = S.tiles[i];
    let h = `<p><b>${esc(t.name)}</b></p>`;
    if (t.type === 'prop' || t.type === 'housing') {
      h += `<p>Prix : ${fmt(t.price)} · Revenu automatique : ${t.dividend ? fmt(t.dividend) + '/an' : '—'}</p>`;
      h += `<p>Consommation type : ${esc(t.service.label)} — ${fmt(t.service.price)} (${esc(t.service.cat)})</p>`;
      if (t.public) h += '<div class="infoline">Service public.</div>';
      if (t.owner !== null) {
        const owners = ownersOf(t).map(pid => `<span class="player-dot" style="background:${S.players[pid].color}"></span>${esc(S.players[pid].name)} (${shareOf(t, pid)} %)`);
        h += `<div class="infoline">Propriétaire(s) : ${owners.join(', ')}${t.houses ? ` · ${t.houses === 5 ? 'Hôtel' : t.houses + ' maison(s)'}` : ''}</div>`;
      } else {
        h += '<div class="infoline">À vendre.</div>';
      }
    } else {
      const desc = {
        start: 'Percevez 200 € en passant.', chance: 'Tirez une carte Chance.', commu: 'Événement collectif.',
        malheur: 'Tirez une carte Porte-malheur.', bank: 'Emprunter, rembourser, améliorer.',
        jail: 'Simple visite… sauf si vous êtes condamné.', gotojail: 'Direction la prison !',
        empty: 'Case neutre.'
      }[t.type] || '';
      h += `<p>${desc}</p>`;
    }
    UI.modal('Case ' + i, h, [{ label: 'Fermer', cls: 'primary', fn: 'UI.closeModal()' }]);
  },

  // ---------- Écran final ----------
  renderEnd() {
    if (!S.results) S.results = finalResults();
    const r = S.results;
    $('end-verdict').textContent = r.win ? '🏆 La société gagne !' : '📉 La société échoue…';
    let h = `<div class="card"><h3>Objectifs collectifs (au moins un atteint = victoire)</h3>`;
    r.objectives.forEach(o => {
      h += `<div class="kpi"><span>${o.ok ? '✅' : '❌'} ${esc(o.label)}</span><b><small>${esc(o.detail || '')}</small></b></div>`;
    });
    h += '</div><div class="card"><h3>Situations individuelles finales</h3><table><tr><th>Joueur</th><th>Personnage</th><th>Liquidités</th><th>Patrimoine net</th><th>Niveau de vie</th></tr>';
    const st = r.last;
    S.players.forEach((p, i) => {
      h += `<tr><td><span class="player-dot" style="background:${p.color}"></span>${esc(p.name)}</td>
        <td>${esc(p.cname)}</td><td>${fmt(p.money)}</td><td>${fmt(st.pats[i])}</td><td>${fmt(st.levels[i])}</td></tr>`;
    });
    h += '</table></div>';
    h += `<div class="card"><h3>Loi(s) adoptée(s)</h3>${S.adoptedLaws.map(l => `<div class="logline">An ${l.year} · <b>${esc(l.title)}</b></div>`).join('') || '<p class="hint">Aucune.</p>'}</div>`;
    h += `<div class="card small"><p class="hint">Comparez les trajectoires : revenus du travail vs revenus du capital, situations avant/après redistribution, effet de l'héritage.</p></div>`;
    $('end-content').innerHTML = h;
    UI.show('screen-end');
  },

  // ---------- Modale générique ----------
  modal(title, bodyHTML, actions) {
    $('modal-title').textContent = title;
    $('modal-body').innerHTML = bodyHTML;
    $('modal-actions').innerHTML = (actions || []).map(a =>
      `<button class="btn ${a.cls || ''}" onclick="${a.fn}">${a.label}</button>`).join('');
    $('overlay').classList.remove('hidden');
  },
  closeModal() { $('overlay').classList.add('hidden'); }
};

// Position de grille d'une case (parcours Monopoly : bas → gauche → haut → droite)
function gridPos(i) {
  if (i <= 10) return [11, 11 - i];        // bas, de droite à gauche
  if (i <= 20) return [11 - (i - 10), 1];  // gauche, de bas en haut
  if (i <= 30) return [1, 1 + (i - 20)];   // haut, de gauche à droite
  return [1 + (i - 30), 11];               // droite, de haut en bas
}

function tileColor(t) {
  const groups = {
    'marron': 'var(--brown)', 'bleu': 'var(--lblue)', 'rose': 'var(--pink)',
    'orange': 'var(--orange)', 'rouge': 'var(--redg)', 'jaune': 'var(--yellow)',
    'vert': 'var(--greeng)', 'bleuf': 'var(--dblue)',
    'log-basic': 'var(--brown)', 'log-prive': 'var(--pink)',
    'log-luxe': 'var(--yellow)', 'log-hlm': 'var(--greeng)'
  };
  if (t.group) return groups[t.group] || 'var(--grey)';
  const types = {
    start: 'var(--gold)', chance: 'var(--orange)', commu: 'var(--dblue)',
    malheur: 'var(--red)', bank: 'var(--green)', jail: 'var(--grey)',
    gotojail: 'var(--red)', empty: 'var(--cream)'
  };
  return types[t.type] || 'var(--cream)';
}

function shortName(t) {
  const map = {
    start: 'DÉPART', jail: 'PRISON', gotojail: 'ALLER EN PRISON',
    chance: 'CHANCE', commu: 'CAISSE DE COMMUNAUTÉ', malheur: t.sub ? t.name.split(' : ')[1] : t.name,
    bank: 'BANQUE', empty: t.name
  };
  if (map[t.name]) return map[t.name];
  return t.name.length > 18 ? t.name.slice(0, 17) + '…' : t.name;
}
