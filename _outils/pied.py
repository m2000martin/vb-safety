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
        accroche = "Making exposure measurable: carcinogens and natural hazards."
        cols = [
            colonne("Firefighters", [
                ("/en/firefighters/", "Overview", ""),
                ("/cmr-pompier/en/", "Exposure tracking", ""),
                ("/cmr-pompier/en/ppe-module.html", "PPE tracking", ""),
            ]),
            colonne("Industry", [
                ("/en/industry/", "Overview", ""),
                ("/cmr-industrie/en/", "CMR exposure tracking", ""),
                ("/ressources/liste-travailleurs-exposes-cmr/",
                 "Exposed workers list template", ' hreflang="fr"'),
            ]),
            colonne("Local authorities", [
                ("/en/municipalities/", "Overview", ""),
                ("/collectivites/", "Vegetation clearance (OLD)", ' hreflang="fr"'),
                ("/collectivites/cellule-de-crise/", "Crisis unit", ' hreflang="fr"'),
            ]),
            colonne("VB Safety", [
                ("/en/innovation/", "Contamination sensors", ""),
                ("/ressources/", "Resources (in French)", ' hreflang="fr"'),
                ("mailto:contact@vb-safety.com", "contact@vb-safety.com", ""),
            ]),
        ]
        bas_g = "© 2026 VB Safety SAS · RCS Paris 109 381 640"
        bas_d = ('<a href="/mentions-legales/" hreflang="fr">Legal notice</a>'
                 '<a href="/confidentialite/" hreflang="fr">Privacy</a>'
                 '<a href="/cgv/" hreflang="fr">Terms of sale</a>'
                 '<a href="/cgu/" hreflang="fr">Terms of use</a>')
    else:
        accroche = ("Rendre mesurable l'exposition aux risques : "
                    "agents cancérogènes et risques naturels.")
        cols = [
            colonne("Sapeurs-pompiers", [
                ("/sapeurs-pompiers/", "Présentation", ""),
                ("/cmr-pompier/", "Suivi des expositions", ""),
                ("/cmr-pompier/module-epi.html", "Suivi des EPI", ""),
            ]),
            colonne("Industrie", [
                ("/industrie/", "Présentation", ""),
                ("/cmr-industrie/", "Suivi des expositions CMR", ""),
                ("/cmr-industrie/outil/", "Dossier de preuve CMR", ""),
            ]),
            colonne("Collectivités", [
                ("/collectivites/", "Débroussaillement (OLD)", ""),
                ("/collectivites/cellule-de-crise/", "Cellule de crise", ""),
                ("/ressources/obligations-legales-debroussaillement/",
                 "Obligations de débroussaillement", ""),
            ]),
            colonne("VB Safety", [
                ("/a-propos/", "À propos", ""),
                ("/innovation/", "Capteurs en développement", ""),
                ("mailto:contact@vb-safety.com", "contact@vb-safety.com", ""),
            ]),
        ]
        bas_g = "© 2026 VB Safety SAS · RCS Paris 109 381 640"
        bas_d = ('<a href="/mentions-legales/">Mentions légales</a>'
                 '<a href="/confidentialite/">Confidentialité</a>'
                 '<a href="/cgv/">CGV</a>'
                 '<a href="/cgu/">CGU</a>'
                 '<a href="/collectivites/conditions/">Conditions de service (communes)</a>')

    marque = (f'<div><a class="marque" href="{accueil}">VB Safety</a>'
              f'<p>{accroche}</p></div>')
    return (
        '<footer class="pied">\n  <div class="wrap">\n    <div class="pied-grille">\n      '
        + marque + "\n      " + "\n      ".join(cols)
        + '\n    </div>\n    <div class="pied-bas"><span>' + bas_g
        + '</span><span class="pied-legal">' + bas_d + "</span></div>\n  </div>\n</footer>"
    )


def pied_accueil(lang):
    """Même contenu, dans le balisage propre à l'accueil (.site-foot).

    L'accueil a sa propre feuille de style : colonnes en .foot-col, liens nus
    plutôt qu'une liste, et liens juridiques en .foot-legal, la règle
    .pied-legal n'étant pas chargée sur cette page.
    """
    en = lang == "en"
    accueil = "/en/" if en else "/"
    src = pied(lang)

    # on récupère l'accroche et les colonnes construites plus haut
    accroche = re.search(r"<p>(.*?)</p>", src, re.S).group(1)
    cols = []
    for bloc in re.findall(r'<div><h2 class="pied-h">(.*?)</h2><ul>(.*?)</ul></div>', src, re.S):
        titre, items = bloc
        liens = re.findall(r"<li>(<a .*?</a>)</li>", items)
        cols.append(f'<div class="foot-col"><h2 class="foot-h">{titre}</h2>'
                    + "".join(liens) + "</div>")
    bas_g = re.search(r'<div class="pied-bas"><span>(.*?)</span>', src).group(1)
    legal = re.search(r'<span class="pied-legal">(.*?)</span>', src, re.S).group(1)

    return (
        '<footer class="site-foot">\n  <div class="section-inner foot-grid">\n'
        f'    <div class="foot-brand"><a class="marque" href="{accueil}">VB Safety</a>'
        f"<p>{accroche}</p></div>\n    "
        + "\n    ".join(cols)
        + '\n  </div>\n  <div class="section-inner foot-bottom">'
        f'<span>{bas_g}</span><span class="foot-legal">{legal}</span></div>\n</footer>'
    )


def main():
    variantes = [
        (re.compile(r'<footer class="pied">.*?</footer>', re.S), pied),
        (re.compile(r'<footer class="site-foot">.*?</footer>', re.S), pied_accueil),
    ]
    rendus = {(m.pattern, l): f(l) for m, f in variantes for l in ("fr", "en")}
    n = 0
    for chemin in sorted(glob.glob(os.path.join(RACINE, "**", "*.html"), recursive=True)):
        rel = os.path.relpath(chemin, RACINE)
        if rel.startswith(("_", "OLD-demo")):
            continue
        s = open(chemin, encoding="utf-8").read()
        anglais = '<html lang="en"' in s or rel.startswith("en/") or "/en/" in rel
        s2 = s
        for motif, _ in variantes:
            if motif.search(s2):
                neuf = rendus[(motif.pattern, "en" if anglais else "fr")]
                s2 = motif.sub(lambda _: neuf, s2, count=1)
        if s2 != s:
            open(chemin, "w", encoding="utf-8").write(s2)
            n += 1
    print(f"pied de page réécrit sur {n} pages")


if __name__ == "__main__":
    sys.exit(main())
