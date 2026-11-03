window.MissileFlight=class MissileFlight{
 constructor(B,effects,clearSight){this.B=B;this.effects=effects;this.clearSight=clearSight}
 attach(root){const B=this.B;root.computeWorldMatrix(true);const inverse=root.getWorldMatrix().clone().invert(),center=root.metadata.cannon?.anchor.position.x??-.63,candidates=[];
  for(const mesh of root.getChildMeshes()){if(!mesh.material?.albedoColor)continue;const color=mesh.material.albedoColor;mesh.computeWorldMatrix(true);const box=mesh.getBoundingInfo().boundingBox,p=B.Vector3.TransformCoordinates(box.centerWorld,inverse),d=box.maximumWorld.subtract(box.minimumWorld).scale(1/root.scaling.x);if(Math.abs(p.x-center)>1.4&&p.y<0&&d.z>1&&d.z>d.x*2&&color.g>color.r*1.1)candidates.push({p,d,mesh})}
  const anchors=[];for(const sign of [-1,1]){const found=candidates.filter(c=>Math.sign(c.p.x-center)===sign).sort((a,b)=>b.d.z-a.d.z)[0];const p=found?found.p.clone():new B.Vector3(center+sign*3.2,-1.7,2);if(found)p.z+=found.d.z*.35;const anchor=new B.TransformNode('missileRack'+sign,root.getScene());anchor.parent=root;anchor.position.copyFrom(p);anchors.push(anchor)}root.metadata={...root.metadata,missileRacks:anchors,rackGeometryFound:anchors.length===2&&candidates.length>=2};return anchors
 }
 rack(root,side){root.computeWorldMatrix(true);const anchor=root.metadata.missileRacks[side<0?0:1];anchor.computeWorldMatrix(true);return anchor.getAbsolutePosition().clone()}
 initialize(b,inherited){const B=this.B;b.age=0;b.phase='separating';b.guidance=b.target?'armed':'unguided';b.lostTime=0;b.inherited=inherited.clone();b.heading=b.vel.subtract(inherited).normalize();b.vel=b.heading.scale(24).add(inherited).add(new B.Vector3(0,-3,0));b.trailDistance=0;b.ignited=false;this.describe(b)}
 describe(b){b.mesh.metadata={phase:b.phase,guidance:b.guidance,speed:b.vel.length(),age:b.age}}
 step(b,dt){const B=this.B;if(b.age<.16){b.phase='separating';b.vel.y-=9.81*dt;this.describe(b);return}
  if(!b.ignited){b.ignited=true;this.effects.emit('flash',b.mesh.position,2.5,{duration:.08})}
  b.phase=b.age<3.8?'powered':'coasting';
  if(b.target){if(b.target.dead){b.target=null;b.guidance='lost'}else{const point=b.target.obj.position.add(new B.Vector3(0,b.target.air?0:7,0));b.lostTime=this.clearSight(b.mesh.position,point)?0:b.lostTime+dt;if(b.lostTime>.2){b.target=null;b.guidance='lost'}else if(b.age>.32){const speed=Math.max(80,b.vel.length()),lead=b.target.air?.35:0,desired=point.add(new B.Vector3(Math.sin(b.target.obj.rotation.y)*45*lead,0,Math.cos(b.target.obj.rotation.y)*45*lead)).subtract(b.mesh.position).normalize(),angle=Math.acos(B.Scalar.Clamp(B.Vector3.Dot(b.heading,desired),-1,1)),factor=Math.min(1,dt*.9/Math.max(angle,.00001));b.heading=B.Vector3.Lerp(b.heading,desired,factor).normalize();b.guidance='tracking'}}}
  const speed=b.vel.subtract(b.inherited).length(),next=b.phase==='powered'?Math.min(410,speed+140*dt):speed*Math.exp(-.06*dt);b.inherited.scaleInPlace(Math.exp(-dt*.6));b.vel=b.heading.scale(next).add(b.inherited);if(b.phase==='coasting'){b.vel.y-=9.81*dt;b.heading=b.vel.subtract(b.inherited).normalize()}this.describe(b)
 }
 visuals(b,from){const B=this.B,powered=b.phase==='powered',flame=b.mesh.getChildMeshes().find(m=>m.name==='motorFlame');if(flame){flame.setEnabled(powered);if(powered)flame.scaling.y=.85+.15*Math.sin(b.age*140)}
  if(powered){const delta=b.mesh.position.subtract(from),length=delta.length(),direction=delta.normalize();b.trailDistance+=length;if(b.trailDistance>=3.5){const count=Math.min(6,Math.floor(b.trailDistance/3.5));for(let i=0;i<count;i++){const pos=B.Vector3.Lerp(from,b.mesh.position,(i+.5)/count).subtract(b.heading.scale(2));this.effects.emit('trail',pos,2.4,{duration:1.3,alpha:.38,drift:.25,grow:2.1,color:new B.Color4(.85,.84,.80,.38)})}b.trailDistance%=3.5}}
 }
};
