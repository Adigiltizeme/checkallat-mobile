import { getLocalizedName } from '../utils/localize';

export type CategoryOption = {
  value: string;
  labelFr: string;
  labelEn: string;
  labelAr: string;
};

export type CategoryField = {
  key: string;
  labelKey: string;
  options: CategoryOption[];
};

export const CATEGORY_FIELDS: Record<string, CategoryField[]> = {
  plumbing: [
    {
      key: 'problemType',
      labelKey: 'booking_request.cat_plumbing_problem',
      options: [
        { value: 'leak',         labelFr: 'Fuite',           labelEn: 'Leak',           labelAr: 'تسرّب' },
        { value: 'clog',         labelFr: 'Bouchon',         labelEn: 'Clog',           labelAr: 'انسداد' },
        { value: 'installation', labelFr: 'Installation',    labelEn: 'Installation',   labelAr: 'تركيب' },
        { value: 'repair',       labelFr: 'Réparation',      labelEn: 'Repair',         labelAr: 'إصلاح' },
      ],
    },
  ],
  electricity: [
    {
      key: 'problemType',
      labelKey: 'booking_request.cat_electricity_problem',
      options: [
        { value: 'outlet',       labelFr: 'Prise / interrupteur',  labelEn: 'Outlet / switch',   labelAr: 'مقبس / مفتاح' },
        { value: 'circuit',      labelFr: 'Circuit / disjoncteur', labelEn: 'Circuit / breaker', labelAr: 'دائرة كهربائية' },
        { value: 'installation', labelFr: 'Installation',          labelEn: 'Installation',      labelAr: 'تركيب' },
        { value: 'short',        labelFr: 'Court-circuit',         labelEn: 'Short circuit',     labelAr: 'دائرة قصيرة' },
      ],
    },
  ],
  painting: [
    {
      key: 'surfaceType',
      labelKey: 'booking_request.cat_painting_surface',
      options: [
        { value: 'walls',     labelFr: 'Murs intérieurs', labelEn: 'Interior walls', labelAr: 'جدران داخلية' },
        { value: 'ceiling',   labelFr: 'Plafond',         labelEn: 'Ceiling',        labelAr: 'سقف' },
        { value: 'exterior',  labelFr: 'Extérieur',       labelEn: 'Exterior',       labelAr: 'خارجي' },
        { value: 'furniture', labelFr: 'Mobilier',        labelEn: 'Furniture',      labelAr: 'أثاث' },
      ],
    },
  ],
  handyman: [
    {
      key: 'taskType',
      labelKey: 'booking_request.cat_handyman_task',
      options: [
        { value: 'assembly', labelFr: 'Montage meuble',   labelEn: 'Furniture assembly', labelAr: 'تجميع أثاث' },
        { value: 'mounting', labelFr: 'Fixation murale',  labelEn: 'Wall mounting',      labelAr: 'تثبيت جداري' },
        { value: 'repair',   labelFr: 'Réparation',       labelEn: 'Repair',             labelAr: 'إصلاح' },
        { value: 'general',  labelFr: 'Travaux généraux', labelEn: 'General tasks',      labelAr: 'أعمال عامة' },
      ],
    },
  ],
  cleaning: [
    {
      key: 'cleaningType',
      labelKey: 'booking_request.cat_cleaning_type',
      options: [
        { value: 'standard',          labelFr: 'Nettoyage standard', labelEn: 'Standard cleaning',  labelAr: 'تنظيف عادي' },
        { value: 'deep',              labelFr: 'Grand ménage',       labelEn: 'Deep cleaning',       labelAr: 'تنظيف عميق' },
        { value: 'post_construction', labelFr: 'Après travaux',      labelEn: 'Post-construction',   labelAr: 'بعد البناء' },
      ],
    },
  ],
  carpentry: [
    {
      key: 'taskType',
      labelKey: 'booking_request.cat_carpentry_task',
      options: [
        { value: 'repair',       labelFr: 'Réparation',  labelEn: 'Repair',       labelAr: 'إصلاح' },
        { value: 'installation', labelFr: 'Installation', labelEn: 'Installation', labelAr: 'تركيب' },
        { value: 'custom',       labelFr: 'Sur mesure',  labelEn: 'Custom work',  labelAr: 'عمل مخصص' },
      ],
    },
  ],
  air_condition: [
    {
      key: 'serviceType',
      labelKey: 'booking_request.cat_ac_service',
      options: [
        { value: 'cleaning',     labelFr: 'Nettoyage',    labelEn: 'Cleaning',     labelAr: 'تنظيف' },
        { value: 'installation', labelFr: 'Installation', labelEn: 'Installation', labelAr: 'تركيب' },
        { value: 'repair',       labelFr: 'Réparation',   labelEn: 'Repair',       labelAr: 'إصلاح' },
        { value: 'maintenance',  labelFr: 'Entretien',    labelEn: 'Maintenance',  labelAr: 'صيانة' },
      ],
    },
  ],
};

export const HAS_URGENCY = ['plumbing', 'electricity', 'handyman', 'air_condition'];

export function getCategoryOptionLabel(
  categorySlug: string,
  fieldKey: string,
  value: string,
  lang: string,
): string {
  const field = (CATEGORY_FIELDS[categorySlug] ?? []).find(f => f.key === fieldKey);
  const option = field?.options.find(o => o.value === value);
  if (!option) return value;
  return getLocalizedName({ nameFr: option.labelFr, nameEn: option.labelEn, nameAr: option.labelAr }, lang);
}
