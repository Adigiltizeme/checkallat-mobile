import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/** Couleurs de repli (catégorie sans couleur réglée dans le web-admin), stables pour un même slug */
const PALETTE = ['#FF5733', '#3498DB', '#27AE60', '#9B59B6', '#F39C12', '#1ABC9C', '#E74C3C', '#00BCD4'];

export const categoryColor = (category: { slug: string; color?: string | null }): string => {
  if (category.color && /^#[0-9A-Fa-f]{6}$/.test(category.color)) return category.color;
  let hash = 0;
  for (const ch of category.slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
};

interface Props {
  category: { slug: string; icon?: string | null; color?: string | null };
  size?: number;
  /** Taille de la pastille autour de l'icône */
  box?: number;
}

/**
 * Icône d'une catégorie telle que choisie dans le web-admin :
 * nom d'icône MaterialCommunityIcons, émoji, ou icône générique à défaut.
 */
export const CategoryIcon: React.FC<Props> = ({ category, size = 28, box = 52 }) => {
  const color = categoryColor(category);
  const icon = category.icon?.trim();
  return (
    <View style={[styles.wrap, { width: box, height: box, borderRadius: box * 0.27, backgroundColor: color + '20' }]}>
      {icon && /^[a-z0-9-]+$/.test(icon) ? (
        <Icon name={Icon.hasIcon?.(icon) === false ? 'briefcase-outline' : icon} size={size} color={color} />
      ) : icon ? (
        <Text style={{ fontSize: size * 0.85 }}>{icon}</Text>
      ) : (
        <Icon name="briefcase-outline" size={size} color={color} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
