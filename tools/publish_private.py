#!/usr/bin/env python
"""Encrypt the files of the private Drive folder into private/ and commit them.

GitHub Pages has no server, so nothing on aleisantos.com can check a password.
The files are encrypted here instead, and private/index.html decrypts them in
the browser after the password is typed. The repository is public: everything
under private/ can be copied by anyone, and only the password protects it.

Format (read by js/private.js, which must change together with this file):
  private/vault.json        PBKDF2 parameters plus the encrypted list of files
  private/blobs/<id>.bin    one AES-256-GCM ciphertext per file

The key is PBKDF2-HMAC-SHA256 of the password (NFC-normalised, UTF-8). Every
encryption uses a fresh random 12-byte IV, and the associated data binds each
ciphertext to its place: b"manifest" for the list, the blob id for a file.
File names, folders, dates and sizes live only inside the encrypted list, and
the commit message is always the same, so the public history shows only that
something changed and the approximate size of each blob.

Usage:
  python tools/publish_private.py            # encrypt new and changed files, commit
  python tools/publish_private.py --dry-run  # show what would change, write nothing

Pushing is a separate step: git -C ~/github/aleifs.github.io push
"""

import argparse
import base64
import getpass
import hashlib
import json
import mimetypes
import secrets
import subprocess
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

REPO = Path(__file__).resolve().parent.parent
PRIVATE = REPO / 'private'
VAULT = PRIVATE / 'vault.json'
BLOBS = PRIVATE / 'blobs'
SOURCE = Path.home() / 'Cloud' / 'Site privado'

ITERATIONS = 600_000
MIN_PASSWORD = 16
# GitHub refuses files above 100 MB and warns above 50 MB. Every version of a
# file also stays in the history for good, and Pages caps the site at 1 GB.
MAX_BYTES = 95 * 1024 * 1024
WARN_BYTES = 50 * 1024 * 1024
COMMIT_MESSAGE = 'Update the private files'


def b64(data):
    return base64.b64encode(data).decode('ascii')


def unb64(text):
    return base64.b64decode(text)


def derive_key(password, salt, iterations):
    password = unicodedata.normalize('NFC', password).encode('utf-8')
    return hashlib.pbkdf2_hmac('sha256', password, salt, iterations, dklen=32)


def ignored(path):
    """Hidden files, macOS leftovers and Office lock files stay out."""
    return any(part.startswith(('.', '~$')) for part in path.parts) or path.name in {
        'desktop.ini', 'Thumbs.db', 'Icon\r'}


def source_files(source):
    """Map each file's path relative to the folder ("Talks/x.pdf") to its Path."""
    return {p.relative_to(source).as_posix(): p
            for p in sorted(source.rglob('*'))
            if p.is_file() and not ignored(p.relative_to(source))}


