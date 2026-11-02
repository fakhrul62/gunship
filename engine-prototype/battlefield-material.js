window.createBattlefieldMaterial=(B,scene)=>{
 const material=new B.PBRMaterial('desertBattlefield',scene);
 const sand=new B.Texture('../battlefield-ground.png',scene);sand.uScale=sand.vScale=65;sand.anisotropicFilteringLevel=8;sand.wrapU=sand.wrapV=B.Texture.MIRROR_ADDRESSMODE;
 material.albedoTexture=sand;material.albedoColor=new B.Color3(1,.97,.90);material.metallic=0;material.roughness=.97;material.environmentIntensity=.3;
 class DesertVariation extends B.MaterialPluginBase{
  constructor(){super(material,'DesertVariation',200,{},true)}getClassName(){return 'DesertVariation'}getSamplers(list){list.push('desertDetailSampler')}bindForSubMesh(buffer){buffer.setTexture('desertDetailSampler',sand)}
  getCustomCode(type){if(type!=='fragment')return null;return{CUSTOM_FRAGMENT_DEFINITIONS:`uniform sampler2D desertDetailSampler;`,CUSTOM_FRAGMENT_UPDATE_ALBEDO:`vec2 p=vPositionW.xz;vec2 uv=mat2(.932,-.362,.362,.932)*p*.0072;vec3 detail=pow(texture2D(desertDetailSampler,uv+vec2(.31,.73)).rgb,vec3(2.2));float blend=.25+.12*sin(p.x*.002+sin(p.y*.003));surfaceAlbedo=mix(surfaceAlbedo,detail,blend);float macro=.93+.07*sin(p.x*.0011+sin(p.y*.0008)*2.);surfaceAlbedo*=macro;`}}
 }
 new DesertVariation();return material;
};
