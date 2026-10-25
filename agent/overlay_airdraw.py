"""Air-draw stroke buffer shared by the WebSocket agent and an optional overlay."""
from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable


@dataclass
class Stroke:
    points: list[tuple[float, float]]
    color: str = "#FF4F00"
    width: float = 4.0


class AirDrawOverlay:
    def __init__(self, mock: bool = True) -> None:
        self.mock = mock
        self.strokes: list[Stroke] = []

    def add_stroke(self, points: Iterable[tuple[float, float]], color: str = "#FF4F00", width: float = 4.0) -> Stroke:
        stroke = Stroke(list(points), color, width)
        self.strokes.append(stroke)
        return stroke

    def clear(self) -> None:
        self.strokes.clear()

    def snapshot(self) -> list[dict]:
        return [asdict(stroke) for stroke in self.strokes]

    def show(self) -> None:
        """Hook for a native transparent overlay; the browser simulator remains the default."""
        return

    def hide(self) -> None:
        return
