import {
  ROOT_CONTAINER,
} from '@launchtray/hatch-util';
import {WebClientComposition} from '@launchtray/hatch-web-client';
import composeCommon from './composeCommon';

const appName = process.env.APP_NAME ?? 'hatch-client';

export default async (): Promise<WebClientComposition> => {
  ROOT_CONTAINER.register('appName', {useValue: appName});

  const commonComposition = await composeCommon();
  return {
    ...commonComposition,
  };
};
