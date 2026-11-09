/// <reference path="../pb_data/types.d.ts" />
// VB OLD : instance PocketBase séparée de VB CMR (PocketBase v0.23 ou plus récent).
// À copier dans pb_migrations/ de la nouvelle instance : appliqué automatiquement au démarrage.
//   - users : commune, rôle (maire, agent, agglo, admin), nom affiché ;
//   - old_statuts : contrôles terrain (conforme / non conforme / à recontrôler) ;
//   - old_envois : courriers et e-mails envoyés, ton, relance ;
//   - comptes de démonstration (voir README).
// Règle commune à tout : un compte ne voit et n'écrit que les données de SA commune ;
// le rôle « agglo » voit toutes les communes de son intercommunalité (champ agglo identique).
migrate((app) => {
  const users = app.findCollectionByNameOrId("users");
  function add(c, field) { if (!c.fields.getByName(field.name)) c.fields.add(field); }
  add(users, new TextField({ name: "commune", max: 40 }));
  add(users, new TextField({ name: "agglo", max: 40 }));
  add(users, new SelectField({ name: "role", values: ["maire", "agent", "agglo", "admin"], maxSelect: 1 }));
  add(users, new TextField({ name: "nom", max: 80 }));
  // chacun ne lit que son propre compte ; pas d'inscription libre
  users.listRule = "id = @request.auth.id"; users.viewRule = "id = @request.auth.id";
  users.createRule = null; users.updateRule = "id = @request.auth.id"; users.deleteRule = null;
  app.save(users);

  const scope = '(@request.auth.commune = commune || (@request.auth.role = "agglo" && @request.auth.agglo = agglo))';
  const write = '@request.auth.id != "" && @request.body.commune = @request.auth.commune && @request.body.auteur = @request.auth.id';
  const own = '@request.auth.commune = commune && (auteur = @request.auth.id || @request.auth.role = "maire")';
  function coll(name, fields) {
    try { app.findCollectionByNameOrId(name); return; } catch (e) {}
    app.save(new Collection({
      type: "base", name: name, listRule: scope, viewRule: scope, createRule: write, updateRule: own, deleteRule: own,
      fields: fields.concat([
        { name: "commune", type: "text", max: 40, required: true },
        { name: "agglo", type: "text", max: 40 },
        { name: "k", type: "number", onlyInt: true, required: true },
        { name: "adresse", type: "text", max: 200 },
        { name: "auteur", type: "relation", collectionId: users.id, maxSelect: 1 },
        { name: "created", type: "autodate", onCreate: true },
        { name: "updated", type: "autodate", onCreate: true, onUpdate: true }
      ]),
      indexes: ["CREATE INDEX idx_" + name + "_ck ON " + name + " (commune, k)"]
    }));
  }
  coll("old_statuts", [
    { name: "statut", type: "select", values: ["conforme", "non_conforme", "a_recontroler"], maxSelect: 1, required: true },
    { name: "date_controle", type: "date", required: true },
    { name: "controleur", type: "text", max: 80 },
    { name: "commentaire", type: "text", max: 2000 }
  ]);
  coll("old_envois", [
    { name: "canal", type: "select", values: ["courrier", "email", "remise_main"], maxSelect: 1, required: true },
    { name: "ton", type: "select", values: ["bienveillant", "legal", "ferme", "hors_zone", "rappel"], maxSelect: 1, required: true },
    { name: "date_envoi", type: "date", required: true },
    { name: "relance_le", type: "date" },
    { name: "note", type: "text", max: 1000 }
  ]);

  // comptes de démonstration (à supprimer ou changer en production)
  const demo = [
    ["maire.samoreau@demo.vb-safety.com", "Demo-Samoreau-2026", "sam", "capf", "maire", "Mairie de Samoreau"],
    ["agent.samoreau@demo.vb-safety.com", "Demo-Agent-2026", "sam", "capf", "agent", "Agent technique"],
    ["maire.porge@demo.vb-safety.com", "Demo-Porge-2026", "porge", "", "maire", "Mairie du Porge"]
  ];
  for (const [email, pw, commune, agglo, role, nom] of demo) {
    try { app.findAuthRecordByEmail("users", email); continue; } catch (e) {}
    const r = new Record(users);
    r.set("email", email); r.setPassword(pw); r.set("verified", true);
    r.set("commune", commune); r.set("agglo", agglo); r.set("role", role); r.set("nom", nom);
    app.save(r);
  }
}, (app) => {
  for (const n of ["old_statuts", "old_envois"]) { try { app.delete(app.findCollectionByNameOrId(n)); } catch (e) {} }
});
