import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput as RNTextInput,
  ActivityIndicator,
} from 'react-native';
import { Text } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { ProStackParamList } from '../../navigation/types';
import {
  useGetCategoriesQuery,
  useGetProOfferingsQuery,
  useEnsureOfferingMutation,
  useAddOfferingExtraMutation,
  useDeleteOfferingExtraMutation,
} from '../../store/api/servicesApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { formatCurrency, CURRENCY_CONFIG } from '../../config/currency';
import { RootState } from '../../store';

type Props = StackScreenProps<ProStackParamList, 'ProOfferings'>;

interface ExtraItem {
  id: string;
  label: string;
  price: number;
  isOptional: boolean;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string | null;
}

// ─── Carte par catégorie ──────────────────────────────────────────────────────

const CategoryCard = ({
  categorySlug,
  categoryLabel,
  proId,
  adminBasePrice,
  adminCurrency,
  tokens,
  styles,
  t,
}: {
  categorySlug: string;
  categoryLabel: string;
  proId: string;
  adminBasePrice: number | null;
  adminCurrency: string;
  tokens: any;
  styles: any;
  t: any;
}) => {
  const [offeringId, setOfferingId] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [isOptional, setIsOptional] = useState(false);

  const [ensureOffering] = useEnsureOfferingMutation();
  const [addExtra, { isLoading: adding }] = useAddOfferingExtraMutation();
  const [deleteExtra] = useDeleteOfferingExtraMutation();

  // Polling pour recevoir les mises à jour de statut (approuvé/rejeté) en temps réel
  const { data: allOfferings = [] } = useGetProOfferingsQuery(proId, {
    pollingInterval: 8000,
    refetchOnMountOrArgChange: true,
    skip: !proId,
  });

  const polledOffering = (allOfferings as any[]).find((o: any) => o.category?.slug === categorySlug);
  const effectiveOfferingId = offeringId ?? polledOffering?.id ?? null;
  const extras: ExtraItem[] = polledOffering?.extras ?? [];
  // Afficher le spinner uniquement si ni polling ni init n'ont encore fourni de données
  const loading = initializing && !polledOffering;

  // Créer l'offering s'il n'existe pas encore (une seule fois au montage)
  useEffect(() => {
    if (!proId || !categorySlug) return;
    ensureOffering({ proId, categorySlug })
      .unwrap()
      .then((result) => setOfferingId(result.id))
      .catch(() => {})
      .finally(() => setInitializing(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proId, categorySlug]);

  const includedExtras = extras.filter((e) => !e.isOptional);
  const optionalExtras = extras.filter((e) => e.isOptional);
  const approvedIncluded = includedExtras.filter((e) => e.status === 'approved');
  const total = (adminBasePrice ?? 0) + approvedIncluded.reduce((s, e) => s + e.price, 0);

  const handleAdd = async () => {
    if (!effectiveOfferingId) {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
      return;
    }
    if (!newLabel.trim()) {
      Alert.alert(t('common.error'), t('pro_space.extra_label_required'));
      return;
    }
    const parsedPrice = parseFloat(newPrice);
    if (!newPrice.trim() || isNaN(parsedPrice) || parsedPrice < 0) {
      Alert.alert(t('common.error'), t('pro_space.extra_price_required'));
      return;
    }
    try {
      await addExtra({
        offeringId: effectiveOfferingId,
        label: newLabel.trim(),
        price: parsedPrice,
        isOptional,
      }).unwrap();
      // addExtra invalide le tag 'Offering' → useGetProOfferingsQuery refetch automatique
      setNewLabel('');
      setNewPrice('');
      setIsOptional(false);
      setShowAddModal(false);
    } catch {
      Alert.alert(t('common.error'), t('pro_space.error_update'));
    }
  };

  const handleDelete = (extraId: string) => {
    Alert.alert(t('common.delete'), t('pro_space.delete_extra_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try {
            await deleteExtra(extraId).unwrap();
            // deleteExtra invalide le tag 'Offering' → useGetProOfferingsQuery refetch automatique
          } catch {
            Alert.alert(t('common.error'), t('pro_space.error_update'));
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.catTitle}>{categoryLabel}</Text>

      {/* Prix de base admin — source : useGetCategoriesQuery (fiable) */}
      <View style={styles.basePriceRow}>
        <Icon name="shield-check-outline" size={16} color={tokens.text.secondary} />
        <Text style={styles.basePriceLabel}>{t('pro_space.admin_base_price')}</Text>
        <Text style={styles.basePriceValue}>
          {adminBasePrice !== null ? formatCurrency(adminBasePrice) : t('pro_space.admin_base_price_none')}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Suppléments inclus */}
      <Text style={styles.sectionLabel}>{t('pro_space.extras_included')}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={tokens.primary} style={{ marginBottom: spacing.xs }} />
      ) : (
        <>
          {includedExtras.length === 0 && (
            <Text style={styles.emptyExtras}>{t('pro_space.no_extras_yet')}</Text>
          )}
          {includedExtras.map((extra) => (
            <View key={extra.id} style={{ marginBottom: 8 }}>
              <View style={styles.extraRow}>
                <Text style={styles.extraLabel} numberOfLines={1}>{extra.label}</Text>
                <Text style={styles.extraPrice}>+{formatCurrency(extra.price)}</Text>
                <TouchableOpacity
                  onPress={() => handleDelete(extra.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              {extra.status === 'pending' && (
                <Text style={styles.statusPending}>{t('pro_space.extra_status_pending')}</Text>
              )}
              {extra.status === 'rejected' && (
                <>
                  <Text style={styles.statusRejected}>{t('pro_space.extra_status_rejected')}</Text>
                  {extra.adminNote ? (
                    <Text style={styles.adminNote}>{t('pro_space.extra_admin_note')} {extra.adminNote}</Text>
                  ) : null}
                </>
              )}
            </View>
          ))}
        </>
      )}

      {/* Suppléments optionnels */}
      {optionalExtras.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>
            {t('pro_space.extras_optional')}
          </Text>
          {optionalExtras.map((extra) => (
            <View key={extra.id} style={{ marginBottom: 8 }}>
              <View style={styles.extraRow}>
                <Text style={[styles.extraLabel, { color: tokens.text.secondary }]} numberOfLines={1}>
                  {extra.label}
                </Text>
                <Text style={[styles.extraPrice, { color: tokens.text.secondary }]}>
                  +{formatCurrency(extra.price)}
                </Text>
                <TouchableOpacity
                  onPress={() => handleDelete(extra.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
              {extra.status === 'pending' && (
                <Text style={styles.statusPending}>{t('pro_space.extra_status_pending')}</Text>
              )}
              {extra.status === 'rejected' && (
                <>
                  <Text style={styles.statusRejected}>{t('pro_space.extra_status_rejected')}</Text>
                  {extra.adminNote ? (
                    <Text style={styles.adminNote}>{t('pro_space.extra_admin_note')} {extra.adminNote}</Text>
                  ) : null}
                </>
              )}
            </View>
          ))}
        </>
      )}

      {/* Bouton ajouter */}
      <TouchableOpacity style={styles.addExtraBtn} onPress={() => setShowAddModal(true)}>
        <Icon name="plus-circle-outline" size={16} color={tokens.primary} />
        <Text style={styles.addExtraBtnText}>{t('pro_space.add_extra')}</Text>
      </TouchableOpacity>

      {/* Total */}
      {adminBasePrice !== null && (
        <>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{t('pro_space.total_price')}</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
          {optionalExtras.length > 0 && (
            <Text style={styles.totalNote}>
              {t('pro_space.total_note', {
                amount: formatCurrency(optionalExtras.reduce((s, e) => s + e.price, 0)),
              })}
            </Text>
          )}
        </>
      )}

      {/* Modal ajout extra */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowAddModal(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t('pro_space.add_extra_title')}</Text>

            <Text style={styles.fieldLabel}>{t('pro_space.extra_label_field')}</Text>
            <RNTextInput
              style={[styles.input, {
                color: tokens.text.primary,
                borderColor: tokens.border,
                backgroundColor: tokens.backgroundAlt,
              }]}
              value={newLabel}
              onChangeText={setNewLabel}
              placeholder={t('pro_space.extra_label_placeholder')}
              placeholderTextColor={tokens.text.secondary}
            />

            <Text style={[styles.fieldLabel, { marginTop: spacing.sm }]}>
              {t('pro_space.extra_price_field')}
            </Text>
            <RNTextInput
              style={[styles.input, {
                color: tokens.text.primary,
                borderColor: tokens.border,
                backgroundColor: tokens.backgroundAlt,
              }]}
              value={newPrice}
              onChangeText={setNewPrice}
              placeholder="0"
              placeholderTextColor={tokens.text.secondary}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.optionalRow}
              onPress={() => setIsOptional((v) => !v)}
            >
              <Icon
                name={isOptional ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={isOptional ? tokens.primary : tokens.text.secondary}
              />
              <Text style={styles.optionalLabel}>{t('pro_space.extra_is_optional')}</Text>
            </TouchableOpacity>
            <Text style={styles.optionalHint}>
              {isOptional ? t('pro_space.extra_optional_hint') : t('pro_space.extra_included_hint')}
            </Text>

            <TouchableOpacity
              style={[styles.confirmBtn, adding && { opacity: 0.6 }]}
              onPress={handleAdd}
              disabled={adding}
            >
              <Text style={styles.confirmBtnText}>
                {adding ? t('common.loading') : t('pro_space.add_extra_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Écran principal ──────────────────────────────────────────────────────────

export const ProOfferingsScreen = ({ navigation: _nav }: Props) => {
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
    emptyContainer: { alignItems: 'center', paddingTop: spacing.xl * 2, gap: spacing.md },
    emptyText: { fontSize: 15, fontWeight: '600', color: tokens.text.primary },
    emptyHint: { fontSize: 13, color: tokens.text.secondary, textAlign: 'center' },

    card: {
      backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md,
      borderWidth: 1, borderColor: tokens.border, marginBottom: spacing.md,
    },
    catTitle: { fontSize: 16, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.sm },

    basePriceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    basePriceLabel: { flex: 1, fontSize: 13, color: tokens.text.secondary },
    basePriceValue: { fontSize: 13, fontWeight: '600', color: tokens.text.secondary },

    divider: { height: 1, backgroundColor: tokens.border, marginVertical: spacing.sm },
    sectionLabel: {
      fontSize: 12, fontWeight: '700', color: tokens.text.secondary,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs,
    },
    emptyExtras: { fontSize: 13, color: tokens.text.secondary, fontStyle: 'italic', marginBottom: spacing.xs },

    extraRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
    extraLabel: { flex: 1, fontSize: 13, color: tokens.text.primary },
    extraPrice: { fontSize: 13, fontWeight: '600', color: tokens.primary },

    statusPending: { fontSize: 11, color: '#B8860B', fontStyle: 'italic', marginTop: 2 },
    statusRejected: { fontSize: 11, color: colors.error, fontStyle: 'italic', marginTop: 2 },
    adminNote: { fontSize: 11, color: tokens.text.secondary, fontStyle: 'italic' },

    addExtraBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs, paddingVertical: 6 },
    addExtraBtnText: { fontSize: 13, color: tokens.primary, fontWeight: '600' },

    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    totalLabel: { fontSize: 14, fontWeight: '700', color: tokens.text.primary },
    totalValue: { fontSize: 16, fontWeight: '800', color: tokens.primary },
    totalNote: { fontSize: 11, color: tokens.text.secondary, marginTop: 2, fontStyle: 'italic' },

    modalOverlay: { flex: 1, backgroundColor: '#00000055', justifyContent: 'flex-end' },
    modalSheet: {
      backgroundColor: tokens.modal ?? tokens.card,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: spacing.lg, paddingBottom: spacing.xl,
    },
    modalHandle: {
      width: 40, height: 4, backgroundColor: tokens.border,
      borderRadius: 2, alignSelf: 'center', marginBottom: spacing.md,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.md },
    fieldLabel: { fontSize: 13, fontWeight: '600', color: tokens.text.primary, marginBottom: spacing.xs },
    input: {
      borderWidth: 1, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 10,
      fontSize: 14, marginBottom: spacing.xs,
    },
    optionalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    optionalLabel: { fontSize: 14, color: tokens.text.primary },
    optionalHint: { fontSize: 12, color: tokens.text.secondary, marginTop: 4, marginBottom: spacing.md },
    confirmBtn: {
      backgroundColor: tokens.primary, borderRadius: 12, paddingVertical: 14,
      alignItems: 'center', marginTop: spacing.xs,
    },
    confirmBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  }), [tokens]);

  const user = useSelector((state: RootState) => state.auth.user);
  const pro = (user as any)?.pro;
  const proId: string = pro?.id ?? '';
  const serviceCategories: string[] = pro?.serviceCategories ?? [];

  // Refetch au focus pour récupérer les changements de statut admin lors du retour sur l'écran
  const { refetch: refetchOfferings } = useGetProOfferingsQuery(proId, { skip: !proId });
  useRefetchOnFocus(refetchOfferings);

  // Prix admin par slug — même source que BookingRequestStep4 : GET /services/categories
  const countryCode = useSelector((s: RootState) =>
    (s as any).location?.selectedCountryCode ?? (s as any).location?.detectedCountryCode ?? undefined
  );
  const { data: allCategories = [] } = useGetCategoriesQuery(
    { activeOnly: true, countryCode },
    { skip: serviceCategories.length === 0 }
  );
  const categoryPricing = useMemo(() => {
    const map: Record<string, { basePrice: number | null; currency: string }> = {};
    (allCategories as any[]).forEach((c: any) => {
      map[c.slug] = { basePrice: c.basePrice ?? null, currency: c.currency ?? CURRENCY_CONFIG.code };
    });
    return map;
  }, [allCategories]);

  const categoryLabels: Record<string, string> = {
    plumbing:      i18n.language === 'ar' ? 'السباكة'         : i18n.language === 'en' ? 'Plumbing'         : 'Plomberie',
    electricity:   i18n.language === 'ar' ? 'الكهرباء'        : i18n.language === 'en' ? 'Electricity'       : 'Électricité',
    painting:      i18n.language === 'ar' ? 'الدهان'          : i18n.language === 'en' ? 'Painting'          : 'Peinture',
    handyman:      i18n.language === 'ar' ? 'الأعمال اليدوية' : i18n.language === 'en' ? 'Handyman'          : 'Bricolage',
    cleaning:      i18n.language === 'ar' ? 'التنظيف'         : i18n.language === 'en' ? 'Cleaning'          : 'Ménage',
    carpentry:     i18n.language === 'ar' ? 'النجارة'         : i18n.language === 'en' ? 'Carpentry'         : 'Menuiserie',
    air_condition: i18n.language === 'ar' ? 'تكييف الهواء'   : i18n.language === 'en' ? 'Air Conditioning'  : 'Climatisation',
  };

  if (!serviceCategories.length) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <View style={styles.emptyContainer}>
          <Icon name="briefcase-plus-outline" size={48} color={tokens.border} />
          <Text style={styles.emptyText}>{t('pro_space.no_categories_registered')}</Text>
          <Text style={styles.emptyHint}>{t('pro_space.no_categories_hint')}</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {serviceCategories.map((slug) => (
        <CategoryCard
          key={slug}
          categorySlug={slug}
          categoryLabel={categoryLabels[slug] ?? slug}
          proId={proId}
          adminBasePrice={categoryPricing[slug]?.basePrice ?? null}
          adminCurrency={categoryPricing[slug]?.currency ?? CURRENCY_CONFIG.code}
          tokens={tokens}
          styles={styles}
          t={t}
        />
      ))}
    </ScrollView>
  );
};
