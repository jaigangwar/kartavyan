"""Small, dependency-light 18.5–19.5 kHz FSK handshake helpers."""
from __future__ import annotations

import math
from array import array
from dataclasses import dataclass

FREQ_ZERO = 18_500
FREQ_ONE = 19_500
SAMPLE_RATE = 48_000
SYMBOL_SECONDS = 0.045


def token_to_bits(token: str) -> str:
    raw = token.encode("ascii", errors="ignore")
    return "".join(f"{byte:08b}" for byte in raw)


def bits_to_token(bits: str) -> str:
    usable = bits[: len(bits) // 8 * 8]
    raw = bytes(int(usable[i : i + 8], 2) for i in range(0, len(usable), 8))
    return raw.decode("ascii", errors="ignore")


def generate_waveform(token: str, amplitude: float = 0.12, sample_rate: int = SAMPLE_RATE) -> array:
    samples = array("f")
    count = max(1, int(SYMBOL_SECONDS * sample_rate))
    for bit in token_to_bits(token):
        frequency = FREQ_ONE if bit == "1" else FREQ_ZERO
        for index in range(count):
            envelope = min(1.0, index / 160) * min(1.0, (count - index) / 160)
            samples.append(amplitude * envelope * math.sin(2 * math.pi * frequency * index / sample_rate))
    return samples


def dominant_frequency(samples: list[float], target: int, sample_rate: int = SAMPLE_RATE) -> float:
    real = 0.0
    imag = 0.0
    for index, value in enumerate(samples):
        angle = 2 * math.pi * target * index / sample_rate
        real += value * math.cos(angle)
        imag -= value * math.sin(angle)
    return (real * real + imag * imag) ** 0.5


def decode_window(samples: list[float], sample_rate: int = SAMPLE_RATE) -> str:
    midpoint = int(SYMBOL_SECONDS * sample_rate)
    bits: list[str] = []
    for start in range(0, len(samples) - midpoint + 1, midpoint):
        window = samples[start : start + midpoint]
        zero = dominant_frequency(window, FREQ_ZERO, sample_rate)
        one = dominant_frequency(window, FREQ_ONE, sample_rate)
        bits.append("1" if one > zero else "0")
    return bits_to_token("".join(bits))


@dataclass
class UltrasonicHandshake:
    token: str

    def emit(self) -> bool:
        try:
            import numpy as np
            import sounddevice as sd

            waveform = np.asarray(generate_waveform(self.token), dtype=np.float32)
            sd.play(waveform, samplerate=SAMPLE_RATE, blocking=False)
            return True
        except Exception:
            return False
