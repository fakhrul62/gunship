# Gunship - Rotor Strike

Current follow-up work: [release progress](RELEASE-PROGRESS.md) and [measured performance, limitations and test commands](PERFORMANCE.md). High/Balanced graphics controls preserve native resolution.

Play: https://fakhrul62.github.io/gunship/

A browser helicopter combat game built with Babylon.js. Includes an interactive 3D hangar, third-person flight, three staged missions, enemy helicopters, animated tanks and turrets, a tactical minimap, cannon ballistics, missile locking, explosions and debris. All missions and weapons are free.

## Controls

Mouse: steer. WASD: move. Shift + W: boost. Q/E: descend/climb. Click or Space: cannon. R: missile. F: flares. Escape: pause. Hold the sight on a target for 1.3 seconds to acquire missile guidance; missiles can also launch unguided.

## Run locally

Requires Node.js and Python:

```sh
npm ci --prefix engine-prototype
python -m http.server 8765
```

Open http://127.0.0.1:8765/. Modern desktop browser with WebGL and keyboard/mouse required. Touch controls are not complete.

## Build and publish

```sh
node scripts/build.cjs
python -m http.server 8766 --directory dist
```

The build copies only active game assets and vendors Babylon.js into `dist`. Pushing to `main` deploys this folder through GitHub Actions to GitHub Pages. Local dependencies, test screenshots and unused soldier/old turret assets are excluded.

The current damage and projectile systems are game simulations; structural destruction and full aircraft simulation are not implemented. Earlier renderer scripts remain in the repository for reference; the active game is `engine-prototype/engine.js`.

## Photographic materials and lighting

The local build uses Poly Haven Aerial Rocks 01 and Brown Mud Dry 2K color, OpenGL normal, and packed AO/roughness/metallic maps. The terrain blends these materials in world space with randomized texture offsets to reduce visible repetition. A 1K Kloofendal daylight HDR provides environmental lighting and the sky. Source links and CC0 information are in `assets/materials/sources.json`. Textures are stored locally as WebP; no runtime requests to the provider are needed. Powered by Poly Haven.

Optional effects prepared from the supplied Downloads folder stay in ignored `local-effects/` and are not bundled into the public build. Use `python scripts/prepare-effects.py` with Pillow and imageio-ffmpeg installed to regenerate those local assets.

## Native resolution and horizon update

Rendering now follows the display pixel ratio (up to 2x CSS size), with no automatic reduction of framebuffer resolution. A 3840x2160 viewport renders at 3840x2160. The battlefield is a single continuous height field with matching triangle-based collision heights, sparse instanced stones, and three separate distant ridge layers extending the visible landscape beyond the combat area. A separate 4096x2048 photographed sky replaces the low-resolution background cube. Ground detail normals fade with distance to reduce shimmer. Helicopter painted surfaces receive subtle normal and roughness detail; the tank retains its authored PBR texture maps.

### Desert visibility revision

The active terrain material restores the original tan desert image with restrained shading and fewer physical stones, improving contrast against dark vehicles. The distant scenery now uses one irregular 52 km height field rather than concentric ridge bands. Flight starts after the scene materials finish preparing. Native rendering resolution and the 4K sky remain enabled.

## Desert combat sector

The current local sector has a curved convoy route linking a forward base, Alpha checkpoint and Bravo radar station. Static defensive walls, shelters, containers, drums and towers are merged into six draw groups. Walls block projectiles and sightlines and reduce nearby indirect blast damage. The minimap displays the road; tanks steer toward it and follow it into their assigned positions. Helicopters patrol in paired offsets before contact and maneuver around the player during combat. All enemy models are placed before takeoff. HUD labels have a contrast backing and missile status is below the aircraft.

Validation covers road projection and cover intersection, native-resolution rendering, boosted approach flight, nearby enemy detection, transition into the assault, weapon firing, pause/resume and restarting another mission. This is a playable desert-sector implementation; environment props are lightweight procedural geometry rather than photogrammetric building models.

## Selected imported buildings and sounds

