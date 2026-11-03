// Deterministic features are shared by the visible mesh and its collision sampler.
window.TerrainFeatures={
 craters:[{x:185,z:1090,r:42,d:6},{x:-240,z:1320,r:55,d:8},{x:1550,z:1270,r:46,d:7},{x:1230,z:1490,r:50,d:7},{x:-520,z:680,r:75,d:10}],
 offset(x,z){
  if(Math.abs(x)>3500||Math.abs(z)>3500)return 0;
  let value=0;
  for(const c of this.craters){const q=Math.hypot(x-c.x,z-c.z)/c.r;if(q>1.6)continue;value-=c.d*Math.exp(-q*q*4);value+=c.d*.32*Math.exp(-Math.pow((q-.95)/.2,2))}
  // A braided wash gives the low valley a readable drainage direction.
  const center=250+Math.sin(z*.0012)*320+Math.sin(z*.008)*18;
  value-=3*Math.exp(-Math.pow((x-center)/30,2))*(1+.25*Math.sin(z*.018));
  return value;
 }
};
