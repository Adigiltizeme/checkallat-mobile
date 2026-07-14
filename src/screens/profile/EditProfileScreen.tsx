import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Alert,
  TouchableOpacity,
  TextInput as RNTextInput,
  Image,
  Platform,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import { RootState } from '../../store';
import { updateUser } from '../../store/slices/authSlice';
import { useUpdateProfileMutation } from '../../store/api/authApi';
import { useUpdateDriverProfileMutation } from '../../store/api/transportApi';
import { useUpdateProProfileMutation } from '../../store/api/prosApi';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { API_CONFIG } from '../../config/api';

export const EditProfileScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.background,
  },
  avatarSection: {
    backgroundColor: tokens.card,
    alignItems: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: tokens.primary,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: tokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.white,
    fontSize: 32,
    fontWeight: '700',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: tokens.card,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.border,
  },
  avatarEditIcon: {
    fontSize: 14,
  },
  section: {
    backgroundColor: tokens.card,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: tokens.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  label: {
    color: tokens.text.primary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: tokens.text.primary,
    backgroundColor: tokens.backgroundAlt,
  },
  textArea: {
    height: 100,
    paddingTop: 10,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: tokens.primary,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: tokens.card,
  },
  phoneText: {
    fontSize: 15,
    color: tokens.text.primary,
    flex: 1,
  },
  phoneChevron: {
    fontSize: 20,
    color: tokens.primary,
    fontWeight: '600',
  },
  hint: {
    color: tokens.text.secondary,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  capacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capacityUnit: {
    fontSize: 15,
    color: tokens.text.secondary,
    fontWeight: '600',
  },
  docsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: tokens.primary,
    borderRadius: 8,
    backgroundColor: tokens.card,
  },
  docsLinkText: {
    color: tokens.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  docsChevron: {
    fontSize: 20,
    color: tokens.primary,
    fontWeight: '600',
  },
  radioBtn: {
    borderWidth: 1,
    borderColor: tokens.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  radioBtnActive: {
    borderColor: tokens.primary,
    backgroundColor: tokens.primary + '15',
  },
  radioBtnText: {
    color: tokens.text.secondary,
    fontSize: 14,
  },
  radioBtnTextActive: {
    color: tokens.primary,
    fontWeight: '600',
  },
  disclaimerBox: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: 6,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    marginTop: spacing.xs ?? 4,
  },
  disclaimerText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
  },
  photoSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: spacing.sm,
  },
  photoSlot: {
    width: 88,
    height: 88,
    position: 'relative',
  },
  photoSlotImage: {
    width: 88,
    height: 88,
    borderRadius: 8,
    backgroundColor: tokens.backgroundAlt,
  },
  photoSlotRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.error ?? '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotRemoveText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  photoSlotAdd: {
    width: 88,
    height: 88,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: tokens.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoSlotAddIcon: {
    fontSize: 28,
    color: tokens.primary,
    fontWeight: '300',
  },
  saveBtn: {
    backgroundColor: tokens.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  }), [tokens]);

  const { t } = useTranslation();
  const dispatch = useDispatch();

  const VEHICLE_TYPE_OPTIONS = [
    { value: 'van', label: t('profile.vehicle_van') },
    { value: 'small_truck', label: t('profile.vehicle_small_truck') },
    { value: 'large_truck', label: t('profile.vehicle_large_truck') },
  ];

  const user = useSelector((state: RootState) => state.auth.user);
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);
  const isPro = !!user?.pro;

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [updateDriverProfile, { isLoading: savingDriver }] = useUpdateDriverProfileMutation();
  const [updateProProfile, { isLoading: savingPro }] = useUpdateProProfileMutation();
  const isLoading = savingProfile || savingDriver || savingPro;

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Driver vehicle fields
  const [vehicleType, setVehicleType] = useState<string>(user?.driver?.vehicleType ?? 'van');
  const [vehiclePlate, setVehiclePlate] = useState<string>(user?.driver?.vehiclePlate ?? '');
  const [vehicleCapacity, setVehicleCapacity] = useState<string>(
    user?.driver?.vehicleCapacity ? String(user.driver.vehicleCapacity) : ''
  );

  // Portfolio fields
  const [portfolioPhotos, setPortfolioPhotos] = useState<string[]>(
    (isDriver ? user?.driver?.portfolioPhotos : user?.pro?.portfolioPhotos) ?? []
  );
  const [activityDescription, setActivityDescription] = useState<string>(
    user?.driver?.activityDescription ?? ''
  );
  const [bio, setBio] = useState<string>(user?.pro?.bio ?? '');
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  const lastNameRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const plateRef = useRef<RNTextInput>(null);

  const originalPortfolioPhotos: string[] =
    (isDriver ? user?.driver?.portfolioPhotos : user?.pro?.portfolioPhotos) ?? [];

  const profileHasChanges =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '') ||
    email.trim() !== (user?.email ?? '') ||
    photoUri !== null;

  const driverHasChanges =
    isDriver &&
    (vehicleType !== (user?.driver?.vehicleType ?? 'van') ||
      vehiclePlate.trim() !== (user?.driver?.vehiclePlate ?? '') ||
      vehicleCapacity.trim() !== (user?.driver?.vehicleCapacity ? String(user.driver.vehicleCapacity) : ''));

  const portfolioHasChanges =
    (isDriver || isPro) &&
    (JSON.stringify(portfolioPhotos) !== JSON.stringify(originalPortfolioPhotos) ||
      (isDriver && activityDescription !== (user?.driver?.activityDescription ?? '')) ||
      (isPro && bio !== (user?.pro?.bio ?? '')));

  const hasChanges = profileHasChanges || driverHasChanges || portfolioHasChanges;

  // ── Upload helpers ────────────────────────────────────────────────

  const uploadSinglePhoto = async (uri: string): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', {
      uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);
    const token = require('../../store').store.getState().auth.token;
    const resp = await fetch(`${API_CONFIG.BASE_URL}/upload/image`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'ngrok-skip-browser-warning': 'true',
      },
      body: formData,
    });
    if (!resp.ok) throw new Error('Upload failed');
    const json = await resp.json();
    return json.url as string;
  };

  const handlePickPhoto = () => {
    Alert.alert(
      t('transport.add_photo'),
      '',
      [
        {
          text: t('driver.take_photo_btn'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('transport.camera_permission_msg'));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setPhotoUri(result.assets[0].uri);
            }
          },
        },
        {
          text: t('driver.gallery_btn'),
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('profile.gallery_permission'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              aspect: [1, 1],
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setPhotoUri(result.assets[0].uri);
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    setUploadingPhoto(true);
    try {
      return await uploadSinglePhoto(uri);
    } catch {
      Alert.alert(t('common.error'), t('profile.photo_upload_error'));
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickPortfolioPhoto = () => {
    if (portfolioPhotos.length >= 3) return;
    Alert.alert(
      t('transport.add_photo'),
      '',
      [
        {
          text: t('driver.take_photo_btn'),
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('transport.camera_permission_msg'));
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setPortfolioPhotos(prev => [...prev, result.assets[0].uri]);
            }
          },
        },
        {
          text: t('driver.gallery_btn'),
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert(t('common.error'), t('profile.gallery_permission'));
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled && result.assets[0]) {
              setPortfolioPhotos(prev => [...prev, result.assets[0].uri]);
            }
          },
        },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleRemovePortfolioPhoto = (index: number) => {
    setPortfolioPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const resolvePortfolioPhotos = async (photos: string[]): Promise<string[] | null> => {
    const finalPhotos: string[] = [];
    for (const uri of photos) {
      if (uri.startsWith('http')) {
        finalPhotos.push(uri);
      } else {
        try {
          const url = await uploadSinglePhoto(uri);
          if (!url) return null;
          finalPhotos.push(url);
        } catch {
          Alert.alert(t('common.error'), t('profile.photo_upload_error'));
          return null;
        }
      }
    }
    return finalPhotos;
  };

  // ── Save ──────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t('common.error'), t('profile.first_name_required'));
      return;
    }
    if (!hasChanges) {
      navigation.goBack();
      return;
    }

    try {
      // 1. Update base profile
      const profileBody: Record<string, any> = {};
      if (firstName.trim() !== user?.firstName) profileBody.firstName = firstName.trim();
      if (lastName.trim() !== user?.lastName) profileBody.lastName = lastName.trim();
      if (email.trim() !== (user?.email ?? '')) profileBody.email = email.trim() || null;

      if (photoUri) {
        const url = await uploadPhoto(photoUri);
        if (!url) return;
        profileBody.profilePicture = url;
      }

      if (Object.keys(profileBody).length > 0) {
        const updated = await updateProfile(profileBody).unwrap();
        dispatch(updateUser(updated));
      }

      // 2. Update driver (vehicle info + portfolio)
      const driverBody: Record<string, any> = {};

      if (driverHasChanges) {
        if (vehicleType !== user?.driver?.vehicleType) driverBody.vehicleType = vehicleType;
        if (vehiclePlate.trim() !== user?.driver?.vehiclePlate)
          driverBody.vehiclePlate = vehiclePlate.trim();
        const capacityNum = parseFloat(vehicleCapacity);
        if (!isNaN(capacityNum) && capacityNum !== user?.driver?.vehicleCapacity)
          driverBody.vehicleCapacity = capacityNum;
      }

      if (isDriver && portfolioHasChanges) {
        setUploadingPortfolio(true);
        const finalPhotos = await resolvePortfolioPhotos(portfolioPhotos);
        setUploadingPortfolio(false);
        if (!finalPhotos) return;
        driverBody.portfolioPhotos = finalPhotos;
        driverBody.activityDescription = activityDescription.trim();
      }

      if (Object.keys(driverBody).length > 0) {
        await updateDriverProfile(driverBody).unwrap();
        dispatch(updateUser({ driver: { ...user?.driver, ...driverBody } }));
      }

      // 3. Update pro portfolio
      if (isPro && portfolioHasChanges) {
        setUploadingPortfolio(true);
        const finalPhotos = await resolvePortfolioPhotos(portfolioPhotos);
        setUploadingPortfolio(false);
        if (!finalPhotos) return;
        const proBody = { portfolioPhotos: finalPhotos, bio: bio.trim() };
        await updateProProfile({ id: user.pro.id, ...proBody }).unwrap();
        dispatch(updateUser({ pro: { ...user?.pro, ...proBody } }));
      }

      Alert.alert(t('common.success'), t('profile.save_success'), [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      const msg =
        err?.data?.message === 'Email already in use'
          ? t('profile.email_taken')
          : t('profile.save_error');
      Alert.alert(t('common.error'), msg);
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  const avatarSource = photoUri
    ? { uri: photoUri }
    : user?.profilePicture
    ? { uri: user.profilePicture }
    : null;

  const initials =
    (firstName[0] || 'U').toUpperCase() + (lastName[0] || '').toUpperCase();

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} style={styles.avatarWrapper}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditIcon}>📷</Text>
          </View>
        </TouchableOpacity>
        {uploadingPhoto && <ActivityIndicator size="small" color={tokens.primary} style={{ marginTop: 8 }} />}
      </View>

      {/* Infos personnelles */}
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>{t('profile.personal_info')}</Text>

        <Text variant="labelMedium" style={styles.label}>{t('profile.first_name')} *</Text>
        <RNTextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t('profile.first_name')}
          placeholderTextColor={tokens.text.secondary}
          returnKeyType="next"
          onSubmitEditing={() => lastNameRef.current?.focus()}
          autoCapitalize="words"
        />

        <Text variant="labelMedium" style={styles.label}>{t('profile.last_name')} *</Text>
        <RNTextInput
          ref={lastNameRef}
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder={t('profile.last_name')}
          placeholderTextColor={tokens.text.secondary}
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          autoCapitalize="words"
        />

        <Text variant="labelMedium" style={styles.label}>{t('profile.email')}</Text>
        <RNTextInput
          ref={emailRef}
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('auth.email_optional')}
          placeholderTextColor={tokens.text.secondary}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
        />

        <Text variant="labelMedium" style={styles.label}>{t('profile.phone')}</Text>
        <TouchableOpacity
          style={styles.phoneRow}
          onPress={() => navigation.navigate('ChangePhone')}
          activeOpacity={0.7}
        >
          <Text style={styles.phoneText}>{user?.phone ?? ''}</Text>
          <Text style={styles.phoneChevron}>›</Text>
        </TouchableOpacity>
        <Text variant="bodySmall" style={styles.hint}>
          {t('profile.phone_hint_tap')}
        </Text>
      </View>

      {/* Infos véhicule — chauffeur uniquement */}
      {isDriver && (
        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>{t('profile.vehicle_section')}</Text>

          <Text variant="labelMedium" style={styles.label}>{t('profile.vehicle_type')}</Text>
          <View style={styles.radioGroup}>
            {VEHICLE_TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.radioBtn, vehicleType === opt.value && styles.radioBtnActive]}
                onPress={() => setVehicleType(opt.value)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.radioBtnText,
                    vehicleType === opt.value && styles.radioBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text variant="labelMedium" style={styles.label}>{t('profile.license_plate')}</Text>
          <RNTextInput
            ref={plateRef}
            style={styles.input}
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
            placeholder={t('profile.plate_placeholder')}
            placeholderTextColor={tokens.text.secondary}
            autoCapitalize="characters"
            returnKeyType="next"
            onSubmitEditing={() => {}}
          />

          <Text variant="labelMedium" style={styles.label}>{t('driver_apply.vehicle_capacity')}</Text>
          <View style={styles.capacityRow}>
            <RNTextInput
              style={[styles.input, { flex: 1 }]}
              value={vehicleCapacity}
              onChangeText={setVehicleCapacity}
              placeholder="Ex: 10"
              placeholderTextColor={tokens.text.secondary}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.capacityUnit}>m³</Text>
          </View>

          <TouchableOpacity
            style={styles.docsLink}
            onPress={() => navigation.navigate('DriverDocuments')}
            activeOpacity={0.7}
          >
            <Text style={styles.docsLinkText}>{t('driver_docs.edit_link')}</Text>
            <Text style={styles.docsChevron}>›</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Vitrine — chauffeurs et prestataires */}
      {(isDriver || isPro) && (
        <View style={styles.section}>
          <Text variant="labelLarge" style={styles.sectionTitle}>{t('profile.portfolio_section')}</Text>

          <View style={styles.disclaimerBox}>
            <Text style={styles.disclaimerText}>{t('profile.portfolio_disclaimer')}</Text>
          </View>

          <Text variant="labelMedium" style={styles.label}>{t('profile.portfolio_photos')}</Text>
          <Text variant="bodySmall" style={styles.hint}>{t('profile.portfolio_photos_hint')}</Text>

          <View style={styles.photoSlots}>
            {portfolioPhotos.map((uri, index) => (
              <View key={index} style={styles.photoSlot}>
                <Image source={{ uri }} style={styles.photoSlotImage} />
                <TouchableOpacity
                  style={styles.photoSlotRemove}
                  onPress={() => handleRemovePortfolioPhoto(index)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.photoSlotRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {portfolioPhotos.length < 3 && (
              <TouchableOpacity
                style={styles.photoSlotAdd}
                onPress={handlePickPortfolioPhoto}
                activeOpacity={0.7}
              >
                <Text style={styles.photoSlotAddIcon}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {isDriver && (
            <>
              <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.md }]}>
                {t('profile.activity_description')}
              </Text>
              <RNTextInput
                style={[styles.input, styles.textArea]}
                value={activityDescription}
                onChangeText={setActivityDescription}
                placeholder={t('profile.activity_description_placeholder')}
                placeholderTextColor={tokens.text.secondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          )}

          {isPro && (
            <>
              <Text variant="labelMedium" style={[styles.label, { marginTop: spacing.md }]}>
                {t('profile.bio')}
              </Text>
              <RNTextInput
                style={[styles.input, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                placeholder={t('profile.bio_placeholder')}
                placeholderTextColor={tokens.text.secondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </>
          )}

          {uploadingPortfolio && (
            <ActivityIndicator size="small" color={tokens.primary} style={{ marginTop: 8 }} />
          )}
        </View>
      )}

      {/* Bouton Enregistrer */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          (!hasChanges || isLoading || uploadingPhoto || uploadingPortfolio) && styles.saveBtnDisabled,
        ]}
        onPress={handleSave}
        disabled={!hasChanges || isLoading || uploadingPhoto || uploadingPortfolio}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </KeyboardAvoidingView>
  );
};
