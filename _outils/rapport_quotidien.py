"""Rapport quotidien des visites (site + démos), envoyé par e-mail à 10 h, heure de Paris.

Lit les totaux du compteur hébergé sur notre serveur (/api/vbs/stats, même source que vb-safety.com/stats/).
Variables d'environnement (secrets GitHub) :
  STATS_TOKEN  code d'accès du tableau de bord /stats/
  SMTP_USER    adresse d'envoi (ex. martin@vb-safety.com)
  SMTP_PASS    mot de passe d'application Google Workspace
  RAPPORT_A    destinataire (défaut : SMTP_USER)
  FORCER=1     envoie même hors de 10 h (test manuel)
"""
import json, os, smtplib, ssl, sys, urllib.request, html, re
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from zoneinfo import ZoneInfo

API = 'https://api.vb-safety.com/api/vbs/stats'
now = datetime.now(ZoneInfo('Europe/Paris'))
if os.environ.get('FORCER') != '1' and now.hour != 10:
    print('Pas 10 h à Paris (', now.strftime('%H:%M'), ') : rien à faire.'); sys.exit(0)

def get(jours):
    req = urllib.request.Request(f'{API}?jours={jours}', headers={'X-Stats-Token': os.environ['STATS_TOKEN'], 'Cache-Control': 'no-store'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

try:
    d1 = get(1)
except Exception:
    d1 = None
d7 = get(7)
d = d1 or d7
periode = 'dernières 24 h' if d1 else '7 derniers jours (le serveur ne donne pas la journée seule)'

COMMUNES = {'ares': 'Arès', 'lanton': 'Lanton', 'andernos': 'Andernos-les-Bains', 'audenge': 'Audenge', 'biganos': 'Biganos',
            'le-teich': 'Le Teich', 'arcachon': 'Arcachon', 'gujan': 'Gujan-Mestras', 'lege': 'Lège-Cap-Ferret', 'la-teste': 'La Teste-de-Buch'}
ACT = {'code-ok': 'code saisi', 'code-faux': 'code erroné', 'avertissement-ok': 'avertissement lu', 'tuto-passe': 'tutoriel passé',
       'fiche': 'fiches de maison', 'courrier': 'courriers ouverts', 'email': 'e-mails préparés', 'rapport': 'rapport PDF',
       'crise': 'cellule de crise', 'alerte': 'alerte saisie', 'demande-demo': 'clic « Demander une démo »',
       'envoi-enregistre': 'envoi enregistré', 'plus-tard': 'mis « plus tard »', 'controle': 'contrôle enregistré'}

def rows(k):
    return [r for r in (d.get(k) or []) if r.get('n')]

# démos : ouvertures (pages) + actions (événements demo:<commune>:<action>)
demos = {}
for r in rows('pages'):
    m = re.match(r'^/(?:demo/([^/]+)|(OLD-demo))/', r['cle'] or '')
    if m:
        c = m.group(1) or 'old-demo'
        demos.setdefault(c, {'vues': 0, 'act': {}})['vues'] += r['n']
for r in rows('clics'):
    m = re.match(r'^demo:([^:]+):(.+)$', r['cle'] or '')
    if m:
        c, a = m.group(1), m.group(2)
        if c.startswith('old-demo'): c = 'old-demo'
        demos.setdefault(c, {'vues': 0, 'act': {}})['act'][a] = demos[c]['act'].get(a, 0) + r['n']

# communes jamais ouvertes sur 7 jours
ouvertes7 = set()
for r in d7.get('pages') or []:
    m = re.match(r'^/demo/([^/]+)/', r['cle'] or '')
    if m and r.get('n'): ouvertes7.add(m.group(1))

e = html.escape
def nom(c): return 'Démo principale (OLD-demo)' if c == 'old-demo' else COMMUNES.get(c, c)
lignes = []
for c, v in sorted(demos.items(), key=lambda x: -(x[1]['vues'] + sum(x[1]['act'].values()))):
    acts = ', '.join(f"{n} {ACT.get(a, a)}" for a, n in sorted(v['act'].items(), key=lambda x: -x[1]) if not a.startswith(('page-', 'theme-')))
    lignes.append(f"<tr><td><b>{e(nom(c))}</b></td><td style='text-align:right'>{v['vues']}</td><td>{e(acts) or '—'}</td></tr>")
jamais = [COMMUNES[c] for c in COMMUNES if c not in ouvertes7]

def table(titre, rs, n=12, filtre=None):
    rs = [r for r in rs if not filtre or filtre(r)][:n]
    if not rs: return f"<h3>{titre}</h3><p style='color:#64748b'>Rien sur la période.</p>"
    return f"<h3>{titre}</h3><table cellpadding='4' style='border-collapse:collapse;font-size:13px'>" + ''.join(
        f"<tr><td>{e(str(r.get('cle') or 'Direct'))}</td><td style='text-align:right'><b>{r['n']}</b></td></tr>" for r in rs) + '</table>'

site_pages = lambda r: not re.match(r'^/(demo|OLD-demo)/', r.get('cle') or '')
site_clics = lambda r: not (r.get('cle') or '').startswith('demo:')
dem = sum(r['n'] for r in rows('demandes'))

corps = f"""<div style="font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:720px">
<h2 style="margin:0">Rapport VB Safety · {now.strftime('%d/%m/%Y')}</h2>
<p style="color:#64748b;margin:4px 0 16px">Période : {periode}. Visiteurs comptés une fois par jour, sans cookie ni donnée personnelle.</p>
<p><b>{d.get('visiteurs', 0)}</b> visiteurs · <b>{d.get('vues', 0)}</b> pages vues · <b>{dem}</b> demande(s) reçue(s) par les formulaires.</p>
<h3>Démos des communes</h3>
{('<table cellpadding="5" style="border-collapse:collapse;font-size:13px"><tr style="background:#f1f5f9"><th align="left">Commune</th><th>Ouvertures</th><th align="left">Actions</th></tr>' + ''.join(lignes) + '</table>') if lignes else "<p style='color:#64748b'>Aucune démo ouverte sur la période.</p>"}
<p style="color:#64748b;font-size:13px">Jamais ouvertes depuis 7 jours : {e(', '.join(jamais)) or 'aucune'}.</p>
{table('Pages du site les plus vues', rows('pages'), 15, site_pages)}
{table('Provenance', rows('sources'), 10)}
{table('Actions sur le site', rows('clics'), 12, site_clics)}
{table('Demandes reçues', rows('demandes'), 10)}
<p style="color:#94a3b8;font-size:12px;margin-top:20px">Détail : <a href="https://vb-safety.com/stats/">vb-safety.com/stats</a>. Généré automatiquement (GitHub Actions).</p></div>"""

msg = MIMEMultipart('alternative')
msg['Subject'] = f"Rapport VB Safety · {now.strftime('%d/%m')} · {d.get('visiteurs', 0)} visiteurs, {sum(v['vues'] for v in demos.values())} ouvertures de démo"
msg['From'] = os.environ['SMTP_USER']
msg['To'] = os.environ.get('RAPPORT_A') or os.environ['SMTP_USER']
msg.attach(MIMEText(re.sub('<[^>]+>', ' ', corps), 'plain', 'utf-8'))
msg.attach(MIMEText(corps, 'html', 'utf-8'))
with smtplib.SMTP_SSL('smtp.gmail.com', 465, context=ssl.create_default_context()) as s:
    s.login(os.environ['SMTP_USER'], os.environ['SMTP_PASS'])
    s.send_message(msg)
print('Envoyé à', msg['To'])
