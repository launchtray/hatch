import path from 'path';
import {TsJestTransformer} from 'ts-jest';
import type {TransformedSource} from '@jest/transform';

class FilenameTransform extends TsJestTransformer {
  process(src: string, filename: string): TransformedSource {
    return {code: `module.exports = ${JSON.stringify(path.basename(filename))};`};
  }
}

export default new FilenameTransform();
