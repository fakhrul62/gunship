window.createBattlefieldMaterial=(B,scene)=>{
 const material=new B.PBRMaterial('desertBattlefield',scene);
 const sand=new B.Texture('../battlefield-ground.png',scene);sand.uScale=sand.vScale=65;sand.anisotropicFilteringLevel=8;sand.wrapU=sand.wrapV=B.Texture.MIRROR_ADDRESSMODE;
 material.albedoTexture=sand;material.albedoColor=new B.Color3(1,.97,.90);material.metallic=0;material.roughness=.97;material.environmentIntensity=.3;
 class DesertVariation extends B.MaterialPluginBase{
  constructor(){super(material,'DesertVariation',200,{},true)}getClassName(){return 'DesertVariation'}getSamplers(list){list.push('desertDetailSampler')}bindForSubMesh(buffer){buffer.setTexture('desertDetailSampler',sand)}
  getCustomCode(type){if(type!=='fragment')return null;return{CUSTOM_FRAGMENT_DEFINITIONS:`uniform sampler2D desertDetailSampler;
float desertHash(vec2 p){p=fract(p*vec2(.1031,.11369));p+=dot(p,p.yx+vec2(33.33));return fract((p.x+p.y)*p.x);}
float desertNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(desertHash(i),desertHash(i+vec2(1,0)),f.x),mix(desertHash(i+vec2(0,1)),desertHash(i+vec2(1)),f.x),f.y);}
`,CUSTOM_FRAGMENT_UPDATE_ALBEDO:`vec2 p=vPositionW.xz;float n=desertNoise(p*.0031);vec2 uv=mat2(.932,-.362,.362,.932)*p*.0072;
vec3 detail=texture2D(desertDetailSampler,uv+vec2(.31,.73)).rgb;detail*=detail;
vec3 crossDetail=texture2D(desertDetailSampler,mat2(.57,.82,-.82,.57)*p*.0129+vec2(.71,.12)).rgb;crossDetail*=crossDetail;
surfaceAlbedo=mix(surfaceAlbedo,mix(detail,crossDetail,n),.36);
float macro=mix(.78,1.09,.65*desertNoise(p*.0007)+.35*desertNoise(p*.005));surfaceAlbedo*=macro;`}}
 }
 new DesertVariation();return material;
};
