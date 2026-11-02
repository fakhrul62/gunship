"""Read-only APK extraction. Proprietary outputs remain in ignored local-apk-assets/."""
from pathlib import Path
import zipfile,io,struct,json,re,zlib,hashlib,wave,math,base64
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
APK=Path(r"C:\Users\Default.DESKTOP-HLFN2TC\Downloads\gunship-battle-helicopter-3d-v2.8.21-mod.apk")
OUT=ROOT/'local-apk-assets'
for folder in ['sounds','textures','meshes','models']:(OUT/folder).mkdir(parents=True,exist_ok=True)
def safe(name):return re.sub(r'[^A-Za-z0-9_.-]','_',name)
report={'apk':str(APK),'sha256':hashlib.file_digest(APK.open('rb'),'sha256').hexdigest(),'sounds':[],'meshes':[],'textures':[],'converted':[],'limitations':[]}
with zipfile.ZipFile(APK) as apk:
 (OUT/'archive-inventory.json').write_text(json.dumps([{'name':i.filename,'size':i.file_size,'crc32':i.CRC} for i in apk.infolist()],indent=2))
 b=apk.read('assets/sound.dat');count=struct.unpack_from('<I',b,16)[0]
 for i in range(count):
  o=20+i*72;name=b[o:o+64].split(b'\0')[0].decode(errors='replace');start,size=struct.unpack_from('<II',b,o+64);data=b[start:start+size];assert data[:4]==b'RIFF' and data[8:12]==b'WAVE'
  dest=OUT/'sounds'/safe(name);dest.write_bytes(data)
  with wave.open(str(dest)) as w:info={'name':name,'offset':start,'size':size,'channels':w.getnchannels(),'sampleRate':w.getframerate(),'duration':w.getnframes()/w.getframerate()}
  report['sounds'].append(info)
 outer=zipfile.ZipFile(io.BytesIO(apk.read('assets/gb.txt')));obb=next(n for n in outer.namelist() if n.endswith('.obb'));inner=zipfile.ZipFile(io.BytesIO(outer.read(obb)));b=inner.read('texture.dat1');count=struct.unpack_from('<I',b,16)[0];texture_names={}
 for i in range(count):
  o=20+i*88;name=b[o:o+64].split(b'\0')[0].decode(errors='replace');flags,start,size,a,c,d=struct.unpack_from('<6I',b,o+64);info={'name':name,'flags':flags,'offset':start,'size':size};data=b[start:start+size]
  if data.startswith(b'\xff\xd8') or data.startswith(b'\x89PNG'):
   try:
    image=Image.open(io.BytesIO(data));info['dimensions']=image.size;dest=OUT/'textures'/(safe(name)+'.png');image.save(dest);texture_names[name.lower()]=dest.name;info['file']=str(dest.relative_to(OUT))
   except Exception as e:info['error']=str(e)
  report['textures'].append(info)
 b=apk.read('assets/mesh.dat');count=struct.unpack_from('<I',b,16)[0]
 for i in range(count):
  o=20+i*76;name=b[o:o+64].split(b'\0')[0].decode(errors='replace');flags,start,extra=struct.unpack_from('<III',b,o+64);end=struct.unpack_from('<I',b,20+(i+1)*76+68)[0] if i+1<count else len(b);raw=b[start:end];info={'name':name,'flags':flags,'offset':start,'size':end-start};report['meshes'].append(info)
  if not any(t in name.lower() for t in ['desert_house','bunker','hangar','tank','apache','heliport','oiltank']):continue
  (OUT/'meshes'/(safe(name)+'.bin')).write_bytes(raw)
  streams=[]
  for m in re.finditer(b'\x78[\x9c\xda\x01]',raw):
   k=m.start()
   if k<8:continue
   length,packed=struct.unpack_from('<II',raw,k-8)
   if length>20000000 or packed>len(raw)-k:continue
   try:
    data=zlib.decompress(raw[k:k+packed])
    if len(data)==length:streams.append((k,data))
   except zlib.error:pass
  # Export only the validated single-part layout; multi-part/animated records remain raw.
  if len(streams)!=4:info['conversion']='not a validated single-part record';continue
  indices,normals,uvs,positions=[data for k,data in streams];vertices=len(positions)//12
  if len(normals)!=len(positions) or len(uvs)!=vertices*8 or len(indices)%6:continue
  ix=struct.unpack('<'+'H'*(len(indices)//2),indices)
  if max(ix)>=vertices:continue
  pos=struct.unpack('<'+'f'*(len(positions)//4),positions)
  if not all(math.isfinite(x) and abs(x)<1e7 for x in pos):continue
  chunks=[positions,normals,uvs,indices];binary=bytearray();views=[]
  for data in chunks:
   while len(binary)%4:binary.append(0)
   views.append({'buffer':0,'byteOffset':len(binary),'byteLength':len(data)});binary.extend(data)
  mins=[min(pos[k::3]) for k in range(3)];maxs=[max(pos[k::3]) for k in range(3)]
  texture=raw[84:212].split(b'\0')[0].decode(errors='replace');mat={'pbrMetallicRoughness':{'metallicFactor':0,'roughnessFactor':.9},'doubleSided':True}
  gltf={'asset':{'version':'2.0','generator':'Local APK asset conversion'},'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':[{'bufferView':0,'componentType':5126,'count':vertices,'type':'VEC3','min':mins,'max':maxs},{'bufferView':1,'componentType':5126,'count':vertices,'type':'VEC3'},{'bufferView':2,'componentType':5126,'count':vertices,'type':'VEC2'},{'bufferView':3,'componentType':5123,'count':len(ix),'type':'SCALAR'}],'materials':[mat],'meshes':[{'name':name,'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0}]}],'nodes':[{'mesh':0,'rotation':[-.70710678118,0,0,.70710678118]}],'scenes':[{'nodes':[0]}],'scene':0}
  if texture.lower() in texture_names:
   gltf['images']=[{'uri':'data:image/png;base64,'+base64.b64encode((OUT/'textures'/texture_names[texture.lower()]).read_bytes()).decode()}];gltf['textures']=[{'source':0}];mat['pbrMetallicRoughness']['baseColorTexture']={'index':0}
  js=json.dumps(gltf,separators=(',',':')).encode();js+=b' '*((-len(js))%4);binary+=b'\0'*((-len(binary))%4);glb=struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary;dest=OUT/'models'/(safe(name)+'.glb');dest.write_bytes(glb);report['converted'].append({'name':name,'vertices':vertices,'triangles':len(ix)//3,'texture':texture,'textureRecovered':texture.lower() in texture_names,'file':str(dest.relative_to(OUT))})
report['limitations']=['Only validated single-part static meshes exported as GLB. Multi-part meshes and animation not reconstructed.','Nonstandard texture records remain inventoried but undecoded.','No APK code executed, and no extracted assets published.']
(OUT/'report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'sounds':len(report['sounds']),'meshRecords':len(report['meshes']),'textureRecords':len(report['textures']),'imagesRecovered':len(texture_names),'converted':report['converted']},indent=2))
