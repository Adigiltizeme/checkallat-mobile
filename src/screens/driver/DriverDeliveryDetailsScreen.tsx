import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Text, Card, Chip, ActivityIndicator } from 'react-native-paper';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../config/currency';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetTransportRequestQuery,
  useUpdateTransportStatusMutation,
} from '../../store/api/transportApi';
import { useGetCallRelayNumberQuery } from '../../store/api/communicationApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import {
  STATUS_COLORS,
  TransportStatus,
} from '../../types/transport';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = StackScreenProps<DriverStackParamList, 'DriverDeliveryDetails'>;

export const DriverDeliveryDetailsScreen = ({ navigation, route }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const { requestId } = route.params;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    card: { marginBottom: spacing.md, backgroundColor: tokens.card, elevation: 2 },
    statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontWeight: 'bold' },
    statusChip: {},
    sectionTitle: { fontWeight: 'bold', marginBottom: spacing.md },
    clientInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    clientDetails: { flex: 1 },
    clientName: { fontWeight: 'bold' },
    clientPhone: { color: tokens.text.secondary, marginTop: spacing.xs },
    contactBtns: { flexDirection: 'row', gap: 8 },
    callButton: { backgroundColor: colors.success, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    msgButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${tokens.primary}15`, borderWidth: 1, borderColor: tokens.primary, justifyContent: 'center', alignItems: 'center' },
    locationContainer: { flexDirection: 'row', gap: spacing.sm },
    locationInfo: { flex: 1 },
    locationLabel: { color: tokens.text.secondary, marginBottom: 4 },
    locationDetails: { color: tokens.text.secondary, marginTop: spacing.xs },
    instructions: { color: colors.info, marginTop: spacing.xs, fontStyle: 'italic' },
    routeLine: { width: 2, height: 24, backgroundColor: tokens.border, marginLeft: 11, marginVertical: spacing.sm },
    distanceInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: tokens.border },
    distanceText: { fontWeight: 'bold', color: tokens.text.secondary },
    chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
    objectChip: { backgroundColor: `${tokens.primary}20` },
    description: { marginBottom: spacing.md },
    detailsGrid: { flexDirection: 'row', gap: spacing.md },
    detailItem: { flex: 1 },
    detailLabel: { color: tokens.text.secondary },
    detailValue: { fontWeight: 'bold', marginTop: spacing.xs },
    photosContainer: { marginTop: spacing.md },
    photosLabel: { marginBottom: spacing.sm },
    photoPlaceholder: { width: 100, height: 100, backgroundColor: tokens.backgroundAlt, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
    serviceItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    paymentLabel: { color: tokens.text.secondary },
    paymentAmount: { fontWeight: 'bold', color: colors.success },
    paymentMethod: { color: tokens.text.secondary },
    actionsContainer: { gap: spacing.sm },
    actionButton: {},
    nextActionButton: { marginTop: spacing.sm },
  }), [tokens]);

  const { data: request, isLoading, refetch } = useGetTransportRequestQuery(requestId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [updateStatus, { isLoading: isUpdating }] = useUpdateTransportStatusMutation();

  const handleStatusUpdate = async (newStatus: TransportStatus) => {
    try {
      await updateStatus({ requestId, status: newStatus }).unwrap();
      if (newStatus === 'completed') {
        navigation.navigate('TransportCompletion', { requestId });
      } else {
        await refetch();
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error?.data?.message || t('driver.status_update_failed'));
    }
  };

  const CONTACT_STATUSES = ['driver_assigned', 'driver_en_route_pickup', 'arrived_pickup', 'in_transit'];
  const canContact = !!(request && CONTACT_STATUSES.includes(request.status) && request.client);
  const clientName = request?.client ? `${request.client.firstName} ${request.client.lastName}` : '';
  const { data: callRelay } = useGetCallRelayNumberQuery(
    { entityType: 'transport', entityId: requestId },
    { skip: !canContact },
  );

  const handleNavigate = () => {
    navigation.navigate('DriverNavigation', { requestId });
  };

  const handleProofPhotos = (type: 'before' | 'after', nextStatus: string) => {
    navigation.navigate('DriverProofPhotos', { requestId, type, nextStatus });
  };

  const getNextAction = () => {
    if (!request) return null;
    switch (request.status) {
      case 'driver_assigned': return { label: t('driver.start_to_pickup'), status: 'driver_en_route_pickup' as TransportStatus, icon: 'car', color: colors.primary };
      case 'driver_en_route_pickup': return { label: t('driver.arrived_pickup'), status: 'arrived_pickup' as TransportStatus, icon: 'map-marker-check', color: colors.info };
      case 'arrived_pickup': return { label: t('driver.start_loading'), status: 'loading' as TransportStatus, icon: 'package-up', color: colors.warning };
      case 'loading': return { label: t('driver.finish_loading'), status: 'in_transit' as TransportStatus, icon: 'truck-fast', color: colors.primary };
      case 'in_transit': return { label: t('driver.arrived_delivery'), status: 'arrived_delivery' as TransportStatus, icon: 'map-marker-check', color: colors.info };
      case 'arrived_delivery': return { label: t('driver.start_unloading'), status: 'unloading' as TransportStatus, icon: 'package-down', color: colors.warning };
      case 'unloading': return { label: t('driver.finish_delivery'), status: 'completed' as TransportStatus, icon: 'check-circle', color: colors.success };
      default: return null;
    }
  };

  if (isLoading) {
    return <View style={styles.centerContainer}><ActivityIndicator size="large" color={tokens.primary} /></View>;
  }
  if (!request) {
    return <View style={styles.centerContainer}><Text>{t('driver.delivery_not_found')}</Text></View>;
  }

  const statusColor = STATUS_COLORS[request.status as TransportStatus];
  const nextAction = getNextAction();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Carte de statut */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Text variant="titleLarge" style={styles.title}>{t('driver.delivery_id', { id: request.id.slice(0, 8) })}</Text>
            <Chip mode="flat" textStyle={{ fontSize: 12, lineHeight: 16, color: colors.white }} style={[styles.statusChip, { backgroundColor: statusColor }]}>
              {t('status.' + request.status)}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Informations client */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>👤 {t('driver.client')}</Text>
          <View style={styles.clientInfo}>
            <View style={styles.clientDetails}>
              <Text variant="bodyLarge" style={styles.clientName}>{request.client?.firstName} {request.client?.lastName}</Text>
            </View>
            {canContact && (
              <View style={styles.contactBtns}>
                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => { if (callRelay?.relayNumber) Linking.openURL(`tel:${callRelay.relayNumber}`); }}
                >
                  <Icon name="phone" size={22} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.msgButton}
                  onPress={() => navigation.navigate('BookingChat', { entityType: 'transport', entityId: requestId, otherPartyName: clientName })}
                >
                  <Icon name="message-text" size={22} color={tokens.primary} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Card.Content>
      </Card>

      {/* Itinéraire */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>📍 {t('driver.itinerary')}</Text>
          <View style={styles.locationContainer}>
            <Icon name="map-marker" size={24} color={colors.primary} />
            <View style={styles.locationInfo}>
              <Text variant="labelMedium" style={styles.locationLabel}>{t('driver.pickup_address')}</Text>
              <Text variant="bodyMedium">{(request as any).pickup?.address}</Text>
              <Text variant="bodySmall" style={styles.locationDetails}>
                {t('driver.floor_label')}: {(request as any).pickup?.floor} | {(request as any).pickup?.hasElevator ? '✅' : '❌'} {t('driver.elevator')}
              </Text>
              {(request as any).pickup?.instructions && (
                <Text variant="bodySmall" style={styles.instructions}>📝 {(request as any).pickup.instructions}</Text>
              )}
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.locationContainer}>
            <Icon name="map-marker-check" size={24} color={colors.success} />
            <View style={styles.locationInfo}>
              <Text variant="labelMedium" style={styles.locationLabel}>{t('driver.delivery_address')}</Text>
              <Text variant="bodyMedium">{(request as any).delivery?.address}</Text>
              <Text variant="bodySmall" style={styles.locationDetails}>
                {t('driver.floor_label')}: {(request as any).delivery?.floor} | {(request as any).delivery?.hasElevator ? '✅' : '❌'} {t('driver.elevator')}
              </Text>
              {(request as any).delivery?.instructions && (
                <Text variant="bodySmall" style={styles.instructions}>📝 {(request as any).delivery.instructions}</Text>
              )}
            </View>
          </View>
          <View style={styles.distanceInfo}>
            <Icon name="map-marker-distance" size={20} color={tokens.text.secondary} />
            <Text variant="bodyMedium" style={styles.distanceText}>{((request as any).distance ?? 0).toFixed(1)} km</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Objets à transporter */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>📦 {t('driver.items_to_transport')}</Text>
          <View style={styles.chipsContainer}>
            {(request as any).objectTypes && (request as any).objectTypes.length > 0
              ? (request as any).objectTypes.map((type: string, index: number) => (
                  <Chip key={index} mode="flat" style={styles.objectChip}>{t('transport.obj_' + type)}</Chip>
                ))
              : <Chip mode="flat" style={styles.objectChip}>{t('transport.obj_' + (request as any).objectType)}</Chip>
            }
          </View>
          <Text variant="bodyMedium" style={styles.description}>{(request as any).description}</Text>
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text variant="bodySmall" style={styles.detailLabel}>{t('driver.estimated_volume')}</Text>
              <Text variant="bodyMedium" style={styles.detailValue}>{request.estimatedVolume} m³</Text>
            </View>
            {request.estimatedWeight && (
              <View style={styles.detailItem}>
                <Text variant="bodySmall" style={styles.detailLabel}>{t('driver.estimated_weight')}</Text>
                <Text variant="bodyMedium" style={styles.detailValue}>{request.estimatedWeight} kg</Text>
              </View>
            )}
          </View>
          {(request as any).photos && (request as any).photos.length > 0 && (
            <View style={styles.photosContainer}>
              <Text variant="labelMedium" style={styles.photosLabel}>{t('driver.item_photos_label')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(request as any).photos.map((_: any, index: number) => (
                  <View key={index} style={styles.photoPlaceholder}>
                    <Icon name="image" size={40} color={tokens.text.secondary} />
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Services requis */}
      {(request.needHelpers || request.needDisassembly || (request as any).needReassembly || request.needPacking) && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>🛠️ {t('driver.required_services')}</Text>
            {request.needHelpers && (
              <View style={styles.serviceItem}>
                <Icon name="account-group" size={20} color={tokens.primary} />
                <Text variant="bodyMedium">{request.helpersCount} {t('driver.helpers_label')}</Text>
              </View>
            )}
            {request.needDisassembly && (
              <View style={styles.serviceItem}>
                <Icon name="tools" size={20} color={tokens.primary} />
                <Text variant="bodyMedium">{t('transport.disassembly')}</Text>
              </View>
            )}
            {(request as any).needReassembly && (
              <View style={styles.serviceItem}>
                <Icon name="hammer-screwdriver" size={20} color={tokens.primary} />
                <Text variant="bodyMedium">{t('transport.reassembly')}</Text>
              </View>
            )}
            {request.needPacking && (
              <View style={styles.serviceItem}>
                <Icon name="package-variant-closed" size={20} color={tokens.primary} />
                <Text variant="bodyMedium">{t('transport.packing')}</Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Paiement */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>💰 {t('transport.payment')}</Text>
          <View style={styles.paymentRow}>
            <Text variant="bodyLarge" style={styles.paymentLabel}>{t('driver.total_amount')}:</Text>
            <Text variant="headlineSmall" style={styles.paymentAmount}>{formatCurrency((request as any).price || 0)}</Text>
          </View>
          <Text variant="bodySmall" style={styles.paymentMethod}>
            {t('driver.payment_method_label')}: {request.paymentMethod === 'cash' ? t('transport.pay_cash') : t('driver.payment_card')}
          </Text>
        </Card.Content>
      </Card>

      {/* Boutons d'action */}
      <View style={styles.actionsContainer}>
        <ChocolateButton
          onPress={handleNavigate}
          style={styles.actionButton}
        >
          {t('driver.navigate')}
        </ChocolateButton>
        {request.status === 'loading' && (
          <ChocolateButton
            variant="outline"
            onPress={() => handleProofPhotos('before', 'in_transit')}
            style={styles.actionButton}
          >
            {t('driver.photos_before_loading')}
          </ChocolateButton>
        )}
        {request.status === 'unloading' && (
          <ChocolateButton
            variant="outline"
            onPress={() => handleProofPhotos('after', 'completed')}
            style={styles.actionButton}
          >
            {t('driver.photos_after_delivery')}
          </ChocolateButton>
        )}
        {nextAction && (
          <ChocolateButton
            onPress={() => handleStatusUpdate(nextAction.status)}
            loading={isUpdating}
            disabled={isUpdating}
            style={styles.nextActionButton}
          >
            {nextAction.label}
          </ChocolateButton>
        )}
      </View>
    </ScrollView>
  );
};
