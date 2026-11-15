/// <reference path="../pb_data/types.d.ts" />
// VB OLD : réponses des habitants envoyées depuis le QR code du courrier.
// Dépôt anonyme (aucun compte), lecture et traitement réservés à la commune.
// Aucune donnée d'identité : référence du courrier, type de réponse, commentaire, photo facultative.
migrate((app) => {
  try { app.findCollectionByNameOrId("old_reponses"); return; } catch (e) {}
  const scope = '(@request.auth.commune = commune || (@request.auth.role = "agglo" && @request.auth.agglo = agglo))';
  app.save(new Collection({
    type: "base", name: "old_reponses",
    listRule: scope, viewRule: scope,
    createRule: '@request.body.traitee != true',
    updateRule: '@request.auth.commune = commune',
    deleteRule: '@request.auth.commune = commune && @request.auth.role = "maire"',
    fields: [
      { name: "commune", type: "text", max: 40, required: true, pattern: "^[a-z0-9_-]+$" },
      { name: "agglo", type: "text", max: 40 },
      { name: "k", type: "number", onlyInt: true, required: true, min: 0 },
      { name: "ref", type: "text", max: 40, required: true, pattern: "^[A-Z0-9-]+$" },
      { name: "type", type: "select", values: ["fait", "erreur", "conseil", "voisin"], maxSelect: 1, required: true },
      { name: "commentaire", type: "text", max: 2000 },
      { name: "date_travaux", type: "date" },
      { name: "photo", type: "file", maxSelect: 1, maxSize: 5242880, mimeTypes: ["image/jpeg", "image/png", "image/webp"], protected: true },
      { name: "traitee", type: "bool" },
      { name: "created", type: "autodate", onCreate: true }
    ],
    indexes: ["CREATE INDEX idx_old_reponses_ck ON old_reponses (commune, k)"]
  }));
}, (app) => {
  try { app.delete(app.findCollectionByNameOrId("old_reponses")); } catch (e) {}
});
