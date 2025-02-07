import { Config } from '../config';
import { PackageExecutor } from '../executor/package-executor';
import { loadPackagesToHook, setupPATH } from '../loaders/load-hooks';
import { HookType, VCSSensitiveHook } from '../types/hook.types';
import { MookmeUI } from '../ui';
import { GitToolkit } from '../utils/git';
import logger from '../utils/logger';
import { processResults } from '../utils/run-helpers';

/**
 * The available options for the `run` command. See `addRun`
 */
export interface RunOptions {
  /**
   * The hook type executed. See {@link HookType}
   */
  type: HookType;
  /**
   * The args provided in the git command. See https://git-scm.com/docs/githooks
   */
  args: string;
  /**
   * A boolean parameter to detect if the whole hook suite should be ran, regardless of the VCS state
   */
  all: boolean;
}

/**
 * A class holding the code executed in the `run` command of Mookme.
 */
export class RunRunner {
  ui: MookmeUI;
  config: Config;
  gitToolkit: GitToolkit;

  /**
   * A class holding the code executed in the `run` command of Mookme.
   *
   * @param ui - the {@link MookmeUI} instance of Mookme to use to output the command execution
   * @param config - the {@link Config} instance to use to parametrize the execution
   * @param gitToolkit - the {@link GitToolkit} instance to use to manage the VCS state
   */
  constructor(ui: MookmeUI, config: Config, gitToolkit: GitToolkit) {
    this.ui = ui;
    this.config = config;
    this.gitToolkit = gitToolkit;
  }

  /**
   * Run a suite of git hooks defined for Mookme.
   *
   * @param opts - the command options passed to Commander.
   */
  async run(opts: RunOptions): Promise<void> {
    // Initiate console UI output
    this.ui.start();

    // Load the VCS state
    const { staged: stagedFiles, notStaged: initialNotStagedFiles } = this.gitToolkit.getVCSState();

    const { type: hookType, args: hookArgs } = opts;
    this.config.updateExecutionContext({
      hookArgs,
      hookType,
      stagedFiles,
    });

    // Extend the path with partial commands
    setupPATH(this.config.project.rootDir);

    // Load packages hooks to run
    const packagesToHook = loadPackagesToHook(hookType, { all: opts.all });
    if (packagesToHook.length === 0) {
      return;
    }

    // Instanciate the package executors
    const packageExecutors = packagesToHook.map((pkg) => new PackageExecutor(pkg));

    // Run them concurrently and await the results
    const executions = packageExecutors.map((executor) => executor.executePackageSteps());
    const packagesErrors = await Promise.all(executions).catch((err) => {
      logger.failure(' Unexpected error ! ');
      console.error(err);
      process.exit(1);
    });

    // Wait for events to be processed
    setTimeout(() => {
      processResults(packagesErrors);
      this.ui.stop();
    }, 500);

    // Do not start modified files procedure, unless we are about to commit
    if (VCSSensitiveHook.includes(opts.type)) {
      this.gitToolkit.detectAndProcessModifiedFiles(initialNotStagedFiles, this.config.project.addedBehavior);
    }
  }
}
