import UserAttributes from './UserAttributes';

export interface UserManager {
  getUserAttributes(clientUserId: string, queriedUserId: string, accessToken: string): Promise<UserAttributes>;
  setUserAttributes(
    clientUserId: string,
    queriedUserId: string,
    attributes: UserAttributes,
    accessToken: string
  ): Promise<UserAttributes>;
  getUserId(clientUserId: string, queriedUsername: string, accessToken: string): Promise<string>;
  signOutUser(clientUserId: string, userIdToSignOut: string, accessToken: string): Promise<void>;
}
