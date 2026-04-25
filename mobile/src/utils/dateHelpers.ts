import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import type { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale';

export type RelativeDayLabels = {
  today: string;
  yesterday: string;
  tomorrow: string;
};

export const formatDate = (
  dateString: string,
  locale: Locale = enUS,
  relative?: RelativeDayLabels
): string => {
  const date = parseISO(dateString);
  if (relative) {
    if (isToday(date)) return relative.today;
    if (isTomorrow(date)) return relative.tomorrow;
    if (isYesterday(date)) return relative.yesterday;
  }
  return format(date, 'MMM d, yyyy', { locale });
};

/** Section header for grouped calendar lists (ISO day `yyyy-MM-dd`). */
export const formatCalendarListDateHeader = (
  isoDay: string,
  locale: Locale,
  relative: RelativeDayLabels
): string => {
  const date = parseISO(`${isoDay}T12:00:00`);
  if (isToday(date)) return relative.today;
  if (isTomorrow(date)) return relative.tomorrow;
  if (isYesterday(date)) return relative.yesterday;
  return format(date, 'MMM d, yyyy', { locale });
};

export const formatDateTime = (dateString: string, locale: Locale = enUS): string => {
  const date = parseISO(dateString);
  return format(date, 'MMM d, yyyy h:mm a', { locale });
};

export const formatTime = (dateString: string, locale: Locale = enUS): string => {
  const date = parseISO(dateString);
  return format(date, 'h:mm a', { locale });
};

export const formatDateShort = (dateString: string, locale: Locale = enUS): string => {
  const date = parseISO(dateString);
  return format(date, 'dd.MM.yyyy', { locale });
};