Five static buildings/props and three weapon/impact sounds from the supplied Gunship Battle APK are packaged under `assets/gunship/` for the hosted game. These assets are separate from the CC0 Poly Haven materials. The full extraction output, reports and unused models remain ignored under `local-apk-assets/`. The selected GLBs embed their textures and do not require the original APK at runtime. The separate optional explosion pack remains local-only.

## Tank destruction: first realism stage

Fatal damage to the animated tank now produces an independently burned hull and detaches up to six authored components (turret, gun assembly, hatches and wheels). Components preserve their world pose on separation, carry bounded linear/angular motion, fall under gravity, bounce with damping and sleep after settling. The wreck and separated parts persist for the sortie and are removed on mission cleanup. Burned materials are cloned per wreck so another tank is not recolored. The component simulation is deliberately lightweight; it does not implement mesh fracture, armor penetration, or general rigid-body collisions between fragments and structures.

## Coordinated destruction effects: second realism stage

`assets/effects/` now contains a shared hosted/local effect library, with source credits and modification notes in `CREDITS.md`. Fatal tank damage combines the component breakup with a short-lived light/flash, animated explosion, outward dust, rising smoke, a terrain-conforming scorch mark and wreck fire. Fire emits for 24 seconds and smoke for up to 45 seconds. Missile kills suppress the duplicate fatal-hit blast. Sprite, flash-light, audio voice and scorch counts are bounded. Explosion audio is delayed by distance, attenuated, filtered and panned; queued sounds use simulation time so pausing and mission cleanup do not leave delayed sounds behind.

Tests use controlled fixtures to check component settling/material isolation, fatal-hit integration, flash expiry, persistent fire/smoke, delayed audio and pause/resume, and zero residual effects after leaving a mission. These sprites improve presentation but do not constitute volumetric fire or physically simulated combustion.

## Cannon presentation: third realism stage

The player cannon now measures its muzzle from the supplied model's barrel-tip mesh. Rounds spawn at that attachment after aircraft movement/rotation. Short crossed flash planes and a small gas puff follow the firing direction; a damped, substepped recoil motion returns the barrel and tip to their authored positions. Camera shake is restrained. One in three cannon rounds is drawn as a tracer; all rounds retain their gravity, dispersion, swept collision and damage. Tracers use a shorter 4 ms exposure length and bounded screen-size compensation rather than the earlier long thick glowing cylinders. Pooled rounds restore visibility on reuse. The close side-view capture verifies the flash at the actual gun; the aircraft body naturally occludes part of the underside mount in the rear chase view.

`node scripts/test-cannon-presentation.cjs` checks attachment detection, projectile movement from the muzzle, flash expiry, recoil/return, tracer cadence and bounded tracer length. `node scripts/test-destruction-effects.cjs` additionally checks real fired-round damage, tank breakup and coordinated effects.

## Missile presentation and flight: fourth realism stage

The player missile launch uses left/right rack anchors measured from elongated green weapon meshes. Successive launches alternate racks. The projectile has a short unpowered separation phase (0.16 seconds), then ignition and thrust, with a 3.8-second motor cutoff. Burnout hides the flame and transitions into drag/gravity flight. Smoke is emitted along traveled distance rather than by long frame timers, with its own bounded sprite budget. A locked missile begins steering after separation, has a limited turn rate, and permanently loses guidance after sustained terrain/cover obstruction or target destruction. Unguided launches remain available. Pooled missiles reset flight metadata, flame and trajectory state on reuse.

`node scripts/test-missile-flight.cjs` checks separation, ignition, tracking, obstruction loss, burnout and trail generation. `node scripts/test-missile-presentation.cjs` checks real rack anchors, alternate launches and phase/flame state in-browser. This remains a simplified game flight model, not an aerodynamic missile simulator.

## Surface-specific impacts: fifth realism stage

Cannon impacts now use the nearest collider's surface and hit normal. Armor produces reflected spark streaks, small smoke and an attached mark; concrete produces pale chips/dust and a projected mark; sand produces tan grit/dust and a ground mark. Impact marks are cosmetic and excluded from projectile collision, follow their vehicle mesh, and are removed on mission exit. Physical impact chips are pooled and capped at 120; persistent marks are capped at 80. Cover retains material and entry-normal information after static mesh merging. Imported oil-tank props classify as metal rather than concrete.

