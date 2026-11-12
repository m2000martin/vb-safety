#!/usr/bin/env python3
"""Réécrit le pied de page partagé (<footer class="pied">) sur tout le site.

Le pied reprend la structure du menu principal — un métier par colonne — au lieu
de répartir un même produit entre « Secteurs », « Ressources » et « Plateforme ».
Les liens juridiques descendent dans la barre du bas, où on les cherche.

    python3 _outils/pied.py
"""
import glob
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def colonne(titre, liens):
    items = "".join(f'<li><a href="{h}"{a}>{t}</a></li>' for h, t, a in liens)
    return f'<div><h2 class="pied-h">{titre}</h2><ul>{items}</ul></div>'


def pied(lang):
    en = lang == "en"
    accueil = "/en/" if en else "/"
    if en:
        accroche = ("Making exposure measurable: carcinogens for fire services and "
                    "industry, natural hazards for local authorities.")
        cols = [
            colonne("Firefighters", [
                ("/en/firefighters/", "Overview", ""),
                ("/cmr-pompier/en/", "Exposure tracking", ""),
                ("/cmr-pompier/en/ppe-module.html", "PPE tracking", ""),
                ("/en/innovation/", "Contamination sensor", ""),
            ]),
            colonne("Industry", [
                ("/en/industry/", "Overview", ""),
                ("/cmr-industrie/en/", "CMR exposure tracking", ""),
                ("/ressources/liste-travailleurs-exposes-cmr/",
                 "Exposed workers list template", ' hreflang="fr"'),
                ("/en/construction/", "Construction sites", ""),
            ]),
            colonne("Local authorities", [
                ("/en/municipalities/", "Overview", ""),
                ("/collectivites/", "Vegetation clearance (OLD)", ' hreflang="fr"'),
                ("/collectivites/cellule-de-crise/", "Crisis unit", ' hreflang="fr"'),
            ]),
            colonne("VB Safety", [
                ("/ressources/", "Resources (in French)", ' hreflang="fr"'),
                ("/en/#contact", "Contact form", ""),
                ("mailto:contact@vb-safety.com", "contact@vb-safety.com", ""),
            ]),
        ]
        bas_g = "© 2026 VB Safety SAS · RCS Paris 109 381 640"
        bas_d = ('<a href="/mentions-legales/" hreflang="fr">Legal notice</a>'
                 '<a href="/confidentialite/" hreflang="fr">Privacy</a>'
                 '<a href="/cgv/" hreflang="fr">Terms of sale</a>')
    else:
        accroche = ("Rendre mesurable l'exposition aux risques : agents cancérogènes "
                    "pour les services de secours et l'industrie, risques naturels "
                    "pour les communes.")
        cols = [
            colonne("Sapeurs-pompiers", [
                ("/sapeurs-pompiers/", "Présentation", ""),
                ("/cmr-pompier/", "Suivi des expositions", ""),
                ("/cmr-pompier/module-epi.html", "Suivi des EPI", ""),
                ("/innovation/#sapeurs-pompiers", "Capteur de contamination", ""),
                ("/ressources/#sapeurs-pompiers", "Ressources", ""),
            ]),
            colonne("Industrie", [
                ("/industrie/", "Présentation", ""),
                ("/cmr-industrie/", "Suivi des expositions CMR", ""),
                ("/cmr-industrie/outil/", "Dossier de preuve CMR", ""),
                ("/ressources/liste-travailleurs-exposes-cmr/",
                 "Modèle de liste des exposés", ""),
                ("/btp/", "Chantiers et BTP", ""),
            ]),
            colonne("Collectivités", [
                ("/collectivites/", "Débroussaillement (OLD)", ""),
                ("/collectivites/cellule-de-crise/", "Cellule de crise", ""),
                ("/ressources/obligations-legales-debroussaillement/",
                 "Obligations de débroussaillement", ""),
                ("/ressources/controle-old-maire/", "Contrôle des OLD", ""),
                ("/ressources/#collectivites", "Ressources", ""),
            ]),
            colonne("VB Safety", [
                ("/a-propos/", "À propos", ""),
                ("/innovation/", "Capteurs en développement", ""),
                ("/devis/", "Démonstration ou devis", ""),
                ("mailto:contact@vb-safety.com", "contact@vb-safety.com", ""),
            ]),
        ]
        bas_g = "© 2026 VB Safety SAS · RCS Paris 109 381 640"
        bas_d = ('<a href="/mentions-legales/">Mentions légales</a>'
                 '<a href="/confidentialite/">Confidentialité</a>'
                 '<a href="/cgv/">CGV</a>'
                 '<a href="/collectivites/conditions/">Conditions de service (communes)</a>')

    marque = (f'<div><a class="marque" href="{accueil}">VB Safety</a>'
              f'<p>{accroche}</p></div>')
    return (
        '<footer class="pied">\n  <div class="wrap">\n    <div class="pied-grille">\n      '
        + marque + "\n      " + "\n      ".join(cols)
        + '\n    </div>\n    <div class="pied-bas"><span>' + bas_g
        + '</span><span class="pied-legal">' + bas_d + "</span></div>\n  </div>\n</footer>"
    )


def main():
    motif = re.compile(r'<footer class="pied">.*?</footer>', re.S)
    fr, en = pied("fr"), pied("en")
    n = 0
    for chemin in sorted(glob.glob(os.path.join(RACINE, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(chemin, RACINE)
        if rel.startswith(("_", "OLD-demo")):
            continue
        s = open(chemin, encoding="utf-8").read()
        if not motif.search(s):
            continue
        anglais = '<html lang="en"' in s or rel.startswith("en/") or "/en/" in rel
        s2 = motif.sub(lambda _: en if anglais else fr, s, count=1)
        if s2 != s:
            open(chemin, "w", encoding="utf-8").write(s2)
            n += 1
    print(f"pied de page réécrit sur {n} pages")


if __name__ == "__main__":
    sys.exit(main())
