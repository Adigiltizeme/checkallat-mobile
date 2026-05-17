/**
 * Returns the localized name of a category/service object based on the active language.
 * Falls back to French, then English, then the slug.
 */
export const getLocalizedName = (
  obj: { nameFr?: string; nameEn?: string; nameAr?: string; name?: string; slug?: string } | null | undefined,
  lang: string,
): string => {
  if (!obj) return '—';
  if (lang.startsWith('ar')) return obj.nameAr ?? obj.nameFr ?? obj.nameEn ?? obj.name ?? obj.slug ?? '—';
  if (lang.startsWith('en')) return obj.nameEn ?? obj.nameFr ?? obj.name ?? obj.slug ?? '—';
  return obj.nameFr ?? obj.nameEn ?? obj.name ?? obj.slug ?? '—';
};
