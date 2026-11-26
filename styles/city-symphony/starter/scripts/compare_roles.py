"""Pair every frame in both directions, using supplied edit roles and decoded feature tables."""
import argparse,csv,json
from pathlib import Path
import numpy as np
from scipy.spatial import cKDTree

FEATURES=('luma','saturation','bright_area','dark_area','edge_density','texture','frame_delta')
FLOOR=(.07,.09,.045,.08,.028,.027,.022)

def read(table,ranges):
    with table.open() as f:rows=list(csv.DictReader(f))
    if not rows or [int(r['frame']) for r in rows]!=list(range(len(rows))):
        raise ValueError('Feature rows must cover consecutive zero-based decoded frames.')
    groups=np.full(len(rows),'',dtype=object)
    for start,stop,name in json.loads(ranges.read_text()):
        if not name or not 0<=start<stop<=len(rows) or any(groups[start:stop]):
            raise ValueError(f'Invalid or overlapping interval {start}..{stop}.')
        groups[start:stop]=name
    if not all(groups):raise ValueError('Supply a role for every decoded frame.')
    values=np.array([[float(r[f]) for f in FEATURES] for r in rows])
    return values,groups

def pair(a,ar,b,br,path):
    records=[None]*len(a)
    for role in dict.fromkeys(ar):
        ia=np.flatnonzero(ar==role);ib=np.flatnonzero(br==role)
        if not len(ib):raise ValueError(f'No corresponding role for {role}. Supply matching role names.')
        d,nearest=cKDTree(b[ib]).query(a[ia])
        phase=np.rint(np.linspace(0,len(ib)-1,len(ia))).astype(int)
        for j,idx in enumerate(ia):
            records[idx]=(idx,ib[phase[j]],ib[nearest[j]],role,round(float(d[j]/np.sqrt(len(FEATURES))),5))
    with path.open('w') as f:
        writer=csv.writer(f);writer.writerow(['frame','phase_match','feature_match','role','feature_distance']);writer.writerows(records)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ['reference_csv','reference_roles','film_csv','film_roles','output_dir']:parser.add_argument(name,type=Path)
    args=parser.parse_args()
    a,ar=read(args.reference_csv,args.reference_roles);b,br=read(args.film_csv,args.film_roles)
    scale=np.maximum(np.percentile(a,75,axis=0)-np.percentile(a,25,axis=0),FLOOR)
    args.output_dir.mkdir(exist_ok=True,parents=True)
    pair(b/scale,br,a/scale,ar,args.output_dir/'film-to-reference.csv')
    pair(a/scale,ar,b/scale,br,args.output_dir/'reference-to-film.csv')
if __name__=='__main__':main()
