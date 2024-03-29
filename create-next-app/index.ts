#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
import { cyan, green, red, yellow, bold, blue } from 'picocolors'
import Commander from 'commander'
import Conf from 'conf'
import path from 'path'
import prompts from 'prompts'
import type { InitialReturnValue } from 'prompts'
import checkForUpdate from 'update-check'
import { createApp, DownloadError } from './create-app'
import { getPkgManager } from './helpers/get-pkg-manager'
import { validateNpmName } from './helpers/validate-pkg'
import packageJson from './package.json'
import ciInfo from 'ci-info'
import { isFolderEmpty } from './helpers/is-folder-empty'
import fs from 'fs'

let projectPath: string = ''

const handleSigTerm = () => process.exit(0)

process.on('SIGINT', handleSigTerm)
process.on('SIGTERM', handleSigTerm)

const onPromptState = (state: {
  value: InitialReturnValue
  aborted: boolean
  exited: boolean
}) => {
  if (state.aborted) {
    // If we don't re-enable the terminal cursor before exiting
    // the program, the cursor will remain hidden
    process.stdout.write('\x1B[?25h')
    process.stdout.write('\n')
    process.exit(1)
  }
}

// Commander is a package for CLI available here:
// https://www.npmjs.com/package/commander
// packageJson is from import on top of the file
// import packageJson from './package.json'
// I personally never had to import anything from package.json, I guess you can do it.
const program = new Commander.Command(packageJson.name)
  // https://www.npmjs.com/package/commander#version-option
  .version(packageJson.version)
  // https://www.npmjs.com/package/commander#command-arguments
  .arguments('<project-directory>')
  // https://www.npmjs.com/package/commander#usage
  .usage(`${green('<project-directory>')} [options]`)
  // https://www.npmjs.com/package/commander#action-handler
  .action((name) => {
    projectPath = name
    console.log("projectPath", projectPath);
  })
  // https://www.npmjs.com/package/commander#options
  // --ts option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--ts, --typescript',
    `

  Initialize as a TypeScript project. (default)
`
  )
  // https://www.npmjs.com/package/commander#options
  // --js option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--js, --javascript',
    `

  Initialize as a JavaScript project.
`
  )
  // https://www.npmjs.com/package/commander#options
  // --tailwind option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--tailwind',
    `

  Initialize with Tailwind CSS config. (default)
`
  )
  // https://www.npmjs.com/package/commander#options
  // --eslint option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--eslint',
    `

  Initialize with eslint config.
`
  )
  // https://www.npmjs.com/package/commander#options
  // --app option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--app',
    `

  Initialize as an App Router project.
`
  )
  // https://www.npmjs.com/package/commander#options
  // --src-dir option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--src-dir',
    `

  Initialize inside a \`src/\` directory.
`
  )
  // https://www.npmjs.com/package/commander#options
  //--import-alias option
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--import-alias <alias-to-configure>',
    `

  Specify import alias to use (default "@/*").
`
  )
  // https://www.npmjs.com/package/commander#options
  // --use-npm
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--use-npm',
    `

  Explicitly tell the CLI to bootstrap the application using npm
`
  )
  // https://www.npmjs.com/package/commander#options
  // --use-pnpm
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--use-pnpm',
    `

  Explicitly tell the CLI to bootstrap the application using pnpm
`
  )
  // https://www.npmjs.com/package/commander#options
  // --use-yarn
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--use-yarn',
    `

  Explicitly tell the CLI to bootstrap the application using Yarn
`
  )
  // https://www.npmjs.com/package/commander#options
  // --use-bun
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--use-bun',
    `

  Explicitly tell the CLI to bootstrap the application using Bun
`
  )
  // https://www.npmjs.com/package/commander#options
  // -e
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '-e, --example [name]|[github-url]',
    `

  An example to bootstrap the app with. You can use an example name
  from the official Next.js repo or a GitHub URL. The URL can use
  any branch and/or subdirectory
`
  )
  // https://www.npmjs.com/package/commander#options
  // --example-path  <path-to-example>
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--example-path <path-to-example>',
    `

  In a rare case, your GitHub URL might contain a branch name with
  a slash (e.g. bug/fix-1) and the path to the example (e.g. foo/bar).
  In this case, you must specify the path to the example separately:
  --example-path foo/bar
`
  )
  // https://www.npmjs.com/package/commander#options
  // --example-path  <path-to-example>
  // https://github.com/vercel/next.js/tree/canary/packages/create-next-app#non-interactive
  .option(
    '--reset-preferences',
    `

  Explicitly tell the CLI to reset any stored preferences
`
  )
  .allowUnknownOption()
  .parse(process.argv)

