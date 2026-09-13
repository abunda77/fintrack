import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { accountsRouter } from "./routes/accounts";
import { transactionsRouter } from "./routes/transactions";
import { dashboardRouter } from "./routes/dashboard";
import { syncRouter } from "./routes/sync";
import { authRouter } from "./routes/auth";
import { requireAuth } from "./auth";
import { errorMiddleware, notFoundApiHandler } from "./errors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): express.Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "512kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Endpoint autentikasi publik (login/logout/cek sesi).
  app.use("/api/auth", authRouter);

  // Seluruh endpoint API sisanya memerlukan sesi yang valid.
  app.use("/api", requireAuth);

  app.use("/api/accounts", accountsRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/sync", syncRouter);

  app.use("/api", notFoundApiHandler);

  // Melayani hasil build frontend (produksi).
  const distDir = path.join(__dirname, "..", "dist");
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.use(errorMiddleware);
  return app;
}