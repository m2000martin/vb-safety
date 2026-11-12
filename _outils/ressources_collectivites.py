#!/usr/bin/env python3
"""Génère les pages Ressources du pôle Collectivités à partir d'une page existante.

Le gabarit (balises de tête fixes, en-tête, navigation, pied, scripts) est repris
d'une page Ressources déjà en ligne : relancer le script après une modification de
la navigation suffit à remettre les nouvelles pages en phase.

    python3 _outils/ressources_collectivites.py
"""
import json
import os
import re
import sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GABARIT = os.path.join(RACINE, "ressources", "hap-sapeurs-pompiers", "index.html")
SITE = "https://vb-safety.com"
MAJ_TEXTE = "12 novembre 2026"
MAJ_ISO = "2026-11-12"


# --------------------------------------------------------------------------- outils
def charpente():
    """Renvoie (lignes de tête réutilisables, avant-main, après-main)."""
    src = open(GABARIT, encoding="utf-8").read()

    tete = re.search(r"<head>(.*?)</head>", src, re.S).group(1)
    garder, jeter = [], (
        "<title>", 'name="description"', 'rel="canonical"',
        'property="og:', 'name="twitter:',
    )
    for ligne in tete.strip().splitlines():
        l = ligne.strip()
        if not l or any(m in l for m in jeter):
            continue
        if l.startswith("<script type=\"application/ld+json\">"):
            # on ne garde que les blocs Organization et WebSite
            if '"@type": "Organization"' in l or '"@type": "WebSite"' in l:
                garder.append(l)
            continue
        garder.append(l)

    avant = src.split('<main id="contenu">')[0] + '<main id="contenu">'
    apres = "</main>" + src.split("</main>", 1)[1]
    return garder, avant, apres


def ld(obj):
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False) + "</script>")


def construire(p, tete_fixe, avant, apres):
    url = f"{SITE}{p['chemin']}"
    desc = p["description"]
    titre_court = p["titre_court"]

    tete = [
        f"<title>{p['titre']} · VB Safety</title>",
        f'<meta name="description" content="{desc}">',
        f'<link rel="canonical" href="{url}">',
        '<meta property="og:type" content="article">',
        '<meta property="og:site_name" content="VB Safety">',
        '<meta property="og:locale" content="fr_FR">',
        f'<meta property="og:title" content="{p["titre"]}">',
        f'<meta property="og:description" content="{desc}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{SITE}{p["image"]}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
    ] + tete_fixe + [
        ld({"@context": "https://schema.org", "@type": "Article",
            "headline": p["titre"], "description": desc, "url": url,
            "inLanguage": "fr-FR", "datePublished": MAJ_ISO, "dateModified": MAJ_ISO,
            "author": {"@id": f"{SITE}/#organisation"},
            "publisher": {"@id": f"{SITE}/#organisation"},
            "isAccessibleForFree": True, "image": f"{SITE}{p['image']}"}),
        ld({"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Accueil", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": "Ressources",
                 "item": f"{SITE}/ressources/"},
                {"@type": "ListItem", "position": 3, "name": titre_court, "item": url}]}),
        ld({"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": r}}
                           for q, r in p["faq"]]}),
    ]

    ariane = ('<nav class="ariane" aria-label="Fil d\'Ariane"><a href="/">Accueil</a>'
              '<span aria-hidden="true">/</span><a href="/ressources/">Ressources</a>'
              f'<span aria-hidden="true">/</span><span aria-current="page">{titre_court}</span></nav>')
    hero = ('<section class="hero"><div class="wrap"><div>' + ariane
            + f'<span class="kicker">{p["kicker"]}</span><h1>{p["titre"]}</h1>'
            '<div class="trait" aria-hidden="true"></div>'
            f'<p class="chapeau">{p["chapeau"]}</p>'
            f'<span class="maj">Mis à jour le {MAJ_TEXTE}</span></div></div></section>')

    faq_html = "".join(f"<h3>{q}</h3><p>{r}</p>" for q, r in p["faq"])
    sources = "".join(
        f'<li><a href="{u}" rel="noopener">{t}</a></li>' for t, u in p["sources"])

    corps = (
        hero
        + '<section class="sec"><div class="wrap">\n<div class="prose">\n'
        + p["corps"]
        + "</div>\n"
        + '<div class="sec-tete" style="margin-top:56px"><span class="kicker">Questions fréquentes</span>'
        '<h2 class="titre">En bref</h2></div>\n'
        + f'<div class="prose">{faq_html}</div>\n'
        + f'<div class="prose" style="margin-top:40px" id="sources"><h2>Sources</h2><ol>{sources}</ol>\n'
        + f'<p>{p["avertissement"]}</p></div>\n'
        + f'<p class="plus">{p["plus"]}</p>\n'
        + "</div></section>\n"
    )

    page = avant + "\n" + corps + apres
    page = page.replace('<head>\n' + "", "<head>\n")
    # remplacer la tête du gabarit par la nôtre
    page = re.sub(r"<head>.*?</head>", "<head>\n" + "\n".join(tete) + "\n</head>",
                  page, count=1, flags=re.S)
    # ces pages appartiennent au pôle Collectivités
    page = page.replace('<span class="marque-sub">Sapeur-pompier</span>',
                        '<span class="marque-sub">Collectivités</span>')
    return page


# --------------------------------------------------------------------------- pages
PAGES = []

