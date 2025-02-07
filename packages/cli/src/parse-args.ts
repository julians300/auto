import * as fs from 'fs';
import * as path from 'path';

import chalk from 'chalk';
import commandLineArgs from 'command-line-args';
import commandLineUsage from 'command-line-usage';
import dedent from 'dedent';
import signale from 'signale';

import {
  ApiOptions,
  GlobalOptions,
  ICanaryOptions,
  IChangelogOptions,
  ICommentOptions,
  ICreateLabelsOptions,
  IInitOptions,
  ILabelOptions,
  IPRBodyOptions,
  IPRCheckOptions,
  IPRStatusOptions,
  IReleaseOptions,
  IShipItOptions,
  IVersionOptions
} from '@auto-it/core';

export type Flags =
  | keyof GlobalOptions
  | keyof IInitOptions
  | keyof ICreateLabelsOptions
  | keyof ILabelOptions
  | keyof IPRCheckOptions
  | keyof IPRStatusOptions
  | keyof ICommentOptions
  | keyof IPRBodyOptions
  | keyof IReleaseOptions
  | keyof IVersionOptions
  | keyof IShipItOptions
  | keyof IChangelogOptions
  | keyof ICanaryOptions;

const p = chalk.hex('#870048');
const y = chalk.hex('#F1A60E');
const r = chalk.hex('#C5000B');
const g = chalk.hex('#888888');

// prettier-ignore
const logo = `
      ${y('_________')}
     ${p('/')}${y('\\       /')}${r('\\')}                   _______ _     _ _______  _____
    ${p('/')}  ${y('\\_____/')}  ${r('\\')}                  |_____| |     |    |    |     |
   ${p('/   /')}     ${r('\\   \\')}                 |     | |_____|    |    |_____|
  ${p('/___/')} \\▔▔\\ ${r(' \\___\\')}
  ${g('\\   \\')}  \\_/  ${g('/   /')}     ______ _______        _______ _______ _______ _______
   ${g('\\   \\')}     ${g('/   /')}     |_____/ |______ |      |______ |_____| |______ |______
    ${g('\\   ▔▔▔▔▔   /')}      |    \\_ |______ |_____ |______ |     | ______| |______
     ${g('\\         /')}
      ${g('▔▔▔▔▔▔▔▔▔ ')}
`;

const help: commandLineUsage.OptionDefinition = {
  name: 'help',
  alias: 'h',
  type: Boolean
};

const version = {
  name: 'version',
  alias: 'V',
  type: Boolean,
  description: "Display auto's version"
};

const mainDefinitions = [
  { name: 'command', type: String, defaultOption: true },
  {
    ...help,
    description: 'Display the help output. Works on each command as well'
  },
  version
];

const defaultOptions = [
  {
    ...help,
    description: 'Display the help output for the command',
    group: 'misc'
  },
  {
    name: 'verbose',
    alias: 'v',
    type: Boolean,
    description: 'Show some more logs',
    group: 'misc'
  },
  {
    name: 'very-verbose',
    alias: 'w',
    type: Boolean,
    description: 'Show a lot more logs',
    group: 'misc'
  },
  {
    name: 'repo',
    type: String,
    description:
      'The repo to set the status on. Defaults to looking in the package definition for the platform',
    group: 'misc'
  },
  {
    name: 'owner',
    type: String,
    description:
      'The owner of the GitHub repo. Defaults to reading from the package definition for the platform',
    group: 'misc'
  },
  {
    name: 'github-api',
    type: String,
    description: 'GitHub API to use',
    group: 'misc'
  },
  {
    name: 'plugins',
    type: String,
    multiple: true,
    description: 'Plugins to load auto with. (defaults to just npm)',
    group: 'misc'
  }
];

const baseBranch: commandLineUsage.OptionDefinition = {
  name: 'base-branch',
  type: String,
  description: 'Branch to treat as the "master" branch',
  group: 'misc'
};

const pr: commandLineUsage.OptionDefinition = {
  name: 'pr',
  type: Number,
  description:
    'The pull request the command should use. Detects PR number in CI',
  group: 'main'
};

const dryRun: commandLineUsage.OptionDefinition = {
  name: 'dry-run',
  alias: 'd',
  type: Boolean,
  description: 'Report what command will do but do not actually do anything',
  group: 'main'
};

const url: commandLineUsage.OptionDefinition = {
  name: 'url',
  type: String,
  description: 'URL to associate with this status',
  group: 'main'
};

