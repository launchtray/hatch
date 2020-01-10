import {Class, DependencyContainer, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';

export interface ServerMiddleware {
  register(server: Application): Promise<void>;
}

export type ServerMiddlewareClass = Class<ServerMiddleware>;
const serverMiddlewareKey = Symbol('serverMiddleware');

export const registerServerMiddleware = (
  container: DependencyContainer,
  ...middlewareList: ServerMiddlewareClass[]
) => {
  for (const middleware of middlewareList) {
    container.registerSingleton(serverMiddlewareKey, middleware);
  }
};

export const resolveServerMiddleware = (container: DependencyContainer, logger?: Logger): ServerMiddleware[] => {
  const middlewareList = container.resolveAll<ServerMiddleware>(serverMiddlewareKey);
  logger?.debug('Total server middleware count: ' + middlewareList.length);
  for (const middleware of middlewareList) {
    logger?.debug('- ' + middleware.constructor.name);
  }
  return middlewareList;
};
