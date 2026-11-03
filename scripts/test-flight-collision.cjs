const B=require('../engine-prototype/node_modules/babylonjs'),vm=require('vm'),fs=require('fs'),assert=require('assert');const c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('engine-prototype/flight-collision.js','utf8'),c);
const wall={min:new B.Vector3(10,0,-100),max:new B.Vector3(12,20,100)},m=new c.window.FlightCollision(B,()=>0,()=>[wall]),r=new B.Vector3(2,2,2);
const fast=m.move(new B.Vector3(0,10,0),new B.Vector3(200,10,0),r);assert(fast.position.x<8);assert(fast.contact);
const slide=m.move(new B.Vector3(0,10,0),new B.Vector3(20,10,30),r);assert(slide.position.x<8);assert(slide.position.z>25);
const roof=m.move(new B.Vector3(11,50,0),new B.Vector3(11,-10,0),r);assert(roof.position.y>22);assert.equal(roof.contact.normal.y,1);
const clear=m.move(new B.Vector3(0,40,0),new B.Vector3(30,40,0),r);assert.equal(clear.position.x,30);assert.equal(clear.contact,null);
const overlap=m.move(new B.Vector3(11,10,0),new B.Vector3(11.1,10,0),r);assert(overlap.position.x<8||overlap.position.x>14);assert.equal(m.support(11,0),20);assert.equal(m.support(0,0),0);
console.log('High-speed wall collision, sliding, roof strike, clear flight, overlap recovery and structure support passed');
