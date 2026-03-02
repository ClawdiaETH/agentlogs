# Agentlogs v2 — Complete Build Log

**Commit:** `417c314`
**Date:** 2026-03-02
**Branch:** `master`

---

## Overview

Complete implementation of the generative art pipeline, day log assembler, daily cron automation, and gallery enhancements for `agentlogs.vercel.app`. Previously the pipeline fell back to placeholder PNGs and hardcoded stub data — now it renders real 16-layer glitch art driven by live DexScreener and GitHub data.

---

## Phase 1: Dependencies + Foundation

### Installed
- `@napi-rs/canvas` — Vercel-compatible canvas (prebuilt Rust N-API binaries, no Cairo dependency)
- `ethers` — added to root `package.json` for cron endpoint (was only in `contracts/`)

### Created
| File | Purpose |
|------|---------|
| `public/fonts/JetBrainsMono-Regular.ttf` | Raw font file for canvas text rendering |
| `lib/renderer/types.ts` | Core interfaces: `DayLog`, `Colors`, `Commit`, `Replies`, `LayerFn` |
| `lib/renderer/prng.ts` | `mulberry32()` seeded PRNG, `hslToHex()`, `sampleRole()` |
| `lib/renderer/palette.ts` | 12 palette definitions (INCIDENT → SURGE), `selectPalette()` priority chain, `computeGlitchIndex()` |

### Modified
| File | Change |
|------|--------|
| `next.config.ts` | Added `serverExternalPackages: ['@napi-rs/canvas']` to prevent Turbopack from bundling the native module |
| `package.json` | Added `@napi-rs/canvas` and `ethers` to dependencies |

---

## Phase 2: 16-Layer Renderer

### `lib/renderer/index.ts` — Orchestrator
- Creates a 760×760 canvas via `@napi-rs/canvas`
- Registers JetBrains Mono font from `public/fonts/`
- Seeds PRNG: `dayNumber * 0x9e3779b9 % 0x100000000`
- Executes all 16 layers in order with `ctx.save()`/`ctx.restore()` isolation
- Returns `Buffer` (PNG)
- **Deterministic:** same `DayLog` always produces the same image

### 16 Layer Files (`lib/renderer/layers/`)

| # | File | What It Draws |
|---|------|---------------|
| 1 | `background.ts` | Solid BLK fill |
| 2 | `noise.ts` | 3000–5000 seeded random pixels in WHT/DOM at very low opacity |
| 3 | `momentum.ts` | Green (up) or red (down) diagonal gradient wash, max 16% opacity, magnitude = `|change24h| / 20` |
| 4 | `sky.ts` | DOM color linear gradient over top 60% of canvas at 12% opacity |
| 5 | `waterfall.ts` | 12–20 tall vertical streaks in DOM/SEC, width scaled by `mcapNorm` (1.0–1.8×) |
| 6 | `glitch.ts` | Horizontal pixel displacement via `getImageData`/`putImageData`, band count and shift distance driven by `glitchIndex` |
| 7 | `geometry.ts` | Filled rects with corner ticks, concentric squares, glitch strips, barcodes, crosses, dot grid, mosaic patches, edge bleeds |
| 8 | `log-text.ts` | 20 operational log templates (`HEARTBEAT: latency {}ms`, `TX_POOL: {} pending`, etc.) scattered across upper half |
| 9 | `replies.ts` | Twitter handles in DOM color, Farcaster handles in ACC, seeded positions |
| 10 | `commits.ts` | Commit messages in SEC (known repos) / DOM (unknown), SHA stubs beneath at half opacity |
| 11 | `code-rain.ts` | Vertical hex columns in right half, density = `min(1, commitCount/30) × 18` columns, fading downward |
| 12 | `repo-glyphs.ts` | Bracketed tags `[SB]`, `[AN]`, `[AF]`, `[BC]`, `[CD]`, `[SP]` in lower-left zone |
| 13 | `price-waveform.ts` | Distorted signal line at ~82% from top, momentum-driven drift + amplitude, glitch tears, price/MCAP labels |
| 14 | `scanlines.ts` | Full-canvas horizontal lines every 3px, opacity scaled by `glitchIndex` |
| 15 | `metadata-line.ts` | Bottom bar: `$CLAWDIA / BASE / MCAP $X.XXM / PALETTE_NAME` |
| 16 | `watermark.ts` | Seed hex + date string, lower-right corner at 25% opacity |

---

## Phase 3: Day Log Assembler

### `lib/assembler/dexscreener.ts`
- Fetches `https://api.dexscreener.com/token-pairs/v1/base/0xbbd9...`
- Picks pair with highest `liquidity.usd`
- Extracts: `priceUsd`, `marketCap`, `change24h`, `volume24h`, `buys24h`, `sells24h`
- Derives: `mcapNorm = min(1, log10(mcap/1000)/5)`, `momentumSign`, `momentumMag = min(1, |change24h|/20)`
- Graceful fallback to zeros on API failure

