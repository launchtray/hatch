import {mockServerClient} from 'mockserver-client';
import {DEFAULT_PORT} from './index';
import tmp from 'tmp';
import {retry, withTimeout} from './util';

export interface SimpleMockResponseOptions {
  path: string;
  method?: string;
  statusCode?: number;
  queryParams?: {[key: string]: string[]};
  requestHeaders?: {[key: string]: string[]};
  requestCookies?: {[key: string]: string};
  responseBody?: string | {[key: string]: any};
  responseHeaders?: {[key: string]: string[]};
  responseCookies?: {[key: string]: string};
}

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
          queryStringParameters: queryParams,
        },
        httpResponse: {
          statusCode: statusCode ?? 200,
          body: typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody),
          cookies: responseCookies,
          headers: responseHeaders,
        },
      })));
    } finally {
      process.chdir(cwd);
    }
  }

  async close() {
    this.tmpDir.removeCallback();
  }
}
