import {Spot} from '@airtasker/spot';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import path from 'path';
import fs from 'fs-extra';
import YAML from 'yaml';
import {merge, isErrorResult} from 'openapi-merge';
import {Swagger} from 'atlassian-openapi';
import SwaggerV3 = Swagger.SwaggerV3;

// From https://github.com/robertmassaioli/openapi-merge/blob/main/LICENSE
const LICENSE_TEXT = `MIT License

Copyright (c) 2021 Robert Massaioli

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

export const createApiFromOpenApi3Specs = async (apiPromises: Promise<SwaggerV3>[], patchFile?: string) => {
  const apis = await Promise.all(apiPromises);
  const typesFile = path.resolve(
    './node_modules/atlassian-openapi/lib/swagger.d.ts',
  );
  const packageInfoFile = path.resolve(
    './package.json',
  );
  const packageInfo = YAML.parseDocument(fs.readFileSync(packageInfoFile, 'utf8')).toJS();

  let mergedInfo: Swagger.Info | undefined;
  for (const api of apis) {
    if (api.info != null) {
      mergedInfo = {
        ...api.info,
        ...mergedInfo,
      };
    }
  }
  if (mergedInfo?.title === '' || mergedInfo?.title === '__PACKAGE_NAME__') {
    mergedInfo.title = packageInfo.name;
  }

  const patchedApis = apis == null || apis.length === 0 ? [] : [
    {
      ...apis[0],
      info: {
        title: packageInfo.name,
        version: packageInfo.version,
        ...mergedInfo,
      },
    },
    ...apis.slice(1),
  ];

  const mergeResult = merge(
    patchedApis.map((patchedApi: SwaggerV3) => ({
      oas: patchedApi,
    })),
  );

  if (isErrorResult(mergeResult)) {
    throw new Error(`Failed to merge OpenAPI specs: ${mergeResult.message} (${mergeResult.type})`);
  }

  const outputDir = path.resolve('.', 'dist');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }
  let mergedOutput: SwaggerV3 = mergeResult.output;
  if (patchFile != null) {
    const patchModulePath = path.resolve('.', patchFile);
    const patchModule: {default: {default: ((input: SwaggerV3) => Promise<SwaggerV3>)}} = await import(patchModulePath);
    mergedOutput = await patchModule.default.default(mergedOutput);
  }
  const apiSpecPromise = fs.writeFile(path.resolve(outputDir, 'api.json'), JSON.stringify(mergedOutput, null, 2));
  const typesFileOut = path.resolve(outputDir, 'api-spec.d.ts');
  const typesDataPromise = fs.readFile(typesFile);
  const fd = fs.openSync(typesFileOut, 'w+');
  try {
    fs.appendFileSync(fd, '/*\n');
    fs.appendFileSync(fd, LICENSE_TEXT);
    fs.appendFileSync(fd, '*/\n');
    fs.appendFileSync(fd, await typesDataPromise);
  } finally {
    const typesSpecPromise = fs.close(fd);
    await Promise.all([typesSpecPromise, apiSpecPromise]);
  }
};

export const dereferenceIfDesired = async (spec: SwaggerV3, resolveRefs: boolean, workingPath: string) => {
  if (!resolveRefs) {
    return spec as SwaggerV3;
  }
  const cwd = process.cwd();
  try {
    process.chdir(workingPath);
    return (await $RefParser.bundle(spec)) as SwaggerV3;
  } finally {
    process.chdir(cwd);
  }
};

export const createApiByYamlOrJsonFile = async (inputJsonFile: string, resolveRefs: boolean) => {
  if (inputJsonFile.startsWith('http://') || inputJsonFile.startsWith('https://')) {
    return (await $RefParser.bundle(inputJsonFile)) as SwaggerV3;
  }
  const specWithRefs = YAML.parseDocument(fs.readFileSync(inputJsonFile, 'utf8')).toJS() as SwaggerV3;
  return await dereferenceIfDesired(specWithRefs, resolveRefs, path.basename(path.dirname(inputJsonFile)));
};

export const createApiBySpotFile = async (inputSpotApi: string) => {
  const contract = Spot.parseContract(inputSpotApi);
  return Spot.OpenApi3.generateOpenAPI3(contract) as SwaggerV3;
};
