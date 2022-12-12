import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import {eraseLine} from 'ansi-escapes';
import commander from 'commander';
import tmp from 'tmp';
import {CompletableFuture} from '@launchtray/hatch-util';
import replace from 'replace-in-file';
import {spawnSync} from 'child_process';
import {RushConfiguration, RushConfigurationProject} from '@microsoft/rush-lib';
import {parse, stringify} from 'comment-json';
import YAML from 'yaml';
import {Pair, YAMLMap} from 'yaml/types';
import dotenv from 'dotenv';

type TemplateType =
  | 'monorepo'
  | 'project';

type ProjectFolder =
  | 'apps'
  | 'libraries'
  | 'tools';

interface SdkOptions {
  name?: string;
  dependency?: string;
  ver?: string;
  spec?: string;
  isServer: boolean,
}

interface ApiOptions {
  specType?: 'json' | 'yaml' | 'spot';
}

interface CopyDirOptions {
  srcPath: string;
  dstPath: string;
  name: string;
  templateType?: TemplateType;
  projectFolder?: ProjectFolder;
  sdkOptions?: SdkOptions;
  apiOptions?: ApiOptions;
}

export const withSpinner = async (message: string, task: () => Promise<void>): Promise<void> => {
  const spinner = ora(message).start();
  try {
    await task();
  } finally {
    spinner.stop();
    process.stdout.write(eraseLine);
  }
};

const log = (message: string) => {
  // eslint-disable-next-line no-console -- intentional log to console
  console.log(message);
};

const logError = (message: string) => {
  // eslint-disable-next-line no-console -- intentional log to console
  console.error(chalk.red(message));
};

const determinePackageName = (
  {overriddenName, apiPackageName, desiredSuffix, isServer}: {
    overriddenName?: string,
    apiPackageName?: string,
    desiredSuffix: string
    isServer: boolean,
  },
): string => {
  let projectName: string;
  if (apiPackageName != null && overriddenName == null) {
    // First remove 'api' suffix, so we don't have redundant service-api-sdk
    projectName = apiPackageName
      .replace(/([-./])api$/, `$1${isServer ? 'server' : 'client'}$1${desiredSuffix}`);
    if (!projectName.endsWith(desiredSuffix)) {
      projectName = `${projectName}-${isServer ? 'server' : 'client'}-${desiredSuffix}`;
    }
  } else {
    projectName = overriddenName as string;
  }
  return projectName;
};

const createSdk = (parentDirectory: string, projectFolder: ProjectFolder | undefined, sdkOptions: SdkOptions) => {
  if (sdkOptions.dependency == null && sdkOptions.spec == null) {
    throw new Error('Dependency or input spec must be specified');
  }
  if (sdkOptions.spec != null && sdkOptions.name == null) {
    throw new Error('Name must be specified when generating an SDK from an input spec');
  }
  const projectName = determinePackageName({
    overriddenName: sdkOptions.name,
    apiPackageName: sdkOptions.dependency,
    desiredSuffix: 'sdk',
    isServer: sdkOptions.isServer,
  });
  return createProject(parentDirectory, projectName, projectFolder, {sdkOptions});
};

const sdkCreator = (parentDirectory: string, projectFolder: ProjectFolder | undefined, isServer: boolean) => {
  return (sdkOptions: SdkOptions) => {
    return createSdk(parentDirectory, projectFolder, {...sdkOptions, isServer});
  };
};

export const clientSdkCreator = (parentDirectory: string, projectFolder?: ProjectFolder) => {
  return sdkCreator(parentDirectory, projectFolder, false);
};

export const serverSdkCreator = (parentDirectory: string, projectFolder?: ProjectFolder) => {
  return sdkCreator(parentDirectory, projectFolder, true);
};

export const apiCreator = (parentDirectory: string, projectFolder?: ProjectFolder) => {
  return (projectName: string, apiOptions: ApiOptions) => {
    return createProject(parentDirectory, projectName, projectFolder, {apiOptions});
  };
};

