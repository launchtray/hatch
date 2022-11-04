import * as scim2 from '@launchtray/hatch-scim2-server-sdk';
import {
  ApiAlternateAction,
  containerSingleton,
  inject,
  Logger,
} from '@launchtray/hatch-util';

@containerSingleton()
export default class ScimV2DelegateImpl implements scim2.ScimV2Delegate {
  constructor(@inject('Logger') private readonly logger: Logger) {

  }

  async handleCreateUser(
    request: scim2.CreateUserHttpRequest,
  ): Promise<scim2.CreateUserHttpResponse | ApiAlternateAction> {
    this.logger.info('Received CreateUser request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleDeleteUser(
    request: scim2.DeleteUserHttpRequest,
  ): Promise<scim2.DeleteUserHttpResponse | ApiAlternateAction | void> {
    this.logger.info('Received DeleteUser request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetUser(
    request: scim2.GetUserHttpRequest,
  ): Promise<scim2.GetUserHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetUser request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetUserById(
    request: scim2.GetUserByIdHttpRequest,
  ): Promise<scim2.GetUserByIdHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetUserById request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetUsersByPost(
    request: scim2.GetUsersByPostHttpRequest,
  ): Promise<scim2.GetUsersByPostHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetUsersByPost request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleUpdateUser(
    request: scim2.UpdateUserHttpRequest,
  ): Promise<scim2.UpdateUserHttpResponse | ApiAlternateAction> {
    this.logger.info('Received UpdateUser request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetServiceProviderConfig(
    request: scim2.GetServiceProviderConfigHttpRequest,
  ): Promise<scim2.GetServiceProviderConfigHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetServiceProviderConfig request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetResourceType(
    request: scim2.GetResourceTypeHttpRequest,
  ): Promise<scim2.GetResourceTypeHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetResourceType request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleCreateMe(
    request: scim2.CreateMeHttpRequest,
  ): Promise<scim2.CreateMeHttpResponse | ApiAlternateAction> {
    this.logger.info('Received CreateMe request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleDeleteMe(
    request: scim2.DeleteMeHttpRequest,
  ): Promise<scim2.DeleteMeHttpResponse | ApiAlternateAction | void> {
    this.logger.info('Received DeleteMe request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetMe(
    request: scim2.GetMeHttpRequest,
  ): Promise<scim2.GetMeHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetMe request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleUpdateMe(
    request: scim2.UpdateMeHttpRequest,
  ): Promise<scim2.UpdateMeHttpResponse | ApiAlternateAction> {
    this.logger.info('Received UpdateMe request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleCreateGroup(
    request: scim2.CreateGroupHttpRequest,
  ): Promise<scim2.CreateGroupHttpResponse | ApiAlternateAction> {
    this.logger.info('Received CreateGroup request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleDeleteGroup(
    request: scim2.DeleteGroupHttpRequest,
  ): Promise<scim2.DeleteGroupHttpResponse | ApiAlternateAction | void> {
    this.logger.info('Received DeleteGroup request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetGroup(
    request: scim2.GetGroupHttpRequest,
  ): Promise<scim2.GetGroupHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetGroup request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetGroupById(
    request: scim2.GetGroupByIdHttpRequest,
  ): Promise<scim2.GetGroupByIdHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetGroupById request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleGetGroupsByPost(
    request: scim2.GetGroupsByPostHttpRequest,
  ): Promise<scim2.GetGroupsByPostHttpResponse | ApiAlternateAction> {
    this.logger.info('Received GetGroupsByPost request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleUpdateGroup(
    request: scim2.UpdateGroupHttpRequest,
  ): Promise<scim2.UpdateGroupHttpResponse | ApiAlternateAction> {
    this.logger.info('Received UpdateGroup request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }

  async handleCreateBulk(
    request: scim2.CreateBulkHttpRequest,
  ): Promise<scim2.CreateBulkHttpResponse | ApiAlternateAction> {
    this.logger.info('Received CreateBulk request:', request);
    return new ApiAlternateAction(501, 'Not yet implemented');
  }
}
