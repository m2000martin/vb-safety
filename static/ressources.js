// Inscription « être prévenu des évolutions » : envoi au serveur de VB Safety (France), sans service tiers.
(function () {
  var f = document.getElementById('alerte'); if (!f) return;
  var msg = document.getElementById('alerte-msg');
  f.addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = f.elements.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { msg.textContent = "Vérifiez l'adresse e-mail."; msg.hidden = false; f.elements.email.focus(); return; }
    var btn = f.querySelector('button'); btn.disabled = true;
    try {
      var r = await fetch('https://api.vb-safety.com/api/collections/demandes/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'omit',
        body: JSON.stringify({ type: 'contact', nom: 'Veille réglementaire', organisme: 'Non renseigné', email: email, message: 'Inscription : être prévenu des évolutions (' + document.title + ')', page: location.pathname.slice(0, 80) }) });
      if (!r.ok) throw new Error();
      msg.textContent = 'C\'est noté : nous vous écrirons à ' + email + ' en cas de changement.'; f.reset();
    } catch (x) { msg.textContent = 'Le serveur ne répond pas pour le moment. Écrivez-nous à contact@vb-safety.com.'; }
    msg.hidden = false; btn.disabled = false;
  });
})();
