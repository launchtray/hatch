import {inject, injectable, injectAll} from '@launchtray/hatch-util';
import {UserAttributes, UserManagementClient, UserManager} from '@launchtray/hatch-user-management-client';
import UserPermissionsManager, {
  SelfOnlyUserPermissionsManager,
} from './UserPermissionsManager';

@injectable()
export default class LocalUserManager implements UserManager {
  private readonly permissionsManager: UserPermissionsManager;

  constructor(
    @inject('UserManagementClient') private readonly userManagementClient: UserManagementClient,
    @injectAll('UserPermissionsManager') permissionsManagers: UserPermissionsManager[],
  ) {
    if (permissionsManagers.length === 0) {
      // By default, only allow the client to get/set own attributes
      this.permissionsManager = new SelfOnlyUserPermissionsManager();
    } else if (permissionsManagers.length > 1) {
      throw new Error('Only one UserPermissionsManager should be injected');
    } else {
      [this.permissionsManager] = permissionsManagers;
    }
  }

  async getUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    accessToken: string,
    tenantId?: string,
  ): Promise<UserAttributes> {
    const allAttributes = await this.userManagementClient.getUserAttributes(
      queriedUserId,
      accessToken,
      {tenantId},
    );
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
    accessToken: string,
    tenantId?: string,
  ): Promise<UserAttributes> {
    const writableAttributes = await this.permissionsManager.getWriteableAttributes(
      clientUserId,
      queriedUserId,
      attributes,
    );
    if (attributes == null || Object.keys(attributes).length === 0) {
      throw new Error('User is not allowed to set any permissions for queried user');
    } else {
      await this.userManagementClient.setUserAttributes(queriedUserId, attributes, accessToken, {tenantId});
    }
    return writableAttributes;
  }

  async getUserId(clientUserId: string, queriedUsername: string, accessToken: string, tenantId?: string) {
    let userId;
    if (this.userManagementClient.getUserId != null) {
      userId = await this.userManagementClient.getUserId(queriedUsername, accessToken, {tenantId});
    } else {
      throw new Error('User ID lookup is not supported');
    }

    const allowed = userId != null && await this.permissionsManager.isUserAllowedToLookUpUserId(clientUserId, userId);
    if (!allowed) {
      throw new Error('User is not allowed to read user ID for queried user');
    }
    return userId;
  }

  async signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string, tenantId?: string) {
    const allowed = await this.permissionsManager.isUserAllowedToSignOutUser(clientUserId, userIdToSignOut);
    if (!allowed) {
      throw new Error('User is not allowed to read user ID for queried user');
    }
    await this.userManagementClient.signOutUser(userIdToSignOut, accessToken, {tenantId});
  }
}
