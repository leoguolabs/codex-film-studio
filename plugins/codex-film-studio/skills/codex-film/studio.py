#!/usr/bin/env python3
"""Locate the installed studio and prepare an independent film workspace."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
INSTALLED = (HERE / "studio/styles.json").is_file()
ROOT = HERE / "studio" if INSTALLED else HERE.parents[2]
PACKAGE = HERE.parents[1] if INSTALLED else ROOT


def select_python():
    """macOS may put its system Python ahead of an installed production Python."""
    if sys.version_info >= (3, 11):
        return
    for minor in range(15, 10, -1):
        candidate = shutil.which(f"python3.{minor}")
        if candidate:
            probe = subprocess.run(
                [candidate, "-c", "import sys; print(sys.executable); sys.exit(sys.version_info < (3, 11))"],
                capture_output=True, text=True)
            if probe.returncode == 0:
                python = probe.stdout.strip()
                os.environ["PATH"] = str(Path(python).parent) + os.pathsep + os.environ.get("PATH", "")
                os.execv(python, [python, *sys.argv])


def doctor(style):
    minimum = 22 if style == "whiteboard" else 20
    problems = []
    if os.name == "nt":
        problems.append("Use WSL2 on Windows. The production and review scripts use POSIX tools.")
    if sys.version_info < (3, 11):
        problems.append("Install Python 3.11+ with venv and run this launcher with it.")
    for name, hint in [("node", f"install Node.js {minimum}+ with npm (Node 24 is used in CI)"),
                       ("npm", "install npm with Node.js"),
                       ("ffmpeg", "install FFmpeg with libx264 and AAC"),
                       ("ffprobe", "install the FFmpeg tools including ffprobe")]:
        exe = shutil.which(name)
        if not exe:
            problems.append(f"{name} missing: {hint}.")
            continue
        proc = subprocess.run([exe, "-version" if name.startswith("ff") else "--version"],
                              capture_output=True, text=True)
        version = proc.stdout.splitlines()[:1]
        print(f"{name}: {version[0] if version else exe}")
        if proc.returncode:
            problems.append(f"{name} failed to start: {hint}.")
        elif name == "node" and (not version or not version[0].lstrip("v").split(".")[0].isdigit()):
            problems.append(f"Could not read Node version: {hint}.")
        elif name == "node" and int(version[0].lstrip("v").split(".")[0]) < minimum:
            problems.append(f"Old Node.js: {hint}.")
        if name == "ffmpeg" and not proc.returncode:
            encoders = subprocess.run([exe, "-hide_banner", "-encoders"], capture_output=True, text=True)
            needed = {"libx264", "aac"}
            found = {parts[1] for line in encoders.stdout.splitlines() if len(parts := line.split()) >= 2}
            if encoders.returncode or not needed <= found:
                problems.append("Install an FFmpeg build with the libx264 and AAC encoders.")
    if problems:
        raise SystemExit("\n".join(problems))
    print(f"Python {sys.version.split()[0]} at {sys.executable}")


def prepare(project):
    project = project.resolve()
    if project == PACKAGE or PACKAGE in project.parents or not (project / "STYLE.md").is_file():
        raise SystemExit("Select a generated production project outside the plugin.")
    whiteboard = (project / "scripts/import_audio.py").is_file()
    doctor("whiteboard" if whiteboard else None)

    def run(cmd):
        subprocess.run(cmd, cwd=project, check=True)

    if (project / "package-lock.json").is_file():
        run(["npm", "ci"])
        scripts = json.loads((project / "package.json").read_text()).get("scripts", {})
        if "setup-renderer" in scripts:
            run(["npm", "run", "setup-renderer"])
        if "doctor" in scripts:
            run(["npm", "run", "doctor"])
    if whiteboard:
        run([sys.executable, "-m", "venv", ".venv"])
        run([str(project / ".venv/bin/python"), "-m", "pip", "install", "-r", "requirements.txt"])
    elif not (project / "package-lock.json").is_file():
        print("Read STYLE.md and the project README for authoring and renderer requirements.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("root")
    commands.add_parser("list")
    catalog = json.loads((ROOT / "styles.json").read_text())
    ids = [s["id"] for s in catalog["styles"]]
    commands.add_parser("doctor").add_argument("--style", choices=ids)
    commands.add_parser("prepare").add_argument("project", type=Path)
    new = commands.add_parser("new")
    new.add_argument("name")
    new.add_argument("--style", required=True, choices=ids)
    new.add_argument("--output", type=Path)
    new.add_argument("--replay-bundle", type=Path)
    args = parser.parse_args()
    if args.command == "root":
        print(ROOT)
    elif args.command == "doctor":
        doctor(args.style)
    elif args.command == "prepare":
        prepare(args.project)
    else:
        cmd = [sys.executable, str(ROOT / "scripts/new_film.py")]
        if args.command == "list":
            cmd.append("--list")
        else:
            output = args.output or Path.cwd() / args.name
            if not INSTALLED and not args.output and Path.cwd().resolve().is_relative_to(ROOT):
                output = ROOT.parent / f"{ROOT.name}-projects" / args.name
            if PACKAGE == output.resolve() or PACKAGE in output.resolve().parents:
                parser.error("Choose a project destination outside the installed plugin.")
            cmd.extend([args.name, "--style", args.style, "--output", str(output)])
            if args.replay_bundle:
                cmd.extend(["--replay-bundle", str(args.replay_bundle)])
        subprocess.run(cmd, check=True)


if __name__ == "__main__":
    try:
        select_python()
        main()
    except subprocess.CalledProcessError as exc:
        sys.exit(f"Command failed ({exc.returncode}): {exc.cmd}. Check the error above, then retry.")
