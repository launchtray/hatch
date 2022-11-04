import {
  getApiMiddleware,
} from '@launchtray/example-server-sdk';
import {
  getApiMiddleware as getScim2Middleware,
} from '@launchtray/hatch-scim2-server-sdk';
import {
  registerLocalApis,
} from '@launchtray/example-client-sdk';
import {middlewareFor} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {runtimeConfig} from '@launchtray/hatch-web';
import {WebServerComposition} from '@launchtray/hatch-web-server';
import composeCommon from './composeCommon';
import ExampleController from './controllers/ExampleController';
import UsersApiDelegateImpl from './controllers/UsersApiDelegateImpl';
import ScimV2DelegateImpl from './controllers/ScimV2DelegateImpl';

export default async (): Promise<WebServerComposition> => {
  runtimeConfig.TEST_VAR = 'Hello!';

  ROOT_CONTAINER.register('appName', {useValue: 'example-web'});
  ROOT_CONTAINER.register('awsRegion', {useValue: process.env.AWS_REGION});

  registerLocalApis(ROOT_CONTAINER);

  const commonComposition = await composeCommon();

  return {
    ...commonComposition,
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      ...getApiMiddleware({
        delegateForTestersApi: UsersApiDelegateImpl,
        delegateForUsersApi: UsersApiDelegateImpl,
        delegateForMetricsApi: UsersApiDelegateImpl,
        delegateForReportApi: UsersApiDelegateImpl,
      }),
      ...getScim2Middleware({
        delegateForScimv2BulkApi: ScimV2DelegateImpl,
        delegateForScimv2GroupsApi: ScimV2DelegateImpl,
        delegateForScimv2MeApi: ScimV2DelegateImpl,
        delegateForScimv2ResourceTypeApi: ScimV2DelegateImpl,
        delegateForScimv2ServiceProviderConfigApi: ScimV2DelegateImpl,
        delegateForScimv2UsersApi: ScimV2DelegateImpl,
      }),
      middlewareFor(ExampleController),
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
