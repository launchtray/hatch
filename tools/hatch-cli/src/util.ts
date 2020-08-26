import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import {eraseLine} from 'ansi-escapes';
import commander from 'commander';
import tmp from 'tmp';
import {CompletableFuture} from '@launchtray/hatch-util';
import replace from 'replace-in-file';
import {spawnSync} from "child_process";
import {RushConfiguration} from '@microsoft/rush-lib';
import {parse, stringify} from 'comment-json';
import YAML from 'yaml'
import {Pair} from 'yaml/types';

type TemplateType =
  | 'monorepo'
  | 'project';

type ProjectFolder =
  | 'apps'
  | 'libraries'
  | 'tools';

interface CopyDirOptions {
  srcPath: string;
  dstPath: string;
  name: string;
  templateType?: TemplateType;
  projectFolder?: ProjectFolder;
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

export const createMonorepo = async (parentDirectory: string, monorepoName: string) => {
  if (!monorepoName) {
    throw new Error('Monorepo name must be specified');
  }
  const monorepoPath = process.cwd() + '/' + monorepoName;
  await createFromTemplate({
    srcPath: templateDir(parentDirectory),
    dstPath: monorepoPath,
    name: monorepoName,
    templateType: 'monorepo',
  });
  console.log(chalk.green('Created \'' + monorepoPath + '\' monorepo'));
}

export const monorepoCreator = (parentDirectory: string) => {
  return (monorepoName: string) => {
    return createMonorepo(parentDirectory, monorepoName);
  }
};

export const createProject = async (parentDirectory: string, projectName: string, projectFolder?: ProjectFolder) => {
  if (!projectName) {
    throw new Error('Project name must be specified');
  }
  const projectPath = process.cwd() + '/' + projectName;
  const finalProjectPath = await createFromTemplate({
    srcPath: templateDir(parentDirectory),
    dstPath: projectPath,
    name: projectName,
    templateType: 'project',
    projectFolder: projectFolder,
  });
  console.log(chalk.green('Created \'' + finalProjectPath + '\''));
  console.log('Now would be a good time to cd into the project and install dependencies (e.g. via npm, yarn, or rush)');
};

export const projectCreator = (parentDirectory: string, projectFolder?: ProjectFolder) => {
  return (projectName: string) => {
    return createProject(parentDirectory, projectName, projectFolder);
  }
};

export const createModule = async (parentDirectory: string, moduleName: string, extension = 'ts') => {
  if (!moduleName) {
    throw new Error('Module name must be specified');
  }
  const modulePath = process.cwd() + '/' + moduleName + '.' + extension;
  await createFromTemplate({
    srcPath: templateFile(parentDirectory, extension),
    dstPath: modulePath,
    name: moduleName,
  });
  console.log(chalk.green('Created \'' + modulePath + '\''));
};

export const moduleCreator = (parentDirectory: string, extension = 'ts') => {
  return (moduleName: string) => {
    return createModule(parentDirectory, moduleName, extension);
  }
};

export const componentCreator = (parentDirectory: string) => {
  return async (moduleName: string) => {
    await createModule(parentDirectory, moduleName, 'tsx');
    await createModule(path.resolve(parentDirectory, '../story/'), moduleName, 'stories.tsx');
  }
};

const toShortName = (name: string) => {
  const components = name.split('/');
  return components[components.length - 1];
};

const createDockerService = (doc: YAML.Document, shortName: string, isStaticServer: boolean) => {
  const envName = shortName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const serviceName = (isStaticServer ? '_static_' : '') + shortName;
  const service: any = {
    key: serviceName,
    value: {
      build: {
        context: '.',
        target: (isStaticServer ? 'static-server' : 'production-app'),
        args: {APP_NAME: shortName},
      },
      ports: ['${' + (isStaticServer ? '_STATIC_' : '') + envName + '_PORT}:80'],
    },
  };
  if (!isStaticServer) {
    service.value.env_file = [
      './docker-compose.common.env',
      './docker-compose.urls.env',
    ];
    service.value.environment = {
      STATIC_ASSETS_BASE_URL: 'http://localhost:${_STATIC_' + envName + '_PORT}',
    };
  }
  const pair = new Pair(service.key, service.value);
  pair.spaceBefore = true;
  doc.addIn(['services'], pair);
};

const HATCH_SERVER_TEMPLATE_NAMES = ['webapp', 'microservice'];
const updateDockerComposition = async (templateName: string, monorepoRootDir: string, shortName: string) => {
  if (HATCH_SERVER_TEMPLATE_NAMES.includes(templateName)) {
    const dockerComposePath = path.resolve(monorepoRootDir, 'docker-compose.yaml');
    let dockerComposeDocument: YAML.Document;
    if (fs.existsSync(dockerComposePath)) {
      const dockerComposeFile = fs.readFileSync(dockerComposePath, 'utf8');
      dockerComposeDocument = YAML.parseDocument(dockerComposeFile);
    } else {
      dockerComposeDocument = new YAML.Document();
      dockerComposeDocument.addIn([], {version: '3.8'});
    }
    createDockerService(dockerComposeDocument, shortName, false);
    createDockerService(dockerComposeDocument, shortName, true);
    fs.writeFileSync(dockerComposePath, dockerComposeDocument.toString());
  }
};

export const createFromTemplate = async ({srcPath, dstPath, name, templateType, projectFolder}: CopyDirOptions) => {
  const templateName = path.basename(path.dirname(path.resolve(srcPath)));
  let rushConfigPath: string | undefined;
  let monorepoRootDir: string | undefined;
  if (templateType === 'project' && projectFolder) {
    rushConfigPath = RushConfiguration.tryFindRushJsonLocation({startingFolder: dstPath});
    if (rushConfigPath) {
      monorepoRootDir = path.dirname(rushConfigPath);
      dstPath = path.resolve(monorepoRootDir, projectFolder, toShortName(name));
    }
  }
  if (fs.existsSync(dstPath)) {
    throw new Error('Failed to create ' + dstPath + ' as it already exits!');
  }
  await withSpinner('Creating \'' + name + '\'', async () => {
    const tempFileFuture: CompletableFuture<[string, () => void]> = new CompletableFuture<[string, () => void]>();
    if (templateType === 'monorepo' || templateType === 'project') {
      tmp.dir({unsafeCleanup: true}, (err, path, cleanUp) => {
        if (err) {
          cleanUp();
          tempFileFuture.completeExceptionally(err);
        }
        tempFileFuture.complete([path, cleanUp]);
      });
    } else {
      tmp.file((err, path, fd, cleanUp) => {
        if (err) {
          cleanUp();
          tempFileFuture.completeExceptionally(err);
        }
        tempFileFuture.complete([path, cleanUp]);
      });
    }
    const [tempFilePath, cleanUp] = await tempFileFuture.get();
    try {
      if (templateType === 'monorepo') {
        const rushExecutable = path.resolve(__dirname, '../node_modules/.bin/rush')
        const rushInitCmd = spawnSync(rushExecutable, ['init'], {encoding : 'utf8', cwd: tempFilePath});
        if (rushInitCmd.error) {
          throw new Error('Error initializing monorepo: ' + rushInitCmd.error.message);
        }
        // remove files that will be replaced by template
        const rushGitIgnorePath = path.resolve(tempFilePath, '.gitignore');
        if (fs.existsSync(rushGitIgnorePath)) {
          await fs.remove(rushGitIgnorePath);
        }
        const rushConfigPath = path.resolve(tempFilePath, 'rush.json');
        if (fs.existsSync(rushConfigPath)) {
          await fs.remove(rushConfigPath);
        }
        const versionPoliciesPath = path.resolve(tempFilePath, 'common', 'config', 'rush', 'version-policies.json');
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
      }
      await fs.copy(srcPath, tempFilePath);
      if (templateType === 'monorepo') {
        // Replace template names with generated project name
        await replace({
          files: tempFilePath + '/**/*',
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
        const dotDockerIgnorePath = path.resolve(tempFilePath, 'dot-dockerignore');
        if (fs.existsSync(dotDockerIgnorePath)) {
          await fs.move(dotDockerIgnorePath, path.resolve(tempFilePath, '.dockerignore'));
        }
      } else if (templateType === 'project') {
        // Delete files that might be copied over if this is a local dev install
        const nodeModulesPath = path.resolve(tempFilePath, 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
          await fs.remove(nodeModulesPath);
        }
        const rushPath = path.resolve(tempFilePath, '.rush');
        if (fs.existsSync(rushPath)) {
          await fs.remove(rushPath);
        }

        // Replace template names with generated project name
        await replace({
          files: tempFilePath + '/**/*',
          from: /HATCH_CLI_TEMPLATE_VAR_projectName/g,
          to: name,
        });
        await replace({
          files: tempFilePath + '/**/*',
          from: /HATCH_CLI_TEMPLATE_VAR_projectShortName/g,
          to: toShortName(name),
        });
        await replace({
          files: tempFilePath + '/package.json',
          from: '@launchtray/hatch-template-' + templateName,
          to: name,
        });

        // Rename hidden / project files
        const imlPath = path.resolve(tempFilePath, 'dot-idea', 'HATCH_CLI_TEMPLATE_VAR_projectShortName.iml');
        if (fs.existsSync(imlPath)) {
          await fs.move(imlPath, path.resolve(tempFilePath, 'dot-idea', `${toShortName(name)}.iml`));
        }
        const dotIdeaPath = path.resolve(tempFilePath, 'dot-idea');
        if (fs.existsSync(dotIdeaPath)) {
          await fs.move(dotIdeaPath, path.resolve(tempFilePath, '.idea'));
        }
        const dotStorybookPath = path.resolve(tempFilePath, 'dot-storybook');
        if (fs.existsSync(dotStorybookPath)) {
          await fs.move(dotStorybookPath, path.resolve(tempFilePath, '.storybook'));
        }
        const dotGitIgnorePath = path.resolve(tempFilePath, 'dot-gitignore');
        if (fs.existsSync(dotGitIgnorePath)) {
          await fs.move(dotGitIgnorePath, path.resolve(tempFilePath, '.gitignore'));
        }
        const dotDockerIgnorePath = path.resolve(tempFilePath, 'dot-dockerignore');
        if (fs.existsSync(dotDockerIgnorePath)) {
          await fs.move(dotDockerIgnorePath, path.resolve(tempFilePath, '.dockerignore'));
        }
        const testPath = path.resolve(tempFilePath, 'src', '__test__', 'HATCH_CLI_TEMPLATE_VAR_projectShortName.test.ts');
        if (fs.existsSync(testPath)) {
          await fs.move(testPath, path.resolve(tempFilePath, 'src', '__test__', `${toShortName(name)}.test.ts`));
        }
        if (rushConfigPath && monorepoRootDir && projectFolder) {
          const rushConfigRaw = fs.readFileSync(rushConfigPath).toString();
          const rushConfigParsed = parse(rushConfigRaw);
          const projectRelativePath = path.join(projectFolder, toShortName(name));
          const project: {[key: string]: any} = {
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
        }
      } else {
        await replace({
          files: tempFilePath,
          from: /HATCH_CLI_TEMPLATE_VAR_moduleName/g,
          to: name,
        });
      }
      await fs.copy(tempFilePath, dstPath);
    } finally {
      cleanUp();
    }
  });
  return dstPath;
};

export const templatePath = (parentDirectory: string, templateFile: string) => {
  return path.resolve(parentDirectory, '../../../src/templates/', path.basename(parentDirectory), templateFile);
};

export const templateDir = (parentDirectory: string, dirName = 'template') => {
  return templatePath(parentDirectory, dirName);
};

export const templateFile = (parentDirectory: string, extension = 'ts', moduleName = 'template') => {
  return templatePath(parentDirectory, moduleName + '.' + extension);
};

export const runCommander = () => {
  commander.parseAsync(process.argv)
    .catch((err) => {
      console.error(chalk.red(err.message));
      commander.help();
    });
};
