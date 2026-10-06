/// <reference path="../pb_data/types.d.ts" />
// Profil administrateur du Carnet Expo CMR (PocketBase v0.23 ou plus récent).
// À copier dans le dossier pb_migrations/ du serveur : appliqué automatiquement au redémarrage.
//   1. ajoute la valeur « admin » au champ role des utilisateurs ;
//   2. crée la collection « parametres » (lecture : tout utilisateur connecté ; écriture : administrateur) ;
//   3. crée le compte de démonstration ADM-0001 dans le même centre que le chef de centre CI-0021.
migrate((app) => {
  // 1. Rôle
  const users = app.findCollectionByNameOrId("users");
  const role = users.fields.getByName("role");
  if (role && Array.isArray(role.values) && role.values.indexOf("admin") === -1) {
    role.values = role.values.concat(["admin"]);
    app.save(users);
  }

  // 2. Collection des paramètres
  let exists = true;
  try { app.findCollectionByNameOrId("parametres"); } catch (e) { exists = false; }
  if (!exists) {
    const c = new Collection({
      type: "base",
      name: "parametres",
      listRule: '@request.auth.id != ""',
      viewRule: '@request.auth.id != ""',
      createRule: '@request.auth.role = "admin"',
      updateRule: '@request.auth.role = "admin"',
      deleteRule: null,
      fields: [
        { name: "cle", type: "text", required: true, max: 40 },
        { name: "valeur", type: "json", maxSize: 200000 }
      ],
      indexes: ["CREATE UNIQUE INDEX idx_parametres_cle ON parametres (cle)"]
    });
    app.save(c);
  }

  // 3. Compte administrateur de démonstration
  let adm = null;
  try { adm = app.findFirstRecordByData("users", "matricule", "ADM-0001"); } catch (e) {}
  if (!adm) {
    const ref = app.findFirstRecordByData("users", "matricule", "CI-0021");
    const r = new Record(users);
    r.set("matricule", "ADM-0001");
    r.set("name", "S. Durand");
    r.set("grade", "Commandant");
    r.set("role", "admin");
    r.set("centre", ref.get("centre"));
    r.set("email", "admin.demo@vb-safety.com");
    r.set("emailVisibility", false);
    r.set("verified", true);
    r.setPassword("Demo-Admin-2026");
    app.save(r);
  }
}, (app) => {
  try { app.delete(app.findFirstRecordByData("users", "matricule", "ADM-0001")); } catch (e) {}
  try { app.delete(app.findCollectionByNameOrId("parametres")); } catch (e) {}
});
