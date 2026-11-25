"""A felt tip moving across paper. Close marks share one continuous contact."""
import numpy as np
from scipy import signal


def rms(x):
    return max(float(np.sqrt(np.mean(np.square(x, dtype=np.float64)))), 1e-10)


def render_foley(events, samples, sample_rate, voice, speaking, relative_db=-32):
    control_rate = 200
    ncontrol = int(np.ceil(samples * control_rate / sample_rate)) + 1
    pressure = np.zeros(ncontrol)
    kinds = {'line': 1.0, 'write': 0.79, 'dash': 0.68, 'hatch': 0.64}
    paper = np.zeros((samples, 2), dtype=np.float32)
    rng = np.random.default_rng(731)
    voice_rms = rms(voice[speaking])

    def texture(size, band):
        sos = signal.butter(2, band, btype='bandpass', fs=sample_rate, output='sos')
        return signal.sosfilt(sos, rng.standard_normal(size))

    for event in events:
        t, duration, kind = event['t'], event.get('d', 0.1), event['type']
        if kind in kinds:
            a = max(0, round(t * control_rate))
            b = min(ncontrol, max(a + 1, round((t + duration) * control_rate)))
            weight = kinds[kind] * np.clip(event.get('v', 1200) / 2100, 0.56, 1)
            pressure[a:b] = np.maximum(pressure[a:b], weight)
        elif kind in ('peel', 'push'):
            a = max(0, round(t * sample_rate))
            n = min(samples - a, round(duration * sample_rate))
            if n < 2:
                continue
            is_page = kind == 'peel'
            wave = texture(n, (210, 1950) if is_page else (130, 570))
            u = np.linspace(0, 1, n)
            wave *= np.sin(np.pi * u) ** (1.6 if is_page else 2.4)
            level = voice_rms * 10 ** ((-24 if is_page else -36) / 20)
            wave *= min(level / rms(wave), 0.030 / max(np.abs(wave).max(), 1e-8))
            paper[a:a + n] += wave[:, None] * np.array([0.95, 1.0])

    # A nib resting on the page doesn't strike it again with each small letter or hatch.
    active = np.flatnonzero(pressure > 0)
    for left, right in zip(active[:-1], active[1:]):
        if 1 < right - left <= 0.1 * control_rate:
            pressure[left+1:right] = np.linspace(pressure[left], pressure[right], right-left+1)[1:-1]
    weight = 1 - np.exp(-1 / (0.028 * control_rate))
    for _ in range(2):
        pressure = signal.lfilter([weight], [1, weight-1], pressure)
    times = np.arange(samples) / sample_rate
    envelope = np.interp(times, np.arange(ncontrol) / control_rate, pressure)
    main = texture(samples, (240, 1470))
    edge = texture(samples, (950, 2150))
    grain = signal.sosfilt(signal.butter(2, 12, fs=sample_rate, output='sos'), rng.standard_normal(samples))
    rub = (main + 0.12 * edge) * envelope * (0.9 + 0.1 * np.tanh(grain / rms(grain)))
    pen = np.column_stack((rub, 0.97*rub)).astype(np.float32)
    target = voice_rms * 10 ** (relative_db/20)
    pen *= min(target / rms(pen[speaking]), 0.025 / max(np.abs(pen).max(), 1e-8))
    return pen, paper
