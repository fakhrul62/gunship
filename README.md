# Gunship - Rotor Strike

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
