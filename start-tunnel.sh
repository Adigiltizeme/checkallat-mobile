#!/bin/bash
echo "Démarrage d'Expo en mode Tunnel..."
echo ""
echo "MODE TUNNEL : Utilise les serveurs Expo pour contourner les problèmes de réseau local"
echo ""
cd "$(dirname "$0")"
npx expo start --tunnel
