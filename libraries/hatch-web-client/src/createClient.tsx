/* eslint-disable import/first -- __webpack_public_path__ needs to be set before imports */
/* eslint-disable no-undef, @typescript-eslint/no-explicit-any, no-underscore-dangle */
const staticAssetsBaseURL = (window as any).__STATIC_ASSETS_BASE_URL__;
if (staticAssetsBaseURL !== '/') {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  // eslint-disable-next-line no-undef -- global
  __webpack_public_path__ = staticAssetsBaseURL;
}
/* eslint-enable no-undef, @typescript-eslint/no-explicit-any, no-underscore-dangle */

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
  setTag,
} from '@sentry/browser';
import {Options} from '@sentry/types';
import React from 'react';
import {HelmetProvider} from 'react-helmet-async';
import {AppRegistry} from 'react-native';
import {Provider as StoreProvider} from 'react-redux';
import {Route, Switch} from 'react-router';
import {applyMiddleware, createStore, Middleware, Store} from 'redux';
import {composeWithDevTools} from '@redux-devtools/extension';
import createSagaMiddleware, {Saga, Task} from 'redux-saga';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

import {WebClientComposer, WebClientComposition} from './WebClientComposer';

/* eslint-enable import/first */

export interface CreateClientOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reloadComposeModule: () => any;
  injectionOptions?: InjectionInitializationContext;
}

// eslint-disable-next-line @typescript-eslint/naming-convention -- React component should be PascalCase
const RNApp = ({reduxStore, RootApp}: {reduxStore: Store, RootApp: React.ElementType}) => {
  return (
    <StoreProvider store={reduxStore}>
      <NavProvider>
        <HelmetProvider>
          <Switch>
            <Route path={'/api'}>
              <SwaggerUI url={'/api.json'} docExpansion={'list'}/>
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

// eslint-disable-next-line @typescript-eslint/naming-convention -- React component should be PascalCase
const RNAppWithoutSwagger = ({reduxStore, RootApp}: {reduxStore: Store, RootApp: React.ElementType}) => {
  return (
    <StoreProvider store={reduxStore}>
      <NavProvider>
        <HelmetProvider>
          <Switch>
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
if (module.hot != null) {
  module.hot.dispose((data) => {
    /* eslint-disable no-param-reassign -- intentional mutation */
    data.runningRootSagaTask = runningRootSagaTask;
    data.store = store;
    data.sagaMiddleware = sagaMiddleware;
    /* eslint-enable no-param-reassign  */
  });
  if (module.hot.data != null) {
    runningRootSagaTask = module.hot.data.runningRootSagaTask;
    store = module.hot.data.store;
    sagaMiddleware = module.hot.data.sagaMiddleware;
  }
}

const sentryMonitor: SentryMonitor = {
  addBreadcrumb: (breadcrumb: Breadcrumb) => {
    addBreadcrumb(breadcrumb);
  },
  captureException: (error: Error) => {
    captureException(error);
  },
  init: (options: Options) => {
    init(options);
  },
  setExtra: (key: string, extra: unknown) => {
    setExtra(key, extra);
  },
  setTag: (key: string, value: string) => {
    setTag(key, value);
  },
};

const createClientAsync = async (clientComposer: WebClientComposer) => {
  if (runningRootSagaTask != null) {
    runningRootSagaTask.cancel();
    await runningRootSagaTask.toPromise();
  }

  const container = ROOT_CONTAINER;
  const composition: WebClientComposition = await clientComposer();

  const clientLoggingEnabled = process.env.NODE_ENV !== 'production' || runtimeConfig.ENABLE_CLIENT_LOGGING === 'true';
  const logger = clientLoggingEnabled ? new ConsoleLogger() : NON_LOGGER;
  const consoleBreadcrumbs = [new Integrations.Breadcrumbs({console: true})];
  const sentry = new SentryReporter(sentryMonitor, logger, {
    dsn: runtimeConfig.SENTRY_DSN as string,
    integrations: consoleBreadcrumbs,
  });
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dev tools typings are incomplete
      const composeEnhancers = composeWithDevTools({trace: true, actionCreators: composition.actions as any});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dev tools typings are incomplete
      middleware = composeEnhancers(middleware) as any;
    }
    // eslint-disable-next-line no-undef, @typescript-eslint/no-explicit-any, no-underscore-dangle -- global window
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
  // eslint-disable-next-line no-undef -- global document object
  const rootSaga = await createSagaForWebAppManagers(logger, webAppManagerInstances, store, container, document.cookie);

  if (rootSaga != null) {
    onSagaError = (error) => {
      logger.error(`Root saga error: ${error.message}, stack trace: ${error.stack}`);
      sentry.captureException(error);
    };
  }
  runningRootSagaTask = sagaMiddleware.run(rootSaga);

  if (runtimeConfig.ENABLE_API_SPEC === 'true') {
    AppRegistry.registerComponent('RNApp', () => RNApp);
  } else {
    AppRegistry.registerComponent('RNApp', () => RNAppWithoutSwagger);
  }
  AppRegistry.runApplication('RNApp', {
    // eslint-disable-next-line @typescript-eslint/naming-convention -- React Component should be PascalCase
    initialProps: {reduxStore: store, RootApp: composition.appComponent},
    // eslint-disable-next-line no-undef -- global document object
    rootTag: document.getElementById(composition.appRootId ?? 'root'),
  });
};

export default (options: CreateClientOptions) => {
  resetDefinedActions();
  initializeInjection(options.injectionOptions);
  const clientComposer = options.reloadComposeModule().default;
  createClientAsync(clientComposer).catch((err) => {
    // eslint-disable-next-line no-console -- intentional error logging
    console.error(err);
  });
};
