const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs'));try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/engine-prototype/');await page.waitForFunction(()=>document.querySelector('#hangar-status').hidden,null,{timeout:120000});
 async function launch(){
  if(await page.locator('#launch').isVisible())await page.locator('#launch').click();await page.locator('.mission-card').first().click();await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'));
  await page.evaluate(()=>{
   const B=BABYLON;window.engine=B.Engine.Instances[0];window.scene=engine.scenes[0];window.loop=engine._activeRenderLoops[0]||window.loop;engine.stopRenderLoop();window.ms=50;engine.getDeltaTime=()=>ms;
   if(!window.render){window.render=scene.render.bind(scene);scene.render=()=>{}}
   window.player=scene.getTransformNodeByName('playerRoot');player.position.set(-1800,125,-1600);
   window.enemies=[...new Set(scene.meshes.map(m=>m.metadata?.combatTarget).filter(Boolean))];for(const e of enemies){e.active=true;e.fire=1000}
   window.shooter=enemies.find(e=>e.air);window.classifier=new PlayerDamage(B,{emit:()=>{}},()=>0);
  });
 }
 async function round(part){return page.evaluate(({part})=>{
  const B=BABYLON,systems=player.metadata.playerSystems;
  systems[part]=1;
  shooter.obj.position.copyFrom(player.position.add(new B.Vector3(0,5,-140)));shooter.fire=-1;ms=50;loop();shooter.fire=1000;
  const shot=scene.meshes.filter(m=>m.name==='tracer'&&m.isEnabled()&&m.material?.name==='tracerMaterial').at(-1);if(!shot)throw Error('No fired enemy round');shot.computeWorldMatrix(true);
  const dir=B.Vector3.TransformNormal(B.Axis.Y,shot.getWorldMatrix()).normalize(),g={player};let hit;
  for(const mesh of player.getChildMeshes()){
   if(mesh.metadata?.visualOnly||mesh.getTotalVertices()<3)continue;mesh.computeWorldMatrix(true);
   const probes=[mesh.getBoundingInfo().boundingBox.centerWorld],vertices=mesh.getVerticesData('position'),indices=mesh.getIndices(),stride=Math.max(3,Math.ceil(indices.length/6000/3)*3);
   for(let k=0;k<indices.length;k+=stride){const point=B.Vector3.Zero();for(let j=0;j<3;j++){const n=indices[k+j]*3;point.addInPlace(new B.Vector3(vertices[n],vertices[n+1],vertices[n+2]))}probes.push(B.Vector3.TransformCoordinates(point.scale(1/3),mesh.getWorldMatrix()))}
   for(const center of probes){if(classifier.classify(g,mesh,center)!==part)continue;const pick=new B.Ray(center.subtract(dir.scale(80)),dir,160).intersectsMesh(mesh,false);if(pick.hit&&classifier.classify(g,mesh,pick.pickedPoint)===part){hit=pick;break}}if(hit)break;
  }
  if(!hit)throw Error('No player surface for '+part);
  shot.position.copyFrom(hit.pickedPoint.subtract(dir.scale(.02)));ms=.1;loop();loop();ms=50;
  return{engine:systems.engine,controls:systems.controls,rotor:systems.rotor,emergency:systems.emergency};
 },{part})}
 await launch();
 const tail=await round('controls');assert.equal(tail.controls,0);assert.equal(tail.emergency,null);
 const steering=await page.evaluate(()=>{const y=player.rotation.y;document.dispatchEvent(new MouseEvent('mousemove',{movementX:100,bubbles:true}));loop();return player.rotation.y-y});assert(Math.abs(steering-.0625)<.001);
 const damage=await round('engine');assert.equal(damage.engine,0);assert.equal(damage.emergency,'engine');
 const beforeFire=await page.evaluate(()=>player.metadata.cannon.shots);await page.keyboard.down('Space');await page.evaluate(()=>loop());await page.keyboard.up('Space');assert((await page.evaluate(()=>player.metadata.cannon.shots))>beforeFire);
 await page.evaluate(()=>{for(let i=0;i<4;i++)loop();const B=BABYLON;scene.activeCamera.position.copyFrom(player.position.add(new B.Vector3(0,22,-48)));scene.activeCamera.setTarget(player.position.add(new B.Vector3(0,3,28)));render()});await page.screenshot({path:'player-engine-out-check.png'});
 const panel=await page.locator('#flight-damage').innerText();assert(panel.includes('ENGINE OUT'));
 await page.keyboard.press('Escape');const before=await page.evaluate(()=>player.position.y);await page.evaluate(()=>{for(let i=0;i<30;i++)loop()});assert.equal(await page.evaluate(()=>player.position.y),before);await page.locator('#resume').click();
 await page.keyboard.down('q');await page.evaluate(()=>{for(let i=0;i<600;i++)loop()});await page.keyboard.up('q');
 const landing=await page.evaluate(()=>({title:document.querySelector('#result-title').textContent,copy:document.querySelector('#result-copy').textContent,hull:document.querySelector('#stat-hull').textContent,landed:player.metadata.playerSystems.landed}));
 assert(landing.landed&&landing.title.includes('LANDING')&&landing.copy.includes('Crew survived'));assert.notEqual(landing.hull,'0%');
 await page.locator('#result-hangar').click();await launch();
 const fresh=await page.evaluate(()=>({...player.metadata.playerSystems}));assert.equal(fresh.engine,100);assert.equal(fresh.controls,100);assert.equal(fresh.emergency,null);
 // Critical rotor failure must descend and resolve as a crash, rather than an instant debrief.
 const fatal=await round('rotor');assert.equal(fatal.emergency,'critical');assert(await page.locator('#screen-result').evaluate(e=>e.classList.contains('hidden')));
 const criticalShots=await page.evaluate(()=>player.metadata.cannon.shots);await page.keyboard.down('Space');await page.evaluate(()=>loop());await page.keyboard.up('Space');assert.equal(await page.evaluate(()=>player.metadata.cannon.shots),criticalShots);
 await page.evaluate(()=>{for(let i=0;i<300;i++)loop()});
 const crash=await page.evaluate(()=>({title:document.querySelector('#result-title').textContent,copy:document.querySelector('#result-copy').textContent,hull:document.querySelector('#stat-hull').textContent}));assert(crash.copy.includes('crashed'));assert.equal(crash.hull,'0%');assert.deepEqual(errors,[]);
 console.log(JSON.stringify({tail,steering,damage,panel,landing,fresh,fatal,crash,errors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
