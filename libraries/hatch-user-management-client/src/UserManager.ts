import UserAttributes from './UserAttributes';

export interface UserManager {
  getUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    accessToken: string,
    tenantId?: string,
  ): Promise<UserAttributes>;
  setUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    attributes: UserAttributes,
    accessToken: string,
    tenantId?: string
  ): Promise<UserAttributes>;
  getUserId(
    clientUserId: string,
    queriedUsername: string,
    accessToken: string,
    tenantId?: string,
  ): Promise<string | undefined>;
  signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string, tenantId?: string): Promise<void>;
}
