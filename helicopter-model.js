import * as THREE from 'three';
import { GLTFLoader } from './node_modules/three/examples/jsm/loaders/GLTFLoader.js';
const specs=[
  ['player','./odz-10ag_attack_helicopter_10a.glb'],
  ['rtbr','./enemy/rtbr_helicopter.glb'],
  ['griffon','./enemy/bell_ch-146_griffon.glb'],
  ['gazelle','./enemy/sa.342m_gazelle.glb'],
  ['apc','./enemy/fictional_cold_war_tank.glb'],
  ['turret','./enemy/scifi_turret.glb'],
  ['depot','./enemy/lowpoly_buildings_and_structures_collection.glb']
];
window.gameModels={};
window.modelsReady=(async()=>{
  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(384,384);renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  const loader=new GLTFLoader();
  for(const [key,path] of specs){
    const gltf=await loader.loadAsync(path);let model=gltf.scene;
    if(key==='depot'){
      let mesh;gltf.scene.traverse(obj=>{if(!mesh && obj.isMesh && obj.name.toLowerCase().includes('barn1'))mesh=obj});
      if(!mesh)throw new Error('Building mesh not found in supplied collection');
      model=mesh.clone();model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.set(1,1,1);
    }
    const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight(0xe2e8db,0x666653,2.8));
    const sun=new THREE.DirectionalLight(0xffedd2,3);sun.position.set(5,12,8);scene.add(sun);scene.add(model);
    const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
    model.position.sub(center);const span=Math.max(size.x,size.z)*1.15;
    if(!Number.isFinite(span)||span<=0)throw new Error('Model has no visible dimensions: '+key);
    const camera=new THREE.OrthographicCamera(-span/2,span/2,span/2,-span/2,.01,Math.max(span*5,100));
    camera.up.set(0,0,-1);camera.position.set(0,Math.max(span*2,5),.001);camera.lookAt(0,0,0);camera.updateProjectionMatrix();renderer.render(scene,camera);
    const snapshot=document.createElement('canvas');snapshot.width=384;snapshot.height=384;snapshot.getContext('2d').drawImage(renderer.domElement,0,0);
    window.gameModels[key]={canvas:snapshot,vertical:size.z>size.x};
    gltf.scene.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material){for(const mat of [].concat(obj.material)){for(const v of Object.values(mat))if(v&&v.isTexture)v.dispose();mat.dispose()}}});
    await new Promise(resolve=>setTimeout(resolve,0));
  }
  renderer.dispose();window.rotorModel=window.gameModels.player;return window.gameModels;
})().catch(error=>{console.error('Could not prepare game models:',error);throw error});
