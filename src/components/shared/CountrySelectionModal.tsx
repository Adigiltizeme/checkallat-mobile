import React from 'react';
import {
  Modal,
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';
import { SUPPORTED_COUNTRIES } from '../../config/countries';

interface Props {
  visible: boolean;
  selectedCode: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
  title?: string;
}

export const CountrySelectionModal = ({ visible, selectedCode, onSelect, onClose, title }: Props) => {
  const { tokens } = useAppTheme();
  const { t } = useTranslation();

  const styles = StyleSheet.create({
    overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet:    { backgroundColor: tokens.modal, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%' },
    header:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: tokens.border },
    headerTitle: { fontSize: 17, fontWeight: '700', color: tokens.text.primary },
    item:     { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderColor: tokens.border },
    itemFlag: { fontSize: 22 },
    itemName: { flex: 1, fontSize: 15, fontWeight: '500', color: tokens.text.primary },
    itemCcy:  { fontSize: 13, color: tokens.text.secondary },
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title ?? t('country.select_country')}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Icon name="close" size={22} color={tokens.text.primary} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={SUPPORTED_COUNTRIES}
            keyExtractor={item => item.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.item, selectedCode === item.code && { backgroundColor: tokens.primary + '12' }]}
                onPress={() => { onSelect(item.code); onClose(); }}
              >
                <Text style={styles.itemFlag}>{item.flag}</Text>
                <Text style={styles.itemName}>{t(`country.${item.nameKey}`)}</Text>
                <Text style={styles.itemCcy}>{item.currency}</Text>
                {selectedCode === item.code && (
                  <Icon name="check" size={18} color={tokens.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
