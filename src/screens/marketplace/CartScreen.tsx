import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, KeyboardAvoidingView } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootState } from '../../store';
import { removeFromCart, selectCartSubtotal, updateNotes, updateQuantity } from '../../store/slices/cartSlice';
import { useCheckoutOrderMutation, useQuoteOrderMutation } from '../../store/api/marketplaceApi';
import { useGetAddressesQuery } from '../../store/api/authApi';
import { useCurrencyFormatter } from '../../hooks/useCurrencyFormatter';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { colors } from '../../theme/colors';
import { ChocolateButton } from '../../components/shared/ChocolateButton';
import { QuantityStepper } from '../../components/marketplace/QuantityStepper';
import { AddressAutocompleteInput, AddressValue } from '../../components/shared/AddressAutocompleteInput';
import type { FulfillmentOption, FulfillmentType, MarketplaceQuote } from '../../types/marketplace';

const FULFILLMENT_ICONS: Record<FulfillmentType, string> = {
  checkallpack: 'moped',
  transport: 'truck-fast',
  seller_delivery: 'storefront-outline',
  pickup: 'shopping-outline',
};
const PREFERRED_ORDER: FulfillmentType[] = ['checkallpack', 'transport', 'seller_delivery', 'pickup'];
const OTHER_ADDRESS = '__other__';

const ERROR_KEYS: Record<string, string> = {
  SHOP_CLOSED: 'marketplace.error_shop_closed',
  PRODUCT_UNAVAILABLE: 'marketplace.error_product_unavailable',
  INSUFFICIENT_STOCK: 'marketplace.error_insufficient_stock',
  MIN_ORDER: 'marketplace.error_min_order',
  FULFILLMENT_UNAVAILABLE: 'marketplace.error_fulfillment_unavailable',
  OWN_SHOP: 'marketplace.error_own_shop',
};

