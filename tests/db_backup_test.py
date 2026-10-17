"""Tests for tools/db_backup.py. Stdlib only: fake pg_dump/age scripts and a fake S3 client.

All values are synthetic placeholders. Nothing here connects to a database or a network.
"""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import textwrap
import unittest
from pathlib import Path
from unittest import mock

REPO = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("db_backup", REPO / "tools" / "db_backup.py")
db = importlib.util.module_from_spec(spec)
sys.modules["db_backup"] = db
spec.loader.exec_module(db)

RECIPIENT = "age1" + "q" * 58
PG_PASSWORD, S3_ID, S3_SECRET = "pw-canary-1", "id-canary-2", "secret-canary-3"
SENTRY = "https://o1.ingest.de.sentry.io/api/2/cron/db-backup/" + "a" * 32 + "/"
PLAIN = "PLAINTEXT-CANARY-" * 50
STDERR_CANARY = "STDERR-CANARY-ROW-42"


def base_env(root, **over):
    env = {
        "BACKUP_ENABLED": "true", "BACKUP_PG_HOST": "db.example.invalid", "BACKUP_PG_PORT": "5432",
        "BACKUP_PG_DATABASE": "postgres", "BACKUP_PG_USER": "backup_user", "BACKUP_PG_MAJOR": "17",
        "BACKUP_PG_PASSWORD": PG_PASSWORD, "BACKUP_AGE_RECIPIENTS": RECIPIENT,
        "BACKUP_S3_ENDPOINT": "https://storage.example.invalid", "BACKUP_S3_BUCKET": "example-bucket",
        "BACKUP_S3_ACCESS_KEY_ID": S3_ID, "BACKUP_S3_SECRET_ACCESS_KEY": S3_SECRET,
        "BACKUP_TMP_ROOT": str(root),
    }
    env.update(over)
    return {k: v for k, v in env.items() if v is not None}


FAKE_PG = """#!{py}
import json, os, sys
here = os.path.dirname(os.path.abspath(__file__))
mode = open(os.path.join(here, "pg_mode")).read().strip()
if "--version" in sys.argv:
    print("pg_dump (PostgreSQL) 17.2"); sys.exit(0)
json.dump({{"env": dict(os.environ), "argv": sys.argv}}, open(os.path.join(here, "pg_cap.json"), "w"))
open(os.path.join(here, "pg_pid"), "w").write(str(os.getpid()))
sys.stderr.write("{canary}\\n")
if mode == "fail":
    sys.stdout.write("partial"); sys.stdout.flush(); sys.exit(1)
if mode == "hang":
    import time; time.sleep(60)
sys.stdout.write({plain!r}); sys.exit(0)
"""
FAKE_AGE = """#!{py}
import json, os, sys, base64
here = os.path.dirname(os.path.abspath(__file__))
mode = open(os.path.join(here, "age_mode")).read().strip()
json.dump({{"env": dict(os.environ), "argv": sys.argv}}, open(os.path.join(here, "age_cap.json"), "w"))
open(os.path.join(here, "age_pid"), "w").write(str(os.getpid()))
data = sys.stdin.buffer.read()
if mode == "fail":
    sys.stderr.write("{canary}\\n"); sys.exit(1)
if mode == "hang":
    import time; time.sleep(60)
if mode == "empty":
    sys.exit(0)
if mode == "big":
    data = data * 100
sys.stdout.buffer.write(b"FAKE-AGE\\n" + base64.b64encode(data))
"""


class FakeBody:
    def __init__(self, data):
        self.data = data

    def iter_chunks(self, n):
        for i in range(0, len(self.data), n):
            yield self.data[i:i + n]

    def close(self):
        pass


class FakeS3:
    def __init__(self, put_error=False, tamper=None):
        self.objects, self.puts, self.calls, self.put_error, self.tamper = {}, [], [], put_error, tamper

    def put_object(self, **kw):
        self.calls.append("put")
        if self.put_error:
            raise RuntimeError("boom " + S3_SECRET)
        kw["body_bytes"] = kw["Body"].read()
        self.objects[kw["Key"]] = kw["body_bytes"]
        self.puts.append(kw)

    def get_object(self, Bucket, Key):
        self.calls.append("get")
        data = self.objects[Key]
        return {"Body": FakeBody(self.tamper(data) if self.tamper else data)}

    def delete_object(self, **kw):
        self.calls.append("delete")


class FakeOpener:
    def __init__(self, fail_on=()):
        self.urls, self.fail_on = [], fail_on

    def open(self, url, timeout):
        self.urls.append(url)
        if any(f in url for f in self.fail_on):
            raise OSError(SENTRY)
        return contextlib.nullcontext(mock.Mock(status=200))


