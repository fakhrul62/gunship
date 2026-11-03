const B=require('../engine-prototype/node_modules/babylonjs'),fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('engine-prototype/player-damage.js','utf8'),ctx);
const eng=new B.NullEngine(),scene=new B.Scene(eng),damage=new ctx.window.PlayerDamage(B,{emit:()=>{}},()=>0);
function game(){const root=new B.TransformNode('player',scene),body=B.MeshBuilder.CreateBox('hull',{size:4},scene);body.parent=root;root.position.y=80;const g={player:root,hp:100,speed:0,side:0,yaw:0,pitch:0};damage.attach(g);return g}
const g=game();damage.hit(g,4,new B.Vector3(0,82,0));assert.equal(g.hp,96);assert.equal(g.playerSystems.engine,88);assert(damage.power(g)<1);
for(let i=0;i<8;i++)damage.hit(g,4,new B.Vector3(0,82,0));assert.equal(g.playerSystems.emergency,'engine');assert(g.hp>0);
assert.equal(damage.update(g,.05,true),null);assert(g.player.position.y<80);
let outcome;for(let i=0;i<500&&!outcome;i++)outcome=damage.update(g,.05,true);assert.equal(outcome,'landed');assert(g.hp>0);assert.equal(damage.rotorRate(g),0);assert.equal(damage.update(g,.05,true),null);
const fast=game();fast.playerSystems.engine=0;fast.playerSystems.emergency='engine';fast.speed=80;for(let i=0;i<500;i++)if(damage.update(fast,.05,false))break;assert.equal(fast.hp,0);
const fatal=game();damage.hit(fatal,100,new B.Vector3(10,80,0));assert.equal(fatal.playerSystems.emergency,'critical');assert.equal(fatal.hp,0);assert(!fatal.playerSystems.landed);for(let i=0;i<500;i++)if(damage.update(fatal,.05))break;assert(fatal.playerSystems.landed);
const controls=game();damage.hit(controls,10,new B.Vector3(0,80,-10));assert.equal(controls.playerSystems.controls,70);assert(damage.control(controls)<1);
assert.equal(game().playerSystems.engine,100);
console.log('Player regional damage, reduced power/steering, engine-out flare landing, unsafe impact, delayed fatal crash and fresh sortie passed');scene.dispose();eng.dispose();
