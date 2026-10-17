#!/usr/bin/env python3
"""Daily encrypted database backup: pg_dump | age -> private bucket, then read back and verify.

Disabled by default (BACKUP_ENABLED). Production uses `preflight-production [--staged]` / `run-production`.
Generic `preflight [--staged]` / `run` are for isolated tests. Stdout carries
only fixed status words, never a value from the config, a key, a hash or a tool message.
Plaintext exists only in the pg_dump -> age pipe. Runbook: docs/db-backup.md.
"""
from __future__ import annotations

import base64
import enum
import hashlib
import json
import os
import re
import shutil
import signal
import subprocess
import sys
import tempfile
import time
import urllib.request
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

REPO = Path(__file__).resolve().parents[1]
MAX_BYTES = 512 * 1024 * 1024  # one PUT, no multipart: a bigger dump must fail loudly
TIMEOUT_S = 1500
POLL_S = 0.05
CHUNK = 1 << 20
SCHEMAS = ("auth", "public", "leaderboard_private", "supabase_migrations")


class Code(str, enum.Enum):
    CONFIG = "CONFIG"
    TOOLS = "TOOLS"
    DUMP = "DUMP"
    ENCRYPT = "ENCRYPT"
    TIMEOUT = "TIMEOUT"
    TOO_LARGE = "TOO_LARGE"
    EMPTY = "EMPTY"
    UPLOAD = "UPLOAD"
    VERIFY = "VERIFY"
    INTERRUPTED = "INTERRUPTED"
    INTERNAL = "INTERNAL"


class BackupError(Exception):
    """Carries only a fixed code (and, for CONFIG, the name of a known setting)."""

    def __init__(self, code: Code, name: str = ""):
        super().__init__(code.value)
        self.code, self.name = code, name



_HOST = r"[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?"
_IDENT = r"[A-Za-z0-9_][A-Za-z0-9_.$-]{0,62}"
_AGE = r"age1[02-9ac-hj-np-z]{58}"
_SENTRY = re.compile(
    r"https://o\d{1,32}\.ingest(\.[a-z]{2})?\.sentry\.io/api/\d{1,32}/cron/[A-Za-z0-9_-]{1,64}/[a-f0-9]{32}/"
)
REQUIRED = {
    "BACKUP_PG_HOST": _HOST, "BACKUP_PG_PORT": r"\d{1,5}", "BACKUP_PG_DATABASE": _IDENT,
    "BACKUP_PG_USER": _IDENT, "BACKUP_PG_MAJOR": r"\d{2}", "BACKUP_AGE_RECIPIENTS": None,
    "BACKUP_S3_ENDPOINT": None, "BACKUP_S3_BUCKET": r"[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]",
    "BACKUP_TMP_ROOT": None, "BACKUP_PG_PASSWORD": None, "BACKUP_S3_ACCESS_KEY_ID": None,
    "BACKUP_S3_SECRET_ACCESS_KEY": None,
}
OPTIONAL = {"BACKUP_ENABLED", "BACKUP_S3_REGION", "BACKUP_PG_CA_FILE", "BACKUP_SENTRY_ENABLED",
            "BACKUP_SENTRY_CHECKIN_URL", "BACKUP_PRODUCTION_POLICY"}


@dataclass(frozen=True)
class Config:
    pg_host: str
    pg_port: int
    pg_database: str
    pg_user: str
    pg_major: int
    pg_ca_file: Path | None
    age_recipients: tuple[str, ...]
    s3_endpoint: str
    s3_bucket: str
    s3_region: str
    tmp_root: Path
    sentry_url: str | None = field(repr=False)
    pg_password: str = field(repr=False)
    s3_key_id: str = field(repr=False)
    s3_secret: str = field(repr=False)


def _flag(env, name: str) -> bool:
    v = env.get(name, "")
    if v not in ("", "true", "false"):
        raise BackupError(Code.CONFIG, name)
    return v == "true"


def enabled(env) -> bool:
    return _flag(env, "BACKUP_ENABLED")


