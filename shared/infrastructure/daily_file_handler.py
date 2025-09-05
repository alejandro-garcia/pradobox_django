import logging
import os
from datetime import datetime
from pathlib import Path
from threading import RLock


class DailyFileHandler(logging.Handler):
    """
    A simple daily log file handler for Windows-friendly rotation without renaming.
    - Creates files with a date suffix: e.g., app-2025-09-04.log
    - On date change, closes the current stream and opens a new dated file.
    - Avoids renaming the current log file (prevents WinError 32 due to file locks).

    Config params (via dictConfig):
      class: 'shared.infrastructure.daily_file_handler.DailyFileHandler'
      filename: 'C:/apps/pradobox/logs/app.log'   # base file path; date suffix will be added
      encoding: 'utf-8'
      level: 'INFO'
    """

    def __init__(self, filename: str, encoding: str = 'utf-8'):
        super().__init__()
        self.base_path = Path(filename)
        self.encoding = encoding
        self._stream = None
        self._current_date = None
        self._lock = RLock()
        # Ensure directory exists
        self.base_path.parent.mkdir(parents=True, exist_ok=True)
        # Open initial stream
        self._open_new_stream()

    def _dated_path(self, dt: datetime) -> Path:
        date_suffix = dt.strftime('%Y-%m-%d')
        return self.base_path.with_name(f"{self.base_path.stem}-{date_suffix}{self.base_path.suffix or '.log'}")

    def _open_new_stream(self):
        dt = datetime.now()
        target = self._dated_path(dt)
        self._current_date = dt.date()
        # Open file in append mode
        self._stream = open(target, mode='a', encoding=self.encoding, buffering=1)

    def _should_rollover(self) -> bool:
        return datetime.now().date() != self._current_date

    def emit(self, record: logging.LogRecord) -> None:
        try:
            msg = self.format(record)
            with self._lock:
                if self._should_rollover():
                    self._do_rollover()
                self._stream.write(msg + os.linesep)
        except Exception:
            self.handleError(record)

    def _do_rollover(self):
        try:
            if self._stream:
                self._stream.close()
        finally:
            self._open_new_stream()

    def close(self):
        try:
            with self._lock:
                if self._stream:
                    try:
                        self._stream.close()
                    finally:
                        self._stream = None
        finally:
            super().close()
