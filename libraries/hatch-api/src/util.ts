import {Spot} from '@airtasker/spot';
import path from 'path';
import fs from 'fs-extra';
import {OpenApiV3} from '@airtasker/spot/build/lib/src/generators/openapi3/openapi3-specification';
import YAML from 'yaml';
import {merge, isErrorResult} from 'openapi-merge';

export const createApiFromOpenApi3Specs = async (apis: OpenApiV3[]) => {
  const typesFile = path.resolve(
    './node_modules/@airtasker/spot/build/lib/src/generators/openapi3/openapi3-specification.d.ts',
  );
  const licenseFile = path.resolve(
    './node_modules/@airtasker/spot/LICENSE',
  );

  const mergeResult = merge(
    apis.map((api) => ({
      oas: api,
    })),
  );

  if (isErrorResult(mergeResult)) {
    throw new Error(`Failed to merge OpenAPI specs: ${mergeResult.message} (${mergeResult.type})`);
  }

  const outputDir = path.resolve('.', 'dist');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }
  const apiSpecPromise = fs.writeFile(path.resolve(outputDir, 'api.json'), JSON.stringify(mergeResult.output, null, 2));
  const typesFileOut = path.resolve(outputDir, 'api-spec.d.ts');
  const licenseDataPromise = fs.readFile(licenseFile);
  const typesDataPromise = fs.readFile(typesFile);
  const fd = fs.openSync(typesFileOut, 'w+');
  try {
    fs.appendFileSync(fd, '/*\n');
    fs.appendFileSync(fd, await licenseDataPromise);
    fs.appendFileSync(fd, '*/\n');
    fs.appendFileSync(fd, await typesDataPromise);
  } finally {
    const typesSpecPromise = fs.close(fd);
    await Promise.all([typesSpecPromise, apiSpecPromise]);
  }
};

export const createApiByYamlOrJsonFile = (inputJsonFile: string) => {
  return YAML.parseDocument(fs.readFileSync(inputJsonFile, 'utf8')).toJS();
};

export const createApiBySpotFile = (inputSpotApi: string) => {
  const contract = Spot.parseContract(inputSpotApi);
  return Spot.OpenApi3.generateOpenAPI3(contract);
};
