// Публічний бар'єл Git-рушія.

export * from "./types";
export { GitEngine } from "./store";
export { createSeedWorkspace } from "./seed";
export { freshWorkspace, freshRepo, currentRepo, repoByName, repoAt, toRepoRel } from "./workspace";
export { loadWorkspace, saveWorkspace } from "./persistence";
export { computeStatus, isDirty, hasConflictMarkers } from "./status";
export { dispatch } from "./commands";
export { complete } from "./complete";
export { treeDiff, unifiedDiff, lcsDiff, countChanges, type FileChange } from "./diff";
export { computeMerge, mergeBase, isAncestor } from "./merge";
export { cloneRepo } from "./remote";
export { computeGraph, laneColor, type GraphNode } from "./graph";
export {
  createPullRequest,
  mergePullRequest,
  closePullRequest,
  addPrComment,
  addPrReview,
  prCommits,
  prDiffTrees,
  type MergeOutcome,
} from "./pulls";
export {
  headCommit,
  headCommitOid,
  commitHistory,
  readCommit,
  readBlob,
  readTree,
  treeToMap,
  treeToFileMap,
  resolveRef,
  ancestors,
  currentBranch,
} from "./objects";
export { short } from "./oid";
export {
  createBranch,
  deleteBranch,
  renameBranch,
  checkoutBranch,
  createCommit,
  stageFile,
  stagePathspec,
  unstagePath,
  commitTree,
  loadTreeIntoWorkdir,
} from "./repo";
export * as path from "./path";
