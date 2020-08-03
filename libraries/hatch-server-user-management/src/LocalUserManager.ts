import {inject, injectable, injectAll} from '@launchtray/hatch-util';
import UserPermissionsManager, {
  SelfOnlyUserPermissionsManager
} from './UserPermissionsManager';
import {UserAttributes, UserManagementClient, UserManager} from '@launchtray/hatch-user-management-client';

@injectable()
export default class LocalUserManager implements UserManager {
  private readonly permissionsManager: UserPermissionsManager;

  constructor(
    @inject('UserManagementClient') private readonly userService: UserManagementClient,
    @injectAll('UserPermissionsManager') permissionsManagers: UserPermissionsManager[]
  ) {
    if (permissionsManagers.length == 0) {
      // By default, only allow the client to get/set own attributes
      this.permissionsManager = new SelfOnlyUserPermissionsManager();
    } else if (permissionsManagers.length > 1) {
      throw new Error('Only one UserPermissionsManager should be injected');
    } else {
      this.permissionsManager = permissionsManagers[0];
    }
  }

  async getUserAttributes(clientUserId: string, queriedUserId: string, accessToken: string): Promise<UserAttributes> {
    const allAttributes = await this.userService.getUserAttributes(queriedUserId, accessToken);
    const attributes = await this.permissionsManager.getReadableAttributes(clientUserId, queriedUserId, allAttributes);
    if (attributes == null || Object.keys(attributes).length === 0) {
      throw new Error('User is not allowed to read any permissions for queried user');
    }
    return attributes;
  }

  async setUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    attributes: UserAttributes,
    accessToken: string
  ): Promise<UserAttributes> {
    const writableAttributes = await this.permissionsManager.getWriteableAttributes(
      clientUserId, queriedUserId, attributes);
    if (attributes == null || Object.keys(attributes).length === 0) {
      throw new Error('User is not allowed to set any permissions for queried user');
    } else {
      await this.userService.setUserAttributes(queriedUserId, attributes, accessToken);
    }
    return writableAttributes;
  }

  async getUserId(clientUserId: string, queriedUsername: string, accessToken: string) {
    let userId;
    if (this.userService.getUserId != null) {
      userId = await this.userService.getUserId(queriedUsername, accessToken);
    } else {
      throw new Error('User ID lookup is not supported');
    }

    const allowed = await this.permissionsManager.isUserAllowedToLookUpUserId(clientUserId, userId);
    if (!allowed) {
      throw new Error('User is not allowed to read user ID for queried user');
    }
    return userId;
  }

  async signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string) {
    const allowed = await this.permissionsManager.isUserAllowedToSignOutUser(clientUserId, userIdToSignOut);
    if (!allowed) {
      throw new Error('User is not allowed to read user ID for queried user');
    }
    await this.userService.signOutUser(userIdToSignOut, accessToken);
  }
}
