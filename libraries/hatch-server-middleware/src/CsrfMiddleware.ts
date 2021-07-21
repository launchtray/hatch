import {ServerMiddleware} from '@launchtray/hatch-server';
import {injectable} from '@launchtray/hatch-util';
import {Application, NextFunction, Response, Request} from 'express';
import cookie from 'cookie';
import createHttpError from 'http-errors';
import {StatusCodes} from 'http-status-codes';

@injectable()
export default class CsrfMiddleware implements ServerMiddleware {
  public async register(app: Application) {
    app.use(csrfCheck);
  }
}

export const isMethodSideEffectSafe = (method: string): boolean => {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
};

export const isCsrfSafe = (req: Request): boolean => {
  // If the auth header is set, this cannot be CSRF, since an attacker cannot set headers
  if (req.headers.authorization != null && req.headers.authorization !== '') {
    return true;
  }
  // If bypass header is set, this cannot be CSRF, since an attacker cannot set headers
  const bypassDSCHeader = req.header('x-bypass-csrf-check');
  const bypassDSC = (bypassDSCHeader != null && bypassDSCHeader.toLocaleLowerCase() === 'true');
  if (bypassDSC) {
    return true;
  }
  // Method is (supposed to be) safe. If the request has side effects, the application is flawed.
  if (isMethodSideEffectSafe(req.method)) {
    return true;
  }
  // Otherwise, guard against CRSF via a double-submit cookie
  let cookies = null;
  if (req.headers.cookie != null) {
    cookies = cookie.parse(req.headers.cookie);
  }
  const doubleSubmitCookie = cookies?.double_submit;
  const doubleSubmitParam = req.body.doubleSubmitCookie;
  return (
    doubleSubmitCookie != null
    && doubleSubmitCookie !== ''
    && doubleSubmitCookie === doubleSubmitParam
  );
};

const csrfCheck = (req: Request, res: Response, next: NextFunction) => {
  if (isCsrfSafe(req)) {
    next();
  } else {
    const errMsg = 'Rejecting request due to CSRF check';
    // eslint-disable-next-line no-console
    console.error(errMsg);
    next(createHttpError(StatusCodes.UNAUTHORIZED, errMsg));
  }
};
