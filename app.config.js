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
});
