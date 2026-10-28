#!/usr/bin/env python3
"""Prepare a Linux host backup folder for the non-root Docker service."""
import argparse
import os
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory', nargs='?', default=os.environ.get('STITCHINATOR_BACKUP_DIR', str(Path(__file__).resolve().parents[1] / 'backups' / 'automatic')))
args = parser.parse_args()
folder = Path(args.directory).expanduser().resolve()
default_folder = Path(__file__).resolve().parents[1] / 'backups' / 'automatic'
if folder == default_folder and not folder.parent.exists():
    folder.parent.mkdir()
if not folder.parent.is_dir():
    raise SystemExit('Parent directory is missing. Mount the destination drive before preparing backups.')
folder.mkdir(exist_ok=True)
marker = folder / '.stitchinator-backups'
if marker.exists() and marker.read_text().strip() != 'stitchinator-backups-v1':
    raise SystemExit('An incompatible backup marker already exists; no changes made.')
# Keep ownership; let the service use the folder's group. Setgid preserves that group.
os.chmod(folder, 0o2770)
if not marker.exists():
    marker.write_text('stitchinator-backups-v1\n')
print(f'Backup folder prepared: {folder}')
print(f'STITCHINATOR_BACKUP_DIR={folder}')
print(f'STITCHINATOR_BACKUP_GID={folder.stat().st_gid}')