### `lib/assembler/github.ts`
- Fetches `https://api.github.com/users/ClawdiaETH/events/public?per_page=100`
- Filters `PushEvent` from last 24 hours
- Extracts per commit: `sha[0:7]`, `message` (first line, 72 chars), `repo` (org prefix stripped), `timestamp`
- Known repo → glyph map for renderer layer 12
- Derives `peakHourFromCommits` from UTC hour with most activity
- Uses `GITHUB_TOKEN` if available (avoids rate limits)

### `lib/assembler/operational.ts`
- Stub returning defaults: `{ txns: 0, posts: 0, errors: 0, messages: 0, peakHour: 12, replies: { twitter: [], farcaster: [], combined: [] } }`
- Extensible — real stats from Clawdia's logging system can be plugged in later

### `lib/assembler/index.ts`
- `assembleDayLog(dayNumber, date, agentSlug)` — fan-out/fan-in via `Promise.all`
- Merges all three data sources
- Computes `glitchIndex`, selects palette, derives seed
- Returns full `DayLog` object

---

## Phase 4: Pipeline + Cron

### Created
| File | Purpose |
|------|---------|
| `lib/pinata.ts` | `uploadImage(buffer, name, jwt)` and `uploadMetadata(json, name, jwt)` — shared Pinata IPFS upload functions |
| `lib/contract.ts` | `mintNFT(metadataUri, contractAddress, privateKey)` — mints on AgentCollection, returns `tokenId` + `txHash` |
| `lib/github-commit.ts` | `commitRegistry(content, message, token)` — commits updated `data/registry.json` via GitHub Contents API (triggers Vercel redeploy) |
| `lib/pipeline.ts` | `runPipeline(secrets)` — full orchestrator: assemble → render → upload image → build + upload metadata → mint → update registry → commit to GitHub |
| `app/api/cron/daily-mint/route.ts` | Vercel cron endpoint. Verifies `Authorization: Bearer $CRON_SECRET`, calls `runPipeline()`, `maxDuration = 60` |
| `vercel.json` | Cron schedule: `0 6 * * *` (6:00 AM UTC daily) |

### Pipeline Metadata
The pipeline now builds rich ERC-721 metadata with a first-person description template:
> "Day 5. 12 commits across SpellBlock and Anons DAO. 3 errors. $CLAWDIA market cap $420K, up 6.9%."

### Modified
| File | Change |
|------|--------|
| `scripts/mint-and-list.mjs` | Fixed registry path from `site/data/registry.json` → `data/registry.json`. Renamed unused `dayLog` param to `_dayLog`. |

### Required Env Vars (Vercel Dashboard)
| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Protects cron endpoint |
| `PRIVATE_KEY` | Wallet key for minting |
| `PINATA_JWT` | IPFS uploads |
| `GITHUB_TOKEN` | Commit registry.json updates |
| `NEXT_PUBLIC_SALE_CONTRACT` | `0x0673834e66b196b9762cbeaa04cc5a53dfe88b6d` |

---

## Phase 5: Metadata Enhancements

### Modified: `app/api/metadata/[tokenId]/route.ts`

Expanded from 8 to 18 attributes:

| Attribute | Source |
|-----------|--------|
| Agent | registry |
| Day | registry |
| Date | registry |
| Palette | registry (`paletteLabel` or `paletteName`) |
| Palette ID | registry (`paletteId` or `paletteName`) |
| Commit Count | `stats.commits` |
| Errors | `stats.errors` |
| Messages | `stats.messages` |
| Txns | `stats.txns` |
| Posts | `stats.posts` |
| Peak Hour UTC | `stats.peakHour` (formatted as `HH:00`) |
| Glitch Index | `stats.glitchIndex` |
| MCAP USD | `stats.mcap` |
| 24h Change | `stats.change24h` |
| Momentum | Derived: Bullish (>2%), Bearish (<-2%), Neutral |
| Price (ETH) | registry |
| Status | Sold / Available |
| Renderer Version | `v2` |

Description now uses a first-person template built from stats instead of a generic string.

---

## Phase 6: Gallery Enhancements

### New Components

| Component | Type | Purpose |
|-----------|------|---------|
| `components/PieceCard.tsx` | Server | Extracted gallery card — links to `/gallery/{tokenId}`, shows image, day, date, price, palette strip, UNCLAIMED badge for unsold pieces |
| `components/VaultBadge.tsx` | Server | Standalone "UNCLAIMED" badge |
| `components/StatsGrid.tsx` | Server | Reusable stats display grid with palette strip showing hex codes |
| `components/LivePrice.tsx` | Client | Fetches DexScreener every 60s, shows live `$CLAWDIA $0.00XXXX +X.X%` with green/red coloring |
| `components/PaletteFilter.tsx` | Client | Palette filter chips using URL `searchParams`, updates without page reload |

