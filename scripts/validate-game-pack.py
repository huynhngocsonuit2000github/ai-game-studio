"""Validate a V5.1 game pack and stage a review copy outside the repository."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile
import zlib

MAX_ARCHIVE = 64 * 1024**2
MAX_TOTAL = 128 * 1024**2
MAX_FILE = 32 * 1024**2
MAX_CONTROL = 256 * 1024
MAX_ENTRIES = 1000
ID = re.compile(r"[a-z0-9]+(?:-[a-z0-9]+)*")
SEGMENT = re.compile(r"[A-Za-z0-9_][A-Za-z0-9._-]*")
SHA256 = re.compile(r"[0-9a-f]{64}")
COMMIT = re.compile(r"[0-9a-f]{40}")
STAGES = {f"S{index:02}" for index in range(7)}
KINDS = {"new-game", "feature", "expansion", "asset", "bug-fix"}
CONTROL = {"packId", "kind", "gameId", "baseCommit", "approvedScope",
           "requestedStages", "deferredGates", "publicationApproval", "firstTask"}
MANIFEST = CONTROL | {"schemaVersion", "files", "missingAssets"}
ROOT_FILES = {"README.md", "package.json", "index.html", "tsconfig.json",
              "vite.config.ts", "playwright.config.ts"}
GAME_DIRS = {"assets", "design", "production", "public", "reports", "src", "stages", "tests"}
ASSET_AREAS = {"concept", "source", "runtime"}
MEDIA = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".ico", ".bmp", ".tga",
         ".tif", ".tiff", ".psd", ".ase", ".aseprite", ".blend", ".glb", ".gltf", ".obj",
         ".fbx", ".dae", ".stl", ".ktx", ".ktx2", ".dds", ".wav", ".mp3", ".ogg", ".opus",
         ".flac", ".m4a", ".mid", ".mp4", ".webm", ".woff", ".woff2", ".ttf", ".otf"}
BLOCKED_NAMES = {"node_modules", "dist", "coverage", "pnpm-lock.yaml", "package-lock.json",
                 "yarn.lock", "pnpm-workspace.yaml", "agents.md", "start_codex.md",
                 "pack_manifest.json"}


class PackError(ValueError):
    """A pack, checkout or approval does not meet the import contract."""


def require(condition, message):
    if not condition:
        raise PackError(message)


def json_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(raw):
    def reject_constant(value):
        raise PackError(f"Invalid JSON value: {value}")

    return json.loads(raw.decode("utf-8"), object_pairs_hook=json_object,
                      parse_constant=reject_constant)


def fields(value, names, label):
    require(isinstance(value, dict) and value.keys() == names, f"Invalid fields in {label}")


def has_text(value):
    return isinstance(value, str) and bool(value.strip())


def matches(pattern, value):
    return isinstance(value, str) and pattern.fullmatch(value) is not None


def path_parts(value):
    require(isinstance(value, str) and len(value) <= 240, "Invalid path")
    parts = value.split("/")
    for part in parts:
        stem = part.split(".")[0].upper()
        require(len(part) <= 100 and SEGMENT.fullmatch(part) and not part.endswith(".")
                and not re.fullmatch(r"CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9]", stem),
                f"Unsafe path: {value!r}")
    return parts


def destination(value):
    parts = path_parts(value)
    require((value in ROOT_FILES or (len(parts) > 1 and parts[0] in GAME_DIRS))
            and not any(part.lower() in BLOCKED_NAMES for part in parts),
            f"Unexpected game destination: {value}")
    if parts[0] == "assets":
        require(len(parts) > 2 and parts[1] in ASSET_AREAS, f"Invalid asset area: {value}")
    return parts


def unique_strings(value, label):
    require(isinstance(value, list) and all(has_text(item) for item in value),
            f"{label} must be a list of nonempty strings")
    require(len(value) == len(set(value)), f"Duplicate value in {label}")
    return set(value)


def register_path(parts, tree, kind):
    for index in range(1, len(parts) + 1):
        name = "/".join(parts[:index])
        node = (name, kind if index == len(parts) else "directory")
        existing = tree.setdefault(name.lower(), node)
        require(existing == node, f"Case collision or file/directory conflict: {name}")


def archive_members(archive):
    entries = archive.infolist()
    require(len(entries) <= MAX_ENTRIES, "ZIP entry count exceeds limit")
    require(sum(entry.file_size for entry in entries) <= MAX_TOTAL, "ZIP total size exceeds limit")
    members, tree = {}, {}
    for entry in entries:
        name = entry.orig_filename
        directory = name.endswith("/")
        parts = path_parts(name[:-1] if directory else name)
        require(name == entry.filename and name not in members, f"Duplicate or invalid ZIP name: {name!r}")
        require(parts[0] == "payload" or name in {"PACK_MANIFEST.json", "START_CODEX.md"},
                f"Unexpected ZIP member: {name}")
        require(directory or name != "payload", "payload must be a directory")
        mode = stat.S_IFMT(entry.external_attr >> 16)
        expected = stat.S_IFDIR if directory else stat.S_IFREG
        require(mode in {0, expected} and not (entry.external_attr & 0x400),
                f"ZIP member must be a regular file or directory: {name}")
        require(not (entry.flag_bits & 1) and entry.compress_type in {zipfile.ZIP_STORED, zipfile.ZIP_DEFLATED},
                f"Unsupported ZIP encryption or compression: {name}")
        require(entry.file_size <= (0 if directory else MAX_FILE), f"ZIP member exceeds limit: {name}")
        register_path(parts, tree, "directory" if directory else "file")
        members[name] = entry

    for name in ("PACK_MANIFEST.json", "START_CODEX.md"):
        require(name in members and 0 < members[name].file_size <= MAX_CONTROL,
                f"Missing or oversized control file: {name}")
    return members


def validate_manifest(manifest, approval, game_id, revision, archive_digest):
    fields(manifest, MANIFEST, "manifest")
    fields(approval, CONTROL | {"archiveSha256", "evidence"}, "external approval")
    require(type(manifest["schemaVersion"]) is int and manifest["schemaVersion"] == 1,
            "Expected schemaVersion 1")
    require(has_text(approval["evidence"]) and all(approval[key] == manifest[key] for key in CONTROL),
            "Pack scope, identity or publication claims differ from external approval")
    require(approval["archiveSha256"] == archive_digest, "Archive digest differs from external approval")
    require(matches(ID, game_id) and game_id != "studio" and game_id == manifest["gameId"],
            "Pack does not match the exact target game ID")
    require(matches(ID, manifest["packId"]), "Invalid packId")
    kind = manifest["kind"]
    require(isinstance(kind, str) and kind in KINDS, "Invalid pack kind")
    base = manifest["baseCommit"]
    require(base is None or (matches(COMMIT, base) and base == revision),
            "baseCommit must match checkout HEAD")
    require(has_text(manifest["firstTask"]), "firstTask is required")

    stages = manifest["requestedStages"]
    stage_set = unique_strings(stages, "requestedStages")
    require(stage_set <= STAGES and stages == sorted(stages), "Invalid requestedStages or stage order")
    deferred = unique_strings(manifest["deferredGates"], "deferredGates")
    intermediate = set(stages[:-1]) - {"S00", "S06"}
    require(deferred <= intermediate | {"G2"}, "Invalid deferred approval")
    require("G2" not in deferred or "S03" in intermediate, "G2 deferral requires a named S03 batch")
    require("S03" not in deferred or "G2" in deferred, "Deferring S03 requires explicit G2 deferral")

    scope = manifest["approvedScope"]
    fields(scope, {"destinations", "replace"}, "approvedScope")
    allowed = unique_strings(scope["destinations"], "approved destinations")
    replacements = unique_strings(scope["replace"], "approved replacements")
    require(replacements <= allowed, "Replacement outside approved destinations")
    require(not replacements or (base is not None and kind != "new-game"),
            "Replacements require an existing-game delta pinned to baseCommit")

    publication = manifest["publicationApproval"]
    fields(publication, {"status", "scope", "evidence"}, "publicationApproval")
    public_paths = unique_strings(publication["scope"], "publication scope")
    status = publication["status"]
    require(status in ("approved", "pending", "not-requested") and public_paths <= allowed,
            "Invalid publication approval")
    if status == "approved":
        require(public_paths and has_text(publication["evidence"]), "Approved publication needs scope and evidence")
    else:
        require(publication["evidence"] is None, "Pending or unrequested publication must have null evidence")
    unique_strings(manifest["missingAssets"], "missingAssets")
    return allowed, replacements, public_paths if status == "approved" else set()


def payload_plan(manifest, members, allowed, public_paths):
    files = manifest["files"]
    require(isinstance(files, list) and 0 < len(files) <= MAX_ENTRIES - 2, "Invalid payload file count")
    sources, targets, target_tree = set(), set(), {}
    for item in files:
        require(isinstance(item, dict) and item.keys() in (
            {"path", "sha256", "bytes", "destination"},
            {"path", "sha256", "bytes", "destination", "rights"},
        ), "Invalid manifest file fields")
        source = item["path"]
        source_parts = path_parts(source)
        target = item["destination"]
        target_parts = destination(target)
        register_path(target_parts, target_tree, "file")
        require(source_parts[0] == "payload" and source in members
                and not members[source].is_dir() and source not in sources,
                f"Missing or repeated payload file: {source}")
        require(target in allowed and target not in targets, f"Unexpected or repeated destination: {target}")
        require(type(item["bytes"]) is int and item["bytes"] == members[source].file_size
                and matches(SHA256, item["sha256"]), f"Invalid size or digest: {source}")

        if len(source_parts) > 1 and source_parts[1].lower() == "assets":
            require(len(source_parts) > 3 and source_parts[1] == "assets" and source_parts[2] in ASSET_AREAS
                    and target_parts[:2] == source_parts[1:3], f"Asset area changed: {source}")
        asset = (target_parts[0] == "assets" or Path(source).suffix.lower() in MEDIA
                 or Path(target).suffix.lower() in MEDIA or "rights" in item)
        if asset:
            rights = item.get("rights")
            fields(rights, {"status", "source", "license", "evidence"}, f"rights for {source}")
            require(rights["status"] == "cleared" and all(
                has_text(rights[key]) for key in ("source", "license", "evidence")
            ) and target in public_paths, f"Asset rights or public-repo approval pending: {target}")
        sources.add(source)
        targets.add(target)

    actual = {name for name, entry in members.items() if name.startswith("payload/") and not entry.is_dir()}
    require(sources == actual and targets == allowed, "Manifest does not match ZIP payload or approved destinations")
    for name, entry in members.items():
        if entry.is_dir():
            require(any(source.startswith(name) for source in sources), f"Unexpected empty ZIP directory: {name}")
    return files


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args])


def open_input(path):
    require(path.is_file() and not path.is_symlink(), f"Expected a regular input file: {path}")
    return path.open("rb")


def checkout_path(root, parts):
    current = root
    for index, part in enumerate(parts):
        if current.exists():
            require(current.is_dir(), f"Expected directory: {current}")
            collisions = [child.name for child in current.iterdir() if child.name.lower() == part.lower()]
            require(not collisions or collisions == [part], f"Checkout path case collision: {current / part}")
        current /= part
        require(not current.is_symlink(), f"Checkout symlink: {current}")
        if index < len(parts) - 1 and current.exists():
            require(not (current / ".git").exists() and not (current / ".git").is_symlink(),
                    f"Nested checkout: {current}")
    return current


def checkout_plan(repo, game_id, kind, files, replacements):
    prefix = f"games/{game_id}"
    root = checkout_path(repo, ("games", game_id))
    require(not (root / ".git").exists() and not (root / ".git").is_symlink(), f"Nested checkout: {root}")
    require(not git(repo, "status", "--porcelain=v1", "--untracked-files=all", "--", prefix),
            "Target game must have a clean checkout")
    require(root.is_dir() if kind != "new-game" else not root.exists(),
            "new-game requires an absent directory; other kinds require an existing game")
    tracked = set(git(repo, "ls-tree", "-rz", "--name-only", "HEAD", "--", prefix).split(b"\0"))
    require(kind == "new-game" or any(tracked), "Existing game must have tracked files at HEAD")

    prior = {}
    for item in files:
        target = item["destination"]
        path = checkout_path(repo, ["games", game_id, *target.split("/")])
        if path.exists():
            require(target in replacements and path.is_file()
                    and f"{prefix}/{target}".encode() in tracked, f"Unapproved overwrite: {target}")
            require(path.stat().st_size <= MAX_FILE, f"Existing file exceeds review size limit: {target}")
            prior[target] = path
    require(prior.keys() == replacements, "Approved replacement is missing from the checkout")
    require(sum(path.stat().st_size for path in prior.values()) <= MAX_TOTAL, "Existing files exceed review size limit")
    return prior


def stage_pack(zip_path, approval_path, repo, game_id, stage_parent):
    repo = repo.resolve(strict=True)
    require(Path(os.fsdecode(git(repo, "rev-parse", "--show-toplevel")).rstrip("\n")) == repo,
            "--repo must name the repository root")
    stage_parent = stage_parent.resolve(strict=True)
    require(not stage_parent.is_relative_to(repo), "Staging must be outside the checkout")
    revision = git(repo, "rev-parse", "HEAD").decode().strip()
    with open_input(approval_path) as control:
        raw_approval = control.read(MAX_CONTROL + 1)
    require(len(raw_approval) <= MAX_CONTROL, "External approval exceeds size limit")
    approval = read_json(raw_approval)

    with open_input(zip_path) as raw:
        info = os.fstat(raw.fileno())
        require(stat.S_ISREG(info.st_mode) and 0 < info.st_size <= MAX_ARCHIVE, "Invalid ZIP or archive size")
        archive_digest = hashlib.file_digest(raw, "sha256").hexdigest()
        raw.seek(0)
        with zipfile.ZipFile(raw) as archive:
            members = archive_members(archive)
            manifest = read_json(archive.read(members["PACK_MANIFEST.json"]))
            prompt = archive.read(members["START_CODEX.md"]).decode("utf-8")
            require(has_text(prompt), "START_CODEX.md is empty")
            allowed, replacements, public_paths = validate_manifest(
                manifest, approval, game_id, revision, archive_digest
            )
            files = payload_plan(manifest, members, allowed, public_paths)
            prior = checkout_plan(repo, game_id, manifest["kind"], files, replacements)

            stage = Path(tempfile.mkdtemp(prefix="studio-pack-", dir=stage_parent))
            try:
                (stage / "before").mkdir()
                (stage / "after").mkdir()
                for item in files:
                    target = item["destination"]
                    data = archive.read(members[item["path"]])
                    require(len(data) == item["bytes"] and hashlib.sha256(data).hexdigest() == item["sha256"],
                            f"Payload hash or size mismatch: {item['path']}")
                    output = stage / "after" / target
                    output.parent.mkdir(parents=True, exist_ok=True)
                    output.write_bytes(data)
                    if target in prior:
                        original = stage / "before" / target
                        original.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copyfile(prior[target], original)

                raw.seek(0)
                require(hashlib.file_digest(raw, "sha256").hexdigest() == archive_digest,
                        "Archive changed during validation")
                require(git(repo, "rev-parse", "HEAD").decode().strip() == revision,
                        "Checkout HEAD changed during validation")
                (stage / "START_CODEX.md").write_text(prompt, encoding="utf-8")
                receipt = {
                    "archiveSha256": archive_digest,
                    "checkoutCommit": revision,
                    "approvalEvidence": approval["evidence"],
                    "manifest": manifest,
                }
                (stage / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
            except BaseException:
                shutil.rmtree(stage)
                raise
    return stage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("zip", type=Path)
    parser.add_argument("--approval", required=True, type=Path)
    parser.add_argument("--repo", default=Path.cwd(), type=Path)
    parser.add_argument("--game-id", required=True)
    parser.add_argument("--stage-parent", required=True, type=Path)
    args = parser.parse_args()
    try:
        print(stage_pack(args.zip, args.approval, args.repo, args.game_id, args.stage_parent))
    except (ValueError, OSError, EOFError, RuntimeError, zlib.error,
            zipfile.BadZipFile, subprocess.CalledProcessError) as error:
        print(f"Pack rejected: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
