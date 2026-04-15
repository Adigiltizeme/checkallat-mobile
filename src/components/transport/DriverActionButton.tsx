import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { TransportStatus } from '../../types/transport-status';

interface DriverActionButtonProps {
  currentStatus: TransportStatus;
  requestId: string;
  onStatusChange: (newStatus: TransportStatus) => Promise<void>;
}

interface ActionConfig {
  labelKey: string;
  nextStatus: TransportStatus;
  color: string;
  icon: string;
}

const ACTION_MAP: Partial<Record<TransportStatus, ActionConfig>> = {
  pending: {
    labelKey: 'driver_action.accept',
    nextStatus: 'accepted',
    color: '#4CAF50',
    icon: 'check',
  },
  accepted: {
    labelKey: 'driver_action.start_trip',
    nextStatus: 'heading_to_pickup',
    color: '#2196F3',
    icon: 'navigation',
  },
  heading_to_pickup: {
    labelKey: 'driver_action.arrived_at_pickup',
    nextStatus: 'arrived_at_pickup',
    color: '#9C27B0',
    icon: 'map-marker-check',
  },
  arrived_at_pickup: {
    labelKey: 'driver_action.start_loading',
    nextStatus: 'loading',
    color: '#FF9800',
    icon: 'package-variant-closed',
  },
  loading: {
    labelKey: 'driver_action.take_photos_before',
    nextStatus: 'in_transit',
    color: '#00BCD4',
    icon: 'camera',
  },
  in_transit: {
    labelKey: 'driver_action.arrived_at_delivery',
    nextStatus: 'arrived_at_delivery',
    color: '#673AB7',
    icon: 'home-map-marker',
  },
  arrived_at_delivery: {
    labelKey: 'driver_action.start_unloading',
    nextStatus: 'unloading',
    color: '#E91E63',
    icon: 'package-down',
  },
  unloading: {
    labelKey: 'driver_action.take_photos_after',
    nextStatus: 'completed',
    color: '#4CAF50',
    icon: 'camera-plus',
  },
};

export const DriverActionButton: React.FC<DriverActionButtonProps> = ({
  currentStatus,
  requestId,
  onStatusChange,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const action = ACTION_MAP[currentStatus];

  if (!action) {
    return null;
  }

  const handleActionPress = async () => {
    setLoading(true);
    try {
      await onStatusChange(action.nextStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert(
        t('common.error'),
        t('driver_action.error_update_status'),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={handleActionPress}
        loading={loading}
        disabled={loading}
        icon={({ size, color }) => (
          <Icon name={action.icon} size={size} color={color} />
        )}
        style={[styles.button, { backgroundColor: action.color }]}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        {t(action.labelKey)}
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  button: {
    borderRadius: 12,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
