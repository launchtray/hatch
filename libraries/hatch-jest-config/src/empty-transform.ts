import {TsJestTransformer} from 'ts-jest';

export default class extends TsJestTransformer {
  process(): string {
    return 'module.exports = {};';
  }

  getCacheKey(): string {
    return 'empty-transform';
  }
}
