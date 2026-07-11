import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createCounterService } from "./server/counter-service.mjs";
import { hashRequestIp } from "./server/visitor-id.mjs";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const counter = createCounterService(env.DATABASE_URL);

  return {
    optimizeDeps: {
      include: ["react", "react-dom/client"],
    },
    server: {
      host: "0.0.0.0",
      allowedHosts: ["terminal.local"],
      warmup: {
        clientFiles: ["./src/main.jsx"],
      },
    },
    plugins: [
      react(),
      {
        name: "chatgpt-reset-api",
        configureServer(server) {
          server.middlewares.use("/api/counter", async (request, response) => {
            response.setHeader("Content-Type", "application/json");
            response.setHeader("Cache-Control", "no-store");

            try {
              const visitorHash = hashRequestIp(request, env.IP_HASH_SALT);

              if (request.method === "GET") {
                response.end(JSON.stringify(await counter.read(visitorHash)));
                return;
              }

              if (request.method === "POST") {
                response.end(JSON.stringify(await counter.increment(visitorHash)));
                return;
              }

              response.statusCode = 405;
              response.end(JSON.stringify({ error: "Method not allowed" }));
            } catch (error) {
              console.error(error);
              response.statusCode = 500;
              response.end(JSON.stringify({ error: "Counter unavailable" }));
            }
          });
        },
      },
    ],
  };
});
