const assert=require('assert'),fs=require('fs'),vm=require('vm');
const B=require('../engine-prototype/node_modules/babylonjs');
const ctx={window:{}};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('engine-prototype/aircraft-damage.js','utf8'),ctx);
const engine=new B.NullEngine(),scene=new B.Scene(engine);let impacts=0;
const manager=new ctx.window.AircraftDamage(B,{emit:()=>{}},()=>0,()=>impacts++);
function aircraft(){
 const root=new B.TransformNode('helo',scene),body=B.MeshBuilder.CreateBox('body',{width:5,height:5,depth:16},scene);
 body.parent=root;body.material=new B.PBRMaterial('paint',scene);root.position.y=100;
 const mast=new B.TransformNode('Chopper.Rotor_Blur',scene);mast.parent=root;mast.position.y=4;
 const tail=new B.TransformNode('Chopper.Tail',scene);tail.parent=root;tail.position.z=-10;
 const rotor=B.MeshBuilder.CreateBox('mainRotor',{width:20,height:.1,depth:1},scene);rotor.parent=root;rotor.position.y=4;
 const e={obj:root,air:true,hp:220,dead:false};manager.attach(e);return{e,body,rotor};
}
const {e,body,rotor}=aircraft(),other=aircraft();
assert.equal(manager.classify(e,rotor,new B.Vector3(0,104,0)),'rotor');
assert.equal(manager.classify(e,body,new B.Vector3(0,102,0)),'engine');
assert.equal(manager.classify(e,body,new B.Vector3(0,100,-10)),'tail');
manager.hit(e,22,new B.Vector3(0,102,0),body);assert(manager.speed(e)<1);
const fullRate=manager.rotorRate(e);
for(let i=0;i<3;i++)manager.hit(e,22,new B.Vector3(0,102,0),body);
assert.equal(e.flightDamage.engine.hp,0);assert(manager.rotorRate(e)<fullRate);
e.airVelocity.set(30,0,0);assert(manager.beginCrash(e,'engine'));assert(!manager.beginCrash(e,'engine'));
assert(e.weaponDisabled&&e.dead);assert.equal(impacts,0);
for(let i=0;i<40;i++)manager.update(e,.05);
assert(e.obj.position.x>0);assert(e.obj.position.y<100);assert(!e.crash.landed);
for(let i=0;i<1000;i++)manager.update(e,.05);
assert(e.crash.landed);assert.equal(impacts,1);assert(Number.isFinite(e.obj.position.y));
assert.equal(manager.rotorRate(e),0);assert.notEqual(body.material,other.body.material);
assert(body.material.name.startsWith('crashed-'));assert(!other.body.material.name.startsWith('crashed-'));
const material=body.material;e.obj.dispose();assert(!scene.materials.includes(material));
console.log('Aircraft hit regions, slowdown, engine failure, inertia, landing, single impact, material isolation and disposal passed');
scene.dispose();engine.dispose();

