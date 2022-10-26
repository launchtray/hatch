import {Spot} from '@airtasker/spot';
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

export const createApiFromOpenApi3Specs = async (apis: SwaggerV3[]) => {
  const typesFile = path.resolve(
    './node_modules/atlassian-openapi/lib/swagger.d.ts',
  );
  const mergeResult = merge(
    apis.map((api: SwaggerV3) => ({
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

export const createApiByYamlOrJsonFile = (inputJsonFile: string) => {
  return YAML.parseDocument(fs.readFileSync(inputJsonFile, 'utf8')).toJS() as SwaggerV3;
};

export const createApiBySpotFile = (inputSpotApi: string) => {
  const contract = Spot.parseContract(inputSpotApi);
  return Spot.OpenApi3.generateOpenAPI3(contract) as SwaggerV3;
};
