@echo off
REM Run this ONCE. It makes Windows start the JARVIS server by itself when you log in.
REM It puts a shortcut to start-server.cmd in your Startup folder.
set "TARGET=%~dp0start-server.cmd"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$w=New-Object -ComObject WScript.Shell; $p=[Environment]::GetFolderPath('Startup')+'\JARVIS Server.lnk'; $s=$w.CreateShortcut($p); $s.TargetPath=$env:TARGET; $s.WindowStyle=7; $s.Save()"
echo.
echo Done. The JARVIS server will now start when Windows starts (as a small window).
echo (Ollama already starts by itself.)
echo To test it now, double-click start-server.cmd
pause
