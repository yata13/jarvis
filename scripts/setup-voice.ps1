# Downloads the voice tools once, into the voice-tools folder:
#   - whisper.cpp (whisper-cli.exe): turns your voice into text, on your PC
#   - a small Whisper model (ggml-tiny.en, about 75 MB)
#   - ffmpeg: records your microphone
# Everything is free and works offline after this. About 160 MB total.

$ErrorActionPreference = 'Stop'
# Make downloads work on older Windows, and much faster (no progress-bar slowdown).
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'

$root = Join-Path (Split-Path $PSScriptRoot -Parent) 'voice-tools'
$whisperDir = Join-Path $root 'whisper'
$modelDir = Join-Path $root 'models'
$ffmpegDir = Join-Path $root 'ffmpeg'
Write-Host "Installing voice tools into: $root"
New-Item -ItemType Directory -Force -Path $root, $whisperDir, $modelDir, $ffmpegDir | Out-Null

$tmp = Join-Path $env:TEMP 'jarvis-voice'
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

Write-Host '1/3 Downloading whisper.cpp (small)...'
$wzip = Join-Path $tmp 'whisper.zip'
Invoke-WebRequest 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip' -OutFile $wzip
$wout = Join-Path $tmp 'whisper'
Expand-Archive -Force -Path $wzip -DestinationPath $wout
Copy-Item -Path (Join-Path $wout 'Release\*') -Destination $whisperDir -Force

Write-Host '2/3 Downloading the Whisper model (about 75 MB)...'
$model = Join-Path $modelDir 'ggml-tiny.en.bin'
Invoke-WebRequest 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-tiny.en.bin' -OutFile $model

Write-Host '3/3 Downloading ffmpeg (about 80 MB)...'
$fzip = Join-Path $tmp 'ffmpeg.zip'
Invoke-WebRequest 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile $fzip
$fout = Join-Path $tmp 'ffmpeg'
Expand-Archive -Force -Path $fzip -DestinationPath $fout
$exe = Get-ChildItem -Path $fout -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1
Copy-Item -Path $exe.FullName -Destination (Join-Path $ffmpegDir 'ffmpeg.exe') -Force

Remove-Item -Recurse -Force $tmp
Write-Host ''
Write-Host 'Voice is ready. Start JARVIS with: npm start   then type: talk'
