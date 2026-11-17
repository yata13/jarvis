@echo off
REM Runs setup-voice.ps1 to download the voice tools (whisper, model, ffmpeg).
REM The real work is in the .ps1 file next to this one, so quoting stays simple.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-voice.ps1"
if errorlevel 1 (
  echo.
  echo Something went wrong. Check your internet and run this again.
) else (
  echo.
  echo Done.
)
pause
