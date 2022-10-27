import {
  ROOT_CONTAINER,
} from '@launchtray/hatch-util';
import {
  registerRemoteApis,
} from '@launchtray/example-client-sdk';
import {WebClientComposition} from '@launchtray/hatch-web-client';
import composeCommon from './composeCommon';

const appName = process.env.APP_NAME ?? 'hatch-client';

export default async (): Promise<WebClientComposition> => {
  ROOT_CONTAINER.register('appName', {useValue: appName});

  registerRemoteApis(ROOT_CONTAINER);

  const commonComposition = await composeCommon();
  return {
    ...commonComposition,
  };
};
