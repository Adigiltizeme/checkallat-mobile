import React, { useMemo, useState } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useGetPublicSettingsQuery } from '../../store/api/settingsApi';
import { useAnalyticsConsent } from '../../hooks/useAnalytics';
import { ChocolateButton } from './ChocolateButton';
import { useAppTheme } from '../../theme/ThemeProvider';
import { LEGAL_URLS } from '../../config/api';

/**
 * Demande unique d'accord pour la mesure d'usage (écrans visités, étapes clés).
 * Accepter et refuser sont aussi simples l'un que l'autre ; le choix se modifie ensuite dans Profil.
 * N'apparaît jamais par-dessus l'acceptation des CGU.
 */
export const AnalyticsConsentPrompt = () => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const { consent, loaded, setConsent } = useAnalyticsConsent();
  const [saving, setSaving] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const { data: publicSettings } = useGetPublicSettingsQuery(undefined, { skip: !isAuthenticated });

  const styles = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    card: {
      backgroundColor: tokens.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      padding: 20, paddingBottom: 32, gap: 12,
    },
    iconWrap: {
      alignSelf: 'center', width: 52, height: 52, borderRadius: 26,
      alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.primary + '18',
    },
    title: { fontSize: 18, fontWeight: '700', color: tokens.text.primary, textAlign: 'center' },
    body: { fontSize: 14, color: tokens.text.secondary, lineHeight: 21, textAlign: 'center' },
    points: { borderRadius: 12, padding: 12, backgroundColor: tokens.primary + '10', gap: 6 },
    point: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
    pointText: { flex: 1, fontSize: 13, lineHeight: 19, color: tokens.text.secondary },
    linkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
    linkText: { color: tokens.primary, fontWeight: '600', fontSize: 13 },
    buttons: { flexDirection: 'row', gap: 10 },
    button: { flex: 1 },
  }), [tokens]);

  // Acceptation des CGU en attente : elle passe en premier
  const termsPending =
    isAuthenticated && !!user && !!publicSettings?.legalTermsVersion && user.termsVersion !== publicSettings.legalTermsVersion;
  if (!loaded || consent !== null || termsPending) return null;

  const choose = async (granted: boolean) => {
    setSaving(true);
    try {
      await setConsent(granted);
    } finally {
      setSaving(false);
    }
  };

  const points = ['analytics.consent_point_what', 'analytics.consent_point_not', 'analytics.consent_point_change'];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => choose(false)} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="chart-line" size={26} color={tokens.primary} />
          </View>
          <Text style={styles.title}>{t('analytics.consent_title')}</Text>
          <Text style={styles.body}>{t('analytics.consent_body')}</Text>
          <View style={styles.points}>
            {points.map((key) => (
              <View key={key} style={styles.point}>
                <Icon name="check" size={16} color={tokens.primary} />
                <Text style={styles.pointText}>{t(key)}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(LEGAL_URLS.privacy)}>
            <Icon name="open-in-new" size={14} color={tokens.primary} />
            <Text style={styles.linkText}>{t('legal.privacy_link')}</Text>
          </TouchableOpacity>
          <View style={styles.buttons}>
            <ChocolateButton variant="outline" style={styles.button} onPress={() => choose(false)} disabled={saving}>
              {t('analytics.consent_refuse')}
            </ChocolateButton>
            <ChocolateButton style={styles.button} onPress={() => choose(true)} disabled={saving}>
              {t('analytics.consent_accept')}
            </ChocolateButton>
          </View>
        </View>
      </View>
    </Modal>
  );
};
