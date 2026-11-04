"""Presentation-order SDR BT.709 decoding with explicit YUV range/matrix.

Reject other or missing colour metadata instead of silently selecting a matrix.
This performs YUV-to-RGB conversion, not display/ICC or HDR tone mapping.
"""
import av
from av.video.reformatter import Colorspace, ColorRange, VideoReformatter

class VideoReader:
    def __init__(self, path):
        self.container = av.open(str(path))
        try:
            self.stream = self.container.streams.video[0]
            self.stream.codec_context.thread_count = 2
            self.fps = float(self.stream.average_rate)
            self.expected = self.stream.frames or None
            self.width = self.stream.codec_context.width
            self.height = self.stream.codec_context.height
            self.frames = self.container.decode(self.stream)
            self.convert = VideoReformatter()
            self.last_pts = None
            self.decoded = 0
        except Exception:
            self.container.close()
            raise

    def read(self):
        try:
            frame = next(self.frames)
        except StopIteration:
            return False, None
        if frame.colorspace != 1 or frame.color_range not in (1, 2):
            raise ValueError(f'Explicit BT.709 matrix/range required: {frame.colorspace}, {frame.color_range}')
        # The owning stream must declare SDR BT.709 primaries and transfer.
        codec = self.stream.codec_context
        if codec.color_primaries != 1 or codec.color_trc != 1:
            raise ValueError('Only declared SDR BT.709 primaries and transfer are supported')
        if frame.pts is None or (self.last_pts is not None and frame.pts <= self.last_pts):
            raise ValueError('Missing or non-increasing presentation timestamp')
        self.last_pts = frame.pts
        self.decoded += 1
        return True, frame_to_bgr(frame, self.convert)

    def close(self):
        self.container.close()


def frame_to_bgr(frame, reformatter=None):
    """Convert a frame whose SDR primaries/transfer were checked by its reader."""
    if frame.colorspace != 1 or frame.color_range not in (1, 2):
        raise ValueError('Explicit BT.709 matrix and limited/full range are required')
    convert = reformatter or VideoReformatter()
    full = convert.reformat(frame, format='bgr24',
        src_colorspace=Colorspace.ITU709, dst_colorspace=Colorspace.ITU709,
        src_color_range=ColorRange.MPEG if frame.color_range == 1 else ColorRange.JPEG,
        dst_color_range=ColorRange.JPEG, threads=2)
    return full.to_ndarray()
