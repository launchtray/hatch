import {
  ConsoleLogger,
  NON_LOGGER,
  ROOT_CONTAINER
} from '@launchtray/hatch-util';
import {WebClientComposition} from '@launchtray/hatch-web-client';
import composeCommon from './composeCommon';

const appName = process.env.APP_NAME || 'hatch-client';

export default async (): Promise<WebClientComposition> => {
  const logger = (process.env.NODE_ENV === 'production') ? NON_LOGGER : new ConsoleLogger(appName);
  logger.debug('composeClient');

  ROOT_CONTAINER.registerInstance('Logger', logger);
  ROOT_CONTAINER.register('appName', {useValue: appName});

  const commonComposition = await composeCommon();
  return {
    ...commonComposition,
  };
};
