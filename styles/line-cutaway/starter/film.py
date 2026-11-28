"""Blank material calibration. Replace with the authored subject and action."""
from engine.plate import Plate
from engine.solid import move,ring
from engine.lettering import Sheet

class Film:
    def __init__(self,cfg,quality):
        self.cfg=cfg;self.plate=Plate(quality=quality)
        self.plate.add('calibration',ring(12,8,-2,2))
    def frame(self,t):
        p=self.plate;p.begin(30+t*2,32,56,center=(1180,480))
        p.draw('calibration',move(),.92)
        sheet=Sheet(p.finish())
        for cue in self.cfg['cues']:sheet.caption(cue,t)
        return sheet.image
