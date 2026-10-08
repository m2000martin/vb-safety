#!/usr/bin/env python3
"""Verrou des contenus réservés du site (VB Safety).

Les passages réservés sont chiffrés dans la page (AES-GCM, clé dérivée du code d'accès par
PBKDF2-SHA256). Sans le code, la page n'affiche qu'un aperçu flouté de la même mise en page,
dont le texte a été remplacé par des barres grises : le texte réel n'est pas lisible dans la source.

Utilisation :
  python3 _outils/verrou.py lock   CODE fichier.html [...]   # chiffre les zones <!--verrou:ID ...--> … <!--/verrou:ID-->
  python3 _outils/verrou.py unlock CODE fichier.html [...]   # remet les zones en clair, pour les modifier

Options d'une zone : <!--verrou:roles cta--> (encadré « Réservé aux membres » avec saisie du code)
                     <!--verrou:sante-->     (zone floutée sans encadré, déverrouillée avec les autres)
Le même code que la démo (connexion.js, CODE_HASH) : changer l'un impose de rechiffrer avec l'autre.
"""
import base64, html, os, re, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes

ITER = 300000

def norm(code):
    return re.sub(r'\s+', '', code).upper()

def key(code, salt):
    return PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=salt, iterations=ITER).derive(norm(code).encode())

def enc(code, text):
    salt, iv = os.urandom(16), os.urandom(12)
    ct = AESGCM(key(code, salt)).encrypt(iv, text.encode('utf-8'), None)
    return base64.b64encode(salt + iv + ct).decode()

def dec(code, blob):
    raw = base64.b64decode(blob)
    return AESGCM(key(code, raw[:16])).decrypt(raw[16:28], raw[28:], None).decode('utf-8')

def ghost(src):
    """Même structure, texte remplacé par des barres (largeur proportionnelle, pas de contenu)."""
    def bars(m):
        t = html.unescape(m.group(0)).strip()
        if not t:
            return m.group(0)
        n = max(4, min(60, len(t)))
        # Largeur par classe (gw1…gw8) : la politique de sécurité du site interdit les attributs style
        return '<i class="gh gw%d"></i>' % min(8, max(1, round(n / 7.5)))
    out = re.sub(r'(?<=>)[^<]+(?=<)', bars, '>' + src + '<')[1:-1]
    out = re.sub(r'\s(title|aria-label|alt|placeholder)="[^"]*"', '', out)
    return re.sub(r'href="[^"]*"', 'href="#"', out)

CTA = {
    'fr': ('Réservé aux membres', 'Tapez votre code pour voir le détail.', 'Code d\'accès', 'Déverrouiller',
           'Code incorrect.', 'Demander un accès', 'Devenir partenaire'),
    'en': ('Members only', 'Enter your code to see the details.', 'Access code', 'Unlock',
           'Incorrect code.', 'Request access', 'Become a partner'),
}

def cta(lang):
    t = CTA[lang]
    return ('<div class="locked-cta" data-verrou-form><span class="locked-ico"><svg class="icon" aria-hidden="true"><use href="#i-lock"/></svg></span>'
            '<strong>%s</strong><span>%s</span>'
            '<div class="locked-row"><input class="input" name="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="%s" aria-label="%s">'
            '<button class="btn btn-primary" type="button" data-verrou-go>%s</button></div>'
            '<p class="locked-err" hidden>%s</p>'
            '<p class="locked-links"><a href="#demande" data-demande="acces">%s</a><span aria-hidden="true">·</span><a href="#demande" data-demande="partenaire">%s</a></p></div>') % (t[0], t[1], t[2], t[2], t[3], t[4], t[5], t[6])

ZONE = re.compile(r'<!--verrou:([\w-]+)((?: \w+)*)-->(.*?)<!--/verrou:\1-->', re.S)
LOCKED = re.compile(r'<div class="locked(?: locked-silent)?" data-verrou="([^"]+)" data-verrou-id="([\w-]+)" data-verrou-opts="([^"]*)">.*?<!--/locked:\2--></div>', re.S)

def lock(code, path):
    s = open(path, encoding='utf-8').read()
    lang = 'en' if 'lang="en"' in s[:300] else 'fr'
    def rep(m):
        zid, opts, body = m.group(1), m.group(2).strip(), m.group(3)
        silent = 'cta' not in opts.split()
        return ('<div class="locked%s" data-verrou="%s" data-verrou-id="%s" data-verrou-opts="%s"><div class="locked-ghost" aria-hidden="true" inert>%s</div>%s<!--/locked:%s--></div>'
                % (' locked-silent' if silent else '', enc(code, body), zid, opts, ghost(body), '' if silent else cta(lang), zid))
    s2, n = ZONE.subn(rep, s)
    open(path, 'w', encoding='utf-8').write(s2)
    print(path, n, 'zone(s) chiffrée(s)')

def unlock(code, path):
    s = open(path, encoding='utf-8').read()
    def rep(m):
        opts = (' ' + m.group(3)) if m.group(3) else ''
        return '<!--verrou:%s%s-->%s<!--/verrou:%s-->' % (m.group(2), opts, dec(code, m.group(1)), m.group(2))
    s2, n = LOCKED.subn(rep, s)
    open(path, 'w', encoding='utf-8').write(s2)
    print(path, n, 'zone(s) en clair')

if __name__ == '__main__':
    if len(sys.argv) < 4 or sys.argv[1] not in ('lock', 'unlock'):
        print(__doc__); sys.exit(1)
    for f in sys.argv[3:]:
        (lock if sys.argv[1] == 'lock' else unlock)(sys.argv[2], f)