# ---------------------------------------------------------------- 1. guide OLD
PAGES.append({
    "chemin": "/ressources/obligations-legales-debroussaillement/",
    "titre": "Obligations légales de débroussaillement (OLD) : ce que dit la loi",
    "titre_court": "Obligations légales de débroussaillement",
    "description": "Qui doit débroussailler, sur quelle distance, ce que « débroussailler » veut dire au sens du code forestier, les sanctions encourues et le rôle du maire.",
    "image": "/static/og/ressources.png",
    "kicker": "Guide · 9 min",
    "chapeau": "Le débroussaillement n'est pas un conseil d'entretien : c'est une obligation du code forestier, à la charge du propriétaire, contrôlée par le maire et sanctionnée. Voici qui est concerné, sur quelle profondeur, et ce qui se passe quand ce n'est pas fait.",
    "corps": """
<h2>L'essentiel</h2>
<ul>
<li><strong>C'est le propriétaire du bâtiment qui doit débroussailler</strong>, y compris sur le terrain du voisin lorsque la zone des 50 mètres déborde chez lui.</li>
<li><strong>La profondeur de référence est de 50 mètres</strong> autour des constructions, portée jusqu'à 100 mètres par arrêté du maire ou du préfet, et 10 mètres de part et d'autre des voies privées d'accès.</li>
<li><strong>Débroussailler n'est pas raser.</strong> Le code forestier demande de réduire la masse de végétation et de créer des ruptures, pas de couper les arbres ni de défricher.</li>
<li><strong>Les sanctions sont réelles</strong> : contravention, amende administrative pouvant atteindre 50 € par mètre carré non débroussaillé, travaux exécutés d'office aux frais du propriétaire, et franchise d'assurance possible en cas de sinistre.</li>
</ul>

<h2>Qui est concerné</h2>
<p>Les obligations légales de débroussaillement, les OLD, s'appliquent dans les territoires particulièrement exposés au risque d'incendie. Elles visent toutes les constructions, chantiers et installations situés à l'intérieur d'un massif forestier, d'une lande, d'un maquis ou d'une garrigue classés, <strong>ou à moins de 200 mètres de leur lisière</strong>.</p>
<p>Cette distance de 200 mètres est la plus mal comprise. Elle ne définit pas ce qu'il faut débroussailler, mais qui est soumis à l'obligation. Une maison située à 180 mètres d'un massif est concernée, même si aucun arbre ne se trouve sur sa parcelle. Le zonage applicable est arrêté au niveau départemental ; la carte informative publiée sur Géoportail et la fiche OLD de la préfecture donnent la règle locale, qui prime sur toute généralité.</p>
<p>La responsabilité pèse sur le propriétaire de la construction. Un locataire peut réaliser les travaux si le bail le prévoit, mais cela ne décharge pas le propriétaire de sa responsabilité pénale.</p>

<h2>Sur quelle distance</h2>
<ul>
<li><strong>50 mètres au minimum</strong> autour des habitations, bâtiments et installations de toute nature. C'est le régime de droit commun.</li>
<li><strong>Jusqu'à 100 mètres</strong> lorsque le maire le décide par arrêté motivé, ou le préfet. Cette extension est fréquente dans les communes les plus exposées : il faut donc toujours vérifier l'arrêté local plutôt que de s'en tenir aux 50 mètres.</li>
<li><strong>10 mètres de part et d'autre</strong> des voies privées donnant accès à la construction, pour que les engins de secours puissent passer et, surtout, ressortir.</li>
</ul>
<p>Le périmètre se mesure depuis le bâtiment, pas depuis la limite de propriété. C'est ce qui explique que l'obligation déborde si souvent chez le voisin.</p>

<h2>Ce que « débroussailler » veut dire</h2>
<p>Le terme a un sens juridique précis, et il est plus souple que ce que redoutent la plupart des propriétaires. Il s'agit de <strong>diminuer l'intensité et limiter la propagation des incendies</strong> en réduisant la masse de végétation et en créant des discontinuités : couper les herbes et les broussailles, éliminer les arbustes sous les arbres, espacer les houppiers, élaguer les branches basses, supprimer les bois morts et évacuer les rémanents.</p>
<p>Ce n'est ni une coupe rase, ni un défrichement, qui sont d'ailleurs soumis à d'autres autorisations. Les arbres restent, les règles locales fixent simplement les distances entre houppiers et la hauteur d'élagage. L'entretien se maintient dans le temps : un terrain débroussaillé une fois ne l'est plus deux ans après.</p>
<p>Les gros travaux se font de préférence en automne et en hiver, hors période de nidification et hors risque d'étincelle.</p>

<h2>Quand le débroussaillement déborde chez le voisin</h2>
<p>C'est la situation la plus conflictuelle, et la procédure est précise. Le propriétaire soumis à l'obligation doit informer le voisin <strong>par lettre recommandée avec accusé de réception</strong>, en décrivant les travaux qu'il compte réaliser sur sa parcelle.</p>
<p>Si le voisin refuse l'accès, ou ne répond pas dans le délai d'un mois, <strong>la charge des travaux lui est transférée</strong> : il en devient responsable, et le propriétaire initial doit en informer le maire. Garder la trace de ces échanges n'est pas une précaution de confort : c'est ce qui détermine qui sera poursuivi en cas de contrôle.</p>

<h2>Ce que risque un propriétaire qui ne débroussaille pas</h2>
<ul>
<li><strong>Sanction pénale</strong> : contravention de 5<sup>e</sup> classe, jusqu'à 1 500 €. Le tribunal peut assortir sa décision d'une injonction de faire sous astreinte, de 50 à 100 € par jour et par hectare.</li>
<li><strong>Amende administrative</strong> : le préfet peut infliger une amende pouvant atteindre <strong>50 € par mètre carré non débroussaillé</strong>. Sur une zone de quelques centaines de mètres carrés, le montant dépasse rapidement celui des travaux.</li>
<li><strong>Exécution d'office</strong> : après mise en demeure restée sans effet, la commune fait réaliser les travaux et émet un titre de perception à l'encontre du propriétaire.</li>
<li><strong>Assurance</strong> : en cas de sinistre, l'assureur peut appliquer une franchise majorée lorsque l'obligation n'était pas respectée.</li>
</ul>

<h2>Qui contrôle</h2>
<p>Le contrôle des OLD autour des constructions relève du <strong>maire</strong>, au titre de ses pouvoirs de police spéciale. Il peut contrôler lui-même ou mandater des agents assermentés, et le contrôle peut s'effectuer depuis la voie publique. Depuis la loi du 10 juillet 2023, le préavis d'un mois avant contrôle n'est plus exigé.</p>
<p>Le contrôle des <strong>infrastructures linéaires</strong> — routes, voies ferrées, lignes électriques — relève du préfet. Et si le maire n'exerce pas ses pouvoirs, le préfet peut se substituer à lui après mise en demeure.</p>

<h2>Depuis 2025, l'information de l'acheteur et du locataire</h2>
<p>Depuis le 1<sup>er</sup> janvier 2025, un bien situé dans une zone soumise aux OLD doit être signalé comme tel à l'acquéreur ou au locataire, <strong>dès l'annonce immobilière</strong> et dans l'état des risques et pollutions. L'obligation suit donc désormais la transaction, ce qui la rend visible pour des propriétaires qui l'ignoraient.</p>
""",
    "faq": [
        ("Le débroussaillement est-il obligatoire partout en France ?",
         "Non. Il s'applique dans les territoires classés particulièrement exposés au risque d'incendie, pour les constructions situées dans un massif forestier, une lande, un maquis ou une garrigue, ou à moins de 200 mètres de leur lisière. Le zonage est arrêté au niveau départemental."),
        ("Faut-il débroussailler 50 ou 200 mètres ?",
         "Les deux chiffres ne désignent pas la même chose. Les 200 mètres déterminent si vous êtes soumis à l'obligation ; les 50 mètres, portés jusqu'à 100 mètres par arrêté du maire ou du préfet, correspondent à la profondeur à traiter autour du bâtiment."),
        ("Dois-je débroussailler chez mon voisin ?",
         "Oui si la zone des 50 mètres autour de votre maison déborde sur sa parcelle. Vous devez l'en informer par lettre recommandée avec accusé de réception. S'il refuse ou ne répond pas sous un mois, la charge des travaux lui est transférée et vous devez en informer le maire."),
        ("Débroussailler, est-ce couper mes arbres ?",
         "Non. Il s'agit de réduire la masse de végétation et de créer des ruptures : herbes, broussailles, arbustes sous les arbres, branches basses, bois morts. Ce n'est ni une coupe rase ni un défrichement, et les arbres sont conservés en respectant les distances fixées localement."),
        ("Quelle amende en cas de non-respect des OLD ?",
         "Une contravention de 5e classe pouvant aller jusqu'à 1 500 €, et une amende administrative pouvant atteindre 50 € par mètre carré non débroussaillé. S'y ajoutent l'exécution d'office des travaux aux frais du propriétaire et, en cas de sinistre, une possible franchise d'assurance."),
        ("Qui vérifie que le débroussaillement est fait ?",
         "Le maire, au titre de sa police spéciale, pour les constructions de sa commune ; le préfet pour les infrastructures linéaires. Le contrôle peut se faire depuis la voie publique et, depuis la loi du 10 juillet 2023, sans préavis d'un mois."),
    ],
    "sources": [
        ("Géorisques, « Obligations légales de débroussaillement (OLD) », ministère de la Transition écologique",
         "https://www.georisques.gouv.fr/me-preparer-me-proteger/OLD-obligations-legales-de-debroussaillement"),
        ("Fédération nationale des Communes forestières, « FAQ maires – les obligations légales de débroussaillement », 2024",
         "https://www.communesforestieresfrance.fr/docs/library/faq-maires-old-2024.pdf"),
        ("ONF, « Foire aux questions : les obligations légales de débroussaillement »",
         "https://www.onf.fr/vivre-la-foret/enjeux-foret/feux-foret/+/1525::foire-aux-questions-faq-les-obligations-legales-de-debroussaillement-old.html"),
        ("Banque des Territoires, « Les obligations légales de débroussaillement : le cadre juridique »",
         "https://www.banquedesterritoires.fr/les-obligations-legales-de-debroussaillement-le-cadre-juridique"),
    ],
    "avertissement": "Cette page présente le cadre national. Les distances, les essences et les modalités sont précisées par arrêté préfectoral : la fiche OLD de votre département fait foi.",
    "plus": 'Pour aller plus loin : <a href="/ressources/controle-old-maire/">la procédure de contrôle du maire</a> · <a href="/ressources/controle-satellite-debroussaillement/">contrôler le débroussaillement par imagerie</a> · <a href="/collectivites/">VB OLD pour les communes</a>.',
})

