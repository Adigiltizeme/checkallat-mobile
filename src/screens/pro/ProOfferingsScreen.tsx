import React, { useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Switch,
} from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { getLocalizedName } from '../../utils/localize';
import { useSelector } from 'react-redux';
import { ProStackParamList } from '../../navigation/types';
import {
  useGetProOfferingsQuery,
  useCreateOfferingMutation,
  useUpdateOfferingMutation,
  useDeleteOfferingMutation,
} from '../../store/api/servicesApi';
import { useGetCategoriesQuery } from '../../store/api/servicesApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<ProStackParamList, 'ProOfferings'>;

const PRO_COLOR = '#10B981';

export const ProOfferingsScreen = ({ navigation }: Props) => {
  const { t, i18n } = useTranslation();
  const user = useSelector((state: RootState) => state.auth.user);
  const proId = user?.pro?.id ?? '';

  const { data: offerings = [], refetch } = useGetProOfferingsQuery(proId, {
    refetchOnMountOrArgChange: true,
    skip: !proId,
  });
  const { data: categories = [] } = useGetCategoriesQuery({ activeOnly: true });
  useRefetchOnFocus(refetch);

  const [createOffering, { isLoading: isCreating }] = useCreateOfferingMutation();
  const [updateOffering] = useUpdateOfferingMutation();
  const [deleteOffering] = useDeleteOfferingMutation();

  const [showModal, setShowModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [description, setDescription] = useState('');

  const resetForm = () => {
    setSelectedCategoryId('');
    setPriceMin('');
    setPriceMax('');
    setDescription('');
  };

  const handleCreate = async () => {
    if (!selectedCategoryId || !priceMin) return;
    try {
      await createOffering({
        proId,
        categoryId: selectedCategoryId,
        priceMin: parseFloat(priceMin),
        priceMax: priceMax ? parseFloat(priceMax) : undefined,
        description: description.trim() || undefined,
      }).unwrap();
      setShowModal(false);
      resetForm();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_create_offering'));
    }
  };

  const handleToggleAvailability = async (id: string, current: boolean) => {
    try {
      await updateOffering({ id, isAvailable: !current }).unwrap();
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      t('pro_space.delete_offering_title'),
      t('pro_space.delete_offering_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOffering(id).unwrap();
            } catch {
              Alert.alert(t('common.error'), t('pro_space.error_update'));
            }
          },
        },
      ],
    );
  };

  const renderOffering = ({ item }: { item: any }) => {
    const isAvailable = item.isAvailable !== false;
    const catName = getLocalizedName(item.category, i18n.language);

    return (
      <View style={styles.offeringCard}>
        <View style={styles.offeringTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.offeringName}>{catName}</Text>
            {item.description ? (
              <Text style={styles.offeringDesc} numberOfLines={2}>{item.description}</Text>
            ) : null}
            <Text style={styles.offeringPrice}>
              {item.priceMin
                ? item.priceMax
                  ? `${item.priceMin} – ${item.priceMax} EGP`
                  : `${item.priceMin}+ EGP`
                : t('pros.price_on_quote')}
            </Text>
          </View>
          <View style={styles.offeringActions}>
            <Switch
              value={isAvailable}
              onValueChange={() => handleToggleAvailability(item.id, isAvailable)}
              trackColor={{ false: colors.border, true: PRO_COLOR + '80' }}
              thumbColor={isAvailable ? PRO_COLOR : colors.gray}
            />
            <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
              <Icon name="trash-can-outline" size={18} color={colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        {!isAvailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>{t('pro_space.offering_unavailable')}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={offerings as any[]}
        keyExtractor={(item) => item.id}
        renderItem={renderOffering}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="briefcase-plus-outline" size={48} color={colors.border} />
            <Text style={styles.emptyText}>{t('pro_space.no_offerings')}</Text>
            <Text style={styles.emptyHint}>{t('pro_space.no_offerings_hint')}</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.85}
      >
        <Icon name="plus" size={26} color={colors.white} />
      </TouchableOpacity>

      {/* Modal création */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowModal(false)} activeOpacity={1}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('pro_space.add_offering_title')}</Text>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Catégorie */}
              <Text style={styles.fieldLabel}>{t('pro_space.offering_category')} *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.md }}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  {(categories as any[]).map((cat: any) => {
                    const sel = selectedCategoryId === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catChip, sel && styles.catChipActive]}
                        onPress={() => setSelectedCategoryId(cat.id)}
                      >
                        <Text style={[styles.catChipText, sel && { color: PRO_COLOR, fontWeight: '700' }]}>
                          {getLocalizedName(cat, i18n.language)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Prix */}
              <Text style={styles.fieldLabel}>{t('pro_space.offering_price_min')} *</Text>
              <TextInput
                mode="outlined"
                value={priceMin}
                onChangeText={setPriceMin}
                keyboardType="numeric"
                placeholder="Ex: 200"
                outlineColor={colors.border}
                activeOutlineColor={PRO_COLOR}
                style={{ backgroundColor: colors.white, marginBottom: spacing.md }}
                right={<TextInput.Affix text="EGP" />}
              />

              <Text style={styles.fieldLabel}>
                {t('pro_space.offering_price_max')} <Text style={{ color: colors.gray, fontWeight: '400' }}>({t('common.optional')})</Text>
              </Text>
              <TextInput
                mode="outlined"
                value={priceMax}
                onChangeText={setPriceMax}
                keyboardType="numeric"
                placeholder="Ex: 500"
                outlineColor={colors.border}
                activeOutlineColor={PRO_COLOR}
                style={{ backgroundColor: colors.white, marginBottom: spacing.md }}
                right={<TextInput.Affix text="EGP" />}
              />

              {/* Description */}
              <Text style={styles.fieldLabel}>
                {t('pro_space.offering_description')} <Text style={{ color: colors.gray, fontWeight: '400' }}>({t('common.optional')})</Text>
              </Text>
              <TextInput
                mode="outlined"
                value={description}
                onChangeText={setDescription}
                placeholder={t('pro_space.offering_desc_placeholder')}
                multiline
                numberOfLines={2}
                outlineColor={colors.border}
                activeOutlineColor={PRO_COLOR}
                style={{ backgroundColor: colors.white, marginBottom: spacing.lg }}
              />

              <TouchableOpacity
                style={[styles.createBtn, (!selectedCategoryId || !priceMin || isCreating) && { opacity: 0.5 }]}
                onPress={handleCreate}
                disabled={!selectedCategoryId || !priceMin || isCreating}
              >
                <Text style={styles.createBtnText}>
                  {isCreating ? t('common.loading') : t('pro_space.add_offering_btn')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  list: { padding: spacing.md, paddingBottom: 100 },

  offeringCard: {
    backgroundColor: colors.white, borderRadius: 14, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  offeringTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  offeringName: { fontSize: 14, fontWeight: '700', color: colors.dark },
  offeringDesc: { fontSize: 12, color: colors.gray, marginTop: 2, marginBottom: 4 },
  offeringPrice: { fontSize: 13, fontWeight: '600', color: PRO_COLOR },
  offeringActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  deleteBtn: { padding: 6 },
  unavailableBadge: {
    marginTop: spacing.sm, backgroundColor: colors.error + '15',
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  unavailableText: { fontSize: 11, color: colors.error, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyText: { fontSize: 15, fontWeight: '600', color: colors.dark },
  emptyHint: { fontSize: 13, color: colors.gray, textAlign: 'center' },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: PRO_COLOR, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%',
  },
  modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.dark, marginBottom: spacing.lg },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.dark, marginBottom: spacing.xs },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white,
  },
  catChipActive: { borderColor: PRO_COLOR, backgroundColor: PRO_COLOR + '15' },
  catChipText: { fontSize: 13, color: colors.gray },

  createBtn: {
    backgroundColor: PRO_COLOR, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginBottom: spacing.md,
  },
  createBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
