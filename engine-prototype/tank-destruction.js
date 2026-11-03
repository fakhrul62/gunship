/* Bounded component debris; poses are preserved when leaving the source hierarchy. */
window.TankDestruction=class TankDestruction{
 constructor(B,scene,height){this.B=B;this.scene=scene;this.height=height;this.parts=[];this.wrecks=[];this.materials=[]}
 destroy(root,impact){
  if(root.metadata?.destroyed)return false;const B=this.B;root.metadata={...root.metadata,destroyed:true};
  const combat=root.metadata.combat;for(const group of [...(combat?.clips||[]),combat?.drive,combat?.ready].filter(Boolean))group.stop();
  root.computeWorldMatrix(true);for(const mesh of root.getChildMeshes())mesh.computeWorldMatrix(true);
  // Clone each shared material once per wreck, preserving authored normal/roughness maps.
  const finishes=new Map();for(const mesh of root.getChildMeshes()){mesh.metadata={...mesh.metadata,combatTarget:null};const original=mesh.material;if(!original)continue;if(!finishes.has(original)){const mat=original.clone('burned-'+original.name);if(mat.albedoColor)mat.albedoColor=new B.Color3(.10,.075,.055);if('metallic' in mat)mat.metallic=.12;if('roughness' in mat)mat.roughness=.98;mat.emissiveColor=B.Color3.Black();finishes.set(original,mat);this.materials.push(mat)}mesh.material=finishes.get(original)}
  const nodes=root.getChildTransformNodes();const turret=nodes.find(n=>n.name.startsWith('Turret_low_23'));
  const names=['Mantle_27','Hatch.001_24','Hatch.002_25','Roadwheel_low_28','Roadwheel_low.001_33'];
  const roofPanels=window.WreckInterior.open(B,this.scene,root,turret);
  const selected=[turret,...roofPanels,...names.map(name=>nodes.find(n=>n.name.startsWith(name)))].filter(Boolean);
  let id=0;for(const node of selected){if(this.parts.length>=48)break;if(selected.some(other=>other!==node&&node.isDescendantOf(other)))continue;
   node.computeWorldMatrix(true);const box=node.getHierarchyBoundingVectors(true),center=box.min.add(box.max).scale(.5);if(!Number.isFinite(center.x))continue;
   const pivot=new B.TransformNode('tankFragment-'+id,this.scene);pivot.position.copyFrom(center);node.setParent(pivot,true);pivot.computeWorldMatrix(true);
   const heavy=node===turret,dir=center.subtract(impact);dir.y=0;if(dir.lengthSquared()<.01)dir.set(id%2?1:-1,0,.5);dir.normalize();
   const velocity=dir.scale(heavy?7:11+id*1.3);velocity.y=heavy?11:15+id;
   const part={pivot,node,velocity,spin:new B.Vector3(heavy?.25:1.6,.5+id*.2,.4),age:0,sleep:false,bounces:0,heavy};this.parts.push(part);id++;
  }
  this.wrecks.push({root,age:0});return true;
 }
 breakRotor(root){const B=this.B,rotor=root.metadata?.rotors?.[0];if(!rotor)return;const blades=rotor.getChildMeshes().filter(m=>m.name==='blade'&&!m.metadata?.visualOnly);for(const node of blades.filter((_,i)=>i%2===0)){if(this.parts.length>=48)break;node.computeWorldMatrix(true);const bounds=node.getBoundingInfo().boundingBox,center=bounds.centerWorld.clone(),pivot=new B.TransformNode('rotorFragment',this.scene);pivot.position.copyFrom(center);node.setParent(pivot,true);this.parts.push({pivot,node,velocity:new B.Vector3(4,6,-3),spin:new B.Vector3(1,2,.5),age:0,sleep:false,bounces:0,heavy:false})}}
 update(dt){const B=this.B;for(const part of this.parts){if(part.sleep||part.pivot.isDisposed())continue;const steps=Math.max(1,Math.ceil(dt/.016)),step=dt/steps;for(let k=0;k<steps;k++){
   part.age+=step;part.velocity.y-=9.81*step;part.velocity.scaleInPlace(Math.exp(-.08*step));part.pivot.position.addInPlace(part.velocity.scale(step));part.pivot.rotation.addInPlace(part.spin.scale(step));part.pivot.computeWorldMatrix(true);
   const bounds=part.pivot.getHierarchyBoundingVectors(true);const support=Math.max(this.height(bounds.min.x,bounds.min.z),this.height(bounds.max.x,bounds.max.z),this.height(part.pivot.position.x,part.pivot.position.z));
   if(bounds.min.y<support+.08){part.pivot.position.y+=support+.08-bounds.min.y;if(part.velocity.y<0){part.velocity.y=-part.velocity.y*(part.heavy?.12:.22);part.velocity.x*=.6;part.velocity.z*=.6;part.spin.scaleInPlace(.45);part.bounces++}if(part.velocity.length()<1.2||part.bounces>=5){part.sleep=true;part.velocity.setAll(0);part.spin.setAll(0)}}
   if(part.age>15){part.sleep=true;part.velocity.setAll(0)}
  }}for(const wreck of this.wrecks)wreck.age+=dt;
 }
 clear(){for(const p of this.parts)if(!p.pivot.isDisposed())p.pivot.dispose(false,false);this.parts.length=0;this.wrecks.length=0;for(const m of this.materials)m.dispose(false,false);this.materials.length=0}
};
