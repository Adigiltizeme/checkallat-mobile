import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { TRANSPORT_STATUS_CONFIG, TransportStatus } from '../../types/transport-status';

interface StatusTimelineProps {
  currentStatus: TransportStatus;
  timestamps: {
    driverAcceptedAt?: string;
    arrivedAtPickupAt?: string;
    loadingStartedAt?: string;
    departedPickupAt?: string;
    arrivedAtDeliveryAt?: string;
    unloadingStartedAt?: string;
    completedAt?: string;
  };
}

export const StatusTimeline: React.FC<StatusTimelineProps> = ({ currentStatus, timestamps }) => {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const timeline: Array<{
    status: TransportStatus;
    timestamp?: string;
  }> = [
    { status: 'accepted', timestamp: timestamps.driverAcceptedAt },
    { status: 'heading_to_pickup' },
    { status: 'arrived_at_pickup', timestamp: timestamps.arrivedAtPickupAt },
    { status: 'loading', timestamp: timestamps.loadingStartedAt },
    { status: 'in_transit', timestamp: timestamps.departedPickupAt },
    { status: 'arrived_at_delivery', timestamp: timestamps.arrivedAtDeliveryAt },
    { status: 'unloading', timestamp: timestamps.unloadingStartedAt },
    { status: 'completed', timestamp: timestamps.completedAt },
  ];

  const getCurrentIndex = () => {
    return timeline.findIndex(item => item.status === currentStatus);
  };

  const currentIndex = getCurrentIndex();

  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {t('driver_action.timeline_title')}
      </Text>

      {timeline.map((item, index) => {
        const config = TRANSPORT_STATUS_CONFIG[item.status];
        const isPast = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <View key={item.status} style={styles.timelineItem}>
            {/* Ligne verticale */}
            {index > 0 && (
              <View
                style={[
                  styles.line,
                  {
                    backgroundColor: isPast || isCurrent
                      ? config.color
                      : colors.surfaceDisabled,
                  },
                ]}
              />
            )}

            {/* Point/Icône */}
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isPast || isCurrent
                    ? config.color
                    : colors.surfaceDisabled,
                },
              ]}
            >
              <Icon
                name={config.icon}
                size={20}
                color="#FFFFFF"
              />
            </View>

            {/* Texte */}
            <View style={styles.textContainer}>
              <Text
                variant="bodyMedium"
                style={[
                  styles.label,
                  {
                    color: isPast || isCurrent
                      ? colors.onSurface
                      : colors.onSurfaceDisabled,
                    fontWeight: isCurrent ? 'bold' : 'normal',
                  },
                ]}
              >
                {t('status.' + item.status)}
              </Text>

              {item.timestamp && (
                <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                  {new Date(item.timestamp).toLocaleString(i18n.language, {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              )}

              {isCurrent && (
                <Text variant="bodySmall" style={{ color: config.color, fontWeight: 'bold' }}>
                  {t('driver_action.in_progress')}
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    marginBottom: 20,
    fontWeight: 'bold',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
    marginBottom: 20,
  },
  line: {
    position: 'absolute',
    left: 15,
    top: -20,
    width: 2,
    height: 40,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    paddingTop: 4,
  },
  label: {
    marginBottom: 2,
  },
});