@contextlib.contextmanager
def capture_fds():
    """Capture fd 1 and 2, so a child writing to the real stderr would be seen too."""
    out = []
    saved = [os.dup(1), os.dup(2)]
    with tempfile.TemporaryFile() as f:
        sys.stdout.flush(); sys.stderr.flush()
        os.dup2(f.fileno(), 1); os.dup2(f.fileno(), 2)
        try:
            yield out
        finally:
            sys.stdout.flush(); sys.stderr.flush()
            os.dup2(saved[0], 1); os.dup2(saved[1], 2)
            for fd in saved:
                os.close(fd)
            f.seek(0)
            out.append(f.read().decode())


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="dbb-test-")).resolve()
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.bin, self.root = self.tmp / "bin", self.tmp / "root"
        self.bin.mkdir(); self.root.mkdir(mode=0o700)
        for name, body in (("pg_dump", FAKE_PG), ("age", FAKE_AGE)):
            p = self.bin / name
            p.write_text(body.format(py=sys.executable, canary=STDERR_CANARY, plain=PLAIN))
            p.chmod(0o755)
        self.modes(pg="ok", age="ok")
        patcher = mock.patch.dict(os.environ, {"PATH": f"{self.bin}{os.pathsep}/usr/bin:/bin"})
        patcher.start(); self.addCleanup(patcher.stop)
        for attr, val in (("POLL_S", 0.01),):
            p = mock.patch.object(db, attr, val); p.start(); self.addCleanup(p.stop)
        self.env = base_env(self.root)

    def modes(self, pg=None, age=None):
        if pg: (self.bin / "pg_mode").write_text(pg)
        if age: (self.bin / "age_mode").write_text(age)

    def cap(self, name):
        return json.loads((self.bin / f"{name}_cap.json").read_text())

    def run_main(self, argv, env=None, **kw):
        with capture_fds() as out:
            with mock.patch.object(db, "boto_client", kw.pop("client", lambda cfg: FakeS3())):
                code = db.main(argv, self.env if env is None else env)
        return code, out[0]

    def assertClean(self, text):
        for canary in (PG_PASSWORD, S3_ID, S3_SECRET, STDERR_CANARY, "PLAINTEXT", "FAKE-AGE", "daily/", SENTRY):
            self.assertNotIn(canary, text)

    def assertNoLeftovers(self):
        self.assertEqual(list(self.root.iterdir()), [])


