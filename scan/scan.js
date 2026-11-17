/* VB Safety · page de contact scannée depuis un QR.
   Les clics sont comptés par vu.js via les attributs data-evt.
   La page s'ouvre en anglais ; le choix de langue est retenu sur l'appareil. */

(function () {
  'use strict';

  var EMAIL = 'contact@vb-safety.com';
  var API = 'https://api.vb-safety.com/api/collections/demandes/records';
  var CLE = 'vbs-scan-langue';

  var FR = {
    sous: "Traçabilité de l'exposition professionnelle aux agents cancérogènes. " +
          "Sapeurs-pompiers, industrie, BTP.",
    vcf: 'Ajouter à mes contacts', ecrire: 'Écrire',
    rdv: 'Rendez-vous', partage: 'Partager', linkedin: 'LinkedIn',
    vousetes: 'Vous êtes ?',
    m1: "Service d'incendie", m1b: 'et de secours',
    m2: 'Industrie', m2b: 'ou BTP',
    m3: 'Commune', m3b: 'ou EPCI',
    s1: "Relevé d'exposition VB CMR",
    s1b: "Saisie par le chef d'agrès, validation SSSM, attestation au format de la circulaire.",
    s2: 'Essayer la démonstration', s2b: 'Accès immédiat, sans installation.',
    s3: 'Affiche de décontamination A3',
    s3b: 'Libre de réutilisation, à imprimer pour la caserne.',
    i1: 'Dossier de preuve CMR',
    i1b: 'Registre des agents, liste nominative versionnée, transmission au service de santé au travail.',
    i2: "Ouvrir l'outil d'évaluation",
    i2b: 'Gratuit, sans compte, les données restent dans votre navigateur.',
    i3: 'Modèle de liste des travailleurs exposés',
    i3b: 'Excel et PDF, conformes au décret n° 2024-307.',
    c1: 'Votre commune est-elle soumise aux OLD ?',
    c1b: "Réponse immédiate à partir du zonage publié par l'IGN.",
    c2: 'Suivi du débroussaillement',
    c2b: 'Constat par imagerie, priorités de contrôle, courriers aux propriétaires.',
    c3: 'Demander une présentation', c3b: 'Vingt minutes, en visioconférence ou sur place.',
    nlt: 'Suivre le projet',
    nlp: "Notre lettre d'information, tous les deux mois : ce que nous construisons, ce que la " +
         'réglementation change, et ce que nous apprenons sur le terrain.',
    nlb: "S'inscrire",
    phnom: 'Nom', phfonction: 'Fonction', phemail: 'Adresse e-mail',
    nlrgpd: "Vos coordonnées servent uniquement à l'envoi de cette lettre, sont conservées en " +
            'France et ne sont jamais transmises. Un clic suffit pour se désinscrire.',
    nlconf: 'Confidentialité',
    nlok: 'Inscription enregistrée. Merci, à bientôt.',
    nlerr: "Le serveur ne répond pas. Écrivez-nous à " + EMAIL + ".",
    nlchamps: 'Merci de compléter les trois champs.',
    vcfok: 'Fiche contact envoyée à votre téléphone',
    vcfbt: 'Fiche ouverte',
    copie: ' copié'
  };

  var EN = {
    vcfbt: 'Card opened',
    vcfok: 'Contact card sent to your phone',
    nlok: 'You are subscribed. Thank you.',
    nlerr: 'The server is not responding. Please write to ' + EMAIL + '.',
    nlchamps: 'Please fill in all three fields.',
    copie: ' copied'
  };

  var langue = 'en';
  try { langue = localStorage.getItem(CLE) === 'fr' ? 'fr' : 'en'; } catch (e) {}

  /* Les textes anglais sont ceux du HTML : on les mémorise avant toute traduction. */
  var origine = {};
  function memoriser() {
    document.querySelectorAll('[data-t]').forEach(function (el) {
      origine[el.dataset.t] = el.textContent;
    });
    document.querySelectorAll('[data-t-ph]').forEach(function (el) {
      origine[el.dataset.tPh] = el.placeholder;
    });
  }

  function appliquer() {
    var fr = langue === 'fr';
    document.documentElement.lang = fr ? 'fr' : 'en';
    document.querySelectorAll('[data-t]').forEach(function (el) {
      var k = el.dataset.t;
      var v = fr ? FR[k] : origine[k];
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-t-ph]').forEach(function (el) {
      var k = el.dataset.tPh;
      var v = fr ? FR[k] : origine[k];
      if (v) el.placeholder = v;
    });
    var vcf = document.getElementById('a-vcf');
    if (vcf) vcf.href = fr ? '/scan/vb-safety.vcf' : '/scan/vb-safety-en.vcf';
    document.getElementById('dr-fr').hidden = fr;
    document.getElementById('dr-gb').hidden = !fr;
    document.getElementById('t-lang').textContent = fr ? 'EN' : 'FR';
    document.getElementById('b-lang').setAttribute('aria-label',
      fr ? 'Switch to English' : 'Passer en français');
  }

  function mot(k) { return langue === 'fr' ? FR[k] : (EN[k] || origine[k] || ''); }

  function dire(txt) {
    var l = document.getElementById('lu');
    if (!l) return;
    l.textContent = txt;
    l.classList.add('vu');
    clearTimeout(dire.t);
    dire.t = setTimeout(function () { l.classList.remove('vu'); }, 2400);
  }

  memoriser();
  appliquer();

  document.getElementById('b-lang').addEventListener('click', function () {
    langue = langue === 'fr' ? 'en' : 'fr';
    try { localStorage.setItem(CLE, langue); } catch (e) {}
    appliquer();
  });

  /* ---- Fiche contact ---- */
  var vcf = document.getElementById('a-vcf');
  if (vcf) vcf.addEventListener('click', function () {
    var sp = vcf.querySelector('span'), avant = sp.textContent;
    vcf.classList.add('ok');
    sp.textContent = mot('vcfbt');
    dire(mot('vcfok'));
    setTimeout(function () { vcf.classList.remove('ok'); sp.textContent = avant; }, 3500);
  });

  /* ---- Partage natif, là où il existe ---- */
  var part = document.getElementById('b-partage');
  if (part && navigator.share) {
    part.hidden = false;
    part.addEventListener('click', function () {
      navigator.share({ title: 'VB Safety', url: location.origin + '/scan/' }).catch(function () {});
    });
  }

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
      if (ouvert) return;
      ch.setAttribute('aria-expanded', 'true');
      var pan = document.getElementById(ch.getAttribute('aria-controls'));
      if (pan) { pan.hidden = false; pan.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      if (window.vbsEvt) window.vbsEvt('clic:scan:metier-' + ch.dataset.m);
    });
  });


  /* ---- Lettre d'information : ligne dépliable ---- */
  var bnl = document.getElementById('b-nl');
  if (bnl) bnl.addEventListener('click', function () {
    var corps = document.getElementById('nl-corps');
    var ouvert = bnl.getAttribute('aria-expanded') === 'true';
    bnl.setAttribute('aria-expanded', String(!ouvert));
    corps.hidden = ouvert;
    if (!ouvert) corps.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });

  /* ---- Lettre d'information ---- */
  var f = document.getElementById('nl');
  if (f) f.addEventListener('submit', function (e) {
    e.preventDefault();
    var msg = document.getElementById('nl-msg'), btn = document.getElementById('nl-envoyer');
    function rendre(t, ok) {
      msg.textContent = t;
      msg.className = 'nl-msg' + (ok ? ' ok' : ' err');
      msg.hidden = false;
    }
    var nom = f.elements.nom.value.trim(),
        fonction = f.elements.fonction.value.trim(),
        email = f.elements.email.value.trim();
    if (!nom || !fonction || !email || email.indexOf('@') < 1) {
      rendre(mot('nlchamps'), false);
      (f.querySelector(':invalid') || f.elements.nom).focus();
      return;
    }
    var data = {
      type: 'contact', nom: nom, email: email, organisme: '',
      fonction: fonction.slice(0, 80),
      message: "[Lettre d'information] Inscription depuis /scan · " + fonction.slice(0, 200),
      page: '/scan/', site_web: f.elements.site_web.value
    };
    var sp = btn.querySelector('span'), avant = sp.textContent;
    btn.disabled = true; sp.textContent = '…'; msg.hidden = true;
    fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'omit', body: JSON.stringify(data)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      f.hidden = true;
      rendre(mot('nlok'), true);
      if (window.vbsEvt) window.vbsEvt('envoi:scan-newsletter');
    }).catch(function () {
      rendre(mot('nlerr'), false);
      btn.disabled = false; sp.textContent = avant;
    });
  });

  /* ---- Copie de l'adresse, au cas où mailto ne s'ouvre pas ---- */
  var mail = document.querySelector('a[href^="mailto:"]');
  if (mail) mail.addEventListener('contextmenu', function () {
    if (navigator.clipboard) navigator.clipboard.writeText(EMAIL).then(function () {
      dire(EMAIL + mot('copie'));
    }, function () {});
  });
})();
