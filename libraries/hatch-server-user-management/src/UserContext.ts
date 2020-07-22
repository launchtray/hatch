import {BasicRouteParams} from '@launchtray/hatch-server-middleware';
import {containerSingleton, initializer, Logger} from '@launchtray/hatch-util';
import UserInfoRequest from './UserInfoRequest';

@containerSingleton()
export default class UserContext {
  public readonly logger: Logger;
  public userId: string = '';
  public username: string = '';
  public accessToken: string = '';
  public error?: Error;

  constructor(public readonly params: BasicRouteParams, private readonly request: UserInfoRequest) {
    this.logger = params.logger;
  }

  @initializer()
  private async init() {
    try {
      const userInfo = await this.request.getUserInfo();
      this.userId = userInfo?.userId ?? '';
      this.username = userInfo?.username ?? '';
      this.accessToken = userInfo?.accessToken ?? '';
    } catch (error) {
      // We should never get here, as UserManagementController will have already retrieved userInfo
      this.error = error;
      this.params.res.status(500).send({
        error,
      });
    }
  }
}