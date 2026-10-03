// VB Safety · Évaluation du risque chimique en ligne
// Méthode d'évaluation simplifiée inspirée de l'INRS (ND 2233) :
//  1. hiérarchisation des risques potentiels (danger × exposition potentielle)
//  2. estimation du risque par inhalation (danger × volatilité × procédé × protection collective)
// Toutes les données restent dans le navigateur (localStorage). Aucun envoi vers un serveur.
(function () {
  'use strict';
  var UI = { view: 'inv', sel: null, dtab: 'syn', q: '', niv: '', poste: '', statut: '', per: 50, page: 0, rq: '' };
  function frDate(iso) { try { return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR'); } catch (e) { return iso; } }
  function refStatus() {
    var el = $('#ev-ref'); if (!el || !REF) return;
    var v = (REF.meta.sources || {}).vlep || {};
    el.innerHTML = '<span>Référentiel : <b>Code du travail</b>' + (v.en_vigueur_depuis ? ' (v. ' + frDate(v.en_vigueur_depuis) + ')' : '') + '</span><span>Dernière mise à jour : ' + frDate(REF.meta.genere_le) + '</span>';
  }
  function checkRefChanges() {
    if (!REF) return;
    S.refSeen = S.refSeen || {};
    var changed = [];
    S.products.forEach(function (p) { subsOf(p).forEach(function (x) { var seen = S.refSeen[x.id]; if (seen && seen !== x.fp && changed.indexOf(x) === -1) changed.push(x); else if (!seen) S.refSeen[x.id] = x.fp; }); });
    var el = $('#ev-alert'); if (!el) return;
    if (!changed.length) { el.hidden = true; save(); return; }
    el.innerHTML = '<b>Évolution réglementaire</b><p>Le référentiel a changé pour ' + changed.length + ' substance' + (changed.length > 1 ? 's' : '') + ' de votre inventaire : ' + changed.map(function (x) { return esc(x.nom) + (hasVlep(x) ? ' (VLEP ' + vlepTxt(x, true) + ')' : ''); }).join(', ') + '. Vérifiez vos évaluations et votre plan d\'action.</p><button type="button" class="btn btn-secondary" data-act="ackref">J\'ai pris connaissance</button>';
    el.hidden = false;
  }


  // ---------- Rendu ----------
  var PRIO = ['', ['Forte', 'bad'], ['Moyenne', 'mid'], ['Faible', 'ok']];
  var INH = ['', ['Élevé', 'bad'], ['Modéré', 'mid'], ['Faible', 'ok']];
  var FREQ_S = ['Occasionnelle', 'Intermittente', 'Fréquente', 'Permanente'];
  var PROC_T = ['Clos', 'Clos, ouvert', 'Ouvert', 'Dispersif'];
  var PROT_T = ['Captage enveloppant', 'Captage localisé', 'Ventilation générale', 'Aucune'];
  var GROUPS = { substitution: 'Substitution', clos: 'Système clos', reduction: 'Réduction et protection collective', suivi: 'Traçabilité, contrôles et suivi médical', epi: 'Protection individuelle' };
  var GORDER = { substitution: 1, clos: 2, reduction: 3, suivi: 4, epi: 5 };
  var ROWS = [];
  function badge(t, c) { return '<span class="ev-badge ' + c + '">' + t + '</span>'; }
  function dangerBadge(c) { return '<span class="ev-dc dc' + c + '" title="Classe de danger ' + c + ' sur 5">' + c + '</span>'; }
  function cmrBadge(l) { return l === 'cmr' ? badge('CMR', 'cmr') : l === 'susp' ? badge('Suspecté', 'susp') : ''; }
  function lvl(r) { return '<span class="ev-lvl ' + INH[r.inh][1] + '">' + INH[r.inh][0] + '</span>'; }
  function plural(n, w) { return n + ' ' + w + (n > 1 ? 's' : ''); }
  function onboarding() {
    return '<div class="ev-start"><h3>Avant de commencer, rassemblez :</h3><ol><li><b>Les fiches de données de sécurité (FDS)</b> de chaque produit chimique utilisé, demandées au fournisseur si besoin.</li><li><b>Les quantités achetées sur un an</b>, d\'après les factures ou bons de commande.</li><li><b>La liste des postes de travail</b> et le nombre de salariés à chaque poste.</li></ol>' +
      '<p>Comptez environ 5 minutes par produit. L\'évaluation est enregistrée au fur et à mesure dans ce navigateur : vous pouvez la reprendre plus tard.</p><div class="ev-empty-cta"><button type="button" class="btn btn-primary" data-act="add">Ajouter le premier produit</button><button type="button" class="btn btn-secondary" data-act="demo">Voir un exemple rempli</button></div></div>';
  }
  var STEPS = [
    ['inv', 'Inventaire', 'Listez vos produits', 'Pour chaque produit chimique, cliquez sur « Ajouter un produit » et remplissez les 3 étapes à partir de sa FDS. Ajoutez aussi les procédés qui émettent des agents cancérogènes sans FDS : poussières de bois, silice, gaz d\'échappement diesel.'],
    ['hier', 'Priorités', 'Vérifiez les priorités', 'Rien à saisir : l\'outil classe les produits selon leur danger, la quantité et la fréquence d\'utilisation. Vérifiez que le classement vous paraît juste ; sinon, corrigez la quantité ou la fréquence dans l\'inventaire.'],
    ['inh', 'Inhalation', 'Contrôlez l\'exposition', 'Rien à saisir : l\'outil estime le risque par inhalation à chaque poste. Pour les risques élevés, les deux colonnes de droite indiquent le gain d\'un système clos ou d\'un captage à la source.'],
    ['plan', 'Plan d\'action', 'Planifiez les actions', 'Pour chaque mesure proposée, indiquez un responsable et une échéance, puis mettez le statut à jour au fil de l\'année. Ce plan se reporte dans votre programme annuel de prévention (PAPRIPACT) ou dans le DUERP.'],
    ['sal', 'Salariés CMR', 'Vérifiez les salariés exposés', 'Contrôlez les postes et le nombre de salariés exposés aux agents CMR. Ces salariés doivent figurer sur la liste des travailleurs exposés, transmise au service de santé au travail (SPST) et conservée 40 ans.'],
    ['export', 'Dossier DUERP', 'Téléchargez votre dossier DUERP', 'Téléchargez le dossier complet en PDF : rapport d\'évaluation, liste des travailleurs exposés aux CMR et plan d\'action. Joignez-le à votre document unique, et mettez-le à jour au moins une fois par an et à chaque nouveau produit ou procédé.']
  ];
  function stepDone(id) {
    var seen = S.seen || {};
    if (id === 'inv') return S.products.length > 0;
    if (!S.products.length) return false;
    if (id === 'plan') { var it = planItems(ROWS); return it.length > 0 && it.every(function (x) { var st = S.actions[x.k] || {}; return st.statut === 'fait' || (st.resp && st.date); }); }
    if (id === 'sal') return !!seen.sal || !ROWS.some(function (r) { return r.cmr === 'cmr'; });
    if (id === 'export') return !!S.exported;
    return !!seen[id];
  }
  function renderSteps() {
    var ol = $('#ev-steps'), g = $('#ev-guide'), idx = -1;
    STEPS.forEach(function (st, i) { if (st[0] === UI.view) idx = i; });
    ol.innerHTML = STEPS.map(function (st, i) {
      var d = stepDone(st[0]), cls = (i === idx ? 'on' : '') + (d ? ' done' : '');
      return '<li class="' + cls.trim() + '"><button type="button" data-go="' + st[0] + '"' + (i === idx ? ' aria-current="step"' : '') + '><i>' + (d ? '<svg class="icon" aria-hidden="true"><use href="#i-check"/></svg><span class="sr-only">Terminé : </span>' : i + 1) + '</i><span>' + st[1] + '</span></button></li>';
    }).join('');
    if (S.hideGuide || idx < 0) {
      g.innerHTML = idx < 0 ? '' : '<button type="button" class="ev-link ev-guide-show" data-act="guide">Afficher l\'aide de l\'étape</button>';
      return;
    }
    var st = STEPS[idx], next = STEPS[idx + 1], extra = '';
    if (st[0] === 'plan') { var it = planItems(ROWS), ok = it.filter(function (x) { var a = S.actions[x.k] || {}; return a.statut === 'fait' || (a.resp && a.date); }).length; extra = it.length ? '<span class="ev-guide-prog">' + ok + ' mesure' + (ok > 1 ? 's' : '') + ' planifiée' + (ok > 1 ? 's' : '') + ' sur ' + it.length + '</span>' : ''; }
    if (st[0] === 'inv' && S.products.length) extra = '<span class="ev-guide-prog">' + S.products.length + ' produit' + (S.products.length > 1 ? 's' : '') + ' ou procédé' + (S.products.length > 1 ? 's' : '') + ' saisi' + (S.products.length > 1 ? 's' : '') + '</span>';
    g.innerHTML = '<div class="ev-guide-txt"><b>Étape ' + (idx + 1) + ' sur 6 · ' + st[2] + '</b><p>' + st[3] + '</p>' + extra + '</div><div class="ev-guide-act">' +
      (next ? '<button type="button" class="btn btn-primary" data-go="' + next[0] + '"' + (st[0] === 'inv' && !S.products.length ? ' disabled' : '') + '>Étape suivante : ' + next[1].toLowerCase() + '<svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></button>' : '<button type="button" class="btn btn-primary" data-act="print" data-mode="all"' + (S.products.length ? '' : ' disabled') + '>Télécharger le dossier DUERP (PDF)</button>') +
      '<button type="button" class="ev-link" data-act="guide">Masquer l\'aide</button></div>';
  }
  function empty(msg) { return '<div class="ev-empty"><p>' + msg + '</p><div class="ev-empty-cta"><button type="button" class="btn btn-primary" data-act="add">Ajouter un produit</button><button type="button" class="btn btn-secondary" data-act="demo">Charger un exemple</button></div></div>'; }
  function volTxt(p) {
    if (p.etat === 'gaz') return 'Gaz, fumée';
    var v = volScore(p), t = v === 100 ? 'Forte' : v === 10 ? 'Moyenne' : 'Faible';
    return p.etat === 'solide' ? 'Pulv. ' + t.toLowerCase() : t;
  }
  function subline(r) {
    if (r.p.type === 'procede') return 'Procédé émissif';
    if (r.subs.length) return r.subs.map(function (x) { return esc(x.nom) + (x.cas && x.cas[0] ? ' · CAS ' + x.cas[0] : ''); }).join(', ');
    return (r.p.h || []).length ? r.p.h.slice(0, 4).join(', ') + (r.p.h.length > 4 ? '…' : '') : 'Aucune mention santé';
  }
  function nameCell(r) {
    return '<td class="c-name" data-l="Agent / procédé"><button type="button" class="ev-open" data-open="' + r.p.id + '">' + esc(r.p.name) + '</button><small>' + subline(r) + '</small>' + (r.warn.length ? '<small class="ev-warnline">Classification CMR européenne à vérifier</small>' : '') + '</td>';
  }
  function body(id) { return $('#v-' + id + ' .ev-body'); }
  function planState() { var items = planItems(ROWS), done = items.filter(function (it) { var st = S.actions[it.k]; return st && st.statut === 'fait'; }).length; return { items: items, done: done }; }
  function postesCmr() {
    var postes = {};
    ROWS.filter(function (r) { return r.cmr === 'cmr'; }).forEach(function (r) { var k = r.p.poste || 'Poste non renseigné'; postes[k] = postes[k] || { agents: [], nb: 0, rows: [] }; postes[k].agents.push(r.p.name); postes[k].rows.push(r); postes[k].nb = Math.max(postes[k].nb, +r.p.nb || 0); });
    return postes;
  }

  function render() {
    ROWS = compute();
    if ($('#ev-site').value !== (S.site || '')) $('#ev-site').value = S.site || '';
    if (S.products.length && ['hier', 'inh', 'sal'].indexOf(UI.view) >= 0) { S.seen = S.seen || {}; S.seen[UI.view] = 1; }
    renderKpis();
    renderSteps();
    ({ dash: renderDash, inv: renderInv, hier: renderHier, inh: renderInh, plan: renderPlan, cmr: renderCmr, sal: renderSal, export: renderExport, set: renderSet, ref: renderRef })[UI.view]();
    renderDrawer();
    save();
  }
  function renderKpis() {
    var n = ROWS.length, cmr = ROWS.filter(function (r) { return r.cmr === 'cmr'; }), sal = 0, ps = postesCmr();
    Object.keys(ps).forEach(function (k) { sal += ps[k].nb; });
    var inh = ROWS.filter(function (r) { return r.inh === 1; }).length, pl = planState(), acts = pl.items.length;
    var k = function (v, l, c) { return '<div class="kpi' + (c ? ' ' + c : '') + '"><span>' + l + '</span><b>' + v + '</b></div>'; };
    $('#ev-kpis').innerHTML = k(n, 'Produits et procédés') + k(cmr.length, 'Agents CMR', cmr.length ? 'k-red' : '') + k(sal, 'Salariés exposés CMR') + k(inh, 'Risques inhalation élevés', inh ? 'k-red' : '') + k((acts ? Math.round(pl.done / acts * 100) : 0) + ' %', 'Plan d\'action réalisé');
    $$('.app-nav-i em').forEach(function (el) { var t = el.getAttribute('data-n'), v = t === 'inv' ? n : t === 'cmr' ? cmr.length : t === 'plan' ? acts : t === 'sal' ? Object.keys(ps).length : 0; el.textContent = v || ''; });
  }

  function renderDash() {
    var el = body('dash');
    if (!ROWS.length) { el.innerHTML = onboarding(); return; }
    var top = ROWS.slice(0, 5), pl = planState(), byG = {};
    pl.items.forEach(function (it) { byG[it.group] = byG[it.group] || [0, 0]; byG[it.group][1]++; if ((S.actions[it.k] || {}).statut === 'fait') byG[it.group][0]++; });
    var dated = pl.items.filter(function (it) { var st = S.actions[it.k] || {}; return st.date && st.statut !== 'fait'; }).sort(function (a, b) { return S.actions[a.k].date < S.actions[b.k].date ? -1 : 1; }).slice(0, 5);
    var c = [0, 0, 0, 0]; ROWS.forEach(function (r) { c[r.prio]++; });
    el.innerHTML = '<div class="ev-dash">' +
      '<div class="ev-box ev-dash-main"><h3>Priorités à traiter</h3><table class="ev-tbl"><thead><tr><th>Agent / procédé</th><th>Poste</th><th>CMR</th><th class="num">Score potentiel</th><th>Priorité</th></tr></thead><tbody>' +
      top.map(function (r) { return '<tr class="is-row l-' + PRIO[r.prio][1] + '" data-open="' + r.p.id + '">' + nameCell(r) + '<td data-l="Poste">' + esc(r.p.poste || '—') + '</td><td data-l="CMR">' + (cmrBadge(r.cmr) || '<span class="ev-mute">—</span>') + '</td><td class="num" data-l="Score">' + fmt(r.pot) + '</td><td data-l="Priorité"><span class="ev-lvl ' + PRIO[r.prio][1] + '">' + PRIO[r.prio][0] + '</span></td></tr>'; }).join('') +
      '</tbody></table><p class="ev-tfoot"><span>' + c[1] + ' forte · ' + c[2] + ' moyenne · ' + c[3] + ' faible</span><button type="button" class="ev-link" data-go="hier">Voir la hiérarchisation</button></p></div>' +
      '<div class="ev-dash-side"><div class="ev-box"><h3>Avancement du plan d\'action</h3><ul class="ev-prog">' +
      Object.keys(GROUPS).filter(function (g) { return byG[g]; }).map(function (g) { var d = byG[g]; return '<li><span>' + GROUPS[g] + '</span><em>' + d[0] + ' / ' + d[1] + '</em><div class="ev-bar"><i class="ok" data-w="' + (d[0] / d[1] * 100).toFixed(0) + '"></i></div></li>'; }).join('') +
      '</ul><button type="button" class="ev-link" data-go="plan">Ouvrir le plan d\'action</button></div>' +
      '<div class="ev-box"><h3>Prochaines échéances</h3>' + (dated.length ? '<ul class="ev-due">' + dated.map(function (it) { var st = S.actions[it.k]; return '<li><time>' + frDate(st.date) + '</time><span>' + esc(it.text) + '</span>' + (st.resp ? '<em>' + esc(st.resp) + '</em>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="ev-mute">Aucune échéance. Attribuez un responsable et une date dans le plan d\'action.</p>') + '</div></div></div>';
    bars(el);
  }
  function bars(el) { $$('.ev-bar i[data-w]', el).forEach(function (i) { i.style.width = i.getAttribute('data-w') + '%'; }); }

  function filtered() {
    var q = nrm(UI.q);
    return ROWS.filter(function (r) {
      if (UI.niv && String(r.inh) !== UI.niv) return false;
      if (UI.poste && (r.p.poste || '') !== UI.poste) return false;
      if (UI.statut && (UI.statut === 'non' ? r.cmr !== '' : r.cmr !== UI.statut)) return false;
      if (q && nrm([r.p.name, r.p.poste].concat(r.p.h || [], r.subs.map(function (x) { return x.nom + ' ' + (x.cas || []).join(' '); })).join(' ')).indexOf(q) === -1) return false;
      return true;
    });
  }
  function renderInv() {
    var el = body('inv');
    if (!ROWS.length) { el.innerHTML = onboarding(); return; }
    var postes = []; ROWS.forEach(function (r) { if (r.p.poste && postes.indexOf(r.p.poste) === -1) postes.push(r.p.poste); }); postes.sort();
    if (UI.poste && postes.indexOf(UI.poste) === -1) UI.poste = '';
    var opt = function (v, t, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(t) + '</option>'; };
    var list = filtered().sort(function (a, b) { return b.sinh - a.sinh; }), pages = Math.max(1, Math.ceil(list.length / UI.per));
    if (UI.page >= pages) UI.page = pages - 1;
    var slice = list.slice(UI.page * UI.per, (UI.page + 1) * UI.per);
    el.innerHTML = '<div class="ev-filters"><label class="ev-search"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="sr-only">Rechercher</span><input class="input" data-ui="q" value="' + esc(UI.q) + '" placeholder="Rechercher un produit, une substance, un n° CAS…"></label>' +
      '<label><span class="sr-only">Niveau</span><select class="input" data-ui="niv">' + opt('', 'Tous les niveaux', UI.niv) + opt('1', 'Élevé', UI.niv) + opt('2', 'Modéré', UI.niv) + opt('3', 'Faible', UI.niv) + '</select></label>' +
      '<label><span class="sr-only">Poste</span><select class="input" data-ui="poste">' + opt('', 'Tous les postes', UI.poste) + postes.map(function (p) { return opt(p, p, UI.poste); }).join('') + '</select></label>' +
      '<label><span class="sr-only">Statut CMR</span><select class="input" data-ui="statut">' + opt('', 'Tous les statuts', UI.statut) + opt('cmr', 'CMR', UI.statut) + opt('susp', 'CMR suspecté', UI.statut) + opt('non', 'Non CMR', UI.statut) + '</select></label></div>' +
      '<div class="ev-tblwrap"><table class="ev-tbl ev-inv"><thead><tr><th>Agent / procédé</th><th>Poste</th><th>CMR</th><th>Danger</th><th>Volatilité</th><th>Procédé</th><th>Protection</th><th class="num">Score</th><th>Niveau</th><th><span class="sr-only">Détail</span></th></tr></thead><tbody>' +
      (slice.length ? slice.map(function (r) {
        var p = r.p;
        return '<tr class="is-row l-' + INH[r.inh][1] + (UI.sel === p.id ? ' is-sel' : '') + '" data-open="' + p.id + '">' + nameCell(r) +
          '<td data-l="Poste">' + esc(p.poste || '—') + (p.nb ? '<small>' + plural(+p.nb, 'salarié') + '</small>' : '') + '</td>' +
          '<td data-l="CMR">' + (cmrBadge(r.cmr) || '<span class="ev-mute">—</span>') + '</td>' +
          '<td data-l="Danger">' + dangerBadge(r.dc) + '</td>' +
          '<td data-l="Volatilité">' + volTxt(p) + '</td>' +
          '<td data-l="Procédé">' + PROC_T[(+p.proc || 3) - 1] + '</td>' +
          '<td data-l="Protection">' + PROT_T[(+p.prot || 4) - 1] + '</td>' +
          '<td class="num" data-l="Score">' + fmt(r.sinh) + '</td>' +
          '<td data-l="Niveau">' + lvl(r) + '</td>' +
          '<td class="c-chev"><svg class="icon" aria-hidden="true"><use href="#i-chev"/></svg></td></tr>';
      }).join('') : '<tr><td colspan="10" class="ev-none">Aucun résultat pour ces filtres.</td></tr>') +
      '</tbody></table></div>' +
      '<div class="ev-pager"><span>' + plural(list.length, 'résultat') + '</span><div>' +
      (pages > 1 ? '<button type="button" class="ev-link" data-page="-1"' + (UI.page ? '' : ' disabled') + '>Précédent</button><span>Page ' + (UI.page + 1) + ' / ' + pages + '</span><button type="button" class="ev-link" data-page="1"' + (UI.page < pages - 1 ? '' : ' disabled') + '>Suivant</button>' : '') +
      '<label><span class="sr-only">Lignes par page</span><select class="input" data-ui="per">' + [25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (UI.per === n ? ' selected' : '') + '>' + n + ' / page</option>'; }).join('') + '</select></label></div></div>';
  }

  function renderHier() {
    var el = body('hier');
    if (!ROWS.length) { el.innerHTML = empty('La hiérarchisation se calcule dès que l\'inventaire contient des produits.'); return; }
    var max = ROWS[0].pot || 1;
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-hier"><thead><tr><th class="num">#</th><th>Agent / procédé</th><th>CMR</th><th class="num">Danger</th><th class="num">Quantité</th><th class="num">Fréquence</th><th class="num">Exposition</th><th>Score potentiel</th><th class="num">Cumul</th><th>Priorité</th></tr></thead><tbody>' +
      ROWS.map(function (r, i) {
        var w = Math.max(3, Math.log10(r.pot) / Math.log10(Math.max(max, 10)) * 100);
        return '<tr class="is-row l-' + PRIO[r.prio][1] + '" data-open="' + r.p.id + '"><td class="num ev-mute">' + (i + 1) + '</td>' + nameCell(r) +
          '<td data-l="CMR">' + (cmrBadge(r.cmr) || '<span class="ev-mute">—</span>') + '</td><td class="num" data-l="Danger">' + r.dc + '/5</td><td class="num" data-l="Quantité">' + r.qc + '/5</td><td class="num" data-l="Fréquence">' + r.fc + '/4</td><td class="num" data-l="Exposition">' + r.ec + '/5</td>' +
          '<td data-l="Score potentiel"><div class="ev-score"><b>' + fmt(r.pot) + '</b><div class="ev-bar"><i class="' + PRIO[r.prio][1] + '" data-w="' + w.toFixed(1) + '"></i></div></div></td><td class="num" data-l="Cumul">' + Math.round(r.cum) + ' %</td>' +
          '<td data-l="Priorité"><span class="ev-lvl ' + PRIO[r.prio][1] + '">' + PRIO[r.prio][0] + '</span></td></tr>';
      }).join('') + '</tbody></table></div>';
    bars(el);
  }

  function gains(r) {
    var p = r.p, pc = PROC_S[(+p.proc || 3) - 1], pr = PROT_S[(+p.prot || 4) - 1];
    return { clos: (+p.proc || 3) > 1 ? r.sinh * 0.001 / pc : null, capt: (+p.prot || 4) > 1 ? r.sinh * 0.001 / pr : null };
  }
  function renderInh() {
    var el = body('inh');
    if (!ROWS.length) { el.innerHTML = empty('Ajoutez des produits pour estimer le risque par inhalation à chaque poste.'); return; }
    var list = ROWS.slice().sort(function (a, b) { return b.sinh - a.sinh; });
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-inh"><thead><tr><th>Agent / procédé</th><th>Poste</th><th class="num">Danger</th><th class="num">Volatilité</th><th class="num">Procédé</th><th class="num">Protection</th><th class="num">Score</th><th>Niveau</th><th class="num">En système clos</th><th class="num">Avec captage enveloppant</th></tr></thead><tbody>' +
      list.map(function (r) {
        var p = r.p, g = gains(r);
        return '<tr class="is-row l-' + INH[r.inh][1] + '" data-open="' + p.id + '">' + nameCell(r) + '<td data-l="Poste">' + esc(p.poste || '—') + '</td>' +
          '<td class="num" data-l="Danger">' + fmt(Math.pow(10, r.dc - 1)) + '</td><td class="num" data-l="Volatilité">' + fmt(volScore(p)) + '</td><td class="num" data-l="Procédé">' + fmt(PROC_S[(+p.proc || 3) - 1]) + '</td><td class="num" data-l="Protection">' + fmt(PROT_S[(+p.prot || 4) - 1]) + '</td>' +
          '<td class="num" data-l="Score"><b>' + fmt(r.sinh) + '</b></td><td data-l="Niveau">' + lvl(r) + '</td>' +
          '<td class="num" data-l="En système clos">' + (g.clos === null ? '<span class="ev-mute">déjà clos</span>' : fmt(g.clos)) + '</td><td class="num" data-l="Avec captage enveloppant">' + (g.capt === null ? '<span class="ev-mute">déjà en place</span>' : fmt(g.capt)) + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ev-small">Facteurs de la méthode : volatilité 1, 10 ou 100 ; procédé de 0,001 (clos) à 1 (dispersif) ; protection de 0,001 (captage enveloppant) à 1 (aucune). Élevé au-delà de 1 000, modéré de 100 à 1 000.</p>';
  }

  function renderPlan() {
    var el = body('plan');
    if (!ROWS.length) { el.innerHTML = empty('Le plan d\'action se construit à partir de l\'inventaire.'); return; }
    var items = planItems(ROWS);
    items.sort(function (x, y) { return GORDER[x.group] - GORDER[y.group] || x.prio - y.prio; });
    var html = '<div class="ev-tblwrap"><table class="ev-tbl ev-plan"><thead><tr><th>Mesure</th><th>Référence</th><th>Responsable</th><th>Échéance</th><th>Statut</th></tr></thead>', cur = '';
    items.forEach(function (it) {
      if (it.group !== cur) { if (cur) html += '</tbody>'; cur = it.group; html += '<tbody><tr class="ev-grp"><th colspan="5"><span>' + GORDER[cur] + '</span>' + GROUPS[cur] + '</th></tr>'; }
      var st = S.actions[it.k] || {};
      html += '<tr class="ev-action' + (st.statut === 'fait' ? ' done' : '') + '"><td class="c-name" data-l="Mesure"><b>' + esc(it.text) + '</b><small>' + (it.sub ? 'Postes : ' + esc(it.sub) : it.prods.map(esc).join(' · ')) + '</small></td>' +
        '<td class="ev-law" data-l="Référence">' + esc(it.law) + '</td>' +
        '<td data-l="Responsable"><input class="input" data-k="' + it.k + '" data-f="resp" placeholder="Nom" aria-label="Responsable" value="' + esc(st.resp || '') + '"></td>' +
        '<td data-l="Échéance"><input class="input" type="date" data-k="' + it.k + '" data-f="date" aria-label="Échéance" value="' + esc(st.date || '') + '"></td>' +
        '<td data-l="Statut"><select class="input" data-k="' + it.k + '" data-f="statut" aria-label="Statut"><option value="">À faire</option><option value="cours"' + (st.statut === 'cours' ? ' selected' : '') + '>En cours</option><option value="fait"' + (st.statut === 'fait' ? ' selected' : '') + '>Fait</option></select></td></tr>';
    });
    el.innerHTML = html + '</tbody></table></div>';
  }

  function renderCmr() {
    var el = body('cmr'), cmr = ROWS.filter(function (r) { return r.cmr; });
    if (!cmr.length) { el.innerHTML = ROWS.length ? '<div class="ev-empty"><p>Aucun agent CMR détecté. Vérifiez les mentions H de chaque fiche de données de sécurité (section 2) et les procédés émissifs.</p></div>' : empty('Les agents CMR sont repérés à partir des mentions H340, H350 et H360 et des procédés cancérogènes.'); return; }
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-cmr"><thead><tr><th>Agent / procédé</th><th>Statut</th><th>Mentions ou fondement</th><th>VLEP contraignante</th><th>Maladies professionnelles</th><th>Poste</th><th class="num">Salariés</th></tr></thead><tbody>' +
      cmr.map(function (r) {
        var base = r.p.type === 'procede' ? 'Procédé cancérogène (arrêté du 26/10/2020)' : (r.p.h || []).filter(function (h) { return CMR[h] || CMR_SUSP[h]; }).map(function (h) { return '<abbr title="' + esc(H_LABEL[h]) + '">' + h + '</abbr>'; }).join(', ');
        return '<tr class="is-row l-' + (r.cmr === 'cmr' ? 'bad' : 'mid') + '" data-open="' + r.p.id + '">' + nameCell(r) + '<td data-l="Statut">' + cmrBadge(r.cmr) + '</td><td data-l="Fondement">' + base + '</td>' +
          '<td data-l="VLEP">' + (r.vleps.length ? r.vleps.map(function (x) { return (r.vleps.length > 1 ? esc(x.nom) + ' : ' : '') + vlepTxt(x, true); }).join('<br>') : '<span class="ev-mute">—</span>') + '</td>' +
          '<td data-l="Maladies prof.">' + (r.mp.length ? r.mp.map(function (n) { return '<abbr title="' + esc(RMP[n] || '') + '">n° ' + esc(n) + '</abbr>'; }).join(', ') : '<span class="ev-mute">—</span>') + '</td>' +
          '<td data-l="Poste">' + esc(r.p.poste || '—') + '</td><td class="num" data-l="Salariés">' + (r.p.nb || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderSal() {
    var el = body('sal'), ps = postesCmr(), keys = Object.keys(ps);
    if (!keys.length) { el.innerHTML = ROWS.length ? '<div class="ev-empty"><p>Aucun poste exposé à un agent CMR avéré ou présumé : pas de liste des travailleurs exposés à établir pour l\'instant.</p></div>' : empty('Les postes exposés apparaissent ici dès qu\'un agent CMR est inventorié.'); return; }
    el.innerHTML = '<div class="ev-tblwrap"><table class="ev-tbl ev-sal"><thead><tr><th>Poste ou atelier</th><th>Agents CMR</th><th class="num">Salariés</th><th>Durée d\'utilisation</th><th>Obligations</th></tr></thead><tbody>' +
      keys.map(function (k) {
        var f = Math.max.apply(null, ps[k].rows.map(function (r) { return r.fc; }));
        return '<tr><td class="c-name" data-l="Poste"><b>' + esc(k) + '</b></td><td data-l="Agents CMR">' + ps[k].rows.map(function (r) { return '<button type="button" class="ev-open" data-open="' + r.p.id + '">' + esc(r.p.name) + '</button>'; }).join('<br>') + '</td>' +
          '<td class="num" data-l="Salariés">' + (ps[k].nb || '<span class="ev-mute">à préciser</span>') + '</td><td data-l="Durée">' + FREQ_S[f - 1] + '</td>' +
          '<td data-l="Obligations"><ul class="ev-obl"><li>Liste des travailleurs exposés <em>R. 4412-93-1</em></li><li>Suivi individuel renforcé <em>R. 4624-23</em></li><li>Restrictions d\'affectation <em>D. 4153-17, D. 4152-10</em></li></ul></td></tr>';
      }).join('') + '</tbody></table></div>' +
      '<div class="ev-note-box"><b>Contenu de la liste nominative</b><p>Pour chaque salarié : nature, durée et degré de l\'exposition, résultats des contrôles. Transmission au service de prévention et de santé au travail, conservation 40 ans. VB Safety Industrie &amp; BTP tiendra cette liste pour vous.</p><a class="btn btn-secondary" href="#demande" data-demande="version">Demander un accès anticipé</a></div>';
  }

  function renderExport() {
    var none = !S.products.length ? ' disabled' : '';
    body('export').innerHTML = '<div class="ev-dossier"><div><b>Dossier DUERP complet</b><span>Les 3 documents ci-dessous réunis en un seul PDF, avec une page de garde. À joindre à votre document unique d\'évaluation des risques professionnels.</span></div><button type="button" class="btn btn-primary" data-act="print" data-mode="all"' + none + '>Télécharger le dossier (PDF)</button></div>' +
      '<h3 class="ev-h3">Ou document par document</h3><ul class="ev-exp">' +
      '<li><div><b>Rapport d\'évaluation du risque chimique</b><span>À annexer au document unique (DUERP, art. R. 4121-1). Contient l\'inventaire, les priorités, le risque par inhalation, les agents CMR, les salariés exposés et le plan d\'action.</span></div><button type="button" class="btn btn-secondary" data-act="print" data-mode="report"' + none + '>Télécharger (PDF)</button></li>' +
      '<li><div><b>Liste des travailleurs exposés aux agents CMR</b><span>Art. R. 4412-93-1. Trame par poste, pré-remplie avec les agents et la durée d\'exposition, à compléter avec le nom des salariés. À transmettre au SPST et à conserver 40 ans.</span></div><button type="button" class="btn btn-secondary" data-act="print" data-mode="liste"' + none + '>Télécharger (PDF)</button></li>' +
      '<li><div><b>Plan d\'action de prévention</b><span>Mesures, références, responsables et échéances. À reporter dans le PAPRIPACT (50 salariés et plus, art. L. 4121-3-1) ou dans le DUERP.</span></div><button type="button" class="btn btn-secondary" data-act="print" data-mode="plan"' + none + '>Télécharger (PDF)</button></li></ul>' +
      '<p class="ev-small">Dans la fenêtre qui s\'ouvre, choisissez « Enregistrer au format PDF » comme imprimante.</p>' +
      '<h3 class="ev-h3">Données</h3><ul class="ev-exp">' +
      '<li><div><b>Inventaire des produits chimiques (tableur)</b><span>Fichier CSV, une ligne par produit : substances, VLEP, mentions H, scores et actions. S\'ouvre dans Excel ou LibreOffice.</span></div><button type="button" class="btn btn-secondary" data-act="csv"' + none + '>Télécharger</button></li>' +
      '<li><div><b>Sauvegarde de l\'évaluation</b><span>Fichier JSON avec toute l\'évaluation, pour la reprendre sur un autre ordinateur ou l\'an prochain.</span></div><button type="button" class="btn btn-secondary" data-act="json"' + none + '>Télécharger</button></li>' +
      '<li><div><b>Restaurer une sauvegarde</b><span>Remplace l\'évaluation en cours par un fichier JSON exporté depuis cet outil.</span></div><label class="btn btn-secondary ev-file">Choisir un fichier<input type="file" accept="application/json,.json" data-act-file="import"></label></li></ul>';
  }
  function renderSet() {
    body('set').innerHTML = '<div class="ev-box ev-form-lite"><label class="field"><span class="label">Site ou unité de travail</span><input class="input" data-ui="site" value="' + esc(S.site || '') + '" maxlength="80" placeholder="Ex. Atelier mécanique, site de Meaux"></label>' +
      '<p class="ev-mute">Les données sont enregistrées dans ce navigateur uniquement. Rien n\'est envoyé à nos serveurs.</p></div>' +
      '<ul class="ev-exp"><li><div><b>Charger l\'exemple</b><span>Un atelier fictif avec six produits et procédés, pour découvrir l\'outil.</span></div><button type="button" class="btn btn-secondary" data-act="demo">Charger</button></li>' +
      '<li><div><b>Effacer l\'évaluation</b><span>Supprime définitivement l\'inventaire et le plan d\'action de ce navigateur.</span></div><button type="button" class="btn btn-secondary ev-danger" data-act="clear">Effacer</button></li></ul>';
  }
  function renderRef() {
    var el = body('ref');
    if (!REF) { el.innerHTML = '<p class="ev-mute">Chargement du référentiel…</p>'; return; }
    var src = REF.meta.sources || {}, v = src.vlep || {}, clp = src.clp, q = nrm(UI.rq);
    var list = REF.substances.filter(function (x) { return !q || RIDX.some(function (e) { return e.s === x && e.k.indexOf(q) !== -1; }); });
    el.innerHTML = '<dl class="ev-kv ev-refmeta"><div><dt>Valeurs limites contraignantes</dt><dd>' + REF.substances.filter(hasVlep).length + ' entrées · art. R. 4412-149' + (v.en_vigueur_depuis ? ', version du ' + frDate(v.en_vigueur_depuis) : '') + '</dd></div>' +
      '<div><dt>Maladies professionnelles</dt><dd>' + (REF.tableaux_mp || []).length + ' tableaux du régime général</dd></div>' +
      '<div><dt>Classification européenne</dt><dd>' + (clp ? 'Annexe VI du règlement CLP (' + esc(clp.celex || '') + ')' : 'Intégration en cours') + '</dd></div>' +
      '<div><dt>Dernière mise à jour</dt><dd>' + frDate(REF.meta.genere_le) + ' · <a href="#sources">sources et licences</a></dd></div></dl>' +
      '<div class="ev-filters"><label class="ev-search"><svg class="icon" aria-hidden="true"><use href="#i-search"/></svg><span class="sr-only">Rechercher une substance</span><input class="input" data-ui="rq" value="' + esc(UI.rq) + '" placeholder="Rechercher une substance ou un n° CAS"></label></div>' +
      '<div class="ev-tblwrap"><table class="ev-tbl ev-ref-t"><thead><tr><th>Substance</th><th>N° CAS</th><th>VLEP 8 h</th><th>VLEP 15 min</th><th>Mentions</th><th>Maladies prof.</th></tr></thead><tbody>' +
      list.slice(0, 60).map(function (x) {
        var vv = x.vlep || {}, m = [];
        if (x.peau) m.push('Peau'); if ((x.sens || []).length) m.push('Sensibilisant'); if (officialCmr(x).length) m.push(officialCmr(x).join(', '));
        return '<tr><td class="c-name" data-l="Substance"><b>' + esc(x.nom) + '</b>' + (transitoire(x) ? '<small class="ev-warnline">' + esc(transitoire(x)) + '</small>' : '') + '</td><td data-l="CAS">' + esc((x.cas || []).join(', ') || '—') + '</td>' +
          '<td data-l="VLEP 8 h">' + (vv.v8_mg != null ? num2(vv.v8_mg) + ' mg/m³' : vv.v8_f != null ? num2(vv.v8_f) + ' f/cm³' : vv.v8_ppm != null ? num2(vv.v8_ppm) + ' ppm' : '—') + '</td>' +
          '<td data-l="VLEP 15 min">' + (vv.ct_mg != null ? num2(vv.ct_mg) + ' mg/m³' : vv.ct_ppm != null ? num2(vv.ct_ppm) + ' ppm' : '—') + '</td>' +
          '<td data-l="Mentions">' + (m.join(' · ') || '—') + '</td><td data-l="Maladies prof.">' + ((x.mp || []).map(function (n) { return '<abbr title="' + esc(RMP[n] || '') + '">n° ' + esc(n) + '</abbr>'; }).join(', ') || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div><p class="ev-small">' + (list.length > 60 ? '60 premières entrées sur ' + list.length + ' : affinez la recherche.' : plural(list.length, 'entrée')) + '</p>';
  }

  // ---------- Panneau de détail ----------
  function renderDrawer() {
    var dr = $('#ev-drawer'), app = $('#ev-app'), r = UI.sel != null ? ROWS.filter(function (x) { return x.p.id === UI.sel; })[0] : null;
    if (!r) { UI.sel = null; dr.hidden = true; app.classList.remove('has-drawer'); document.body.classList.remove('ev-lock'); return; }
    var p = r.p, tabs = [['syn', 'Synthèse'], ['don', 'Données'], ['sal', 'Salariés'], ['act', 'Actions']];
    var html = '<div class="dr-head"><div><h3 id="dr-title">' + esc(p.name) + '</h3><p>' + (p.type === 'procede' ? 'Procédé émissif' : 'Produit chimique') + (p.poste ? ' · ' + esc(p.poste) : '') + '</p></div><button type="button" class="dr-close" data-act="close" aria-label="Fermer le détail"><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button></div>' +
      '<div class="dr-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-dtab="' + t[0] + '" aria-selected="' + (UI.dtab === t[0]) + '">' + t[1] + '</button>'; }).join('') + '</div><div class="dr-body">';
    if (UI.dtab === 'syn') {
      html += '<div class="dr-scores"><div><span>Score d\'exposition (inhalation)</span><b>' + fmt(r.sinh) + '</b>' + lvl(r) + '</div><div><span>Risque potentiel</span><b>' + fmt(r.pot) + '</b><span class="ev-lvl ' + PRIO[r.prio][1] + '">Priorité ' + PRIO[r.prio][0].toLowerCase() + '</span></div></div>';
      if (r.cmr === 'cmr') html += '<div class="dr-alert bad"><b>' + (p.type === 'procede' ? 'Procédé cancérogène' : 'Agent CMR') + '</b><p>Substitution à étudier en priorité, à défaut système clos (art. R. 4412-66 et R. 4412-68). Inscription des salariés sur la liste des travailleurs exposés.</p></div>';
      else if (r.cmr === 'susp') html += '<div class="dr-alert mid"><b>CMR suspecté</b><p>Étudier la substitution. Pas d\'inscription obligatoire sur la liste des travailleurs exposés.</p></div>';
      if (r.warn.length) html += '<div class="dr-alert mid"><b>FDS à vérifier</b><p>' + r.warn.map(function (x) { return esc(x.nom) + ' (' + officialCmr(x).join(', ') + ')'; }).join(', ') + ' : classé CMR au niveau européen, mais le produit ne porte aucune mention CMR.</p></div>';
      if ((p.h || []).length) html += '<h4>Mentions de danger</h4><table class="dr-tbl"><thead><tr><th>Code</th><th>Libellé</th><th class="num">Classe</th></tr></thead><tbody>' + p.h.map(function (h) { return '<tr><td><b class="' + (CMR[h] ? 'hc' : CMR_SUSP[h] ? 'hs' : '') + '">' + h + '</b></td><td>' + esc(H_LABEL[h] || 'Mention hors santé ou non répertoriée') + '</td><td class="num">' + (H_CLASS[h] || '—') + '</td></tr>'; }).join('') + '</tbody></table>';
      if (r.vleps.length) html += '<div class="dr-vlep"><b>Valeur limite contraignante</b>' + r.vleps.map(function (x) { var tr = transitoire(x); return '<p><span>' + esc(x.nom) + '</span>' + vlepTxt(x) + (x.peau ? ' · peau' : '') + (tr ? '<em>' + esc(tr) + '</em>' : '') + '</p>'; }).join('') + '</div>';
      html += '<h4>Utilisation sur le site</h4><dl class="ev-kv">' +
        kv('Poste', esc(p.poste || '—')) + kv('Salariés exposés', p.nb || '—') +
        kv(p.type === 'procede' ? 'Intensité' : 'Quantité par an', p.type === 'procede' ? ['', '', 'Faible', 'Moyenne', '', 'Forte'][+p.intensite || 3] : (p.qte ? fmt(+p.qte) + ' ' + esc(p.unite || 'kg') : '—')) +
        kv('Durée d\'utilisation', FREQ_S[(+p.freq || 1) - 1]) + kv('Volatilité', volTxt(p) + (p.teb ? ' (ébullition ' + esc(p.teb) + ' °C)' : '')) +
        kv('Procédé', PROC[(+p.proc || 3) - 1]) + kv('Protection collective', PROT[(+p.prot || 4) - 1]) + '</dl>';
    } else if (UI.dtab === 'don') {
      if (p.type === 'procede' && RPROC[p.procede]) html += '<p class="dr-p">Procédé inscrit sur la liste de l\'arrêté du 26 octobre 2020 fixant la liste des substances, mélanges et procédés cancérogènes.</p>';
      if (!r.subs.length && p.type !== 'procede') html += '<p class="dr-p ev-mute">Aucune substance rattachée. Ajoutez les substances de la section 3 de la FDS (nom ou n° CAS) pour retrouver leurs valeurs limites et tableaux de maladies professionnelles.</p>';
      html += r.subs.map(function (x) {
        var tr = transitoire(x), cm = officialCmr(x);
        return '<div class="dr-sub"><h4>' + esc(x.nom) + '</h4><dl class="ev-kv">' + kv('N° CAS', esc((x.cas || []).join(', ') || '—')) + (x.ce ? kv('N° CE', esc(x.ce)) : '') +
          kv('VLEP contraignante', hasVlep(x) ? vlepTxt(x) : 'Aucune') + (tr ? kv('Mesure transitoire', esc(tr)) : '') +
          kv('Pénétration cutanée', x.peau ? 'Oui (mention « peau »)' : 'Non signalée') + ((x.sens || []).length ? kv('Sensibilisation', x.sens.map(function (s) { return s === 'resp' ? 'respiratoire' : 'cutanée'; }).join(', ')) : '') +
          (cm.length ? kv('Classification CLP', cm.join(', ') + (x.h && x.h.length ? ' · ' + x.h.join(' ') : '')) : '') + '</dl></div>';
      }).join('');
      if (r.mp.length) html += '<h4>Tableaux de maladies professionnelles</h4><ul class="dr-list">' + r.mp.map(function (n) { return '<li><b>n° ' + esc(n) + '</b> ' + esc(RMP[n] || '') + '</li>'; }).join('') + '</ul>';
    } else if (UI.dtab === 'sal') {
      html += '<dl class="ev-kv">' + kv('Poste', esc(p.poste || 'Non renseigné')) + kv('Salariés exposés', p.nb || 'À préciser') + kv('Durée d\'utilisation', FREQ[(+p.freq || 1) - 1]) + '</dl>';
      html += r.cmr === 'cmr' ? '<h4>Obligations pour ces salariés</h4><ul class="dr-list"><li><b>Liste des travailleurs exposés</b> nature, durée et degré d\'exposition, transmise au SPST, conservée 40 ans (art. R. 4412-93-1)</li><li><b>Suivi individuel renforcé</b> par le service de prévention et de santé au travail (art. R. 4624-23)</li><li><b>Information et formation</b> des salariés sur les risques et les précautions</li><li><b>Affectation interdite</b> aux moins de 18 ans (D. 4153-17) et, pour les reprotoxiques, aux femmes enceintes ou allaitantes (D. 4152-10)</li></ul>'
        : '<p class="dr-p ev-mute">Agent non classé CMR avéré ou présumé : pas d\'inscription sur la liste des travailleurs exposés. L\'évaluation reste à transcrire dans le document unique.</p>';
    } else {
      html += '<ul class="dr-acts">' + actionsFor(r).map(function (a) {
        var k = 'g:' + (a[0] === 'fds' ? 'fds:' + a[1] : a[0]), st = S.actions[k] || {};
        return '<li class="ev-action' + (st.statut === 'fait' ? ' done' : '') + '"><div><b>' + esc(a[1]) + '</b><span>' + esc(a[2]) + ' · ' + GROUPS[a[3]] + '</span></div><select class="input" data-k="' + esc(k) + '" data-f="statut" aria-label="Statut"><option value="">À faire</option><option value="cours"' + (st.statut === 'cours' ? ' selected' : '') + '>En cours</option><option value="fait"' + (st.statut === 'fait' ? ' selected' : '') + '>Fait</option></select></li>';
      }).join('') + '</ul>';
    }
    html += '</div><div class="dr-foot"><button type="button" class="btn btn-primary" data-edit="' + p.id + '">Modifier</button><button type="button" class="btn btn-secondary" data-del="' + p.id + '">Supprimer</button></div>';
    dr.innerHTML = html; dr.hidden = false; app.classList.add('has-drawer');
    if (window.matchMedia('(max-width: 1099px)').matches) document.body.classList.add('ev-lock');
  }
  function kv(k, v) { return '<div><dt>' + k + '</dt><dd>' + v + '</dd></div>'; }
  // ---------- Formulaire produit ----------
  var dlg = $('#ev-dialog'), form = $('#ev-form');
  function fillSelect(sel, arr, start) { sel.innerHTML = arr.map(function (t, i) { return '<option value="' + (i + (start || 1)) + '">' + t + '</option>'; }).join(''); }
  fillSelect(form.freq, FREQ); fillSelect(form.proc, PROC); fillSelect(form.prot, PROT); fillSelect(form.pulv, PULV);
  [form.freq, form.proc, form.prot, form.pulv, form.intensite].forEach(function (sel) { sel.insertAdjacentHTML('afterbegin', '<option value="">Choisir…</option>'); sel.value = ''; });
  form.vol.innerHTML = '<option value="">Calculée d\'après la température d\'ébullition</option>' + VOL.map(function (t, i) { return '<option value="' + (i + 1) + '">' + t + '</option>'; }).join('');
  form.procede.innerHTML = Object.keys(PROCEDES).map(function (k) { return '<option value="' + k + '">' + PROCEDES[k].label + '</option>'; }).join('');
  var hList = [], subList = [];
  function drawSubs() {
    var box = $('#ev-subs'); if (!box) return;
    if (!REF) { box.innerHTML = '<span class="ev-hint">Chargement du référentiel…</span>'; return; }
    box.innerHTML = subList.map(function (id) {
      var x = RBY[id]; if (!x) return '';
      var cm = officialCmr(x), tr = transitoire(x);
      return '<div class="ev-sub"><div><b>' + esc(x.nom) + '</b><span>' + (x.cas && x.cas.length ? 'CAS ' + x.cas.join(', ') : 'Sans n° CAS') + (x.ce ? ' · CE ' + esc(x.ce) : '') + '</span>' +
        (hasVlep(x) ? '<span class="ev-sub-v">VLEP contraignante ' + vlepTxt(x) + (x.peau ? ' · pénétration cutanée' : '') + '</span>' : '<span>Pas de valeur limite contraignante</span>') +
        (tr ? '<span class="ev-sub-t">' + esc(tr) + '</span>' : '') +
        (cm.length ? '<span class="ev-sub-c">Classification européenne : ' + cm.join(', ') + (x.h && x.h.length ? ' · ' + x.h.join(' ') : '') + '</span>' : '') +
        '</div><div class="ev-sub-act">' + (x.h && x.h.length ? '<button type="button" class="ev-link" data-applyh="' + esc(id) + '">Appliquer ses mentions H</button>' : '') + '<button type="button" class="ev-link del" data-rmsub="' + esc(id) + '">Retirer</button></div></div>';
    }).join('');
    var warn = $('#ev-subwarn'), cl = cmrLevel({ type: form.type.value, h: hList });
    var bad = subList.map(function (id) { return RBY[id]; }).filter(function (x) { return x && officialCmr(x).length && cl !== 'cmr'; });
    warn.hidden = !bad.length;
    warn.textContent = bad.length ? 'Attention : ' + bad.map(function (x) { return x.nom + ' (' + officialCmr(x).join(', ') + ')'; }).join(', ') + ' est classé CMR au niveau européen. Si sa concentration dépasse le seuil de classification, le produit doit porter une mention H340, H350 ou H360 : vérifiez la FDS.' : '';
  }
  function addSub(id) { if (id && RBY[id] && subList.indexOf(id) === -1) { subList.push(id); var x = RBY[id]; if (!form.name.value.trim()) form.name.value = x.nom; if (x.teb != null && !form.teb.value) form.teb.value = x.teb; } drawSubs(); }
  function drawSug(q) {
    var ul = $('#ev-sug'), res = REF ? findSubs(q) : [];
    if (!res.length) { ul.hidden = true; ul.innerHTML = ''; form.sub.setAttribute('aria-expanded', 'false'); return; }
    ul.innerHTML = res.map(function (x, i) { return '<li role="option" id="sug-' + i + '" data-sub="' + esc(x.id) + '"' + (i === 0 ? ' aria-selected="true"' : '') + '><b>' + esc(x.nom) + '</b><span>' + (x.cas && x.cas[0] ? 'CAS ' + x.cas[0] : '') + (hasVlep(x) ? ' · VLEP ' + vlepTxt(x, true) : '') + '</span></li>'; }).join('');
    ul.hidden = false; form.sub.setAttribute('aria-expanded', 'true');
  }
  function drawChips() {
    $('#ev-chips').innerHTML = hList.length ? hList.map(function (h) { return '<button type="button" class="ev-chip' + (CMR[h] ? ' c' : CMR_SUSP[h] ? ' s' : '') + '" data-h="' + h + '" title="Retirer">' + h + (H_LABEL[h] ? ' · ' + H_LABEL[h] : '') + ' <span aria-hidden="true">×</span></button>'; }).join('') : '<span class="ev-hint">Aucune mention santé : le produit sera classé au niveau de danger 1.</span>';
    var fake = { type: form.type.value, h: hList }, dc = dangerClass(fake), l = cmrLevel(fake);
    $('#ev-dc-preview').innerHTML = 'Classe de danger : ' + dangerBadge(dc) + ' ' + cmrBadge(l);
    if (REF) drawSubs();
  }
  function syncForm() {
    var proc = form.type.value === 'procede', etat = form.etat.value;
    $$('.only-prod', form).forEach(function (e) { e.hidden = proc; });
    $$('.only-proc', form).forEach(function (e) { e.hidden = !proc; });
    $$('.only-liq', form).forEach(function (e) { e.hidden = proc || etat !== 'liquide'; });
    $$('.only-sol', form).forEach(function (e) { e.hidden = proc || etat !== 'solide'; });
    drawChips();
  }
  function openForm(p, type) {
    form.reset(); form.dataset.id = p ? p.id : '';
    $('#ev-dialog-title').textContent = p ? 'Modifier ' + p.name : type === 'procede' ? 'Ajouter un procédé émissif' : 'Ajouter un produit chimique';
    p = p || { type: type || 'produit', etat: 'liquide', unite: 'kg' };
    ['freq', 'proc', 'prot', 'pulv', 'intensite'].forEach(function (k) { if (p[k] == null && form[k]) form[k].value = ''; });
    ['name', 'type', 'procede', 'etat', 'teb', 'vol', 'pulv', 'qte', 'unite', 'freq', 'poste', 'nb', 'proc', 'prot', 'intensite'].forEach(function (k) { if (form[k] && p[k] != null) form[k].value = p[k]; });
    hList = (p.h || []).slice(); form.htext.value = '';
    subList = (p.subs || []).slice(); form.sub.value = ''; $('#ev-sug').hidden = true; drawSubs();
    syncForm(); $('#ev-form-err').hidden = true;
    wzEdit = !!form.dataset.id; wzStep(1);
    dlg.showModal(); setTimeout(function () { form.name.focus(); }, 30);
  }
  form.addEventListener('change', function (e) { if (e.target.name === 'type' || e.target.name === 'etat') syncForm(); if (e.target.name === 'procede' && !form.name.value) form.name.value = PROCEDES[form.procede.value].label; });
  $('#ev-hadd').addEventListener('click', function () {
    var txt = form.htext.value, miss = [];
    parseH(txt).forEach(function (h) { if (hList.indexOf(h) === -1) hList.push(h); });
    parseCas(txt).forEach(function (c) { var hit = RIDX.filter(function (e) { return (e.s.cas || []).indexOf(c) !== -1; })[0]; if (hit) addSub(hit.s.id); else miss.push(c); });
    $('#ev-casmiss').textContent = miss.length ? 'N° CAS repérés sans valeur limite contraignante dans le référentiel : ' + miss.join(', ') : '';
    form.htext.value = ''; drawChips(); drawSubs();
  });
  form.sub.addEventListener('input', function () { drawSug(form.sub.value); });
  form.sub.addEventListener('keydown', function (e) {
    var ul = $('#ev-sug'), items = $$('li', ul), cur = items.findIndex(function (li) { return li.getAttribute('aria-selected') === 'true'; });
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { if (!items.length) return; e.preventDefault(); var n = (cur + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length; items.forEach(function (li, i) { li.setAttribute('aria-selected', i === n); }); form.sub.setAttribute('aria-activedescendant', items[n].id); }
    else if (e.key === 'Enter') { e.preventDefault(); if (cur >= 0) { addSub(items[cur].dataset.sub); form.sub.value = ''; drawSug(''); } }
    else if (e.key === 'Escape') { e.stopPropagation(); drawSug(''); }
  });
  $('#ev-sug').addEventListener('mousedown', function (e) { var li = e.target.closest('[data-sub]'); if (li) { e.preventDefault(); addSub(li.dataset.sub); form.sub.value = ''; drawSug(''); } });
  form.sub.addEventListener('blur', function () { setTimeout(function () { drawSug(''); }, 150); });
  $('#ev-subs').addEventListener('click', function (e) {
    var rm = e.target.closest('[data-rmsub]'), ap = e.target.closest('[data-applyh]');
    if (rm) { subList.splice(subList.indexOf(rm.dataset.rmsub), 1); drawSubs(); }
    if (ap) { (RBY[ap.dataset.applyh].h || []).forEach(function (h) { if (hList.indexOf(h) === -1) hList.push(h); }); drawChips(); drawSubs(); }
  });
  form.htext.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#ev-hadd').click(); } });
  form.htext.addEventListener('paste', function () { setTimeout(function () { if (parseH(form.htext.value).length > 1) $('#ev-hadd').click(); }, 0); });
  $('#ev-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-h]'); if (b) { hList.splice(hList.indexOf(b.dataset.h), 1); drawChips(); } });
  $('#ev-cancel').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  var wzCur = 1, wzEdit = false;
  function wzStep(n) {
    wzCur = n;
    $$('.ev-step', form).forEach(function (f) { f.hidden = +f.dataset.step !== n; });
    $$('.ev-wz li').forEach(function (li) { var k = +li.dataset.wz; li.className = k < n ? 'done' : k === n ? 'on' : ''; });
    $('#ev-wz-n').textContent = 'Étape ' + n + ' sur 3';
    $('#ev-prev').hidden = n === 1; $('#ev-next').hidden = n === 3; $('#ev-save').hidden = n < 3 && !wzEdit;
    $('#ev-form-err').hidden = true;
    var db = $('.ev-db', form); if (db) db.scrollTop = 0;
  }
  function wzValid() {
    var miss = function (el, msg) { $('#ev-form-err').textContent = msg; $('#ev-form-err').hidden = false; el.focus(); return false; };
    if (wzCur === 2) {
      var proc2 = form.type.value === 'procede';
      if (!proc2 && form.etat.value === 'solide' && !form.pulv.value) return miss(form.pulv, 'Indiquez si le produit fait de la poussière.');
      if (proc2 && !form.intensite.value) return miss(form.intensite, 'Indiquez l\'intensité des émissions.');
      if (!form.freq.value) return miss(form.freq, 'Indiquez la durée d\'utilisation.');
      return true;
    }
    if (wzCur === 3) {
      if (!form.proc.value) return miss(form.proc, 'Indiquez comment le produit est utilisé.');
      if (!form.prot.value) return miss(form.prot, 'Indiquez la protection collective au poste.');
      return true;
    }
    if (wzCur !== 1) return true;
    if (form.htext.value.trim()) $('#ev-hadd').click();
    if (form.type.value === 'procede' && !form.name.value.trim()) form.name.value = PROCEDES[form.procede.value].label;
    if (!form.name.value.trim()) { $('#ev-form-err').textContent = 'Indiquez le nom du produit.'; $('#ev-form-err').hidden = false; form.name.focus(); return false; }
    return true;
  }
  $('#ev-next').addEventListener('click', function () { if (wzValid()) { wzStep(wzCur + 1); var f = $('.ev-step[data-step="' + wzCur + '"] .input:not([hidden])', form); if (f) f.focus(); } });
  $('#ev-prev').addEventListener('click', function () { wzStep(wzCur - 1); });
  $$('.ev-wz li').forEach(function (li) { li.addEventListener('click', function () { var n = +li.dataset.wz; if (n < wzCur || wzEdit || wzValid()) wzStep(n); }); });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!wzEdit && wzCur < 3) { $('#ev-next').click(); return; }
    if (wzCur >= 2 && !wzValid()) return;
    if (form.htext.value.trim()) $('#ev-hadd').click();
    var proc = form.type.value === 'procede';
    if (proc && !form.name.value.trim()) form.name.value = PROCEDES[form.procede.value].label;
    if (!form.name.value.trim()) { $('#ev-form-err').textContent = 'Indiquez le nom du produit.'; $('#ev-form-err').hidden = false; form.name.focus(); return; }
    var p = { id: form.dataset.id ? +form.dataset.id : S.next++, name: form.name.value.trim(), type: form.type.value, h: proc ? [] : hList.slice(), freq: +form.freq.value, poste: form.poste.value.trim(), nb: form.nb.value ? Math.max(0, parseInt(form.nb.value, 10) || 0) : '', proc: +form.proc.value, prot: +form.prot.value };
    p.subs = proc ? [] : subList.slice();
    S.refSeen = S.refSeen || {}; p.subs.forEach(function (id) { if (RBY[id]) S.refSeen[id] = RBY[id].fp; });
    if (proc) { var d = PROCEDES[form.procede.value]; p.procede = form.procede.value; p.intensite = +form.intensite.value; p.etat = d.etat; p.pulv = d.pulv || 2; p.vol = d.vol || ''; }
    else { p.etat = form.etat.value; p.teb = form.teb.value; p.vol = form.vol.value; p.pulv = +form.pulv.value; p.qte = form.qte.value ? +String(form.qte.value).replace(',', '.') : ''; p.unite = form.unite.value; }
    var i = S.products.findIndex(function (x) { return x.id === p.id; });
    if (i >= 0) S.products[i] = p; else S.products.push(p);
    UI.sel = p.id;
    dlg.close(); render(); announce(i >= 0 ? 'Produit modifié.' : 'Produit ajouté.');
  });


  // ---------- Navigation et actions ----------
  var VIEWS = ['dash', 'inv', 'hier', 'inh', 'plan', 'cmr', 'sal', 'export', 'set', 'ref'];
  function announce(t) { $('#ev-live').textContent = t; }
  function showView(id, scroll) {
    if (VIEWS.indexOf(id) < 0) id = 'inv';
    UI.view = id;
    $$('.app-nav-i').forEach(function (b) { var on = b.dataset.view === id; b.classList.toggle('on', on); if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
    $$('.ev-view').forEach(function (v) { v.hidden = v.id !== 'v-' + id; });
    render();
    try { history.replaceState(null, '', '#' + id); } catch (e) {}
    if (scroll) { var a = $('#outil'); if (a.getBoundingClientRect().top < 0 || scroll === 'force') a.scrollIntoView({ block: 'start' }); }
    var cur = $('.app-nav-i.on'); if (cur && cur.scrollIntoView && window.matchMedia('(max-width: 899px)').matches) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
  function openDetail(id) { UI.sel = +id; UI.dtab = 'syn'; renderDrawer(); $$('tr.is-row').forEach(function (tr) { tr.classList.toggle('is-sel', +tr.dataset.open === UI.sel); }); var c = $('.dr-close'); if (c) c.focus({ preventScroll: true }); }
  function closeDetail() { var id = UI.sel; UI.sel = null; renderDrawer(); $$('tr.is-sel').forEach(function (tr) { tr.classList.remove('is-sel'); }); var b = $('.ev-open[data-open="' + id + '"]'); if (b) b.focus({ preventScroll: true }); }
  function download(name, data, type) {
    var blob = new Blob([data], { type: type }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function slug() { return S.site ? '-' + S.site.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : ''; }
  var DOCS = {
    duerp: ['Document unique d\'évaluation des risques professionnels · volet risque chimique', 'Art. L. 4121-3, L. 4121-3-1 et R. 4121-1 à R. 4121-4 du code du travail ; évaluation des agents chimiques dangereux (art. R. 4412-5 et R. 4412-6) et des agents CMR (art. R. 4412-61 à R. 4412-66)', ['inv', 'hier', 'inh', 'cmr']],
    cmr: ['Dossier CMR · agents cancérogènes, mutagènes et toxiques pour la reproduction', 'Art. R. 4412-59 à R. 4412-93-4 du code du travail · agents CMR, salariés exposés, liste des travailleurs exposés et obligations associées', ['cmr', 'sal']],
    all: ['Dossier DUERP · évaluation du risque chimique', 'Document unique d\'évaluation des risques professionnels (art. R. 4121-1, R. 4412-5 et R. 4412-61 du code du travail) · rapport d\'évaluation, liste des travailleurs exposés aux agents CMR et plan d\'action', ['inv', 'hier', 'inh', 'cmr', 'sal', 'plan']],
    report: ['DUERP · Rapport d\'évaluation du risque chimique', 'Annexe au document unique d\'évaluation des risques professionnels (art. R. 4121-1 et R. 4412-5 du code du travail)', ['inv', 'hier', 'inh', 'cmr', 'sal', 'plan']],
    liste: ['Liste des travailleurs exposés aux agents CMR', 'Art. R. 4412-93-1 du code du travail · à transmettre au service de prévention et de santé au travail et à conserver 40 ans', []],
    plan: ['Plan d\'action de prévention du risque chimique', 'À reporter dans le programme annuel de prévention (PAPRIPACT) ou dans le document unique', ['plan']]
  };
  function isoDay(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var EFF = { '1-10': 'De 1 à 10 salariés', '11-49': 'De 11 à 49 salariés', '50+': '50 salariés et plus' };
  function unitesTravail() { var u = []; S.products.forEach(function (p) { if (p.poste && u.indexOf(p.poste) === -1) u.push(p.poste); }); return u; }
  // Page de garde du DUERP : identification, version, unités de travail (art. R. 4121-1 et L. 4121-3-1)
  function duerpHead(doc, today, v) {
    S.versions = S.versions || []; var iso = isoDay(new Date()), last = S.versions[S.versions.length - 1];
    if (!last || last.date !== iso) { S.versions.push({ n: S.versions.length + 1, date: iso }); last = S.versions[S.versions.length - 1]; }
    var next = S.effectif === '1-10' ? 'À chaque décision d\'aménagement important et à chaque information nouvelle sur un risque' : (function () { var d = new Date(); d.setFullYear(d.getFullYear() + 1); return 'Au plus tard le ' + d.toLocaleDateString('fr-FR') + ', et à chaque changement important'; })();
    var meta = [['Entreprise ou établissement', S.site || '………………………………'], ['SIRET', S.siret || '………………………………'], ['Effectif', EFF[S.effectif] || '………………'], ['Unités de travail concernées', unitesTravail().join(', ') || '………………………………'],
      ['Version', 'N° ' + last.n + ' du ' + today], ['Évaluation réalisée par', S.auteur || '………………………………'], ['Consultation du CSE (s\'il existe)', S.cse ? new Date(S.cse + 'T12:00:00').toLocaleDateString('fr-FR') : '………………………………'], ['Prochaine mise à jour', next],
      ['Référentiel', 'Valeurs limites : art. R. 4412-149' + (v ? ' (version du ' + frDate(v) + ')' : '')]];
    return '<h1>' + doc[0] + '</h1><p class="ph-sub">' + doc[1] + '</p><dl class="ph-meta">' + meta.map(function (m) { return '<div><dt>' + m[0] + '</dt><dd>' + esc(m[1]) + '</dd></div>'; }).join('') + '</dl>' +
      '<p class="ph-meth">Ce document constitue le volet « risque chimique » du document unique. Il transcrit, pour chaque unité de travail, l\'inventaire des produits et procédés utilisés, l\'évaluation des risques et les actions de prévention. Les autres risques professionnels de l\'entreprise (chutes, bruit, manutention, machines, risques psychosociaux, etc.) figurent dans les autres parties du document unique. Méthode : évaluation simplifiée du risque chimique inspirée de la démarche de l\'INRS ; résultats indicatifs, à confirmer par des mesurages pour les agents soumis à une valeur limite.</p>';
  }
  // Actions de prévention : liste (moins de 50 salariés) ou programme annuel PAPRIPACT (50 et plus, art. L. 4121-3-1)
  function duerpPlan() {
    var items = planItems(ROWS), big = S.effectif === '50+';
    items.sort(function (x, y) { return GORDER[x.group] - GORDER[y.group] || x.prio - y.prio; });
    var st = function (it) { return S.actions[it.k] || {}; }, d = function (x) { return x ? new Date(x + 'T12:00:00').toLocaleDateString('fr-FR') : ''; };
    var cols = big ? ['Mesure', 'Référence', 'Conditions d\'exécution', 'Indicateur de résultat', 'Coût estimé', 'Ressources mobilisables', 'Échéance', 'Statut'] : ['Mesure', 'Référence', 'Responsable', 'Échéance', 'Statut'];
    var rows = items.map(function (it) { var a = st(it), stt = a.statut === 'fait' ? 'Réalisée' : a.statut === 'cours' ? 'En cours' : 'À faire';
      return big ? [it.text, it.law, a.resp ? 'Responsable : ' + a.resp : '', a.indic || '', a.cout || '', a.moyens || '', d(a.date), stt] : [it.text, it.law, a.resp || '', d(a.date), stt]; });
    return '<h2 class="ph-h2">' + (big ? 'Programme annuel de prévention des risques professionnels et d\'amélioration des conditions de travail (PAPRIPACT) · volet chimique' : 'Liste des actions de prévention et de protection') + '</h2><p class="ph-sub">Art. L. 4121-3-1 du code du travail · actions classées dans l\'ordre des principes de prévention : substitution, système clos, protection collective, suivi, protection individuelle</p>' +
      '<table class="ph-list"><thead><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + (rows.length ? rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') : '<tr><td colspan="' + cols.length + '">Aucune action.</td></tr>') + '</tbody></table>';
  }
  // Mise à jour, conservation et accès (art. R. 4121-2, R. 4121-4 et L. 4121-3-1), historique des versions, signature
  function duerpFoot() {
    var vs = (S.versions || []).slice().reverse();
    return '<h2 class="ph-h2">Mise à jour, conservation et accès</h2><ul class="ph-rules">' +
      '<li><b>Mise à jour</b> : au moins chaque année dans les entreprises d\'au moins 11 salariés, et dans toutes les entreprises lors de toute décision d\'aménagement important modifiant les conditions de travail ou lorsqu\'une information supplémentaire sur un risque est portée à la connaissance de l\'employeur (art. R. 4121-2).</li>' +
      '<li><b>Conservation</b> : le document unique et chacune de ses versions successives sont conservés par l\'employeur pendant 40 ans (art. L. 4121-3-1).</li>' +
      '<li><b>Accès</b> : tenu à la disposition des travailleurs et des anciens travailleurs pour les versions en vigueur pendant leur activité, des membres du comité social et économique, du service de prévention et de santé au travail, des agents de l\'inspection du travail et des services de prévention des organismes de sécurité sociale ; un avis indiquant les modalités d\'accès est affiché (art. R. 4121-4).</li>' +
      '<li><b>Transmission</b> : le document unique est transmis par l\'employeur au service de prévention et de santé au travail à chaque mise à jour (art. L. 4121-3-1).</li></ul>' +
      '<table class="ph-list ph-vers"><thead><tr><th>Version</th><th>Date</th><th>Motif de la mise à jour</th><th>Transmise au SPST le</th></tr></thead><tbody>' + vs.map(function (v) { return '<tr><td>N° ' + v.n + '</td><td>' + new Date(v.date + 'T12:00:00').toLocaleDateString('fr-FR') + '</td><td></td><td></td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="ph-sign"><div>Date</div><div>Nom et qualité de l\'employeur</div><div>Signature</div></div>';
  }
  // Dossier CMR : liste des travailleurs exposés et rappel des obligations propres aux agents CMR
  function cmrTail(lt) {
    var ob = [['Rechercher la substitution et consigner le résultat dans le document unique', 'R. 4412-66'], ['À défaut, travailler en système clos', 'R. 4412-68'], ['À défaut, réduire l\'exposition au niveau le plus bas techniquement possible', 'R. 4412-69'], ['Appliquer les treize mesures de prévention', 'R. 4412-70'],
      ['Faire contrôler au moins une fois par an le respect des valeurs limites par un organisme accrédité', 'R. 4412-76'], ['Tenir la liste des travailleurs exposés et la communiquer au service de prévention et de santé au travail à chaque actualisation', 'R. 4412-93-1 à R. 4412-93-3'],
      ['Organiser le suivi individuel renforcé des travailleurs exposés', 'R. 4624-23'], ['Respecter les interdictions d\'affectation (jeunes, femmes enceintes ou allaitantes pour les reprotoxiques, CDD et intérimaires)', 'D. 4152-10, D. 4153-17, D. 4154-1']];
    return '<h2 class="ph-h2">Liste des travailleurs exposés aux agents CMR</h2><p class="ph-sub">Art. R. 4412-93-1 · à compléter avec le nom des salariés, à transmettre au SPST à chaque actualisation</p>' + lt +
      '<h2 class="ph-h2">Obligations propres aux agents CMR</h2><table class="ph-list"><thead><tr><th>Obligation</th><th>Article du code du travail</th><th>Pièce disponible le</th></tr></thead><tbody>' + ob.map(function (o) { return '<tr><td>' + o[0] + '</td><td>' + o[1] + '</td><td></td></tr>'; }).join('') + '</tbody></table>' +
      '<p class="ph-meth">Le dossier de preuve CMR complet (registre des agents, étude de substitution, versions datées de la liste, extraits individuels, sommaire des 45 obligations) se tient avec l\'outil VB Safety : vb-safety.com/cmr-industrie/outil/</p>';
  }
  function printDoc(mode) {
    var doc = DOCS[mode] || DOCS.report, prev = UI.view, today = new Date().toLocaleDateString('fr-FR');
    var v = REF ? ((REF.meta.sources || {}).vlep || {}).en_vigueur_depuis : '';
    var head = '<h1>' + doc[0] + '</h1><p class="ph-sub">' + doc[1] + '</p><dl class="ph-meta"><div><dt>Établissement ou unité de travail</dt><dd>' + esc(S.site || '………………………………') + '</dd></div><div><dt>Date d\'édition</dt><dd>' + today + '</dd></div><div><dt>Référentiel</dt><dd>Code du travail, art. R. 4412-149' + (v ? ' (version du ' + frDate(v) + ')' : '') + '</dd></div><div><dt>Évaluation réalisée par</dt><dd>' + esc(S.auteur || '………………………………') + '</dd></div></dl>';
    if (mode === 'duerp') head = duerpHead(doc, today, v);
    if (mode === 'report' || mode === 'all') head += '<p class="ph-meth">Méthode : évaluation simplifiée du risque chimique inspirée de la démarche de l\'INRS (hiérarchisation des risques potentiels, puis estimation du risque par inhalation). Résultats indicatifs, à confirmer par des mesurages pour les agents soumis à une valeur limite.</p>';
    var tail = '';
    if (mode === 'liste' || mode === 'all' || mode === 'cmr') {
      var ps = postesCmr(), keys = Object.keys(ps), lt = '<table class="ph-list"><thead><tr><th>Nom et prénom</th><th>Poste</th><th>Agents CMR</th><th>Durée d\'utilisation</th><th>Niveau d\'exposition estimé</th><th>Exposé du</th><th>au</th></tr></thead><tbody>' +
        (keys.length ? keys.map(function (k) {
          var n = Math.max(ps[k].nb || 0, 2), f = Math.max.apply(null, ps[k].rows.map(function (r) { return r.fc; })), lv = Math.min.apply(null, ps[k].rows.map(function (r) { return r.inh; })), rows = '';
          for (var i = 0; i < n; i++) rows += '<tr><td></td><td>' + esc(k) + '</td><td>' + ps[k].agents.map(esc).join(', ') + '</td><td>' + FREQ_S[f - 1] + '</td><td>' + INH[lv][0] + '</td><td></td><td></td></tr>';
          return rows;
        }).join('') : '<tr><td colspan="7">Aucun agent CMR avéré ou présumé dans l\'inventaire.</td></tr>') + '</tbody></table><p class="ph-meth">Pour chaque salarié : nature, durée et degré de l\'exposition, et résultats des contrôles de l\'exposition au poste lorsqu\'ils existent.</p>';
      if (mode === 'liste') head += lt; else if (mode === 'cmr') tail = cmrTail(lt); else tail = '<h2 class="ph-h2">Liste des travailleurs exposés aux agents CMR</h2><p class="ph-sub">Art. R. 4412-93-1 · à compléter avec le nom des salariés, à transmettre au SPST et à conserver 40 ans</p>' + lt;
    }
    if (mode === 'duerp') tail = duerpPlan() + duerpFoot();
    $('#ev-print-head').innerHTML = head; $('#ev-print-tail').innerHTML = tail;
    var R = { dash: renderDash, inv: renderInv, hier: renderHier, inh: renderInh, plan: renderPlan, cmr: renderCmr, sal: renderSal };
    $$('.ev-view').forEach(function (el) { var id = el.id.slice(2); el.hidden = doc[2].indexOf(id) < 0; if (!el.hidden && R[id]) { UI.view = id; R[id](); } });
    UI.view = prev;
    var t = document.title; document.title = doc[0] + (S.site ? ' - ' + S.site : '') + ' - ' + today;
    document.body.classList.add('ev-printing'); document.body.setAttribute('data-print', mode);
    S.exported = 1; save();
    window.print();
    document.title = t; document.body.classList.remove('ev-printing'); document.body.removeAttribute('data-print');
    showView(prev);
  }

  document.addEventListener('click', function (e) {
    var menu = e.target.closest('.ev-menu');
    $$('.ev-menu[open]').forEach(function (m) { if (m !== menu) m.open = false; });
    var go = e.target.closest('[data-go]');
    if (go) { e.preventDefault(); showView(go.dataset.go, 'force'); return; }
    var nv = e.target.closest('.app-nav-i');
    if (nv) { showView(nv.dataset.view, true); return; }
    var dt = e.target.closest('[data-dtab]');
    if (dt) { UI.dtab = dt.dataset.dtab; renderDrawer(); var nb = $('[data-dtab="' + UI.dtab + '"]'); if (nb) nb.focus(); return; }
    var pg = e.target.closest('[data-page]');
    if (pg) { UI.page += +pg.dataset.page; render(); return; }
    var t = e.target.closest('[data-act], [data-edit], [data-del]');
    if (!t) {
      var row = e.target.closest('[data-open]');
      if (row && !e.target.closest('input, select, a')) openDetail(row.dataset.open);
      return;
    }
    if (t.closest('.ev-menu')) t.closest('.ev-menu').open = false;
    if (t.dataset.edit) { openForm(S.products.filter(function (p) { return p.id === +t.dataset.edit; })[0]); return; }
    if (t.dataset.del) { var p = S.products.filter(function (x) { return x.id === +t.dataset.del; })[0]; if (p && confirm('Supprimer « ' + p.name + ' » de l\'inventaire ?')) { S.products = S.products.filter(function (x) { return x !== p; }); UI.sel = null; render(); announce('Produit supprimé.'); } return; }
    var act = t.dataset.act;
    if (act === 'add') openForm(null, 'produit');
    else if (act === 'addproc') openForm(null, 'procede');
    else if (act === 'demo') { if (!S.products.length || confirm('Remplacer l\'évaluation actuelle par l\'exemple ?')) { S = demo(); UI.sel = null; showView('inv', 'force'); } }
    else if (act === 'clear') { if (confirm('Effacer toutes les données de cette évaluation ? Cette action est définitive.')) { S = blank(); UI.sel = null; render(); } }
    else if (act === 'csv') { exportCsv(); S.exported = 1; save(); renderSteps(); }
    else if (act === 'json') download('sauvegarde-evaluation-risques-chimiques' + slug() + '.json', JSON.stringify({ format: 'vbs-eval', version: 1, exporte_le: new Date().toISOString(), data: S }, null, 1), 'application/json');
    else if (act === 'print') printDoc(t.dataset.mode || 'report');
    else if (act === 'intro') $('#ev-intro').showModal();
    else if (act === 'introclose') $('#ev-intro').close();
    else if (act === 'introgo') { $('#ev-intro').close(); showView('inv', 'force'); if (!S.products.length) openForm(null, 'produit'); }
    else if (act === 'introdemo') { $('#ev-intro').close(); if (!S.products.length || confirm('Remplacer l\'évaluation actuelle par l\'exemple ?')) { S = demo(); UI.sel = null; } showView('inv', 'force'); }
    else if (act === 'guide') { S.hideGuide = !S.hideGuide; save(); renderSteps(); }
    else if (act === 'close') closeDetail();
    else if (act === 'ackref') { S.refSeen = S.refSeen || {}; S.products.forEach(function (p) { subsOf(p).forEach(function (x) { S.refSeen[x.id] = x.fp; }); }); save(); $('#ev-alert').hidden = true; }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && UI.sel != null && !dlg.open) { closeDetail(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('tr.is-row')) { e.preventDefault(); openDetail(e.target.dataset.open); }
  });
  document.addEventListener('input', function (e) {
    var u = e.target.dataset && e.target.dataset.ui;
    if (u === 'q' || u === 'rq') { UI[u] = e.target.value; UI.page = 0; var pos = e.target.selectionStart; render(); var inp = $('[data-ui="' + u + '"]'); if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (x) {} } }
    else if (u === 'site' || e.target.id === 'ev-site') { S.site = e.target.value; if (u === 'site') $('#ev-site').value = S.site; save(); }
  });
  document.addEventListener('change', function (e) {
    var d = e.target.dataset || {};
    if (d.ui && d.ui !== 'q' && d.ui !== 'rq' && d.ui !== 'site') { UI[d.ui] = d.ui === 'per' ? +e.target.value : e.target.value; UI.page = 0; render(); return; }
    if (d.actFile === 'import') {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        try { var j = JSON.parse(rd.result), data = j && j.data; if (!data || !Array.isArray(data.products)) throw 0; if (!confirm('Remplacer l\'évaluation actuelle par « ' + f.name + ' » ?')) return; S = data; S.actions = S.actions || {}; S.next = S.next || S.products.reduce(function (m, p) { return Math.max(m, p.id + 1); }, 1); UI.sel = null; showView('inv', 'force'); announce('Sauvegarde restaurée.'); }
        catch (x) { alert('Ce fichier n\'est pas une sauvegarde de l\'outil d\'évaluation.'); }
      };
      rd.readAsText(f); e.target.value = ''; return;
    }
    if (d.k) {
      S.actions[d.k] = S.actions[d.k] || {}; S.actions[d.k][d.f] = e.target.value; save();
      var tr = e.target.closest('.ev-action'); if (tr && d.f === 'statut') tr.classList.toggle('done', e.target.value === 'fait');
      renderKpis(); renderSteps();
      if (UI.view === 'plan' && d.f === 'statut' && e.target.closest('.app-drawer')) renderPlan();
    }
  });

  function csvCell(v) { v = String(v == null ? '' : v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function exportCsv() {
    var rows = compute(), lines = [['Site', 'Produit ou procédé', 'Type', 'Substances (CAS)', 'VLEP contraignantes (8 h)', 'Tableaux maladies professionnelles', 'Mentions H', 'CMR', 'Classe de danger', 'Quantité par an', 'Unité', 'Fréquence', 'Poste', 'Salariés', 'Priorité', 'Score risque potentiel', 'Risque inhalation', 'Score inhalation', 'Actions']];
    rows.forEach(function (r) {
      var p = r.p;
      lines.push([S.site, p.name, p.type === 'procede' ? 'Procédé' : 'Produit', r.subs.map(function (x) { return x.nom + (x.cas && x.cas[0] ? ' (' + x.cas[0] + ')' : ''); }).join(' | '), r.vleps.map(function (x) { return x.nom + ' : ' + vlepTxt(x, true); }).join(' | '), r.mp.join(', '), (p.h || []).join(' '), r.cmr === 'cmr' ? 'Oui' : r.cmr === 'susp' ? 'Suspecté' : 'Non', r.dc, p.qte || '', p.type === 'procede' ? '' : p.unite, FREQ_S[r.fc - 1], p.poste, p.nb, PRIO[r.prio][0], Math.round(r.pot), INH[r.inh][0], +r.sinh.toPrecision(3), actionsFor(r).map(function (a) { var st = S.actions['g:' + (a[0] === 'fds' ? 'fds:' + a[1] : a[0])] || {}; return a[1] + (st.statut === 'fait' ? ' (fait)' : st.statut === 'cours' ? ' (en cours)' : ''); }).join(' | ')]);
    });
    download('inventaire-produits-chimiques' + slug() + '.csv', '﻿' + lines.map(function (l) { return l.map(csvCell).join(';'); }).join('\n'), 'text/csv;charset=utf-8');
  }



  // Démarrage
  var h0 = (location.hash || '').slice(1), printMode = /^imprimer(-(all|report|liste|plan|duerp|cmr))?$/.test(h0) ? (h0.split('-')[1] || 'all') : '', printed = false;
  function autoPrint() { if (!printMode || printed) return; printed = true; setTimeout(function () { printDoc(printMode); }, 60); }
  window.EV_ONREF = function () { refStatus(); render(); checkRefChanges(); autoPrint(); };
  loadRef();
  if (printMode) { document.documentElement.classList.add('ev-embed'); setTimeout(autoPrint, 2500); }
  showView(VIEWS.indexOf(h0) >= 0 ? h0 : (S.products.length ? 'dash' : 'inv'));
  if ($('#ev-intro')) $('#ev-intro').addEventListener('click', function (e) { if (e.target === this) this.close(); });
  window.EV_PRINT = printDoc;
})();
