"""Centimetre-scale miniature stage. Coordinates are in puppet-height units, Y up, +Z toward camera."""

import math
from contextlib import contextmanager
import numpy as np


def vec(x):
    return np.asarray(x, dtype=float)


def unit(x):
    return x / max(0.000001, np.linalg.norm(x))


def rot(yaw=0, pitch=0, roll=0):
    y, p, r = np.radians([yaw, pitch, roll])
    a, b = math.cos(y), math.sin(y)
    c, d = math.cos(p), math.sin(p)
    e, f = math.cos(r), math.sin(r)
    return (
        np.array([[a, 0, b], [0, 1, 0], [-b, 0, a]])
        @ np.array([[1, 0, 0], [0, c, -d], [0, d, c]])
        @ np.array([[e, -f, 0], [f, e, 0], [0, 0, 1]])
    )


def rgb(c):
    if isinstance(c, str):
        return np.array([int(c.strip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4)])
    return vec(c)


def smooth(v):
    v = max(0.0, min(1.0, v))
    return v * v * (3 - 2 * v)


def blink_on_twos(seconds, centre, hold=1, *, approach=0.0, release=0.0):
    """Expose a replacement lid for whole poses at two frames per pose and 25 fps."""
    if hold < 1 or int(hold) != hold:
        raise ValueError("hold must be a positive number of complete poses")
    pose = math.floor(seconds * 12.5 + 0.5)
    first = math.floor(centre * 12.5 - (hold - 1) / 2 + 0.5)
    if first <= pose < first + hold:
        return 1.0
    if pose == first - 1:
        return min(1.0, max(0.0, approach))
    if pose == first + hold:
        return min(1.0, max(0.0, release))
    return 0.0


I = np.eye(3)


