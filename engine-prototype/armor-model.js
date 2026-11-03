window.ArmorModel=class ArmorModel{
 constructor(B){this.B=B}
 resolve(enemy,mesh,normal,velocity,penetration=95){
  const B=this.B,dir=velocity.normalizeToNew(),n=normal.normalizeToNew();
  if(B.Vector3.Dot(dir,n)>0)n.scaleInPlace(-1);
  if(enemy.obj.metadata?.combat?.key!=='apc')return{kind:'penetration',damage:1,remaining:penetration*.55,normal:n};
  let names='',node=mesh;while(node&&node!==enemy.obj){names+=' '+node.name.toLowerCase();node=node.parent}
  let plate=38;enemy.obj.computeWorldMatrix(true);
  const incoming=B.Vector3.TransformNormal(dir,enemy.obj.getWorldMatrix().clone().invert()).normalize();
  if(Math.abs(incoming.z)>Math.abs(incoming.x))plate=incoming.z<0?75:22;
  if(/turret_low/.test(names))plate+=20;
  if(/roadwheel|sprocket|track_|link_low|sus_low/.test(names))plate=14;
  if(/cannon_low|mantle_|gsh_/.test(names))plate=20;
  const cosine=Math.max(.08,-B.Vector3.Dot(dir,n)),effective=plate/cosine;
  if(cosine<.3&&penetration<effective)return{kind:'ricochet',damage:0,remaining:penetration*.35,normal:n,plate,effective};
  if(penetration<effective)return{kind:'stopped',damage:.05,remaining:0,normal:n,plate,effective};
  return{kind:'penetration',damage:1,remaining:Math.max(0,penetration-effective),normal:n,plate,effective};
 }
};
