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

## Profil administrateur et paramètres · collection `parametres`

L'administrateur règle, pour chaque profil, les pages visibles, les actions autorisées et les
indicateurs ajoutés aux tableaux de bord (catalogue fermé, `cmr-pompier/assets/js/parametres.js`).
Il peut restreindre, jamais élargir : les données d'exposition restent réservées à l'agent et au SSSM.

### Mise en service

Le plus simple : copier `pb_migrations/1791300000_admin_parametres.js` dans le dossier `pb_migrations/`
du serveur et redémarrer PocketBase. La migration fait les trois étapes ci-dessous.
À défaut, à la main :

1. Collection `users` : ajouter la valeur `admin` au champ `role`, puis créer le compte de démonstration
   `ADM-0001` (mot de passe `Demo-Admin-2026`, centre de démonstration).
2. Créer la collection `parametres` (type « base ») :
   - champs : `cle` (texte, unique), `valeur` (JSON) ;
   - règles : liste et lecture `@request.auth.id != ""` ; création et modification
     `@request.auth.role = "admin"` ; suppression : aucune (fermée).
3. Vérifier que les règles des collections d'exposition (`participations`, `prelevements`,
   `signalements`, `documents`, `rendez_vous`) n'accordent rien au rôle `admin`.

Sans la collection `parametres`, l'espace fonctionne avec les réglages d'origine.

### Avant un déploiement réel

Dans l'application, les pages masquées et les actions retirées disparaissent de l'interface et les
adresses directes sont refusées. Pour un SDIS, reproduire ces restrictions dans les règles d'API
PocketBase (création de rapports, relances, validation, référentiel, tenues), afin qu'elles soient
aussi appliquées par le serveur.

## Grandes opérations, relevés réglementaires, formations · `pb_migrations/1791400000_operations_releves.js`

1. Copier le fichier dans `pb_migrations/` du serveur et redémarrer PocketBase : les champs manquants et la
   collection `activites` sont créés (rien n'est supprimé).
2. Vérifier les règles de la collection `documents` : le SSSM doit pouvoir y créer les visas de relevés
   (`type_mesure = "releve_annuel"`, champs `agent`, `annee`, `observations`).
3. Dans le hook EPI (`pb_hooks/epi.js`), lors de la contamination d'une tenue, renseigner `derniere_it`
   avec le numéro de l'intervention, comme le fait la démonstration (`data.js`, `epiContaminer`).
4. Les renforts extérieurs sont des comptes avec le champ `renfort` rempli ; les relèves d'une grande
   opération sont des rapports (`interventions`) rattachés à l'opération, avec `releve`, `secteur`, `origine`, `engin`.
