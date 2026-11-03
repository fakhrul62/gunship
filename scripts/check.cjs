const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');let count=0;
for(const dir of ['engine-prototype','scripts'])for(const name of fs.readdirSync(dir)){if(!/\.(js|cjs)$/.test(name))continue;const r=spawnSync(process.execPath,['--check',path.join(dir,name)],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);count++}
console.log('Syntax checked '+count+' scripts');
