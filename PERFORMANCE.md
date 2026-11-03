# Performance and verification

Measured on 2026-11-03 on this Windows machine using Intel UHD Graphics through ANGLE Direct3D 11. Edge 156.0.4314.58 and Playwright Chromium 156.0.8078.4 ran headlessly with the hardware renderer explicitly verified. A separate SwiftShader run was excluded from hardware comparisons.

Each case is one 12-second real-time sample after a two-second warmup near Alpha: cannon held, missile launch every 2.1 seconds, enemy firing deferred to avoid ending the sample. These are rendered frames, not stepped simulation timings. Random effects and scheduling introduce variation. These are spot checks, not sustained thermal or full-sortie benchmarks.

| Case | Mean frame interval | Approx FPS* | p95 interval | Mean draw calls |
|---|---:|---:|---:|---:|
| Edge before, High 720p | 56.9 ms | 17.6 | 72.6 ms | 461 |
| Edge after, High 720p | 39.4 ms | 25.4 | 72.4 ms | 153 |
| Chromium before, High 720p | 57.1 ms | 17.5 | 70.4 ms | 466 |
| Chromium after, High 720p | 41.4 ms | 24.2 | 70.2 ms | 151 |
| Edge after, High 1080p | 61.8 ms | 16.2 | 123.0 ms | 149 |

*FPS equivalent of the measured mean frame interval. 720p is 1280x720; 1080p is 1920x1080. Native framebuffer resolution was retained.

The main structural change batches 245 static player-model meshes while preserving the rotor, cannon recoil and rack anchors. Impact fragments and sand marks use instances; vehicle marks batch in bounded groups. Unused hangar geometry is disabled during sorties. Pointer picking unused by the flight controls is skipped. The arithmetic terrain hash avoids per-pixel trigonometry.

High remains the default. Balanced changes distant terrain density, shadow filtering/refresh and effect budget; it does not reduce resolution, remove enemies or replace their models. Toggle it in Flight Controls or Pause.

The 1080p result and p95 intervals show remaining GPU/burst limits on this integrated GPU. This is not a smooth 60 FPS or 4K/60 result. Sustained play, Firefox, Safari, mobile/touch, other GPUs and drivers still need direct testing. Further work includes authored vehicle LODs and profiling dense effects at higher resolutions; mesh simplification must preserve appearance and animation ([glTF Transform documentation](https://gltf-transform.dev/modules/functions/functions/simplify)).

## Repeat verification

Install runtime dependencies with `npm ci --prefix engine-prototype` and test dependencies with `npm ci`. Run `npm run check`, `npm test`, and `npm run build`. For browser fixtures, install Chromium with `npx playwright install chromium`, start `python -m http.server 8765 --bind 127.0.0.1`, then run `npm run test:browser` from a separate terminal. On Windows, set `$env:HARDWARE='1'` to request Direct3D; default tests permit software rendering. `$env:BROWSER='edge'` selects an installed Edge.

`node scripts/benchmark-browser.cjs` records raw JSON under ignored `audit/performance/`. Set `HARDWARE`, `BROWSER`, `QUALITY`, `WIDTH`, `HEIGHT` and `LABEL` as needed; read the returned renderer rather than assuming GPU acceleration. Performance tests must run sequentially.

The mission-flow browser fixture checks phase/wave/extraction gates using controlled target states and counts targets in all three missions. It does not claim a human completed or timed every mission. Fired-round damage, destruction, aircraft crash and landing are covered by separate integration fixtures.
