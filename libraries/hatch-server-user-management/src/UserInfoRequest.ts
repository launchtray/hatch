import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {containerSingleton, inject, injectAll, Logger} from '@launchtray/hatch-util';
import cookie from 'cookie';
import {UserInfo, UserManagementClient} from '@launchtray/hatch-user-management-client';
import {Route} from '@launchtray/hatch-server';
import {AUTH_ACCESS_TOKEN_COOKIE_NAME} from './constants';

export const AUTH_WHITELIST_KEY = 'AUTH_WHITELIST_KEY';
export const AUTH_BLACKLIST_KEY = 'AUTH_BLACKLIST_KEY';

@containerSingleton()
export default class UserInfoRequest {
  private userInfo?: UserInfo;
  private logger: Logger;

  public readonly authWhitelist: Route[] = [
    // default whitelist for swagger and static assets
    '/api',
    '/api.json',
    '/api/health',
    '/api/health/*',
    '/static/*',
    '/favicon.ico',
    '/robots.txt',
  ];

  public readonly authBlacklist: Route[] = [];

  constructor(
    public readonly params: BasicRouteParams,
    @inject('UserManagementClient') private readonly userService: UserManagementClient,
    // Resolving these here ensures they are always up to date per-request
    @injectAll(AUTH_WHITELIST_KEY) customAuthWhitelist: string[],
    @injectAll(AUTH_BLACKLIST_KEY) customAuthBlacklist: string[],
  ) {
    this.logger = params.logger;
    if (customAuthWhitelist.length > 0) {
      this.authWhitelist = this.authWhitelist.concat(customAuthWhitelist);
    }
    this.logger.debug('Auth whitelist:', this.authWhitelist);
    if (customAuthBlacklist.length > 0) {
      this.authBlacklist = this.authBlacklist.concat(customAuthBlacklist);
    }
    this.logger.debug('Auth blacklist:', this.authBlacklist);
  }

  public async getUserInfo(tenantId?: string) {
    if (this.userInfo == null) {
      await this.authenticateUser(tenantId);
    }
    return this.userInfo;
  }

  public getUnverifiedAccessToken() {
    return this.extractAuthenticationCookie() ?? this.extractAuthenticationHeader();
  }

  private async authenticateUser(tenantId?: string) {
    const accessToken = this.getUnverifiedAccessToken();
    if (accessToken != null) {
      this.userInfo = await this.userService.getUserInfo(accessToken, {tenantId});
    } else {
      throw new Error('Authorization token is missing from cookie and bearer header');
    }
  }

  private extractAuthenticationCookie() {
    this.logger.debug('Checking for authorization cookie...');
    let cookies = null;
    if (this.params.req.headers.cookie != null) {
      this.logger.debug('Header cookies found: ', this.params.req.headers.cookie);
      cookies = cookie.parse(this.params.req.headers.cookie);
    }
    if (cookies?.[AUTH_ACCESS_TOKEN_COOKIE_NAME] != null) {
      const token = cookies[AUTH_ACCESS_TOKEN_COOKIE_NAME];
      this.logger.debug('Authorization cookie found: ', token);
      return token;
    }
    return undefined;
  }

  private extractAuthenticationHeader() {
    this.logger.debug('Checking for authorization header...');
    if (this.params.req?.headers?.authorization != null) {
      let token = this.params.req.headers.authorization;
      this.logger.debug('Authorization header token: ', token);
      const bearerPrefix = 'Bearer ';
      if (token.startsWith(bearerPrefix)) {
        token = token.slice(bearerPrefix.length);
        this.logger.debug('Extracted authorization bearer token: ', token);
        return token;
      }
    }
    return undefined;
  }
}