def parse_config(env) -> Config:
    """Pure: reads only `env`, touches no file, tool or network."""
    if any(k.startswith("BACKUP_") and k not in REQUIRED and k not in OPTIONAL for k in env):
        raise BackupError(Code.CONFIG, "BACKUP_UNKNOWN")
    for name, rx in REQUIRED.items():
        v = env.get(name, "")
        if not v or v != v.strip() or "\0" in v or len(v) > 512 or (rx and not re.fullmatch(rx, v)):
            raise BackupError(Code.CONFIG, name)
    port = int(env["BACKUP_PG_PORT"])
    if not 1 <= port <= 65535:
        raise BackupError(Code.CONFIG, "BACKUP_PG_PORT")
    recipients = tuple(env["BACKUP_AGE_RECIPIENTS"].split(","))
    if not 1 <= len(recipients) <= 3 or len(set(recipients)) != len(recipients) \
            or not all(re.fullmatch(_AGE, r) for r in recipients):
        raise BackupError(Code.CONFIG, "BACKUP_AGE_RECIPIENTS")
    u = urlsplit(env["BACKUP_S3_ENDPOINT"])
    try:
        port_ok = u.port is None or 1 <= u.port <= 65535
    except ValueError:
        port_ok = False
    if (u.scheme != "https" or not u.hostname or not re.fullmatch(_HOST, u.hostname) or not port_ok
            or u.username is not None or u.password is not None or u.path not in ("", "/")
            or u.query or u.fragment):
        raise BackupError(Code.CONFIG, "BACKUP_S3_ENDPOINT")
    region = env.get("BACKUP_S3_REGION") or "auto"
    if not re.fullmatch(r"[a-z0-9-]{1,32}", region):
        raise BackupError(Code.CONFIG, "BACKUP_S3_REGION")
    paths = {}
    for name in ("BACKUP_TMP_ROOT", "BACKUP_PG_CA_FILE"):
        v = env.get(name, "")
        if v and not os.path.isabs(v):
            raise BackupError(Code.CONFIG, name)
        paths[name] = Path(v) if v else None
    if paths["BACKUP_TMP_ROOT"] is None:
        raise BackupError(Code.CONFIG, "BACKUP_TMP_ROOT")
    sentry = env.get("BACKUP_SENTRY_CHECKIN_URL", "")
    if sentry and not _SENTRY.fullmatch(sentry):
        raise BackupError(Code.CONFIG, "BACKUP_SENTRY_CHECKIN_URL")
    if _flag(env, "BACKUP_SENTRY_ENABLED") and not sentry:
        raise BackupError(Code.CONFIG, "BACKUP_SENTRY_CHECKIN_URL")
    return Config(
        pg_host=env["BACKUP_PG_HOST"], pg_port=port, pg_database=env["BACKUP_PG_DATABASE"],
        pg_user=env["BACKUP_PG_USER"], pg_major=int(env["BACKUP_PG_MAJOR"]),
        pg_ca_file=paths["BACKUP_PG_CA_FILE"], age_recipients=recipients,
        s3_endpoint=f"https://{u.netloc}", s3_bucket=env["BACKUP_S3_BUCKET"], s3_region=region,
        tmp_root=paths["BACKUP_TMP_ROOT"], pg_password=env["BACKUP_PG_PASSWORD"],
        s3_key_id=env["BACKUP_S3_ACCESS_KEY_ID"], s3_secret=env["BACKUP_S3_SECRET_ACCESS_KEY"],
        sentry_url=sentry if _flag(env, "BACKUP_SENTRY_ENABLED") else None,
    )



def check_production_policy(cfg: Config, env) -> None:
    """Compare with independently approved public metadata before any tool or network call."""
    raw = env.get("BACKUP_PRODUCTION_POLICY", "")
    expected = {name: getattr(cfg, name) for name in (
        "pg_host", "pg_port", "pg_database", "pg_user", "pg_major", "s3_endpoint",
        "s3_bucket", "s3_region",
    )}
    expected["age_recipients"] = list(cfg.age_recipients)
    expected["purpose"] = "production"
    try:
        def unique_keys(pairs):
            result = {}
            for key, value in pairs:
                if key in result:
                    raise ValueError
                result[key] = value
            return result
        policy = json.loads(raw, object_pairs_hook=unique_keys) if len(raw) <= 8192 else None
        matches = isinstance(policy, dict) and policy.keys() == expected.keys() and all(
            type(policy[k]) is type(v) and policy[k] == v for k, v in expected.items()
        )
    except (ValueError, TypeError, RecursionError):
        matches = False
    if not matches:
        raise BackupError(Code.CONFIG, "BACKUP_PRODUCTION_POLICY")


