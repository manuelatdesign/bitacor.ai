import express from "express";
import path from "path";
import dotenv from "dotenv";
import {
  handleDestinationCategories,
  handleGenerateProposals,
  handlePlacesAutocomplete,
} from "./server/apiHandlers";

dotenv.config();

const app = express();
const PORT = 3000;

/**
 * Path prefixes where /api/* is mounted.
 * - Local dev + local prod: "" → /api/...
 * - Vercel uses dedicated files under api/*.ts (see vercel.json)
 */
function apiPrefixes(): string[] {
  return [""];
}

app.use(express.json({ limit: "256kb" }));

function mountApiRoutes(prefix: string) {
  app.get(`${prefix}/api/places/autocomplete`, (req, res) =>
    handlePlacesAutocomplete(req as never, res)
  );
  app.post(`${prefix}/api/destination-categories`, (req, res) =>
    handleDestinationCategories(req as never, res)
  );
  app.post(`${prefix}/api/generate-proposals`, (req, res) =>
    handleGenerateProposals(req as never, res)
  );
  app.get(`${prefix}/api/health`, (_req, res) => {
    res.json({ ok: true, service: "bitacor-ai", time: new Date().toISOString() });
  });
}

for (const prefix of apiPrefixes()) {
  mountApiRoutes(prefix);
}

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[server]", err);
  res.status(500).json({ error: "Internal server error" });
});

function setupProductionStatic() {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    setupProductionStatic();
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
