import Auto from '../auto';
import { IPRStatusOptions } from '../auto-args';
import SEMVER from '../semver';
import { dummyLog } from '../utils/logger';
import makeCommitFromMsg from './make-commit-from-msg';

const importMock = jest.fn();
jest.mock('import-cwd', () => (path: string) => importMock(path));
jest.mock('env-ci', () => () => ({ isCi: false, branch: 'master' }));

const defaults = {
  owner: 'foo',
  repo: 'bar',
  token: 'XXXX'
};

const labels = {
  major: 'Version: Major',
  patch: 'Version: Patch',
  minor: 'Version: Minor'
};

const search = jest.fn();
jest.mock('cosmiconfig', () => () => ({
  search
}));

jest.mock('@octokit/rest', () => {
  const instance = () => ({
    authenticate: () => undefined,
    search: {
      issuesAndPullRequests: () => ({ data: { items: [] } })
    },
    hook: {
      error: () => undefined
    }
  });

  instance.plugin = () => instance;

  return instance;
});

// @ts-ignore
jest.mock('gitlog', () => (a, cb) => {
  cb(undefined, [
    {
      rawBody: 'foo'
    },
    {
      rawBody: 'foo'
    }
  ]);
});

describe('Auto', () => {
  test('should use args', async () => {
    const auto = new Auto(defaults);
    auto.logger = dummyLog();
    await auto.loadConfig();
    expect(auto.release).toBeDefined();
  });

  test('should load config', async () => {
    search.mockReturnValueOnce({ config: defaults });
    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();
    expect(auto.release).toBeDefined();
  });

  test('should throw if now GH_TOKEN set', async () => {
    const auto = new Auto();
    auto.logger = dummyLog();
    process.env.GH_TOKEN = undefined;
    await expect(auto.loadConfig()).rejects.toBeInstanceOf(Error);
  });

  test('should extend config', async () => {
    search.mockReturnValueOnce({ config: { ...defaults, extends: '@artsy' } });
    importMock.mockImplementation(path =>
      path === '@artsy/auto-config/package.json'
        ? { auto: { onlyPublishWithReleaseLabel: true } }
        : undefined
    );

    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();
    expect(auto.release!.options).toMatchSnapshot();
  });

  test('should extend local config', async () => {
    const orig = process.cwd;
    process.cwd = () => '/foo/';
    search.mockReturnValueOnce({
      config: { ...defaults, extends: './fake.json' }
    });
    importMock.mockImplementation(path =>
      path === '/foo/fake.json' ? { bar: 'foo' } : undefined
    );

    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();
    expect(auto.release!.options).toMatchSnapshot();
    process.cwd = orig;
  });

  test('should use labels from config config', async () => {
    search.mockReturnValueOnce({
      config: { ...defaults, labels }
    });
    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();

    expect([...auto.semVerLabels!.values()]).toEqual([
      ['Version: Major'],
      ['Version: Minor'],
      ['Version: Patch'],
      ['skip-release'],
      ['release'],
      ['prerelease']
    ]);
  });

  test('should add extra skip label', async () => {
    search.mockReturnValueOnce({
      config: {
        ...defaults,
        labels: {
          'skip-release': 'NOPE'
        }
      }
    });
    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();

    expect(auto.release!.options.skipReleaseLabels).toEqual(['NOPE']);
  });

  test('should be able to add label as string', async () => {
    search.mockReturnValueOnce({
      config: {
        ...defaults,
        labels: {
          minor: 'feature'
        }
      }
    });
    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();

    expect(auto.release!.options.labels.minor).toEqual([
      {
        description: 'Increment the minor version when merged',
        name: 'feature',
        title: '🚀  Enhancement'
      }
    ]);
  });

  test('should be able to omit properties from label definition', async () => {
    search.mockReturnValueOnce({
      config: {
        ...defaults,
        labels: {
          minor: {
            description: 'This is a test'
          }
        }
      }
    });
    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();

    expect(auto.release!.options.labels.minor).toEqual([
      {
        description: 'This is a test',
        name: 'minor',
        title: '🚀  Enhancement'
      }
    ]);
  });

  test('arbitrary labels should be able to omit name', async () => {
    search.mockReturnValueOnce({
      config: {
        ...defaults,
        labels: {
          fooBar: {
            description: 'This is a test'
          }
        }
      }
    });
    const auto = new Auto();
    auto.logger = dummyLog();
    await auto.loadConfig();

    expect(auto.release!.options.labels.fooBar).toEqual([
      {
        description: 'This is a test',
        name: 'fooBar'
      }
    ]);
  });

  describe('createLabels', () => {
    test('should throw when not initialized', async () => {
      search.mockReturnValueOnce({
        config: { ...defaults, labels }
      });
      const auto = new Auto();
      auto.logger = dummyLog();
      expect(auto.createLabels()).rejects.toBeTruthy();
    });

    test('should create the labels', async () => {
      search.mockReturnValueOnce({
        config: { ...defaults, labels }
      });
      const auto = new Auto();
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.release!.addLabelsToProject = jest.fn();
      await auto.createLabels();
      expect(auto.release!.addLabelsToProject).toMatchSnapshot();
    });
  });

  describe('label', () => {
    test('should throw when not initialized', async () => {
      search.mockReturnValueOnce({
        config: { ...defaults, labels }
      });
      const auto = new Auto();
      auto.logger = dummyLog();
      expect(auto.label({ pr: 13 })).rejects.toBeTruthy();
    });

    test('should get labels', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const getLabels = jest.fn();
      auto.git!.getLabels = getLabels;
      getLabels.mockReturnValueOnce(['foo']);
      console.log = jest.fn();

      await auto.label({ pr: 13 });
      expect(console.log).toHaveBeenCalledWith('foo');
    });

    test('should get labels for last merged PR', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();

      const getPullRequests = jest.fn();
      auto.git!.getPullRequests = getPullRequests;
      getPullRequests.mockReturnValueOnce([
        {
          merged_at: '2019-01-08T03:45:33.000Z',
          labels: [{ name: 'wubbalublub' }]
        },
        {
          merged_at: '2019-01-10T03:45:33.000Z',
          labels: [{ name: 'foo' }, { name: 'bar' }]
        }
      ]);
      console.log = jest.fn();

      await auto.label();
      expect(console.log).toHaveBeenCalledWith('foo\nbar');
    });

    test('should do nothing when no last merge found', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();

      const getPullRequests = jest.fn();
      auto.git!.getPullRequests = getPullRequests;
      getPullRequests.mockReturnValueOnce([]);
      console.log = jest.fn();

      await auto.label();
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('pr', () => {
    let createStatus: jest.Mock;

    beforeEach(() => {
      createStatus = jest.fn();
    });

    const required: IPRStatusOptions = {
      url: 'https://google.com',
      state: 'pending',
      description: 'foo',
      context: 'bar'
    };

    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      expect(auto.prStatus(required)).rejects.toBeTruthy();
    });

    test('should catch exceptions when status fails to post', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.createStatus = createStatus;
      createStatus.mockRejectedValueOnce({ status: 400 });

      await expect(
        auto.prStatus({ ...required, sha: '1234' })
      ).rejects.toBeInstanceOf(Error);
      expect(createStatus).toHaveBeenCalled();
    });

    test('should do nothing ', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();

      await auto.prStatus({ ...required, sha: '1234', dryRun: true });
      expect(createStatus).not.toHaveBeenCalled();
    });

    test('should use provided SHA', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      await auto.prStatus({ ...required, sha: '1234' });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: '1234'
        })
      );
    });

    test('should use HEAD SHA', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      const getSha = jest.fn();
      auto.git!.getSha = getSha;
      getSha.mockReturnValueOnce('abc');

      await auto.prStatus({ ...required });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'abc'
        })
      );
    });

    test('should use lookup SHA for PR', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      const getPullRequest = jest.fn();
      auto.git!.getPullRequest = getPullRequest;
      getPullRequest.mockReturnValueOnce({ data: { head: { sha: 'deep' } } });

      await auto.prStatus({ ...required, pr: 14 });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'deep'
        })
      );
    });
  });

  describe('pr-check', () => {
    jest.setTimeout(10 * 1000);
    let createStatus: jest.Mock;

    beforeEach(() => {
      createStatus = jest.fn();
    });

    const required = {
      url: 'https://google.com'
    };

    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      expect(auto.prCheck({ pr: 13, ...required })).rejects.toBeTruthy();
    });

    test('should do nothing with dryRun', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      await auto.prCheck({ ...required, pr: 13, dryRun: true });
      expect(createStatus).not.toHaveBeenCalled();
    });

    test('should catch errors', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      await auto.prCheck({ ...required, pr: 13 });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'error'
        })
      );
    });

    test('should catch status errors', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.createStatus = createStatus;
      createStatus.mockRejectedValueOnce({ status: 123 });

      await expect(
        auto.prCheck({ ...required, pr: 13 })
      ).rejects.toBeInstanceOf(Error);
      expect(createStatus).toHaveBeenCalled();
    });

    test('should error with no label', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      const getPullRequest = jest.fn();
      auto.git!.getPullRequest = getPullRequest;
      getPullRequest.mockReturnValueOnce({ data: { head: { sha: 'sha' } } });

      const getLabels = jest.fn();
      auto.git!.getLabels = getLabels;
      getLabels.mockReturnValueOnce([]);

      await auto.prCheck({ ...required, pr: 13 });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'No semver label!'
        })
      );
    });

    test('should pass with semver label', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      const getPullRequest = jest.fn();
      auto.git!.getPullRequest = getPullRequest;
      getPullRequest.mockReturnValueOnce({ data: { head: { sha: 'sha' } } });

      const getLabels = jest.fn();
      auto.git!.getLabels = getLabels;
      getLabels.mockReturnValueOnce(['major']);

      await auto.prCheck({ ...required, pr: 13 });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'CI - major'
        })
      );
    });

    test('should pass with skip release label', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      const getPullRequest = jest.fn();
      auto.git!.getPullRequest = getPullRequest;
      getPullRequest.mockReturnValueOnce({ data: { head: { sha: 'sha' } } });

      const getLabels = jest.fn();
      auto.git!.getLabels = getLabels;
      getLabels.mockReturnValueOnce(['major', 'skip-release']);

      await auto.prCheck({ ...required, pr: 13 });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'PR will not create a release'
        })
      );
    });

    test('should pass with skip release label', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await auto.loadConfig();
      auto.git!.createStatus = createStatus;

      const getPullRequest = jest.fn();
      auto.git!.getPullRequest = getPullRequest;
      getPullRequest.mockReturnValueOnce({ data: { head: { sha: 'sha' } } });

      const getLabels = jest.fn();
      auto.git!.getLabels = getLabels;
      getLabels.mockReturnValueOnce(['major', 'release']);

      await auto.prCheck({ ...required, pr: 13 });
      expect(createStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'PR will create release once merged - major'
        })
      );
    });
  });

  describe('comment', () => {
    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await expect(
        auto.comment({ pr: 10, message: 'foo' })
      ).rejects.toBeTruthy();
    });

    test('should make a comment', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const createComment = jest.fn();
      auto.git!.createComment = createComment;

      await auto.comment({ pr: 10, message: 'foo' });
      expect(createComment).toHaveBeenCalled();
    });

    test('should delete a comment', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const deleteComment = jest.fn();
      auto.git!.deleteComment = deleteComment;

      await auto.comment({ pr: 10, delete: true });
      expect(deleteComment).toHaveBeenCalled();
    });

    test('should edit a comment', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const editComment = jest.fn();
      auto.git!.editComment = editComment;

      await auto.comment({ pr: 10, message: 'foo', edit: true });
      expect(editComment).toHaveBeenCalled();
    });

    test('should not delete a comment in dry run mode', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const deleteComment = jest.fn();
      auto.git!.deleteComment = deleteComment;
      const editComment = jest.fn();
      auto.git!.editComment = editComment;

      await auto.comment({ pr: 10, message: 'foo bar', dryRun: true });
      expect(deleteComment).not.toHaveBeenCalled();

      await auto.comment({ pr: 10, delete: true, dryRun: true });
      expect(deleteComment).not.toHaveBeenCalled();

      await auto.comment({ pr: 10, message: 'foo bar', edit: true, dryRun: true });
      expect(deleteComment).not.toHaveBeenCalled();
      expect(editComment).not.toHaveBeenCalled();
    });
  });

  describe('prBody', () => {
    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      await expect(
        auto.prBody({ pr: 10, message: 'foo' })
      ).rejects.toBeTruthy();
    });

    test('should make a pr body update', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const addToPrBody = jest.fn();
      auto.git!.addToPrBody = addToPrBody;

      await auto.prBody({ pr: 10, message: 'foo' });
      expect(addToPrBody).toHaveBeenCalled();
    });

    test('should delete old pr body update', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const addToPrBody = jest.fn();
      auto.git!.addToPrBody = addToPrBody;

      await auto.prBody({ pr: 10, delete: true });
      expect(addToPrBody).toHaveBeenCalledWith('', 10, 'default');
    });

    test('should not update pr body a dry run mode', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      const addToPrBody = jest.fn();
      auto.git!.addToPrBody = addToPrBody;

      await auto.prBody({ pr: 10, message: 'foo bar', dryRun: true });
      expect(addToPrBody).not.toHaveBeenCalled();

      await auto.prBody({ pr: 10, delete: true, dryRun: true });
      expect(addToPrBody).not.toHaveBeenCalled();
    });
  });

  describe('version', () => {
    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      expect(auto.version()).rejects.toBeTruthy();
    });

    test('should calculate version with default options', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getLatestRelease = jest.fn(() => Promise.resolve('v1.2.3'));
      auto.release!.getSemverBump = jest.fn(() =>
        Promise.resolve(SEMVER.patch)
      );
      console.log = jest.fn();

      await auto.version();
      expect(auto.release!.getSemverBump).toHaveBeenCalledWith('v1.2.3');
      expect(console.log).toHaveBeenCalledWith('patch');
    });

    test('should calculate version with from option', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getLatestRelease = jest.fn(() => Promise.resolve('v1.2.3'));
      auto.release!.getSemverBump = jest.fn(() =>
        Promise.resolve(SEMVER.minor)
      );
      console.log = jest.fn();

      await auto.version({ from: 'v1.1.0' });
      expect(auto.release!.getSemverBump).toHaveBeenCalledWith('v1.1.0');
      expect(console.log).toHaveBeenCalledWith('minor');
    });
  });

  describe('changelog', () => {
    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      expect(auto.changelog()).rejects.toBeTruthy();
    });

    test('should do nothing on a dryRun', async () => {
      const auto = new Auto(defaults);

      auto.logger = dummyLog();
      await auto.loadConfig();

      const addToChangelog = jest.fn();
      auto.release!.addToChangelog = addToChangelog;
      auto.release!.generateReleaseNotes = jest.fn();

      await auto.changelog({ from: 'v1.0.0', dryRun: true });
      expect(addToChangelog).not.toHaveBeenCalled();
    });

    test('should add to changelog', async () => {
      const auto = new Auto({
        plugins: [],
        ...defaults
      });
      auto.logger = dummyLog();
      auto.hooks.getRepository.tap('test', () => ({ token: '1234' }));
      await auto.loadConfig();

      const addToChangelog = jest.fn();
      auto.release!.addToChangelog = addToChangelog;
      auto.release!.generateReleaseNotes = jest.fn();

      await auto.changelog({ from: 'v1.0.0' });
      expect(addToChangelog).toHaveBeenCalled();
    });

    test('should skip getRepository hook if passed in via cli', async () => {
      process.env.GH_TOKEN = 'XXXX';
      const auto = new Auto({
        repo: 'test',
        owner: 'adierkens'
      });
      auto.logger = dummyLog();

      const hookFn = jest.fn();
      auto.hooks.getRepository.tap('test', hookFn);
      await auto.loadConfig();
      await auto.prStatus({
        url: 'foo.bar',
        state: 'pending',
        description: 'Waiting for stuffs',
        context: 'tests',
        dryRun: true
      });

      expect(hookFn).not.toBeCalled();
    });
  });

  describe('release', () => {
    test("doesn't try to overwrite releases", async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.release!.generateReleaseNotes = jest.fn();
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);

      auto.hooks.getPreviousVersion.tap('test', () => '1.2.3');
      const afterRelease = jest.fn();
      auto.hooks.afterRelease.tap('test', afterRelease);
      auto.release!.getCommits = jest.fn();

      await auto.runRelease();
      expect(afterRelease).not.toHaveBeenCalled();
    });

    test('should publish with default options', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.publish = jest.fn();
      auto.release!.generateReleaseNotes = jest.fn(() =>
        Promise.resolve('releaseNotes')
      );
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);

      auto.hooks.getPreviousVersion.tap('test', () => '1.2.4');
      const afterRelease = jest.fn();
      auto.hooks.afterRelease.tap('test', afterRelease);
      auto.release!.getCommits = jest.fn();

      await auto.runRelease();
      expect(auto.release!.generateReleaseNotes).toHaveBeenCalledWith(
        'v1.2.3',
        undefined,
        undefined
      );
      expect(auto.git!.publish).toHaveBeenCalledWith('releaseNotes', 'v1.2.4');
      expect(afterRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRelease: 'v1.2.3',
          newVersion: 'v1.2.4'
        })
      );
    });

    test('should publish with lastRelease using from option', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.publish = jest.fn();
      auto.release!.generateReleaseNotes = jest.fn(() =>
        Promise.resolve('releaseNotes')
      );
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);

      auto.hooks.getPreviousVersion.tap('test', () => '1.2.4');
      const afterRelease = jest.fn();
      auto.hooks.afterRelease.tap('test', afterRelease);
      auto.release!.getCommits = jest.fn();

      await auto.runRelease({
        from: 'v1.2.0'
      });
      expect(auto.release!.generateReleaseNotes).toHaveBeenCalledWith(
        'v1.2.0',
        undefined,
        undefined
      );
      expect(auto.git!.publish).toHaveBeenCalledWith('releaseNotes', 'v1.2.4');
      expect(afterRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRelease: 'v1.2.0',
          newVersion: 'v1.2.4'
        })
      );
    });

    test('should publish with newVersion using useVersion option', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.publish = jest.fn();
      auto.release!.generateReleaseNotes = jest.fn(() =>
        Promise.resolve('releaseNotes')
      );
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);

      auto.hooks.getPreviousVersion.tap('test', () => '1.2.4');
      const afterRelease = jest.fn();
      auto.hooks.afterRelease.tap('test', afterRelease);
      auto.release!.getCommits = jest.fn();

      await auto.runRelease({
        useVersion: 'v1.3.0'
      });
      expect(auto.release!.generateReleaseNotes).toHaveBeenCalledWith(
        'v1.2.3',
        undefined,
        undefined
      );
      expect(auto.git!.publish).toHaveBeenCalledWith('releaseNotes', 'v1.3.0');
      expect(afterRelease).toHaveBeenCalledWith(
        expect.objectContaining({
          lastRelease: 'v1.2.3',
          newVersion: 'v1.3.0'
        })
      );
    });
  });

  describe('canary', () => {
    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      expect(auto.canary()).rejects.toBeTruthy();
    });

    test('does not call canary hook in dry-run', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);
      const canary = jest.fn();
      auto.hooks.canary.tap('test', canary);
      auto.release!.getCommits = jest.fn();

      await auto.canary({ pr: 123, build: 1, dryRun: true });
      expect(canary).not.toHaveBeenCalled();
    });

    test('calls the canary hook with the pr info', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.getSha = () => Promise.resolve('abc');
      auto.git!.addToPrBody = jest.fn();
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);
      const canary = jest.fn();
      auto.hooks.canary.tap('test', canary);
      auto.release!.getCommits = jest.fn();

      await auto.canary({ pr: 123, build: 1 });
      expect(canary).toHaveBeenCalledWith(SEMVER.patch, '.123.1.abc');
      expect(auto.git!.addToPrBody).toHaveBeenCalled();
    });

    test('falls back to first commit', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestTagInBranch = () => {
        throw new Error();
      };
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.getSha = () => Promise.resolve('abc');
      auto.release!.getCommits = () => Promise.resolve([]);
      auto.git!.getFirstCommit = () => Promise.resolve('abcd');
      auto.git!.addToPrBody = jest.fn();
      auto.release!.getCommitsInRelease = jest
        .fn()
        .mockReturnValue(Promise.resolve([makeCommitFromMsg('Test Commit')]));
      const canary = jest.fn();
      auto.hooks.canary.tap('test', canary);
      auto.release!.getCommits = jest.fn();

      await auto.canary({ pr: 123, build: 1 });
      expect(auto.release!.getCommits).toHaveBeenCalledWith('abcd');
    });

    test('adds sha if no pr or build number is found', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.getSha = () => Promise.resolve('abc');
      auto.git!.addToPrBody = jest.fn();
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);
      const canary = jest.fn();
      auto.hooks.canary.tap('test', canary);
      auto.release!.getCommits = jest.fn();

      await auto.canary();
      expect(canary).toHaveBeenCalledWith(SEMVER.patch, '.abc');
    });

    test("doesn't comment if there is an error", async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();
      auto.prBody = jest.fn();
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.getSha = () => Promise.resolve('abc');
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);

      const canary = jest.fn();
      canary.mockReturnValue({ error: 'ooops' });
      auto.hooks.canary.tap('test', canary);
      auto.release!.getCommits = jest.fn();

      await auto.canary({ pr: 123, build: 1 });
      expect(auto.prBody).not.toHaveBeenCalled();
    });

    test('defaults to sha when run locally', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getSha = () => Promise.resolve('abcd');
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([makeCommitFromMsg('Test Commit')]);
      const canary = jest.fn();
      auto.hooks.canary.tap('test', canary);

      await auto.canary();
      expect(canary).toHaveBeenCalledWith(SEMVER.patch, '.abcd');
    });

    test('works when PR has "skip-release" label', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getSha = () => Promise.resolve('abcd');
      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.release!.getCommitsInRelease = () =>
        Promise.resolve([
          makeCommitFromMsg('Test Commit', {
            labels: ['skip-release']
          })
        ]);
      const canary = jest.fn();
      auto.hooks.canary.tap('test', canary);

      await auto.canary();
      expect(canary).toHaveBeenCalledWith(SEMVER.patch, '.abcd');
    });
  });

  describe('shipit', () => {
    test('should throw when not initialized', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      expect(auto.shipit()).rejects.toBeTruthy();
    });

    test('should not publish when no latest version found', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getLatestRelease = () => Promise.resolve('');
      auto.release!.getSemverBump = () => Promise.resolve(SEMVER.noVersion);
      const afterShipIt = jest.fn();
      auto.hooks.afterShipIt.tap('test', afterShipIt);

      await auto.shipit();
      expect(afterShipIt).not.toHaveBeenCalled();
    });

    test('should publish to latest on base branch', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.publish = jest.fn();
      auto.release!.getCommitsInRelease = jest.fn();
      auto.release!.generateReleaseNotes = jest.fn();
      auto.release!.addToChangelog = jest.fn();
      const afterShipIt = jest.fn();
      auto.hooks.afterShipIt.tap('test', afterShipIt);

      await auto.shipit();
      expect(afterShipIt).toHaveBeenCalled();
    });

    test('should skip publish in dry run', async () => {
      const auto = new Auto({ ...defaults, plugins: [] });
      auto.logger = dummyLog();
      await auto.loadConfig();

      auto.git!.getLatestRelease = () => Promise.resolve('1.2.3');
      auto.git!.publish = jest.fn();
      auto.release!.getCommitsInRelease = jest.fn();
      auto.release!.generateReleaseNotes = jest.fn();
      auto.release!.addToChangelog = jest.fn();
      const version = jest.fn();
      auto.hooks.version.tap('test', version);

      await auto.shipit({ dryRun: true });
      expect(version).not.toHaveBeenCalled();
    });
  });
});

