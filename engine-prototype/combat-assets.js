/* Shared hosted/local effects; attribution is in assets/effects/CREDITS.md. */
window.CombatAssets=class CombatAssets {
 constructor(B,scene,camera,height=()=>0){this.height=height;this.B=B;this.scene=scene;this.camera=camera;this.managers={};this.items=[];this.buffers=[];this.voices=0;this.ready=false;this.wrecks=[];this.lights=[];this.soundQueue=[];this.sources=new Set();this.scorches=[]}
 async load(){
  try{const response=await fetch('../assets/effects/manifest.json');if(!response.ok)return;const data=await response.json();this.data=data;
   const jobs=Object.entries(data.sprites).map(async([key,def])=>{const manager=new this.B.SpriteManager('asset-'+key,'../assets/effects/'+def.file,key==='trail'?256:64,256,this.scene);manager.fogEnabled=true;manager.isPickable=false;manager.blendMode=this.B.Engine.ALPHA_COMBINE;manager.texture.anisotropicFilteringLevel=2;this.managers[key]=manager;await new Promise((resolve,reject)=>{if(manager.texture.isReady())resolve();else{manager.texture.onLoadObservable.addOnce(resolve);manager.texture.onErrorObservable?.addOnce(reject)}})});
   await Promise.all(jobs);this.audio=new AudioContext();for(const file of data.sounds){const r=await fetch('../assets/effects/'+file);this.buffers.push(await this.audio.decodeAudioData(await r.arrayBuffer()))}this.ready=true;
  }catch(error){console.warn('Optional local combat effects unavailable',error)}
 }
 emit(kind,position,size,options={}){
  if(!this.ready||this.items.length>=384||!this.managers[kind])return false;
  if(this.items.filter(i=>i.kind===kind).length>=(kind==='trail'?256:32))return false;
  const sprite=new this.B.Sprite(kind,this.managers[kind]);sprite.position.copyFrom(position);sprite.width=sprite.height=size;sprite.color=options.color||new this.B.Color4(1,1,1,options.alpha??1);sprite.angle=options.angle||0;const cell=Math.floor(Math.random()*this.data.sprites[kind].frames);
  this.items.push({kind,sprite,cell,age:0,duration:options.duration||this.data.sprites[kind].duration,anchor:options.anchor,offset:options.anchor?position.subtract(options.anchor.position):null,size,alpha:options.alpha??1,velocity:options.velocity,drift:options.drift||0,grow:options.grow||0});return true
 }
 explosion(position,ground){
  if(!this.ready)return false;const B=this.B,distance=B.Vector3.Distance(position,this.camera.position);if(distance>3000)return true;
  this.emit('flash',position,ground?14:12,{duration:.08});this.emit(ground?'groundblast':'fireball',position.add(new B.Vector3(0,ground?9:0,0)),ground?48:40);
  for(let i=0;i<(ground?7:3);i++){const angle=i*2.399;this.emit(ground?'dust':'smoke',position.add(new B.Vector3(Math.cos(angle)*6,3,Math.sin(angle)*6)),ground?12:9,{duration:3.5,velocity:new B.Vector3(Math.cos(angle)*3,0,Math.sin(angle)*3),drift:ground?1:3,grow:2.5,alpha:.55,color:ground?new B.Color4(.65,.51,.32,.55):new B.Color4(.28,.26,.23,.55)})}
  if(ground)this.scorch(position);
  if(this.lights.length<4){const light=new B.PointLight('blastFlash',position.add(new B.Vector3(0,5,0)),this.scene);light.diffuse=new B.Color3(1,.55,.17);light.intensity=14;light.range=90;this.lights.push({light,age:0})}return true
 }
 scorch(position){
  if(this.scorches.some(m=>this.B.Vector3.DistanceSquared(m.position,position)<100))return;
  const B=this.B;if(!this.scorchMaterial){const texture=new B.DynamicTexture('scorchMask',128,this.scene,false),c=texture.getContext(),g=c.createRadialGradient(64,64,5,64,64,62);g.addColorStop(0,'rgba(20,15,10,.7)');g.addColorStop(.5,'rgba(25,20,14,.4)');g.addColorStop(1,'rgba(25,20,14,0)');c.fillStyle=g;c.fillRect(0,0,128,128);texture.update();texture.hasAlpha=true;const mat=new B.StandardMaterial('groundScorch',this.scene);mat.diffuseTexture=texture;mat.useAlphaFromDiffuseTexture=true;mat.disableLighting=true;mat.emissiveColor=B.Color3.White();mat.backFaceCulling=false;mat.zOffset=-1;this.scorchMaterial=mat}
  const mesh=B.MeshBuilder.CreateGround('blastScorch',{width:34,height:34,subdivisions:8,updatable:true},this.scene),vertices=mesh.getVerticesData(B.VertexBuffer.PositionKind);for(let i=0;i<vertices.length;i+=3)vertices[i+1]=this.height(position.x+vertices[i],position.z+vertices[i+2])+.08;mesh.updateVerticesData(B.VertexBuffer.PositionKind,vertices);mesh.position.set(position.x,0,position.z);mesh.material=this.scorchMaterial;mesh.isPickable=false;this.scorches.push(mesh);if(this.scorches.length>24)this.scorches.shift().dispose()
 }
 wreck(root){if(!this.wrecks.some(w=>w.root===root))this.wrecks.push({root,age:0,smoke:0,fire:0})}
 sound(position){
  if(!this.ready||!this.buffers.length)return false;if(this.voices+this.soundQueue.length>=8)return true;
  const distance=this.B.Vector3.Distance(position,this.camera.position);if(distance>2400)return true;
  this.soundQueue.push({position:position.clone(),delay:Math.min(distance/343,6)});return true
 }
 playSound(position){
  const B=this.B,distance=B.Vector3.Distance(position,this.camera.position),source=this.audio.createBufferSource(),gain=this.audio.createGain(),filter=this.audio.createBiquadFilter(),pan=this.audio.createStereoPanner();this.audio.resume();source.buffer=this.buffers[Math.floor(Math.random()*this.buffers.length)];source.playbackRate.value=.94+Math.random()*.12;filter.type='lowpass';filter.frequency.value=14000/(1+distance/200);gain.gain.value=.8/(1+Math.pow(distance/160,1.4));const offset=position.subtract(this.camera.position),right=this.camera.getDirection(B.Axis.X);pan.pan.value=B.Scalar.Clamp(B.Vector3.Dot(offset.normalize(),right),-1,1);source.connect(filter).connect(gain).connect(pan).connect(this.audio.destination);this.voices++;this.sources.add(source);source.onended=()=>{this.voices--;this.sources.delete(source);source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect()};source.start()
 }

 update(dt){
  for(let i=this.soundQueue.length-1;i>=0;i--){const q=this.soundQueue[i];q.delay-=dt;if(q.delay<=0){this.playSound(q.position);this.soundQueue.splice(i,1)}}
  for(let i=this.lights.length-1;i>=0;i--){const l=this.lights[i];l.age+=dt;l.light.intensity=14*Math.exp(-l.age*24);if(l.age>.3){l.light.dispose();this.lights.splice(i,1)}}
  for(let i=this.wrecks.length-1;i>=0;i--){const w=this.wrecks[i];if(w.root.isDisposed()||w.age>45){this.wrecks.splice(i,1);continue}w.age+=dt;w.smoke-=dt;w.fire-=dt;const position=w.root.position;
   if(this.ready&&this.B.Vector3.DistanceSquared(position,this.camera.position)<2500*2500){if(w.smoke<=0){this.emit('smoke',position.add(new this.B.Vector3(0,8,0)),10,{duration:7,drift:4,grow:2,alpha:.75});w.smoke=.7}if(w.age<24&&w.fire<=0){this.emit('burning',position.add(new this.B.Vector3(0,5,0)),18,{duration:2.1,anchor:w.root});w.fire=1.8}}
  }
  for(let i=this.items.length-1;i>=0;i--){const fx=this.items[i];fx.age+=dt;const t=fx.age/fx.duration;if(t>=1){fx.sprite.dispose();this.items.splice(i,1);continue}fx.sprite.cellIndex=this.data.sprites[fx.kind].animated?Math.min(this.data.sprites[fx.kind].frames-1,Math.floor(t*this.data.sprites[fx.kind].frames)):fx.cell;if(fx.anchor&&!fx.anchor.isDisposed())fx.sprite.position.copyFrom(fx.anchor.position.add(fx.offset));else fx.sprite.position.y+=fx.drift*dt;if(fx.velocity){fx.sprite.position.addInPlace(fx.velocity.scale(dt));fx.velocity.scaleInPlace(Math.exp(-dt*.6))}fx.sprite.width=fx.sprite.height=fx.size*(1+t*fx.grow);fx.sprite.color.a=fx.alpha*Math.min(1,(1-t)*5)}}
 pause(paused){if(this.audio){if(paused)this.audio.suspend();else this.audio.resume()}}
 clear(){for(const m of this.scorches)m.dispose();this.scorches.length=0;this.wrecks.length=0;this.soundQueue.length=0;for(const l of this.lights)l.light.dispose();this.lights.length=0;for(const source of this.sources)try{source.stop()}catch{}for(const fx of this.items)fx.sprite.dispose();this.items.length=0}
};
