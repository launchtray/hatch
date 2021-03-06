import {
  addStaticRoutes,
  createServer,
  CreateServerOptions,
  loadStaticAssetsMetadata,
} from '@launchtray/hatch-server';
import {ErrorReporter, Logger, ROOT_CONTAINER} from '@launchtray/hatch-util';
import {
  createErrorReporterMiddleware,
  createNavMiddleware,
  createSagaForWebAppManagers,
  navActions,
  NavProvider,
  registerWebAppManagers,
  resetDefinedActions,
  resolveWebAppManagers,
  WebCommonComposition,
  runtimeConfig,
} from '@launchtray/hatch-web';
import crypto from 'crypto';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {HelmetData, HelmetProvider} from 'react-helmet-async';
import {AppRegistry} from 'react-native';
import {Provider as StoreProvider} from 'react-redux';
import {applyMiddleware, createStore} from 'redux';
import createSagaMiddleware from 'redux-saga';
import serialize, {SerializeJSOptions} from 'serialize-javascript';

import {WebServerComposition} from './WebServerComposer';

const SSR_TIMEOUT_MS = 5000;

interface ClientRenderRequestContext {
  requestURL: string;
  composition: WebCommonComposition;
  stateOnly?: boolean;
  prettify: boolean;
  logger: Logger;
  errorReporter: ErrorReporter;
  cookie?: string;
  authHeader?: string;
}

const {assets, assetsPrefix} = loadStaticAssetsMetadata();

const renderClient = async (requestContext: ClientRenderRequestContext): Promise<string> => {
  const clientContainer = ROOT_CONTAINER.createChildContainer();
  const {composition, logger, errorReporter, cookie, authHeader} = requestContext;
  const sagaMiddleware = createSagaMiddleware();
  const {navMiddleware, location} = createNavMiddleware(requestContext.requestURL);
  const middleware = applyMiddleware(sagaMiddleware, navMiddleware, createErrorReporterMiddleware(errorReporter));
  const store = createStore(composition.createRootReducer(), middleware);

  const webAppManagers = composition.webAppManagers ?? [];
  registerWebAppManagers(
    clientContainer,
    ...webAppManagers,
  );
  const webAppManagerInstances = await resolveWebAppManagers(clientContainer);
  const rootSaga = await createSagaForWebAppManagers(
    logger,
    webAppManagerInstances,
    store,
    clientContainer,
    cookie,
    authHeader,
    true,
  );

  const rootSagaTask = sagaMiddleware.run(rootSaga);
  store.dispatch(navActions.serverLocationLoaded({location}));

  const rootTaskWithTimeout = new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('SSR timeout')), SSR_TIMEOUT_MS);
    rootSagaTask.toPromise()
      .then(resolve)
      .catch(reject);
  });
  await rootTaskWithTimeout;

  // eslint-disable-next-line @typescript-eslint/naming-convention -- React component should be PascalCase
  const App = composition.appComponent;
  const helmetContext = {} as unknown as {helmet: HelmetData};

  if (requestContext.stateOnly) {
    // 'unsafe' option relies on response being 'application/json' and not html
    const options: SerializeJSOptions = {unsafe: true, isJSON: true};
    if (requestContext.prettify) {
      options.space = 2;
    }
    return serialize({state: store.getState()}, options);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention -- React component should be PascalCase
  const RNApp = () => (
    <StoreProvider store={store}>
      <NavProvider>
        <HelmetProvider context={helmetContext}>
          <App/>
        </HelmetProvider>
      </NavProvider>
    </StoreProvider>
  );

  AppRegistry.registerComponent('RNApp', () => RNApp);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Ignore warning for getApplication, which is only in react-native-web and not @types/react-native
  const {element, getStyleElement} = AppRegistry.getApplication('RNApp', {});
  const html = ReactDOMServer.renderToString(element);
  const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

  const {helmet} = helmetContext;
  const crossOrigin = process.env.NODE_ENV === 'development' || process.env.STATIC_ASSETS_CROSS_ORIGIN === 'true';
  const faviconPath = `${assetsPrefix}/favicon.ico`;
  const assetsScript = crossOrigin
    ? `<script src="${assetsPrefix + assets.client.js}" defer crossorigin></script>`
    : `<script src="${assetsPrefix + assets.client.js}" defer></script>`;

  return (`<!doctype html>
    <html lang="" ${helmet.htmlAttributes.toString()}>
    <head>
      <script>
        window.__STATIC_ASSETS_BASE_URL__ = '${assetsPrefix}/';
        window.__PRELOADED_STATE__ = ${serialize(store.getState())}
        window.__RUNTIME_CONFIG__ = ${serialize(runtimeConfig)}
      </script>
      ${helmet.title.toString()}
      ${helmet.meta.toString()}
      ${helmet.link.toString()}
      <link rel="shortcut icon" href="${faviconPath}">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${css}
      ${assets.client.css != null ? `<link rel="stylesheet" href="${assetsPrefix + assets.client.css}">` : ''}
      ${assetsScript}
    </head>
    <body ${helmet.bodyAttributes.toString()}>
      <div id="root">${html}</div>
    </body>
    </html>`
  );
};

export default (options: CreateServerOptions<WebServerComposition>) => {
  resetDefinedActions();
  runtimeConfig.SENTRY_DSN = process.env.SENTRY_DSN;
  runtimeConfig.ENABLE_API_SPEC = process.env.ENABLE_API_SPEC;
  createServer(options, (server, app, composition, logger, errorReporter) => {
    addStaticRoutes(app, assetsPrefix);
    app.get('/*', (req, res, next) => {
      const stateOnly = req.query.state !== undefined;
      const prettify = req.query.state === 'pretty';
      if (stateOnly) {
        // Note: do not remove this without also removing the 'unsafe' option to serialization of state to JSON
        // in renderClient, as user input could otherwise be serialized as HTML.
        res.setHeader('Content-Type', 'application/json');
      }
      const requestContext: ClientRenderRequestContext = {
        composition,
        requestURL: req.url,
        stateOnly,
        prettify,
        logger,
        errorReporter,
        cookie: req.headers.cookie,
        authHeader: req.headers.authorization,
      };
      crypto.randomBytes(32, (err, buf) => {
        if (err != null) {
          next(err);
          return;
        }
        renderClient(requestContext).then((body) => {
          res.cookie('double_submit', buf.toString('hex'));
          res.status(200).send(body);
        }).catch((renderError: Error) => {
          next?.(renderError);
        });
      });
    });
  });
};
