import { mkdir } from "node:fs/promises";
import { build } from "esbuild";

await mkdir("api", { recursive: true });

await build({
  entryPoints: ["server/vercelApi.ts"],
  outfile: "api/index.js",
  bundle: true,
  packages: "external",
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
});

console.log("Built bundled Vercel API function at api/index.js");
