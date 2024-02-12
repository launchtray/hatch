import NodeEnvironment from 'jest-environment-node';
import sourceMapSupport from 'source-map-support';

export interface SpecInfo {
  suiteName?: string;
  specName?: string;
}

export const getCurrentSpecInfo = (): SpecInfo => {
  // Each Jest environment is sandboxed, so we must use globalThis where it's read here, and this.global where it's set
  // below in handleTestEvent
  // eslint-disable-next-line no-undef
  const environment = (globalThis as unknown as {currentTestLoggerJestEnvironment?: SpecInfoJestEnvironment})
    .currentTestLoggerJestEnvironment;
  return {
    suiteName: environment?.currentSuiteName,
    specName: environment?.currentTestName,
  };
};

class SpecInfoJestEnvironment extends NodeEnvironment {
  public currentTestName?: string;
  public currentSuiteName?: string;

  constructor(config: unknown, context: unknown) {
    super(config, context);
    sourceMapSupport.install();
  }

  async handleTestEvent(event?: {name?: string, test?: {name?: string, parent?: {name?: string}}}) {
    if (event?.name === 'test_start') {
      this.global.currentTestLoggerJestEnvironment = this;
      this.global.fetch = fetch;
      this.currentTestName = event?.test?.name;
      this.currentSuiteName = event?.test?.parent?.name;
    }
  }
}

export default SpecInfoJestEnvironment;
