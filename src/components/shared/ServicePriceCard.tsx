import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme/ThemeProvider';
import { HOUR_OPTIONS, ServicePriceBreakdown } from '../../utils/servicePricing';

interface Props {
  breakdown: ServicePriceBreakdown;
  /** Choix de la durée (prestation à l'heure, avant réservation) */
  onHoursChange?: (hours: number) => void;
}

const hoursLabel = (h: number) => (h < 1 ? `${Math.round(h * 60)} min` : Number.isInteger(h) ? `${h} h` : `${Math.floor(h)} h 30`);

/**
 * Détail du prix d'un service avant réservation.
 * À l'heure : déplacement + tarif × durée, urgence, suppléments, total maximum et règles de facturation.
 * Forfait : prix de base, urgence, suppléments, total.
 */
export const ServicePriceCard = ({ breakdown: b, onHoursChange }: Props) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: { borderRadius: 14, padding: 14, gap: 8, backgroundColor: tokens.primary + '0F', borderWidth: 1, borderColor: tokens.primary + '30' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, flex: 1 },
    badge: { fontSize: 12, fontWeight: '700', color: tokens.primary, backgroundColor: tokens.primary + '1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
    label: { fontSize: 13, color: tokens.text.secondary },
    chips: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: tokens.border, backgroundColor: tokens.card },
    chipOn: { borderColor: tokens.primary, backgroundColor: tokens.primary },
    chipText: { fontSize: 13, fontWeight: '600', color: tokens.text.primary },
    chipTextOn: { color: '#fff' },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
    rowLabel: { fontSize: 13, color: tokens.text.secondary, flexShrink: 1 },
    rowValue: { fontSize: 13, color: tokens.text.primary, fontWeight: '600' },
    divider: { height: 1, backgroundColor: tokens.border, marginVertical: 2 },
    totalLabel: { fontSize: 15, fontWeight: '700', color: tokens.text.primary, flexShrink: 1 },
    totalValue: { fontSize: 17, fontWeight: '800', color: tokens.primary },
    note: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
    noteText: { fontSize: 12, lineHeight: 17, color: tokens.text.secondary, flex: 1 },
  }), [tokens]);

  const cur = b.currency;
  const money = (v: number) => `${v} ${cur}`;
  const hourly = b.mode === 'hourly';
  const minHours = b.minimumHours;
  const options = HOUR_OPTIONS.filter((h) => h >= minHours);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Icon name={hourly ? 'clock-outline' : 'tag-outline'} size={20} color={tokens.primary} />
        <Text style={styles.title}>{t(hourly ? 'service_pricing.title_hourly' : 'service_pricing.title_flat')}</Text>
        {hourly && <Text style={styles.badge}>{t('service_pricing.rate_badge', { rate: b.hourlyRate, currency: cur })}</Text>}
      </View>

      {hourly && onHoursChange && (
        <>
          <Text style={styles.label}>{t('service_pricing.choose_duration')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {options.map((h) => {
              const on = b.hours === h;
              return (
                <TouchableOpacity key={h} style={[styles.chip, on && styles.chipOn]} onPress={() => onHoursChange(h)} accessibilityState={{ selected: on }}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{hoursLabel(h)}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {hourly ? (
        <>
          {b.callOutFee > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t('service_pricing.call_out_fee')}</Text>
              <Text style={styles.rowValue}>{money(b.callOutFee)}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('service_pricing.labor_line', { rate: b.hourlyRate, currency: cur, hours: hoursLabel(b.hours ?? minHours) })}</Text>
            <Text style={styles.rowValue}>{money(b.labor)}</Text>
          </View>
        </>
      ) : (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('service_pricing.flat_line')}</Text>
          <Text style={styles.rowValue}>{money(b.labor)}</Text>
        </View>
      )}
      {b.urgencyApplied && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('booking_request.price_breakdown_urgency', { pct: b.urgencyPct })}</Text>
          <Text style={styles.rowValue}>+{money(b.urgencyAmount)}</Text>
        </View>
      )}
      {b.extras > 0 && (
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{t('service_pricing.extras_line')}</Text>
          <Text style={styles.rowValue}>+{money(b.extras)}</Text>
        </View>
      )}
      <View style={styles.divider} />
      <View style={styles.row}>
        <Text style={styles.totalLabel}>{t(hourly ? 'service_pricing.total_max' : 'service_pricing.total_from')}</Text>
        <Text style={styles.totalValue}>{money(b.total)}</Text>
      </View>

      {hourly && (
        <View style={styles.note}>
          <Icon name="information-outline" size={15} color={tokens.text.secondary} />
          <Text style={styles.noteText}>
            {t('service_pricing.hourly_rules', { min: hoursLabel(minHours), hours: hoursLabel(b.hours ?? minHours) })}
          </Text>
        </View>
      )}
    </View>
  );
};
