import {UserAttributes} from '@launchtray/hatch-user-management-client';
import {injectable} from '@launchtray/hatch-util';

export default interface UserPermissionsManager {
  getReadableAttributes(clientUserId: string, queriedUserId: string, attributes: UserAttributes): Promise<UserAttributes>;
  getWriteableAttributes(clientUserId: string, queriedUserId: string, attributes: UserAttributes): Promise<UserAttributes>;
  isUserAllowedToLookUpUserId(clientUserId: string, queriedUserId: string): Promise<boolean>;
  isUserAllowedToSignOutUser(clientUserId: string, userIdToSignOut: string): Promise<boolean>;
}

@injectable()
export class SelfOnlyUserPermissionsManager implements UserPermissionsManager {
  async getReadableAttributes(clientUserId: string, queriedUserId: string, attributes: UserAttributes) {
    return clientUserId === queriedUserId ? attributes : undefined;
  }

  async getWriteableAttributes(clientUserId: string, queriedUserId: string, attributes: UserAttributes) {
    return clientUserId === queriedUserId ? attributes : undefined;
  }

  async isUserAllowedToLookUpUserId(clientUserId: string, queriedUserId: string) {
    return clientUserId === queriedUserId;
  }

  async isUserAllowedToSignOutUser(clientUserId: string, userIdToSignOut: string) {
    return clientUserId === userIdToSignOut;
  }
}