`node scripts/test-surface-impacts.cjs` uses fired-round fixtures against actual sand, concrete and armor, checks the resulting fragment materials/marks, moves the marked vehicle to verify attachment and checks cleanup. Marks do not deform geometry or imply physical armor penetration; armor penetration remains separate work; tank component damage is described below.

## Tank component damage: sixth realism stage

The animated tank now has separate track, rear engine and weapon health. Actual impacted mesh names identify wheels/tracks and gun assemblies; rear hull hit position identifies the engine region. Partial track/engine damage reduces movement speed. Track or engine failure immobilizes the tank, while weapon failure stops aiming, deployment animation and firing. Damaged engine regions emit localized smoke; disabled track and gun materials darken independently. Blast damage also spreads to components. Component hits apply different hull damage, and a disabled tank remains a live mission target until its hull is destroyed.

`node scripts/test-component-rules.cjs` checks classification and damage rules. `node scripts/test-vehicle-components.cjs` sends fired rounds into the actual tank meshes, verifies partial/final damage, then checks that an immobilized tank can still fire and a gun-disabled tank cannot. The fixture also checks another tank remains healthy and no kill is awarded for disabling components. This stage applies to tanks only; it does not simulate armor thickness, penetration, or helicopter component failure.

## Enemy helicopter failures: seventh realism stage

Enemy helicopters now track engine, main rotor and tail health separately. The supplied helicopter uses a skinned body, so engine/tail hit regions follow its authored mast/tail anchors; the spinning blade assembly receives rotor hits. Partial engine or rotor damage reduces flight speed and rotor speed. Critical engine, rotor, tail or hull failure starts an irreversible crash, disables firing and target lock, and awards one aircraft-down count. The aircraft retains measured flight velocity, loses altitude with gravity, and turns or rolls during descent. Engine-out descent retains simplified partial rotor lift; tail failure produces faster yaw. This is a game motion model, not an aerodynamic or armor penetration simulation.

Cannon kills no longer create an immediate airborne fireball. The terrain contact triggers one explosion, scorch, burned material finish and persistent wreck fire/smoke. Missile impact still has its own detonation. Helicopter materials are cloned per wreck and removed with the mission; other aircraft retain their normal finish. Crashed helicopters remain visible until mission cleanup.

`node scripts/test-aircraft-damage.cjs` checks hit regions, slowdown, inertia, single ground impact, material isolation and disposal. `node scripts/test-aircraft-integration.cjs` uses real fired rounds against the supplied helicopter model and checks engine/tail/rotor failures, descent, ground impact, mission counting and cleanup. This stage covers enemy aircraft; the player's damage remains hull based.

## Player damage and emergency landing: eighth realism stage

The player helicopter now has engine, main rotor and tail-control health in addition to hull health. Incoming rounds use the impacted rotor assembly or body-local engine/tail regions; nearby missile blasts also damage systems. Partial engine/rotor damage reduces available speed, climb and boost; tail damage reduces mouse steering and lateral response. The HUD shows damaged systems and explains an emergency. Every sortie starts with fresh system health.

Engine failure retains steering and weapons but causes a forced descent. Hold Q to flare, release W to slow, and aim for clear ground: a touchdown below 8 m/s vertical and 18 m/s horizontal speed preserves the crew and ends the sortie as an emergency landing. Rotor loss or hull destruction instead causes a gravity-driven crash with firing disabled; terrain impact triggers the explosion and failure debrief. Mission progression pauses during these emergencies. Pause/resume also pauses the descent. This is simplified gameplay physics with terrain contact; it does not model full autorotation aerodynamics or airframe collisions against structures.

`node scripts/test-player-damage.cjs` checks regional damage, handling, safe/unsafe landing and delayed crash resolution. `node scripts/test-player-damage-integration.cjs` places actual enemy-fired rounds against the player GLB, checks reduced mouse steering, warnings, pause/resume, firing rules, safe touchdown, critical rotor crash and fresh sortie state. Screenshots from the controlled browser fixture are saved locally as `player-engine-out-check.png`.