const noVersionPrefix: commandLineUsage.OptionDefinition = {
  name: 'no-version-prefix',
  type: Boolean,
  description: "Use the version as the tag without the 'v' prefix",
  group: 'main'
};

const name: commandLineUsage.OptionDefinition = {
  name: 'name',
  type: String,
  description:
    'Git name to commit and release with. Defaults to package definition for the platform',
  group: 'main'
};

const email: commandLineUsage.OptionDefinition = {
  name: 'email',
  type: String,
  description:
    'Git email to commit with. Defaults to package definition for the platform',
  group: 'main'
};

const context: commandLineUsage.OptionDefinition = {
  name: 'context',
  type: String,
  description: 'A string label to differentiate this status from others',
  group: 'main'
};

const message: commandLineUsage.OptionDefinition = {
  name: 'message',
  group: 'main',
  type: String,
  alias: 'm'
};

const skipReleaseLabels: commandLineUsage.OptionDefinition = {
  name: 'skip-release-labels',
  type: String,
  group: 'main',
  multiple: true,
  description:
    "Labels that will not create a release. Defaults to just 'skip-release'"
};

const deleteFlag: commandLineUsage.OptionDefinition = {
  name: 'delete',
  type: Boolean,
  group: 'main'
};

interface ICommand {
  name: string;
  summary: string;
  options?: commandLineUsage.OptionDefinition[];
  require?: (Flags | Flags[])[];
  examples: any[];
}

