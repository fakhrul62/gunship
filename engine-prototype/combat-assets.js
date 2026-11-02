/* Optional local effects. Source assets are not included in the public build. */
window.CombatAssets=class CombatAssets {
 constructor(B,scene,camera){this.B=B;this.scene=scene;this.camera=camera;this.managers={};this.items=[];this.buffers=[];this.voices=0;this.ready=false}
 async load(){
  if(!['localhost','127.0.0.1','::1'].includes(location.hostname))return;
  try{const response=await fetch('../local-effects/manifest.json');if(!response.ok)return;const data=await response.json();this.data=data;
   const jobs=Object.entries(data.sprites).map(async([key,def])=>{const manager=new this.B.SpriteManager('asset-'+key,'../local-effects/'+def.file,16,256,this.scene);manager.fogEnabled=true;manager.isPickable=false;manager.blendMode=this.B.Engine.ALPHA_COMBINE;manager.texture.anisotropicFilteringLevel=2;this.managers[key]=manager;await new Promise((resolve,reject)=>{if(manager.texture.isReady())resolve();else{manager.texture.onLoadObservable.addOnce(resolve);manager.texture.onErrorObservable?.addOnce(reject)}})});
   await Promise.all(jobs);this.audio=new AudioContext();for(const file of data.sounds){const r=await fetch('../local-effects/'+file);this.buffers.push(await this.audio.decodeAudioData(await r.arrayBuffer()))}this.ready=true;
  }catch(error){console.warn('Optional local combat effects unavailable',error)}
 }
 emit(kind,position,size,options={}){
  if(!this.ready||this.items.length>=32||!this.managers[kind])return false;
  if(this.items.filter(i=>i.kind===kind).length>=12)return false;
  const sprite=new this.B.Sprite(kind,this.managers[kind]);sprite.position.copyFrom(position);sprite.width=sprite.height=size;sprite.color=new this.B.Color4(1,1,1,options.alpha??1);
  this.items.push({kind,sprite,age:0,duration:options.duration||this.data.sprites[kind].duration,anchor:options.anchor,offset:options.anchor?position.subtract(options.anchor.position):null,size,alpha:options.alpha??1,drift:options.drift||0,grow:options.grow||0});return true
 }
 explosion(position,ground){const size=ground?95:65;return this.emit(ground?'groundblast':'fireball',position.add(new this.B.Vector3(0,ground?size*.24:0,0)),size)}
 sound(position){
  if(!this.ready||!this.buffers.length||this.voices>=8)return false;
  const distance=this.B.Vector3.Distance(position,this.camera.position);if(distance>2400)return true;
  this.audio.resume();const source=this.audio.createBufferSource(),gain=this.audio.createGain(),filter=this.audio.createBiquadFilter(),pan=this.audio.createStereoPanner();source.buffer=this.buffers[Math.floor(Math.random()*this.buffers.length)];source.playbackRate.value=.92+Math.random()*.16;
  filter.type='lowpass';filter.frequency.value=16000/(1+distance/150);gain.gain.value=.7/(1+Math.pow(distance/180,1.4));const offset=position.subtract(this.camera.position),right=this.camera.getDirection(this.B.Axis.X);pan.pan.value=this.B.Scalar.Clamp(this.B.Vector3.Dot(offset.normalize(),right),-1,1);
  source.connect(filter).connect(gain).connect(pan).connect(this.audio.destination);this.voices++;source.onended=()=>{this.voices--;source.disconnect();filter.disconnect();gain.disconnect();pan.disconnect()};source.start(this.audio.currentTime+Math.min(distance/343,3));return true
 }
 update(dt){for(let i=this.items.length-1;i>=0;i--){const fx=this.items[i];fx.age+=dt;const t=fx.age/fx.duration;if(t>=1){fx.sprite.dispose();this.items.splice(i,1);continue}fx.sprite.cellIndex=Math.min(this.data.sprites[fx.kind].frames-1,Math.floor(t*this.data.sprites[fx.kind].frames));if(fx.anchor&&!fx.anchor.isDisposed())fx.sprite.position.copyFrom(fx.anchor.position.add(fx.offset));else fx.sprite.position.y+=fx.drift*dt;fx.sprite.width=fx.sprite.height=fx.size*(1+t*fx.grow);fx.sprite.color.a=fx.alpha*Math.min(1,(1-t)*5)}}
 pause(paused){if(this.audio){if(paused)this.audio.suspend();else this.audio.resume()}}
 clear(){for(const fx of this.items)fx.sprite.dispose();this.items.length=0}
};
