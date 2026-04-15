import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

interface PhotoPickerGridProps {
  /** Array of current photo URIs (local or Cloudinary URLs) */
  photos: string[];
  /** Called whenever the list changes (add or remove) */
  onPhotosChange: (photos: string[]) => void;
  /** Maximum allowed photos — default 5 */
  maxPhotos?: number;
  /** Show the ⚠️ mandatory notice badge — default false */
  mandatory?: boolean;
  /** Show an uploading spinner + progress text */
  isUploading?: boolean;
  uploadProgress?: string;
  /** Optional extra style for the outer container */
  containerStyle?: object;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Shared photo picker grid — used by:
 *  - TransportRequestStep1Screen (client, item photos)
 *  - DriverProofPhotosScreen (driver, proof photos before loading / after delivery)
 *
 * Features:
 *  - Alert-based picker: camera | gallery | cancel
 *  - Correct permission requests (camera vs media library separately)
 *  - Tap photo → full-screen zoom modal with prev/next navigation
 *  - Remove button per photo
 *  - Photo counter badge  - Optional mandatory notice
 *  - Upload progress indicator
 */
export const PhotoPickerGrid: React.FC<PhotoPickerGridProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 5,
  mandatory = false,
  isUploading = false,
  uploadProgress,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);

  // ── Permissions ────────────────────────────────────────────────────────────

  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('transport.camera_permission_msg'));
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), t('driver.gallery_permission_denied'));
      return false;
    }
    return true;
  };

  // ── Pickers ────────────────────────────────────────────────────────────────

  const pickFromCamera = async () => {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      onPhotosChange([...photos, result.assets[0].uri]);
    }
  };

  const pickFromGallery = async () => {
    if (!(await requestGalleryPermission())) return;

    const remaining = maxPhotos - photos.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (!result.canceled && result.assets.length > 0) {
      onPhotosChange([...photos, ...result.assets.map((a) => a.uri)]);
    }
  };

  const handleAdd = () => {
    if (photos.length >= maxPhotos) {
      Alert.alert(t('transport.photo_limit'), t('transport.photo_limit_msg'));
      return;
    }

    Alert.alert(
      t('transport.add_photo'),
      '',
      [
        { text: t('driver.take_photo_btn'), onPress: pickFromCamera },
        { text: t('driver.gallery_btn'), onPress: pickFromGallery },
        { text: t('common.cancel'), style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removePhoto = (index: number) => {
    onPhotosChange(photos.filter((_, i) => i !== index));
  };

  // ── Zoom modal ─────────────────────────────────────────────────────────────

  const closeZoom = () => setZoomIndex(null);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Mandatory badge */}
      {mandatory && (
        <View style={styles.mandatoryBadge}>
          <Text variant="bodySmall" style={styles.mandatoryText}>
            ⚠️ {t('driver.photos_mandatory_notice')}
          </Text>
        </View>
      )}

      {/* Photo count */}
      <Text variant="bodySmall" style={styles.counter}>
        {photos.length}/{maxPhotos} {t('transport.photos_count_label')}
      </Text>

      {/* Grid */}
      <View style={styles.grid}>
        {photos.map((uri, index) => (
          <TouchableOpacity
            key={index}
            style={styles.photoWrapper}
            onPress={() => setZoomIndex(index)}
            activeOpacity={0.85}
          >
            <Image source={{ uri }} style={styles.photo} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removePhoto(index)}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            >
              <Icon name="close-circle" size={22} color={colors.error} />
            </TouchableOpacity>
            {/* Zoom hint overlay */}
            <View style={styles.zoomHint}>
              <Icon name="magnify" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
        ))}

        {/* Add button */}
        {photos.length < maxPhotos && (
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={isUploading}>
            <Icon name="camera-plus" size={32} color={isUploading ? colors.border : colors.primary} />
            <Text variant="bodySmall" style={[styles.addBtnText, isUploading && { color: colors.border }]}>
              {t('transport.add_btn')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Upload progress */}
      {isUploading && (
        <View style={styles.progressRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text variant="bodySmall" style={styles.progressText}>
            {uploadProgress || t('transport.uploading_photos')}
          </Text>
        </View>
      )}

      {/* Zoom modal */}
      <Modal
        visible={zoomIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={closeZoom}
      >
        <View style={styles.modalBg}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text variant="titleMedium" style={styles.modalTitle}>
              {zoomIndex !== null
                ? t('transport.photo_counter', {
                    current: zoomIndex + 1,
                    total: photos.length,
                  })
                : ''}
            </Text>
            <IconButton icon="close" iconColor="#fff" size={24} onPress={closeZoom} />
          </View>

          {/* Image */}
          <View style={styles.modalImageContainer}>
            {zoomIndex !== null && (
              <Image
                source={{ uri: photos[zoomIndex] }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Navigation (only if multiple photos) */}
          {photos.length > 1 && (
            <View style={styles.modalNav}>
              <IconButton
                icon="chevron-left"
                iconColor="#fff"
                size={40}
                disabled={zoomIndex === 0}
                onPress={() => setZoomIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
                style={[styles.navBtn, zoomIndex === 0 && styles.navBtnDisabled]}
              />
              <IconButton
                icon="chevron-right"
                iconColor="#fff"
                size={40}
                disabled={zoomIndex === photos.length - 1}
                onPress={() =>
                  setZoomIndex((i) =>
                    i !== null && i < photos.length - 1 ? i + 1 : i
                  )
                }
                style={[
                  styles.navBtn,
                  zoomIndex === photos.length - 1 && styles.navBtnDisabled,
                ]}
              />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const PHOTO_SIZE = (SCREEN_WIDTH - spacing.lg * 2 - spacing.sm * 2) / 3;

const styles = StyleSheet.create({
  container: {},
  mandatoryBadge: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: '#F39C12',
  },
  mandatoryText: {
    color: '#856404',
  },
  counter: {
    color: colors.gray,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    overflow: 'visible',
    position: 'relative',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.white,
    borderRadius: 12,
    elevation: 2,
  },
  zoomHint: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 4,
    padding: 2,
  },
  addBtn: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
    gap: 4,
  },
  addBtnText: {
    color: colors.gray,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 8,
  },
  progressText: {
    color: colors.gray,
  },
  // Zoom modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  modalImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  modalNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
});
