import {controller, route} from '@launchtray/hatch-server';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {inject, Logger} from '@launchtray/hatch-util';
import 'cross-fetch/polyfill';
import {AUTH_ACCESS_TOKEN_COOKIE_NAME} from './constants';
import UserServiceClient from './UserServiceClient';
import UserInfoRequest from './UserInfoRequest';
import {TokenExpiredError} from 'jsonwebtoken';
import {
  AuthenticateRequest,
  ConfirmUserRequest,
  SignUpUserRequest,
  RefreshTokenRequest,
  ForgotPasswordRequest,
  ConfirmForgotPasswordRequest,
  SignOutRequest,
  ReSendSignUpUserRequest
} from './UserManagementRequests';

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
    @inject('customAuthWhitelist') private readonly customAuthWhitelist: string[]) {
    this.authWhitelist.concat(customAuthWhitelist);
  }
  
  @route.post('/api/authenticate', AuthenticateRequest.apiMetadata)
  public async authenticate(params: BasicRouteParams) {
    this.logger.debug('Authenticating...');
    try {
      const {username, password} = params.req.body;
      if (!username || !password || username.length === 0 || password.length === 0) {
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
  
  @route.post('/api/signUpUser', SignUpUserRequest.apiMetadata)
  public async signUpUser(params: BasicRouteParams) {
    this.logger.debug('Creating user...');
    try {
      const {username, password, userAttributes} = params.req.body;
      if (!username || !password || username.length === 0 || password.length === 0) {
        const errMsg = 'Missing required field(s), username and password are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.signUpUser(username, password, userAttributes);
        this.logger.debug('User created');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error creating user: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/resendSignUp', ReSendSignUpUserRequest.apiMetadata)
  public async resendSignUp(params: BasicRouteParams) {
    this.logger.debug('Resending user sign up...');
    try {
      const {username} = params.req.body;
      if (!username || username.length === 0) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.resendSignUp(username);
        this.logger.debug('User sign up email resent');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error resending user sign up email: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/confirmUser', ConfirmUserRequest.apiMetadata)
  public async confirmUser(params: BasicRouteParams) {
    this.logger.debug('Confirming user...');
    try {
      const {username, confirmationCode} = params.req.body;
      if (!username || !confirmationCode || username.length === 0 || confirmationCode.length === 0) {
        const errMsg = 'Missing required field(s), username and confirmationCode are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.confirmUser(username,confirmationCode);
        this.logger.debug('User confirmed');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error confirming user: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/forgotPassword', ForgotPasswordRequest.apiMetadata)
  public async resetPassword(params: BasicRouteParams) {
    this.logger.debug('Resetting user password...');
    try {
      const {username} = params.req.body;
      if (!username || username.length === 0) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.forgotPasswordRequest(username);
        this.logger.debug('User password reset request sent');
        params.res.sendStatus(200);
      }
    } catch (err) {
      this.logger.error('Error resetting user password: ', err);
      params.res.status(500).send({
        error: err,
      });
    }
  }
  
  @route.post('/api/confirmForgotPassword', ConfirmForgotPasswordRequest.apiMetadata)
  public async confirmForgotPassword(params: BasicRouteParams) {
    this.logger.debug('Confirming forgot user password...');
    try {
      const {username, confirmationCode, password} = params.req.body;
      if (!username || username.length === 0 || !confirmationCode || confirmationCode.length === 0 || !password ||
        password.length === 0) {
        const errMsg = 'Missing required field(s), username, confirmation code, and password are required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        await this.userService.confirmForgotPasswordRequest(username, confirmationCode, password);
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
  
  @route.post('/api/refreshToken', RefreshTokenRequest.apiMetadata)
  public async refreshToken(userInfoRequest: UserInfoRequest) {
    const params = userInfoRequest.params;
    this.logger.debug('Refreshing user tokens...');
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
      if (!refreshToken || refreshToken.length === 0) {
        const errMsg = 'Missing required field, refreshToken is required';
        this.logger.debug(errMsg);
        params.res.status(400).send({
          error: errMsg,
        });
      } else {
        const authTokens = await this.userService.refreshToken(refreshToken);
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken);
        this.logger.debug('User tokens refreshed and cookie set');
        params.res.status(200).send(authTokens);
      }
    } catch (err) {
      this.logger.error('Error refreshing user tokens: ', err);
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
  
  @route.post('/api/signOut', SignOutRequest.apiMetadata)
  public async signOut(userInfoRequest: UserInfoRequest) {
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