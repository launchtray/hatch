import {Terminal, FileWriter} from '@rushstack/node-core-library';
import fs from 'fs';
import {createObjectCsvStringifier} from 'csv-writer';
import * as process from 'process';
import * as path from 'path';
import jmespath from 'jmespath';
import YAML from 'yaml';
import {
  getProjects,
  isString,
  OutputWriter,
  parseDependencyAnalysisArgs,
  PnpmListProject,
} from './util';

interface DependencyMetadata {
  requiredDependencyFields?: string[];
  packageJsonFields?: {[fieldName: string]: string};
  packageNamePrefixAuthors?: {[prefix: string]: string};
  dependencies?: {
    [packageName: string]: {
      [metadataFieldName: string]: string,
    },
  };
}

interface IdentifiedDependency {
  name: string;
  version: string;
  metadata: {
    [metadataFieldName: string]: string
  };
}

const requireMetadata = (
  metadata: {[metadataFieldName: string]: string},
  dependencyName: string,
  requiredMetadataFields?: string[],
) => {
  if (requiredMetadataFields != null) {
    for (const fieldKey of requiredMetadataFields) {
      if (metadata?.[fieldKey] == null) {
        throw new Error(`Missing '${fieldKey}' for package ${dependencyName}`);
      }
    }
  }
};

const addMetadataFields = (
  existingFields: string[],
  fieldsToAdd: string[] | undefined,
) => {
  if (fieldsToAdd != null) {
    for (const fieldKey of fieldsToAdd) {
      if (!existingFields.includes(fieldKey)) {
        existingFields.push(fieldKey);
      }
    }
  }
};

const addPackageJsonMetadata = (
  metadata: {[key: string]: string},
  project: PnpmListProject,
  dependencyName: string,
  dependencyMetadata: DependencyMetadata,
) => {
  try {
    const packageJsonPath = path.resolve(project.path, 'node_modules', `${dependencyName}`, 'package.json');
    const packageInfo = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const packageJsonFields = {
      author: 'author.name||author',
      license: 'license',
      description: 'description',
      ...dependencyMetadata.packageJsonFields,
    };
    for (const key of Object.keys(packageJsonFields)) {
      try {
        const valuePath = packageJsonFields[key];
        if (valuePath != null && metadata[key] == null) {
          // eslint-disable-next-line no-param-reassign -- intentional modification
          metadata[key] = jmespath.search(packageInfo, packageJsonFields[key]);
        }
      } catch (err) {
        // Ignored
      }
    }
  } catch (err) {
    // Ignored
  }
};

const addAuthorFromPackageNamePrefix = (
  metadata: {[key: string]: string},
  dependencyName: string,
  dependencyMetadata: DependencyMetadata,
) => {
  if (metadata.author == null && dependencyMetadata.packageNamePrefixAuthors != null) {
    const prefixes = Object.keys(dependencyMetadata.packageNamePrefixAuthors);
    for (const prefix of prefixes) {
      if (dependencyName.startsWith(prefix)) {
        // eslint-disable-next-line no-param-reassign -- intentional out param
        metadata.author = dependencyMetadata.packageNamePrefixAuthors[prefix];
        return;
      }
    }
  }
};

