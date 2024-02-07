import webpack from 'webpack';

export const addNodeAliases = (config: webpack.Configuration) => {
  // eslint-disable-next-line no-param-reassign
  config.resolve = {
    ...(config.resolve ?? {}),
    fallback: {
      ...(config.resolve?.fallback ?? {}),
      fs: false,
      assert: require.resolve('assert/'),
      events: require.resolve('events/'),
      stream: require.resolve('stream-browserify'),
      crypto: require.resolve('crypto-browserify'),
      /* eslint-disable @typescript-eslint/naming-convention */
      _stream_duplex: require.resolve('readable-stream/lib/_stream_duplex'),
      _stream_passthrough: require.resolve('readable-stream/lib/_stream_passthrough'),
      _stream_readable: require.resolve('readable-stream/lib/_stream_readable'),
      _stream_transform: require.resolve('readable-stream/lib/_stream_transform'),
      _stream_writable: require.resolve('readable-stream/lib/_stream_writable'),
      /* eslint-enable @typescript-eslint/naming-convention */
    },
  };
  // eslint-disable-next-line no-param-reassign
  config.plugins = [
    ...(config.plugins ?? []),
    new webpack.ProvidePlugin({
      // eslint-disable-next-line @typescript-eslint/naming-convention
      Buffer: [require.resolve('buffer/'), 'Buffer'],
      process: [require.resolve('process/browser')],
      console: [require.resolve('console-browserify')],
    }),
  ];
};

export const addResolveAliases = (config: webpack.Configuration) => {
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

const patchToolWebpackConfig = (config: webpack.Configuration): webpack.Configuration => {
  addResolveAliases(config);
  addNodeAliases(config);
  return config;
};

export const patchStorybookWebpackConfig = patchToolWebpackConfig;
