// VB Safety · formulaire « Demander une démonstration ou un devis » : envoi à notre serveur (France), sans service tiers.
(function () {
  var f = document.getElementById('devis'); if (!f) return;
  var msg = document.getElementById('dv-msg'), btn = document.getElementById('dv-envoyer');
  var API = 'https://api.vb-safety.com/api/collections/demandes/records';
  function dire(t, ok) { msg.textContent = t; msg.className = 'dv-msg' + (ok ? ' ok' : ' err'); msg.hidden = false; }
  function v(n) { var el = f.elements[n]; return el ? String(el.value || '').trim() : ''; }
  function poster(data) { return fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit', body: JSON.stringify(data) }); }

  // (collectivités) Arrivée depuis l'outil CMR (« Faire avec VB Safety ») : besoin pré-rempli
  var besoin = new URLSearchParams(location.search).get('besoin');
  if (besoin) {
    var ty = f.elements.type_org; if (ty && !ty.value) ty.value = 'Industrie';
    var it = f.querySelector('input[name="interet"][value="Traçabilité CMR industrie et BTP"]'); if (it) it.checked = true;
    var mg = f.elements.message; if (mg && !mg.value) mg.value = 'Je souhaite être accompagné pour : ' + besoin.slice(0, 300);
  }

  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!f.checkValidity()) {
      dire('Please fill in the required fields and tick the box at the bottom of the form.', false);
      var first = f.querySelector(':invalid'); if (first) first.focus();
      return;
    }
    var interets = Array.prototype.slice.call(f.querySelectorAll('input[name="interet"]:checked')).map(function (c) { return c.value; });
    var lignes = ['[Collectivités, EN] Type : ' + v('type_org'), 'Code postal : ' + (v('effectif') || 'non précisé'),
      'Intérêt : ' + (interets.join(', ') || 'non précisé')];
    if (v('telephone')) lignes.push('Téléphone : ' + v('telephone'));
    if (v('message')) lignes.push('', v('message'));
    var data = { type: 'devis', nom: v('nom'), email: v('email'), organisme: v('organisme'), fonction: v('fonction').slice(0, 80), message: lignes.join('\n').slice(0, 2000), page: '/en/municipalities/request/', site_web: v('site_web') };
    btn.disabled = true; var label = btn.firstElementChild.textContent; btn.firstElementChild.textContent = 'Sending…'; msg.hidden = true;
    try {
      var r = await poster(data);
      // Serveur pas encore mis à jour : le type « devis » n'existe pas, on envoie comme message de contact
      if (r.status === 400) { data.type = 'contact'; data.message = ('[devis] ' + data.message).slice(0, 2000); r = await poster(data); }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      f.hidden = true;
      dire('Request sent. Thank you, we will get back to you shortly at ' + data.email + '.', true);
      msg.scrollIntoView({ block: 'center' });
      if (window.vbsEvt) window.vbsEvt('envoi:devis');
    } catch (x) {
      dire('The server is not responding at the moment. Please write to contact@vb-safety.com and we will reply by e-mail.', false);
      btn.disabled = false; btn.firstElementChild.textContent = label;
    }
  });
})();
