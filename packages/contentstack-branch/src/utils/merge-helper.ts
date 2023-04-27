import startCase from 'lodash/startCase';
import camelCase from 'lodash/camelCase';
import path from 'path';
import { cliux, managementSDKClient } from '@contentstack/cli-utilities';
import { BranchDiffPayload } from '../interfaces/index';
import {
  askCompareBranch,
  askStackAPIKey,
  askBaseBranch,
  getbranchConfig,
  branchDiffUtility as branchDiff,
  apiPostRequest,
  apiGetRequest,
  writeFile,
  executeMergeRequest,
  getMergeQueueStatus,
} from './';

import config from '../config';

export const prepareMergeRequestPayload = (options) => {
  return {
    base_branch: options.baseBranch, // UID of the base branch, where the changes will be merged into
    compare_branch: options.compareBranch, // UID of the branch to merge
    default_merge_strategy: options.strategy,
    item_merge_strategies: options.itemMergeStrategies,
    merge_comment: options.mergeComment,
    no_revert: options.noRevert,
  };
};

export const setupMergeInputs = async (mergeFlags) => {
  if (!mergeFlags['stack-api-key']) {
    mergeFlags['stack-api-key'] = await askStackAPIKey();
  }
  if (!mergeFlags['compare-branch']) {
    mergeFlags['compare-branch'] = await askCompareBranch();
  }
  if (!mergeFlags['base-branch']) {
    mergeFlags['base-branch'] = getbranchConfig(mergeFlags['stack-api-key']);
    if (!mergeFlags['base-branch']) {
      mergeFlags['base-branch'] = await askBaseBranch();
    } else {
      cliux.print(`\nBase branch: ${mergeFlags['base-branch']}\n`, { color: 'grey' });
    }
  }

  return mergeFlags;
};

export const displayBranchStatus = async (options) => {
  let payload: BranchDiffPayload = {
    module: '',
    apiKey: options.stackAPIKey,
    baseBranch: options.baseBranch,
    compareBranch: options.compareBranch,
    host: options.host,
  };

  const branchDiffData = await branchDiff.fetchBranchesDiff(payload);
  const diffData = branchDiff.filterBranchDiffDataByModule(branchDiffData);

  let parsedResponse = {};
  for (let module in diffData) {
    const branchModuleData = diffData[module];
    payload.module = module;
    cliux.print(' ');
    cliux.print(`${startCase(camelCase(module))} Summary:`, { color: 'yellow' });
    const diffSummary = branchDiff.parseSummary(branchModuleData, options.baseBranch, options.compareBranch);
    branchDiff.printSummary(diffSummary);
    // cliux.print(`Differences in '${options.compareBranch}' compared to '${options.baseBranch}':`);
    if (options.format === 'compact-text') {
      const branchTextRes = branchDiff.parseCompactText(branchModuleData);
      branchDiff.printCompactTextView(branchTextRes);
      parsedResponse[module] = branchTextRes;
    } else if (options.format === 'detailed-text') {
      const verboseRes = await branchDiff.parseVerbose(branchModuleData, payload);
      branchDiff.printVerboseTextView(verboseRes);
      parsedResponse[module] = verboseRes;
    }
  }
  return parsedResponse;
};

export const displayMergeSummary = (options) => {
  cliux.print(' ');
  cliux.print(`Merge Summary:`, { color: 'yellow' });
  for (let module in options.compareData) {
    if (options.format === 'compact-text') {
      branchDiff.printCompactTextView(options.compareData[module]);
    } else if (options.format === 'detailed-text') {
      branchDiff.printVerboseTextView(options.compareData[module]);
    }
  }
  cliux.print(' ');
};

export const executeMerge = async (apiKey, mergePayload, host): Promise<any> => {
  const stackAPIClient = await (await managementSDKClient({ host })).stack({ api_key: apiKey });
  const mergeResponse = await executeMergeRequest(stackAPIClient, { params: mergePayload });
  if (mergeResponse.merge_details?.status === 'in_progress') {
    // TBD call the queue with the id
    return await fetchMergeStatus(stackAPIClient, { uid: mergeResponse.uid });
  } else if (mergeResponse.merge_details?.status === 'complete') {
    // return the merge id success
    return mergeResponse;
  }
};

export const fetchMergeStatus = async (stackAPIClient, mergePayload): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    const mergeStatusResponse = await getMergeQueueStatus(stackAPIClient, { uid: mergePayload.uid });

    if (mergeStatusResponse?.queue?.length >= 1) {
      const mergeRequestStatusResponse = mergeStatusResponse.queue[0];
      const mergeStatus = mergeRequestStatusResponse.merge_details?.status;
      if (mergeStatus === 'complete') {
        resolve(mergeRequestStatusResponse);
      } else if (mergeStatus === 'in-progress' || mergeStatus === 'in_progress') {
        setTimeout(async () => {
          await fetchMergeStatus(stackAPIClient, mergePayload).then(resolve).catch(reject);
        }, 5000);
      } else if (mergeStatus === 'failed') {
        if (mergeRequestStatusResponse?.errors?.length > 0) {
          const errorPath = path.join(process.cwd(), 'merge-error.log');
          await writeFile(errorPath, mergeRequestStatusResponse.errors);
          cliux.print(`\nComplete error log can be found in ${path.resolve(errorPath)}`, { color: 'grey' });
        }
        return reject(`merge uid: ${mergePayload.uid}`);
      } else {
        return reject(`Invalid merge status found with merge ID ${mergePayload.uid}`);
      }
    } else {
      return reject(`No queue found with merge ID ${mergePayload.uid}`);
    }
  });
};
