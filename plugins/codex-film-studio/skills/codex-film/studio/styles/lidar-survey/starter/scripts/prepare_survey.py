#!/usr/bin/env python3
"""Convert CSV x,y,z[,classification,intensity,hag] to local survey JSON without resampling."""
import argparse,csv,json,hashlib
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('source',type=Path);p.add_argument('output',type=Path)
    p.add_argument('--origin',nargs=3,type=float,required=True)
    p.add_argument('--units',required=True);p.add_argument('--crs',required=True)
    p.add_argument('--vertical-datum',required=True);p.add_argument('--source-url',required=True)
    a=p.parse_args();points=[]
    with a.source.open(newline='') as f:
        for row in csv.DictReader(f):
            point=[float(row[k])-a.origin[i] for i,k in enumerate(['x','y','z'])]
            point += [int(row.get('classification') or 0),float(row.get('intensity') or 1),float(row.get('hag') or point[2])]
            points.append(point)
    import math
    if not points or any(not all(math.isfinite(x) for x in point) for point in points):raise ValueError('Empty/nonfinite data')
    data=dict(points=points,triangles=[],origin=a.origin,units=a.units,crs=a.crs,vertical_datum=a.vertical_datum,
              source_url=a.source_url,source_sha256=hashlib.sha256(a.source.read_bytes()).hexdigest())
    with a.output.open('x') as f:json.dump(data,f,separators=(',',':'))
    print(json.dumps(dict(file=str(a.output),type='json',sha256=hashlib.sha256(a.output.read_bytes()).hexdigest())))
if __name__=='__main__':main()
