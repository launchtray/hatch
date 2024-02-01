import {TsJestTransformer} from 'ts-jest';
import type {TransformedSource} from '@jest/transform';

class EmptyTransform extends TsJestTransformer {
  process(): TransformedSource {
    return {code: 'module.exports = {};'};
  }

  getCacheKey(): string {
    return 'empty-transform';
  }
}

export default new EmptyTransform();
