window.WreckInterior={
 open(B,scene,root,turret){
  if(!turret)return[];
  turret.computeWorldMatrix(true);const bounds=turret.getHierarchyBoundingVectors(true),center=bounds.min.add(bounds.max).scale(.5),radius=B.Scalar.Clamp(Math.min(bounds.max.x-bounds.min.x,bounds.max.z-bounds.min.z)*.32,1.4,3.1),panels=[];
  let roofY=-Infinity,removed=0;
  for(const mesh of [...root.getChildMeshes()]){
   let n=mesh,body=false;while(n&&n!==root){if(/hull_low/i.test(n.name))body=true;n=n.parent}
   if(!body||!mesh.getIndices||mesh.metadata?.visualOnly)continue;
   mesh.computeWorldMatrix(true);const matrix=mesh.getWorldMatrix(),p=mesh.getVerticesData('position'),normal=mesh.getVerticesData('normal'),indices=mesh.getIndices();if(!p||!normal||!indices)continue;
   const keep=[],torn=[];
   for(let k=0;k<indices.length;k+=3){
    const ids=[indices[k],indices[k+1],indices[k+2]],centroid=B.Vector3.Zero(),face=B.Vector3.Zero();
    for(const i of ids){centroid.addInPlace(B.Vector3.TransformCoordinates(new B.Vector3(p[i*3],p[i*3+1],p[i*3+2]),matrix));face.addInPlace(B.Vector3.TransformNormal(new B.Vector3(normal[i*3],normal[i*3+1],normal[i*3+2]),matrix).normalize())}
    centroid.scaleInPlace(1/3);face.normalize();
    const cut=face.y>.45&&Math.hypot(centroid.x-center.x,centroid.z-center.z)<radius&&centroid.y>bounds.min.y-2.5;
    (cut?torn:keep).push(...ids);if(cut)roofY=Math.max(roofY,centroid.y);
   }
   if(!torn.length)continue;
   mesh.makeGeometryUnique();const panel=mesh.clone('tornHullRoof',mesh.parent,true);panel.makeGeometryUnique();panel.setIndices(torn);panel.isPickable=false;panel.metadata={visualOnly:true};
   mesh.setIndices(keep);mesh.material.backFaceCulling=false;panels.push(panel);removed+=torn.length/3;
  }
  root.metadata={...root.metadata,fractureTriangles:removed};if(!removed)return panels;
  const inner=new B.TransformNode('wreckInterior',scene);inner.position.set(center.x,roofY,center.z);
  const mat=new B.PBRMaterial('charredInterior',scene);mat.albedoColor=new B.Color3(.07,.055,.04);mat.metallic=.15;mat.roughness=.98;mat.backFaceCulling=false;
  const tub=B.MeshBuilder.CreateCylinder('exposedTurretWell',{height:1.5,diameter:radius*1.8,tessellation:14,cap:B.Mesh.NO_CAP,sideOrientation:B.Mesh.DOUBLESIDE},scene);tub.parent=inner;tub.position.y=-.75;
  const floor=B.MeshBuilder.CreateDisc('charredInteriorFloor',{radius:radius*.9,tessellation:14},scene);floor.parent=inner;floor.rotation.x=Math.PI/2;floor.position.y=-1.48;
  for(let i=0;i<3;i++){const rib=B.MeshBuilder.CreateBox('interiorFrame',{width:radius*1.5,height:.18,depth:.22},scene);rib.parent=inner;rib.position.set(0,-1.1,(i-1)*radius*.5);rib.rotation.y=.12*(i-1)}
  for(const mesh of inner.getChildMeshes()){mesh.material=mat;mesh.metadata={visualOnly:true};mesh.isPickable=false}
  inner.setParent(root);root.onDisposeObservable.add(()=>mat.dispose(false,false));
  return panels;
 }
};
