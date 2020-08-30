import {CompletableFuture} from '@launchtray/hatch-util';
import {spawnSync} from 'child_process';
import fs from 'fs';
import path from 'path';
import tmp from 'tmp';

export const createClientSDKByInputSpec = (inputSpec: string) => {
  const generatorExec = path.resolve(__dirname, '../node_modules/.bin/openapi-generator');
  const outputPath = './src/autogen';
  const args = [
    'generate',
    '--input-spec', inputSpec,
    '--output', outputPath,
    '--generator-name', 'typescript-fetch',
    '--additional-properties=supportsES6=true,typescriptThreePlus=true',
    '--skip-validate-spec',
  ];
  const generatorCmd = spawnSync(generatorExec, args, {encoding : 'utf8'});
  if (generatorCmd.error) {
    console.log(generatorCmd.stdout);
    throw new Error('Error generating client SDK: ' + generatorCmd.error.message);
  }
 };

export const createClientSDKByDependency = async (dependencyName: string) => {
    const tempFileFuture: CompletableFuture<[string, () => void]> = new CompletableFuture<[string, () => void]>();
    tmp.file((err, tmpPath, fd, tmpCleanUp) => {
      if (err) {
        tmpCleanUp();
        tempFileFuture.completeExceptionally(err);
      }
      tempFileFuture.complete([tmpPath, tmpCleanUp]);
    });
    const [tempFilePath, cleanUp] = await tempFileFuture.get();
    try {
      const serverExec = path.resolve(process.cwd(), 'node_modules', dependencyName, 'build', 'server.js');
      const env = Object.create(process.env);
      env.PRINT_API_SPEC_ONLY = 'true';
      const printSpecCmd = spawnSync('node', [serverExec], {encoding : 'utf8', env});
      if (printSpecCmd.error) {
        console.debug(printSpecCmd.stdout);
        throw new Error('Error printing  API spec: ' + printSpecCmd.error.message);
      }
      const inputSpec = printSpecCmd.stdout;
      fs.writeFileSync(tempFilePath, inputSpec);
      createClientSDKByInputSpec(tempFilePath);
    } finally {
      cleanUp();
    }
};