import {inject, containerSingleton} from '@launchtray/hatch-util';
import {Store} from 'redux';

@containerSingleton()
export default class ClientLoadContext {
  constructor(
    @inject('Store') public readonly store: Store,
    @inject('cookie') public readonly cookie: string,
    @inject('authHeader') public readonly authHeader: string,
  ) {}
}