class ConfigTests(Base):
    def test_valid_config_hides_secrets_and_is_frozen(self):
        cfg = db.parse_config(self.env)
        for secret in (PG_PASSWORD, S3_ID, S3_SECRET):
            self.assertNotIn(secret, repr(cfg))
        with self.assertRaises(Exception):
            cfg.pg_host = "x"

    def test_parse_is_pure(self):
        with mock.patch("subprocess.Popen", side_effect=AssertionError), \
                mock.patch("os.stat", side_effect=AssertionError), \
                mock.patch.object(Path, "resolve", side_effect=AssertionError):
            db.parse_config(self.env)

    def test_bad_settings_fail_with_the_setting_name_only(self):
        bad = [
            ("BACKUP_UNKNOWN_THING", "x", "BACKUP_UNKNOWN"),
            ("BACKUP_S3_ENDPOINT", "http://storage.example.invalid", "BACKUP_S3_ENDPOINT"),
            ("BACKUP_S3_ENDPOINT", "https://storage.example.invalid/path", "BACKUP_S3_ENDPOINT"),
            ("BACKUP_S3_ENDPOINT", "https://user:pw@storage.example.invalid", "BACKUP_S3_ENDPOINT"),
            ("BACKUP_S3_ENDPOINT", "https://storage.example.invalid:99999", "BACKUP_S3_ENDPOINT"),
            ("BACKUP_S3_ENDPOINT", "ftp://storage.example.invalid", "BACKUP_S3_ENDPOINT"),
            ("BACKUP_PG_HOST", "/var/run/postgresql", "BACKUP_PG_HOST"),
            ("BACKUP_PG_HOST", "a b", "BACKUP_PG_HOST"),
            ("BACKUP_PG_PORT", "0", "BACKUP_PG_PORT"),
            ("BACKUP_PG_PORT", "70000", "BACKUP_PG_PORT"),
            ("BACKUP_PG_USER", "--help", "BACKUP_PG_USER"),
            ("BACKUP_PG_DATABASE", "-d", "BACKUP_PG_DATABASE"),
            ("BACKUP_PG_MAJOR", "v17", "BACKUP_PG_MAJOR"),
            ("BACKUP_AGE_RECIPIENTS", "age1short", "BACKUP_AGE_RECIPIENTS"),
            ("BACKUP_AGE_RECIPIENTS", f"{RECIPIENT},{RECIPIENT}", "BACKUP_AGE_RECIPIENTS"),
            ("BACKUP_TMP_ROOT", "relative/dir", "BACKUP_TMP_ROOT"),
            ("BACKUP_S3_BUCKET", "Bad_Bucket", "BACKUP_S3_BUCKET"),
            ("BACKUP_PG_PASSWORD", "", "BACKUP_PG_PASSWORD"),
            ("BACKUP_PG_PASSWORD", None, "BACKUP_PG_PASSWORD"),
            ("BACKUP_PG_CA_FILE", "ca.pem", "BACKUP_PG_CA_FILE"),
            ("BACKUP_ENABLED", "yes", "BACKUP_ENABLED"),
            ("BACKUP_SENTRY_ENABLED", "1", "BACKUP_SENTRY_ENABLED"),
            ("BACKUP_SENTRY_ENABLED", "true", "BACKUP_SENTRY_CHECKIN_URL"),
            ("BACKUP_SENTRY_CHECKIN_URL", SENTRY.replace("https", "http"), "BACKUP_SENTRY_CHECKIN_URL"),
            ("BACKUP_SENTRY_CHECKIN_URL", SENTRY.replace("sentry.io", "evil.example"), "BACKUP_SENTRY_CHECKIN_URL"),
            ("BACKUP_SENTRY_CHECKIN_URL", SENTRY + "?x=1", "BACKUP_SENTRY_CHECKIN_URL"),
        ]
        for name, value, expected in bad:
            with self.subTest(name=name, value=value):
                env = base_env(self.root, **{name: value})
                with self.assertRaises(db.BackupError) as cm:
                    db.parse_config(env) if name != "BACKUP_ENABLED" else db.enabled(env)
                self.assertEqual((cm.exception.code, cm.exception.name), (db.Code.CONFIG, expected))

    def test_sentry_url_accepted_only_exactly(self):
        cfg = db.parse_config(base_env(self.root, BACKUP_SENTRY_ENABLED="true", BACKUP_SENTRY_CHECKIN_URL=SENTRY))
        self.assertEqual(cfg.sentry_url, SENTRY)
        self.assertIsNone(db.parse_config(self.env).sentry_url)

    def test_long_sentry_identifiers_are_accepted_without_exposing_the_url(self):
        url = SENTRY.replace("o1.", "o4500000000000000.").replace("/api/2/", "/api/4500000000000001/")
        cfg = db.parse_config(base_env(self.root, BACKUP_SENTRY_ENABLED="true", BACKUP_SENTRY_CHECKIN_URL=url))
        self.assertEqual(cfg.sentry_url, url)
        self.assertNotIn(url, repr(cfg))


