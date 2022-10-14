import {containerSingleton, inject, Logger} from '@launchtray/hatch-util';
import {
  ApiAlternateAction,
  CreateUserOperationRequest,
  GetUserRequest,
  MakeAdminRequest,
  PREVENT_CONTROLLER_RESPONSE,
  UsersApiDelegate,
} from '@launchtray/example-server-sdk';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';

@containerSingleton()
export default class UsersApiDelegateImpl implements UsersApiDelegate {
  constructor(@inject('Logger') logger: Logger) {
    logger.info('Constructing UsersApiControllerDelegateImpl');
  }

  // Demonstrates how an error response can be sent
  handleCreateUserOperation(
    request: CreateUserOperationRequest,
    @inject('Logger') logger: Logger,
  ) {
    logger.debug(`handleCreateUserOperation: ${JSON.stringify(request)}`);
    return new ApiAlternateAction(500, 'Whaaaa?');
  }

  handleGetUser(
    request: GetUserRequest,
    @inject('Logger') logger: Logger,
  ) {
    logger.debug(`handleGetUser: ${JSON.stringify(request)}`);
    return {
      body: {
        firstName: 'Kilty',
        lastName: 'McGowan',
        id: 'TODO: replace this when path params are implemented',
      },
    };
  }

  // Demonstrates how a delegate can prevent the default response and send a response via the underlying response obj
  handleMakeAdmin(
    request: MakeAdminRequest,
    @inject('Logger') logger: Logger,
    basicRouteParams: BasicRouteParams,
  ) {
    logger.debug(`handleMakeAdmin: ${JSON.stringify(request)}`);
    basicRouteParams.res.sendStatus(500);
    return PREVENT_CONTROLLER_RESPONSE;
  }
}
