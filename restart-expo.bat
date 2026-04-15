@echo off
echo Arret des processus Node...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Demarrage d'Expo avec cache clear...
cd /d "%~dp0"
start cmd /k "npx expo start --clear"

echo.
echo ============================================
echo Expo redemarre !
echo 1. Fermez completement Expo Go sur le telephone
echo 2. Scannez le nouveau QR code
echo ============================================
pause
