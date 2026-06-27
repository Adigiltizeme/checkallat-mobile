import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppThemeMode } from '../../theme/ThemeProvider';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const { width } = Dimensions.get('window');
const TILE_W = (width - spacing.md * 3) / 2;
const TILE_H = TILE_W * 1.3;

// ── Données par mode ────────────────────────────────────────────────────────
interface ThemeData {
  mode: AppThemeMode;
  icon: string;
  labelKey: string;
  fullWidth?: boolean;
  preview: {
    bg: string;
    header: string;
    card: string;
    textPrimary: string;
    textSecondary: string;
    button: string;
    tabBar: string;
    tabIcon: string;
    tabIconInactive?: string;
  };
}

const THEMES: ThemeData[] = [
  {
    mode: 'light',
    icon: '☀️',
    labelKey: 'settings.theme_light',
    preview: {
      bg: '#FFFFFF', header: '#4A2710', card: '#FFFFFF',
      textPrimary: '#1E0A02', textSecondary: '#7B5A48',
      button: '#6B3318', tabBar: '#2A1005', tabIcon: '#C49B3C',
    },
  },
  {
    mode: 'comfort',
    icon: '🌿',
    labelKey: 'settings.theme_comfort',
    preview: {
      bg: '#FFF8EE', header: '#4A2710', card: '#FFFBF5',
      textPrimary: '#1E0A02', textSecondary: '#7B5A48',
      button: '#6B3318', tabBar: '#2A1005', tabIcon: '#C49B3C',
    },
  },
  {
    mode: 'dark',
    icon: '🌙',
    labelKey: 'settings.theme_dark',
    preview: {
      bg: '#160600', header: '#0E0400', card: '#2A1005',
      textPrimary: '#FFF8EE', textSecondary: '#D4B896',
      button: '#C49B3C', tabBar: '#0E0400', tabIcon: '#C49B3C',
    },
  },
  {
    mode: 'system',
    icon: '⚙️',
    labelKey: 'settings.theme_system',
    preview: {
      bg: '#E8E8E8', header: '#3A2010', card: '#F5F5F5',
      textPrimary: '#1E0A02', textSecondary: '#7B5A48',
      button: '#6B3318', tabBar: '#2A1005', tabIcon: '#C49B3C',
    },
  },
  {
    mode: 'teal',
    icon: '🌊',
    labelKey: 'settings.theme_teal',
    fullWidth: true,
    preview: {
      bg: '#FFFFFF', header: '#00B8A9', card: '#FFFFFF',
      textPrimary: '#1A1A2E', textSecondary: '#7F8C9A',
      button: '#00B8A9', tabBar: '#FFFFFF', tabIcon: '#00B8A9',
      tabIconInactive: '#CCCCCC',
    },
  },
];