# ------------------------------------------------------- 2. contrôle par le maire
PAGES.append({
    "chemin": "/ressources/controle-old-maire/",
    "titre": "Contrôle des OLD : la procédure du maire, étape par étape",
    "titre_court": "Contrôle des OLD par le maire",
    "description": "Information, contrôle, mise en demeure, amende, exécution d'office : la procédure complète de contrôle du débroussaillement, la responsabilité du maire et les difficultés pratiques.",
    "image": "/static/og/ressources.png",
    "kicker": "Guide · 8 min",
    "chapeau": "Contrôler les obligations de débroussaillement est une police spéciale du maire, et son absence a déjà été qualifiée de faute lourde par le juge administratif. Voici la procédure, les délais à tenir et les quatre obstacles que rencontrent les communes.",
    "corps": """
<h2>L'essentiel</h2>
<ul>
<li><strong>Le contrôle des OLD est une compétence propre du maire</strong> et ne peut pas être déléguée à une autre collectivité, même si sa mise en œuvre peut être mutualisée.</li>
<li><strong>Ne pas l'exercer engage la commune.</strong> Le juge administratif a qualifié de faute lourde l'absence de mise en œuvre de cette police, avec indemnisation à la clé après un incendie évitable.</li>
<li><strong>La procédure est graduée</strong> : information, contrôle, mise en demeure par arrêté individuel, amende administrative prononcée par le préfet, puis exécution d'office aux frais du propriétaire.</li>
<li><strong>Le calendrier est contraignant.</strong> Pour que des travaux d'office soient réalisés avant la saison des feux, les mises en demeure doivent partir plusieurs mois à l'avance.</li>
</ul>

<h2>Ce que la loi met à la charge du maire</h2>
<p>Le maire contrôle l'exécution des obligations de débroussaillement autour des habitations, constructions, chantiers et installations de sa commune. Il peut procéder lui-même aux contrôles ou mandater des agents assermentés, et déléguer une partie de ses fonctions à ses adjoints.</p>
<p>Trois limites méritent d'être connues. La compétence <strong>ne peut pas être transférée à une intercommunalité</strong>, même si la mise en œuvre peut être mutualisée avec la police municipale ou des gardes champêtres. Les pouvoirs du maire <strong>s'arrêtent aux limites de la commune</strong>, ce qui impose une concertation entre maires voisins lorsqu'une zone de 50 mètres franchit la frontière communale. Enfin, le contrôle des <strong>infrastructures linéaires</strong> — routes, voies ferrées, lignes électriques — relève du préfet, pas du maire.</p>
<p>En cas de carence, le préfet peut se substituer au maire après une mise en demeure restée sans effet.</p>

<h2>La procédure, étape par étape</h2>
<h3>1. Informer</h3>
<p>Avant de contrôler, la commune informe ses administrés du périmètre applicable et de ce qu'il recouvre. Les services forestiers de la DDT et les cartes de Géoportail servent de base. Les périmètres ont vocation à figurer en annexe du plan local d'urbanisme. Depuis 2025, vendeurs et bailleurs doivent par ailleurs informer acquéreurs et locataires.</p>
<h3>2. Contrôler</h3>
<p>Depuis la loi du 10 juillet 2023, <strong>le préavis d'un mois n'est plus exigé</strong>. Le contrôle peut s'effectuer depuis la voie publique ; l'accès à une propriété close suit une procédure particulière. Si le propriétaire est absent, une notification est laissée sur place ou envoyée en recommandé avec accusé de réception, avec un délai pour une nouvelle visite. Si le propriétaire est inconnu, la notification est affichée en mairie.</p>
<h3>3. Mettre en demeure</h3>
<p>Le maire fixe par arrêté individuel un délai de réalisation des travaux. C'est également par arrêté motivé qu'il peut porter la profondeur à débroussailler jusqu'à 100 mètres autour des habitations.</p>
<h3>4. Faire sanctionner</h3>
<p>En cas d'inexécution, le maire saisit le préfet, qui peut prononcer une amende administrative pouvant atteindre <strong>50 € par mètre carré non débroussaillé</strong>. Le préfet peut également agir sans saisine préalable. Au pénal, le tribunal peut ajouter une injonction assortie d'une astreinte de 50 à 100 € par jour et par hectare.</p>
<h3>5. Exécuter d'office</h3>
<p>Après mise en demeure et constat de non-exécution, la commune peut faire réaliser les travaux <strong>aux frais du propriétaire</strong>, qui reçoit un titre de perception. Si le terrain est clos et que le propriétaire s'y oppose, l'accord du juge des libertés et de la détention est nécessaire. La pratique recommandée consiste à prévenir par recommandé une dizaine de jours avant, à dresser un état des lieux avant et après travaux, et à prendre un arrêté récapitulant travaux et frais.</p>
<h3>6. Ou mutualiser</h3>
<p>Avec l'accord des propriétaires, la commune peut organiser elle-même les travaux et se faire rembourser. C'est souvent plus rapide et moins conflictuel que la voie contentieuse, en particulier dans les lotissements où les parcelles se ressemblent.</p>

<h2>Ce que risque la commune si rien n'est fait</h2>
<p>La jurisprudence administrative considère que <strong>l'absence de mise en œuvre de la police des OLD constitue une faute lourde</strong>, susceptible d'obliger la commune à indemniser des propriétaires lorsqu'un incendie aurait pu être évité. La responsabilité pénale du maire peut par ailleurs être recherchée pour mise en danger d'autrui, à des conditions strictes. La commune, en tant que personne morale, n'est pas pénalement responsable dans ce cadre.</p>
<p>Autrement dit, le risque n'est pas de mal contrôler : il est de ne pas contrôler du tout, et de ne pas pouvoir démontrer le contraire. D'où l'importance de dater et de conserver chaque constat, chaque courrier et chaque relance.</p>

<h2>Les quatre difficultés que signalent les communes</h2>
<ul>
<li><strong>Recenser les parcelles concernées.</strong> Les zones de 50 mètres se chevauchent d'une maison à l'autre et produisent un périmètre morcelé, difficile à cartographier sans système d'information géographique.</li>
<li><strong>Identifier les propriétaires.</strong> La recherche passe par le cadastre et le fichier immobilier de la DGFiP. Lorsque le propriétaire reste introuvable, aucune procédure spécifique n'est prévue ; les solutions existantes, comme le régime des biens sans maître, sont longues. En indivision, le procès-verbal vise tous les indivisaires connus.</li>
<li><strong>Financer.</strong> Il n'existe pas d'aide publique pour les particuliers, les frais engagés d'office ne sont pas récupérés si le propriétaire est insolvable, et ces dépenses ne sont pas éligibles au FCTVA.</li>
<li><strong>Tenir la trace.</strong> Un registre des transferts de responsabilité est recommandé, puisqu'un voisin qui refuse l'accès ou ne répond pas dans le mois devient lui-même responsable des travaux.</li>
</ul>

<h2>Le calendrier, à rebours de la saison des feux</h2>
<p>Un travail d'office ne s'improvise pas en juin. En remontant depuis l'été : les travaux doivent être faits avant la saison, donc l'entreprise doit être commandée au printemps, donc le constat de non-exécution doit être dressé en fin d'hiver, donc la mise en demeure doit partir en automne, donc le contrôle doit avoir eu lieu à la fin de l'été précédent. <strong>Une commune qui commence à contrôler au printemps ne pourra rien exécuter d'office la même année.</strong></p>
""",
    "faq": [
        ("Le contrôle des OLD peut-il être confié à la communauté de communes ?",
         "Non. C'est une police spéciale du maire, qui ne peut pas être déléguée à une autre collectivité. En revanche, sa mise en œuvre peut être mutualisée, par exemple avec une police municipale pluricommunale ou des gardes champêtres."),
        ("Faut-il prévenir le propriétaire avant de contrôler ?",
         "Depuis la loi du 10 juillet 2023, le préavis d'un mois n'est plus exigé. Le contrôle peut se faire depuis la voie publique. Si le propriétaire est absent, une notification est laissée sur place ou envoyée en recommandé avec accusé de réception."),
        ("Que peut faire la commune si le propriétaire ne fait rien ?",
         "Après mise en demeure par arrêté individuel et constat de non-exécution, la commune peut faire réaliser les travaux d'office aux frais du propriétaire et émettre un titre de perception. Le maire peut aussi saisir le préfet, qui prononce une amende administrative."),
        ("Que se passe-t-il si le maire ne contrôle pas ?",
         "Le préfet peut se substituer à lui après mise en demeure. Par ailleurs, le juge administratif a qualifié de faute lourde l'absence de mise en œuvre de cette police, ce qui peut conduire la commune à indemniser des propriétaires après un incendie évitable."),
        ("Comment identifier le propriétaire d'une parcelle non débroussaillée ?",
         "Par le cadastre et le fichier immobilier de la DGFiP. Lorsque le propriétaire reste inconnu, aucune procédure spécifique n'est prévue par la réglementation ; le régime des biens sans maître est une piste, mais il est long à mettre en œuvre."),
        ("Quand faut-il lancer les contrôles dans l'année ?",
         "Dès la fin de l'été précédent si la commune veut pouvoir exécuter des travaux d'office avant la saison suivante : mise en demeure en automne, constat de non-exécution en fin d'hiver, travaux au printemps."),
    ],
    "sources": [
        ("Fédération nationale des Communes forestières, « FAQ maires – les obligations légales de débroussaillement », 2024",
         "https://www.communesforestieresfrance.fr/docs/library/faq-maires-old-2024.pdf"),
        ("Observatoire de la forêt méditerranéenne, « Faire exécuter les OLD » (fiche technique)",
         "https://ofme.org/debroussaillement/documents/FicheOLDFaireExecuter_06_web.pdf"),
        ("Banque des Territoires, « Les obligations légales de débroussaillement : le cadre juridique »",
         "https://www.banquedesterritoires.fr/les-obligations-legales-de-debroussaillement-le-cadre-juridique"),
        ("Géorisques, « Obligations légales de débroussaillement (OLD) »",
         "https://www.georisques.gouv.fr/me-preparer-me-proteger/OLD-obligations-legales-de-debroussaillement"),
    ],
    "avertissement": "Cette page décrit le cadre national et ne remplace ni la fiche OLD de votre préfecture, ni l'avis du service forestier de la DDT.",
    "plus": 'Pour aller plus loin : <a href="/ressources/obligations-legales-debroussaillement/">le cadre légal des OLD</a> · <a href="/ressources/controle-satellite-debroussaillement/">contrôler par imagerie</a> · <a href="/collectivites/">VB OLD : constat maison par maison et suivi des courriers</a>.',
})

