import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput as RNTextInput,
} from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { StackScreenProps } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { HomeStackParamList } from '../../navigation/types';
import {
  useGetMessagesQuery,
  useSendMessageMutation,
  ConversationMessage,
} from '../../store/api/communicationApi';
import { useRefetchOnFocus } from '../../hooks/useRefetchOnFocus';
import { RootState } from '../../store';
import { colors } from '../../theme/colors';
import { useAppTheme } from '../../theme/ThemeProvider';
import { spacing } from '../../theme/spacing';

type Props = StackScreenProps<HomeStackParamList, 'BookingChat'>;

export const BookingChatScreen = ({ route, navigation }: Props) => {
  const { tokens } = useAppTheme();


  const styles = useMemo(() => StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F0F2F5' },
  centered:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:   { color: colors.gray, fontSize: 14 },

  privacyBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 6, backgroundColor: '#F0FDF4',
    borderBottomWidth: 1, borderBottomColor: '#BBF7D0',
  },
  privacyText: { fontSize: 11, color: '#166534' },

  messageList: { padding: spacing.md, paddingBottom: spacing.sm },

  messageRow:   { flexDirection: 'row', marginBottom: spacing.sm, alignItems: 'flex-end', gap: 8 },
  messageRowMe: { justifyContent: 'flex-end' },

  avatarBubble: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: tokens.primary + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 12, fontWeight: '700', color: tokens.primary },

  bubble:      { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleOther: { backgroundColor: colors.white, borderBottomLeftRadius: 4 },
  bubbleMe:    { backgroundColor: tokens.primary, borderBottomRightRadius: 4 },

  bubbleText:   { fontSize: 14, color: colors.dark, lineHeight: 20 },
  bubbleTextMe: { color: colors.white },

  bubbleTime:   { fontSize: 10, color: colors.gray, marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, minHeight: 40, maxHeight: 100,
    borderRadius: 20, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 14, color: colors.dark, backgroundColor: '#F9FAFB',
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: tokens.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.gray },
  }), [tokens]);

  const { t } = useTranslation();
  const { entityType, entityId, otherPartyName } = route.params;
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const { data: messages = [], isLoading, refetch } = useGetMessagesQuery(
    { entityType, entityId },
    { pollingInterval: 5000, refetchOnMountOrArgChange: true },
  );
  useRefetchOnFocus(refetch);

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();

  useEffect(() => {
    navigation.setOptions({ title: otherPartyName });
  }, [otherPartyName]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    setInputText('');
    try {
      await sendMessage({ entityType, entityId, content: text }).unwrap();
    } catch {
      setInputText(text);
    }
  };

  const renderMessage = ({ item }: { item: ConversationMessage }) => {
    const isMe = item.sender.id === currentUserId;
    return (
      <View style={[styles.messageRow, isMe && styles.messageRowMe]}>
        {!isMe && (
          <View style={styles.avatarBubble}>
            <Text style={styles.avatarLetter}>
              {item.sender.firstName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.content}</Text>
          <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {isMe && item.readAt ? '  ✓✓' : isMe ? '  ✓' : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      {/* Privacy banner */}
      <View style={styles.privacyBanner}>
        <Icon name="shield-check" size={14} color={colors.success} />
        <Text style={styles.privacyText}>{t('booking.masked_call_note')}</Text>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={tokens.primary} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{t('chat.empty')}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={styles.inputRow}>
        <RNTextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder={t('chat.type_message')}
          placeholderTextColor={colors.gray}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          activeOpacity={0.7}
        >
          <Icon name="send" size={20} color={colors.white} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
