window.RotorEffects=class RotorEffects{
 constructor(B,scene,effects,height){
  this.B=B;this.scene=scene;this.effects=effects;this.height=height;this.states=new Map();
  const texture=new B.DynamicTexture('rotorExposure',256,scene,false),c=texture.getContext();c.clearRect(0,0,256,256);
  for(let i=0;i<4;i++)for(let j=0;j<18;j++){const a=i*Math.PI/2+j*.04;c.beginPath();c.moveTo(128,128);c.arc(128,128,124,a,a+.045);c.closePath();c.fillStyle=`rgba(45,43,36,${.03+j*.002})`;c.fill()}
  c.globalCompositeOperation='destination-in';const gradient=c.createRadialGradient(128,128,18,128,128,125);gradient.addColorStop(0,'transparent');gradient.addColorStop(.25,'white');gradient.addColorStop(.9,'white');gradient.addColorStop(1,'transparent');c.fillStyle=gradient;c.fillRect(0,0,256,256);texture.update();texture.hasAlpha=true;
  const mat=new B.StandardMaterial('rotorExposureMaterial',scene);mat.diffuseTexture=texture;mat.useAlphaFromDiffuseTexture=true;mat.disableLighting=true;mat.emissiveColor=new B.Color3(.5,.48,.42);mat.backFaceCulling=false;mat.disableDepthWrite=true;this.material=mat;
 }
 attach(root){
  const B=this.B,pivot=root.metadata?.rotors?.[0];if(!pivot)return;
  pivot.computeWorldMatrix(true);const bounds=pivot.getHierarchyBoundingVectors(true),center=pivot.getAbsolutePosition(),radius=Math.max(bounds.max.x-center.x,center.x-bounds.min.x,bounds.max.z-center.z,center.z-bounds.min.z);
  const scale=B.Vector3.TransformNormal(B.Axis.X,pivot.getWorldMatrix()).length();
  if(!Number.isFinite(radius)||radius<1)return;
  const blades=pivot.getChildMeshes().filter(m=>m.name==='blade'||m.getBoundingInfo().boundingBox.extendSizeWorld.y<1.1);
  const disc=B.MeshBuilder.CreateDisc('rotorExposureDisc',{radius:radius/scale,tessellation:48},this.scene);disc.parent=pivot;disc.rotation.x=Math.PI/2;disc.material=this.material;disc.isPickable=false;disc.metadata={visualOnly:true};disc.setEnabled(false);
  this.states.set(root,{disc,blades,clock:0,angle:0});root.onDisposeObservable.add(()=>this.states.delete(root));
 }
 rotor(root,rate){const state=this.states.get(root);if(!state)return;const exposure=Math.max(0,Math.min(1,(Math.abs(rate)-12)/24));state.disc.setEnabled(exposure>0);state.disc.visibility=exposure;for(const mesh of state.blades)if(!mesh.isDisposed())mesh.visibility=1-exposure*.42}
 update(game,dt){
  const B=this.B,near=[game.player,...game.enemies.filter(e=>!e.dead).map(e=>e.obj)].filter(root=>this.states.has(root)&&B.Vector3.DistanceSquared(root.position,game.player.position)<350*350).sort((a,b)=>B.Vector3.DistanceSquared(a.position,game.player.position)-B.Vector3.DistanceSquared(b.position,game.player.position)).slice(0,3);
  for(const root of near){const state=this.states.get(root);state.clock-=dt;if(state.clock>0)continue;state.clock=root===game.player?.13:.26;
   const floor=this.height(root.position.x,root.position.z),altitude=root.position.y-floor;if(altitude>75||altitude<2||root.metadata?.playerSystems?.landed)continue;
   const rpm=root===game.player?game.playerSystems.rotor:100;if(rpm<=0)continue;
   if(this.effects.items.filter(i=>i.kind==='dust').length>=16)continue;
   const strength=Math.max(0,1-altitude/75);state.angle+=2.399;const a=state.angle,r=8+altitude*.18,x=root.position.x+Math.sin(a)*r,z=root.position.z+Math.cos(a)*r;
   this.effects.emit('dust',new B.Vector3(x,this.height(x,z)+.7,z),4+strength*7,{duration:1.3,velocity:new B.Vector3(Math.sin(a)*12*strength,.3,Math.cos(a)*12*strength),grow:1.5,alpha:.12+strength*.2,color:new B.Color4(.72,.55,.34,1)});
  }
 }
};