// ── Mini-preview ─────────────────────────────────────────────────────────────
const ThemePreview = ({ p }: { p: ThemeData['preview'] }) => (
  <View style={[previewStyles.root, { backgroundColor: p.bg }]}>
    {/* Header */}
    <View style={[previewStyles.header, { backgroundColor: p.header }]}>
      <View style={previewStyles.headerDot} />
      <View style={[previewStyles.headerTitle, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
    </View>
    {/* Content */}
    <View style={previewStyles.content}>
      {/* Card 1 */}
      <View style={[previewStyles.card, { backgroundColor: p.card }]}>
        <View style={[previewStyles.cardLine, { backgroundColor: p.textPrimary, width: '60%' }]} />
        <View style={[previewStyles.cardLine, { backgroundColor: p.textSecondary, width: '40%' }]} />
      </View>
      {/* Card 2 */}
      <View style={[previewStyles.card, { backgroundColor: p.card }]}>
        <View style={[previewStyles.cardLine, { backgroundColor: p.textPrimary, width: '75%' }]} />
        <View style={[previewStyles.cardLine, { backgroundColor: p.textSecondary, width: '50%' }]} />
      </View>
      {/* Button */}
      <View style={[previewStyles.button, { backgroundColor: p.button }]} />
    </View>
    {/* Tab bar */}
    <View style={[previewStyles.tabBar, { backgroundColor: p.tabBar }]}>
      {[1, 2, 3].map(i => (
        <View key={i} style={[previewStyles.tabDot, { backgroundColor: i === 1 ? p.tabIcon : (p.tabIconInactive ?? 'rgba(255,255,255,0.25)') }]} />
      ))}
    </View>
  </View>
);

const previewStyles = StyleSheet.create({
  root: { flex: 1, borderRadius: 6, overflow: 'hidden' },
  header: { height: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, gap: 4 },
  headerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  headerTitle: { flex: 1, height: 4, borderRadius: 2 },
  content: { flex: 1, padding: 5, gap: 4 },
  card: { borderRadius: 4, padding: 5, gap: 3, elevation: 1 },
  cardLine: { height: 3, borderRadius: 1.5 },
  button: { height: 10, borderRadius: 4, marginTop: 2 },
  tabBar: { height: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly' },
  tabDot: { width: 6, height: 6, borderRadius: 3 },
});

// ── Tile ─────────────────────────────────────────────────────────────────────
interface TileProps {
  data: ThemeData;
  active: boolean;
  onSelect: () => void;
  fullWidth?: boolean;
}

const tileStyles = StyleSheet.create({
  tilePressable: { width: TILE_W },
  tilePressableFull: { width: TILE_W * 2 + spacing.md },
  grooveWrapper: { borderWidth: 2, borderRadius: 16 },
  bevel: { margin: 1, borderRadius: 14, overflow: 'hidden', height: TILE_H },
  bevelFull: { margin: 1, borderRadius: 14, overflow: 'hidden', height: TILE_H * 0.55 },
  sheen: { position: 'absolute', top: 5, left: 12, right: 12, height: 6, borderRadius: 3, zIndex: 1 },
  previewContainer: { flex: 1, margin: 8, borderRadius: 6, overflow: 'hidden' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8 },
  legendIcon: { fontSize: 18 },
  legendLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  badge: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  badgeText: { color: colors.dark, fontSize: 12, fontWeight: '900' },
});

const ThemeTile = ({ data, active, onSelect, fullWidth = false }: TileProps) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  const [pressed, setPressed] = useState(false);
  const isDown = pressed;

  const grooveColor = active ? colors.tileGroove : '#D4B896';

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={fullWidth ? tileStyles.tilePressableFull : tileStyles.tilePressable}
    >
      <View style={[tileStyles.grooveWrapper, { borderColor: grooveColor },
        active
          ? Platform.select({ ios: { shadowColor: '#1A0800', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.55, shadowRadius: 8 }, android: { elevation: 10 } })
          : Platform.select({ ios: { shadowColor: '#6B3318', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 }, android: { elevation: 4 } }),
      ]}>
        <View style={[
          fullWidth ? tileStyles.bevelFull : tileStyles.bevel,
          {
            backgroundColor: active ? colors.tile : '#FFF8EE',
            ...(isDown ? {
              borderTopWidth: 6, borderLeftWidth: 4, borderBottomWidth: 2, borderRightWidth: 2,
              borderTopColor: '#1A0800', borderLeftColor: '#1A0800',
              borderBottomColor: '#B87040', borderRightColor: '#9B5A2A',
            } : active ? {
              borderTopWidth: 3, borderLeftWidth: 3, borderBottomWidth: 7, borderRightWidth: 5,
              borderTopColor: '#B87040', borderLeftColor: '#9B5A2A',
              borderBottomColor: '#1A0800', borderRightColor: '#1A0800',
            } : {
              borderTopWidth: 2, borderLeftWidth: 2, borderBottomWidth: 4, borderRightWidth: 3,
              borderTopColor: '#FFFFFF', borderLeftColor: '#FFFFFF',
              borderBottomColor: '#C4A07A', borderRightColor: '#C4A07A',
            }),
          },
        ]}>
          {/* Sheen */}
          {!isDown && (
            <View style={[tileStyles.sheen, { backgroundColor: active ? 'rgba(255,245,215,0.2)' : 'rgba(255,255,255,0.6)' }]} />
          )}

          {/* Prévisualisation miniature */}
          <View style={tileStyles.previewContainer}>
            <ThemePreview p={data.preview} />
          </View>

          {/* Légende */}
          <View style={tileStyles.legend}>
            <Text style={tileStyles.legendIcon}>{data.icon}</Text>
            <Text style={[tileStyles.legendLabel, { color: active ? '#FFF8EE' : tokens.primary }]}>
              {t(data.labelKey)}
            </Text>
          </View>

          {/* Badge sélectionné */}
          {active && (
            <View style={[tileStyles.badge, { backgroundColor: tokens.secondary }]}>
              <Text style={tileStyles.badgeText}>✓</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
};

// ── Écran principal ───────────────────────────────────────────────────────────
export const AppearanceScreen = () => {
  const { mode, setMode, tokens } = useAppTheme();

  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  subtitle: { fontSize: 14, marginBottom: spacing.lg, textAlign: 'center' },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: spacing.sm, marginTop: spacing.sm },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.md },

  tilePressable: { width: TILE_W },
  tilePressableFull: { width: TILE_W * 2 + spacing.md },
  grooveWrapper: {
    borderWidth: 2,
    borderRadius: 16,
  },
  bevel: {
    margin: 1,
    borderRadius: 14,
    overflow: 'hidden',
    height: TILE_H,
  },
  bevelFull: {
    margin: 1,
    borderRadius: 14,
    overflow: 'hidden',
    height: TILE_H * 0.55,
  },
  sheen: {
    position: 'absolute',
    top: 5, left: 12, right: 12,
    height: 6,
    borderRadius: 3,
    zIndex: 1,
  },
  previewContainer: {
    flex: 1,
    margin: 8,
    borderRadius: 6,
    overflow: 'hidden',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  legendIcon: { fontSize: 18 },
  legendLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  badge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: tokens.secondary,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  badgeText: { color: colors.dark, fontSize: 12, fontWeight: '900' },
  infoBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  }), [tokens]);
  const { t } = useTranslation();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: tokens.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.subtitle, { color: tokens.text.secondary }]}>
        {t('settings.theme_subtitle')}
      </Text>

      <Text style={[styles.sectionLabel, { color: tokens.text.secondary }]}>
        {t('settings.section_checkallat')}
      </Text>
      <View style={styles.grid}>
        {THEMES.filter(th => !th.fullWidth).map(th => (
          <ThemeTile
            key={th.mode}
            data={th}
            active={mode === th.mode}
            onSelect={() => setMode(th.mode)}
          />
        ))}
      </View>

      <Text style={[styles.sectionLabel, { color: tokens.text.secondary }]}>
        {t('settings.section_original')}
      </Text>
      <View style={styles.grid}>
        {THEMES.filter(th => !!th.fullWidth).map(th => (
          <ThemeTile
            key={th.mode}
            data={th}
            active={mode === th.mode}
            onSelect={() => setMode(th.mode)}
            fullWidth
          />
        ))}
      </View>

      {/* Info mode système */}
      {mode === 'system' && (
        <View style={[styles.infoBox, { backgroundColor: tokens.card, borderColor: tokens.border }]}>
          <Text style={[styles.infoText, { color: tokens.text.secondary }]}>
            {t('settings.theme_system_hint')}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
