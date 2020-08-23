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

export const createFromTemplate = async ({srcPath, dstPath, name, templateType, projectFolder}: CopyDirOptions) => {
  const templateName = path.basename(path.dirname(path.resolve(srcPath)));
  let rushConfigPath: string | undefined;
  if (templateType === 'project' && projectFolder) {
    rushConfigPath = RushConfiguration.tryFindRushJsonLocation({startingFolder: dstPath});
    if (rushConfigPath) {
      const rushConfigDir = path.dirname(rushConfigPath);
      dstPath = path.resolve(rushConfigDir, projectFolder, name);
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
          files: tempFilePath + '/package.json',
          from: '@launchtray/hatch-template-' + templateName,
          to: name
        });

        // Rename hidden / project files
        const imlPath = path.resolve(tempFilePath, 'dot-idea', 'HATCH_CLI_TEMPLATE_VAR_projectName.iml');
        if (fs.existsSync(imlPath)) {
          await fs.move(imlPath, path.resolve(tempFilePath, 'dot-idea', `${name}.iml`));
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
        const testPath = path.resolve(tempFilePath, 'src', '__test__', 'HATCH_CLI_TEMPLATE_VAR_projectName.test.ts');
        if (fs.existsSync(testPath)) {
          await fs.move(testPath, path.resolve(tempFilePath, 'src', '__test__', `${name}.test.ts`));
        }
        if (rushConfigPath && projectFolder) {
          const rushConfigRaw = fs.readFileSync(rushConfigPath).toString();
          const rushConfigParsed = parse(rushConfigRaw);
          const projectRelativePath = path.join(projectFolder, name);
          rushConfigParsed.projects.push({
            packageName: name,
            projectFolder: projectRelativePath,
            shouldPublish: true,
          });
          const rushConfigRawUpdated = stringify(rushConfigParsed, null, 2);
          fs.writeFileSync(rushConfigPath, rushConfigRawUpdated);
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
