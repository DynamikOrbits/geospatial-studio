# Geospatial Studio

[![Fork of GeoLibre](https://img.shields.io/badge/fork%20of-opengeos%2FGeoLibre-green.svg)](https://github.com/opengeos/GeoLibre)
[![image](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Geospatial Studio** is [DynamikOrbits](https://github.com/DynamikOrbits)' fork of
[**GeoLibre**](https://github.com/opengeos/GeoLibre), the free and open-source,
lightweight, cloud-native GIS platform created by
[Qiusheng Wu](https://github.com/giswqs). Everything that makes this app good —
the platform, the 1,000+ in-browser geoprocessing tools, the documentation —
is GeoLibre's work. This repository carries a deliberately small delta on top
of it and merges upstream regularly.

Like upstream, it is built with **Tauri v2**, **React**, **TypeScript**,
**MapLibre GL JS**, **DuckDB-WASM Spatial**, and **deck.gl**. The same
workspace runs as a native desktop app and in any modern web browser, for
visualizing, exploring, and analyzing geospatial data — all while keeping your
data local and private.

## What this fork changes

- **Identity** — the app is branded *Geospatial Studio*: wordmark, D
  lettermark, Inter / JetBrains Mono typography, and a dark surface theme.
- **Defaults** — a new workspace opens in **2D** on a **dark basemap**
  (OpenFreeMap Dark) instead of the globe.
- **Nothing else** — every other capability inherits from GeoLibre unchanged.

How we diverge is a contract, not an accident: [FORK.md](FORK.md) is the fork
doctrine, every modified upstream file is declared in
[fork-ledger.json](fork-ledger.json), and
[`scripts/check-fork-divergence.mjs`](scripts/check-fork-divergence.mjs) fails
when a change to an upstream file is not ledgered. The goal is that upstream
merges stay cheap forever, so GeoLibre's improvements keep flowing in.

## From GeoLibre

The features, documentation, and hosted services below are upstream GeoLibre's
work; apart from the branding and defaults above, they describe this fork
accurately too.

- **[GeoLibre Web](https://web.geolibre.app/)** — upstream's hosted build, the
  full app in your browser with nothing to install
- **[1,000+ geoprocessing tools](https://geolibre.app/user-guide/processing/#whitebox-toolbox)**
  — terrain, hydrology, LiDAR, remote sensing, and vector analysis running
  *entirely in your browser* on WebAssembly, with no server and no data ever
  leaving your machine
- **[Getting Started](https://geolibre.app/getting-started/)** — install, run
  from source, and configure
- **[Features](https://geolibre.app/features/)** — the complete feature list
- **[Demos](https://geolibre.app/demos/)** — a visual tour: 3D Tiles,
  planetary basemaps, the SQL Workspace, and embeds
- **[User Guide](https://geolibre.app/user-guide/interface/)** — a
  feature-by-feature reference for the interface, layers, styling, processing,
  plugins, and embedding
- **[Tutorials](https://geolibre.app/tutorials/)** — hands-on, end-to-end
  workflows

Reference docs checked into this repository (also upstream's):
[Architecture](docs/architecture.md) ·
[Project format](docs/project-format.md) ·
[Plugin API](docs/plugin-api.md) ·
[Internationalization](docs/i18n.md) ·
[Python package](docs/python.md) ·
[Contributing](docs/contributing.md)

## Running from source

Requires Node 22+ and npm (the repo tracks `package-lock.json`).

```bash
npm install
npm run dev        # web dev server → http://localhost:5173
npm run tauri:dev  # native desktop app (filesystem dialogs, local rasters)
npm run ci         # full local gate: build + frontend + worker + backend + rust
```

See the [Contributing](docs/contributing.md) guide for the development setup,
repository layout, and quality gate. Before touching an upstream file, read
[FORK.md](FORK.md) — this fork's changes are additive by design.

## Supporting GeoLibre

GeoLibre is free and open source, and this fork exists because of it. If
Geospatial Studio is useful to you, the most direct way to support the work it
is built on is to sponsor upstream:

- [**GitHub Sponsors**](https://github.com/sponsors/giswqs)
- [**Buy Me a Coffee**](https://buymeacoffee.com/giswqs)

## Citation

If you use this software in your work, please cite **GeoLibre** — the platform
is upstream's research and engineering:

> Wu, Q. (2026). GeoLibre: A lightweight, cloud-native GIS platform for
> visualizing, exploring, and analyzing geospatial data. Zenodo.
> <https://doi.org/10.5281/zenodo.20785400>

## License

[MIT](LICENSE) — the same license as GeoLibre. Upstream's copyright notice is
preserved; this fork does not claim upstream's work as its own.
