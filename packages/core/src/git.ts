import { graphql } from '@octokit/graphql';
import enterpriseCompat from '@octokit/plugin-enterprise-compatibility';
import retry from '@octokit/plugin-retry';
import throttling from '@octokit/plugin-throttling';
import Octokit from '@octokit/rest';
import gitlogNode, { ICommit } from 'gitlog';
import HttpsProxyAgent from 'https-proxy-agent';
import tinyColor from 'tinycolor2';
import { promisify } from 'util';

import { Memoize } from 'typescript-memoize';

import { ILabelDefinition } from './release';
import execPromise from './utils/exec-promise';
import { dummyLog, ILogger } from './utils/logger';

const gitlog = promisify(gitlogNode);

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>> &
  Partial<Pick<T, K>>;

export type IPRInfo = Omit<Octokit.ReposCreateStatusParams, 'owner' | 'repo'>;

export interface IGitOptions {
  owner: string;
  repo: string;
  baseUrl?: string;
  graphqlBaseUrl?: string;
  token?: string;
  agent?: HttpsProxyAgent;
}

class GitAPIError extends Error {
  constructor(api: string, args: object, origError: Error) {
    super(
      `Error calling github: ${api}\n\twith: ${JSON.stringify(args)}.\n\t${
        origError.message
      }`
    );
  }
}

const makeIdentifier = (type: string, context: string) =>
  `<!-- GITHUB_RELEASE ${type}: ${context} -->`;

const makeCommentIdentifier = (context: string) =>
  makeIdentifier('COMMENT', context);

const makePrBodyIdentifier = (context: string) =>
  makeIdentifier('PR BODY', context);

// A class to interact with the local git instance and the git remote.
// currently it only interfaces with GitHub.
export default class Git {
  readonly github: Octokit;
  readonly options: IGitOptions;

  private readonly baseUrl: string;
  private readonly graphqlBaseUrl: string;
  private readonly logger: ILogger;