class Stage:
    def __init__(self):
        self.groups = []
        self.shapes = []
        self.pose = (vec((0, 0, 0)), I, 1.0)
        self.group_start = None
        self.camera((0, 1.25, 4.4), (0, 0.90, 0), 30)
        self.key = (-0.63, 0.87, 0.59)
        self.exposure = 1.0
        self.bounce_clay = False
        self.flag_clay = False
        self.wood = (1.0, 1.0, 1.0)
        self.wall_scale = (0.087, 0.192)

    def camera(self, eye, target, fov, focus=None, aperture=30):
        self.eye = vec(eye)
        self.target = vec(target)
        self.fov = fov
        self.focus = focus or np.linalg.norm(self.eye - self.target)
        self.aperture = aperture

    @contextmanager
    def transform(self, position=(0, 0, 0), angles=(0, 0, 0), scale=1.0):
        old = self.pose
        t, R, k = old
        self.pose = (t + R @ vec(position) * k, R @ rot(*angles), k * scale)
        try:
            yield
        finally:
            self.pose = old

    @contextmanager
    def lump(self):
        if self.group_start is not None:
            raise ValueError("Clay groups cannot nest")
        self.group_start = len(self.shapes)
        self.lower = vec((1e5, 1e5, 1e5))
        self.upper = -self.lower
        try:
            yield
        finally:
            if len(self.shapes) > self.group_start:
                self.groups.append(
                    [*self.lower, self.group_start, *self.upper, len(self.shapes)]
                )
            self.group_start = None

    def focus_on_nearest_eye(self, marks):
        """Place the lens on the near eye surface using marks from the posed head."""
        distances = []
        for centre, axes, radii in marks:
            to_camera = self.eye - centre
            distance = np.linalg.norm(to_camera)
            direction = axes.T @ (to_camera / distance)
            surface_depth = 1.0 / np.linalg.norm(direction / radii)
            distances.append(distance - surface_depth)
        if distances:
            self.focus = min(distances)

    @contextmanager
    def clay_bounce_card(self, negative_fill=False):
        """Illuminate the clay inside this block with a fixed front-right reflector."""
        previous = self.bounce_clay, self.flag_clay
        self.bounce_clay = True
        self.flag_clay = negative_fill
        try:
            yield
        finally:
            self.bounce_clay, self.flag_clay = previous

    def _shape(self, typ, pos, radii, color, R, bevel, blend, cut, mat, rough):
        t, base, k = self.pose
        r = vec(radii) * k
        center = t + base @ vec(pos) * k
        axes = base @ R
        ext = r.copy()
        if typ == 2:
            ext = np.array([max(r[0], r[2]), r[1] + max(r[0], r[2]), max(r[0], r[2])])
        if typ == 3:
            ext[2] = r[0]
        if typ == 23:
            ext[1] += abs(bevel) * k
        if typ == 19:
            ext = np.array([r[0] + 0.050 * k, 0.10 * k + 0.30 * r[1], r[2] + 0.036 * k])
        if typ == 24:
            ext *= np.array([1.40, 1.48, 1.16])
        if typ == 16:
            ext[2] += 0.035 * k
        if typ == 25:
            ext += k * np.array([0.026, 0.025, 0.128])
        if typ == 6:
            ext[1] += 0.045 * k
        if typ == 5:
            ext = np.array([r[0], r[1], r[0]])
        if typ == 4:
            ext = np.array([r[0] + r[2], r[2], r[0] + r[2]])
        extent = np.abs(axes) @ ext + (blend * k * 0.35 + 0.005)
        i = len(self.shapes)
        self.shapes.append(
            [
                *center,
                bevel * k,
                *axes[:, 0],
                r[0],
                *axes[:, 1],
                r[1],
                *axes[:, 2],
                r[2],
                *rgb(color),
                rough,
                typ,
                blend * k,
                -1 if cut else 1,
                (26 if self.flag_clay == "under-chin" else 20 if self.flag_clay else 15)
                if mat == 1 and self.bounce_clay
                else mat,
            ]
        )
        if self.group_start is None:
            self.groups.append([*(center - extent), i, *(center + extent), i + 1])
        elif not cut:
            self.lower = np.minimum(self.lower, center - extent)
            self.upper = np.maximum(self.upper, center + extent)

    def egg(self, p, r, c, angles=(0, 0, 0), blend=0, cut=False, mat=1, rough=0.78):
        self._shape(0, p, r, c, rot(*angles), 0, blend, cut, mat, rough)

    def box(self, p, r, c, angles=(0, 0, 0), bevel=0.02, mat=4, rough=0.71):
        self._shape(
            1, p, r, c, rot(*angles), min(bevel, min(r) * 0.95), 0, False, mat, rough
        )

    def rod(self, a, b, r, c, end=None, blend=0, mat=1, rough=0.76):
        a, b = vec(a), vec(b)
        ey = unit(b - a)
        ex = unit(np.cross(ey, (0, 0, 1) if abs(ey[2]) < 0.9 else (1, 0, 0)))
        ez = np.cross(ex, ey)
        self._shape(
            2,
            (a + b) * 0.5,
            (
                r,
                max(0.0001, np.linalg.norm(b - a) * 0.5),
                end if end is not None else r,
            ),
            c,
            np.column_stack((ex, ey, ez)),
            0,
            blend,
            False,
            mat,
            rough,
        )

    def disc(self, p, r, h, c, angles=(0, 0, 0), bevel=0.01, mat=4, rough=0.65):
        self._shape(
            3, p, (r, h, r), c, rot(*angles), min(h * 0.95, bevel), 0, False, mat, rough
        )

    def collar(
        self, p, outer, inner, half_height, c, angles=(0, 0, 0), mat=4, rough=0.62
    ):
        self._shape(
            5,
            p,
            (outer, half_height, inner),
            c,
            rot(*angles),
            0.002,
            0,
            False,
            mat,
            rough,
        )

    def ring(self, p, r, tube, c, angles=(0, 0, 0), mat=4, rough=0.62):
        self._shape(4, p, (r, tube, tube), c, rot(*angles), 0, 0, False, mat, rough)

    def packet(self, frame):
        camera = [
            *self.eye,
            math.tan(math.radians(self.fov) / 2),
            *self.target,
            self.focus,
            len(self.groups),
            frame,
            self.aperture,
            self.wall_scale[0],
            *self.key,
            self.exposure,
            *self.wood,
            self.wall_scale[1],
        ]
        return b"".join(
            np.asarray(v, dtype="<f4").tobytes()
            for v in [camera, self.groups, self.shapes]
        )


def arm_joint(a, b, outward):
    delta = b - a
    d = np.linalg.norm(delta)
    axis = unit(delta)
    bend = vec((outward, -0.75, -0.31))
    bend = unit(bend - axis * np.dot(bend, axis))
    return (a + b) * 0.5 + bend * math.sqrt(max(0.001, 0.307**2 - (d * 0.5) ** 2))


