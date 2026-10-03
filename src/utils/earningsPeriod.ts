import type { TFunction } from 'i18next';

export type PeriodMode = 'daily' | 'weekly' | 'monthly' | 'all';

export interface PeriodRange {
  start: Date;
  end: Date;
  label: string;
  sublabel?: string;
}

/** Période affichée sur les écrans de revenus (offset 0 = période en cours, -1 = précédente…) */
export const getPeriodRange = (mode: PeriodMode, offset: number, t: TFunction, locale: string): PeriodRange => {
  const now = new Date();

  if (mode === 'daily') {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const label =
      offset === 0 ? t('driver.earnings_today') :
        offset === -1 ? t('driver.earnings_yesterday') :
          d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'short' });
    return { start, end, label, sublabel: d.toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' }) };
  }

  if (mode === 'weekly') {
    const day = now.getDay();
    const diffToMon = day === 0 ? -6 : 1 - day;
    const mon = new Date(now);
    mon.setDate(now.getDate() + diffToMon + offset * 7);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    sun.setHours(23, 59, 59, 999);
    const label = offset === 0
      ? t('driver.earnings_this_week')
      : offset === -1
        ? t('driver.earnings_last_week')
        : t('driver.earnings_week_of', { date: mon.toLocaleDateString(locale, { day: '2-digit', month: 'short' }) });
    const sublabel = `${mon.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })} → ${sun.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}`;
    return { start: mon, end: sun, label, sublabel };
  }

  if (mode === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0);
    end.setHours(23, 59, 59, 999);
    const raw = start.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    const sublabel = `${start.toLocaleDateString(locale, { day: '2-digit', month: 'short' })} → ${end.toLocaleDateString(locale, { day: '2-digit', month: 'short' })}`;
    return { start, end, label, sublabel: offset === 0 ? t('driver.earnings_this_month') : sublabel };
  }

  return { start: new Date(0), end: new Date(9999, 11, 31), label: t('common.all'), sublabel: t('driver.earnings_since_start') };
};

export const isInPeriod = (isoDate: string | null | undefined, mode: PeriodMode, period: PeriodRange): boolean => {
  if (mode === 'all') return true;
  if (!isoDate) return false;
  const date = new Date(isoDate);
  return date >= period.start && date <= period.end;
};
