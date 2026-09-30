import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Switch, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  useCreateSellerProductMutation,
  useDeleteSellerProductMutation,
  useGetDomainsQuery,
  useGetMySellerShopQuery,
  useGetSellerProductQuery,
  useGetSellerSectionsQuery,
  useUpdateSellerProductMutation,
} from '../../store/api/marketplaceApi';
import { uploadLocalImages } from '../../services/uploadService';
import { PhotoPickerGrid } from '../../components/shared/PhotoPickerGrid';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { localizedName, type MarketplaceDomain, type ProductPayload } from '../../types/marketplace';

const parseNumber = (value: string) => parseFloat(value.replace(',', '.'));

export const SellerProductFormScreen = ({ route, navigation }: any) => {
  const productId: string | undefined = route.params?.productId;
  const isEdit = !!productId;
  const { tokens } = useAppTheme();
  const { t, i18n } = useTranslation();
  const token = useSelector((s: RootState) => s.auth.token);

  const { data: product, isLoading: loadingProduct } = useGetSellerProductQuery(productId!, { skip: !isEdit, refetchOnMountOrArgChange: true });
  const { data: shop } = useGetMySellerShopQuery();
  const { data: allDomains = [] } = useGetDomainsQuery();
  const { data: sections = [] } = useGetSellerSectionsQuery();
  const [createProduct, { isLoading: creating }] = useCreateSellerProductMutation();
  const [updateProduct, { isLoading: updating }] = useUpdateSellerProductMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteSellerProductMutation();

  const [photos, setPhotos] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [description, setDescription] = useState('');
  const [descriptionAr, setDescriptionAr] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [showTranslations, setShowTranslations] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [price, setPrice] = useState('');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [weight, setWeight] = useState('');
  const [hasStock, setHasStock] = useState(true);
  const [stockQuantity, setStockQuantity] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isHalal, setIsHalal] = useState(true);
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [allergens, setAllergens] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!product) return;
    setPhotos(product.images);
    setName(product.name);
    setNameAr(product.nameAr === product.name ? '' : product.nameAr);
    setNameEn(product.nameEn ?? '');
    setDescription(product.description);
    setDescriptionAr(product.descriptionAr === product.description ? '' : product.descriptionAr);
    setDescriptionEn(product.descriptionEn ?? '');
    setCategoryId(product.categoryId);
    setSectionId(product.sectionId);
    setPrice(String(product.price));
    setCompareAtPrice(product.compareAtPrice != null ? String(product.compareAtPrice) : '');
    setWeight(product.weight != null ? String(product.weight) : '');
    setHasStock(product.hasStock);
    setStockQuantity(product.stockQuantity != null ? String(product.stockQuantity) : '');
    setLowStockThreshold(product.lowStockThreshold != null ? String(product.lowStockThreshold) : '');
    setIsAvailable(product.isAvailable);
    setIsHalal(product.isHalal);
    setIsVegetarian(product.isVegetarian);
    setIsVegan(product.isVegan);
    setAllergens(product.allergens.join(', '));
  }, [product]);

  // Domaines autorisés : ceux de la boutique et leurs sous-domaines
  const allowedDomains = useMemo(() => {
    const allowedIds = new Set((shop?.domains ?? []).map((d) => d.id));
    const list: MarketplaceDomain[] = [];
    for (const root of allDomains) {
      if (!allowedIds.has(root.id)) continue;
      list.push(root);
      for (const child of root.children ?? []) list.push(child);
    }
    return list;
  }, [shop, allDomains]);

  const selectedDomain = allowedDomains.find((d) => d.id === categoryId);
  const selectedRoot = selectedDomain?.parentId ? allowedDomains.find((d) => d.id === selectedDomain.parentId) : selectedDomain;
  const isFood = !!(selectedRoot?.requiresHealthCertificate || selectedRoot?.requiresColdChain);

  const priceValue = parseNumber(price);
  const weightValue = parseNumber(weight);
  const stockValue = parseInt(stockQuantity, 10);
  const canSave =
    photos.length > 0 && name.trim().length >= 2 && description.trim().length >= 5 && !!categoryId &&
    !isNaN(priceValue) && priceValue >= 0 && !isNaN(weightValue) && weightValue > 0 &&
    (!hasStock || (!isNaN(stockValue) && stockValue >= 0)) && !uploading && !creating && !updating;

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
    hint: { fontSize: 12, color: tokens.text.secondary, marginBottom: spacing.xs, lineHeight: 17 },
    input: { backgroundColor: tokens.backgroundAlt, marginBottom: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card },
    chipActive: { backgroundColor: tokens.primary, borderColor: tokens.primary },
    chipText: { fontSize: 13, color: tokens.text.primary },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
    switchLabel: { flex: 1, color: tokens.text.primary },
    link: { color: tokens.primary, fontWeight: '600', marginBottom: spacing.sm },
  }), [tokens]);

  if (isEdit && loadingProduct) {
    return <View style={[styles.container, { justifyContent: 'center' }]}><ActivityIndicator color={tokens.primary} /></View>;
  }

  const handleSave = async () => {
    if (!token || !canSave) return;
    try {
      setUploading(true);
      const images = await uploadLocalImages(photos, token);
      setUploading(false);
      const payload: ProductPayload = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        nameEn: nameEn.trim() || undefined,
        description: description.trim(),
        descriptionAr: descriptionAr.trim() || undefined,
        descriptionEn: descriptionEn.trim() || undefined,
        categoryId: categoryId!,
        sectionId: sectionId ?? null,
        images,
        price: priceValue,
        compareAtPrice: compareAtPrice.trim() && !isNaN(parseNumber(compareAtPrice)) ? parseNumber(compareAtPrice) : null,
        weight: weightValue,
        hasStock,
        ...(hasStock ? { stockQuantity: stockValue } : {}),
        ...(hasStock && lowStockThreshold.trim() ? { lowStockThreshold: parseInt(lowStockThreshold, 10) } : {}),
        isAvailable,
        ...(isFood
          ? {
              isHalal,
              isVegetarian,
              isVegan,
              allergens: allergens.split(',').map((a) => a.trim()).filter(Boolean),
            }
          : {}),
      };
      if (isEdit) await updateProduct({ id: productId!, ...payload }).unwrap();
      else await createProduct(payload).unwrap();
      navigation.goBack();
    } catch (err: any) {
      setUploading(false);
      const msg = err?.data?.message;
      Alert.alert(t('common.error'), Array.isArray(msg) ? msg.join('\n') : msg || t('seller.product_save_error'));
    }
  };

  const handleDelete = () => {
    Alert.alert(t('seller.delete_product_title'), t('seller.delete_product_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('seller.delete_product_confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await deleteProduct(productId!).unwrap();
            if (result.archived) Alert.alert(t('common.success'), t('seller.product_archived'));
            navigation.goBack();
          } catch (err: any) {
            Alert.alert(t('common.error'), err?.data?.message || t('common.error'));
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>{t('seller.product_photos')} *</Text>
        <Text style={styles.hint}>{t('seller.product_photos_hint')}</Text>
        <PhotoPickerGrid photos={photos} onPhotosChange={setPhotos} maxPhotos={10} mandatory />

        <Text style={styles.sectionTitle}>{t('seller.product_identity')}</Text>
        <TextInput mode="outlined" label={`${t('seller.product_name')} *`} value={name} onChangeText={setName}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        <TextInput mode="outlined" label={`${t('seller.product_description')} *`} value={description} onChangeText={setDescription} multiline numberOfLines={4}
          outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        <Text style={styles.link} onPress={() => setShowTranslations((v) => !v)}>
          {showTranslations ? t('seller.hide_translations') : t('seller.add_translations')}
        </Text>
        {showTranslations && (
          <>
            <TextInput mode="outlined" label={t('seller.product_name_ar')} value={nameAr} onChangeText={setNameAr}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { textAlign: 'right' }]} />
            <TextInput mode="outlined" label={t('seller.product_description_ar')} value={descriptionAr} onChangeText={setDescriptionAr} multiline
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { textAlign: 'right' }]} />
            <TextInput mode="outlined" label={t('seller.product_name_en')} value={nameEn} onChangeText={setNameEn}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
            <TextInput mode="outlined" label={t('seller.product_description_en')} value={descriptionEn} onChangeText={setDescriptionEn} multiline
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
          </>
        )}

        <Text style={styles.sectionTitle}>{t('seller.product_domain')} *</Text>
        <View style={styles.chips}>
          {allowedDomains.map((d) => (
            <TouchableOpacity key={d.id} style={[styles.chip, categoryId === d.id && styles.chipActive]} onPress={() => setCategoryId(d.id)}>
              <Text style={[styles.chipText, categoryId === d.id && { color: '#FFFFFF' }]}>
                {d.parentId ? '↳ ' : ''}{localizedName(d, i18n.language)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('seller.product_section')}</Text>
        <View style={styles.chips}>
          <TouchableOpacity style={[styles.chip, !sectionId && styles.chipActive]} onPress={() => setSectionId(null)}>
            <Text style={[styles.chipText, !sectionId && { color: '#FFFFFF' }]}>{t('seller.no_section')}</Text>
          </TouchableOpacity>
          {sections.map((s) => (
            <TouchableOpacity key={s.id} style={[styles.chip, sectionId === s.id && styles.chipActive]} onPress={() => setSectionId(s.id)}>
              <Text style={[styles.chipText, sectionId === s.id && { color: '#FFFFFF' }]}>{localizedName(s, i18n.language)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t('seller.product_price_weight')}</Text>
        <View style={styles.row}>
          <TextInput mode="outlined" label={`${t('seller.product_price')} *`} value={price} onChangeText={setPrice} keyboardType="decimal-pad"
            outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { flex: 1 }]} />
          <TextInput mode="outlined" label={t('seller.product_compare_price')} value={compareAtPrice} onChangeText={setCompareAtPrice} keyboardType="decimal-pad"
            outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { flex: 1 }]} />
        </View>
        <TextInput mode="outlined" label={`${t('seller.product_weight')} *`} value={weight} onChangeText={setWeight} keyboardType="decimal-pad"
          right={<TextInput.Affix text="kg" />} outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
        <Text style={styles.hint}>{t('seller.product_weight_hint')}</Text>

        <Text style={styles.sectionTitle}>{t('seller.product_stock')}</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('seller.track_stock')}</Text>
          <Switch value={hasStock} onValueChange={setHasStock} color={tokens.primary} />
        </View>
        {hasStock && (
          <View style={styles.row}>
            <TextInput mode="outlined" label={`${t('seller.stock_quantity')} *`} value={stockQuantity} onChangeText={setStockQuantity} keyboardType="number-pad"
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { flex: 1 }]} />
            <TextInput mode="outlined" label={t('seller.low_stock_alert')} value={lowStockThreshold} onChangeText={setLowStockThreshold} keyboardType="number-pad"
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={[styles.input, { flex: 1 }]} />
          </View>
        )}
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>{t('seller.product_available')}</Text>
          <Switch value={isAvailable} onValueChange={setIsAvailable} color={tokens.primary} />
        </View>

        {isFood && (
          <>
            <Text style={styles.sectionTitle}>{t('marketplace.product_info')}</Text>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('marketplace.tag_halal')}</Text><Switch value={isHalal} onValueChange={setIsHalal} color={tokens.primary} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('marketplace.tag_vegetarian')}</Text><Switch value={isVegetarian} onValueChange={setIsVegetarian} color={tokens.primary} /></View>
            <View style={styles.switchRow}><Text style={styles.switchLabel}>{t('marketplace.tag_vegan')}</Text><Switch value={isVegan} onValueChange={setIsVegan} color={tokens.primary} /></View>
            <TextInput mode="outlined" label={t('seller.allergens_input')} value={allergens} onChangeText={setAllergens}
              outlineColor={tokens.border} activeOutlineColor={tokens.primary} style={styles.input} />
          </>
        )}

        <ChocolateButton onPress={handleSave} disabled={!canSave} loading={uploading || creating || updating} style={{ marginTop: spacing.lg }}>
          {uploading ? t('transport.uploading_photos') : isEdit ? t('seller.save_product') : t('seller.create_product')}
        </ChocolateButton>
        {isEdit && (
          <ChocolateButton variant="ghost" onPress={handleDelete} loading={deleting} style={{ marginTop: spacing.sm }} labelStyle={{ color: colors.error }}>
            {t('seller.delete_product')}
          </ChocolateButton>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
