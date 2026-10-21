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
      r.onChange(function (c) { Array.prototype.forEach.call(seg.children, function (b, i) { b.setAttribute('aria-selected', i === c ? 'true' : 'false'); }); });
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

  // Premier écran (téléphone) : le métier défile au-dessus du titre, le fond suit (même couleurs)
  (function () {
    var h1 = document.querySelector('.scene .enonce'); if (!h1) return;
    var M = EN ? [['pompiers', 'Firefighters'], ['btp', 'Construction'], ['industrie', 'Industry']]
               : [['pompiers', 'Sapeurs-pompiers'], ['btp', 'BTP'], ['industrie', 'Industrie']];
    var ICO = {
      pompiers: '<path d="M12 3c.5 3.2 4.5 5.2 4.5 9.6A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.4c0-2 1-3.2 2-4.1.2 1.6 1 2.6 2 2.9C11 9 11.2 5.6 12 3Z"/><path d="M5 21h14"/>',
      btp: '<path d="M5 16a7 7 0 0 1 5-6.7M14 9.3A7 7 0 0 1 19 16"/><path d="M10 13V7.5h4V13"/><path d="M2.5 16h19v2.5h-19Z"/>',
      industrie: '<path d="M3 21V10l5 3V10l5 3V10l5 3V4h3v17Z"/><path d="M7 17h2M12 17h2"/>'
    };
    var box = document.createElement('div'); box.className = 'hero-rot'; box.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    var mot = document.createElement('span'); box.appendChild(svg); box.appendChild(mot);
    h1.insertAdjacentElement('beforebegin', box);
    var i = 0;
    function montrer(k) { svg.innerHTML = ICO[M[k][0]]; mot.textContent = M[k][1]; window.vbMode = M[k][0]; }
    montrer(0);
    if (reduce) { window.vbMode = null; return; }
    var scene = document.querySelector('.scene'), visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(scene);
    setInterval(function () {
      if (!visible || document.hidden || !mqTel.matches) return;
      box.classList.add('sort');
      setTimeout(function () { i = (i + 1) % M.length; montrer(i); box.classList.remove('sort'); box.classList.add('entre');
        requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.remove('entre'); }); }); }, 380);
    }, 3200);
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
    var tel = w <= 700, n = tel ? 16 : Math.round(Math.min(60, Math.max(24, (w * hh) / 20000)));
    // Téléphone : moins de points, plus fins ; une partie couleur braise selon le métier affiché
    particles = Array.from({ length: n }, function () { var ember = tel && Math.random() < 0.4;
      return { tel: tel, e: ember, a: 0.35 + Math.random() * 0.3, ph: Math.random() * 6.28, k: Math.random() * 0.4 + 0.15,
        x: Math.random() * w, y: Math.random() * hh, r: tel ? Math.random() * 1.2 + 0.5 : Math.random() * 1.8 + 0.8, vx: 0, vy: -(Math.random() * 0.4 + 0.15) }; });
    if (reduce) draw();
  }
  // Pompiers : braises qui montent ; BTP : poussière qui dérive de côté ; industrie : vapeur lente qui ondule
  var braise = 1, t = 0;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    var cr = Math.round(255 + (234 - 255) * braise), cg = Math.round(255 + (122 - 255) * braise), cb = Math.round(255 + (68 - 255) * braise);
    particles.forEach(function (p) {
      ctx.fillStyle = !p.tel ? 'rgba(255, 255, 255, 0.9)' : p.e ? 'rgba(' + cr + ', ' + cg + ', ' + cb + ', ' + p.a.toFixed(2) + ')' : 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    });
  }
  function animate() {
    if (!document.hidden) {
      t += 0.016; var m = window.vbMode;
      braise += ((m === 'pompiers' || !m ? 1 : 0) - braise) * 0.03;
      particles.forEach(function (p) {
        var tvx = 0, tvy = -p.k;
        if (p.tel && m === 'btp') { tvx = 0.25 + p.k * 0.8; tvy = 0.05 + Math.sin(t + p.ph) * 0.08; }
        else if (p.tel && m === 'industrie') { tvx = Math.sin(t * 0.6 + p.ph) * 0.3; tvy = -p.k * 0.45; }
        else if (p.tel) { tvx = Math.sin(t * 1.3 + p.ph) * 0.12; }
        p.vx += (tvx - p.vx) * 0.025; p.vy += (tvy - p.vy) * 0.025;
        p.x += p.vx; p.y += p.vy;
        if (p.y < -4) p.y = height + 4; else if (p.y > height + 4) p.y = -4;
        if (p.x < -4) p.x = width + 4; else if (p.x > width + 4) p.x = -4;
      });
      draw();
    }
    requestAnimationFrame(animate);
  }
  window.addEventListener('resize', function () { resize(false); });
  resize(true);
  if (!reduce) requestAnimationFrame(animate);
})();
