// app.config.js étend app.json via le paramètre `config` fourni par Expo (pattern officiel).
// Les valeurs de app.json sont automatiquement mergées dans config avant que cette fonction soit appelée.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
      },
    },
  },
  plugins: [
    ...(config.plugins ?? []),
    '@rnmapbox/maps',
    // Sons courts joués application ouverte : ni micro, ni lecture en arrière-plan (évite des permissions
    // et déclarations inutiles sur les stores)
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false, enableBackgroundPlayback: false }],
    'expo-font'
  ],
});
