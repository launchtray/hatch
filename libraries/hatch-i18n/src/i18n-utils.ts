import i18n, {Resource} from 'i18next';
import {DateTime, DurationUnit, Interval} from 'luxon';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore -- No types package exists for this, and this is the only place we need to import it
import ReactPostprocessor from 'i18next-react-postprocessor';

// Initializes translations library with the same configuration as the translation test tool
export const initializeTranslations = async (translations: Resource) => {
  await i18n
    .use(new ReactPostprocessor({keepUnknownVariables: true}))
    .init({
      postProcess: ['reactPostprocessor'],
      interpolation: {
        escapeValue: false,
        format: (value, format, lng, edit) => {
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
            if (Array.isArray(value)) {
              return value.map((element) => formatElement(element, format))
                .join(edit?.listSeparator ?? ', ');
            }
            return formatElement(value, format);
          }
          if (format != null) {
            if (Array.isArray(value)) {
              return formatArray(value, i18n.dir(lng) === 'rtl', format, edit?.listSeparator);
            }
            return formatElement(value, format);
          }
          return value;
        },
      },
      lng: 'en-US',
      fallbackLng: 'en-US',
      resources: translations,
    });
};

const formatElement = (value: unknown, format: string) => {
  if (DateTime.isDateTime(value)) {
    return value.toFormat(format);
  }
  if (Interval.isInterval(value)) {
    return String(Math.floor(value.length(format as DurationUnit)));
  }
  return value;
};

const formatArray = (value: unknown[], isRtl: boolean, format: string, listSeparator?: string) => {
  if (isRtl) {
    return value.reverse().map((element) => formatElement(element, format))
      .join(listSeparator ?? ', ');
  }
  return value.map((element) => formatElement(element, format))
    .join(listSeparator ?? ', ');
};
