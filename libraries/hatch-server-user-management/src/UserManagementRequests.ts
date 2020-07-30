import {APIMetadataParameters} from '@launchtray/hatch-server';

export class AuthenticateRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Authenticates a user and retrieves valid access and refresh tokens',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'username',
              'password',
            ],
            properties: {
              username: {
                type: 'string'
              },
              password: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  };
}

export class StartUserRegistrationRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Sign\'s up a user account',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'username',
              'password',
            ],
            properties: {
              username: {
                type: 'string'
              },
              password: {
                type: 'string'
              },
              userAttributes: {
                type: 'object'
              }
            }
          }
        }
      }
    }
  };
}

export class ResendUserRegistrationCodeRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Creates a user account',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'username',
            ],
            properties: {
              username: {
                type: 'string'
              },
            }
          }
        }
      }
    }
  };
}

export class ConfirmUserRegistrationRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Confirms a user account',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'username',
              'confirmationCode',
            ],
            properties: {
              username: {
                type: 'string'
              },
              confirmationCode: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  };
}

export class StartPasswordResetRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Resets a user account password',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'username',
            ],
            properties: {
              username: {
                type: 'string'
              },
            }
          }
        }
      }
    }
  };
}

export class ConfirmPasswordResetRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Resets a user account password',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'username',
              'confirmationCode',
              'password',
            ],
            properties: {
              username: {
                type: 'string'
              },
              confirmationCode: {
                type: 'string'
              },
              password: {
                type: 'string'
              },
            }
          }
        }
      }
    }
  };
}

export class RefreshAuthenticationRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Refreshes a user\'s access token',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: [
              'refreshToken',
            ],
            properties: {
              refreshToken: {
                type: 'string'
              },
            }
          }
        }
      }
    }
  };
}

export class SignOutUserRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Signs out a user',
      content: {
        'application/json': {
          schema: {
            type: 'object',
          }
        }
      }
    }
  };
}

export class SetUserAttributesRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Set\'s a user\'s attributes',
      content: {
        'application/json': {
          schema: {
            type: 'object',
            userAttributes: [
              'username',
              'password',
            ],
            properties: {
              userAttributes: {
                type: 'object'
              }
            }
          }
        }
      }
    }
  };
}

