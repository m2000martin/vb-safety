/* VB Safety · page de contact scannée depuis un QR.
   Les clics sont comptés par vu.js via les attributs data-evt : rien à ajouter ici. */

(function () {
  'use strict';

  var EMAIL = 'contact@vb-safety.com';

  function dire(txt) {
    var l = document.getElementById('lu');
    if (!l) return;
    l.textContent = txt;
    l.classList.add('vu');
    clearTimeout(dire.t);
    dire.t = setTimeout(function () { l.classList.remove('vu'); }, 2200);
  }

  /* ---- Fiche contact : confirmer, sinon rien ne signale que ça a marché ---- */
  var vcf = document.querySelector('a[href$=".vcf"]');
  if (vcf) vcf.addEventListener('click', function () {
    vcf.classList.add('ok');
    vcf.querySelector('span').textContent = 'Fiche ouverte';
    dire('Fiche contact envoyée à votre téléphone');
    setTimeout(function () {
      vcf.classList.remove('ok');
      vcf.querySelector('span').textContent = 'Ajouter à mes contacts';
    }, 3500);
  });

  /* ---- Partage : seulement là où le navigateur le propose ---- */
  var part = document.getElementById('b-partage');
  if (part && navigator.share) {
    part.hidden = false;
    part.addEventListener('click', function () {
      navigator.share({
        title: 'VB Safety',
        text: "Traçabilité de l'exposition professionnelle aux agents cancérogènes.",
        url: location.origin + '/scan/'
      }).catch(function () {});
    });
  }

  /* ---- Copie de l'adresse ---- */
  var cop = document.getElementById('b-copie');
  if (cop) cop.addEventListener('click', function () {
    var fini = function () { dire(EMAIL + ' copié'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(fini, repli);
    } else repli();
    function repli() {
      var z = document.createElement('textarea');
      z.value = EMAIL; z.setAttribute('readonly', '');
      z.style.cssText = 'position:fixed;top:-100px';
      document.body.appendChild(z); z.select();
      try { document.execCommand('copy'); fini(); } catch (e) { dire(EMAIL); }
      document.body.removeChild(z);
    }
  });

  /* ---- Orientation par métier ---- */
  var chs = [].slice.call(document.querySelectorAll('.ch'));
  chs.forEach(function (ch) {
    ch.addEventListener('click', function () {
      var ouvert = ch.getAttribute('aria-expanded') === 'true';
      chs.forEach(function (c) {
        c.setAttribute('aria-expanded', 'false');
        var p = document.getElementById(c.getAttribute('aria-controls'));
        if (p) p.hidden = true;
      });
      if (ouvert) return;                       // deuxième appui : on referme
      ch.setAttribute('aria-expanded', 'true');
      var pan = document.getElementById(ch.getAttribute('aria-controls'));
      if (pan) {
        pan.hidden = false;
        pan.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      if (window.vbsEvt) window.vbsEvt('clic:scan:metier-' + ch.dataset.m);
    });
  });
})();
