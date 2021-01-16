import {injectable} from '@launchtray/hatch-util';
import UserAttributes from './UserAttributes';
import {UserManager} from './UserManager';
import {UserManagementClientSdk} from './UserManagementClientSdk';

@injectable()
export default class RemoteUserManager implements UserManager {
  constructor(private readonly userManagementClient: UserManagementClientSdk) {}

  async getUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    accessToken: string,
    tenantId?: string,
  ): Promise<UserAttributes> {
    return await this.userManagementClient.getUserAttributes(queriedUserId, accessToken, {tenantId});
  }

  async getUserId(
    clientUserId: string,
    queriedUsername: string,
    accessToken: string,
    tenantId?: string,
  ): Promise<string> {
    return await this.userManagementClient.getUserId(queriedUsername, accessToken, {tenantId});
  }

  async setUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    attributes: UserAttributes,
    accessToken: string,
    tenantId?: string,
  ): Promise<UserAttributes> {
    return await this.userManagementClient.setUserAttributes(queriedUserId, attributes, accessToken, {tenantId});
  }

  async signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string, tenantId?: string) {
    return await this.userManagementClient.signOutUser(userIdToSignOut, accessToken, {tenantId});
  }
}
