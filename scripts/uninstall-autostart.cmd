@echo off
REM Run this if you no longer want the server to start with Windows.
powershell -NoProfile -Command "Remove-Item ([Environment]::GetFolderPath('Startup')+'\JARVIS Server.lnk') -ErrorAction SilentlyContinue"
echo Removed JARVIS from Windows startup.
pause
