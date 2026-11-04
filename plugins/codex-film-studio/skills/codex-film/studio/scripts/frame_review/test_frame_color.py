"""Analytic color vectors catch matrix/range regressions in review evidence."""
import unittest
import av
import numpy as np
from frame_color import rgb_frame


def patch(y, u, v, matrix, color_range):
    frame = av.VideoFrame(16, 16, "yuv420p")
    for plane, value in zip(frame.planes, [y, u, v]):
        plane.update(bytes([value]) * plane.buffer_size)
    frame.colorspace = matrix
    frame.color_range = color_range
    return frame


class ColorConversionTests(unittest.TestCase):
    def check_vector(self, values, matrix, color_range, expected):
        array = rgb_frame(patch(*values, matrix, color_range)).to_ndarray()
        np.testing.assert_allclose(array[8, 8], expected, atol=3)

    def test_bt709_limited_red(self):
        self.check_vector((63, 102, 240), 1, 1, (255, 0, 0))

    def test_bt601_limited_red(self):
        self.check_vector((81, 90, 240), 5, 1, (255, 0, 0))

    def test_bt601_full_red(self):
        self.check_vector((76, 85, 255), 5, 2, (254, 0, 0))

    def test_range_endpoints(self):
        self.check_vector((16, 128, 128), 1, 1, (0, 0, 0))
        self.check_vector((235, 128, 128), 1, 1, (255, 255, 255))
        self.check_vector((0, 128, 128), 5, 2, (0, 0, 0))
        self.check_vector((255, 128, 128), 5, 2, (255, 255, 255))

    def test_matrix_change_on_same_frame(self):
        frame = patch(63, 102, 240, 1, 1)
        a = rgb_frame(frame).to_ndarray()
        frame.colorspace = 5
        b = rgb_frame(frame).to_ndarray()
        self.assertGreater(abs(int(a[8, 8, 0]) - int(b[8, 8, 0])), 10)

    def test_unspecified_metadata_rejected(self):
        with self.assertRaisesRegex(ValueError, "matrix"):
            rgb_frame(patch(63, 102, 240, 2, 1))
        with self.assertRaisesRegex(ValueError, "range"):
            rgb_frame(patch(63, 102, 240, 1, 0))

    def test_rgb_preserved(self):
        array = np.full((16, 16, 3), [194, 67, 74], dtype=np.uint8)
        frame = av.VideoFrame.from_ndarray(array, format="rgb24")
        np.testing.assert_array_equal(rgb_frame(frame).to_ndarray(), array)


if __name__ == "__main__":
    unittest.main()
