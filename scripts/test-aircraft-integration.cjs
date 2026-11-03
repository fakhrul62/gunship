// Controlled fired-round fixtures against the actual enemy GLB and running game loop.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
 try{
  const p=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
  p.on('pageerror',e=>errors.push(e.message));
  await p.goto('http://127.0.0.1:8765/engine-prototype/');
  await p.waitForFunction(()=>document.querySelector('#hangar-status').hidden,null,{timeout:120000});
  await p.locator('#launch').click();await p.locator('.mission-card').first().click();
  await p.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:120000});
  await p.evaluate(()=>{
   const B=BABYLON;window.eng=B.Engine.Instances[0];window.s=eng.scenes[0];window.loop=eng._activeRenderLoops[0];
   eng.stopRenderLoop();window.ms=50;eng.getDeltaTime=()=>ms;window.render=s.render.bind(s);s.render=()=>{};
   window.targets=[...new Set(s.meshes.map(m=>m.metadata?.combatTarget).filter(Boolean))];
   window.air=targets.filter(e=>e.air);for(const e of targets){e.active=true;e.fire=1000}
   window.classifier=new AircraftDamage(B,{emit:()=>{}},()=>0,()=>{});
   s.getTransformNodeByName('playerRoot').position.set(0,400,1200);
   for(let i=0;i<165;i++)loop();
  });
  const results=[];
  for(const [index,part] of ['engine','tail','rotor'].entries()){
   await p.keyboard.down('Space');await p.evaluate(()=>{ms=50;for(let i=0;i<3;i++)loop()});await p.keyboard.up('Space');
   const hit=await p.evaluate(({index,part})=>{
    const B=BABYLON,e=air[index];e.obj.position.set(-1800+index*150,160,-1600);e.flightDamage[part].hp=1;
    e.airVelocity.set(25,0,0);const aim=s.getTransformNodeByName('playerRoot').position.subtract(e.obj.position);e.obj.rotation.y=Math.atan2(aim.x,aim.z);e.obj.computeWorldMatrix(true);
    const shot=s.meshes.filter(m=>m.name==='tracer'&&m.isEnabled()).at(-1);shot.computeWorldMatrix(true);
    const dir=B.Vector3.TransformNormal(B.Axis.Y,shot.getWorldMatrix()).normalize();
    let found;
    for(const mesh of e.obj.getChildMeshes()){
     if(mesh.metadata?.visualOnly||mesh.getTotalVertices()<3)continue;
     mesh.computeWorldMatrix(true);
     const probes=[mesh.getBoundingInfo().boundingBox.centerWorld];
     const vertices=mesh.getVerticesData('position'),indices=mesh.getIndices();
     for(let k=0;k<indices.length;k+=3){const v=B.Vector3.Zero();for(let j=0;j<3;j++){const n=indices[k+j]*3;v.addInPlace(new B.Vector3(vertices[n],vertices[n+1],vertices[n+2]))}probes.push(B.Vector3.TransformCoordinates(v.scale(1/3),mesh.getWorldMatrix()))}
     for(const point of probes){
      const pick=new B.Ray(point.subtract(dir.scale(80)),dir,160).intersectsMesh(mesh,false);
      if(pick.hit&&classifier.classify(e,mesh,pick.pickedPoint)===part){found=pick;break}
     }
     if(found)break;
    }
    if(!found)throw Error('No actual model hit region for '+part);
    shot.position.copyFrom(found.pickedPoint.subtract(dir.scale(.05)));ms=.1;loop();loop();
    return{part,last:e.lastHitComponent,crash:e.crash?.reason,hp:e.hp,dead:e.dead,landed:e.crash?.landed,weaponDisabled:e.weaponDisabled};
   },{index,part});
   console.log(JSON.stringify(hit));assert.equal(hit.last,part);assert.equal(hit.crash,part);assert(hit.dead&&hit.weaponDisabled&&!hit.landed&&hit.hp>0);results.push(hit);
  }
  const falling=await p.evaluate(()=>{
   s.getTransformNodeByName('playerRoot').position.set(-1800,220,-1600);ms=50;for(let i=0;i<10;i++)loop();
   return{objective:document.querySelector('#objective').textContent,air:air.slice(0,3).map(e=>({y:e.obj.position.y,landed:e.crash.landed,velocity:e.crash.velocity.asArray()})),burning:s.spriteManagers.find(m=>m.name==='asset-burning').sprites.length};
  });assert(falling.air.every(e=>e.y<160&&!e.landed));assert.equal(falling.burning,0);assert(falling.objective.includes('3 /'));
  await p.evaluate(()=>{const B=BABYLON,e=air[0],cam=s.activeCamera;cam.position.copyFrom(e.obj.position.add(new B.Vector3(32,15,-40)));cam.setTarget(e.obj.position);render()});
  await p.screenshot({path:'helicopter-falling-check.png'});
  const landed=await p.evaluate(()=>{
   for(let i=0;i<300;i++)loop();
   const e=air[0],B=BABYLON,cam=s.activeCamera;cam.position.copyFrom(e.obj.position.add(new B.Vector3(32,15,-40)));cam.setTarget(e.obj.position);render();
   return{objective:document.querySelector('#objective').textContent,air:air.slice(0,3).map(e=>({landed:e.crash.landed,destroyed:e.obj.metadata.destroyed,finite:Number.isFinite(e.obj.position.y),burned:e.obj.getChildMeshes().some(m=>m.material?.name.startsWith('crashed-'))})),healthy:air[3].flightDamage.engine.hp===100&&!air[3].dead,burning:s.spriteManagers.find(m=>m.name==='asset-burning').sprites.length};
  });console.log(JSON.stringify({landed}));assert(landed.air.every(e=>e.landed&&e.destroyed&&e.finite&&e.burned));assert(landed.healthy&&landed.burning>0);assert(landed.objective.includes('3 /'));
  await p.screenshot({path:'helicopter-crash-check.png'});
  await p.keyboard.press('Escape');await p.locator('#quit-mission').click();
  const cleanup=await p.evaluate(()=>({roots:s.transformNodes.filter(n=>n.name==='heloRoot').length,materials:s.materials.filter(m=>m.name.startsWith('crashed-')).length,sprites:s.spriteManagers.reduce((n,m)=>n+m.sprites.length,0)}));
  assert.equal(cleanup.roots,0);assert.equal(cleanup.materials,0);assert.equal(cleanup.sprites,0);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({results,falling,landed,cleanup,errors}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
