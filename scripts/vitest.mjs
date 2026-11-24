// Runs Vitest with an upper-case drive letter in the working directory.
//
// On Windows, VS Code (and the Git Bash it spawns) can start in "c:\..." while
// Node resolves packages under "C:\...". Vitest then loads two copies of
// itself and every describe() fails with "Cannot read properties of undefined
// (reading 'config')". Starting it from "C:\..." keeps it to one copy.
// Everywhere else this is a plain `vitest` call.
import { spawnSync } from "node:child_process";
import path from "node:path";

const cwd = process.cwd().replace(/^[a-z]:/, (drive) => drive.toUpperCase());
const vitestBin = path.join(cwd, "node_modules", "vitest", "vitest.mjs");

const result = spawnSync(
  process.execPath,
  [vitestBin, ...process.argv.slice(2)],
  { cwd, stdio: "inherit" },
);
process.exit(result.status ?? 1);
