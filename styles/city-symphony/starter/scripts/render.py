"""Apply the print treatment to an authored still for shot calibration."""
import argparse
from pathlib import Path
import cv2
from print_look import Print,cover

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source',type=Path)
    parser.add_argument('out',type=Path)
    parser.add_argument('--night',action='store_true')
    args=parser.parse_args()
    source=cv2.imread(str(args.source))
    if source is None:parser.error('Supply a readable photograph or source frame.')
    treatment=Print();plate=cover(source,1280,720)
    if not cv2.imwrite(str(args.out),treatment.matte(treatment.grade(plate,0,args.night))):
        raise SystemExit('Could not write the calibration frame.')

if __name__=='__main__':main()
