// app.config.js extends app.json and injects secrets that cannot live in a static JSON file.
// Expo merges this with app.json at build time (app.config.js takes precedence).
const base = require('./app.json').expo;

module.exports = ({ config }) => ({
  ...base,
  android: {
    ...base.android,
    config: {
      googleMaps: {
        // Reuses the Maps Platform key already present in .env / EAS secrets.
        // Make sure the key has "Maps SDK for Android" enabled in Google Cloud Console.
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? '',
      },
    },
  },
  plugins: [
    // Preserve all plugins from app.json
    ...base.plugins,
    // Mapbox — provides the download token so Gradle can fetch Mapbox Maven artifacts.
    // RNMAPBOX_MAPS_DOWNLOAD_TOKEN must be set in EAS secrets (eas secret:create).
    ['@rnmapbox/maps', {
      RNMapboxMapsDownloadToken: process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN ?? '',
    }],
  ],
});
