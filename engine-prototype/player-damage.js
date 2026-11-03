window.PlayerDamage=class PlayerDamage{
 constructor(B,effects,height){this.B=B;this.effects=effects;this.height=height}
 attach(game){
  const systems={engine:100,rotor:100,controls:100,emergency:null,descent:0,smoke:0,landed:false};
  game.playerSystems=systems;game.player.metadata={...game.player.metadata,playerSystems:systems};
  return systems;
 }
 classify(game,mesh,position){
  const B=this.B,root=game.player;
  let node=mesh;while(node&&node!==root){if(node.name==='mainRotor')return 'rotor';node=node.parent}
  root.computeWorldMatrix(true);
  const local=B.Vector3.TransformCoordinates(position,root.getWorldMatrix().clone().invert()).scale(root.scaling.x);
  if(local.z<-8)return 'controls';
  if(Math.abs(local.x)<4.5&&local.z>-6&&local.z<2&&local.y>-.5)return 'engine';
  return 'hull';
 }
 hit(game,amount,position,mesh=null,blast=false){
  const s=game.playerSystems;if(!s||s.landed)return 'hull';
  const part=this.classify(game,mesh,position);
  game.hp=Math.max(0,game.hp-amount);
  if(part!=='hull')s[part]=Math.max(0,s[part]-amount*(blast?1.5:3));
  if(blast){s.engine=Math.max(0,s.engine-amount*.5);s.rotor=Math.max(0,s.rotor-amount*.35);s.controls=Math.max(0,s.controls-amount*.3)}
  if(game.hp<=0||s.rotor<=0)s.emergency='critical';
  else if(s.engine<=0&&!s.emergency)s.emergency='engine';
  return part;
 }
 power(game){const s=game.playerSystems;return s.emergency==='critical'?.08:s.emergency==='engine'?.25:Math.min(.45+.55*s.engine/100,.5+.5*s.rotor/100)}
 control(game){return .25+.75*game.playerSystems.controls/100}
 rotorRate(game){const s=game.playerSystems;return s.landed?0:s.rotor<=0?4:s.emergency==='engine'?23:36*(.65+.35*s.engine/100)}
 update(game,dt,flare=false){
  const B=this.B,s=game.playerSystems,root=game.player;
  if(s.landed)return null;
  s.smoke-=dt;
  if(s.engine<50&&s.smoke<=0){this.effects.emit('smoke',root.position.add(new B.Vector3(0,3,-2)),5,{duration:3,drift:2,grow:1,alpha:.5});s.smoke=.5}
  if(!s.emergency)return null;
  const critical=s.emergency==='critical';
  s.descent=critical?Math.min(65,s.descent+9.81*dt):B.Scalar.Lerp(s.descent,flare?6:18,Math.min(1,dt*1.8));
  root.position.y-=s.descent*dt;
  if(critical){game.yaw+=dt*.6;game.pitch=B.Scalar.Lerp(game.pitch,-.35,dt);}
  root.computeWorldMatrix(true);
  const bounds=root.getHierarchyBoundingVectors(true),floor=this.height(root.position.x,root.position.z);
  if(bounds.min.y>floor+.15)return null;
  root.position.y+=floor+.15-bounds.min.y;
  s.landed=true;
  const safe=!critical&&s.descent<=8&&Math.hypot(game.speed,game.side)<18;
  if(!safe)game.hp=0;
  game.speed=game.side=0;
  return safe?'landed':'crashed';
 }
 status(game){
  const s=game.playerSystems;
  if(s.emergency==='critical')return 'CRITICAL FLIGHT FAILURE / IMPACT IMMINENT';
  if(s.emergency==='engine')return 'ENGINE OUT / HOLD Q TO FLARE / RELEASE W TO SLOW';
  if(s.controls<35)return 'TAIL CONTROL DAMAGE / REDUCED STEERING';
  if(s.engine<35)return 'ENGINE DAMAGE / BOOST UNAVAILABLE';
  if(Math.min(s.engine,s.rotor,s.controls)<100)return 'FLIGHT SYSTEM DAMAGE';
  return '';
 }
};