# ------------------------------------------------- 3. contrôle par télédétection
PAGES.append({
    "chemin": "/ressources/controle-satellite-debroussaillement/",
    "titre": "Contrôler le débroussaillement par imagerie : satellite, avion, LiDAR",
    "titre_court": "Contrôle du débroussaillement par imagerie",
    "description": "Ce que l'imagerie satellite, les photos aériennes et le LiDAR permettent de voir du débroussaillement d'une commune, ce qu'ils ne permettent pas, et la valeur juridique d'un constat par image.",
    "image": "/static/og/ressources.png",
    "kicker": "Guide · 7 min",
    "chapeau": "Une commune de mille maisons ne peut pas être contrôlée à pied chaque année. L'imagerie permet de savoir où regarder en priorité — à condition de savoir ce qu'elle montre réellement, et ce qu'elle ne remplacera jamais.",
    "corps": """
<h2>L'essentiel</h2>
<ul>
<li><strong>L'imagerie priorise, elle ne constate pas.</strong> Elle indique quelles maisons méritent une visite ; le procès-verbal, lui, repose sur un contrôle de terrain.</li>
<li><strong>Le LiDAR est plus utile que le satellite</strong> pour les OLD, parce qu'il mesure la structure verticale de la végétation et voit la strate basse sous les arbres, qui est précisément celle qui propage le feu.</li>
<li><strong>La date de la donnée est le premier critère de qualité.</strong> Un relevé de trois ans dit où le problème était, pas où il est.</li>
<li><strong>L'intérêt principal n'est pas la détection, c'est l'inventaire.</strong> Savoir combien de maisons sont concernées et lesquelles, c'est ce qui manque à la plupart des communes avant même de parler de contrôle.</li>
</ul>

<h2>Ce que chaque source permet de voir</h2>
<h3>L'image satellite</h3>
<p>Les satellites d'observation à très haute résolution descendent aujourd'hui autour de 50 centimètres par pixel. C'est suffisant pour distinguer une parcelle entretenue d'une parcelle en friche, pour repérer un couvert continu et pour suivre une évolution d'une année sur l'autre. Ce n'est pas suffisant pour juger de la hauteur d'une strate arbustive ni de la distance entre houppiers, qui sont des critères réglementaires. L'avantage du satellite est la fraîcheur : une acquisition peut être programmée.</p>
<h3>La photographie aérienne</h3>
<p>Les orthophotographies de l'IGN descendent à 20 centimètres par pixel et couvrent tout le territoire, gratuitement. La lecture est bien plus confortable qu'en satellite, et l'historique permet de comparer plusieurs millésimes. En contrepartie, le rafraîchissement d'un département prend plusieurs années : la donnée disponible a souvent deux à quatre ans.</p>
<h3>Le LiDAR</h3>
<p>C'est la source la plus pertinente pour le débroussaillement, et la moins connue des élus. Un relevé LiDAR aéroporté mesure la distance au sol par retours laser successifs, ce qui restitue la végétation <strong>en trois dimensions</strong> : hauteur de la strate basse, présence de broussailles sous les arbres, continuité verticale entre le sol et les houppiers. Or c'est exactement ce que vise la réglementation — un sol propre sous des arbres espacés — et c'est invisible sur une photo vue du dessus, où le couvert masque tout. Le programme LiDAR HD de l'IGN couvre progressivement le territoire et les données sont publiques.</p>

<h2>Ce que l'imagerie ne permet pas</h2>
<ul>
<li><strong>Dresser un constat opposable.</strong> Le procès-verbal suppose un contrôle effectué par le maire ou un agent assermenté. Une analyse d'image est une aide à la décision, pas un acte de police.</li>
<li><strong>Dater finement.</strong> Un propriétaire qui a débroussaillé le mois dernier apparaîtra en défaut sur une donnée plus ancienne. C'est la première objection que vous recevrez, et elle est légitime.</li>
<li><strong>Voir sous un couvert très dense</strong> en imagerie optique. Le LiDAR réduit fortement ce problème sans l'éliminer.</li>
<li><strong>Juger tous les critères.</strong> Essences, bois morts au sol, élagage précis, état des rémanents : certains points ne se vérifient que sur place.</li>
</ul>

<h2>Ce que ça change concrètement pour une commune</h2>
<p>Le gain n'est pas de remplacer les contrôles, c'est de les ordonner. Une commune qui dispose d'un classement de ses maisons par priorité peut concentrer ses visites là où l'écart à la règle est le plus net et le plus exposé, au lieu de parcourir des quartiers au hasard ou de traiter les seules plaintes reçues.</p>
<p>Trois effets concrets :</p>
<ul>
<li><strong>Un inventaire.</strong> Combien de constructions sont soumises aux OLD dans la commune, et où se trouvent les zones de 50 mètres qui se chevauchent — cartographie qu'il est très difficile de produire à la main.</li>
<li><strong>Un ordre de passage.</strong> Les agents partent avec une liste, pas avec une intuition.</li>
<li><strong>Une trace datée.</strong> L'état de la végétation à une date donnée, conservé, qui documente le travail de la commune et permet de montrer l'évolution d'une année sur l'autre.</li>
</ul>

<h2>Prévention plutôt que répression</h2>
<p>Une remarque de méthode, qui décide souvent de l'accueil fait à ce type d'outil. Présenté comme un moyen de verbaliser depuis le ciel, il crée un conflit immédiat avec les administrés et met l'élu en difficulté. Présenté comme un moyen d'expliquer à chaque propriétaire, vue aérienne de sa maison à l'appui, ce qu'il doit faire et pourquoi, il devient un outil d'information — et le taux de mise en conformité spontanée est le vrai indicateur de réussite. La sanction reste disponible ; elle n'est pas l'objectif.</p>
""",
    "faq": [
        ("Peut-on contrôler le débroussaillement par satellite ?",
         "On peut repérer par imagerie les parcelles qui semblent non conformes et les classer par priorité, mais pas dresser un constat opposable. Le procès-verbal suppose un contrôle par le maire ou un agent assermenté. L'imagerie sert à décider où aller voir."),
        ("Satellite, photo aérienne ou LiDAR : quelle source choisir ?",
         "Pour les OLD, le LiDAR est le plus pertinent, car il mesure la végétation en trois dimensions et voit la strate basse sous les arbres, invisible sur une vue du dessus. La photo aérienne offre une bonne résolution et un historique ; le satellite offre la fraîcheur d'acquisition."),
        ("Un constat par image a-t-il une valeur juridique ?",
         "C'est un élément d'aide à la décision, daté, pas un acte de police. Il peut documenter le travail de la commune et justifier une visite, mais la mise en demeure s'appuie sur un contrôle de terrain."),
        ("Que faire si le propriétaire a débroussaillé après la prise de vue ?",
         "C'est le cas le plus fréquent et il doit être prévu : le constat indique sa date, et une visite ou une réponse du propriétaire suffit à le corriger. Un outil qui ne permet pas cette correction n'est pas utilisable en mairie."),
        ("Les données LiDAR de l'IGN sont-elles accessibles ?",
         "Oui, le programme LiDAR HD de l'IGN produit une couverture nationale progressive dont les données sont publiques. La disponibilité et le millésime varient selon les secteurs."),
    ],
    "sources": [
        ("IGN, programme LiDAR HD", "https://geoservices.ign.fr/lidarhd"),
        ("Géorisques, « Obligations légales de débroussaillement (OLD) »",
         "https://www.georisques.gouv.fr/me-preparer-me-proteger/OLD-obligations-legales-de-debroussaillement"),
        ("Fédération nationale des Communes forestières, « FAQ maires – les obligations légales de débroussaillement », 2024",
         "https://www.communesforestieresfrance.fr/docs/library/faq-maires-old-2024.pdf"),
    ],
    "avertissement": "Les résolutions et millésimes cités sont des ordres de grandeur : vérifiez la donnée réellement disponible sur votre secteur avant de bâtir une méthode de contrôle.",
    "plus": 'Pour aller plus loin : <a href="/ressources/obligations-legales-debroussaillement/">le cadre légal des OLD</a> · <a href="/ressources/controle-old-maire/">la procédure de contrôle du maire</a> · <a href="/collectivites/">VB OLD : voir sa commune maison par maison</a>.',
})

