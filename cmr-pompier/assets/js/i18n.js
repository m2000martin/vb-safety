// Version anglaise du Carnet Expo CMR.
// L'application est écrite en français ; en anglais, cette couche traduit ce qui s'affiche
// (textes, infobulles, champs, fenêtres de confirmation, exports) à partir du dictionnaire
// i18n-en.js. La logique de l'application et les données ne changent pas.
//
// Principe : chaque texte est d'abord « gabarisé » : les noms propres (agents, communes),
// dates, heures, nombres et identifiants sont remplacés par {0}, {1}… puis le gabarit est
// cherché dans le dictionnaire. À défaut, le texte est découpé sur « · », « — » et « : »
// et chaque morceau est traduit séparément.
(function (w, d) {
  var KEY = 'vbs-lang';
  function readLang() {
    try {
      var q = new URLSearchParams(location.search).get('lang');
      if (q === 'en' || q === 'fr') { localStorage.setItem(KEY, q); return q; }
      return localStorage.getItem(KEY) === 'en' ? 'en' : 'fr';
    } catch (e) { return 'fr'; }
  }
  var lang = readLang();
  var I = w.VBSi18n = {
    lang: lang,
    set: function (l) {
      try { localStorage.setItem(KEY, l); } catch (e) {}
      var u = new URL(location.href);
      if (u.searchParams.has('lang')) { u.searchParams.set('lang', l); location.replace(u.href); } else location.reload();
    },
    t: function (s) { return s; }, apply: function () {}, names: function () {}, misses: null
  };
  // Bouton de langue : tout élément [data-lang-toggle]
  function bindToggles(root) {
    (root || d).querySelectorAll('[data-lang-toggle]').forEach(function (b) {
      if (b.__i18n) return; b.__i18n = 1;
      b.textContent = lang === 'en' ? 'FR' : 'EN';
      b.setAttribute('aria-label', lang === 'en' ? 'Afficher en français' : 'Switch to English');
      b.setAttribute('lang', lang === 'en' ? 'fr' : 'en');
      b.onclick = function () { I.set(lang === 'en' ? 'fr' : 'en'); };
    });
  }
  I.bindToggles = bindToggles;
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', function () { bindToggles(); }); else bindToggles();
  if (lang !== 'en') return;

  d.documentElement.lang = 'en';
  var DICT = w.VBS_EN || {};
  var GRADES = w.VBS_EN_GRADES || {};
  var FR_DAYS = { lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday', jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday' };
  var FR_MONTHS = { 'janvier': 'January', 'février': 'February', 'mars': 'March', 'avril': 'April', 'mai': 'May', 'juin': 'June', 'juillet': 'July', 'août': 'August', 'septembre': 'September', 'octobre': 'October', 'novembre': 'November', 'décembre': 'December',
    'janv.': 'Jan', 'févr.': 'Feb', 'avr.': 'Apr', 'juil.': 'Jul', 'sept.': 'Sep', 'oct.': 'Oct', 'nov.': 'Nov', 'déc.': 'Dec' };
  var MONTH_RE = '(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|janv\\.|févr\\.|avr\\.|juil\\.|sept\\.|oct\\.|nov\\.|déc\\.)';

  // ------------------------------------------------------------------ noms propres
  var NAMES = {}, nameRe = null;
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function rebuild() {
    var keys = Object.keys(NAMES).filter(Boolean).sort(function (a, b) { return b.length - a.length; });
    nameRe = keys.length ? new RegExp(keys.map(esc).join('|'), 'g') : null;
    if (TOK) ALLRE = new RegExp((nameRe ? nameRe.source + '|' : '') + TOK.source, 'g');
  }
  var ALLRE = null, TOK = null;
  // names({ "Capitaine M. Garnier": "Captain M. Garnier" }) ou names(["Démo-sur-Marne"])
  I.names = function (m) {
    if (Array.isArray(m)) m.forEach(function (n) { if (n && n.length > 2) NAMES[n] = n; });
    else Object.keys(m || {}).forEach(function (k) { if (k && k.length > 2) NAMES[k] = m[k]; });
    rebuild();
  };
  I.grade = function (g) { return GRADES[g] || g; };
  I.names(w.VBS_EN_NAMES || {});

  // ------------------------------------------------------------------ gabarits
  TOK = new RegExp([
    '(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) \\d{1,2} ' + MONTH_RE + ' \\d{4}', // date longue
    '\\d{1,2} ' + MONTH_RE + '(?: \\d{4})?',                                                   // 5 octobre (2026)
    MONTH_RE + ' \\d{4}',                                                                        // oct. 2026
    '\\d{2}\\/\\d{2}\\/\\d{4}',                                                                  // 05/10/2026
    '\\b\\d{1,2}h\\d{2}\\b', '\\b\\d{1,2} ?h(?= |$|\\b)(?!\\w)',                                 // 12h30, 10 h
    '\\b[A-Z]\\d{2}(?:\\.\\d{2}){2}\\b', '\\b[LR]\\d{2}(?:\\.\\d{2}){0,2}\\b',                   // codes CISU
    '\\b[A-Z]{1,6}(?:-[A-Za-z0-9_]+)+\\b',                                                       // INT-2026-04200, SP-0142, V-1001
    '[\\w.+-]+@[\\w-]+\\.[\\w.]+',                                                               // e-mail
    '[+-]?\\d+(?:[\\u00a0\\u202f ]\\d{3})*(?:,\\d+)?'                                            // nombres
  ].join('|'), 'g');
  rebuild();
  function outTok(t) {
    if (NAMES[t] !== undefined) return NAMES[t];
    var m;
    if ((m = /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) (\d{1,2}) (\S+) (\d{4})$/.exec(t))) return FR_DAYS[m[1]] + ' ' + m[2] + ' ' + (FR_MONTHS[m[3]] || m[3]) + ' ' + m[4];
    if ((m = /^(\d{1,2}) (\S+)(?: (\d{4}))?$/.exec(t)) && FR_MONTHS[m[2]]) return m[1] + ' ' + FR_MONTHS[m[2]] + (m[3] ? ' ' + m[3] : '');
    if ((m = /^(\S+) (\d{4})$/.exec(t)) && FR_MONTHS[m[1]]) return FR_MONTHS[m[1]] + ' ' + m[2];
    if ((m = /^(\d{1,2})h(\d{2})$/.exec(t))) return m[1].padStart(2, '0') + ':' + m[2];
    if ((m = /^(\d{1,2}) ?h$/.exec(t))) return m[1] + ' h';
    if (/^[+-]?\d/.test(t) && !/\//.test(t)) return t.replace(/[   ](?=\d{3})/g, ',').replace(/,(\d+)$/, function (x, dgt) { return t.indexOf(',') !== -1 && !/[   ]/.test(t) ? '.' + dgt : x; }).replace(/,(\d{1,2})$/, '.$1');
    return t;
  }
  function template(s) {
    var toks = [];
    var key = s.replace(ALLRE, function (m) { toks.push(m); return '{' + (toks.length - 1) + '}'; });
    return { key: key, toks: toks };
  }
  function fill(tpl, toks) { return tpl.replace(/\{(\d+)\}/g, function (m, n) { return toks[+n] !== undefined ? outTok(toks[+n]) : m; }); }
  var FRENCH = /[a-zàâçéèêëîïôûùüÿœ]{3,}/i;
  // Textes déjà en anglais (valeurs du dictionnaire) : laissés tels quels
  var EN = {}; Object.keys(DICT).forEach(function (k) { EN[DICT[k]] = 1; });
  function look(s) {
    if (DICT.hasOwnProperty(s)) return DICT[s];
    var tp = template(s);
    if (EN[tp.key] || EN[s]) return s;
    if (DICT.hasOwnProperty(tp.key)) return fill(DICT[tp.key], tp.toks);
    if (!FRENCH.test(tp.key.replace(/\{\d+\}/g, ''))) return fill(tp.key, tp.toks);
    for (var k = 0; k < PATS.length; k++) {
      var pm = PATS[k][0].exec(s);
      if (pm) return PATS[k][1].replace(/\$(\d)/g, function (x, n) { return tr(pm[+n] || ''); });
    }
    return null;
  }
  // Gabarits à trou libre : « J'ouvre « {*} ». » ; chaque trou est traduit à son tour
  var PATS = (w.VBS_EN_PAT || []).map(function (p) {
    var i = 0, re = p[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{\\\*\\\}/g, function () { return '(.+?)'; });
    var en = p[1].replace(/\{\*\}/g, function () { return '$' + (++i); });
    return [new RegExp('^' + re + '$'), en];
  });
  var SEPS = [' · ', ' — ', ' : ', ' – ', ' | ', ' → ', ' + ', ', '];
  // Découpe sur un séparateur, sans couper à l'intérieur de parenthèses
  function cut(s, sep) { var out = [], depth = 0, cur = ''; for (var i = 0; i < s.length; i++) { var c = s[i]; if (c === '(') depth++; else if (c === ')') depth = Math.max(0, depth - 1); if (!depth && s.substr(i, sep.length) === sep) { out.push(cur); cur = ''; i += sep.length - 1; } else cur += c; } out.push(cur); return out; }
  function tr(raw) {
    if (!raw || !FRENCH.test(raw) && !/\d/.test(raw)) return raw;
    var lead = raw.match(/^\s*/)[0], trail = raw.match(/\s*$/)[0];
    var s = raw.slice(lead.length, raw.length - trail.length).replace(/\s+/g, ' ');
    if (!s) return raw;
    var r = look(s);
    if (r === null) {
      // ponctuation finale
      var m = /^(.*?)([.:;!?…]+)$/.exec(s);
      if (m && (r = look(m[1])) !== null) r += m[2] === ' :' ? ':' : m[2];
    }
    if (r === null) r = split(s, 0);
    return lead + r + trail;
  }
  // quiet : ne pas signaler les morceaux manquants (le texte entier l'est déjà)
  function split(s, i, quiet) {
    if (i >= SEPS.length) { var r0 = look(s); if (r0 === null) { if (!quiet) miss(s); return s; } return r0; }
    var sep = SEPS[i];
    var parts = cut(s, sep);
    // virgule : seulement pour des énumérations (morceaux courts), pas pour des phrases
    if (parts.length < 2 || (sep === ', ' && parts.some(function (x) { return x.split(' ').length > 6; }))) return split(s, i + 1, quiet);
    var comma = sep === ', ', ok = true;
    var res = parts.map(function (part) { var r = look(part); if (r !== null) return r; var x = split(part, i + 1, quiet || comma); if (x === part && FRENCH.test(part)) ok = false; return x; });
    if (comma && !ok && !quiet) miss(s);
    return res.join(sep === ' : ' ? ': ' : sep);
  }
  var MISS = I.misses = {};
  var LOWER = /[a-zàâçéèêëîïôûùüÿœ]{3,}/;
  function miss(s) { if (LOWER.test(s.replace(/\b(?:Carc|Muta|Repr)\./g, ''))) { var k = template(s).key; MISS[k] = (MISS[k] || 0) + 1; } }
  I.t = tr;

  // ------------------------------------------------------------------ application au DOM
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt', 'data-tip', 'data-l'];
  var done = new WeakMap();
  function trText(n) {
    if (done.get(n) === n.data) return;
    var p = n.parentNode; if (p && (p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE' || p.nodeName === 'CODE' || p.nodeName === 'PRE' || (p.closest && p.closest('[data-no-i18n]')))) return;
    var o = tr(n.data); if (o !== n.data) n.data = o;
    done.set(n, n.data);
  }
  function trAttrs(el) {
    if (el.closest && el.closest('[data-no-i18n]')) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute && el.getAttribute(a);
      if (v && !(el.__i18nA && el.__i18nA[a] === v)) { var o = tr(v); if (o !== v) el.setAttribute(a, o); (el.__i18nA = el.__i18nA || {})[a] = o; }
    }
  }
  function apply(root) {
    if (!root) return;
    if (root.nodeType === 3) return trText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) trAttrs(root);
    var tw = d.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, null);
    var n; while ((n = tw.nextNode())) { if (n.nodeType === 3) trText(n); else trAttrs(n); }
  }
  I.apply = apply;
  function title() { var t = d.title, o = tr(t); if (o !== t) d.title = o; }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') m.addedNodes.forEach(function (x) { apply(x); if (x.nodeType === 1) bindToggles(x); });
      else if (m.type === 'characterData') trText(m.target);
      else if (m.type === 'attributes') trAttrs(m.target);
    }
    title();
  });
  function start() {
    apply(d.body); title();
    mo.observe(d.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    var te = d.querySelector('title'); if (te) mo.observe(te, { childList: true, characterData: true, subtree: true });
  }
  if (d.body) start(); else d.addEventListener('DOMContentLoaded', start);

  // Fenêtres natives
  var c0 = w.confirm, a0 = w.alert, p0 = w.prompt;
  w.confirm = function (m) { return c0.call(w, tr(String(m))); };
  w.alert = function (m) { return a0.call(w, tr(String(m))); };
  w.prompt = function (m, v) { return p0.call(w, tr(String(m)), v); };
})(window, document);
