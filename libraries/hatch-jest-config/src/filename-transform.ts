import path from 'path';
import {TsJestTransformer} from 'ts-jest';

export default class extends TsJestTransformer {
  process(src: string, filename: string): string {
    return `module.exports = ${JSON.stringify(path.basename(filename))};`;
  }
}
