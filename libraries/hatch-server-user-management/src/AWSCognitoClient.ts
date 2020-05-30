import UserServiceClient, {UserInfo} from './UserServiceClient';
import {
  AWS_ACCESS_KEY_ID,
  AWS_CLIENT_ID,
  AWS_USER_POOL_ID,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY
} from './constants';
import {config, CognitoIdentityServiceProvider} from 'aws-sdk';
import fetch from 'cross-fetch';
import jwt from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import {inject, Logger} from '@launchtray/hatch-util';
import {injectable} from '@launchtray/hatch-util/dist';
import {AttributeListType} from 'aws-sdk/clients/cognitoidentityserviceprovider';

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
    }).promise();
    return {
      accessToken: response.AuthenticationResult?.AccessToken,
      refreshToken: response.AuthenticationResult?.RefreshToken,
    }
  }
  
  public async signUpUser(username: string, password: string, userAttributes?: {[key: string]: any}) {
    let cognitoUserAttributes: AttributeListType = [];
    for (const key in userAttributes) {
      cognitoUserAttributes.push({
        Name: key,
        Value: userAttributes[key],
      });
    };
    await this.cognitoProvider.signUp({
      ClientId: AWS_CLIENT_ID as string,
      Username: username,
      Password: password,
      UserAttributes: cognitoUserAttributes,
    }).promise();
  }
  
  public async confirmUser(username: string, confirmationCode: string) {
    await this.cognitoProvider.confirmSignUp({
      ClientId: AWS_CLIENT_ID as string,
      Username: username,
      ConfirmationCode: confirmationCode,
    }).promise();
  }
  
  public async resetPassword(username: string) {
    await this.cognitoProvider.adminResetUserPassword({
      UserPoolId: AWS_USER_POOL_ID as string,
      Username: username,
    }).promise();
  }
  
  public async refreshToken(refreshToken: string) {
    const response = await this.cognitoProvider.adminInitiateAuth({
      UserPoolId: AWS_USER_POOL_ID as string,
      ClientId: AWS_CLIENT_ID as string,
      AuthFlow: 'REFRESH_TOKEN',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }).promise();
    return {
      accessToken: response.AuthenticationResult?.AccessToken,
      refreshToken: response.AuthenticationResult?.RefreshToken,
    }
  }
  
  public async getUserAttrsBySubjectId(subjectId: string) {
    const filter = 'sub = "' + subjectId + '"';
    const response = await this.cognitoProvider.listUsers({
      Filter: filter,
      UserPoolId: AWS_USER_POOL_ID as string
    }).promise();
    this.logger.debug('Fetched user attributes: ' + JSON.stringify(response));
    const user = response.Users && response.Users[0];
    const userAttrsResp: {[key: string]: any} = {};
    if (user && user.Attributes) {
      user.Attributes.forEach((attr) => (userAttrsResp[attr.Name] = attr.Value));
    }
    return userAttrsResp;
  }
  
  public async verifyToken(accessToken: string) {
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
    
    const userInfo = new UserInfo();
    userInfo.isAuthenticated = true;
    userInfo.accessToken = accessToken;
    userInfo.username = decodedJwt.payload && decodedJwt.payload.username;
    userInfo.userId = decodedJwt.payload && decodedJwt.payload.sub;
    return userInfo;
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
  
}