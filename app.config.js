// Dynamic Expo config — extends app.json with env-var-dependent plugin settings.
// This file takes precedence over app.json for the fields it defines.
module.exports = ({ config }) => {
  return {
    ...config,
    updates: {
      enabled: false,
    },
    plugins: [
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow CheckAll@t to use your location for nearby pros.',
        },
      ],
      'expo-localization',
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
      '@rnmapbox/maps',
    ],
  };
};
