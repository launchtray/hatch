import {ProjectChangeAnalyzer, RushConfiguration, RushConfigurationProject} from '@microsoft/rush-lib';
import {Terminal, ConsoleTerminalProvider} from '@rushstack/node-core-library';

const getBoolean = (value?: string): boolean | undefined => {
  if (value == null) {
    return undefined;
  }
  switch (value.toLowerCase()) {
    case 'true':
    case '1':
    case 'yes':
      return true;
    default:
      return false;
  }
};

export const runCli = async () => {
  const formatPrinters: {[key: string]: (projects: Set<RushConfigurationProject>, terminal: Terminal) => void} = {
    list: (projects, terminal) => {
      for (const project of projects) {
        terminal.writeLine(project.packageName);
      }
    },
    'from-args': (projects, terminal) => {
      let i = 0;
      for (const project of projects) {
        terminal.write(`-f ${project.packageName}`);
        if (i !== projects.size - 1) {
          terminal.write(' ');
        }
        i += 1;
      }
    },
    'impacted-by-args': (projects, terminal) => {
      let i = 0;
      for (const project of projects) {
        terminal.write(`-i ${project.packageName}`);
        if (i !== projects.size - 1) {
          terminal.write(' ');
        }
        i += 1;
      }
    },
  };

  const argv = process.argv.slice(2);
  const args: {[argName: string]: string} = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i]] = argv[i + 1];
  }

  const rushConfig = RushConfiguration.loadFromDefaultLocation();
  const defaultBranch = rushConfig.repositoryDefaultFullyQualifiedRemoteBranch ?? 'origin/develop';
  const includeExternalDependencies = getBoolean(args['--include-external-dependencies']) ?? true;
  const enableFiltering = getBoolean(args['--enable-filtering']) ?? true;
  const pullRequestTargetBranch = process.env.ghprbTargetBranch == null
    ? undefined
    : `origin/${process.env.ghprbTargetBranch}`;
  const targetBranchName = args['--target-branch'] ?? pullRequestTargetBranch ?? defaultBranch;
  const outputFormat = args['--format'] ?? 'list';
  const formats = Object.keys(formatPrinters);
  if (!formats.includes(outputFormat)) {
    throw new Error(`Invalid format argument '${outputFormat}'. Expected one of: ${formats.join(', ')}`);
  }

  const changeAnalyzer = new ProjectChangeAnalyzer(rushConfig);
  const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());
  const projects: Set<RushConfigurationProject> = await changeAnalyzer.getChangedProjectsAsync({
    terminal,
    targetBranchName,
    includeExternalDependencies,
    enableFiltering,
  });
  const formatPrinter = formatPrinters[outputFormat];
  formatPrinter(projects, terminal);
};

// eslint-disable-next-line no-console
runCli().catch(console.error);
