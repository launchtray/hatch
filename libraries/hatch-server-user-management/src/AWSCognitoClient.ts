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

// eslint-disable-next-line complexity -- simple enum conversion
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
        /* eslint-disable @typescript-eslint/naming-convention */
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
      return {
        accessToken: response.AuthenticationResult?.AccessToken,
        refreshToken: response.AuthenticationResult?.RefreshToken,
      };
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async startUserRegistration(
    username: string,
    password: string,
    userAttributes: UserAttributes,
    options?: UserManagementClientOptions,
  ) {
    const cognitoUserAttributes: AttributeListType = [];
    const userAttributesWithEmail = {
      email: username,
      ...userAttributes,
    };
    Object.keys(userAttributesWithEmail).forEach((key) => {
      cognitoUserAttributes.push({
        /* eslint-disable @typescript-eslint/naming-convention */
        Name: key,
        Value: userAttributesWithEmail[key],
        /* eslint-enable @typescript-eslint/naming-convention */
      });
    });
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.signUp({
        /* eslint-disable @typescript-eslint/naming-convention */
        ClientId: clientId,
        Username: username,
        Password: password,
        UserAttributes: cognitoUserAttributes,
        /* eslint-enable @typescript-eslint/naming-convention */
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
        /* eslint-disable @typescript-eslint/naming-convention */
        ClientId: clientId,
        Username: username,
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async confirmUserRegistration(
    username: string,
    confirmationCode: string,
    options?: UserManagementClientOptions,
  ) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.confirmSignUp({
        /* eslint-disable @typescript-eslint/naming-convention */
        ClientId: clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async startPasswordReset(username: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      await this.cognitoProvider.adminResetUserPassword({
        /* eslint-disable @typescript-eslint/naming-convention */
        UserPoolId: userPoolId,
        Username: username,
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async confirmPasswordReset(
    username: string,
    confirmationCode: string,
    password: string,
    options?: UserManagementClientOptions,
  ) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      await this.cognitoProvider.confirmForgotPassword({
        /* eslint-disable @typescript-eslint/naming-convention */
        ClientId: clientId,
        Username: username,
        ConfirmationCode: confirmationCode,
        Password: password,
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async refreshAuthentication(
    refreshToken: string,
    accessToken?: string,
    options?: UserManagementClientOptions,
  ) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const clientId = await this.getClientId(userPoolId);
      const response = await this.cognitoProvider.adminInitiateAuth({
        /* eslint-disable @typescript-eslint/naming-convention */
        UserPoolId: userPoolId,
        ClientId: clientId,
        AuthFlow: 'REFRESH_TOKEN',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
        /* eslint-enable @typescript-eslint/naming-convention */
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
        /* eslint-disable @typescript-eslint/naming-convention */
        UserPoolId: userPoolId,
        Username: username,
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
    } catch (err) {
      throw convertAWSErrorToUserManagementError(err);
    }
  }

  public async getUserAttributes(userId: string, accessToken?: string, options?: UserManagementClientOptions) {
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const response = await this.cognitoProvider.listUsers({
        /* eslint-disable @typescript-eslint/naming-convention */
        UserPoolId: userPoolId,
        Limit: 1,
        Filter: 'sub = "' + userId + '"',
        /* eslint-enable @typescript-eslint/naming-convention */
      }).promise();
      this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
      const userAttrsResp: Record<string, unknown> = {};
      if (response && response.Users && response.Users.length > 0 && response.Users[0].Attributes) {
        response.Users[0].Attributes.forEach((attr) => {
          userAttrsResp[attr.Name] = attr.Value;
        });
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
      /* eslint-disable @typescript-eslint/naming-convention */
      UserPoolId: userPoolId,
      Username: username,
      /* eslint-enable @typescript-eslint/naming-convention */
    }).promise();
    this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
    const userAttrsResp: Record<string, unknown> = {};
    if (response && response.UserAttributes) {
      response.UserAttributes.forEach((attr) => {
        userAttrsResp[attr.Name] = attr.Value;
      });
    } else {
      throw new Error('User not found: ' + username);
    }
    return userAttrsResp;
  }

  public async getUserId(username: string, accessToken: string, options?: UserManagementClientOptions) {
    const userPoolId = options?.tenantId ?? this.awsUserPoolId;
    return (await this.getUserAttributesByUsername(username, userPoolId))?.sub as string;
  }

  public async setUserAttributes(
    userId: string,
    userAttributes: UserAttributes,
    accessToken: string,
    options?: UserManagementClientOptions,
  ) {
    const userAttributesList: AttributeListType = [];
    const attributes = userAttributes || {};
    Object.keys(attributes).map((key) => {
      userAttributesList.push({
        /* eslint-disable @typescript-eslint/naming-convention */
        Name: key,
        Value: attributes[key] as string,
        /* eslint-enable @typescript-eslint/naming-convention */
      });
      return userAttributesList;
    });
    try {
      const userPoolId = options?.tenantId ?? this.awsUserPoolId;
      const username = (await this.getUserAttributes(userId)).email as string;
      await this.cognitoProvider.adminUpdateUserAttributes({
        /* eslint-disable @typescript-eslint/naming-convention */
        UserPoolId: userPoolId,
        Username: username,
        UserAttributes: userAttributesList,
        /* eslint-enable @typescript-eslint/naming-convention */
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
    const decodedJwt = jwt.decode(accessToken, {complete: true}) as Record<string, unknown>;
    if (decodedJwt == null) {
      throw new Error('Error decoding token');
    }
    this.logger.debug('Decoded JWT Token: ', decodedJwt);

    const payload = decodedJwt.payload as Record<string, unknown>;
    if (payload && payload.token_use !== 'access') {
      throw new Error('Expected access token but received ' + payload.token_use + ' token');
    }

    const header = decodedJwt.header as Record<string, unknown>;
    const kid = header && header.kid as string;
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

    const username = payload?.username as string;
    const userId = payload?.sub as string;
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
        /* eslint-disable @typescript-eslint/naming-convention */
        'Content-Type': 'application/json',
        Accept: 'application/json',
        /* eslint-enable @typescript-eslint/naming-convention */
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
      /* eslint-disable @typescript-eslint/naming-convention */
      UserPoolId: userPoolId,
      /* eslint-enable @typescript-eslint/naming-convention */
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