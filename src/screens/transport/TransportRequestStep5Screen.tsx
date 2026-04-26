import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Button, Text, Card, RadioButton, Divider, ActivityIndicator, IconButton, Chip } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import {
  Step1Data,
  Step2Data,
  Step3Data,
  Step4Data,
} from '../../types/transport';
import { useCreateTransportRequestMutation, useCalculatePriceMutation } from '../../store/api/transportApi';

type Props = StackScreenProps<any, 'TransportRequestStep5'>;

export const TransportRequestStep5Screen = ({ route, navigation }: Props) => {
  const { step1Data, step2Data, step3Data, step4Data } = route.params as {
    step1Data: Step1Data;
    step2Data: Step2Data;
    step3Data: Step3Data;
    step4Data: Step4Data;
  };

  const { t, i18n } = useTranslation();
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'cash'>('cash');
  const [createRequest, { isLoading }] = useCreateTransportRequestMutation();
  const [calculatePrice, { isLoading: priceLoading }] = useCalculatePriceMutation();

  // Prix retourné par le backend (source unique de vérité)
  const [priceBreakdown, setPriceBreakdown] = useState<any>(null);

  // État pour la modal de visualisation des photos
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Appel API pour récupérer le prix depuis la DB (tarifs gérés dans le web-admin)
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const result = await calculatePrice({
          transportType: step1Data.objectType,
          transportTypes: step1Data.objectTypes || [step1Data.objectType],
          estimatedVolume: step1Data.estimatedVolume,
          distance: step2Data.distance,
          pickupFloor: step2Data.pickup.floor || 0,
          hasElevator: step2Data.pickup.hasElevator || false,
          deliveryFloor: step2Data.delivery.floor || 0,
          hasElevatorDelivery: step2Data.delivery.hasElevator || false,
          needHelpers: step3Data.needHelpers,
          helpersCount: step3Data.helpersCount,
          needDisassembly: step3Data.needDisassembly,
          needReassembly: step3Data.needReassembly,
          needPacking: step3Data.needPacking,
          pickupLat: step2Data.pickup.lat,
          pickupLng: step2Data.pickup.lng,
        }).unwrap();
        setPriceBreakdown(result);
      } catch (err) {
        console.error('Failed to calculate price:', err);
      }
    };
    fetchPrice();
  }, []);

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index);
    setModalVisible(true);
  };

  const closePhotoViewer = () => {
    setModalVisible(false);
    setSelectedPhotoIndex(null);
  };

  const goToNextPhoto = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < step1Data.photos.length - 1) {
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

  const handleSubmit = async () => {
    try {
      // Formater les données selon le DTO backend
      const requestData = {
        // Type et description
        transportType: step1Data.objectType, // Type principal (premier sélectionné)
        transportTypes: step1Data.objectTypes || [step1Data.objectType], // Tableau des types sélectionnés
        itemDescription: step1Data.description,
        itemPhotos: step1Data.photos,
        estimatedVolume: step1Data.estimatedVolume,
        estimatedWeight: step1Data.estimatedVolume * 100, // Estimation approximative

        // Pickup (décomposé)
        pickupAddress: step2Data.pickup.address,
        pickupLat: step2Data.pickup.lat!,
        pickupLng: step2Data.pickup.lng!,
        pickupFloor: step2Data.pickup.floor || 0,
        hasElevator: step2Data.pickup.hasElevator || false,
        pickupInstructions: step2Data.pickup.instructions || '',

        // Delivery (décomposé)
        deliveryAddress: step2Data.delivery.address,
        deliveryLat: step2Data.delivery.lat!,
        deliveryLng: step2Data.delivery.lng!,
        deliveryFloor: step2Data.delivery.floor || 0,
        hasElevatorDelivery: step2Data.delivery.hasElevator || false,
        deliveryInstructions: step2Data.delivery.instructions || '',

        // Distance (calculée par Mapbox)
        distance: step2Data.distance,

        // Timing
        scheduledDate: step4Data.scheduledDate,
        timeWindow: step4Data.timeSlot, // morning, afternoon, evening, flexible

        // Services additionnels
        needHelpers: step3Data.needHelpers,
        helpersCount: step3Data.helpersCount,
        needDisassembly: step3Data.needDisassembly,
        needReassembly: step3Data.needReassembly,
        needPacking: step3Data.needPacking,

        // Paiement
        paymentMethod: paymentMethod === 'stripe' ? 'in_app' : 'cash',

        // Mode immédiat
        isImmediate: step4Data.isImmediate ?? false,
      };

      const result = await createRequest(requestData).unwrap();

      if (paymentMethod === 'stripe') {
        navigation.navigate('StripePayment', {
          requestId: result.id,
          amount: priceBreakdown?.total ?? result.totalPrice,
          type: 'transport',
        });
      } else {
        Alert.alert(
          t('transport.request_created'),
          t('transport.request_created_msg'),
          [
            {
              text: t('transport.view_request'),
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'TransportList' }],
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to create transport request:', error);
      Alert.alert(
        t('common.error'),
        error?.data?.message || t('transport.create_failed')
      );
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>
        {t('transport.step5_summary')}
      </Text>

      {/* Objets */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            📦 {t('transport.objects_section')}
          </Text>

          {/* Afficher tous les types d'objets sous forme de chips */}
          <View style={styles.chipsContainer}>
            {step1Data.objectTypes && step1Data.objectTypes.length > 0 ? (
              step1Data.objectTypes.map((type, index) => (
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
                {t('transport.obj_' + step1Data.objectType)}
              </Chip>
            )}
          </View>

          <Text variant="bodyMedium" style={styles.description}>
            {step1Data.description}
          </Text>
          <Text variant="bodySmall" style={styles.detail}>
            {t('transport.volume_label', { volume: step1Data.estimatedVolume })}
          </Text>

          {/* Galerie de photos */}
          {step1Data.photos.length > 0 && (
            <View style={styles.photosSection}>
              <Text variant="bodySmall" style={styles.photosLabel}>
                {t('transport.photos_count', { count: step1Data.photos.length })}
              </Text>
              <View style={styles.photosGrid}>
                {step1Data.photos.map((photo, index) => (
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

      {/* Adresses */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            📍 {t('transport.itinerary')}
          </Text>
          <View style={styles.addressRow}>
            <Text variant="bodyMedium" style={styles.addressLabel}>
              {t('transport.departure_label')}
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {step2Data.pickup.address}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.detail}>
            {step2Data.pickup.hasElevator
              ? t('transport.floor_elevator', { floor: step2Data.pickup.floor })
              : t('transport.floor_no_elevator', { floor: step2Data.pickup.floor })}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.addressRow}>
            <Text variant="bodyMedium" style={styles.addressLabel}>
              {t('transport.arrival_label')}
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {step2Data.delivery.address}
            </Text>
          </View>
          <Text variant="bodySmall" style={styles.detail}>
            {step2Data.delivery.hasElevator
              ? t('transport.floor_elevator', { floor: step2Data.delivery.floor })
              : t('transport.floor_no_elevator', { floor: step2Data.delivery.floor })}
          </Text>

          <Divider style={styles.divider} />

          <View style={styles.distanceRow}>
            <Text variant="bodyMedium">{t('transport.distance_km', { value: step2Data.distance })}</Text>
            <Text variant="bodyMedium">{t('transport.duration_min', { value: step2Data.estimatedDuration })}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Services */}
      {(step3Data.needHelpers ||
        step3Data.needDisassembly ||
        step3Data.needReassembly ||
        step3Data.needPacking) && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="labelLarge" style={styles.sectionTitle}>
              🛠️ {t('transport.additional_services')}
            </Text>
            {step3Data.needHelpers && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.helpers_service', { count: step3Data.helpersCount })}
              </Text>
            )}
            {step3Data.needDisassembly && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.disassembly_service')}
              </Text>
            )}
            {step3Data.needReassembly && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.reassembly_service')}
              </Text>
            )}
            {step3Data.needPacking && (
              <Text variant="bodyMedium" style={styles.service}>
                • {t('transport.packing_service')}
              </Text>
            )}
          </Card.Content>
        </Card>
      )}

      {/* Planning */}
      <Card style={[styles.card, step4Data.isImmediate && { borderColor: colors.primary, borderWidth: 2 }]}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            {step4Data.isImmediate ? '⚡' : '📅'} {t('transport.planning')}
          </Text>
          {step4Data.isImmediate ? (
            <>
              <Text variant="bodyLarge" style={[styles.value, { color: colors.primary }]}>
                {t('transport.immediate_mode')}
              </Text>
              <Text variant="bodySmall" style={styles.detail}>
                {t('transport.immediate_info')}
              </Text>
            </>
          ) : (
            <>
              <Text variant="bodyLarge" style={styles.value}>
                {formatDate(step4Data.scheduledDate)}
              </Text>
              <Text variant="bodyMedium" style={styles.detail}>
                {t('transport.' + step4Data.timeSlot)}
              </Text>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Prix Détaillé */}
      <Card style={styles.priceCard}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.priceTitle}>
            💰 {t('transport.pricing')}
          </Text>

          {priceLoading || !priceBreakdown ? (
            <View style={styles.priceLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text variant="bodyMedium" style={styles.priceLoadingText}>
                {t('transport.calculating_price')}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.priceRow}>
                <Text variant="bodyMedium">{t('transport.package_label', { vehicle: t('transport.vehicle_' + priceBreakdown.vehicleType) })}</Text>
                <Text variant="bodyMedium">{priceBreakdown.baseFare} {priceBreakdown.currency || 'EGP'}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text variant="bodyMedium">{t('transport.distance_label')} ({step2Data.distance} km)</Text>
                <Text variant="bodyMedium">{priceBreakdown.distanceFare} {priceBreakdown.currency || 'EGP'}</Text>
              </View>

              {priceBreakdown.floorFare > 0 && (
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium">{t('transport.floors_label')}</Text>
                  <Text variant="bodyMedium">{priceBreakdown.floorFare} {priceBreakdown.currency || 'EGP'}</Text>
                </View>
              )}

              {priceBreakdown.helpersFare > 0 && (
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium">
                    {t('transport.helpers_fare_label')} ({step3Data.helpersCount} {t('transport.helpers_unit')})
                  </Text>
                  <Text variant="bodyMedium">{priceBreakdown.helpersFare} {priceBreakdown.currency || 'EGP'}</Text>
                </View>
              )}

              {priceBreakdown.servicesFare > 0 && (
                <View style={styles.priceRow}>
                  <Text variant="bodyMedium">{t('transport.services_fare')}</Text>
                  <Text variant="bodyMedium">{priceBreakdown.servicesFare} {priceBreakdown.currency || 'EGP'}</Text>
                </View>
              )}

              <Divider style={styles.totalDivider} />

              <View style={styles.totalRow}>
                <Text variant="titleLarge" style={styles.totalLabel}>
                  {t('transport.total')}
                </Text>
                <Text variant="titleLarge" style={styles.totalValue}>
                  {priceBreakdown.total} {priceBreakdown.currency || 'EGP'}
                </Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      {/* Paiement */}
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="labelLarge" style={styles.sectionTitle}>
            💳 {t('transport.payment_mode')}
          </Text>
          <RadioButton.Group value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
            <RadioButton.Item
              label={t('transport.payment_cash_label')}
              value="cash"
              color={colors.primary}
            />
            <RadioButton.Item
              label={t('transport.payment_card_label')}
              value="stripe"
              color={colors.primary}
            />
          </RadioButton.Group>
        </Card.Content>
      </Card>

      {/* Conditions */}
      <Card style={styles.infoCard}>
        <Card.Content>
          <Text variant="bodySmall" style={styles.conditions}>
            {t('transport.cancellation_info')}
          </Text>
        </Card.Content>
      </Card>

      {/* Boutons */}
      <View style={styles.actions}>
        <Button
          mode="outlined"
          onPress={handleBack}
          disabled={isLoading}
          style={styles.backButton}
          textColor={colors.gray}
        >
          {t('common.back')}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={isLoading}
          disabled={isLoading}
          buttonColor={colors.accent}
          style={styles.submitButton}
        >
          {t('transport.confirm_request')}
        </Button>
      </View>

      {/* Modal de visualisation des photos */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closePhotoViewer}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              {t('transport.photo_counter', { current: selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : 1, total: step1Data.photos.length })}
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
                source={{ uri: step1Data.photos[selectedPhotoIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {step1Data.photos.length > 1 && (
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
                disabled={selectedPhotoIndex === step1Data.photos.length - 1}
                style={[
                  styles.navButton,
                  selectedPhotoIndex === step1Data.photos.length - 1 && styles.navButtonDisabled
                ]}
              />
            </View>
          )}
        </View>
      </Modal>
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
  title: {
    color: colors.dark,
    marginBottom: spacing.lg,
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
    marginBottom: 4,
  },
  description: {
    color: colors.dark,
    marginTop: spacing.xs,
  },
  detail: {
    color: colors.gray,
    marginTop: 4,
  },
  addressRow: {
    marginVertical: spacing.xs,
  },
  addressLabel: {
    color: colors.gray,
    marginBottom: 4,
  },
  divider: {
    marginVertical: spacing.sm,
  },
  distanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  priceTitle: {
    color: colors.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
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
  totalLabel: {
    color: colors.dark,
    fontWeight: '700',
  },
  totalValue: {
    color: colors.primary,
    fontWeight: '700',
  },
  priceLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  priceLoadingText: {
    color: colors.gray,
  },
  infoCard: {
    backgroundColor: '#FFF3CD',
    marginBottom: spacing.md,
  },
  conditions: {
    color: colors.dark,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  backButton: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
  submitButton: {
    flex: 2,
    paddingVertical: spacing.sm,
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