export const createMonorepo = async (parentDirectory: string, monorepoName: string) => {
  if (monorepoName == null) {
    throw new Error('Monorepo name must be specified');
  }
  const monorepoPath = `${process.cwd()}/${monorepoName}`;
  await createFromTemplate({
    srcPath: templateDir(parentDirectory),
    dstPath: monorepoPath,
    name: monorepoName,
    templateType: 'monorepo',
  });
  log(chalk.green(`Created '${monorepoPath}' monorepo`));
};

export const monorepoCreator = (parentDirectory: string) => {
  return (monorepoName: string) => {
    return createMonorepo(parentDirectory, monorepoName);
  };
};

export const createProject = async (
  parentDirectory: string,
  projectName: string,
  projectFolder?: ProjectFolder,
  options?: Record<string, unknown>,
) => {
  if (projectName == null) {
    throw new Error('Package name must be specified');
  }
  const projectPath = `${process.cwd()}/${projectName}`;
  const {dstPath, inMonorepo} = await createFromTemplate({
    srcPath: templateDir(parentDirectory),
    dstPath: projectPath,
    name: projectName,
    templateType: 'project',
    projectFolder,
    ...options,
  });
  log(chalk.green(`Created '${dstPath}'`));
  if (inMonorepo) {
    log('Now might be a good time run to `rush update`');
  } else {
    log('Now might be a good time to cd into the project and install dependencies (e.g. via npm, yarn)');
  }
};

export const projectCreator = (parentDirectory: string, projectFolder?: ProjectFolder) => {
  return (projectName: string) => {
    return createProject(parentDirectory, projectName, projectFolder);
  };
};

export const createModule = async (parentDirectory: string, moduleName: string, extension = 'ts') => {
  if (moduleName == null) {
    throw new Error('Module name must be specified');
  }
  const modulePath = `${process.cwd()}/${moduleName}.${extension}`;
  await createFromTemplate({
    srcPath: templateFile(parentDirectory, extension),
    dstPath: modulePath,
    name: moduleName,
  });
  log(chalk.green(`Created '${modulePath}'`));
};

export const moduleCreator = (parentDirectory: string, extension = 'ts') => {
  return (moduleName: string) => {
    return createModule(parentDirectory, moduleName, extension);
  };
};

export const componentCreator = (parentDirectory: string) => {
  return async (moduleName: string) => {
    await createModule(parentDirectory, moduleName, 'tsx');
    await createModule(path.resolve(parentDirectory, '../story/'), moduleName, 'stories.tsx');
  };
};

const toShortName = (name: string) => {
  const components = name.split('/');
  return components[components.length - 1];
};

const toEnvName = (shortName: string) => {
  return shortName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
};

const toDockerServiceName = (shortName: string, isStaticServer: boolean) => {
  return (isStaticServer ? '_static_' : '') + shortName;
};

const toPortName = (shortName: string, isStaticServer: boolean) => {
  const envName = toEnvName(shortName);
  return `${(isStaticServer ? '_STATIC_' : '') + envName}_PORT`;
};

interface DockerServiceDefinition {
  key: string;
  value: {
    build: {
      context: string;
      target: string;
      args: Record<string, string>;
    };
    ports: string[];
    // eslint-disable-next-line @typescript-eslint/naming-convention -- used by Docker
    env_file?: string[];
    environment?: Record<string, string>;
  };
}