# ------------------------------------------------- 4. anticiper le feu en commune
PAGES.append({
    "chemin": "/ressources/anticiper-feu-de-foret-commune/",
    "titre": "Anticiper le feu de forêt dans sa commune : ce qui se prépare avant la saison",
    "titre_court": "Anticiper le feu de forêt en commune",
    "description": "Débroussaillement, information des habitants, accès et points d'eau, préparation de la crise : ce qu'une commune exposée au risque d'incendie prépare, et dans quel ordre.",
    "image": "/static/og/ressources.png",
    "kicker": "Guide · 7 min",
    "chapeau": "Une saison de feux se prépare l'hiver précédent. Pour une commune exposée, l'essentiel de ce qui sera utile en juillet se décide entre septembre et avril. Voici les leviers, par ordre d'effet réel.",
    "corps": """
<h2>L'essentiel</h2>
<ul>
<li><strong>Le débroussaillement est le levier le plus efficace</strong> dont dispose une commune, et le seul qu'elle peut faire appliquer directement.</li>
<li><strong>Le calendrier commande.</strong> Contrôler au printemps, c'est renoncer à agir la même année.</li>
<li><strong>L'accès compte autant que la végétation</strong> : une maison parfaitement débroussaillée mais inaccessible aux engins reste indéfendable.</li>
<li><strong>Préparer la crise, c'est préparer l'information</strong> : qui prévient qui, par quel canal, et où sont consignées les décisions.</li>
</ul>

<h2>Le calendrier d'une commune exposée</h2>
<p>En remontant depuis l'été :</p>
<ul>
<li><strong>Fin d'été et automne</strong> — contrôles de débroussaillement, mises en demeure, information des nouveaux propriétaires.</li>
<li><strong>Automne et hiver</strong> — période des travaux : c'est le moment où le débroussaillement se fait, hors nidification et hors risque d'étincelle.</li>
<li><strong>Fin d'hiver</strong> — constats de non-exécution, préparation des travaux d'office.</li>
<li><strong>Printemps</strong> — travaux d'office, vérification des accès, des points d'eau et de la signalétique, mise à jour des contacts.</li>
<li><strong>Été</strong> — surveillance, information, gestion de crise. Il est trop tard pour agir sur la végétation.</li>
</ul>

<h2>Le levier principal : les obligations de débroussaillement</h2>
<p>C'est le seul dispositif qui réduit directement l'intensité du feu au contact des maisons, et le maire en a la police. Il suppose trois choses que beaucoup de communes n'ont pas : savoir quelles constructions sont soumises à l'obligation, savoir lesquelles ne sont pas conformes, et garder la trace de ce qui a été demandé à qui. Le reste de la procédure, du courrier à l'exécution d'office, est détaillé dans <a href="/ressources/controle-old-maire/">la fiche sur le contrôle des OLD</a>.</p>

<h2>Informer les habitants, avant l'urgence</h2>
<p>Un propriétaire sur deux ignore qu'il est soumis aux OLD, et beaucoup confondent débroussailler et raser. L'information produit plus d'effet qu'une menace de sanction, surtout si elle est concrète : ce qu'il faut faire sur <em>cette</em> parcelle, pourquoi, et jusqu'où. Les obligations d'information lors d'une vente ou d'une location, en vigueur depuis 2025, touchent progressivement les nouveaux arrivants, mais ne disent rien aux propriétaires installés de longue date.</p>
<p>Le document d'information communal sur les risques majeurs reste le support de référence, à condition qu'il soit lu : une version courte, illustrée et distribuée au bon moment de l'année vaut mieux qu'un fascicule complet consultable en mairie.</p>

<h2>L'accès et l'eau</h2>
<p>Les engins doivent pouvoir arriver, se croiser, faire demi-tour et repartir, parfois en urgence et dans la fumée. Les points de vigilance habituels : voies privées étroites ou en impasse, portails sans dispositif d'ouverture accessible, branches basses au-dessus de la chaussée, numérotation illisible, citernes et poteaux mal signalés ou inaccessibles. Les 10 mètres de débroussaillement de part et d'autre des voies privées relèvent de la même logique.</p>
<p>Un recensement à jour des points d'eau et de leur accessibilité, partagé avec le service d'incendie et de secours, fait partie des éléments les plus simples à tenir et les plus utiles le jour venu.</p>

<h2>Se préparer à la crise</h2>
<p>Les communes dotées d'un plan de prévention des risques sont tenues d'établir un plan communal de sauvegarde, révisable et à exercer régulièrement. Au-delà de l'obligation formelle, trois éléments font la différence le jour J :</p>
<ul>
<li><strong>Le registre des personnes vulnérables</strong>, tenu à jour, qui conditionne l'ordre des évacuations.</li>
<li><strong>Un canal de remontée d'information</strong> depuis les habitants, pour que la mairie sache rapidement où sont les arbres tombés, les câbles au sol et les routes coupées.</li>
<li><strong>Une main courante</strong> horodatée des décisions prises. C'est l'outil de coordination pendant l'événement, et le document qui permettra d'expliquer après coup ce qui a été décidé, quand et pourquoi.</li>
</ul>

<h2>Travailler avec le service d'incendie et de secours</h2>
<p>Le SDIS connaît les secteurs difficiles de la commune mieux que quiconque : les accès qui posent problème, les zones où les engins ne passent pas, les quartiers déjà menacés lors d'un feu précédent. Une visite commune avant la saison coûte une demi-journée et oriente utilement les priorités de débroussaillement et de voirie.</p>
""",
    "faq": [
        ("Que peut faire concrètement une commune contre le risque de feu de forêt ?",
         "Faire appliquer les obligations de débroussaillement, qui réduisent l'intensité du feu au contact des maisons ; garantir l'accès des engins et la disponibilité des points d'eau ; informer les habitants ; et préparer l'organisation de crise, notamment le recensement des personnes vulnérables et la main courante."),
        ("À quel moment de l'année faut-il s'y prendre ?",
         "Les contrôles de débroussaillement commencent à la fin de l'été, les travaux se font en automne et en hiver, les travaux d'office au printemps. Une commune qui démarre au printemps ne pourra pas faire exécuter de travaux avant la saison suivante."),
        ("Le plan communal de sauvegarde est-il obligatoire ?",
         "Il l'est pour les communes dotées d'un plan de prévention des risques, avec une obligation de révision périodique et d'exercices. Son contenu et son articulation avec le plan intercommunal relèvent de la commune et des services de l'État."),
        ("Comment savoir quelles maisons sont soumises aux obligations de débroussaillement ?",
         "Le zonage est arrêté au niveau départemental et consultable sur Géoportail et auprès de la DDT. Sont visées les constructions situées dans un massif classé ou à moins de 200 mètres de sa lisière. Le report parcellaire est la partie la plus laborieuse."),
        ("Faut-il associer le SDIS en amont ?",
         "C'est la démarche la plus rentable. Le service connaît les accès difficiles et les secteurs déjà menacés, et une visite avant la saison oriente les priorités de débroussaillement et de voirie."),
    ],
    "sources": [
        ("Géorisques, « Obligations légales de débroussaillement (OLD) »",
         "https://www.georisques.gouv.fr/me-preparer-me-proteger/OLD-obligations-legales-de-debroussaillement"),
        ("Fédération nationale des Communes forestières, « FAQ maires – les obligations légales de débroussaillement », 2024",
         "https://www.communesforestieresfrance.fr/docs/library/faq-maires-old-2024.pdf"),
        ("ONF, « Foire aux questions : les obligations légales de débroussaillement »",
         "https://www.onf.fr/vivre-la-foret/enjeux-foret/feux-foret/+/1525::foire-aux-questions-faq-les-obligations-legales-de-debroussaillement-old.html"),
    ],
    "avertissement": "VB Safety ne rédige pas de plan communal de sauvegarde : cette page décrit le cadre, l'élaboration du plan relève de la commune et des services de l'État.",
    "plus": 'Pour aller plus loin : <a href="/ressources/obligations-legales-debroussaillement/">le cadre légal des OLD</a> · <a href="/ressources/controle-old-maire/">la procédure de contrôle</a> · <a href="/collectivites/">VB OLD et cellule de crise communale</a>.',
})


# --------------------------------------------------------------------------- écriture
def main():
    tete_fixe, avant, apres = charpente()
    for p in PAGES:
        dossier = os.path.join(RACINE, p["chemin"].strip("/"))
        os.makedirs(dossier, exist_ok=True)
        cible = os.path.join(dossier, "index.html")
        with open(cible, "w", encoding="utf-8") as f:
            f.write(construire(p, tete_fixe, avant, apres))
        print(f"  écrit  {p['chemin']}")
    print(f"{len(PAGES)} pages générées depuis {os.path.relpath(GABARIT, RACINE)}")


if __name__ == "__main__":
    sys.exit(main())
