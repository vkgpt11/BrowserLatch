# BrowseLatch — Microsoft Edge website allowlist

[Privacy policy](PRIVACY.md) · Support: vikasgupta.net@live.com

For parental tamper resistance, see [administrator setup](ADMIN_SETUP.md).

An earlier version is published in Microsoft Edge Add-ons under the name Only Listed Websites. BrowseLatch is the next update; automated tests do not replace live Edge installation and network checks below.

## Install

1. Open `edge://extensions` in desktop Microsoft Edge.
2. Enable **Developer mode**, select **Load unpacked**, and choose this folder (the one containing `manifest.json`).
3. The settings page opens automatically. Create a parent password, enter a domain, choose its **Allow this website** checkbox, and click **Add website**. The initial empty list blocks all websites.
4. Use the extension toolbar button or its **Extension options** to edit the list later.

If using the ZIP, extract it first and select the extracted folder containing manifest.json. Keep that folder in place while the extension is installed.

## Behavior

- A listed domain permits that domain and its subdomains, on all ports and paths. For example, `example.com` allows `www.example.com` but never `example.com.attacker.test` or `notexample.com`.
- Enter domains only, not URLs, paths, ports or wildcard patterns. Internationalized domains are converted to ASCII (punycode).
- The settings list shows allowed and explicitly blocked domains. Filter it with **Show**, select an entry, then change its checkbox or remove it. Changes save immediately.
- Search saved domains as you type. Clicking the toolbar button on a website opens settings with an **Add this website** shortcut; you still need the parent password to change the rule. The clicked domain is kept in memory only until settings are unlocked and shown.
- Explicitly blocked domains override allowed parent domains. For example, you can allow `example.com` but block `kids.example.com`. Unlisted websites are blocked by default, so you do not need to add every unwanted website individually.
- All unlisted HTTP/HTTPS page navigations redirect to a local blocked page. Unlisted embedded frames remain blocked.
- A listed page can load supporting scripts, images, video streams and API requests from other domains. This makes sites such as YouTube work without separately listing each supporting domain. It does not allow navigating to those domains as websites.
- An empty allowed list denies all websites. Rules work without a running background worker, persist across restarts, and update atomically. Failed saves retain the previous rules.
- The password is salted and processed locally with PBKDF2-SHA-256. Settings automatically relock after five minutes, and repeated incorrect attempts trigger increasing delays.
- There is no password recovery. Uninstalling and reinstalling resets the password and allowlist.
- No analytics, external services, sync, or collection of browsing history. Rules are stored locally by Edge.

## Scope and limitations

The password makes casual changes harder, but this is not tamper-proof parental control or a system firewall. Anyone who can manage Edge extensions can disable or remove it, clear the profile, or use another browser/profile. Use a child Windows account with Microsoft Family Safety or administrator-enforced Edge policies when removal must be prevented. Edge internal pages, other extension pages, local files and browser-protected traffic are outside its web-blocking scope. InPrivate requires enabling **Allow in InPrivate** on the extension details page. Existing loaded/cached content and service-worker-generated responses may remain visible; close or reload existing tabs after installation or list changes. Other installed extensions can also affect request handling.

## Verify in Edge

1. With an empty list, visit `https://example.com`: expect the blocked page.
2. Add `example.com` with **Allow this website** checked; revisit it: expect it to load. Visit `https://www.wikipedia.org`: expect blocking.
3. Add `www.example.com` with the checkbox unchecked; verify that it is blocked despite its allowed parent domain. Flip the selected entry's checkbox and verify that it loads again.
4. Remove `example.com` and revisit it: expect blocking. Restart Edge and repeat.
5. Enter `https://example.com/path` or `*.com`: adding must fail and retain the old rules.
6. Confirm a listed site such as youtube.com can load video resources, while direct navigation to an unlisted supporting domain is blocked.
7. Search for a saved domain and verify the match count and filter. On an allowed website, click the extension toolbar button, unlock settings, and verify the **Current website** shortcut fills or selects that domain.

Run policy, worker, and settings-page unit tests with `npm ci` followed by `npm test`.

Build the store upload package with `python build.py`. The ZIP is written to `dist/` with only runtime files. Generate icons from the editable SVG with `npm run icons`. GitHub Actions runs the tests and uploads the ZIP as a workflow artifact.

References: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading and https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
