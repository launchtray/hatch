import {TsJestTransformer} from 'ts-jest';

class EmptyTransform extends TsJestTransformer {
  process(): string {
    return 'module.exports = {};';
  }

  getCacheKey(): string {
    return 'empty-transform';
  }
}

export default new EmptyTransform();
