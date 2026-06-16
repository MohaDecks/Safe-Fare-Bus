const cors = require("cors");

/** Flutter web / Vite dev servers use random localhost ports */
function isLocalDevOrigin(origin) {
  if (!origin) return false;
  try {
    const u = new URL(origin);
    return (
      u.protocol === "http:" &&
      (u.hostname === "localhost" || u.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function buildCorsOptions() {
  const port = process.env.PORT || 4000;
  const publicUrl = (process.env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/$/, "");
  const allowAll = process.env.CORS_ALLOW_ALL === "true";

  const defaults = [
    publicUrl,
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    "http://dirshay.com",
    "https://dirshay.com",
    "http://www.dirshay.com",
    "http://2.58.82.168:4000",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  const fromEnv = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed = [...new Set([...defaults, ...fromEnv])];

  return {
    origin(origin, callback) {
      if (allowAll || !origin || allowed.includes(origin) || isLocalDevOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    exposedHeaders: ["Content-Type"],
    maxAge: 86400,
  };
}

function corsMiddleware() {
  return cors(buildCorsOptions());
}

module.exports = { corsMiddleware, buildCorsOptions };
