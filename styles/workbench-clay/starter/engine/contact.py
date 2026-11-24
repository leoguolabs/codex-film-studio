"""World-space contact for a rigid sphere, an oriented pad and a planar surface."""
import numpy as np
from scipy.spatial.transform import Rotation

def _unit_normal(normal):
    normal = np.asarray(normal, dtype=float)
    length = np.linalg.norm(normal)
    if normal.shape != (3,) or not np.isfinite(length) or length <= 0:
        raise ValueError("Supply a finite nonzero three-dimensional contact normal")
    return normal / length

def roll_step(displacement, radius, surface_normal=(0, 1, 0)):
    """World rotation for a no-slip translation. Apply to the previous attitude on the left."""
    if not np.isfinite(radius) or radius <= 0:
        raise ValueError("The rolling radius must be positive")
    axis_angle = np.cross(_unit_normal(surface_normal), displacement) / radius
    return Rotation.from_rotvec(axis_angle)

def touching_pad_center(sphere_center, sphere_radius, axes, pad_radii, normal):
    """Place an ellipsoid tangent to a sphere. The normal points from pad into sphere."""
    if not np.isfinite(sphere_radius) or sphere_radius <= 0:
        raise ValueError("The sphere radius must be positive")
    radii = np.asarray(pad_radii, dtype=float)
    if radii.shape != (3,) or not np.all(np.isfinite(radii) & (radii > 0)):
        raise ValueError("Supply three positive pad radii")
    axes = np.asarray(axes, dtype=float)
    n = _unit_normal(normal)
    local_normal = axes.T @ n
    offset = axes @ (radii**2 * local_normal) / np.linalg.norm(radii * local_normal)
    return np.asarray(sphere_center) - sphere_radius*n - offset


def fixed_pivot_center(rest_center, rest_axes, turned_axes, local_pivot):
    """Move a rigid object's centre so one point stays on its original world support."""
    pivot = np.asarray(local_pivot, dtype=float)
    return np.asarray(rest_center) + np.asarray(rest_axes) @ pivot - np.asarray(turned_axes) @ pivot
