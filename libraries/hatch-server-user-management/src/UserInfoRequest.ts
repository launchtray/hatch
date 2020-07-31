import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {containerSingleton, inject, Logger} from '@launchtray/hatch-util';
import cookie from 'cookie';
import {AUTH_ACCESS_TOKEN_COOKIE_NAME} from './constants';
import {UserInfo, UserManagementClient} from '@launchtray/hatch-user-management-client';

@containerSingleton()
export default class UserInfoRequest {
  private userInfo?: UserInfo;
  private logger: Logger;
  
  constructor(
    public readonly params: BasicRouteParams,
    @inject('UserManagementClient') private readonly userService: UserManagementClient
  ) {
    this.logger = params.logger;
  }
  
  public async getUserInfo() {
    if (this.userInfo == null) {
      await this.authenticateUser();
    }
    return this.userInfo;
  }
  
  private async authenticateUser() {
    const token = this.extractAuthenticationCookie() ?? this.extractAuthenticationHeader();
    if (token) {
      this.userInfo = await this.userService.getUserInfo(token);
    } else {
      throw new Error('Authorization token is missing from cookie and bearer header');
    }
  }
  
  private extractAuthenticationCookie() {
    this.logger.debug('Checking for authorization cookie...');
    let cookies = null;
    if (this.params.req.headers.cookie) {
      this.logger.debug('Header cookies found: ', this.params.req.headers.cookie);
      cookies = cookie.parse(this.params.req.headers.cookie);
    }
    if (cookies && cookies[AUTH_ACCESS_TOKEN_COOKIE_NAME]) {
      const token = cookies[AUTH_ACCESS_TOKEN_COOKIE_NAME];
      this.logger.debug('Authorization cookie found: ', token);
      return token;
    } else {
      return;
    }
  }
  
  private extractAuthenticationHeader() {
    this.logger.debug('Checking for authorization header...');
    if (this.params.req && this.params.req.headers && this.params.req.headers.authorization) {
      let token = this.params.req.headers.authorization;
      this.logger.debug('Authorization header token: ', token);
      const bearerPrefix = 'Bearer ';
      if (token.startsWith(bearerPrefix)) {
        token = token.slice(bearerPrefix.length);
        this.logger.debug('Extracted authorization bearer token: ', token);
        return token;
      }
    }
    return;
  }
  
}