// Headless smoke/capture; timing from software rendering is not a hardware FPS claim.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const browser=await chromium.launch(require('./browser-launch.cjs'));try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],shaderErrors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/shader|compile|GL_INVALID/i.test(m.text()))shaderErrors.push(m.text().slice(0,150))});
 await page.goto(process.env.GAME_URL||'http://127.0.0.1:8765/engine-prototype/');
 await page.waitForFunction(()=>document.querySelector('#hangar-status').hidden,null,{timeout:120000});
 await page.locator('#launch').click();await page.locator('.mission-card').first().click();
 await page.waitForFunction(()=>!document.querySelector('#hud').classList.contains('hidden'),null,{timeout:120000});
 const result=await page.evaluate(()=>{
  const B=BABYLON,eng=B.Engine.Instances[0],scene=eng.scenes[0];window.releaseLoop=eng._activeRenderLoops[0];eng.stopRenderLoop();eng.getDeltaTime=()=>16.667;
  const player=scene.getTransformNodeByName('playerRoot');player.position.set(0,115,990);
  const render=scene.render.bind(scene);scene.render=()=>{};for(let i=0;i<60;i++)releaseLoop();scene.render=render;scene.render();
  player.position.y=55;scene.render=()=>{};for(let i=0;i<45;i++)releaseLoop();scene.render=render;scene.render();const rotor=player.getChildMeshes().find(m=>m.name==='rotorExposureDisc');const downwash=scene.spriteManagers.find(m=>m.name==='asset-dust').sprites.length;
  const features=TerrainFeatures.craters.map(c=>({center:TerrainFeatures.offset(c.x,c.z),rim:TerrainFeatures.offset(c.x+c.r,c.z)}));
  return{rotor:rotor?.isEnabled(),cosmetic:rotor?.metadata?.visualOnly,downwash,features,cover:scene.meshes.filter(m=>m.name.startsWith('sector-')).length,ready:scene.isReady(),renderWidth:eng.getRenderWidth(),meshes:scene.meshes.length};
 });await page.evaluate(async()=>{const s=BABYLON.Engine.Instances[0].scenes[0];await s.whenReadyAsync();s.render()});result.ready=await page.evaluate(()=>BABYLON.Engine.Instances[0].scenes[0].isReady());console.log(JSON.stringify({result,errors,shaderErrors}));assert(result.ready);if(typeof result.rotor!=='undefined'){assert(result.rotor&&result.cosmetic);assert(result.downwash>0&&result.downwash<=32)}assert(result.features.every(c=>c.center<c.rim));assert(result.cover<12);
 await page.screenshot({path:'release-'+(process.env.STAGE||'terrain')+'-check.png'});assert.deepEqual(errors,[]);assert.deepEqual(shaderErrors,[]);
 console.log(JSON.stringify({result,errors,shaderErrors}));
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
