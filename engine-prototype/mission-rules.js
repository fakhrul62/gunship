window.MissionRules={
 releaseWave(game){
  if(game.wave===0)return true;if(game.wave!==1)return false;
  const first=game.enemies.filter(e=>e.stage===game.phase&&e.wave===0);
  return game.phaseTime>=20||(game.phaseTime>=6&&first.length>0&&first.every(e=>e.dead));
 },
 cleared(game){const targets=game.enemies.filter(e=>e.stage===game.phase);return game.phaseTime>=8&&targets.length>0&&targets.every(e=>e.dead)}
};
