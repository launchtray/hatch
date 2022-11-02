/**
 * This file is derived from the openapi-generator source code, the license for
 * which was retrieved from the following URL and is copied below:
 * - https://github.com/OpenAPITools/openapi-generator/blob/d9a6f4d7261d523d933e4cd33e6abc48d4d0b5e2/LICENSE
 *
 *                                Apache License
 *                            Version 2.0, January 2004
 *                         http://www.apache.org/licenses/
 *
 *    TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
 *
 *    1. Definitions.
 *
 *       "License" shall mean the terms and conditions for use, reproduction,
 *       and distribution as defined by Sections 1 through 9 of this document.
 *
 *       "Licensor" shall mean the copyright owner or entity authorized by
 *       the copyright owner that is granting the License.
 *
 *       "Legal Entity" shall mean the union of the acting entity and all
 *       other entities that control, are controlled by, or are under common
 *       control with that entity. For the purposes of this definition,
 *       "control" means (i) the power, direct or indirect, to cause the
 *       direction or management of such entity, whether by contract or
 *       otherwise, or (ii) ownership of fifty percent (50%) or more of the
 *       outstanding shares, or (iii) beneficial ownership of such entity.
 *
 *       "You" (or "Your") shall mean an individual or Legal Entity
 *       exercising permissions granted by this License.
 *
 *       "Source" form shall mean the preferred form for making modifications,
 *       including but not limited to software source code, documentation
 *       source, and configuration files.
 *
 *       "Object" form shall mean any form resulting from mechanical
 *       transformation or translation of a Source form, including but
 *       not limited to compiled object code, generated documentation,
 *       and conversions to other media types.
 *
 *       "Work" shall mean the work of authorship, whether in Source or
 *       Object form, made available under the License, as indicated by a
 *       copyright notice that is included in or attached to the work
 *       (an example is provided in the Appendix below).
 *
 *       "Derivative Works" shall mean any work, whether in Source or Object
 *       form, that is based on (or derived from) the Work and for which the
 *       editorial revisions, annotations, elaborations, or other modifications
 *       represent, as a whole, an original work of authorship. For the purposes
 *       of this License, Derivative Works shall not include works that remain
 *       separable from, or merely link (or bind by name) to the interfaces of,
 *       the Work and Derivative Works thereof.
 *
 *       "Contribution" shall mean any work of authorship, including
 *       the original version of the Work and any modifications or additions
 *       to that Work or Derivative Works thereof, that is intentionally
 *       submitted to Licensor for inclusion in the Work by the copyright owner
 *       or by an individual or Legal Entity authorized to submit on behalf of
 *       the copyright owner. For the purposes of this definition, "submitted"
 *       means any form of electronic, verbal, or written communication sent
 *       to the Licensor or its representatives, including but not limited to
 *       communication on electronic mailing lists, source code control systems,
 *       and issue tracking systems that are managed by, or on behalf of, the
 *       Licensor for the purpose of discussing and improving the Work, but
 *       excluding communication that is conspicuously marked or otherwise
 *       designated in writing by the copyright owner as "Not a Contribution."
 *
 *       "Contributor" shall mean Licensor and any individual or Legal Entity
 *       on behalf of whom a Contribution has been received by Licensor and
 *       subsequently incorporated within the Work.
 *
 *    2. Grant of Copyright License. Subject to the terms and conditions of
 *       this License, each Contributor hereby grants to You a perpetual,
 *       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
 *       copyright license to reproduce, prepare Derivative Works of,
 *       publicly display, publicly perform, sublicense, and distribute the
 *       Work and such Derivative Works in Source or Object form.
 *
 *    3. Grant of Patent License. Subject to the terms and conditions of
 *       this License, each Contributor hereby grants to You a perpetual,
 *       worldwide, non-exclusive, no-charge, royalty-free, irrevocable
 *       (except as stated in this section) patent license to make, have made,
 *       use, offer to sell, sell, import, and otherwise transfer the Work,
 *       where such license applies only to those patent claims licensable
 *       by such Contributor that are necessarily infringed by their
 *       Contribution(s) alone or by combination of their Contribution(s)
 *       with the Work to which such Contribution(s) was submitted. If You
 *       institute patent litigation against any entity (including a
 *       cross-claim or counterclaim in a lawsuit) alleging that the Work
 *       or a Contribution incorporated within the Work constitutes direct
 *       or contributory patent infringement, then any patent licenses
 *       granted to You under this License for that Work shall terminate
 *       as of the date such litigation is filed.
 *
 *    4. Redistribution. You may reproduce and distribute copies of the
 *       Work or Derivative Works thereof in any medium, with or without
 *       modifications, and in Source or Object form, provided that You
 *       meet the following conditions:
 *
 *       (a) You must give any other recipients of the Work or
 *           Derivative Works a copy of this License; and
 *
 *       (b) You must cause any modified files to carry prominent notices
 *           stating that You changed the files; and
 *
 *       (c) You must retain, in the Source form of any Derivative Works
 *           that You distribute, all copyright, patent, trademark, and
 *           attribution notices from the Source form of the Work,
 *           excluding those notices that do not pertain to any part of
 *           the Derivative Works; and
 *
 *       (d) If the Work includes a "NOTICE" text file as part of its
 *           distribution, then any Derivative Works that You distribute must
 *           include a readable copy of the attribution notices contained
 *           within such NOTICE file, excluding those notices that do not
 *           pertain to any part of the Derivative Works, in at least one
 *           of the following places: within a NOTICE text file distributed
 *           as part of the Derivative Works; within the Source form or
 *           documentation, if provided along with the Derivative Works; or,
 *           within a display generated by the Derivative Works, if and
 *           wherever such third-party notices normally appear. The contents
 *           of the NOTICE file are for informational purposes only and
 *           do not modify the License. You may add Your own attribution
 *           notices within Derivative Works that You distribute, alongside
 *           or as an addendum to the NOTICE text from the Work, provided
 *           that such additional attribution notices cannot be construed
 *           as modifying the License.
 *
 *       You may add Your own copyright statement to Your modifications and
 *       may provide additional or different license terms and conditions
 *       for use, reproduction, or distribution of Your modifications, or
 *       for any such Derivative Works as a whole, provided Your use,
 *       reproduction, and distribution of the Work otherwise complies with
 *       the conditions stated in this License.
 *
 *    5. Submission of Contributions. Unless You explicitly state otherwise,
 *       any Contribution intentionally submitted for inclusion in the Work
 *       by You to the Licensor shall be under the terms and conditions of
 *       this License, without any additional terms or conditions.
 *       Notwithstanding the above, nothing herein shall supersede or modify
 *       the terms of any separate license agreement you may have executed
 *       with Licensor regarding such Contributions.
 *
 *    6. Trademarks. This License does not grant permission to use the trade
 *       names, trademarks, service marks, or product names of the Licensor,
 *       except as required for reasonable and customary use in describing the
 *       origin of the Work and reproducing the content of the NOTICE file.
 *
 *    7. Disclaimer of Warranty. Unless required by applicable law or
 *       agreed to in writing, Licensor provides the Work (and each
 *       Contributor provides its Contributions) on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 *       implied, including, without limitation, any warranties or conditions
 *       of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A
 *       PARTICULAR PURPOSE. You are solely responsible for determining the
 *       appropriateness of using or redistributing the Work and assume any
 *       risks associated with Your exercise of permissions under this License.
 *
 *    8. Limitation of Liability. In no event and under no legal theory,
 *       whether in tort (including negligence), contract, or otherwise,
 *       unless required by applicable law (such as deliberate and grossly
 *       negligent acts) or agreed to in writing, shall any Contributor be
 *       liable to You for damages, including any direct, indirect, special,
 *       incidental, or consequential damages of any character arising as a
 *       result of this License or out of the use or inability to use the
 *       Work (including but not limited to damages for loss of goodwill,
 *       work stoppage, computer failure or malfunction, or any and all
 *       other commercial damages or losses), even if such Contributor
 *       has been advised of the possibility of such damages.
 *
 *    9. Accepting Warranty or Additional Liability. While redistributing
 *       the Work or Derivative Works thereof, You may choose to offer,
 *       and charge a fee for, acceptance of support, warranty, indemnity,
 *       or other liability obligations and/or rights consistent with this
 *       License. However, in accepting such obligations, You may act only
 *       on Your own behalf and on Your sole responsibility, not on behalf
 *       of any other Contributor, and only if You agree to indemnify,
 *       defend, and hold each Contributor harmless for any liability
 *       incurred by, or claims asserted against, such Contributor by reason
 *       of your accepting any such warranty or additional liability.
 *
 *    END OF TERMS AND CONDITIONS
 *
 *    APPENDIX: How to apply the Apache License to your work.
 *
 *       To apply the Apache License to your work, attach the following
 *       boilerplate notice, with the fields enclosed by brackets "[]"
 *       replaced with your own identifying information. (Don't include
 *       the brackets!)  The text should be enclosed in the appropriate
 *       comment syntax for the file format. We also recommend that a
 *       file or class name and description of purpose be included on the
 *       same "printed page" as the copyright notice for easier
 *       identification within third-party archives.
 *
 *    Copyright 2018 OpenAPI-Generator Contributors (https://openapi-generator.tech)
 *    Copyright 2018 SmartBear Software
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        https://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */
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
  private accessTokenContainer: {accessToken?: string};
  private configParams: ConfigurationParameters;

  constructor(configParams: ConfigurationParameters = {}) {
    const privateMiddleware: Middleware[] = [];
    // By default, share access token conainer across shared ConfigParams objects
    if ((configParams.sharedAccessTokenContainer == null) && (configParams.extractUpdatedAccessToken != null)) {
      // eslint-disable-next-line no-param-reassign -- intentional reassign
      configParams.sharedAccessTokenContainer = {};
    }
    this.accessTokenContainer = configParams.sharedAccessTokenContainer ?? {};
    if (configParams.accessToken == null || typeof configParams.accessToken === 'string') {
      this.accessTokenContainer.accessToken = configParams.accessToken ?? '';
      this.privateAccessToken = () => this.accessTokenContainer.accessToken;
      const invalidateSession = () => {
        this.accessTokenContainer.accessToken = undefined;
      };
      if (configParams.extractUpdatedAccessToken != null) {
        const authMiddleware = {
          post: async (responseContext: ResponseContext) => {
            const extractedToken = await configParams.extractUpdatedAccessToken?.(responseContext, invalidateSession);
            if (extractedToken != null) {
              this.accessTokenContainer.accessToken = extractedToken;
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
  sharedAccessTokenContainer?: {accessToken?: string};
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
