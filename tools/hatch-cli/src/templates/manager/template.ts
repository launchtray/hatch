import {
  inject,
  Logger,
} from '@launchtray/hatch-util';
import {
  ClientLoadContext,
  LocationChangeContext,
  onClientLoad,
  onLocationChange,
  webAppManager,
} from '@launchtray/hatch-web';

@webAppManager()
export default class HATCH_CLI_TEMPLATE_VAR_moduleName {
  constructor(@inject('Logger') private logger: Logger) {

  }

  @onLocationChange(/* TODO: e.g. {path: '/:route'} */)
  public async prepRoute(context: LocationChangeContext<{route: string}>) {

  }

  @onLocationChange(/* TODO: e.g. {path: '/:route'} */)
  public *prepRouteSaga(context: LocationChangeContext<{route: string}>) {

  }

  @onClientLoad()
  public *handleClientLoad() {

  }

  @onClientLoad()
  public *handleClientLoadSaga(context: ClientLoadContext) {

  }
}
