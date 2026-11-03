// Swept body proxies against authored/static cover boxes; bounded sliding, no rigid-body solver.
window.FlightCollision=class FlightCollision{
 constructor(B,height,cover){this.B=B;this.height=height;this.cover=cover}
 intersect(a,b,radius,box){
  const B=this.B,d=b.subtract(a);let lo=0,hi=1,n=null;
  for(const axis of ['x','y','z']){
   const min=box.min[axis]-radius[axis],max=box.max[axis]+radius[axis];
   if(Math.abs(d[axis])<1e-9){if(a[axis]<min||a[axis]>max)return null;continue}
   const t1=(min-a[axis])/d[axis],t2=(max-a[axis])/d[axis],near=Math.min(t1,t2);
   if(near>=lo){lo=near;n=B.Vector3.Zero();n[axis]=d[axis]>0?-1:1}hi=Math.min(hi,Math.max(t1,t2));if(hi<lo)return null;
  }
  if(lo>1||hi<0)return null;
  if(!n){
   // Recover an initially overlapping proxy by the nearest face.
   let best=Infinity;
   for(const axis of ['x','y','z'])for(const sign of [-1,1]){const edge=sign<0?box.min[axis]-radius[axis]:box.max[axis]+radius[axis],dist=Math.abs(edge-a[axis]);if(dist<best){best=dist;n=B.Vector3.Zero();n[axis]=sign}}
   return{t:0,normal:n,box,overlap:best};
  }
  return{t:lo,normal:n,box};
 }
 move(a,b,radius,extra=[]){
  const B=this.B,boxes=[...this.cover(),...extra];let p=a.clone(),remaining=b.subtract(a),contact=null;
  for(let step=0;step<3&&remaining.lengthSquared()>1e-8;step++){
   let first=null;for(const box of boxes){const hit=this.intersect(p,p.add(remaining),radius,box);if(hit&&(!first||hit.t<first.t))first=hit}
   if(!first){p.addInPlace(remaining);break}
   const closing=Math.max(0,-B.Vector3.Dot(remaining,first.normal));
   if(!contact||closing>contact.closing)contact={...first,closing};
   p.addInPlace(remaining.scale(Math.max(0,first.t-.001)));p.addInPlace(first.normal.scale((first.overlap||0)+.03));
   remaining.scaleInPlace(1-first.t);const inward=B.Vector3.Dot(remaining,first.normal);if(inward<0)remaining.subtractInPlace(first.normal.scale(inward));
  }
  return{position:p,contact};
 }
 support(x,z){let y=this.height(x,z);for(const box of this.cover())if(x>=box.min.x&&x<=box.max.x&&z>=box.min.z&&z<=box.max.z)y=Math.max(y,box.max.y);return y}
 vehicleBoxes(enemies){const B=this.B;return enemies.filter(e=>!e.obj.isDisposed()).map(e=>{const center=e.obj.position.add(new B.Vector3(0,e.air?0:5,0)),half=e.air?new B.Vector3(12,4,12):new B.Vector3(10,5,12);return{min:center.subtract(half),max:center.add(half),vehicle:e}})}
};
