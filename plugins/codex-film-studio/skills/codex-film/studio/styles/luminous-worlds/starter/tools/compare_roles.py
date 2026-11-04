#!/usr/bin/env python3
"""Compare every output frame with an explicit role/phase-matched reference frame.
Inputs are audit archives with `features` and `columns`, and a half-open role map.
No descriptor score is presented as an artistic acceptance percentage.
"""
import argparse, csv, json
from pathlib import Path
import numpy as np

def compare(reference, candidate, mapping, destination):
    ref=np.load(reference); own=np.load(candidate)
    rc=ref['columns'].tolist(); oc=own['columns'].tolist()
    r=ref['features']; o=own['features']; roles=json.loads(Path(mapping).read_text())['roles']
    if not len(r) or not len(o):raise ValueError('Empty decoded input')
    if not np.array_equal(o[:,0],np.arange(len(o))) or not np.array_equal(r[:,0],np.arange(len(r))):
        raise ValueError('Audits must contain consecutive zero-based frame indices')
    metrics=['luma','saturation','edge_density','flat_fraction','frame_delta','occupied_tiles']
    for key in metrics:
        if key not in rc or key not in oc:raise ValueError('Missing metric: '+key)
    owner=np.full(len(o),-1,dtype=np.int64); paired=np.zeros(len(o),dtype=np.int64)
    for i,s in enumerate(roles):
        a,b=s['output'];x,y=s['reference']
        if not(0<=a<b<=len(o) and 0<=x<y<=len(r)):raise ValueError('Invalid half-open interval')
        if np.any(owner[a:b]>=0):raise ValueError('Overlapping output intervals')
        owner[a:b]=i
        # Phase mapping is fixed before metrics are inspected; it does not search for flattering matches.
        phase=np.arange(b-a)/max(b-a-1,1)
        paired[a:b]=x+np.rint(phase*(y-x-1)).astype(np.int64)
    if np.any(owner<0):raise ValueError('Unpaired output frames')
    out=Path(destination);out.parent.mkdir(parents=True,exist_ok=True)
    with out.open('w',newline='') as f:
        w=csv.writer(f);w.writerow(['output_frame','output_seconds','role','reference_frame','reference_seconds']+
            [f'{m}_{k}'for m in metrics for k in ('output','reference','delta')])
        for i in range(len(o)):
            j=paired[i];row=[i,float(o[i,1]),roles[owner[i]]['role'],int(j),float(r[j,1])]
            for m in metrics:
                a=float(o[i,oc.index(m)]);b=float(r[j,rc.index(m)]);row.extend([a,b,a-b])
            w.writerow(row)
    summary={'output_frames':len(o),'reference_decoded_frames':len(r),'output_frames_paired':len(o),
        'distinct_reference_frames_paired':int(len(np.unique(paired))),'pairing':'Declared role + linear shot phase, half-open frame ranges',
        'artistic_acceptance':None,'scope':'Every output frame receives descriptor deltas. Reference decoding coverage is independent of pair coverage. No manual inspection or perceptual equivalence is implied.',
        'roles':[]}
    for i,s in enumerate(roles):
        mask=owner==i;ii=paired[mask];d={**s,'output_frame_count':int(mask.sum()),'metrics':{}}
        for m in metrics:
            a=o[mask,oc.index(m)];b=r[ii,rc.index(m)]
            d['metrics'][m]={'output_median':float(np.median(a)),'reference_median':float(np.median(b)),
                'median_absolute_delta':float(np.median(np.abs(a-b)))}
        summary['roles'].append(d)
    out.with_suffix('.summary.json').write_text(json.dumps(summary,indent=2))
    return summary

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('reference');p.add_argument('candidate');p.add_argument('mapping');p.add_argument('output');a=p.parse_args()
    s=compare(a.reference,a.candidate,a.mapping,a.output)
    print(json.dumps({k:v for k,v in s.items()if k!='roles'},indent=2))
