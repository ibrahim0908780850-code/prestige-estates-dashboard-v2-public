import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { createContext } from "./_core/context";
import { appRouter } from "./routers";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
registerStorageProxy(app);
registerOAuthRoutes(app);

const trpcMiddleware = createExpressMiddleware({
  router: appRouter,
  createContext,
});

// Vercel can expose the function with either the /api prefix or a stripped path.
app.use("/api/trpc", trpcMiddleware);
app.use("/trpc", trpcMiddleware);

app.get(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
