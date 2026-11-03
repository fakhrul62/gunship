from pathlib import Path
import wave,numpy as np,shutil
dest=Path('assets/audio');dest.mkdir(exist_ok=True)
for source,target in [('heli_rotor.wav','rotor.wav'),('engine.wav','engine.wav'),('Engine_Rocket.wav','motor.wav')]:
 with wave.open(str(Path('local-apk-assets/sounds',source)),'rb') as w:
  rate=w.getframerate();samples=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)
 n=int(rate*.08);t=np.linspace(0,np.pi/2,n);out=samples[n:].copy();out[-n:]=samples[-n:]*np.cos(t)+samples[:n]*np.sin(t)
 with wave.open(str(dest/target),'wb') as w:
  w.setnchannels(1);w.setsampwidth(2);w.setframerate(rate);w.writeframes(np.clip(out,-32768,32767).astype('<i2').tobytes())
shutil.copyfile('local-apk-assets/sounds/Body_Hits_04.wav',dest/'debris.wav')
