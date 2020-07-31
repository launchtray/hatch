import {controller, route} from '@launchtray/hatch-server';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {inject, injectAll, Logger} from '@launchtray/hatch-util';
import 'cross-fetch/polyfill';
import {AUTH_ACCESS_TOKEN_COOKIE_NAME} from './constants';
import {UserManagementErrorCodes, UserManagementClient, UserManagementEndpoints} from '@launchtray/hatch-user-management-client';
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
  ResendUserRegistrationCodeRequest,
  SetUserAttributesRequest,
} from './UserManagementRequests';
import UserContext from './UserContext';
import * as HttpStatus from 'http-status-codes'

export const AUTH_WHITELIST_KEY = 'AUTH_WHITELIST_KEY';

@controller()
export default class UserManagementController {
  
  private readonly authWhitelist = [
    // default whitelist for swagger
    '/favicon.ico',
    '/api',
    '/api.json',
  ];
  
  constructor(
    @inject('UserManagementClient') private readonly userService: UserManagementClient,
    @inject('Logger') private readonly logger: Logger,
    @injectAll(AUTH_WHITELIST_KEY) customAuthWhitelist: string[],
  ) {
    if (customAuthWhitelist.length > 0) {
      this.authWhitelist = this.authWhitelist.concat(customAuthWhitelist);
    }
    this.logger.debug('Auth whitelist:', this.authWhitelist);
  }
  
