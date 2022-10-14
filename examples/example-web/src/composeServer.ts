import {
  getApiMiddleware,
} from '@launchtray/example-server-sdk';
import {middlewareFor} from '@launchtray/hatch-server';
import {
  JSONBodyParser,
  RequestLogger,
  RouteNotFound,
} from '@launchtray/hatch-server-middleware';
import {
  AUTH_BLACKLIST_KEY,
  AUTH_WHITELIST_KEY,
  AWSCognitoClient,
  LocalUserManager,
} from '@launchtray/hatch-server-user-management';
import {ROOT_CONTAINER} from '@launchtray/hatch-util';
import {runtimeConfig} from '@launchtray/hatch-web';
import {WebServerComposition} from '@launchtray/hatch-web-server';
import composeCommon from './composeCommon';
import ExampleController from './controllers/ExampleController';
import UsersApiDelegateImpl from './controllers/UsersApiDelegateImpl';

export default async (): Promise<WebServerComposition> => {
  runtimeConfig.TEST_VAR = 'Hello!';

  ROOT_CONTAINER.register('appName', {useValue: 'example-web'});
  ROOT_CONTAINER.registerSingleton('UserManagementClient', AWSCognitoClient);
  ROOT_CONTAINER.registerSingleton('UserManager', LocalUserManager);
  ROOT_CONTAINER.register(AUTH_WHITELIST_KEY, {useValue: /^\/(?!api\/).*/}); // All non-/api routes
  ROOT_CONTAINER.register(AUTH_BLACKLIST_KEY, {useValue: {path: '/static/private/*'}});

  ROOT_CONTAINER.register('awsRegion', {useValue: process.env.AWS_REGION});
  ROOT_CONTAINER.register('awsUserPoolId', {useValue: process.env.AWS_USER_POOL_ID});
  ROOT_CONTAINER.register('awsClientId', {useValue: process.env.AWS_CLIENT_ID});

  const commonComposition = await composeCommon();

  return {
    ...commonComposition,
    serverMiddleware: [
      JSONBodyParser,
      RequestLogger,
      ...getApiMiddleware({
        delegateForTestersApi: UsersApiDelegateImpl,
        delegateForUsersApi: UsersApiDelegateImpl,
      }),
      middlewareFor(ExampleController),
      RouteNotFound, // Catch-all 404 for unimplemented APIs
    ],
  };
};
