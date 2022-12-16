import {AnyJsonObject, Class, DependencyContainer, Logger} from '@launchtray/hatch-util';
import {Application} from 'express';
import http from 'http';
import {
  OpenAPIMethod,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponses,
  OpenAPIOperationSecurity,
  OpenAPISpec,
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

export const ASSOCIATED_API_SPEC_KEY = Symbol('associatedApiSpecKey');
export const ASSOCIATED_API_SPEC_ID_KEY = Symbol('associatedApiSpecIdentifierKey');

export const registerServerMiddleware = async (
  container: DependencyContainer,
  middlewareList: ServerMiddlewareClass[],
  apiMetadataConsumer: APIMetadataConsumer,
): Promise<OpenAPISpec[]> => {
  const apiSpecMap: {[key: symbol]: OpenAPISpec} = {};
  const apiSpecs: OpenAPISpec[] = [];
  for (const middleware of middlewareList) {
    const associatedApiSpec = middleware[ASSOCIATED_API_SPEC_KEY];
    if (associatedApiSpec != null) {
      const key = associatedApiSpec[ASSOCIATED_API_SPEC_ID_KEY];
      if (apiSpecMap[key] == null) {
        apiSpecMap[key] = associatedApiSpec;
        apiSpecs.push(associatedApiSpec);
      }
    }
    container.registerSingleton(serverMiddlewareKey, middleware);
    await middleware.registerAPIMetadata?.(apiMetadataConsumer);
  }
  return apiSpecs;
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
