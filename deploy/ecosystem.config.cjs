const path = require("path");

const APP_DIR = process.env.APP_DIR || "/var/www/html/Safe-Fare-Bus";

module.exports = {
  apps: [
    {
      name: "safefare",
      cwd: path.join(APP_DIR, "backend"),
      script: "src/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
