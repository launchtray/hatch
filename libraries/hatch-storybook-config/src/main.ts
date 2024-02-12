import type {StorybookConfig} from '@storybook/react-webpack5';
import {patchStorybookWebpackConfig} from '@launchtray/hatch-webpack-util';
import {join, dirname} from 'path';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
export const getAbsolutePath = <T>(value: T): T => {
  return dirname(require.resolve(join(value as string, 'package.json'))) as T;
};

export const createMainConfig = (options?: {resolvePackage: <T>(value: T) => T}): StorybookConfig => {
  const resolvePackage = options?.resolvePackage ?? getAbsolutePath;
  return {
    stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
    addons: [
      resolvePackage('@storybook/addon-links'),
      resolvePackage('@storybook/addon-essentials'),
      resolvePackage('@storybook/addon-interactions'),
    ],
    framework: {
      name: resolvePackage('@storybook/react-webpack5'),
      options: {
        builder: {
          useSWC: true,
        },
      },
    },
    webpack: patchStorybookWebpackConfig,
    docs: {
      autodocs: 'tag',
    },
  };
};
