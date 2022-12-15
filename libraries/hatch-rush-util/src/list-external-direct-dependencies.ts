import {Terminal, ConsoleTerminalProvider} from '@rushstack/node-core-library';
import {spawnSync} from 'child_process';
import fs from 'fs';
import {createObjectCsvStringifier} from 'csv-writer';
import {ObjectCsvStringifier} from 'csv-writer/src/lib/csv-stringifiers/object';
import * as process from 'process';

interface PnpmListProject {
  name: string;
  version: string;
  path: string;
  dependencies: {[name: string]: {version: string}},
}

interface IdentifiedDependency {
  name: string;
  version: string;
  metadata: {
    [metadataFieldName: string]: string
  };
}

const processMetadata = (
  metadata: {[metadataFieldName: string]: string},
  dependencyName: string,
  identifiedNonRequiredMetadataFields: string[],
  requiredMetadataFields?: string[],
) => {
  if (requiredMetadataFields != null) {
    for (const fieldKey of requiredMetadataFields) {
      if (metadata?.[fieldKey] == null) {
        throw new Error(`Missing '${fieldKey}' for package ${dependencyName}`);
      }
    }
  }
  if (metadata != null) {
    for (const fieldKey of Object.keys(metadata)) {
      if (requiredMetadataFields == null || !requiredMetadataFields.includes(fieldKey)) {
        if (!identifiedNonRequiredMetadataFields.includes(fieldKey)) {
          identifiedNonRequiredMetadataFields.push(fieldKey);
        }
      }
    }
  }
};

const gatherDependencies = (
  project: PnpmListProject,
  pnpmProjectsByName: Map<string, PnpmListProject>,
  visitedProjects: Set<string>,
  identifiedDependencies: Map<string, IdentifiedDependency>,
  identifiedNonRequiredMetadataFields: string[],
  dependencyMetadataKey?: string,
  requiredMetadataFields?: string[],
) => {
  if (visitedProjects.has(project.name)) {
    return;
  }
  visitedProjects.add(project.name);
  const packageJson: {
    [key: string]: {
      [packageName: string]: {
        [metadataFieldName: string]: string
      }
    }
  } = JSON.parse(fs.readFileSync(`${project.path}/package.json`, 'utf8'));
  let dependencyMetadata: {
    [packageName: string]: {
      [metadataFieldName: string]: string
    }
  };
  if (dependencyMetadataKey != null && packageJson[dependencyMetadataKey] != null) {
    dependencyMetadata = packageJson[dependencyMetadataKey];
  } else {
    dependencyMetadata = {};
  }
  const {dependencies} = project;
  if (dependencies != null) {
    for (const dependency of Object.entries(dependencies)) {
      const dependencyName = dependency[0];
      const localDependency = pnpmProjectsByName.get(dependencyName);
      if (localDependency != null) {
        gatherDependencies(
          localDependency,
          pnpmProjectsByName,
          visitedProjects,
          identifiedDependencies,
          identifiedNonRequiredMetadataFields,
          dependencyMetadataKey,
          requiredMetadataFields,
        );
      } else {
        const dependencyVersion = dependency[1].version;
        if (!identifiedDependencies.has(dependencyName)) {
          const metadata = dependencyMetadata[dependencyName];
          processMetadata(metadata, dependencyName, identifiedNonRequiredMetadataFields, requiredMetadataFields);
          identifiedDependencies.set(dependencyName, {
            name: dependencyName,
            version: dependencyVersion,
            metadata: {
              ...metadata,
            },
          });
        }
      }
    }
  }
};

interface PrinterArgsForStartProject {
  project: PnpmListProject,
  metadataFields: string[],
  multiProject: boolean,
}

interface PrinterArgsForAddDependency {
  dependency: IdentifiedDependency,
  metadataFields: string[],
  multiProject: boolean,
  project: PnpmListProject,
}

interface PrinterArgsForEndProject {
  multiProject: boolean,
}

interface DependencyPrinter {
  startMultiProject?(): void;
  startProject?(args: PrinterArgsForStartProject): void;
  addDependency?(args: PrinterArgsForAddDependency): void;
  endProject?(args: PrinterArgsForEndProject): void;
  endMultiProject?(): void;
}

class CsvPrinter implements DependencyPrinter {
  private stringifier?: ObjectCsvStringifier;
  private headerWritten = false;

  constructor(
    private readonly terminal: Terminal,
  ) {
  }

  startMultiProject() {
    this.headerWritten = false;
  }

  startProject({metadataFields, multiProject}: PrinterArgsForStartProject) {
    if (!this.headerWritten) {
      this.headerWritten = true;
      this.stringifier = createObjectCsvStringifier({
        header: [
          ...(multiProject ? [{id: 'project', title: 'project'}] : []),
          {id: 'name', title: 'name'},
          {id: 'version', title: 'version'},
          ...metadataFields.map((fieldKey) => ({id: fieldKey, title: fieldKey})),
        ],
      });
      const headerLine = this.stringifier?.getHeaderString();
      if (headerLine != null) {
        this.terminal.write(headerLine);
      }
    }
  }

  addDependency({dependency, project, multiProject}: PrinterArgsForAddDependency) {
    const csvLine = this.stringifier?.stringifyRecords([{
      ...(multiProject ? {project: project.name} : {}),
      name: dependency.name,
      version: dependency.version,
      ...dependency.metadata,
    }]);
    if (csvLine != null) {
      this.terminal.write(csvLine);
    }
  }
}

class JsonPrinter implements DependencyPrinter {
  private firstProjectWritten = false;
  private firstDependencyForProjectWritten = false;