  @route.post(UserManagementEndpoints.AUTHENTICATE, AuthenticateRequest.apiMetadata)
  public async authenticate(params: BasicRouteParams) {
    this.logger.debug('Authenticating...');
    try {
      const {username, password} = params.req.body;
      if (!username || !password) {
        const errMsg = 'Missing required field(s), username and password are required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        const authTokens = await this.userService.authenticate(username, password);
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken);
        this.logger.debug('User authenticated and cookie set');
        params.res.status(HttpStatus.OK).send(authTokens);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error authenticating user: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.ACCOUNT_LOCKED) {
        params.res.status(HttpStatus.FORBIDDEN).send({
          error: err.code,
        });
      } else if (err.code === UserManagementErrorCodes.UNAUTHORIZED) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: err.code,
        });
      } else if (err.code === UserManagementErrorCodes.USER_NOT_CONFIRMED) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.START_USER_REGISTRATION, StartUserRegistrationRequest.apiMetadata)
  public async startUserRegistration(params: BasicRouteParams) {
    this.logger.debug('Starting user registration...');
    try {
      const {username, password, userAttributes} = params.req.body;
      if (!username || !password) {
        const errMsg = 'Missing required field(s), username and password are required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.startUserRegistration(username, password, userAttributes);
        this.logger.debug('User registration started');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error starting user registration: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.USERNAME_EXISTS) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.RESEND_USER_REGISTRATION, ResendUserRegistrationCodeRequest.apiMetadata)
  public async resendUserRegistrationCode(params: BasicRouteParams) {
    this.logger.debug('Resending user registration code...');
    try {
      const {username} = params.req.body;
      if (!username) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.resendUserRegistrationCode(username);
        this.logger.debug('User registration code resent');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error resending user registration: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.CONFIRM_USER_REGISTRATION, ConfirmUserRegistrationRequest.apiMetadata)
  public async confirmUserRegistration(params: BasicRouteParams) {
    this.logger.debug('Confirming user registration...');
    try {
      const {username, confirmationCode} = params.req.body;
      if (!username || !confirmationCode) {
        const errMsg = 'Missing required field(s), username and confirmationCode are required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.confirmUserRegistration(username,confirmationCode);
        this.logger.debug('User registration confirmed');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error confirming user: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.INVALID_CODE) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.START_PASSWORD_RESET, StartPasswordResetRequest.apiMetadata)
  public async startPasswordReset(params: BasicRouteParams) {
    this.logger.debug('Starting user password reset...');
    try {
      const {username} = params.req.body;
      if (!username) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.startPasswordReset(username);
        this.logger.debug('User password reset started');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error resetting user password: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.CONFIRM_USER_REGISTRATION, ConfirmPasswordResetRequest.apiMetadata)
  public async confirmPasswordReset(params: BasicRouteParams) {
    this.logger.debug('Confirming user password reset...');
    try {
      const {username, confirmationCode, password} = params.req.body;
      if (!username || !confirmationCode || !password) {
        const errMsg = 'Missing required field(s), username, confirmation code, and password are required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.confirmPasswordReset(username, confirmationCode, password);
        this.logger.debug('User password reset confirmed');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error confirming resetting user password: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.INVALID_PASSWORD_FORMAT || err.code === UserManagementErrorCodes.USER_NOT_CONFIRMED) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.REFRESH_AUTHENTICATION, RefreshAuthenticationRequest.apiMetadata)
  public async refreshAuthentication(userInfoRequest: UserInfoRequest) {
    const params = userInfoRequest.params;
    this.logger.debug('Refreshing user authentication tokens...');
    try {
      await userInfoRequest.getUserInfo();
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        this.logger.debug('Token signature verified but expired at ', err.expiredAt)
      } else {
        this.logger.error('Error refreshing user authentication tokens: Invalid token');
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: 'Invalid token',
        });
        return;
      }
    }
    try {
      const {refreshToken} = params.req.body;
      if (!refreshToken) {
        const errMsg = 'Missing required field, refreshToken is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        const authTokens = await this.userService.refreshAuthentication(refreshToken);
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken);
        this.logger.debug('User authentication tokens refreshed and cookie set');
        params.res.status(HttpStatus.OK).send(authTokens);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error refreshing user authentication tokens: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.INVALID_PASSWORD_FORMAT || err.code === UserManagementErrorCodes.USER_NOT_CONFIRMED) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
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
      if (userInfo) {
        this.logger.debug('User authenticated {username:' + userInfo.username + '}');
        return params.next();
      } else {
        const errMsg = 'User not authenticated';
        this.logger.debug(errMsg);
        params.res.sendStatus(HttpStatus.UNAUTHORIZED);
      }
    } catch (err) {
      this.logger.error('Error authenticating user: ', err);
      params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        error: err.message,
      });
    }
  }
  
  @route.post(UserManagementEndpoints.SIGN_OUT_USER, SignOutUserRequest.apiMetadata)
  public async signOutUser(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Signing out user...');
    try {
      const {username} = userContext;
      if (!username || username.length === 0) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.signOutUser(username);
        this.logger.debug('User signed out');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error signing out user: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.GET_USER_ATTRIBUTES)
  public async getUserAttributes(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Getting user attributes...');
    try {
      const {username} = userContext;
      if (!username) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        const userAttributes = await this.userService.getUserAttributes(username);
        this.logger.debug('User attributes fetched: ' + userAttributes);
        params.res.status(HttpStatus.OK).send({
          userAttributes,
        });
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error getting user attributes: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.SET_USER_ATTRIBUTES, SetUserAttributesRequest.apiMetadata)
  public async setUserAttributes(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Setting user attributes...');
    try {
      const {username} = userContext;
      const {userAttributes} = params.req.body;
      if (!username || !userAttributes) {
        const errMsg = 'Missing required field, username and userAttributes are required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        await this.userService.setUserAttributes(username, userAttributes);
        this.logger.debug('User attributes set');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error setting user attributes: ' + errorMessage);
      if (err.code === UserManagementErrorCodes.USER_NOT_FOUND) {
        params.res.status(HttpStatus.PRECONDITION_FAILED).send({
          error: err.code,
        });
      } else {
        params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
          error: err.code,
        });
      }
    }
  }
  
  @route.post(UserManagementEndpoints.GET_USER_INFO)
  public async getUserInfo(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Getting user info...');
    try {
      const {username} = userContext;
      if (!username) {
        const errMsg = 'Missing required field, username is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        const userInfo = await this.userService.getUserInfo(userContext.accessToken);
        this.logger.debug('User info extracted');
        params.res.status(HttpStatus.OK).send({
          userInfo,
        });
      }
    } catch (err) {
      this.logger.debug('Error getting user info: ' + err);
      params.res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
        error: err,
      });
    }
  }
  
}