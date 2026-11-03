from pathlib import Path
import zipfile,json,shutil,hashlib
from PIL import Image
import numpy as np
out=Path('assets/effects');out.mkdir(parents=True,exist_ok=True)
manifest={'sprites':{},'sounds':['explosion-rocket.wav','explosion-vehicle.wav']}
def atlas(key,archive,folder,duration,additive=False,animated=True):
 with zipfile.ZipFile('audit/realism/downloads/'+archive) as z:
  files=sorted(n for n in z.namelist() if n.startswith(folder+'/') and n.endswith('.png'))
  chosen=[files[round(i*(len(files)-1)/63)] for i in range(64)] if animated else files
  sheet=Image.new('RGBA',(2048,2048))
  for i,name in enumerate(chosen):
   import io
   im=Image.open(io.BytesIO(z.read(name))).convert('RGBA');im.thumbnail((248,248),Image.Resampling.LANCZOS)
   if additive:
    a=np.asarray(im).astype(np.float32)/255;rgb=a[:,:,:3];alpha=np.max(rgb,axis=2);rgb=np.divide(rgb,alpha[:,:,None],out=np.zeros_like(rgb),where=alpha[:,:,None]>.001);im=Image.fromarray((np.dstack([rgb,alpha])*255).astype('uint8'),'RGBA')
   sheet.paste(im,(i%8*256+(256-im.width)//2,i//8*256+(256-im.height)//2))
  sheet.save(out/(key+'.png'),optimize=True);manifest['sprites'][key]={'file':key+'.png','frames':len(chosen),'duration':duration,'animated':animated}
atlas('fireball','ExplosionUp.zip','Explosion Dome',2.0,True)
atlas('groundblast','ExplosionUp.zip','ImpactUp',2.4,True)
atlas('burning','Explosions.zip','Lave Blob',2.1,True)
atlas('smoke','kenney_smoke-particles.zip','PNG/Black smoke',5,False,False)
atlas('dust','kenney_smoke-particles.zip','PNG/White puff',3.5,False,False)
atlas('flash','kenney_smoke-particles.zip','PNG/Flash',.13,False,False)
shutil.copy2('local-apk-assets/sounds/ExploRocket.wav',out/'explosion-rocket.wav');shutil.copy2('local-apk-assets/sounds/ExploGeneral.wav',out/'explosion-vehicle.wav')
manifest['sprites']['trail']={**manifest['sprites']['dust'],'duration':1.8}
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
(out/'CREDITS.md').write_text('''# Effect sources

Explosion Dome, ImpactUp and Lave Blob: fscopel, Photo Realistic Explosions, https://opengameart.org/content/photo-realistic-explosions . CC BY 3.0, https://creativecommons.org/licenses/by/3.0/ . Modified: sampled into atlases, resized and converted from black-background RGB to unpremultiplied alpha.

Black smoke, White puff and Flash: Kenney Smoke Particles, https://kenney.nl/assets/smoke-particles . CC0. Modified: resized into atlases.

Explosion audio: selected WAV records extracted from the user-supplied Gunship Battle APK, separate from the licenses above.
''')
print('Public combat effects MB',round(sum(p.stat().st_size for p in out.iterdir())/1048576,2))