const commands: ICommand[] = [
  {
    name: 'init',
    summary: 'Interactive setup for most configurable options',
    examples: ['{green $} auto init'],
    options: [
      {
        name: 'only-labels',
        type: Boolean,
        group: 'main',
        description:
          'Only run init for the labels. As most other options are for advanced users'
      },
      dryRun
    ]
  },
  {
    name: 'create-labels',
    summary:
      "Create your project's labels on github. If labels exist it will update them.",
    examples: ['{green $} auto create-labels'],
    options: [...defaultOptions, dryRun]
  },
  {
    name: 'label',
    summary: 'Get the labels for a pull request',
    options: [
      { ...pr, description: `${pr.description} (defaults to last merged PR)` },
      ...defaultOptions
    ],
    examples: ['{green $} auto label --pr 123']
  },
  {
    name: 'comment',
    summary:
      'Comment on a pull request with a markdown message. Each comment has a context, and each context only has one comment.',
    require: [['message', 'delete']],
    options: [
      pr,
      context,
      {
        name: 'edit',
        type: Boolean,
        alias: 'e',
        group: 'main',
        description: 'Edit old comment'
      },
      { ...deleteFlag, description: 'Delete old comment' },
      { ...message, description: 'Message to post to comment' },
      dryRun,
      ...defaultOptions
    ],
    examples: [
      '{green $} auto comment --delete',
      '{green $} auto comment --pr 123 --message "# Why you\'re wrong..."',
      '{green $} auto comment --pr 123 --edit --message "This smells..." --context code-smell'
    ]
  },
  {
    name: 'pr-check',
    summary: 'Check that a pull request has a SemVer label',
    require: ['url'],
    options: [
      pr,
      url,
      dryRun,
      {
        ...context,
        defaultValue: 'ci/pr-check'
      },
      skipReleaseLabels,
      ...defaultOptions
    ],
    examples: ['{green $} auto pr-check --url http://your-ci.com/build/123']
  },
  {
    name: 'pr-status',
    summary: 'Set the status on a PR commit',
    require: ['state', 'url', 'description', 'context'],
    options: [
      {
        name: 'sha',
        type: String,
        group: 'main',
        description:
          'Specify a custom git sha. Defaults to the HEAD for a git repo in the current repository'
      },
      {
        ...pr,
        description: 'PR to set the status on. Detects PR number in CI'
      },
      url,
      {
        name: 'state',
        type: String,
        group: 'main',
        description:
          "State of the PR. ['pending', 'success', 'error', 'failure']"
      },
      {
        name: 'description',
        type: String,
        group: 'main',
        description: 'A description of the status'
      },
      {
        name: 'context',
        type: String,
        group: 'main',
        description: 'A string label to differentiate this status from others'
      },
      dryRun,
      ...defaultOptions
    ],
    examples: [
      `{green $} auto pr \\\\ \n   --state pending \\\\ \n   --description "Build still running..." \\\\ \n   --context build-check`
    ]
  },
  {
    name: 'pr-body',
    summary:
      'Update the body of a PR with a message. Appends to PR and will not overwrite user content. Each comment has a context, and each context only has one comment.',
    require: [['message', 'delete']],
    options: [
      pr,
      context,
      { ...deleteFlag, description: 'Delete old PR body update' },
      { ...message, description: 'Message to post to PR body' },
      dryRun,
      ...defaultOptions
    ],
    examples: [
      '{green $} auto pr-body --delete',
      '{green $} auto pr-body --pr 123 --comment "The new version is: 1.2.3"'
    ]
  },
  {
    name: 'version',
    summary: 'Get the semantic version bump for the given changes.',
    options: [
      {
        name: 'only-publish-with-release-label',
        type: Boolean,
        description: "Only bump version if 'release' label is on pull request",
        group: 'main'
      },
      skipReleaseLabels,
      {
        name: 'from',
        type: String,
        group: 'main',
        description:
          'Git revision (tag, commit sha, ...) to calculate version bump from. Defaults to latest github release'
      },
      ...defaultOptions
    ],
    examples: [
      {
        desc: 'Get the new version using the last release to head',
        example: '{green $} auto version'
      },
      {
        desc: 'Skip releases with multiple labels',
        example: '{green $} auto version --skip-release-labels documentation CI'
      }
    ]
  },
  {
    name: 'changelog',
    summary: "Prepend release notes to 'CHANGELOG.md'",
    options: [
      dryRun,
      noVersionPrefix,
      name,
      email,
      {
        name: 'from',
        type: String,
        group: 'main',
        description:
          'Tag to start changelog generation on. Defaults to latest tag.'
      },
      {
        name: 'to',
        type: String,
        group: 'main',
        description: 'Tag to end changelog generation on. Defaults to HEAD.'
      },
      {
        ...message,
        description:
          "Message to commit the changelog with. Defaults to 'Update CHANGELOG.md [skip ci]'"
      },
      baseBranch,
      ...defaultOptions
    ],
    examples: [
      {
        desc: 'Generate a changelog from the last release to head',
        example: '{green $} auto changelog'
      },
      {
        desc: 'Generate a changelog across specific versions',
        example: '{green $} auto changelog --from v0.20.1 --to v0.21.0'
      }
    ]
  },
  {
    name: 'release',
    summary: 'Auto-generate a github release',
    options: [
      dryRun,
      noVersionPrefix,
      name,
      email,
      {
        name: 'from',
        type: String,
        group: 'main',
        description:
          'Git revision (tag, commit sha, ...) to start release notes from. Defaults to latest tag.'
      },
      {
        name: 'use-version',
        type: String,
        group: 'main',
        description:
          'Version number to publish as. Defaults to reading from the package definition for the platform.'
      },
      baseBranch,
      ...defaultOptions
    ],
    examples: [
      '{green $} auto release',
      '{green $} auto release --from v0.20.1 --use-version v0.21.0'
    ]
  },
  {
    name: 'shipit',
    summary: dedent`
      Run the full \`auto\` release pipeline. Detects if in a lerna project.

      1. call from base branch -> latest version released
      2. call from PR in CI -> canary version released
      3. call locally when not on base branch -> canary version released
    `,
    examples: ['{green $} auto shipit'],
    options: [...defaultOptions, baseBranch, dryRun]
  },
  {
    name: 'canary',
    summary: dedent`
      Make a canary release of the project. Useful on PRs. If ran locally, \`canary\` will release a canary version for your current git HEAD.

      1. In PR: 1.2.3-canary.123.0 + add version to PR body
      2. Locally: 1.2.3-canary.1810cfd
    `,
    examples: [
      '{green $} auto canary',
      '{green $} auto canary --pr 123 --build 5',
      '{green $} auto canary --message "Install PR version: `yarn add -D my-project@%v`"',
      '{green $} auto canary --message false'
    ],
    options: [
      ...defaultOptions,
      dryRun,
      {
        ...pr,
        description:
          'PR number to use to create the canary version. Detected in CI env'
      },
      {
        name: 'build',
        type: String,
        group: 'main',
        description:
          'Build number to use to create the canary version. Detected in CI env'
      },
      {
        ...message,
        description:
          "Message to comment on PR with. Defaults to 'Published PR with canary version: %v'. Pass false to disable the comment"
      }
    ]
  }
];

function filterCommands(allCommands: ICommand[], include: string[]) {
  return allCommands
    .filter(command => include.includes(command.name))
    .map(command => ({
      name: command.name,
      summary: command.summary
    }));
}

