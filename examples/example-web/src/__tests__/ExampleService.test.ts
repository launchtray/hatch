import {ROOT_CONTAINER} from '@launchtray/hatch-util';

import ExampleService from '../services/ExampleService';

describe('example-service', () => {
  let service: ExampleService;

  beforeAll(async () => {
    service = ROOT_CONTAINER.resolve(ExampleService);
  });

  test('test', async () => {
    service.go();
  });
});
