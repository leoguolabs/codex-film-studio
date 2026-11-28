from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from engine.solid import ring, move
from engine.plate import Plate
p=Plate(width=768,height=432,quality=1.5)
p.add('ring',ring(15,9,-2.5,2.5));p.begin(22,34,54)
p.draw('ring',move(),.93)
out=ROOT/'review/proof.jpg';out.parent.mkdir(exist_ok=True);p.finish().convert('RGB').save(out,quality=95)
print(out)
