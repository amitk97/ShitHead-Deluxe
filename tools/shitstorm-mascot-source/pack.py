from PIL import Image
from pathlib import Path
import numpy as np,json,math,os
p=Path(os.environ.get('SH_MASCOT_OUT',str(Path(__file__).parent)))
(p/'inspection').mkdir(exist_ok=True)
atlas=Image.new('RGBA',(2048,2048))
frames=[]
for i in range(60):
 im=Image.open(p/'frames'/f'{i:03}.png').convert('RGBA').resize((252,252),Image.Resampling.LANCZOS)
 cell=Image.new('RGBA',(256,256));cell.paste(im,(2,2));atlas.paste(cell,((i%8)*256,(i//8)*256));frames.append(cell)
atlas.save(p/'mascot-atlas.webp',quality=91,method=6,alpha_quality=100)
poster=frames[19];poster.save(p/'mascot-poster.webp',lossless=True,method=6)
a=np.array(poster)[:,:,3];ys,xs=np.where(a>25);bounds=[int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)]
tip=[128,2+252*(.5+1.85/(2*8.4*math.tan(math.radians(31/2))))]
radius=[]
for u in np.linspace(0,1,80):
 y=round(bounds[3]-1-u*(bounds[3]-bounds[1]-1));xx=np.where(a[y,:]>25)[0];radius.append(float((xx.max()-xx.min())/2/256) if len(xx) else 0)
meta={'version':1,'frames':60,'fps':30,'duration':2,'cell':256,'columns':8,'gutter':2,'tip':[v/256 for v in tip],'bounds':[v/256 for v in bounds],'radius':radius,'source':'Approved mascot.glb and character-controller.js; real Chromium WebGL alpha capture','sourceDuration':2.12,'sourceTimeScale':1.06}
(p/'mascot-atlas.json').write_text(json.dumps(meta,separators=(',',':')))
contact=Image.new('RGB',(4*256,2*256),'#101826')
for j,i in enumerate([6,14,19,28,31,36,44,51]):contact.paste(frames[i],((j%4)*256,(j//4)*256),frames[i])
contact.save(p/'inspection'/'burn-frames.jpg',quality=94)
print(json.dumps({'bytes':(p/'mascot-atlas.webp').stat().st_size,'bounds':bounds,'tip':tip,'alphaFrame19':int((a>0).sum())}))
