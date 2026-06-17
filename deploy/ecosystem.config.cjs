/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

const cwd = __dirname;
const envFile = process.env.ENV_FILE || path.join(cwd, ".env.production");

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .reduce((env, rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        return env;
      }

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) {
        return env;
      }

      let value = match[2].trim();
      const quoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      if (quoted) {
        value = value.slice(1, -1);
      }

      env[match[1]] = value.replace(/\\n/g, "\n");
      return env;
    }, {});
}

const fileEnv = parseEnvFile(envFile);
const appName =
  process.env.PM2_APP_NAME || fileEnv.PM2_APP_NAME || "ai-mock-interview-coach";
const instances = Number(process.env.PM2_INSTANCES || fileEnv.PM2_INSTANCES || 1);

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join(cwd, "server.js"),
      cwd,
      exec_mode: "fork",
      instances: Number.isFinite(instances) && instances > 0 ? instances : 1,
      autorestart: true,
      max_memory_restart:
        process.env.PM2_MAX_MEMORY || fileEnv.PM2_MAX_MEMORY || "512M",
      env: {
        ...fileEnv,
        NODE_ENV: "production",
        PORT: process.env.PORT || fileEnv.PORT || "3000"
      }
    }
  ]
};
