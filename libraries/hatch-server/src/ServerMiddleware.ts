import {Class, DependencyContainer, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import http from 'http';
import {OpenAPIMethod, OpenAPIParameter, OpenAPIRequestBody, OpenAPIResponses} from './OpenAPI';

export type Server = http.Server;

export interface APIMetadataParameters {
  description?: string;
  parameters?: {
    [key: string]: Partial<OpenAPIParameter>,
  };
  responses?: Partial<OpenAPIResponses>;
  requestBody?: OpenAPIRequestBody;
  tokens?: Array<string | symbol>;
}

export interface APIMetadata {
  description: string;
  path: string;
  method: OpenAPIMethod;
  parameters: OpenAPIParameter[];
  responses: OpenAPIResponses;
  requestBody?: OpenAPIRequestBody;
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

export const resolveServerMiddleware = async (
  container: DependencyContainer,
  logger?: Logger
): Promise<ServerMiddleware[]> => {
  const middlewareList = await container.resolveAll<ServerMiddleware>(serverMiddlewareKey);
  logger?.debug('Total server middleware count: ' + middlewareList.length);
  for (const middleware of middlewareList) {
    logger?.debug('- ' + middleware.constructor.name);
  }
  return middlewareList;
};
