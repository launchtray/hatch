import {AnyJsonObject, Class, DependencyContainer, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import http from 'http';
import {
  OpenAPIMethod,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponses,
  OpenAPIOperationSecurity,
} from './OpenAPI';
import {LivenessState, ReadinessState} from './server-routing';

export type Server = http.Server;

export interface APIMetadataParameters {
  description?: string;
  parameters?: {
    [key: string]: Partial<OpenAPIParameter>,
  };
  responses?: Partial<OpenAPIResponses>;
  requestBody?: OpenAPIRequestBody;
  tokens?: Array<string | symbol>;
  operationId?: string;
  tags?: string[],
  security?: OpenAPIOperationSecurity[],
}

export interface APIMetadata {
  description: string;
  path: string;
  method: OpenAPIMethod;
  parameters: OpenAPIParameter[];
  responses: OpenAPIResponses;
  requestBody?: OpenAPIRequestBody;
  operationId?: string,
  tags?: string[],
  security?: OpenAPIOperationSecurity[],
}

export type APIMetadataConsumer = (metadata: APIMetadata) => void;

export interface ServerMiddleware {
  registerBeforeRoutes?(app: Application, server: Server): Promise<void>;
  register(app: Application, server: Server): Promise<void>;
  registerAfterRoutes?(app: Application, server: Server): Promise<void>;
  getLivenessState?(): Promise<LivenessState | boolean | undefined>;
  getReadinessState?(): Promise<ReadinessState | boolean | undefined>;
  getAppInfo?(): Promise<AnyJsonObject | undefined>
}

export interface ServerMiddlewareClass extends Class<ServerMiddleware> {
  registerAPIMetadata?(apiMetadataConsumer: APIMetadataConsumer): Promise<void>;
}

const serverMiddlewareKey = Symbol('serverMiddleware');

export const registerServerMiddleware = async (
  container: DependencyContainer,
  middlewareList: ServerMiddlewareClass[],
  apiMetadataConsumer: APIMetadataConsumer,
) => {
  for (const middleware of middlewareList) {
    container.registerSingleton(serverMiddlewareKey, middleware);
    await middleware.registerAPIMetadata?.(apiMetadataConsumer);
  }
};

export const resolveServerMiddleware = async (
  container: DependencyContainer,
  logger?: Logger,
): Promise<ServerMiddleware[]> => {
  const middlewareList = await container.resolveAll<ServerMiddleware>(serverMiddlewareKey);
  logger?.debug(`Total server middleware count: ${middlewareList.length}`);
  for (const middleware of middlewareList) {
    logger?.debug(`- ${middleware.constructor.name}`);
  }
  return middlewareList;
};
