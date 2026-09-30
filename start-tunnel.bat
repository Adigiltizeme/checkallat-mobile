@echo off
echo Demarrage en mode Tunnel (backend Railway)...
echo.

:: Remplace EXPO_PUBLIC_API_URL par l'URL Railway dans .env
powershell -NoProfile -Command ^
  "(Get-Content '.env') -replace '^EXPO_PUBLIC_API_URL=.*', 'EXPO_PUBLIC_API_URL=https://checkallat-backend-production.up.railway.app/api/v1' | Set-Content '.env'"

echo Backend : Railway (accessible depuis n'importe quel reseau)
echo.
cd /d "%~dp0"
npx expo start --tunnel

:: A la fermeture d'Expo, restaurer l'URL locale
echo.
echo Restauration de l'URL locale...
powershell -NoProfile -Command ^
  "(Get-Content '.env') -replace '^EXPO_PUBLIC_API_URL=.*', 'EXPO_PUBLIC_API_URL=http://192.168.1.28:4000/api/v1' | Set-Content '.env'"
echo URL locale restauree.
pause