def check_host(cfg: Config) -> dict[str, str]:
    root = cfg.tmp_root.resolve()
    if not root.is_dir() or root == REPO or REPO in root.parents or root in REPO.parents \
            or root.stat().st_uid != os.getuid():
        raise BackupError(Code.CONFIG, "BACKUP_TMP_ROOT")
    if cfg.pg_ca_file is not None and not cfg.pg_ca_file.is_file():
        raise BackupError(Code.CONFIG, "BACKUP_PG_CA_FILE")
    tools: dict[str, str] = {}
    for name in ("pg_dump", "age"):
        path = shutil.which(name)
        if path is None:
            raise BackupError(Code.TOOLS)
        tools[name] = path
    try:
        out = subprocess.run([tools["pg_dump"], "--version"], capture_output=True, timeout=20, check=True,
                             env={}).stdout.decode("ascii", "replace")
    except (OSError, subprocess.SubprocessError):
        raise BackupError(Code.TOOLS) from None
    m = re.search(r"\) (\d+)", out)
    if not m or int(m.group(1)) != cfg.pg_major:
        raise BackupError(Code.TOOLS)
    return tools



def _pg_argv(cfg: Config, pg_dump: str) -> list[str]:
    return [pg_dump, "--format=custom", "--no-password", "--strict-names", "--lock-wait-timeout=60000",
            *(f"--schema={s}" for s in SCHEMAS), f"--host={cfg.pg_host}", f"--port={cfg.pg_port}",
            f"--username={cfg.pg_user}", f"--dbname={cfg.pg_database}"]


def _pg_env(cfg: Config, home: str) -> dict[str, str]:
    # The only child that sees the database password; it never gets the bucket credentials.
    return {"HOME": home, "PGPASSWORD": cfg.pg_password, "PGSSLMODE": "verify-full",
            "PGSSLROOTCERT": str(cfg.pg_ca_file) if cfg.pg_ca_file else "system",
            "PGCONNECT_TIMEOUT": "20", "PGSERVICEFILE": os.devnull, "PGPASSFILE": os.devnull}


def _kill(procs) -> None:
    if any(p.poll() is None for p in procs):
        try:
            os.killpg(procs[0].pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
    for p in procs:
        p.wait()


def dump_and_encrypt(cfg: Config, tools: dict[str, str], work: Path, out_path: Path) -> int:
    """Run both children to completion in one process group; returns the ciphertext size."""
    deadline = time.monotonic() + TIMEOUT_S
    procs: list[subprocess.Popen] = []
    fd = os.open(out_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as out:
            dump = subprocess.Popen(_pg_argv(cfg, tools["pg_dump"]), stdin=subprocess.DEVNULL,
                                    stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                    env=_pg_env(cfg, str(work)), process_group=0)
            procs.append(dump)
            age = subprocess.Popen([tools["age"], *(a for r in cfg.age_recipients for a in ("-r", r))],
                                   stdin=dump.stdout, stdout=out, stderr=subprocess.DEVNULL,
                                   env={"HOME": str(work)}, process_group=dump.pid)
            procs.append(age)
            dump.stdout.close()
            while True:
                rd, ra = dump.poll(), age.poll()
                if rd not in (None, 0):
                    raise BackupError(Code.DUMP)
                if ra not in (None, 0):
                    raise BackupError(Code.ENCRYPT)
                if rd == 0 and ra == 0:
                    break
                if os.fstat(out.fileno()).st_size > MAX_BYTES:
                    raise BackupError(Code.TOO_LARGE)
                if time.monotonic() > deadline:
                    raise BackupError(Code.TIMEOUT)
                time.sleep(POLL_S)
    except OSError:
        raise BackupError(Code.TOOLS) from None
    finally:
        _kill(procs)
    size = out_path.stat().st_size
    if size == 0:
        raise BackupError(Code.EMPTY)
    return size



def boto_client(cfg: Config):
    """Lazy import: the tests and the disabled path never need boto3."""
    for k in list(os.environ):
        if k.upper().startswith("AWS_") or k.upper().endswith("_PROXY"):
            del os.environ[k]  # no ambient credentials, profile, endpoint or proxy
    os.environ.update(NO_PROXY="*", AWS_EC2_METADATA_DISABLED="true", AWS_CONFIG_FILE=os.devnull,
                      AWS_SHARED_CREDENTIALS_FILE=os.devnull)
    import boto3
    from botocore.config import Config as BotoConfig

    session = boto3.session.Session(aws_access_key_id=cfg.s3_key_id, aws_secret_access_key=cfg.s3_secret,
                                    region_name=cfg.s3_region)
    return session.client("s3", endpoint_url=cfg.s3_endpoint, config=BotoConfig(
        signature_version="s3v4", s3={"addressing_style": "path"}, connect_timeout=15, read_timeout=120,
        retries={"max_attempts": 3, "mode": "standard"},
        request_checksum_calculation="when_required", response_checksum_validation="when_required"))


def new_key(now: datetime | None = None) -> str:
    return f"daily/{(now or datetime.now(timezone.utc)):%Y%m%dT%H%M%SZ}-{uuid.uuid4().hex}.dump.age"


def upload_and_verify(cfg: Config, client, path: Path, key: str) -> None:
    size = path.stat().st_size
    if size > MAX_BYTES:
        raise BackupError(Code.TOO_LARGE)
    sha, md5 = hashlib.sha256(), hashlib.md5(usedforsecurity=False)
    with path.open("rb") as f:
        while chunk := f.read(CHUNK):
            sha.update(chunk)
            md5.update(chunk)
    try:
        with path.open("rb") as f:
            client.put_object(Bucket=cfg.s3_bucket, Key=key, Body=f, ContentLength=size, IfNoneMatch="*",
                              ContentMD5=base64.b64encode(md5.digest()).decode(),
                              ContentType="application/octet-stream")
    except Exception:
        raise BackupError(Code.UPLOAD) from None  # the object may exist: lifecycle rule cleans it, no delete here
    try:
        body = client.get_object(Bucket=cfg.s3_bucket, Key=key)["Body"]
        back, n = hashlib.sha256(), 0
        try:
            for chunk in body.iter_chunks(CHUNK):
                back.update(chunk)
                n += len(chunk)
                if n > size:
                    break
        finally:
            body.close()
    except Exception:
        raise BackupError(Code.VERIFY) from None
    if n != size or back.digest() != sha.digest():
        raise BackupError(Code.VERIFY)



class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def sentry_opener():
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), _NoRedirect())


