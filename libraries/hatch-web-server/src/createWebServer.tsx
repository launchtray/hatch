import {
  createServer,
  CreateServerOptions,
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
import express, {Application} from 'express';
import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {HelmetProvider} from 'react-helmet-async';
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

let assets: any;
let assetsPrefix: string;

const syncLoadAssets = () => {
  assets = JSON.parse(fs.readFileSync(path.resolve(__dirname, './assets.json')) as any);
  assetsPrefix = (process.env.STATIC_ASSETS_BASE_URL ?? '').replace(/\/$/, '');
  __webpack_public_path__ = `${assetsPrefix}/`;
};
syncLoadAssets();

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
    logger, webAppManagerInstances, store, clientContainer, cookie, authHeader, true
  );

  const rootSagaTask = sagaMiddleware.run(rootSaga);
  store.dispatch(navActions.serverLocationLoaded({location}));

  const rootTaskWithTimeout = new Promise(async (resolve, reject) => {
    setTimeout(() => reject('SSR timeout'), SSR_TIMEOUT_MS);
    resolve(await rootSagaTask.toPromise());
  });
  await rootTaskWithTimeout;

  const App = composition.App;
  const helmetContext: any = {};

  if (requestContext.stateOnly) {
    // 'unsafe' option relies on response being 'application/json' and not html
    const options: SerializeJSOptions = {unsafe: true, isJSON: true};
    if (requestContext.prettify) {
      options.space = 2;
    }
    return serialize({state: store.getState()}, options);
  }

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

  // @ts-ignore Ignore warning for getApplication, which is only in react-native-web and not @types/react-native
  const {element, getStyleElement} = AppRegistry.getApplication('RNApp', {});
  const html = ReactDOMServer.renderToString(element);
  const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

  const {helmet} = helmetContext;
  const crossOrigin = process.env.NODE_ENV === 'development' || process.env.STATIC_ASSETS_CROSS_ORIGIN === 'true';
  const faviconPath = assetsPrefix + '/favicon.ico';

  return (`<!doctype html>
    <html lang="" ${helmet.htmlAttributes.toString()}>
    <head>
      <script>
        window.__STATIC_ASSETS_BASE_URL__ = '${assetsPrefix}/';
      </script>
      ${helmet.title.toString()}
      ${helmet.meta.toString()}
      ${helmet.link.toString()}
      <link rel="shortcut icon" href="${faviconPath}">
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${css}
      ${assets.client.css ? `<link rel="stylesheet" href="${assetsPrefix + assets.client.css}">` : ''}
      ${crossOrigin
        ? `<script src="${assetsPrefix + assets.client.js}" defer crossorigin></script>`
        : `<script src="${assetsPrefix + assets.client.js}" defer></script>`
      }
    </head>
    <body ${helmet.bodyAttributes.toString()}>
      <div id="root">${html}</div>
      <script>
        window.__PRELOADED_STATE__ = ${serialize(store.getState())}
        window.__ENV__ = ${serialize(runtimeConfig)}
      </script>
    </body>
    </html>`
  );
};

const addRedirect = (app: Application, path: string) => {
  app.get(path, (req, res) => {
    res.redirect(assetsPrefix + req.path);
  });
};

export default (options: CreateServerOptions<WebServerComposition>) => {
  resetDefinedActions();
  createServer(options, (server, app, composition, logger, errorReporter) => {
    app.disable('x-powered-by');
    if (assetsPrefix.length === 0) {
      const publicPath = process.env.NODE_ENV === 'development' ? '../public' : '../build/public';
      const publicDir = path.resolve(__dirname, publicPath);
      app.use(express.static(publicDir));
    } else {
      addRedirect(app, '/favicon.ico');
      addRedirect(app, '/robots.txt');
      addRedirect(app, '/static/*');
    }
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
      renderClient(requestContext).then((body) => {
        res.status(200).send(body);
      }).catch((err: Error) => {
        next?.(err);
      });
    });
  });
};
