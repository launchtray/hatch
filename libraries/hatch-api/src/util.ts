import {Spot} from '@airtasker/spot';
import path from 'path';
import fs from 'fs-extra';
import {OpenApiV3} from '@airtasker/spot/build/lib/src/generators/openapi3/openapi3-specification';
import YAML from 'yaml';

const createApiFromOpenApi3Spec = async (openApi: OpenApiV3) => {
  const typesFile = path.resolve(
    './node_modules/@airtasker/spot/build/lib/src/generators/openapi3/openapi3-specification.d.ts',
  );
  const licenseFile = path.resolve(
    './node_modules/@airtasker/spot/LICENSE',
  );
  const outputDir = path.resolve('.', 'dist');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }
  const apiSpecPromise = fs.writeFile(path.resolve(outputDir, 'api.json'), JSON.stringify(openApi, null, 2));
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

export const createApiByJsonFile = async (inputJsonFile: string) => {
  const openApi = YAML.parseDocument(await fs.readFile(inputJsonFile, 'utf8')).toJS();
  await createApiFromOpenApi3Spec(openApi);
};

export const createApiBySpotFile = async (inputSpotApi: string) => {
  const contract = Spot.parseContract(inputSpotApi);
  const openApi = Spot.OpenApi3.generateOpenAPI3(contract);
  await createApiFromOpenApi3Spec(openApi);
};
