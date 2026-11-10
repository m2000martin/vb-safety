"""Vigilance météo Météo-France en cours, par département, pour les démos VB OLD.
Source : flux MeteoAlarm (EUMETNET) de la France, alimenté par Météo-France. Le flux n'autorise pas l'appel depuis
un navigateur (pas d'en-tête CORS) : cette tâche le résume dans un petit JSON servi depuis la branche « donnees ».
Usage : python3 vigilance.py <fichier de sortie>"""
import json, sys, unicodedata, urllib.request, datetime as dt

def get(u):
    with urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'vb-safety-vigilance'}), timeout=60) as r:
        return json.load(r)

def norm(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode().lower()
    return ''.join(c for c in s if c.isalnum())

DEP = {norm(d['nom']): d['code'] for d in get('https://geo.api.gouv.fr/departements?fields=nom,code')}
COUL = {2: 'jaune', 3: 'orange', 4: 'rouge'}
now = dt.datetime.now(dt.timezone.utc)
out = {}
for w in get('https://feeds.meteoalarm.org/api/v1/warnings/feeds-france').get('warnings', []):
    a = w.get('alert', {})
    if a.get('msgType') == 'Cancel':
        continue
    for i in a.get('info', []):
        if not str(i.get('language', '')).startswith('fr'):
            continue
        P = {p.get('valueName'): p.get('value', '') for p in i.get('parameter', [])}
        try:
            niv = int(P.get('awareness_level', '1').split(';')[0])
        except ValueError:
            continue
        if niv < 2:
            continue
        fin = i.get('expires')
        if fin and dt.datetime.fromisoformat(fin) < now:
            continue
        typ = P.get('awareness_type', '').split(';')[-1].strip() or i.get('event', '')
        lib = i.get('event', '').replace('Vigilance jaune ', '').replace('Vigilance orange ', '').replace('Vigilance rouge ', '').replace('Vigilance ', '')
        for ar in i.get('area', []):
            code = DEP.get(norm(ar.get('areaDesc', '')))
            if not code:
                continue
            L = out.setdefault(code, {})
            cur = L.get(typ)
            if cur and cur['niveau'] >= niv:
                continue
            L[typ] = dict(type=lib, niveau=niv, couleur=COUL.get(niv, 'jaune'), debut=i.get('onset') or i.get('effective'), fin=fin,
                          texte=(i.get('description') or '')[:600], consigne=(i.get('instruction') or '')[:600])
res = dict(maj=now.isoformat(timespec='minutes'), source='Météo-France, via le flux MeteoAlarm (EUMETNET)',
           dep={k: sorted(v.values(), key=lambda x: -x['niveau']) for k, v in out.items()})
open(sys.argv[1], 'w').write(json.dumps(res, ensure_ascii=False, separators=(',', ':')))
print(len(res['dep']), 'départements en vigilance')
