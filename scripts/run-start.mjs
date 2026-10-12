import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const standaloneDir = path.join(projectRoot, ".next", "standalone");
const serverEntry = path.join(standaloneDir, "server.js");

if (!existsSync(serverEntry)) {
  console.error(
    `Standalone server not found at ${serverEntry}.\n` +
      'Run "npm run build" first (the Dashboard uses Next.js standalone output).',
  );
  process.exit(1);
}

function copyRuntimeAsset(source, destination) {
  if (!existsSync(source)) return;
  rmSync(destination, { recursive: true, force: true });
  mkdirSync(path.dirname(destination), { recursive: true });
  cpSync(source, destination, { recursive: true });
}

// Next's standalone output deliberately omits these assets. Docker copies
// them as separate layers, so keep `npm start` behavior identical for local
// production validation and CI.
copyRuntimeAsset(path.join(projectRoot, ".next", "static"), path.join(standaloneDir, ".next", "static"));
copyRuntimeAsset(path.join(projectRoot, "public"), path.join(standaloneDir, "public"));

const portFlag = process.argv.indexOf("--port");
const port = portFlag >= 0 ? process.argv[portFlag + 1] : (process.env.PORT ?? "3000");
if (!port || !/^\d+$/.test(port)) {
  console.error("A numeric --port value is required when one is supplied.");
  process.exit(1);
}

const child = spawn(process.execPath, [serverEntry], {
  cwd: standaloneDir,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

child.on("exit", (code) => process.exit(code ?? 1));
