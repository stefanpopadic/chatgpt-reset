import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createCounterService } from "./server/counter-service.mjs";
import { handleCounterRequest } from "./server/counter-handler.mjs";

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
            await handleCounterRequest(request, response, {
              counter,
              secret: env.IP_HASH_SALT,
            });
          });
        },
      },
    ],
  };
});
