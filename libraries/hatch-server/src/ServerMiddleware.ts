import {Class, DependencyContainer, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import http from 'http';

export type Server = http.Server;

export interface ServerMiddleware {
  register(app: Application, server: Server): Promise<void>;
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
  let middlewareList: ServerMiddleware[];
  try {
    middlewareList = container.resolveAll<ServerMiddleware>(serverMiddlewareKey);
  } catch (err) {
    throw new Error('Error resolving server middleware with exception: ' + JSON.stringify(err));
  }
  logger?.debug('Total server middleware count: ' + middlewareList.length);
  for (const middleware of middlewareList) {
    logger?.debug('- ' + middleware.constructor.name);
  }
  return middlewareList;
};
