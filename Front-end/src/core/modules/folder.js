// src/core/folder/folder.js
// Core, platform-agnostic folder helpers (Web + Mobile).
// - No React
// - No direct UI
// - Safe normalization across different backend shapes
// - Tree index + navigation helpers for Move/Share/Restore pickers

/**
 * @typedef {Object} FolderNode
 * @property {string} id
 * @property {string} name
 * @property {string|null} parentId
 * @property {Object} [raw]        // original record (optional)
 */

/**
 * Normalize folder records from any backend shape into FolderNode[].
 *
 * Supported keys (common variants):
 * - id / folder_id / folderId
 * - name / folder_name / folderName
 * - parent_id / parent_folder_id / parentId / parentFolderId
 *
 * @param {Array<Object>} rawFolders
 * @returns {FolderNode[]}
 */
export function normalizeFolders(rawFolders = []) {
  if (!Array.isArray(rawFolders)) return [];

  return rawFolders
    .map((f) => {
      const id =
        f?.id ?? f?.folder_id ?? f?.folderId ?? f?.folderID ?? f?.folder_uuid ?? f?.folderUuid;
      const name = f?.name ?? f?.folder_name ?? f?.folderName ?? f?.folder ?? "";
      const parent =
        f?.parentId ??
        f?.parent_id ??
        f?.parentFolderId ??
        f?.parent_folder_id ??
        f?.parent_folder ??
        null;

      if (id == null || !String(name).trim()) return null;

      return {
        id: String(id),
        name: String(name),
        parentId: parent == null || parent === "" ? null : String(parent),
        raw: f,
      };
    })
    .filter(Boolean);
}

/**
 * Build a fast index for folder navigation.
 *
 * @param {FolderNode[]} folders
 * @returns {{
 *  byId: Map<string, FolderNode>,
 *  childrenByParent: Map<string, string[]>, // parentKey -> childIds (parentKey = "root" for null parents)
 *  roots: FolderNode[]
 * }}
 */
export function buildFolderIndex(folders = []) {
  const byId = new Map();
  const childrenByParent = new Map();

  const safeFolders = Array.isArray(folders) ? folders : [];

  for (const f of safeFolders) {
    const id = String(f.id);
    const parentId = f.parentId == null ? null : String(f.parentId);

    const node = { ...f, id, parentId };
    byId.set(id, node);

    const key = parentId ?? "root";
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key).push(id);
  }

  // roots are those that have no parent OR parent not found
  const roots = [];
  for (const node of byId.values()) {
    if (!node.parentId || !byId.has(String(node.parentId))) roots.push(node);
  }

  return { byId, childrenByParent, roots };
}

/**
 * Get children folders for a folderId (or root).
 *
 * @param {{byId: Map<string, FolderNode>, childrenByParent: Map<string,string[]>}} index
 * @param {string|null|undefined} folderId
 * @returns {FolderNode[]}
 */
export function getChildrenFolders(index, folderId) {
  if (!index?.byId || !index?.childrenByParent) return [];

  const key = !folderId || folderId === "root" ? "root" : String(folderId);
  const ids = index.childrenByParent.get(key) || [];
  return ids.map((id) => index.byId.get(id)).filter(Boolean);
}

/**
 * Compute breadcrumb path from root to folderId.
 *
 * @param {{byId: Map<string, FolderNode>}} index
 * @param {string|null|undefined} folderId
 * @param {Object} [opts]
 * @param {string} [opts.rootName="My files"]
 * @returns {{id: string, name: string}[]}
 */
export function getBreadcrumbPath(index, folderId, opts = {}) {
  const rootName = opts.rootName ?? "My files";
  const path = [{ id: "root", name: rootName }];

  if (!index?.byId) return path;
  if (!folderId || folderId === "root") return path;

  const chain = [];
  const seen = new Set();

  let cur = index.byId.get(String(folderId));
  while (cur) {
    if (seen.has(cur.id)) break; // cycle protection
    seen.add(cur.id);

    chain.push({ id: cur.id, name: cur.name });
    cur = cur.parentId ? index.byId.get(String(cur.parentId)) : null;
  }

  chain.reverse();
  return path.concat(chain);
}

