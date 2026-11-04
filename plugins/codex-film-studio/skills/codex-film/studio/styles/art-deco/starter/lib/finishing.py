"""Deterministic monochrome film finish, applied in limited-range YUV."""
import hashlib
import json


def encoding_finish(path):
    scale = 'scale=in_range=full:out_range=tv:in_color_matrix=bt601:out_color_matrix=bt709'
    if not path.exists():
        return scale + ',setsar=1', [], None
    content = path.read_bytes()
    profile = json.loads(content)
    if set(profile) != {'schema', 'luma_grain_strength', 'grain_seed'} or profile['schema'] != 1:
        raise ValueError('Unsupported finishing profile')
    strength, seed = profile['luma_grain_strength'], profile['grain_seed']
    if type(strength) is not int or not 0 <= strength <= 10:
        raise ValueError('Luma grain strength must be an integer from 0 to 10')
    if type(seed) is not int or not 0 <= seed <= 2147483647:
        raise ValueError('Grain seed must be a nonnegative signed 32-bit integer')
    filters = scale + ',format=yuv420p'
    if strength:
        filters += f',noise=c0s={strength}:c0f=t+u:c0_seed={seed},limiter=min=16:max=235:planes=1'
    record = {'profile': profile, 'sha256': hashlib.sha256(content).hexdigest()}
    return filters + ',setsar=1', (['-tune', 'grain'] if strength else []), record
