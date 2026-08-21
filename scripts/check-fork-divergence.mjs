#!/usr/bin/env node
/**
 * Fork divergence guard — see FORK.md §3.
 *
 * Diffs this fork against its upstream merge-base and enforces the doctrine:
 * added files are always fine (additive divergence), but every modified,
 * deleted, or renamed-away upstream file must have an entry in
 * fork-ledger.json. Also warns about stale ledger entries (seams that no
 * longer diverge — e.g. upstream independently implemented the same thing).
 *
 * Usage:
 *   node scripts/check-fork-divergence.mjs              # working tree vs merge-base
 *   node scripts/check-fork-divergence.mjs --committed  # HEAD vs merge-base (CI)
 *
 * Env: FORK_UPSTREAM_REF overrides the upstream ref (default upstream/main).
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const UPSTREAM = process.env.FORK_UPSTREAM_REF ?? "upstream/main";
const committedOnly = process.argv.includes("--committed");
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
  return execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();
}

let mergeBase;
try {
  mergeBase = git("merge-base", UPSTREAM, "HEAD");
} catch {
  console.error(
    `Cannot resolve merge-base with "${UPSTREAM}". Run: git fetch upstream ` +
      "(or set FORK_UPSTREAM_REF).",
  );
  process.exit(2);
}

const ledgerPath = join(repoRoot, "fork-ledger.json");
const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
const ledgered = new Map(ledger.seams.map((seam) => [seam.path, seam]));

// -M detects renames so a moved upstream file reads as R (old path must be
// ledgered) rather than as an unexplained delete + add pair.
const diffArgs = ["diff", "--name-status", "-M", mergeBase];
if (committedOnly) diffArgs.push("HEAD");
const diff = git(...diffArgs);

/** @type {{status: string, path: string}[]} */
const touched = [];
for (const line of diff.split("\n").filter(Boolean)) {
  const [status, ...paths] = line.split("\t");
  if (status.startsWith("R")) {
    // A rename diverges at the old path (upstream still has it there).
    touched.push({ status: "D", path: paths[0] });
    touched.push({ status: "A", path: paths[1] });
  } else {
    touched.push({ status: status[0], path: paths[0] });
  }
}

const violations = [];
const seamsSeen = new Set();
for (const { status, path } of touched) {
  if (status === "A") continue; // additive divergence is always allowed
  if (ledgered.has(path)) {
    seamsSeen.add(path);
    continue;
  }
  violations.push({ status, path });
}

const stale = [...ledgered.keys()].filter((path) => !seamsSeen.has(path));

const added = touched.filter((entry) => entry.status === "A").length;
console.log(
  `Divergence vs ${UPSTREAM} (merge-base ${mergeBase.slice(0, 10)}): ` +
    `${added} added file(s), ${seamsSeen.size} ledgered seam(s), ` +
    `${violations.length} violation(s), ${stale.length} stale ledger entr(y/ies).`,
);

if (stale.length > 0) {
  console.log("\nStale ledger entries (no longer diverging — remove or investigate):");
  for (const path of stale) console.log(`  - ${path}`);
}

if (violations.length > 0) {
  console.error(
    "\nUpstream files modified or deleted WITHOUT a fork-ledger.json entry" +
      " (FORK.md §2-3: replace via extension points, remove via config," +
      " and ledger every seam):",
  );
  for (const { status, path } of violations) console.error(`  ${status}  ${path}`);
  process.exit(1);
}

console.log("Fork divergence check: OK");
