# Mỏ Vàng Náo Loạn

**Bãi Vàng Đầu Ca.** Căn hướng dây móc, nhấn Space hoặc chạm vào mỏ. Kéo đủ 600 vàng trong 75 giây, mua tiếp tế rồi tập lại Mỏ 1 với số vàng và vật phẩm còn trong túi.

## Build and playtest

From the repository root, use the pinned toolchain and run `pnpm install --frozen-lockfile` followed by `pnpm --filter @studio/mo-vang-nao-loan build`. Serve `games/mo-vang-nao-loan/dist` over HTTP for standalone play. The catalog route and library link are checked through the assembled artifact:

```sh
STUDIO_PAGES_BASE_SHA=$(git rev-parse origin/main) node scripts/catalog-preflight.mjs
```

The preflight adds this game to a temporary Pages catalog. In production, the game uses the Studio's canonical registry and GitHub Pages workflow. See [the checkpoint](production/PROGRESS.md) and [gameplay evidence](reports/QA_REPORT.md).
