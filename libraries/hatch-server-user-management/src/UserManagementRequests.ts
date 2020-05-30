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

export class SignUpUserRequest {
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

export class ReSendSignUpUserRequest {
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

export class ConfirmUserRequest {
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

export class ForgotPasswordRequest {
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

export class ConfirmForgotPasswordRequest {
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

export class RefreshTokenRequest {
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

export class SignOutRequest {
  public static apiMetadata: APIMetadataParameters = {
    requestBody: {
      description: 'Sign\'s out a user',
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

