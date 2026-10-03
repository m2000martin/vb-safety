// VB Safety · formulaire « Demander une démonstration ou un devis » : envoi à notre serveur (France), sans service tiers.
(function () {
  var f = document.getElementById('devis'); if (!f) return;
  var msg = document.getElementById('dv-msg'), btn = document.getElementById('dv-envoyer');
  var API = 'https://api.vb-safety.com/api/collections/demandes/records';
  function dire(t, ok) { msg.textContent = t; msg.className = 'dv-msg' + (ok ? ' ok' : ' err'); msg.hidden = false; }
  function v(n) { var el = f.elements[n]; return el ? String(el.value || '').trim() : ''; }
  function poster(data) { return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body: JSON.stringify(data) }); }

  // Arrivée depuis l'outil CMR (« Faire avec VB Safety ») : besoin pré-rempli
  var besoin = new URLSearchParams(location.search).get('besoin');
  if (besoin) {
    var ty = f.elements.type_org; if (ty && !ty.value) ty.value = 'Industrie';
    var it = f.querySelector('input[name="interet"][value="Traçabilité CMR industrie et BTP"]'); if (it) it.checked = true;
    var mg = f.elements.message; if (mg && !mg.value) mg.value = 'Je souhaite être accompagné pour : ' + besoin.slice(0, 300);
  }

  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!f.checkValidity()) {
      dire('Merci de compléter les champs obligatoires et de cocher la case en bas du formulaire.', false);
      var first = f.querySelector(':invalid'); if (first) first.focus();
      return;
    }
    var interets = Array.prototype.slice.call(f.querySelectorAll('input[name="interet"]:checked')).map(function (c) { return c.value; });
    var lignes = ['Type : ' + v('type_org'), 'Personnes concernées : ' + (v('effectif') || 'non précisé'), 'Échéance : ' + (v('echeance') || 'non précisée'),
      'Intérêt : ' + (interets.join(', ') || 'non précisé')];
    if (v('telephone')) lignes.push('Téléphone : ' + v('telephone'));
    if (v('message')) lignes.push('', v('message'));
    var data = { type: 'devis', nom: v('nom'), email: v('email'), organisme: v('organisme'), fonction: v('fonction').slice(0, 80), message: lignes.join('\n').slice(0, 2000), page: '/devis/', site_web: v('site_web') };
    btn.disabled = true; var label = btn.firstElementChild.textContent; btn.firstElementChild.textContent = 'Envoi en cours…'; msg.hidden = true;
    try {
      var r = await poster(data);
      // Serveur pas encore mis à jour : le type « devis » n'existe pas, on envoie comme message de contact
      if (r.status === 400) { data.type = 'contact'; data.message = ('[devis] ' + data.message).slice(0, 2000); r = await poster(data); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      f.hidden = true;
      dire('Demande envoyée. Merci, nous revenons vers vous rapidement à ' + data.email + '.', true);
      msg.scrollIntoView({ block: 'center' });
      if (window.vbsEvt) window.vbsEvt('envoi:devis');
    } catch (x) {
      dire('Le serveur ne répond pas pour le moment. Écrivez-nous à contact@vb-safety.com, nous vous répondrons de la même façon.', false);
      btn.disabled = false; btn.firstElementChild.textContent = label;
    }
  });
})();
