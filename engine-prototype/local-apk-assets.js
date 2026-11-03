window.LocalApkAssets=class LocalApkAssets{
 constructor(B,scene){this.B=B;this.scene=scene;this.buffers={};this.voices=0;this.loaded=0}
 async load(sector,height){
  const check=await fetch('../assets/gunship/manifest.json');if(!check.ok)return;
  const B=this.B,places=[['Desert_House_A_02',28,-165,1180],['Desert_House_D_01',25,-180,1250],['Desert_House_C_02',23,1530,1480],['Hangar_A',65,-125,-1570],['OilTank_red',14,1490,1510]];
  for(const [name,size,x,z] of places){const result=await B.SceneLoader.ImportMeshAsync('','../assets/gunship/models/',name+'.glb',this.scene);const root=new B.TransformNode('apk-'+name,this.scene);for(const node of result.meshes.filter(m=>!m.parent))node.parent=root;root.computeWorldMatrix(true);const box=root.getHierarchyBoundingVectors(true),extent=box.max.subtract(box.min),scale=size/Math.max(extent.x,extent.y,extent.z);root.scaling.setAll(scale);root.position.set(x-(box.min.x+box.max.x)*.5*scale,height(x,z)-box.min.y*scale,z-(box.min.z+box.max.z)*.5*scale);root.computeWorldMatrix(true);const world=root.getHierarchyBoundingVectors(true);sector.cover.push({min:world.min,max:world.max,mesh:root,surface:name.includes('OilTank')?'metal':'concrete'});for(const mesh of root.getChildMeshes()){mesh.isPickable=false;mesh.receiveShadows=true}this.loaded++}
  this.audio=new AudioContext();for(const [kind,file] of [['gun','30mm_shoot.wav'],['launch','missile_shoot.wav'],['hit','BulletHit_Metal.wav']]){const r=await fetch('../assets/gunship/sounds/'+encodeURIComponent(file));this.buffers[kind]=await this.audio.decodeAudioData(await r.arrayBuffer())}
 }
 sound(kind){if(!this.buffers[kind]||this.voices>=10)return false;this.audio.resume();const src=this.audio.createBufferSource(),gain=this.audio.createGain();src.buffer=this.buffers[kind];gain.gain.value=kind==='gun'?.18:.25;src.playbackRate.value=.97+Math.random()*.06;src.connect(gain).connect(this.audio.destination);this.voices++;src.onended=()=>{this.voices--;src.disconnect();gain.disconnect()};src.start();return true}
 pause(paused){if(this.audio){if(paused)this.audio.suspend();else this.audio.resume()}}
};
