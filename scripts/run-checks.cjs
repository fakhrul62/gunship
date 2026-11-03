const {spawnSync}=require('child_process');
const rules=['armor','flight-collision','mission-rules','component-rules','player-damage','aircraft-damage','missile-flight'];
const browser=['cannon-presentation','missile-presentation','surface-impacts','destruction-effects','vehicle-components','player-damage-integration','aircraft-integration','flight-audio','mission-flow','release'];
const cases=process.argv[2]==='browser'?browser:rules;
for(const test of cases){console.log('CHECK '+test);const r=spawnSync(process.execPath,['scripts/test-'+test+'.cjs'],{stdio:'inherit',env:process.env});if(r.status!==0)process.exit(r.status||1)}
console.log('Passed '+cases.length+' '+(process.argv[2]||'rules')+' checks');
