import {spawnSync} from 'child_process';
import path from 'path';
import tmp from 'tmp';
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
    throw new Error('Error generating client sdk: ' + generatorCmd.stderr);
  }
};

export const createClientSDKByDependency = async (dependencyName: string) => {
  const fileResult = tmp.fileSync();
  const tempFilePath = fileResult.name;
  const cleanUp = fileResult.removeCallback;

  try {
    const serverExec = path.resolve(process.cwd(), 'node_modules', dependencyName, 'build', 'server.js');
    const env = Object.create(process.env);
    env.PRINT_API_SPEC_ONLY = 'true';
    const printSpecCmd = spawnSync('node', [serverExec], {
      encoding: 'utf8',
      env,
      maxBuffer: 10 * 1024 * 1024,
    });
    if (printSpecCmd.error) {
      // eslint-disable-next-line no-console -- intentional stdout
      console.log(printSpecCmd.stdout);
      throw new Error(printSpecCmd.error.message);
    }
    const inputSpec = printSpecCmd.stdout;
    fs.writeFileSync(tempFilePath, inputSpec);
    await createClientSDKByInputSpec(tempFilePath);
  } finally {
    cleanUp();
  }
};