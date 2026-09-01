"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");
const STAGES = ["lint", "health-check", "build"];
const npmCli = process.env.npm_execpath;

function stop(message, exitCode = 1) {
  console.error(`\nValidation stopped: ${message}`);
  console.error("Summary: FAIL");
  process.exit(exitCode || 1);
}

if (!npmCli || !fs.existsSync(npmCli)) {
  stop("npm CLI path is unavailable. Run this pipeline with npm run validate.");
}

console.log("\nGlobalPLCParts safe local validation pipeline");
console.log(`Stages: ${STAGES.join(" -> ")}\n`);

const completed = [];

for (const stage of STAGES) {
  console.log(`\n=== ${stage} ===\n`);

  const result = spawnSync(process.execPath, [npmCli, "run", stage], {
    cwd: ROOT,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    stop(`${stage} could not start: ${result.error.message}`);
  }

  if (result.signal) {
    stop(`${stage} was terminated by signal ${result.signal}.`);
  }

  if (result.status !== 0) {
    stop(`${stage} failed with exit code ${result.status}.`, result.status);
  }

  completed.push(stage);
  console.log(`\n=== ${stage}: PASS ===`);
}

console.log("\nValidation summary");
for (const stage of completed) {
  console.log(`PASS  ${stage}`);
}
console.log("Summary: PASS — all required validation stages completed successfully.");
