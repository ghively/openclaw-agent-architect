# Upgrade Audit Checklist

A skill or plugin you already trusted has a new version. Good — but a new version is a NEW installation. Everything that was true of v1.2.3 may not be true of v1.2.4.

Run this checklist every time you bump. Treat a version bump with the same skepticism as a first-time install.

Budget: 10–20 minutes depending on how much changed.

---

## 1. What am I about to install?

- [ ] `npm view <package> versions` (or equivalent ClawHub lookup) — what's the version bump? (patch / minor / major)
- [ ] `npm view <package> time` — when was the new version published?
- [ ] Published less than 24 hours ago? → **wait** unless you're on-call for it. New publishes sometimes get yanked; let the dust settle.
- [ ] Published by the same author/maintainer as before? Check the last few releases for consistency.
- [ ] Was there a gap of unusual length since the previous release? (e.g., package unchanged for 2 years, suddenly ships an update — this is a classic hijack pattern)

---

## 2. Read the changelog, with suspicion

- [ ] Find the changelog / release notes (GitHub releases, CHANGELOG.md, npm description)
- [ ] Every item in the changelog should map to a commit you can read
- [ ] Missing changelog or "various improvements" → **investigate the diff directly**
- [ ] Changelog mentions new hooks, new tools, new network endpoints, new permissions? → **deep-audit those specifically**

---

## 3. Diff the actual code

For plugins:
```
npm pack <package>@<old-version>
npm pack <package>@<new-version>
diff -r <old-dir> <new-dir>
```

For skills (ClawHub or npm):
```
openclaw skills diff <slug>@<old> <slug>@<new>
```
If the CLI doesn't have a `diff` command, fetch both and `diff -r`.

Things to look for in the diff:

- [ ] New `postinstall` / `preinstall` scripts? → **STOP**
- [ ] New dependencies? Check each: `npm view <new-dep>`. Typosquat? New maintainer? → investigate
- [ ] Dependency version bumps that aren't pinned (`^` or `~`) — anything that could pull a subsequent malicious update
- [ ] New `before_*` / `*_persist` / `before_tool_call` hooks?
- [ ] New outbound URLs in any `fetch`, `http.request`, `axios`, `node-fetch`, etc.
- [ ] New `child_process` / `spawn` / `exec` calls?
- [ ] New filesystem access outside the plugin's own directory?
- [ ] New encoded blobs (base64 strings > 100 chars, hex strings, zero-width Unicode)
- [ ] Changes to `package.json` `bin` entries (new globals landing in PATH)

---

## 4. Inspect in isolation before enabling

- [ ] Install to a test gateway first if possible (`openclaw --profile test ...`)
- [ ] `openclaw plugins inspect <id>` — registered tools + hooks match the changelog?
- [ ] Any hook that wasn't there before needs a reason you can articulate, not "probably fine"

---

## 5. Re-run the install audit

Treat the upgrade like a new install for the quick audit:

- [ ] `openclaw security audit --deep --json > /tmp/pre-upgrade.json` (before)
- [ ] Upgrade the plugin/skill
- [ ] `openclaw security audit --deep --json > /tmp/post-upgrade.json` (after)
- [ ] `diff /tmp/pre-upgrade.json /tmp/post-upgrade.json` — new findings?
- [ ] Any new critical finding → **roll back immediately** (`openclaw plugins install <package>@<old-version>`)

---

## 6. First-run test

- [ ] Fresh session with the upgraded plugin/skill
- [ ] Run your typical invocation
- [ ] Check the session transcript — same tool calls, same outbound URLs, same behavior?
- [ ] Tail `~/.openclaw/logs/commands.log` during the test — nothing unexpected?

---

## 7. Document

- [ ] DESIGN-LOG.md §7 — append a decision-log entry:
```
### YYYY-MM-DD — upgraded <id> from <old> to <new>
- Changelog: <summary>
- Audit diff: clean / findings: <...>
- Rollback: `openclaw plugins install <package>@<old-version>`
```

---

## Red flags — do NOT upgrade

- **Author / maintainer changed** between the old and new version
- **postinstall / preinstall script** appeared that wasn't there before
- **Unsigned / unpinned** dependency added
- **New network endpoints** that aren't justified by the changelog
- **Changelog missing** or says nothing useful for a non-patch bump
- **Published very recently** (< 24 h) without an obvious urgent security fix
- **`openclaw security audit --deep` shows new critical findings** after upgrade

If any of these → stay on the pinned old version and file an issue upstream. If the old version has a known security problem of its own, that's an incident — see `incident-response.md`.

---

## See also

- `pre-install.md` — one-time first-install audit (much of which applies here too)
- `post-install-monitoring.md` — ongoing monitoring after any install
- `quarterly-reaudit.md` — scheduled re-audit
- `incident-response.md` — when something is wrong