def open_palm(palm, shoulder, side, amount, pointing=(0.0, 1.0, 0.12)):
    """Author a splayed clay hand in puppet-local space with three distinct pads."""
    palm = vec(palm)
    along = unit(vec(pointing))
    across = unit(np.cross(along, vec((0, 0, 1))))
    wrist = palm - 0.081 * along
    fingers = []
    for lane, length in [(-1, 0.101), (0, 0.118), (1, 0.086)]:
        root = palm + along * 0.032 + across * (0.039 * lane)
        knuckle = root + along * length * 0.59 + across * (0.010 * lane)
        pad = root + along * length + across * (0.026 * lane) + vec((0, 0, 0.016))
        fingers.append((root, knuckle, pad))
    thumb_root = palm - side * 0.052 * across
    thumb_tip = thumb_root - side * 0.070 * across + 0.036 * along + vec((0, 0, 0.035))
    return {
        "amount": amount,
        "palm": palm,
        "wrist": wrist,
        "elbow": arm_joint(vec(shoulder), wrist, side * 0.85),
        "fingers": fingers,
        "thumb": (thumb_root, thumb_tip),
    }


def puppet(
    s,
    position,
    color,
    *,
    yaw=0,
    scale=1,
    head=(0, 0, 0),
    lean=0,
    crouch=0,
    gaze=(0, 0),
    blink=0,
    mouth=0.2,
    smile=0.45,
    hands=None,
    feet=None,
    nose=1,
    aspect=1,
    body_roll=0,
    accessory=None,
    pucker=0,
    lip_seal=0,
    lip_spread=0,
    lip_bite=0,
    mouth_corners=None,
    hand_shapes=None,
    leg_shapes=None,
    look_at=None,
    pressed_face=False,
    eye_marks=None,
    neck_lift=0.0,
    relaxed_lid=0.0,
    pressure_lids=False,
):
    """hands and feet are local contact targets [(left x,y,z),(right x,y,z)]. Forward is +Z."""
    c = rgb(color)
    hands = hands or [(-0.364, 0.70, 0.075), (0.364, 0.70, 0.075)]
    feet = feet or [(-0.145, 0, 0.025), (0.145, 0, -0.015)]
    with s.transform(position, (yaw, 0, 0), scale):

        def spine(y):
            return np.array(
                [
                    math.sin(math.radians(body_roll)) * (y - 0.57),
                    y - crouch,
                    math.sin(math.radians(lean)) * (y - 0.57)
                    + crouch * (1.14 * (y - 0.76) - 0.17),
                ]
            )

        with s.lump():
            s.egg(
                spine(0.85),
                (0.239, 0.325, 0.172),
                c,
                angles=(0, lean, -body_roll),
                blend=0.077,
            )
            s.egg(
                spine(1.08),
                (0.249, 0.252, 0.162),
                c,
                angles=(0, lean, -body_roll),
                blend=0.112,
            )
            # Root the neck inside the back of the jaw. When the face pitches down
            # the top of the neck turns with its socket instead of entering the mouth.
            neck_end = spine(1.47 + neck_lift)
            neck_tip = 0.098
            if mouth_corners is not None:
                neck_end = spine(1.61 + neck_lift) + rot(*head) @ vec(
                    (0, -0.162, -0.080)
                )
                neck_tip = 0.080
            s.rod(spine(1.18), neck_end, 0.116, c, end=neck_tip, blend=0.095)
            for side, foot, hand in zip((-1, 1), feet, hands):
                hip = spine(0.69) + vec((side * 0.135, 0, 0))
                fp = vec(foot)
                ankle = fp + vec((0, 0.125, -0.026))
                knee = (hip + ankle) * 0.5 + vec(
                    (side * (0.018 + crouch * 0.15), 0.006, 0.022 + crouch * 0.55)
                )
                pose = (leg_shapes or {}).get(side)
                foot_angles = (side * 9, 0, 0)
                foot_center = fp + vec((0, 0.063, 0.059))
                if pose:
                    weight = max(0.0, min(1.0, pose["amount"]))
                    leg = ankle - hip
                    distance = max(0.001, np.linalg.norm(leg))
                    axis = leg / distance
                    pole = vec((side * 0.19, 0.0, 1.0))
                    pole = unit(pole - np.dot(pole, axis) * axis)
                    upper, lower = 0.343, 0.319
                    along = min(
                        distance, (distance**2 + upper**2 - lower**2) / (2 * distance)
                    )
                    offset = math.sqrt(max(0, upper**2 - along**2))
                    joint = hip + axis * along + pole * offset
                    knee = (1 - weight) * knee + weight * joint
                    pitch = pose["pitch"] * weight
                    foot_angles = (side * 9, pitch, 0)
                    rotation = rot(*foot_angles)
                    radii = vec((0.123, 0.085, 0.188))
                    # Keep the rotated ellipsoid tangent to the authored sole height.
                    bottom = np.linalg.norm(rotation[1] * radii)
                    foot_center[1] = (
                        fp[1] + (1 - weight) * 0.063 + weight * (bottom - 0.005)
                    )
                    ankle += weight * (
                        rotation @ vec((0, 0.068, -0.066)) - vec((0, 0.068, -0.066))
                    )
                s.rod(hip, knee, 0.117, c, end=0.091, blend=0.067)
                s.rod(knee, ankle, 0.094, c, end=0.081, blend=0.048)
                s.egg(
                    foot_center,
                    (0.123, 0.085, 0.188),
                    c,
                    angles=foot_angles,
                    blend=0.061,
                )
                shoulder = spine(1.19) + vec((side * 0.189, 0, 0))
                finger = vec(hand)
                direction = unit(finger - shoulder)
                wrist = finger - direction * 0.072
                shape = (hand_shapes or {}).get(side)
                weight = max(0.0, min(1.0, shape["amount"])) if shape else 0.0
                if weight:
                    finger = (1 - weight) * finger + weight * vec(shape["palm"])
                    wrist = (1 - weight) * wrist + weight * vec(shape["wrist"])
                elbow = arm_joint(shoulder, wrist, side * 0.85)
                if weight:
                    elbow = (1 - weight) * elbow + weight * vec(shape["elbow"])
                s.rod(shoulder, elbow, 0.087, c, end=0.073, blend=0.065)
                s.rod(elbow, wrist, 0.073, c, end=0.066, blend=0.055)
                thumb_root = finger + vec((-side * 0.055, 0.025, 0.014))
                thumb_pad = finger + vec((-side * 0.096, -0.009, 0.05))
                if weight:
                    s.rod(wrist, finger, 0.062, c, end=0.061, blend=0.029)
                    for root, knuckle, pad in shape["fingers"]:
                        # Curl the two links in the plane of the surface and leave
                        # the pads outside the shell at their authored targets.
                        points = [
                            finger + weight * (vec(p) - vec(shape["palm"]))
                            for p in (root, knuckle, pad)
                        ]
                        s.rod(
                            points[0],
                            points[1],
                            0.030 * weight + 0.001,
                            c,
                            end=0.026 * weight + 0.001,
                            blend=0.016 * weight,
                        )
                        s.rod(
                            points[1],
                            points[2],
                            0.026 * weight + 0.001,
                            c,
                            end=0.021 * weight + 0.001,
                            blend=0.012 * weight,
                        )
                    thumb_root = (1 - weight) * thumb_root + weight * vec(
                        shape["thumb"][0]
                    )
                    thumb_pad = (1 - weight) * thumb_pad + weight * vec(
                        shape["thumb"][1]
                    )
                palm_yaw = weight * shape.get("yaw", 0) if weight else 0
                s.egg(
                    finger,
                    (
                        0.091 - 0.002 * weight,
                        0.112 - 0.060 * weight,
                        0.079 - 0.030 * weight,
                    ),
                    c,
                    angles=(palm_yaw, 0, side * (-12 + 27 * weight)),
                    blend=0.044 - 0.015 * weight,
                )
                s.rod(
                    thumb_root,
                    thumb_pad,
                    0.041 - 0.009 * weight,
                    c,
                    end=0.031 - 0.006 * weight,
                    blend=0.02,
                )
        with s.transform(spine(1.61 + neck_lift), head):
            with s.lump():
                if mouth_corners is None:
                    s.egg((0, 0.01, 0), (0.282 * aspect, 0.309, 0.246), c)
                    s.egg(
                        (0, -0.101, 0.043),
                        (0.221 * aspect, 0.172, 0.218),
                        c,
                        blend=0.049,
                    )
                else:
                    # The ear-side of the head stays registered while the front of the
                    # jaw swings down. The cheek skin stretches over this movement.
                    gape = max(0.0, min(1.0, mouth)) * (1.0 - lip_seal)
                    s._shape(
                        23,
                        (0, 0.01, 0),
                        (0.282 * aspect, 0.309, 0.246),
                        c,
                        I,
                        0.052 * gape,
                        0,
                        False,
                        1,
                        0.78,
                    )
                    hinge = vec((0, -0.018, -0.141))
                    jaw_turn = rot(0, 10.5 * gape, 0)
                    jaw_center = hinge + jaw_turn @ (vec((0, -0.101, 0.043)) - hinge)
                    s._shape(
                        0,
                        jaw_center,
                        (0.221 * aspect, 0.172, 0.218),
                        c,
                        jaw_turn,
                        0,
                        0.049,
                        False,
                        1,
                        0.78,
                    )
                if pressed_face:
                    squeeze = smooth((blink - 0.49) / 0.44) * smooth(
                        (pucker - 0.34) / 0.48
                    )
                    if squeeze and mouth_corners is not None:
                        s.egg(
                            (
                                -0.010 - 0.005 * squeeze,
                                -0.058 + 0.066 * squeeze,
                                0.281 + 0.039 * squeeze,
                            ),
                            (
                                0.063 * nose * squeeze,
                                0.074 * nose * squeeze,
                                0.080 * nose * squeeze,
                            ),
                            c,
                            angles=(-9, 12, 12),
                            blend=0.029 * squeeze,
                        )
                        s.rod(
                            (-0.012, 0.043, 0.228),
                            (-0.015, -0.008, 0.299),
                            0.050 * squeeze,
                            c,
                            end=0.060 * squeeze,
                            blend=0.039 * squeeze,
                        )
                    if squeeze and pressure_lids:
                        # The nose is pinched from the side; its base slumps over the upper lip.
                        s.egg(
                            (-0.010, -0.069 + 0.006 * squeeze, 0.266),
                            (
                                0.072 * nose * squeeze,
                                0.054 * nose * squeeze,
                                0.075 * nose * squeeze,
                            ),
                            c,
                            angles=(-4, 13, 7),
                            blend=0.026 * squeeze,
                        )
                    if squeeze:
                        for side in (-1, 1):
                            cheek = (
                                side * 0.096,
                                -0.053 + 0.020 * squeeze,
                                0.143 + 0.055 * squeeze,
                            )
                            s.egg(
                                cheek,
                                (0.086, 0.046 + 0.005 * side, 0.055),
                                c,
                                angles=(side * 14, 2, -side * 16),
                                blend=0.026,
                            )
                    # A thumb-drawn bridge meets the fuller lower bulb at a slight angle.
                    s.egg(
                        (-0.005 - 0.009 * squeeze, -0.008 + 0.006 * squeeze, 0.224),
                        (0.054 * nose, 0.083 * nose, 0.074 * nose),
                        c,
                        angles=(2, -12, -4),
                        blend=0.034,
                    )
                    s.egg(
                        (
                            0.003 - 0.017 * squeeze,
                            -0.043 + 0.013 * squeeze,
                            0.255 + 0.004 * squeeze,
                        ),
                        (0.071 * nose, 0.064 * nose, 0.087 * nose),
                        c,
                        angles=(-3, 8, -6),
                        blend=0.028,
                    )
                else:
                    s.egg(
                        (0, -0.038, 0.244),
                        (0.078 * nose, 0.069 * nose, 0.108 * nose),
                        c,
                        blend=0.024,
                    )
                socket_exposure = 1 - smooth(
                    (max(blink, 0.85 * relaxed_lid) - 0.025) / 0.29
                )
                if pressed_face and socket_exposure > 0:
                    # Build each socket out of the head clay, then press in an oval seat.
                    # A slight roll and off-center bead expose a crescent of the inner wall.
                    for side in (-1, 1):
                        with s.transform(
                            (side * 0.104 * aspect, 0.066, 0.203),
                            (side * 12, 0, -side * 8),
                        ):
                            s.egg(
                                (
                                    side * 0.002,
                                    -0.003,
                                    -0.025 - 0.033 * (1 - socket_exposure),
                                ),
                                (0.096, 0.115, 0.056),
                                c,
                                blend=0.025,
                            )
                            s.egg(
                                (
                                    -side * 0.004,
                                    -0.002,
                                    0.027 + 0.097 * (1 - socket_exposure),
                                ),
                                (0.083, 0.102, 0.057),
                                c * vec((0.975, 0.942, 0.925)),
                                cut=True,
                            )
                # Press two pads of clay towards the mouth; the cavity cuts through both.
                open_jaw = max(0.0, min(1.0, mouth))
                pursed = max(0.0, min(1.0, pucker))
                seal = max(0.0, min(1.0, lip_seal))
                spread = max(0.0, min(1.0, lip_spread))
                bite = max(0.0, min(1.0, lip_bite))
                width = (0.133 + 0.014 * max(0, smile) + 0.032 * spread) * (
                    1 - 0.62 * pursed
                )
                h = (0.008 + 0.050 * open_jaw + 0.014 * pursed) * (1 - 0.85 * seal)
                front = 0.243 + 0.027 * pursed + 0.012 * seal
                effort = smooth((pursed - 0.65) / 0.30) * smooth(
                    (0.30 - open_jaw) / 0.22
                )
                cavity_width = width * (1 - (0.61 if pressure_lids else 0.69) * effort)
                front += 0.018 * effort
                if look_at is not None and effort < 0.65:
                    cavity_width *= 0.81 - 0.12 * open_jaw
                    h *= 1.0 + 0.12 * open_jaw
                if mouth_corners is not None:
                    from .replacement_mouth import sculpt

                    sculpt(
                        s,
                        c,
                        open_jaw,
                        pursed,
                        spread,
                        seal,
                        bite,
                        effort,
                        mouth_corners,
                    )
                else:
                    if effort > 0.01 and pressure_lids:
                        # Pucker the muzzle into two uneven upper lobes and a lower pad.
                        # Their roots overlap the jaw while the fronts meet at the opening.
                        s.egg(
                            (-0.003, -0.170, 0.212 + 0.008 * effort),
                            (0.091, 0.060, 0.070),
                            c,
                            angles=(-5, 2, 4),
                            blend=0.042,
                        )
                        for side in (-1, 1):
                            s.egg(
                                (
                                    side * 0.028,
                                    -0.117 + 0.003 * side,
                                    0.238 + 0.032 * effort,
                                ),
                                (0.048 + 0.003 * side, 0.042, 0.049),
                                c,
                                angles=(side * 8, 7, -side * 24),
                                blend=0.034,
                            )
                        s.egg(
                            (-0.006, -0.161, 0.234 + 0.033 * effort),
                            (0.058, 0.033, 0.041),
                            c,
                            angles=(-7, 5, -6),
                            blend=0.040,
                        )
                    elif effort > 0.01:
                        # Knead a protruding collar around the small opening. The two
                        # upper pads meet over a fuller lower lip.
                        for side in (-1, 1):
                            s.egg(
                                (side * 0.027, -0.121 + 0.003 * side, front - 0.014),
                                (0.037 + 0.002 * side, 0.035, 0.034),
                                c,
                                angles=(side * 9, 0, -side * 24),
                                blend=0.016,
                            )
                        s.egg(
                            (-0.003, -0.160, front - 0.024),
                            (0.053, 0.032, 0.046),
                            c,
                            angles=(-8, 4, -6),
                            blend=0.017,
                        )
                    if open_jaw + pursed + seal + bite > 0.14 and effort < 0.85:
                        s.egg(
                            (
                                -0.006 * open_jaw if pressed_face else 0,
                                -0.153
                                - (0.030 if pressed_face else 0.035) * open_jaw
                                + 0.012 * bite,
                                front
                                - (0.031 if pressed_face else 0.033)
                                - 0.016 * bite,
                            ),
                            (width * 0.94, 0.042, 0.063),
                            c,
                            blend=0.024,
                        )
                        s.egg(
                            (0, -0.119, front - 0.046),
                            (width * 0.90, 0.033, 0.070),
                            c,
                            blend=0.021,
                        )
                    mouth_shape = 10 if look_at is not None else 6
                    mouth_rounding = 0.0
                    if effort > 0.65:
                        mouth_shape = 17 if pressure_lids else 8
                        if pressure_lids:
                            mouth_rounding = 0.011 * effort
                    elif pressed_face and seal < 0.65:
                        mouth_shape = 12
                        mouth_rounding = (
                            0.016
                            * smooth((h - 0.006) / 0.022)
                            * (1 - smooth(seal / 0.65))
                        )
                    s._shape(
                        mouth_shape,
                        (0, -0.139 - 0.003 * effort, front + 0.012 * effort),
                        (cavity_width, h * (1 - 0.55 * effort), 0.107 - 0.022 * effort),
                        c * 0.55,
                        rot(0, -6, 0),
                        (0.006 + 0.023 * smile) * (1 - 0.90 * effort),
                        mouth_rounding,
                        True,
                        1,
                        0.80,
                    )
                    if effort > 0.65 and not pressure_lids:
                        # Three small ridges sit over the cut. Their taper gives the
                        # pressed opening a soft rim even when the light strikes it sideways.
                        pressure = smooth((effort - 0.65) / 0.35)
                        lip_front = front + 0.010
                        for side in (-1, 1):
                            corner = (
                                side * 0.029,
                                -0.148 + side * 0.002,
                                lip_front - 0.008,
                            )
                            peak = (
                                side * 0.011,
                                -0.129 + side * 0.002,
                                lip_front + 0.005,
                            )
                            s.rod(
                                corner,
                                peak,
                                0.007 * pressure,
                                c,
                                end=0.009 * pressure,
                                blend=0.007 * pressure,
                            )
                            s.rod(
                                peak,
                                (side * 0.002, -0.130, lip_front + 0.005),
                                0.009 * pressure,
                                c,
                                end=0.006 * pressure,
                                blend=0.007 * pressure,
                            )
                            s.rod(
                                (side * 0.023, -0.155, lip_front - 0.005),
                                (-0.003, -0.160, lip_front + 0.004),
                                0.005 * pressure,
                                c,
                                end=0.010 * pressure,
                                blend=0.008 * pressure,
                            )
                for side in (-1, 1):
                    ex = side * 0.104 * aspect
                    with s.transform((ex, 0.066, 0.203), (side * 12, 0, -side * 8)):
                        closure = max(
                            0.0, min(1.0, blink + relaxed_lid * (0.78 + 0.22 * side))
                        )
                        if closure > 0.10:
                            # A single replacement eyelid has a pinched nasal corner.
                            # The shader exposes the underlying eye through the narrowing slit.
                            lid_shape = 11 if pressed_face else 7
                            if pressure_lids and pressed_face and pucker > 0.54:
                                lid_shape = 25 if mouth_corners is not None else 16
                            pad = (
                                smooth((closure - 0.55) / 0.40)
                                if lid_shape == 25
                                else 0.0
                            )
                            s._shape(
                                lid_shape,
                                (
                                    side * (0.002 + 0.004 * pad),
                                    0.003 + side * 0.002 + 0.010 * pad,
                                    0.002 - 0.005 * pad,
                                ),
                                (
                                    0.084 * (1.0 + 0.14 * pad),
                                    (0.097 + side * 0.003) * (1.0 + 0.19 * pad),
                                    (0.056 - side * 0.002) * (1.0 - 0.028 * pad),
                                ),
                                c,
                                I,
                                side * closure * 0.084 * (1.0 + 0.14 * pad),
                                0.009 + 0.011 * pad,
                                False,
                                1,
                                0.63,
                            )
            if mouth_corners is None and mouth > 0.37 and pursed < 0.60 and seal < 0.25:
                s.egg(
                    (
                        -0.009 if look_at is not None else 0,
                        -0.139 - h * (0.71 if look_at is not None else 0.45),
                        0.188 if look_at is not None else 0.200,
                    ),
                    (
                        0.055 if look_at is not None else 0.076,
                        h * (0.32 if look_at is not None else 0.30),
                        0.030,
                    ),
                    c * vec((0.89, 0.53, 0.54)),
                    mat=1,
                )
            for side in (-1, 1):
                ex = side * 0.104 * aspect
                open_ = max(0.05, 1 - blink)
                with s.transform((ex, 0.066, 0.203), (side * 12, 0, -side * 8)):
                    if eye_marks is not None:
                        centre, axes, size = s.pose
                        eye_marks.append(
                            (
                                centre.copy(),
                                axes.copy(),
                                size * vec((0.080, 0.101, 0.058)),
                            )
                        )
                    if look_at is not None:
                        closure = max(
                            0.0, min(1.0, blink + relaxed_lid * (0.78 + 0.22 * side))
                        )
                        if closure < 0.96:
                            center, axes, _ = s.pose
                            direct = unit(axes.T @ (vec(look_at) - center))
                            aim = np.array([direct[0] * 0.60, direct[1] * 0.50])
                            magnitude = np.linalg.norm(aim)
                            if magnitude > 0.66:
                                aim *= 0.66 / magnitude
                            bead = (
                                socket_exposure
                                * vec(
                                    (
                                        0.006 * aim[0] + side * 0.004,
                                        0.003 + 0.003 * aim[1],
                                        0.002,
                                    )
                                )
                                if pressed_face
                                else (0, 0, 0)
                            )
                            radii = (
                                (0.080, 0.101, 0.058)
                                if pressed_face
                                else (0.080, 0.101, 0.058)
                            )
                            clay_reflection = (
                                (0.24 + max(0.0, min(0.76, 1.24 * (c[0] - c[2]))))
                                if mouth_corners is not None
                                else 0.0
                            )
                            s._shape(
                                9,
                                bead,
                                radii,
                                (aim[0], aim[1], clay_reflection),
                                I,
                                side * 0.080 * closure,
                                0,
                                False,
                                12,
                                0.74,
                            )
                    elif blink < 0.86:
                        s.egg(
                            (0, 0, 0),
                            (0.081, 0.104 * open_, 0.059),
                            "#f2e8d5",
                            mat=0,
                            rough=0.58,
                        )
                        gx = max(-0.038, min(0.038, gaze[0] * 0.037))
                        gy = max(-0.038, min(0.038, gaze[1] * 0.035)) * open_
                        depth = 0.055 * math.sqrt(
                            max(
                                0.1, 1 - (gx / 0.081) ** 2 - (gy / (0.104 * open_)) ** 2
                            )
                        )
                        s.egg(
                            (gx, gy, depth),
                            (0.032, 0.040 * open_, 0.013),
                            "#291f1c",
                            mat=0,
                            rough=0.54,
                        )
            if accessory:
                accessory(s)


