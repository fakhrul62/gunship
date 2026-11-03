window.FlightAudio=class FlightAudio{
 constructor(B,camera){this.B=B;this.camera=camera;this.loops=new Map();this.shots=new Set();this.buffers={};this.paused=true;this.lastImpact=-10}
 async load(audio){
  try{this.audio=audio||new AudioContext();for(const key of ['rotor','engine','motor','debris']){const r=await fetch('../assets/audio/'+key+'.wav');if(!r.ok)throw Error(key);this.buffers[key]=await this.audio.decodeAudioData(await r.arrayBuffer())}}catch(error){console.warn('Flight audio unavailable',error)}
 }
 create(id,kind){
  if(!this.audio||!this.buffers[kind]||this.loops.size>=10)return null;
  const a=this.audio,source=a.createBufferSource(),filter=a.createBiquadFilter(),gain=a.createGain(),pan=a.createStereoPanner();source.buffer=this.buffers[kind];source.loop=true;gain.gain.value=0;filter.type='lowpass';source.connect(filter).connect(gain).connect(pan).connect(a.destination);source.start(Math.max(0,a.currentTime),Math.random()*source.buffer.duration);const loop={source,filter,gain,pan,kind,distance:0};this.loops.set(id,loop);return loop;
 }
 position(loop,position,volume,pitch,dt){
  const B=this.B,a=this.audio,offset=position.subtract(this.camera.position),distance=offset.length(),right=this.camera.getDirection(B.Axis.X),doppler=B.Scalar.Clamp((loop.distance-distance)/Math.max(dt,1/120)/343,-.08,.08);loop.distance=distance;
  loop.gain.gain.setTargetAtTime(volume/(1+Math.pow(distance/140,1.7)),a.currentTime,.08);loop.filter.frequency.setTargetAtTime(14000/(1+distance/180),a.currentTime,.1);loop.pan.pan.setTargetAtTime(B.Scalar.Clamp(B.Vector3.Dot(offset.normalize(),right),-1,1),a.currentTime,.08);loop.source.playbackRate.setTargetAtTime(B.Scalar.Clamp(pitch+doppler,.35,1.8),a.currentTime,.15);
 }
 update(game,dt){
  if(!this.audio||this.paused)return;const live=new Set(),s=game.playerSystems,player=game.player;
  const use=(id,kind,pos,volume,pitch)=>{live.add(id);const loop=this.loops.get(id)||this.create(id,kind);if(loop)this.position(loop,pos,volume,pitch,dt)};
  if(!s.landed){use(player,'rotor',player.position,s.rotor>0?.1:.01,s.emergency==='engine'?.75:.85+.15*s.engine/100);use('playerEngine','engine',player.position,s.engine>0?.06:0,.7+.25*Math.min(1,Math.abs(game.speed)/240)+.1*s.engine/100)}
  const nearby=game.enemies.filter(e=>e.air&&!e.dead&&this.B.Vector3.DistanceSquared(player.position,e.obj.position)<900*900).sort((a,b)=>this.B.Vector3.DistanceSquared(a.obj.position,player.position)-this.B.Vector3.DistanceSquared(b.obj.position,player.position)).slice(0,3);
  for(const e of nearby)use(e.obj,'rotor',e.obj.position,.15,.84+.14*e.flightDamage.engine.hp/100);
  for(const b of game.bullets.filter(b=>b.rocket&&b.mesh.isEnabled()&&b.phase==='powered').slice(0,2))use(b.mesh,'motor',b.mesh.position,.1,1.0);
  for(const [id,loop]of this.loops)if(!live.has(id)){loop.source.stop();for(const node of [loop.source,loop.filter,loop.gain,loop.pan])node.disconnect();this.loops.delete(id)}
 }
 impact(position,strength=1){
  const a=this.audio;if(!a||this.paused||!this.buffers.debris||this.shots.size>=6||a.currentTime-this.lastImpact<.045)return;this.lastImpact=a.currentTime;
  const B=this.B,source=a.createBufferSource(),gain=a.createGain(),pan=a.createStereoPanner(),offset=position.subtract(this.camera.position);source.buffer=this.buffers.debris;source.playbackRate.value=.65+Math.random()*.5;gain.gain.value=Math.min(.28,strength*.03)/(1+offset.length()/100);pan.pan.value=B.Scalar.Clamp(B.Vector3.Dot(offset.normalize(),this.camera.getDirection(B.Axis.X)),-1,1);source.connect(gain).connect(pan).connect(a.destination);this.shots.add(source);source.onended=()=>{this.shots.delete(source);source.disconnect();gain.disconnect();pan.disconnect()};source.start();
 }
 pause(value){this.paused=value;if(this.audio){const operation=value?this.audio.suspend():this.audio.resume();operation?.catch(()=>{})}}
 clear(){for(const loop of this.loops.values()){try{loop.source.stop()}catch{}for(const n of [loop.source,loop.filter,loop.gain,loop.pan])n.disconnect()}this.loops.clear();for(const source of this.shots)try{source.stop()}catch{}this.shots.clear()}
};
