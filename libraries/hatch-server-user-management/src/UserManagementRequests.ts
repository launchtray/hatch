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
    tags: [
      'User Management Service'
    ],
    operationId: 'authenticate',
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
    },
    responses: {
      '200': {
        description: 'The authenticated user\'s auth tokens',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string'
                },
                refreshToken: {
                  type: 'string'
                },
              }
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
    tags: [
      'User Management Service'
    ],
    operationId: 'startUserRegistration',
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
    description: 'Resend user registration code',
    tags: [
      'User Management Service'
    ],
    operationId: 'resendUserRegistrationCode',
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
    description: 'Confirms a user registration',
    tags: [
      'User Management Service'
    ],
    operationId: 'confirmUserRegistration',
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
    tags: [
      'User Management Service'
    ],
    operationId: 'startPasswordReset',
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
    description: 'Confirms a users password reset',
    tags: [
      'User Management Service'
    ],
    operationId: 'confirmPasswordReset',
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
    tags: [
      'User Management Service'
    ],
    operationId: 'refreshAuthentication',
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
    },
    responses: {
      '200': {
        description: 'The authenticated user\'s auth tokens',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string'
                },
                refreshToken: {
                  type: 'string'
                },
              }
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
    tags: [
      'User Management Service'
    ],
    operationId: 'signOutUser',
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
    tags: [
      'User Management Service'
    ],
    operationId: 'setUserAttributes',
    requestBody: {
      content: {
        'application/json': {
          schema: {
            type: 'object',
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
    tags: [
      'User Management Service'
    ],
    operationId: 'getUserAttributes',
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
    responses: {
      '200': {
        description: 'User Attributes object',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              additionalProperties: true,
            }
          }
        }
      }
    }
  };
}

export class GetUserIdRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Gets a user\'s ID',
    tags: [
      'User Management Service'
    ],
    operationId: 'getUserId',
    parameters: {
      username: {
        in: 'query',
        required: false,
        description: 'The username of the user whose ID should be returned',
      },
    },
    responses: {
      '200': {
        description: 'The user ID',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: [
                'userId',
              ],
              properties: {
                userId: {
                  type: 'string'
                }
              }
            }
          }
        }
      }
    }
  };
}

export class GetUserInfoRequest {
  public static apiMetadata: APIMetadataParameters = {
    description: 'Gets a user\'s info',
    tags: [
      'User Management Service'
    ],
    operationId: 'getUserInfo',
    responses: {
      '200': {
        description: 'The user info',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              required: [
                'userId',
                'username',
                'accessToken'
              ],
              properties: {
                userId: {
                  type: 'string'
                },
                username: {
                  type: 'string'
                },
                accessToken: {
                  type: 'string'
                },
              }
            }
          }
        }
      }
    }
  };
}