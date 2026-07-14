import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { ChocolateButton } from '../shared/ChocolateButton';
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
      <ChocolateButton
        onPress={handleActionPress}
        loading={loading}
        disabled={loading}
      >
        {t(action.labelKey)}
      </ChocolateButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
