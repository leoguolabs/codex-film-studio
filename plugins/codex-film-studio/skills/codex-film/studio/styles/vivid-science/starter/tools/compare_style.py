"""Exhaustive frame-feature correspondence; not an artistic similarity certificate."""
import pathlib,sys,csv,json,numpy as np
from scipy.spatial import cKDTree
refdir,outdir,dest=map(pathlib.Path,sys.argv[1:4]);dest.mkdir(parents=True,exist_ok=True)
ref=np.genfromtxt(refdir/'frames.csv',delimiter=',',skip_header=1);out=np.genfromtxt(outdir/'frames.csv',delimiter=',',skip_header=1)
# Hue is deliberately omitted: subjects need different palettes. Preserve
# saturation/value roles, extremes, contour density and consecutive motion.
cols=[5,6,7,8,9,10];names=['saturation','value','dark_fraction','bright_fraction','edge_density','motion_delta']
# Reserve whole-reference coverage while allowing explicit content-range filtering.
reference_end=float(sys.argv[4]) if len(sys.argv)>4 else float(ref[-1,1])+1
usable=ref[ref[:,1]<reference_end]
q10=np.quantile(usable[:,cols],.1,axis=0);q90=np.quantile(usable[:,cols],.9,axis=0);scale=np.maximum(q90-q10,[.1,.1,.05,.05,.01,.01]);center=np.median(usable[:,cols],axis=0)
r=(usable[:,cols]-center)/scale;o=(out[:,cols]-center)/scale
distance,index=cKDTree(r).query(o,k=1)
with (dest/'frame-correspondence.csv').open('w') as f:
 w=csv.writer(f);w.writerow(['output_frame','output_time','reference_frame','reference_time','feature_distance',*['difference_'+n for n in names]])
 for i,j in enumerate(index):w.writerow([int(out[i,0]),out[i,1],int(usable[j,0]),usable[j,1],distance[i],*(out[i,cols]-usable[j,cols])])
summary={'reference_frames_scanned':len(ref),'output_frames_scanned':len(out),'comparison_rows':len(out),'eligible_reference_end_seconds':reference_end,'reference_frames_eligible':len(usable),'metrics':names,'distance_median':float(np.median(distance)),'distance_p90':float(np.quantile(distance,.9)),'largest_differences':[{'output_frame':int(out[i,0]),'time':float(out[i,1]),'reference_frame':int(usable[index[i],0]),'distance':float(distance[i])} for i in np.argsort(distance)[-24:][::-1]],'interpretation':'Nearest full-frame feature neighbours identify review targets. Distances are not percentages, semantic similarity or proof of stylistic identity. Visual and audio review must be recorded separately.'}
(dest/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps({k:v for k,v in summary.items() if k!='largest_differences'},indent=2))
