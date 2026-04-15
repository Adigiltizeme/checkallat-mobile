import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
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
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { API_CONFIG } from '../../config/api';

// Vehicle type options built inside component using t()

export const EditProfileScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const VEHICLE_TYPE_OPTIONS = [
    { value: 'van', label: t('profile.vehicle_van') },
    { value: 'small_truck', label: t('profile.vehicle_small_truck') },
    { value: 'large_truck', label: t('profile.vehicle_large_truck') },
  ];
  const user = useSelector((state: RootState) => state.auth.user);
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);

  const [updateProfile, { isLoading: savingProfile }] = useUpdateProfileMutation();
  const [updateDriverProfile, { isLoading: savingDriver }] = useUpdateDriverProfileMutation();
  const isLoading = savingProfile || savingDriver;

  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [photoUri, setPhotoUri] = useState<string | null>(null); // local URI preview
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Driver fields
  const [vehicleType, setVehicleType] = useState<string>(user?.driver?.vehicleType ?? 'van');
  const [vehiclePlate, setVehiclePlate] = useState<string>(user?.driver?.vehiclePlate ?? '');

  const lastNameRef = useRef<RNTextInput>(null);
  const emailRef = useRef<RNTextInput>(null);
  const plateRef = useRef<RNTextInput>(null);

  const profileHasChanges =
    firstName.trim() !== (user?.firstName ?? '') ||
    lastName.trim() !== (user?.lastName ?? '') ||
    email.trim() !== (user?.email ?? '') ||
    photoUri !== null;

  const driverHasChanges =
    isDriver &&
    (vehicleType !== (user?.driver?.vehicleType ?? 'van') ||
      vehiclePlate.trim() !== (user?.driver?.vehiclePlate ?? ''));

  const hasChanges = profileHasChanges || driverHasChanges;

  // ── Photo picker ──────────────────────────────────────────────────

  const handlePickPhoto = async () => {
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
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      } as any);

      const token = (
        // access token from store via redux — we pass it manually
        require('../../store').store.getState().auth.token
      );
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
    } catch {
      Alert.alert(t('common.error'), t('profile.photo_upload_error'));
      return null;
    } finally {
      setUploadingPhoto(false);
    }
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
      const profileBody: Record<string, any> = {};
      if (firstName.trim() !== user?.firstName) profileBody.firstName = firstName.trim();
      if (lastName.trim() !== user?.lastName) profileBody.lastName = lastName.trim();
      if (email.trim() !== (user?.email ?? '')) profileBody.email = email.trim() || null;

      if (photoUri) {
        const url = await uploadPhoto(photoUri);
        if (!url) return; // upload failed, already alerted
        profileBody.profilePicture = url;
      }

      if (Object.keys(profileBody).length > 0) {
        const updated = await updateProfile(profileBody).unwrap();
        dispatch(updateUser(updated));
      }

      if (driverHasChanges) {
        const driverBody: Record<string, any> = {};
        if (vehicleType !== user?.driver?.vehicleType) driverBody.vehicleType = vehicleType;
        if (vehiclePlate.trim() !== user?.driver?.vehiclePlate)
          driverBody.vehiclePlate = vehiclePlate.trim();
        if (Object.keys(driverBody).length > 0) {
          await updateDriverProfile(driverBody).unwrap();
          // Update local driver state
          dispatch(updateUser({ driver: { ...user?.driver, ...driverBody } }));
        }
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
        {uploadingPhoto && <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 8 }} />}
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
          placeholderTextColor={colors.gray}
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
          placeholderTextColor={colors.gray}
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
          placeholderTextColor={colors.gray}
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="done"
        />

        <Text variant="labelMedium" style={styles.label}>{t('profile.phone')}</Text>
        <View style={styles.inputDisabled}>
          <Text style={styles.inputDisabledText}>{user?.phone ?? ''}</Text>
        </View>
        <Text variant="bodySmall" style={styles.hint}>
          {t('profile.phone_hint')}
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
            placeholderTextColor={colors.gray}
            autoCapitalize="characters"
            returnKeyType="done"
          />
        </View>
      )}

      {/* Bouton Enregistrer */}
      <TouchableOpacity
        style={[styles.saveBtn, (!hasChanges || isLoading || uploadingPhoto) && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={!hasChanges || isLoading || uploadingPhoto}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Text style={styles.saveBtnText}>{t('common.save')}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  avatarSection: {
    backgroundColor: colors.white,
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
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.primary,
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
    backgroundColor: colors.white,
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarEditIcon: {
    fontSize: 14,
  },
  section: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  label: {
    color: colors.dark,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.dark,
    backgroundColor: colors.white,
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
  },
  inputDisabledText: {
    fontSize: 15,
    color: colors.gray,
  },
  hint: {
    color: colors.gray,
    marginTop: 4,
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  radioBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  radioBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '15',
  },
  radioBtnText: {
    color: colors.gray,
    fontSize: 14,
  },
  radioBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
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
});