const packageManager = !!program.useNpm
  ? 'npm'
  : !!program.usePnpm
  ? 'pnpm'
  : !!program.useYarn
  ? 'yarn'
  : !!program.useBun
  ? 'bun'
  : getPkgManager()

async function run(): Promise<void> {

  console.log("program.resetPreferences:", program.resetPreferences);

  // a Conf object creation with projectName.
  // We do not know what Conf does yet and it is okay.
  const conf = new Conf({ projectName: 'create-next-app' })

  console.log("conf", conf);

  // My first thought, where did the program come from?
  // Let’s find out by looking outside the run() function.
  // We skipped Conf class but the program variable cannot be skipped.
  // I know for a fact it is a global variable.
  if (program.resetPreferences) {
    conf.clear()
    console.log(`Preferences reset successfully`)
    return
  }

  if (typeof projectPath === 'string') {
    projectPath = projectPath.trim()
  }

  if (!projectPath) {
    // Read more about prompts here: 
    // https://www.npmjs.com/package/prompts
    const res = await prompts({
      // onPromptState is a function available at
      // https://github.com/vercel/next.js/blob/canary/packages/create-next-app/index.ts#L25
      onState: onPromptState,
      type: 'text',
      name: 'path',
      message: 'What is your project named?',
      initial: 'my-app',
      // validates ensures to follow npm package name guidelines
      // availabe here: https://www.npmjs.com/package/validate-npm-package-name
      validate: (name) => {
        const validation = validateNpmName(path.basename(path.resolve(name)))
        if (validation.valid) {
          return true
        }
        return '[WORKS]:Invalid project name: ' + validation.problems[0]
      },
    })

    if (typeof res.path === 'string') {
      projectPath = res.path.trim()
    }
  }

  if (!projectPath) {
    console.log(
      '\nPlease specify the project directory:\n' +
        `  ${cyan(program.name())} ${green('<project-directory>')}\n` +
        'For example:\n' +
        `  ${cyan(program.name())} ${green('my-next-app')}\n\n` +
        `Run ${cyan(`${program.name()} --help`)} to see all options.`
    )
    process.exit(1)
  }

  // let's log this and see what is that values its got
  const resolvedProjectPath = path.resolve(projectPath)
  const projectName = path.basename(resolvedProjectPath)
  console.log("resolvedProjectPath", resolvedProjectPath)
  console.log("projectName", projectName)

  // I believe this is already handled in the above prompts call.
  // Don't think this is necessary.
  const validation = validateNpmName(projectName)
  if (!validation.valid) {
    console.error(
      `[TEST]::Could not create a project called ${red(
        `"${projectName}"`
      )} because of npm naming restrictions:`
    )

    validation.problems.forEach((p) =>
      console.error(`    ${red(bold('*'))} ${p}`)
    )
    process.exit(1)
  }

  if (program.example === true) {
    console.error(
      'Please provide an example name or url, otherwise remove the example option.'
    )
    process.exit(1)
  }

  /**
   * Verify the project dir is empty or doesn't exist
   */
  const root = path.resolve(resolvedProjectPath)
  const appName = path.basename(root)
  const folderExists = fs.existsSync(root)

  console.log("root", root, "appName", appName, "folderExists", folderExists)

  if (folderExists && !isFolderEmpty(root, appName)) {
    process.exit(1)
  }

  const example = typeof program.example === 'string' && program.example.trim()
  const preferences = (conf.get('preferences') || {}) as Record<
    string,
    boolean | string
  >
  /**
   * If the user does not provide the necessary flags, prompt them for whether
   * to use TS or JS.
   */
  if (!example) {
    const defaults: typeof preferences = {
      typescript: true,
      eslint: true,
      tailwind: true,
      app: true,
      srcDir: false,
      importAlias: '@/*',
      customizeImportAlias: false,
    }
    const getPrefOrDefault = (field: string) =>
      preferences[field] ?? defaults[field]

    if (!program.typescript && !program.javascript) {
      if (ciInfo.isCI) {
        // default to TypeScript in CI as we can't prompt to
        // prevent breaking setup flows
        program.typescript = getPrefOrDefault('typescript')
      } else {
        const styledTypeScript = blue('TypeScript')
        const { typescript } = await prompts(
          {
            type: 'toggle',
            name: 'typescript',
            message: `Would you like to use ${styledTypeScript}?`,
            initial: getPrefOrDefault('typescript'),
            active: 'Yes',
            inactive: 'No',
          },
          {
            /**
             * User inputs Ctrl+C or Ctrl+D to exit the prompt. We should close the
             * process and not write to the file system.
             */
            onCancel: () => {
              console.error('Exiting.')
              process.exit(1)
            },
          }
        )
        /**
         * Depending on the prompt response, set the appropriate program flags.
         */
        program.typescript = Boolean(typescript)
        program.javascript = !Boolean(typescript)
        preferences.typescript = Boolean(typescript)
      }
    }

    if (
      !process.argv.includes('--eslint') &&
      !process.argv.includes('--no-eslint')
    ) {
      if (ciInfo.isCI) {
        program.eslint = getPrefOrDefault('eslint')
      } else {
        const styledEslint = blue('ESLint')
        const { eslint } = await prompts({
          onState: onPromptState,
          type: 'toggle',
          name: 'eslint',
          message: `Would you like to use ${styledEslint}?`,
          initial: getPrefOrDefault('eslint'),
          active: 'Yes',
          inactive: 'No',
        })
        program.eslint = Boolean(eslint)
        preferences.eslint = Boolean(eslint)
      }
    }

    if (
      !process.argv.includes('--tailwind') &&
      !process.argv.includes('--no-tailwind')
    ) {
      if (ciInfo.isCI) {
        program.tailwind = getPrefOrDefault('tailwind')
      } else {
        const tw = blue('Tailwind CSS')
        const { tailwind } = await prompts({
          onState: onPromptState,
          type: 'toggle',
          name: 'tailwind',
          message: `Would you like to use ${tw}?`,
          initial: getPrefOrDefault('tailwind'),
          active: 'Yes',
          inactive: 'No',
        })
        program.tailwind = Boolean(tailwind)
        preferences.tailwind = Boolean(tailwind)
      }
    }

    if (
      !process.argv.includes('--src-dir') &&
      !process.argv.includes('--no-src-dir')
    ) {
      if (ciInfo.isCI) {
        program.srcDir = getPrefOrDefault('srcDir')
      } else {
        const styledSrcDir = blue('`src/` directory')
        const { srcDir } = await prompts({
          onState: onPromptState,
          type: 'toggle',
          name: 'srcDir',
          message: `Would you like to use ${styledSrcDir}?`,
          initial: getPrefOrDefault('srcDir'),
          active: 'Yes',
          inactive: 'No',
        })
        program.srcDir = Boolean(srcDir)
        preferences.srcDir = Boolean(srcDir)
      }
    }

    if (!process.argv.includes('--app') && !process.argv.includes('--no-app')) {
      if (ciInfo.isCI) {
        program.app = getPrefOrDefault('app')
      } else {
        const styledAppDir = blue('App Router')
        const { appRouter } = await prompts({
          onState: onPromptState,
          type: 'toggle',
          name: 'appRouter',
          message: `Would you like to use ${styledAppDir}? (recommended)`,
          initial: getPrefOrDefault('app'),
          active: 'Yes',
          inactive: 'No',
        })
        program.app = Boolean(appRouter)
      }
    }

    if (
      typeof program.importAlias !== 'string' ||
      !program.importAlias.length
    ) {
      if (ciInfo.isCI) {
        // We don't use preferences here because the default value is @/* regardless of existing preferences
        program.importAlias = defaults.importAlias
      } else {
        const styledImportAlias = blue('import alias')

        const { customizeImportAlias } = await prompts({
          onState: onPromptState,
          type: 'toggle',
          name: 'customizeImportAlias',
          message: `Would you like to customize the default ${styledImportAlias} (${defaults.importAlias})?`,
          initial: getPrefOrDefault('customizeImportAlias'),
          active: 'Yes',
          inactive: 'No',
        })

        if (!customizeImportAlias) {
          // We don't use preferences here because the default value is @/* regardless of existing preferences
          program.importAlias = defaults.importAlias
        } else {
          const { importAlias } = await prompts({
            onState: onPromptState,
            type: 'text',
            name: 'importAlias',
            message: `What ${styledImportAlias} would you like configured?`,
            initial: getPrefOrDefault('importAlias'),
            validate: (value) =>
              /.+\/\*/.test(value)
                ? true
                : 'Import alias must follow the pattern <prefix>/*',
          })
          program.importAlias = importAlias
          preferences.importAlias = importAlias
        }
      }
    }
  }

  try {
    await createApp({
      appPath: resolvedProjectPath,
      packageManager,
      example: example && example !== 'default' ? example : undefined,
      examplePath: program.examplePath,
      typescript: program.typescript,
      tailwind: program.tailwind,
      eslint: program.eslint,
      appRouter: program.app,
      srcDir: program.srcDir,
      importAlias: program.importAlias,
    })
  } catch (reason) {
    if (!(reason instanceof DownloadError)) {
      throw reason
    }

    const res = await prompts({
      onState: onPromptState,
      type: 'confirm',
      name: 'builtin',
      message:
        `Could not download "${example}" because of a connectivity issue between your machine and GitHub.\n` +
        `Do you want to use the default template instead?`,
      initial: true,
    })
    if (!res.builtin) {
      throw reason
    }

    await createApp({
      appPath: resolvedProjectPath,
      packageManager,
      typescript: program.typescript,
      eslint: program.eslint,
      tailwind: program.tailwind,
      appRouter: program.app,
      srcDir: program.srcDir,
      importAlias: program.importAlias,
    })
  }
  conf.set('preferences', preferences)
}

