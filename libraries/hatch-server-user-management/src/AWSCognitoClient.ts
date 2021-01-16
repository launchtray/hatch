import {CognitoIdentityServiceProvider, CredentialProviderChain, AWSError} from 'aws-sdk';
import fetch from 'cross-fetch';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import {inject, injectable, Logger} from '@launchtray/hatch-util';
import {AttributeListType, ListUserPoolClientsRequest} from 'aws-sdk/clients/cognitoidentityserviceprovider';
import {
  UserAttributes,
  UserManagementClient,
  UserInfo,
  UserManagementClientOptions,
  UserManagementError,
  UserManagementErrorCodes,
} from '@launchtray/hatch-user-management-client';

const convertAWSErrorToUserManagementError = (awsError: AWSError) => {
  if (awsError.code == null) {
    return new UserManagementError(UserManagementErrorCodes.INTERNAL_ERROR, awsError.message);
  }
  const message = awsError.code + ' - ' + awsError.message;
  switch (awsError.code) {
    case 'CodeMismatchException':
      return new UserManagementError(UserManagementErrorCodes.INVALID_CODE, message);
    case 'ExpiredCodeException':
      return new UserManagementError(UserManagementErrorCodes.INVALID_CODE, message);
    case 'InvalidPasswordException':
      return new UserManagementError(UserManagementErrorCodes.INVALID_PASSWORD_FORMAT, message);
    case 'NotAuthorizedException':
      if (awsError.message.includes('Password attempts exceeded')) {
        return new UserManagementError(UserManagementErrorCodes.ACCOUNT_LOCKED, message);
      }
      return new UserManagementError(UserManagementErrorCodes.UNAUTHORIZED, message);

    case 'PasswordResetRequiredException':
      return new UserManagementError(UserManagementErrorCodes.ACCOUNT_LOCKED, message);
    case 'TokenExpiredException':
      return new UserManagementError(UserManagementErrorCodes.EXPIRED_TOKEN, message);
    case 'UsernameExistsException':
      return new UserManagementError(UserManagementErrorCodes.USERNAME_EXISTS, message);
    case 'UserNotConfirmedException':
      return new UserManagementError(UserManagementErrorCodes.USER_NOT_CONFIRMED, message);
    case 'UserNotFoundException':
      return new UserManagementError(UserManagementErrorCodes.USER_NOT_FOUND, message);
    default:
      return new UserManagementError(UserManagementErrorCodes.INTERNAL_ERROR, message);
  }
};

@injectable()
export default class AWSCognitoClient implements UserManagementClient {
  private readonly cognitoProvider = new CognitoIdentityServiceProvider();

  constructor(
    @inject('Logger') private readonly logger: Logger,
    @inject('awsRegion') private readonly awsRegion: string,
    @inject('awsUserPoolId') private readonly awsUserPoolId: string,
    @inject('awsClientId') private readonly awsClientId: string,
  ) {
    this.cognitoProvider.config.update({
      region: this.awsRegion,
      credentialProvider: new CredentialProviderChain(),
    });
    logger.debug('Created AWS cognito client');
  }

