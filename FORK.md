# Fork doctrine — how Dynamik Studio stays a good GeoLibre fork

*This repo is a public fork of [opengeos/GeoLibre](https://github.com/opengeos/GeoLibre)
(MIT). This file is the contract that keeps upstream merges cheap forever and
keeps us a good citizen of the GeoLibre ecosystem. It is OUR file (it does not
exist upstream) and every contributor — human or agent — follows it.*

## 1. The model: merge-based soft fork

- `upstream` remote → opengeos/GeoLibre; `origin` → DynamikOrbits/dynamik-studio.
- We periodically **merge** upstream into our `main`
  (`git fetch upstream && git merge upstream/main`), we never rebase published
  history.
- The cost of every future merge is proportional to the **overlap** between our
  changes and upstream's churn. The entire doctrine below exists to keep that
  overlap tiny. A fork dies when merges get expensive; merges get expensive
  when divergence is invasive instead of additive.

## 2. The four categories of divergence

Every change we make falls in exactly one category, with a rule each:

| Category | Rule |
|---|---|
| **Inherit** | Everything we did not touch. The default. Upstream improvements flow in for free at every sync. |
| **Add** | New capability goes in **new files** (new modules, packages, plugins, tests, docs). Near-zero merge cost. This is where almost all Dynamik Studio work belongs — including the space scene, the Model tree, domain plugins, branding assets. |
| **Replace** | Never by editing upstream code in place. Replace through an **extension point** (UI Profiles, plugin API, config, registries). If the extension point does not exist, we add a **seam** (a minimal hook in an upstream file) and put our behavior in our own file. Seams are budgeted and ledgered (§3). |
| **Remove** | Never by deleting upstream code. Disable via config/build flags/profiles so the code stays merge-identical. Deletions conflict on every sync forever. |

Two hard prohibitions:

- **Never copy-paste-modify an upstream file** ("fork a component for
  convenience"). That creates an unmergeable zombie that silently rots.
- **Never edit an upstream file for styling/branding.** Branding goes through
  UI Profiles, tokens, and asset substitution in our own files (§6).

## 3. The seam ledger — the machine-checked delimitation

The delimitation you are asking "where does it live?" about lives here:
[`fork-ledger.json`](fork-ledger.json). Every upstream file we modify (a
**seam**) has an entry: path, why, and status —

- `upstream-candidate`: generic improvement we intend to PR to opengeos.
  Once merged upstream, the seam disappears from our diff — divergence shed.
- `permanent`: divergence we accept to carry (should be rare and small).

The guard: [`scripts/check-fork-divergence.mjs`](scripts/check-fork-divergence.mjs)
diffs `upstream/main...HEAD` and fails when an upstream file is modified or
deleted without a ledger entry (added files are always fine). Run it before
any PR and in CI:

```bash
node scripts/check-fork-divergence.mjs
```

It also flags **stale ledger entries** (seams that healed — e.g. after an
upstream PR landed) so the ledger stays honest in both directions.

## 4. The sync ritual

**Small and often beats big and rare.** GeoLibre moves fast; monthly (or
per-upstream-release) syncs keep every conflict trivial.

1. `git fetch upstream`
2. Branch `sync/upstream-YYYY-MM-DD`, `git merge upstream/main`.
3. Resolve conflicts — they can only be in ledgered seams, so the ledger is
   the review checklist. A conflict outside the ledger means someone broke §2.
4. `node scripts/check-fork-divergence.mjs` (re-ledger or heal as needed).
5. Full proof: `npm run build`, `npm run test:frontend`, `npm run test:e2e`.
   Compare against the previous baseline record; upstream test-count grows,
   our added tests stay green.
6. PR into `main` with a short sync note: upstream range merged, seams
   touched, anything newly disabled/replaced.

## 5. Upstream-first citizenship

We keep GeoLibre's MIT license and we want to be a good fork in the spirit of
the opengeos project:

- **Generic before specific.** Any seam that is not space-domain-specific is
  written to upstream quality (their code style, docs section, tests) and
  offered as a PR to opengeos. Our first seam — plugin-contributed assistant
  tools — is exactly that kind of candidate.
- **Attribution stays.** Upstream LICENSE and copyright notices are preserved;
  the About surface says "based on GeoLibre" with a link; we do not claim
  upstream's work as ours.
- **We report bugs upstream** when we find them, with repros, even when we
  also patch locally to unblock.
- Space-domain capability (orbits, constellations, simulation, catalogs) is
  OUR product and stays in our own modules and in the dynamik-mono-next
  plugins — it is additive, so it burdens neither upstream nor the merge.

## 6. Branding and identity

Progressive, and never by repainting upstream components:

1. **Now**: name, logo, icons, window/tab title, About text — via UI Profiles
   and asset substitution from our own `branding/` files.
2. **Then**: color tokens / theme aligned with the DKO design system through
   the theming surface GeoLibre already exposes.
3. **Only if ever needed**: deeper chrome changes as ledgered seams — each one
   justified, because every one taxes every future sync.

## 7. Where product architecture lives

This file governs *how we diverge*. *What we build* is specified in
`dynamik-mono-next/apps/dynamik-studio/docs/` (vision, architecture,
asset map, spike records, open questions). The fork carries the generic
platform delta; the product and its domain plugins live in the monorepo.
