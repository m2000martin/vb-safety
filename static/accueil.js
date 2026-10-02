// VB Safety · page d'accueil : défilement, formulaire de contact, fond animé.
(function () {
  // Anciennes adresses de la page d'accueil (#mentions-legales, démo…) : redirection vers les vraies pages
  var OLD = { 'mentions-legales': '/mentions-legales/', confidentialite: '/confidentialite/', pompiers: '/cmr-pompier/', acces: '/cmr-pompier/connexion.html', espace: '/cmr-pompier/',
    'acces-btp': '/cmr-industrie/', 'btp-expositions': '/cmr-industrie/', 'btp-duerp': '/cmr-industrie/evaluation.html', 'btp-fiches': '/cmr-industrie/' };
  var h = decodeURIComponent(location.hash.slice(1));
  if (OLD[h]) { location.replace(OLD[h]); return; }

  var EN = document.documentElement.lang === 'en';
  var M = EN ? { invalid: 'Please fill in the required fields and accept the privacy policy.', sending: 'Sending…', ok: 'Message sent. Thank you, we will get back to you quickly.', fallback: 'Opening your email app…', submit: 'Send message', subject: 'Website contact · ' }
            : { invalid: "Merci de compléter les champs obligatoires et d'accepter la politique de confidentialité.", sending: 'Envoi en cours…', ok: 'Message envoyé. Merci, nous revenons vers vous rapidement.', fallback: 'Ouverture de votre messagerie…', submit: 'Envoyer le message', subject: 'Contact site · ' };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-goto]'); if (!a) return;
    var el = document.getElementById(a.getAttribute('data-goto')); if (!el) return;
    e.preventDefault();
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', '#' + el.id);
  });

  // Téléphone : menu repliable, blocs détaillés repliés (le contenu reste dans la page)
  var L = EN ? { more: 'See details', less: 'Hide details', who: 'Who is VB Safety?' } : { more: 'Voir le détail', less: 'Masquer le détail', who: 'Qui est VB Safety ?' };
  var haut = document.querySelector('.haut'), mb = document.getElementById('menu-btn');
  if (haut && mb) {
    mb.hidden = false; haut.classList.add('has-menu');
    var setMenu = function (o) { haut.classList.toggle('open', o); mb.setAttribute('aria-expanded', o ? 'true' : 'false'); };
    mb.addEventListener('click', function () { setMenu(!haut.classList.contains('open')); });
    haut.querySelector('.haut-nav').addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });
  }
  var nPlie = 0;
  function plier(el, anchor, where, more, less) {
    if (!el) return;
    var b = document.createElement('button'), id = el.id || ('plie-' + (++nPlie));
    el.id = id; el.classList.add('plie');
    b.type = 'button'; b.className = 'plie-btn'; b.textContent = more; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', id);
    b.addEventListener('click', function () { var o = el.classList.toggle('ouvert'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); b.textContent = o ? less : more; });
    anchor.insertAdjacentElement(where, b);
  }
  document.querySelectorAll('.dive').forEach(function (d) { var body = d.querySelector('.dive-body'), hd = d.querySelector('.dive-head'); if (body && hd) plier(body, hd, 'beforeend', L.more, L.less); });
  var qui = document.querySelector('p.qui'); if (qui) plier(qui, qui, 'beforebegin', L.who, L.who);
  var mqTel = window.matchMedia('(max-width: 700px)');
  function replierDefs() {
    if (!mqTel.matches) return;
    document.querySelectorAll('.def:not(.repli)').forEach(function (d, i) {
      var dt = d.querySelector('dt'), dd = d.querySelector('dd'); if (!dt || !dd) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'def-btn'; b.setAttribute('aria-expanded', 'false');
      dd.id = dd.id || 'def-' + i; b.setAttribute('aria-controls', dd.id);
      while (dt.firstChild) b.appendChild(dt.firstChild); dt.appendChild(b); d.classList.add('repli');
      b.addEventListener('click', function () { b.setAttribute('aria-expanded', d.classList.toggle('ouvert') ? 'true' : 'false'); });
    });
  }
  replierDefs(); if (mqTel.addEventListener) mqTel.addEventListener('change', replierDefs);

  // Formulaire de contact (Web3Forms ; si l'envoi échoue, ouverture de la messagerie)
  var ENDPOINT = 'https://api.web3forms.com/submit', KEY = '0752cc8d-b82f-4ae5-ab72-50183aee5216', MAIL = 'contact@vb-safety.com';
  var form = document.getElementById('contact-form');
  if (form) form.addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = document.getElementById('cf-submit'), msg = document.getElementById('cf-msg');
    if (form.elements.botcheck.value) return;
    if (!form.checkValidity()) {
      msg.className = 'cf-msg full warn'; msg.textContent = M.invalid; msg.hidden = false;
      var first = form.querySelector(':invalid'); if (first) first.focus();
      return;
    }
    var data = new FormData(form), subject = M.subject + data.get('organisation');
    var payload = { access_key: KEY, from_name: 'Site VB Safety', subject: subject };
    data.forEach(function (v, k) { payload[k] = v; });
    if (payload.email) payload.replyto = payload.email;
    btn.disabled = true; btn.firstElementChild.textContent = M.sending; msg.hidden = true;
    try {
      var r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload) });
      var j = await r.json().catch(function () { return {}; });
      if (!r.ok || !j.success) throw new Error(j.message || 'HTTP ' + r.status);
      msg.className = 'cf-msg full ok'; msg.textContent = M.ok; msg.hidden = false;
      form.reset();
    } catch (err) {
      msg.className = 'cf-msg full warn'; msg.textContent = M.fallback; msg.hidden = false;
      var body = data.get('message') + '\n\n—\n' + data.get('nom') + '\n' + data.get('organisation') + '\n' + data.get('email') + '\nProfil : ' + data.get('profil');
      setTimeout(function () { location.href = 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body); }, 600);
    } finally {
      btn.disabled = false; btn.firstElementChild.textContent = M.submit;
    }
  });

  // Fond : particules (désactivées si l'utilisateur limite les animations)
  var canvas = document.getElementById('particles-canvas'); if (!canvas) return;
  var ctx = canvas.getContext('2d'), width = 0, height = 0, particles = [];
  function resize(force) {
    var w = window.innerWidth, hh = window.innerHeight;
    if (!force && w === width && Math.abs(hh - height) < 160) return;
    width = w; height = hh;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = hh * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.round(Math.min(60, Math.max(24, (w * hh) / 20000)));
    particles = Array.from({ length: n }, function () { return { x: Math.random() * w, y: Math.random() * hh, r: Math.random() * 1.8 + 0.8, vy: -(Math.random() * 0.4 + 0.15) }; });
    if (reduce) draw();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height); ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    particles.forEach(function (p) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
  }
  function animate() { if (!document.hidden) { particles.forEach(function (p) { p.y += p.vy; if (p.y < 0) p.y = height; }); draw(); } requestAnimationFrame(animate); }
  window.addEventListener('resize', function () { resize(false); });
  resize(true);
  if (!reduce) requestAnimationFrame(animate);
})();
