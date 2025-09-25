// oauth.js
const express = require("express");
const axios = require("axios");
const { exec } = require("child_process");
require("dotenv").config();

const APP_ID = process.env.CTRADER_APP_ID;
const APP_SECRET = process.env.CTRADER_APP_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3000/callback";

const AUTH_URL = "https://id.ctrader.com/my/settings/openapi/grantingaccess/";
const TOKEN_URL = "https://openapi.ctrader.com/apps/token";

function openUrl(url) {
  const cmd = process.platform === "win32" ? `start "" "${url}"`
            : process.platform === "darwin" ? `open "${url}"`
            : `xdg-open "${url}"`;
  exec(cmd);
}

const app = express();
const PORT = 3000;

app.get("/", (_req, res) => {
  const url = new URL(AUTH_URL);
  url.searchParams.set("client_id", APP_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("scope", "accounts"); // ou "trading" si ton app a ce droit
  url.searchParams.set("product", "web");
  res.send(`<a href="${url.toString()}">Se connecter à cTrader</a>`);
});

app.get("/callback", async (req, res) => {
  const { code, error } = req.query;
  if (error) return res.status(400).send("Erreur d'autorisation: " + error);
  if (!code) return res.status(400).send("Pas de code reçu.");

  try {
    const { data } = await axios.get(TOKEN_URL, {
      params: {
        grant_type: "authorization_code",
        code: String(code),
        redirect_uri: REDIRECT_URI,
        client_id: APP_ID,
        client_secret: APP_SECRET,
      },
      headers: { Accept: "application/json" },
    });

    console.log("\n=== TOKENS cTrader ===");
    console.log("accessToken :", data.accessToken);
    console.log("refreshToken:", data.refreshToken);
    console.log("expiresIn   :", data.expiresIn, "sec");
    console.log("======================\n");

    res.send("<h2>OK ✅</h2><p>Tokens reçus. Regarde la console.</p>");
  } catch (e) {
    console.error("Erreur code→token:", e.response?.data || e.message);
    res.status(500).send("Erreur code→token: " + JSON.stringify(e.response?.data || e.message));
  }
});

app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Serveur prêt sur ${url}`);
  openUrl(url);
});