/**
 * Search folders by name (case-insensitive).
 *
 * @param {FolderNode[]} folders
 * @param {string} query
 * @returns {FolderNode[]}
 */
export function searchFoldersByName(folders, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return Array.isArray(folders) ? folders : [];
  return (Array.isArray(folders) ? folders : []).filter((f) =>
    String(f?.name || "").toLowerCase().includes(q)
  );
}

/**
 * Filter visible folders for a folder picker view:
 * - if query is empty => children of current folder
 * - else => global name search (optional UX)
 *
 * @param {{byId: Map<string, FolderNode>, childrenByParent: Map<string,string[]>}} index
 * @param {FolderNode[]} allFolders
 * @param {string|null|undefined} currentFolderId
 * @param {string} query
 * @param {Object} [opts]
 * @param {boolean} [opts.searchGlobal=true]
 * @returns {FolderNode[]}
 */
export function getVisibleFolders(index, allFolders, currentFolderId, query, opts = {}) {
  const searchGlobal = opts.searchGlobal ?? true;
  const q = (query || "").trim();

  if (!q) return getChildrenFolders(index, currentFolderId);

  return searchGlobal ? searchFoldersByName(allFolders, q) : searchFoldersByName(getChildrenFolders(index, currentFolderId), q);
}

/**
 * Validate a folderId as a move target.
 * Prevents moving into itself or into one of its descendants (cycle).
 *
 * @param {{byId: Map<string, FolderNode>, childrenByParent: Map<string,string[]>}} index
 * @param {string} targetFolderId
 * @param {string[]} movingFolderIds
 * @returns {{ok: boolean, reason?: string}}
 */
export function validateMoveTarget(index, targetFolderId, movingFolderIds = []) {
  if (!index?.byId || !index?.childrenByParent) {
    return { ok: true };
  }

  const target = targetFolderId == null || targetFolderId === "root" ? "root" : String(targetFolderId);
  const moving = (Array.isArray(movingFolderIds) ? movingFolderIds : []).map(String);

  if (moving.length === 0) return { ok: true };

  // can't move a folder into itself
  if (moving.includes(target)) {
    return { ok: false, reason: "Cannot move a folder into itself." };
  }

  // if target is root, always ok
  if (target === "root") return { ok: true };

  // check if target is inside any moving folder subtree
  for (const movingId of moving) {
    if (isDescendant(index, target, movingId)) {
      return { ok: false, reason: "Cannot move a folder into its own subfolder." };
    }
  }

  return { ok: true };
}

/**
 * Returns true if nodeId is inside ancestorId subtree.
 * (i.e., walking parents from nodeId reaches ancestorId)
 *
 * @param {{byId: Map<string, FolderNode>}} index
 * @param {string} nodeId
 * @param {string} ancestorId
 */
export function isDescendant(index, nodeId, ancestorId) {
  if (!index?.byId) return false;

  const target = String(nodeId);
  const anc = String(ancestorId);

  const seen = new Set();
  let cur = index.byId.get(target);

  while (cur) {
    if (seen.has(cur.id)) break;
    seen.add(cur.id);

    if (cur.parentId == null) return false;
    if (String(cur.parentId) === anc) return true;

    cur = index.byId.get(String(cur.parentId));
  }

  return false;
}

/**
 * Utility to build everything at once:
 * normalize -> index
 *
 * @param {Array<Object>} rawFolders
 * @returns {{folders: FolderNode[], index: ReturnType<typeof buildFolderIndex>}}
 */
export function prepareFolderTree(rawFolders) {
  const folders = normalizeFolders(rawFolders);
  const index = buildFolderIndex(folders);
  return { folders, index };
}