### New Page: `app/gallery/[tokenId]/page.tsx`
- Full-width image (max 760px)
- All traits via `StatsGrid` with palette hex codes
- `BuyButton` (if unsold) or "Sold" indicator
- Links: IPFS image, IPFS metadata, Basescan mint tx, contract address
- Prev/Next navigation between pieces
- `generateStaticParams()` from registry for SSG

### Modified Pages

| Page | Changes |
|------|---------|
| `app/gallery/page.tsx` | Accepts `searchParams.palette` for filtering. Cards now link to `/gallery/{tokenId}`. Added `PaletteFilter` component. Added `LivePrice` to header. UNCLAIMED badge on unsold pieces. |
| `app/page.tsx` | Added `LivePrice` to header. Replaced inline stats grid with `StatsGrid` component. |
| `app/[agent]/page.tsx` | Added `LivePrice` to header. Replaced inline stats grid with `StatsGrid` component. |

---

## Phase 7: Cleanup

### Deleted
- `site/data/registry.json` — legacy duplicate of `data/registry.json`
- `site/` directory — was empty aside from old `.next` cache and `node_modules`

### ESLint Config (`eslint.config.mjs`)
- Added `argsIgnorePattern: "^_"` to `@typescript-eslint/no-unused-vars` (allows `_param` convention for unused callback args)
- Added `contracts/**` to `globalIgnores` (Hardhat config uses `require()` which conflicts with TS rules)

### Build Verification
- `npm run build` — passes cleanly (0 errors)
- `npm run lint` — passes cleanly (0 errors, 0 warnings)
- All routes generate correctly: static (`/`, `/clawdia`), SSG (`/gallery/1`), dynamic (`/api/*`, `/gallery`)

---

## Files Summary

### Created (37 files)
```
lib/renderer/types.ts
lib/renderer/prng.ts
lib/renderer/palette.ts
lib/renderer/index.ts
lib/renderer/layers/background.ts
lib/renderer/layers/noise.ts
lib/renderer/layers/momentum.ts
lib/renderer/layers/sky.ts
lib/renderer/layers/waterfall.ts
lib/renderer/layers/glitch.ts
lib/renderer/layers/geometry.ts
lib/renderer/layers/log-text.ts
lib/renderer/layers/replies.ts
lib/renderer/layers/commits.ts
lib/renderer/layers/code-rain.ts
lib/renderer/layers/repo-glyphs.ts
lib/renderer/layers/price-waveform.ts
lib/renderer/layers/scanlines.ts
lib/renderer/layers/metadata-line.ts
lib/renderer/layers/watermark.ts
lib/assembler/index.ts
lib/assembler/dexscreener.ts
lib/assembler/github.ts
lib/assembler/operational.ts
lib/pinata.ts
lib/contract.ts
lib/github-commit.ts
lib/pipeline.ts
app/api/cron/daily-mint/route.ts
app/gallery/[tokenId]/page.tsx
components/PieceCard.tsx
components/VaultBadge.tsx
components/StatsGrid.tsx
components/LivePrice.tsx
components/PaletteFilter.tsx
public/fonts/JetBrainsMono-Regular.ttf
vercel.json
```

### Modified (9 files)
```
package.json          — added @napi-rs/canvas, ethers
package-lock.json     — lockfile update
next.config.ts        — serverExternalPackages
eslint.config.mjs     — underscore ignore + contracts ignore
scripts/mint-and-list.mjs — fixed registry path, unused param
app/api/metadata/[tokenId]/route.ts — 18 attributes + description
app/gallery/page.tsx  — filtering, card links, LivePrice
app/page.tsx          — LivePrice, StatsGrid
app/[agent]/page.tsx  — LivePrice, StatsGrid
```

### Deleted (1 file)
```
site/data/registry.json
```

---

## Architecture

```
DexScreener API ──┐
GitHub Events API ─┤──► assembleDayLog() ──► DayLog
Operational Stub ──┘                            │
                                                ▼
                                         renderImage()
                                         (16 layers)
                                                │
                                                ▼
                                          760×760 PNG
                                                │
                                    ┌───────────┴───────────┐
                                    ▼                       ▼
                              uploadImage()          uploadMetadata()
                              (Pinata IPFS)          (Pinata IPFS)
                                    │                       │
                                    └───────────┬───────────┘
                                                ▼
                                           mintNFT()
                                        (Base onchain)
                                                │
                                                ▼
                                        commitRegistry()
                                       (GitHub API push)
                                                │
                                                ▼
                                        Vercel redeploy
```

**Trigger:** Vercel cron → `GET /api/cron/daily-mint` at 6:00 AM UTC daily.
