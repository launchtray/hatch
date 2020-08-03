import {inject, injectable, Logger} from '@launchtray/hatch-util';
import fetch from 'cross-fetch';
import {UserManagementClient, UserManagementEndpoints} from './UserManagementClient';
import {UserManagementError} from './UserManagementError';

@injectable()
export class UserManagementClientSdk implements UserManagementClient {
  
  constructor(@inject('Logger') private readonly logger: Logger, @inject('userManagementBaseAPIURL') private readonly userManagementBaseAPIURL: string) {
  }
  
  public async authenticate(username: string, password: string) {
    this.logger.debug('Requesting user authentication...');
    const post = {
      username,
      password,
    };
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.AUTHENTICATE, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request user authentication response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error authenticating user');
    }
    return responseBody;
  }
  
  public async startUserRegistration(username: string, password: string, userAttributes?: {[key: string]: any}) {
    this.logger.debug('Requesting to start user registration...');
    const post = {
      username,
      password,
      userAttributes,
    };
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.START_USER_REGISTRATION, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(post),
    });
    const responseBody = await response.json();
    this.logger.debug('Request to start user registration response body: ' + JSON.stringify(responseBody));
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.RESEND_USER_REGISTRATION, {
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.CONFIRM_USER_REGISTRATION, {
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.START_PASSWORD_RESET, {
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.CONFIRM_PASSWORD_RESET, {
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.REFRESH_AUTHENTICATION, {
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.SIGN_OUT_USER, {
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
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.GET_USER_ATTRIBUTES, {
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
      throw new UserManagementError(responseBody.error, 'Error getting user attributes');
    }
    return responseBody;
  }
  
  public async setUserAttributes(username: string, userAttributes: {[key: string]: any}, accessToken: string) {
    this.logger.debug('Requesting to set user attributes...');
    const post = {
      userAttributes,
    };
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.SET_USER_ATTRIBUTES, {
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
      throw new UserManagementError(responseBody.error, 'Error setting user attributes');
    }
    return responseBody;
  }
  
  public async getUserInfo(accessToken: string) {
    this.logger.debug('Requesting to get user info...');
    let response = await fetch(this.userManagementBaseAPIURL + UserManagementEndpoints.GET_USER_INFO, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + accessToken
      },
    });
    const responseBody = await response.json();
    this.logger.debug('Request to get user info response body: ' + JSON.stringify(responseBody));
    if (!response.ok) {
      throw new UserManagementError(responseBody.error, 'Error getting user info');
    }
    return responseBody;
  }
  
}