import {APIMetadata} from "./ServerMiddleware";

// This file defines types per https://swagger.io/specification

export interface OpenAPIResponse {
  description: string;
}

export type OpenAPIResponses = {
  [statusCode in number | 'default']?: OpenAPIResponse;
};

export type OpenAPIMethod =
  | 'get'
  | 'put'
  | 'post'
  | 'delete'
  | 'options'
  | 'head'
  | 'patch'
  | 'trace';

export interface OpenAPIParameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  required: boolean;
  description?: string;
}

export interface OpenAPIOperation {
  responses: OpenAPIResponses;
  parameters: OpenAPIParameter[];
}

export type OpenAPIOperations = {
  [operation in OpenAPIMethod]?: OpenAPIOperation
};

export interface OpenAPIPath extends OpenAPIOperations {
  description?: string;
}

export interface OpenAPISpec {
  openapi: '3.0.2';
  info: {
    title: string;
    version: string;
  },
  paths: {
    [key: string]: OpenAPIPath;
  };
}

export class OpenAPISpecBuilder {
  private spec: OpenAPISpec;

  constructor(appName: string, appVersion: string) {
    this.spec = {
      openapi: '3.0.2',
      info: {
        title: appName,
        version: appVersion,
      },
      paths: {}
    };
  }

  addAPIMetadata(apiMetadata: APIMetadata) {
    this.spec.paths[apiMetadata.path] = {
      description: apiMetadata.description ?? '',
      [apiMetadata.method]: {
        responses: apiMetadata.responses,
        parameters: apiMetadata.parameters
      }
    }
  }

  build(): OpenAPISpec {
    return this.spec;
  }
}