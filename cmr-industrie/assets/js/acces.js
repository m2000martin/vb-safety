// Accès à l'outil DUERP : simple barrière d'accès par code, pas une authentification.
// Chargé dans le <head> : sans accès validé, renvoie vers la page de connexion puis revient ici.
(function () {
  try { if (localStorage.getItem('vbs-duerp-acces') === '1') return; } catch (e) { return; }
  document.documentElement.style.visibility = 'hidden';
  location.replace('/cmr-industrie/acces-duerp/?suite=' + encodeURIComponent(location.pathname + location.search + location.hash));
})();
