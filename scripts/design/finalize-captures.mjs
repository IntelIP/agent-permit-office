import { execFileSync, spawnSync } from "node:child_process";

const sourceCommit = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const artifactBaseUri = process.env.TABELLIO_ARTIFACT_BASE_URI?.trim();
if (!artifactBaseUri) {
  throw new Error("TABELLIO_ARTIFACT_BASE_URI is required; visual evidence without a durable URI is blocked.");
}

const args = [
  "--repo", ".",
  "--profile", "design/product.design.json",
  "--captures-dir", ".artifacts/tabellio/visual-captures",
  "--artifact-base-uri", artifactBaseUri,
  "--source-commit", sourceCommit,
  "--out", ".artifacts/tabellio/visual-baseline-candidate.json",
];
const script = process.env.TABELLIO_DESIGN_CAPTURES_SCRIPT?.trim();
const command = script ? process.execPath : "tabellio-design-captures";
const result = spawnSync(command, script ? [script, ...args] : args, {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
const payload = JSON.parse(result.stdout);
console.log(`Visual capture count: ${payload.captureCount}`);
