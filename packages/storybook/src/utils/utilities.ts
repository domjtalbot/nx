import {
  readJson,
  readJsonFile,
  TargetConfiguration,
  Tree,
} from '@nrwl/devkit';
import { CompilerOptions } from 'typescript';
import { storybookVersion } from './versions';
import { statSync } from 'fs';
import { findNodes } from 'nx/src/utils/typescript';
import ts = require('typescript');
import { gte } from 'semver';
import { join } from 'path';

export const Constants = {
  addonDependencies: ['@storybook/addons'],
  tsConfigExclusions: ['stories', '**/*.stories.ts'],
  pkgJsonScripts: {
    storybook: 'start-storybook -p 9001 -c .storybook',
  },
  jsonIndentLevel: 2,
  coreAddonPrefix: '@storybook/addon-',
  uiFrameworks: {
    angular: '@storybook/angular',
    react: '@storybook/react',
    html: '@storybook/html',
    'web-components': '@storybook/web-components',
    vue: '@storybook/vue',
    vue3: '@storybook/vue3',
    svelte: '@storybook/svelte',
    'react-native': '@storybook/react-native',
  } as const,
  uiFrameworks7: [
    '@storybook/angular',
    '@storybook/html-webpack5',
    '@storybook/nextjs',
    '@storybook/preact-webpack5',
    '@storybook/react-webpack5',
    '@storybook/react-vite',
    '@storybook/server-webpack5',
    '@storybook/svelte-webpack5',
    '@storybook/svelte-vite',
    '@storybook/sveltekit',
    '@storybook/vue-webpack5',
    '@storybook/vue-vite',
    '@storybook/vue3-webpack5',
    '@storybook/vue3-vite',
    '@storybook/web-components-webpack5',
    '@storybook/web-components-vite',
  ],
};
type Constants = typeof Constants;

type Framework = {
  type: keyof Constants['uiFrameworks'];
  uiFramework: Constants['uiFrameworks'][keyof Constants['uiFrameworks']];
};

export function isStorybookV7() {
  const storybookPackageVersion = require(join(
    '@storybook/core-server',
    'package.json'
  )).version;
  return gte(storybookPackageVersion, '7.0.0-alpha.0');
}

export function safeFileDelete(tree: Tree, path: string): boolean {
  if (tree.exists(path)) {
    tree.delete(path);
    return true;
  } else {
    return false;
  }
}

export function readCurrentWorkspaceStorybookVersionFromGenerator(
  tree: Tree
): string {
  const packageJsonContents = readJson(tree, 'package.json');
  return determineStorybookWorkspaceVersion(packageJsonContents);
}

export function readCurrentWorkspaceStorybookVersionFromExecutor() {
  const packageJsonContents = readJsonFile('package.json');
  return determineStorybookWorkspaceVersion(packageJsonContents);
}

function determineStorybookWorkspaceVersion(packageJsonContents) {
  let workspaceStorybookVersion = storybookVersion;

  if (packageJsonContents && packageJsonContents['devDependencies']) {
    if (packageJsonContents['devDependencies']['@storybook/angular']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/angular'];
    }
    if (packageJsonContents['devDependencies']['@storybook/react']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/react'];
    }
    if (packageJsonContents['devDependencies']['@storybook/core']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/core'];
    }
    if (packageJsonContents['devDependencies']['@storybook/react-native']) {
      workspaceStorybookVersion =
        packageJsonContents['devDependencies']['@storybook/react-native'];
    }
  }

  if (packageJsonContents && packageJsonContents['dependencies']) {
    if (packageJsonContents['dependencies']['@storybook/angular']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/angular'];
    }
    if (packageJsonContents['dependencies']['@storybook/react']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/react'];
    }
    if (packageJsonContents['dependencies']['@storybook/core']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/core'];
    }
    if (packageJsonContents['dependencies']['@storybook/react-native']) {
      workspaceStorybookVersion =
        packageJsonContents['dependencies']['@storybook/react-native'];
    }
  }

  return workspaceStorybookVersion;
}

export type TsConfig = {
  extends: string;
  compilerOptions: CompilerOptions;
  files?: string[];
  include?: string[];
  exclude?: string[];
  references?: Array<{ path: string }>;
};

export function storybookConfigExistsCheck(
  config: string,
  projectName: string
): void {
  const exists = !!(config && statSync(config).isDirectory());

  if (!exists) {
    throw new Error(
      `Could not find Storybook configuration for project ${projectName}.
      Please generate Storybook configuration using the following command:

      nx g @nrwl/storybook:configuration --name=${projectName}
      `
    );
  }
}

export function dedupe(arr: string[]) {
  return Array.from(new Set(arr));
}

