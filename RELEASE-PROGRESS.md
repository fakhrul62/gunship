# Realism release progress

Each stage below is a practical game implementation, not a claim of simulation or photorealism parity with a commercial AAA game.

1. Terrain/outposts: implemented. Shared crater/wash height geometry, irregular ground variation, detailed checkpoint fighting positions. Browser shader/readiness/capture check passed. Existing tan imagery retained.
2. Armor penetration and ricochet: implemented. Angle/orientation-sensitive tank plates, stops, bounded reflected rounds and energy-limited continuation. Unit rules and actual tank fired-round regression passed. Armor values are game tuning, not measured model specifications.
3. Vehicle/structure collision and emergency landings: implemented with swept body proxies, sliding, impact damage, vehicle blockers and structure support for falling aircraft. Fast-wall/roof/overlap tests and player landing/crash browser regression passed. Clear-ground landing is supported; a structure strike is unsafe. These are conservative proxies, not per-triangle rigid bodies.
4. Rotor/downwash presentation: implemented. Mast-centered exposure arcs fade with RPM; authored blades remain visible. Nearby low aircraft emit height-dependent radial dust with reserved combat-effect capacity. Browser capture verified cosmetic rotor discs, downwash emission and shader readiness.
5. Destruction interiors/fragments: implemented for the current assets. Tank roof triangles are cut on private geometry, torn roof panels detach, and a charred turret well/frame becomes visible. Crashed helicopters shed rotor blades. Actual GLB tests verified 14 removed roof triangles, seven settling parts, isolation, crash/counting and cleanup. Full arbitrary fracture and helicopter interior art are not implemented.
6. Layered combat/flight audio: pending.
7. Mission balancing and measured performance: pending.
