import i18n from 'i18next';
import {DateTime, DurationUnit, Interval} from 'luxon';

// @ts-ignore -- No types package exists for this, and this is the only place we need to import it
import ReactPostprocessor from 'i18next-react-postprocessor';

// Initializes translations library with the same configuration as the translation test tool
export const initializeTranslations = async (translations: any) => {
  await i18n
    .use(new ReactPostprocessor({keepUnknownVariables: true}))
    .init({
      postProcess: ['reactPostprocessor'],
      interpolation: {
        escapeValue: false,
        format: (value, format, lng) => {
          if (format === 'uppercase') {
            return value.toLocaleUpperCase(lng);
          }
          if (format === 'lowercase') {
            return value.toLocaleLowerCase(lng);
          }
          if (typeof value === 'number' && format != null) {
            return value.toLocaleString(lng, JSON.parse(format));
          }
          if (format != null) {
            if (DateTime.isDateTime(value)) {
              return value.toFormat(format);
            }
            if (Interval.isInterval(value)) {
              return String(Math.floor(value.length(format as DurationUnit)));
            }
          }
          return value;
        },
      },
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: translations,
    });
};
