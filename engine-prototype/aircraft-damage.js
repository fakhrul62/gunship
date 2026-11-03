// Enemy aircraft failures. Component volumes follow the model's mast and tail anchors.
// Flight/crash motion is a bounded game simulation, not a rigid-body flight solver.
window.AircraftDamage=class AircraftDamage{
 constructor(B,effects,height,onImpact){this.B=B;this.effects=effects;this.height=height;this.onImpact=onImpact}
 attach(enemy){
  if(!enemy.air)return;
  const B=this.B,root=enemy.obj;
  root.computeWorldMatrix(true);
  const inverse=root.getWorldMatrix().clone().invert();
  const anchor=(name,fallback)=>{
   const node=root.getChildTransformNodes().find(n=>n.name.includes(name));
   if(!node)return fallback;
   node.computeWorldMatrix(true);
   return B.Vector3.TransformCoordinates(node.getAbsolutePosition(),inverse);
  };
  const scale=root.scaling.x;
  const mast=anchor('Chopper.Rotor_Blur',new B.Vector3(0,4/scale,0));
  const tail=anchor('Chopper.Tail',new B.Vector3(0,0,-10/scale));
  enemy.flightDamage={engine:{hp:100,max:100},rotor:{hp:65,max:65},tail:{hp:55,max:55},mast,tailAnchor:tail,smoke:0};
  root.metadata={...root.metadata,flightDamage:enemy.flightDamage};
  enemy.airVelocity=B.Vector3.Zero();
  enemy.crash=null;
 }
 classify(enemy,mesh,position){
  const B=this.B,root=enemy.obj,d=enemy.flightDamage;
  if(!d)return 'hull';
  let node=mesh;
  while(node&&node!==root){if(node.name==='mainRotor'||node.name.includes('Chopper.Rotor_Blur'))return 'rotor';node=node.parent}
  root.computeWorldMatrix(true);
  const p=B.Vector3.TransformCoordinates(position,root.getWorldMatrix().clone().invert()),scale=root.scaling.x;
  // The supplied helicopter has a skinned body, so tail and engine hits use anchor-relative volumes.
  if(B.Vector3.Distance(p,d.tailAnchor)*scale<6)return 'tail';
  const delta=p.subtract(d.mast).scale(scale);
  if(Math.hypot(delta.x,delta.z)<4.5&&delta.y<-.25&&delta.y>-5.5)return 'engine';
  return 'hull';
 }
 hit(enemy,amount,position,mesh=null,blast=false){
  const d=enemy.flightDamage;
  if(!d)return {hullDamage:amount,component:'hull',changes:[]};
  const component=this.classify(enemy,mesh,position),changes=[];
  const damage=(name,value)=>{const c=d[name];if(c.hp<=0)return;c.hp=Math.max(0,c.hp-value);if(c.hp===0)changes.push(name)};
  if(component!=='hull')damage(component,amount*(blast?1:1.25));
  if(blast){damage('rotor',amount*.18);damage('engine',amount*.25);damage('tail',amount*.15)}
  enemy.lastHitComponent=component;
  enemy.obj.metadata.lastHitComponent=component;
  return {hullDamage:amount*(blast?1:component==='hull'?1:.55),component,changes};
 }
 speed(enemy){const d=enemy.flightDamage;return d?Math.min(.45+.55*d.engine.hp/d.engine.max,.5+.5*d.rotor.hp/d.rotor.max):1}
 rotorRate(enemy){
  if(enemy.crash?.landed)return 0;
  const d=enemy.flightDamage;if(!d)return 36;
  const normal=36*(.55+.45*d.engine.hp/d.engine.max)*(d.rotor.hp>0?1:.12);
  return enemy.crash?normal*Math.exp(-enemy.crash.age*.15):normal;
 }
 beginCrash(enemy,reason='hull'){
  if(enemy.crash)return false;
  const B=this.B;
  const velocity=enemy.airVelocity?.clone()||B.Vector3.Zero();
  if(velocity.length()>70)velocity.normalize().scaleInPlace(70);
  enemy.crash={reason,velocity,age:0,landed:false};
  enemy.dead=true;enemy.wreck=true;enemy.weaponDisabled=true;
  enemy.obj.metadata={...enemy.obj.metadata,crash:enemy.crash};
  for(const m of enemy.obj.getChildMeshes())m.metadata={...m.metadata,combatTarget:null};
  return true;
 }
 update(enemy,dt){
  const d=enemy.flightDamage;if(!d)return false;
  const B=this.B,root=enemy.obj,c=enemy.crash;
  d.smoke-=dt;
  if(!c?.landed&&(d.engine.hp<50||c)&&d.smoke<=0){
   root.computeWorldMatrix(true);
   this.effects.emit('smoke',B.Vector3.TransformCoordinates(d.mast,root.getWorldMatrix()),7,{duration:4,drift:2,grow:1.2,alpha:.65});d.smoke=.35;
  }
  if(!c)return false;
  if(c.landed)return true;
  const steps=Math.max(1,Math.ceil(dt/.016)),step=dt/steps;
  for(let i=0;i<steps;i++){
   c.age+=step;
   // An intact rotor retains partial lift while an engine-out aircraft descends.
   const gravity=c.reason==='engine'&&d.rotor.hp>0?4.8:9.81;
   c.velocity.y=Math.max(-65,c.velocity.y-gravity*step);
   c.velocity.x*=Math.exp(-.12*step);c.velocity.z*=Math.exp(-.12*step);
   root.position.addInPlace(c.velocity.scale(step));
   root.rotation.y+=step*(c.reason==='tail'?1.8:.35);
   root.rotation.z=B.Scalar.Lerp(root.rotation.z,c.reason==='engine'?.25:.85,Math.min(1,step*.7));
   root.rotation.x=B.Scalar.Lerp(root.rotation.x,.3,Math.min(1,step*.5));
   root.computeWorldMatrix(true);
   const bounds=root.getHierarchyBoundingVectors(true);
   const support=Math.max(this.height(root.position.x,root.position.z),this.height(bounds.min.x,bounds.min.z),this.height(bounds.max.x,bounds.max.z));
   if(bounds.min.y<=support+.15){
    root.position.y+=support+.15-bounds.min.y;
    c.landed=true;c.velocity.setAll(0);
    root.metadata.destroyed=true;
    this.burn(root);
    this.onImpact(root,new B.Vector3(root.position.x,support+.5,root.position.z));
    break;
   }
  }
  return true;
 }
 burn(root){
  const B=this.B,finishes=new Map(),materials=[];
  for(const mesh of root.getChildMeshes()){
   const original=mesh.material;if(!original)continue;
   if(!finishes.has(original)){
    const mat=original.clone('crashed-'+original.name);
    if(mat.albedoColor)mat.albedoColor=new B.Color3(.10,.085,.07);
    if('roughness'in mat)mat.roughness=.98;
    if('metallic'in mat)mat.metallic=.1;
    mat.emissiveColor=B.Color3.Black();finishes.set(original,mat);materials.push(mat);
   }
   mesh.material=finishes.get(original);
  }
  root.onDisposeObservable.add(()=>{for(const mat of materials)mat.dispose(false,false)});
 }
};
