// Contenus réservés aux membres : les zones .locked[data-verrou] sont chiffrées dans la page
// (AES-GCM, clé dérivée du code par PBKDF2-SHA256, voir _outils/verrou.py).
// Le bon code les déchiffre et les affiche ; il est gardé pour la session (autres pages, connexion).
(function () {
  var KEY = 'vbs-code', ITER = 300000;
  // Empreinte du code de démonstration (même valeur que connexion.js), pour la page de connexion
  var HASH = '1f25a3f79dc7cbc6a54cd05250b81875c13d1f455bbeb72d926f96e347d01ac3';
  var EN = document.documentElement.lang === 'en';
  function norm(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
  function b64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  async function sha256(t) { var b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return Array.prototype.map.call(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  async function decrypt(code, blob) {
    var raw = b64(blob), salt = raw.slice(0, 16), iv = raw.slice(16, 28), ct = raw.slice(28);
    var base = await crypto.subtle.importKey('raw', new TextEncoder().encode(norm(code)), 'PBKDF2', false, ['deriveKey']);
    var key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, ct));
  }
  function stored() { try { return sessionStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function remember(c) { try { sessionStorage.setItem(KEY, norm(c)); } catch (e) {} }

  // Zones chiffrées des pages publiques
  async function openAll(code) {
    var zones = Array.prototype.slice.call(document.querySelectorAll('.locked[data-verrou]'));
    if (!zones.length) return false;
    var html = [];
    try { for (var i = 0; i < zones.length; i++) html.push(await decrypt(code, zones[i].getAttribute('data-verrou'))); }
    catch (e) { return false; }
    zones.forEach(function (z, i) { var t = document.createElement('template'); t.innerHTML = html[i]; z.replaceWith(t.content); });
    remember(code);
    return true;
  }
  // Page de connexion : choix du profil flouté jusqu'au bon code
  async function openLogin(code) {
    var box = document.querySelector('.locked-login'); if (!box) return false;
    if ((await sha256(norm(code))) !== HASH) return false;
    box.classList.add('open');
    var inner = box.querySelector('[inert]'); if (inner) inner.removeAttribute('inert');
    var f = document.getElementById('code'); if (f) { f.value = norm(code); f.dispatchEvent(new Event('input', { bubbles: true })); }
    var cf = document.getElementById('code-field'); if (cf) cf.hidden = true;
    remember(code);
    return true;
  }
  async function tryCode(code) { return (await openAll(code)) || (await openLogin(code)); }

  function bindForms() {
    document.querySelectorAll('[data-verrou-form]').forEach(function (form) {
      if (form.__v) return; form.__v = 1;
      var inp = form.querySelector('input[name="code"]'), err = form.querySelector('.locked-err'), btn = form.querySelector('[data-verrou-go]');
      async function go(e) {
        if (e) e.preventDefault();
        if (!norm(inp.value)) { inp.focus(); return; }
        btn.disabled = true; err.hidden = true;
        var label = btn.textContent; btn.textContent = EN ? 'Checking…' : 'Vérification…';
        var ok = false; try { ok = await tryCode(inp.value); } catch (x) { ok = false; }
        if (!ok) { btn.disabled = false; btn.textContent = label; err.hidden = false; inp.select(); }
      }
      btn.addEventListener('click', go);
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') go(e); });
    });
  }
  // Connexion : tant que le choix du profil est verrouillé, « Se connecter » renvoie vers la saisie du code
  function guardLogin() {
    var box = document.querySelector('.locked-login'), form = box && box.closest('form');
    if (!form) return;
    form.addEventListener('submit', function (e) {
      if (box.classList.contains('open')) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var inp = box.querySelector('.locked-cta input[name="code"]');
      box.scrollIntoView({ block: 'center', behavior: 'smooth' }); if (inp) inp.focus();
    }, true);
  }
  async function start() {
    bindForms(); guardLogin();
    var q = new URLSearchParams(location.search).get('code');
    var c = q || stored();
    if (c && window.crypto && crypto.subtle) { try { await tryCode(c); } catch (e) {} }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