function printRootHelp() {
  const options = [
    { ...version, group: 'misc' },
    ...mainDefinitions,
    ...defaultOptions
  ];
  options.forEach(option => {
    styleTypes({} as ICommand, option);
  });

  const usage = commandLineUsage([
    {
      content: logo.replace(/\\/g, '\\\\'),
      raw: true
    },
    {
      content:
        'Generate releases based on semantic version labels on pull requests'
    },
    {
      header: 'Synopsis',
      content: '$ auto <command> <options>'
    },
    {
      header: 'Setup Commands',
      content: filterCommands(commands, ['init', 'create-labels'])
    },
    {
      header: 'Release Commands',
      content: filterCommands(commands, [
        'release',
        'version',
        'changelog',
        'canary',
        'shipit'
      ])
    },
    {
      header: 'Pull Request Interaction Commands',
      content: filterCommands(commands, [
        'label',
        'pr-check',
        'pr-status',
        'pr-body',
        'comment'
      ])
    },
    {
      header: 'Global Options',
      optionList: options,
      group: 'misc'
    }
  ]);

  console.log(usage);
}

function printCommandHelp(command: ICommand) {
  const sections: commandLineUsage.Section[] = [
    {
      header: `auto ${command.name}`,
      content: command.summary
    }
  ];

  if (command.options) {
    const hasLocalOptions = command.options.filter(
      option => option.group === 'main'
    );

    if (hasLocalOptions.length > 0) {
      sections.push({
        header: 'Options',
        optionList: command.options,
        group: 'main'
      });
    }

    const hasGlobalOptions = command.options.filter(
      option => option.group === 'misc'
    );

    if (hasGlobalOptions.length > 0) {
      sections.push({
        header: 'Global Options',
        optionList: command.options,
        group: 'misc'
      });
    }
  }

  sections.push({
    header: 'Examples',
    content: command.examples,
    raw: command.name === 'pr'
  });

  console.log(commandLineUsage(sections));
}

function printVersion() {
  const packagePath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`v${packageJson.version}`);
}

function styleTypes(
  command: ICommand,
  option: commandLineUsage.OptionDefinition
) {
  const isRequired =
    command.require && command.require.includes(option.name as Flags);

  if (isRequired && option.type === Number) {
    option.typeLabel =
      '{rgb(173, 216, 230) {underline number}} [{rgb(254,91,92) required}]';
  } else if (option.type === Number) {
    option.typeLabel = '{rgb(173, 216, 230) {underline number}}';
  }

  if (isRequired && option.type === String) {
    option.typeLabel =
      '{rgb(173, 216, 230) {underline string}} [{rgb(254,91,92) required}]';
  } else if (option.multiple && option.type === String) {
    option.typeLabel = '{rgb(173, 216, 230) {underline string[]}}';
  } else if (option.type === String) {
    option.typeLabel = '{rgb(173, 216, 230) {underline string}}';
  }
}

export default function parseArgs(testArgs?: string[]) {
  const mainOptions = commandLineArgs(mainDefinitions, {
    stopAtFirstUnknown: true,
    camelCase: true,
    argv: testArgs
  });
  const argv = mainOptions._unknown || [];
  const command = commands.find(c => c.name === mainOptions.command);

  if (!command && mainOptions.version) {
    printVersion();
    return [];
  }

  if (!command) {
    printRootHelp();
    return [];
  }

  const options = command.options || [];

  options.forEach(option => {
    styleTypes(command, option);
  });

  if (mainOptions.help) {
    printCommandHelp(command);
    return [];
  }

  const autoOptions: ApiOptions = commandLineArgs(options, {
    argv,
    camelCase: true
  })._all;

  if (command.require) {
    const missing = command.require
      .filter(
        option =>
          (typeof option === 'string' && !(option in autoOptions)) ||
          (typeof option === 'object' && !option.find(o => o in autoOptions)) ||
          // tslint:disable-next-line strict-type-predicates
          autoOptions[option as keyof ApiOptions] === null
      )
      .map(option =>
        typeof option === 'string'
          ? `--${option}`
          : `(--${option.join(' || --')})`
      );
    const multiple = missing.length > 1;

    if (missing.length > 0) {
      printCommandHelp(command);
      signale.error(
        `Missing required flag${multiple ? 's' : ''}: ${missing.join(', ')}`
      );
      return process.exit(1);
    }
  }

  return [mainOptions.command, autoOptions];
}