  constructor(
    private readonly terminal: Terminal,
  ) {
  }

  startMultiProject() {
    this.terminal.write('{');
  }

  startProject({multiProject, project}: PrinterArgsForStartProject) {
    this.firstDependencyForProjectWritten = false;
    if (multiProject) {
      if (this.firstProjectWritten) {
        this.terminal.write(',');
      } else {
        this.firstProjectWritten = true;
      }
      this.terminal.write(`${JSON.stringify(project.name)}:`);
    }
    this.terminal.write('[');
  }

  addDependency({dependency}: PrinterArgsForAddDependency) {
    if (this.firstDependencyForProjectWritten) {
      this.terminal.write(',');
    } else {
      this.firstDependencyForProjectWritten = true;
    }
    this.terminal.write(JSON.stringify(dependency));
  }

  endProject() {
    this.terminal.write(']');
  }

  endMultiProject() {
    this.terminal.write('}');
  }
}

class TextPrinter implements DependencyPrinter {
  constructor(
    private readonly terminal: Terminal,
  ) {
  }

  startProject({project}: PrinterArgsForStartProject) {
    this.terminal.writeLine(`${project.name}: `);
  }

  addDependency({dependency}: PrinterArgsForAddDependency) {
    this.terminal.writeLine(`- ${dependency.name}: ${dependency.version}, ${JSON.stringify(dependency.metadata)}`);
  }
}

const printDependencies = (
  printer: DependencyPrinter,
  project: PnpmListProject,
  identifiedDependencies: Map<string, IdentifiedDependency>,
  metadataFields: string[],
  multiProject: boolean,
) => {
  const sortedDependencyNames = [...identifiedDependencies.keys()].sort();
  printer.startProject?.({project, metadataFields, multiProject});
  for (const dependencyName of sortedDependencyNames) {
    const dependency = identifiedDependencies.get(dependencyName);
    if (dependency != null) {
      printer.addDependency?.({dependency, metadataFields, multiProject, project});
    }
  }
  printer.endProject?.({multiProject});
};

const getDependencyPrinter = (terminal: Terminal, outputFormat?: string): DependencyPrinter => {
  const format = outputFormat ?? 'json';
  switch (format.toLowerCase()) {
    case 'json':
      return new JsonPrinter(terminal);
    case 'csv':
      return new CsvPrinter(terminal);
    case 'text':
      return new TextPrinter(terminal);
    default:
      throw new Error(`Invalid output format: ${format}`);
  }
};

export const runCli = async () => {
  const argv = process.argv.slice(2);
  const args: {[argName: string]: string} = {};
  for (let i = 0; i < argv.length; i += 2) {
    args[argv[i]] = argv[i + 1];
  }

  const targetProject = args['--project'];
  const dependencyMetadataKey = args['--metadata-key'] ?? '@launchtray/dependency-metadata';
  const requiredMetadataFields = args['--required-fields']?.split(',') ?? [];
  const terminal: Terminal = new Terminal(new ConsoleTerminalProvider());
  const dependencyPrinter: DependencyPrinter = getDependencyPrinter(terminal, args['--format']);

  const pnpmListCommand = spawnSync('rush-pnpm', ['list', '-r', '-P', '--json'], {encoding: 'utf8'});
  if (pnpmListCommand.error != null) {
    terminal.writeError(pnpmListCommand.stdout);
    throw new Error(pnpmListCommand.error.message);
  }
  const projects: PnpmListProject[] = (JSON.parse(pnpmListCommand.stdout) as PnpmListProject[]).filter(({name}) => {
    return name !== 'rush-common';
  });
  const pnpmProjectsByName = new Map<string, PnpmListProject>();

  for (const project of projects) {
    pnpmProjectsByName.set(project.name, project);
  }

  if (targetProject != null) {
    const project = pnpmProjectsByName.get(targetProject);
    if (project == null) {
      throw new Error('Invalid project name');
    }
    const visitedProjects = new Set<string>();
    const identifiedDependencies = new Map<string, IdentifiedDependency>();
    const identifiedNonRequiredMetadataFields: string[] = [];
    gatherDependencies(
      project,
      pnpmProjectsByName,
      visitedProjects,
      identifiedDependencies,
      identifiedNonRequiredMetadataFields,
      dependencyMetadataKey,
      requiredMetadataFields,
    );
    const metadataFields = [...requiredMetadataFields, ...identifiedNonRequiredMetadataFields];
    printDependencies(dependencyPrinter, project, identifiedDependencies, metadataFields, false);
  } else {
    dependencyPrinter.startMultiProject?.();
    const projectDependencies: {
      [projectName: string]: Map<string, IdentifiedDependency>
    } = {};
    const identifiedNonRequiredMetadataFields: string[] = [];
    for (const project of projects) {
      const visitedProjects = new Set<string>();
      const identifiedDependencies = new Map<string, IdentifiedDependency>();
      projectDependencies[project.name] = identifiedDependencies;
      gatherDependencies(
        project,
        pnpmProjectsByName,
        visitedProjects,
        identifiedDependencies,
        identifiedNonRequiredMetadataFields,
        dependencyMetadataKey,
        requiredMetadataFields,
      );
    }
    for (const project of projects) {
      const dependencies = projectDependencies[project.name];
      const metadataFields = [...requiredMetadataFields, ...identifiedNonRequiredMetadataFields];
      printDependencies(dependencyPrinter, project, dependencies, metadataFields, true);
    }
    dependencyPrinter.endMultiProject?.();
  }
};

runCli().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
});
