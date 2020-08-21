import {APIMetadataParameters} from '@launchtray/hatch-server';

export const addCsrfCheckApiMetadata = (metadataParams: APIMetadataParameters) => {
  if (metadataParams.parameters == null) {
    metadataParams.parameters = {};
  }
  if (metadataParams.requestBody == null) {
    metadataParams.requestBody = {
      description: '',
      content: {},
    };
  }
  if (metadataParams.requestBody.content['application/json'] == null) {
    metadataParams.requestBody.content['application/json'] = {
      schema: {},
    };
  }
  if (metadataParams.requestBody.content['application/json'].schema.properties == null) {
    metadataParams.requestBody.content['application/json'].schema.properties = {};
  }
  metadataParams.parameters['x-bypass-csrf-check'] = {
    in: 'header',
    required: false,
    description: 'Header for disabling CSRF check',
    schema: {
      type: 'string',
      enum: ['true', 'false'],
      default: 'true',
    },
  };
  metadataParams.requestBody.content['application/json'].schema.properties.doubleSubmitCookie = {
    type: 'string',
  };
};

export class AuthenticateRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Authenticates a user and retrieves valid access and refresh tokens',
    requestBody: {
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
            }
          }
        }
      }
    }
  };
}

addCsrfCheckApiMetadata(AuthenticateRequest.apiMetadata);

export class StartUserRegistrationRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Sign\'s up a user account',
    requestBody: {
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
    description: 'Creates a user account',
    requestBody: {
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
    description: 'Confirms a user account',
    requestBody: {
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
    description: 'Resets a user account password',
    requestBody: {
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
    description: 'Resets a user account password',
    requestBody: {
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
    description: 'Refreshes a user\'s access token',
    requestBody: {
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

addCsrfCheckApiMetadata(RefreshAuthenticationRequest.apiMetadata);

export class SignOutUserRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Signs out a user',
    requestBody: {
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

addCsrfCheckApiMetadata(SignOutUserRequest.apiMetadata);

export class SetUserAttributesRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Sets a user\'s attributes',
    requestBody: {
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

addCsrfCheckApiMetadata(SetUserAttributesRequest.apiMetadata);

export class GetUserAttributesRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Gets a user\'s attributes',
    parameters: {
      userId: {
        in: 'query',
        required: false,
        description: 'The ID of the user whose attributes should be returned',
      },
      username: {
        in: 'query',
        required: false,
        description: 'The username of the user whose attributes should be returned',
      },
    },
  };
}

export class GetUserIdRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Gets a user\'s ID',
    parameters: {
      username: {
        in: 'query',
        required: false,
        description: 'The username of the user whose ID should be returned',
      },
    },
  };
}