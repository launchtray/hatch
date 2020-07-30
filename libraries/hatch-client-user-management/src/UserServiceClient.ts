export class UserInfo {
  constructor(public readonly userId?: string,
              public readonly username?: string,
              public readonly accessToken?: string) {
  }
}

export class AuthTokens {
  constructor(public readonly accessToken?: string,
              public readonly refreshToken?: string) {
  }
}

export enum UserServiceClientEndpoint {
  AUTHENTICATE = '/api/authenticate',
  START_USER_REGISTRATION = '/api/startUserRegistration',
  RESEND_USER_REGISTRATION = '/api/resendUserRegistrationCode',
  CONFIRM_USER_REGISTRATION = '/api/confirmUserRegistration',
  START_PASSWORD_RESET = '/api/startPasswordReset',
  CONFIRM_PASSWORD_RESET = '/api/confirmPasswordReset',
  REFRESH_AUTHENTICATION = '/api/refreshAuthentication',
  SIGN_OUT_USER = '/api/signOutUser',
  GET_USER_ATTRIBUTES = '/api/getUserAttributes',
  SET_USER_ATTRIBUTES = '/api/setUserAttributes',
}

export interface UserServiceClient {
  authenticate(username: string, password: string): Promise<AuthTokens>;
  startUserRegistration(username: string, password: string, userAttributes?: {[key: string]: any}): Promise<void>;
  resendUserRegistrationCode(username: string): Promise<void>;
  confirmUserRegistration(username: string, confirmationCode: string): Promise<void>;
  startPasswordReset(username: string): Promise<void>;
  confirmPasswordReset(username: string, confirmationCode: string, password: string): Promise<void>;
  refreshAuthentication(refreshToken: string, accessToken?: string): Promise<AuthTokens>;
  signOutUser(username: string, accessToken?: string): Promise<void>;
  getUserAttributes(username: string, accessToken?: string): Promise<{[key: string]: any}>;
  setUserAttributes(username: string, userAttributes: {[key: string]: any}, accessToken?: string): Promise<void>;
  getUserInfo(token: string): Promise<UserInfo>;
}