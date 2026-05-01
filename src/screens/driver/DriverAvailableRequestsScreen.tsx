import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetAvailableRequestsQuery,
  useAcceptRequestMutation,
  useRejectRequestMutation,
} from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../config/currency';

type Props = StackScreenProps<DriverStackParamList, 'DriverAvailableRequests'>;

export const DriverAvailableRequestsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();

  const { data: requests = [], isLoading, isFetching, refetch } = useGetAvailableRequestsQuery(undefined, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);

  const [acceptRequest, { isLoading: accepting }] = useAcceptRequestMutation();
  const [rejectRequest] = useRejectRequestMutation();

  const handleAccept = useCallback(async (requestId: string) => {
    try {
      await acceptRequest(requestId).unwrap();
      Alert.alert(
        t('driver.request_accepted_title'),
        t('driver.request_accepted_msg'),
        [{ text: t('common.ok'), onPress: () => navigation.navigate('DriverTransportDetails', { requestId }) }],
      );
    } catch (error: any) {
      const msg = error?.data?.message || t('driver.request_already_taken_msg');
      Alert.alert(t('common.error'), msg);
      refetch();
    }
  }, [acceptRequest, navigation, refetch, t]);

  const handleReject = useCallback(async (requestId: string) => {
    await rejectRequest(requestId).unwrap().catch(() => {});
    refetch();
  }, [rejectRequest, refetch]);

  const formatDate = (isoDate: string) =>
    new Date(isoDate).toLocaleDateString(i18n.language, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const objectTypeIcons: Record<string, string> = {
    furniture: 'sofa',
    appliances: 'washing-machine',
    boxes: 'package-variant',
    vehicle: 'car',
    other: 'dots-horizontal-circle',
  };

  const renderItem = ({ item }: { item: any }) => {
    const objectTypes: string[] = item.objectTypes ?? (item.objectType ? [item.objectType] : []);
    const hasServices = item.needHelpers || item.needDisassembly || item.needReassembly || item.needPacking;
    const pickupElevator = item.hasElevator ? t('driver.elevator_yes') : t('driver.elevator_no');
    const deliveryElevator = item.hasElevatorDelivery ? t('driver.elevator_yes') : t('driver.elevator_no');

    return (
      <Card style={styles.card}>
        <Card.Content>
          {/* Header: price + payment method */}
          <View style={styles.cardHeader}>
            <Text variant="titleLarge" style={styles.price}>
              {formatCurrency(item.price || item.totalPrice || 0)}
            </Text>
            <Chip
              icon={item.paymentMethod === 'cash' ? 'cash' : 'credit-card'}
              mode="flat"
              style={[
                styles.paymentChip,
                { backgroundColor: item.paymentMethod === 'cash' ? '#FFF3E0' : '#E8F5F3' },
              ]}
              textStyle={{ fontSize: 12 }}
            >
              {t('driver.payment_' + item.paymentMethod + '_text')}
            </Chip>
          </View>

          {/* Route */}
          <View style={styles.routeSection}>
            <View style={styles.routeRow}>
              <Icon name="map-marker" size={18} color={colors.primary} />
              <View style={styles.routeText}>
                <Text variant="bodySmall" style={styles.routeLabel}>{t('driver.loading_point_label')}</Text>
                <Text variant="bodyMedium" numberOfLines={2}>{item.pickup?.address || item.pickupAddress}</Text>
                <Text variant="bodySmall" style={styles.conditionText}>
                  {t('driver.request_pickup_conditions', {
                    floor: item.pickupFloor || 0,
                    elevator: pickupElevator,
                  })}
                </Text>
              </View>
            </View>
            <View style={styles.routeLine} />
            <View style={styles.routeRow}>
              <Icon name="map-marker-check" size={18} color={colors.success} />
              <View style={styles.routeText}>
                <Text variant="bodySmall" style={styles.routeLabel}>{t('driver.delivery_point_label')}</Text>
                <Text variant="bodyMedium" numberOfLines={2}>{item.delivery?.address || item.deliveryAddress}</Text>
                <Text variant="bodySmall" style={styles.conditionText}>
                  {t('driver.request_delivery_conditions', {
                    floor: item.deliveryFloor || 0,
                    elevator: deliveryElevator,
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Object types */}
          {objectTypes.length > 0 && (
            <View style={styles.detailSection}>
              <Text variant="bodySmall" style={styles.detailSectionLabel}>{t('driver.request_object_section')}</Text>
              <View style={styles.chipsRow}>
                {objectTypes.map((type) => (
                  <Chip
                    key={type}
                    icon={objectTypeIcons[type] || 'cube-outline'}
                    mode="outlined"
                    style={styles.objectChip}
                    textStyle={styles.objectChipText}
                    compact
                  >
                    {t(`transport.obj_${type}`, { defaultValue: type })}
                  </Chip>
                ))}
              </View>
            </View>
          )}

          {/* Volume / Weight */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Icon name="cube-outline" size={16} color={colors.gray} />
              <Text variant="bodySmall" style={styles.statText}>
                {t('driver.volume_m3', { volume: item.estimatedVolume ?? 0 })}
              </Text>
            </View>
            {!!item.estimatedWeight && (
              <View style={styles.statItem}>
                <Icon name="weight-kilogram" size={16} color={colors.gray} />
                <Text variant="bodySmall" style={styles.statText}>
                  {t('driver.weight_kg', { weight: item.estimatedWeight })}
                </Text>
              </View>
            )}
          </View>

          {/* Services */}
          <View style={styles.detailSection}>
            <Text variant="bodySmall" style={styles.detailSectionLabel}>{t('driver.services_section')}</Text>
            {hasServices ? (
              <View style={styles.servicesRow}>
                {item.needHelpers && (
                  <Chip icon="account-multiple" mode="flat" style={styles.serviceChip} textStyle={styles.serviceChipText} compact>
                    {t('driver.helpers_extra', { count: item.helpersCount ?? 1 })}
                  </Chip>
                )}
                {item.needDisassembly && (
                  <Chip icon="toolbox" mode="flat" style={styles.serviceChip} textStyle={styles.serviceChipText} compact>
                    {t('driver.disassembly_required')}
                  </Chip>
                )}
                {item.needReassembly && (
                  <Chip icon="hammer-wrench" mode="flat" style={styles.serviceChip} textStyle={styles.serviceChipText} compact>
                    {t('driver.reassembly_required')}
                  </Chip>
                )}
                {item.needPacking && (
                  <Chip icon="package-variant-closed" mode="flat" style={styles.serviceChip} textStyle={styles.serviceChipText} compact>
                    {t('driver.packing_required')}
                  </Chip>
                )}
              </View>
            ) : (
              <Text variant="bodySmall" style={styles.noServicesText}>{t('driver.no_extra_services')}</Text>
            )}
          </View>

          {/* Meta: distance, date, immediate badge */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="map-marker-distance" size={15} color={colors.gray} />
              <Text variant="bodySmall" style={styles.metaText}>{item.distance?.toFixed(1)} km</Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="calendar" size={15} color={colors.gray} />
              <Text variant="bodySmall" style={styles.metaText}>{formatDate(item.scheduledDate)}</Text>
            </View>
            {item.isImmediate && (
              <Chip
                icon="lightning-bolt"
                mode="flat"
                style={styles.immediateChip}
                textStyle={styles.immediateChipText}
              >
                {t('transport.immediate_mode')}
              </Chip>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={() => handleReject(item.id)}
              textColor={colors.error}
              style={styles.rejectBtn}
              icon="close"
            >
              {t('driver.reject_request_btn')}
            </Button>
            <Button
              mode="contained"
              onPress={() => handleAccept(item.id)}
              buttonColor={colors.primary}
              style={styles.acceptBtn}
              icon="check"
              loading={accepting}
              disabled={accepting}
            >
              {t('driver.accept_request_btn')}
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={requests.length === 0 ? styles.emptyContent : styles.listContent}
      data={requests}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={isFetching} onRefresh={refetch} colors={[colors.primary]} />
      }
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon name="truck-check-outline" size={80} color={colors.gray} />
          <Text variant="titleMedium" style={styles.emptyTitle}>{t('driver.no_available_requests')}</Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>{t('driver.no_available_requests_hint')}</Text>
        </View>
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  emptyContent: { flex: 1, justifyContent: 'center', padding: spacing.xl },

  card: { marginBottom: spacing.md, backgroundColor: '#FFFFFF', elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  price: { fontWeight: 'bold', color: colors.success },
  paymentChip: { height: 28 },

  routeSection: { marginBottom: spacing.md },
  routeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  routeLine: { width: 2, height: 16, backgroundColor: '#E0E0E0', marginLeft: 8, marginVertical: 2 },
  routeText: { flex: 1 },
  routeLabel: { color: '#9E9E9E', marginBottom: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: '#6B7280' },
  immediateChip: { backgroundColor: '#FFF8E1', height: 26 },
  immediateChipText: { fontSize: 11, color: '#B45309' },

  conditionText: { fontSize: 11, color: '#6B7280', marginTop: 2 },

  detailSection: { marginBottom: spacing.sm },
  detailSectionLabel: { color: '#9E9E9E', marginBottom: 4, fontWeight: '600', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  objectChip: { height: 26, backgroundColor: '#F3F4F6' },
  objectChipText: { fontSize: 11 },

  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { color: '#374151' },

  servicesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  serviceChip: { height: 26, backgroundColor: '#EEF2FF' },
  serviceChipText: { fontSize: 11, color: '#4338CA' },
  noServicesText: { color: '#9CA3AF', fontStyle: 'italic', fontSize: 12 },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  rejectBtn: { flex: 1, borderColor: colors.error },
  acceptBtn: { flex: 2 },

  emptyContainer: { alignItems: 'center' },
  emptyTitle: { marginTop: spacing.lg, fontWeight: 'bold', color: '#374151' },
  emptySubtext: { marginTop: spacing.xs, color: '#6B7280', textAlign: 'center', lineHeight: 20 },
});