const createDockerService = (doc: YAML.Document, shortName: string, isStaticServer: boolean) => {
  const serviceName = toDockerServiceName(shortName, isStaticServer);
  const service: DockerServiceDefinition = {
    key: serviceName,
    value: {
      build: {
        context: '.',
        target: (isStaticServer ? 'static-server' : 'production-app'),
        // eslint-disable-next-line @typescript-eslint/naming-convention -- following typical ARG naming convention
        args: {APP_NAME: shortName},
      },
      ports: [`\${${toPortName(shortName, isStaticServer)}}:80`],
    },
  };
  if (!isStaticServer) {
    service.value.env_file = [
      './common.env',
      './prod.env',
    ];
    service.value.environment = {
      // eslint-disable-next-line @typescript-eslint/naming-convention -- following typical ENV_VAR naming convention
      STATIC_ASSETS_BASE_URL: `http://localhost:\${${toPortName(shortName, true)}}`,
    };
  }
  const pair = new Pair(service.key, service.value);
  if (!doc.has('services')) {
    const services = new Pair('services', new YAMLMap());
    services.spaceBefore = true;
    doc.addIn([], services);
  } else {
    const services = doc.get('services');
    if (
      typeof services !== 'object'
      || typeof (services.toJSON()) !== 'object'
      || Array.isArray(services.toJSON())
    ) {
      throw new Error('Existing docker-compose.yaml file has an invalid `services` definition');
    }
    pair.spaceBefore = true;
  }
  doc.addIn(['services'], pair);
};

const MIN_PORT = 3002; // Start after default dev server ports
const MAX_PORT = 65535;

// Finds ports which:
// - are not already used in the .env file
// - are back to back
// This allows for the ports to be used for both prod and
// dev, where (port + 1) is used for the static file server
// and the webpack server, respectively.
const findAvailablePortPair = (dotEnv: Record<string, string>) => {
  const dotEnvPorts = {};
  const foundPorts = [];
  for (const key of Object.keys(dotEnv)) {
    if (key.endsWith('_PORT')) {
      const port = parseInt(dotEnv[key], 10);
      if (!Number.isNaN(port) && port >= MIN_PORT && port <= MAX_PORT) {
        dotEnvPorts[port] = true;
      }
    }
  }
  for (let port = MIN_PORT; port <= MAX_PORT; port++) {
    if (dotEnvPorts[port] == null && dotEnvPorts[port + 1] == null) {
      foundPorts.push(port);
      port += 1;
      foundPorts.push(port);
      break;
    }
  }
  return foundPorts;
};

const parseDotEnv = (dotEnvPath: string) => {
  if (!fs.existsSync(dotEnvPath)) {
    fs.createFileSync(dotEnvPath);
  }
  return dotenv.parse(fs.readFileSync(dotEnvPath));
};

const appendToFile = (filePath: string, lines: string[]) => {
  if (!fs.existsSync(filePath)) {
    fs.createFileSync(filePath);
  }
  const stream = fs.createWriteStream(filePath, {flags: 'a'});
  try {
    for (const line of lines) {
      stream.write(`${line}\n`);
    }
  } finally {
    stream.end();
  }
};

const HATCH_SERVER_TEMPLATE_NAMES = ['webapp', 'microservice'];
const updateDockerComposition = async (templateName: string, monorepoRootDir: string, shortName: string) => {
  if (HATCH_SERVER_TEMPLATE_NAMES.includes(templateName)) {
    const dockerComposePath = path.resolve(monorepoRootDir, 'docker-compose.yaml');
    let dockerComposeDocument: YAML.Document;
    if (fs.existsSync(dockerComposePath)) {
      const dockerComposeFile = fs.readFileSync(dockerComposePath, 'utf8');
      dockerComposeDocument = YAML.parseDocument(dockerComposeFile);
      const asJSON = dockerComposeDocument.toJSON();
      const asString = dockerComposeDocument.toString();
      if (
        asJSON == null
        || asString == null
        || asString.trim() === ''
        || typeof asJSON !== 'object'
        || Array.isArray(asJSON)
      ) {
        dockerComposeDocument = new YAML.Document(new YAMLMap());
      }
    } else {
      dockerComposeDocument = new YAML.Document(new YAMLMap());
    }

    if (!dockerComposeDocument.has('version')) {
      const version = new Pair('version', '3.8');
      dockerComposeDocument.addIn([], version);
    }

    createDockerService(dockerComposeDocument, shortName, false);
    createDockerService(dockerComposeDocument, shortName, true);
    fs.writeFileSync(dockerComposePath, dockerComposeDocument.toString());

    const dotEnvPath = path.resolve(monorepoRootDir, '.env');
    const dotEnv = parseDotEnv(dotEnvPath);
    const ports = findAvailablePortPair(dotEnv);
    appendToFile(dotEnvPath, [
      `${toPortName(shortName, false)}=${ports[0]}`,
      `${toPortName(shortName, true)}=${ports[1]}`,
    ]);

    const prodEnvPath = path.resolve(monorepoRootDir, 'prod.env');
    appendToFile(prodEnvPath, [
      `${toEnvName(shortName)}_BASE_URL=http://${toDockerServiceName(shortName, false)}`,
    ]);

    const devEnvPath = path.resolve(monorepoRootDir, 'dev.env');
    appendToFile(devEnvPath, [
      `${toEnvName(shortName)}_BASE_URL=http://localhost:$${toPortName(shortName, false)}`,
    ]);
  }
};

