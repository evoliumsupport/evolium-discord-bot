
const express = require("express");
const crypto = require("node:crypto");
const {
  Client,
  GatewayIntentBits,
  ActivityType
} = require("discord.js");

const token = process.env.DISCORD_BOT_TOKEN;
const apiKey = process.env.DISCORD_STATUS_API_KEY;

if (!token || !apiKey) {
  throw new Error("Secrets manquants dans les variables d'environnement.");
}

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "10kb" }));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const port = Number(process.env.PORT || 3000);
let lastReadyAt = null;

function authenticate(req, res, next) {
  const header = req.get("authorization") || "";
  const prefix = "Bearer ";

  if (!header.startsWith(prefix)) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const supplied = Buffer.from(header.slice(prefix.length));
  const expected = Buffer.from(apiKey);

  if (
    supplied.length !== expected.length ||
    !crypto.timingSafeEqual(supplied, expected)
  ) {
    return res.status(401).json({ error: "Clé invalide" });
  }

  next();
}

client.once("ready", () => {
  lastReadyAt = new Date().toISOString();

  client.user.setPresence({
    status: "online",
    activities: [{
      name: "EVOLIUM - ÉVOLUONS ENSEMBLE !",
      type: ActivityType.Playing
    }]
  });

  console.log("Bot EVOLIUM connecté :", client.user.tag);
});

client.on("error", (error) => {
  console.error("Erreur Discord :", error.message);
});

app.get("/health", (req, res) => {
  res.json({
    serviceHealthy: true,
    discordConnected: client.isReady()
  });
});

app.get("/api/discord/status", authenticate, (req, res) => {
  const connected = client.isReady();

  res.json({
    botName: client.user?.username ?? null,
    botId: client.user?.id ?? null,
    status: connected ? "online" : "offline",
    activity: connected
      ? "EVOLIUM - ÉVOLUONS ENSEMBLE !"
      : null,
    lastReadyAt,
    websocketPing: connected ? client.ws.ping : null
  });
});

app.post("/api/discord/presence", authenticate, (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: "Bot hors ligne" });
  }

  const activity = req.body?.activity;

  if (
    typeof activity !== "string" ||
    activity.trim().length < 1 ||
    activity.trim().length > 100
  ) {
    return res.status(400).json({ error: "Activité invalide" });
  }

  client.user.setPresence({
    status: "online",
    activities: [{
      name: activity.trim(),
      type: ActivityType.Playing
    }]
  });

  res.json({ success: true, activity: activity.trim() });
});

app.listen(port, "0.0.0.0", () => {
  console.log("API EVOLIUM démarrée sur le port", port);
});

client.login(token).catch(() => {
  console.error("Connexion Discord impossible. Vérifie le token.");
  process.exit(1);
});
