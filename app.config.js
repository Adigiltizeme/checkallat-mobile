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
    ['@rnmapbox/maps', {
      RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ?? '',
    }],
  ],
});
