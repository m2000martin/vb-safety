/// <reference path="../pb_data/types.d.ts" />
// Grandes opérations, relevés réglementaires et activités exposantes hors intervention (PocketBase v0.23 ou plus récent).
// À copier dans le dossier pb_migrations/ du serveur : appliqué automatiquement au redémarrage. Ne modifie que ce qui manque.
//   - users : statut (SPP, SPV, PATS), renfort (colonne extérieure), caserne et groupement ;
//   - operations : grande opération, fin, secteurs ;
//   - interventions : relève, secteur, origine, agrès ;
//   - documents : visa des relevés annuels (agent, année, observations) ;
//   - tenues : dernière intervention ayant contaminé la tenue ;
//   - nouvelle collection « activites » : formations, caissons, manœuvres mousse, nettoyage du matériel.
migrate((app) => {
  function add(colName, field) {
    const c = app.findCollectionByNameOrId(colName);
    if (c.fields.getByName(field.name)) return;
    c.fields.add(field);
    app.save(c);
  }
  add("users", new SelectField({ name: "statut_sp", values: ["SPP", "SPV", "PATS"], maxSelect: 1 }));
  add("users", new TextField({ name: "renfort", max: 160 }));
  add("users", new TextField({ name: "cis", max: 80 }));
  add("users", new SelectField({ name: "groupement", values: ["Nord", "Sud", "Est", "Ouest", "Centre"], maxSelect: 1 }));
  add("operations", new BoolField({ name: "ampleur" }));
  add("operations", new DateField({ name: "date_fin" }));
  add("operations", new JSONField({ name: "secteurs", maxSize: 4000 }));
  add("interventions", new NumberField({ name: "releve", min: 1, onlyInt: true }));
  add("interventions", new TextField({ name: "secteur", max: 80 }));
  add("interventions", new TextField({ name: "origine", max: 160 }));
  add("interventions", new TextField({ name: "engin", max: 20 }));
  add("documents", new TextField({ name: "agent", max: 20 }));
  add("documents", new NumberField({ name: "annee", onlyInt: true }));
  add("documents", new TextField({ name: "observations", max: 2000 }));
  add("tenues", new TextField({ name: "derniere_it", max: 60 }));

  let exists = true;
  try { app.findCollectionByNameOrId("activites"); } catch (e) { exists = false; }
  if (!exists) {
    const users = app.findCollectionByNameOrId("users");
    // Lecture : SSSM, participants et auteur. Écriture : CA/COS et SSSM. Aucun autre profil.
    const read = '@request.auth.role = "sssm" || agents.id ?= @request.auth.id || auteur = @request.auth.id';
    const c = new Collection({
      type: "base", name: "activites",
      listRule: read, viewRule: read,
      createRule: '(@request.auth.role = "cos" || @request.auth.role = "sssm") && @request.body.auteur = @request.auth.id',
      updateRule: 'auteur = @request.auth.id || @request.auth.role = "sssm"',
      deleteRule: 'auteur = @request.auth.id || @request.auth.role = "sssm"',
      fields: [
        { name: "type", type: "select", values: ["caisson", "feu_reel", "brulage", "mousse", "nettoyage", "autre"], maxSelect: 1, required: true },
        { name: "date", type: "date", required: true },
        { name: "duree_min", type: "number", min: 1, onlyInt: true },
        { name: "intitule", type: "text", max: 160 },
        { name: "lieu", type: "text", max: 120 },
        { name: "agents", type: "relation", collectionId: users.id, maxSelect: 60 },
        { name: "auteur", type: "relation", collectionId: users.id, maxSelect: 1 },
        { name: "centre", type: "text", max: 40 },
        { name: "ari", type: "bool" },
        { name: "pfas", type: "bool" },
        { name: "amiante", type: "bool" },
        { name: "decon_type", type: "text", max: 30 },
        { name: "created", type: "autodate", onCreate: true }
      ]
    });
    app.save(c);
  }
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("activites")); } catch (e) {}
});
