import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Image, Modal, FlatList, Dimensions, TouchableOpacity } from 'react-native';
import { Text, Card, Button, Divider, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetTransportRequestQuery,
  useUpdateTransportStatusMutation,
  useCancelTransportMutation,
} from '../../store/api/transportApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { StatusTimeline } from '../../components/transport/StatusTimeline';
import { DriverActionButton } from '../../components/transport/DriverActionButton';
import { DriverCancelModal } from '../../components/transport/DriverCancelModal';
import { TRANSPORT_STATUS_CONFIG, TransportStatus } from '../../types/transport-status';
import { colors } from '../../theme/colors';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = StackScreenProps<DriverStackParamList, 'DriverTransportDetails'>;

export const DriverTransportDetailsScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const { requestId } = route.params;
  const { data: request, isLoading, refetch } = useGetTransportRequestQuery(requestId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  useRefetchOnFocus(refetch);
  const [updateStatus] = useUpdateTransportStatusMutation();
  const [cancelTransport, { isLoading: isCancelling }] = useCancelTransportMutation();
  const theme = useTheme();
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleStatusChange = async (newStatus: TransportStatus) => {
    // Avant de passer à in_transit, imposer les photos de chargement
    if (newStatus === 'in_transit') {
      const hasPhotos = (request as any)?.photosBeforeLoading?.length > 0;
      if (!hasPhotos) {
        navigation.navigate('DriverProofPhotos', { requestId, type: 'before', nextStatus: 'in_transit' });
        return;
      }
    }

    // Avant de terminer, imposer les photos après livraison
    if (newStatus === 'completed') {
      const hasPhotos = (request as any)?.photosAfterDelivery?.length > 0;
      if (!hasPhotos) {
        navigation.navigate('DriverProofPhotos', { requestId, type: 'after', nextStatus: 'completed' });
        return;
      }
    }

    try {
      await updateStatus({ requestId, status: newStatus }).unwrap();
      await refetch();
      // Alert.alert(t('common.success'), t('driver.status_updated_msg'));
    } catch (error: any) {
      console.error('Error updating status:', error);
      throw error;
    }
  };

  const handleStartNavigation = () => {
    navigation.navigate('DriverNavigation', { requestId });
  };

  const handleCancelConfirm = async (reason: string) => {
    try {
      await cancelTransport({ id: requestId, reason }).unwrap();
      setShowCancelModal(false);
      navigation.goBack();
    } catch (error: any) {
      const msg = error?.data?.message || t('common.error');
      Alert.alert(t('common.error'), msg);
    }
  };

  const CANCELLABLE_STATUSES: TransportStatus[] = ['accepted', 'heading_to_pickup', 'arrived_at_pickup'];

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t('driver.loading_details')}</Text>
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="alert-circle" size={64} color={colors.error} />
        <Text style={styles.errorText}>{t('transport.request_not_found')}</Text>
      </View>
    );
  }

  const getEscrowColor = (status: string) => {
    switch (status) {
      case 'held': return colors.success;
      case 'captured': return '#2196F3';
      case 'released': return colors.primary;
      case 'refunded': return colors.error;
      default: return colors.gray;
    }
  };

  const statusConfig = TRANSPORT_STATUS_CONFIG[request.status as TransportStatus];

  const renderPhotoGallery = (photos: string[], titleKey: string) => {
    if (!photos || photos.length === 0) return null;
    return (
      <Card style={styles.card}>
        <Card.Title
          title={t(titleKey)}
          left={(props) => <Icon {...props} name="image-multiple" size={24} color={colors.primary} />}
        />
        <Card.Content>
          <FlatList
            data={photos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={styles.photoList}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => setFullScreenPhoto(item)} activeOpacity={0.85}>
                <Image source={{ uri: item }} style={styles.photoThumb} />
              </TouchableOpacity>
            )}
          />
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Full-screen photo modal */}
      <Modal visible={!!fullScreenPhoto} transparent animationType="fade" onRequestClose={() => setFullScreenPhoto(null)}>
        <View style={styles.photoModal}>
          <IconButton icon="close" iconColor="#fff" size={28} onPress={() => setFullScreenPhoto(null)} style={styles.photoModalClose} />
          {fullScreenPhoto && (
            <Image source={{ uri: fullScreenPhoto }} style={styles.photoFull} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <ScrollView style={styles.scrollView}>
        {/* Status Banner */}
        <View style={[styles.statusBanner, { backgroundColor: statusConfig.color }]}>
          <Icon name={statusConfig.icon} size={32} color="#FFFFFF" />
          <View style={styles.statusTextContainer}>
            <Text variant="titleMedium" style={styles.statusTitle}>
              {t('status.' + request.status)}
            </Text>
            <Text variant="bodyMedium" style={styles.statusDescription}>
              {t('status_description.' + request.status)}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <Card style={styles.card}>
          <Pressable onPress={() => setIsTimelineExpanded(!isTimelineExpanded)}>
            <Card.Title
              title={`📍 ${t('driver.tracking_section')}`}
              right={(props) => (
                <Icon
                  {...props}
                  name={isTimelineExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={colors.primary}
                />
              )}
            />
          </Pressable>
          {isTimelineExpanded && (
            <Card.Content>
              <StatusTimeline
                currentStatus={request.status as TransportStatus}
                timestamps={{
                  driverAcceptedAt: request.driverAcceptedAt,
                  arrivedAtPickupAt: request.arrivedAtPickupAt,
                  loadingStartedAt: request.loadingStartedAt,
                  departedPickupAt: request.departedPickupAt,
                  arrivedAtDeliveryAt: request.arrivedAtDeliveryAt,
                  unloadingStartedAt: request.unloadingStartedAt,
                  completedAt: request.completedAt,
                }}
              />
            </Card.Content>
          )}
        </Card>

        {/* Client Info */}
        <Card style={styles.card}>
          <Card.Title
            title={t('driver.client_info')}
            left={(props) => <Icon {...props} name="account" size={24} />}
          />
          <Card.Content>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>{t('driver.name_label')}</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {request.client?.firstName} {request.client?.lastName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodyMedium" style={styles.infoLabel}>{t('driver.phone_label')}</Text>
              <Text variant="bodyMedium" style={styles.infoValue}>
                {request.client?.phone}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Pickup Location */}
        <Card style={styles.card}>
          <Card.Title
            title={t('driver.pickup_point')}
            left={(props) => <Icon {...props} name="map-marker" size={24} color={colors.primary} />}
          />
          <Card.Content>
            <Text variant="bodyMedium">{request.pickupAddress}</Text>
            {request.pickupInstructions && (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodySmall" style={styles.instructions}>
                  {t('driver.instructions_label')} {request.pickupInstructions}
                </Text>
              </>
            )}
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.floor_label')}</Text>
              <Text variant="bodySmall">{request.pickupFloor || t('common.ground_floor')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.elevator_label')}</Text>
              <Text variant="bodySmall">{request.hasElevator ? t('driver.yes_text') : t('driver.no_text')}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Photos before loading */}
        {renderPhotoGallery((request as any).photosBeforeLoading ?? [], 'driver.photos_before_loading')}

        {/* Delivery Location */}
        <Card style={styles.card}>
          <Card.Title
            title={t('driver.delivery_point_section')}
            left={(props) => <Icon {...props} name="map-marker-check" size={24} color={colors.success} />}
          />
          <Card.Content>
            <Text variant="bodyMedium">{request.deliveryAddress}</Text>
            {request.deliveryInstructions && (
              <>
                <Divider style={styles.divider} />
                <Text variant="bodySmall" style={styles.instructions}>
                  {t('driver.instructions_label')} {request.deliveryInstructions}
                </Text>
              </>
            )}
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.floor_label')}</Text>
              <Text variant="bodySmall">{request.deliveryFloor || t('common.ground_floor')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.elevator_label')}</Text>
              <Text variant="bodySmall">{request.hasElevatorDelivery ? t('driver.yes_text') : t('driver.no_text')}</Text>
            </View>
          </Card.Content>
        </Card>

        {/* Photos after delivery */}
        {renderPhotoGallery((request as any).photosAfterDelivery ?? [], 'driver.photos_after_delivery')}

        {/* Items Details */}
        <Card style={styles.card}>
          <Card.Title
            title={t('driver.transport_details_section')}
            left={(props) => <Icon {...props} name="package-variant" size={24} />}
          />
          <Card.Content>
            <Text variant="bodyMedium" style={styles.itemDescription}>
              {request.itemDescription}
            </Text>
            <Divider style={styles.divider} />
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.distance_label_driver')}</Text>
              <Text variant="bodySmall">{request.distance} km</Text>
            </View>
            <View style={styles.infoRow}>
              <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.volume_label_driver')}</Text>
              <Text variant="bodySmall">{request.estimatedVolume} m³</Text>
            </View>
            {request.estimatedWeight && (
              <View style={styles.infoRow}>
                <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.weight_label')}</Text>
                <Text variant="bodySmall">{request.estimatedWeight} kg</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Item Photos */}
        {renderPhotoGallery((request as any).itemPhotos ?? [], 'driver.item_photos_label')}

        {/* Additional Services */}
        {(request.needHelpers || request.needDisassembly || request.needReassembly || request.needPacking) && (
          <Card style={styles.card}>
            <Card.Title
              title={t('transport.additional_services')}
              left={(props) => <Icon {...props} name="tools" size={24} />}
            />
            <Card.Content>
              {request.needHelpers && (
                <View style={styles.serviceRow}>
                  <Icon name="account-multiple" size={20} color={colors.primary} />
                  <Text variant="bodyMedium" style={styles.serviceText}>
                    {t('driver.helpers_extra', { count: request.helpersCount })}
                  </Text>
                </View>
              )}
              {request.needDisassembly && (
                <View style={styles.serviceRow}>
                  <Icon name="toolbox" size={20} color={colors.primary} />
                  <Text variant="bodyMedium" style={styles.serviceText}>{t('driver.disassembly_required')}</Text>
                </View>
              )}
              {request.needReassembly && (
                <View style={styles.serviceRow}>
                  <Icon name="hammer-wrench" size={20} color={colors.primary} />
                  <Text variant="bodyMedium" style={styles.serviceText}>{t('driver.reassembly_required')}</Text>
                </View>
              )}
              {request.needPacking && (
                <View style={styles.serviceRow}>
                  <Icon name="package-variant-closed" size={20} color={colors.primary} />
                  <Text variant="bodyMedium" style={styles.serviceText}>{t('driver.packing_required')}</Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Payment Info */}
        <Card style={styles.card}>
          <Card.Title
            title={t('driver.payment_info')}
            left={(props) => <Icon {...props} name="cash" size={24} />}
          />
          <Card.Content>
            {/* Net amount (primary display for in_app) */}
            {(request as any).payment?.proNetAmount ? (
              <>
                <View style={styles.priceRow}>
                  <Text variant="titleLarge" style={styles.priceLabel}>{t('driver.net_amount_label')}</Text>
                  <Text variant="titleLarge" style={[styles.priceValue, { color: colors.success }]}>
                    {(request as any).payment.proNetAmount.toFixed(2)} EGP
                  </Text>
                </View>
                <View style={styles.priceRow}>
                  <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.gross_amount_label')}</Text>
                  <Text variant="bodySmall">{request.totalPrice} EGP</Text>
                </View>
                <View style={styles.priceRow}>
                  <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.commission_label')}</Text>
                  <Text variant="bodySmall" style={{ color: colors.error }}>
                    -{(request as any).payment.commissionAmount?.toFixed(2)} EGP ({(request as any).payment.commissionRate}%)
                  </Text>
                </View>
                <View style={[styles.priceRow, { marginTop: 8 }]}>
                  <Text variant="bodySmall" style={styles.infoLabel}>{t('driver.escrow_status_label')}</Text>
                  <Text variant="bodySmall" style={{ color: getEscrowColor((request as any).payment.escrowStatus) }}>
                    {t('payment.escrow_' + ((request as any).payment.escrowStatus || 'pending'))}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.priceRow}>
                <Text variant="titleLarge" style={styles.priceLabel}>{t('driver.total_label')}</Text>
                <Text variant="titleLarge" style={styles.priceValue}>
                  {request.totalPrice} EGP
                </Text>
              </View>
            )}
            <Text variant="bodySmall" style={styles.paymentMethod}>
              {t('driver.payment_method_text', {
                method: request.paymentMethod === 'cash' ? t('driver.payment_cash_text') : t('driver.payment_inapp_text'),
              })}
            </Text>
          </Card.Content>
        </Card>

        {/* Notes de confirmation */}
        {((request as any).clientCompletionNotes || (request as any).driverCompletionNotes) && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="labelLarge" style={styles.sectionTitle}>
                📝 {t('driver.notes_section')}
              </Text>

              {(request as any).clientCompletionNotes && (
                <View style={styles.noteContainer}>
                  <Text variant="bodySmall" style={styles.noteLabel}>
                    {t('driver.client_note_label')}
                  </Text>
                  <Text variant="bodyMedium" style={styles.noteText}>
                    {(request as any).clientCompletionNotes}
                  </Text>
                </View>
              )}

              {(request as any).driverCompletionNotes && (
                <View style={styles.noteContainer}>
                  <Text variant="bodySmall" style={styles.noteLabel}>
                    {t('driver.driver_note_label')}
                  </Text>
                  <Text variant="bodyMedium" style={styles.noteText}>
                    {(request as any).driverCompletionNotes}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Fixed Bottom Actions */}
      <View style={styles.bottomContainer}>
        {/* Confirmation Button (after completed) */}
        {request.status === 'completed' && !request.driverConfirmedCompletion && (
          <Button
            mode="contained"
            icon="check-circle"
            onPress={() => navigation.navigate('TransportCompletion', { requestId })}
            buttonColor={colors.success}
            style={styles.confirmButton}
          >
            {t('driver.confirm_delivery_btn')}
          </Button>
        )}

        {/* Cash Validation Button */}
        {request.status === 'completed' &&
         request.clientConfirmedCompletion &&
         request.driverConfirmedCompletion &&
         request.paymentMethod === 'cash' &&
         !(request as any).cashAmountDeclaredByDriver && (
          <Button
            mode="contained"
            icon="cash"
            onPress={() => navigation.navigate('CashValidation', { requestId, totalPrice: request.totalPrice })}
            buttonColor={colors.warning}
            style={styles.confirmButton}
          >
            {t('driver.validate_cash_btn')}
          </Button>
        )}

        {/* Navigation Button */}
        {request.status !== 'completed' && request.status !== 'cancelled' && (
          <Button
            mode="outlined"
            icon="navigation"
            onPress={handleStartNavigation}
            style={styles.navigationButton}
          >
            {t('driver.gps_navigation')}
          </Button>
        )}

        {/* Cancel delivery — only before loading starts */}
        {CANCELLABLE_STATUSES.includes(request.status as TransportStatus) && (
          <Button
            mode="outlined"
            icon="cancel"
            onPress={() => setShowCancelModal(true)}
            textColor={colors.error}
            style={styles.cancelButton}
          >
            {t('driver.cancel_delivery_btn')}
          </Button>
        )}

        {/* Status Action Button */}
        {request.status !== 'completed' && (
          <DriverActionButton
            currentStatus={request.status as TransportStatus}
            requestId={requestId}
            onStatusChange={handleStatusChange}
          />
        )}
      </View>

      <DriverCancelModal
        visible={showCancelModal}
        isConfirming={isCancelling}
        onCancel={() => setShowCancelModal(false)}
        onConfirm={handleCancelConfirm}
        onContactSupport={() => {
          setShowCancelModal(false);
          navigation.navigate('Support');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.gray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: colors.error,
    textAlign: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statusDescription: {
    color: '#FFFFFF',
    marginTop: 4,
  },
  card: {
    margin: 12,
    marginBottom: 0,
  },
  sectionTitle: {
    color: colors.primary,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  infoLabel: {
    fontWeight: '600',
    color: colors.gray,
  },
  infoValue: {
    flex: 1,
    textAlign: 'right',
  },
  divider: {
    marginVertical: 12,
  },
  instructions: {
    fontStyle: 'italic',
    color: colors.gray,
    marginBottom: 8,
  },
  itemDescription: {
    marginBottom: 12,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  serviceText: {
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontWeight: 'bold',
  },
  priceValue: {
    fontWeight: 'bold',
    color: colors.success,
  },
  paymentMethod: {
    color: colors.gray,
  },
  bottomContainer: {
    backgroundColor: '#FFFFFF',
    paddingTop: 8,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigationButton: {
    marginHorizontal: 16,
    marginBottom: 0,
  },
  cancelButton: {
    marginHorizontal: 16,
    marginBottom: 0,
    borderColor: colors.error,
  },
  confirmButton: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  noteContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00B8A9',
  },
  noteLabel: {
    color: '#7F8C9A',
    fontWeight: '600',
    marginBottom: 4,
  },
  noteText: {
    color: '#1A1A2E',
    lineHeight: 20,
  },

  // Photo gallery
  photoList: { gap: 8, paddingVertical: 4 },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },

  // Full-screen modal
  photoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 40,
    right: 12,
    zIndex: 10,
  },
  photoFull: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
