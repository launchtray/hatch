import {injectable} from '@launchtray/hatch-util';
import UserAttributes from './UserAttributes';
import {UserManager} from './UserManager';
import {UserManagementClientSdk} from './UserManagementClientSdk';

@injectable()
export default class RemoteUserManager implements UserManager {
  constructor(private readonly userManagementClient: UserManagementClientSdk) {}

  async getUserAttributes(clientUserId: string, queriedUserId: string, accessToken: string): Promise<UserAttributes> {
    return await this.userManagementClient.getUserAttributes(queriedUserId, accessToken);
  }

  async getUserId(clientUserId: string, queriedUsername: string, accessToken: string): Promise<string> {
    return await this.userManagementClient.getUserId(queriedUsername, accessToken);
  }

  async setUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    attributes: UserAttributes,
    accessToken: string
  ): Promise<UserAttributes> {
    return await this.userManagementClient.setUserAttributes(queriedUserId, attributes, accessToken);
  }

  async signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string) {
    return await this.userManagementClient.signOutUser(userIdToSignOut, accessToken);
  }
}
