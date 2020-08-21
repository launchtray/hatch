import {APIMetadata} from './ServerMiddleware';

// This file defines types per https://swagger.io/specification

export interface OpenAPIResponse {
  description: string;
}

export type OpenAPIResponses = {
  [statusCode in number | 'default']?: OpenAPIResponse;
};

export interface OpenAPISchemaObject {
  // TODO: Flesh this out more to improve IDE help
  // For now, see https://github.com/OAI/OpenAPI-Specification/blob/master/versions/3.0.0.md#schemaObject
  [key: string]: any;
}

export interface OpenAPIExampleObject {
  summary?: string;
  description?: string;
  value: any;
}

export interface OpenAPIHeaders {
  [name: string]: Omit<OpenAPIParameter, 'name' | 'in'>;
}

export interface OpenAPIEncodingObject {
  contentType: string;
  headers: OpenAPIHeaders;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export type OpenAPIExamples = {
  [name: string]: OpenAPIExampleObject;
};

export type OpenAPIEncodings = {
  [propertyName: string]: OpenAPIEncodingObject;
};

export interface OpenAPIMediaTypeObject {
  schema: OpenAPISchemaObject;
  example?: any;
  examples?: OpenAPIExamples;
  encoding?: OpenAPIEncodings;
}

export type OpenAPIRequestBodyContent = {
  [mediaType: string]: OpenAPIMediaTypeObject;
};

export interface OpenAPIRequestBody {
  description?: string;
  required?: boolean;
  content: OpenAPIRequestBodyContent;
}

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
  allowEmptyValue?: boolean;
  schema?: OpenAPISchemaObject;
}

export interface OpenAPIOperation {
  responses: OpenAPIResponses;
  parameters: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  description?: string;
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
      ...this.spec.paths[apiMetadata.path],
      [apiMetadata.method]: {
        description: apiMetadata.description,
        responses: apiMetadata.responses,
        parameters: apiMetadata.parameters,
        requestBody: apiMetadata.requestBody,
      }
    }
  }

  build(): OpenAPISpec {
    return this.spec;
  }
}