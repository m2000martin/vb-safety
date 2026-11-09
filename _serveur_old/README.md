# Serveur VB OLD (PocketBase · old-api.vb-safety.com)

Instance PocketBase **séparée** de celle de VB CMR (api.vb-safety.com), sur le même serveur.
Raison : les données des communes et celles des SDIS n'ont pas le même responsable de traitement ;
les séparer simplifie le RGPD et isole les pannes.

Ce dossier n'est pas publié par GitHub Pages (nom commençant par « _ »).

## Ce que stocke le serveur

| Collection | Contenu | Données personnelles |
|---|---|---|
| `users` | comptes mairie / agent / agglomération (commune, rôle, nom affiché) | e-mail et nom des agents |
| `old_statuts` | contrôles terrain : conforme / non conforme / à recontrôler, date, contrôleur, commentaire | adresse de l'habitation |
| `old_envois` | courriers et e-mails : canal, ton, date, relance prévue, note | adresse de l'habitation |

Aucun nom de propriétaire, aucune photo, aucune image : les cartes et fiches restent des fichiers chiffrés côté site.
Un compte ne voit et n'écrit que les données de **sa** commune (règles appliquées par le serveur) ;
le rôle `agglo` lit toutes les communes portant le même code `agglo`.

## Mise en service (≈ 15 min)

1. Télécharger PocketBase (même version que VB CMR, ≥ 0.23) dans un nouveau dossier, ex. `/opt/pb-old/`.
2. Copier `pb_migrations/` de ce dossier dans `/opt/pb-old/pb_migrations/`.
3. Créer un service distinct sur un autre port, ex. 8091 :
   `ExecStart=/opt/pb-old/pocketbase serve --http=127.0.0.1:8091`
   (copier le fichier systemd de VB CMR et changer le dossier, le port et le nom du service).
4. Ajouter dans le proxy (Caddy ou nginx, comme pour api.vb-safety.com) le nom `old-api.vb-safety.com` vers `127.0.0.1:8091`,
   et l'enregistrement DNS correspondant.
5. Démarrer, puis créer le super-administrateur : `/opt/pb-old/pocketbase superuser upsert ADMIN_EMAIL MOT_DE_PASSE`.
6. Dans l'interface d'administration (Settings → Application) : nom « VB OLD », et limiter les origines autorisées (CORS)
   à `https://vb-safety.com` si l'option est disponible dans votre version.
7. Tester : `curl https://old-api.vb-safety.com/api/health`, puis se connecter depuis la démo (onglet Suivi → Connexion).

## Comptes de démonstration (créés par la migration)

| E-mail | Mot de passe | Commune | Rôle |
|---|---|---|---|
| maire.samoreau@demo.vb-safety.com | Demo-Samoreau-2026 | sam | maire |
| agent.samoreau@demo.vb-safety.com | Demo-Agent-2026 | sam | agent |
| maire.porge@demo.vb-safety.com | Demo-Porge-2026 | porge | maire |

À supprimer ou à changer avant toute utilisation réelle.

## Sans serveur

Tant que old-api.vb-safety.com ne répond pas, la démo garde les statuts et envois dans le navigateur (localStorage).
Aucune donnée n'est perdue à l'installation : elle n'est simplement pas partagée entre postes.

## Avant une commune réelle

- Contrat de sous-traitance avec la commune (art. 28 RGPD), registre des traitements, aide à l'AIPD.
- Durée de conservation : statuts et envois supprimés à la fin de la campagne suivante (à automatiser : tâche cron PocketBase).
- Sauvegarde quotidienne du dossier `pb_data/` (chiffrée, hébergée en France ou dans l'UE).
