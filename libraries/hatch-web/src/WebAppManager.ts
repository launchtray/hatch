import {Class, DependencyContainer, injectable, Logger, resolveParams} from '@launchtray/hatch-util';
import {match, matchPath, RouteProps} from 'react-router';
import {AnyAction, Store} from 'redux';
import {Saga} from 'redux-saga';
import {call} from 'redux-saga/effects';
import effects, {Effect} from './effects';
import {
  Location,
  navActions,
  selectLocationFromLocationChangeAction,
  selectFirstRenderingFromLocationChangeAction,
} from './NavProvider';
import {isActionType} from './defineAction';

export const webAppManager = injectable;
const pathMatchersKey = Symbol('pathMatchers');
const clientLoadersKey = Symbol('clientLoaders');
const webAppManagerKey = Symbol('webAppManager');
export type PathMatcher = (path: string) => match | null;

interface WebAppManager extends Object {
  [pathMatchersKey]?: Array<{propertyKey: string | symbol, pathMatcher: PathMatcher}>;
  [clientLoadersKey]?: Array<{propertyKey: string | symbol}>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rest args are not known
export const registerWebAppManagers = (container: DependencyContainer, ...webAppManagers: Array<Class<any>>) => {
  for (const manager of webAppManagers) {
    container.registerSingleton(webAppManagerKey, manager);
  }
};

export const resolveWebAppManagers = async (container: DependencyContainer): Promise<WebAppManager[]> => {
  return await container.resolveAll(webAppManagerKey);
};

export const onLocationChange = <Params extends { [K in keyof Params]?: string }>(
  props?: string | string[] | Pick<RouteProps, 'path' | 'exact' | 'sensitive' | 'strict'>,
) => {
  const pathMatcher = (path: string) => {
    return matchPath(path, props ?? {path});
  };
  return (target: unknown, propertyKey: string | symbol) => {
    const asWebAppManager = target as WebAppManager;
    if (asWebAppManager[pathMatchersKey] == null) {
      asWebAppManager[pathMatchersKey] = [];
    }
    asWebAppManager[pathMatchersKey]?.push({propertyKey, pathMatcher});
  };
};

export const onClientLoad = () => {
  return (target: unknown, propertyKey: string | symbol) => {
    const asWebAppManager = target as WebAppManager;
    if (asWebAppManager[clientLoadersKey] == null) {
      asWebAppManager[clientLoadersKey] = [];
    }
    asWebAppManager[clientLoadersKey]?.push({propertyKey});
  };
};

const forEachPathMatcher = async (
  target: unknown,
  iterator: (propertyKey: string | symbol, pathMatcher: PathMatcher) => Promise<void>,
) => {
  const asWebAppManager = target as WebAppManager;
  const pathMatchers = asWebAppManager?.[pathMatchersKey] ?? [];
  for (const {propertyKey, pathMatcher} of pathMatchers) {
    await iterator(propertyKey, pathMatcher);
  }
};

const forEachClientLoader = async (
  target: unknown,
  iterator: (propertyKey: string | symbol) => Promise<void>,
) => {
  const asWebAppManager = target as WebAppManager;
  const clientLoaders = asWebAppManager?.[clientLoadersKey] ?? [];
  for (const {propertyKey} of clientLoaders) {
    await iterator(propertyKey);
  }
};

const hasWebAppManagerMethods = (target: unknown): boolean => {
  const asWebAppManager = target as WebAppManager;
  return (asWebAppManager[clientLoadersKey] != null) || (asWebAppManager[pathMatchersKey] != null);
};

export const createSagaForWebAppManagers = async (
  logger: Logger,
  webAppManagers: WebAppManager[],
  store: Store,
  rootContainer: DependencyContainer,
  cookie?: string,
  authHeader?: string,
  isServer = false,
  ssrEnabled = true,
): Promise<Saga> => {
  const sagas: Effect[] = [];
  logger.debug(`Total web app manager count: ${webAppManagers.length}`);
  webAppManagers.forEach((manager) => {
    const className = manager.constructor.name;
    logger?.debug(`- ${className}`);
    if (!hasWebAppManagerMethods(manager)) {
      throw new Error(`${className} does not have any web app manager decorators, but is registered as a manager.`);
    }
  });
  if (!isServer) {
    const handleClientLoadSagas: Effect[] = [];
    const container = rootContainer.createChildContainer();
    container.registerInstance('Store', store);
    container.registerInstance('cookie', cookie ?? '');
    container.registerInstance('authHeader', authHeader ?? '');
    for (const manager of webAppManagers) {
      const target = manager.constructor.prototype;
      await forEachClientLoader(target, async (propertyKey) => {
        const args = await resolveParams(container, target, propertyKey);
        handleClientLoadSagas.push(effects.fork([manager, manager[propertyKey]], ...args));
      });
    }
    sagas.push(...handleClientLoadSagas);
  }
  const navigateActions = [
    navActions.locationChange,
    navActions.serverLocationLoaded,
  ];
  const navWorker = function* navWorker(action: AnyAction) {
    let location: Location;
    let isFirstRendering: boolean;
    if (isActionType(navActions.serverLocationLoaded, action)) {
      location = action.payload.location;
      isFirstRendering = false;
    } else {
      location = selectLocationFromLocationChangeAction(action);
      isFirstRendering = selectFirstRenderingFromLocationChangeAction(action);
    }

    if (!ssrEnabled || !isFirstRendering || (location.fragment != null && location.fragment !== '')) {
      const handleLocationChangeSagas: Effect[] = [];
      for (const manager of webAppManagers) {
        const target = manager.constructor.prototype;
        yield forEachPathMatcher(manager, async (propertyKey, pathMatcher) => {
          const pathMatch = pathMatcher(location.path);
          if (pathMatch != null) {
            const container = rootContainer.createChildContainer();

            container.registerInstance('pathMatch', pathMatch);
            container.registerInstance('Location', location);
            container.registerInstance('isServer', isServer);
            container.registerInstance('Store', store);
            container.registerInstance('cookie', cookie ?? '');
            container.registerInstance('authHeader', authHeader ?? '');

            const args = await resolveParams(container, target, propertyKey);
            handleLocationChangeSagas.push(call([manager, manager[propertyKey]], ...args));
          }
        });
      }
      logger.info('Calling web app managers with location change:', action);
      yield effects.all(handleLocationChangeSagas);
      yield effects.put(navActions.locationChangeApplied({location}));
    }
  };
  if (isServer) {
    sagas.push(effects.fork(function* navActionSaga() {
      const navAction = yield* effects.take(navigateActions);
      yield effects.fork(navWorker, navAction);
    }));
  } else {
    sagas.push(effects.fork(function* navActionSaga() {
      yield* effects.takeLatest(navigateActions, navWorker);
    }));
  }
  return function* rootSaga() {
    yield effects.all(sagas);
  };
};
