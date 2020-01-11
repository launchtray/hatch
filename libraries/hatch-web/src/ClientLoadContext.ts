import {Store} from 'redux';

export default class ClientLoadContext {
  constructor(
    public readonly store: Store,
  ) {}
}
