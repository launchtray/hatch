import {inject, injectable, Logger} from '@launchtray/hatch-util';
import {WEB_SERVICES_URL} from './constants';
import fetch from 'cross-fetch';
import {UserServiceClient, UserServiceClientEndpoint} from './UserServiceClient';
import {UserManagementError} from './UserManagementError';

@injectable()
export class UserServiceClientSdk implements Omit<UserServiceClient, 'getUserInfo'> {
  private readonly baseAPIURL: string;
  
  constructor(@inject('Logger') private readonly logger: Logger) {
    this.baseAPIURL = WEB_SERVICES_URL as string;
  }
  
  public async authenticate(username: string, password: string) {
    this.logger.debug('Authenticating user...');
    const post = {
      username,
      password,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.AUTHENTICATE, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Authentication of user response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error authenticating user');
    }
    return responseBody;
  }
  
  public async startUserRegistration(username: string, password: string, userAttributes?: {[key: string]: any}) {
    this.logger.debug('Starting user registration...');
    const post = {
      username,
      password,
      userAttributes,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.START_USER_REGISTRATION, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Start user registration response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error starting user registration');
    }
    return responseBody;
  }
  
  public async resendUserRegistrationCode(username: string) {
    this.logger.debug('Requesting to resend user registration code...');
    const post = {
      username,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.RESEND_USER_REGISTRATION, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to resend user registration code response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error resending user registration code');
    }
    return responseBody;
  }
  
  public async confirmUserRegistration(username: string, confirmationCode: string) {
    this.logger.debug('Requesting confirmation of user registration...');
    const post = {
      username,
      confirmationCode,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.CONFIRM_USER_REGISTRATION, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to confirm user registration response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error confirming user registration');
    }
    return responseBody;
  }
  
  public async startPasswordReset(username: string) {
    this.logger.debug('Requesting to start user password reset...');
    const post = {
      username,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.START_PASSWORD_RESET, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to start user password reset response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error starting password reset');
    }
    return responseBody;
  }
  
  public async confirmPasswordReset(username: string, confirmationCode: string, password: string) {
    this.logger.debug('Requesting to confirm user password reset...');
    const post = {
      username,
      confirmationCode,
      password,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.CONFIRM_PASSWORD_RESET, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to confirm user password reset response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error confirming password reset');
    }
    return responseBody;
  }
  
  public async refreshAuthentication(refreshToken: string, accessToken: string) {
    this.logger.debug('Requesting to refresh user authentication...');
    const post = {
      refreshToken,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.REFRESH_AUTHENTICATION, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to refresh user authentication response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error refreshing user authentication');
    }
    return responseBody;
  }
  
  public async signOutUser(username: string, accessToken: string) {
    this.logger.debug('Requesting to sign out user...');
    const post = {
      username,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.SIGN_OUT_USER, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to sign out user response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error signing out user');
    }
    return responseBody;
  }
  
  public async getUserAttributes(username: string, accessToken: string) {
    this.logger.debug('Requesting to get user attributes...');
    const post = {
      username,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.GET_USER_ATTRIBUTES, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to get user attributes response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new Error(responseBody.error);
    }
    return responseBody;
  }
  
  public async setUserAttributes(username: string, userAttributes: {[key: string]: any}, accessToken?: string) {
    this.logger.debug('Requesting to set user attributes...');
    const post = {
      username,
    };
    let response = await fetch(this.baseAPIURL + UserServiceClientEndpoint.SET_USER_ATTRIBUTES, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to set user attributes response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new Error(responseBody.error);
    }
    return responseBody;
  }
  
}