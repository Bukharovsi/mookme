import chalk from 'chalk';
import fs from 'fs';
import inquirer from 'inquirer';
import { ADDED_BEHAVIORS } from '../config/types';
import { HookType, hookTypes } from '../types/hook.types';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const folderQuestion = (name: string, from = '') => ({
  type: 'input',
  name,
  message: 'Please enter the path of the folder containing the packages:\n',
  validate(rpath: string) {
    let pass;
    try {
      pass = fs.lstatSync(from ? `./${from}/${rpath}` : `./${rpath}`).isDirectory();
    } catch (err) {
      pass = false;
    }
    if (pass) {
      return true;
    }
    return `Path ./${rpath} is not a valid folder path`;
  },
  transformer: (val: string) => (from ? `./${from}/${val}` : `./${val}`),
});

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const choiceQuestion = (name: string, message: string, choices: string[]) => ({
  type: 'checkbox',
  name,
  message,
  choices,
  pageSize: process.stdout.rows / 2,
});

export async function selectHookTypes(skip = false): Promise<HookType[]> {
  let typesToHook: HookType[];
  if (skip) {
    typesToHook = hookTypes;
  } else {
    const { types } = (await inquirer.prompt([
      choiceQuestion('types', 'Select git events to hook :\n', hookTypes),
    ])) as { types: HookType[] };
    typesToHook = types;
  }
  return typesToHook;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const confirmQuestion = (name: string, message: string) => ({
  type: 'confirm',
  name,
  message,
  default: false,
});

export const addedBehaviorQuestion = {
  type: 'list',
  name: 'addedBehavior',
  message: 'How should mookme behave when files are changed during hooks execution :\n',
  choices: [
    {
      name: `${chalk.bold('Exit (recommended):')} fail and exit without performing the commit`,
      value: ADDED_BEHAVIORS.EXIT,
    },
    {
      name: `${chalk.bold('Add them and keep going: ')} run \`git add .\` and continue`,
      value: ADDED_BEHAVIORS.ADD_AND_COMMIT,
    },
  ],
};
