import UserServiceClient, {UserInfo} from './UserServiceClient';
import {AWS_ACCESS_KEY_ID, AWS_CLIENT_ID, AWS_REGION, AWS_SECRET_ACCESS_KEY, AWS_USER_POOL_ID} from './constants';
import {CognitoIdentityServiceProvider, config} from 'aws-sdk';
import fetch from 'cross-fetch';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import {inject, Logger} from '@launchtray/hatch-util';
import {injectable} from '@launchtray/hatch-util/dist';
import {AttributeListType} from 'aws-sdk/clients/cognitoidentityserviceprovider';
import {UserManagementError, UserManagementErrorCodes} from './UserManagementError';
import {AWSError} from 'aws-sdk';

@injectable()
export default class AWSCognitoClient implements UserServiceClient {
  private readonly iss: string;
  private pemCerts: {} | undefined;
  private readonly cognitoProvider = new CognitoIdentityServiceProvider();
  
  constructor(@inject('Logger') private readonly logger: Logger) {
    this.iss = 'https://cognito-idp.' + AWS_REGION + '.amazonaws.com/' + AWS_USER_POOL_ID;
    config.update({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
      region: AWS_REGION,
    });
  }
  
  public async authenticate(username: string, password: string) {
    const response = await this.cognitoProvider.adminInitiateAuth({
      UserPoolId: AWS_USER_POOL_ID as string,
      ClientId: AWS_CLIENT_ID as string,
      AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
    return {
      accessToken: response.AuthenticationResult?.AccessToken,
      refreshToken: response.AuthenticationResult?.RefreshToken,
    }
  }
  
  public async startUserRegistration(username: string, password: string, userAttributes?: {[key: string]: any}) {
    let cognitoUserAttributes: AttributeListType = [];
    for (const key in userAttributes) {
      if (userAttributes) {
        cognitoUserAttributes.push({
          Name: key,
          Value: userAttributes[key],
        });
      }
    }
    await this.cognitoProvider.signUp({
      ClientId: AWS_CLIENT_ID as string,
      Username: username,
      Password: password,
      UserAttributes: cognitoUserAttributes,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async resendUserRegistrationCode(username: string) {
    await this.cognitoProvider.resendConfirmationCode({
      ClientId: AWS_CLIENT_ID as string,
      Username: username,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async confirmUserRegistration(username: string, confirmationCode: string) {
    await this.cognitoProvider.confirmSignUp({
      ClientId: AWS_CLIENT_ID as string,
      Username: username,
      ConfirmationCode: confirmationCode,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async startPasswordReset(username: string) {
    await this.cognitoProvider.adminResetUserPassword({
      UserPoolId: AWS_USER_POOL_ID as string,
      Username: username,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async confirmPasswordReset(username: string, confirmationCode: string, password: string) {
    await this.cognitoProvider.confirmForgotPassword({
      ClientId: AWS_CLIENT_ID as string,
      Username: username,
      ConfirmationCode: confirmationCode,
      Password: password,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async refreshAuthentication(refreshToken: string) {
    const response = await this.cognitoProvider.adminInitiateAuth({
      UserPoolId: AWS_USER_POOL_ID as string,
      ClientId: AWS_CLIENT_ID as string,
      AuthFlow: 'REFRESH_TOKEN',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
    return {
      accessToken: response.AuthenticationResult?.AccessToken,
      refreshToken: response.AuthenticationResult?.RefreshToken,
    }
  }
  
  public async signOutUser(username: string) {
    await this.cognitoProvider.adminUserGlobalSignOut({
      UserPoolId: AWS_USER_POOL_ID as string,
      Username: username,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async getUserAttributesById(subjectId: string) {
    const filter = 'sub = "' + subjectId + '"';
    const response = await this.cognitoProvider.listUsers({
      Filter: filter,
      UserPoolId: AWS_USER_POOL_ID as string
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
    this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
    const user = response.Users && response.Users[0];
    const userAttrsResp: {[key: string]: any} = {};
    if (user && user.Attributes) {
      user.Attributes.forEach((attr) => (userAttrsResp[attr.Name] = attr.Value));
    }
    return userAttrsResp;
  }
  
  public async getUserAttributes(username: string) {
    const response = await this.cognitoProvider.adminGetUser({
      UserPoolId: AWS_USER_POOL_ID as string,
      Username: username,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
    this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
    const userAttrsResp: {[key: string]: any} = {};
    if (response && response.UserAttributes) {
      response.UserAttributes.forEach((attr) => (userAttrsResp[attr.Name] = attr.Value));
    }
    return userAttrsResp;
  }
  
  public async setUserAttributes(username: string, userAttributes: {[key: string]: any}) {
    const userAttributesList: AttributeListType = [];
    Object.keys(userAttributes).map((key) => {
      userAttributesList.push({
        Name: key,
        Value: userAttributes[key]
      });
      return userAttributesList;
    });
    await this.cognitoProvider.adminUpdateUserAttributes({
      UserPoolId: AWS_USER_POOL_ID as string,
      Username: username,
      UserAttributes: userAttributesList,
    }).promise().catch((err) => {
      throw this.convertAWSErrorToUserManagementError(err);
    });
  }
  
  public async getUserInfo(accessToken: string) {
    await this.requirePublicKeys();
    if (!this.pemCerts) {
      throw new Error('Missing public keys from AWS Cognito to verify token');
    }
    const decodedJwt: any = jwt.decode(accessToken, {complete: true});
    if (!decodedJwt) {
      throw new Error('Error decoding token');
    }
    this.logger.debug('Decoded JWT Token: ', decodedJwt);
  
    if (decodedJwt.payload && decodedJwt.payload.token_use !== 'access') {
      throw new Error('Expected access token but received ' + decodedJwt.payload.token_use + ' token');
    }
    
    const kid = decodedJwt.header && decodedJwt.header.kid;
    if (!kid) {
      throw new Error('Missing kid field from token supplied');
    }
    
    const pem = this.pemCerts[kid];
    try {
      jwt.verify(accessToken, pem);
    } catch (err) {
      this.logger.error('Error verifying token: ', err);
      throw err;
    }

    const username = decodedJwt.payload && decodedJwt.payload.username;
    const userId = decodedJwt.payload && decodedJwt.payload.sub;
    return new UserInfo(userId, username, accessToken);
  }
  
  private async requirePublicKeys() {
    if (!this.pemCerts) {
      this.pemCerts = await this.getPublicKeys();
    }
  }
  
  private async getPublicKeys() {
    const postFix = '/.well-known/jwks.json';
    const request = this.iss + postFix;
    const response = await fetch(request, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
    const responseBody = await response.json();
    const pemCerts = {};
    if (responseBody && responseBody.keys) {
      for (const key of responseBody.keys) {
        const keyId = key.kid;
        const modulus = key.n;
        const exponent = key.e;
        const keyType = key.kty;
        const jwk = {kty: keyType, n: modulus, e: exponent};
        pemCerts[keyId] = jwkToPem(jwk);
        this.logger.debug('Public key [' + keyId + '] decoded: ', pemCerts[keyId]);
      }
    }
    return pemCerts;
  }
  
  private convertAWSErrorToUserManagementError(awsError: AWSError) {
    switch (awsError.code) {
      case 'CodeMismatchException' || 'ExpiredCodeException': {
        return new UserManagementError(UserManagementErrorCodes.INVALID_CODE, awsError.message);
      }
      case 'InvalidPasswordException': {
        return new UserManagementError(UserManagementErrorCodes.INVALID_PASSWORD, awsError.message);
      }
      case 'NotAuthorizedException': {
        if (awsError.message.includes('Password attempts exceeded')) {
          return new UserManagementError(UserManagementErrorCodes.ACCOUNT_LOCKED, awsError.message);
        } else {
          return new UserManagementError(UserManagementErrorCodes.UNAUTHORIZED, awsError.message);
        }
      }
      case 'PasswordResetRequiredException': {
        return new UserManagementError(UserManagementErrorCodes.ACCOUNT_LOCKED, awsError.message);
      }
      case 'TokenExpiredException': {
        return new UserManagementError(UserManagementErrorCodes.EXPIRED_TOKEN, awsError.message);
      }
      case 'UsernameExistsException': {
        return new UserManagementError(UserManagementErrorCodes.USERNAME_EXISTS, awsError.message);
      }
      case 'UserNotConfirmedException': {
        return new UserManagementError(UserManagementErrorCodes.USER_NOT_CONFIRMED, awsError.message);
      }
      case 'UserNotFoundException': {
        return new UserManagementError(UserManagementErrorCodes.USER_NOT_FOUND, awsError.message);
      }
      default: {
        return new UserManagementError(UserManagementErrorCodes.INTERNAL_ERROR, awsError.message);
      }
    }
  };
  
}