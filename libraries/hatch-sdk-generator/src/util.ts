import {spawnSync} from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import tmp from 'tmp';
import {createApiFromOpenApi3Specs} from '@launchtray/hatch-api';

export type SdkType = 'client' | 'server';

export const createSdkByInputSpec = async (inputSpec: string, type: SdkType) => {
  const generatorExec = path.resolve(__dirname, '..', 'node_modules', '.bin', 'openapi-generator');
  const templateDirResult = tmp.dirSync({unsafeCleanup: true, prefix: `${type}-sdk-generator`});
  try {
    const templateSourcePath = path.resolve(__dirname, '..', 'lib', `${type}-sdk`);
    const templateCommonSourcePath = path.resolve(__dirname, '..', 'lib', 'common');
    const templateDestPath = path.resolve(templateDirResult.name, `${type}-sdk`);
    fs.copySync(templateSourcePath, templateDestPath);
    fs.copySync(templateCommonSourcePath, templateDestPath);
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
      templateDestPath,
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
      throw new Error(`Error generating ${type} sdk: ${generatorCmd.stderr}`);
    }
    if (type === 'server') {
      await createApiFromOpenApi3Specs([JSON.parse(fs.readFileSync(inputSpec, 'utf8'))]);
    }
  } finally {
    templateDirResult.removeCallback();
  }
};

export const createSdkByDependency = async (dependencyName: string, type: SdkType) => {
  const inputSpec = path.resolve(process.cwd(), 'node_modules', dependencyName, 'dist', 'api.json');
  await createSdkByInputSpec(inputSpec, type);
};

export const runCli = (type: SdkType) => {
  const usage = `Usage: hatch-${type}-sdk [ --spec input-spec | --dependency dependency-name ]`;
  const argv = process.argv.slice(2);
  const typeArg = argv[0];
  if (argv.length < 2) {
    throw new Error(`Invalid arguments:\n${usage}`);
  } else if (typeArg === '--spec') {
    // location of the OpenAPI spec, as URL or file
    const inputSpec = argv[1];
    createSdkByInputSpec(inputSpec, type).catch((err) => {
      throw new Error(err);
    });
  } else if (typeArg === '--dependency') {
    const dependencyName = argv[1];
    createSdkByDependency(dependencyName, type).catch((err) => {
      throw new Error(err);
    });
  } else {
    throw new Error(`Invalid type argument:\n${usage}`);
  }
};
