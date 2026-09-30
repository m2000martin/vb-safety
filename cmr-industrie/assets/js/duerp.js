// VB Safety · Mon DUERP risque chimique : parcours pas à pas, une question par écran.
// Utilise le moteur partagé (eval-core.js) et les mêmes données que le mode expert (evaluation.html).
(function () {
  'use strict';

  // ------------------------------------------------------------------ étapes
  var STEPS = [
    { id: 'entreprise', t: 'Mon entreprise', d: '1 minute' },
    { id: 'produits', t: 'Mes produits', d: 'Environ 5 minutes par produit' },
    { id: 'prio', t: 'Mes priorités', d: 'Calcul automatique' },
    { id: 'actions', t: 'Mes actions', d: 'Qui fait quoi, et quand' },
    { id: 'salaries', t: 'Salariés exposés', d: 'Seulement si un produit est cancérogène' },
    { id: 'dossier', t: 'Mon dossier DUERP', d: 'Téléchargement en PDF' }
  ];
  var UI = { view: 'accueil', wz: null };
  S.seen = S.seen || {};

  function icon(n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function plural(n, w, ws) { return n + ' ' + (n > 1 ? (ws || w + 's') : w); }
  var saveTimer = null;
  function persist() {
    save();
    var el = $('#du-save'); if (!el) return;
    el.textContent = 'Enregistré'; el.classList.add('on');
    clearTimeout(saveTimer); saveTimer = setTimeout(function () { el.classList.remove('on'); el.textContent = 'Enregistré automatiquement'; }, 1400);
  }
  function announce(t) { $('#du-live').textContent = t; }

  function stepDone(id) {
    var rows;
    if (id === 'entreprise') return !!(S.site && S.effectif);
    if (id === 'produits') return S.products.length > 0 && !S.products.some(function (p) { return p.fds === 'manquante'; });
    if (!S.products.length) return false;
    if (id === 'prio') return !!S.seen.prio;
    if (id === 'actions') { rows = compute(); var it = planItems(rows); return it.length > 0 && it.every(function (x) { var a = S.actions[x.k] || {}; return a.statut === 'fait' || (a.resp && a.date); }); }
    if (id === 'salaries') { rows = compute(); return !!S.seen.sal || !rows.some(function (r) { return r.cmr === 'cmr'; }); }
    if (id === 'dossier') return !!S.exported;
    return false;
  }
  function stepIndex(id) { for (var i = 0; i < STEPS.length; i++) if (STEPS[i].id === id) return i; return -1; }

  function drawSide() {
    var cur = UI.wz ? 'produits' : UI.view;
    $('#du-steps').innerHTML = STEPS.map(function (s, i) {
      var d = stepDone(s.id), on = s.id === cur;
      return '<li class="' + (on ? 'on ' : '') + (d ? 'done' : '') + '"><a href="#' + s.id + '"' + (on ? ' aria-current="step"' : '') + '><i>' + (d ? icon('check') + '<span class="sr-only">Terminé : </span>' : i + 1) + '</i><span><b>' + s.t + '</b><small>' + s.d + '</small></span></a></li>';
    }).join('');
    var k = stepIndex(cur);
    $('#du-top-title').textContent = k >= 0 ? STEPS[k].t : 'Mon DUERP';
    $('#du-top-step').textContent = k >= 0 ? 'Étape ' + (k + 1) + ' sur ' + STEPS.length : 'Risque chimique';
    var doneN = STEPS.filter(function (s) { return stepDone(s.id); }).length;
    $('#du-bar').style.width = Math.round(doneN / STEPS.length * 100) + '%';
  }

  // ------------------------------------------------------------------ gabarits
  function screen(o) {
    // o: kicker, title, sub, body, help, back, next, nextLabel, nextDisabled, extraFoot
    return '<section class="q">' +
      (o.kicker ? '<p class="q-k">' + o.kicker + '</p>' : '') +
      '<h1 class="q-t" id="q-title">' + o.title + '</h1>' + (o.sub ? '<p class="q-s">' + o.sub + '</p>' : '') +
      '<div class="q-grid' + (o.help ? '' : ' q-solo') + '"><div class="q-main">' + o.body + '</div>' + (o.help ? '<aside class="q-help" aria-label="Aide">' + o.help + '</aside>' : '') + '</div></section>' +
      '<footer class="du-foot">' + (o.back ? '<button type="button" class="btn btn-secondary" data-nav="' + o.back + '">' + icon('back') + 'Retour</button>' : '<span></span>') +
      (o.extraFoot || '') +
      (o.next ? '<button type="button" class="btn btn-primary" data-nav="' + o.next + '" id="q-next"' + (o.nextDisabled ? ' disabled' : '') + '>' + (o.nextLabel || 'Continuer') + icon('arrow') + '</button>' : '') + '</footer>';
  }
  function help(title, steps, mock) {
    return '<h2 class="h-t">' + icon('help') + title + '</h2>' + (steps ? '<ol class="h-steps">' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' : '') + (mock || '');
  }
  function tiles(name, list, cur, cls) {
    return '<div class="tiles ' + (cls || '') + '" role="radiogroup">' + list.map(function (t) {
      var on = String(cur) === String(t[0]);
      return '<button type="button" class="tile' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-tile="' + name + '" data-v="' + esc(t[0]) + '"><span class="tile-dot" aria-hidden="true"></span><span class="tile-txt"><b>' + t[1] + '</b>' + (t[2] ? '<span>' + t[2] + '</span>' : '') + '</span></button>';
    }).join('') + '</div>';
  }

  // Maquettes d'aide (fiche de données de sécurité, étiquette)
  var MOCK = {
    label: '<div class="mock mock-label"><span class="mock-cap">Étiquette du produit</span><div class="lab"><div class="lab-dia" aria-hidden="true"><i></i><i></i></div><div><b class="hl">DÉGRAISSANT PRO X</b><span>Contient : trichloréthylène</span><span>DANGER · H350 · H336</span><em>Fournisseur Exemple SAS · 5 L</em></div></div><p class="mock-arrow">Le nom est écrit en gros sur l\'étiquette, et en rubrique 1 de la fiche de données de sécurité.</p></div>',
    fds2: '<div class="mock mock-fds"><span class="mock-cap">Fiche de données de sécurité · page 1 ou 2</span><div class="paper"><b class="p-h">RUBRIQUE 2 : Identification des dangers</b><p>2.1 Classification de la substance ou du mélange</p><p><mark>H350</mark> Peut provoquer le cancer.</p><p><mark>H336</mark> Peut provoquer somnolence ou vertiges.</p><p><mark>H315</mark> Provoque une irritation cutanée.</p><p class="p-dim">2.2 Éléments d\'étiquetage…</p></div><p class="mock-arrow">Recopiez les codes surlignés : ils commencent toujours par H (ou EUH).</p></div>',
    fds3: '<div class="mock mock-fds"><span class="mock-cap">Fiche de données de sécurité · rubrique 3</span><div class="paper"><b class="p-h">RUBRIQUE 3 : Composition / informations sur les composants</b><table><tr><th>Nom</th><th>N° CAS</th><th>%</th></tr><tr><td>Trichloréthylène</td><td><mark>79-01-6</mark></td><td>60 à 100</td></tr><tr><td>Stabilisant</td><td>—</td><td>&lt; 1</td></tr></table></div><p class="mock-arrow">Le n° CAS permet de retrouver la valeur limite officielle de la substance.</p></div>',
    fds9: '<div class="mock mock-fds"><span class="mock-cap">Fiche de données de sécurité · rubrique 9</span><div class="paper"><b class="p-h">RUBRIQUE 9 : Propriétés physiques et chimiques</b><p>État physique : liquide</p><p><mark>Point d\'ébullition : 87 °C</mark></p><p class="p-dim">Point d\'éclair : non applicable</p></div><p class="mock-arrow">Si vous trouvez cette valeur, indiquez-la : c\'est plus précis que l\'estimation.</p></div>'
  };

  // Mentions de danger santé, regroupées en mots simples
  var HGROUPS = [
    ['Cancer, mutations, reproduction', ['H350', 'H340', 'H360', 'H351', 'H341', 'H361', 'H362']],
    ['Toxique ou mortel', ['H300', 'H310', 'H330', 'H301', 'H311', 'H331', 'H370', 'H372']],
    ['Nocif', ['H302', 'H312', 'H332', 'H304', 'H371', 'H373']],
    ['Allergies', ['H317', 'H334']],
    ['Brûlures et irritations', ['H314', 'H318', 'H315', 'H319', 'H335', 'H336', 'EUH066', 'EUH070']]
  ];

  // ------------------------------------------------------------------ assistant produit
  function newDraft(type) {
    return { type: type, name: '', h: [], subs: [], etat: '', teb: '', vol: null, pulv: '', qte: '', unite: '', freq: '', poste: '', nb: '', proc: '', prot: '', procede: '', intensite: '', noH: false, fds: '' };
  }
  function questions(p) {
    if (p.type === 'procede') return ['procede', 'intensite', 'freq', 'proc', 'prot', 'poste', 'recap'];
    var q = ['name', 'h', 'subs', 'etat'];
    if (p.etat === 'solide') q.push('pulv'); else if (p.etat !== 'gaz') q.push('vol');
    return q.concat(['qte', 'freq', 'proc', 'prot', 'poste', 'recap']);
  }
  function answered(p, q) {
    switch (q) {
      case 'name': return !!p.name.trim();
      case 'h': return p.h.length > 0 || p.noH || p.fds === 'manquante';
      case 'subs': return true;
      case 'etat': return !!p.etat;
      case 'vol': return p.vol !== null;
      case 'pulv': return !!p.pulv;
      case 'qte': return p.qte !== '' && +p.qte >= 0 && !!p.unite;
      case 'freq': return !!p.freq;
      case 'proc': return !!p.proc;
      case 'prot': return !!p.prot;
      case 'poste': return !!p.poste.trim();
      case 'procede': return !!p.procede;
      case 'intensite': return !!p.intensite;
      default: return true;
    }
  }
  function startWizard(type, prod) {
    var d = prod ? JSON.parse(JSON.stringify(prod)) : newDraft(type);
    if (prod) { d.h = d.h || []; d.subs = d.subs || []; if (d.vol === undefined) d.vol = ''; if (d.teb === undefined) d.teb = ''; }
    UI.wz = { p: d, i: 0, edit: prod ? prod.id : null };
    UI.view = 'produits';
    go('produit');
  }
  function wzNum() { var n = UI.wz.edit ? S.products.findIndex(function (x) { return x.id === UI.wz.edit; }) + 1 : S.products.length + 1; return n; }

  function renderWizard() {
    var w = UI.wz, p = w.p, qs = questions(p);
    if (w.i >= qs.length) w.i = qs.length - 1;
    var q = qs[w.i], kicker = 'Étape 2 · ' + (p.type === 'procede' ? 'Source ' : 'Produit ') + wzNum() + ' · question ' + (w.i + 1) + ' sur ' + qs.length;
    var back = w.i === 0 ? 'wz-cancel' : 'wz-prev', o = { kicker: kicker, back: back, next: 'wz-next', nextDisabled: !answered(p, q) };
    var nm = p.name ? '« ' + esc(p.name) + ' »' : 'ce produit';
    switch (q) {
      case 'name':
        o.title = 'Comment s\'appelle le produit ?';
        o.sub = 'Écrivez le nom tel qu\'il figure sur l\'étiquette.';
        o.body = '<label class="big-field"><span class="sr-only">Nom du produit</span><input class="input input-xl" data-f="name" maxlength="120" value="' + esc(p.name) + '" placeholder="Ex. Dégraissant Pro X" autocomplete="off"></label>';
        o.help = help('Où trouver le nom ?', null, MOCK.label);
        break;
      case 'h':
        o.title = 'Quelles mentions de danger figurent sur la fiche de sécurité de ' + nm + ' ?';
        o.sub = 'Ce sont des codes comme H350 ou H315. Recopiez-les, ou cochez-les dans la liste.';
        o.body = '<label class="big-field"><span class="lbl">Codes H (ou texte copié de la fiche)</span><input class="input input-xl" data-f="htext" placeholder="Ex. H350 H336 H315" autocomplete="off"></label>' +
          '<div class="h-chips" id="h-chips">' + hChips(p) + '</div>' +
          '<details class="h-list"' + (p.h.length ? '' : '') + '><summary>Ou cocher dans la liste</summary>' + HGROUPS.map(function (g) {
            return '<fieldset><legend>' + g[0] + '</legend>' + g[1].map(function (h) { return '<label class="h-opt"><input type="checkbox" data-h="' + h + '"' + (p.h.indexOf(h) !== -1 ? ' checked' : '') + '><span><b>' + h + '</b> ' + esc(H_LABEL[h] || '') + '</span></label>'; }).join('') + '</fieldset>';
          }).join('') + '</details>' +
          '<div class="h-alt"><button type="button" class="chip-btn' + (p.noH ? ' on' : '') + '" data-act="noh">Aucune mention H de santé sur la fiche</button><button type="button" class="chip-btn' + (p.fds === 'manquante' ? ' on' : '') + '" data-act="nofds">Je n\'ai pas la fiche de sécurité</button></div>' +
          (p.fds === 'manquante' ? '<div class="info-box">Le fournisseur doit vous la remettre gratuitement (règlement REACH, article 31). Demandez-la-lui. En attendant, vous pouvez continuer : le produit sera marqué « fiche à obtenir » et vous le compléterez plus tard.</div>' : '');
        o.help = help('Comment faire ?', ['Ouvrez la fiche de données de sécurité (FDS), souvent un PDF sur le site du fournisseur.', 'Cherchez « Rubrique 2 ».', 'Recopiez les codes qui commencent par H.'], MOCK.fds2);
        break;
      case 'subs':
        o.title = 'Quelles substances contient ' + nm + ' ?';
        o.sub = 'Facultatif, mais utile : l\'outil retrouve les valeurs limites officielles. Tapez un nom ou un n° CAS.';
        o.body = '<label class="big-field sub-field"><span class="lbl">Rechercher une substance</span><span class="sub-in">' + icon('search') + '<input class="input input-xl" data-f="subq" placeholder="Ex. toluène, formaldéhyde, 79-01-6" autocomplete="off"></span></label><ul class="sub-sug" id="sub-sug"></ul><div class="sub-list" id="sub-list">' + subList(p) + '</div>';
        o.help = help('Où trouver les substances ?', ['Rubrique 3 de la fiche de données de sécurité.', 'Recopiez le nom ou le numéro CAS de chaque substance dangereuse.'], MOCK.fds3);
        o.nextLabel = p.subs.length ? 'Continuer' : 'Passer cette question';
        break;
      case 'etat':
        o.title = 'Sous quelle forme se présente ' + nm + ' ?';
        o.body = tiles('etat', [['liquide', 'Liquide', 'Peinture, solvant, huile, colle, aérosol…'], ['solide', 'Solide ou poudre', 'Poudre, granulés, pâte, pièce que l\'on ponce…'], ['gaz', 'Gaz, vapeur ou fumée', 'Bouteille de gaz, fumées de soudage ou de cuisson…']], p.etat);
        break;
      case 'vol':
        o.title = 'Le produit s\'évapore-t-il vite ?';
        o.sub = 'Plus un liquide s\'évapore vite, plus on en respire.';
        o.body = tiles('vol', [['1', 'Lentement', 'Comme une huile ou un gazole'], ['2', 'Moyennement', 'Comme l\'eau, l\'alcool ou un diluant'], ['3', 'Très vite', 'Comme l\'éther : il disparaît en quelques secondes'], ['', 'Je ne sais pas', 'L\'outil retient une évaporation moyenne']], p.vol === null ? null : p.vol, 'tiles-2') +
          '<label class="teb-field"><span class="lbl">Vous connaissez la température d\'ébullition ? (facultatif)</span><span class="teb-in"><input class="input" data-f="teb" inputmode="decimal" value="' + esc(p.teb) + '" placeholder="Ex. 87"><span>°C</span></span></label>';
        o.help = help('Pour être plus précis', ['La température d\'ébullition figure en rubrique 9 de la fiche de sécurité.', 'Moins de 50 °C : évaporation rapide. Plus de 150 °C : évaporation lente.'], MOCK.fds9);
        break;
      case 'pulv':
        o.title = 'Le produit fait-il de la poussière ?';
        o.body = tiles('pulv', [['1', 'Non, pas de poussière', 'Bloc, granulés, pâte'], ['2', 'Un peu', 'Poudre à gros grains, qui retombe vite'], ['3', 'Beaucoup', 'Poudre fine qui vole et reste en l\'air, comme la farine']], p.pulv);
        break;
      case 'qte':
        o.title = 'Quelle quantité de ' + nm + ' utilisez-vous en un an ?';
        o.sub = 'Une estimation suffit.';
        o.body = '<div class="qte-row"><label class="big-field"><span class="sr-only">Quantité par an</span><input class="input input-xl" data-f="qte" inputmode="decimal" value="' + esc(p.qte) + '" placeholder="Ex. 250"></label>' + tiles('unite', [['kg', 'kg'], ['L', 'litres']], p.unite, 'tiles-unit') + '</div>';
        o.help = help('Comment l\'estimer ?', ['Additionnez les achats des 12 derniers mois (factures, bons de livraison).', 'Si le produit sert peu, une petite quantité suffit : l\'outil compare vos produits entre eux.']);
        break;
      case 'freq':
        o.title = p.type === 'procede' ? 'Combien de temps un salarié y est-il exposé ?' : 'Combien de temps un salarié utilise-t-il ' + nm + ' ?';
        o.body = tiles('freq', [['1', 'Rarement', 'Moins de 30 minutes par jour, ou moins de 2 heures par semaine'], ['2', 'De temps en temps', '30 minutes à 2 heures par jour'], ['3', 'Souvent', '2 à 6 heures par jour'], ['4', 'Presque tout le temps', 'Plus de 6 heures par jour']], p.freq);
        o.help = help('Comment répondre ?', ['Pensez au salarié qui l\'utilise le plus.', 'En cas de doute, choisissez la réponse la plus longue.']);
        break;
      case 'proc':
        o.title = 'Comment ' + (p.type === 'procede' ? 'ces poussières ou fumées sont-elles produites' : 'le produit est-il utilisé') + ' ?';
        o.body = tiles('proc', [['1', 'Dans une machine fermée', 'Le produit ne sort jamais : cuve ou circuit fermé'], ['2', 'Dans une machine qu\'on ouvre souvent', 'Bac fermé que l\'on ouvre pour charger ou nettoyer'], ['3', 'À l\'air libre', 'Au pinceau, au chiffon, dans un bac ouvert, au trempé'], ['4', 'En le projetant', 'Pistolet, pulvérisation, soufflage, ponçage']], p.proc);
        break;
      case 'prot':
        o.title = 'Y a-t-il une aspiration au poste ?';
        o.body = tiles('prot', [['1', 'Oui, qui entoure le produit', 'Hotte fermée, sorbonne de laboratoire, boîte à gants'], ['2', 'Oui, près du poste', 'Bras aspirant, cabine de peinture, table aspirante'], ['3', 'Seulement la ventilation du bâtiment', 'Ventilation générale, extracteur au mur'], ['4', 'Non, rien', 'Fenêtres ou portes ouvertes seulement']], p.prot);
        o.help = help('Pourquoi cette question ?', ['Une aspiration au plus près du produit réduit fortement ce que respirent les salariés.', 'Le masque ne compte pas ici : il vient en dernier recours.']);
        break;
      case 'poste':
        o.title = 'Où est-il utilisé, et par combien de salariés ?';
        o.body = '<div class="form-2"><label class="big-field"><span class="lbl">Poste ou atelier</span><input class="input input-xl" data-f="poste" maxlength="80" value="' + esc(p.poste) + '" placeholder="Ex. Atelier peinture" list="postes-list"></label><label class="big-field"><span class="lbl">Nombre de salariés concernés</span><input class="input input-xl" data-f="nb" type="number" min="0" inputmode="numeric" value="' + esc(p.nb) + '" placeholder="Ex. 3"></label></div>' +
          '<datalist id="postes-list">' + postes().map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>' +
          (postes().length ? '<p class="hint-line">Postes déjà saisis : ' + postes().map(function (x) { return '<button type="button" class="chip-btn sm" data-poste="' + esc(x) + '">' + esc(x) + '</button>'; }).join(' ') + '</p>' : '');
        o.help = help('Pourquoi cette question ?', ['Si le produit est cancérogène, les salariés de ce poste doivent être inscrits sur la liste des travailleurs exposés.']);
        break;
      case 'procede':
        o.title = 'Quelle source de poussières ou de fumées ?';
        o.sub = 'Ces activités sont classées cancérogènes par la réglementation, même sans fiche de sécurité.';
        o.body = tiles('procede', Object.keys(PROCEDES).map(function (k) { return [k, PROCEDES[k].label]; }), p.procede, 'tiles-2');
        break;
      case 'intensite':
        o.title = 'Y a-t-il beaucoup de poussières ou de fumées ?';
        o.body = tiles('intensite', [['2', 'Peu', 'On ne voit presque rien'], ['3', 'Moyennement', 'Visible autour du poste'], ['5', 'Beaucoup', 'Nuage visible, dépôts sur les surfaces']], p.intensite);
        break;
      case 'recap':
        o.title = 'Voici le résultat pour ' + nm;
        o.body = recap(p);
        o.next = 'wz-save'; o.nextLabel = UI.wz.edit ? 'Enregistrer les modifications' : 'Enregistrer ce produit'; o.nextDisabled = false;
        break;
    }
    return screen(o);
  }
  function hChips(p) {
    if (!p.h.length) return '<span class="muted">Aucun code saisi pour l\'instant.</span>';
    return p.h.map(function (h) { return '<button type="button" class="hchip' + (CMR[h] ? ' c' : CMR_SUSP[h] ? ' s' : '') + '" data-rmh="' + h + '" aria-label="Retirer ' + h + '"><b>' + h + '</b> ' + esc(H_LABEL[h] || 'Mention hors santé') + ' ' + icon('x') + '</button>'; }).join('');
  }
  function subList(p) {
    if (!p.subs.length) return '';
    return p.subs.map(function (id) { var x = RBY[id]; if (!x) return ''; return '<div class="sub-it"><div><b>' + esc(x.nom) + '</b><span>' + (x.cas && x.cas[0] ? 'CAS ' + x.cas[0] : '') + (hasVlep(x) ? ' · valeur limite ' + vlepTxt(x, true) : ' · pas de valeur limite contraignante') + '</span></div><button type="button" class="icon-x" data-rmsub="' + esc(id) + '" aria-label="Retirer ' + esc(x.nom) + '">' + icon('x') + '</button></div>'; }).join('');
  }
  function postes() { var o = []; S.products.forEach(function (x) { if (x.poste && o.indexOf(x.poste) === -1) o.push(x.poste); }); return o; }

  function rowFor(p) {
    var tmp = JSON.parse(JSON.stringify(p)); tmp.id = tmp.id || -1;
    finalize(tmp);
    var had = S.products.findIndex(function (x) { return x.id === tmp.id; }), keep = had >= 0 ? S.products[had] : null;
    if (had >= 0) S.products[had] = tmp; else S.products.push(tmp);
    var r = compute().filter(function (x) { return x.p === tmp; })[0];
    if (had >= 0) S.products[had] = keep; else S.products.pop();
    return r;
  }
  function finalize(p) {
    p.freq = +p.freq; p.proc = +p.proc; p.prot = +p.prot;
    if (p.type === 'procede') { var d = PROCEDES[p.procede] || {}; p.intensite = +p.intensite; p.etat = d.etat; p.pulv = d.pulv || 2; p.vol = d.vol || ''; p.name = p.name || d.label; }
    else { p.pulv = +p.pulv || 2; p.vol = p.vol === null ? '' : p.vol; p.qte = p.qte === '' ? '' : +String(p.qte).replace(',', '.'); }
    p.nb = p.nb === '' ? '' : Math.max(0, parseInt(p.nb, 10) || 0);
    return p;
  }
  var LEVEL = { 1: ['Élevé', 'bad', 'À traiter en priorité'], 2: ['Moyen', 'mid', 'À surveiller et à réduire'], 3: ['Faible', 'ok', 'Maintenir les bonnes pratiques'] };
  function level(r) { return Math.min(r.prio, r.inh); }
  function reasons(r) {
    var p = r.p, out = [];
    if (r.cmr === 'cmr') out.push(p.type === 'procede' ? 'activité classée cancérogène' : 'produit cancérogène, mutagène ou toxique pour la reproduction');
    else if (r.cmr === 'susp') out.push('produit suspecté cancérogène ou reprotoxique');
    else out.push(['', 'peu dangereux', 'irritant', 'nocif', 'toxique', 'très toxique'][r.dc]);
    out.push(['', 'utilisé rarement', 'utilisé de temps en temps', 'utilisé souvent', 'utilisé presque tout le temps'][r.fc]);
    out.push(['', 'en machine fermée', 'en machine souvent ouverte', 'à l\'air libre', 'projeté ou pulvérisé'][+p.proc || 3]);
    out.push(['', 'avec une aspiration qui entoure le produit', 'avec une aspiration au poste', 'avec la seule ventilation du bâtiment', 'sans aspiration'][+p.prot || 4]);
    return out;
  }
  function recap(p) {
    var r = rowFor(p), L = LEVEL[level(r)];
    var acts = actionsFor(r).slice(0, 4);
    return '<div class="res res-' + L[1] + '"><span class="res-k">Niveau de risque</span><b>' + L[0] + '</b><span>' + L[2] + '</span></div>' +
      '<p class="res-why"><b>Pourquoi :</b> ' + esc(reasons(r).join(', ')) + '.</p>' +
      (r.cmr === 'cmr' ? '<div class="info-box red"><b>' + (p.type === 'procede' ? 'Activité cancérogène' : 'Produit cancérogène (CMR)') + '</b> Des règles particulières s\'appliquent : remplacement à étudier en priorité, liste des salariés exposés, suivi médical renforcé.</div>' : '') +
      (r.vleps.length ? '<div class="info-box"><b>Valeur limite officielle</b> ' + r.vleps.map(function (x) { return esc(x.nom) + ' : ' + vlepTxt(x); }).join(' · ') + '. Un contrôle par un organisme accrédité est obligatoire au moins une fois par an.</div>' : '') +
      (p.fds === 'manquante' ? '<div class="info-box">Fiche de sécurité à obtenir : le résultat sera à revoir quand vous l\'aurez.</div>' : '') +
      '<h3 class="sub-h">Premières actions proposées</h3><ul class="act-mini">' + acts.map(function (a) { return '<li>' + esc(a[1]) + '</li>'; }).join('') + '</ul>' +
      '<p class="muted small">Vous retrouverez toutes les actions à l\'étape 4.</p>';
  }

  // ------------------------------------------------------------------ vues
  function viewAccueil() {
    var has = S.products.length > 0;
    return '<section class="welcome"><p class="q-k">Obligation légale · DUERP</p><h1 class="q-t">Votre DUERP risque chimique, pas à pas</h1>' +
      '<p class="q-s">Le document unique d\'évaluation des risques professionnels (DUERP) est obligatoire dès le premier salarié. Ici, vous répondez à des questions simples, une à la fois. À la fin, vous téléchargez votre dossier.</p>' +
      '<div class="wl-grid"><ol class="wl-steps">' + STEPS.map(function (s, i) { return '<li><i>' + (i + 1) + '</i><div><b>' + s.t + '</b><span>' + s.d + '</span></div></li>'; }).join('') + '</ol>' +
      '<div class="wl-prep"><h2>Avant de commencer, rassemblez :</h2><ul><li>' + icon('file') + '<span><b>Les fiches de données de sécurité</b> de vos produits (demandez-les à vos fournisseurs si besoin).</span></li><li>' + icon('flask') + '<span><b>Les quantités achetées sur un an</b>, d\'après vos factures.</span></li><li>' + icon('users') + '<span><b>La liste des postes</b> et le nombre de salariés à chaque poste.</span></li></ul>' +
      '<p class="muted small">Tout est enregistré dans ce navigateur, au fur et à mesure. Vous pouvez vous arrêter et reprendre plus tard. Rien n\'est envoyé à nos serveurs.</p></div></div></section>' +
      '<footer class="du-foot"><button type="button" class="btn btn-secondary" data-act="demo">Voir un exemple rempli</button>' +
      '<button type="button" class="btn btn-primary" data-nav="' + (has ? resumeStep() : 'entreprise') + '">' + (has ? 'Reprendre où j\'en étais' : 'Commencer') + icon('arrow') + '</button></footer>';
  }
  function resumeStep() { for (var i = 0; i < STEPS.length; i++) if (!stepDone(STEPS[i].id)) return STEPS[i].id; return 'dossier'; }

  function viewEntreprise() {
    return screen({
      kicker: 'Étape 1 sur 6', title: 'Votre entreprise',
      sub: 'Ces informations figurent en première page de votre dossier.',
      body: '<label class="big-field"><span class="lbl">Nom de l\'entreprise, du site ou de l\'atelier évalué</span><input class="input input-xl" data-s="site" maxlength="80" value="' + esc(S.site || '') + '" placeholder="Ex. Menuiserie Dupont, atelier de Meaux" autocomplete="organization"></label>' +
        '<p class="lbl lbl-block">Combien de salariés compte l\'entreprise ?</p>' + tiles('effectif', [['1-10', 'De 1 à 10'], ['11-49', 'De 11 à 49'], ['50+', '50 et plus']], S.effectif || '', 'tiles-3') +
        '<p class="hint-line" id="eff-hint">' + effHint() + '</p>',
      help: help('Pourquoi l\'effectif ?', ['À partir de 11 salariés, le DUERP doit être mis à jour au moins une fois par an.', 'À partir de 50 salariés, les actions sont reprises dans un programme annuel de prévention (PAPRIPACT).']),
      back: 'accueil', next: 'produits', nextDisabled: !(S.site && S.effectif)
    });
  }
  function effHint() {
    return S.effectif === '1-10' ? 'Mise à jour du DUERP : à chaque changement important (nouveau produit, nouveau procédé).' : S.effectif === '11-49' ? 'Mise à jour du DUERP : au moins une fois par an, et à chaque changement important.' : S.effectif === '50+' ? 'Mise à jour annuelle, et plan d\'action repris dans votre PAPRIPACT.' : '';
  }

  function viewProduits() {
    var rows = compute(), byP = {}; rows.forEach(function (r) { byP[r.p.id] = r; });
    var list = S.products.map(function (p) {
      var r = byP[p.id], L = r ? LEVEL[level(r)] : null;
      return '<li class="pr"><div class="pr-l"><b>' + esc(p.name) + '</b><span>' + (p.type === 'procede' ? 'Poussières ou fumées' : 'Produit chimique') + (p.poste ? ' · ' + esc(p.poste) : '') + (p.nb ? ' · ' + plural(+p.nb, 'salarié') : '') + '</span>' +
        (p.fds === 'manquante' ? '<em class="warn-tag">Fiche de sécurité à obtenir</em>' : '') + '</div>' +
        (L ? '<span class="lv lv-' + L[1] + '">' + L[0] + '</span>' : '') + (r && r.cmr === 'cmr' ? '<span class="tag-cmr">CMR</span>' : '') +
        '<div class="pr-act"><button type="button" class="icon-x" data-edit="' + p.id + '" aria-label="Modifier ' + esc(p.name) + '">' + icon('pen') + '</button><button type="button" class="icon-x" data-del="' + p.id + '" aria-label="Supprimer ' + esc(p.name) + '">' + icon('trash') + '</button></div></li>';
    }).join('');
    return screen({
      kicker: 'Étape 2 sur 6', title: S.products.length ? 'Vos produits (' + S.products.length + ')' : 'Ajoutez vos produits un par un',
      sub: S.products.length ? 'Ajoutez tous les produits dangereux utilisés, puis continuez.' : 'Commencez par le produit que vous utilisez le plus.',
      body: (S.products.length ? '<ul class="pr-list">' + list + '</ul>' : '') +
        '<div class="add-row"><button type="button" class="add-big" data-act="add">' + icon('plus') + '<span><b>Ajouter un produit chimique</b><small>Peinture, solvant, colle, produit de nettoyage…</small></span></button>' +
        '<button type="button" class="add-big alt" data-act="addproc">' + icon('plus') + '<span><b>Ajouter des poussières ou des fumées</b><small>Bois, silice (béton, pierre), gaz d\'échappement diesel…</small></span></button></div>',
      help: help('Quels produits inclure ?', ['Tous ceux qui portent un pictogramme de danger ou une mention H.', 'Les activités qui dégagent des poussières de bois, de silice ou des fumées diesel, même sans fiche.', 'Pas besoin d\'inclure les produits sans aucun danger (eau, savon…).']),
      back: 'entreprise', next: 'prio', nextDisabled: !S.products.length, nextLabel: 'J\'ai tout ajouté'
    });
  }

  function viewPrio() {
    var rows = compute(); S.seen.prio = 1; persist();
    var groups = { 1: [], 2: [], 3: [] }; rows.forEach(function (r) { groups[level(r)].push(r); });
    function card(r) { var p = r.p; return '<li class="rc"><div><b>' + esc(p.name) + '</b>' + (r.cmr === 'cmr' ? '<span class="tag-cmr">CMR</span>' : '') + '<span class="rc-p">' + esc(p.poste || 'Poste non renseigné') + '</span><p>' + esc(reasons(r).join(' · ')) + '</p>' + (r.vleps.length ? '<p class="rc-v">Valeur limite officielle : ' + r.vleps.map(function (x) { return esc(x.nom) + ' ' + vlepTxt(x, true); }).join(' · ') + '</p>' : '') + '</div><button type="button" class="icon-x" data-edit="' + p.id + '" aria-label="Modifier ' + esc(p.name) + '">' + icon('pen') + '</button></li>'; }
    var body = [1, 2, 3].map(function (k) {
      var L = LEVEL[k]; if (!groups[k].length) return '';
      return '<section class="grp grp-' + L[1] + '"><h2><span class="lv lv-' + L[1] + '">' + L[0] + '</span>' + L[2] + ' <em>' + groups[k].length + '</em></h2><ul class="rc-list">' + groups[k].map(card).join('') + '</ul></section>';
    }).join('');
    return screen({
      kicker: 'Étape 3 sur 6', title: 'Vos priorités', sub: 'L\'outil a classé vos produits. Rien à saisir : vérifiez que le classement vous paraît juste.',
      body: body, help: help('Comment est-ce calculé ?', ['Le danger du produit (ses mentions H).', 'La quantité et la durée d\'utilisation.', 'La façon de l\'utiliser et l\'aspiration au poste.', 'Si un résultat vous surprend, modifiez le produit avec le crayon.'], '<p class="muted small">Méthode inspirée de l\'évaluation simplifiée du risque chimique de l\'INRS.</p>'),
      back: 'produits', next: 'actions'
    });
  }

  var GLAB = { substitution: ['1', 'Remplacer le produit'], clos: ['2', 'Travailler en système fermé'], reduction: ['3', 'Réduire à la source et aspirer'], suivi: ['4', 'Suivre les salariés et contrôler'], epi: ['5', 'Protéger les salariés (en dernier recours)'] };
  function viewActions() {
    var rows = compute(), items = planItems(rows), order = { substitution: 1, clos: 2, reduction: 3, suivi: 4, epi: 5 };
    items.sort(function (a, b) { return order[a.group] - order[b.group] || a.prio - b.prio; });
    var ok = items.filter(function (x) { var a = S.actions[x.k] || {}; return a.statut === 'fait' || (a.resp && a.date); }).length, cur = '', html = '';
    items.forEach(function (it) {
      if (it.group !== cur) { if (cur) html += '</ul></section>'; cur = it.group; html += '<section class="ag"><h2><i>' + GLAB[cur][0] + '</i>' + GLAB[cur][1] + '</h2><ul>'; }
      var a = S.actions[it.k] || {};
      html += '<li class="ac' + (a.statut === 'fait' ? ' done' : '') + '"><div class="ac-t"><b>' + esc(it.text) + '</b><span>' + (it.sub ? 'Postes : ' + esc(it.sub) : 'Concerne : ' + it.prods.map(esc).join(', ')) + '</span><em>' + esc(it.law) + '</em></div>' +
        '<div class="ac-f"><label><span>Qui s\'en occupe ?</span><input class="input" data-k="' + it.k + '" data-af="resp" value="' + esc(a.resp || '') + '" placeholder="Nom"></label><label><span>Pour quand ?</span><input class="input" type="date" data-k="' + it.k + '" data-af="date" value="' + esc(a.date || '') + '"></label>' +
        '<label class="ac-done"><input type="checkbox" data-k="' + it.k + '" data-af="fait"' + (a.statut === 'fait' ? ' checked' : '') + '><span>C\'est fait</span></label></div></li>';
    });
    if (cur) html += '</ul></section>';
    return screen({
      kicker: 'Étape 4 sur 6', title: 'Vos actions', sub: 'Pour chaque action, indiquez qui s\'en occupe et pour quand. Elles sont classées dans l\'ordre imposé par le code du travail.',
      body: '<div class="prog"><b id="ac-prog">' + ok + ' sur ' + items.length + '</b> actions planifiées · vous pouvez compléter plus tard<div class="prog-bar"><i id="ac-bar" data-w="' + (items.length ? Math.round(ok / items.length * 100) : 0) + '"></i></div></div>' + html,
      help: help('Pourquoi cet ordre ?', ['D\'abord supprimer ou remplacer le produit dangereux.', 'Sinon, l\'enfermer ou l\'aspirer à la source.', 'Les masques et gants viennent en dernier recours.'], S.effectif === '50+' ? '<p class="muted small">Avec 50 salariés et plus, reprenez ces actions dans votre programme annuel de prévention (PAPRIPACT).</p>' : ''),
      back: 'prio', next: 'salaries', nextLabel: 'Continuer'
    });
  }

  function viewSalaries() {
    var rows = compute(), cmr = rows.filter(function (r) { return r.cmr === 'cmr'; }), ps = {};
    S.seen.sal = 1; persist();
    cmr.forEach(function (r) { var k = r.p.poste || 'Poste non renseigné'; ps[k] = ps[k] || { rows: [], nb: 0 }; ps[k].rows.push(r); ps[k].nb = Math.max(ps[k].nb, +r.p.nb || 0); });
    var keys = Object.keys(ps);
    var body = !keys.length ? '<div class="res res-ok"><span class="res-k">Bonne nouvelle</span><b>Aucun produit cancérogène</b><span>Vous n\'avez pas de liste de travailleurs exposés à tenir pour l\'instant.</span></div>' :
      '<div class="info-box red"><b>Ce que la loi demande pour ces salariés</b><ul><li>Les inscrire sur la <b>liste des travailleurs exposés</b> (nature, durée et degré de l\'exposition), la transmettre au service de santé au travail et la conserver 40 ans.</li><li>Organiser leur <b>suivi médical renforcé</b>.</li><li>Ne pas y affecter de <b>jeunes de moins de 18 ans</b> et, pour les produits toxiques pour la reproduction, de <b>femmes enceintes ou qui allaitent</b>.</li></ul></div>' +
      '<ul class="sal-list">' + keys.map(function (k) { return '<li><div><b>' + esc(k) + '</b><span>' + ps[k].rows.map(function (r) { return esc(r.p.name); }).join(', ') + '</span></div><label><span>Salariés exposés</span><input class="input" type="number" min="0" inputmode="numeric" data-salposte="' + esc(k) + '" value="' + (ps[k].nb || '') + '" placeholder="Nombre"></label></li>'; }).join('') + '</ul>' +
      '<p class="muted small">Votre dossier contiendra une liste pré-remplie par poste, à compléter avec le nom de chaque salarié.</p>';
    return screen({ kicker: 'Étape 5 sur 6', title: 'Salariés exposés aux produits cancérogènes', sub: keys.length ? 'Vérifiez le nombre de salariés à chaque poste concerné.' : '', body: body, back: 'actions', next: 'dossier' });
  }

  function viewDossier() {
    var none = S.products.length ? '' : ' disabled';
    return screen({
      kicker: 'Étape 6 sur 6', title: 'Votre dossier DUERP est prêt',
      sub: 'Téléchargez-le et joignez-le à votre document unique. Gardez-le : il peut vous être demandé par l\'inspection du travail, le médecin du travail ou vos salariés.',
      body: '<div class="dl-main"><div>' + icon('file') + '<span><b>Dossier DUERP complet</b><small>Rapport d\'évaluation du risque chimique, liste des travailleurs exposés aux CMR et plan d\'action, en un seul PDF.</small></span></div><button type="button" class="btn btn-primary btn-lg" data-print="all"' + none + '>' + icon('download') + 'Télécharger mon dossier (PDF)</button></div>' +
        '<p class="muted small">Dans la fenêtre qui s\'ouvre, choisissez « Enregistrer au format PDF ».</p>' +
        '<h3 class="sub-h">Ou un document à la fois</h3><ul class="dl-list">' +
        '<li><span><b>Rapport d\'évaluation</b><small>À annexer au DUERP</small></span><button type="button" class="btn btn-secondary" data-print="report"' + none + '>Télécharger</button></li>' +
        '<li><span><b>Liste des travailleurs exposés aux CMR</b><small>À transmettre au service de santé au travail</small></span><button type="button" class="btn btn-secondary" data-print="liste"' + none + '>Télécharger</button></li>' +
        '<li><span><b>Plan d\'action</b><small>' + (S.effectif === '50+' ? 'À reprendre dans votre PAPRIPACT' : 'À reprendre dans votre DUERP') + '</small></span><button type="button" class="btn btn-secondary" data-print="plan"' + none + '>Télécharger</button></li></ul>' +
        '<div class="info-box"><b>Et ensuite ?</b> ' + (S.effectif === '1-10' ? 'Mettez à jour votre DUERP à chaque nouveau produit ou changement de procédé.' : 'Mettez à jour votre DUERP au moins une fois par an, et à chaque nouveau produit ou changement de procédé.') + ' Revenez ici : votre évaluation est conservée dans ce navigateur.</div>' +
        '<h3 class="sub-h">Sauvegarder votre évaluation</h3><ul class="dl-list"><li><span><b>Fichier de sauvegarde</b><small>Pour reprendre l\'évaluation sur un autre ordinateur ou l\'an prochain</small></span><button type="button" class="btn btn-secondary" data-act="json"' + none + '>Télécharger</button></li>' +
        '<li><span><b>Restaurer une sauvegarde</b><small>Remplace l\'évaluation en cours</small></span><label class="btn btn-secondary file-btn">Choisir un fichier<input type="file" accept="application/json,.json" data-import></label></li></ul>',
      back: 'salaries'
    });
  }

  // ------------------------------------------------------------------ rendu et navigation
  var VIEWS = { accueil: viewAccueil, entreprise: viewEntreprise, produits: viewProduits, prio: viewPrio, actions: viewActions, salaries: viewSalaries, dossier: viewDossier };
  function render(focus) {
    var v = $('#du-view');
    v.innerHTML = UI.wz ? renderWizard() : (VIEWS[UI.view] || viewAccueil)();
    document.body.classList.toggle('du-welcome', !UI.wz && UI.view === 'accueil');
    drawSide();
    $$('[data-w]', v).forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; });
    if (focus) {
      var inp = $('.q-main .input-xl', v); window.scrollTo(0, 0);
      if (inp && !inp.value && window.matchMedia('(min-width: 900px)').matches) inp.focus(); else { var t = $('#q-title', v); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } }
    }
  }
  function go(id) {
    if (id !== 'produit') { UI.wz = null; UI.view = VIEWS[id] ? id : 'accueil'; }
    try { history.replaceState(null, '', '#' + (UI.wz ? 'produits' : UI.view)); } catch (e) {}
    render(true);
  }
  function refreshNext() {
    var b = $('#q-next'); if (!b || !UI.wz) return;
    var qs = questions(UI.wz.p), q = qs[UI.wz.i];
    b.disabled = !answered(UI.wz.p, q);
    if (q === 'subs') b.firstChild.textContent = UI.wz.p.subs.length ? 'Continuer' : 'Passer cette question';
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a[href^="#"]'); if (!t) { document.body.classList.remove('du-nav-open'); return; }
    if (t.id === 'du-nav-btn') { var o = document.body.classList.toggle('du-nav-open'); t.setAttribute('aria-expanded', o); return; }
    document.body.classList.remove('du-nav-open');
    if (t.tagName === 'A') { var id = t.getAttribute('href').slice(1); if (VIEWS[id]) { e.preventDefault(); go(id); } return; }
    if (t.disabled) return;
    var d = t.dataset, w = UI.wz;
    if (d.tile) {
      var v = d.v;
      if (w) {
        var p = w.p;
        if (d.tile === 'vol') { p.vol = v; } else p[d.tile] = v;
        if (d.tile === 'etat') { p.vol = null; p.pulv = ''; }
        if (d.tile === 'procede' && !p.name) p.name = PROCEDES[v].label;
        $$('[data-tile="' + d.tile + '"]').forEach(function (b) { var on = b === t; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
        refreshNext();
        return;
      }
      if (d.tile === 'effectif') { S.effectif = v; persist(); render(); return; }
      return;
    }
    if (d.nav) {
      if (d.nav === 'wz-next') { var qs = questions(w.p); if (w.i < qs.length - 1) { w.i++; render(true); } return; }
      if (d.nav === 'wz-prev') { w.i = Math.max(0, w.i - 1); render(true); return; }
      if (d.nav === 'wz-cancel') { if (w.p.name && !confirm('Abandonner la saisie de ce produit ?')) return; UI.wz = null; go('produits'); return; }
      if (d.nav === 'wz-save') {
        var prod = finalize(w.p);
        if (w.edit) { prod.id = w.edit; S.products[S.products.findIndex(function (x) { return x.id === w.edit; })] = prod; }
        else { prod.id = S.next++; S.products.push(prod); }
        S.refSeen = S.refSeen || {}; (prod.subs || []).forEach(function (id) { if (RBY[id]) S.refSeen[id] = RBY[id].fp; });
        persist(); announce('Produit enregistré.'); UI.wz = null; go('produits'); return;
      }
      go(d.nav); return;
    }
    if (d.act === 'add') { startWizard('produit'); return; }
    if (d.act === 'addproc') { startWizard('procede'); return; }
    if (d.act === 'noh') { w.p.noH = !w.p.noH; if (w.p.noH) { w.p.h = []; w.p.fds = ''; } render(); return; }
    if (d.act === 'nofds') { w.p.fds = w.p.fds === 'manquante' ? '' : 'manquante'; if (w.p.fds) w.p.noH = false; render(); return; }
    if (d.act === 'demo') { if (!S.products.length || confirm('Remplacer votre évaluation par l\'exemple ?')) { S = demo(); S.effectif = '11-49'; S.seen = {}; persist(); go('produits'); } return; }
    if (d.act === 'json') { var blob = new Blob([JSON.stringify({ format: 'vbs-eval', version: 1, exporte_le: new Date().toISOString(), data: S }, null, 1)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sauvegarde-duerp-risque-chimique.json'; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400); return; }
    if (d.rmh) { w.p.h.splice(w.p.h.indexOf(d.rmh), 1); $('#h-chips').innerHTML = hChips(w.p); var cb = $('[data-h="' + d.rmh + '"]'); if (cb) cb.checked = false; refreshNext(); return; }
    if (d.rmsub) { w.p.subs.splice(w.p.subs.indexOf(d.rmsub), 1); $('#sub-list').innerHTML = subList(w.p); refreshNext(); return; }
    if (d.addsub) { if (w.p.subs.indexOf(d.addsub) === -1) w.p.subs.push(d.addsub); var x = RBY[d.addsub]; if (x && x.teb != null && !w.p.teb) w.p.teb = x.teb; $('#sub-list').innerHTML = subList(w.p); $('#sub-sug').innerHTML = ''; var si = $('[data-f="subq"]'); si.value = ''; si.focus(); refreshNext(); return; }
    if (d.poste) { w.p.poste = d.poste; $('[data-f="poste"]').value = d.poste; refreshNext(); return; }
    if (d.edit) { startWizard(null, S.products.filter(function (x) { return x.id === +d.edit; })[0]); return; }
    if (d.del) { var pr = S.products.filter(function (x) { return x.id === +d.del; })[0]; if (pr && confirm('Supprimer « ' + pr.name + ' » ?')) { S.products = S.products.filter(function (x) { return x !== pr; }); persist(); render(); } return; }
    if (d.print) { printDossier(d.print); return; }
  });

  document.addEventListener('input', function (e) {
    var t = e.target, d = t.dataset, w = UI.wz;
    if (d.s) { S[d.s] = t.value; persist(); var b = $('#q-next'); if (b) b.disabled = !(S.site && S.effectif); return; }
    if (d.k) { actionField(t); return; }
    if (!w) return;
    if (d.f === 'htext') {
      var found = parseH(t.value); found.forEach(function (h) { if (w.p.h.indexOf(h) === -1) w.p.h.push(h); var cb = $('[data-h="' + h + '"]'); if (cb) cb.checked = true; });
      parseCas(t.value).forEach(function (c) { var hit = RIDX.filter(function (x) { return (x.s.cas || []).indexOf(c) !== -1; })[0]; if (hit && w.p.subs.indexOf(hit.s.id) === -1) w.p.subs.push(hit.s.id); });
      if (found.length) { w.p.noH = false; w.p.fds = ''; $$('.h-alt .chip-btn').forEach(function (b) { b.classList.remove('on'); }); }
      $('#h-chips').innerHTML = hChips(w.p); refreshNext(); return;
    }
    if (d.f === 'subq') {
      var res = REF ? findSubs(t.value) : [];
      $('#sub-sug').innerHTML = res.map(function (x) { return '<li><button type="button" data-addsub="' + esc(x.id) + '"><b>' + esc(x.nom) + '</b><span>' + (x.cas && x.cas[0] ? 'CAS ' + x.cas[0] : '') + (hasVlep(x) ? ' · valeur limite ' + vlepTxt(x, true) : '') + '</span></button></li>'; }).join('') || (t.value.trim().length > 2 ? '<li class="muted small">Aucune substance avec valeur limite officielle ne correspond. Ce n\'est pas bloquant : passez à la suite.</li>' : '');
      return;
    }
    if (d.f) { w.p[d.f] = t.value; refreshNext(); }
  });
  document.addEventListener('change', function (e) {
    var t = e.target, d = t.dataset;
    if (d.h && UI.wz) { var p = UI.wz.p, i = p.h.indexOf(d.h); if (t.checked && i === -1) p.h.push(d.h); if (!t.checked && i !== -1) p.h.splice(i, 1); if (p.h.length) { p.noH = false; p.fds = ''; } $('#h-chips').innerHTML = hChips(p); refreshNext(); return; }
    if (d.k) { actionField(t); return; }
    if (d.salposte != null) { var n = t.value === '' ? '' : Math.max(0, parseInt(t.value, 10) || 0); S.products.forEach(function (p) { if ((p.poste || 'Poste non renseigné') === d.salposte) p.nb = n; }); persist(); return; }
    if (t.hasAttribute('data-import')) {
      var f = t.files && t.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { try { var j = JSON.parse(rd.result); if (!j || !j.data || !Array.isArray(j.data.products)) throw 0; if (!confirm('Remplacer votre évaluation par « ' + f.name + ' » ?')) return; S = j.data; S.actions = S.actions || {}; S.seen = S.seen || {}; persist(); go('produits'); } catch (x) { alert('Ce fichier n\'est pas une sauvegarde de cet outil.'); } };
      rd.readAsText(f);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.matches && e.target.matches('.q-main input.input:not([data-f="subq"])')) { var b = $('#q-next'); if (b && !b.disabled) { e.preventDefault(); b.click(); } }
  });
  function actionField(t) {
    var k = t.dataset.k, f = t.dataset.af; S.actions[k] = S.actions[k] || {};
    if (f === 'fait') { S.actions[k].statut = t.checked ? 'fait' : ''; t.closest('.ac').classList.toggle('done', t.checked); } else S.actions[k][f] = t.value;
    persist();
    var items = planItems(compute()), ok = items.filter(function (x) { var a = S.actions[x.k] || {}; return a.statut === 'fait' || (a.resp && a.date); }).length;
    var pg = $('#ac-prog'); if (pg) { pg.textContent = ok + ' sur ' + items.length; $('#ac-bar').style.width = Math.round(ok / Math.max(1, items.length) * 100) + '%'; }
    drawSide();
  }

  // Impression : le mode expert met en page les documents, dans un cadre invisible
  function printDossier(mode) {
    S.exported = 1; persist(); drawSide();
    var mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (mobile) { location.href = 'evaluation.html#imprimer-' + mode; return; }
    var old = $('.du-print-frame'); if (old) old.remove();
    var f = document.createElement('iframe'); f.className = 'du-print-frame'; f.title = 'Impression du dossier'; f.setAttribute('aria-hidden', 'true'); f.tabIndex = -1;
    f.src = 'evaluation.html#imprimer-' + mode; document.body.appendChild(f);
    announce('Préparation du document…');
    setTimeout(function () { if (f.parentNode) f.remove(); }, 180000);
  }

  // Démarrage
  window.EV_ONREF = function () { if (UI.wz && questions(UI.wz.p)[UI.wz.i] === 'recap') render(); };
  loadRef();
  var h0 = (location.hash || '').slice(1);
  if (h0 === 'exemple') { S = demo(); S.effectif = '11-49'; S.seen = {}; save(); h0 = 'produits'; }
  UI.view = VIEWS[h0] ? h0 : 'accueil';
  render();
  window.addEventListener('hashchange', function () { var h = (location.hash || '').slice(1); if (h === 'exemple') { location.reload(); return; } if (VIEWS[h] && (h !== UI.view || UI.wz)) go(h); });
})();
