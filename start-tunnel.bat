@echo off
echo Demarrage d'Expo en mode Tunnel...
echo.
echo MODE TUNNEL : Utilise les serveurs Expo pour contourner les problemes de reseau local
echo.
cd /d "%~dp0"
npx expo start --tunnel
