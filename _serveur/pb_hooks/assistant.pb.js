/// <reference path="../pb_data/types.d.ts" />
// Assistant du Carnet Expo CMR · route POST /api/assistant (PocketBase v0.23 ou plus récent)
//
// Reçoit : { message, page, pages } d'un utilisateur connecté.
// Renvoie : { action: { name, input } } ou { text }.
// Le navigateur exécute l'action sur les données que l'utilisateur voit déjà.
//
// Confidentialité : seuls la phrase, le rôle (lu côté serveur) et le nom de la page
// partent vers l'API Claude. Aucune donnée d'intervention ni d'exposition.
// Le contenu des messages n'est pas journalisé.
//
// Configuration (variables d'environnement du serveur PocketBase) :
//   ANTHROPIC_API_KEY      clé de l'API (obligatoire)
//   ASSISTANT_MODEL        facultatif, défaut : claude-haiku-4-5
//   ASSISTANT_PAR_HEURE    facultatif, défaut : 60 demandes par utilisateur et par heure
//
// Note PocketBase : chaque handler s'exécute dans un contexte isolé ; tout ce qu'il
// utilise doit donc être déclaré à l'intérieur de la fonction.

routerAdd("POST", "/api/assistant", (e) => {
  const KEY = $os.getenv("ANTHROPIC_API_KEY");
  if (!KEY) throw new ApiError(503, "Assistant non configuré.");
  const MODEL = $os.getenv("ASSISTANT_MODEL") || "claude-haiku-4-5";
  const LIMIT = parseInt($os.getenv("ASSISTANT_PAR_HEURE") || "60", 10);

  // ---------------------------------------------------------------- entrée
  const user = e.auth;
  const role = String(user.get("role") || "");
  const ROLES = { agent: "agent", cos: "chef d'agrès ou COS", commandement: "chef de centre / commandement", sssm: "médecin ou infirmier du SSSM", habillement: "référent EPI" };
  if (!ROLES[role]) throw new ApiError(403, "Rôle non autorisé.");

  const body = e.requestInfo().body || {};
  const message = String(body.message || "").trim().slice(0, 400);
  if (!message) throw new ApiError(400, "Message vide.");
  const clean = (s) => String(s || "").replace(/[^a-z-]/g, "").slice(0, 30);
  const page = clean(body.page);
  const en = body.lang === "en";
  const pages = (Array.isArray(body.pages) ? body.pages : []).map(clean).filter(Boolean).slice(0, 12);

  // ---------------------------------------------------------------- limite par utilisateur
  const store = $app.store();
  const k = "asst:" + user.id;
  const hour = Math.floor(Date.now() / 3600000);
  const prev = store.get(k);
  const n = prev && prev.h === hour ? prev.n + 1 : 1;
  if (n > LIMIT) throw new ApiError(429, "Trop de demandes.");
  store.set(k, { h: hour, n: n });

  // ---------------------------------------------------------------- consignes et outils
  const system = [
    "Tu es l'assistant du Carnet Expo CMR de VB Safety, un logiciel où les SDIS tracent l'exposition des sapeurs-pompiers aux fumées d'incendie.",
    "Ton rôle : transformer la demande de l'utilisateur en UNE action de l'application, au moyen d'un des outils fournis.",
    "Tu ne vois aucune donnée et tu n'en inventes aucune : l'application exécute l'action et affiche elle-même les résultats.",
    "Tu ne remplis, ne transmets, ne valides et ne supprimes jamais rien.",
    "",
    "Règles :",
    "- L'utilisateur peut écrire en français ou en anglais (open, show, latest, to complete, overdue, sent, approved…) : les règles valent dans les deux langues.",
    "- Ouvrir, voir, afficher, reprendre un rapport → ouvrir_rapport. « à compléter », « à faire », « en cours » ou « à contrôler » → quel = a_completer. Une date précise ou « hier » → quel = date avec la date au format AAAA-MM-JJ, calculée à partir de la date du jour fournie.",
    "- Créer ou rédiger un rapport → ouvrir_rapport avec quel = nouveau.",
    "- Combien, lesquels, liste, en retard, en attente, transmis, validés → lister_rapports. « cette semaine » = 7 jours, « aujourd'hui » ou « 24 h » = 1, « ce mois » = 30.",
    "- Aller sur une page de l'espace → ouvrir_page, uniquement parmi les pages listées dans la demande.",
    "- Question sur le fonctionnement → aide avec le sujet le plus proche.",
    "- Question d'usage du logiciel sans sujet adapté : réponds sans outil, en deux phrases au plus.",
    "- Question médicale, juridique ou hors sujet : réponds sans outil, en une phrase, que tu ne réponds qu'aux questions sur l'utilisation du Carnet et renvoie vers le SSSM ou le guide santé.",
    en ? "Answer in English (the interface is shown in English), concisely and politely. Keep French acronyms such as SSSM, SDIS, CA, COS with their English meaning when useful." : "Réponds toujours en français, en vouvoyant."
  ].join("\n");

  const tools = [
    { name: "ouvrir_page", description: "Ouvre une page de l'espace de l'utilisateur.",
      input_schema: { type: "object", properties: { page: { type: "string", enum: pages.length ? pages : ["tableau-de-bord"], description: "Identifiant de la page." } }, required: ["page"] } },
    { name: "ouvrir_rapport", description: "Ouvre un rapport de contamination (le plus récent correspondant).",
      input_schema: { type: "object", properties: {
        quel: { type: "string", enum: ["a_completer", "dernier", "date", "nouveau"] },
        date: { type: "string", description: "AAAA-MM-JJ, seulement si quel = date." } }, required: ["quel"] } },
    { name: "lister_rapports", description: "Affiche la liste des rapports selon leur statut.",
      input_schema: { type: "object", properties: {
        statut: { type: "string", enum: ["a_completer", "en_retard", "transmis", "valides", "tous"] },
        jours: { type: "integer", minimum: 1, maximum: 365, description: "Limiter aux N derniers jours." } }, required: ["statut"] } },
    { name: "aide", description: "Affiche une aide sur le fonctionnement du Carnet.",
      input_schema: { type: "object", properties: {
        sujet: { type: "string", enum: ["remplir_rapport", "circuit_validation", "zones_contamination", "ari", "decontamination", "donnees", "retard"] } }, required: ["sujet"] } }
  ];

  // Date locale envoyée par le navigateur (fuseau de l'utilisateur), sinon date du serveur
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body.today || "")) ? String(body.today) : new Date().toISOString().slice(0, 10);
  const userText = "Date du jour : " + today + ". Profil : " + ROLES[role] + ". Page affichée : " + (page || "tableau-de-bord") +
    ". Pages disponibles : " + (pages.join(", ") || "tableau-de-bord") + ".\n\nDemande : " + message;

  // ---------------------------------------------------------------- appel à l'API Claude
  let res;
  try {
    res = $http.send({
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      timeout: 20,
      headers: { "content-type": "application/json", "x-api-key": KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 300, system: system, tools: tools, tool_choice: { type: "auto" },
        messages: [{ role: "user", content: userText }] })
    });
  } catch (err) {
    throw new ApiError(502, "Assistant indisponible.");
  }
  if (res.statusCode === 429) throw new ApiError(429, "Assistant saturé.");
  if (res.statusCode !== 200) throw new ApiError(502, "Assistant indisponible.");

  // ---------------------------------------------------------------- sortie
  const ALLOWED = { ouvrir_page: 1, ouvrir_rapport: 1, lister_rapports: 1, aide: 1 };
  const blocks = (res.json && res.json.content) || [];
  const out = {};
  const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join(" ").trim();
  const tool = blocks.find((b) => b.type === "tool_use" && ALLOWED[b.name]);
  if (tool) out.action = { name: tool.name, input: tool.input || {} };
  if (text) out.text = text.slice(0, 600);
  return e.json(200, out);
}, $apis.requireAuth("users"));
