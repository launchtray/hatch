const staticAssetsBaseURL = (window as any).__STATIC_ASSETS_BASE_URL__;
if (staticAssetsBaseURL !== '/') {
  __webpack_public_path__ = staticAssetsBaseURL;
}
import {
  ConsoleLogger,
  initializeInjection,
  InjectionInitializationContext,
  NON_LOGGER,
  ROOT_CONTAINER,
  SentryMonitor,
  SentryReporter,
} from '@launchtray/hatch-util';
import {
  createErrorReporterMiddleware,
  createNavMiddleware,
  createSagaForWebAppManagers,
  NavProvider,
  registerWebAppManagers,
  resetDefinedActions,
  resolveWebAppManagers,
  runtimeConfig,
} from '@launchtray/hatch-web';
import {
  addBreadcrumb,
  Breadcrumb,
  captureException,
  init,
  Integrations,
  setExtra,
  setTag} from '@sentry/browser';
import {Options} from '@sentry/types';
import React from 'react';
import {HelmetProvider} from 'react-helmet-async';
import {AppRegistry} from 'react-native';
import {Provider as StoreProvider} from 'react-redux';
import {Route, Switch} from 'react-router';
import {applyMiddleware, createStore, Middleware, Store} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import createSagaMiddleware, {Saga, Task} from 'redux-saga';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

import {WebClientComposer, WebClientComposition} from './WebClientComposer';

export interface CreateClientOptions {
  reloadComposeModule: () => any;
  injectionOptions?: InjectionInitializationContext;
}

const RNApp = ({reduxStore, RootApp}: {reduxStore: any, RootApp: any}) => {
  return (
    <StoreProvider store={reduxStore}>
      <NavProvider>
        <HelmetProvider>
          <Switch>
            <Route path={'/api'}>
              <SwaggerUI url='/api.json' docExpansion={'list'}/>
            </Route>
            <Route>
              <RootApp/>
            </Route>
          </Switch>
        </HelmetProvider>
      </NavProvider>
    </StoreProvider>
  );
};

let sagaMiddleware: Middleware & {run: (rootSaga: Saga) => Task};
let store: Store;
let runningRootSagaTask: Task;
if (module.hot) {
  module.hot.dispose((data) => {
    data.runningRootSagaTask = runningRootSagaTask;
    data.store = store;
    data.sagaMiddleware = sagaMiddleware;
  });
  if (module.hot.data) {
    runningRootSagaTask = module.hot.data.runningRootSagaTask;
    store = module.hot.data.store;
    sagaMiddleware = module.hot.data.sagaMiddleware;
  }
}

const dsn: string | undefined = runtimeConfig.SENTRY_DSN;

const sentryMonitor: SentryMonitor = {
  addBreadcrumb: (breadcrumb: Breadcrumb) => { addBreadcrumb(breadcrumb); },
  captureException: (error: any) => { captureException(error); },
  init: (options: Options) => { init(options); },
  setExtra: (key: string, extra: any) => { setExtra(key, extra); },
  setTag: (key: string, value: string) => { setTag(key, value); },
};

const createClientAsync = async (clientComposer: WebClientComposer) => {
  if (runningRootSagaTask != null) {
    runningRootSagaTask.cancel();
    await runningRootSagaTask.toPromise();
  }

  const container = ROOT_CONTAINER;
  const composition: WebClientComposition = await clientComposer();

  const appName = await container.resolve<string>('appName');
  const logger = (process.env.NODE_ENV === 'production') ? NON_LOGGER : new ConsoleLogger();
  const consoleBreadcrumbs = [new Integrations.Breadcrumbs({console: true})];
  const sentry = new SentryReporter(sentryMonitor, logger, {dsn, integrations: consoleBreadcrumbs});
  container.registerInstance('ErrorReporter', sentry);

  container.registerInstance('Logger', logger);
  let onSagaError: ((error: Error) => void) | null = null;
  if (store == null) {
    sagaMiddleware = createSagaMiddleware({
      onError: (error: Error) => {
        if (onSagaError != null) {
          onSagaError(error);
        }
      },
    });
    const {navMiddleware} = createNavMiddleware();
    let middleware = applyMiddleware(sagaMiddleware, navMiddleware, createErrorReporterMiddleware(sentry));
    if (process.env.NODE_ENV !== 'production') {
      const composeEnhancers = composeWithDevTools({trace: true, actionCreators: composition.actions});
      middleware = composeEnhancers(middleware);
    }
    store = createStore(composition.createRootReducer(), (window as any).__PRELOADED_STATE__, middleware);
  } else {
    store.replaceReducer(composition.createRootReducer());
  }

  const webAppManagers = composition.webAppManagers ?? [];
  registerWebAppManagers(
    container,
    ...webAppManagers,
  );

  const webAppManagerInstances = await resolveWebAppManagers(container);
  const rootSaga = await createSagaForWebAppManagers(
    logger, webAppManagerInstances, store, container, document.cookie
  );

  if (rootSaga != null) {
    onSagaError = (error) => {
      logger.error('Root saga error: ' + error.message + ', stack trace: ' + error.stack);
      sentry.captureException(error);
    };
  }
  runningRootSagaTask = sagaMiddleware.run(rootSaga);

  const App = composition.App;

  AppRegistry.registerComponent('RNApp', () => RNApp);
  AppRegistry.runApplication('RNApp', {
    initialProps: {reduxStore: store, RootApp: App},
    rootTag: document.getElementById('root'),
  });
};

export default (options: CreateClientOptions) => {
  resetDefinedActions();
  initializeInjection(options.injectionOptions);
  const clientComposer = options.reloadComposeModule().default;
  createClientAsync(clientComposer).catch((err) => {
    console.error(err);
  });
};
