import {injectable} from '@launchtray/hatch-util';
import UserAttributes from './UserAttributes';
import {UserManager} from './UserManager';
import {UserManagementClientSdk} from './UserManagementClientSdk';

@injectable()
export default class RemoteUserManager implements UserManager {
  constructor(private readonly userService: UserManagementClientSdk) {}

  async getUserAttributes(clientUserId: string, queriedUserId: string, accessToken: string): Promise<UserAttributes> {
    return await this.userService.getUserAttributes(queriedUserId, accessToken);
  }

  async getUserId(clientUserId: string, queriedUsername: string, accessToken: string): Promise<string> {
    return await this.userService.getUserId(queriedUsername, accessToken);
  }

  async setUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    attributes: UserAttributes,
    accessToken: string
  ): Promise<UserAttributes> {
    return await this.userService.setUserAttributes(queriedUserId, attributes, accessToken);
  }

  async signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string) {
    return await this.userService.signOutUser(userIdToSignOut, accessToken);
  }
}
