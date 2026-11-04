# Codex Film Studio plugin privacy

Publisher: LeoGuoLabs. Applies to the locally executed Film Studio plugin v0.1.0.

The plugin processes your brief, selected reference images, recordings, source materials, filenames and output preferences to create and review your film. Project sources, captions, generated audio, rendered frames, verification reports and the final MP4 are written to the project directory on your computer. LeoGuoLabs operates no backend for these files and the plugin includes no publisher telemetry.

Codex processes prompts and any files it reads under the terms and settings of your Codex account. Installing dependencies, obtaining a sample or downloading an ASR model contacts the selected package registry, GitHub or the model host. Those services receive normal download requests, including your IP address and the requested package or asset. When you choose online speech synthesis, the voice provider receives the selected narration text and voice settings. For Edge TTS this is Microsoft's online speech service. A configured Chatterbox endpoint receives the narration and service authentication needed for that request. You can supply local recordings instead.

The plugin keeps local project files until you remove them. Download and model caches are managed by the corresponding package or model tools. Removing the plugin does not delete your independent projects. You can delete a project and its backups or clear the relevant tool caches yourself. Codex and any external providers apply their own retention policies to requests they receive. Public sharing is a separate action.

For plugin privacy questions, contact LeoGuoLabs through the [project support page](https://github.com/visiontrail/codex-film-studio/issues). Reports on that page are public. Please describe the issue without including private scripts, recordings or credentials.
