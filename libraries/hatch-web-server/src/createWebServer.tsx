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
} from '@launchtray/hatch-web';
import express from 'express';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import {HelmetProvider} from 'react-helmet-async';
import {AppRegistry} from 'react-native';
import {Provider as StoreProvider} from 'react-redux';
import {applyMiddleware, createStore} from 'redux';
import createSagaMiddleware from 'redux-saga';
import serialize, {SerializeJSOptions} from 'serialize-javascript';
import {WebServerComposition} from './WebServerComposer';
import {runtimeConfig} from "./config";

const SSR_TIMEOUT_MS = 5000;

interface ClientRenderRequestContext {
  requestURL: string;
  clientJS: string;
  composition: WebCommonComposition;
  stateOnly?: boolean;
  prettify: boolean;
  logger: Logger;
  errorReporter: ErrorReporter;
}

let assets: any;

const syncLoadAssets = () => {
  assets = require(process.env.RAZZLE_ASSETS_MANIFEST!);
};
syncLoadAssets();

const renderClient = async (requestContext: ClientRenderRequestContext): Promise<string> => {
  const clientContainer = ROOT_CONTAINER.createChildContainer();
  const {composition, logger, errorReporter} = requestContext;
  const sagaMiddleware = createSagaMiddleware();
  const {navMiddleware, location} = createNavMiddleware(requestContext.requestURL);
  const middleware = applyMiddleware(sagaMiddleware, navMiddleware, createErrorReporterMiddleware(errorReporter));
  const store = createStore(composition.createRootReducer(), middleware);

  const webAppManagers = composition.webAppManagers ?? [];
  registerWebAppManagers(
    clientContainer,
    ...webAppManagers,
  );
  const webAppManagerInstances = resolveWebAppManagers(clientContainer);
  const rootSaga = createSagaForWebAppManagers(logger, webAppManagerInstances, store, clientContainer, true);

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

  return (`<!doctype html>
    <html lang="" ${helmet.htmlAttributes.toString()}>
    <head>
      ${helmet.title.toString()}
      ${helmet.meta.toString()}
      ${helmet.link.toString()}
      <meta http-equiv="X-UA-Compatible" content="IE=edge" />
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1">
      ${css}
      ${
        process.env.NODE_ENV === 'production'
          ? `<script src="${requestContext.clientJS}" defer></script>`
          : `<script src="${requestContext.clientJS}" defer crossorigin></script>`
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

export default (options: CreateServerOptions<WebServerComposition>) => {
  resetDefinedActions();
  createServer(options, (server, composition, logger, errorReporter) => {
    server
      .disable('x-powered-by')
      .use(express.static(process.env.RAZZLE_PUBLIC_DIR!))
      .get('/*', (req, res, next) => {
        const stateOnly = req.query.state !== undefined;
        const prettify = req.query.state === 'pretty';
        if (stateOnly) {
          // Note: do not remove this without also removing the 'unsafe' option to serialization of state to JSON
          // in renderClient, as user input could otherwise be serialized as HTML.
          res.setHeader('Content-Type', 'application/json');
        }
        const requestContext: ClientRenderRequestContext = {
          clientJS: assets.client.js,
          composition,
          requestURL: req.url,
          stateOnly,
          prettify,
          logger,
          errorReporter,
        };
        renderClient(requestContext).then((body) => {
          res.status(200).send(body);
        }).catch((err: Error) => {
          next?.(err);
        });
      });
  });
};
