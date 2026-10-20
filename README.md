# Nuxt 5: module virtual nested under a directory alias → false Nitro v2 compat

Reproduction for https://github.com/nuxt/nuxt/pull/36619 (second case:
`follows a module virtual rather than a file its id would alias to`).
The first case (alias to a file → `ENOTDIR`) lives in a separate repro.

`modules/meta` sets

- alias `#meta` → `modules/meta/runtime/` (a **directory**)
- Nitro virtual `#meta/nitro`
- handler `runtime/handler.ts` that only does `import meta from '#meta/nitro'`
- `runtime/nitro.ts`, which imports `h3` (counts as nitro v2 code) and is **never bundled**

## Steps

```sh
pnpm install
pnpm build
```

### Actual

```
WARN  [NUXT_B9003] Nitro v2 compatibility was applied to server code from 1 module, because of what it imports:
  - meta (imports h3)
```

and the compat runtime plugins are bundled into the server:

```sh
grep -rl observeLegacyHooks .output/server   # → _libs/_nuxt/nitro-server.mjs, _ssr/ssr.mjs
```

Meanwhile the build itself correctly uses the virtual, so `nitro.ts` is not in the output:

```sh
node .output/server/index.mjs & curl localhost:3000/api/meta   # → {"from":"virtual"}
```

### Expected

No `NUXT_B9003` and no compat plugins: none of the bundled server code imports nitro v2 code.

### Control

Rename `runtime/nitro.ts` → `runtime/other.ts` (nothing else changes, the scanned code still
imports `h3`) and rebuild: no warning, no compat plugins.

## Cause

`setupNitroCompat` scans `runtime/` and flags `nitro.ts` for its `h3` import. `attributable()` should
discard that flag because no registered handler reaches `nitro.ts`, but its import walk resolves
specifiers through `resolveScopeImport`, which alias-expands `#meta/nitro` → `runtime/nitro` →
`runtime/nitro.ts` without first checking `nitroConfig.virtual`. The real build (NitroVirtualBridge)
resolves the virtual first, so the scan and the build disagree.

Versions: `nuxt-nightly@5.0.0-2610161133-5adfcb1`, Nitro `3.0.260903-beta`.
