window.RenderSettings=class RenderSettings{
 constructor(B,scene,shadows,effects){this.B=B;this.scene=scene;this.shadows=shadows;this.effects=effects;this.profile='high';try{this.profile=localStorage.getItem('rotor-graphics')==='balanced'?'balanced':'high'}catch{}this.apply(this.profile)}
 apply(profile){
  this.profile=profile==='balanced'?'balanced':'high';const high=this.profile==='high';
  this.shadows.usePercentageCloserFiltering=high;this.shadows.getShadowMap().refreshRate=high?1:2;this.effects.budget=high?384:256;
  const pair=this.scene.metadata?.distantLods;if(pair){pair.high.setEnabled(high);pair.low.setEnabled(!high)}
  for(const button of document.querySelectorAll('[data-graphics-toggle]')){button.textContent='GRAPHICS: '+this.profile.toUpperCase();button.setAttribute('aria-label','Graphics '+this.profile+'. Toggle high or balanced; native resolution is preserved.')}
  try{localStorage.setItem('rotor-graphics',this.profile)}catch{}
 }
 toggle(){this.apply(this.profile==='high'?'balanced':'high')}
 static batchPlayer(B,root){
  const groups=new Map(),rotors=root.metadata?.rotors||[],cannon=root.metadata?.cannon;
  for(const mesh of root.getChildMeshes()){
   if(!mesh.material||mesh.skeleton||mesh===cannon?.barrel||mesh===cannon?.tip||mesh.metadata?.visualOnly||rotors.some(r=>mesh.isDescendantOf(r)))continue;
   if(!groups.has(mesh.material))groups.set(mesh.material,[]);groups.get(mesh.material).push(mesh);
  }
  let saved=0;
  for(const [material,list]of groups){if(list.length<2)continue;const merged=B.Mesh.MergeMeshes(list,true,true,undefined,false,false);if(!merged)continue;merged.name='airframe-'+material.name;merged.material=material;merged.setParent(root);merged.metadata={playerBody:true};saved+=list.length-1}
  root.metadata={...root.metadata,batchedMeshes:saved};
 }
};
