@echo off
title NEXORA V1 - Smart Public Transport & Emergency Response System
echo ===================================================================
echo   NEXORA V1 — Starting Central Server and All Portals
echo ===================================================================
echo.
echo Running pre-flight database verification...
python seed.py
echo.
echo Starting NEXORA System Server...
python run_nexora.py
pause
