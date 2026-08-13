import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { estateRouter } from "./routers/estate";

export const appRouter = router({
  system: systemRouter,
  estate: estateRouter,
});

export type AppRouter = typeof appRouter;