  constructor(options: IGitOptions, logger: ILogger = dummyLog()) {
    this.logger = logger;
    this.options = options;
    this.baseUrl = this.options.baseUrl || 'https://api.github.com';
    this.graphqlBaseUrl = this.options.graphqlBaseUrl || this.baseUrl;
    this.logger.veryVerbose.info(`Initializing GitHub with: ${this.baseUrl}`);
    const gitHub = Octokit.plugin(enterpriseCompat)
      .plugin(retry)
      .plugin(throttling);
    this.github = new gitHub({
      baseUrl: this.baseUrl,
      agent: this.options.agent,
      auth: this.options.token,
      previews: ['symmetra-preview'],
      throttle: {
        onRateLimit: (retryAfter: number, opts: any) => {
          this.logger.log.warn(
            `Request quota exhausted for request ${opts.method} ${opts.url}`
          );

          if (opts.request.retryCount < 5) {
            this.logger.verbose.log(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
        },
        onAbuseLimit: (retryAfter: number, opts: any) => {
          // does not retry, only logs an error
          this.logger.log.error(
            `Went over abuse rate limit ${opts.method} ${opts.url}`
          );
        }
      }
    });
    this.github.hook.error('request', error => {
      if (error && error.headers && error.headers.authorization) {
        delete error.headers.authorization;
      }
      throw error;
    });
  }

  @Memoize()
  async getLatestReleaseInfo() {
    const latestRelease = await this.github.repos.getLatestRelease({
      owner: this.options.owner,
      repo: this.options.repo
    });

    return latestRelease.data;
  }

  @Memoize()
  async getLatestRelease(): Promise<string> {
    try {
      const latestRelease = await this.getLatestReleaseInfo();

      this.logger.veryVerbose.info(
        'Got response for "getLatestRelease":\n',
        latestRelease
      );
      this.logger.verbose.info('Got latest release:\n', latestRelease);

      return latestRelease.tag_name;
    } catch (e) {
      if (e.status === 404) {
        this.logger.verbose.info(
          "Couldn't find latest release on GitHub, using first commit."
        );
        return this.getFirstCommit();
      }

      throw e;
    }
  }

  async getCommitDate(sha: string): Promise<string> {
    const date = await execPromise('git', ['show', '-s', '--format=%ci', sha]);
    const [day, time, timezone] = date.split(' ');

    return `${day}T${time}${timezone}`;
  }

  async getFirstCommit(): Promise<string> {
    const list = await execPromise('git', ['rev-list', 'HEAD']);
    return list.split('\n').pop() as string;
  }

  /**
   * Get the SHA of the latest commit
   */
  async getSha(short?: boolean): Promise<string> {
    const result = await execPromise('git', [
      'rev-parse',
      short && '--short',
      'HEAD'
    ]);

    this.logger.verbose.info(`Got commit SHA from HEAD: ${result}`);

    return result;
  }

  @Memoize()
  async getLabels(prNumber: number) {
    this.logger.verbose.info(`Getting labels for PR: ${prNumber}`);

    const args: Octokit.IssuesListLabelsOnIssueParams = {
      owner: this.options.owner,
      repo: this.options.repo,
      issue_number: prNumber
    };

    this.logger.verbose.info('Getting issue labels using:', args);

    try {
      const labels = await this.github.issues.listLabelsOnIssue(args);
      this.logger.veryVerbose.info(
        'Got response for "listLabelsOnIssue":\n',
        labels
      );
      this.logger.verbose.info('Found labels on PR:\n', labels.data);

      return labels.data.map(l => l.name);
    } catch (e) {
      throw new GitAPIError('listLabelsOnIssue', args, e);
    }
  }

  @Memoize()
  async getPr(prNumber: number) {
    this.logger.verbose.info(`Getting info for PR: ${prNumber}`);

    const args: Octokit.IssuesListLabelsOnIssueParams = {
      owner: this.options.owner,
      repo: this.options.repo,
      issue_number: prNumber
    };

    this.logger.verbose.info('Getting issue info using:', args);

    try {
      const info = await this.github.issues.get(args);
      this.logger.veryVerbose.info('Got response for "issues.get":\n', info);
      return info;
    } catch (e) {
      throw new GitAPIError('getPr', args, e);
    }
  }

  async getProjectLabels() {
    this.logger.verbose.info(
      `Getting labels for project: ${this.options.repo}`
    );

    const args = {
      owner: this.options.owner,
      repo: this.options.repo
    };

    try {
      const labels = await this.github.issues.listLabelsForRepo(args);
      this.logger.veryVerbose.info(
        'Got response for "getProjectLabels":\n',
        labels
      );
      this.logger.verbose.info('Found labels on project:\n', labels.data);

      return labels.data.map(l => l.name);
    } catch (e) {
      throw new GitAPIError('getProjectLabels', args, e);
    }
  }

  @Memoize()
  async getGitLog(start: string, end = 'HEAD'): Promise<ICommit[]> {
    const log = await gitlog({
      repo: process.cwd(),
      number: Number.MAX_SAFE_INTEGER,
      fields: ['hash', 'authorName', 'authorEmail', 'rawBody'],
      branch: `${start.trim()}..${end.trim()}`,
      execOptions: { maxBuffer: 1000 * 1024 }
    });

    return log.map(commit => ({
      hash: commit.hash,
      authorName: commit.authorName,
      authorEmail: commit.authorEmail,
      subject: commit.rawBody!
    }));
  }

  @Memoize()
  async getUserByEmail(email: string) {
    try {
      const search = (await this.github.search.users({
        q: `in:email ${email}`
      })).data;

      return search && search.items.length > 0 ? search.items[0] : {};
    } catch (error) {
      this.logger.verbose.warn(`Could not find user by email: ${email}`);
    }
  }

  @Memoize()
  async getUserByUsername(username: string) {
    try {
      const user = await this.github.users.getByUsername({
        username
      });

      return user.data;
    } catch (error) {
      this.logger.verbose.warn(`Could not find user by username: ${username}`);
    }
  }

  @Memoize()
  async getPullRequest(pr: number) {
    this.logger.verbose.info(`Getting Pull Request: ${pr}`);

    const args: Octokit.PullsGetParams = {
      owner: this.options.owner,
      repo: this.options.repo,
      pull_number: pr
    };

    this.logger.verbose.info('Getting pull request info using:', args);

    const result = await this.github.pulls.get(args);

    this.logger.veryVerbose.info('Got pull request data\n', result);
    this.logger.verbose.info('Got pull request info');

    return result;
  }

  async searchRepo(options: Octokit.SearchIssuesAndPullRequestsParams) {
    const repo = `repo:${this.options.owner}/${this.options.repo}`;
    options.q = `${repo} ${options.q}`;

    this.logger.verbose.info('Searching repo using:\n', options);

    const result = await this.github.search.issuesAndPullRequests(options);

    this.logger.veryVerbose.info('Got response from search\n', result);
    this.logger.verbose.info('Searched repo on GitHub.');

    return result.data;
  }

  async graphql(query: string) {
    this.logger.verbose.info('Querying Github using GraphQL:\n', query);

    const data = await graphql(query, {
      baseUrl: this.graphqlBaseUrl,
      headers: {
        authorization: `token ${this.options.token}`
      }
    });

    this.logger.veryVerbose.info('Got response from query\n', data);
    return data;
  }

  async createStatus(prInfo: IPRInfo) {
    const args = {
      ...prInfo,
      owner: this.options.owner,
      repo: this.options.repo
    };

    this.logger.verbose.info('Creating status using:\n', args);

    const result = await this.github.repos.createStatus(args);

    this.logger.veryVerbose.info('Got response from createStatues\n', result);
    this.logger.verbose.info('Created status on GitHub.');

    return result;
  }

  async createLabel(name: string, label: ILabelDefinition) {
    this.logger.verbose.info(`Creating "${name}" label :\n${label.name}`);

    const color = label.color
      ? tinyColor(label.color).toString('hex6')
      : tinyColor.random().toString('hex6');
    const result = await this.github.issues.createLabel({
      name: label.name,
      owner: this.options.owner,
      repo: this.options.repo,
      color: color.replace('#', ''),
      description: label.description
    });

    this.logger.veryVerbose.info('Got response from createLabel\n', result);
    this.logger.verbose.info('Created label on GitHub.');

    return result;
  }

  async updateLabel(name: string, label: ILabelDefinition) {
    this.logger.verbose.info(`Updating "${name}" label :\n${label.name}`);

    const color = label.color
      ? tinyColor(label.color).toString('hex6')
      : tinyColor.random().toString('hex6');
    const result = await this.github.issues.updateLabel({
      current_name: label.name,
      name: label.name,
      owner: this.options.owner,
      repo: this.options.repo,
      color: color.replace('#', ''),
      description: label.description
    });

    this.logger.veryVerbose.info('Got response from updateLabel\n', result);
    this.logger.verbose.info('Updated label on GitHub.');

    return result;
  }

  async addLabelToPr(pr: number, label: string) {
    this.logger.verbose.info(`Creating "${label}" label to PR ${pr}`);

    const result = await this.github.issues.addLabels({
      issue_number: pr,
      owner: this.options.owner,
      repo: this.options.repo,
      labels: [label]
    });

    this.logger.veryVerbose.info('Got response from addLabels\n', result);
    this.logger.verbose.info('Added labels on Pull Request.');

    return result;
  }

  async lockIssue(issue: number) {
    this.logger.verbose.info(`Locking #${issue} issue...`);

    const result = await this.github.issues.lock({
      issue_number: issue,
      owner: this.options.owner,
      repo: this.options.repo
    });

    this.logger.veryVerbose.info('Got response from lock\n', result);
    this.logger.verbose.info('Locked issue.');

    return result;
  }

  @Memoize()
  async getProject() {
    this.logger.verbose.info('Getting project from GitHub');

    const result = (await this.github.repos.get({
      owner: this.options.owner,
      repo: this.options.repo
    })).data;

    this.logger.veryVerbose.info('Got response from repos\n', result);
    this.logger.verbose.info('Got project information.');

    return result;
  }

  async getPullRequests(options?: Partial<Octokit.PullsListParams>) {
    this.logger.verbose.info('Getting pull requests...');

    const result = (await this.github.pulls.list({
      owner: this.options.owner.toLowerCase(),
      repo: this.options.repo.toLowerCase(),
      ...options
    })).data;

    this.logger.veryVerbose.info('Got response from pull requests', result);
    this.logger.verbose.info('Got pull request');

    return result;
  }

  @Memoize()
  async getCommitsForPR(
    pr: number
  ): Promise<Octokit.PullsListCommitsResponseItem[]> {
    this.logger.verbose.info(`Getting commits for PR #${pr}`);

    const result = await this.github.paginate(
      this.github.pulls.listCommits.endpoint({
        owner: this.options.owner.toLowerCase(),
        repo: this.options.repo.toLowerCase(),
        pull_number: pr
      })
    );

    this.logger.veryVerbose.info(`Got response from PR #${pr}\n`, result);
    this.logger.verbose.info(`Got commits for PR #${pr}.`);

    return result;
  }

  async getCommentId(pr: number, context = 'default') {
    const commentIdentifier = makeCommentIdentifier(context);

    this.logger.verbose.info('Getting previous comments on:', pr);

    const comments = await this.github.issues.listComments({
      owner: this.options.owner,
      repo: this.options.repo,
      issue_number: pr
    });

    this.logger.veryVerbose.info('Got PR comments\n', comments);

    const oldMessage = comments.data.find(comment =>
      comment.body.includes(commentIdentifier)
    );

    if (!oldMessage) {
      return -1;
    }

    this.logger.verbose.info('Found previous message from same scope.');
    return oldMessage.id;
  }

  async deleteComment(pr: number, context = 'default') {
    const commentId = await this.getCommentId(pr, context);

    if (commentId === -1) {
      return;
    }
    this.logger.verbose.info(`Deleting comment: ${commentId}`);
    await this.github.issues.deleteComment({
      owner: this.options.owner,
      repo: this.options.repo,
      comment_id: commentId
    });
    this.logger.verbose.info(`Successfully deleted comment: ${commentId}`);
  }

  async createComment(message: string, pr: number, context = 'default') {
    const commentIdentifier = makeCommentIdentifier(context);

    this.logger.verbose.info('Using comment identifier:', commentIdentifier);
    await this.deleteComment(pr, context);
    this.logger.verbose.info('Creating new comment');
    const result = await this.github.issues.createComment({
      owner: this.options.owner,
      repo: this.options.repo,
      issue_number: pr,
      body: `${commentIdentifier}\n${message}`
    });

    this.logger.veryVerbose.info(
      'Got response from creating comment\n',
      result
    );
    this.logger.verbose.info('Successfully posted comment to PR');

    return result;
  }

  async editComment(message: string, pr: number, context = 'default') {
    const commentIdentifier = makeCommentIdentifier(context);

    this.logger.verbose.info('Using comment identifier:', commentIdentifier);
    const commentId = await this.getCommentId(pr, context);
    if (commentId === -1) {
      return this.createComment(message, pr, context);
    }
    this.logger.verbose.info('Editing comment');
    const result = await this.github.issues.updateComment({
      owner: this.options.owner,
      repo: this.options.repo,
      comment_id: commentId,
      body: `${commentIdentifier}\n${message}`
    });

    this.logger.veryVerbose.info('Got response from editing comment\n', result);
    this.logger.verbose.info('Successfully edited comment on PR');

    return result;
  }

  async addToPrBody(message: string, pr: number, context = 'default') {
    const id = makePrBodyIdentifier(context);

    this.logger.verbose.info('Using PR body identifier:', id);
    this.logger.verbose.info('Getting previous pr body on:', pr);

    const issue = await this.github.issues.get({
      owner: this.options.owner,
      repo: this.options.repo,
      issue_number: pr
    });

    this.logger.veryVerbose.info('Got PR description\n', issue.data.body);
    const regex = new RegExp(`(${id})\\s*([\\S\\s]*)\\s*(${id})`);
    let body = issue.data.body;

    if (body.match(regex)) {
      this.logger.verbose.info('Found previous message from same scope.');
      this.logger.verbose.info('Replacing pr body comment');
      body = body.replace(regex, message ? `$1\n${message}\n$3` : '');
    } else {
      body += message ? `\n${id}\n${message}\n${id}\n` : '';
    }

    this.logger.verbose.info('Creating new pr body');

    const result = await this.github.issues.update({
      owner: this.options.owner,
      repo: this.options.repo,
      issue_number: pr,
      body
    });

    this.logger.veryVerbose.info('Got response from updating body\n', result);
    this.logger.verbose.info(`Successfully updated body of PR #${pr}`);

    return result;
  }

  async publish(releaseNotes: string, tag: string) {
    this.logger.verbose.info('Creating release on GitHub for tag:', tag);

    const result = await this.github.repos.createRelease({
      owner: this.options.owner,
      repo: this.options.repo,
      tag_name: tag,
      body: releaseNotes
    });

    this.logger.veryVerbose.info('Got response from createRelease\n', result);
    this.logger.verbose.info('Created GitHub release.');

    return result;
  }

  async getLatestTagInBranch() {
    return execPromise('git', ['describe', '--tags', '--abbrev=0']);
  }
}