class Monitor:
    def __init__(self, url: str | None, opener=None):
        self.url, self.opener, self.id, self.failed = url, opener or (sentry_opener() if url else None), \
            str(uuid.uuid4()), False

    def ping(self, status: str) -> None:
        if not self.url:
            return
        try:
            with self.opener.open(f"{self.url}?status={status}&check_in_id={self.id}", timeout=10) as r:
                if not 200 <= r.status < 300:
                    self.failed = True
        except Exception:
            self.failed = True  # reason deliberately dropped: the URL is a secret



def run_backup(cfg: Config, client_factory=boto_client, monitor: Monitor | None = None) -> None:
    tools = check_host(cfg)
    monitor = monitor or Monitor(cfg.sentry_url)
    monitor.ping("in_progress")
    work = Path(tempfile.mkdtemp(prefix="db-backup-", dir=cfg.tmp_root.resolve()))
    try:
        dump_and_encrypt(cfg, tools, work, work / "backup.age")
        upload_and_verify(cfg, client_factory(cfg), work / "backup.age", new_key())
    except BaseException:
        monitor.ping("error")
        raise
    finally:
        shutil.rmtree(work, ignore_errors=True)
    monitor.ping("ok")
    if monitor.failed:
        raise MonitorFailed


class MonitorFailed(Exception):
    """The backup is verified; only the check-in failed."""


def _interrupt(*_):
    raise BackupError(Code.INTERRUPTED)


def main(argv=None, env=None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    env = os.environ if env is None else env
    cmd = argv[0] if argv else ""
    if cmd not in ("preflight", "preflight-production", "run", "run-production") \
            or argv[1:] not in ([], ["--staged"]) or (cmd.startswith("run") and argv[1:]):
        print("usage: db_backup.py preflight[-production] [--staged] | run[-production]", file=sys.stderr)
        return 2
    try:
        if not enabled(env) and argv[1:] != ["--staged"]:
            print("BACKUP_DISABLED")
            return 0
        cfg = parse_config(env)
        if cmd.endswith("-production"):
            check_production_policy(cfg, env)
        if cmd.startswith("preflight"):
            check_host(cfg)
            print("BACKUP_PREFLIGHT_OK")
            return 0
        signal.signal(signal.SIGTERM, _interrupt)
        signal.signal(signal.SIGINT, _interrupt)
        run_backup(cfg, boto_client)
    except MonitorFailed:
        print("BACKUP_OK_MONITOR_FAIL")
        return 3
    except BackupError as e:
        print(f"BACKUP_FAIL {e.code.value}" + (f" {e.name}" if e.name else ""))
        return 1
    except BaseException:
        print(f"BACKUP_FAIL {Code.INTERNAL.value}")
        return 1
    print("BACKUP_OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
