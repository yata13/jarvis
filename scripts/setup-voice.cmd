@echo off
REM Downloads the voice tools once, into the voice-tools folder:
REM   - whisper.cpp (whisper-cli.exe): turns your voice into text, on your PC
REM   - ffmpeg: records your microphone
REM   - a small Whisper model (ggml-tiny.en, about 75 MB)
REM Everything is free and works offline after this.
REM Total download is about 160 MB, so it can take a few minutes.

setlocal
cd /d "%~dp0.."
set ROOT=%cd%\voice-tools
echo Installing voice tools into: %ROOT%
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ErrorActionPreference='Stop';" ^
  "$root='%ROOT%';" ^
  "New-Item -ItemType Directory -Force -Path $root,\"$root\whisper\",\"$root\models\",\"$root\ffmpeg\" | Out-Null;" ^
  "$tmp=Join-Path $env:TEMP 'jarvis-voice';" ^
  "New-Item -ItemType Directory -Force -Path $tmp | Out-Null;" ^
  "Write-Host '1/3 Downloading whisper.cpp...';" ^
  "Invoke-WebRequest 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip' -OutFile \"$tmp\w.zip\";" ^
  "Expand-Archive -Force \"$tmp\w.zip\" \"$tmp\w\";" ^
  "Copy-Item \"$tmp\w\Release\*\" \"$root\whisper\\" -Force;" ^
  "Write-Host '2/3 Downloading the Whisper model (about 75 MB)...';" ^
  "Invoke-WebRequest 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin' -OutFile \"$root\models\ggml-tiny.en.bin\";" ^
  "Write-Host '3/3 Downloading ffmpeg (about 80 MB)...';" ^
  "Invoke-WebRequest 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile \"$tmp\f.zip\";" ^
  "Expand-Archive -Force \"$tmp\f.zip\" \"$tmp\f\";" ^
  "$exe=Get-ChildItem \"$tmp\f\" -Recurse -Filter ffmpeg.exe | Select-Object -First 1;" ^
  "Copy-Item $exe.FullName \"$root\ffmpeg\ffmpeg.exe\" -Force;" ^
  "Remove-Item -Recurse -Force $tmp;" ^
  "Write-Host 'Done.'"

if errorlevel 1 (
  echo.
  echo Something went wrong. Check your internet and run this again.
) else (
  echo.
  echo Voice is ready. Start JARVIS with: npm start
  echo Then type: talk
)
pause
