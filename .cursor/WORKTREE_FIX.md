# Worktree Apply Error Fix

## The Error

```
Failed to apply worktree to current branch: Unable to write file '/Users/Documents/AfterSave/aftersave/...' 
(NoPermissions (FileSystemError): Error: EACCES: permission denied, mkdir '/Users/Documents')
```

This is a **Cursor IDE bug**: it resolves the workspace path as `/Users/Documents/...` instead of `/Users/nirerlich/Documents/...`, dropping the username.

## What Was Done

1. **Removed all Cursor worktrees** – Stale worktrees can cause path resolution issues.
2. **Pruned git worktrees** – Cleaned up orphaned worktree metadata.

## If It Happens Again

### Option 1: Re-open with full path
Close Cursor, then open the project using the **full absolute path**:
- **File → Open Folder** → `/Users/nirerlich/Documents/AfterSave/aftersave`
- Avoid opening from "Recent" or via a path like `~/Documents/...` if that triggers the bug.

### Option 2: Manually apply changes
If Apply fails but you need the worktree changes:

```bash
# List worktrees
git worktree list

# Copy changed files from worktree to main repo
# Worktrees live at: ~/.cursor/worktrees/aftersave/<id>/
cp ~/.cursor/worktrees/aftersave/<WORKTREE_ID>/src/path/to/file.ts ./src/path/to/file.ts
```

### Option 3: Clean worktrees and retry
```bash
cd /Users/nirerlich/Documents/AfterSave/aftersave
git worktree list
# Remove each Cursor worktree: git worktree remove ~/.cursor/worktrees/aftersave/<id>
git worktree prune
rm -rf ~/.cursor/worktrees/aftersave
```

Then restart Cursor and try again.

## Report to Cursor

This is a known class of bugs. Consider reporting at: https://forum.cursor.com/c/support/bug-report/6
