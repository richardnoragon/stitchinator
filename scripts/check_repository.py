#!/usr/bin/env python3
"""Check tracked-source hygiene, local Markdown links and locked package versions."""
import json
import re
import subprocess
import sys
import tomllib
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
manifest = tomllib.loads((ROOT / "Cargo.toml").read_text())
lock = tomllib.loads((ROOT / "Cargo.lock").read_text())
application = next(p for p in lock["package"] if p["name"] == manifest["package"]["name"])
if application["version"] != manifest["package"]["version"]:
    errors.append("Cargo.toml and Cargo.lock disagree on the application version")
package = json.loads((ROOT / "package.json").read_text())
npm_lock = json.loads((ROOT / "package-lock.json").read_text())
if package["devDependencies"] != npm_lock["packages"][""]["devDependencies"]:
    errors.append("package.json and package-lock.json disagree on development dependencies")
try:
    output = subprocess.check_output(["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"], cwd=ROOT)
    paths = [ROOT / p.decode() for p in output.split(b"\0") if p]
except subprocess.CalledProcessError:
    sys.exit("Run this check from the initialized source repository")
for path in paths:
    relative = path.relative_to(ROOT)
    if relative.parts[0] in {"data", "backups", "dist", "target", "node_modules", ".aws", ".codex", ".agents"}:
        errors.append(f"Runtime/generated/private directory in source: {relative}")
    if relative.name.startswith(".env") and relative.name != ".env.example":
        errors.append(f"Local environment file in source: {relative}")
    if path.is_symlink():
        errors.append(f"Review unexpected source symlink: {relative}")
        continue
    if not path.is_file():
        continue
    if path.stat().st_size > 5 * 1024 * 1024:
        errors.append(f"Unexpected source file larger than 5 MB: {relative}")
    if path.suffix.lower() != ".md":
        continue
    for match in re.finditer(r'\[[^\]\n]*\]\(([^)\n]+)\)', path.read_text()):
        target = match.group(1).strip().strip("<>")
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        destination = (path.parent / unquote(parsed.path)).resolve()
        if not destination.exists():
            errors.append(f"Broken local link in {relative}: {target}")
if errors:
    sys.exit("\n".join(errors))
print(f"Repository checks passed ({len(paths)} source paths; version {application['version']}).")
