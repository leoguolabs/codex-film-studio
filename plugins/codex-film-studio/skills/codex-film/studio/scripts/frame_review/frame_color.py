"""Explicit matrix/range conversion for display-referred RGB review evidence.

PyAV's default RGB conversion can retain swscale's BT.601 coefficients for a
BT.709-tagged frame. Specify both ranges as well as the matrix to configure it.
This handles SDR YUV matrices; it does not tone-map HDR or manage an ICC profile.
"""
from av.video.reformatter import VideoReformatter

COLOR_POLICY = "explicit-sdr-matrix-and-range-v1"
MATRICES = {1: "ITU709", 4: "FCC", 5: "ITU601", 6: "ITU601", 7: "SMPTE240M"}


def rgb_frame(frame, width=None, height=None):
    """Return full-range RGB24, honoring supported declared YUV matrix/range."""
    if frame.format.is_rgb:
        return frame.reformat(width=width, height=height, format="rgb24")
    matrix_id = int(frame.colorspace)
    if matrix_id not in MATRICES:
        raise ValueError(f"Unsupported or unspecified YUV matrix {matrix_id}; "
                         "resolve source color metadata before visual review")
    range_id = int(frame.color_range)
    if range_id not in (1, 2):
        raise ValueError(f"Unsupported or unspecified YUV range {range_id}; "
                         "resolve source color metadata before visual review")
    return VideoReformatter().reformat(
        frame, width=width, height=height, format="rgb24",
        src_colorspace=MATRICES[matrix_id], dst_colorspace=MATRICES[matrix_id],
        src_color_range="JPEG" if range_id == 2 else "MPEG", dst_color_range="JPEG",
    )
