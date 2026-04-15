import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Text, Card, Button, Divider, ActivityIndicator, Chip, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import {
  useGetTransportRequestQuery,
  useCancelTransportMutation,
} from '../../store/api/transportApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  STATUS_COLORS,
  TransportStatus,
  TransportObjectType,
} from '../../types/transport';
import { formatPrice } from '../../utils/transport/priceCalculator';

type Props = StackScreenProps<any, 'TransportDetails'>;

export const TransportDetailsScreen = ({ route, navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const { requestId } = route.params as { requestId: string };
  const { data: request, isLoading, refetch } = useGetTransportRequestQuery(requestId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [cancelRequest, { isLoading: isCancelling }] = useCancelTransportMutation();
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);

  // État pour la modal de visualisation des photos
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setModalVisible(true);
  };

  const closePhotoViewer = () => {
    setModalVisible(false);
    setSelectedPhotoIndex(null);
  };

  const goToNextPhoto = () => {
    if (request && selectedPhotoIndex !== null && selectedPhotoIndex < request.photos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const goToPreviousPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  const formatDate = (isoDate: string): string => {
    return new Date(isoDate).toLocaleDateString(i18n.language, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleCancel = () => {
    Alert.alert(
      t('transport.cancel_request_title'),
      request?.paymentMethod === 'in_app'
        ? t('transport.cancel_request_message_inapp')
        : t('transport.cancel_request_message'),
      [
        { text: t('common.no'), style: 'cancel' },
        {
          text: t('common.yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              const result: any = await cancelRequest({ id: requestId, reason: 'Annulé par le client' }).unwrap();
              // Afficher l'info de remboursement si paiement in-app
              if (result?.refundPercentage !== undefined) {
                const msg = result.refundPercentage === 100
                  ? t('transport.cancel_refund_full')
                  : result.refundPercentage === 0
                    ? t('transport.cancel_refund_none')
                    : t('transport.cancel_refund_partial', { pct: result.refundPercentage });
                Alert.alert(t('transport.cancelled_alert_title'), msg, [
                  { text: t('common.ok'), onPress: () => navigation.goBack() },
                ]);
              } else {
                Alert.alert(t('transport.cancelled_alert_title'), t('transport.cancelled_success'));
                navigation.goBack();
              }
            } catch (error: any) {
              Alert.alert(
                t('common.error'),
                error?.data?.message || t('transport.cancel_failed')
              );
            }
          },
        },
      ]
    );
  };

  const handleTrack = () => {
    navigation.navigate('TransportTracking', { requestId });
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.error}>
        <Text variant="titleLarge">{t('transport.request_not_found')}</Text>
        <Button mode="outlined" onPress={() => navigation.goBack()} style={styles.errorButton}>
          {t('common.back')}
        </Button>
      </View>
    );
  }

  const statusColor = STATUS_COLORS[request.status as TransportStatus];
  const canCancel = request.status === 'pending' || request.status === 'accepted';
  const canTrack =
    request.status !== 'pending' &&
    request.status !== 'cancelled' &&
    request.status !== 'completed';

  // Le bouton de confirmation s'affiche seulement si :
  // - Le statut est "completed"
  // - ET l'utilisateur actuel (client OU chauffeur) n'a pas encore confirmé
  const canConfirm = request.status === 'completed' && (
    isDriver
      ? !request.driverConfirmedCompletion  // Chauffeur n'a pas confirmé
      : !request.clientConfirmedCompletion  // Client n'a pas confirmé
  );

  // Le bouton de validation cash s'affiche si :
  // - Les deux parties ont confirmé la fin de service
  // - Le paiement est en cash
  // - L'utilisateur actuel n'a pas encore validé le montant
  const bothConfirmed = request.clientConfirmedCompletion && request.driverConfirmedCompletion;
  const canValidateCash = bothConfirmed &&
    request.paymentMethod === 'cash' &&
    (isDriver
      ? !(request as any).cashAmountDeclaredByDriver
      : !(request as any).cashAmountDeclaredByClient
    );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Statut */}
      <Card style={[styles.statusCard, { backgroundColor: statusColor }]}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.statusText}>
            {t('status.' + request.status)}
          </Text>
          {request.status === 'pending' && (
            <Text variant="bodyMedium" style={styles.statusSubtext}>
              {t('transport.searching_driver')}
            </Text>
          )}
          {request.status === 'accepted' && request.driverId && (
            <Text variant="bodyMedium" style={styles.statusSubtext}>
              {t('transport.driver_accepted')}
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Assigned driver */}
      {(request as any).driver && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              🚚 {t('transport.assigned_driver')}
            </Text>
            <View style={styles.driverRow}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {(request as any).driver.user?.firstName?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={styles.driverInfo}>
                <Text variant="titleMedium" style={styles.driverName}>
                  {(request as any).driver.user?.firstName} {(request as any).driver.user?.lastName}
                </Text>
                <Text variant="bodySmall" style={styles.driverDetail}>
                  📞 {(request as any).driver.user?.phone}
                </Text>
                <Text variant="bodySmall" style={styles.driverDetail}>
                  🚛 {t('transport.vehicle_' + (request as any).driver.vehicleType)}
                  {'  ·  '}
                  🔖 {(request as any).driver.vehiclePlate}
                </Text>
                {(request as any).driver.averageRating > 0 && (
                  <Text variant="bodySmall" style={styles.driverDetail}>
                    ⭐ {(request as any).driver.averageRating.toFixed(1)} / 5
                  </Text>
                )}
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Objects */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            📦 {t('transport.objects_section')}
          </Text>

          {/* Afficher tous les types d'objets sous forme de chips */}
          <View style={styles.chipsContainer}>
            {(request as any).objectTypes && (request as any).objectTypes.length > 0 ? (
              (request as any).objectTypes.map((type: TransportObjectType, index: number) => (
                <Chip
                  key={index}
                  mode="flat"
                  style={styles.objectChip}
                  textStyle={styles.objectChipText}
                >
                  {t('transport.obj_' + type)}
                </Chip>
              ))
            ) : (
              <Chip mode="flat" style={styles.objectChip} textStyle={styles.objectChipText}>
                {t('transport.obj_' + request.objectType)}
              </Chip>
            )}
          </View>

          <Text variant="bodyMedium" style={styles.description}>
            {request.description}
          </Text>
          <Text variant="bodySmall" style={styles.detail}>
            {t('transport.volume')}: {request.estimatedVolume} m³
          </Text>

          {/* Galerie de photos */}
          {request.photos && request.photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text variant="bodySmall" style={styles.photosLabel}>
                Photos ({request.photos.length})
              </Text>
              <View style={styles.photosGrid}>
                {request.photos.map((photo: string, index: number) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.photoThumbnail}
                    onPress={() => openPhotoViewer(index)}
                  >
                    <Image source={{ uri: photo }} style={styles.thumbnailImage} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Itinerary */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            📍 {t('transport.itinerary')}
          </Text>

          <View style={styles.addressBlock}>
            <Text variant="labelMedium" style={styles.addressLabel}>
              {t('transport.loading_point')}
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {request.pickup.address}
            </Text>
            <Text variant="bodySmall" style={styles.detail}>
              {request.pickup.hasElevator
                ? t('transport.floor_elevator', { floor: request.pickup.floor })
                : t('transport.floor_no_elevator', { floor: request.pickup.floor })}
            </Text>
            {request.pickup.instructions && (
              <Text variant="bodySmall" style={styles.instructions}>
                💬 {request.pickup.instructions}
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.addressBlock}>
            <Text variant="labelMedium" style={styles.addressLabel}>
              {t('transport.delivery_point')}
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {request.delivery.address}
            </Text>
            <Text variant="bodySmall" style={styles.detail}>
              {request.delivery.hasElevator
                ? t('transport.floor_elevator', { floor: request.delivery.floor })
                : t('transport.floor_no_elevator', { floor: request.delivery.floor })}
            </Text>
            {request.delivery.instructions && (
              <Text variant="bodySmall" style={styles.instructions}>
                💬 {request.delivery.instructions}
              </Text>
            )}
          </View>

          <Divider style={styles.divider} />

          <View style={styles.distanceRow}>
            <Text variant="bodyMedium">📏 {request.distance} km</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Additional services */}
      {(request.needHelpers ||
        request.needDisassembly ||
        request.needReassembly ||
        request.needPacking) && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              🛠️ {t('transport.additional_services')}
            </Text>
            {request.needHelpers && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.helpers_service', { count: request.helpersCount })}
              </Text>
            )}
            {request.needDisassembly && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.disassembly_service')}
              </Text>
            )}
            {request.needReassembly && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.reassembly_service')}
              </Text>
            )}
            {request.needPacking && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.packing_service')}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Planning */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            📅 {t('transport.planning')}
          </Text>
          <Text variant="bodyLarge" style={styles.value}>
            {formatDate(request.scheduledDate)}
          </Text>
          <Text variant="bodyMedium" style={styles.detail}>
            {t('transport.' + request.timeSlot)}
          </Text>
        </Card.Content>
      </Card>

      {/* Pricing */}
      <Card style={styles.priceCard}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            💰 {t('transport.pricing')}
          </Text>

          {request.priceBreakdown && (
            <>
              <View style={styles.priceRow}>
                <Text variant="bodyMedium">
                  {t('transport.package_label', { vehicle: t('transport.vehicle_' + request.priceBreakdown.vehicleType) })}
                </Text>
                <Text variant="bodyMedium">
                  {formatPrice(request.priceBreakdown.baseFare)}
                </Text>
              </View>

              <View style={styles.priceRow}>
                <Text variant="bodyMedium">{t('transport.distance_label')}</Text>
                <Text variant="bodyMedium">
                  {formatPrice(request.priceBreakdown.distanceFare)}
                </Text>
              </View>

              {request.priceBreakdown.floorFare > 0 && (
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium">{t('transport.floors_label')}</Text>
                  <Text variant="bodyMedium">
                    {formatPrice(request.priceBreakdown.floorFare)}
                  </Text>
                </View>
              )}

              {request.priceBreakdown.helpersFare > 0 && (
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium">{t('transport.helpers_fare_label')}</Text>
                  <Text variant="bodyMedium">
                    {formatPrice(request.priceBreakdown.helpersFare)}
                  </Text>
                </View>
              )}

              {request.priceBreakdown.servicesFare > 0 && (
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium">{t('transport.services_fare')}</Text>
                  <Text variant="bodyMedium">
                    {formatPrice(request.priceBreakdown.servicesFare)}
                  </Text>
                </View>
              )}

              <Divider style={styles.totalDivider} />
            </>
          )}

          <View style={styles.totalRow}>
            <Text variant="titleLarge">{t('transport.total')}</Text>
            <Text variant="titleLarge" style={styles.totalValue}>
              {formatPrice(request.price)}
            </Text>
          </View>

          <Text variant="bodySmall" style={styles.paymentMethod}>
            {t('transport.payment_mode')}: {request.paymentMethod === 'cash' ? t('transport.payment_cash_label') : t('transport.payment_card_label')}
          </Text>
        </Card.Content>
      </Card>

      {/* Statut escrow — paiement in-app uniquement */}
      {request.paymentMethod === 'in_app' && (request as any).payment && (
        <Card style={[styles.card, styles.escrowCard]}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              🔒 {t('payment.escrow_status_title')}
            </Text>
            {(() => {
              const escrow = (request as any).payment.escrowStatus;
              const escrowMap: Record<string, { icon: string; key: string; color: string }> = {
                pending:  { icon: '⏳', key: 'payment.escrow_pending',  color: colors.warning },
                captured: { icon: '💳', key: 'payment.escrow_captured', color: colors.primary },
                held:     { icon: '🔒', key: 'payment.escrow_held',     color: colors.primary },
                released: { icon: '✅', key: 'payment.escrow_released', color: colors.success },
                refunded: { icon: '↩️', key: 'payment.escrow_refunded', color: colors.error },
              };
              const info = escrowMap[escrow] ?? escrowMap.pending;
              return (
                <View style={styles.escrowRow}>
                  <Text style={[styles.escrowStatus, { color: info.color }]}>
                    {info.icon}  {t(info.key)}
                  </Text>
                  <Text variant="bodySmall" style={styles.escrowNote}>
                    {t('payment.escrow_explanation_' + escrow, { defaultValue: '' })}
                  </Text>
                </View>
              );
            })()}
          </Card.Content>
        </Card>
      )}

      {/* Paiement in-app non encore effectué (pending sans payment) */}
      {request.paymentMethod === 'in_app' && !(request as any).payment && request.status === 'pending' && (
        <Card style={[styles.card, styles.warningCard]}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.warningText}>
              ⚠️ {t('payment.pending_payment_notice')}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Confirmation notes */}
      {((request as any).clientCompletionNotes || (request as any).driverCompletionNotes) && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              📝 {t('transport.confirmation_notes')}
            </Text>

            {(request as any).clientCompletionNotes && (
              <View style={styles.noteContainer}>
                <Text variant="bodySmall" style={styles.noteLabel}>
                  💬 {t('transport.client_label')}
                </Text>
                <Text variant="bodyMedium" style={styles.noteText}>
                  {(request as any).clientCompletionNotes}
                </Text>
              </View>
            )}

            {(request as any).driverCompletionNotes && (
              <View style={styles.noteContainer}>
                <Text variant="bodySmall" style={styles.noteLabel}>
                  🚚 {t('transport.driver_label')}
                </Text>
                <Text variant="bodyMedium" style={styles.noteText}>
                  {(request as any).driverCompletionNotes}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Cancellation info */}
      {canCancel && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="bodySmall" style={styles.infoText}>
              💡 {t('transport.cancellation_info')}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {canConfirm && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('TransportCompletion', { requestId })}
            buttonColor={colors.success}
            style={styles.button}
            icon="check-circle"
          >
            {t('transport.confirm_delivery')}
          </Button>
        )}

        {canValidateCash && (
          <Button
            mode="contained"
            onPress={() => navigation.navigate('CashValidation', { requestId, totalPrice: request.price })}
            buttonColor={colors.warning}
            style={styles.button}
            icon="cash"
          >
            {t('transport.validate_cash')}
          </Button>
        )}

        {canTrack && (
          <Button
            mode="contained"
            onPress={handleTrack}
            buttonColor={colors.primary}
            style={styles.button}
            icon="map-marker-path"
          >
            {t('transport.track')}
          </Button>
        )}

        {canCancel && (
          <Button
            mode="outlined"
            onPress={handleCancel}
            loading={isCancelling}
            disabled={isCancelling}
            textColor={colors.error}
            style={[styles.button, styles.cancelButton]}
            icon="close-circle"
          >
            {t('transport.cancel')}
          </Button>
        )}

        {request.paymentMethod === 'in_app' && (
          <Button
            mode="text"
            icon="credit-card-clock"
            onPress={() => navigation.navigate('PaymentHistory')}
            style={styles.button}
          >
            {t('payment.history_view_btn')}
          </Button>
        )}

        <Button mode="text" onPress={() => navigation.goBack()} style={styles.button}>
          {t('transport.back_to_list')}
        </Button>
      </View>

      {/* Modal de visualisation des photos */}
      {request && request.photos && request.photos.length > 0 && (
        <Modal
          visible={modalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={closePhotoViewer}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text variant="titleMedium" style={styles.modalTitle}>
                Photo {selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : 1} / {request.photos.length}
              </Text>
              <IconButton
                icon="close"
                iconColor={colors.white}
                size={24}
                onPress={closePhotoViewer}
              />
            </View>

            <View style={styles.modalImageContainer}>
              {selectedPhotoIndex !== null && (
                <Image
                  source={{ uri: request.photos[selectedPhotoIndex] }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {request.photos.length > 1 && (
              <View style={styles.modalNavigation}>
                <IconButton
                  icon="chevron-left"
                  iconColor={colors.white}
                  size={40}
                  onPress={goToPreviousPhoto}
                  disabled={selectedPhotoIndex === 0}
                  style={[
                    styles.navButton,
                    selectedPhotoIndex === 0 && styles.navButtonDisabled
                  ]}
                />
                <IconButton
                  icon="chevron-right"
                  iconColor={colors.white}
                  size={40}
                  onPress={goToNextPhoto}
                  disabled={selectedPhotoIndex === request.photos.length - 1}
                  style={[
                    styles.navButton,
                    selectedPhotoIndex === request.photos.length - 1 && styles.navButtonDisabled
                  ]}
                />
              </View>
            )}
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorButton: {
    marginTop: spacing.lg,
  },
  statusCard: {
    marginBottom: spacing.md,
    elevation: 4,
  },
  statusText: {
    color: colors.white,
    fontWeight: '700',
    textAlign: 'center',
  },
  statusSubtext: {
    color: colors.white,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  sectionTitle: {
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  value: {
    color: colors.dark,
    fontWeight: '600',
  },
  description: {
    color: colors.dark,
    marginTop: spacing.xs,
  },
  detail: {
    color: colors.gray,
    marginTop: 4,
  },
  addressBlock: {
    marginVertical: spacing.xs,
  },
  addressLabel: {
    color: colors.gray,
    marginBottom: 4,
  },
  instructions: {
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  distanceRow: {
    marginTop: spacing.xs,
  },
  service: {
    color: colors.dark,
    marginVertical: 4,
  },
  priceCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  totalDivider: {
    marginVertical: spacing.md,
    backgroundColor: colors.primary,
    height: 2,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  paymentMethod: {
    color: colors.gray,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  noteContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.lightBlue,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  noteLabel: {
    color: colors.gray,
    fontWeight: '600',
    marginBottom: 4,
  },
  noteText: {
    color: colors.dark,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#FFF3CD',
    marginBottom: spacing.md,
  },
  infoText: {
    color: colors.dark,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    gap: spacing.md,
  },
  button: {
    paddingVertical: spacing.sm,
  },
  cancelButton: {
    borderColor: colors.error,
  },
  escrowCard: {
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  escrowRow: {
    gap: 4,
  },
  escrowStatus: {
    fontSize: 16,
    fontWeight: '700',
  },
  escrowNote: {
    color: colors.gray,
    marginTop: 4,
  },
  warningCard: {
    backgroundColor: '#FFF3CD',
  },
  warningText: {
    color: '#856404',
    lineHeight: 20,
    textAlign: 'center',
  },
  photosSection: {
    marginTop: spacing.md,
  },
  photosLabel: {
    color: colors.gray,
    marginBottom: spacing.xs,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoThumbnail: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  driverAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${colors.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
  },
  driverInfo: {
    flex: 1,
    gap: 3,
  },
  driverName: {
    color: colors.dark,
    fontWeight: '600',
  },
  driverDetail: {
    color: colors.gray,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  objectChip: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: 8,
    margin: 0,
  },
  objectChipText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  modalTitle: {
    color: colors.white,
    fontWeight: '600',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.7,
  },
  modalNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  navButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
});
