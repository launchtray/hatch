import {initializeInjection, InjectionInitializationContext, ROOT_CONTAINER} from '@launchtray/hatch-util';
import {
  createNavMiddleware,
  createSagaForWebAppManagers,
  NavProvider,
  registerWebAppManagers,
  resetDefinedActions,
  resolveWebAppManagers
} from '@launchtray/hatch-web';
import React from 'react';
import {HelmetProvider} from 'react-helmet-async';
import {AppRegistry} from 'react-native';
import {Provider as StoreProvider} from 'react-redux';
import {applyMiddleware, createStore, Middleware, Store} from 'redux';
import {composeWithDevTools} from 'redux-devtools-extension';
import createSagaMiddleware, {Saga, Task} from 'redux-saga';
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
          <RootApp/>
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

const createClientAsync = async (clientComposer: WebClientComposer) => {
  if (runningRootSagaTask != null) {
    runningRootSagaTask.cancel();
    await runningRootSagaTask.toPromise();
  }

  const container = ROOT_CONTAINER;
  const composition: WebClientComposition = await clientComposer();
  const {logger} = composition;

  if (store == null) {
    sagaMiddleware = createSagaMiddleware();
    const {navMiddleware} = createNavMiddleware();
    let middleware = applyMiddleware(sagaMiddleware, navMiddleware);
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
  const webAppManagerInstances = resolveWebAppManagers(container);
  const rootSaga = createSagaForWebAppManagers(logger, webAppManagerInstances, store, container);

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
