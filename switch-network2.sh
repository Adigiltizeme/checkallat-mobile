#!/bin/bash
echo "Basculement vers Réseau 2 (192.168.1.55)..."
cp .env.network2 .env
echo "✓ Configuration mise à jour !"
echo "Redémarrez Expo avec: npm run start"
