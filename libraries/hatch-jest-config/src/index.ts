import path from 'path';
import type {Config} from 'jest';

export const createJestConfig = (): Config => ({
  testEnvironment: `${path.dirname(require.resolve('@launchtray/hatch-test'))}/SpecInfoJestEnvironment`,
  testTimeout: 120000,
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/?(*.)(spec|test).(ts|js)?(x)',
  ],
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
    '^react-native$': 'react-native-web',
    '^d3-(.*)$': 'd3-$1/dist/d3-$1',
  },
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'json',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
  ],
});