const updateVersionPolicies = (monorepoPath: string) => {
  const versionPoliciesPath = path.resolve(monorepoPath, 'common', 'config', 'rush', 'version-policies.json');
  const versionPoliciesRaw = fs.readFileSync(versionPoliciesPath).toString();
  const versionPoliciesParsed = parse(versionPoliciesRaw);
  versionPoliciesParsed.push({
    definitionName: 'individualVersion',
    policyName: 'libraries',
  });
  versionPoliciesParsed.push({
    definitionName: 'individualVersion',
    policyName: 'tools',
  });
  const versionPoliciesRawUpdated = stringify(versionPoliciesParsed, null, 2);
  fs.writeFileSync(versionPoliciesPath, versionPoliciesRawUpdated);
};

const updateCustomCommands = (monorepoPath: string) => {
  const commandLinePath = path.resolve(monorepoPath, 'common', 'config', 'rush', 'command-line.json');
  const commandLineRaw = fs.readFileSync(commandLinePath).toString();
  const commandLineParsed = parse(commandLineRaw);
  commandLineParsed.commands.push({
    commandKind: 'global',
    name: 'dev',
    summary: 'Runs all apps locally in dev mode',
    description: 'This command will run all hatch servers locally in development mode',
    safeForSimultaneousRushProcesses: true,
    shellCommand: './dev',
  });
  commandLineParsed.commands.push({
    commandKind: 'global',
    name: 'prod',
    summary: 'Runs all apps locally via Docker',
    description: 'This command will run all hatch servers locally as production builds in Docker',
    safeForSimultaneousRushProcesses: true,
    shellCommand: './prod',
  });
  commandLineParsed.commands.push({
    commandKind: 'bulk',
    name: 'test',
    summary: 'Runs all project\'s package.json test script hook commands if defined',
    description: 'This command will run all project\'s package.json test script hook commands if defined',
    enableParallelism: true,
    ignoreMissingScript: true,
  });
  commandLineParsed.commands.push({
    commandKind: 'bulk',
    name: 'lint:fix',
    summary: 'Fixes all lint issues',
    description: 'Fixes lint issues for all projects via lint:fix npm script',
    enableParallelism: true,
    safeForSimultaneousRushProcesses: false,
    ignoreDependencyOrder: true,
    ignoreMissingScript: true,
    allowWarningsInSuccessfulBuild: true,
  });
  commandLineParsed.commands.push({
    commandKind: 'bulk',
    name: 'lint',
    summary: 'Lints all projects',
    description: 'Finds lint issues for all projects via lint npm script',
    enableParallelism: true,
    safeForSimultaneousRushProcesses: false,
    ignoreDependencyOrder: true,
    ignoreMissingScript: true,
    allowWarningsInSuccessfulBuild: true,
  });

  const commandLineRawUpdated = stringify(commandLineParsed, null, 2);
  fs.writeFileSync(commandLinePath, commandLineRawUpdated);
};

