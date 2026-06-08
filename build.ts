import { copyFileSync, cpSync, mkdirSync, existsSync, rmSync } from "fs";
import path from "path";

const isWatch = process.argv.includes("--watch");
const outDir = path.resolve("dist");

// Clean dist
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// Bundle the side panel React app
const panelResult = await Bun.build({
  entrypoints: ["src/panel/main.tsx"],
  outdir: path.join(outDir, "panel"),
  naming: "[name].[ext]",
  target: "browser",
  format: "esm",
  minify: !isWatch,
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      isWatch ? "development" : "production"
    ),
  },
});

if (!panelResult.success) {
  console.error("Panel build failed:", panelResult.logs);
  process.exit(1);
}

// Bundle the service worker
const swResult = await Bun.build({
  entrypoints: ["src/background/service-worker.ts"],
  outdir: outDir,
  naming: "[name].[ext]",
  target: "browser",
  format: "esm",
  minify: !isWatch,
});

if (!swResult.success) {
  console.error("Service worker build failed:", swResult.logs);
  process.exit(1);
}

// Bundle the content script for image capture
if (existsSync("src/content/capture-image.ts")) {
  const captureResult = await Bun.build({
    entrypoints: ["src/content/capture-image.ts"],
    outdir: outDir,
    naming: "capture-image.[ext]",
    target: "browser",
    format: "iife",
    minify: !isWatch,
  });

  if (!captureResult.success) {
    console.error("Capture image content script build failed:", captureResult.logs);
    process.exit(1);
  }
}

// Bundle the remove.bg automation content script
if (existsSync("src/content/removebg-automation.ts")) {
  const removebgResult = await Bun.build({
    entrypoints: ["src/content/removebg-automation.ts"],
    outdir: outDir,
    naming: "removebg-content.[ext]",
    target: "browser",
    format: "iife",
    minify: !isWatch,
  });

  if (!removebgResult.success) {
    console.error("remove.bg content script build failed:", removebgResult.logs);
    process.exit(1);
  }
}

// Copy static files
copyFileSync("src/manifest.json", path.join(outDir, "manifest.json"));
copyFileSync("src/panel/index.html", path.join(outDir, "panel", "index.html"));
if (existsSync("public/icons")) {
  cpSync("public/icons", path.join(outDir, "icons"), { recursive: true });
}

console.log("Build complete → dist/");
