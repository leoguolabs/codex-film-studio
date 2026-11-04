# Full-frame scan

`scan_frames.py INPUT_VIDEO OUTPUT_DIRECTORY` decodes every frame, creates a CSV
of seven low-resolution measurements, numbered 100-frame atlases, five-second
native-resolution samples and a source hash. Use a fresh output directory for
each version. Requirements: Python 3, OpenCV, NumPy and Pillow.

The source video, analysis output and every production remain in the external
production directory. Read the reported `all_frames_decoded` value and compare
it to stream metadata. The sparse overview is for navigation. It is not a
replacement for the every-frame CSV or the exhaustive atlases.

This tool produces evidence, not an aesthetic score. Color distribution and
pixel change depend on subject, framing and shot role. Pair roles explicitly,
inspect native resolution and temporal sequences, and keep subjective viewing
and listening separate from automated scans.
