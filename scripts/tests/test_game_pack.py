"""Regression tests with a tiny, deterministic ZIP built from fixed fixture data."""

from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest import mock
import warnings
import zipfile

SCRIPT = Path(__file__).resolve().parents[1] / "validate-game-pack.py"
SPEC = importlib.util.spec_from_file_location("validate_game_pack", SCRIPT)
pack = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(pack)

FILE = "payload/design/brief.md"
TARGET = "design/brief.md"
DATA = b"# A local fixture\n"
FIXTURE = {
    "schemaVersion": 1,
    "packId": "fixture-v1",
    "kind": "new-game",
    "gameId": "fixture",
    "baseCommit": None,
    "approvedScope": {"destinations": [TARGET], "replace": []},
    "requestedStages": ["S00"],
    "deferredGates": [],
    "publicationApproval": {"status": "not-requested", "scope": [], "evidence": None},
    "files": [{
        "path": FILE, "sha256": hashlib.sha256(DATA).hexdigest(),
        "bytes": len(DATA), "destination": TARGET,
    }],
    "missingAssets": ["menu-music"],
    "firstTask": "Review S00 design",
}


class GamePackTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.stage_parent = self.root / "staging"
        self.stage_parent.mkdir()
        self.git("init", "-q")
        (self.repo / "README.md").write_text("Studio\n", encoding="utf-8")
        self.commit()
        self.manifest = deepcopy(FIXTURE)
        self.archive = self.root / "fixture.zip"
        self.approval = self.root / "approved.json"
        self.members = [(FILE, DATA, stat.S_IFREG | 0o644)]

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.repo), *args], text=True).strip()

    def commit(self):
        self.git("add", "--all")
        self.git("-c", "user.name=Studio Test", "-c", "user.email=fixture@example.test",
                 "commit", "-qm", "fixture baseline")
        return self.git("rev-parse", "HEAD")

    def existing(self):
        target = self.repo / "games/fixture" / TARGET
        target.parent.mkdir(parents=True)
        target.write_bytes(b"# Existing brief\n")
        revision = self.commit()
        self.manifest["kind"] = "feature"
        return target, revision

    def build(self, raw_manifest=None, **overrides):
        with warnings.catch_warnings(), zipfile.ZipFile(self.archive, "w") as archive:
            warnings.filterwarnings("ignore", message="Duplicate name:", category=UserWarning)
            for name, data, mode in [
                ("PACK_MANIFEST.json", raw_manifest or json.dumps(self.manifest), stat.S_IFREG | 0o644),
                ("START_CODEX.md", "# Review only\n", stat.S_IFREG | 0o644),
                *self.members,
            ]:
                info = zipfile.ZipInfo(name)
                info.create_system = 3
                info.external_attr = mode << 16
                archive.writestr(info, data)
        authorization = {key: self.manifest[key] for key in pack.CONTROL}
        authorization.update(archiveSha256=hashlib.sha256(self.archive.read_bytes()).hexdigest(),
                             evidence="Producer test fixture only")
        authorization.update(overrides)
        self.approval.write_text(json.dumps(authorization), encoding="utf-8")

    def stage(self, game_id="fixture"):
        return pack.stage_pack(self.archive, self.approval, self.repo, game_id, self.stage_parent)

    def reject(self, message, **overrides):
        self.build(**overrides)
        with self.assertRaisesRegex(pack.PackError, message):
            self.stage()
        self.assertEqual(list(self.stage_parent.iterdir()), [])

    def test_stages_reproducible_additive_zip_outside_checkout(self):
        self.build()
        before = self.archive.read_bytes()
        self.build()
        self.assertEqual(self.archive.read_bytes(), before)
        stage = self.stage()
        self.assertEqual((stage / "after" / TARGET).read_bytes(), DATA)
        self.assertEqual(list((stage / "before").iterdir()), [])
        receipt = json.loads((stage / "receipt.json").read_text(encoding="utf-8"))
        self.assertEqual(receipt["manifest"]["packId"], "fixture-v1")
        self.assertEqual(receipt["archiveSha256"], hashlib.sha256(before).hexdigest())
        self.assertEqual(self.git("status", "--porcelain"), "")

    def test_command_line_reports_review_directory_and_rejects_wrong_id(self):
        self.build()
        command = [sys.executable, str(SCRIPT), str(self.archive), "--repo", str(self.repo),
                   "--approval", str(self.approval), "--stage-parent", str(self.stage_parent), "--game-id"]
        accepted = subprocess.run([*command, "fixture"], capture_output=True, text=True, check=True)
        self.assertTrue((Path(accepted.stdout.strip()) / "receipt.json").is_file())
        refused = subprocess.run([*command, "other"], capture_output=True, text=True, check=False)
        self.assertEqual(refused.returncode, 1)
        self.assertIn("exact target game ID", refused.stderr)

    def test_explicit_delta_copies_tracked_before_bytes_without_overwriting(self):
        target, revision = self.existing()
        self.manifest["baseCommit"] = revision
        self.manifest["approvedScope"]["replace"] = [TARGET]
        self.build()
        stage = self.stage()
        self.assertEqual((stage / "before" / TARGET).read_bytes(), target.read_bytes())
        self.assertEqual((stage / "after" / TARGET).read_bytes(), DATA)

    def test_existing_game_can_stage_an_additive_file_without_a_base_pin(self):
        target, _ = self.existing()
        self.manifest["approvedScope"]["destinations"] = ["design/feature.md"]
        self.manifest["files"][0]["destination"] = "design/feature.md"
        self.build()
        stage = self.stage()
        self.assertEqual((stage / "after/design/feature.md").read_bytes(), DATA)
        self.assertTrue(target.is_file())

    def test_rejects_unapproved_overwrite_wrong_base_and_dirty_checkout(self):
        target, revision = self.existing()
        self.reject("Unapproved overwrite")
        self.manifest["approvedScope"]["replace"] = [TARGET]
        self.reject("pinned to baseCommit")
        self.manifest["baseCommit"] = "1" * 40
        self.reject("must match checkout HEAD")
        self.manifest["baseCommit"] = revision
        target.write_bytes(b"dirty")
        self.reject("clean checkout")

    def test_rejects_delta_pinned_to_a_stale_ancestor(self):
        target, revision = self.existing()
        self.manifest["baseCommit"] = revision
        self.manifest["approvedScope"]["replace"] = [TARGET]
        target.write_bytes(b"newer tracked content")
        current = self.commit()
        self.git("merge-base", "--is-ancestor", revision, current)
        self.reject("must match checkout HEAD")
        self.assertEqual(target.read_bytes(), b"newer tracked content")

    def test_rejects_archive_paths_duplicates_case_aliases_and_symlinks(self):
        cases = [
            ("payload/../escape", stat.S_IFREG, "Unsafe path"),
            ("/absolute", stat.S_IFREG, "Unsafe path"),
            ("C:/absolute", stat.S_IFREG, "Unsafe path"),
            ("payload\\escape", stat.S_IFREG, "Unsafe path"),
            (FILE, stat.S_IFREG, "Duplicate"),
            ("payload/Design/other.md", stat.S_IFREG, "Case collision"),
            ("payload/link", stat.S_IFLNK, "regular file"),
            ("payload/design", stat.S_IFREG, "file/directory conflict"),
            ("root.md", stat.S_IFREG, "Unexpected ZIP member"),
            ("payload/extra.txt", stat.S_IFREG, "does not match ZIP payload"),
        ]
        for name, mode, error in cases:
            with self.subTest(name=name):
                self.members = [(FILE, DATA, stat.S_IFREG), (name, b"x", mode)]
                self.reject(error)

    def test_rejects_scope_escape_and_existing_checkout_symlinks(self):
        for target in ("../somewhere", "shared/example", "src/.github/workflow.yml", "src/pnpm-lock.yaml"):
            with self.subTest(target=target):
                self.manifest["approvedScope"]["destinations"] = [target]
                self.manifest["files"][0]["destination"] = target
                self.reject("Unsafe path|Unexpected game destination")
        self.manifest = deepcopy(FIXTURE)
        (self.repo / "games").symlink_to(self.root, target_is_directory=True)
        self.reject("Checkout symlink")

    def test_rejects_manifest_hash_size_and_approval_mismatches(self):
        self.manifest["files"][0]["sha256"] = "0" * 64
        self.reject("Payload hash or size mismatch")
        self.manifest["files"][0]["bytes"] = 0
        self.reject("Invalid size or digest")
        self.manifest = deepcopy(FIXTURE)
        self.reject("differ from external approval", gameId="another")
        self.reject("Archive digest differs", archiveSha256="0" * 64)
        self.build(raw_manifest=json.dumps(self.manifest).replace(
            '"schemaVersion": 1', '"schemaVersion": 1, "schemaVersion": 1'))
        with self.assertRaisesRegex(pack.PackError, "Duplicate JSON key"):
            self.stage()
        self.build()
        with self.assertRaisesRegex(pack.PackError, "exact target game ID"):
            self.stage("another")

    def test_rejects_counts_and_sizes_before_staging(self):
        self.members.extend((f"payload/src/item{i}.txt", b"", stat.S_IFREG)
                            for i in range(pack.MAX_ENTRIES))
        self.reject("entry count")
        self.members = [(FILE, DATA, stat.S_IFREG)]
        self.build()
        with mock.patch.object(pack, "MAX_FILE", len(DATA) - 1):
            with self.assertRaisesRegex(pack.PackError, "member exceeds limit"):
                self.stage()
        with mock.patch.object(pack, "MAX_TOTAL", len(DATA)):
            with self.assertRaisesRegex(pack.PackError, "total size exceeds limit"):
                self.stage()

    def test_asset_requires_clearance_and_public_repo_approval(self):
        source, target = "payload/assets/source/tree.png", "assets/source/tree.png"
        self.members = [(source, DATA, stat.S_IFREG)]
        self.manifest["approvedScope"]["destinations"] = [target]
        item = self.manifest["files"][0]
        item.update(path=source, destination=target, rights={
            "status": "pending", "source": "Original", "license": "CC0", "evidence": "Fixture rights",
        })
        self.reject("rights or public-repo approval pending")
        item["rights"]["status"] = "cleared"
        self.reject("rights or public-repo approval pending")
        self.manifest["publicationApproval"] = {"status": "approved", "scope": [target], "evidence": "Fixture"}
        self.build()
        self.assertTrue((self.stage() / "after" / target).is_file())
        for location in ("assets/runtime/tree.png", "public/tree.png"):
            with self.subTest(location=location):
                item["destination"] = location
                self.manifest["approvedScope"]["destinations"] = [location]
                self.manifest["publicationApproval"]["scope"] = [location]
                self.build()
                with self.assertRaisesRegex(pack.PackError, "Asset area changed"):
                    self.stage()

    def test_requires_explicit_g2_deferral_and_disallows_g0_g4_deferral(self):
        self.manifest["requestedStages"] = ["S03", "S04"]
        self.manifest["deferredGates"] = ["S03"]
        self.reject("explicit G2")
        for gate in ("G0", "G4"):
            self.manifest["deferredGates"] = [gate]
            self.reject("Invalid deferred approval")
        self.manifest["deferredGates"] = ["S03", "G2"]
        self.build()
        self.assertTrue(self.stage().is_dir())
