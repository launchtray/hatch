import {delay, delegate} from '../index';

class Secondary {
  private delegateTestValue = 1;

  async onlyInSecondary(): Promise<number> {
    await delay(10);
    return this.delegateTestValue;
  }

  async definedInBoth(): Promise<number> {
    await delay(10);
    return this.delegateTestValue;
  }
}

class Primary {
  // eslint-disable-next-line no-unreachable
  private targetTestValue = 0;

  async definedInBoth(): Promise<number> {
    await delay(10);
    return this.targetTestValue;
  }
}

interface Combined {
  onlyInSecondary(): Promise<number>;
  definedInBoth(): Promise<number>;
}

describe('delegate', () => {
  test('testCallsPrimaryMethodByDefault', async () => {
    const extendedObj: Combined = delegate(new Primary(), new Secondary());
    expect(await extendedObj.definedInBoth()).toEqual(0);
  });

  test('testCallsSecondaryMethod', async () => {
    const extendedObj: Combined = delegate(new Primary(), new Secondary());
    expect(await extendedObj.onlyInSecondary()).toEqual(1);
  });
});
