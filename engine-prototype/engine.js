'use strict';
(async()=>{
 const B=BABYLON,$=id=>document.getElementById(id),canvas=$('scene');
 const engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false,adaptToDeviceRatio:false});engine.setHardwareScalingLevel(1/Math.min(devicePixelRatio||1,2));
 const scene=new B.Scene(engine);scene.clearColor=new B.Color4(.58,.65,.69,1);scene.fogMode=B.Scene.FOGMODE_LINEAR;scene.fogStart=2500;scene.fogEnd=23000;scene.fogColor=new B.Color3(.65,.72,.77);
 const camera=new B.FreeCamera('camera',new B.Vector3(0,160,-120),scene);camera.minZ=1;camera.maxZ=30000;camera.fov=1.0;
 const fill=new B.HemisphericLight('sky',new B.Vector3(0,1,0),scene);fill.intensity=.75;fill.groundColor=new B.Color3(.28,.24,.18);const sun=new B.DirectionalLight('sun',new B.Vector3(-.4,-1,.3),scene);sun.intensity=2.0;sun.diffuse=new B.Color3(1,.94,.82);sun.shadowMinZ=1;sun.shadowMaxZ=1200;const shadows=new B.ShadowGenerator(1024,sun);shadows.usePercentageCloserFiltering=true;shadows.filteringQuality=B.ShadowGenerator.QUALITY_LOW;shadows.bias=.003;shadows.normalBias=.04;shadows.setDarkness(.3);
 const environment=new B.HDRCubeTexture('../assets/materials/daylight.hdr',scene,256,false,true,false,true);scene.environmentTexture=environment;const skyDome=new B.PhotoDome('daylightSky','../assets/materials/daylight-sky.webp',{resolution:32,size:58000,useDirectMapping:true},scene);skyDome.mesh.isPickable=false;skyDome.mesh.infiniteDistance=true;skyDome.material.fogEnabled=false;
 scene.imageProcessingConfiguration.toneMappingEnabled=true;scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
 scene.imageProcessingConfiguration.contrast=1.05;scene.imageProcessingConfiguration.exposure=1.0;
 const combatAssets=new window.CombatAssets(B,scene,camera);combatAssets.load();
 const localApkAssets=new window.LocalApkAssets(B,scene);
 let preview=null,sector=null;
 let mode='menu',game=null,loading=false,assets={},time=0;const keys=new Set(),regions=[];let groundHeight=()=>0;const tacticalMap=new window.TacticalMap($('game-shell'));
 const screens=['screen-menu','screen-missions','screen-controls','screen-pause','screen-result'];
 const missions=[
 {title:'Broken Arrow',brief:'Fly to the forward sector, clear two defensive lines, defeat the air response, then return to extraction. Estimated flight: 3-4 minutes.',count:12,group:2},
 {title:'Iron Convoy',brief:'Approach the convoy route, break through two armored positions, repel reinforcements, and extract. Estimated flight: 3-4 minutes.',count:18,group:3},
 {title:'Nightfall',brief:'Fly behind the defensive line, destroy the forward positions, survive the air response, then return to base. Estimated flight: 3-4 minutes.',count:18,group:3}];

 function show(id){localApkAssets.pause(!!id);combatAssets.pause(!!id);document.getElementById('missile-lock')?.setAttribute('hidden','');for(const fx of scene.particleSystems)fx.updateSpeed=id?0:.01;tacticalMap.setVisible(id==='');document.getElementById('sortie-panel')?.style.setProperty('display',id?'none':'block');document.getElementById('combat-feedback')?.style.setProperty('display',id?'none':'block');screens.forEach(x=>$(x).classList.toggle('hidden',x!==id));$('hud').classList.toggle('hidden',id!=='');$('reticle').classList.toggle('hidden',id!=='');$('mobile-controls').classList.add('hidden');mode=id===''?'playing':id==='screen-pause'?'paused':'menu';if(id&&document.pointerLockElement)document.exitPointerLock()}
 function notify(t){$('toast').textContent=t;$('toast').classList.remove('hidden');clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('toast').classList.add('hidden'),4500)}
 $('mission-grid').innerHTML=missions.map((m,i)=>`<article class="mission-card" tabindex="0" data-i="${i}"><div class="mission-number">OPERATION / 0${i+1}</div><div><h3>${m.title}</h3><p>${m.brief}</p></div><div class="mission-meta"><b>3-4 MIN SORTIE</b><span>${m.count} HOSTILES</span></div></article>`).join('');document.querySelectorAll('.mission-card').forEach(el=>{el.onclick=()=>start(+el.dataset.i);el.onkeydown=e=>{if(e.key==='Enter')start(+el.dataset.i)}});
 const assetLoads={};
 async function asset(key,path){if(assets[key])return assets[key];if(!assetLoads[key]){let i=path.lastIndexOf('/');assetLoads[key]=B.SceneLoader.LoadAssetContainerAsync(path.slice(0,i+1),path.slice(i+1),scene).then(c=>assets[key]=c)}return assetLoads[key]}
 function instantiate(key,desired,ground=false){let c=assets[key].instantiateModelsToScene(name=>name+Math.random(),false),root=new B.TransformNode(key+'Root',scene);for(const node of c.rootNodes)node.parent=root;root.computeWorldMatrix(true);let min=new B.Vector3(Infinity,Infinity,Infinity),max=new B.Vector3(-Infinity,-Infinity,-Infinity);for(const mesh of root.getChildMeshes()){mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox;min=B.Vector3.Minimize(min,box.minimumWorld);max=B.Vector3.Maximize(max,box.maximumWorld)}const size=max.subtract(min),center=min.add(max).scale(.5),scale=desired/Math.max(size.x,size.y,size.z,.001);const offset=new B.TransformNode('offset',scene);offset.parent=root;for(const n of [...root.getChildren()])if(n!==offset)n.parent=offset;offset.position=center.scale(-1);if(ground)offset.position.y+=size.y/2;root.scaling.setAll(scale);if(key==='player'||key==='helo')attachRotors(root,key);if(key==='apc'||key==='turret')attachCombatAnimations(root,c,key);if(key==='player'||key==='apc')finishVehicle(root,key);if(['player','helo','apc','turret'].includes(key)){const casters=root.getChildMeshes().filter(m=>m.getTotalVertices()>100).sort((a,b)=>b.getTotalVertices()-a.getTotalVertices()).slice(0,key==='player'?3:2);for(const mesh of casters){shadows.addShadowCaster(mesh,false);mesh.receiveShadows=true}root.onDisposeObservable.add(()=>{for(const mesh of casters)shadows.removeShadowCaster(mesh,false)})}return root}

 const paintNormal=new B.Texture('../assets/materials/paint-detail-normal.webp',scene);paintNormal.gammaSpace=false;paintNormal.uScale=paintNormal.vScale=3;paintNormal.level=.10;
 const paintArm=new B.Texture('../assets/materials/paint-detail-arm.webp',scene);paintArm.gammaSpace=false;paintArm.uScale=paintArm.vScale=3;
 function finishVehicle(root,key){for(const mesh of root.getChildMeshes()){const m=mesh.material;if(!(m instanceof B.PBRMaterial)||m.metadata?.finishApplied)continue;m.metadata={...m.metadata,finishApplied:true};m.environmentIntensity=1.05;if(key==='player'&&m.alpha>.99&&!m.albedoTexture&&m.albedoColor&&m.albedoColor.r<.3&&m.albedoColor.g<.35){m.bumpTexture=paintNormal;m.metallicTexture=paintArm;m.useRoughnessFromMetallicTextureGreen=true;m.useRoughnessFromMetallicTextureAlpha=false;m.useMetallnessFromMetallicTextureBlue=false;m.metallic=.12;m.roughness=.85;}}}
 function attachCombatAnimations(root,instance,key){
  const clips=instance.animationGroups||[];for(const clip of clips)clip.stop();
  const data={key,clips,clock:0,fireTime:0,readyTime:0,activated:false};
  if(key==='apc'){
   const drive=new B.AnimationGroup('tankDrive',scene),ready=new B.AnimationGroup('tankReady',scene);
   for(const clip of clips)for(const track of clip.targetedAnimations){(track.target.name.includes('driver_11')?drive:ready).addTargetedAnimation(track.animation,track.target)}
   data.drive=drive;data.ready=ready;for(const group of [drive,ready]){group.start(false);group.pause();group.goToFrame(group.from)}
   data.turret=root.getChildTransformNodes().find(n=>n.name.startsWith('Turret_low_23'));data.mantle=root.getChildTransformNodes().find(n=>n.name.startsWith('Mantle_27'));
   if(data.mantle)data.mantleHome=data.mantle.position.clone();
  }else{data.fire=clips[0];if(data.fire){data.fire.start(false);data.fire.pause();data.fire.goToFrame(data.fire.from)}}
  root.metadata={combat:data};root.onDisposeObservable.add(()=>{for(const clip of [...clips,data.drive,data.ready].filter(Boolean))clip.dispose()});
 }
 function animateCombat(e,dt,moving=false,fired=false){
  const a=e.obj.metadata?.combat;if(!a||e.dead)return;
  if(fired)a.fireTime=.55;
  if(a.key==='apc'){
   if(e.active&&!a.activated){a.activated=true;a.readyTime=e.alerted?0:7}
   if(a.readyTime>0){a.readyTime=Math.max(0,a.readyTime-dt);a.ready.goToFrame(a.ready.from+(a.ready.to-a.ready.from)*(1-a.readyTime/7))}
   if(moving){a.clock=(a.clock+dt)%7;a.drive.goToFrame(a.drive.from+(a.drive.to-a.drive.from)*a.clock/7)}
   if(a.readyTime===0){const aim=game.player.position.subtract(e.obj.position),yaw=Math.atan2(aim.x,aim.z)-e.obj.rotation.y,pitch=-Math.min(.5,Math.atan2(aim.y,Math.hypot(aim.x,aim.z)));if(a.turret)a.turret.rotationQuaternion=B.Quaternion.RotationYawPitchRoll(yaw,0,0);if(a.mantle){a.mantle.rotationQuaternion=B.Quaternion.RotationYawPitchRoll(yaw,pitch,0);const home=a.mantleHome;a.mantle.position.set(home.x*Math.cos(yaw)+home.z*Math.sin(yaw),home.y,-home.x*Math.sin(yaw)+home.z*Math.cos(yaw));a.mantle.position.addInPlace(new B.Vector3(Math.sin(yaw),0,Math.cos(yaw)).scale(-Math.sin(Math.PI*a.fireTime/.55)*.18))}}
  }else if(a.fire&&a.fireTime>0)a.fire.goToFrame(a.fire.from+(a.fire.to-a.fire.from)*(1-a.fireTime/.55));
  a.fireTime=Math.max(0,a.fireTime-dt);
 }
 const rotorMaterial=new B.StandardMaterial('rotorBlades',scene);rotorMaterial.diffuseColor=new B.Color3(.13,.15,.12);rotorMaterial.specularColor=new B.Color3(.2,.2,.18);rotorMaterial.alpha=.78;
 function attachRotors(root,key){
  root.computeWorldMatrix(true);const inv=root.getWorldMatrix().clone().invert();
  if(key==='player'){
   const blades=root.getChildMeshes().filter(mesh=>{mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox,d=box.maximumWorld.subtract(box.minimumWorld);return d.x>20&&d.z>20&&d.y<2});
   if(blades.length){
    // The authored assembly origin is the mast; blade bounds are asymmetric.
    // Move the entire assembly, including its hub, without changing its world pose.
    const assembly=blades[0].parent;
    assembly.computeWorldMatrix(true);
    const pivot=new B.TransformNode('mainRotor',scene);pivot.parent=root;
    pivot.position.copyFrom(B.Vector3.TransformCoordinates(assembly.getAbsolutePosition(),inv));
    assembly.setParent(pivot);
    root.metadata={rotors:[pivot]};return
   }
  }
  const mount=root.getChildTransformNodes().find(n=>n.name.includes('Chopper.Rotor_Blur'));
  if(mount){mount.computeWorldMatrix(true);const pivot=new B.TransformNode('mainRotor',scene);pivot.parent=root;pivot.position.copyFrom(B.Vector3.TransformCoordinates(mount.getAbsolutePosition(),inv));pivot.scaling.setAll(1/root.scaling.x);const blades=[];for(let i=0;i<4;i++){const blade=B.MeshBuilder.CreateBox('blade',{width:.6,height:.08,depth:10},scene);blade.position.z=5.6;const arm=new B.TransformNode('bladeArm',scene);arm.rotation.y=i*Math.PI/2;blade.parent=arm;arm.parent=pivot;blade.material=rotorMaterial;blades.push(blade)}root.metadata={rotors:[pivot]}}
 }
 function spinRotors(root,dt,rate=36){for(const rotor of root.metadata?.rotors||[])rotor.rotation.y=(rotor.rotation.y+dt*rate)%(Math.PI*2)}
 function buildTerrain(){
  const hash=(x,z)=>{const n=Math.sin(x*127.1+z*311.7)*43758.5453123;return n-Math.floor(n)};
  const noise=(x,z)=>{const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);return B.Scalar.Lerp(B.Scalar.Lerp(hash(ix,iz),hash(ix+1,iz),u),B.Scalar.Lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v)};
  const height=(x,z)=>{const broad=noise(x*.0007+12,z*.0007+8)*36,detail=noise(x*.0032+31,z*.0032+7)*9+noise(x*.009+2,z*.009+9)*2;const valley=Math.exp(-Math.pow((x-250-Math.sin(z*.0012)*320)/100,2))*14;const tributary=Math.exp(-Math.pow((z-700-Math.sin(x*.003)*120)/45,2))*5;const hillA=48*Math.exp(-((x+1200)**2/(650**2)+(z-900)**2/(850**2))),hillB=62*Math.exp(-((x-1700)**2/(800**2)+(z+500)**2/(700**2)));return broad+detail-valley-tributary+hillA+hillB-8};
  const width=9000,div=256,step=width/div,ground=B.MeshBuilder.CreateGround('continuousLandscape',{width,height:width,subdivisions:div,updatable:true},scene),positions=ground.getVerticesData(B.VertexBuffer.PositionKind),samples=new Float32Array((div+1)**2);
  for(let i=0;i<positions.length;i+=3){positions[i+1]=height(positions[i],positions[i+2]);samples[i/3]=positions[i+1]}
  groundHeight=(x,z)=>{const gx=B.Scalar.Clamp((x+width/2)/step,0,div-.00001),gz=B.Scalar.Clamp((width/2-z)/step,0,div-.00001),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz,n=div+1,a=samples[iz*n+ix],b=samples[iz*n+ix+1],c=samples[(iz+1)*n+ix],d=samples[(iz+1)*n+ix+1];return fx>=fz?a+(b-a)*(fx-fz)+(d-a)*fz:a+(c-a)*(fz-fx)+(d-a)*fx};
  ground.updateVerticesData(B.VertexBuffer.PositionKind,positions);const normals=[];B.VertexData.ComputeNormals(positions,ground.getIndices(),normals);ground.updateVerticesData(B.VertexBuffer.NormalKind,normals);ground.refreshBoundingInfo();ground.material=window.createBattlefieldMaterial(B,scene);ground.receiveShadows=true;ground.isPickable=false;ground.freezeWorldMatrix();
  const rubble=B.MeshBuilder.CreateIcoSphere('physicalRubble',{radius:1,subdivisions:1,flat:true},scene),rockMat=new B.PBRMaterial('rubbleStone',scene);rockMat.albedoColor=new B.Color3(.43,.34,.23);rockMat.metallic=0;rockMat.roughness=.96;rubble.material=rockMat;rubble.isPickable=false;rubble.receiveShadows=true;
  const transforms=[];for(let i=0;i<500;i++){const x=(hash(i,31)-.5)*6000,z=(hash(i,87)-.5)*6000;if(noise(x*.004,z*.004)<.48)continue;const size=.35+hash(i,17)*1.2;const matrix=B.Matrix.Compose(new B.Vector3(size,size*(.35+hash(i,13)*.4),size*(.7+hash(i,47))),B.Quaternion.RotationYawPitchRoll(hash(i,3)*6.28,hash(i,5)*.5,0),new B.Vector3(x,groundHeight(x,z)+size*.1,z));matrix.copyToArray(transforms,transforms.length)}rubble.thinInstanceSetBuffer('matrix',new Float32Array(transforms),16);rubble.thinInstanceRefreshBoundingInfo();
  // A continuous outer height field replaces the smooth concentric ridge bands.
  const distant=B.MeshBuilder.CreateGround('distantDesert',{width:52000,height:52000,subdivisions:320,updatable:true},scene),farPositions=distant.getVerticesData(B.VertexBuffer.PositionKind);
  for(let i=0;i<farPositions.length;i+=3){const x=farPositions[i],z=farPositions[i+2],r=Math.hypot(x,z),ramp=B.Scalar.SmoothStep(0,1,(r-4400)/2200),broad=noise(x*.00035+31,z*.00035+73),ridge=1-Math.abs(noise(x*.0011+11,z*.0011+53)*2-1),erosion=noise(x*.0034+7,z*.0034+19),small=noise(x*.009,z*.009);farPositions[i+1]=height(x,z)-22+ramp*(Math.pow(broad,1.7)*1100+ridge*ridge*230+erosion*70+small*18)}
  distant.updateVerticesData(B.VertexBuffer.PositionKind,farPositions);const farNormals=[];B.VertexData.ComputeNormals(farPositions,distant.getIndices(),farNormals);distant.updateVerticesData(B.VertexBuffer.NormalKind,farNormals);distant.refreshBoundingInfo();const distantMat=ground.material.clone('distantDesertMaterial');distantMat.albedoTexture=ground.material.albedoTexture.clone();distantMat.albedoTexture.uScale=distantMat.albedoTexture.vScale=100;distant.material=distantMat;distant.isPickable=false;distant.freezeWorldMatrix();
  assets.region0?.dispose();delete assets.region0;
 }
 let worldReady=false;
 async function setup(){if(worldReady)return;notify('PREPARING CONTINUOUS FLIGHT TERRAIN');
 await Promise.all([asset('player','../odz-10ag_attack_helicopter_10a.glb'),asset('helo','../enemy/rtbr_helicopter.glb'),asset('apc','../enemy/fictional_cold_war_tank.glb'),asset('turret','../enemy/scifi_turret.glb')]);buildTerrain();sector=new window.SectorWorld(B,scene,groundHeight,shadows);try{await localApkAssets.load(sector,groundHeight)}catch(error){console.warn('Supplementary game assets unavailable',error)}await scene.whenReadyAsync();worldReady=true;
 }
 function cleanup(){combatAssets.clear();lockReadout.hidden=true;if(!game)return;for(const e of effects){e.mesh.setEnabled(false);debrisPool.push(e.mesh)}effects.length=0;for(const o of game.objects)if(o&&!o.isDisposed())o.dispose(false,false);game=null}
 async function start(i){if(loading)return;loading=true;try{await setup();cleanup();const player=instantiate('player',35);player.position.set(0,125,-200);let objects=[player],enemies=[];player.position.set(0,125,-200);game={i,player,objects,enemies,bullets:[],yaw:0,pitch:0,speed:0,side:0,hp:100,kills:0,time:0,gun:0,rocket:0,flare:0,phase:'ingress',phaseTime:0,wave:0,waypoint:new B.Vector3(0,125,1200)};prepareEnemies();camera.position.copyFrom(player.position.subtract(new B.Vector3(0,-22,48)));camera.setTarget(player.position.add(new B.Vector3(0,3,28)));keys.clear();
$('mission-tag').textContent='DESERT SECTOR / OPERATION 0'+(i+1);$('toast').classList.add('hidden');show('');notify('VIPER 01, PROCEED TO CHECKPOINT ALPHA. WEAPONS FREE.');hud()}catch(e){console.error(e);notify('ASSET LOADING FAILED — CHECK CONSOLE')}finally{loading=false}}
 function hud(){if(!game)return;tacticalMap.update(game);$('objective').textContent=game.phase==='ingress'?'FLY TO CHECKPOINT ALPHA':game.phase==='transit'?'PROCEED TO CHECKPOINT BRAVO':game.phase==='extract'?'RETURN TO EXTRACTION':game.phase==='secure'?'HOLD EXTRACTION POSITION':`${game.phase==='intercept'?'REPEL AIR RESPONSE':'CLEAR DEFENSIVE LINE'} ${game.kills} / ${missions[game.i].count}`;$('objective-fill').style.width=100*game.kills/missions[game.i].count+'%';$('hull-fill').style.width=Math.max(0,game.hp)+'%';$('altitude').innerHTML=Math.round(game.player.position.y*3.28)+' <em>FT</em>'}
 function end(won){if(mode!=='playing')return;$('result-title').innerHTML=won?'MISSION <i>COMPLETE.</i>':'MISSION <i>FAILED.</i>';$('result-copy').textContent=won?'Objectives complete. Viper 01 and crew safely extracted.':'Your aircraft was lost.';$('stat-targets').textContent=game.kills+' / '+missions[game.i].count;$('stat-time').textContent=Math.floor(game.time/60)+':'+String(Math.floor(game.time%60)).padStart(2,'0');$('stat-hull').textContent=Math.max(0,Math.round(game.hp))+'%';show('screen-result')}
 const shotMat=new B.StandardMaterial('tracerMaterial',scene);shotMat.emissiveColor=new B.Color3(1,.7,.2);shotMat.disableLighting=true;shotMat.fogEnabled=false;
 const cannonMat=new B.StandardMaterial('cannonTracerCore',scene);cannonMat.emissiveColor=new B.Color3(1,.92,.58);cannonMat.disableLighting=true;cannonMat.fogEnabled=false;
 const tracerHaloMat=new B.StandardMaterial('tracerHalo',scene);tracerHaloMat.emissiveColor=new B.Color3(1,.55,.08);tracerHaloMat.disableLighting=true;tracerHaloMat.fogEnabled=false;tracerHaloMat.alpha=.22;tracerHaloMat.disableDepthWrite=true;
 const smokeTexture=new B.DynamicTexture('smokeSprite',64,scene,false),sc=smokeTexture.getContext(),gradient=sc.createRadialGradient(32,32,1,32,32,32);gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.4,'rgba(255,255,255,.5)');gradient.addColorStop(1,'rgba(255,255,255,0)');sc.fillStyle=gradient;sc.fillRect(0,0,64,64);smokeTexture.update();smokeTexture.hasAlpha=true;
 let particleCount=0,audio=null;
 function sound(kind,pos=null){if(localApkAssets.sound(kind))return;if(kind==='explosion'&&combatAssets.sound(pos||game?.player.position||camera.position))return;try{audio??=new AudioContext();if(audio.state==='suspended')audio.resume();const dur=kind==='explosion'?.65:kind==='launch'?.25:kind==='hit'?.08:.055,buffer=audio.createBuffer(1,audio.sampleRate*dur,audio.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*(1-i/data.length);const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.value=kind==='explosion'?180:kind==='hit'?2000:650;gain.gain.value=kind==='explosion'?.25:.07;src.connect(filter).connect(gain).connect(audio.destination);src.start()}catch{}}
 function burst(pos,type='spark'){
  if(type==='explosion'&&combatAssets.explosion(pos,pos.y-groundHeight(pos.x,pos.z)<45))return;
  if(type==='smoke'&&combatAssets.emit('smoke',pos.add(new B.Vector3(0,8,0)),24,{drift:3,grow:1.4,alpha:.8}))return;
  if(particleCount>=12)return;particleCount++;const smoke=type==='smoke',boom=type==='explosion',ps=new B.ParticleSystem('combatFx',boom?70:smoke?20:16,scene);ps.updateSpeed=mode==='playing'?.01:0;ps.particleTexture=smokeTexture;ps.emitter=pos.clone();ps.minEmitBox=new B.Vector3(-1,-1,-1);ps.maxEmitBox=new B.Vector3(1,1,1);ps.color1=smoke?new B.Color4(.12,.13,.12,.55):new B.Color4(1,.8,.3,1);ps.color2=smoke?new B.Color4(.25,.25,.23,.4):new B.Color4(1,.22,.03,1);ps.colorDead=new B.Color4(.04,.04,.04,0);ps.minSize=smoke?7:boom?5:.3;ps.maxSize=smoke?16:boom?18:1.4;ps.minLifeTime=smoke?1.5:.15;ps.maxLifeTime=smoke?3:boom?1.3:.4;ps.emitRate=100;ps.manualEmitCount=boom?65:smoke?16:12;ps.direction1=new B.Vector3(-1,smoke?2:-.5,-1);ps.direction2=new B.Vector3(1,3,1);ps.minEmitPower=smoke?2:boom?10:10;ps.maxEmitPower=smoke?6:boom?35:25;ps.gravity=new B.Vector3(0,smoke?2:-15,0);ps.blendMode=smoke?B.ParticleSystem.BLENDMODE_STANDARD:B.ParticleSystem.BLENDMODE_ADD;ps.start();setTimeout(()=>{ps.dispose(false);particleCount--},smoke?4000:1800);
 }
 const marker=document.createElement('div');marker.id='combat-feedback';marker.innerHTML='<div id="combat-hit" aria-hidden="true"><svg viewBox="0 0 32 32" width="32" height="32"><path d="M5 5L11 11M21 21L27 27M27 5L21 11M11 21L5 27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg></div><div id="combat-status"></div><div id="enemy-labels"></div>';document.getElementById('game-shell').appendChild(marker);
 function hitFeedback(kill=false){$('combat-hit').style.opacity='1';$('combat-hit').style.color=kill?'#ff754c':'#fff';clearTimeout(hitFeedback.timer);hitFeedback.timer=setTimeout(()=>$('combat-hit').style.opacity='0',180);sound('hit')}
 function damageEnemy(e,amount,pos){if(e.dead)return;alertEnemy(e);for(const ally of game.enemies)if(!ally.dead&&B.Vector3.DistanceSquared(ally.obj.position,e.obj.position)<300*300)alertEnemy(ally);e.hp-=amount;burst(pos,'spark');hitFeedback();if(e.hp>0)return;e.dead=true;e.wreck=true;e.wreckAge=0;e.fall=0;game.kills++;for(let i=0;i<6&&effects.length<60;i++){const mesh=debrisPool.pop()||B.MeshBuilder.CreateBox('blastDebris',{size:.65},scene);mesh.material=debrisMat;mesh.setEnabled(true);mesh.position.copyFrom(e.obj.position);effects.push({mesh,vel:new B.Vector3((Math.random()-.5)*40,25+Math.random()*25,(Math.random()-.5)*40),life:4,bounces:0})}burst(e.obj.position,'explosion');sound('explosion',e.obj.position);hitFeedback(true);notify(e.air?'HOSTILE AIRCRAFT DOWN':'ARMORED TARGET DESTROYED');}
 function segmentHit(a,b,center,radius){const ab=b.subtract(a),len=ab.lengthSquared();const t=len?B.Scalar.Clamp(B.Vector3.Dot(center.subtract(a),ab)/len,0,1):0;return B.Vector3.DistanceSquared(a.add(ab.scale(t)),center)<radius*radius}
 function forward(){return new B.Vector3(Math.sin(game.yaw)*Math.cos(game.pitch),Math.sin(game.pitch),Math.cos(game.yaw)*Math.cos(game.pitch))}
 const lockReadout=document.createElement('div');lockReadout.id='missile-lock';$('game-shell').appendChild(lockReadout);
 function sightRay(){return camera.getForwardRay(2500)}
 function visibleBetween(a,b){return terrainHit(a,b)===null&&(!sector||sector.hit(a,b)===null)}
 function updateLock(dt){
  const g=game,ray=sightRay();let candidate=null,best=.9986;
  for(const e of g.enemies){if(e.dead)continue;const center=e.obj.position.add(new B.Vector3(0,e.air?0:7,0)),delta=center.subtract(ray.origin),distance=delta.length();if(distance>1400)continue;const dot=B.Vector3.Dot(delta.normalize(),ray.direction);if(dot>best&&visibleBetween(ray.origin,center)){candidate=e;best=dot}}
  if(candidate!==g.lockTarget){g.lockTarget=candidate;g.lockTime=0}else if(candidate)g.lockTime=Math.min(1.3,(g.lockTime||0)+dt);
  lockReadout.hidden=mode!=='playing';lockReadout.textContent=candidate?(g.lockTime>=1.3?'MISSILE LOCK':'ACQUIRING '+Math.round(g.lockTime/1.3*100)+'%'):'MISSILE / NO LOCK';lockReadout.classList.toggle('locked',!!candidate&&g.lockTime>=1.3);
 }
 function aimPoint(){const ray=sightRay(),end=ray.origin.add(ray.direction.scale(2500));let nearest=terrainHit(ray.origin,end),point=nearest===null?end:B.Vector3.Lerp(ray.origin,end,nearest);const picked=scene.pickWithRay(ray,m=>!!m.metadata?.combatTarget&&!m.metadata.combatTarget.dead,false);if(picked?.hit&&B.Vector3.Distance(ray.origin,picked.pickedPoint)<B.Vector3.Distance(ray.origin,point))point=picked.pickedPoint;return point}
 function alertEnemy(e){if(e.dead)return;if(!e.active){e.active=true;e.fire=.65+Math.random()*.65}e.alerted=true;}
 const tracerPool=[];
 function createTracer(){const core=B.MeshBuilder.CreateCylinder('tracer',{height:24,diameter:.65,tessellation:6},scene);const halo=B.MeshBuilder.CreateCylinder('tracerHalo',{height:26,diameter:1.8,tessellation:6},scene);halo.parent=core;halo.material=tracerHaloMat;halo.isPickable=false;core.isPickable=false;return core}

 const missilePool=[],debrisPool=[],effects=[];
 const missileMat=new B.StandardMaterial('missileCasing',scene);missileMat.diffuseColor=new B.Color3(.32,.35,.29);missileMat.specularColor=new B.Color3(.6,.6,.55);
 const debrisMat=new B.StandardMaterial('charredMetal',scene);debrisMat.diffuseColor=new B.Color3(.13,.12,.1);
 function missileMesh(){
  const body=B.MeshBuilder.CreateCylinder('missileBody',{height:5,diameter:.55,tessellation:8},scene);body.material=missileMat;
  const nose=B.MeshBuilder.CreateCylinder('missileNose',{height:1.3,diameterBottom:.55,diameterTop:0,tessellation:8},scene);nose.parent=body;nose.position.y=3.15;nose.material=missileMat;
  for(let i=0;i<2;i++){const fin=B.MeshBuilder.CreateBox('missileFins',{width:1.8,height:1.1,depth:.08},scene);fin.parent=body;fin.position.y=-1.8;fin.rotation.y=i*Math.PI/2;fin.material=missileMat}
  const flame=B.MeshBuilder.CreateCylinder('motorFlame',{height:3,diameterBottom:0,diameterTop:.45,tessellation:6},scene);flame.parent=body;flame.position.y=-4;flame.material=shotMat;return body
 }
 function combatParticles(pos,type,velocity=B.Vector3.Zero()){
  if(type==='trail'&&combatAssets.emit('wisps',pos,9,{duration:1.3,drift:1,grow:.6,alpha:.5}))return;
  if(particleCount>=18)return;particleCount++;
  const dust=type==='dust',trail=type==='trail',flash=type==='flash',ps=new B.ParticleSystem(type,trail?8:flash?6:35,scene);
  ps.updateSpeed=mode==='playing'?.01:0;ps.particleTexture=smokeTexture;ps.emitter=pos.clone();ps.manualEmitCount=trail?3:flash?5:30;
  ps.color1=dust?new B.Color4(.49,.40,.27,.5):trail?new B.Color4(.7,.69,.63,.35):new B.Color4(1,.8,.4,1);
  ps.color2=dust?new B.Color4(.35,.29,.20,.35):trail?new B.Color4(.45,.45,.42,.25):new B.Color4(1,.35,.05,1);ps.colorDead=new B.Color4(.2,.18,.14,0);
  ps.minSize=flash?1:trail?1.5:2;ps.maxSize=flash?3:trail?3:8;ps.minLifeTime=flash?.025:trail?.4:.6;ps.maxLifeTime=flash?.07:trail?1.1:2;
  ps.direction1=new B.Vector3(-1,.1,-1).add(velocity);ps.direction2=new B.Vector3(1,1,1).add(velocity);ps.minEmitPower=flash?1:trail?1:8;ps.maxEmitPower=flash?2:trail?2:24;ps.gravity=new B.Vector3(0,dust?-5:1,0);ps.blendMode=flash?B.ParticleSystem.BLENDMODE_ADD:B.ParticleSystem.BLENDMODE_STANDARD;
  ps.start();setTimeout(()=>{ps.dispose(false);particleCount--},flash?200:2300)
 }
 function explode(pos,power=170,direct=null){
  burst(pos,'explosion');burst(pos,'smoke');sound('explosion',pos);
  if(pos.y-groundHeight(pos.x,pos.z)<45)combatParticles(new B.Vector3(pos.x,groundHeight(pos.x,pos.z)+1,pos.z),'dust');
  for(const e of game.enemies){if(e.dead)continue;const distance=B.Vector3.Distance(pos,e.obj.position);if(e===direct||distance<65){const center=e.obj.position.add(new B.Vector3(0,e.air?0:7,0)),clear=visibleBetween(pos.add(new B.Vector3(0,1,0)),center);const amount=e===direct?power:power*.8*Math.pow(1-distance/65,2)*(clear?1:.25);damageEnemy(e,amount,pos);if(e.air)e.impulse=pos.subtract(e.obj.position).normalize().scale(-Math.min(14,amount*.12))}}
  const distance=B.Vector3.Distance(pos,game.player.position);game.shake=Math.max(game.shake||0,Math.max(0,1-distance/350)*1.8);
  if(distance<50){game.hp-=35*Math.pow(1-distance/50,2);if(game.hp<=0)end(false)}
  for(let i=0;i<10&&effects.length<60;i++){const mesh=debrisPool.pop()||B.MeshBuilder.CreateBox('blastDebris',{size:.65},scene);mesh.material=debrisMat;mesh.setEnabled(true);mesh.position.copyFrom(pos);const vel=new B.Vector3((Math.random()-.5)*55,15+Math.random()*45,(Math.random()-.5)*55);effects.push({mesh,vel,life:3+Math.random()*2,bounces:0})}
 }
 function shot(origin,dir,friendly,target=null,rocket=false){
  if(game.bullets.length>=90)return;const mesh=rocket?(missilePool.pop()||missileMesh()):(tracerPool.pop()||createTracer());
  mesh.setEnabled(true);if(rocket)for(const part of mesh.getChildMeshes())part.setEnabled(true);mesh.scaling.setAll(1);if(!rocket)mesh.material=friendly?cannonMat:shotMat;mesh.position.copyFrom(origin);dir=dir.normalizeToNew();mesh.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,dir,new B.Quaternion());game.objects.push(mesh);
  const inherited=friendly?forward().scale(game.speed||0):B.Vector3.Zero();game.bullets.push({mesh,vel:dir.scale(rocket?85:friendly?900:360).add(inherited),friendly,target,rocket,life:rocket?10:friendly?3.2:3,age:0,trail:0});combatParticles(origin,'flash')
 }
 function fire(rocket=false){
  if(!game||mode!=='playing'||(rocket?game.rocket>0:game.gun>0))return;
  if(rocket)game.rocket=2;else game.gun=.10;
  let dir=forward(),target=rocket&&game.lockTime>=1.3?game.lockTarget:null;
  // Cannon rounds follow the sight with slight dispersion, without target snapping.
  
  const side=new B.Vector3(Math.cos(game.yaw),0,-Math.sin(game.yaw));game.launchSide=-(game.launchSide||1);
  const origin=game.player.position.add(dir.scale(rocket?8:17)).add(new B.Vector3(0,-3,0));if(rocket)origin.addInPlace(side.scale(game.launchSide*7));
  dir=aimPoint().subtract(origin).normalize();if(!rocket)dir.addInPlace(new B.Vector3((Math.random()-.5)*.004,(Math.random()-.5)*.004,(Math.random()-.5)*.004)).normalize();shot(origin,dir,true,target,rocket);game.shake=Math.max(game.shake||0,rocket?.35:.10);game.speed-=rocket?.1:.04;sound(rocket?'launch':'gun')
 }
 function sweepSphere(a,b,center,radius){const delta=b.subtract(a),offset=a.subtract(center),aa=delta.lengthSquared(),cc=offset.lengthSquared()-radius*radius;if(cc<=0)return 0;if(aa<1e-8)return null;const bb=B.Vector3.Dot(offset,delta),disc=bb*bb-aa*cc;if(disc<0)return null;const t=(-bb-Math.sqrt(disc))/aa;return t>=0&&t<=1?t:null}
 function terrainHit(a,b){const delta=b.subtract(a),steps=Math.max(1,Math.ceil(delta.length()/5));let previous=0;for(let i=0;i<=steps;i++){const t=i/steps,p=a.add(delta.scale(t));if(p.y<=groundHeight(p.x,p.z)){let lo=previous,hi=t;for(let k=0;k<8;k++){const mid=(lo+hi)/2,q=a.add(delta.scale(mid));if(q.y<=groundHeight(q.x,q.z))hi=mid;else lo=mid}return hi}previous=t}return null}
 function updateOrdnance(dt){
  const g=game;for(let j=g.bullets.length-1;j>=0;j--){const b=g.bullets[j];b.life-=dt;b.age+=dt;
   // Substeps bound steering and swept impacts even on slow frames.
   const steps=Math.ceil(dt/(1/120)),step=dt/steps;
   for(let k=0;k<steps&&b.life>0;k++){
    const old=b.mesh.position.clone();
    if(b.rocket){let heading=b.vel.normalizeToNew();if(b.target&&!b.target.dead&&b.age>.2&&visibleBetween(old,b.target.obj.position.add(new B.Vector3(0,b.target.air?0:7,0)))){const desired=b.target.obj.position.add(new B.Vector3(0,b.target.air?0:10,0)).subtract(old).normalize(),angle=Math.acos(B.Scalar.Clamp(B.Vector3.Dot(heading,desired),-1,1));heading=B.Vector3.Lerp(heading,desired,Math.min(1,1.2*step/Math.max(angle,.001))).normalize()}const powered=b.age<4,speed=powered?Math.min(420,b.vel.length()+150*step):b.vel.length()*Math.exp(-.045*step);b.vel=heading.scale(speed);if(!powered)b.vel.y-=9.81*step;
    }else{b.vel.y-=9.81*step;b.vel.scaleInPlace(Math.exp(-.035*step))}
    const next=old.add(b.vel.scale(step));let t=terrainHit(old,next),hit=null;const cover=sector?.hit(old,next);if(cover!==null&&cover!==undefined&&(t===null||cover<t))t=cover;
    const candidates=b.friendly?g.enemies.filter(e=>!e.dead):[{obj:g.player,air:true}];
    for(const e of candidates){const broad=sweepSphere(old,next,e.obj.position.add(new B.Vector3(0,e.air?0:7,0)),28);if(broad===null)continue;const travel=next.subtract(old),length=travel.length();if(length<1e-6)continue;const ray=new B.Ray(old,travel.scale(1/length),length);for(const mesh of e.obj.getChildMeshes()){if(mesh.name==='blade'||mesh.name.includes('Rotor'))continue;const pick=ray.intersectsMesh(mesh,false);if(pick.hit&&pick.distance<=length){const impact=pick.distance/length;if(t===null||impact<t){t=impact;hit=e}}}}
    if(t!==null){const pos=B.Vector3.Lerp(old,next,t);b.mesh.position.copyFrom(pos);b.life=0;if(b.rocket)explode(pos,170,hit);else if(hit){if(b.friendly)damageEnemy(hit,22,pos);else{g.hp-=4;g.shake=Math.max(g.shake||0,.35);marker.classList.add('damaged');setTimeout(()=>marker.classList.remove('damaged'),200);if(g.hp<=0)end(false)}burst(pos,'spark')}else combatParticles(pos,'dust');break}
    b.mesh.position.copyFrom(next);
   }
   if(!b.rocket)b.mesh.scaling.y=B.Scalar.Clamp(b.vel.length()*dt/24,1,2);
   b.mesh.rotationQuaternion=B.Quaternion.FromUnitVectorsToRef(B.Axis.Y,b.vel.normalizeToNew(),b.mesh.rotationQuaternion);
   if(b.rocket){const flame=b.mesh.getChildMeshes().find(m=>m.name==='motorFlame');if(flame)flame.setEnabled(b.age<4);b.trail-=dt;if(b.age<4&&b.trail<=0){combatParticles(b.mesh.position.subtract(b.vel.normalizeToNew().scale(4)),'trail');b.trail=.09}}
   if(b.life<=0){b.mesh.setEnabled(false);(b.rocket?missilePool:tracerPool).push(b.mesh);const index=g.objects.indexOf(b.mesh);if(index>=0)g.objects.splice(index,1);g.bullets.splice(j,1)}
  }
  for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.vel.y-=9.81*dt;e.mesh.position.addInPlace(e.vel.scale(dt));e.mesh.rotation.addInPlace(new B.Vector3(dt*3,dt*2,dt));const ground=groundHeight(e.mesh.position.x,e.mesh.position.z)+.4;if(e.mesh.position.y<ground){e.mesh.position.y=ground;e.vel.y=Math.abs(e.vel.y)*.28;e.vel.x*=.65;e.vel.z*=.65;e.bounces++}if(e.life<=0||e.bounces>8){e.mesh.setEnabled(false);debrisPool.push(e.mesh);effects.splice(i,1)}}
 }

 const sortiePanel=document.createElement('div');sortiePanel.id='sortie-panel';document.getElementById('game-shell').appendChild(sortiePanel);
 function enterPhase(phase,message,waypoint=null){game.phase=phase;game.phaseTime=0;game.wave=0;game.waypoint=waypoint;keys.delete('mouse');notify(message);if(['transit','extract'].includes(phase))game.hp=Math.min(100,game.hp+25)}
 function prepareEnemies(){
  const g=game,count=missions[g.i].group;
  for(const phase of ['assault','bravo','intercept'])for(let wave=0;wave<2;wave++)for(let n=0;n<count;n++){
   const air=phase==='intercept'||n%2===wave%2,center=phase==='assault'?new B.Vector3(0,125,1200):new B.Vector3(1400,125,1400),obj=instantiate(air?'helo':n%2?'apc':'turret',air?30:25,!air),angle=wave===0?n*2.5+.3:n*1.3+.7,range=wave===0&&phase!=='intercept'?210+n*90:900+n*160;
   const place=window.SectorWorld.formation(phase,wave,n,air);obj.position.set(place.x,air?place.y:groundHeight(place.x,place.z)+.25,place.z);
   g.objects.push(obj);g.enemies.push({obj,air,patrolIndex:n,heading:0,hp:air?220:400,max:air?220:400,fire:3+n,dead:false,wreck:false,smoke:0,stage:phase,wave,active:false,anchor:obj.position.clone(),destination:center,reinforcement:wave===1||phase==='intercept'});for(const mesh of obj.getChildMeshes())mesh.metadata={...mesh.metadata,combatTarget:g.enemies[g.enemies.length-1]};
  }
 }
 function spawnWave(){const g=game;for(const e of g.enemies)if(e.stage===g.phase&&e.wave===g.wave&&!e.dead){if(!e.active){e.active=true;e.fire=3}}g.wave++;notify(g.wave===1?'HOSTILES CONFIRMED. WEAPONS FREE.':'REINFORCEMENTS APPROACHING. CHECK YOUR RADAR.')}
 function missionDirector(dt){const g=game,flatDistance=point=>Math.hypot(g.player.position.x-point.x,g.player.position.z-point.z);
 if(g.phase==='ingress'&&g.phaseTime>=8&&flatDistance(g.waypoint)<500)enterPhase('assault','ALPHA REACHED. ENGAGE THE DEFENSIVE LINE.');
 if(g.phase==='transit'&&flatDistance(g.waypoint)<300)enterPhase('bravo','BRAVO REACHED. BREAK THE SECOND LINE.');
 if(['assault','bravo','intercept'].includes(g.phase)){
  if(g.wave===0||(g.wave===1&&g.phaseTime>=22))spawnWave();
  const duration=g.phase==='bravo'?45:40;
  if(g.wave===2&&g.phaseTime>=duration&&g.enemies.filter(e=>e.stage===g.phase).every(e=>e.dead)){
   if(g.phase==='assault')enterPhase('transit','ALPHA CLEAR. REPAIR SYSTEMS ACTIVE. PROCEED TO BRAVO.',new B.Vector3(1400,125,1400));
   else if(g.phase==='bravo')enterPhase('intercept','GROUND OBJECTIVES CLEAR. ENEMY AIR RESPONSE INBOUND.');
   else enterPhase('extract','SECTOR SECURED. RETURN TO EXTRACTION.',new B.Vector3(0,125,-1600));
  }
 }
 if(g.phase==='extract'&&flatDistance(g.waypoint)<220)enterPhase('secure','EXTRACTION IN PROGRESS. HOLD HERE FOR 10 SECONDS.',g.waypoint);
 if(g.phase==='secure'){if(flatDistance(g.waypoint)>240){g.phase='extract';g.phaseTime=0;notify('RETURN TO THE EXTRACTION ZONE.')}else if(g.phaseTime>=10){end(true);return}}
 g.panelClock=(g.panelClock||0)-dt;if(g.panelClock>0)return;g.panelClock=.1;const waypoint=g.waypoint,seconds=Math.floor(g.time),heading=waypoint?Math.atan2(waypoint.x-g.player.position.x,waypoint.z-g.player.position.z)-g.yaw:0;
 sortiePanel.style.display=mode==='playing'?'block':'none';sortiePanel.innerHTML=`<b>${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')} / ${g.phase.toUpperCase()}</b><span>${waypoint?`${Math.round(flatDistance(waypoint))} M TO ${g.phase==='ingress'?'ALPHA':g.phase==='transit'?'BRAVO':'EXTRACTION'}`:`${g.enemies.filter(e=>!e.dead&&e.stage===g.phase).length} HOSTILES / WAVE ${g.wave} OF 2`}</span>${waypoint?`<i style="transform:rotate(${heading}rad)">^</i>`:''}<small>WEAPONS FREE</small>`;
 }
 function update(dt){if(!game)return;const g=game,p=g.player;combatAssets.update(dt);g.time+=dt;g.phaseTime+=dt;missionDirector(dt);g.gun-=dt;g.rocket-=dt;g.flare-=dt;
 let thrust=(keys.has('w')?1:0)-(keys.has('s')?1:0),side=(keys.has('d')?1:0)-(keys.has('a')?1:0);const boosting=thrust>0&&keys.has('shift');g.speed+=(thrust*(boosting?240:120)-g.speed)*Math.min(1,dt*(boosting?3:2));g.side+=(side*90-g.side)*Math.min(1,dt*3);p.position.addInPlace(forward().scale(g.speed*dt));p.position.addInPlace(new B.Vector3(Math.cos(g.yaw),0,-Math.sin(g.yaw)).scale(g.side*dt));p.position.y=B.Scalar.Clamp(p.position.y+((keys.has('e')?1:0)-(keys.has('q')?1:0))*65*dt,Math.max(55,groundHeight(p.position.x,p.position.z)+24),450);p.position.x=B.Scalar.Clamp(p.position.x,-2600,2600);p.position.z=B.Scalar.Clamp(p.position.z,-2600,2600);p.rotation.set(-g.pitch,g.yaw,side*-.1);spinRotors(p,dt);
 const want=p.position.subtract(forward().scale(48)).add(new B.Vector3(0,22,0));camera.position=B.Vector3.Lerp(camera.position,want,Math.min(1,dt*6));g.shake=(g.shake||0)*Math.exp(-12*dt);camera.position.addInPlace(new B.Vector3(Math.sin(g.time*91),Math.cos(g.time*83),0).scale(g.shake));camera.setTarget(p.position.add(forward().scale(28)).add(new B.Vector3(0,3,0)));
 updateLock(dt);if(keys.has(' ')||keys.has('mouse'))fire();
 for(const e of g.enemies){
  if(e.impulse){e.obj.position.addInPlace(e.impulse.scale(dt));e.impulse.scaleInPlace(Math.exp(-3*dt))}
  spinRotors(e.obj,dt,e.wreck?Math.max(0,28-(e.wreckAge||0)*7):36);
  if(!e.dead&&!e.active&&B.Vector3.DistanceSquared(p.position,e.obj.position)<700*700&&visibleBetween(e.obj.position.add(new B.Vector3(0,10,0)),p.position))alertEnemy(e);
  if(!e.active&&!e.dead){if(e.air){const angle=g.time*.09+(e.stage==='assault'?0:Math.PI),offset=e.patrolIndex%2?70:-70;const goal=e.anchor.add(new B.Vector3(Math.cos(angle)*150+offset,Math.sin(angle*.5)*8,Math.sin(angle)*230));const old=e.obj.position.clone();e.obj.position=B.Vector3.Lerp(e.obj.position,goal,Math.min(1,dt*.5));e.obj.rotation.y=Math.atan2(e.obj.position.x-old.x,e.obj.position.z-old.z)}continue}

  if(e.wreck){e.wreckAge+=dt;if(combatAssets.ready&&e.wreckAge<22&&(e.fireFx||0)<=0){combatAssets.emit('burning',e.obj.position.add(new B.Vector3(0,12,0)),40,{duration:6,anchor:e.obj});e.fireFx=5.5}e.fireFx=(e.fireFx||0)-dt;e.smoke-=dt;if(e.smoke<0&&e.wreckAge<20){burst(e.obj.position,'smoke');e.smoke=.7}if(e.air&&e.obj.position.y>groundHeight(e.obj.position.x,e.obj.position.z)+5){e.fall+=dt*14;e.obj.position.y-=e.fall*dt;e.obj.rotation.z+=dt*.7;e.obj.rotation.x+=dt*.4;if(e.obj.position.y<=groundHeight(e.obj.position.x,e.obj.position.z)+5){e.obj.position.y=groundHeight(e.obj.position.x,e.obj.position.z)+5;burst(e.obj.position,'explosion');sound('explosion',e.obj.position)}}continue}
  if(e.dead)continue;if(e.hp<e.max*.45){e.smoke-=dt;if(e.smoke<0){burst(e.obj.position,'smoke');e.smoke=1.2}}
  let d=p.position.subtract(e.obj.position),distance=d.length();let moving=false;if(!e.air&&e.obj.metadata?.combat?.key==='apc'&&(e.reinforcement||distance>450)){const route=window.SectorWorld.roadInfo(e.obj.position.x,e.obj.position.z);const dest=window.SectorWorld.roadInfo(e.destination.x,e.destination.z);let goal;if(route.distance>12)goal=new B.Vector3(route.x,0,route.z);else{const dx=dest.x-e.obj.position.x,dz=dest.z-e.obj.position.z;goal=new B.Vector3(e.obj.position.x+Math.sin(route.heading)*Math.sign(dx*Math.sin(route.heading)+dz*Math.cos(route.heading))*50,0,e.obj.position.z+Math.cos(route.heading)*Math.sign(dx*Math.sin(route.heading)+dz*Math.cos(route.heading))*50)}const travel=goal.subtract(e.obj.position);travel.y=0;if(Math.hypot(e.destination.x-e.obj.position.x,e.destination.z-e.obj.position.z)>90&&travel.length()>2){moving=true;const wanted=Math.atan2(travel.x,travel.z),diff=Math.atan2(Math.sin(wanted-e.obj.rotation.y),Math.cos(wanted-e.obj.rotation.y));e.obj.rotation.y+=B.Scalar.Clamp(diff,-dt,dt);const next=e.obj.position.add(new B.Vector3(Math.sin(e.obj.rotation.y),0,Math.cos(e.obj.rotation.y)).scale(15*dt));if(!sector||sector.hit(e.obj.position.add(new B.Vector3(0,3,0)),next.add(new B.Vector3(0,3,0)))===null)e.obj.position.copyFrom(next);e.obj.position.y=groundHeight(e.obj.position.x,e.obj.position.z)+.25;}}
  if(e.air){const offset=e.patrolIndex%2?1:-1,angle=g.time*.16+e.patrolIndex*.9;const goal=p.position.add(new B.Vector3(Math.sin(angle)*offset*260,35+e.patrolIndex*7,Math.cos(angle)*260));const travel=goal.subtract(e.obj.position);if(travel.length()>15)e.obj.position.addInPlace(travel.normalize().scale(45*dt));e.obj.position.y=Math.max(e.obj.position.y,groundHeight(e.obj.position.x,e.obj.position.z)+55);e.obj.rotation.z=B.Scalar.Lerp(e.obj.rotation.z,Math.sin(angle)*.1,dt*2)}if(e.obj.metadata?.combat?.key!=='apc')e.obj.rotation.y=Math.atan2(d.x,d.z);animateCombat(e,dt,moving);e.fire-=dt;if(e.fire<0&&distance<850&&!(e.obj.metadata?.combat?.readyTime>0)){const muzzle=e.obj.position.add(new B.Vector3(0,e.air?0:9,0));if(visibleBetween(muzzle,p.position)){e.fire=e.air?.85:2.4;animateCombat(e,0,false,true);const lead=forward().scale(g.speed*distance/360*.85).add(new B.Vector3(Math.cos(g.yaw),0,-Math.sin(g.yaw)).scale(g.side*distance/360*.85)),aim=p.position.add(lead).subtract(muzzle);aim.y+=4.905*Math.pow(distance/360,2);aim.addInPlace(new B.Vector3((Math.random()-.5)*7,(Math.random()-.5)*5,(Math.random()-.5)*7));shot(muzzle,aim,false)}else e.fire=.35}}

 updateOrdnance(dt);
 g.hudClock=(g.hudClock||0)-dt;if(g.hudClock<=0){g.hudClock=.1;const viewport=camera.viewport.toGlobal(engine.getRenderWidth(),engine.getRenderHeight());let labels='';for(const e of g.enemies){if(e.dead||B.Vector3.Distance(p.position,e.obj.position)>800)continue;const pos=e.obj.position.add(new B.Vector3(0,25,0)),projected=B.Vector3.Project(pos,B.Matrix.Identity(),scene.getTransformMatrix(),viewport);if(projected.z<0||projected.z>1)continue;labels+=`<div class="enemy-label" style="left:${projected.x/engine.getRenderWidth()*100}%;top:${projected.y/engine.getRenderHeight()*100}%"><i><b style="width:${Math.max(0,e.hp/e.max*100)}%"></b></i></div>`}$('enemy-labels').innerHTML=labels;marker.style.display=mode==='playing'?'block':'none';hud()}}

 engine.runRenderLoop(()=>{const ms=engine.getDeltaTime(),dt=Math.min(ms/1000,.05);if(mode==='playing')update(dt);const inspecting=!$('screen-menu').classList.contains('hidden')&&preview;scene.activeCamera=inspecting?preview.camera:camera;scene.fogEnabled=!inspecting;scene.clearColor=inspecting?new B.Color4(.055,.075,.065,1):new B.Color4(.65,.72,.77,1);scene.render()});addEventListener('resize',()=>{engine.setHardwareScalingLevel(1/Math.min(devicePixelRatio||1,2));engine.resize()});
 $('launch').onclick=()=>show('screen-missions');$('controls-link').onclick=()=>show('screen-controls');$('back-menu').onclick=()=>$('controls-back').click();$('controls-back').onclick=()=>show('screen-menu');$('resume').onclick=()=>show('');$('quit-mission').onclick=()=>{cleanup();show('screen-menu')};$('replay').onclick=()=>start(game.i);$('result-hangar').onclick=()=>{cleanup();show('screen-missions')};
 addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys.add(k);if([' ','arrowup','arrowdown'].includes(k))e.preventDefault();if(!e.repeat&&mode==='playing'){if(k==='r')fire(true);if(k==='f'&&game.flare<=0){game.flare=8;notify('FLARES DEPLOYED')}}if(k==='escape'&&!e.repeat){if(mode==='playing')show('screen-pause');else if(mode==='paused')show('')}});addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));addEventListener('blur',()=>keys.clear());canvas.addEventListener('pointerdown',e=>{if(mode==='playing'&&e.pointerType==='mouse'){const capture=canvas.requestPointerLock?.();capture?.catch?.(()=>{});keys.add('mouse')}});addEventListener('pointerup',()=>keys.delete('mouse'));document.addEventListener('mousemove',e=>{if(mode==='playing'&&game){if(!document.pointerLockElement&&e.target.closest?.('#tactical-map'))return;const dx=B.Scalar.Clamp(e.movementX||0,-160,160),dy=B.Scalar.Clamp(e.movementY||0,-160,160);game.yaw+=dx*.0025;game.pitch=B.Scalar.Clamp(game.pitch-dy*.002,-.55,.55)}});
 async function initHangar(){
  try{
   await asset('player','../odz-10ag_attack_helicopter_10a.glb');
   const model=instantiate('player',35);model.name='inspectionAircraft';for(const mesh of model.getChildMeshes())shadows.removeShadowCaster(mesh,false);model.position.set(10000,0,0);
   const mask=0x10000000;for(const mesh of model.getChildMeshes())mesh.layerMask=mask;
   const orbit=new B.ArcRotateCamera('hangarCamera',-Math.PI*.72,1.22,57,model.position.clone(),scene);orbit.layerMask=mask;orbit.minZ=.1;orbit.maxZ=200;orbit.fov=.7;
   // Aim off-center so the model occupies the inspection panel beside the menu.
   const align=()=>{const mobile=innerWidth<=720;orbit.viewport=new B.Viewport(mobile?.05:.43,mobile?.09:.10,mobile?.90:.54,mobile?.52:.82)};align();addEventListener('resize',align);
   const floor=B.MeshBuilder.CreateCylinder('inspectionPlatform',{diameter:48,height:.3,tessellation:64},scene);floor.position.set(10000,-8,0);floor.layerMask=mask;const mat=new B.StandardMaterial('platformFinish',scene);mat.diffuseColor=new B.Color3(.16,.19,.15);mat.specularColor=new B.Color3(.25,.25,.22);floor.material=mat;
   preview={model,camera:orbit};$('hangar-status').hidden=true;
   const view=$('hangar-view');let drag=null;
   view.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX,y:e.clientY};view.setPointerCapture(e.pointerId)});
   view.addEventListener('pointermove',e=>{if(!drag)return;orbit.alpha-=(e.clientX-drag.x)*.008;orbit.beta=B.Scalar.Clamp(orbit.beta+(e.clientY-drag.y)*.006,.22,2.6);drag={x:e.clientX,y:e.clientY}});
   const release=()=>drag=null;view.addEventListener('pointerup',release);view.addEventListener('pointercancel',release);view.addEventListener('lostpointercapture',release);
   view.addEventListener('wheel',e=>{e.preventDefault();orbit.radius=B.Scalar.Clamp(orbit.radius+e.deltaY*.035,30,85)},{passive:false});
   view.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')orbit.alpha-=.15;if(e.key==='ArrowRight')orbit.alpha+=.15;if(e.key==='ArrowUp')orbit.beta=Math.max(.22,orbit.beta-.1);if(e.key==='ArrowDown')orbit.beta=Math.min(2.6,orbit.beta+.1);if(e.key==='+')orbit.radius=Math.max(30,orbit.radius-3);if(e.key==='-')orbit.radius=Math.min(85,orbit.radius+3)});
   $('hangar-reset').onclick=()=>{orbit.alpha=-Math.PI*.72;orbit.beta=1.22;orbit.radius=57};
  }catch(error){console.error(error);$('hangar-status').textContent='AIRCRAFT PREVIEW UNAVAILABLE ? RELOAD TO RETRY'}
 }
 show('screen-menu');initHangar();
})().catch(console.error);
