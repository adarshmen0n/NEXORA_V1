@echo off
title NEXORA V1 - Worldwide Internet Tunnel (Cloudflare)
echo ===================================================================
echo   NEXORA V1 — Public Internet Tunnel for Different Locations / 4G
echo ===================================================================
echo.
echo Starting secure HTTPS tunnel to port 8000...
echo.
echo Look for the link ending in ".trycloudflare.com" below.
echo Share that link with your Driver, Passenger, and Responder!
echo.
echo ===================================================================
"C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000
pause
