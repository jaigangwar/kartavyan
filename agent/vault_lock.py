"""Kartavya Vault controller and tempo-invariant knock verifier."""
from __future__ import annotations

import ctypes
import platform
import threading
import time
from dataclasses import dataclass, field
from typing import Callable


@dataclass
class KnockVerifier:
    expected: list[int] = field(default_factory=lambda: [220, 220, 480])
    tolerance: float = 0.34
    max_attempts: int = 3
    lockout_seconds: int = 30
    attempts: int = 0
    locked_until: float = 0.0

    def verify(self, intervals: list[int]) -> tuple[bool, str]:
        now = time.monotonic()
        if now < self.locked_until:
            return False, f"LOCKOUT_ACTIVE:{round(self.locked_until - now)}"
        if len(intervals) != len(self.expected):
            return self._fail("RHYTHM_LENGTH")
        ratios = [a / max(b, 1) for a, b in zip(intervals, self.expected)]
        valid = all(1 - self.tolerance <= ratio <= 1 + self.tolerance for ratio in ratios)
        if valid:
            self.attempts = 0
            return True, "RHYTHM_ACCEPTED"
        return self._fail("RHYTHM_MISMATCH")

    def _fail(self, reason: str) -> tuple[bool, str]:
        self.attempts += 1
        if self.attempts >= self.max_attempts:
            self.locked_until = time.monotonic() + self.lockout_seconds
            self.attempts = 0
            return False, f"{reason}:LOCKOUT_30S"
        return False, f"{reason}:ATTEMPT_{self.attempts}"


class VaultController:
    def __init__(self, mock: bool = True, on_change: Callable[[bool], None] | None = None) -> None:
        self.mock = mock
        self.on_change = on_change
        self.locked = False
        self.verifier = KnockVerifier()
        self._thread: threading.Thread | None = None

    def lock(self, reason: str = "remote") -> None:
        self.locked = True
        if self.on_change:
            self.on_change(True)
        if not self.mock:
            self._thread = threading.Thread(target=self._show_overlay, args=(reason,), daemon=True)
            self._thread.start()

    def unlock(self) -> None:
        self.locked = False
        if self.on_change:
            self.on_change(False)

    def verify_knock(self, intervals: list[int]) -> tuple[bool, str]:
        valid, reason = self.verifier.verify(intervals)
        if valid:
            self.unlock()
        return valid, reason

    def native_os_lock(self) -> bool:
        if platform.system() != "Windows":
            return False
        try:
            return bool(ctypes.windll.user32.LockWorkStation())
        except Exception:
            return False

    def _show_overlay(self, reason: str) -> None:  # pragma: no cover - Windows UI path
        try:
            import tkinter as tk

            root = tk.Tk()
            root.title("KARTAVYA VAULT")
            root.attributes("-fullscreen", True)
            root.attributes("-topmost", True)
            root.configure(bg="#08080A")
            tk.Label(root, text="KARTAVYA VAULT", fg="#FF4F00", bg="#08080A", font=("Consolas", 28, "bold")).pack(expand=True)
            tk.Label(root, text=f"INPUTS FROZEN // {reason.upper()}", fg="#F4F4F6", bg="#08080A", font=("Consolas", 12)).pack()
            root.protocol("WM_DELETE_WINDOW", root.destroy)
            root.mainloop()
        except Exception:
            return