export function findStorybookAndBuildTargetsAndCompiler(targets: {
  [targetName: string]: TargetConfiguration;
}): {
  storybookBuildTarget?: string;
  storybookTarget?: string;
  ngBuildTarget?: string;
  nextBuildTarget?: string;
  viteBuildTarget?: string;
  otherBuildTarget?: string;
  compiler?: string;
} {
  const returnObject: {
    storybookBuildTarget?: string;
    storybookTarget?: string;
    ngBuildTarget?: string;
    nextBuildTarget?: string;
    viteBuildTarget?: string;
    otherBuildTarget?: string;
    compiler?: string;
  } = {};

  const arrayOfBuilders = [
    '@nxext/vite:build',
    '@nrwl/js:babel',
    '@nrwl/js:swc',
    '@nrwl/js:tsc',
    '@nrwl/webpack:webpack',
    '@nrwl/rollup:rollup',
    '@nrwl/web:rollup',
    '@nrwl/vite:build',
    '@nrwl/angular:ng-packagr-lite',
    '@nrwl/angular:package',
    '@nrwl/angular:webpack-browser',
    '@angular-devkit/build-angular:browser',
    '@nrwl/esbuild:esbuild',
    '@nrwl/next:build',
    '@nrwl/react-native:bundle',
    '@nrwl/react-native:build-android',
    '@nrwl/react-native:bundle',
  ];

  for (const target in targets) {
    if (arrayOfBuilders.includes(targets[target].executor)) {
      if (
        targets[target].executor === '@angular-devkit/build-angular:browser'
      ) {
        /**
         * Not looking for '@nrwl/angular:ng-packagr-lite' or any other
         * @nrwl/angular:* executors.
         * Only looking for '@angular-devkit/build-angular:browser'
         * because the '@nrwl/angular:ng-packagr-lite' executor
         * (and maybe the other custom executors)
         * does not support styles and extra options, so the user
         * will be forced to switch to build-storybook to add extra options.
         *
         * So we might as well use the build-storybook by default to
         * avoid any errors.
         */
        returnObject.ngBuildTarget = target;
      } else if (targets[target].executor.includes('vite')) {
        returnObject.viteBuildTarget = target;
      } else if (targets[target].executor.includes('next')) {
        returnObject.nextBuildTarget = target;
      } else {
        returnObject.otherBuildTarget = target;
      }
      returnObject.compiler = targets[target].options?.compiler;
    } else if (
      targets[target].executor === '@storybook/angular:start-storybook' ||
      targets[target].executor === '@nrwl/storybook:storybook'
    ) {
      returnObject.storybookTarget = target;
    } else if (
      targets[target].executor === '@storybook/angular:build-storybook' ||
      targets[target].executor === '@nrwl/storybook:build'
    ) {
      returnObject.storybookBuildTarget = target;
    } else if (targets[target].options?.compiler) {
      returnObject.otherBuildTarget = target;
      returnObject.compiler = targets[target].options?.compiler;
    }
  }

  return returnObject;
}

export function isTheFileAStory(tree: Tree, path: string): boolean {
  const ext = path.slice(path.lastIndexOf('.'));
  let fileIsStory = false;
  if (ext === '.tsx' || ext === '.ts') {
    const file = getTsSourceFile(tree, path);
    const importArray = findNodes(file, [ts.SyntaxKind.ImportDeclaration]);
    let nodeContainsStorybookImport = false;
    let nodeContainsStoryImport = false;
    importArray.forEach((importNode: ts.ImportClause) => {
      const importPath = findNodes(importNode, [ts.SyntaxKind.StringLiteral]);
      importPath.forEach((importPath: ts.StringLiteral) => {
        if (importPath.getText()?.includes('@storybook/')) {
          nodeContainsStorybookImport = true;
        }
      });
      const importSpecifiers = findNodes(importNode, [
        ts.SyntaxKind.ImportSpecifier,
      ]);
      importSpecifiers.forEach((importSpecifier: ts.ImportSpecifier) => {
        if (
          importSpecifier.getText() === 'Story' ||
          importSpecifier.getText() === 'storiesOf' ||
          importSpecifier.getText() === 'ComponentStory'
        ) {
          nodeContainsStoryImport = true;
        }
      });

      // We place this check within the loop, because we want the
      // import combination of Story from @storybook/*
      if (nodeContainsStorybookImport && nodeContainsStoryImport) {
        fileIsStory = true;
      }
    });
  } else {
    fileIsStory =
      (path.endsWith('.js') && path.endsWith('.stories.js')) ||
      (path.endsWith('.jsx') && path.endsWith('.stories.jsx'));
  }

  return fileIsStory;
}

export function getTsSourceFile(host: Tree, path: string): ts.SourceFile {
  const buffer = host.read(path);
  if (!buffer) {
    throw new Error(`Could not read TS file (${path}).`);
  }
  const content = buffer.toString();
  const source = ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  return source;
}
