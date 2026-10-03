// VB Safety · Dossier de preuve CMR (version 1) : registre des agents, révisions datées, substitution et treize mesures,
// liste nominative des travailleurs exposés avec ses vues, sommaire des 45 obligations.
// Prolonge l'évaluation « Mon DUERP risque chimique » (même navigateur, mêmes données). Rien n'est envoyé à un serveur.
(function () {
  'use strict';
  var C = window.PREUVE;
  // Chemin vers la racine de l'outil (la page est servie depuis /cmr-industrie/outil/)
  var B = document.documentElement.getAttribute('data-base') || '';

  // ------------------------------------------------------------------ données
  // L'évaluation (S) vient de eval-core.js ; le dossier (P) est rangé à part pour ne jamais modifier l'évaluation.
  function pkey() { return demoMode() ? 'vbs-preuve-demo' : 'vbs-preuve-v1'; }
  function loadP() { try { return C.normalize(JSON.parse(localStorage.getItem(pkey()))); } catch (e) { return C.blank(); } }
  var P = loadP();
  var UI = { view: 'accueil', open: {}, sal: null, ver: null };
  var saveTimer = null;
  function persist() {
    try { localStorage.setItem(pkey(), JSON.stringify(P)); } catch (e) {}
    var el = $('#du-save'); if (!el) return;
    el.textContent = 'Enregistré'; el.classList.add('on');
    clearTimeout(saveTimer); saveTimer = setTimeout(function () { el.classList.remove('on'); el.textContent = 'Enregistré dans ce navigateur'; }, 1400);
  }
  function announce(t) { $('#du-live').textContent = t; }
  function icon(n) { return '<svg class="icon" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function fd(iso) { return C.frDate(iso); }
  function today() { return C.today(); }
  function uid() { return P.next++; }

  // Contexte calculé : agents, lignes d'évaluation, liste nominative, couverture des obligations
  function ctx() {
    var rowsEval = S.products.length ? compute() : [], byId = {};
    rowsEval.forEach(function (r) { byId[r.p.id] = r; });
    var ags = C.agents(S, P, function (p) { return subsOf(p).map(function (x) { return x.nom; }); });
    var rows = C.listeRows(S, P, ags);
    return { rowsEval: rowsEval, evalById: byId, agents: ags, cmr: ags.filter(function (a) { return a.regime === 'cmr'; }), rows: rows, cov: C.coverage({ S: S, P: P, agents: ags, listeRows: rows }) };
  }
  function covOf(c, id) { return c.cov.filter(function (x) { return x.o.id === id; })[0]; }
  var ST = { outil: 'Pièce produite ici', manuel: 'Pièce déclarée', partiel: 'À compléter', manquant: 'Manquante', 'sans-objet': 'Sans objet' };
  function stBadge(st, label) { return '<span class="pv-st ' + st + '">' + (label || ST[st]) + '</span>'; }
  function regBadge(r) { return '<span class="pv-reg ' + r + '">' + C.REGIMES[r].label + '</span>'; }

  // ------------------------------------------------------------------ étapes
  var STEPS = [
    { id: 'agents', t: 'Agents et régimes', d: 'Registre des agents (A1)' },
    { id: 'revisions', t: 'Révisions datées', d: 'Évaluation renouvelée (A2 à A4)' },
    { id: 'substitution', t: 'Substitution', d: 'Étude et treize mesures (B1 à B4)' },
    { id: 'salaries', t: 'Salariés exposés', d: 'Qui, quoi, depuis quand (E1)' },
    { id: 'liste', t: 'Liste et envois', d: 'Versions, extraits, SPST (E1 à E4)' },
    { id: 'sommaire', t: 'Sommaire du dossier', d: '45 obligations, pièces manquantes' }
  ];
  function stepDone(id, c) {
    if (!S.products.length) return false;
    var ok = function (ids) { return ids.every(function (k) { var x = covOf(c, k); return x.statut === 'outil' || x.statut === 'sans-objet'; }); };
    if (id === 'agents') return ok(['A1']);
    if (id === 'revisions') return ok(['A3']);
    if (id === 'substitution') return ok(['B1', 'B2', 'B3', 'B4']);
    if (id === 'salaries') return !c.cmr.length || (c.cmr.every(function (a) { return c.rows.some(function (r) { return r.agentKey === a.key; }); }));
    if (id === 'liste') return ok(['E1', 'E2', 'E3', 'E4']);
    if (id === 'sommaire') return !!P.vuSommaire;
    return false;
  }
  function drawSide(c) {
    var done = c.cov.filter(function (x) { return x.statut === 'outil' || x.statut === 'manuel'; }).length, on0 = UI.view === 'obligations';
    $('#du-steps').innerHTML = '<li class="pv-side-ob' + (on0 ? ' on' : '') + '"><a href="#obligations"' + (on0 ? ' aria-current="page"' : '') + '><i>' + icon('list') + '</i><span><b>Mes obligations</b><small>' + done + ' faites sur ' + C.OBLIGATIONS.length + '</small></span></a></li><li class="pv-side-k" aria-hidden="true">Outils VB Safety</li>' + STEPS.map(function (s, i) {
      var d = stepDone(s.id, c), on = s.id === UI.view;
      return '<li class="' + (on ? 'on ' : '') + (d ? 'done' : '') + '"><a href="#' + s.id + '"' + (on ? ' aria-current="step"' : '') + '><i>' + (d ? icon('check') + '<span class="sr-only">Terminé : </span>' : i + 1) + '</i><span><b>' + s.t + '</b><small>' + s.d + '</small></span></a></li>';
    }).join('');
    var k = -1; STEPS.forEach(function (s, i) { if (s.id === UI.view) k = i; });
    $('#du-top-title').textContent = k >= 0 ? STEPS[k].t : UI.view === 'obligations' ? 'Mes obligations CMR' : 'Dossier de preuve CMR';
    $('#du-top-step').textContent = k >= 0 ? 'Étape ' + (k + 1) + ' sur ' + STEPS.length + (S.site ? ' · ' + S.site : '') : (S.site || 'Version 1');
    var n = STEPS.filter(function (s) { return stepDone(s.id, c); }).length;
    $('#du-bar').style.width = Math.round(n / STEPS.length * 100) + '%';
  }

  // ------------------------------------------------------------------ gabarits
  function screen(o) {
    var k = -1; STEPS.forEach(function (s, i) { if (s.id === o.id) k = i; });
    var prev = k > 0 ? STEPS[k - 1].id : 'obligations', next = k >= 0 && k < STEPS.length - 1 ? STEPS[k + 1].id : '';
    return '<section class="q pv-wide">' + (o.kicker ? '<p class="q-k">' + o.kicker + '</p>' : '') +
      '<h1 class="q-t" id="q-title">' + o.title + '</h1>' + (o.sub ? '<p class="q-s">' + o.sub + '</p>' : '') +
      '<div class="q-grid' + (o.help ? '' : ' q-solo') + '"><div class="q-main">' + o.body + '</div>' + (o.help ? '<aside class="q-help" aria-label="Aide">' + o.help + '</aside>' : '') + '</div></section>' +
      '<footer class="du-foot"><button type="button" class="btn btn-secondary" data-nav="' + prev + '">' + icon('back') + 'Retour</button>' +
      (next ? '<button type="button" class="btn btn-primary" data-nav="' + next + '">Continuer' + icon('arrow') + '</button>' : '<span></span>') + '</footer>';
  }
  function law(t) { return '<span class="law">' + t + '</span>'; }
  function opt(v, t, cur) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur == null ? '' : cur) ? ' selected' : '') + '>' + esc(t) + '</option>'; }
  function field(label, html, cls) { return '<label class="pv-f' + (cls ? ' ' + cls : '') + '"><span>' + label + '</span>' + html + '</label>'; }
  function inp(bind, val, attrs) { return '<input class="input" data-b="' + esc(bind) + '" value="' + esc(val || '') + '"' + (attrs || '') + '>'; }
  function area(bind, val, ph) { return '<textarea class="input" data-b="' + esc(bind) + '" placeholder="' + esc(ph || '') + '">' + esc(val || '') + '</textarea>'; }
  function legalNote() { return '<p class="pv-note"><b>Référentiel juridique du ' + fd(C.REFERENTIEL.date) + '.</b> Chaque écran cite l\'article qui fonde la pièce. L\'outil indique ce qui a été renseigné et quand ; il ne juge pas de la conformité. ' + esc(C.REFERENTIEL.relecture) + '.</p>'; }
  function noEval() {
    return '<div class="pv-empty"><p><b>Aucun produit inventorié sur ce navigateur.</b><br>Le dossier de preuve part de la liste de vos produits et procédés. Elle se saisit une seule fois dans « Mon DUERP risque chimique » (étapes 1 et 2), puis le dossier la reprend automatiquement.</p><button type="button" class="btn btn-primary" data-a="demo">Voir un exemple rempli</button> <a class="btn btn-secondary" href="' + B + 'duerp.html#produits">Inventorier mes produits</a></div>';
  }

  // ------------------------------------------------------------------ accueil
  function viewAccueil(c) {
    var has = S.products.length > 0;
    return '<section class="welcome"><p class="q-k">Version 1 · rien n\'est hébergé</p><h1 class="q-t" id="q-title">Votre dossier de preuve CMR</h1>' +
      '<p class="q-s">L\'évaluation du risque chimique est faite. Il reste les pièces écrites que le code du travail demande pour les agents cancérogènes, mutagènes et toxiques pour la reproduction (CMR), et que l\'employeur doit pouvoir montrer le jour où un salarié, un inspecteur ou un juge les demande.</p>' +
      (has ? '' : '<div class="pv-start"><h2>Comment démarrer</h2><ol><li><b>Inventoriez vos produits et procédés</b> dans « Mon DUERP risque chimique », étapes 1 et 2 (environ 5 minutes par produit). C\'est la seule saisie à faire dans l\'autre outil.</li><li><b>Revenez ici</b> par le lien « Dossier de preuve CMR » du menu : vos agents CMR sont repris automatiquement et les 6 étapes ci-dessous s\'ouvrent.</li></ol><p class="muted small">Pour découvrir l\'outil sans rien saisir, ouvrez l\'exemple rempli (données fictives, vos données ne sont pas touchées).</p></div>') +
      '<div class="wl-grid"><ol class="wl-steps">' + STEPS.map(function (s, i) { return '<li><i>' + (i + 1) + '</i><div><b>' + s.t + '</b><span>' + s.d + '</span></div></li>'; }).join('') + '</ol>' +
      '<div class="wl-prep"><h2>Ce que produit cette version</h2><ul>' +
      '<li>' + icon('file') + '<span><b>Le registre des agents et procédés</b> avec leur régime (art. R. 4412-59 et R. 4412-60).</span></li>' +
      '<li>' + icon('file') + '<span><b>L\'étude de substitution et la grille des treize mesures</b> à consigner dans le DUERP (art. R. 4412-66 à R. 4412-70).</span></li>' +
      '<li>' + icon('users') + '<span><b>La liste nominative des travailleurs exposés</b>, datée et versionnée, avec l\'extrait individuel, la version anonyme pour le CSE, l\'extrait pour l\'agence d\'intérim et le bordereau d\'envoi au service de santé au travail (art. R. 4412-93-1 à R. 4412-93-4).</span></li>' +
      '<li>' + icon('lock') + '<span><b>Vos données restent sur cet appareil.</b> Aucune donnée médicale n\'est demandée. Pour conserver le dossier (40 ans pour le DUERP), archivez vous-même les PDF et le fichier de projet.</span></li></ul>' +
      (has ? '<p class="muted small">Évaluation trouvée sur ce navigateur : <b>' + esc(S.site || 'sans nom') + '</b>, ' + S.products.length + ' produit(s) ou procédé(s), dont ' + c.cmr.length + ' relevant du régime CMR.</p>' : '') +
      '</div></div></section>' +
      '<footer class="du-foot">' + (has ? '<label class="btn btn-secondary file-btn">' + icon('upload') + 'Ouvrir un fichier de projet<input type="file" accept="application/json,.json" data-import></label>' : '<a class="btn btn-secondary" href="' + B + 'duerp.html#produits">Inventorier mes produits</a>') +
      (has ? '<button type="button" class="btn btn-primary" data-nav="' + resumeStep(c) + '">' + (P.revisions.length || P.salaries.length ? 'Reprendre' : 'Commencer') + icon('arrow') + '</button>' : '<button type="button" class="btn btn-primary" data-a="demo">Voir un exemple rempli' + icon('arrow') + '</button>') + '</footer>';
  }
  function resumeStep(c) { for (var i = 0; i < STEPS.length; i++) if (!stepDone(STEPS[i].id, c)) return STEPS[i].id; return 'sommaire'; }


  // ------------------------------------------------------------------ accueil de l'outil : les 45 obligations
  function viewObligations(c) {
    var n = { fait: 0, partiel: 0, manquant: 0, so: 0 };
    c.cov.forEach(function (x) { if (x.statut === 'outil' || x.statut === 'manuel') n.fait++; else if (x.statut === 'partiel') n.partiel++; else if (x.statut === 'manquant') n.manquant++; else n.so++; });
    var f = UI.obFilter || 'tout', total = C.OBLIGATIONS.length - n.so;
    var body = legalNote() + entCard() +
      '<div class="pv-kpis"><div class="pv-kpi ok"><span>Faites</span><b>' + n.fait + '</b></div><div class="pv-kpi mid"><span>À compléter</span><b>' + n.partiel + '</b></div><div class="pv-kpi bad"><span>À faire</span><b>' + n.manquant + '</b></div><div class="pv-kpi"><span>Sans objet</span><b>' + n.so + '</b></div>' +
      '<div class="pv-kpi"><span>Avancement</span><b>' + (total ? Math.round(n.fait / total * 100) : 0) + ' %</b></div></div>' +
      (S.products.length ? '' : '<div class="pv-alert"><b>Inventoriez vos produits pour aller plus vite</b>Une fois vos produits et procédés saisis dans « Mon DUERP risque chimique » (étapes 1 et 2), l\'outil coche lui-même les obligations qu\'il vous aide à remplir. <a href="' + B + 'duerp.html#entreprise">Inventorier mes produits</a> · ou <button type="button" class="pv-link" data-a="demo">voir un exemple rempli</button></div>') +
      '<div class="pv-filter" role="group" aria-label="Filtrer les obligations">' + [['tout', 'Toutes (' + C.OBLIGATIONS.length + ')'], ['afaire', 'À faire (' + (n.manquant + n.partiel) + ')'], ['fait', 'Faites (' + n.fait + ')']].map(function (t) { return '<button type="button" class="chip-btn' + (f === t[0] ? ' on' : '') + '" data-a="ob-filter" data-f="' + t[0] + '" aria-pressed="' + (f === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>';
    var bloc = '', shown = 0;
    c.cov.forEach(function (x) {
      var o = x.o, isDone = x.statut === 'outil' || x.statut === 'manuel', todo = x.statut === 'manquant' || x.statut === 'partiel';
      if ((f === 'fait' && !isDone) || (f === 'afaire' && !todo)) return;
      shown++;
      if (o.bloc !== bloc) { if (bloc) body += '</ul>'; bloc = o.bloc; body += '<p class="pv-bloc">' + o.bloc + '. ' + C.BLOCS[o.bloc] + '</p><ul class="ob-list">'; }
      var open = UI.obOpen === o.id, m = P.pieces[o.id] || {};
      var doneBtn = x.statut === 'outil' ? '<span class="ob-done is-tool">' + icon('check') + 'Fait avec VB Safety</span>' : x.statut === 'sans-objet' ? '<span class="ob-done is-so">Sans objet</span>' :
        '<button type="button" class="ob-done' + (m.ok ? ' on' : '') + '" data-a="ob-done" data-id="' + o.id + '" aria-pressed="' + !!m.ok + '">' + icon('check') + (m.ok ? 'Fait' : 'C\'est fait') + '</button>';
      var vbBtn = x.statut === 'sans-objet' && !o.faire ? '' : '<button type="button" class="btn btn-secondary btn-sm ob-vb" data-a="ob-faire" data-id="' + o.id + '">' + (x.statut === 'outil' ? 'Voir dans l\'outil' : 'Faire avec VB Safety') + icon('arrow') + '</button>';
      body += '<li class="ob-it st-' + x.statut + (open ? ' open' : '') + '"><div class="ob-row">' +
        '<button type="button" class="ob-title" data-a="ob-open" data-id="' + o.id + '" aria-expanded="' + open + '" aria-controls="ob-d-' + o.id + '"><span class="ob-id">' + o.id + '</span><span class="ob-txt"><b>' + esc(o.obligation) + '</b><small>' + C.articleLabel(o) + ' · ' + stLabel(x.statut) + '</small></span>' + icon(open ? 'up' : 'down') + '</button>' +
        '<div class="ob-acts">' + doneBtn + vbBtn + '</div></div>' +
        (open ? '<div class="ob-detail" id="ob-d-' + o.id + '"><p>' + esc(o.aide) + '</p><dl class="ob-dl"><div><dt>Pièce à produire</dt><dd>' + esc(o.piece) + '</dd></div>' + (o.frequence ? '<div><dt>Fréquence</dt><dd>' + esc(o.frequence) + '</dd></div>' : '') + '<div><dt>Texte</dt><dd>' + C.articleLabel(o) + ' du code du travail</dd></div><div><dt>Où vous en êtes</dt><dd>' + esc(x.detail) + (x.date ? ' · ' + fd(x.date) : '') + '</dd></div></dl>' +
          (m.ok && x.statut === 'manuel' ? '<div class="pv-grid2">' + field('Fait le', '<input class="input" type="date" data-b="pieces|' + o.id + '|date" value="' + esc(m.date || '') + '">') + field('Où est rangée la pièce ?', inp('pieces|' + o.id + '|lieu', m.lieu, ' placeholder="Ex. classeur HSE, serveur RH, logiciel du SPST"')) + '</div>' : '') +
          (o.id === 'A7' ? '' : outilPanel(o, x)) + '</div>' : '') + '</li>';
    });
    if (bloc) body += '</ul>';
    if (!shown) body += '<div class="pv-empty">Aucune obligation dans ce filtre.</div>';
    return '<section class="q pv-wide"><p class="q-k">' + (S.site ? esc(S.site) + ' · ' : '') + 'Code du travail, partie CMR</p><h1 class="q-t" id="q-title">Vos 45 obligations CMR</h1>' +
      '<p class="q-s">Cliquez sur une obligation pour voir ce qu\'elle demande. Cochez-la quand la pièce existe, ou faites-la avec VB Safety.</p><div class="q-grid q-solo"><div class="q-main">' + body + '</div></div></section>' +
      '<footer class="du-foot"><button type="button" class="btn btn-secondary" data-a="print" data-doc="sommaire">' + icon('download') + 'Sommaire (PDF)</button><button type="button" class="btn btn-primary" data-nav="' + firstTodoView(c) + '">Continuer mon dossier' + icon('arrow') + '</button></footer>';
  }

  // ------------------------------------------------------------------ entreprise (saisie une fois) et outils par obligation
  var ENT = [['nom', 'Raison sociale', ''], ['siren', 'SIREN', '9 chiffres'], ['adresse', 'Adresse', 'Rue, code postal, ville'], ['site', 'Établissement ou site', 'Si différent du siège'], ['effectif', 'Effectif', 'Nombre de salariés'], ['responsable', 'Responsable du dossier', 'Nom, fonction'], ['spst', 'Service de santé au travail', 'Nom du SPST']];
  function ent() { P.entreprise = P.entreprise || {}; if (!P.entreprise.nom && S.site) P.entreprise.nom = S.site; return P.entreprise; }
  function entCard() {
    var e = ent(), filled = ENT.filter(function (f) { return e[f[0]]; }).length, open = UI.entOpen != null ? UI.entOpen : filled < 3;
    var sirenBad = e.siren && !C.sirenValide(e.siren);
    return '<details class="pv-card pv-ent"' + (open ? ' open' : '') + ' data-ent><summary><b>Votre entreprise</b><span class="muted small">' + (filled ? esc([e.nom, e.siren ? 'SIREN ' + e.siren : '', e.effectif ? e.effectif + ' salariés' : ''].filter(Boolean).join(' · ')) : 'À remplir une fois : reprise sur tous les justificatifs') + '</span><span class="pv-sum-r">' + stBadge(filled >= 4 ? 'outil' : 'partiel', filled + ' / ' + ENT.length) + '</span></summary>' +
      '<div class="pv-grid2 pv-grid3">' + ENT.map(function (f) { return field(f[1], '<input class="input" id="ent-' + f[0] + '" data-b="entreprise|' + f[0] + '" value="' + esc(e[f[0]] || '') + '" placeholder="' + esc(f[2]) + '"' + (f[0] === 'siren' ? ' inputmode="numeric" maxlength="11" data-re="1"' : f[0] === 'effectif' ? ' inputmode="numeric"' : '') + '>'); }).join('') + '</div>' +
      (sirenBad ? '<p class="small pv-warn">Ce numéro SIREN ne semble pas valide (9 chiffres, clé de contrôle). Vérifiez-le sur votre extrait Kbis ou sur annuaire-entreprises.data.gouv.fr.</p>' : '') + '</details>';
  }
  function ficheField(id, f, v) {
    var b = ' data-fi="' + id + '" data-fk="' + f.k + '"';
    if (f.type === 'x') return field(f.l, '<textarea class="input"' + b + '>' + esc(v || '') + '</textarea>');
    if (f.type === 'd') return field(f.l, '<input class="input" type="date"' + b + ' value="' + esc(v || '') + '">');
    if (f.type === 's') return field(f.l, '<select class="input"' + b + '>' + opt('', 'Choisir', v) + f.o.map(function (x) { return opt(x, x, v); }).join('') + '</select>');
    if (f.type === 'tab') {
      var rows = Array.isArray(v) && v.length ? v : [f.cols.map(function () { return ''; })];
      return '<div class="pv-tw"><table class="pv-t stack pv-reg-t"><thead><tr>' + f.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' +
        rows.map(function (r, ri) { return '<tr>' + f.cols.map(function (c, ci) { return '<td data-l="' + esc(c) + '"><input class="input" data-fi="' + id + '" data-fk="' + f.k + '" data-r="' + ri + '" data-c="' + ci + '" value="' + esc(r[ci] || '') + '" aria-label="' + esc(c) + ', ligne ' + (ri + 1) + '"></td>'; }).join('') + '<td><button type="button" class="icon-x" data-a="row-del" data-id="' + id + '" data-r="' + ri + '" aria-label="Supprimer la ligne ' + (ri + 1) + '">' + icon('trash') + '</button></td></tr>'; }).join('') +
        '</tbody></table></div><button type="button" class="pv-link" data-a="row-add" data-id="' + id + '" data-k="' + f.k + '">+ Ajouter une ligne</button>';
    }
    return field(f.l, '<input class="input"' + b + ' value="' + esc(v || '') + '">');
  }
  var DOC_LBL = { registre: 'Registre des agents', revisions: 'Historique des révisions', subst: 'Fiches de substitution', liste: 'Liste nominative datée', anonyme: 'Version anonyme CSE', bordereau: 'Bordereau d\'envoi au SPST' };
  function outilPanel(o, x) {
    var F = C.FICHES[o.id], fv = (P.fiches || {})[o.id] || {}, html = '<div class="ob-tool">';
    if (F) {
      html += '<h4>' + icon('file') + esc(F.doc) + '</h4>' + F.champs.map(function (f) { return ficheField(o.id, f, fv[f.k]); }).join('');
    }
    var docs = (C.DOCS_OUTIL[o.id] || []).filter(function (k) { return DOC_LBL[k]; });
    html += '<div class="ob-files">' +
      (F ? '<button type="button" class="btn btn-primary btn-sm" data-a="print" data-doc="fiche" data-id="' + o.id + '">' + icon('download') + 'Télécharger le justificatif</button><button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="fiche-vierge" data-id="' + o.id + '">Modèle vierge</button>' : '') +
      docs.map(function (k) { return '<button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="' + k + '" data-id="last">' + icon('download') + DOC_LBL[k] + '</button>'; }).join('') +
      '<label class="btn btn-secondary btn-sm file-btn">' + icon('upload') + 'Déposer un justificatif<input type="file" data-upload="' + o.id + '"></label></div>' +
      (UI.up && UI.up[o.id] ? '<p class="small pv-warn">« ' + esc(UI.up[o.id]) + ' » n\'a pas été enregistré : le dépôt de fichiers arrive avec la version hébergée. Indiquez en attendant où la pièce est rangée.</p>' : '') +
      '<p class="ob-refs">Texte : ' + o.articles.split(', ').map(function (a) { return '<a href="' + C.articleUrl(a) + '" target="_blank" rel="noopener">art. ' + esc(a) + '</a>'; }).join(', ') + (F && F.ref ? ' · Référence : <a href="' + F.ref.url + '" target="_blank" rel="noopener">' + esc(F.ref.nom) + '</a>' : '') + '</p></div>';
    return html;
  }
  function stLabel(st) { return { outil: 'faite avec VB Safety', manuel: 'faite', partiel: 'à compléter', manquant: 'à faire', 'sans-objet': 'sans objet' }[st]; }
  function firstTodoView(c) { for (var i = 0; i < STEPS.length; i++) if (!stepDone(STEPS[i].id, c)) return STEPS[i].id; return 'sommaire'; }

  // ------------------------------------------------------------------ M1 · agents et régimes
  function viewAgents(c) {
    if (!S.products.length) return screen({ id: 'agents', kicker: 'Étape 1 sur 6', title: 'Agents et procédés', body: noEval() });
    var a1 = covOf(c, 'A1');
    var body = legalNote() +
      '<p class="pv-row">' + stBadge(a1.statut) + '<span class="muted small">' + esc(a1.detail) + '</span></p>' +
      '<div class="pv-tw"><table class="pv-t stack"><thead><tr><th>Agent ou procédé</th><th>Poste</th><th>Régime proposé</th><th>Régime retenu</th><th>Confirmé le</th><th>Par</th></tr></thead><tbody>' +
      c.agents.map(function (a) {
        var b = 'agents|' + a.key + '|';
        return '<tr><td data-l="Agent"><b>' + esc(a.name) + '</b><small>' + (a.type === 'procede' ? 'Procédé (arrêté du 26 octobre 2020)' : (a.p.h || []).join(' ') || 'Aucune mention santé') + '</small>' +
          a.particuliers.map(function (k) { return '<small class="pv-reg cmr2">Régime particulier : ' + C.PARTICULIERS[k].label + ' · ' + C.PARTICULIERS[k].art + '</small>'; }).join('') +
          (a.repro ? '<small>Reprotoxique : pas d\'affectation des femmes enceintes ou allaitantes (art. D. 4152-10)</small>' : '') + '</td>' +
          '<td data-l="Poste">' + esc(a.poste || '—') + '</td><td data-l="Proposé">' + regBadge(a.regimeAuto) + '</td>' +
          '<td data-l="Retenu"><select class="input" data-b="' + b + 'regime" data-re="1" aria-label="Régime retenu pour ' + esc(a.name) + '">' + Object.keys(C.REGIMES).map(function (k) { return opt(k, C.REGIMES[k].label, a.regime); }).join('') + '</select>' + (a.regime !== a.regimeAuto ? '<small>Choix de l\'employeur, différent de la proposition</small>' : '') + '</td>' +
          '<td data-l="Confirmé le"><input class="input" type="date" data-b="' + b + 'date" data-re="1" value="' + esc(a.confirme) + '" aria-label="Date de confirmation"></td>' +
          '<td data-l="Par"><input class="input" data-b="' + b + 'auteur" value="' + esc(a.auteur) + '" placeholder="Nom, fonction" aria-label="Confirmé par"></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="pv-row"><button type="button" class="btn btn-secondary" data-a="confirm-all">' + icon('check') + 'Confirmer tous les régimes à la date du jour</button><button type="button" class="btn btn-secondary" data-a="print" data-doc="registre">' + icon('download') + 'Registre des agents (PDF)</button></div>';
    return screen({
      id: 'agents', kicker: 'Étape 1 sur 6 · art. R. 4412-59 et R. 4412-60', title: 'Quels agents relèvent du régime CMR ?',
      sub: 'Les agents viennent de votre évaluation. Le régime est proposé d\'après les mentions de danger ; vérifiez-le et datez votre confirmation.',
      body: body,
      help: '<h2 class="h-t">' + icon('help') + 'Comment le régime est proposé</h2><ol class="h-steps"><li><b>Régime CMR</b> : mention H340, H350 ou H360 (catégories 1A et 1B), ou procédé listé (bois, silice, diesel, HAP, huiles usagées…).</li><li><b>Catégorie 2</b> (H341, H351, H361) : régime général des agents chimiques dangereux.</li><li>Un nouveau produit ou une nouvelle fiche de sécurité ? Ajoutez-le dans l\'évaluation, puis revenez confirmer.</li></ol><p class="muted small">Plomb et amiante ont des règles propres. L\'amiante est hors du périmètre de cet outil.</p>'
    });
  }

  // ------------------------------------------------------------------ M2 · révisions datées
  var MOTIFS = ['Révision périodique', 'Nouveau produit ou nouveau procédé', 'Nouvelle fiche de sécurité ou nouveau classement', 'Changement des conditions de travail', 'Résultat de mesurage ou de contrôle', 'Après un accident ou une exposition anormale', 'Autre'];
  function nextDue() {
    var last = P.revisions.length ? P.revisions[P.revisions.length - 1].date : '', m = +(P.periodicite || 0);
    if (!last || !m) return '';
    var d = new Date(last + 'T12:00:00'); d.setMonth(d.getMonth() + m);
    return d.toISOString().slice(0, 10);
  }
  function viewRevisions(c) {
    if (!S.products.length) return screen({ id: 'revisions', kicker: 'Étape 2 sur 6', title: 'Révisions datées', body: noEval() });
    var last = P.revisions.length ? P.revisions[P.revisions.length - 1] : null, sum = C.revisionSummary(S, c.rowsEval), due = nextDue();
    var diff = last ? (sum.produits !== last.resume.produits || sum.cmr !== last.resume.cmr) : false;
    var body = legalNote() +
      (diff ? '<div class="pv-alert"><b>L\'évaluation a changé depuis la dernière révision</b>' + last.resume.produits + ' produit(s) dont ' + last.resume.cmr + ' CMR au ' + fd(last.date) + ', ' + sum.produits + ' dont ' + sum.cmr + ' CMR aujourd\'hui. Enregistrez une révision.</div>' : '') +
      (due && due < today() ? '<div class="pv-alert red"><b>Révision attendue depuis le ' + fd(due) + '</b>Selon la périodicité que vous avez fixée.</div>' : '') +
      '<div class="pv-card"><h3>Enregistrer une révision datée ' + law('Art. R. 4412-62') + '</h3><p class="muted small">La révision fige une copie de l\'évaluation actuelle : ' + sum.produits + ' produit(s) ou procédé(s), dont ' + sum.cmr + ' relevant du régime CMR et ' + sum.prioritesFortes + ' à risque élevé.</p>' +
      '<div class="pv-inline">' + field('Date', '<input class="input" type="date" id="rv-date" value="' + today() + '">') + field('Motif', '<select class="input" id="rv-motif">' + MOTIFS.map(function (m) { return opt(m, m, ''); }).join('') + '</select>') +
      field('Réalisée par', '<input class="input" id="rv-auteur" placeholder="Nom, fonction">') + field('Commentaire', '<input class="input" id="rv-note" placeholder="Facultatif">') +
      '<button type="button" class="btn btn-primary" data-a="revision">' + icon('check') + 'Enregistrer</button></div></div>' +
      '<div class="pv-card"><h3>Périodicité choisie par l\'employeur</h3><p class="muted small">Le texte demande une évaluation renouvelée « régulièrement » sans fixer de délai. Fixez la vôtre et justifiez-la. Le DUERP, lui, est mis à jour au moins une fois par an à partir de 11 salariés (art. R. 4121-2).</p>' +
      '<div class="pv-grid2">' + field('Périodicité', '<select class="input" data-b="periodicite" data-re="1">' + opt('', 'Non fixée', P.periodicite) + opt('6', 'Tous les 6 mois', P.periodicite) + opt('12', 'Tous les ans', P.periodicite) + opt('24', 'Tous les 2 ans', P.periodicite) + '</select>') +
      field('Justification', inp('periodiciteJustif', P.periodiciteJustif, ' placeholder="Ex. procédés stables, mesurages annuels"')) + '</div>' + (due ? '<p class="small">Prochaine révision prévue : <b>' + fd(due) + '</b></p>' : '') + '</div>' +
      (P.revisions.length ? '<h2 class="sub-h">Historique (' + P.revisions.length + ')</h2><div class="pv-tw"><table class="pv-t stack"><thead><tr><th>Date</th><th>Motif</th><th>Par</th><th>État de l\'évaluation</th><th></th></tr></thead><tbody>' +
        P.revisions.slice().reverse().map(function (r) { return '<tr><td data-l="Date"><b>' + fd(r.date) + '</b></td><td data-l="Motif">' + esc(r.motif) + (r.note ? '<small>' + esc(r.note) + '</small>' : '') + '</td><td data-l="Par">' + esc(r.auteur || '—') + '</td><td data-l="État">' + r.resume.produits + ' produit(s), ' + r.resume.cmr + ' CMR, ' + r.resume.prioritesFortes + ' à risque élevé</td><td><button type="button" class="pv-link" data-a="print" data-doc="revision" data-id="' + r.id + '">Copie figée (PDF)</button></td></tr>'; }).join('') +
        '</tbody></table></div><div class="pv-row"><button type="button" class="btn btn-secondary" data-a="print" data-doc="revisions">' + icon('download') + 'Historique des révisions (PDF)</button><a class="btn btn-secondary" href="' + B + 'duerp.html#dossier">Dossier DUERP risque chimique</a></div>' : '<div class="pv-empty">Aucune révision datée pour l\'instant.</div>');
    return screen({ id: 'revisions', kicker: 'Étape 2 sur 6 · art. R. 4412-61 à R. 4412-64', title: 'Datez chaque révision de l\'évaluation', sub: 'Une évaluation non datée ne prouve rien. Chaque révision garde une copie de l\'évaluation telle qu\'elle était ce jour-là.', body: body,
      help: '<h2 class="h-t">' + icon('help') + 'Quand réviser ?</h2><ol class="h-steps"><li>À la périodicité que vous avez fixée.</li><li>À chaque nouveau produit, nouvelle fiche de sécurité ou nouveau procédé.</li><li>Après un mesurage, un accident ou une exposition anormale.</li></ol><p class="muted small">Le chapitre risque chimique se télécharge depuis « Mon DUERP » et se joint au document unique (art. R. 4412-64). Conservez chaque version 40 ans (art. R. 4121-4).</p>' });
  }

  // ------------------------------------------------------------------ M3 · substitution et treize mesures
  function viewSubstitution(c) {
    if (!S.products.length) return screen({ id: 'substitution', kicker: 'Étape 3 sur 6', title: 'Substitution', body: noEval() });
    var body = legalNote();
    if (!c.cmr.length) body += '<div class="res res-ok"><span class="res-k">Aucun agent CMR retenu</span><b>Pas d\'étude de substitution obligatoire</b><span>Les obligations B1 à B4 portent sur les agents du régime CMR (étape 1).</span></div>';
    c.cmr.forEach(function (a) {
      var st = C.substState(P, a.key), s = st.s, b = 'subst|' + a.key + '|', open = UI.open[a.key] != null ? UI.open[a.key] : c.cmr.length === 1;
      body += '<details class="pv-card" data-card="' + esc(a.key) + '"' + (open ? ' open' : '') + '><summary><b>' + esc(a.name) + '</b><span class="muted small">' + esc(a.poste || '') + '</span><span class="pv-sum-r">' +
        stBadge(st.b1 ? 'outil' : 'manquant', 'B1 substitution') + stBadge(!st.needClos ? 'sans-objet' : st.b2 ? 'outil' : 'manquant', 'B2 clos') + stBadge(!st.needRed ? 'sans-objet' : st.b3 ? 'outil' : 'manquant', 'B3 réduction') + stBadge(st.b4 ? 'outil' : st.mesuresFaites ? 'partiel' : 'manquant', 'B4 ' + st.mesuresFaites + '/13') + '</span></summary>' +
        '<h3>Recherche de substitution ' + law('Art. R. 4412-66') + '</h3>' +
        field('Alternatives examinées (produits, procédés, fournisseurs consultés, essais)', area(b + 'alternatives', s.alternatives, 'Ex. dégraissant lessiviel testé en mars 2026 sur 50 pièces : nettoyage insuffisant des perçages')) +
        '<span class="lbl">Conclusion</span><div class="pv-tiles">' + Object.keys(C.CONCLUSIONS).map(function (k) { return '<button type="button" class="chip-btn' + (s.conclusion === k ? ' on' : '') + '" data-set="' + b + 'conclusion" data-v="' + k + '" aria-pressed="' + (s.conclusion === k) + '">' + C.CONCLUSIONS[k] + '</button>'; }).join('') + '</div>' +
        field('Justification de la conclusion', area(b + 'justification', s.justification, 'Raisons techniques, délais, échéance de mise en œuvre')) +
        '<div class="pv-grid2">' + field('Date de l\'étude', '<input class="input" type="date" data-b="' + b + 'date" data-re="1" value="' + esc(s.date || '') + '">') + field('Réalisée par', inp(b + 'auteur', s.auteur, ' placeholder="Nom, fonction"')) + '</div>' +
        (st.needClos ? '<h3>À défaut, système clos ' + law('Art. R. 4412-68') + '</h3><div class="pv-tiles">' + [['oui', 'Travail en système clos mis en place'], ['non', 'Système clos techniquement impossible']].map(function (t) { return '<button type="button" class="chip-btn' + (s.clos === t[0] ? ' on' : '') + '" data-set="' + b + 'clos" data-v="' + t[0] + '" aria-pressed="' + (s.clos === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div>' +
          field(s.clos === 'oui' ? 'Description du système clos' : 'Justification', area(b + 'closJustif', s.closJustif, '')) : '') +
        (st.needRed ? '<h3>À défaut, réduire l\'exposition au plus bas ' + law('Art. R. 4412-69') + '</h3><div class="pv-grid2">' + field('Mesures de réduction', area(b + 'reduction', s.reduction, 'Captage, réduction des quantités, organisation…')) + field('Niveau résiduel d\'exposition', area(b + 'residuel', s.residuel, 'Estimé ou mesuré, avec la date')) + '</div>' : '') +
        '<h3>Les treize mesures applicables dans tous les cas ' + law('Art. R. 4412-70') + '</h3><div class="pv-tw"><table class="pv-t stack"><thead><tr><th>N°</th><th>Mesure</th><th>Statut</th><th>Justificatif</th></tr></thead><tbody>' +
        C.MESURES_13.map(function (m, i) { var n = i + 1, v = (s.mesures || {})[n] || {}; return '<tr><td data-l="N°">' + n + '°</td><td data-l="Mesure">' + esc(m) + '</td><td data-l="Statut"><select class="input pv-m-statut" data-b="' + b + 'mesures|' + n + '|statut" data-re="1" aria-label="Statut de la mesure ' + n + '">' + opt('', 'À renseigner', v.statut) + opt('oui', 'Appliquée', v.statut) + opt('partiel', 'Partiellement', v.statut) + opt('non', 'Non appliquée', v.statut) + opt('na', 'Sans objet ici', v.statut) + '</select></td><td data-l="Justificatif"><input class="input" data-b="' + b + 'mesures|' + n + '|justif" value="' + esc(v.justif || '') + '" placeholder="Pièce, emplacement, précision" aria-label="Justificatif de la mesure ' + n + '"></td></tr>'; }).join('') +
        '</tbody></table></div><div class="pv-row">' + field('Grille renseignée le', '<input class="input" type="date" data-b="' + b + 'mesuresDate" value="' + esc(s.mesuresDate || '') + '">') + '<button type="button" class="btn btn-secondary" data-a="print" data-doc="subst" data-id="' + esc(a.key) + '">' + icon('download') + 'Fiche de substitution (PDF)</button></div></details>';
    });
    if (c.cmr.length > 1) body += '<div class="pv-row"><button type="button" class="btn btn-secondary" data-a="print" data-doc="subst">' + icon('download') + 'Toutes les fiches de substitution (PDF)</button></div>';
    return screen({ id: 'substitution', kicker: 'Étape 3 sur 6 · art. R. 4412-66 à R. 4412-70', title: 'Substitution, système clos, réduction', sub: 'Pour chaque agent CMR : ce que vous avez cherché pour le remplacer, ce que vous avez conclu, et les treize mesures appliquées.', body: body,
      help: '<h2 class="h-t">' + icon('help') + 'L\'ordre imposé par la loi</h2><ol class="h-steps"><li>Supprimer ou remplacer l\'agent, et consigner le résultat de l\'étude dans le DUERP.</li><li>Sinon, travailler en système clos.</li><li>Sinon, réduire l\'exposition au niveau le plus bas techniquement possible.</li><li>Dans tous les cas, appliquer les treize mesures.</li></ol><p class="muted small">Indiquez où se trouve chaque justificatif (registre, procédure, photo, facture).</p>' });
  }

  // ------------------------------------------------------------------ M4 · salariés et expositions
  function viewSalaries(c) {
    if (!S.products.length) return screen({ id: 'salaries', kicker: 'Étape 4 sur 6', title: 'Salariés exposés', body: noEval() });
    var postes = []; S.products.forEach(function (p) { if (p.poste && postes.indexOf(p.poste) === -1) postes.push(p.poste); });
    var sel = UI.sal != null ? P.salaries.filter(function (s) { return s.id === UI.sal; })[0] : null;
    var body = legalNote() + '<div class="pv-alert"><b>Aucune donnée médicale</b>La liste décrit des expositions, pas l\'état de santé : ni aptitude, ni résultat biologique, ni grossesse. Ces informations relèvent du service de santé au travail.</div>';
    if (!c.cmr.length) body += '<div class="res res-ok"><span class="res-k">Aucun agent CMR retenu</span><b>Pas de liste nominative à tenir</b><span>La liste de l\'article R. 4412-93-1 concerne les agents du régime CMR.</span></div>';
    body += '<datalist id="pv-postes">' + postes.map(function (x) { return '<option value="' + esc(x) + '">'; }).join('') + '</datalist>';
    body += '<div class="pv-tw"><table class="pv-t stack"><thead><tr><th>Salarié</th><th>Poste</th><th>Contrat</th><th>Agents CMR</th><th></th></tr></thead><tbody>' +
      (P.salaries.length ? P.salaries.map(function (s) {
        var n = c.rows.filter(function (r) { return r.sal === s.id; }), sug = C.suggestions(P, s, c.agents);
        return '<tr' + (sel && sel.id === s.id ? ' class="is-sel"' : '') + '><td data-l="Salarié"><b>' + esc(C.fullName(s)) + '</b>' + (s.sortie ? '<small>Sorti le ' + fd(s.sortie) + '</small>' : '') + '</td><td data-l="Poste">' + esc(s.poste || '—') + '</td><td data-l="Contrat">' + esc(C.CONTRATS[s.contrat] || '—') + (s.contrat === 'interim' && s.agence ? '<small>' + esc(s.agence) + '</small>' : '') + '</td>' +
          '<td data-l="Agents CMR">' + (n.length ? n.map(function (r) { return esc(r.agent); }).join(', ') : '<span class="muted">Aucun</span>') + (sug.length ? '<small>' + sug.length + ' agent(s) CMR à son poste non rattaché(s)</small>' : '') + '</td>' +
          '<td><button type="button" class="btn btn-secondary btn-sm" data-a="open-sal" data-id="' + s.id + '">' + icon('pen') + 'Ouvrir</button></td></tr>';
      }).join('') : '<tr><td colspan="5" class="muted">Aucun salarié saisi.</td></tr>') + '</tbody></table></div>' +
      '<div class="pv-card"><h3>Ajouter un salarié</h3><div class="pv-inline">' + field('Nom', '<input class="input" id="ns-nom" autocomplete="off">') + field('Prénom', '<input class="input" id="ns-prenom" autocomplete="off">') +
      field('Poste', '<input class="input" id="ns-poste" list="pv-postes" autocomplete="off">') + field('Contrat', '<select class="input" id="ns-contrat">' + Object.keys(C.CONTRATS).map(function (k) { return opt(k, C.CONTRATS[k], 'cdi'); }).join('') + '</select>') +
      '<button type="button" class="btn btn-primary" data-a="add-sal">' + icon('plus') + 'Ajouter</button></div><p class="muted small">Les agents CMR inventoriés au même poste sont proposés automatiquement.</p></div>';
    if (sel) body += salPanel(sel, c);
    return screen({ id: 'salaries', kicker: 'Étape 4 sur 6 · art. R. 4412-93-1', title: 'Qui est exposé, à quoi, depuis quand ?', sub: 'La liste relie des personnes nommées aux agents CMR, dans le temps. La nature, la durée et le degré de l\'exposition y figurent s\'ils sont connus.', body: body,
      help: '<h2 class="h-t">' + icon('help') + 'Qui inscrire ?</h2><ol class="h-steps"><li>Tout travailleur <b>susceptible d\'être exposé</b> à un agent du régime CMR, y compris les intérimaires et les apprentis.</li><li>Une ligne par agent, avec la période d\'exposition.</li><li>Un salarié qui quitte le poste reste sur la liste : renseignez la date de fin.</li></ol><p class="muted small">Le degré est repris de votre évaluation (« estimé ») ; remplacez-le par la valeur mesurée quand vous en avez une.</p>' });
  }
  function salPanel(s, c) {
    var bs = 'sal|' + s.id + '|', ex = P.expos.filter(function (e) { return e.sal === s.id; }), sug = C.suggestions(P, s, c.agents);
    return '<div class="pv-card" id="sal-panel"><h3>' + esc(C.fullName(s)) + '</h3><div class="pv-grid2 pv-grid3">' +
      field('Nom', inp(bs + 'nom', s.nom)) + field('Prénom', inp(bs + 'prenom', s.prenom)) + field('Poste', inp(bs + 'poste', s.poste, ' list="pv-postes"')) +
      field('Contrat', '<select class="input" data-b="' + bs + 'contrat" data-re="1">' + Object.keys(C.CONTRATS).map(function (k) { return opt(k, C.CONTRATS[k], s.contrat); }).join('') + '</select>') +
      (s.contrat === 'interim' ? field('Entreprise de travail temporaire', inp(bs + 'agence', s.agence, ' placeholder="Nom et adresse de l\'agence"')) : '') +
      field('Arrivée au poste', '<input class="input" type="date" data-b="' + bs + 'entree" value="' + esc(s.entree || '') + '">') + field('Départ', '<input class="input" type="date" data-b="' + bs + 'sortie" value="' + esc(s.sortie || '') + '">') + '</div>' +
      '<h3>Expositions aux agents CMR</h3>' +
      (sug.length ? '<div class="pv-alert"><b>À son poste : ' + sug.map(function (a) { return esc(a.name); }).join(', ') + '</b><button type="button" class="btn btn-secondary btn-sm" data-a="add-sug" data-id="' + s.id + '">' + icon('plus') + 'Rattacher ces agents avec les valeurs de l\'évaluation</button></div>' : '') +
      (ex.length ? ex.map(function (e) {
        var be = 'expo|' + e.id + '|', a = c.agents.filter(function (x) { return x.key === e.agent; })[0];
        return '<div class="pv-card"><div class="pv-grid2 pv-grid3">' + field('Agent', '<select class="input" data-b="' + be + 'agent" data-re="1">' + c.cmr.concat(a && a.regime !== 'cmr' ? [a] : []).map(function (x) { return opt(x.key, x.name + (x.regime !== 'cmr' ? ' (hors régime CMR)' : ''), e.agent); }).join('') + '</select>') +
          field('Exposé depuis le', '<input class="input" type="date" data-b="' + be + 'du" value="' + esc(e.du || '') + '">') + field('Jusqu\'au (si terminé)', '<input class="input" type="date" data-b="' + be + 'au" value="' + esc(e.au || '') + '">') + '</div>' +
          '<span class="lbl">Nature : voies d\'exposition</span><div class="pv-chk">' + Object.keys(C.VOIES).map(function (v) { return '<label><input type="checkbox" data-voie="' + e.id + '" value="' + v + '"' + ((e.voies || []).indexOf(v) !== -1 ? ' checked' : '') + '>' + C.VOIES[v] + '</label>'; }).join('') + '</div>' +
          '<div class="pv-grid2 pv-grid3">' + field('Durée', '<select class="input" data-b="' + be + 'duree">' + opt('', 'Non connue', e.duree) + [1, 2, 3, 4].map(function (k) { return opt(k, C.DUREES[k], e.duree); }).join('') + '</select>') +
          field('Degré estimé', '<select class="input" data-b="' + be + 'degre">' + opt('', 'Non connu', e.degre) + [1, 2, 3].map(function (k) { return opt(k, C.DEGRES[k], e.degre); }).join('') + '</select>') +
          field('Valeur mesurée (si mesurage)', inp(be + 'mesure', e.mesure, ' placeholder="Ex. 0,4 mg/m³ sur 8 h, rapport du 12/03/2026"')) + '</div>' +
          '<button type="button" class="pv-link" data-a="del-expo" data-id="' + e.id + '">Retirer cette exposition</button></div>';
      }).join('') : '<p class="muted">Aucune exposition rattachée.</p>') +
      (c.cmr.length ? '<div class="pv-row"><button type="button" class="btn btn-secondary btn-sm" data-a="add-expo" data-id="' + s.id + '">' + icon('plus') + 'Ajouter une exposition</button></div>' : '') +
      '<div class="pv-row"><button type="button" class="btn btn-secondary btn-sm" data-a="close-sal">Fermer</button><button type="button" class="pv-link" data-a="del-sal" data-id="' + s.id + '">Supprimer ce salarié</button></div></div>';
  }

  // ------------------------------------------------------------------ M4 · versions, extraits, envois
  function viewListe(c) {
    if (!S.products.length) return screen({ id: 'liste', kicker: 'Étape 5 sur 6', title: 'Liste et envois', body: noEval() });
    var v = C.lastVersion(P), changed = C.changedSince(P, c.rows), body = legalNote();
    if (!c.cmr.length) return screen({ id: 'liste', kicker: 'Étape 5 sur 6', title: 'Liste et envois', body: body + '<div class="res res-ok"><span class="res-k">Aucun agent CMR retenu</span><b>Pas de liste à transmettre</b><span>Revenez ici si un agent CMR entre dans l\'entreprise.</span></div>' });
    body += '<div class="pv-kpis"><div class="pv-kpi"><span>Salariés sur la liste</span><b>' + uniq(c.rows.map(function (r) { return r.sal; })).length + '</b></div><div class="pv-kpi"><span>Lignes</span><b>' + c.rows.length + '</b></div>' +
      '<div class="pv-kpi"><span>Versions arrêtées</span><b>' + P.versions.length + '</b></div><div class="pv-kpi ' + (covOf(c, 'E3').statut === 'outil' ? 'ok' : 'bad') + '"><span>Dernière version transmise au SPST</span><b>' + (covOf(c, 'E3').statut === 'outil' ? 'Oui' : 'Non') + '</b></div>' +
      '<div class="pv-kpi"><span>Liste exigible depuis le</span><b>' + fd(C.LISTE_EXIGIBLE) + '</b></div></div>';
    body += '<div class="pv-card"><h3>' + (v ? (changed ? 'La liste a changé depuis la version ' + v.n + ' du ' + fd(v.date) : 'Liste à jour : version ' + v.n + ' du ' + fd(v.date)) : 'Arrêter la première version de la liste') + ' ' + law('Art. R. 4412-93-1') + '</h3>' +
      (changed ? '<p class="muted small">Arrêter une version la fige : elle ne sera plus modifiée, et chaque version doit être transmise au service de santé au travail (art. R. 4412-93-3).</p><div class="pv-inline">' + field('Date', '<input class="input" type="date" id="vr-date" value="' + today() + '">') + field('Établie par', '<input class="input" id="vr-auteur" placeholder="Nom, fonction">') + field('Motif', '<input class="input" id="vr-motif" placeholder="' + (v ? 'Ex. arrivée d\'un salarié' : 'Première liste') + '">') + '<span></span><button type="button" class="btn btn-primary" data-a="freeze"' + (c.rows.length ? '' : ' disabled') + '>' + icon('lock') + 'Arrêter la version ' + (v ? v.n + 1 : 1) + '</button></div>' + (c.rows.length ? '' : '<p class="small">Rattachez d\'abord des salariés aux agents CMR (étape 4).</p>') : '') +
      '<div class="pv-tw"><table class="pv-t stack"><thead><tr><th>Salarié</th><th>Poste</th><th>Agent</th><th>Nature</th><th>Durée</th><th>Degré</th><th>Période</th></tr></thead><tbody>' +
      (c.rows.length ? c.rows.map(function (r) { return '<tr><td data-l="Salarié"><b>' + esc(r.nom) + '</b><small>' + esc(r.contrat) + '</small></td><td data-l="Poste">' + esc(r.poste) + '</td><td data-l="Agent">' + esc(r.agent) + '</td><td data-l="Nature">' + esc(r.nature) + '</td><td data-l="Durée">' + esc(r.duree) + '</td><td data-l="Degré">' + esc(r.degre) + '</td><td data-l="Période">' + (r.du ? 'Depuis le ' + fd(r.du) : 'Début non renseigné') + (r.au ? ' au ' + fd(r.au) : '') + '</td></tr>'; }).join('') : '<tr><td colspan="7" class="muted">Liste vide.</td></tr>') + '</tbody></table></div></div>';
    if (P.versions.length) {
      var cur = UI.ver != null ? P.versions.filter(function (x) { return x.n === UI.ver; })[0] || v : v, sals = uniq(cur.rows.map(function (r) { return r.sal; }));
      body += '<div class="pv-card"><h3>Version ' + cur.n + ' du ' + fd(cur.date) + (P.versions.length > 1 ? ' <select class="input pv-m-statut" data-a-change="ver" aria-label="Choisir une version">' + P.versions.map(function (x) { return opt(x.n, 'Version ' + x.n + ' du ' + fd(x.date), cur.n); }).join('') + '</select>' : '') + '</h3>' +
        '<ul class="dl-list">' +
        '<li><span><b>Liste nominative datée</b><small>Art. R. 4412-93-1 · ' + cur.rows.length + ' ligne(s)</small></span><span><button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="liste" data-id="' + cur.n + '">PDF</button> <button type="button" class="btn btn-secondary btn-sm" data-a="csv" data-id="' + cur.n + '">Tableur (CSV)</button></span></li>' +
        '<li><span><b>Version anonyme pour le CSE</b><small>Art. R. 4412-93-2 · aucun nom</small></span><button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="anonyme" data-id="' + cur.n + '">PDF</button></li>' +
        '<li><span><b>Extrait individuel</b><small>Art. R. 4412-93-2 · à remettre au salarié</small></span><span><select class="input pv-m-statut" id="ex-sal" aria-label="Salarié">' + sals.map(function (id) { var r = cur.rows.filter(function (x) { return x.sal === id; })[0]; return opt(id, r.nom, ''); }).join('') + '</select> <button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="extrait" data-id="' + cur.n + '">PDF</button></span></li>' +
        '<li><span><b>Bordereau de transmission au service de santé au travail</b><small>Art. R. 4412-93-3 · avec la liste jointe</small></span><button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="bordereau" data-id="' + cur.n + '">PDF</button></li></ul>' +
        '<h3>Enregistrer la transmission au SPST ' + law('Art. R. 4412-93-3') + '</h3><div class="pv-inline">' + field('Date d\'envoi', '<input class="input" type="date" id="en-date" value="' + today() + '">') + field('Service de santé', '<input class="input" id="en-nom" value="' + esc(P.spst || '') + '" placeholder="Nom du SPST">') +
        field('Moyen', '<select class="input" id="en-moyen">' + ['Portail adhérent du SPST', 'Courriel', 'Courrier recommandé', 'Remise en main propre'].map(function (m) { return opt(m, m, ''); }).join('') + '</select>') + field('Référence ou accusé', '<input class="input" id="en-ref" placeholder="Facultatif">') +
        '<button type="button" class="btn btn-primary" data-a="envoi" data-id="' + cur.n + '">' + icon('send') + 'Enregistrer</button></div></div>';
      var it = C.interimaires(P).filter(function (s) { return c.rows.some(function (r) { return r.sal === s.id; }); });
      if (it.length) body += '<div class="pv-card"><h3>Intérimaires : extrait pour l\'agence ' + law('Art. R. 4412-93-4') + '</h3><ul class="dl-list">' + it.map(function (s) {
        var sent = P.envois.filter(function (e) { return e.dest === 'agence' && e.sal === s.id; });
        return '<li><span><b>' + esc(C.fullName(s)) + '</b><small>' + esc(s.agence || 'Agence non renseignée') + (sent.length ? ' · transmis le ' + fd(sent[sent.length - 1].date) : ' · non transmis') + '</small></span><span><button type="button" class="btn btn-secondary btn-sm" data-a="print" data-doc="agence" data-id="' + s.id + '">Extrait (PDF)</button> <button type="button" class="btn btn-secondary btn-sm" data-a="envoi-agence" data-id="' + s.id + '">' + icon('send') + 'Transmis aujourd\'hui</button></span></li>';
      }).join('') + '</ul></div>';
      if (P.envois.length) body += '<h2 class="sub-h">Journal des envois</h2><div class="pv-tw"><table class="pv-t stack"><thead><tr><th>Date</th><th>Destinataire</th><th>Pièce</th><th>Moyen</th></tr></thead><tbody>' + P.envois.slice().reverse().map(function (e) {
        var s = e.sal ? P.salaries.filter(function (x) { return x.id === e.sal; })[0] : null;
        return '<tr><td data-l="Date"><b>' + fd(e.date) + '</b></td><td data-l="Destinataire">' + (e.dest === 'spst' ? 'Service de santé au travail' + (e.nom ? ' · ' + esc(e.nom) : '') : 'Agence d\'intérim' + (s && s.agence ? ' · ' + esc(s.agence) : '')) + '</td><td data-l="Pièce">' + (e.dest === 'spst' ? 'Liste, version ' + e.version : 'Extrait de ' + esc(s ? C.fullName(s) : 'salarié supprimé')) + '</td><td data-l="Moyen">' + esc(e.moyen || '—') + (e.ref ? '<small>' + esc(e.ref) + '</small>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    }
    return screen({ id: 'liste', kicker: 'Étape 5 sur 6 · art. R. 4412-93-1 à R. 4412-93-4', title: 'Arrêter, transmettre, remettre', sub: 'Une version datée de la liste, ses trois vues, et la trace de chaque envoi.', body: body,
      help: '<h2 class="h-t">' + icon('help') + 'Les trois vues de la liste</h2><ol class="h-steps"><li><b>Le service de santé au travail</b> reçoit la liste et chacune de ses actualisations. Il la verse au dossier médical et la conserve.</li><li><b>Chaque salarié</b> a accès aux informations qui le concernent (extrait individuel).</li><li><b>Le CSE</b> consulte une version anonyme.</li><li><b>L\'agence d\'intérim</b> reçoit l\'extrait de l\'intérimaire et le transmet à son propre service de santé.</li></ol><p class="muted small">Le texte ne fixe ni format, ni canal, ni accusé de réception : gardez la trace de chaque envoi.</p>' });
  }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

  // ------------------------------------------------------------------ M12 · sommaire du dossier
  function viewSommaire(c) {
    if (!S.products.length) return screen({ id: 'sommaire', kicker: 'Étape 6 sur 6', title: 'Sommaire du dossier', body: noEval() });
    if (!P.vuSommaire) { P.vuSommaire = 1; persist(); }
    var count = {}; c.cov.forEach(function (x) { count[x.statut] = (count[x.statut] || 0) + 1; });
    var body = legalNote() + '<div class="pv-kpis"><div class="pv-kpi ok"><span>Produites ici</span><b>' + (count.outil || 0) + '</b></div><div class="pv-kpi"><span>Déclarées par vous</span><b>' + (count.manuel || 0) + '</b></div>' +
      '<div class="pv-kpi mid"><span>À compléter</span><b>' + (count.partiel || 0) + '</b></div><div class="pv-kpi bad"><span>Manquantes</span><b>' + (count.manquant || 0) + '</b></div><div class="pv-kpi"><span>Sans objet</span><b>' + (count['sans-objet'] || 0) + '</b></div></div>' +
      '<div class="pv-row"><button type="button" class="btn btn-primary" data-a="print" data-doc="sommaire">' + icon('download') + 'Sommaire du dossier (PDF)</button><button type="button" class="btn btn-secondary" data-a="print" data-doc="manquantes">Pièces manquantes (PDF)</button><button type="button" class="btn btn-secondary" data-a="print" data-doc="tout">Dossier complet (PDF)</button></div><br>';
    var bloc = '';
    c.cov.forEach(function (x) {
      var o = x.o, m = P.pieces[o.id] || {}, b = 'pieces|' + o.id + '|', manual = x.source !== 'outil' || x.statut === 'partiel' || x.statut === 'manquant';
      if (o.bloc !== bloc) { if (bloc) body += '</tbody></table></div>'; bloc = o.bloc; body += '<p class="pv-bloc">' + o.bloc + '. ' + C.BLOCS[o.bloc] + '</p><div class="pv-tw"><table class="pv-t stack"><thead><tr><th>N°</th><th>Obligation</th><th>Pièce attendue</th><th>État</th><th>Pièce disponible ailleurs</th></tr></thead><tbody>'; }
      body += '<tr><td data-l="N°"><b>' + o.id + '</b></td><td data-l="Obligation">' + esc(o.obligation) + '<small>' + C.articleLabel(o) + (o.frequence ? ' · ' + esc(o.frequence) : '') + '</small></td><td data-l="Pièce">' + esc(o.piece) + '</td>' +
        '<td data-l="État">' + stBadge(x.statut) + '<small>' + esc(x.detail) + (x.date ? ' · ' + fd(x.date) : '') + '</small></td>' +
        '<td data-l="Pièce ailleurs">' + (manual && x.statut !== 'sans-objet' ? '<div class="pv-chk"><label><input type="checkbox" data-b="' + b + 'ok" data-re="1"' + (m.ok ? ' checked' : '') + '>Disponible</label></div>' + (m.ok ? '<input class="input" type="date" data-b="' + b + 'date" value="' + esc(m.date || '') + '" aria-label="Date de la pièce ' + o.id + '"> <input class="input" data-b="' + b + 'lieu" value="' + esc(m.lieu || '') + '" placeholder="Où est-elle rangée ?" aria-label="Emplacement de la pièce ' + o.id + '">' : '') : '<span class="muted small">—</span>') + '</td></tr>';
    });
    body += '</tbody></table></div>';
    body += '<h2 class="sub-h">Fichier de projet</h2><ul class="dl-list"><li><span><b>Enregistrer le projet</b><small>Évaluation et dossier de preuve dans un seul fichier, à archiver et à rouvrir l\'an prochain ou sur un autre poste</small></span><button type="button" class="btn btn-secondary" data-a="project">' + icon('download') + 'Télécharger</button></li>' +
      '<li><span><b>Ouvrir un projet</b><small>Remplace l\'évaluation et le dossier de ce navigateur</small></span><label class="btn btn-secondary file-btn">' + icon('upload') + 'Choisir un fichier<input type="file" accept="application/json,.json" data-import></label></li></ul>' +
      '<div class="info-box"><b>Conservation</b>Un fichier local ne garantit pas la conservation. Le DUERP et ses versions sont conservés 40 ans par l\'employeur (art. R. 4121-4) ; c\'est à l\'entreprise d\'archiver ses exports (PDF et fichier de projet) sur un support sauvegardé.</div>';
    return screen({ id: 'sommaire', kicker: 'Étape 6 sur 6 · 45 obligations', title: 'Le sommaire de votre dossier CMR', sub: 'Pour chacune des 45 obligations : la pièce présente, sa date, et ce qui manque. Les pièces tenues hors de cet outil peuvent être déclarées avec leur emplacement.', body: body });
  }

  // ------------------------------------------------------------------ documents imprimés
  function head(title, sub, extra) {
    var e = ent(), meta = [['Entreprise', e.nom || S.site || '………………………………']].concat(e.siren ? [['SIREN', e.siren]] : [], e.adresse ? [['Adresse', e.adresse]] : [], e.site ? [['Établissement', e.site]] : [], e.effectif ? [['Effectif', e.effectif]] : [], [['Date d\'édition', fd(today())]], extra || []);
    return '<h1>' + esc(title) + '</h1><p class="ph-sub">' + esc(sub) + '</p><dl>' + meta.map(function (m) { return '<div><dt>' + esc(m[0]) + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('') + '</dl>';
  }
  function foot(ids, date) {
    var obs = C.OBLIGATIONS.filter(function (o) { return ids.indexOf(o.id) !== -1; });
    return '<p class="ph-foot">' + obs.map(function (o) { return o.id + ' · ' + esc(C.mention(o, date)); }).join('<br>') + '<br>Document établi par l\'employeur avec l\'outil VB Safety (vb-safety.com). Il atteste de ce qui a été renseigné à la date indiquée, sans valoir avis sur le respect de la réglementation. Référentiel juridique du ' + fd(C.REFERENTIEL.date) + '.</p>';
  }
  function doc(html) { return '<section class="pv-doc">' + html + '</section>'; }
  function table(cols, rows) { return '<table><thead><tr>' + cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + (rows.length ? rows.map(function (r) { return '<tr>' + r.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + cols.length + '">Néant.</td></tr>') + '</tbody></table>'; }
  function period(r) { return (r.du ? fd(r.du) : 'non renseigné') + (r.au ? ' → ' + fd(r.au) : ' → en cours'); }
  function verById(n) { return P.versions.filter(function (v) { return v.n === +n; })[0]; }

  function ficheDoc(id, vierge) {
    var o = C.OBLIGATIONS.filter(function (x) { return x.id === id; })[0], F = C.FICHES[id], fv = vierge ? {} : ((P.fiches || {})[id] || {});
    if (!o || !F) return '';
    var html = head(F.doc, 'Obligation ' + o.id + ' · ' + o.obligation + ' · ' + C.articleLabel(o) + ' du code du travail', ent().responsable ? [['Établi par', ent().responsable]] : []);
    F.champs.forEach(function (f) {
      if (f.type === 'tab') {
        var rows = (fv[f.k] || []).filter(function (r) { return r.some(function (c) { return String(c || '').trim(); }); });
        if (vierge || !rows.length) rows = [0, 1, 2, 3, 4, 5].map(function () { return f.cols.map(function () { return ''; }); });
        html += table(f.cols, rows);
      } else html += '<h2>' + esc(f.l) + '</h2><p>' + (fv[f.k] ? esc(f.type === 'd' ? fd(fv[f.k]) : fv[f.k]).replace(/\n/g, '<br>') : '……………………………………………………………………………………') + '</p>';
    });
    return doc(html + '<div class="ph-sign"><div>Date</div><div>Nom et fonction</div><div>Signature</div></div>' + foot([id], vierge ? '' : fv.maj));
  }
  var DOCS = {
    registre: function (c) {
      var d = C.coverage({ S: S, P: P, agents: c.agents, listeRows: c.rows }).filter(function (x) { return x.o.id === 'A1'; })[0].date;
      return doc(head('Registre des agents chimiques et procédés', 'Identification des agents relevant du régime CMR · art. R. 4412-59 et R. 4412-60 du code du travail') +
        table(['Agent ou procédé', 'Type', 'Mentions de danger', 'Poste', 'Régime retenu', 'Régime particulier', 'Confirmé le', 'Par'], c.agents.map(function (a) { return [a.name, a.type === 'procede' ? 'Procédé listé' : 'Produit', (a.p.h || []).join(' ') || '—', a.poste || '—', C.REGIMES[a.regime].label + (a.regime !== a.regimeAuto ? ' (choix de l\'employeur)' : ''), a.particuliers.map(function (k) { return C.PARTICULIERS[k].label; }).join(', ') || '—', a.confirme ? fd(a.confirme) : 'À confirmer', a.auteur || '—']; })) + foot(['A1'], d));
    },
    revisions: function () {
      return doc(head('Historique des révisions de l\'évaluation du risque chimique', 'Art. R. 4412-61 à R. 4412-64 du code du travail', [['Périodicité fixée', P.periodicite ? 'Tous les ' + P.periodicite + ' mois' + (P.periodiciteJustif ? ' (' + P.periodiciteJustif + ')' : '') : 'Non fixée']]) +
        table(['Date', 'Motif', 'Réalisée par', 'Produits ou procédés', 'Dont CMR', 'Risque élevé', 'Commentaire'], P.revisions.map(function (r) { return [fd(r.date), r.motif, r.auteur || '—', r.resume.produits, r.resume.cmr, r.resume.prioritesFortes, r.note || '']; })) + foot(['A3'], P.revisions.length ? P.revisions[P.revisions.length - 1].date : ''));
    },
    revision: function (c, id) {
      var r = P.revisions.filter(function (x) { return x.id === +id; })[0]; if (!r) return '';
      var snap = r.snapshot || { products: [] };
      return doc(head('Copie figée de l\'évaluation', 'Révision du ' + fd(r.date) + ' · ' + r.motif + ' · art. R. 4412-62 du code du travail', [['Réalisée par', r.auteur || '—']]) +
        table(['Produit ou procédé', 'Poste', 'Salariés', 'Mentions de danger', 'Fréquence', 'Quantité par an'], snap.products.map(function (p) { return [p.name, p.poste || '—', p.nb === '' || p.nb == null ? '—' : p.nb, p.type === 'procede' ? 'Procédé cancérogène' : (p.h || []).join(' ') || '—', FREQ_S[(+p.freq || 1) - 1], p.type === 'procede' ? '—' : (p.qte || '—') + ' ' + (p.unite || '')]; })) + foot(['A3'], r.date));
    },
    subst: function (c, key) {
      var list = key ? c.cmr.filter(function (a) { return a.key === key; }) : c.cmr;
      return list.map(function (a) {
        var st = C.substState(P, a.key), s = st.s;
        var rows = [['Alternatives examinées', s.alternatives || 'Non renseigné'], ['Conclusion', C.CONCLUSIONS[s.conclusion] || 'Non renseignée'], ['Justification', s.justification || '—'], ['Date de l\'étude, auteur', (s.date ? fd(s.date) : 'Non datée') + ' · ' + (s.auteur || '—')]];
        if (st.needClos) rows.push(['Système clos (art. R. 4412-68)', (s.clos === 'oui' ? 'Mis en place' : s.clos === 'non' ? 'Techniquement impossible' : 'Non renseigné') + (s.closJustif ? ' : ' + s.closJustif : '')]);
        if (st.needRed) rows.push(['Réduction (art. R. 4412-69)', (s.reduction || 'Non renseigné') + (s.residuel ? ' · Niveau résiduel : ' + s.residuel : '')]);
        var lab = { oui: 'Appliquée', partiel: 'Partiellement', non: 'Non appliquée', na: 'Sans objet ici' };
        return doc(head('Fiche de recherche de substitution', a.name + ' · ' + (a.poste || 'poste non renseigné') + ' · à consigner dans le DUERP (art. R. 4412-66)') +
          '<table><tbody>' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
          '<h2>Les treize mesures (art. R. 4412-70)' + (s.mesuresDate ? ' · grille du ' + fd(s.mesuresDate) : '') + '</h2>' +
          table(['N°', 'Mesure', 'Statut', 'Justificatif'], C.MESURES_13.map(function (m, i) { var v = (s.mesures || {})[i + 1] || {}; return [(i + 1) + '°', m, lab[v.statut] || 'À renseigner', v.justif || '']; })) + foot(['B1', 'B2', 'B3', 'B4'], s.date));
      }).join('');
    },
    liste: function (c, n) {
      var v = verById(n); if (!v) return '';
      return doc(head('Liste des travailleurs susceptibles d\'être exposés aux agents CMR', 'Art. R. 4412-93-1 du code du travail · décret n° 2024-307 du 4 avril 2024', [['Version', v.n + ' arrêtée le ' + fd(v.date)], ['Établie par', v.auteur || '—']]) +
        table(['Nom et prénom', 'Contrat', 'Poste', 'Agent CMR', 'Nature (voies)', 'Durée', 'Degré', 'Période'], v.rows.map(function (r) { return [r.nom, r.contrat, r.poste, r.agent, r.nature, r.duree, r.degre, period(r)]; })) +
        '<p>Nature, durée et degré de l\'exposition sont indiqués lorsqu\'ils sont connus. Les degrés « estimés » proviennent de l\'évaluation du risque chimique ; les valeurs « mesurées » proviennent de rapports de mesurage.</p>' + foot(['E1'], v.date));
    },
    anonyme: function (c, n) {
      var v = verById(n); if (!v) return '';
      return doc(head('Liste des travailleurs exposés aux agents CMR · version anonyme', 'Mise à disposition du comité social et économique · art. R. 4412-93-2 du code du travail', [['D\'après la version', v.n + ' du ' + fd(v.date)]]) +
        table(['Code', 'Poste', 'Agent CMR', 'Nature (voies)', 'Durée', 'Degré', 'Période'], C.anonyme(v.rows).map(function (r) { return [r.code, r.poste, r.agent, r.nature, r.duree, r.degre, period(r)]; })) + foot(['E2'], v.date));
    },
    extrait: function (c, n, salId) {
      var v = verById(n); if (!v) return '';
      var rows = C.extraitIndividuel(v.rows, +salId); if (!rows.length) return '';
      return doc(head('Extrait individuel de la liste des travailleurs exposés', 'Informations qui vous concernent · art. R. 4412-93-2 du code du travail', [['Salarié', rows[0].nom], ['D\'après la version', v.n + ' du ' + fd(v.date)]]) +
        table(['Poste', 'Agent CMR', 'Type', 'Nature (voies)', 'Durée', 'Degré', 'Période'], rows.map(function (r) { return [r.poste, r.agent, r.agentType, r.nature, r.duree, r.degre, period(r)]; })) +
        '<p>Cet extrait décrit vos expositions professionnelles. Il ne contient aucune information médicale. Votre suivi individuel renforcé est assuré par le service de prévention et de santé au travail.</p><div class="ph-sign"><div>Remis le</div><div>Signature du salarié</div><div>Pour l\'employeur</div></div>' + foot(['E2'], v.date));
    },
    agence: function (c, salId) {
      var v = C.lastVersion(P), s = P.salaries.filter(function (x) { return x.id === +salId; })[0], rows = v ? C.extraitIndividuel(v.rows, +salId) : C.extraitIndividuel(c.rows, +salId);
      if (!s) return '';
      return doc(head('Extrait de la liste des travailleurs exposés · travailleur intérimaire', 'À l\'attention de l\'entreprise de travail temporaire, qui le transmet à son service de prévention et de santé au travail · art. R. 4412-93-4 du code du travail', [['Intérimaire', C.fullName(s)], ['Entreprise de travail temporaire', s.agence || '………………………………'], ['Entreprise utilisatrice', S.site || '………………………………']]) +
        table(['Poste', 'Agent CMR', 'Nature (voies)', 'Durée', 'Degré', 'Période'], rows.map(function (r) { return [r.poste, r.agent, r.nature, r.duree, r.degre, period(r)]; })) + '<div class="ph-sign"><div>Transmis le</div><div>Pour l\'entreprise utilisatrice</div></div>' + foot(['E4'], today()));
    },
    bordereau: function (c, n) {
      var v = verById(n); if (!v) return '';
      var nb = uniq(v.rows.map(function (r) { return r.sal; })).length;
      return doc(head('Bordereau de transmission au service de prévention et de santé au travail', 'Communication de la liste des travailleurs exposés et de ses actualisations · art. R. 4412-93-3 du code du travail', [['Destinataire', P.spst || '………………………………'], ['Pièce transmise', 'Liste, version ' + v.n + ' du ' + fd(v.date)]]) +
        '<table><tbody><tr><th>Nombre de salariés</th><td>' + nb + '</td></tr><tr><th>Nombre de lignes</th><td>' + v.rows.length + '</td></tr><tr><th>Motif de la version</th><td>' + esc(v.motif || (v.n === 1 ? 'Première liste' : 'Actualisation')) + '</td></tr><tr><th>Version précédente transmise</th><td>' + (v.n > 1 ? 'Version ' + (v.n - 1) : 'Aucune') + '</td></tr></tbody></table>' +
        '<p>La liste est jointe. Elle est destinée au dossier médical en santé au travail des salariés concernés.</p><div class="ph-sign"><div>Date d\'envoi</div><div>Moyen d\'envoi</div><div>Pour l\'employeur</div></div>' + foot(['E3'], v.date)) + DOCS.liste(c, n);
    },
    sommaire: function (c, missingOnly) {
      var list = c.cov.filter(function (x) { return !missingOnly || x.statut === 'manquant' || x.statut === 'partiel'; });
      var lab = { outil: 'Produite avec l\'outil', manuel: 'Déclarée par l\'employeur', partiel: 'À compléter', manquant: 'Manquante', 'sans-objet': 'Sans objet' };
      return doc(head(missingOnly ? 'Pièces manquantes du dossier CMR' : 'Sommaire du dossier CMR', 'Obligations de l\'employeur exposant à des agents cancérogènes, mutagènes ou toxiques pour la reproduction · ' + C.OBLIGATIONS.length + ' obligations') +
        table(['N°', 'Obligation', 'Articles', 'Pièce attendue', 'État', 'Détail', 'Date'], list.map(function (x) { return [x.o.id, x.o.obligation, x.o.articles, x.o.piece, lab[x.statut], x.detail, x.date ? fd(x.date) : '']; })) +
        '<p class="ph-foot">Sommaire établi par l\'employeur avec l\'outil VB Safety. « Produite avec l\'outil » signifie que la pièce a été renseignée dans l\'outil à la date indiquée ; « Déclarée par l\'employeur » signifie que l\'employeur indique détenir la pièce ailleurs. Aucune mention ne vaut avis sur le respect de la réglementation. Référentiel juridique du ' + fd(C.REFERENTIEL.date) + ' : ' + esc(C.REFERENTIEL.relecture) + '.</p>');
    }
  };
  function printDocs(kind, id) {
    var c = ctx(), html = '';
    if (id === 'last') {
      var lv = C.lastVersion(P); id = undefined;
      if (/^(liste|anonyme|bordereau)$/.test(kind)) { if (!lv) { alert('Arrêtez d\'abord une version de la liste (étape « Liste et envois »).'); return; } id = lv.n; }
    }
    if (kind === 'fiche' || kind === 'fiche-vierge') html = ficheDoc(id, kind === 'fiche-vierge');
    else if (kind === 'manquantes') html = DOCS.sommaire(c, true);
    else if (kind === 'extrait') html = DOCS.extrait(c, id, ($('#ex-sal') || {}).value);
    else if (kind === 'tout') {
      var v = C.lastVersion(P);
      html = DOCS.sommaire(c) + DOCS.registre(c) + (P.revisions.length ? DOCS.revisions(c) : '') + (c.cmr.length ? DOCS.subst(c) : '') + (v ? DOCS.liste(c, v.n) + DOCS.anonyme(c, v.n) : '') +
        Object.keys(C.FICHES).filter(function (k) { return C.ficheRemplie(P, k); }).map(function (k) { return ficheDoc(k); }).join('');
    } else if (DOCS[kind]) html = DOCS[kind](c, id);
    if (!html) { alert('Ce document est vide pour l\'instant.'); return; }
    var box = $('#pv-print'), t = document.title;
    box.innerHTML = html;
    document.title = (kind === 'tout' ? 'Dossier CMR' : (($('h1', box) || {}).textContent || 'Dossier CMR')) + (S.site ? ' - ' + S.site : '') + ' - ' + fd(today()).replace(/\//g, '-');
    document.body.classList.add('pv-printing');
    window.print();
    setTimeout(function () { document.title = t; document.body.classList.remove('pv-printing'); box.innerHTML = ''; }, 300);
  }
  function download(name, data, type) {
    var blob = new Blob([data], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function slug() { return S.site ? '-' + S.site.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''; }
  function csvCell(v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }

  // ------------------------------------------------------------------ exemple fictif
  function demoP() {
    var d = C.blank();
    ['p:1', 'p:2', 'p:3', 'p:4', 'p:5', 'p:6'].forEach(function (k) { d.agents[k] = { date: '2026-09-15', auteur: 'Responsable HSE' }; });
    d.revisions.push({ id: 1, date: '2026-09-15', motif: 'Révision périodique', auteur: 'Responsable HSE', note: '', resume: C.revisionSummary(S, compute()), snapshot: JSON.parse(JSON.stringify({ site: S.site, products: S.products })) });
    d.periodicite = '12'; d.periodiciteJustif = 'Procédés stables, contrôle annuel des valeurs limites';
    d.subst['p:1'] = { alternatives: 'Dégraissant lessiviel testé en mars 2026 sur 50 pièces ; fontaine biologique en essai', conclusion: 'en-cours', justification: 'Nettoyage insuffisant des perçages avec le lessiviel ; essai de la fontaine biologique jusqu\'en décembre 2026', date: '2026-09-15', auteur: 'Responsable HSE', clos: 'non', closJustif: 'Pièces de grande taille, dégraissage manuel', reduction: 'Bac couvert entre deux usages, captage localisé prévu en novembre', residuel: 'Modéré (estimé)', mesures: {} };
    for (var i = 1; i <= 9; i++) d.subst['p:1'].mesures[i] = { statut: i === 4 ? 'partiel' : 'oui', justif: i === 1 ? 'Stock limité à 20 L au poste' : '' };
    d.spst = 'Service de santé au travail (exemple)';
    d.salaries = [
      { id: 1, nom: 'Exemple', prenom: 'Alix', poste: 'Dégraissage des pièces', contrat: 'cdi', entree: '2019-03-01' },
      { id: 2, nom: 'Exemple', prenom: 'Camille', poste: 'Dégraissage des pièces', contrat: 'cdi', entree: '2022-09-12' },
      { id: 3, nom: 'Fictif', prenom: 'Sacha', poste: 'Cabine de peinture', contrat: 'cdi', entree: '2021-01-04' },
      { id: 4, nom: 'Fictif', prenom: 'Noa', poste: 'Menuiserie', contrat: 'interim', agence: 'Agence d\'intérim (exemple)', entree: '2026-09-01' },
      { id: 5, nom: 'Modèle', prenom: 'Lou', poste: 'Menuiserie', contrat: 'apprenti', entree: '2026-09-01' }
    ];
    d.next = 6;
    var rows = {}; compute().forEach(function (r) { rows[r.p.id] = r; });
    [[1, 1, '2019-03-01'], [2, 1, '2022-09-12'], [3, 2, '2021-01-04'], [4, 6, '2026-09-01']].forEach(function (x) {
      var a = C.agents(S, d).filter(function (g) { return g.key === 'p:' + x[1]; })[0], e = C.exposFromEval(a, rows[x[1]]);
      e.id = d.next++; e.sal = x[0]; e.agent = 'p:' + x[1]; e.du = x[2]; d.expos.push(e);
    });
    var v = C.freezeVersion(d, C.listeRows(S, d, C.agents(S, d)), '2026-09-16', 'Responsable HSE', 'Première liste');
    d.envois.push({ id: d.next++, dest: 'spst', version: v.n, date: '2026-09-17', nom: d.spst, moyen: 'Portail adhérent du SPST' });
    d.entreprise = { nom: 'Atelier de démonstration', siren: '999999998', adresse: '1 rue de l\'Exemple, 77100 Meaux', site: 'Atelier principal', effectif: '24', responsable: 'Responsable HSE', spst: 'Service de santé au travail (exemple)' };
    d.fiches.C2 = { prochain: '2027-03-10', lignes: [['2026-03-12', 'Laboratoire accrédité (exemple)', 'Dégraissage', 'Trichloroéthylène', '28 % de la valeur limite', 'R-2026-031']], maj: '2026-03-15' };
    d.fiches.D3 = { programme: 'Risques des agents CMR, précautions, hygiène, port des équipements, conduite en cas d\'incident', lignes: [['2026-02-03', 'Risque chimique et CMR', 'Responsable HSE', '9', '2027-02-03']], maj: '2026-02-03' };
    d.fiches.B8 = { lignes: [['2026-09-02', 'Captage cabine de peinture', 'Débit dans la plage du constructeur', 'Mainteneur (exemple)', '2027-03-02']], maj: '2026-09-02' };
    // Une apprentie arrivée après la version 1 : la liste a changé et doit être actualisée
    var a6 = C.agents(S, d).filter(function (g) { return g.key === 'p:6'; })[0], e6 = C.exposFromEval(a6, rows[6]);
    e6.id = d.next++; e6.sal = 5; e6.agent = 'p:6'; e6.du = '2026-09-01'; d.expos.push(e6);
    return d;
  }

  // ------------------------------------------------------------------ rendu et navigation
  var VIEWS = { obligations: viewObligations, accueil: viewAccueil, agents: viewAgents, revisions: viewRevisions, substitution: viewSubstitution, salaries: viewSalaries, liste: viewListe, sommaire: viewSommaire };
  function render(focus) {
    var c = ctx(), v = $('#du-view'), y = window.scrollY;
    v.innerHTML = (demoMode() ? '<div class="demo-note"><span><b>Exemple fictif.</b> Vos propres données ne sont pas modifiées.</span><button type="button" class="btn btn-secondary" data-a="quitdemo">Quitter l\'exemple</button></div>' : '') + (VIEWS[UI.view] || viewAccueil)(c);
    document.body.classList.toggle('du-welcome', UI.view === 'accueil');
    drawSide(c);
    if (focus) { window.scrollTo(0, 0); var t = $('#q-title', v); if (t) { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); } }
    else window.scrollTo(0, y);
  }
  function go(id) {
    UI.view = VIEWS[id] ? id : 'obligations';
    try { history.replaceState(null, '', UI.view === 'obligations' ? location.pathname : '#' + UI.view); } catch (e) {}
    render(true);
  }
  // Écriture d'une valeur : « a|b|c » désigne P.a.b.c ; « sal|id|champ » et « expo|id|champ » désignent un salarié ou une exposition
  function setPath(path, val) {
    var k = path.split('|'), o;
    if (k[0] === 'sal' || k[0] === 'expo') {
      o = (k[0] === 'sal' ? P.salaries : P.expos).filter(function (x) { return String(x.id) === k[1]; })[0];
      if (!o) return;
      if (val === '' || val == null) delete o[k[2]]; else o[k[2]] = k[2] === 'duree' || k[2] === 'degre' ? +val : val;
      return;
    }
    o = P;
    for (var i = 0; i < k.length - 1; i++) { if (!o[k[i]] || typeof o[k[i]] !== 'object') o[k[i]] = {}; o = o[k[i]]; }
    o[k[k.length - 1]] = val;
  }
  function getPath(path) { var o = P; path.split('|').forEach(function (k) { o = o == null ? undefined : o[k]; }); return o; }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button, a[href^="#"]');
    if (!t) { document.body.classList.remove('du-nav-open'); return; }
    if (t.id === 'du-nav-btn') { var o = document.body.classList.toggle('du-nav-open'); t.setAttribute('aria-expanded', o); return; }
    document.body.classList.remove('du-nav-open');
    if (t.tagName === 'A') { var id = t.getAttribute('href').slice(1); if (VIEWS[id]) { e.preventDefault(); go(id); } return; }
    if (t.disabled) return;
    var d = t.dataset;
    if (d.nav != null) { go(d.nav); return; }
    if (d.set) { setPath(d.set, getPath(d.set) === d.v ? '' : d.v); persist(); render(); return; }
    var a = d.a, n = +d.id;
    if (a === 'demo') { setDemoMode(true); S = demo(); S.effectif = '11-49'; S.seen = {}; S.exported = 1; save(); P = demoP(); persist(); go('obligations'); return; }
    if (a === 'quitdemo') { setDemoMode(false); S = load(); S.seen = S.seen || {}; P = loadP(); go('obligations'); return; }
    if (a === 'confirm-all') { ctx().agents.forEach(function (g) { P.agents[g.key] = P.agents[g.key] || {}; P.agents[g.key].regime = g.regime; if (!P.agents[g.key].date) P.agents[g.key].date = today(); }); persist(); render(); announce('Régimes confirmés.'); return; }
    if (a === 'revision') {
      var date = $('#rv-date').value || today();
      P.revisions.push({ id: uid(), date: date, motif: $('#rv-motif').value, auteur: $('#rv-auteur').value.trim(), note: $('#rv-note').value.trim(), resume: C.revisionSummary(S, compute()), snapshot: JSON.parse(JSON.stringify({ site: S.site, effectif: S.effectif, products: S.products, actions: S.actions })) });
      P.revisions.sort(function (x, y) { return x.date < y.date ? -1 : x.date > y.date ? 1 : x.id - y.id; });
      persist(); render(); announce('Révision du ' + fd(date) + ' enregistrée.'); return;
    }
    if (a === 'add-sal') {
      var nom = $('#ns-nom').value.trim(), pre = $('#ns-prenom').value.trim();
      if (!nom && !pre) { $('#ns-nom').focus(); return; }
      var s = { id: uid(), nom: nom, prenom: pre, poste: $('#ns-poste').value.trim(), contrat: $('#ns-contrat').value };
      P.salaries.push(s); UI.sal = s.id; persist(); render(); announce('Salarié ajouté.');
      var pnl = $('#sal-panel'); if (pnl) pnl.scrollIntoView({ block: 'start' }); return;
    }
    if (a === 'open-sal') { UI.sal = n; render(); var pn = $('#sal-panel'); if (pn) pn.scrollIntoView({ block: 'start' }); return; }
    if (a === 'close-sal') { UI.sal = null; render(); return; }
    if (a === 'del-sal') {
      var sx = P.salaries.filter(function (x) { return x.id === n; })[0];
      if (sx && confirm('Supprimer ' + C.fullName(sx) + ' ? Les versions déjà arrêtées de la liste ne changent pas.')) { P.salaries = P.salaries.filter(function (x) { return x !== sx; }); P.expos = P.expos.filter(function (x) { return x.sal !== n; }); UI.sal = null; persist(); render(); }
      return;
    }
    if (a === 'add-sug') {
      var c0 = ctx(), sal = P.salaries.filter(function (x) { return x.id === n; })[0];
      C.suggestions(P, sal, c0.agents).forEach(function (g) { var ex = C.exposFromEval(g, c0.evalById[g.p.id]); ex.id = uid(); ex.sal = n; ex.agent = g.key; if (sal.entree) ex.du = sal.entree; P.expos.push(ex); });
      persist(); render(); return;
    }
    if (a === 'add-expo') { var c1 = ctx(); if (c1.cmr.length) { var sl = P.salaries.filter(function (x) { return x.id === n; })[0]; P.expos.push({ id: uid(), sal: n, agent: c1.cmr[0].key, du: sl && sl.entree ? sl.entree : '' }); persist(); render(); } return; }
    if (a === 'del-expo') { P.expos = P.expos.filter(function (x) { return x.id !== n; }); persist(); render(); return; }
    if (a === 'freeze') {
      var c2 = ctx(); if (!c2.rows.length) return;
      var v = C.freezeVersion(P, c2.rows, $('#vr-date').value || today(), $('#vr-auteur').value.trim(), $('#vr-motif').value.trim());
      UI.ver = v.n; persist(); render(); announce('Version ' + v.n + ' arrêtée.'); return;
    }
    if (a === 'envoi') {
      P.spst = $('#en-nom').value.trim();
      P.envois.push({ id: uid(), dest: 'spst', version: n, date: $('#en-date').value || today(), nom: P.spst, moyen: $('#en-moyen').value, ref: $('#en-ref').value.trim() });
      persist(); render(); announce('Transmission enregistrée.'); return;
    }
    if (a === 'envoi-agence') { P.envois.push({ id: uid(), dest: 'agence', sal: n, date: today(), moyen: '' }); persist(); render(); return; }
    if (a === 'csv') {
      var vv = verById(n); if (!vv) return;
      var lines = [['Version', 'Arrêtée le', 'Nom et prénom', 'Contrat', 'Poste', 'Agent CMR', 'Type', 'Nature', 'Durée', 'Degré', 'Exposé du', 'au']].concat(vv.rows.map(function (r) { return [vv.n, fd(vv.date), r.nom, r.contrat, r.poste, r.agent, r.agentType, r.nature, r.duree, r.degre, r.du ? fd(r.du) : '', r.au ? fd(r.au) : '']; }));
      download('liste-travailleurs-exposes-cmr-v' + vv.n + slug() + '.csv', '﻿' + lines.map(function (l) { return l.map(csvCell).join(';'); }).join('\n'), 'text/csv;charset=utf-8'); return;
    }
    if (a === 'project') { download('dossier-cmr' + slug() + '-' + today() + '.json', JSON.stringify(C.packProject(S, P), null, 1), 'application/json'); return; }
    if (a === 'print') { printDocs(d.doc, d.id); return; }
    if (a === 'row-add' || a === 'row-del') {
      var fid = d.id, F0 = C.FICHES[fid], k0 = d.k || 'lignes', col = F0.champs.filter(function (f) { return f.k === k0; })[0];
      P.fiches[fid] = P.fiches[fid] || {}; var rows = P.fiches[fid][k0] = (P.fiches[fid][k0] || []).slice();
      if (!rows.length) rows.push(col.cols.map(function () { return ''; }));
      if (a === 'row-add') rows.push(col.cols.map(function () { return ''; })); else rows.splice(+d.r, 1);
      P.fiches[fid].maj = today(); persist(); render(); return;
    }
    if (a === 'ob-filter') { UI.obFilter = d.f; render(); return; }
    if (a === 'ob-open') { UI.obOpen = UI.obOpen === d.id ? null : d.id; render(); var it = $('[aria-controls="ob-d-' + d.id + '"]'); if (it) it.focus({ preventScroll: true }); return; }
    if (a === 'ob-done') { var pc = P.pieces[d.id] = P.pieces[d.id] || {}; pc.ok = !pc.ok; if (pc.ok && !pc.date) pc.date = today(); persist(); if (pc.ok) UI.obOpen = d.id; render(); announce(pc.ok ? 'Obligation ' + d.id + ' marquée comme faite.' : 'Obligation ' + d.id + ' remise à faire.'); return; }
    if (a === 'ob-faire') {
      var ob = C.OBLIGATIONS.filter(function (x) { return x.id === d.id; })[0]; if (!ob) return;
      if (ob.faire && ob.faire.vue) { go(ob.faire.vue); return; }
      if (C.FICHES[ob.id] && !(ob.faire && ob.faire.lien)) { UI.obOpen = ob.id; render(); var tl = $('#ob-d-' + ob.id + ' .ob-tool'); if (tl) tl.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
      if (ob.faire && ob.faire.lien) { location.href = B + ob.faire.lien; return; }
      location.href = '/devis/?besoin=' + encodeURIComponent('Obligation ' + ob.id + ' · ' + ob.obligation + ' (' + C.articleLabel(ob) + ')'); return;
    }
  });
  document.addEventListener('toggle', function (e) { if (e.target.matches && e.target.matches('[data-ent]')) UI.entOpen = e.target.open; }, true);
  document.addEventListener('toggle', function (e) { var c = e.target.closest && e.target.closest('[data-card]'); if (c && e.target === c) UI.open[c.dataset.card] = c.open; }, true);

  function bindFiche(t) {
    var id = t.dataset.fi, k = t.dataset.fk; P.fiches = P.fiches || {}; var f = P.fiches[id] = P.fiches[id] || {};
    if (t.dataset.r != null) {
      var cols = C.FICHES[id].champs.filter(function (x) { return x.k === k; })[0].cols, rows = f[k] = Array.isArray(f[k]) && f[k].length ? f[k] : [cols.map(function () { return ''; })];
      rows[+t.dataset.r][+t.dataset.c] = t.value;
    } else f[k] = t.value;
    f.maj = today(); persist(); drawSide(ctx());
  }
  function bind(t, rerender) {
    var path = t.dataset.b; if (!path) return false;
    setPath(path, t.type === 'checkbox' ? t.checked : t.value);
    persist();
    if (rerender || t.dataset.re) render(); else drawSide(ctx());
    return true;
  }
  document.addEventListener('input', function (e) { var t = e.target; if (t.dataset.fi) { bindFiche(t); return; } if (t.dataset.b && t.tagName !== 'SELECT' && t.type !== 'checkbox' && t.type !== 'date') bind(t, false); });
  document.addEventListener('change', function (e) {
    var t = e.target, d = t.dataset;
    if (d.fi) { bindFiche(t); return; }
    if (d.upload) { UI.up = UI.up || {}; UI.up[d.upload] = t.files && t.files[0] ? t.files[0].name : ''; t.value = ''; render(); return; }
    if (d.b) { bind(t, !!d.re); return; }
    if (d.voie) { var ex = P.expos.filter(function (x) { return String(x.id) === d.voie; })[0]; if (!ex) return; ex.voies = ex.voies || []; var i = ex.voies.indexOf(t.value); if (t.checked && i === -1) ex.voies.push(t.value); if (!t.checked && i !== -1) ex.voies.splice(i, 1); persist(); drawSide(ctx()); return; }
    if (d.aChange === 'ver') { UI.ver = +t.value; render(); return; }
    if (t.hasAttribute('data-import')) {
      var f = t.files && t.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var j; try { j = C.unpackProject(JSON.parse(rd.result)); } catch (x) { j = null; }
        if (!j) { alert('Ce fichier n\'est ni un projet de dossier CMR ni une sauvegarde de l\'évaluation.'); return; }
        if (!confirm('Remplacer l\'évaluation' + (j.P ? ' et le dossier de preuve' : '') + ' de ce navigateur par « ' + f.name + ' » ?')) return;
        S = j.S; S.actions = S.actions || {}; S.seen = S.seen || {}; save();
        if (j.P) P = j.P; persist(); go('sommaire');
      };
      rd.readAsText(f);
    }
  });

  // Démarrage
  window.EV_ONREF = function () { render(); };
  loadRef();
  var h0 = (location.hash || '').slice(1);
  try { if (sessionStorage.getItem('vbs-ind-demo-start') === '1') { sessionStorage.removeItem('vbs-ind-demo-start'); h0 = 'demo'; } } catch (e) {}
  // #exemple ouvre l'exemple sur le sommaire ; #demo (après la page de connexion) l'ouvre sur l'accueil
  if (h0 === 'exemple' || h0 === 'demo') { setDemoMode(true); S = demo(); S.effectif = '11-49'; S.seen = {}; S.exported = 1; save(); P = demoP(); persist(); h0 = 'obligations'; try { history.replaceState(null, '', location.pathname); } catch (e) {} }
  UI.view = VIEWS[h0] ? h0 : 'obligations';
  render();
  window.addEventListener('hashchange', function () { var h = (location.hash || '').slice(1); if (h === 'exemple' || h === 'demo') { location.reload(); return; } if (VIEWS[h] && h !== UI.view) go(h); });
})();