const gatherDependencies = (
  project: PnpmListProject,
  pnpmProjectsByName: Map<string, PnpmListProject>,
  visitedProjects: Set<string>,
  identifiedDependencies: Map<string, IdentifiedDependency>,
  identifiedMetadataFields: string[],
  dependencyMetadataKey?: string,
) => {
  if (visitedProjects.has(project.name)) {
    return;
  }
  visitedProjects.add(project.name);
  const packageJson: {
    [dependencyMetadataKey: string]: string | DependencyMetadata,
  } = JSON.parse(fs.readFileSync(`${project.path}/package.json`, 'utf8'));
  let dependencyMetadata: DependencyMetadata;
  if (dependencyMetadataKey != null && packageJson[dependencyMetadataKey] != null) {
    const dependencyMetadataValue = packageJson[dependencyMetadataKey];
    if (isString(dependencyMetadataValue)) {
      const metadataFile = path.resolve(project.path, dependencyMetadataValue);
      dependencyMetadata = YAML.parseDocument(fs.readFileSync(metadataFile, 'utf8')).toJS();
    } else {
      dependencyMetadata = dependencyMetadataValue;
    }
  } else {
    dependencyMetadata = {};
  }
  const requiredMetadataFields = dependencyMetadata.requiredDependencyFields;
  addMetadataFields(identifiedMetadataFields, requiredMetadataFields);
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
          identifiedMetadataFields,
          dependencyMetadataKey,
        );
      } else if (!identifiedDependencies.has(dependencyName)) {
        const metadata = dependencyMetadata.dependencies?.[dependencyName] ?? {};
        addPackageJsonMetadata(metadata, project, dependencyName, dependencyMetadata);
        addAuthorFromPackageNamePrefix(metadata, dependencyName, dependencyMetadata);
        requireMetadata(metadata, dependencyName, requiredMetadataFields);
        addMetadataFields(identifiedMetadataFields, Object.keys(metadata));

        const dependencyVersion = dependency[1].version;
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
  private stringifier?: ReturnType<typeof createObjectCsvStringifier>;
  private headerWritten = false;

  constructor(
    private readonly output: OutputWriter,
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
        this.output.write(headerLine);
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
      this.output.write(csvLine);
    }
  }
}

class JsonPrinter implements DependencyPrinter {
  private firstProjectWritten = false;
  private firstDependencyForProjectWritten = false;

  constructor(
    private readonly output: OutputWriter,
  ) {
  }

  startMultiProject() {
    this.output.write('{');
  }

  startProject({multiProject, project}: PrinterArgsForStartProject) {
    this.firstDependencyForProjectWritten = false;
    if (multiProject) {
      if (this.firstProjectWritten) {
        this.output.write(',');
      } else {
        this.firstProjectWritten = true;
      }
      this.output.write(`${JSON.stringify(project.name)}:`);
    }
    this.output.write('[');
  }

  addDependency({dependency}: PrinterArgsForAddDependency) {
    if (this.firstDependencyForProjectWritten) {
      this.output.write(',');
    } else {
      this.firstDependencyForProjectWritten = true;
    }
    this.output.write(JSON.stringify(dependency));
  }

  endProject() {
    this.output.write(']');
  }

  endMultiProject() {
    this.output.write('}');
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

const getDependencyPrinter = (
  terminal: Terminal,
  outputPath?: string,
  outputFormat?: string,
): DependencyPrinter => {
  const format = outputFormat ?? 'json';
  let output: OutputWriter;
  if (outputPath == null) {
    output = terminal;
  } else {
    output = FileWriter.open(outputPath);
  }
  switch (format.toLowerCase()) {
    case 'json':
      return new JsonPrinter(output);
    case 'csv':
      return new CsvPrinter(output);
    default:
      throw new Error(`Invalid output format: ${format}`);
  }
};

export const runCli = async () => {
  const {
    targetProject,
    dependencyMetadataKey,
    outputPath,
    outputFormat,
    terminal,
  } = parseDependencyAnalysisArgs();

  const dependencyPrinter: DependencyPrinter = getDependencyPrinter(
    terminal,
    outputPath,
    outputFormat,
  );

  const {projects, projectsByName} = getProjects();

  if (targetProject != null) {
    const project = projectsByName.get(targetProject);
    if (project == null) {
      throw new Error('Invalid project name');
    }
    const visitedProjects = new Set<string>();
    const identifiedDependencies = new Map<string, IdentifiedDependency>();
    const metadataFields: string[] = [];
    gatherDependencies(
      project,
      projectsByName,
      visitedProjects,
      identifiedDependencies,
      metadataFields,
      dependencyMetadataKey,
    );
    printDependencies(dependencyPrinter, project, identifiedDependencies, metadataFields, false);
  } else {
    dependencyPrinter.startMultiProject?.();
    const projectDependencies: {
      [projectName: string]: Map<string, IdentifiedDependency>
    } = {};
    const metadataFields: string[] = [];
    for (const project of projects) {
      const visitedProjects = new Set<string>();
      const identifiedDependencies = new Map<string, IdentifiedDependency>();
      projectDependencies[project.name] = identifiedDependencies;
      gatherDependencies(
        project,
        projectsByName,
        visitedProjects,
        identifiedDependencies,
        metadataFields,
        dependencyMetadataKey,
      );
    }
    for (const project of projects) {
      const dependencies = projectDependencies[project.name];
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
