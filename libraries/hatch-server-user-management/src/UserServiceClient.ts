export class UserInfo {
  public userId?: string;
  public username?: string;
  public accessToken?: string;
  public isAuthenticated: boolean = false;
}

export class AuthTokens {
  public accessToken?: string;
  public refreshToken?: string;
}

export default interface UserServiceClient {
  authenticate(username: string, password: string): Promise<AuthTokens>;
  signUpUser(username: string, password: string, userAttributes?: {[key: string]: any}): Promise<void>;
  confirmUser(username: string, confirmationCode: string): Promise<void>;
  resetPassword(username: string): Promise<void>;
  verifyToken(token: string): Promise<UserInfo>;
  refreshToken(refreshToken: string): Promise<AuthTokens>;
}