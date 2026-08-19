import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { createContext } from "../server/_core/context";
import { appRouter } from "../server/routers";

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

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

export default app;
