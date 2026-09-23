import fs from "node:fs";
import path from "node:path";
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function localDataApi() {
  const dataPath = path.resolve(process.cwd(), "public/data.json");

  return {
    name: "local-data-api",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = new URL(request.url, "http://localhost");

        if (requestUrl.pathname === "/receive" && request.method === "GET") {
          response.setHeader("Content-Type", "application/json");
          response.end(fs.readFileSync(dataPath, "utf8"));
          return;
        }

        if (requestUrl.pathname !== "/post" || request.method !== "POST") {
          next();
          return;
        }

        let body = "";
        request.on("data", (chunk) => {
          body += chunk;
          if (body.length > 5_000_000) request.destroy();
        });
        request.on("end", () => {
          try {
            const data = JSON.parse(body);
            if (!data || typeof data !== "object" || Array.isArray(data)) {
              throw new Error("Request body must be a JSON object");
            }
            const current = JSON.parse(fs.readFileSync(dataPath, "utf8"));
            const mergedMessages = { ...(current.messages || {}) };
            Object.entries(data.messages || {}).forEach(([key, messages]) => {
              mergedMessages[key] = {
                ...(mergedMessages[key] || {}),
                ...messages,
              };
            });
            const merged = {
              ...current,
              ...data,
              users: { ...(current.users || {}), ...(data.users || {}) },
              credentials: {
                ...(current.credentials || {}),
                ...(data.credentials || {}),
              },
              servers: { ...(current.servers || {}), ...(data.servers || {}) },
              messages: mergedMessages,
            };
            ["local-demo", "local-friend"].forEach((uid) => {
              delete merged.users[uid];
              delete merged.credentials[uid];
            });
            fs.writeFileSync(dataPath, `${JSON.stringify(merged, null, 2)}\n`);
            response.statusCode = 204;
            response.end();
          } catch (error) {
            response.statusCode = 400;
            response.setHeader("Content-Type", "application/json");
            response.end(JSON.stringify({ error: error.message }));
          }
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/chat/' : '/',
  plugins: [react(), localDataApi()],
}))
