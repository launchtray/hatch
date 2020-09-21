import {controller, requestMatchesRouteList, route} from '@launchtray/hatch-server';
import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {inject, Logger} from '@launchtray/hatch-util';
import 'cross-fetch/polyfill';
import {AUTH_ACCESS_TOKEN_COOKIE_NAME} from './constants';
import {
  UserManager,
  UserManagementErrorCodes,
  UserManagementClient,
  UserManagementEndpoints
} from '@launchtray/hatch-user-management-client';
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
  GetUserAttributesRequest,
  GetUserIdRequest,
  GetUserInfoRequest,
} from './UserManagementRequests';
import UserContext, {extractTenantID} from './UserContext';
import * as HttpStatus from 'http-status-codes';
import cookie from 'cookie';

const isMethodSideEffectSafe = (method: string): boolean => {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

const isCsrfSafe = (params: BasicRouteParams): boolean => {
  // If the auth header is set, this cannot be CSRF, since an attacker cannot set headers
  if (params.authHeader != null && params.authHeader !== '') {
    return true;
  }
  // If bypass header is set, this cannot be CSRF, since an attacker cannot set headers
  const bypassDSCHeader = params.req.header('x-bypass-csrf-check');
  const bypassDSC = (bypassDSCHeader != null && bypassDSCHeader.toLocaleLowerCase() === 'true');
  if (bypassDSC) {
    return true;
  }
  // Method is (supposed to be) safe. If the request has side effects, the application is flawed.
  if (isMethodSideEffectSafe(params.req.method)) {
    return true;
  }
  // Otherwise, guard against CRSF via a double-submit cookie
  let cookies = null;
  if (params.req.headers.cookie) {
    cookies = cookie.parse(params.req.headers.cookie);
  }
  const doubleSubmitCookie = cookies?.double_submit;
  const doubleSubmitParam = params.req.body.doubleSubmitCookie;
  return (
    doubleSubmitCookie != null
    && doubleSubmitCookie != ''
    && doubleSubmitCookie === doubleSubmitParam
  );
};

@controller()
export default class UserManagementController {

  constructor(
    @inject('UserManagementClient') private readonly userManagementClient: UserManagementClient,
    @inject('UserManager') private readonly userManager: UserManager,
    @inject('Logger') private readonly logger: Logger,
  ) {
  }

  @route.post(UserManagementEndpoints.AUTHENTICATE, AuthenticateRequest.apiMetadata)
  public async authenticate(params: BasicRouteParams) {
    this.logger.debug('Authenticating...');
    if (!isCsrfSafe(params)) {
      this.logger.error('Rejecting request due to CSRF check');
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
      return;
    }
    try {
      const {username, password} = params.req.body;
      if (!username || !password) {
        const errMsg = 'Missing required field(s), username and password are required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        const tenantId = extractTenantID(params);
        const authTokens = await this.userManagementClient.authenticate(username, password, {tenantId});
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken, {
          sameSite: 'lax',
          secure: process.env.NODE_ENV !== 'development',
          httpOnly: true,
        });
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
        const tenantId = extractTenantID(params);
        await this.userManagementClient.startUserRegistration(username, password, userAttributes, {tenantId});
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
        const tenantId = extractTenantID(params);
        await this.userManagementClient.resendUserRegistrationCode(username, {tenantId});
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
        const tenantId = extractTenantID(params);
        await this.userManagementClient.confirmUserRegistration(username, confirmationCode, {tenantId});
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
        const tenantId = extractTenantID(params);
        await this.userManagementClient.startPasswordReset(username, {tenantId});
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

  @route.post(UserManagementEndpoints.CONFIRM_PASSWORD_RESET, ConfirmPasswordResetRequest.apiMetadata)
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
        const tenantId = extractTenantID(params);
        await this.userManagementClient.confirmPasswordReset(username, confirmationCode, password, {tenantId});
        this.logger.debug('User password reset confirmed');
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error confirming resetting user password: ' + errorMessage);
      if (
        err.code === UserManagementErrorCodes.INVALID_PASSWORD_FORMAT
        || err.code === UserManagementErrorCodes.USER_NOT_CONFIRMED
      ) {
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
    if (!isCsrfSafe(params)) {
      this.logger.error('Rejecting request due to CSRF check');
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
      return;
    }
    try {
      await userInfoRequest.getUserInfo();
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        this.logger.debug('Token signature verified but expired at', err.expiredAt)
      } else {
        this.logger.error('Error refreshing user authentication tokens: Invalid token');
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
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
        const accessToken = userInfoRequest.getUnverifiedAccessToken()!;
        const tenantId = extractTenantID(params);
        const authTokens = await this.userManagementClient.refreshAuthentication(refreshToken, {accessToken, tenantId});
        params.res.cookie(AUTH_ACCESS_TOKEN_COOKIE_NAME, authTokens.accessToken, {
          sameSite: 'lax',
          secure: process.env.NODE_ENV !== 'development',
          httpOnly: true,
        });
        this.logger.debug('User authentication tokens refreshed and cookie set');
        params.res.status(HttpStatus.OK).send(authTokens);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.error('Error refreshing user authentication tokens: ' + errorMessage);
      if (
        err.code === UserManagementErrorCodes.INVALID_PASSWORD_FORMAT
        || err.code === UserManagementErrorCodes.USER_NOT_CONFIRMED
      ) {
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
    let whitelisted = requestMatchesRouteList(params.req, userInfoRequest.authWhitelist);
    let blacklisted = requestMatchesRouteList(params.req, userInfoRequest.authBlacklist);

    this.logger.debug('Validating token', {url: params.req.url, whitelisted, blacklisted});
    if (whitelisted && !blacklisted) {
      return params.next();
    }
    if (!isCsrfSafe(params)) {
      this.logger.error('Rejecting request due to CSRF check');
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
    } else {
      try {
        const userInfo = await userInfoRequest.getUserInfo();
        if (userInfo) {
          this.logger.debug('User authenticated {username:' + userInfo.username + '}');
          params.next();
        } else {
          const errMsg = 'User not authenticated';
          this.logger.debug(errMsg);
          params.res.status(HttpStatus.UNAUTHORIZED).send({
            error: UserManagementErrorCodes.UNAUTHORIZED,
          });
        }
      } catch (err) {
        this.logger.info('Failed to authenticate user:', err.message);
        params.res.status(HttpStatus.UNAUTHORIZED).send({
          error: UserManagementErrorCodes.UNAUTHORIZED,
        });
      }
    }
  }

  private async extractUserIds(userContext: UserContext): Promise<{clientUserId: string, queriedUserId: string}> {
    const params = userContext.params;
    const clientUserId = userContext.userId;
    const useQueryParams = isMethodSideEffectSafe(params.req.method);
    const paramsSource = (useQueryParams ? params.req.query : params.req.body);
    let queriedUserId = paramsSource.userId;
    const queriedUsername = paramsSource.username;

    if (queriedUserId == null) {
      if (queriedUsername != null) {
        if (this.userManagementClient.getUserId != null) {
          const tenantId = userContext.tenantId;
          queriedUserId = await this.userManagementClient.getUserId(queriedUsername,
            {accessToken: userContext.accessToken, tenantId});
        } else {
          throw new Error('User ID lookup is not supported');
        }
      } else {
        queriedUserId = clientUserId;
      }
    }
    return {clientUserId, queriedUserId};
  }

  @route.post(UserManagementEndpoints.SIGN_OUT_USER, SignOutUserRequest.apiMetadata)
  public async signOutUser(userContext: UserContext) {
    const params = userContext.params;
    try {
      const {clientUserId, queriedUserId} = await this.extractUserIds(userContext);
      await this.userManager.signOutUser(clientUserId, queriedUserId, userContext.accessToken, userContext.tenantId);
      this.logger.debug('User signed out');
      params.res.sendStatus(HttpStatus.OK);
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.info('Failed to sign out user: ' + errorMessage);
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
    }
  }

  @route.get(UserManagementEndpoints.GET_USER_ATTRIBUTES, GetUserAttributesRequest.apiMetadata)
  public async getUserAttributes(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Getting user attributes...');
    try {
      const {clientUserId, queriedUserId} = await this.extractUserIds(userContext);
      const attributes = await this.userManager.getUserAttributes(clientUserId, queriedUserId, userContext.accessToken, userContext.tenantId);
      this.logger.debug('User attributes fetched:', attributes);
      params.res.status(HttpStatus.OK).send({
        userAttributes: attributes,
      });
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.info('Failed to read user attributes: ' + errorMessage);
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
    }
  }

  @route.post(UserManagementEndpoints.SET_USER_ATTRIBUTES, SetUserAttributesRequest.apiMetadata)
  public async setUserAttributes(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Setting user attributes...');
    try {
      const {clientUserId, queriedUserId} = await this.extractUserIds(userContext);
      const {userAttributes} = params.req.body;
      if (!userAttributes) {
        const errMsg = 'Missing required field: userAttributes is required';
        this.logger.debug(errMsg);
        params.res.status(HttpStatus.BAD_REQUEST).send({
          error: errMsg,
        });
      } else {
        const attributes = await this.userManager.setUserAttributes(clientUserId, queriedUserId,
          userAttributes, userContext.accessToken, userContext.tenantId);
        this.logger.debug('User attributes set:', attributes);
        params.res.sendStatus(HttpStatus.OK);
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.info('Failed to set user attributes: ' + errorMessage);
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
    }
  }

  @route.get(UserManagementEndpoints.GET_USER_INFO, GetUserInfoRequest.apiMetadata)
  public async getUserInfo(userContext: UserContext) {
    this.logger.debug('Getting user info...');
    userContext.params.res.status(HttpStatus.OK).send({
      userInfo: {
        userId: userContext.userId,
        username: userContext.username,
        accessToken: userContext.accessToken,
      }
    });
  }

  @route.get(UserManagementEndpoints.GET_USER_ID, GetUserIdRequest.apiMetadata)
  public async getUserId(userContext: UserContext) {
    const params = userContext.params;
    this.logger.debug('Getting user ID...');
    try {
      const clientUserId = userContext.userId;
      const queriedUsername = params.req.query.username;
      if (queriedUsername != null) {
        const userId = await this.userManager.getUserId(clientUserId, queriedUsername, userContext.accessToken, userContext.tenantId);
        this.logger.debug('User ID fetched:', userId);
        params.res.status(HttpStatus.OK).send({
          userId,
        });
      } else {
        this.logger.debug('Returning own user ID:', clientUserId);
        params.res.status(HttpStatus.OK).send({
          userId: clientUserId,
        });
      }
    } catch (err) {
      const errorMessage = err.code ? err.code + ' - ' + err.message : err;
      this.logger.info('Failed to read user ID: ' + errorMessage);
      params.res.status(HttpStatus.UNAUTHORIZED).send({
        error: UserManagementErrorCodes.UNAUTHORIZED,
      });
    }
  }
}