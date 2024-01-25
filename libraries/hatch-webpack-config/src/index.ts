import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import webpackDevServer from 'webpack-dev-server';
import TerserPlugin from 'terser-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import WebpackBar from 'webpackbar';
import {InternalOptions, Manifest, WebpackManifestPlugin} from 'webpack-manifest-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import util from 'util';
import childProcess from 'child_process';
import {BundleAnalyzerPlugin} from 'webpack-bundle-analyzer';
import crypto from 'crypto';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import type {IWebpackConfigurationFnEnvironment} from '@rushstack/heft-webpack5-plugin';
import ReactRefreshTypeScript from 'react-refresh-typescript';
import StartServerPlugin from './StartServerPlugin';

// Prevent use of insecure hash function for webpack 4 without requiring legacy openssl provider
// From: https://stackoverflow.com/questions/69394632/webpack-build-failing-with-err-ossl-evp-unsupported#69691525
const origCreateHash = crypto.createHash;
crypto.createHash = (algorithm) => origCreateHash(algorithm === 'md4' ? 'sha256' : algorithm);

type ArrayElement<ArrayType extends readonly unknown[]> =
  ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
type FileDescriptor = ArrayElement<Parameters<InternalOptions['generate']>[1]>;
type ChunkGroup = Parameters<webpack.Chunk['addGroup']>[0];

const logAndReturn = (name: string, value: unknown, metadata: {dev: boolean, target: string}) => {
  const logDir = process.env.WEBPACK_CONFIG_INSPECTION_OUTDIR;
  if (logDir != null) {
    const filename = `${name}-${metadata.dev ? 'dev' : 'prod'}-${metadata.target}.js`;
    fs.mkdirSync(logDir, {recursive: true});
    fs.writeFileSync(path.join(logDir, filename), util.inspect(value, {depth: null}));
  }
  return value;
};

const filterTruthy = <T>(elements: (T | boolean)[]): T[] => {
  return elements.filter(Boolean) as T[];
};

export interface HatchWebappWebpackOptions {
  appDirectory: string;
  isDev?: boolean;
  disableFilenameHashes?: boolean;
  minimizeServer?: boolean;
}

export interface HatchWebappComponentWebpackOptions extends HatchWebappWebpackOptions {
  target: 'web' | 'node';
  includeServerDevServer: boolean;
}

