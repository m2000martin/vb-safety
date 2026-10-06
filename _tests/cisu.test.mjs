// Test du module CISU (cmr-pompier/assets/js/cisu.js) : lecture des messages au format national,
// correspondance nature → type de feu, et conformité des messages générés aux schémas officiels.
// Lancement : node _tests/cisu.test.mjs  (depuis la racine du dépôt)
// La validation par schéma utilise Python + jsonschema s'ils sont présents (sinon elle est sautée).
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const C = require(path.join(ROOT, 'cmr-pompier/assets/js/cisu.js'));
let fails = 0; const ok = (c, m) => { console.log((c ? 'OK   ' : 'ÉCHEC ') + m); if (!c) fails++; };

// 1. Exemple officiel publié par l'ANS
const D = path.join(ROOT, 'cmr-pompier/assets/demo/cisu-ans');
const ans = C.parse(fs.readdirSync(D).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'))));
ok(ans.nature.code === 'C04.02.01' && ans.type === 'habitation', 'Exemple ANS · incendie d\'habitation reconnu');
ok(ans.engins.length === 3 && ans.engins[0].statuts.join('>') === 'DECLENCHE>DEPART>ARRIVEE>REN-BASE', 'Exemple ANS · historique des statuts reconstitué sur 7 messages');
ok(ans.duree_min === 17 && ans.commune === 'Guichen', 'Exemple ANS · durée et commune');

// 2. Scénarios générés : type attendu
const attendu = { habitation: 'habitation', erp: 'habitation', vehicule: 'vehicule', entrepot: 'industriel', agricole: 'vehicule', vegetation: 'vegetation', cheminee: 'cheminee', poubelle: 'conteneur', alarme: null };
const gen = {};
for (const k of Object.keys(attendu)) { gen[k] = C.generate(k); const p = C.parse(gen[k]); ok(p.type === attendu[k] && (p.type === null || p.duree_min > 0), `Scénario ${k} → ${attendu[k]}`); }

// 3. Correspondances isolées
ok(C.typeFor('C04.02.00', 'L03.05.00').type === 'industriel', 'Bâtiment sur lieu professionnel → industriel');
ok(C.typeFor('C02.07.04').type === 'chimique', 'Exposition chimique / NRBC → chimique');
ok(C.typeFor('C02.01.00').type === null, 'Secours à personne → pas de rapport');

// 4. Messages refusés
let refus = ''; try { C.parse('{"foo":1}'); } catch (e) { refus = e.message; }
ok(/RC-EDA/.test(refus), 'Fichier sans création d\'affaire refusé');
refus = ''; try { C.parse({ createCase: { caseId: 'a.b.c.d', creation: 'hier', qualification: { whatsHappen: { code: 'X' } }, location: {} } }); } catch (e) { refus = e.message; }
ok(/non conforme/.test(refus), 'Message mal formé refusé');

// 5. Conformité aux schémas officiels (Python + jsonschema)
const tmp = path.join(os.tmpdir(), 'cisu-gen-' + process.pid + '.json');
fs.writeFileSync(tmp, JSON.stringify(gen));
const py = `
import json,sys
from jsonschema import Draft7Validator, FormatChecker
base=sys.argv[1]; sch={}
for k,f in [('eda','RC-EDA'),('ri','RC-RI'),('env','EDXL-DE-envelope-only'),('de','RC-DE')]:
  s=json.load(open(base+'/'+f+'.schema.json')); s.pop('$id',None); sch[k]=Draft7Validator(s,format_checker=FormatChecker())
n=bad=0
for name,seq in json.load(open(sys.argv[2])).items():
  for env in seq:
    m=env['content'][0]['jsonContent']['embeddedJsonContent']['message']
    docs=[('env',env),('de',{k:v for k,v in m.items() if k not in('createCase','resourcesInfoCisu')})]
    if 'createCase' in m: docs.append(('eda',m['createCase']))
    if 'resourcesInfoCisu' in m: docs.append(('ri',m['resourcesInfoCisu']))
    for k,d in docs:
      n+=1; e=list(sch[k].iter_errors(d))
      if e: bad+=1; print(name,k,e[0].message[:120])
print('RESULT',n,bad)`;
const r = spawnSync('python3', ['-c', py, path.join(ROOT, '_tests/cisu-schemas'), tmp], { encoding: 'utf8' });
fs.unlinkSync(tmp);
const m = /RESULT (\d+) (\d+)/.exec(r.stdout || '');
if (!m) console.log('SAUTÉ Validation par schéma (python3 + jsonschema indisponibles)');
else ok(+m[2] === 0, `Messages générés conformes aux schémas officiels (${m[1]} validations)` + (+m[2] ? ' · ' + r.stdout : ''));

console.log(fails ? `\n${fails} échec(s)` : '\nTout est OK');
process.exitCode = fails ? 1 : 0;
