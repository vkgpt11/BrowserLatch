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

- **Allowlist** mode permits listed domains and blocks other websites. A blocked subdomain exception can keep part of an allowed website closed. **Blocklist** mode blocks listed domains and permits other websites. Only one mode is active at a time. Each mode remembers its own list when you switch.
- A listed domain includes its subdomains, on all ports and paths. For example, `example.com` covers `www.example.com` but never `example.com.attacker.test` or `notexample.com`.
- Enter domains only, not URLs, paths, ports or wildcard patterns. Internationalized domains are converted to ASCII (punycode).
- Public suffixes such as `com`, `co.nz`, and `github.io` are rejected using a complete Public Suffix List bundled with the extension. The list works offline; update the bundled snapshot with `node scripts/update-psl.mjs` before future releases.
- The settings list shows the active mode's domains. Search, select, or remove an entry; changes save immediately and the last change can be undone. In Allowlist mode, **Block part of an allowed website** lets you add or remove child domains while keeping their parent website open. It shows a simple empty message until an entry is added, and offers Undo beside exception changes. **Check a website** explains whether a domain is allowed or blocked under the current list and exceptions.
- Search saved domains as you type. Clicking the toolbar button on a website opens settings with a **Current website** shortcut. Once a parent unlocks settings, the button adds that website to the active allowed or blocked list with one click, or selects an existing rule that already covers it. The last list change can be undone. The clicked domain is kept in memory only until settings are unlocked and shown.
- In Allowlist mode, unlisted HTTP/HTTPS page navigations redirect to a local blocked page, and unlisted embedded frames remain blocked. In Blocklist mode, listed websites redirect to that page and other websites can open. The blocked page shows the denied hostname and offers a shortcut to check it in parent settings. If a parent allows the site, the blocked tab reopens the originally requested page, including its path and query. The full address is kept only for this return flow and is cleared from the blocked page's address bar when it loads.
- In Allowlist mode, **Content from other websites** is a parent setting. It starts in compatibility mode: a listed page can load scripts, images, video streams and API requests from other domains, which helps sites such as YouTube work. Turn the setting off to block those unlisted requests. This setting does not permit navigating to unlisted domains as websites.
- Unlisted embedded frames stay blocked with either Supporting content setting. If an allowed site needs a third-party sign-in or payment frame, add the provider domain to the Allowlist. This also permits visiting that provider directly, so review it before adding it. **Check a website** reports top-level navigation, not every supporting request or frame.
- An empty Allowlist blocks all websites; an empty Blocklist allows all websites. Rules work without a running background worker, persist across restarts, and update atomically. Failed saves retain the previous rules.
- If an older version contains both allowed and blocked entries, settings ask you to choose one active mode. The old lists are retained locally. When Allowlist is chosen, an allowed parent stays open and its previously blocked child becomes a blocked exception. An allowed entry that is itself blocked, or falls beneath a blocked parent, stays closed.
- The password is salted and processed locally with PBKDF2-SHA-256. Settings hide after five minutes without parent activity, and repeated incorrect attempts trigger increasing delays.
- The settings and blocked page have a language selector for English, Hindi, Spanish, French, Portuguese, Arabic, Bengali, Russian, Simplified Chinese, and Indonesian. The selected language is stored locally and shared between regular and private windows; changing it does not change website rules or the parent password. Arabic uses a right-to-left layout. An unsupported browser language falls back to English.
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
6. Enter `https://example.com/path`, `*.com`, `com`, or `co.nz`: adding must fail and retain the old rules.
7. Check allowed and blocked outcomes with **Check a website**. On a website, click the extension toolbar button and unlock settings. Verify the **Current website** button adds an unlisted domain to the active list or selects an existing covering rule; undo an addition. Visit a blocked address with a path and query, select **Open parent settings**, and allow that website. The blocked tab should return to the same address after the rule saves.
8. In Allowlist mode, add `example.com` and then add `kids.example.com` as a blocked exception. The parent and `www.example.com` should open; `kids.example.com` and its children should be blocked. Switch modes and back to confirm the exception remains.
9. With Supporting content on, a request for an unlisted image or API domain from `example.com` should be allowed, while an unlisted embedded frame stays blocked. Turn Supporting content off: the unlisted request should now be blocked, and `example.com` resources should still load. Switch modes and back to confirm the setting remains off.

Run policy, worker, and settings-page unit tests with `npm ci` followed by `npm test`.

Build the store upload package with `python build.py`. The ZIP is written to `dist/` with only runtime files. Generate icons from the editable SVG with `npm run icons`. GitHub Actions runs the tests and uploads the ZIP as a workflow artifact.

References: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading, https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest, and https://publicsuffix.org/list/ . The bundled list is licensed under the Mozilla Public License 2.0; see `PSL-LICENSE`.