// eslint-disable-next-line complexity -- Started complex with Razzle. We'll pick away at this over time.
const createWebpackConfigHelper = (options: HatchWebappComponentWebpackOptions) => {
  const resolveApp = (relativePath: string) => path.resolve(options.appDirectory, relativePath);
  const paths = {
    appPath: resolveApp('.'),
    appBuild: resolveApp('build'),
    appSrc: resolveApp('src'),
    appBuildPublic: resolveApp('build/public'),
    appAssetsManifest: resolveApp('build/manifest.json'),
    appPublic: resolveApp('public'),
    appPrivate: resolveApp('private'),
    appNodeModules: resolveApp('node_modules'),
    appPackageJson: resolveApp('package.json'),
    appServerEntry: resolveApp('src/server'),
    appClientEntry: resolveApp('src/client'),
  };

  // Define some useful shorthands.
  const IS_NODE = options.target === 'node';
  const IS_WEB = options.target === 'web';
  const IS_DEV = options.isDev === true;
  const IS_PROD = !IS_DEV;

  const hasPublicDir = fs.existsSync(paths.appPublic);
  const hasPrivateDir = fs.existsSync(paths.appPrivate);

  const portOffset = 1;
  const portDev = parseInt(process.env.PORT_DEV ?? 'NaN', 10);
  const port = parseInt(process.env.PORT ?? 'NaN', 10);
  let devServerPort = portDev;
  if (Number.isNaN(devServerPort)) {
    devServerPort = port + portOffset;
  }
  if (Number.isNaN(devServerPort)) {
    devServerPort = 3000 + portOffset;
  }

  const host = process.env.HOST_DEV ?? 'localhost';
  const clientPublicPath = process.env.CLIENT_PUBLIC_PATH ?? (IS_DEV ? `http://${host}:${devServerPort}/` : '/');

  const hatchDefinitions = {};
  hatchDefinitions['process.env.HATCH_BUILDTIME_PORT'] = process.env.PORT;
  hatchDefinitions['process.env.HATCH_BUILDTIME_HOSTNAME'] = process.env.HOSTNAME;
  hatchDefinitions['process.env.HATCH_BUILDTIME_HOST'] = process.env.HOST;
  hatchDefinitions['process.env.HATCH_BUILDTIME_BUILD_DATE'] = JSON.stringify(new Date().toISOString());
  hatchDefinitions['process.env.WDS_SOCKET_PORT'] = devServerPort;

  try {
    let commitId;
    if (process.env.COMMIT_ID != null) {
      commitId = process.env.COMMIT_ID;
    } else {
      commitId = childProcess.execSync('git rev-parse HEAD 2>/dev/null').toString().trim();
      let isDirty;
      try {
        childProcess.execSync('git diff --quiet 2>/dev/null');
        isDirty = false;
      } catch (err) {
        isDirty = true;
      }
      commitId += (isDirty ? '-dirty' : '');
    }
    hatchDefinitions['process.env.HATCH_BUILDTIME_COMMIT_ID'] = JSON.stringify(commitId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('Warning: could not embed build-time commit ID:', err);
  }

  try {
    let commitDate;
    if (process.env.COMMIT_DATE != null) {
      commitDate = process.env.COMMIT_DATE;
    } else {
      commitDate = childProcess.execSync('git show -s --format=%aI HEAD 2>/dev/null').toString().trim();
    }
    // Older versions of git don't support strict ISO strings and return %aI literally
    if (commitDate === '%aI') {
      commitDate = childProcess.execSync('git show -s --format=%ai HEAD 2>/dev/null').toString().trim();
    }
    hatchDefinitions['process.env.HATCH_BUILDTIME_COMMIT_DATE'] = JSON.stringify(commitDate);
  } catch (err: unknown) {
    // eslint-disable-next-line no-console
    console.log('Warning: could not embed build-time commit date:', err);
  }
  try {
    const packageJson = JSON.parse(fs.readFileSync(resolveApp('package.json')).toString());
    hatchDefinitions['process.env.HATCH_BUILDTIME_PACKAGE_NAME'] = JSON.stringify(packageJson.name);
    hatchDefinitions['process.env.HATCH_BUILDTIME_PACKAGE_VERSION'] = JSON.stringify(packageJson.version);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.log('Warning: could not embed build-time package.json info:', err);
  }

  const hashSuffix = '.[contenthash:8]';
  const jsPrefix = IS_NODE ? '' : 'static/js/';
  const mediaPrefix = 'static/media/';
  const cssPrefix = 'static/css/';

  const jsHashSuffix = (IS_WEB && IS_PROD && !options.disableFilenameHashes) ? hashSuffix : '';
  const cssMediaHashSuffix = (IS_NODE || IS_DEV || !options.disableFilenameHashes) ? hashSuffix : '';

  const jsOutputFilename = `${jsPrefix}[name]${jsHashSuffix}.js`;
  const jsOutputChunkFilename = `${jsPrefix}[name]${jsHashSuffix}.chunk.js`;
  const fileLoaderOutputName = `${mediaPrefix}[name]${cssMediaHashSuffix}.[ext]`;
  const urlLoaderOutputName = `${mediaPrefix}[name]${cssMediaHashSuffix}.[ext]`;
  const cssOutputFilename = `${cssPrefix}[name]${cssMediaHashSuffix}.css`;
  const cssOutputChunkFilename = `${cssPrefix}[name]${cssMediaHashSuffix}.chunk.css`;

  // This is our base webpack config.
  const config: webpack.Configuration & webpackDevServer.Configuration = {
    // Set webpack mode:
    mode: IS_DEV ? 'development' : 'production',
    // Set webpack context to the current apps directory
    context: paths.appPath,
    watchOptions: {
      ignored: [`${paths.appBuild}/**/*`],
    },
    // Specify target (either 'node' or 'web')
    target: options.target,
    // Controversially, decide on sourcemaps.
    devtool: IS_DEV ? 'cheap-module-source-map' : 'source-map',
    plugins: [],
    resolve: {
      mainFields: IS_NODE ? ['main', 'module'] : ['browser', 'module', 'main'],
      modules: ['node_modules', paths.appNodeModules],
      extensions: ['.cjs', '.mjs', '.js', '.jsx', '.json', '.ts', '.tsx'],
      alias: {
        // This is required so symlinks work during development.
        'webpack/hot/poll': require.resolve('webpack/hot/poll'),
        // Support React Native Web
        // https://www.smashingmagazine.com/2016/08/a-glimpse-into-the-future-with-react-native-for-web/
        'react-native': 'react-native-web',
        'react-native-svg': 'react-native-svg/lib/commonjs/ReactNativeSVG.web',
      },
    },
    ignoreWarnings: [/Failed to parse source map/],
    module: {
      strictExportPresence: true,
      rules: [
        {
          test: /\.js$/,
          enforce: 'pre',
          use: ['source-map-loader'],
        },
        {
          include: paths.appSrc,
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve('ts-loader'),
              options: {
                getCustomTransformers: () => ({
                  before: [IS_DEV && !IS_NODE && ReactRefreshTypeScript()].filter(Boolean),
                }),
                transpileOnly: true,
                experimentalWatchApi: true,
              },
            },
          ],
        },
        {
          exclude: [
            /\.html$/,
            /\.(js|jsx|mjs|cjs)$/,
            /\.(ts|tsx)$/,
            /\.(vue)$/,
            /\.(less)$/,
            /\.(re)$/,
            /\.(s?css|sass)$/,
            /\.json$/,
            /\.bmp$/,
            /\.gif$/,
            /\.jpe?g$/,
            /\.png$/,
          ],
          use: [{ // fix for vue-loader plugin
            loader: require.resolve('file-loader'),
            options: {
              name: fileLoaderOutputName,
              emitFile: IS_WEB,
            },
          }],
        },

        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
          use: [{
            loader: require.resolve('url-loader'),
            options: {
              limit: 10000,
              name: urlLoaderOutputName,
              emitFile: IS_WEB,
              esModule: false,
            },
          }],
        },

        // "postcss" loader applies autoprefixer to our CSS.
        // "css" loader resolves paths in CSS and adds assets as dependencies.
        // "style" loader turns CSS into JS modules that inject <style> tags.
        // In production, we use a plugin to extract that CSS to a file, but
        // in development "style" loader enables hot editing of CSS.
        {
          test: /\.css$/,
          use: filterTruthy([
            IS_WEB && {loader: IS_DEV ? require.resolve('style-loader') : MiniCssExtractPlugin.loader},
            {
              loader: require.resolve('css-loader'),
              options: {
                sourceMap: true,
                importLoaders: 1,
                modules: {
                  auto: true,
                  exportOnlyLocals: IS_NODE,
                  localIdentName: '[name]__[local]___[hash:base64:5]',
                },
              },
            },
            IS_WEB && {
              loader: require.resolve('postcss-loader'),
              options: {
                sourceMap: true,
                postcssOptions: {
                  plugins: [
                    [
                      'autoprefixer', {
                        overrideBrowserslist: [
                          '>1%',
                          'last 4 versions',
                          'Firefox ESR',
                          'not ie < 9',
                        ],
                        flexbox: 'no-2009',
                      },
                    ],
                  ],
                },
              },
            },
          ]),
        },
      ],
    },
  };

  config.performance = {
    maxAssetSize: 100 * 1000 * 1000,
    maxEntrypointSize: 100 * 1000 * 1000,
  };

  // Configure our client bundles output. Note the public path is to 3001.
  config.output = {
    path: IS_NODE ? paths.appBuild : paths.appBuildPublic,
    publicPath: IS_NODE || IS_DEV ? clientPublicPath : process.env.PUBLIC_PATH ?? '/',
    filename: jsOutputFilename,
    chunkFilename: jsOutputChunkFilename,
    crossOriginLoading: IS_WEB && IS_DEV && 'anonymous',
  };

  config.plugins = [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        diagnosticOptions: {
          semantic: true,
          syntactic: true,
        },
      },
    }),
    new webpack.DefinePlugin(hatchDefinitions),
  ];

  if (IS_NODE) {
    // We want to uphold node's __filename, and __dirname.
    config.node = {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __dirname: false,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      __filename: false,
    };

    let serverEntry = [paths.appServerEntry];

    config.optimization = {};

    if (IS_PROD) {
      config.plugins.push(
        new webpack.optimize.LimitChunkCountPlugin({
          maxChunks: 1,
        }),
      );
      config.optimization = {
        minimize: options.minimizeServer ?? false,
        minimizer: [
          new TerserPlugin({}),
        ],
      };
    }

    if (IS_DEV) {
      serverEntry = [
        `${require.resolve('webpack/hot/poll')}?300`,
        ...serverEntry,
      ];

      config.plugins.push(
        new StartServerPlugin({
          verbose: false,
          entryName: 'server',
          killOnExit: false,
          killOnError: false,
          restartable: true,
          nodeArgs: ['--enable-source-maps'],
          manifestPath: paths.appAssetsManifest,
        }),
      );

      if (options.includeServerDevServer) {
        config.devServer = {
          server: {
            type: 'http',
          },
          devMiddleware: {
            writeToDisk: true,
          },
        };
      }
    }

    config.entry = {
      server: serverEntry,
    };

    if (hasPrivateDir) {
      config.plugins.push(
        new CopyPlugin({
          patterns: [
            {
              from: `${paths.appPrivate}/**/*`,
              to: paths.appBuild,
              context: paths.appPath,
            },
          ],
        }),
      );
    }
  }

  if (IS_WEB) {
    config.entry = {
      client: [paths.appClientEntry],
    };

    config.resolve = {
      ...config.resolve,
      fallback: {
        ...config.resolve?.fallback,
        fs: false,
        events: require.resolve('events/'),
        stream: require.resolve('stream-browserify'),
        /* eslint-disable @typescript-eslint/naming-convention */
        _stream_duplex: require.resolve('readable-stream/lib/_stream_duplex'),
        _stream_passthrough: require.resolve('readable-stream/lib/_stream_passthrough'),
        _stream_readable: require.resolve('readable-stream/lib/_stream_readable'),
        _stream_transform: require.resolve('readable-stream/lib/_stream_transform'),
        _stream_writable: require.resolve('readable-stream/lib/_stream_writable'),
        /* eslint-enable @typescript-eslint/naming-convention */
      },
    };

    config.plugins = [
      ...config.plugins,
      new webpack.ProvidePlugin({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Buffer: [require.resolve('buffer/'), 'Buffer'],
        process: [require.resolve('process/browser')],
        console: [require.resolve('console-browserify')],
      }),
      new WebpackManifestPlugin({
        writeToFileEmit: true,
        fileName: paths.appAssetsManifest,
      }),
    ];

    if (IS_DEV) {
      config.devServer = {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
        historyApiFallback: {
          // See https://github.com/facebookincubator/crea3lp,;te-react-app/issues/387.
          disableDotRule: true,
        },
        host,
        port: devServerPort,
        server: {
          type: 'http',
        },
        allowedHosts: 'all',
        client: {
          logging: 'none',
          overlay: false,
          webSocketURL: {
            port: devServerPort,
          },
        },
        devMiddleware: {
          publicPath: clientPublicPath,
          writeToDisk: true,
        },
        static: {
          watch: {
            ignored: /node_modules/,
          },
        },
      };

      config.plugins.push(new ReactRefreshWebpackPlugin());

      config.optimization = {
        splitChunks: {
          cacheGroups: {
            default: false,
            defaultVendors: false,
          },
        },
      };
    } else {
      config.plugins.push(new MiniCssExtractPlugin({
        filename: cssOutputFilename,
        chunkFilename: cssOutputChunkFilename,
      }));

      config.plugins.push(
        new webpack.optimize.AggressiveMergingPlugin(),
      );

      if (hasPublicDir) {
        config.plugins.push(
          new CopyPlugin({
            patterns: [
              {
                from: `${paths.appPublic}/**/*`,
                to: paths.appBuild,
                context: paths.appPath,
              },
            ],
          }),
        );
      }

      config.optimization = {
        splitChunks: {
          cacheGroups: {
            default: false,
            defaultVendors: false,
          },
        },
        moduleIds: 'deterministic',
        minimize: true,
        minimizer: [
          new TerserPlugin({
            terserOptions: {
              parse: {
                // https://github.com/facebook/create-react-app/pull/4234
                ecma: 2017,
              },
              compress: {
                ecma: 5,
                // https://github.com/facebook/create-react-app/issues/2376
                comparisons: false,
                // https://github.com/facebook/create-react-app/issues/5250
                inline: 2,
              },
              mangle: {
                safari10: true,
              },
              output: {
                ecma: 5,
                comments: false,
                // https://github.com/facebook/create-react-app/issues/2488
                // eslint-disable-next-line @typescript-eslint/naming-convention
                ascii_only: true,
              },
              sourceMap: true,
            },
          }),
          new CssMinimizerPlugin({
            minify: CssMinimizerPlugin.cleanCssMinify,
          }),
        ],
      };
    }
  }

  config.plugins.push(
    new WebpackBar({
      color: options.target === 'web' ? '#505bf1' : '#6c2bfa',
      name: options.target === 'web' ? 'client' : 'server',
    }),
  );

  // Ignore warning about express being bundled
  config.plugins.push(
    new webpack.ContextReplacementPlugin(
      /\/express\//,
      (data: {dependencies: {critical?: boolean}[]}) => {
        // eslint-disable-next-line no-param-reassign
        delete data.dependencies[0].critical;
        return data;
      },
    ),
  );

  if (process.env.ANALYZE_BUNDLE === 'true') {
    config.plugins.push(
      new BundleAnalyzerPlugin({
        analyzerPort: config.target === 'node' ? 2998 : 2999,
      }),
    );
  }

  return logAndReturn('hatchWebpackConfig', config, {target: options.target, dev: IS_DEV});
};

export const createSingleComponentConfig = (options: HatchWebappComponentWebpackOptions) => {
  // eslint-disable-next-line consistent-return
  return (env: IWebpackConfigurationFnEnvironment) => {
    // Attempt to auto-detect dev mode if this is run via the Heft Webpack Plugin
    if (options.isDev == null) {
      if (env?.taskSession?.parameters?.watch != null) {
        // eslint-disable-next-line no-param-reassign
        options.isDev = env.taskSession.parameters.watch;
      } else {
        // eslint-disable-next-line no-console
        console.error('Could not auto-determine isDev parameter for hatch-webpack-config. Please specify manually.');
        process.exit(2);
      }
    }
    try {
      return createWebpackConfigHelper(options);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Error creating webpack config', e);
      process.exit(1);
    }
  };
};

export const createWebappConfig = (options: HatchWebappWebpackOptions) => {
  return (env: IWebpackConfigurationFnEnvironment) => {
    return [
      createSingleComponentConfig({...options, target: 'web', includeServerDevServer: false})(env),
      createSingleComponentConfig({...options, target: 'node', includeServerDevServer: false})(env),
    ];
  };
};
