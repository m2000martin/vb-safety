# Fichiers serveur (PocketBase · api.vb-safety.com)

Ce dossier n'est pas publié par GitHub Pages (dossier commençant par « _ »).
Il contient les fichiers à copier sur le serveur PocketBase de démonstration.

## Assistant du Carnet Expo CMR · `pb_hooks/assistant.pb.js`

Route `POST /api/assistant`, réservée aux utilisateurs connectés. Elle transforme une phrase
(« ouvre mon dernier rapport à compléter ») en une action que le navigateur exécute
(`cmr-pompier/assets/js/assistant.js`).

Ce qui part vers l'API Claude : la phrase, le rôle, la page affichée et la date du jour.
Rien d'autre : aucune donnée d'intervention ni d'exposition. Les messages ne sont pas journalisés.

### Mise en service

1. Copier `pb_hooks/assistant.pb.js` dans le dossier `pb_hooks/` du serveur, à côté de `epi.js`.
2. Définir la clé dans l'environnement du service PocketBase :
   `ANTHROPIC_API_KEY=sk-ant-...`
   (facultatif : `ASSISTANT_MODEL`, défaut `claude-haiku-4-5` ; `ASSISTANT_PAR_HEURE`, défaut 60)
3. Redémarrer PocketBase.
4. Tester : se connecter à la démo, ouvrir l'assistant, taper « mes rapports en retard ».

Écrit pour PocketBase v0.23 ou plus récent (`e.auth`, `e.requestInfo()`, `$apis.requireAuth`).

Tant que la route n'existe pas (réponse 404) ou en aperçu hors ligne, l'assistant utilise
un analyseur local de mots-clés : les commandes courantes fonctionnent sans serveur.

### Coût

Environ 1 500 jetons en entrée et 100 en sortie par demande : 0,2 à 0,3 centime avec Haiku 4.5.
Soit 20 à 30 € pour 10 000 demandes.

### Avant un déploiement réel dans un SDIS

Aucune donnée de santé ne transite par l'assistant, mais la phrase tapée peut contenir un nom.
Vérifier avec le SDIS et le DPO le choix du fournisseur et de la région d'hébergement du modèle.
