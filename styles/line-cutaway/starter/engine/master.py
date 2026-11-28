"""48 kHz stereo BS.1770 gating and a shared look-ahead gain for editable stems."""
import numpy as np
from scipy.signal import lfilter
from scipy.ndimage import maximum_filter1d

def integrated(stereo):
    # 48 kHz K-weighting coefficients from the two ITU-R BS.1770 filter stages.
    y=lfilter([1.5351248596,-2.6916961894,1.1983928109],[1,-1.6906592932,.7324807742],stereo,axis=0)
    y=lfilter([1,-2,1],[1,-1.9900474548,.9900722504],y,axis=0)
    power=np.r_[0,np.cumsum(np.sum(y*y,axis=1))]
    start=np.arange(0,len(stereo)-19200+1,4800)
    energies=(power[start+19200]-power[start])/19200
    gate=10**((-70+.691)/10)
    absolute=energies[energies>=gate]
    if not len(absolute):raise ValueError('Cannot master a silent programme')
    selected=absolute[absolute>=np.mean(absolute)/10]
    return -.691+10*np.log10(np.mean(selected))

def gain_curve(stereo,target,ceiling_db=-1.65):
    gain=10**((target-integrated(stereo))/20)
    peak=np.max(np.abs(stereo),axis=1)*gain
    # Reserve a few milliseconds before each peak, then release gain over 55 ms.
    hold=maximum_filter1d(peak,size=481,mode='nearest')
    required=np.minimum(1,10**(ceiling_db/20)/np.maximum(hold,1e-6))
    # Hold the strongest reduction across each one-millisecond block.
    block=48
    pad=(-len(required))%block
    limits=np.pad(required,(0,pad),mode='edge').reshape(-1,block).min(axis=1)
    released=np.empty_like(limits);last=1.;decay=np.exp(-1/55)
    for i,limit in enumerate(limits):
        last=min(limit,1-(1-last)*decay);released[i]=last
    env=np.interp(np.arange(len(required)),np.arange(len(released))*block,released)
    return gain*env[:,None]