class GateTests(Base):
    def production_env(self):
        cfg = db.parse_config(self.env)
        policy = {name: getattr(cfg, name) for name in (
            "pg_host", "pg_port", "pg_database", "pg_user", "pg_major", "s3_endpoint",
            "s3_bucket", "s3_region",
        )}
        policy.update(purpose="production", age_recipients=list(cfg.age_recipients))
        return {**self.env, "BACKUP_PRODUCTION_POLICY": json.dumps(policy)}

    def test_production_rejects_missing_or_mismatched_policy_before_side_effects(self):
        good = self.production_env()
        changes = {
            "BACKUP_PG_HOST": "other.example.invalid", "BACKUP_PG_PORT": "5433",
            "BACKUP_PG_DATABASE": "other", "BACKUP_PG_USER": "other_user",
            "BACKUP_PG_MAJOR": "18", "BACKUP_S3_ENDPOINT": "https://other.example.invalid",
            "BACKUP_S3_BUCKET": "other-bucket", "BACKUP_S3_REGION": "other",
            "BACKUP_AGE_RECIPIENTS": "age1" + "p" * 58,
            "BACKUP_PRODUCTION_POLICY": "",
        }
        for name, value in changes.items():
            for cmd in ("run-production", "preflight-production"):
                with self.subTest(name=name, cmd=cmd), \
                        mock.patch.object(db, "check_host", side_effect=AssertionError), \
                        mock.patch.object(db, "run_backup", side_effect=AssertionError):
                    code, out = self.run_main([cmd], {**good, name: value})
                    self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL CONFIG BACKUP_PRODUCTION_POLICY"))
                    self.assertClean(out)
        self.assertNoLeftovers()

    def test_production_policy_rejects_bad_shape_and_duplicate_keys(self):
        good = self.production_env()
        policy = json.loads(good["BACKUP_PRODUCTION_POLICY"])
        bad = ["[]", "null", "{", "x" * 8193,
               json.dumps({**policy, "purpose": "test"}),
               json.dumps({**policy, "pg_port": "5432"}),
               json.dumps({**policy, "unexpected": "value"}),
               '{"purpose":"test",' + good["BACKUP_PRODUCTION_POLICY"][1:]]
        for value in bad:
            with self.subTest(value=value[:20]):
                code, out = self.run_main(["run-production"], {**good, "BACKUP_PRODUCTION_POLICY": value})
                self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL CONFIG BACKUP_PRODUCTION_POLICY"))

    def test_production_policy_matching_runs_encrypted_backup(self):
        client = FakeS3()
        code, out = self.run_main(["run-production"], self.production_env(), client=lambda cfg: client)
        self.assertEqual((code, out.strip()), (0, "BACKUP_OK"))
        self.assertEqual(client.calls, ["put", "get"])
        self.assertNotIn(PLAIN.encode(), client.puts[0]["body_bytes"])
        self.assertClean(out)
        self.assertNoLeftovers()

    def test_production_disabled_does_not_read_policy_or_start_tools(self):
        with mock.patch.object(db, "parse_config", side_effect=AssertionError), \
                mock.patch.object(db, "run_backup", side_effect=AssertionError):
            code, out = self.run_main(["run-production"], {})
        self.assertEqual((code, out.strip()), (0, "BACKUP_DISABLED"))

    def test_production_staged_preflight_never_dumps(self):
        env = {**self.production_env(), "BACKUP_ENABLED": "false"}
        code, out = self.run_main(["preflight-production", "--staged"], env)
        self.assertEqual((code, out.strip()), (0, "BACKUP_PREFLIGHT_OK"))
        self.assertFalse((self.bin / "pg_cap.json").exists())

    def test_disabled_does_nothing_even_with_junk_config(self):
        for env in ({}, {"BACKUP_ENABLED": "false"}, {"BACKUP_ENABLED": "", "BACKUP_S3_ENDPOINT": "http://x"}):
            for cmd in ("run", "preflight"):
                with self.subTest(env=env, cmd=cmd), \
                        mock.patch("subprocess.Popen", side_effect=AssertionError), \
                        mock.patch("subprocess.run", side_effect=AssertionError), \
                        mock.patch("shutil.which", side_effect=AssertionError), \
                        mock.patch("urllib.request.OpenerDirector.open", side_effect=AssertionError):
                    code, out = self.run_main([cmd], env)
                    self.assertEqual((code, out.strip()), (0, "BACKUP_DISABLED"))
        self.assertNoLeftovers()

    def test_invalid_config_has_no_side_effects(self):
        env = base_env(self.root, BACKUP_S3_ENDPOINT="http://storage.example.invalid")
        with mock.patch("subprocess.Popen", side_effect=AssertionError):
            code, out = self.run_main(["run"], env)
        self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL CONFIG BACKUP_S3_ENDPOINT"))
        self.assertNoLeftovers()
        self.assertFalse((self.bin / "pg_cap.json").exists())

    def test_staged_preflight_validates_while_disabled(self):
        code, out = self.run_main(["preflight", "--staged"], {**self.env, "BACKUP_ENABLED": "false"})
        self.assertEqual((code, out.strip()), (0, "BACKUP_PREFLIGHT_OK"))
        code, out = self.run_main(["preflight", "--staged"], {**self.env, "BACKUP_ENABLED": "", "BACKUP_PG_PORT": "x"})
        self.assertEqual(code, 1)
        self.assertFalse((self.bin / "pg_cap.json").exists())  # preflight never runs a dump

    def test_usage(self):
        for argv in ([], ["bogus"], ["run", "--staged"], ["preflight", "--x"]):
            with self.subTest(argv=argv), contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(db.main(argv, self.env), 2)

    def test_host_checks(self):
        repo_inside = REPO / "tests"
        for root, expected in ((repo_inside, "BACKUP_TMP_ROOT"), (REPO.parent, "BACKUP_TMP_ROOT"),
                               (self.tmp / "missing", "BACKUP_TMP_ROOT")):
            with self.subTest(root=str(root)):
                with self.assertRaises(db.BackupError) as cm:
                    db.check_host(db.parse_config(base_env(root)))
                self.assertEqual(cm.exception.name, expected)
        with self.assertRaises(db.BackupError) as cm:
            db.check_host(db.parse_config(base_env(self.root, BACKUP_PG_CA_FILE=str(self.tmp / "none.pem"))))
        self.assertEqual(cm.exception.name, "BACKUP_PG_CA_FILE")
        with self.assertRaises(db.BackupError) as cm:
            db.check_host(db.parse_config(base_env(self.root, BACKUP_PG_MAJOR="18")))
        self.assertEqual(cm.exception.code, db.Code.TOOLS)
        with mock.patch.dict(os.environ, {"PATH": "/nonexistent"}), self.assertRaises(db.BackupError) as cm:
            db.check_host(db.parse_config(self.env))
        self.assertEqual(cm.exception.code, db.Code.TOOLS)