describe('hooks', () => {
  test('should be able to modifyConfig', async () => {
    const auto = new Auto(defaults);
    auto.logger = dummyLog();

    auto.hooks.modifyConfig.tap('test', testConfig => {
      testConfig.labels.released = [
        {
          name: 'released',
          description: 'This issue/pull request has been released'
        }
      ];

      return testConfig;
    });

    await auto.loadConfig();

    expect(auto.labels!.released).toEqual([
      {
        description: 'This issue/pull request has been released',
        name: 'released'
      }
    ]);
  });

  describe('logParse', () => {
    test('should be able to tap parseCommit', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      auto.hooks.onCreateLogParse.tap('test', logParse => {
        logParse.hooks.parseCommit.tap('test parse', commit => {
          commit.labels = [...auto.semVerLabels!.get(SEMVER.major)!];
          return commit;
        });
      });

      await auto.loadConfig();
      auto.git!.getLatestRelease = async () => Promise.resolve('1.0.0');

      console.log = jest.fn();
      await auto.version();

      expect(console.log).toHaveBeenCalledWith('major');
    });

    test('should be able to tap omitCommit', async () => {
      const auto = new Auto(defaults);
      auto.logger = dummyLog();

      auto.hooks.onCreateLogParse.tap('test', logParse => {
        logParse.hooks.parseCommit.tap('test parse', commit => {
          commit.labels = [...auto.semVerLabels!.get(SEMVER.major)!];
          return commit;
        });
      });

      auto.hooks.onCreateLogParse.tap('test', logParse => {
        logParse.hooks.omitCommit.tap('test omit', commit => {
          if (commit.labels.includes('major')) {
            return true;
          }
        });
      });

      await auto.loadConfig();
      auto.git!.getLatestRelease = async () => Promise.resolve('1.0.0');

      console.log = jest.fn();
      await auto.version();

      expect(console.log).toHaveBeenCalledWith('patch');
    });
  });
});
