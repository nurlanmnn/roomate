import type { Locale } from 'date-fns';
import { de, enUS, es, fr, tr } from 'date-fns/locale';
import type { LanguageCode } from '../locales';

export function getDateFnsLocale(code: LanguageCode): Locale {
  switch (code) {
    case 'es':
      return es;
    case 'fr':
      return fr;
    case 'de':
      return de;
    case 'tr':
      return tr;
    default:
      return enUS;
  }
}

/** BCP 47 tag for `Intl` and `toLocaleDateString`. */
export function toBcp47Locale(code: LanguageCode): string {
  switch (code) {
    case 'en':
      return 'en-US';
    case 'es':
      return 'es';
    case 'fr':
      return 'fr';
    case 'de':
      return 'de';
    case 'tr':
      return 'tr';
    default:
      return 'en-US';
  }
}
