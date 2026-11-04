"""Known BT.709 colour bars detect matrix/range mistakes without a film fixture."""
import unittest
import av
import numpy as np
from color_decode import frame_to_bgr


def solid(y, u, v, color_range=1):
    frame = av.VideoFrame(16, 16, 'yuv420p')
    frame.colorspace = 1
    frame.color_range = color_range
    for plane, value in zip(frame.planes, [y, u, v]):
        plane.update(bytes([value]) * plane.buffer_size)
    return frame


class ColourDecodeTest(unittest.TestCase):
    def test_limited_primary_bars(self):
        for yuv, rgb in [((63, 102, 240), (255, 0, 0)),
                         ((173, 42, 26), (0, 255, 0)),
                         ((32, 240, 118), (0, 0, 255))]:
            with self.subTest(yuv=yuv):
                pixels = frame_to_bgr(solid(*yuv))[:, :, ::-1].astype(int)
                self.assertLessEqual(np.abs(pixels - np.array(rgb)).max(), 4)

    def test_limited_black_and_white(self):
        for y, value in [(16, 0), (235, 255)]:
            self.assertLessEqual(np.abs(frame_to_bgr(solid(y, 128, 128)).astype(int) - value).max(), 1)

    def test_full_black_and_white(self):
        for y in [0, 255]:
            self.assertLessEqual(np.abs(frame_to_bgr(solid(y, 128, 128, 2)).astype(int) - y).max(), 1)

    def test_unknown_metadata_is_rejected(self):
        frame = solid(63, 102, 240)
        frame.colorspace = 2
        with self.assertRaises(ValueError):
            frame_to_bgr(frame)
        frame.colorspace = 1
        frame.color_range = 0
        with self.assertRaises(ValueError):
            frame_to_bgr(frame)


if __name__ == '__main__':
    unittest.main()