  public async authenticate(username: string, password: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      const response = await this.cognitoProvider.adminInitiateAuth({
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      }).promise();
      return {
        accessToken: response.AuthenticationResult?.AccessToken,
        refreshToken: response.AuthenticationResult?.RefreshToken,
      };
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async startUserRegistration(username: string, password: string, userAttributes: UserAttributes, options?: UserManagementClientOptions) {
    const cognitoUserAttributes: AttributeListType = [];
    const userAttributesWithEmail = {
      email: username,
      ...userAttributes,
    };
    Object.keys(userAttributesWithEmail).forEach((key) => {
      cognitoUserAttributes.push({
        Name: key,
        Value: userAttributesWithEmail[key],
      });
    });
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.signUp({
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: cognitoUserAttributes,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async resendUserRegistrationCode(username: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.resendConfirmationCode({
        ClientId: clientId,
        Username: username,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async confirmUserRegistration(username: string, confirmationCode: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.confirmSignUp({
        ClientId: clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async startPasswordReset(username: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      await this.cognitoProvider.adminResetUserPassword({
        UserPoolId: userPoolId,
        Username: username,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async confirmPasswordReset(username: string, confirmationCode: string, password: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.confirmForgotPassword({
        ClientId: clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: password,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async refreshAuthentication(refreshToken: string, accessToken: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      const response = await this.cognitoProvider.adminInitiateAuth({
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'REFRESH_TOKEN',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      }).promise();
      return {
        accessToken: response.AuthenticationResult?.AccessToken,
        refreshToken: response.AuthenticationResult?.RefreshToken,
      };
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async signOutUser(username: string, accessToken: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      await this.cognitoProvider.adminUserGlobalSignOut({
        UserPoolId: userPoolId,
        Username: username,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async getUserAttributes(userId: string, accessToken?: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const response = await this.cognitoProvider.listUsers({
        UserPoolId: userPoolId,
        Limit: 1,
        Filter: 'sub = "' + userId + '"',
      }).promise();
      this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
      const userAttrsResp: {[key: string]: any} = {};
      if (response && response.Users && response.Users.length > 0 && response.Users[0].Attributes) {
        response.Users[0].Attributes.forEach((attr) => (userAttrsResp[attr.Name] = attr.Value));
      } else {
        throw new Error('User not found: ' + userId);
      }
      return userAttrsResp;
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  private async getUserAttributesByUsername(username: string, userPoolId: string): Promise<UserAttributes> {
    this.logger.debug('Getting user by username:', username);
    const response = await this.cognitoProvider.adminGetUser({
      UserPoolId: userPoolId,
      Username: username,
    }).promise();
    this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
    const userAttrsResp: {[key: string]: any} = {};
    if (response && response.UserAttributes) {
      response.UserAttributes.forEach((attr) => (userAttrsResp[attr.Name] = attr.Value));
    } else {
      throw new Error('User not found: ' + username);
    }
    return userAttrsResp;
  }

  public async getUserId(username: string, accessToken: string, options?: UserManagementClientOptions) {
    const userPoolId = options?.tenantId ?? this.awsUserPoolId;
    return (await this.getUserAttributesByUsername(username, userPoolId))!.sub;
  }

  public async setUserAttributes(userId: string, userAttributes: UserAttributes, accessToken: string, options?: UserManagementClientOptions) {
    const userAttributesList: AttributeListType = [];
    const attributes = userAttributes || {};
    Object.keys(attributes).map((key) => {
      userAttributesList.push({
        Name: key,
        Value: attributes[key],
      });
      return userAttributesList;
    });
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const username = (await this.getUserAttributes(userId)).email;
      await this.cognitoProvider.adminUpdateUserAttributes({
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: userAttributesList,
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async getUserInfo(accessToken: string, options: UserManagementClientOptions) {
    if (accessToken == null) {
      throw new Error('Missing access token');
    }
    const pemCerts = await this.getPemCerts(options.tenantId);
    if (pemCerts == null) {
      throw new Error('Missing public keys from AWS Cognito to verify token');
    }
    const decodedJwt: any = jwt.decode(accessToken, {complete: true});
    if (decodedJwt == null) {
      throw new Error('Error decoding token');
    }
    this.logger.debug('Decoded JWT Token: ', decodedJwt);

    if (decodedJwt.payload && decodedJwt.payload.token_use !== 'access') {
      throw new Error('Expected access token but received ' + decodedJwt.payload.token_use + ' token');
    }

    const kid = decodedJwt.header && decodedJwt.header.kid;
    if (kid == null) {
      throw new Error('Missing kid field from token supplied');
    }

    const pem = pemCerts[kid];
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

  private async getPemCerts(provideUserPoolId?: string) {
    const userPoolId = provideUserPoolId ?? this.awsUserPoolId;
    const postFix = '/.well-known/jwks.json';
    const iss = 'https://cognito-idp.' + this.awsRegion + '.amazonaws.com/' + userPoolId;
    const request = iss + postFix;
    const response = await fetch(request, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
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

  private async getClientId(userPoolId: string): Promise<string> {
    if (userPoolId === this.awsUserPoolId) {
      return this.awsClientId;
    }
    const request: ListUserPoolClientsRequest = {
      UserPoolId: userPoolId,
    };
    const response = await this.cognitoProvider.listUserPoolClients(request).promise();
    const userPoolClients = response.UserPoolClients;
    if (userPoolClients?.length !== 1) {
      throw new Error('Expected number of clients is 1 but found: ' + userPoolClients?.length);
    }
    const userPoolClient = userPoolClients[0];
    this.logger.debug('Found user client: {name=' + userPoolClient.ClientName + ',id=' + userPoolClient.ClientId + '}');
    if (userPoolClient.ClientId == null) {
      throw new Error('Unable to find client id for user pool id: ' + userPoolClient.UserPoolId);
    }
    return userPoolClient.ClientId;
  }

}