const update = checkForUpdate(packageJson).catch(() => null)

async function notifyUpdate(): Promise<void> {
  try {
    const res = await update
    if (res?.latest) {
      const updateMessage =
        packageManager === 'yarn'
          ? 'yarn global add create-next-app'
          : packageManager === 'pnpm'
          ? 'pnpm add -g create-next-app'
          : packageManager === 'bun'
          ? 'bun add -g create-next-app'
          : 'npm i -g create-next-app'

      console.log(
        yellow(bold('A new version of `create-next-app` is available!')) +
          '\n' +
          'You can update by running: ' +
          cyan(updateMessage) +
          '\n'
      )
    }
    process.exit()
  } catch {
    // ignore error
  }
}

run()
  .then(notifyUpdate)  // On successful execution of run(), call notifyUpdate. Not sure what notifyUpdate does yet.
  // you have a reason why catch failed, 
  // I tend to put error as variable name,
  // It makes to label it as reason
  .catch(async (reason) => {
    console.log()
    // Log explains installation is aborted
    // How often do you log when you encounter failure?
    console.log('Aborting installation.')

    // This is specifically looking for command prop
    // Specificity matters when it comes to error logging
    if (reason.command) {
      console.log(`  ${cyan(reason.command)} has failed.`)
    } else {
      // There is a catchall as well
      // Nice! 
      console.log(
        red('Unexpected error. Please report it as a bug:') + '\n',
        reason
      )
    }
    console.log()
    // Notify update even when the installation is aborted
    // This makes me wonder if it is worth writing .then()
    // But promises do not execute if you don’t put .then()
    // Learnt it the hard way that one time when I was calling a promise without .then() and 
    // started questioning my progamming abilities because I forgot to initailise a promise with .then()
    // How often do you question your programming abilties?
    await notifyUpdate()

    // useful links:
    // https://stackoverflow.com/questions/5266152/how-to-exit-in-node-js
    // https://nodejs.org/api/process.html#process
    // This exits the node process with a failure
    process.exit(1)
  })
