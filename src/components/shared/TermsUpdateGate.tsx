import React, { useEffect, useMemo, useState } from 'react';
import { AppState, Modal, View, StyleSheet, Alert, TouchableOpacity, Linking } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { logout, updateUser } from '../../store/slices/authSlice';
import { useGetPublicSettingsQuery } from '../../store/api/settingsApi';
import { useAcceptTermsMutation, useLogoutApiMutation } from '../../store/api/authApi';
import { ChocolateButton } from './ChocolateButton';
import { LegalConsentText } from './LegalConsent';
import { useAppTheme } from '../../theme/ThemeProvider';
import { LEGAL_URLS } from '../../config/api';

/**
 * Bloque l'application tant que l'utilisateur n'a pas accepté la version en vigueur des CGU
 * et de la politique de confidentialité (nouvelle version publiée depuis le web-admin,
 * ou compte créé avant l'acceptation obligatoire).
 */
export const TermsUpdateGate = () => {
  const { t, i18n } = useTranslation();
  const { tokens } = useAppTheme();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { data: publicSettings, refetch } = useGetPublicSettingsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    // Nouvelle version publiée pendant que l'app est ouverte
    pollingInterval: 5 * 60_000,
  });
  // Monté hors des écrans (pas de focus de navigation) : on revérifie au retour au premier plan
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetch();
    });
    return () => sub.remove();
  }, [refetch]);
  const [acceptTerms, { isLoading }] = useAcceptTermsMutation();
  const [logoutApi] = useLogoutApiMutation();
  const [isFirstAcceptance] = useState(() => !user?.termsVersion);

  const currentVersion = publicSettings?.legalTermsVersion ?? null;
  const mustAccept = !!user && !!currentVersion && user.termsVersion !== currentVersion;

  const styles = useMemo(() => StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 20 },
    card: { backgroundColor: tokens.card, borderRadius: 16, padding: 20, gap: 14 },
    iconWrap: {
      alignSelf: 'center', width: 56, height: 56, borderRadius: 28,
      alignItems: 'center', justifyContent: 'center', backgroundColor: tokens.primary + '18',
    },
    title: { fontSize: 18, fontWeight: '700', color: tokens.text.primary, textAlign: 'center' },
    body: { fontSize: 14, color: tokens.text.secondary, lineHeight: 21, textAlign: 'center' },
    changes: { borderRadius: 12, padding: 12, backgroundColor: tokens.primary + '10', gap: 4 },
    changesTitle: { fontSize: 13, fontWeight: '700', color: tokens.text.primary },
    changesText: { fontSize: 13, lineHeight: 19, color: tokens.text.secondary },
    // Liens empilés : les libellés longs (FR/AR) reviennent à la ligne au lieu de déborder
    links: { alignItems: 'center', gap: 2 },
    linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, maxWidth: '100%' },
    linkText: { color: tokens.primary, fontWeight: '600', fontSize: 13, flexShrink: 1, textAlign: 'center' },
  }), [tokens]);

  if (!mustAccept) return null;

  const summaries = publicSettings?.legalTermsChangeSummary ?? null;
  const lang = (i18n.language ?? 'fr').slice(0, 2) as 'fr' | 'en' | 'ar';
  const changeSummary = summaries?.[lang] ?? summaries?.en ?? summaries?.fr ?? null;

  const handleAccept = async () => {
    try {
      const result = await acceptTerms().unwrap();
      dispatch(updateUser({ termsVersion: result.termsVersion, termsAcceptedAt: result.termsAcceptedAt }));
    } catch {
      Alert.alert(t('common.error'), t('legal.accept_error'));
    }
  };

  const handleLogout = () => {
    Alert.alert(t('legal.decline_title'), t('legal.decline_msg'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('legal.decline_confirm'),
        style: 'destructive',
        onPress: async () => {
          try { await logoutApi().unwrap(); } catch { /* déconnexion locale quand même */ }
          dispatch(logout());
        },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="file-document-edit-outline" size={28} color={tokens.primary} />
          </View>
          <Text style={styles.title}>{t(isFirstAcceptance ? 'legal.first_title' : 'legal.update_title')}</Text>
          <Text style={styles.body}>{t(isFirstAcceptance ? 'legal.first_msg' : 'legal.update_msg')}</Text>

          {/* Ce qui change (résumé publié avec la version) */}
          {!isFirstAcceptance && changeSummary && (
            <View style={styles.changes}>
              <Text style={styles.changesTitle}>{t('legal.whats_new')}</Text>
              <Text style={styles.changesText}>{changeSummary}</Text>
            </View>
          )}

          <View style={styles.links}>
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(LEGAL_URLS.terms)}>
              <Icon name="open-in-new" size={14} color={tokens.primary} />
              <Text style={styles.linkText}>{t('legal.terms_link')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => Linking.openURL(LEGAL_URLS.privacy)}>
              <Icon name="open-in-new" size={14} color={tokens.primary} />
              <Text style={styles.linkText}>{t('legal.privacy_link')}</Text>
            </TouchableOpacity>
          </View>

          <LegalConsentText prefixKey="legal.accept_by_continuing" />

          <ChocolateButton onPress={handleAccept} loading={isLoading} disabled={isLoading}>
            {t('legal.accept_btn')}
          </ChocolateButton>
          <ChocolateButton variant="ghost" onPress={handleLogout}>
            {t('legal.decline_btn')}
          </ChocolateButton>
        </View>
      </View>
    </Modal>
  );
};
