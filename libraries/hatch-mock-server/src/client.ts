import {mockServerClient} from 'mockserver-client';
import tmp from 'tmp';
import {PathOrRequestDefinition} from 'mockserver-client/mockServerClient';
import {
  HttpRequest,
  Body as MockServerBody,
} from 'mockserver-client/mockServer';
import {DEFAULT_PORT} from './index';
import {retry, withTimeout} from './util';

export interface SimpleMockResponseOptions {
  path: string;
  method?: string;
  statusCode?: number;
  queryParams?: {[key: string]: string[]};
  requestHeaders?: {[key: string]: string[]};
  requestCookies?: {[key: string]: string};
  requestBody?: Buffer | string | unknown;
  responseBody?: Buffer | string | unknown;
  responseHeaders?: {[key: string]: string[]};
  responseCookies?: {[key: string]: string};
}

export interface RecordedRequest {
  body?: Buffer | string | unknown;
  secure?: boolean;
  method?: string;
  path?: string;
  queryParams?: {[key: string]: string[]};
  requestHeaders?: {[key: string]: string[]};
  requestCookies?: {[key: string]: string};
}

const fromMockServerBody = (mockServerBody?: MockServerBody): Buffer | undefined => {
  if (mockServerBody == null) {
    return undefined;
  }
  if (typeof mockServerBody === 'string') {
    return Buffer.from(mockServerBody);
  }
  const body = (mockServerBody as {rawBytes?: string, base64Bytes?: string});
  if (body.base64Bytes != null) {
    return Buffer.from(body.base64Bytes, 'base64');
  }
  if (body.rawBytes != null) {
    return Buffer.from(body.rawBytes, 'base64');
  }
  throw new Error(`unexpected body type from mock-server: ${JSON.stringify(body)}`);
};

const toMockServerBody = (body?: Buffer | string | unknown): MockServerBody | undefined => {
  if (body == null) {
    return undefined;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return {
      type: 'BINARY',
      base64Bytes: body.toString('base64'),
    };
  }
  return {
    type: 'JSON',
    json: body as string, // incorrect type from library
  };
};

const requestDefinitionFromFilter = (filter?: RecordedRequest): PathOrRequestDefinition | undefined => {
  let requestDefinition: PathOrRequestDefinition;
  if (filter != null) {
    requestDefinition = {
      secure: filter.secure,
      method: filter.method,
      path: filter.path,
      body: toMockServerBody(filter.body),
      queryStringParameters: filter.queryParams,
      headers: filter.requestHeaders,
      cookies: filter.requestCookies,
    };
  }
  return requestDefinition;
};

export default class MockServerClient {
  private client;
  private tmpDir;

  constructor({host, port}: {host?: string, port?: number}) {
    this.client = mockServerClient(host ?? 'localhost', port ?? DEFAULT_PORT);
    this.tmpDir = tmp.dirSync({unsafeCleanup: true});
  }

  async mockSimpleResponse(options: SimpleMockResponseOptions) {
    const {
      method,
      path,
      statusCode,
      queryParams,
      requestHeaders,
      requestCookies,
      requestBody,
      responseBody,
      responseHeaders,
      responseCookies,
    } = options;
    const cwd = process.cwd();
    try {
      process.chdir(this.tmpDir.name);
      // Workaround: the mock server client library will hang forever if the (unused) pem fails to be retrieved
      await retry(3, () => withTimeout(5000, this.client.mockAnyResponse({
        httpRequest: {
          path,
          method: method ?? 'GET',
          headers: requestHeaders,
          cookies: requestCookies,
          body: toMockServerBody(requestBody),
          queryStringParameters: queryParams,
        },
        httpResponse: {
          statusCode: statusCode ?? 200,
          body: toMockServerBody(responseBody),
          cookies: responseCookies,
          headers: responseHeaders,
        },
      })));
    } finally {
      process.chdir(cwd);
    }
  }

  async getRecordedRequests(filter?: RecordedRequest): Promise<RecordedRequest[]> {
    const requests = await this.client.retrieveRecordedRequests(requestDefinitionFromFilter(filter));
    return requests.map((request: HttpRequest) => ({
      body: fromMockServerBody(request.body),
      secure: request.secure,
      method: request.method,
      path: request.path,
      queryParams: request.queryStringParameters as {[key: string]: string[]},
      requestHeaders: request.headers as {[key: string]: string[]},
      requestCookies: request.cookies as {[key: string]: string},
    }));
  }

  async clearRequests(filter?: RecordedRequest) {
    await this.client.clear(requestDefinitionFromFilter(filter), 'ALL');
  }

  async reset() {
    await this.client.reset();
  }

  async close() {
    this.tmpDir.removeCallback();
  }
}