export const CartScreen = ({ navigation }: any) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { formatWithCurrency } = useCurrencyFormatter();
  const cart = useSelector((s: RootState) => s.cart);
  const subtotal = useSelector(selectCartSubtotal);
  const currency = cart.items[0]?.currency ?? '';

  const { data: savedAddresses = [] } = useGetAddressesQuery(undefined);
  const [addressChoice, setAddressChoice] = useState<string | null>(null);
  const [otherAddress, setOtherAddress] = useState<AddressValue>({ address: '', lat: null, lng: null });
  const [instructions, setInstructions] = useState('');
  const [fulfillment, setFulfillment] = useState<FulfillmentType | null>(null);
  const [quote, setQuote] = useState<MarketplaceQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [quoteOrder, { isLoading: quoting }] = useQuoteOrderMutation();
  const [checkoutOrder, { isLoading: paying }] = useCheckoutOrderMutation();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Adresse par défaut du client présélectionnée
  useEffect(() => {
    if (addressChoice === null && savedAddresses.length > 0) {
      const def = savedAddresses.find((a: any) => a.isDefault) ?? savedAddresses[0];
      setAddressChoice(def.id);
    } else if (addressChoice === null && savedAddresses.length === 0) {
      setAddressChoice(OTHER_ADDRESS);
    }
  }, [savedAddresses, addressChoice]);

  const deliveryAddress = useMemo((): AddressValue | null => {
    if (addressChoice === OTHER_ADDRESS) return otherAddress.lat != null ? otherAddress : null;
    const saved = savedAddresses.find((a: any) => a.id === addressChoice);
    return saved ? { address: saved.address, lat: saved.lat, lng: saved.lng } : null;
  }, [addressChoice, otherAddress, savedAddresses]);

  const payloadBase = useMemo(() => ({
    sellerId: cart.sellerId ?? '',
    items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, ...(i.notes ? { specialNotes: i.notes } : {}) })),
    ...(deliveryAddress
      ? { deliveryAddress: deliveryAddress.address, deliveryLat: deliveryAddress.lat!, deliveryLng: deliveryAddress.lng! }
      : {}),
  }), [cart.sellerId, cart.items, deliveryAddress]);

  const describeError = (err: any) => {
    const code: string | undefined = err?.data?.code;
    if (code && ERROR_KEYS[code]) return t(ERROR_KEYS[code], { amount: err?.data?.minOrderAmount, count: err?.data?.available });
    return err?.data?.message || t('common.error');
  };

  // Devis recalculé à chaque changement du panier ou de l'adresse
  useEffect(() => {
    if (!cart.sellerId || cart.items.length === 0) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const result = await quoteOrder({ ...payloadBase, fulfillmentType: 'pickup' }).unwrap();
        setQuote(result);
        setQuoteError(null);
        setFulfillment((current) => {
          if (current && result.fulfillmentOptions.find((o) => o.type === current && o.available)) return current;
          return PREFERRED_ORDER.find((type) => result.fulfillmentOptions.find((o) => o.type === type && o.available)) ?? null;
        });
      } catch (err) {
        setQuote(null);
        setQuoteError(describeError(err));
      }
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [payloadBase]);

  const selectedOption = quote?.fulfillmentOptions.find((o) => o.type === fulfillment && o.available);
  const deliveryFee = selectedOption?.fee ?? 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  const reasonLabel = (option: FulfillmentOption) =>
    option.reason ? t(`marketplace.unavailable_${option.reason.toLowerCase()}`) : '';

  const handlePay = async () => {
    if (!fulfillment || !cart.sellerId) return;
    if (fulfillment !== 'pickup' && !deliveryAddress) {
      Alert.alert(t('common.error'), t('marketplace.address_required'));
      return;
    }
    try {
      const { clientSecret, totalAmount } = await checkoutOrder({
        ...payloadBase,
        fulfillmentType: fulfillment,
        ...(fulfillment !== 'pickup' && instructions.trim() ? { deliveryInstructions: instructions.trim() } : {}),
      }).unwrap();
      navigation.navigate('StripePayment', { clientSecret, amount: totalAmount, type: 'marketplace' });
    } catch (err) {
      Alert.alert(t('common.error'), describeError(err));
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: tokens.background },
    content: { padding: spacing.md, paddingBottom: 140, gap: spacing.md },
    card: { backgroundColor: tokens.card, borderRadius: 14, padding: spacing.md, borderWidth: 1, borderColor: tokens.border },
    cardTitle: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, marginBottom: spacing.sm },
    item: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.border },
    itemImage: { width: 56, height: 56, borderRadius: 10, backgroundColor: tokens.backgroundAlt },
    itemName: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
    itemPrice: { fontSize: 13, color: tokens.primary, fontWeight: '700', marginVertical: 4 },
    notesInput: { backgroundColor: tokens.backgroundAlt, fontSize: 12, height: 36, marginTop: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: tokens.border },
    chipActive: { backgroundColor: tokens.primary, borderColor: tokens.primary },
    chipText: { fontSize: 13, color: tokens.text.primary },
    option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: 10, borderWidth: 1.5, borderColor: tokens.border, marginBottom: spacing.xs },
    optionActive: { borderColor: tokens.primary, backgroundColor: tokens.primary + '10' },
    optionTitle: { fontSize: 14, fontWeight: '600', color: tokens.text.primary },
    optionSub: { fontSize: 12, color: tokens.text.secondary },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    rowLabel: { color: tokens.text.secondary },
    totalLabel: { fontSize: 16, fontWeight: '800', color: tokens.text.primary },
    error: { color: colors.error, fontSize: 13 },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: tokens.card, borderTopWidth: 1, borderTopColor: tokens.border },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
    emptyText: { color: tokens.text.secondary, textAlign: 'center' },
  }), [tokens]);

  if (cart.items.length === 0) {
    return (
      <View style={[styles.container, styles.empty]}>
        <Icon name="cart-outline" size={64} color={tokens.border} />
        <Text style={styles.emptyText}>{t('marketplace.cart_empty')}</Text>
        <ChocolateButton onPress={() => navigation.navigate('MarketplaceHome')}>{t('marketplace.browse_shops')}</ChocolateButton>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{cart.sellerName}</Text>
            {cart.items.map((item) => (
              <View key={item.productId} style={styles.item}>
                {item.image ? <Image source={{ uri: item.image }} style={styles.itemImage} /> : <View style={styles.itemImage} />}
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemPrice}>{formatWithCurrency(item.price * item.quantity, item.currency)}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      max={item.maxQuantity}
                      onChange={(quantity) => dispatch(updateQuantity({ productId: item.productId, quantity }))}
                    />
                    <TouchableOpacity onPress={() => dispatch(removeFromCart(item.productId))} accessibilityLabel={t('marketplace.remove_item')}>
                      <Icon name="trash-can-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    mode="flat"
                    placeholder={t('marketplace.item_notes_placeholder')}
                    value={item.notes ?? ''}
                    onChangeText={(notes) => dispatch(updateNotes({ productId: item.productId, notes }))}
                    style={styles.notesInput}
                    dense
                  />
                </View>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('marketplace.delivery_address')}</Text>
            <View style={styles.chipRow}>
              {savedAddresses.map((a: any) => (
                <TouchableOpacity key={a.id} style={[styles.chip, addressChoice === a.id && styles.chipActive]} onPress={() => setAddressChoice(a.id)}>
                  <Icon name="map-marker" size={14} color={addressChoice === a.id ? '#FFFFFF' : tokens.primary} />
                  <Text style={[styles.chipText, addressChoice === a.id && { color: '#FFFFFF' }]}>{a.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={[styles.chip, addressChoice === OTHER_ADDRESS && styles.chipActive]} onPress={() => setAddressChoice(OTHER_ADDRESS)}>
                <Icon name="plus" size={14} color={addressChoice === OTHER_ADDRESS ? '#FFFFFF' : tokens.primary} />
                <Text style={[styles.chipText, addressChoice === OTHER_ADDRESS && { color: '#FFFFFF' }]}>{t('marketplace.other_address')}</Text>
              </TouchableOpacity>
            </View>
            {addressChoice === OTHER_ADDRESS ? (
              <AddressAutocompleteInput label={t('marketplace.delivery_address')} value={otherAddress} onChange={setOtherAddress} />
            ) : (
              deliveryAddress && <Text style={styles.optionSub}>{deliveryAddress.address}</Text>
            )}
            <TextInput
              mode="outlined"
              label={t('marketplace.delivery_instructions')}
              value={instructions}
              onChangeText={setInstructions}
              outlineColor={tokens.border}
              activeOutlineColor={tokens.primary}
              style={{ backgroundColor: tokens.backgroundAlt, marginTop: spacing.sm }}
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('marketplace.fulfillment_title')}</Text>
            {quoting && !quote && <ActivityIndicator color={tokens.primary} />}
            {quoteError && <Text style={styles.error}>{quoteError}</Text>}
            {quote && PREFERRED_ORDER.map((type) => {
              const option = quote.fulfillmentOptions.find((o) => o.type === type);
              if (!option || option.reason === 'WITHIN_COURIER_LIMITS' || option.reason === 'NOT_OFFERED') return null;
              const active = fulfillment === type && option.available;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.option, active && styles.optionActive, !option.available && { opacity: 0.5 }]}
                  disabled={!option.available}
                  onPress={() => setFulfillment(type)}
                >
                  <Icon name={FULFILLMENT_ICONS[type]} size={24} color={active ? tokens.primary : tokens.text.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle}>{t(`marketplace.fulfillment_${type}`)}</Text>
                    <Text style={styles.optionSub}>
                      {option.available ? t(`marketplace.fulfillment_${type}_desc`) : reasonLabel(option)}
                    </Text>
                  </View>
                  {option.available && (
                    <Text style={styles.optionTitle}>{option.fee > 0 ? formatWithCurrency(option.fee, currency) : t('marketplace.free')}</Text>
                  )}
                  <Icon name={active ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={active ? tokens.primary : tokens.border} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.card}>
            <View style={styles.row}><Text style={styles.rowLabel}>{t('marketplace.subtotal')}</Text><Text>{formatWithCurrency(subtotal, currency)}</Text></View>
            <View style={styles.row}><Text style={styles.rowLabel}>{t('marketplace.delivery_fee')}</Text><Text>{formatWithCurrency(deliveryFee, currency)}</Text></View>
            <View style={[styles.row, { marginTop: spacing.xs }]}><Text style={styles.totalLabel}>{t('marketplace.total')}</Text><Text style={styles.totalLabel}>{formatWithCurrency(total, currency)}</Text></View>
            <Text style={[styles.optionSub, { marginTop: spacing.xs }]}>{t('marketplace.payment_escrow_note')}</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <ChocolateButton onPress={handlePay} loading={paying} disabled={!fulfillment || paying || !!quoteError}>
            {t('marketplace.pay_amount', { amount: formatWithCurrency(total, currency) })}
          </ChocolateButton>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};
