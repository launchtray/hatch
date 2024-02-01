import path from 'path';
import {TsJestTransformer} from 'ts-jest';

class FilenameTransform extends TsJestTransformer {
  process(src: string, filename: string): string {
    return `module.exports = ${JSON.stringify(path.basename(filename))};`;
  }
}

export default new FilenameTransform();
