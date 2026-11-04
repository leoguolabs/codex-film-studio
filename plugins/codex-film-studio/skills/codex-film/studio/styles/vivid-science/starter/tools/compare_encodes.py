"""Compare two equal-geometry encoded revisions; diagnostics, not artistic grading."""
from pathlib import Path
from itertools import zip_longest
import argparse,csv,json,hashlib
import av,numpy as np

def main():
 ap=argparse.ArgumentParser();ap.add_argument('before',type=Path);ap.add_argument('after',type=Path);ap.add_argument('output',type=Path);ap.add_argument('--threshold',type=float,default=.05);a=ap.parse_args();a.output.mkdir(parents=True,exist_ok=True)
 changed=[];exact=0;total=0;maximum=0;maximum_at=None
 with av.open(str(a.before)) as c1,av.open(str(a.after)) as c2,(a.output/'frame-differences.csv').open('w',newline='') as out:
  writer=csv.writer(out);writer.writerow(['frame','before_time','after_time','rgb_mae','exact_equal'])
  for frame_index,pair in enumerate(zip_longest(c1.decode(video=0),c2.decode(video=0))):
   first,second=pair
   if first is None or second is None:raise ValueError('Decoded frame counts differ')
   x=first.to_ndarray(format='rgb24');y=second.to_ndarray(format='rgb24')
   if x.shape!=y.shape:raise ValueError('Frame geometry differs')
   equal=np.array_equal(x,y);delta=0.0 if equal else float(np.abs(x.astype(np.int16)-y.astype(np.int16)).mean())
   total+=1;exact+=int(equal)
   if delta>a.threshold:changed.append(frame_index)
   if delta>maximum:maximum=delta;maximum_at=frame_index
   writer.writerow([frame_index,float(first.time),float(second.time),delta,equal])
 ranges=[]
 for frame_index in changed:
  if ranges and frame_index==ranges[-1][1]+1:ranges[-1][1]=frame_index
  else:ranges.append([frame_index,frame_index])
 summary={'before_sha256':hashlib.sha256(a.before.read_bytes()).hexdigest(),'after_sha256':hashlib.sha256(a.after.read_bytes()).hexdigest(),'frames_compared':total,'threshold_rgb_mae':a.threshold,'changed_frames':len(changed),'changed_ranges':ranges,'exact_equal_frames':exact,'maximum_mae':maximum,'maximum_mae_frame':maximum_at,'purpose':'Full-resolution decoded RGB revision differences. No artistic or style identity claim.'}
 (a.output/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(summary,indent=2))
if __name__=='__main__':main()
