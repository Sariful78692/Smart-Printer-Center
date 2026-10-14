
import fs from "node:fs";
import http from "node:http";
import { google } from "googleapis";

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPE = "https://www.googleapis.com/auth/drive";

const jsonPath = new URL("../oauth-client.json", import.meta.url);

if (!fs.existsSync(jsonPath)) {
  console.error("oauth-client.json project root-e nei.");
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const credentials = json.installed;

if (!credentials?.client_id || !credentials?.client_secret) {
  console.error(
    "Eta Desktop OAuth JSON noy, ba client_id/client_secret nei."
  );
  process.exit(1);
}

const oauth = new google.auth.OAuth2(
  credentials.client_id,
  credentials.client_secret,
  REDIRECT_URI
);

const authUrl = oauth.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: [SCOPE],
});

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname !== "/oauth2callback") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");

  if (error || !code) {
    res.writeHead(400);
    res.end("Google authorization failed. Check the terminal.");
    console.error("Authorization failed:", error || "No code received");
    server.close();
    return;
  }

  try {
    const { tokens } = await oauth.getToken(code);

    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });
    res.end(
      "<h2>Google authorization successful.</h2>" +
      "<p>Return to VS Code.</p>"
    );

    if (!tokens.refresh_token) {
      console.error(
        "Refresh Token asheni. Google Account theke app access revoke kore abar run korun."
      );
    } else {
      console.log("\nAdd these to your local .env.local:\n");
      console.log("GOOGLE_OAUTH_CLIENT_ID=" + credentials.client_id);
      console.log("GOOGLE_OAUTH_CLIENT_SECRET=" + credentials.client_secret);
      console.log("GOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token);
      console.log(
        "\nEi values private rakhun. GitHub ba chat-e share korben na."
      );
    }
  } catch (err) {
    console.error("Token exchange failed:", err.message);
    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Token exchange failed. Check the VS Code terminal.");
    }
  } finally {
    server.close();
  }
});

server.on("error", (err) => {
  console.error("Local callback server error:", err.message);
  console.error("Port", PORT, "busy kina check korun.");
  process.exit(1);
});

server.listen(PORT, "localhost", () => {
  console.log("Browser-e ei URL open korun:\n");
  console.log(authUrl);
  console.log("\nGoogle authorization-er jonno opekkha korchi...");
});
