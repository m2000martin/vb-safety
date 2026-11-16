#!/usr/bin/env python3
"""Génère /llms-full.txt : le texte intégral des pages de référence, en markdown.

llms.txt donne la carte du site ; llms-full.txt donne le contenu lui-même, pour
les moteurs qui le récupèrent plutôt que de parcourir les pages une à une.
Le fichier est produit à partir du HTML publié : il ne peut pas diverger du site.

Usage : python3 _outils/llms_full.py
"""

import html
import os
import re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, "llms-full.txt")

# Les pages qui méritent d'être citées : guides, ressources, pages de secteur.
# Les applications, démonstrations et formulaires n'ont rien à y faire.
PAGES = [
    ("Présentation", ["index.html"]),
    ("Secteurs", ["sapeurs-pompiers/index.html", "industrie/index.html",
                  "collectivites/index.html", "btp/index.html"]),
    ("Produits", ["cmr-pompier/index.html", "cmr-pompier/module-epi.html",
                  "cmr-pompier/securite-donnees.html", "cmr-industrie/index.html",
                  "innovation/index.html"]),
    ("Guides", ["cmr-pompier/sante-sapeurs-pompiers.html"]),
    ("Ressources", ["ressources/hap-sapeurs-pompiers/index.html",
                    "ressources/releve-exposition-sapeur-pompier/index.html",
                    "ressources/decontamination-sapeurs-pompiers/index.html",
                    "ressources/liste-travailleurs-exposes-cmr/index.html",
                    "ressources/obligations-legales-debroussaillement/index.html",
                    "ressources/controle-old-maire/index.html",
                    "ressources/controle-satellite-debroussaillement/index.html",
                    "ressources/anticiper-feu-de-foret-commune/index.html"]),
    ("À propos", ["a-propos/index.html"]),
]

# Blocs à retirer avant conversion : ils se répètent sur chaque page et noient le texte.
RETRAITS = [
    r"<script\b.*?</script>", r"<style\b.*?</style>", r"<!--.*?-->",
    r"<header\b.*?</header>", r"<footer\b.*?</footer>", r"<nav\b.*?</nav>",
    r"<svg\b.*?</svg>", r"<form\b.*?</form>", r"<template\b.*?</template>",
]


def texte(fragment):
    """Rend le texte d'un fragment HTML, en gardant les liens en markdown."""
    f = re.sub(r"<a\b[^>]*href=\"([^\"]+)\"[^>]*>(.*?)</a>", r"[\2](\1)", fragment, flags=re.S)
    f = re.sub(r"<(strong|b)\b[^>]*>(.*?)</\1>", r"**\2**", f, flags=re.S)
    f = re.sub(r"<[^>]+>", " ", f)
    f = html.unescape(f)
    f = f.replace(" ", " ")
    return re.sub(r"[ \t\n]+", " ", f).strip()


def absolu(md):
    """Les liens internes deviennent absolus : le fichier est lu hors contexte."""
    return re.sub(r"\]\(/(?!/)", "](https://vb-safety.com/", md)


def convertir(chemin):
    s = open(os.path.join(RACINE, chemin), encoding="utf-8").read()
    for motif in RETRAITS:
        s = re.sub(motif, " ", s, flags=re.S | re.I)
    corps = re.search(r"<main\b[^>]*>(.*?)</main>", s, re.S)
    s = corps.group(1) if corps else s

    lignes, vus = [], set()
    for m in re.finditer(r"<(h1|h2|h3|h4|p|li|dt|dd|summary|figcaption)\b[^>]*>(.*?)</\1>", s, re.S):
        bal, brut = m.group(1), m.group(2)
        t = texte(brut)
        if not t or len(t) < 2:
            continue
        if bal in ("h1", "h2", "h3", "h4"):
            # Le sur-titre est dans le titre : sans séparateur, les deux phrases se collent.
            t = texte(re.sub(r'(<span[^>]*class="(?:h1-kw|kicker|vo-k)"[^>]*>.*?</span>)\s*',
                             r"\1 — ", brut, flags=re.S))
            niveau = {"h1": "##", "h2": "###", "h3": "####", "h4": "#####"}[bal]
            lignes.append("\n%s %s\n" % (niveau, t))
        elif bal in ("li", "dd"):
            lignes.append("- %s" % t)
        elif bal == "dt":
            lignes.append("\n**%s**" % t)
        elif bal == "summary":
            lignes.append("\n**%s**" % t)
        else:
            if t in vus:            # les chapeaux sont parfois répétés pour le responsive
                continue
            vus.add(t)
            lignes.append(t)
    return absolu("\n".join(lignes))


def date_maj(chemin):
    s = open(os.path.join(RACINE, chemin), encoding="utf-8").read()
    m = re.search(r'"dateModified"\s*:\s*"(\d{4}-\d{2}-\d{2})"', s)
    return m.group(1) if m else ""


def main():
    entete = open(os.path.join(RACINE, "llms.txt"), encoding="utf-8").read().split("\n## ")[0].strip()
    out = [entete, "", "Ce fichier contient le texte intégral des pages de référence de vb-safety.com.",
           "La carte du site se trouve dans https://vb-safety.com/llms.txt.", ""]

    for titre, chemins in PAGES:
        out.append("\n---\n\n# %s\n" % titre)
        for c in chemins:
            if not os.path.exists(os.path.join(RACINE, c)):
                print("absent, ignoré :", c)
                continue
            url = "https://vb-safety.com/" + re.sub(r"index\.html$", "", c)
            d = date_maj(c)
            out.append("\n## Source : %s%s\n" % (url, ("  ·  mise à jour : " + d) if d else ""))
            out.append(convertir(c))

    txt = re.sub(r"\n{3,}", "\n\n", "\n".join(out)).strip() + "\n"
    open(SORTIE, "w", encoding="utf-8").write(txt)
    print("llms-full.txt : %d pages, %d caractères, %d mots"
          % (sum(len(c) for _, c in PAGES), len(txt), len(txt.split())))


if __name__ == "__main__":
    main()