const patchPackageJson = (
  tempFilePath: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  packageModifier: (packageParsed: any) => any | void,
) => {
  const packagePath = path.resolve(tempFilePath, 'package.json');
  const packageString = fs.readFileSync(packagePath).toString();
  const packageParsed = parse(packageString);
  const returnedPackage = packageModifier(packageParsed) ?? packageParsed;
  const packageUpdated = stringify(returnedPackage, null, 2);
  fs.writeFileSync(packagePath, packageUpdated);
};

const generateSdk = (
  sdkOptions: SdkOptions,
  tempFilePath: string,
  rushConfigParsed?: {projects?: RushConfigurationProject[]},
  monorepoRootDir?: string,
) => {
  patchPackageJson(tempFilePath, (packageParsed) => {
    const sdkPackageParsed = packageParsed;
    let dependencyVersion = sdkOptions.ver;
    if (sdkOptions.dependency != null && dependencyVersion == null) {
      const dependencyProject = rushConfigParsed?.projects?.find((project: RushConfigurationProject) => {
        return project.packageName === sdkOptions.dependency;
      });
      const dependencyProjectFolder = dependencyProject?.projectFolder;
      if (dependencyProjectFolder != null && monorepoRootDir != null) {
        const dependencyPackagePath = path.resolve(monorepoRootDir, dependencyProjectFolder, 'package.json');
        const dependencyPackage = fs.readFileSync(dependencyPackagePath).toString();
        const dependencyPackageParsed = parse(dependencyPackage);
        dependencyVersion = dependencyPackageParsed?.version;
      }
    }
    if (dependencyVersion == null) {
      dependencyVersion = 'latest';
    }
    const cliName = sdkOptions.isServer ? 'hatch-server-sdk' : 'hatch-client-sdk';
    if (sdkOptions.dependency != null) {
      sdkPackageParsed.devDependencies[sdkOptions.dependency] = dependencyVersion;
      sdkPackageParsed.scripts.build = `rimraf dist && ${cliName} --dependency ${sdkOptions.dependency} && tsc`;
      sdkPackageParsed.scripts['build:watch'] = `${cliName} --dependency ${sdkOptions.dependency} && tsc`;
    } else if (sdkOptions.spec != null) {
      sdkPackageParsed.scripts.build = `rimraf dist && ${cliName} --spec ${sdkOptions.spec} && tsc`;
      sdkPackageParsed.scripts['build:watch'] = `${cliName} --spec ${sdkOptions.spec} && tsc`;
    }
  });
};

const patchApiPackage = (apiOptions: ApiOptions, tempFilePath: string) => {
  patchPackageJson(tempFilePath, (packageParsed) => {
    const apiPackage = packageParsed;
    const {specType} = apiOptions;
    if (specType != null && specType !== 'spot') {
      apiPackage.scripts.build = apiPackage.scripts.build.replace(
        '--spec src/api-overrides.yaml --spot src/api.ts',
        `--spec src/api.${apiOptions.specType}`,
      );
      apiPackage.scripts['build:watch'] = apiPackage.scripts['build:watch'].replace(
        '--spec src/api-overrides.yaml --spot src/api.ts',
        `--spec src/api.${apiOptions.specType}`,
      );
      fs.removeSync(path.resolve(tempFilePath, 'src', 'api.ts'));
      fs.removeSync(path.resolve(tempFilePath, 'src', 'api-overrides.yaml'));
      if (specType === 'json') {
        fs.removeSync(path.resolve(tempFilePath, 'src', 'api.yaml'));
      } else {
        fs.removeSync(path.resolve(tempFilePath, 'src', 'api.json'));
      }
    } else {
      fs.removeSync(path.resolve(tempFilePath, 'src', 'api.yaml'));
      fs.removeSync(path.resolve(tempFilePath, 'src', 'api.json'));
    }
  });
};

