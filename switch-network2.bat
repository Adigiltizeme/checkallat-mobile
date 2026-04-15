@echo off
echo Basculement vers Reseau 2 (192.168.1.55)...
copy /Y .env.network2 .env
echo Configuration mise a jour !
echo Redemarrez Expo avec: npm run start
pause
