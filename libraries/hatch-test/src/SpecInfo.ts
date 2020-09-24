export interface SpecInfo {
  suiteName?: string;
  specName?: string;
}

const specInfoMap: {[fullName: string]: SpecInfo} = {};

// @ts-ignore
const globalObj = (global as any);

(globalObj?.jasmine as any)?.getEnv().addReporter({
  specStarted: (spec: {description: string, fullName: string}) => {
    specInfoMap[spec.fullName] = {
      specName: spec.description,
      suiteName: spec.fullName.substring(0, spec.fullName.length - spec.description.length - 1),
    };
  },
});

export const getCurrentSpecInfo = (): SpecInfo => {
  if ((globalObj?.expect) == null) {
    return {};
  }
  return specInfoMap[globalObj.expect.getState().currentTestName] ?? {};
};
