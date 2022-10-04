import {spawnSync} from 'child_process';
import path from 'path';
import fs from 'fs-extra';

export const createClientSDKByInputSpec = async (inputSpec: string) => {
  const generatorExec = path.resolve(__dirname, '..', 'node_modules', '.bin', 'openapi-generator');
  const templatePath = path.resolve(__dirname, '..', 'lib', 'typescript-fetch');
  const outputPath = './src/autogen';
  if (fs.existsSync(outputPath)) {
    await fs.remove(outputPath);
  }
  const args = [
    'generate',
    '--input-spec',
    inputSpec,
    '--output',
    outputPath,
    '--generator-name',
    'typescript-fetch',
    '--template-dir',
    templatePath,
    '--additional-properties=supportsES6=true,typescriptThreePlus=true',
    '--skip-validate-spec',
    '--type-mappings object=any',
  ];
  const generatorCmd = spawnSync(generatorExec, args, {encoding: 'utf8'});
  if (generatorCmd.error != null) {
    // eslint-disable-next-line no-console -- intentional stdout
    console.log(generatorCmd.stdout);
    throw new Error(generatorCmd.error.message);
  }
  // if successful, the last file generated is the openapi-generation/VERSION file
  const openApiVersionFile = path.resolve(outputPath, '.openapi-generator', 'VERSION');
  if (!fs.existsSync(openApiVersionFile)) {
    // eslint-disable-next-line no-console -- intentional stdout
    console.log(generatorCmd.stdout);
    throw new Error(`Error generating client sdk: ${generatorCmd.stderr}`);
  }
};

export const createClientSDKByDependency = async (dependencyName: string) => {
  const inputSpec = path.resolve(process.cwd(), 'node_modules', dependencyName, 'dist', 'api.json');
  await createClientSDKByInputSpec(inputSpec);
};
