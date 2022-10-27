import {
  getApiMiddleware,
  registerLocalApis,
} from '@launchtray/example-server-sdk';
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
      middlewareFor(ExampleController),
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
