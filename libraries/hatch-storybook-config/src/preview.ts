import type {Preview} from '@storybook/react';
import type {Resource} from 'i18next';

export interface StorybookPreviewOptions {
  translationsResource: Resource;
}

let initializeTranslations: (translations: Resource) => void;
try {
  initializeTranslations = require('@launchtray/hatch-i18n')?.initializeTranslations;
} catch (e) {
  initializeTranslations = () => {
    throw new Error('hatch-i18n is not installed. Please install it to use translations in your storybook.');
  };
}

export const createPreviewConfig = (options?: StorybookPreviewOptions): Preview => {
  if (options?.translationsResource != null) {
    initializeTranslations(options.translationsResource);
  }
  return {
    parameters: {
      actions: {argTypesRegex: '^on[A-Z].*'},
      controls: {
        matchers: {
          color: /(background|color)$/i,
          date: /Date$/i,
        },
      },
    },
  };
};
