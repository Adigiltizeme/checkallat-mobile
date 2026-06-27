import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Text, Card, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { formatCurrency } from '../../config/currency';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetTransportRequestQuery,
  useUpdateTransportStatusMutation,
} from '../../store/api/transportApi';
import { useGetCallRelayNumberQuery } from '../../store/api/communicationApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import {
  STATUS_COLORS,
  TransportStatus,
  TransportObjectType,
} from '../../types/transport';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type Props = StackScreenProps<DriverStackParamList, 'DriverDeliveryDetails'>;

export const DriverDeliveryDetailsScreen = ({ navigation, route }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    card: {
      marginBottom: spacing.md,
      backgroundColor: colors.white,
      elevation: 2,
    },
    statusHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      fontWeight: 'bold',
    },
    statusChip: {},
    sectionTitle: {
      fontWeight: 'bold',
      marginBottom: spacing.md,
    },
    clientInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    clientDetails: {
      flex: 1,
    },
    clientName: {
      fontWeight: 'bold',
    },
    clientPhone: {
      color: colors.gray,
      marginTop: spacing.xs,
    },
    contactBtns: {
      flexDirection: 'row',
      gap: 8,
    },
    callButton: {
      backgroundColor: colors.success,
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
    },
    msgButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${tokens.primary}15`,
      borderWidth: 1,
      borderColor: tokens.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    locationContainer: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    locationInfo: {
      flex: 1,
    },
    locationLabel: {
      color: colors.gray,
      marginBottom: 4,
    },
    locationDetails: {
      color: colors.gray,
      marginTop: spacing.xs,
    },
    instructions: {
      color: colors.info,
      marginTop: spacing.xs,
      fontStyle: 'italic',
    },
    routeLine: {
      width: 2,
      height: 24,
      backgroundColor: colors.border,
      marginLeft: 11,
      marginVertical: spacing.sm,
    },
    distanceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    distanceText: {
      fontWeight: 'bold',
      color: colors.gray,
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    objectChip: {
      backgroundColor: tokens.primary + '20',
    },
    description: {
      marginBottom: spacing.md,
    },
    detailsGrid: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    detailItem: {
      flex: 1,
    },
    detailLabel: {
      color: colors.gray,
    },
    detailValue: {
      fontWeight: 'bold',
      marginTop: spacing.xs,
    },
    photosContainer: {
      marginTop: spacing.md,
    },
    photosLabel: {
      marginBottom: spacing.sm,
    },
    photoPlaceholder: {
      width: 100,
      height: 100,
      backgroundColor: colors.background,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    paymentLabel: {
      color: colors.gray,
    },
    paymentAmount: {
      fontWeight: 'bold',
      color: colors.success,
    },
    paymentMethod: {
      color: colors.gray,
    },
    actionsContainer: {
      gap: spacing.sm,
    },
    actionButton: {
      borderRadius: 8,
    },
    actionButtonLabel: {
      fontSize: 16,
    },
    nextActionButton: {
      borderRadius: 8,
      marginTop: spacing.sm,
    },
    nextActionLabel: {
      fontSize: 18,
      fontWeight: 'bold',
    },
  }), [tokens]);

  const { t } = useTranslation();
  const { requestId } = route.params;
  const { data: request, isLoading, refetch } = useGetTransportRequestQuery(requestId, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  // TODO: restore JSX content
  return null;
};
