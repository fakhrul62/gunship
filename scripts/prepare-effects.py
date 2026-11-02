from pathlib import Path
import subprocess,json,tempfile
from PIL import Image
import imageio_ffmpeg
root=Path(__file__).resolve().parents[1]
source=Path(r"C:\Users\Default.DESKTOP-HLFN2TC\Downloads\New folder (2)")
out=root/'local-effects';out.mkdir(exist_ok=True)
exe=imageio_ffmpeg.get_ffmpeg_exe()
manifest={'sprites':{},'sounds':[]}
for name,filename,duration in [('fireball','Explosion Fireball.mov',2.79),('groundblast','Explosion Groundblast.mov',7.51),('burning','Fire Large Plume.mov',7.38)]:
 with tempfile.TemporaryDirectory() as tmp:
  cmd=[exe,'-v','error','-y','-i',str(next(source.rglob(filename))),'-an','-vf',f'fps={64/duration},scale=256:144','-frames:v','64',str(Path(tmp)/'%03d.png')]
  subprocess.run(cmd,check=True)
  frames=sorted(Path(tmp).glob('*.png'));sheet=Image.new('RGBA',(2048,2048))
  for i,f in enumerate(frames):
   image=Image.open(f).convert('RGBA');sheet.paste(image,((i%8)*256,(i//8)*256+56))
  sheet.save(out/(name+'.png'),optimize=True)
  manifest['sprites'][name]={'file':name+'.png','frames':len(frames),'duration':duration}
for name,path in [('smoke',source/'Cloud01-flipbooks'/'Cloud01_8x8.tga'),('wisps',source/'CandleSmoke01_20x4.tga')]:
 image=Image.open(path).convert('RGBA');sheet=Image.new('RGBA',(2048,2048))
 cols,rows=(8,8) if name=='smoke' else (20,4)
 for i in range(64):
  n=round(i*(cols*rows-1)/63);w,h=image.width/cols,image.height/rows
  tile=image.crop((round(n%cols*w),round(n//cols*h),round((n%cols+1)*w),round((n//cols+1)*h))).resize((256,256),Image.Resampling.LANCZOS)
  sheet.paste(tile,(i%8*256,i//8*256))
 sheet.save(out/(name+'.png'),optimize=True);manifest['sprites'][name]={'file':name+'.png','frames':64,'duration':4 if name=='smoke' else 5}
for i in range(1,4):
 src=next(source.rglob(f'0017_explo_bomb_0{i}_PremiumBeat.wav'));name=f'explosion-{i}.ogg'
 subprocess.run([exe,'-v','error','-y','-i',str(src),'-t','6','-ac','1','-ar','44100','-c:a','libvorbis','-q:a','4',str(out/name)],check=True);manifest['sounds'].append(name)
(out/'manifest.json').write_text(json.dumps(manifest,indent=2))
print('Prepared',len(manifest['sprites']),'sprite sheets and',len(manifest['sounds']),'sounds;',round(sum(p.stat().st_size for p in out.iterdir())/1048576,2),'MB')
