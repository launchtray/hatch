import {spawnSync} from 'child_process';
import process from 'process';
import {ConsoleTerminalProvider, Terminal} from '@rushstack/node-core-library';

export interface PnpmListProject {
  name: string;
  version: string;
  path: string;
  dependencies: {[name: string]: {version: string}},
}

export interface OutputWriter {
  write(message: string): void;
}

export const isString = (input: unknown): input is string => {
  return typeof input === 'string';
};

export const runPnpm = (args: string[]): string => {
  const commandResult = spawnSync('rush-pnpm', args, {encoding: 'utf8'});
  if (commandResult.error != null) {
    throw new Error(commandResult.error.message);
  }
  return commandResult.stdout;
};

export const parseDependencyAnalysisArgs = () => {
  const argv = process.argv.slice(2);
  const args: {[argName: string]: string} = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i]] = argv[i + 1];
  }

  const targetProject = args['--project'];
  const dependencyMetadataKey = args['--dependency-metadata-key'] ?? '@launchtray/dependency-metadata';
  const terminal = new Terminal(new ConsoleTerminalProvider());
  return {
    targetProject,
    dependencyMetadataKey,
    outputPath: args['--output'],
    outputFormat: args['--format'],
    terminal,
  };
};

export const getProjects = (): {projects: PnpmListProject[], projectsByName: Map<string, PnpmListProject>} => {
  const listOutput = runPnpm(['list', '-r', '-P', '--json']);
  const projects: PnpmListProject[] = (JSON.parse(listOutput) as PnpmListProject[]).filter(({name}) => {
    return name !== 'rush-common';
  });
  const projectsByName = new Map<string, PnpmListProject>();
  for (const project of projects) {
    projectsByName.set(project.name, project);
  }
  return {
    projects,
    projectsByName,
  };
};
