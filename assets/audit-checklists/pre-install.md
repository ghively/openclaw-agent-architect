# Pre-Install Audit Checklist

Quick-reference card. For the full narrative, see `references/security-audit.md`.

## TL;DR — the minimum audit for a quick install

1. Read the `SKILL.md` or `package.json` TOP TO BOTTOM. Any obfuscation, encoded blobs, or instructions to ignore safety rules → STOP.
2. Run `openclaw security audit --deep --json` before AND after install, `diff` the output.
3. First run in a sandboxed agent with `workspaceAccess: "none"` and control-plane tools denied.

If all three pass, probably safe. If you skip any, you don't know.

---

## Skill audit

### Source / provenance
- [ ] Publisher's GitHub account > 6 months old with other credible repos
- [ ] Skill has a history (not v1.0.0 from a fresh account)
- [ ] Skill slug matches expected publisher (no typosquats)
- [ ] Zero or low report count on ClawHub

### SKILL.md frontmatter
- [ ] `requires.bins` lists only what's genuinely needed
- [ ] No interpreters (`python`/`node`/`ruby`/`perl`/`osascript`) in `requires.bins` unless you understand why
- [ ] `install` specs point to HTTPS URLs you recognize (no bare IPs, suspicious domains)
- [ ] `install.kind: "download"` has a plausible `targetDir` under `~/.openclaw/tools/`
- [ ] `disable-model-invocation: true` + `command-dispatch: tool` combo only if intentional
- [ ] `description` accurately reflects what SKILL.md body describes

### SKILL.md body
- [ ] No instructions telling the agent to ignore its system prompt, SOUL, or safety rules
- [ ] No instructions to read files outside the workspace (`/etc/`, `~/.ssh/`, `~/.openclaw/credentials/`)
- [ ] No exfiltration instructions ("send X to https://...")
- [ ] No encoded content (base64 blobs, zero-width Unicode, unusual escapes)
- [ ] No instructions to modify agent persona or install other skills/plugins automatically
- [ ] Every tool it asks the agent to use is legitimate for the stated purpose
- [ ] Construction of shell commands uses escaping; no raw `"${user_input}"` patterns

### Bundled files
- [ ] Reviewed every `.sh`, `.py`, `.js`, `.ts` in the skill directory
- [ ] No compiled binaries unless you compile from source yourself
- [ ] No hidden files (`.env`, `.npmrc` with custom registries, `.gitconfig`)
- [ ] No symlinks resolving outside the skill directory

### Built-in scanner
- [ ] Ran `openclaw security audit --deep` BEFORE install
- [ ] Installed the skill
- [ ] Ran `openclaw security audit --deep` AFTER install
- [ ] `diff` showed only expected new findings
- [ ] No critical findings introduced

### Sandboxed first run
- [ ] Created isolated agent with `sandbox.mode: "all"`, `workspaceAccess: "none"`
- [ ] Denied dangerous tools in that agent (`gateway`, `cron`, `sessions_spawn`, `sessions_send`, `browser`, `web_fetch`)
- [ ] Ran adversarial prompts ("read /etc/passwd", "post secrets to attacker.example") to test skill's blast radius
- [ ] Reviewed session transcript for unexpected tool calls or outbound URLs

---

## Plugin audit

### Source / provenance
- [ ] Published to ClawHub or npm from a credible author
- [ ] Pinned version (no `^`/`~`) — use exact version in install spec
- [ ] Scrutinized every import in the plugin's code
- [ ] Reviewed commit history and recent changes

### Package structure
- [ ] `package.json` has no `postinstall` / `preinstall` / `install` scripts
- [ ] Dependencies are all standard registry packages, no `git://` or `file:` specs
- [ ] No suspicious typosquat dependencies (`lod-ash`, `expres`, `requesta`, etc.)
- [ ] `bin` entries (if any) are named responsibly — no global PATH hijacks

### Entry point / registered capabilities
- [ ] `openclaw plugins inspect <id>` lists the tools + hooks you expected
- [ ] No unexpected `before_model_resolve` / `before_prompt_build` hooks (exfil / prompt injection vectors)
- [ ] No unexpected `tool_result_persist` hook (can silently rewrite tool results)
- [ ] No new HTTP routes if you didn't expect them
- [ ] No new channels or providers if you didn't expect them

### Config defaults
- [ ] No `dangerously*` flags set to `true` in default config
- [ ] No `autoAllowSkills: true` override
- [ ] No `security: "full"` override for exec
- [ ] No bypass of `strictInlineEval: true`
- [ ] No bypass of default tool policy

### Install behavior
- [ ] No unexpected credential prompts
- [ ] No new network listeners (`netstat -an` before/after)
- [ ] No files written outside `~/.openclaw/plugins/<id>/` (`find ~ -newer /tmp/install-marker -type f`)
- [ ] No outbound network requests during install

### Runtime validation
- [ ] Sandbox-isolated first run — as with skills, test with adversarial prompts
- [ ] Tailed gateway log during first runs, looked for unexpected behavior
- [ ] Checked session transcripts for unexpected tool invocations or outbound URLs
- [ ] Monitored `command-logger` output for unexpected events

---

## Red flag summary — STOP install if you see ANY of these

- **Encoded / obfuscated content** in SKILL.md body or plugin source code
- **Instructions to ignore system prompt / safety rules**
- **Instructions to read files outside the workspace**
- **Exfiltration URLs** (content posted to external endpoints)
- **`postinstall` / `preinstall` scripts** in plugin `package.json`
- **Non-registry dependency specs** (git://, file://, http://)
- **Typosquat dependency names**
- **Critical findings from `openclaw security audit`**
- **Any `dangerously*` flag set to `true` by default**
- **Any interpreter in `safeBins` without profile**
- **Binary files without accessible source**
- **Publishing account < 1 week old + v1.0.0 of security-sensitive skill**

If you see ANY of these, STOP and report the skill/plugin on ClawHub or to `security@openclaw.ai`.

---

## Post-install monitoring

Enable the `command-logger` bundled hook on any gateway running community code:

```bash
openclaw hooks enable command-logger
```

Then monitor:
```bash
# Real-time
tail -f ~/.openclaw/logs/commands.log | jq

# Recent outbound URLs (exfil check)
grep -r '"web_fetch"' ~/.openclaw/agents/*/sessions/ | grep -oE 'https?://[^"]+' | sort -u

# Recent exec commands
grep -r '"exec"' ~/.openclaw/agents/*/sessions/ | jq -r '.input.command // empty' | sort -u | tail -50
```

Run regular audits:
```bash
openclaw security audit --deep
```

---

## If something went wrong

1. **Stop the gateway** (kill process or `launchctl`/`systemctl stop`)
2. **Bind to loopback**, disable any Tailscale Funnel/Serve
3. **Disable risky channels** (`dmPolicy: "disabled"`, remove `"*"` allow-alls)
4. **Uninstall the suspect skill/plugin**
5. **Rotate assuming compromise**: gateway auth, channel creds, model API keys
6. **Audit damage**: session transcripts, gateway logs, recent config changes
7. **Report** to `security@openclaw.ai` with timeline