class BackupTests(Base):
    def test_success_uploads_ciphertext_once(self):
        s3 = FakeS3()
        code, out = self.run_main(["run"], client=lambda cfg: s3)
        self.assertEqual((code, out.strip()), (0, "BACKUP_OK"))
        self.assertClean(out)
        (put,) = s3.puts
        self.assertRegex(put["Key"], r"^daily/\d{8}T\d{6}Z-[0-9a-f]{32}\.dump\.age$")
        self.assertEqual(put["IfNoneMatch"], "*")
        self.assertEqual(put["ContentLength"], len(put["body_bytes"]))
        self.assertTrue(put["body_bytes"].startswith(b"FAKE-AGE"))
        self.assertNotIn(b"PLAINTEXT", put["body_bytes"])  # only the fake cipher's base64 reaches the bucket
        self.assertEqual(s3.calls, ["put", "get"])
        self.assertNoLeftovers()

    def test_pg_dump_command_line(self):
        self.run_main(["run"])
        argv = self.cap("pg")["argv"]
        for flag in ("--format=custom", "--strict-names", "--no-password", "--schema=auth", "--schema=public",
                     "--schema=leaderboard_private", "--schema=supabase_migrations", "--host=db.example.invalid"):
            self.assertIn(flag, argv)
        self.assertNotIn("--no-acl", argv)
        self.assertFalse([a for a in argv if PG_PASSWORD in a or "postgres://" in a or "postgresql://" in a])
        self.assertEqual(self.cap("age")["argv"][1:], ["-r", RECIPIENT])

    def test_children_see_only_their_own_secrets(self):
        with mock.patch.dict(os.environ, {"AWS_SECRET_ACCESS_KEY": "ambient-canary", "HTTPS_PROXY": "http://p.invalid"}):
            self.run_main(["run"])
        pg, age = self.cap("pg")["env"], self.cap("age")["env"]
        self.assertEqual(pg["PGPASSWORD"], PG_PASSWORD)
        self.assertEqual(pg["PGSSLMODE"], "verify-full")
        self.assertEqual(pg["PGSSLROOTCERT"], "system")
        blob = json.dumps([pg, age])
        for secret in (S3_ID, S3_SECRET, "ambient-canary", "p.invalid", "BACKUP_"):
            self.assertNotIn(secret, blob)
        self.assertNotIn(PG_PASSWORD, json.dumps(age))
        self.assertEqual(set(age) - {"LC_CTYPE", "__CF_USER_TEXT_ENCODING"}, {"HOME"})  # the last two are the interpreter's own

    def test_failures_never_upload_and_clean_up(self):
        cases = [("fail", "ok", "DUMP"), ("ok", "fail", "ENCRYPT"), ("ok", "empty", "EMPTY")]
        for pg, age, expected in cases:
            with self.subTest(pg=pg, age=age):
                self.modes(pg=pg, age=age)
                s3 = FakeS3()
                code, out = self.run_main(["run"], client=lambda cfg: s3)
                self.assertEqual((code, out.strip()), (1, f"BACKUP_FAIL {expected}"))
                self.assertEqual(s3.calls, [])
                self.assertClean(out)
                self.assertNoLeftovers()

    def test_too_large_fails_before_upload(self):
        self.modes(age="big")
        s3 = FakeS3()
        with mock.patch.object(db, "MAX_BYTES", 100):
            code, out = self.run_main(["run"], client=lambda cfg: s3)
        self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL TOO_LARGE"))
        self.assertEqual(s3.calls, [])
        self.assertNoLeftovers()

    def test_timeout_kills_both_children(self):
        for pg, age in (("hang", "ok"), ("ok", "hang")):
            with self.subTest(pg=pg, age=age):
                self.modes(pg=pg, age=age)
                s3 = FakeS3()
                with mock.patch.object(db, "TIMEOUT_S", 1):
                    code, out = self.run_main(["run"], client=lambda cfg: s3)
                self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL TIMEOUT"))
                self.assertEqual(s3.calls, [])
                for name in ("pg", "age"):
                    pid = int((self.bin / f"{name}_pid").read_text())
                    with self.assertRaises(ProcessLookupError):
                        os.kill(pid, 0)
                self.assertNoLeftovers()

    def test_sigterm_cleans_up(self):
        self.modes(age="hang")
        script = f"import sys; sys.path.insert(0, {str(REPO / 'tools')!r}); import db_backup as d; sys.exit(d.main(['run']))"
        p = subprocess.Popen([sys.executable, "-c", script], env={**os.environ, **self.env},
                             stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        for _ in range(200):
            if (self.bin / "age_pid").exists() and (self.bin / "age_pid").read_text():
                break
            import time; time.sleep(0.05)
        p.terminate()
        out, _ = p.communicate(timeout=20)
        self.assertEqual(out.decode().strip(), "BACKUP_FAIL INTERRUPTED")
        self.assertNoLeftovers()
        with self.assertRaises(ProcessLookupError):
            os.kill(int((self.bin / "age_pid").read_text()), 0)

    def test_temp_dir_and_file_are_owner_only(self):
        seen = {}
        real = db.upload_and_verify

        def spy(cfg, client, path, key):
            seen["file"] = stat.S_IMODE(path.stat().st_mode)
            seen["dir"] = stat.S_IMODE(path.parent.stat().st_mode)
            seen["parent"] = path.parent.parent
            return real(cfg, client, path, key)

        with mock.patch.object(db, "upload_and_verify", spy):
            self.run_main(["run"])
        self.assertEqual((seen["file"], seen["dir"]), (0o600, 0o700))
        self.assertEqual(seen["parent"].resolve(), self.root.resolve())

    def test_upload_failure(self):
        s3 = FakeS3(put_error=True)
        code, out = self.run_main(["run"], client=lambda cfg: s3)
        self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL UPLOAD"))
        self.assertEqual(s3.calls, ["put"])  # no read, no delete
        self.assertClean(out)
        self.assertNoLeftovers()

    def test_readback_mismatch_and_truncation_fail(self):
        for name, tamper in (("flip", lambda d: d[:-1] + bytes([d[-1] ^ 1])), ("short", lambda d: d[:-5]),
                             ("long", lambda d: d + b"x")):
            with self.subTest(name):
                s3 = FakeS3(tamper=tamper)
                code, out = self.run_main(["run"], client=lambda cfg: s3)
                self.assertEqual((code, out.strip()), (1, "BACKUP_FAIL VERIFY"))
                self.assertNotIn("delete", s3.calls)

    def test_client_factory_error_is_not_a_success(self):
        def broken(cfg):
            raise ImportError("boto3 " + S3_SECRET)

        code, out = self.run_main(["run"], client=broken)
        self.assertEqual(code, 1)
        self.assertClean(out)


class MonitorTests(Base):
    def go(self, opener, client=None, env=None):
        cfg = db.parse_config(env or base_env(self.root, BACKUP_SENTRY_ENABLED="true", BACKUP_SENTRY_CHECKIN_URL=SENTRY))
        mon = db.Monitor(cfg.sentry_url, opener)
        try:
            db.run_backup(cfg, client or (lambda c: FakeS3()), mon)
            return "ok", mon
        except (db.BackupError, db.MonitorFailed) as e:
            return e, mon

    def statuses(self, op):
        return [re.search(r"status=(\w+)&check_in_id=([0-9a-f-]{36})$", u).groups() for u in op.urls]

    def test_ok_sequence_shares_one_check_in_id(self):
        op = FakeOpener()
        self.assertEqual(self.go(op)[0], "ok")
        s = self.statuses(op)
        self.assertEqual([x[0] for x in s], ["in_progress", "ok"])
        self.assertEqual(len({x[1] for x in s}), 1)
        self.assertTrue(all(u.startswith(SENTRY + "?") for u in op.urls))

    def test_backup_failure_reports_error_and_keeps_its_code(self):
        self.modes(pg="fail")
        op = FakeOpener(fail_on=("status=error",))  # even a failing error check-in must not mask DUMP
        err, _ = self.go(op)
        self.assertEqual(err.code, db.Code.DUMP)
        self.assertEqual([x[0] for x in self.statuses(op)], ["in_progress", "error"])

    def test_monitor_failure_after_verified_backup_is_distinct(self):
        s3 = FakeS3()
        err, _ = self.go(FakeOpener(fail_on=("status=ok",)), lambda c: s3)
        self.assertIsInstance(err, db.MonitorFailed)
        self.assertEqual(s3.calls, ["put", "get"])
        err, _ = self.go(FakeOpener(fail_on=("in_progress",)))
        self.assertIsInstance(err, db.MonitorFailed)

    def test_main_maps_monitor_failure_to_exit_3(self):
        env = base_env(self.root, BACKUP_SENTRY_ENABLED="true", BACKUP_SENTRY_CHECKIN_URL=SENTRY)
        with mock.patch.object(db, "sentry_opener", lambda: FakeOpener(fail_on=("status=ok",))):
            code, out = self.run_main(["run"], env)
        self.assertEqual((code, out.strip()), (3, "BACKUP_OK_MONITOR_FAIL"))
        self.assertClean(out)

    def test_monitor_off_makes_no_request(self):
        with mock.patch("urllib.request.OpenerDirector.open", side_effect=AssertionError):
            code, _ = self.run_main(["run"])
        self.assertEqual(code, 0)

    def test_real_opener_has_no_proxy_or_redirects(self):
        op = db.sentry_opener()
        proxy = [h for h in op.handlers if h.__class__.__name__ == "ProxyHandler"]
        self.assertTrue(all(h.proxies == {} for h in proxy))
        redirect = [h for h in op.handlers if isinstance(h, db.urllib.request.HTTPRedirectHandler)]
        self.assertEqual([type(h).__name__ for h in redirect], ["_NoRedirect"])
        self.assertIsNone(redirect[0].redirect_request(None, None, 302, "", {}, "https://elsewhere.invalid"))
        self.assertFalse([h for h in op.handlers if "Auth" in type(h).__name__])


class RepoTests(unittest.TestCase):
    def test_gitignore_blocks_backup_artifacts(self):
        for name in ("x.dump.age", "backup.age", "nested/dir/a.dump", "a.pgdump", "db-backup-abc123/backup.age"):
            with self.subTest(name):
                r = subprocess.run(["git", "check-ignore", "-q", "--no-index", name], cwd=REPO)
                self.assertEqual(r.returncode, 0)
        for name in ("tools/db_backup.py", "docs/db-backup.md", "tools/db-backup-requirements.txt"):
            with self.subTest(name):
                r = subprocess.run(["git", "check-ignore", "-q", "--no-index", name], cwd=REPO)
                self.assertEqual(r.returncode, 1)

    def test_requirements_are_hash_locked(self):
        lines = [l for l in (REPO / "tools" / "db-backup-requirements.txt").read_text().splitlines()
                 if l and not l.startswith(("#", " "))]
        self.assertTrue(lines)
        for l in lines:
            self.assertRegex(l, r"^[A-Za-z0-9_.-]+==[0-9][^ ]* \\$")
        text = (REPO / "tools" / "db-backup-requirements.txt").read_text()
        self.assertEqual(text.count("--hash=sha256:") >= len(lines), True)

    def test_no_production_identifiers_in_new_files(self):
        production = ["oajlkitufibpfvh" + "gtqwr", r"[a-z0-9]{20}\.supabase\.co", r"pooler\.supabase\.com",
                      r"[0-9a-f]{32}\.r2\.cloudflarestorage\.com", r"sb_(publishable|secret)_"]
        for rel in ("tools/db_backup.py", "docs/db-backup.md", ".github/workflows/db-backup.yml",
                    "tests/db_backup_test.py"):
            text = (REPO / rel).read_text()
            for rx in production:
                self.assertIsNone(re.search(rx, text), f"{rel}: {rx}")


class WorkflowTests(unittest.TestCase):
    """No YAML parser in the stdlib: the workflow is written in a strict, flat style these checks rely on."""

    @classmethod
    def setUpClass(cls):
        cls.text = (REPO / ".github" / "workflows" / "db-backup.yml").read_text()

    def test_trigger_is_manual_dispatch_only(self):
        on = re.search(r"^on:\n((?:  .*\n)+)", self.text, re.M).group(1)
        self.assertEqual(on.strip(), "workflow_dispatch:")
        for bad in ("pull_request", "push:", "workflow_run", "inputs:", "repository_dispatch"):
            self.assertNotIn(bad, self.text)
        self.assertNotIn("schedule:", self.text)  # the gate allows the event; the trigger is added at activation

    def test_gate_and_environment(self):
        job_if = re.search(r"^    if: (.*)$", self.text, re.M).group(1)
        for part in ("vars.BACKUP_ENABLED == 'true'",
                     "(github.event_name == 'workflow_dispatch' || github.event_name == 'schedule')",
                     "github.ref == format('refs/heads/{0}', github.event.repository.default_branch)",
                     "github.event.repository.fork == false"):
            self.assertIn(part, job_if)
        self.assertRegex(self.text, r"(?m)^    environment: db-backup-production$")
        self.assertIn("db_backup.py run-production", self.text)
        self.assertIn("BACKUP_PRODUCTION_POLICY: ${{ vars.BACKUP_PRODUCTION_POLICY }}", self.text)
        self.assertRegex(self.text, r"(?m)^permissions:\n  contents: read\n")
        self.assertEqual(self.text.count("permissions:"), 1)

    def test_no_untrusted_context_artifacts_or_caches(self):
        for bad in ("github.event.inputs", "inputs.", "github.head_ref", "github.event.pull_request",
                    "upload-artifact", "actions/cache", "cache:", "pull_request_target", "continue-on-error"):
            self.assertNotIn(bad, self.text)
        allowed = re.compile(r"^(vars\.BACKUP_[A-Z0-9_]+|secrets\.BACKUP_[A-Z0-9_]+|runner\.temp|github\.event_name == 'workflow_dispatch'"
                             r"|github\.ref == format\('refs/heads/\{0\}', github\.event\.repository\.default_branch\)"
                             r"|github\.event\.repository\.fork == false|vars\.BACKUP_ENABLED == 'true'.*)$")
        for expr in re.findall(r"\$\{\{\s*(.*?)\s*\}\}", self.text):
            self.assertRegex(expr, allowed)

    def test_actions_are_pinned_and_credentials_not_persisted(self):
        uses = re.findall(r"uses: (\S+)", self.text)
        self.assertTrue(uses)
        for u in uses:
            self.assertRegex(u, r"^[\w./-]+@[0-9a-f]{40}$")
        self.assertIn("persist-credentials: false", self.text)

    def test_secrets_only_reach_the_one_backup_step(self):
        steps = re.split(r"(?m)^      - ", self.text)
        with_secrets = [s for s in steps if "secrets." in s]
        self.assertEqual(len(with_secrets), 1)
        self.assertIn("db_backup.py run", with_secrets[0])
        for name in ("BACKUP_PG_PASSWORD", "BACKUP_S3_ACCESS_KEY_ID", "BACKUP_S3_SECRET_ACCESS_KEY",
                     "BACKUP_SENTRY_CHECKIN_URL"):
            self.assertRegex(with_secrets[0], rf"{name}: \$\{{\{{ secrets\.{name} \}}\}}")
        self.assertNotRegex(self.text, r"secrets\.\w+[^\n]*\n[^\n]*(curl|echo)")

    def test_every_env_name_exists_in_the_coordinator(self):
        names = set(re.findall(r"^\s+(BACKUP_[A-Z0-9_]+):", self.text, re.M)) - {"BACKUP_PG_CA_PEM"}
        known = set(db.REQUIRED) | db.OPTIONAL
        self.assertTrue(names <= known, names - known)
        self.assertTrue(set(db.REQUIRED) <= names)


@unittest.skipUnless(shutil.which("age") and shutil.which("age-keygen"), "age not installed")
class RealAgeTests(unittest.TestCase):
    def test_roundtrip_with_real_age(self):
        tmp = Path(tempfile.mkdtemp(prefix="dbb-age-")).resolve()
        self.addCleanup(shutil.rmtree, tmp, True)
        ident = tmp / "id.txt"
        subprocess.run(["age-keygen", "-o", str(ident)], check=True, capture_output=True)
        pub = subprocess.run(["age-keygen", "-y", str(ident)], check=True, capture_output=True).stdout.decode().strip()
        (tmp / "bin").mkdir()
        (tmp / "bin" / "pg_dump").write_text(FAKE_PG.format(py=sys.executable, canary=STDERR_CANARY, plain=PLAIN))
        (tmp / "bin" / "pg_dump").chmod(0o755)
        (tmp / "bin" / "pg_mode").write_text("ok")
        (tmp / "root").mkdir(mode=0o700)
        cfg = db.parse_config(base_env(tmp / "root", BACKUP_AGE_RECIPIENTS=pub))
        tools = {"pg_dump": str(tmp / "bin" / "pg_dump"), "age": shutil.which("age")}
        out = tmp / "root" / "out.age"
        size = db.dump_and_encrypt(cfg, tools, tmp, out)
        self.assertEqual(size, out.stat().st_size)
        plain = subprocess.run(["age", "-d", "-i", str(ident), str(out)], check=True, capture_output=True).stdout
        self.assertEqual(plain.decode(), PLAIN)
        self.assertNotIn(b"PLAINTEXT", out.read_bytes())


if __name__ == "__main__":
    unittest.main()
