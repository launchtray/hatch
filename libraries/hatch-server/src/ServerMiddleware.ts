import {Class, DependencyContainer, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import http from 'http';
import {OpenAPIMethod, OpenAPIParameter, OpenAPIResponses} from './OpenAPI';

export type Server = http.Server;

export interface APIMetadataParameters {
  description?: string;
  parameters?: {
    [key: string]: Partial<OpenAPIParameter>,
  };
  responses?: Partial<OpenAPIResponses>;
}

export interface APIMetadata {
  description: string;
  path: string;
  method: OpenAPIMethod;
  parameters: OpenAPIParameter[];
  responses: OpenAPIResponses;
}

export type APIMetadataConsumer = (metadata: APIMetadata) => void;

export interface ServerMiddleware {
  register(app: Application, server: Server, apiMetadataConsumer: APIMetadataConsumer): Promise<void>;
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
  } catch {
    middlewareList = [];
  }
  logger?.debug('Total server middleware count: ' + middlewareList.length);
  for (const middleware of middlewareList) {
    logger?.debug('- ' + middleware.constructor.name);
  }
  return middlewareList;
};
