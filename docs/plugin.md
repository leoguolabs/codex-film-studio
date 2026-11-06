# Codex Film Studio plugin

Install the versioned Git marketplace with Codex CLI from any directory.

```sh
codex plugin marketplace add https://github.com/leoguolabs/codex-film-studio.git --ref plugin-v0.1.0
codex plugin add codex-film-studio@visiontrail
```

`visiontrail` is the marketplace identifier in the published `plugin-v0.1.0`
release. It remains unchanged for existing installs; the repository and website
now use `leoguolabs`.

Open a new local Codex chat in your film workspace. For example, ask “Make a short whiteboard film explaining how a pulley works. Include captions and give me the editable project.” In a local desktop chat you can also select Codex Film Studio from the plugin picker. The plugin contains its style catalog, templates, fonts, engines, production scripts and review tools. Codex creates an independent project in your workspace and installs its dependencies there.

The [style catalog](https://leoguolabs.github.io/codex-film-studio/) distinguishes sample kits, executable production kits, authoring starters and material toolkits. New subjects require authored scenes. Exact sample replay depends on the published inputs or a supplied source bundle.

## Environment and data

Use macOS or Linux with Python 3.11+, Node 22+ (24 recommended), npm, FFmpeg and FFprobe on PATH. On Windows use a Linux workspace under WSL2. Whiteboard also needs Python venv and pip. The launcher checks the toolchain, looks for a supported versioned Python on PATH if the system default is too old, and installs declared dependencies inside the project. Use the Python path printed by the preflight for subsequent build commands. The Three.js renderer has an additional browser setup step. System package repair examples are `brew install python node ffmpeg` on macOS or `sudo apt install python3-venv ffmpeg` on Ubuntu, plus a supported Node version. On minimal Linux hosts the browser renderer may require the system libraries listed by Playwright.

Dependency downloads, optional voice synthesis, ASR model downloads and exact sample acquisition need network access when uncached. Imported recordings support local production. Read the [plugin privacy notice](https://github.com/leoguolabs/codex-film-studio/blob/main/docs/plugin-privacy.md) for data handling and deletion. The optional Edge or configured Chatterbox integration sends selected narration to that provider. Retain accepted WAVs and project inputs for rebuilding. The plugin configures no MCP server, account, background hook or automatic publishing.

## Distribution

The version in the source manifest is the plugin version. The Git distribution uses a separate versioned ref such as `plugin-v0.1.0`. The repository's older `v0.1.0` tag belongs to the film kit. Keep published plugin refs immutable. For upgrades, add the target version's marketplace and install the plugin again, then open a new chat.

From the source checkout run `python3 scripts/package_plugin.py --output /absolute/new/directory`. This builds a standalone marketplace tree and a deterministic plugin ZIP. To test offline discovery with an unpacked marketplace, replace the Git URL and ref in the first command with the absolute path to the generated `marketplace` directory. Dependency installation remains separate.

For a release, update the manifest, marketplace ref, user-facing install examples and release notes together. Build from a reviewed clean source revision, publish the contents of the generated marketplace directory at the matching Git ref and test installation from that ref. Upload the plugin ZIP only when public submission is authorized. Select the skills-only flow for the desktop executor. Verified developer identity, appropriate dashboard access and passing official metadata and skill scans are required. See the [packaging guide](https://developers.openai.com/plugins/build/plugins), [desktop-only requirements](https://developers.openai.com/plugins/deploy/desktop-only) and [submission process](https://developers.openai.com/plugins/deploy/submission).

## License

Studio code and documentation use MIT. The original whiteboard demo media use CC BY 4.0. Fonts, instrument samples and other third-party components retain their bundled notices. See the package LICENSE, MEDIA-LICENSE.md and the CREDITS, OFL, upstream license and provenance files under each style.
