@echo off
echo Basculement vers Reseau 1 (10.160.93.122)...
copy /Y .env.network1 .env
echo Configuration mise a jour !
echo Redemarrez Expo avec: npm run start
pause
