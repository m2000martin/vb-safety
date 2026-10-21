// VB Safety · page d'accueil : défilement, formulaire de contact, fond animé.
(function () {
  // Anciennes adresses de la page d'accueil (#mentions-legales, démo…) : redirection vers les vraies pages
  var OLD = { 'mentions-legales': '/mentions-legales/', confidentialite: '/confidentialite/', pompiers: '/cmr-pompier/', acces: '/cmr-pompier/connexion.html', espace: '/cmr-pompier/',
    'acces-btp': '/cmr-industrie/', 'btp-expositions': '/cmr-industrie/', 'btp-fiches': '/cmr-industrie/' };
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

  // Téléphone (V13) : choix du métier, rails de cartes, barre d'action fixe
  (function () {
    var T = EN ? { metiers: ['Firefighters', 'Industry', 'Construction'], seg: 'Choose your sector', acces: 'Request access', outils: 'Tools', carte: 'Card ' }
               : { metiers: ['Pompiers', 'Industrie', 'BTP'], seg: 'Choisir votre métier', acces: 'Demander un accès', outils: 'Outils', carte: 'Carte ' };
    var smooth = reduce ? 'auto' : 'smooth';
    function rail(track) {
      track.classList.add('rail');
      var items = Array.prototype.slice.call(track.children), dots = document.createElement('div'), listeners = [];
      dots.className = 'rail-dots';
      items.forEach(function (it, i) {
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', T.carte + (i + 1) + '/' + items.length);
        b.addEventListener('click', function () { go(i); }); dots.appendChild(b);
      });
      track.insertAdjacentElement('afterend', dots);
      function go(i) { track.scrollTo({ left: items[i].offsetLeft - items[0].offsetLeft, behavior: smooth }); }
      function current() {
        var x = track.scrollLeft, best = 0, d = Infinity;
        items.forEach(function (it, i) { var dd = Math.abs(it.offsetLeft - items[0].offsetLeft - x); if (dd < d) { d = dd; best = i; } });
        return best;
      }
      var last = -1, raf = 0;
      function maj() { raf = 0; var c = current(); if (c === last) return; last = c;
        Array.prototype.forEach.call(dots.children, function (b, i) { b.setAttribute('aria-current', i === c ? 'true' : 'false'); });
        listeners.forEach(function (f) { f(c); }); }
      track.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(maj); }, { passive: true });
      maj();
      return { go: go, items: items, onChange: function (f) { listeners.push(f); f(last); } };
    }
    var pillars = document.querySelector('.pillars'); if (pillars) rail(pillars);
    var dives = document.querySelector('.dives'), r = dives && rail(dives);
    if (r) {
      var seg = document.createElement('div'); seg.className = 'seg'; seg.setAttribute('role', 'tablist'); seg.setAttribute('aria-label', T.seg);
      r.items.forEach(function (d, i) {
        d.id = d.id || ['outil-pompiers', 'outil-industrie', 'outil-btp'][i];
        var b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', d.id);
        b.textContent = T.metiers[i] || ('' + (i + 1));
        b.addEventListener('click', function () { r.go(i); }); seg.appendChild(b);
      });
      dives.insertAdjacentElement('beforebegin', seg);
      // Thème par métier : couleur et pictogramme propres à chaque carte
      var METIERS = ['pompiers', 'industrie', 'btp'];
      var ICO = [
        '<path d="M12 3c.5 3.2 4.5 5.2 4.5 9.6A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.4c0-2 1-3.2 2-4.1.2 1.6 1 2.6 2 2.9C11 9 11.2 5.6 12 3Z"/><path d="M5 21h14"/>',
        '<path d="M3 21V10l5 3V10l5 3V10l5 3V4h3v17Z"/><path d="M7 17h2M12 17h2"/>',
        '<path d="M5 16a7 7 0 0 1 5-6.7M14 9.3A7 7 0 0 1 19 16"/><path d="M10 13V7.5h4V13"/><path d="M2.5 16h19v2.5h-19Z"/>'
      ];
      r.items.forEach(function (d, i) {
        if (!METIERS[i]) return; d.classList.add('t-' + METIERS[i]);
        var k = d.querySelector('.portal-kicker'); if (!k) return;
        var s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        s.setAttribute('class', 'metier-ico'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true');
        s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '1.6'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
        s.innerHTML = ICO[i]; k.insertAdjacentElement('beforebegin', s);
      });
      var sec = document.getElementById('plateforme'), dotsDives = dives.nextElementSibling, dansOutils = false, metier = METIERS[0];
      function appliquer() {
        ['t-pompiers', 't-industrie', 't-btp'].forEach(function (c) { seg.classList.remove(c); if (sec) sec.classList.remove(c); dotsDives.classList.remove(c); document.body.classList.remove(c); });
        seg.classList.add('t-' + metier); dotsDives.classList.add('t-' + metier); dotsDives.setAttribute('data-metier', metier);
        if (sec) { sec.classList.add('t-' + metier); sec.setAttribute('data-metier', metier); }
        if (dansOutils) { document.body.classList.add('t-' + metier); document.body.setAttribute('data-metier', metier); } else document.body.removeAttribute('data-metier');
        window.vbTeinte = dansOutils ? metier : null;
      }
      r.onChange(function (c) {
        Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-selected', i === c ? 'true' : 'false'); });
        if (c >= 0 && METIERS[c]) { metier = METIERS[c]; appliquer(); }
      });
      if (sec && 'IntersectionObserver' in window) new IntersectionObserver(function (e) { dansOutils = e[0].isIntersecting; appliquer(); }, { rootMargin: '-30% 0px -30% 0px' }).observe(sec);
    }
    // Barre fixe : visible après le premier écran, masquée sur le formulaire de contact
    var scene = document.querySelector('.scene'), contact = document.getElementById('contact');
    if (scene && contact && 'IntersectionObserver' in window) {
      var bar = document.createElement('div'); bar.className = 'barre-action';
      bar.innerHTML = '<a class="second" href="#plateforme" data-goto="plateforme"></a><a class="principal" href="#contact" data-goto="contact"></a>';
      bar.firstChild.textContent = T.outils; bar.lastChild.textContent = T.acces;
      document.body.appendChild(bar); document.body.classList.add('a-barre');
      var horsScene = false, surContact = false;
      function etat() { var v = horsScene && !surContact; bar.classList.toggle('visible', v); bar.setAttribute('aria-hidden', v ? 'false' : 'true');
        Array.prototype.forEach.call(bar.children, function (a) { a.tabIndex = v ? 0 : -1; }); }
      new IntersectionObserver(function (e) { horsScene = !e[0].isIntersecting; etat(); }, { rootMargin: '-35% 0px 0px 0px' }).observe(scene);
      new IntersectionObserver(function (e) { surContact = e[0].isIntersecting; etat(); }, { threshold: 0.05 }).observe(contact);
      etat();
    }
  })();

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
    var tel = w <= 700, n = tel ? 14 : Math.round(Math.min(60, Math.max(24, (w * hh) / 20000)));
    // Téléphone : moins de points, plus fins, une partie couleur braise
    particles = Array.from({ length: n }, function () { var ember = tel && Math.random() < 0.3;
      var a = (0.35 + Math.random() * 0.3).toFixed(2);
      return { e: ember, a: a, x: Math.random() * w, y: Math.random() * hh, r: tel ? Math.random() * 1.2 + 0.5 : Math.random() * 1.8 + 0.8, vy: -(Math.random() * 0.4 + 0.15),
        c: ember ? 'rgba(234, 122, 68, ' + a + ')' : (tel ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.9)') }; });
    if (reduce) draw();
  }
  function draw() {
    ctx.clearRect(0, 0, width, height);
    var T2 = { pompiers: '229, 72, 47', industrie: '91, 192, 224', btp: '245, 190, 79' }, tc = window.vbTeinte && T2[window.vbTeinte];
    particles.forEach(function (p) { ctx.fillStyle = (tc && p.e) ? 'rgba(' + tc + ', ' + p.a + ')' : p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); });
  }
  function animate() { if (!document.hidden) { particles.forEach(function (p) { p.y += p.vy; if (p.y < 0) p.y = height; }); draw(); } requestAnimationFrame(animate); }
  window.addEventListener('resize', function () { resize(false); });
  resize(true);
  if (!reduce) requestAnimationFrame(animate);
})();
