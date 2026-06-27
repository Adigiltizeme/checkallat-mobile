import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Pressable, Image, Modal, FlatList, Dimensions, TouchableOpacity, Linking } from 'react-native';
import { Text, Card, Button, Divider, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { DriverStackParamList } from '../../navigation/types';
import {
  useGetTransportRequestQuery,
  useUpdateTransportStatusMutation,
  useCancelTransportMutation,
} from '../../store/api/transportApi';
import { useGetCallRelayNumberQuery } from '../../store/api/communicationApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { StatusTimeline } from '../../components/transport/StatusTimeline';
import { DriverActionButton } from '../../components/transport/DriverActionButton';
import { DriverCancelModal } from '../../components/transport/DriverCancelModal';
import { TRANSPORT_STATUS_CONFIG, TransportStatus } from '../../types/transport-status';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = StackScreenProps<DriverStackParamList, 'DriverTransportDetails'>;

export const DriverTransportDetailsScreen = ({ navigation, route }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#F5F5F5',
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: colors.gray,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    errorText: {
      marginTop: 16,
      fontSize: 18,
      color: colors.error,
      textAlign: 'center',
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 20,
      gap: 16,
    },
    statusTextContainer: {
      flex: 1,
    },
    statusTitle: {
      color: '#FFFFFF',
      fontWeight: 'bold',
    },
    statusDescription: {
      color: '#FFFFFF',
      marginTop: 4,
    },
    card: {
      margin: 12,
      marginBottom: 0,
    },
    sectionTitle: {
      color: tokens.primary,
      marginBottom: 8,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
    },
    infoLabel: {
      fontWeight: '600',
      color: colors.gray,
    },
    infoValue: {
      flex: 1,
      textAlign: 'right',
    },
    contactRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    contactBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: tokens.primary,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
    },
    contactBtnMessage: {
      backgroundColor: `${tokens.primary}15`,
      borderWidth: 1,
      borderColor: tokens.primary,
    },
    contactBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.white,
    },
    contactBtnMessageText: {
      color: tokens.primary,
    },
    divider: {
      marginVertical: 12,
    },
    instructions: {
      fontStyle: 'italic',
      color: colors.gray,
      marginBottom: 8,
    },
    itemDescription: {
      marginBottom: 12,
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 8,
    },
    serviceText: {
      flex: 1,
    },
    priceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    priceLabel: {
      fontWeight: 'bold',
    },
    priceValue: {
      fontWeight: 'bold',
      color: colors.success,
    },
    paymentMethod: {
      color: colors.gray,
    },
    bottomContainer: {
      backgroundColor: '#FFFFFF',
      paddingTop: 8,
      paddingBottom: 24,
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    navigationButton: {
      marginHorizontal: 16,
      marginBottom: 0,
    },
    cancelButton: {
      marginHorizontal: 16,
      marginBottom: 0,
      borderColor: colors.error,
    },
    confirmButton: {
      marginHorizontal: 16,
      marginBottom: 8,
    },
    noteContainer: {
      marginTop: 8,
      padding: 12,
      backgroundColor: '#E3F2FD',
      borderRadius: 8,
      borderLeftWidth: 3,
      borderLeftColor: '#00B8A9',
    },
    noteLabel: {
      color: '#7F8C9A',
      fontWeight: '600',
      marginBottom: 4,
    },
    noteText: {
      color: '#1A1A2E',
      lineHeight: 20,
    },

    // Photo gallery
    photoList: { gap: 8, paddingVertical: 4 },
    photoThumb: {
      width: 88,
      height: 88,
      borderRadius: 8,
      backgroundColor: '#E0E0E0',
    },

    // Full-screen modal
    photoModal: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.95)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoModalClose: {
      position: 'absolute',
      top: 40,
      right: 12,
      zIndex: 10,
    },
    photoFull: {
      width: SCREEN_WIDTH,
      height: SCREEN_WIDTH,
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
