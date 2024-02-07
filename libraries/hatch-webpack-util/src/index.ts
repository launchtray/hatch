import type {Configuration} from 'webpack';

const mapIfValid = (key: string, factory: () => string) => {
  try {
    return {[key]: factory()};
  } catch {
    return {};
  }
};

export const addNodeAliases = (config: Configuration) => {
  // eslint-disable-next-line no-param-reassign
  config.resolve = {
    ...(config.resolve ?? {}),
    fallback: {
      ...(config.resolve?.fallback ?? {}),
      fs: false,
      ...mapIfValid('assert', () => require.resolve('assert/')),
      ...mapIfValid('events', () => require.resolve('events/')),
      ...mapIfValid('stream', () => require.resolve('stream-browserify')),
      ...mapIfValid('crypto', () => require.resolve('crypto-browserify')),
      ...mapIfValid('_stream_duplex', () => require.resolve('readable-stream/lib/_stream_duplex')),
      ...mapIfValid('_stream_passthrough', () => require.resolve('readable-stream/lib/_stream_passthrough')),
      ...mapIfValid('_stream_readable', () => require.resolve('readable-stream/lib/_stream_readable')),
      ...mapIfValid('_stream_transform', () => require.resolve('readable-stream/lib/_stream_transform')),
      ...mapIfValid('_stream_writable', () => require.resolve('readable-stream/lib/_stream_writable')),
    },
  };
};

export const addResolveAliases = (config: Configuration) => {
  // eslint-disable-next-line no-param-reassign
  config.resolve = {
    ...(config.resolve ?? {}),
    alias: {
      ...(config.resolve?.alias ?? {}),
      // Support React Native Web
      // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
      'react-native': 'react-native-web',
      'react-native-svg': 'react-native-svg/lib/commonjs/ReactNativeSVG.web',
    },
  };
};

const patchToolWebpackConfig = (config: Configuration): Configuration => {
  addResolveAliases(config);
  addNodeAliases(config);
  return config;
};

export const patchStorybookWebpackConfig = patchToolWebpackConfig;
