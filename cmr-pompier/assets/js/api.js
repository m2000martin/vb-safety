// Accès à l'API de démonstration (PocketBase sur api.vb-safety.com).
// Toutes les pages de l'outil passent par ce fichier : pour changer de back-end,
// seul ce fichier est à réécrire.
(function (w) {
  var API_BASE = 'https://api.vb-safety.com';
  var KEY = 'vbs-session';

  // Pages d'arrivée par rôle
  var HOME = {
    agent: 'espace.html',
    cos: 'espace.html',
    commandement: 'espace.html',
    sssm: 'espace.html'
  };

  function saveSession(s) { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function getSession() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function clearSession() { try { sessionStorage.removeItem(KEY); } catch (e) {} }

  async function request(path, opts) {
    opts = opts || {};
    var s = getSession();
    var headers = { 'Accept': 'application/json' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    if (s && s.token) headers['Authorization'] = s.token;
    var r = await fetch(API_BASE + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit'
    });
    var data = await r.json().catch(function () { return {}; });
    if (!r.ok) { var err = new Error(data.message || ('HTTP ' + r.status)); err.status = r.status; throw err; }
    return data;
  }

  // Connexion : matricule + mot de passe sur la collection « users »
  async function login(matricule, password, expectedRole) {
    var data = await request('/api/collections/users/auth-with-password', {
      method: 'POST', body: { identity: matricule, password: password }
    });
    var u = data.record || {};
    if (expectedRole && u.role && u.role !== expectedRole) {
      var e = new Error('Rôle inattendu pour ce compte.'); e.status = 403; throw e;
    }
    var session = { token: data.token, id: u.id, role: u.role || expectedRole, name: u.name || '', grade: u.grade || '', matricule: u.matricule || matricule, centre: u.centre || '', offline: false };
    saveSession(session);
    return session;
  }

  // Aperçu hors ligne : utilisé uniquement si le serveur de démo ne répond pas
  function offlinePreview(profile) {
    var session = { token: null, id: null, role: profile.role, name: profile.name, grade: '', matricule: profile.matricule, centre: 'CIS Démo-sur-Marne', offline: true };
    saveSession(session);
    return session;
  }

  function logout() { clearSession(); w.location.href = 'connexion.html'; }

  // À appeler en haut de chaque page protégée
  function requireRole(roles) {
    var s = getSession();
    if (!s || (roles && roles.indexOf(s.role) === -1)) { w.location.replace('connexion.html'); return null; }
    return s;
  }

  w.VBS = { API_BASE: API_BASE, HOME: HOME, request: request, login: login, offlinePreview: offlinePreview, logout: logout, getSession: getSession, requireRole: requireRole };
})(window);
