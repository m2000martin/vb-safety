// Formulaire de demande (accès à la démo, version pour un SDIS, contact).
// S'ouvre depuis tout élément portant data-demande="acces" | "version" | "contact".
// Envoi direct au serveur de VB Safety, sans messagerie ni service tiers.
(function () {
  var API = 'https://api.vb-safety.com/api/collections/demandes/records';
  var TXT = {
    acces: { titre: "Demander un code d'accès", intro: 'Recevez le code pour tester la démonstration avec les quatre profils.', bouton: 'Recevoir un code' },
    version: { titre: 'Une version pour votre SDIS', intro: 'Parlez-nous de votre organisation : nous revenons vers vous pour une présentation et une version adaptée à vos procédures.', bouton: 'Envoyer la demande' },
    contact: { titre: 'Nous contacter', intro: 'Une question sur le Carnet Expo CMR ? Écrivez-nous, nous répondons rapidement.', bouton: 'Envoyer' }
  };
  var FONCTIONS = ['Sapeur-pompier', "Chef d'agrès / COS", 'Chef de centre / commandement', 'SSSM (médecin, infirmier)', 'Direction, prévention, QVT', 'Autre'];

  function build(type) {
    var t = TXT[type] || TXT.contact;
    var dlg = document.createElement('dialog');
    dlg.className = 'req-modal';
    dlg.setAttribute('aria-labelledby', 'req-title');
    dlg.innerHTML =
      '<form class="req-card" novalidate>' +
        '<div class="req-head"><h2 id="req-title">' + t.titre + '</h2><button type="button" class="req-close" aria-label="Fermer">✕</button></div>' +
        '<div class="req-body">' +
          '<p class="req-intro">' + t.intro + '</p>' +
          '<div class="req-grid">' +
            '<div class="field"><label class="label" for="rq-nom">Nom et prénom</label><input class="input" id="rq-nom" name="nom" autocomplete="name" required maxlength="120"></div>' +
            '<div class="field"><label class="label" for="rq-email">E-mail professionnel</label><input class="input" id="rq-email" name="email" type="email" autocomplete="email" required></div>' +
            '<div class="field"><label class="label" for="rq-org">SDIS ou organisme</label><input class="input" id="rq-org" name="organisme" autocomplete="organization" required maxlength="160" placeholder="Ex. SDIS 77"></div>' +
            '<div class="field"><label class="label" for="rq-fct">Fonction</label><select class="input" id="rq-fct" name="fonction"><option value="">Choisir…</option>' + FONCTIONS.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select></div>' +
          '</div>' +
          '<div class="field"><label class="label" for="rq-msg">Message <span class="req-opt">(facultatif)</span></label><textarea class="input" id="rq-msg" name="message" rows="3" maxlength="2000"></textarea></div>' +
          '<div class="req-hp" aria-hidden="true"><label for="rq-site">Ne pas remplir</label><input id="rq-site" name="site_web" tabindex="-1" autocomplete="off"></div>' +
          '<p class="req-err" role="alert" hidden></p>' +
          '<p class="req-legal">Vos informations servent uniquement à répondre à votre demande et ne sont jamais transmises à des tiers. Elles sont conservées 12 mois au plus.</p>' +
        '</div>' +
        '<div class="req-foot"><button type="submit" class="btn btn-primary btn-block">' + t.bouton + '</button></div>' +
      '</form>';
    document.body.appendChild(dlg);
    var form = dlg.querySelector('form'), err = dlg.querySelector('.req-err'), btn = dlg.querySelector('[type=submit]');
    dlg.querySelector('.req-close').onclick = function () { dlg.close(); };
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    dlg.addEventListener('close', function () { dlg.remove(); });

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      err.hidden = true;
      var bad = Array.prototype.find.call(form.querySelectorAll('[required]'), function (i) { return !i.value.trim() || (i.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.value.trim())); });
      form.querySelectorAll('[required]').forEach(function (i) { i.removeAttribute('aria-invalid'); });
      if (bad) { bad.setAttribute('aria-invalid', 'true'); bad.focus(); err.textContent = bad.type === 'email' && bad.value ? "Vérifiez l'adresse e-mail." : 'Merci de remplir les champs obligatoires.'; err.hidden = false; return; }
      var data = { type: type, page: location.pathname.split('/').pop() || 'accueil' };
      ['nom', 'email', 'organisme', 'fonction', 'message', 'site_web'].forEach(function (k) { data[k] = form.elements[k].value.trim(); });
      btn.disabled = true; btn.textContent = 'Envoi…';
      try {
        var r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), credentials: 'omit' });
        if (r.status === 429) throw new Error('Trop de demandes en peu de temps. Réessayez dans une minute.');
        if (!r.ok) throw new Error("L'envoi n'a pas abouti. Vérifiez les champs et réessayez.");
        form.innerHTML = '<div class="req-head"><h2 id="req-title">Merci, c\'est envoyé</h2><button type="button" class="req-close" aria-label="Fermer">✕</button></div>' +
          '<div class="req-body req-done"><span class="req-check" aria-hidden="true">✓</span><p>Nous revenons vers vous rapidement à l\'adresse <b></b>.</p></div>' +
          '<div class="req-foot"><button type="button" class="btn btn-secondary btn-block req-dismiss">Fermer</button></div>';
        form.querySelector('.req-done b').textContent = data.email;
        form.querySelectorAll('.req-close, .req-dismiss').forEach(function (b) { b.onclick = function () { dlg.close(); }; });
      } catch (x) {
        err.textContent = x.message && x.message.indexOf('Failed to fetch') === -1 ? x.message : 'Le serveur ne répond pas pour le moment. Réessayez dans quelques minutes.';
        err.hidden = false; btn.disabled = false; btn.textContent = (TXT[type] || TXT.contact).bouton;
      }
    });
    dlg.showModal();
    dlg.querySelector('#rq-nom').focus();
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-demande]');
    if (!a) return;
    e.preventDefault();
    build(a.getAttribute('data-demande'));
  });
})();