export const createFromTemplate = async (
  {srcPath, dstPath, name, templateType, projectFolder, sdkOptions, apiOptions}: CopyDirOptions,
): Promise<{dstPath: string, inMonorepo: boolean}> => {
  let adjustedDstPath = dstPath;
  let inMonorepo = false;
  const templateName = path.basename(path.dirname(path.resolve(srcPath)));
  let rushConfigPath: string | undefined;
  let monorepoRootDir: string | undefined;
  if (templateType === 'project' && projectFolder != null) {
    rushConfigPath = RushConfiguration.tryFindRushJsonLocation({startingFolder: dstPath});
    if (rushConfigPath != null) {
      inMonorepo = true;
      monorepoRootDir = path.dirname(rushConfigPath);
      adjustedDstPath = path.resolve(monorepoRootDir, projectFolder, toShortName(name));
    }
  }
  if (fs.existsSync(adjustedDstPath)) {
    throw new Error(`Failed to create ${adjustedDstPath} as it already exits!`);
  }
  // eslint-disable-next-line complexity -- refactor on future addition / cleanup
  await withSpinner(`Creating '${name}'`, async () => {
    const tempFileFuture: CompletableFuture<[string, () => void]> = new CompletableFuture<[string, () => void]>();
    if (templateType === 'monorepo' || templateType === 'project') {
      tmp.dir({unsafeCleanup: true}, (err, tmpPath, cleanUp) => {
        if (err != null) {
          cleanUp();
          tempFileFuture.completeExceptionally(err);
        }
        tempFileFuture.complete([tmpPath, cleanUp]);
      });
    } else {
      tmp.file((err, tmpPath, fd, cleanUp) => {
        if (err != null) {
          cleanUp();
          tempFileFuture.completeExceptionally(err);
        }
        tempFileFuture.complete([tmpPath, cleanUp]);
      });
    }
    const [tempFilePath, cleanUp] = await tempFileFuture.get();
    try {
      if (templateType === 'monorepo') {
        const rushExecutable = path.resolve(__dirname, '../node_modules/.bin/rush');
        const rushInitCmd = spawnSync(rushExecutable, ['init'], {encoding: 'utf8', cwd: tempFilePath});
        if (rushInitCmd.error != null) {
          throw new Error(`Error initializing monorepo: ${rushInitCmd.error.message}`);
        }
        // remove files that will be replaced by template
        const rushGitIgnorePath = path.resolve(tempFilePath, '.gitignore');
        if (fs.existsSync(rushGitIgnorePath)) {
          await fs.remove(rushGitIgnorePath);
        }
        const templateRushConfigPath = path.resolve(tempFilePath, 'rush.json');
        if (fs.existsSync(templateRushConfigPath)) {
          await fs.remove(templateRushConfigPath);
        }
        updateVersionPolicies(tempFilePath);
        updateCustomCommands(tempFilePath);
      }
      await fs.copy(srcPath, tempFilePath);
      if (templateType === 'monorepo') {
        // Replace template names with generated project name
        await replace({
          files: `${tempFilePath}/**/*`,
          from: /HATCH_CLI_TEMPLATE_VAR_monorepoName/g,
          to: name,
        });

        // Rename hidden / project files
        const imlPath = path.resolve(tempFilePath, 'dot-idea', 'HATCH_CLI_TEMPLATE_VAR_monorepoName.iml');
        if (fs.existsSync(imlPath)) {
          await fs.move(imlPath, path.resolve(tempFilePath, 'dot-idea', `${name}.iml`));
        }
        const dotIdeaPath = path.resolve(tempFilePath, 'dot-idea');
        if (fs.existsSync(dotIdeaPath)) {
          await fs.move(dotIdeaPath, path.resolve(tempFilePath, '.idea'));
        }
        const dotGitIgnorePath = path.resolve(tempFilePath, 'dot-gitignore');
        if (fs.existsSync(dotGitIgnorePath)) {
          await fs.move(dotGitIgnorePath, path.resolve(tempFilePath, '.gitignore'));
        }
        const dotNpmIgnorePath = path.resolve(tempFilePath, 'dot-npmignore');
        if (fs.existsSync(dotNpmIgnorePath)) {
          await fs.move(dotNpmIgnorePath, path.resolve(tempFilePath, '.npmignore'));
        }
        const dotDockerIgnorePath = path.resolve(tempFilePath, 'dot-dockerignore');
        if (fs.existsSync(dotDockerIgnorePath)) {
          await fs.move(dotDockerIgnorePath, path.resolve(tempFilePath, '.dockerignore'));
        }
        const dotEslintRcPath = path.resolve(tempFilePath, 'dot-eslintrc.js');
        if (fs.existsSync(dotEslintRcPath)) {
          await fs.move(dotEslintRcPath, path.resolve(tempFilePath, '.eslintrc.js'));
        }
      } else if (templateType === 'project') {
        // Delete files that might be copied over if this is a local dev install
        const nodeModulesPath = path.resolve(tempFilePath, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
          await fs.remove(nodeModulesPath);
        }
        const distPath = path.resolve(tempFilePath, 'dist');
        if (fs.existsSync(distPath)) {
          await fs.remove(distPath);
        }
        const rushPath = path.resolve(tempFilePath, '.rush');
        if (fs.existsSync(rushPath)) {
          await fs.remove(rushPath);
        }

        // Replace template names with generated project name
        await replace({
          files: `${tempFilePath}/**/*`,
          from: /HATCH_CLI_TEMPLATE_VAR_projectName/g,
          to: name,
        });
        await replace({
          files: `${tempFilePath}/**/*`,
          from: /HATCH_CLI_TEMPLATE_VAR_projectShortName/g,
          to: toShortName(name),
        });
        await replace({
          files: `${tempFilePath}/package.json`,
          from: `@launchtray/hatch-template-${templateName}`,
          to: name,
        });
        await replace({
          files: `${tempFilePath}/package.json`,
          from: /workspace:\*/g,
          to: `${require('../package.json').version}`,
        });

        // Handle hidden / project files
        const tsconfigExtendsPath = path.resolve(tempFilePath, 'tsconfig-extends');
        if (fs.existsSync(tsconfigExtendsPath)) {
          if (inMonorepo) {
            await fs.move(tsconfigExtendsPath, path.resolve(tempFilePath, 'tsconfig.json'), {overwrite: true});
          } else {
            await fs.remove(tsconfigExtendsPath);
          }
        }
        const imlPath = path.resolve(tempFilePath, 'dot-idea', 'HATCH_CLI_TEMPLATE_VAR_projectShortName.iml');
        if (fs.existsSync(imlPath)) {
          if (inMonorepo) {
            await fs.remove(imlPath);
          } else {
            await fs.move(imlPath, path.resolve(tempFilePath, 'dot-idea', `${toShortName(name)}.iml`));
          }
        }
        const dotIdeaPath = path.resolve(tempFilePath, 'dot-idea');
        if (fs.existsSync(dotIdeaPath)) {
          if (inMonorepo) {
            await fs.remove(dotIdeaPath);
          } else {
            await fs.move(dotIdeaPath, path.resolve(tempFilePath, '.idea'));
          }
        }
        const dotStorybookPath = path.resolve(tempFilePath, 'dot-storybook');
        if (fs.existsSync(dotStorybookPath)) {
          await fs.move(dotStorybookPath, path.resolve(tempFilePath, '.storybook'));
        }
        const dotGitIgnorePath = path.resolve(tempFilePath, 'dot-gitignore');
        if (fs.existsSync(dotGitIgnorePath)) {
          await fs.move(dotGitIgnorePath, path.resolve(tempFilePath, '.gitignore'));
        }
        const dotNpmIgnorePath = path.resolve(tempFilePath, 'dot-npmignore');
        if (fs.existsSync(dotNpmIgnorePath)) {
          await fs.move(dotNpmIgnorePath, path.resolve(tempFilePath, '.npmignore'));
        }
        // .eslintrc.js will be copied over, but in some cases we might want the template directory within hatch
        // to have different rules than the hatched project. In these cases, dot-eslintrc.js can be defined.
        const dotEslintRcPath = path.resolve(tempFilePath, 'dot-eslintrc.js');
        if (fs.existsSync(dotEslintRcPath)) {
          const destEslintPath = path.resolve(tempFilePath, '.eslintrc.js');
          if (fs.existsSync(destEslintPath)) {
            await fs.remove(destEslintPath);
          }
          await fs.move(dotEslintRcPath, destEslintPath);
        }
        const dotDockerIgnorePath = path.resolve(tempFilePath, 'dot-dockerignore');
        if (fs.existsSync(dotDockerIgnorePath)) {
          if (inMonorepo) {
            await fs.remove(dotDockerIgnorePath);
          } else {
            await fs.move(dotDockerIgnorePath, path.resolve(tempFilePath, '.dockerignore'));
          }
        }
        const dockerfilePath = path.resolve(tempFilePath, 'Dockerfile');
        if (fs.existsSync(dockerfilePath) && inMonorepo) {
          await fs.remove(dockerfilePath);
        }
        const testPath = path.resolve(
          tempFilePath,
          'src',
          '__test__',
          'HATCH_CLI_TEMPLATE_VAR_projectShortName.test.ts',
        );
        if (fs.existsSync(testPath)) {
          await fs.move(testPath, path.resolve(tempFilePath, 'src', '__test__', `${toShortName(name)}.test.ts`));
        }
        if (rushConfigPath != null && monorepoRootDir != null && projectFolder != null) {
          const rushConfigRaw = fs.readFileSync(rushConfigPath).toString();
          const rushConfigParsed = parse(rushConfigRaw);
          if (sdkOptions != null) {
            generateSdk(sdkOptions, tempFilePath, rushConfigParsed, monorepoRootDir);
          }
          const projectRelativePath = path.join(projectFolder, toShortName(name));
          const project: Record<string, string> & {shouldPublish?: boolean} = {
            packageName: name,
            projectFolder: projectRelativePath,
          };
          if (projectFolder === 'libraries') {
            project.versionPolicyName = 'libraries';
          } else if (projectFolder === 'tools') {
            project.versionPolicyName = 'tools';
          } else {
            project.shouldPublish = false;
          }
          rushConfigParsed.projects.push(project);
          const rushConfigRawUpdated = stringify(rushConfigParsed, null, 2);
          fs.writeFileSync(rushConfigPath, rushConfigRawUpdated);
          await updateDockerComposition(templateName, monorepoRootDir, toShortName(name));
        } else if (projectFolder != null && sdkOptions != null) {
          generateSdk(sdkOptions, tempFilePath);
        }
        if (apiOptions != null) {
          patchApiPackage(apiOptions, tempFilePath);
        }
      } else {
        await replace({
          files: tempFilePath,
          from: /HATCH_CLI_TEMPLATE_VAR_moduleName/g,
          to: name,
        });
      }
      await fs.copy(tempFilePath, adjustedDstPath);
    } finally {
      cleanUp();
    }
  });
  return {dstPath: adjustedDstPath, inMonorepo};
};

export const templatePath = (parentDirectory: string, templateFile: string) => {
  return path.resolve(parentDirectory, '../../../src/templates/', path.basename(parentDirectory), templateFile);
};

export const templateDir = (parentDirectory: string, dirName = 'template') => {
  return templatePath(parentDirectory, dirName);
};

export const templateFile = (parentDirectory: string, extension = 'ts', moduleName = 'template') => {
  return templatePath(parentDirectory, `${moduleName}.${extension}`);
};

export const runCommander = () => {
  commander.parseAsync(process.argv)
    .catch((err) => {
      logError(err.message);
      commander.help();
    });
};
