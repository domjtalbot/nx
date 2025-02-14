import { NormalizedSchema } from './normalized-schema';
import type { ProjectConfiguration, Tree } from '@nrwl/devkit';
import { addProjectConfiguration } from '@nrwl/devkit';
import { getInstalledAngularVersionInfo } from '../../utils/version-utils';

export function createProject(tree: Tree, options: NormalizedSchema) {
  const installedAngularInfo = getInstalledAngularVersionInfo(tree);
  const project: ProjectConfiguration & { prefix: string } = {
    name: options.name,
    projectType: 'application',
    prefix: options.prefix,
    root: options.appProjectRoot,
    sourceRoot: `${options.appProjectRoot}/src`,
    tags: options.parsedTags,
    targets: {
      build: {
        executor: '@angular-devkit/build-angular:browser',
        outputs: ['{options.outputPath}'],
        options: {
          outputPath: `dist/${
            !options.rootProject ? options.appProjectRoot : options.name
          }`,
          index: `${options.appProjectRoot}/src/index.html`,
          main: `${options.appProjectRoot}/src/main.ts`,
          polyfills:
            installedAngularInfo.major === 14
              ? `${options.appProjectRoot}/src/polyfills.ts`
              : ['zone.js'],
          tsConfig: `${options.appProjectRoot}/tsconfig.app.json`,
          assets: [
            `${options.appProjectRoot}/src/favicon.ico`,
            `${options.appProjectRoot}/src/assets`,
          ],
          styles: [`${options.appProjectRoot}/src/styles.${options.style}`],
          scripts: [],
        },
        configurations: {
          production: {
            budgets: [
              {
                type: 'initial',
                maximumWarning: '500kb',
                maximumError: '1mb',
              },
              {
                type: 'anyComponentStyle',
                maximumWarning: '2kb',
                maximumError: '4kb',
              },
            ],
            fileReplacements:
              installedAngularInfo.major === 14
                ? [
                    {
                      replace: `${options.appProjectRoot}/src/environments/environment.ts`,
                      with: `${options.appProjectRoot}/src/environments/environment.prod.ts`,
                    },
                  ]
                : undefined,
            outputHashing: 'all',
          },
          development: {
            buildOptimizer: false,
            optimization: false,
            vendorChunk: true,
            extractLicenses: false,
            sourceMap: true,
            namedChunks: true,
          },
        },
        defaultConfiguration: 'production',
      },
      serve: {
        executor: '@angular-devkit/build-angular:dev-server',
        options: options.port
          ? {
              port: options.port,
            }
          : undefined,
        configurations: {
          production: {
            browserTarget: `${options.name}:build:production`,
          },
          development: {
            browserTarget: `${options.name}:build:development`,
          },
        },
        defaultConfiguration: 'development',
      },
      'extract-i18n': {
        executor: '@angular-devkit/build-angular:extract-i18n',
        options: {
          browserTarget: `${options.name}:build`,
        },
      },
    },
  };

  addProjectConfiguration(tree, options.name, project);
}
