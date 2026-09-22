# BrowseLatch — Microsoft Edge website rules

[Privacy policy](PRIVACY.md) · Support: vikasgupta.net@live.com

For parental tamper resistance, see [administrator setup](ADMIN_SETUP.md).

An earlier version is published in Microsoft Edge Add-ons under the name Only Listed Websites. BrowseLatch is the next update; automated tests do not replace live Edge installation and network checks below.

## Install

1. Open `edge://extensions` in desktop Microsoft Edge.
2. Enable **Developer mode**, select **Load unpacked**, and choose this folder (the one containing `manifest.json`).
3. The settings page opens automatically. Create a parent password, choose **Allowlist** or **Blocklist**, then add domains. The initial empty Allowlist blocks all websites.
4. Use the extension toolbar button or its **Extension options** to edit the list later.

If using the ZIP, extract it first and select the extracted folder containing manifest.json. Keep that folder in place while the extension is installed.

## Behavior

- **Allowlist** mode permits listed domains and blocks other websites. **Blocklist** mode blocks listed domains and permits other websites. Only one mode is active at a time. Each mode remembers its own list when you switch.
- A listed domain includes its subdomains, on all ports and paths. For example, `example.com` covers `www.example.com` but never `example.com.attacker.test` or `notexample.com`.
- Enter domains only, not URLs, paths, ports or wildcard patterns. Internationalized domains are converted to ASCII (punycode).
- The settings list shows the active mode's domains. Search, select, or remove an entry; changes save immediately and the last change can be undone. **Check a website** explains whether a domain is allowed or blocked under the current list.
- Search saved domains as you type. Clicking the toolbar button on a website opens settings with an **Add this website** shortcut; you still need the parent password to change the rule. The clicked domain is kept in memory only until settings are unlocked and shown.
- In Allowlist mode, unlisted HTTP/HTTPS page navigations redirect to a local blocked page, and unlisted embedded frames remain blocked. In Blocklist mode, listed websites redirect to that page and other websites can open.
- In Allowlist mode, a listed page can load supporting scripts, images, video streams and API requests from other domains. This makes sites such as YouTube work without separately listing each supporting domain. It does not allow navigating to those domains as websites.
- An empty Allowlist blocks all websites; an empty Blocklist allows all websites. Rules work without a running background worker, persist across restarts, and update atomically. Failed saves retain the previous rules.
- If an older version contains both allowed and blocked entries, settings ask you to choose one active mode. The old lists are retained locally. An allowed parent with a previously blocked child is withheld from the new Allowlist so the child does not become accessible by accident.
- The password is salted and processed locally with PBKDF2-SHA-256. Settings hide after five minutes without parent activity, and repeated incorrect attempts trigger increasing delays.
- There is no password recovery. Uninstalling and reinstalling resets the password and allowlist.
- No analytics, external services, sync, or collection of browsing history. Rules are stored locally by Edge.

## Scope and limitations

The password makes casual changes harder, but this is not tamper-proof parental control or a system firewall. Anyone who can manage Edge extensions can disable or remove it, clear the profile, or use another browser/profile. Use a child Windows account with Microsoft Family Safety or administrator-enforced Edge policies when removal must be prevented. Edge internal pages, other extension pages, local files and browser-protected traffic are outside its web-blocking scope. InPrivate requires enabling **Allow in InPrivate** on the extension details page. Existing loaded/cached content and service-worker-generated responses may remain visible; close or reload existing tabs after installation or list changes. Other installed extensions can also affect request handling.

## Verify in Edge

1. In empty Allowlist mode, visit `https://example.com`: expect the blocked page.
2. Add `example.com`; revisit it: expect it to load. Visit `https://www.wikipedia.org`: expect blocking.
3. Remove `example.com`: expect it to be blocked again. Use **Undo** and verify it opens again.
4. Switch to empty Blocklist mode: both example.com and wikipedia.org should open. Add `example.com`: it should be blocked while wikipedia.org stays open.
5. Switch back to Allowlist and verify its previous list is restored. Restart Edge and repeat.
6. Enter `https://example.com/path`, `*.com`, or `com`: adding must fail and retain the old rules.
7. Check allowed and blocked outcomes with **Check a website**. On a website, click the extension toolbar button, unlock settings, and verify the **Current website** shortcut fills or selects its domain.

Run policy, worker, and settings-page unit tests with `npm ci` followed by `npm test`.

Build the store upload package with `python build.py`. The ZIP is written to `dist/` with only runtime files. Generate icons from the editable SVG with `npm run icons`. GitHub Actions runs the tests and uploads the ZIP as a workflow artifact.

References: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading and https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
