import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { colors } from '../theme/colors';

export const DevDebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false);
  const auth = useSelector((state: RootState) => state.auth);

  if (!__DEV__) return null;

  return (
    <>
      {/* Toggle Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsVisible(!isVisible)}
      >
        <Text style={styles.toggleButtonText}>
          {isVisible ? '🔽' : '🔼'} DEBUG
        </Text>
      </TouchableOpacity>

      {/* Debug Panel */}
      {isVisible && (
        <Card style={styles.panel}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.title}>
              🛠️ Debug Info
            </Text>

            <View style={styles.row}>
              <Text style={styles.label}>Authenticated:</Text>
              <Text style={[styles.value, auth.isAuthenticated ? styles.success : styles.error]}>
                {auth.isAuthenticated ? '✅ YES' : '❌ NO'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Is Driver:</Text>
              <Text style={[styles.value, auth.isDriver ? styles.success : styles.gray]}>
                {auth.isDriver ? '🚚 YES' : '❌ NO'}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Driver ID:</Text>
              <Text style={styles.value}>{auth.driverId || 'null'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>User ID:</Text>
              <Text style={styles.value}>{auth.user?.id || 'null'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{auth.user?.email || 'null'}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Token:</Text>
              <Text style={styles.value} numberOfLines={1}>
                {auth.token ? `${auth.token.substring(0, 20)}...` : 'null'}
              </Text>
            </View>

            <View style={styles.separator} />

            <Text variant="labelSmall" style={styles.subtitle}>
              Raw User Object:
            </Text>
            <Text style={styles.json}>{JSON.stringify(auth.user, null, 2)}</Text>
          </Card.Content>
        </Card>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 9999,
    elevation: 5,
  },
  toggleButtonText: {
    color: colors.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  panel: {
    position: 'absolute',
    bottom: 60,
    left: 10,
    right: 10,
    maxHeight: 400,
    zIndex: 9998,
    elevation: 10,
    backgroundColor: colors.white,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  subtitle: {
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.gray,
  },
  value: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  success: {
    color: colors.success,
  },
  error: {
    color: colors.error,
  },
  gray: {
    color: colors.gray,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  json: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: colors.text.secondary,
  },
});