def roll_into_ball(
    stage, start, group_start, origin, amount, angle, color, compression=0.0
):
    """Retract the extremities into a hand-rolled body around its floor contact."""
    if amount <= 0:
        return
    rad = 0.295 * amount
    center = vec(origin) + np.array([0, 0, 0.018])
    center[1] = rad * (0.98 + 0.015 * math.sin(angle * 0.06)) * (1 - 0.31 * compression)
    shrink = 1 - amount * 0.97
    pivot = vec((origin[0], 0, origin[2]))
    twist = rot(0, 0, -30 * amount)
    for shape in stage.shapes[start:]:
        pos = pivot + twist @ (vec(shape[:3]) - pivot) * shrink
        shape[:3] = pos.tolist()
        for j in (4, 8, 12):
            shape[j : j + 3] = (twist @ vec(shape[j : j + 3])).tolist()
            shape[j + 3] *= shrink
        shape[3] *= shrink
    # A rotated emerging silhouette can extend outside its original upright group.
    for group in stage.groups[group_start:]:
        group[:3] = np.minimum(vec(group[:3]), pivot - vec((0.93, 0.05, 0.38))).tolist()
        group[4:7] = np.maximum(
            vec(group[4:7]), pivot + vec((0.93, 1.18, 0.48))
        ).tolist()
    with stage.transform(center):
        with stage.lump():
            stage.egg(
                (0, 0, 0),
                (
                    rad * (1 + 0.14 * compression),
                    rad
                    * (0.98 + 0.015 * math.sin(angle * 0.06))
                    * (1 - 0.31 * compression),
                    rad * (0.98 + 0.09 * compression),
                ),
                color,
            )
            rolling = rot(0, 0, -angle)
            pressure = vec(
                (1 + 0.14 * compression, 1 - 0.31 * compression, 1 + 0.09 * compression)
            )
            seam = pressure * (
                rolling @ vec((-0.09 * amount, 0.27 * amount, 0.035 * amount))
            )
            dent = pressure * (rolling @ vec((rad * 0.81, rad * 0.26, rad * 0.42)))
            stage.egg(
                seam,
                (0.091 * amount, 0.029 * amount, 0.060 * amount),
                color,
                angles=(0, 0, -angle),
                blend=0.012 * amount,
            )
            stage.egg(
                dent,
                (0.055 * amount, 0.030 * amount, 0.064 * amount),
                color,
                angles=(0, 0, -angle),
                cut=True,
            )
