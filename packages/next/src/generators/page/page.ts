import { componentGenerator as reactComponentGenerator } from '@nrwl/react';
import {
  convertNxGenerator,
  formatFiles,
  runTasksInSerial,
  Tree,
} from '@nrwl/devkit';

import { addStyleDependencies } from '../../utils/styles';
import { Schema } from './schema';

/*
 * This schematic is basically the React component one, but for Next we need
 * extra dependencies for css, sass, less, styl style options, and make sure
 * it is under `pages` folder.
 */
export async function pageGenerator(host: Tree, options: Schema) {
  const directory = options.directory ? `pages/${options.directory}` : 'pages';
  const componentTask = await reactComponentGenerator(host, {
    ...options,
    directory,
    pascalCaseFiles: false,
    export: false,
    classComponent: false,
    routing: false,
    skipTests: !options.withTests,
    flat: !!options.flat,
    fileName: !options.flat ? 'index' : undefined,
    skipFormat: true,
  });

  const styledTask = addStyleDependencies(host, options.style);

  if (!options.skipFormat) {
    await formatFiles(host);
  }

  return runTasksInSerial(componentTask, styledTask);
}

export default pageGenerator;
export const pageSchematic = convertNxGenerator(pageGenerator);
