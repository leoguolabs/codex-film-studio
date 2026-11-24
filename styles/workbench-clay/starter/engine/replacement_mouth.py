"""A clay jaw with two independently posed mouth corners. All lengths are in puppet units."""

from .clay import rot, smooth, vec


def sculpt(stage, clay, jaw, roundness, spread, seal, bite, compression, corners):
    left, right = corners
    lifted = 0.5 * (left + right)
    tilt = max(-11.0, min(11.0, (right - left) * 280.0))
    close = smooth((seal - 0.25) / 0.65)
    purse = max(roundness * 0.72, compression)
    width = (
        (0.119 + 0.038 * spread + 0.008 * close)
        * (1.0 - 0.62 * purse)
        * (1.0 - 0.46 * compression)
    )
    half_height = (
        (0.007 + 0.049 * jaw + 0.007 * roundness)
        * (1.0 - 0.89 * close)
        * (1.0 - 0.22 * compression)
    )
    center_y = -0.143 - 0.024 * jaw + 0.003 * bite - 0.002 * compression
    half_height += 0.007 * compression
    lifted *= 1.0 - 0.89 * compression
    center_z = 0.241 + 0.040 * purse + 0.012 * compression
    # Push a volume into the chin. Its broad rear half blends into the lower jaw.
    # With a dropped jaw, the chin travels down while the upper lip stays with the nose.
    stage.egg(
        (-0.005, center_y - 0.040 - 0.024 * jaw, 0.174 + 0.030 * purse),
        (0.134 - 0.051 * purse, 0.063 + 0.012 * jaw, 0.086 + 0.008 * purse),
        clay,
        angles=(-4, -8, tilt * 0.20),
        blend=0.054,
    )
    # Cheek tissue is pulled up on a lifted side and stretches flat on a dropped side.
    for side, lift in ((-1, left), (1, right)):
        rise = max(0.0, min(1.0, (lift + 0.012) / 0.047))
        stage.egg(
            (
                side * (0.110 - 0.055 * purse),
                center_y + 0.026 + 0.56 * lift,
                0.172 + 0.036 * purse,
            ),
            (0.073 - 0.020 * purse, 0.047 + 0.009 * rise, 0.049 + 0.006 * rise),
            clay,
            angles=(side * 15, -4, side * (-18 + 10 * rise)),
            blend=0.038,
        )
    # One stamped muzzle carries both lip rolls. The pressure field is continuous into
    # the cheek, so there is no separately rounded bead on either end of the smile.
    stage._shape(
        19,
        (-0.003, center_y, 0.174 + 0.045 * purse + 0.012 * compression),
        (width, half_height, 0.095 + 0.008 * purse),
        clay,
        rot(0, -5, tilt),
        lifted,
        0.035,
        False,
        1,
        0.77,
    )
    if compression > 0.01:
        # The thumb and forefinger push the muzzle forward around a small whistle.
        # The off-centre top lip and lower fold join the original chin behind the ring.
        forward = 0.054 * compression
        stage.egg(
            (-0.014, center_y + 0.018, 0.246 + forward + 0.036 * compression),
            (0.057 * compression, 0.052 * compression, 0.077 * compression),
            clay,
            angles=(-7, 9, -12),
            blend=0.035 * compression,
        )
        stage.egg(
            (0.015, center_y + 0.019, 0.244 + forward + 0.032 * compression),
            (0.049 * compression, 0.048 * compression, 0.073 * compression),
            clay,
            angles=(7, 5, 17),
            blend=0.026 * compression,
        )
        stage.egg(
            (-0.004, center_y - 0.025, 0.239 + forward),
            (0.053 * compression, 0.038 * compression, 0.072 * compression),
            clay,
            angles=(-6, 8, -8),
            blend=0.041 * compression,
        )
        # Pinch the lips between two fingers, pressing the outer roll up against the nose.
        # The front field describes one open vessel with two convex lips and a denser lower pad.
        stage._shape(
            24,
            (-0.006, center_y - 0.015, 0.297 + 0.047 * compression),
            (0.069 * compression, 0.055 * compression, 0.045 * compression),
            clay,
            rot(5, -5, tilt - 5),
            compression,
            0.028 * compression,
            False,
            1,
            0.73,
        )
        center_z += 0.060 * compression
        width *= 1.0 - 0.20 * compression
        half_height *= 1.0 - 0.20 * compression
    if close > 0.88:
        # When the two pads meet, only a shallow pressed crease survives at the front.
        stage._shape(
            20,
            (0, center_y, 0.286 + 0.025 * purse),
            (width, 0.004, 0.029),
            clay * 0.89,
            rot(0, -3, tilt),
            lifted,
            0.0026,
            True,
            1,
            0.75,
        )
        return
    # The arch changes sign as a smile gives way to alarm. Both corners connect to the
    # mouth floor through one continuous carved surface.
    stage._shape(
        22 if compression > 0.65 else 18,
        (-0.002 - 0.004 * purse, center_y, center_z),
        (width, half_height, 0.078 - 0.018 * purse + 0.014 * compression),
        clay * 0.75,
        rot(0, -5, tilt),
        lifted,
        0.011 * (1.0 - 0.79 * close),
        True,
        1,
        0.80,
    )
