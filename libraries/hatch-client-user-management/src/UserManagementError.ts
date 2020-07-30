export enum UserManagementErrorCodes {
  ACCOUNT_LOCKED = 'AccountLocked',
  EXPIRED_TOKEN = 'ExpiredToken',
  INVALID_CODE = 'InvalidCode',
  INVALID_PASSWORD_FORMAT = 'InvalidPasswordFormat',
  INTERNAL_ERROR = 'InternalError',
  UNAUTHORIZED = 'Unauthorized',
  USERNAME_EXISTS = 'UsernameExists',
  USER_NOT_CONFIRMED = 'UserNotConfirmed',
  USER_NOT_FOUND = 'UserNotFound',
}

export class UserManagementError extends Error {
  constructor(readonly code: string, readonly message: string) {
    super(message);
  };
}