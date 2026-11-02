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
