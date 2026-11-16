@echo off
REM Starts the JARVIS phone server. Double-click to run it now,
REM or let Windows run it at startup (see install-autostart.cmd).
REM It goes to the jarvis folder (one level up from this script) and runs the server.
cd /d "%~dp0.."
call npm run serve
