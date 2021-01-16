import UserAttributes from './UserAttributes';

export class UserInfo {
  constructor(
    public readonly userId?: string,
    public readonly username?: string,
    public readonly accessToken?: string,
  ) {}
}

export class AuthTokens {
  constructor(
    public readonly accessToken?: string,
    public readonly refreshToken?: string,
  ) {}
}

export enum UserManagementEndpoints {
  AUTHENTICATE = '/api/authenticate',
  START_USER_REGISTRATION = '/api/startUserRegistration',
  RESEND_USER_REGISTRATION = '/api/resendUserRegistrationCode',
  CONFIRM_USER_REGISTRATION = '/api/confirmUserRegistration',
  START_PASSWORD_RESET = '/api/startPasswordReset',
  CONFIRM_PASSWORD_RESET = '/api/confirmPasswordReset',
  REFRESH_AUTHENTICATION = '/api/refreshAuthentication',
  SIGN_OUT_USER = '/api/signOutUser',
  GET_USER_ATTRIBUTES = '/api/userAttributes',
  SET_USER_ATTRIBUTES = '/api/userAttributes',
  GET_USER_INFO = '/api/userInfo',
  GET_USER_ID = '/api/userId',
}

export const TENANT_ID_HEADER = 'x-tenant-id';

export type UserManagementClientOptions = {
  tenantId?: string
}

export interface UserManagementClient {
  authenticate(username: string, password: string, options?: UserManagementClientOptions): Promise<AuthTokens>;
  startUserRegistration(
    username: string,
    password: string,
    userAttributes: UserAttributes,
    options?: UserManagementClientOptions,
  ): Promise<void>;
  resendUserRegistrationCode(username: string, options?: UserManagementClientOptions): Promise<void>;
  confirmUserRegistration(
    username: string,
    confirmationCode: string,
    options?: UserManagementClientOptions
  ): Promise<void>;
  startPasswordReset(username: string, options?: UserManagementClientOptions): Promise<void>;
  confirmPasswordReset(
    username: string,
    confirmationCode: string,
    password: string,
    options?: UserManagementClientOptions,
  ): Promise<void>;
  refreshAuthentication(
    refreshToken: string,
    accessToken?: string,
    options?: UserManagementClientOptions,
  ): Promise<AuthTokens>;
  signOutUser(userId: string, accessToken: string, options?: UserManagementClientOptions): Promise<void>;
  getUserAttributes(
    userId: string,
    accessToken: string,
    options?: UserManagementClientOptions,
  ): Promise<UserAttributes>;
  setUserAttributes(
    userId: string,
    userAttributes: UserAttributes,
    accessToken: string,
    options?: UserManagementClientOptions,
  ): Promise<void>;
  getUserInfo(accessToken: string, options?: UserManagementClientOptions): Promise<UserInfo>;
  getUserId?(username: string, accessToken: string, options?: UserManagementClientOptions): Promise<string | undefined>;
}