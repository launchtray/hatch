export class UserInfo {
  constructor(public readonly userId?: string,
              public readonly username?: string,
              public readonly accessToken?: string,
              public readonly isAuthenticated?: boolean) {
  }
}

export class AuthTokens {
  constructor(public readonly accessToken?: string,
              public readonly refreshToken?: string) {
  }
}

export default interface UserServiceClient {
  authenticate(username: string, password: string): Promise<AuthTokens>;
  startUserRegistration(username: string, password: string, userAttributes?: {[key: string]: any}): Promise<void>;
  resendUserRegistrationCode(username: string): Promise<void>;
  confirmUserRegistration(username: string, confirmationCode: string): Promise<void>;
  startPasswordReset(username: string): Promise<void>;
  confirmPasswordReset(username: string, confirmationCode: string, password: string): Promise<void>;
  getUserInfo(token: string): Promise<UserInfo>;
  refreshAuthentication(refreshToken: string): Promise<AuthTokens>;
  signOutUser(username: string): Promise<void>;
  getUserAttributes(username: string): Promise<{[key: string]: any}>;
  setUserAttributes(username: string, userAttributes: {[key: string]: any}): Promise<void>;
}