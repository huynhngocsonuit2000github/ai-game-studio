# GitHub Actions

`pages.yml` verifies pull requests and publishes the assembled site on main pushes or manual runs from main. The [deployment runbook](../../deployment/README.md) covers setup, local checks and rollback.

`scope.yml` uses `pull_request_target` for PRs into main. It checks out the base commit, fetches the head as Git data, and never executes PR code. The checker compares the merge base and head, treating renames as a deletion and addition. A game PR can touch one game directory and the registry fields granted to that ID in the base commit's [scope policy](../../studio/production/registry-scope.json). Registry-only and Studio-only PRs remain subject to Studio review.

For authorized cross-scope work, a separate reviewed policy change on main can grant the exact head SHA and path list under `approvedHeads`. PR labels, titles and candidate edits to the policy do not grant access. Require the trusted scope check in repository rules where available. The initial workflow is installed by merging M0-04 and has no pre-merge base-branch run.
