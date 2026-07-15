// Dynamic Expo config — extends app.json with env-var-dependent plugin settings.
// This file takes precedence over app.json for the fields it defines.
module.exports = ({ config }) => {
  return {
    ...config,
    updates: {
      url: "https://u.expo.dev/c7b49218-9afc-4e25-9c72-9dc29e40917d",
    },
    runtimeVersion: {
      policy: "appVersion",
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
      "expo-secure-store",
      [
        'expo-build-properties',
        {
          android: {
            usesCleartextTraffic: true,
          },
        },
      ],
      '@rnmapbox/maps',
      '@react-native-community/datetimepicker',
      "@sentry/react-native",
      // OU "@sentry/react-native/expo", {
      //   organization: "digiltizeme",
      //   project: "checkallat-mobile",
      // }
    ],
  };
};
