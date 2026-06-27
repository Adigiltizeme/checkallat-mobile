import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { useGetPaymentByIdQuery } from '../../store/api/paymentApi';
import { useGetTransportRequestQuery } from '../../store/api/transportApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

const ESCROW_CONFIG: Record<string, { color: string; icon: string }> = {
  pending:  { color: '#FF9800', icon: 'clock-outline' },
  captured: { color: '#2196F3', icon: 'lock-outline' },
  held:     { color: '#9C27B0', icon: 'lock' },
  released: { color: '#4CAF50', icon: 'check-circle-outline' },
  refunded: { color: '#F44336', icon: 'refresh' },
};

interface Props {
  route: { params: { paymentId?: string; requestId?: string } };
  navigation: any;
}

export const PaymentDetailsScreen = ({ route }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyText: { color: colors.gray, marginTop: spacing.md, textAlign: 'center' },

  statusCard: {
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    elevation: 3,
  },
  statusContent: { alignItems: 'center', paddingVertical: spacing.lg, gap: spacing.sm },
  statusLabel: { fontWeight: '700', textAlign: 'center' },
  statusExplanation: { color: colors.gray, textAlign: 'center', lineHeight: 20 },

  card: { marginBottom: spacing.md, backgroundColor: colors.white, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  rowLabel: { fontWeight: '600', color: colors.dark },
  netAmount: { fontWeight: '700', color: tokens.primary },
  subLabel: { color: colors.gray, flex: 1 },
  subValue: { color: colors.dark, textAlign: 'right', flex: 1 },
  mono: { fontFamily: 'monospace', fontSize: 11 },
  divider: { marginVertical: spacing.sm },
  }), [tokens]);

  const { t, i18n } = useTranslation();
  const { paymentId, requestId } = route.params;
  const isDriver = useSelector((state: RootState) => state.auth.isDriver);

  // Mode payment entity (in-app / stripe)
  const { data: payment, isLoading: paymentLoading } = useGetPaymentByIdQuery(paymentId!, {
    skip: !paymentId,
  });

  // Mode cash (requestId only, no payment entity)
  const { data: transportRequest, isLoading: transportLoading } = useGetTransportRequestQuery(requestId!, {
    skip: !requestId || !!paymentId,
  });

  const isLoading = paymentLoading || transportLoading;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  // TODO: restore JSX content
  return null;
};
