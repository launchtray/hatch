export const PREVENT_DEFAULT_RESPONSE_CODE = Symbol('@launchtray/hatch-sdk-generator#preventControllerResponse');
export const ALT_ACTION_CODE_KEY: unique symbol = Symbol('@launchtray/hatch-sdk-generator#altActionCodeKey');
export const ALT_ACTION_KEY: unique symbol = Symbol('@launchtray/hatch-sdk-generator#altActionKey');

export class ApiAlternateAction {
  public readonly [ALT_ACTION_CODE_KEY]: number | symbol;
  public readonly status: number | undefined;

  constructor(
    code: number | symbol,
    public readonly body?: unknown, // ReadableStream or anything supported by Response.send (string, object, etc.)
    public readonly headers?: Record<string, unknown>,
  ) {
    this[ALT_ACTION_CODE_KEY] = code;
    this.status = getStatusCode(this);
  }
}

export class ApiError extends Error {
  public readonly [ALT_ACTION_KEY]: ApiAlternateAction;
  public readonly alternateAction: ApiAlternateAction;
  public readonly status: number | undefined;

  constructor(alternateAction: ApiAlternateAction, message?: string) {
    super(message);
    this[ALT_ACTION_KEY] = alternateAction;
    this.alternateAction = alternateAction;
    this.status = getStatusCode(alternateAction);
  }
}

export const preventsDefaultResponse = (err: ApiAlternateAction) => {
  return err[ALT_ACTION_CODE_KEY] === PREVENT_DEFAULT_RESPONSE_CODE;
};

export const PREVENT_DEFAULT_RESPONSE = new ApiAlternateAction(PREVENT_DEFAULT_RESPONSE_CODE);

export const getStatusCode = (err: ApiAlternateAction): number | undefined => {
  const statusCode = err[ALT_ACTION_CODE_KEY];
  if (typeof statusCode === 'number') {
    return statusCode;
  }
  return undefined;
};

export const getAlternateAction = (err: ApiError): ApiAlternateAction => {
  return err[ALT_ACTION_KEY];
};

export const isApiAlternateAction = (response: unknown): response is ApiAlternateAction => {
  if (response == null) {
    return false;
  }
  return ((response as ApiAlternateAction)[ALT_ACTION_CODE_KEY] != null);
};

export const isApiError = (error: unknown): error is ApiError => {
  return ((error as ApiError)[ALT_ACTION_KEY] != null);
};

export type ApiDelegateResponse<T> = Promise<T | ApiAlternateAction> | T | ApiAlternateAction;

export const isStream = (value: unknown) => value != null && (value as {pipeTo?: unknown}).pipeTo != null;
