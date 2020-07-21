import {controller, route} from '@launchtray/hatch-server';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {inject, injectAll, Logger} from '@launchtray/hatch-util';
import 'cross-fetch/polyfill';
import {AUTH_ACCESS_TOKEN_COOKIE_NAME} from './constants';
import UserServiceClient from './UserServiceClient';
import UserInfoRequest from './UserInfoRequest';
import {TokenExpiredError} from 'jsonwebtoken';
import {
  AuthenticateRequest,
  ConfirmUserRegistrationRequest,
  StartUserRegistrationRequest,
  RefreshAuthenticationRequest,
  StartPasswordResetRequest,
  ConfirmPasswordResetRequest,
  SignOutUserRequest,
  ResendUserRegistrationCodeRequest
} from './UserManagementRequests';

export const AUTH_WHITELIST_KEY = 'AUTH_WHITELIST_KEY';

@controller()
export default class UserManagementController {
  
  private authWhitelist = [
    // default whitelist for swagger
    '/favicon.ico',
    '/api',
    '/api.json',
  ];
  
  constructor(
    @inject('UserServiceClient') private readonly userService: UserServiceClient,
    @inject('Logger') private readonly logger: Logger,
    @injectAll(AUTH_WHITELIST_KEY) customAuthWhitelist: string[],
  ) {
    if (customAuthWhitelist.length > 0) {
      this.authWhitelist = this.authWhitelist.concat(customAuthWhitelist);
    }
    this.logger.debug('Auth whitelist:', this.authWhitelist);
  }
  
  @route.post('/api/authenticate', AuthenticateRequest.apiMetadata)
  public async authenticate(params: BasicRouteParams) {
    this.logger.debug('Authenticating...');
    try {
      const {username, password} = params.req.body;
      if (!username || !password) {
        const errMsg = 'Missing required field(s), username and password are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        const authTokens = await this.userService.authenticate(username, password);
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken);
        this.logger.debug('User authenticated and cookie set');
        params.res.status(200).send(authTokens);
      }
    } catch (err) {
      this.logger.error('Error authenticating user: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/startUserRegistration', StartUserRegistrationRequest.apiMetadata)
  public async startUserRegistration(params: BasicRouteParams) {
    this.logger.debug('Starting user registration...');
    try {
      const {username, password, userAttributes} = params.req.body;
      if (!username || !password) {
        const errMsg = 'Missing required field(s), username and password are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.startUserRegistration(username, password, userAttributes);
        this.logger.debug('User registration started');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error creating user: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/resendUserRegistrationCode', ResendUserRegistrationCodeRequest.apiMetadata)
  public async resendUserRegistrationCode(params: BasicRouteParams) {
    this.logger.debug('Resending user registration code...');
    try {
      const {username} = params.req.body;
      if (!username) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.resendUserRegistrationCode(username);
        this.logger.debug('User registration code resent');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error resending user sign up email: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/confirmUserRegistration', ConfirmUserRegistrationRequest.apiMetadata)
  public async confirmUserRegistration(params: BasicRouteParams) {
    this.logger.debug('Confirming user registration...');
    try {
      const {username, confirmationCode} = params.req.body;
      if (!username || !confirmationCode) {
        const errMsg = 'Missing required field(s), username and confirmationCode are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.confirmUserRegistration(username,confirmationCode);
        this.logger.debug('User registration confirmed');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error confirming user: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/startPasswordReset', StartPasswordResetRequest.apiMetadata)
  public async startPasswordReset(params: BasicRouteParams) {
    this.logger.debug('Starting user password reset...');
    try {
      const {username} = params.req.body;
      if (!username) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.startPasswordReset(username);
        this.logger.debug('User password reset started');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error resetting user password: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/confirmPasswordReset', ConfirmPasswordResetRequest.apiMetadata)
  public async confirmPasswordReset(params: BasicRouteParams) {
    this.logger.debug('Confirming user password reset...');
    try {
      const {username, confirmationCode, password} = params.req.body;
      if (!username || !confirmationCode || !password) {
        const errMsg = 'Missing required field(s), username, confirmation code, and password are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.confirmPasswordReset(username, confirmationCode, password);
        this.logger.debug('User password reset confirmed');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error confirming resetting user password: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/refreshAuthentication', RefreshAuthenticationRequest.apiMetadata)
  public async refreshAuthentication(userInfoRequest: UserInfoRequest) {
    const params = userInfoRequest.params;
    this.logger.debug('Refreshing user authentication tokens...');
    try {
      await userInfoRequest.getUserInfo();
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        this.logger.debug('Token signature verified but expired at ', err.expiredAt)
      } else {
        const errMsg = 'User not authorized';
        this.logger.debug(errMsg);
        params.res.status(401).send({
          error: errMsg,
        });
      }
    }
    try {
      const {refreshToken} = params.req.body;
      if (!refreshToken) {
        const errMsg = 'Missing required field, refreshToken is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        const authTokens = await this.userService.refreshAuthentication(refreshToken);
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken);
        this.logger.debug('User authentication tokens refreshed and cookie set');
        params.res.status(200).send(authTokens);
      }
    } catch (err) {
      this.logger.error('Error refreshing user authentication tokens: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  // all methods defined after this method are authenticated as defined below
  @route.all('*')
  public async verifyUser(userInfoRequest: UserInfoRequest) {
    const params = userInfoRequest.params;
    this.logger.debug('Validating token for url: ', params.req.url);
    
    if (this.authWhitelist && this.authWhitelist.includes(params.req.url)) {
      this.logger.debug('Url whitelisted: ', (params.req.url));
      return params.next();
    }
    
    try {
      const userInfo = await userInfoRequest.getUserInfo();
      if (userInfo && userInfo.isAuthenticated) {
        this.logger.debug('User authorized {username:' + userInfo.username + '}');
        return params.next();
      } else {
        const errMsg = 'User not authorized';
        this.logger.debug(errMsg);
        params.res.status(401).send({
          error: errMsg,
        });
      }
    } catch (err) {
      this.logger.error('Error verifying user: ', err);
      params.res.status(500).send({
        error: err.message,
      });
    }
  }
  
  @route.post('/api/signOutUser', SignOutUserRequest.apiMetadata)
  public async signOutUser(userInfoRequest: UserInfoRequest) {
    const params = userInfoRequest.params;
    this.logger.debug('Signing out user...');
    try {
      const {username} = params.req.body;
      if (!username || username.length === 0) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.signOutUser(username);
        this.logger.debug('User signed out');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error signing out user: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
}