def mtime_iso(path):
    return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def sha256(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def open_vault():
    """Ask for the password and return (salt, key, current list of files)."""
    if not VAULT.exists():
        print('No vault yet: choose the password for aleisantos.com/private/.')
        print(f'At least {MIN_PASSWORD} characters. A passphrase of four or five random words works.')
        password = getpass.getpass('New password: ')
        if len(password) < MIN_PASSWORD:
            sys.exit(f'Too short: {len(password)} characters, minimum {MIN_PASSWORD}.')
        if getpass.getpass('Repeat it: ') != password:
            sys.exit('The two passwords differ.')
        salt = secrets.token_bytes(16)
        return salt, derive_key(password, salt, ITERATIONS), []

    vault = json.loads(VAULT.read_text())
    kdf = vault['kdf']
    salt = unb64(kdf['salt'])
    key = derive_key(getpass.getpass('Password: '), salt, kdf['iterations'])
    try:
        plain = AESGCM(key).decrypt(unb64(vault['iv']), unb64(vault['data']), b'manifest')
    except InvalidTag:
        sys.exit('Wrong password.')
    return salt, key, json.loads(plain)['files']


def write_vault(salt, key, files):
    iv = secrets.token_bytes(12)
    plain = json.dumps({'files': files}, ensure_ascii=False).encode('utf-8')
    vault = {
        'version': 1,
        'kdf': {'name': 'PBKDF2', 'hash': 'SHA-256', 'iterations': ITERATIONS, 'salt': b64(salt)},
        'iv': b64(iv),
        'data': b64(AESGCM(key).encrypt(iv, plain, b'manifest')),
    }
    VAULT.write_text(json.dumps(vault, indent=1) + '\n')


def git(*args, capture=False):
    return subprocess.run(['git', '-C', str(REPO), *args], check=True,
                          text=True, capture_output=capture).stdout


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    parser.add_argument('--source', type=Path, default=SOURCE,
                        help=f'folder with the original files (default: {SOURCE})')
    parser.add_argument('--dry-run', action='store_true', help='show the changes and write nothing')
    parser.add_argument('--allow-empty', action='store_true',
                        help='accept an empty folder, which removes every file from the page')
    args = parser.parse_args()
    source = args.source.expanduser().resolve()

    # Plain files inside the repository would be published as they are.
    if source == REPO or REPO in source.parents:
        sys.exit(f'The source folder is inside the public repository: {source}')
    # With the mount down the folder is empty, and publishing it would empty the page.
    if args.source == SOURCE and not source.is_mount():
        sys.exit(f'{source} is not mounted. Start it: systemctl --user start cloud-mount@site-privado')
    if not source.is_dir():
        sys.exit(f'Not a folder: {source}')
    branch = git('rev-parse', '--abbrev-ref', 'HEAD', capture=True).strip()
    if branch != 'master':
        sys.exit(f'GitHub Pages publishes master, and the repository is on {branch}.')

    found = source_files(source)
    too_big = {rel for rel, p in found.items() if p.stat().st_size > MAX_BYTES}
    for rel in sorted(too_big):
        print(f'skipped, above {MAX_BYTES >> 20} MB: {rel}')
    found = {rel: p for rel, p in found.items() if rel not in too_big}

    salt, key, old_files = open_vault()
    if not found and old_files and not args.allow_empty:
        sys.exit(f'{source} has no files, and the page lists {len(old_files)}. '
                 'Use --allow-empty to remove them all.')

    old = {f['path']: f for f in old_files}
    files, added, updated = [], [], []
    for rel, p in found.items():
        size, modified = p.stat().st_size, mtime_iso(p)
        prev = old.get(rel)
        # Same size and date: the file is taken as unchanged without reading it,
        # which spares downloading the whole folder from Drive on every run.
        if prev and prev['size'] == size and prev['modified'] == modified:
            files.append(prev)
            continue
        digest = sha256(p)
        if prev and prev['sha256'] == digest:
            files.append({**prev, 'modified': modified})
            continue
        if size > WARN_BYTES:
            print(f'warning, above {WARN_BYTES >> 20} MB (GitHub accepts it with a warning): {rel}')
        blob, iv = secrets.token_hex(16), secrets.token_bytes(12)
        files.append({'path': rel, 'size': size, 'modified': modified, 'sha256': digest,
                      'type': mimetypes.guess_type(p.name)[0] or 'application/octet-stream',
                      'blob': blob, 'iv': b64(iv)})
        (updated if prev else added).append(rel)
        if not args.dry_run:
            BLOBS.mkdir(parents=True, exist_ok=True)
            (BLOBS / f'{blob}.bin').write_bytes(AESGCM(key).encrypt(iv, p.read_bytes(), blob.encode()))
    removed = sorted(set(old) - set(found))

    for label, names in (('added', added), ('updated', updated), ('removed', removed)):
        for name in names:
            print(f'{label}: {name}')

    if files == old_files and VAULT.exists():
        print('Nothing changed.')
        return
    if args.dry_run:
        print('Dry run: nothing written.')
        return

    write_vault(salt, key, files)
    keep = {f'{f["blob"]}.bin' for f in files}
    if BLOBS.exists():
        for blob in BLOBS.glob('*.bin'):
            if blob.name not in keep:
                blob.unlink()

    # Only these paths enter the commit, so a half-edited page never goes with them.
    # git refuses a path that matches nothing, which is private/blobs before the first file.
    paths = ['private/vault.json']
    if any(BLOBS.glob('*.bin')) or git('ls-files', 'private/blobs', capture=True):
        paths.append('private/blobs')
    git('add', '-A', '--', *paths)
    git('commit', '-q', '-m', COMMIT_MESSAGE, '--', *paths)
    print(f'Committed. The page lists {len(files)} file(s).')


if __name__ == '__main__':
    main()
