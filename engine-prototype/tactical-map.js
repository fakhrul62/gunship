'use strict';
// Lightweight 2D overlay: updated with the HUD, without another 3D camera.
window.TacticalMap=class TacticalMap {
 constructor(parent){
  this.ranges=[600,1200,2400,4200];this.rangeIndex=1;
  this.element=document.createElement('section');this.element.id='tactical-map';this.element.setAttribute('aria-label','Tactical minimap');
  this.element.innerHTML='<header><b>TACTICAL MAP</b><span class="map-range"></span></header><canvas width="440" height="440" aria-label="Your position, mission objective, and enemy positions"></canvas><div class="map-legend"><span class="map-you">▲ YOU</span><span class="map-objective">◆ TASK</span><span class="map-enemy">▲ AIR · ■ ARMOR</span></div><footer><span class="map-contact-count">NO CONTACTS</span><div><button type="button" aria-label="Zoom minimap in">+</button><button type="button" aria-label="Zoom minimap out">−</button></div></footer>';
  parent.appendChild(this.element);this.ctx=this.element.querySelector('canvas').getContext('2d');this.element.hidden=true;
  const buttons=this.element.querySelectorAll('button');buttons[0].onclick=()=>this.zoom(-1);buttons[1].onclick=()=>this.zoom(1);document.addEventListener('keydown',e=>{if(this.element.hidden||e.repeat)return;if(e.key==='+'||e.key==='=')this.zoom(-1);if(e.key==='-')this.zoom(1)});
 }
 setVisible(visible){this.element.hidden=!visible}
 zoom(delta){this.rangeIndex=Math.max(0,Math.min(this.ranges.length-1,this.rangeIndex+delta));if(this.last)this.update(this.last)}
 update(game){
  if(!game)return;this.last=game;
  const c=this.ctx,size=220,center=110,radius=94,range=this.ranges[this.rangeIndex],player=game.player.position,yaw=game.yaw,contacts=game.enemies.filter(e=>!e.dead),cos=Math.cos(yaw),sin=Math.sin(yaw);
  c.setTransform(2,0,0,2,0,0);c.clearRect(0,0,size,size);c.fillStyle='#0c1915';c.fillRect(0,0,size,size);
  const project=(position,limit=radius-8)=>{const dx=position.x-player.x,dz=position.z-player.z;let x=(dx*cos-dz*sin)/range*radius,y=-(dx*sin+dz*cos)/range*radius;const length=Math.hypot(x,y),outside=length>limit;if(outside){x*=limit/length;y*=limit/length}return{x:center+x,y:center+y,angle:Math.atan2(y,x),outside}};
  c.save();c.beginPath();c.arc(center,center,radius,0,Math.PI*2);c.clip();
  c.strokeStyle='#284137';c.lineWidth=.6;
  // World grid rotates and scrolls with the helicopter; it is separate from map markers.
  c.save();c.translate(center,center);c.rotate(-yaw);const spacing=range/3,step=radius/3;
  for(let i=-7;i<=7;i++){let x=i*step-((player.x%spacing)/range*radius),y=i*step+((player.z%spacing)/range*radius);c.beginPath();c.moveTo(x,-size*2);c.lineTo(x,size*2);c.stroke();c.beginPath();c.moveTo(-size*2,y);c.lineTo(size*2,y);c.stroke()}c.restore();
  const base=project({x:0,z:-1600});c.fillStyle='#83978b';c.fillRect(base.x-3,base.y-3,6,6);
  for(const enemy of contacts){const p=project(enemy.obj.position);c.save();c.translate(p.x,p.y);c.fillStyle='#ff7f66';c.strokeStyle='#ff7f66';c.lineWidth=1.5;
   if(p.outside){c.rotate(p.angle);c.beginPath();c.moveTo(5,0);c.lineTo(-3,-4);c.lineTo(-3,4);c.closePath();c.stroke()}
   else if(enemy.air){const heading=enemy.obj.rotation.y-yaw;c.rotate(heading);c.beginPath();c.moveTo(0,-5);c.lineTo(-4,4);c.lineTo(4,4);c.closePath();c.fill()}
   else c.fillRect(-3.5,-3.5,7,7);c.restore();
  }
  let waypoint=game.waypoint,label=game.phase==='ingress'?'ALPHA':game.phase==='transit'?'BRAVO':'EXTRACT';
  if(!waypoint && ['assault','bravo'].includes(game.phase)){waypoint=game.phase==='assault'?{x:0,z:1200}:{x:1400,z:1400};label=game.phase==='assault'?'ALPHA':'BRAVO'}
  if(waypoint){const p=project(waypoint,radius-14);c.save();c.translate(p.x,p.y);c.strokeStyle='#ffe0a0';c.fillStyle='#e8c479';c.lineWidth=2;
   c.beginPath();c.moveTo(0,-7);c.lineTo(6,0);c.lineTo(0,7);c.lineTo(-6,0);c.closePath();c.stroke();if(p.outside){c.save();c.rotate(p.angle);c.beginPath();c.moveTo(10,0);c.lineTo(6,-3);c.lineTo(6,3);c.closePath();c.fill();c.restore()}
   c.font='bold 9px monospace';c.textAlign='center';c.fillStyle='#ffe8b8';c.fillText(label,0,p.y<center?19:-11);c.restore();
  }
  c.restore();c.strokeStyle='#547060';c.lineWidth=1;c.beginPath();c.arc(center,center,radius,0,Math.PI*2);c.stroke();c.strokeStyle='#345144';c.beginPath();c.arc(center,center,radius/2,0,Math.PI*2);c.stroke();
  c.fillStyle='#b5c8b4';c.font='bold 10px monospace';c.textAlign='center';c.fillText('N',center-Math.sin(yaw)*(radius+9),center-Math.cos(yaw)*(radius+9)+3);
  c.fillStyle='#99f6d3';c.strokeStyle='#061c12';c.lineWidth=2;c.beginPath();c.moveTo(center,center-9);c.lineTo(center-6,center+6);c.lineTo(center,center+3);c.lineTo(center+6,center+6);c.closePath();c.fill();c.stroke();
  this.element.querySelector('.map-range').textContent=(range/1000).toFixed(1)+' KM';this.element.querySelector('.map-contact-count').textContent=contacts.length+' HOSTILE'+(contacts.length===1?'':'S');
  this.element.querySelector('canvas').setAttribute('aria-label',`Heading up tactical map. ${contacts.length} enemies. ${waypoint?label+' is '+Math.round(Math.hypot(waypoint.x-player.x,waypoint.z-player.z))+' meters away.':'Engage hostile aircraft.'}`);
 }
};
