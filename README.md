# BrowseLatch — website rules for Microsoft Edge and Chrome

[Privacy policy](PRIVACY.md) · Support: vikasgupta.net@live.com

For parental tamper resistance, see [administrator setup](ADMIN_SETUP.md).

BrowseLatch is available in Microsoft Edge Add-ons. The same extension package can be submitted to the Chrome Web Store. Automated tests do not replace live browser installation and network checks below.

## Install

1. Open `edge://extensions` in desktop Microsoft Edge.
2. Enable **Developer mode**, select **Load unpacked**, and choose this folder (the one containing `manifest.json`).
3. The settings page opens automatically. Create a parent password, then follow the two-step guide: choose **Only open websites I choose** or **Block websites I choose**, and optionally add the first website. The guide explains what an empty list does before you save it.
4. Use the extension toolbar button or its **Extension options** to edit the list later.

If using the ZIP, extract it first and select the extracted folder containing manifest.json. Keep that folder in place while the extension is installed.

## Behavior

- **Allowlist** mode permits listed domains and blocks other websites. A blocked subdomain exception can keep part of an allowed website closed. **Blocklist** mode blocks listed domains and permits other websites. Only one mode is active at a time. Each mode remembers its own list when you switch.
- The short first-install guide appears only on a new installation, after the parent password is created. It saves the chosen mode and first website together. Existing users keep their settings screen and rules when updating.
- A listed domain includes its subdomains, on all ports and paths. For example, `example.com` covers `www.example.com` but never `example.com.attacker.test` or `notexample.com`.
- Enter domains only, not URLs, paths, ports or wildcard patterns. Internationalized domains are converted to ASCII (punycode).
- Public suffixes such as `com`, `co.nz`, and `github.io` are rejected using a complete Public Suffix List bundled with the extension. The list works offline; update the bundled snapshot with `node scripts/update-psl.mjs` before future releases.
- The settings list shows the active mode's domains. Search, select, or remove an entry; changes save immediately and the last change can be undone. In Allowlist mode, **Block part of an allowed website** lets you add or remove child domains while keeping their parent website open. It shows a simple empty message until an entry is added, and offers Undo beside exception changes. **Why isn't this website working?** checks the main page and, if you know another domain involved, an embedded sign-in or payment page or supporting content. It offers the relevant rule change. It checks saved rules; it cannot discover hidden network domains or prove that BrowseLatch caused a failure.
- Search saved domains as you type. Clicking the toolbar button on a website opens settings with a **Current website** shortcut. Once a parent unlocks settings, the button adds that website to the active allowed or blocked list with one click, or selects an existing rule that already covers it. The last list change can be undone. The clicked domain is kept in memory only until settings are unlocked and shown.
- In Allowlist mode, unlisted HTTP/HTTPS page navigations redirect to a local blocked page, and unlisted embedded frames remain blocked. In Blocklist mode, listed websites redirect to that page and other websites can open. The blocked page shows the denied hostname and offers a shortcut to check it in parent settings. If a parent allows the site, the blocked tab reopens the originally requested page, including its path and query. The full address is kept only for this return flow and is cleared from the blocked page's address bar when it loads.
- In Allowlist mode, **Content from other websites** is chosen for each allowed website. It is on by default for newly added websites: that website and its subdomains can load scripts, images, video streams and API requests from unlisted domains, which helps sites such as YouTube work. Turn it off for a selected website to block its unlisted supporting requests without changing other allowed websites. A more specific listed subdomain has its own choice. Updating from the old global setting preserves each existing website's behavior.
- This choice does not permit navigating to unlisted domains as websites. Unlisted embedded frames stay blocked regardless of the supporting-content choice. If an allowed site needs a third-party sign-in or payment frame, add the provider domain to the Allowlist. This also permits visiting that provider directly, so review it before adding it. The diagnostic checks a provider's rules when you enter its domain; it does not monitor or log requests.
- An empty Allowlist blocks all websites; an empty Blocklist allows all websites. Rules work without a running background worker, persist across restarts, and update atomically. Failed saves retain the previous rules.
- If an older version contains both allowed and blocked entries, settings ask you to choose one active mode. The old lists are retained locally. When Allowlist is chosen, an allowed parent stays open and its previously blocked child becomes a blocked exception. An allowed entry that is itself blocked, or falls beneath a blocked parent, stays closed.
- The password is salted and processed locally with PBKDF2-SHA-256. Settings hide after five minutes without parent activity, and repeated incorrect attempts trigger increasing delays.
- **Back up website rules** downloads a JSON file with the active mode, both website lists, blocked subdomain exceptions, and the per-website supporting-content choices. It never includes the password, its verifier, or browsing history. Import accepts both the new backup format and older backups with one global content setting; it validates the whole file and shows its rule counts before replacing the browser's rules. On another browser profile, create a new parent password first; importing leaves that browser's password unchanged. Keep the file private because it contains website names. Reload open tabs after importing.
- The settings and blocked page have a language selector for English, Hindi, Spanish, French, Portuguese, Arabic, Bengali, Russian, Simplified Chinese, and Indonesian. The selected language is stored locally and shared between regular and private windows; changing it does not change website rules or the parent password. Arabic uses a right-to-left layout. An unsupported browser language falls back to English.
- There is no password recovery. Uninstalling and reinstalling resets the password and locally stored rules unless you have exported a backup.
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
7. Check allowed and blocked outcomes with **Why isn't this website working?** Test a blocked main website, an unlisted sign-in provider, and an unlisted content domain with the content setting on and off. Confirm that the suggested action updates the result. On a website, click the extension toolbar button and unlock settings. Verify the **Current website** button adds an unlisted domain to the active list or selects an existing covering rule; undo an addition. Visit a blocked address with a path and query, select **Open parent settings**, and allow that website. The blocked tab should return to the same address after the rule saves.
8. In Allowlist mode, add `example.com` and then add `kids.example.com` as a blocked exception. The parent and `www.example.com` should open; `kids.example.com` and its children should be blocked. Switch modes and back to confirm the exception remains.
9. Allow `example.com` and `youtube.com`. Turn outside content off for `example.com` while leaving it on for `youtube.com`. An unlisted image or API domain requested from `example.com` should be blocked, while the same kind of request from `youtube.com` should be allowed. Listed destinations still load from either page, and unlisted embedded frames remain blocked. Switch modes and back to confirm each site's choice remains intact.

Run policy, worker, and settings-page unit tests with `npm ci` followed by `npm test`.

Build the store upload package with `python build.py`. The ZIP is written to `dist/` with only runtime files. Generate icons from the editable SVG with `npm run icons`. GitHub Actions runs the tests and uploads the ZIP as a workflow artifact.

References: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading, https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest, and https://publicsuffix.org/list/ . The bundled list is licensed under the Mozilla Public License 2.0; see `PSL-LICENSE`.
