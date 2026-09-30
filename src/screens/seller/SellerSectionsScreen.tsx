import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, Switch } from 'react-native';
import { Text, TextInput, ActivityIndicator, FAB } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useCreateSellerSectionMutation,
  useDeleteSellerSectionMutation,
  useGetSellerSectionsQuery,
  useReorderSellerSectionsMutation,
  useUpdateSellerSectionMutation,
} from '../../store/api/marketplaceApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { localizedName, type MarketplaceSection } from '../../types/marketplace';

export const SellerSectionsScreen = () => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const { data: sections = [], isLoading, refetch } = useGetSellerSectionsQuery(undefined, { refetchOnMountOrArgChange: true });
  useRefetchOnFocus(refetch);
  const [createSection, { isLoading: creating }] = useCreateSellerSectionMutation();
  const [updateSection, { isLoading: updating }] = useUpdateSellerSectionMutation();
  const [deleteSection] = useDeleteSellerSectionMutation();
  const [reorder] = useReorderSellerSectionsMutation();

  const [editing, setEditing] = useState<MarketplaceSection | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    list: { padding: spacing.md, paddingBottom: 100 },
    hint: { color: tokens.text.secondary, fontSize: 13, lineHeight: 19, marginBottom: spacing.md },
    card: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: tokens.card, borderRadius: 12, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: tokens.border },
    name: { fontSize: 15, fontWeight: '600', color: tokens.text.primary },
    meta: { fontSize: 12, color: tokens.text.secondary, marginTop: 2 },
    arrows: { gap: 2 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: tokens.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: spacing.lg, gap: spacing.sm },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: tokens.text.primary },
    input: { backgroundColor: tokens.backgroundAlt },
    empty: { alignItems: 'center', marginTop: spacing.xl * 2, gap: spacing.sm },
    fab: { position: 'absolute', right: spacing.md, bottom: spacing.md, backgroundColor: tokens.primary },
  }), [tokens]);

  const openCreate = () => {
    setEditing(null); setName(''); setNameAr(''); setNameEn(''); setModalOpen(true);
  };
  const openEdit = (section: MarketplaceSection) => {
    setEditing(section); setName(section.name); setNameAr(section.nameAr ?? ''); setNameEn(section.nameEn ?? ''); setModalOpen(true);
  };

  const save = async () => {
    const payload = { name: name.trim(), nameAr: nameAr.trim() || undefined, nameEn: nameEn.trim() || undefined };
    try {
      if (editing) await updateSection({ id: editing.id, ...payload }).unwrap();
      else await createSection(payload).unwrap();
      setModalOpen(false);
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    const ids = sections.map((s) => s.id);
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try { await reorder(ids).unwrap(); } catch (err: any) {
      Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
    }
  };

  const remove = (section: MarketplaceSection) => {
    Alert.alert(t('seller.delete_section_title'), t('seller.delete_section_msg', { name: section.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('seller.delete_section_confirm'),
        style: 'destructive',
        onPress: async () => {
          try { await deleteSection(section.id).unwrap(); } catch (err: any) {
            Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
          }
        },
      },
    ]);
  };

  if (isLoading) return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.hint}>{t('seller.sections_hint')}</Text>}
        renderItem={({ item, index }) => (
          <View style={[styles.card, !item.isActive && { opacity: 0.55 }]}>
            <View style={styles.arrows}>
              <TouchableOpacity onPress={() => move(index, -1)} disabled={index === 0} hitSlop={6}>
                <Icon name="chevron-up" size={22} color={index === 0 ? tokens.border : tokens.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => move(index, 1)} disabled={index === sections.length - 1} hitSlop={6}>
                <Icon name="chevron-down" size={22} color={index === sections.length - 1 ? tokens.border : tokens.primary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => openEdit(item)}>
              <Text style={styles.name}>{localizedName(item, i18n.language)}</Text>
              <Text style={styles.meta}>{t('seller.products_in_section', { count: item._count?.products ?? 0 })}</Text>
            </TouchableOpacity>
            <Switch
              value={item.isActive}
              onValueChange={(isActive) => { updateSection({ id: item.id, isActive }); }}
              trackColor={{ false: tokens.border, true: tokens.primary }}
              thumbColor={colors.white}
            />
            <TouchableOpacity onPress={() => remove(item)} hitSlop={6}>
              <Icon name="trash-can-outline" size={22} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="format-list-bulleted-square" size={48} color={tokens.border} />
            <Text style={{ color: tokens.text.secondary }}>{t('seller.no_sections')}</Text>
          </View>
        }
      />
      <FAB icon="plus" label={t('seller.add_section')} color="#FFFFFF" style={styles.fab} onPress={openCreate} />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editing ? t('seller.edit_section') : t('seller.add_section')}</Text>
            <TextInput mode="outlined" label={`${t('seller.section_name')} *`} value={name} onChangeText={setName}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
            <TextInput mode="outlined" label={t('seller.section_name_ar')} value={nameAr} onChangeText={setNameAr}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { textAlign: 'right' }]} />
            <TextInput mode="outlined" label={t('seller.section_name_en')} value={nameEn} onChangeText={setNameEn}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
            <ChocolateButton onPress={save} loading={creating || updating} disabled={!name.trim() || creating || updating}>{t('common.save')}</ChocolateButton>
            <ChocolateButton variant="outline" onPress={() => setModalOpen(false)}>{t('common.cancel')}</ChocolateButton>
          </View>
        </View>
      </Modal>
    </View>
  );
};
