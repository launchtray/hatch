import path from 'path';
import type {Config} from 'jest';

const mapIfValid = (key: string, factory: () => string) => {
  try {
    return {[key]: factory()};
  } catch {
    return {};
  }
};

const mapD3 = (name: string) => {
  return mapIfValid(
    `^d3-${name}$`,
    () => path.resolve(path.dirname(require.resolve(`d3-${name}`)), '..', 'dist', `d3-${name}.js`),
  );
};

const d3Entries = (...names: string[]) => {
  let allEntries = {};
  for (const name of names) {
    allEntries = {...allEntries, ...mapD3(name)};
  }
  return allEntries;
};

export const createJestConfig = (): Config => ({
  testEnvironment: `${path.dirname(require.resolve('@launchtray/hatch-test'))}/SpecInfoJestEnvironment`,
  testTimeout: 120000,
  transform: {
    '\\.(ts|tsx)$': 'ts-jest',
    '.+\\.(css|styl|less|sass|scss)$':
      `${path.dirname(require.resolve('@launchtray/hatch-jest-config'))}/empty-transform`,
    '^(?!.*\\.(js|jsx|mjs|cjs|json)$)':
      `${path.dirname(require.resolve('@launchtray/hatch-jest-config'))}/filename-transform`,
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/?(*.)(spec|test).(ts|js)?(x)',
  ],
  moduleNameMapper: {
    ...mapIfValid('^uuid$', () => require.resolve('uuid')),
    ...d3Entries(
      'array',
      'axis',
      'brush',
      'chord',
      'color',
      'contour',
      'delaunay',
      'dispatch',
      'drag',
      'dsv',
      'ease',
      'fetch',
      'force',
      'format',
      'geo',
      'hierarchy',
      'interpolate',
      'path',
      'polygon',
      'quadtree',
      'random',
      'scale',
      'scale-chromatic',
      'selection',
      'shape',
      'time',
      'time-format',
      'timer',
      'transition',
      'zoom',
    ),
    '^react-native$': 'react-native-web',
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
