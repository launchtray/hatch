import {
  ApiAlternateAction,
  ApiError,
} from '@launchtray/hatch-util';

const isStream = (value: unknown) => value != null && (value as {pipeTo?: unknown}).pipeTo != null;

export function querystring(params: HttpQuery, prefix = ''): string {
  return Object.keys(params)
    .map((key) => {
      const fullKey = prefix + (prefix.length !== 0 ? `[${key}]` : key);
      const value = params[key];
      if (value instanceof Array) {
        const multiValue = value.map((singleValue) => encodeURIComponent(String(singleValue)))
          .join(`&${encodeURIComponent(fullKey)}=`);
        return `${encodeURIComponent(fullKey)}=${multiValue}`;
      }
      if (value instanceof Object) {
        return querystring(value as HttpQuery, fullKey);
      }
      return `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`;
    })
    .filter((part) => part.length > 0)
    .join('&');
}

export class Configuration {
  private privateAccessToken: string | ((name: string, scopes?: string[]) => string | undefined) | undefined;
  private privateAccessTokenValue: string | undefined;
  private configParams: ConfigurationParameters;

  constructor(configParams: ConfigurationParameters = {}) {
    const privateMiddleware: Middleware[] = [];
    if (configParams.accessToken == null || typeof configParams.accessToken === 'string') {
      this.privateAccessTokenValue = configParams.accessToken ?? '';
      this.privateAccessToken = () => this.privateAccessTokenValue;
      const invalidateSession = () => {
        this.privateAccessTokenValue = undefined;
      };
      if (configParams.extractUpdatedAccessToken != null) {
        const authMiddleware = {
          post: async (responseContext: ResponseContext) => {
            const extractedToken = await configParams.extractUpdatedAccessToken?.(responseContext, invalidateSession);
            if (extractedToken != null) {
              this.privateAccessTokenValue = extractedToken;
            }
          },
        };
        privateMiddleware.push(authMiddleware);
      }
    } else {
      this.privateAccessToken = configParams.accessToken;
    }
    this.configParams = {
      ...configParams,
      middleware: [
        ...(configParams.middleware ?? []),
        ...privateMiddleware,
      ],
    };
  }

  get basePath(): string {
    return this.configParams.basePath != null ? this.configParams.basePath : '';
  }

  get fetchApi(): FetchAPI {
    // Must ensure global binding remains in place
    const defaultFetch = (((...args: [RequestInfo | URL, RequestInit | undefined]) => fetch(...args)));
    return this.configParams.fetchApi ?? defaultFetch;
  }

  get middleware(): Middleware[] {
    return this.configParams.middleware ?? [];
  }

  get queryParamsStringify(): (params: HttpQuery) => string {
    return this.configParams.queryParamsStringify ?? querystring;
  }

  get username(): string | undefined {
    return this.configParams.username;
  }

  get password(): string | undefined {
    return this.configParams.password;
  }

  get apiKey(): ((name: string) => string) | undefined {
    const {apiKey} = this.configParams;
    if (apiKey != null) {
      return typeof apiKey === 'function' ? apiKey : () => apiKey;
    }
    return undefined;
  }

  get accessToken(): ((name: string, scopes?: string[]) => string | undefined) | undefined {
    const accessToken = this.privateAccessToken;
    if (accessToken != null) {
      return typeof accessToken === 'function' ? accessToken : () => accessToken;
    }
    return undefined;
  }

  get headers(): HttpHeaders | undefined {
    return this.configParams.headers;
  }

  get credentials(): RequestCredentials | undefined {
    return this.configParams.credentials;
  }
}

export class ConfigurableFetchApi {
  private middleware: Middleware[];

  constructor(protected configuration = new Configuration()) {
    this.middleware = configuration.middleware;
  }

  public async request(context: RequestOpts): Promise<Response> {
    const {url, init} = this.createFetchParams(context);
    const response = await this.fetchApi(url, init as RequestInit);
    if (response.status >= 200 && response.status < 300) {
      return response;
    }
    const headers: Record<string, unknown> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    throw new ApiError(new ApiAlternateAction(response.status, response.body, headers));
  }

  private createFetchParams(context: RequestOpts) {
    let url = this.configuration.basePath + context.path;
    if (context.query !== undefined && Object.keys(context.query).length !== 0) {
      // only add the querystring to the URL if there are query parameters.
      // this is done to avoid urls ending with a "?" character which buggy webservers
      // do not handle correctly sometimes.
      url += `?${this.configuration.queryParamsStringify(context.query)}`;
    }
    const body = (
      (typeof FormData !== 'undefined' && context.body instanceof FormData)
      || context.body instanceof URLSearchParams
      || isStream(context.body)
      || (typeof context.body === 'string')
    ) ? context.body : JSON.stringify(context.body);

    const headers = {...this.configuration.headers, ...context.headers};
    const init = {
      method: context.method,
      headers,
      body,
      credentials: this.configuration.credentials,
    };
    return {url, init};
  }

  private fetchApi = async (url: string, init: RequestInit) => {
    let fetchParams = {url, init};
    for (const middleware of this.middleware) {
      if (middleware.pre != null) {
        fetchParams = (await middleware.pre({
          fetch: this.fetchApi,
          ...fetchParams,
        })) ?? fetchParams;
      }
    }

    let response = await this.configuration.fetchApi(fetchParams.url, fetchParams.init);
    for (const middleware of this.middleware) {
      if (middleware.post != null) {
        response = (await middleware.post({
          fetch: this.fetchApi,
          url,
          init,
          response: response.clone(),
        })) ?? response;
      }
    }
    return response;
  };
}

export type FetchAPI = WindowOrWorkerGlobalScope['fetch'];

export interface ConfigurationParameters {
  basePath?: string; // override base path
  fetchApi?: FetchAPI; // override for fetch implementation
  middleware?: Middleware[]; // middleware to apply before/after fetch requests
  queryParamsStringify?: (params: HttpQuery) => string; // stringify function for query strings
  username?: string; // parameter for basic security
  password?: string; // parameter for basic security
  apiKey?: string | ((name: string) => string); // parameter for apiKey security
  accessToken?: string | ((name?: string, scopes?: string[]) => string); // parameter for oauth2 security
  headers?: HttpHeaders; // header params we want to use on every request
  credentials?: RequestCredentials; // value for the credentials param we want to use on each request
  // Callback to allow certain responses to update the accessToken automatically (e.g. for token refresh APIs)
  extractUpdatedAccessToken?: (
    responseContext: ResponseContext,
    invalidateSession: () => void
  ) => Promise<string | undefined>;
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';
export type HttpHeaders = { [key: string]: string };
export type HttpQuery = {
  [key: string]: string | number | null | boolean | Array<string | number | null | boolean> | HttpQuery
};

export interface FetchParams {
  url: string;
  init: RequestInit;
}

export interface RequestOpts {
  path: string;
  method: HttpMethod;
  headers: HttpHeaders;
  query?: HttpQuery;
  body?: unknown;
}

export interface RequestContext {
  fetch: FetchAPI;
  url: string;
  init: RequestInit;
}

export interface ResponseContext {
  fetch: FetchAPI;
  url: string;
  init: RequestInit;
  response: Response;
}

export interface Middleware {
  pre?(context: RequestContext): Promise<FetchParams | void>;
  post?(context: ResponseContext): Promise<Response | void>;
}
