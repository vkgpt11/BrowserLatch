# Only Listed Websites — Microsoft Edge extension

## Install

1. Open `edge://extensions` in desktop Microsoft Edge.
2. Enable **Developer mode**, select **Load unpacked**, and choose this folder (the one containing `manifest.json`).
3. The settings page opens automatically. Enter allowed domains, one per line, and click **Save allowlist**. The initial empty list blocks all websites.
4. Use the extension toolbar button or its **Extension options** to edit the list later.

If using the ZIP, extract it first and select the extracted folder containing manifest.json. Keep that folder in place while the extension is installed.

## Behavior

- A listed domain permits that domain and its subdomains, on all ports and paths. For example, `example.com` allows `www.example.com` but never `example.com.attacker.test` or `notexample.com`.
- Enter domains only, not URLs, paths, ports or wildcard patterns. Internationalized domains are converted to ASCII (punycode).
- All unlisted HTTP/HTTPS page navigations redirect to a local blocked page. Unlisted embedded frames, images, scripts, API requests and other browser-exposed network requests are blocked.
- Third-party dependencies must be explicitly allowed. If a site partly loads or login fails, add the domains it needs. There is no automatic third-party exemption.
- An empty list denies all websites. Rules work without a running background worker, persist across restarts, and update atomically. Failed saves retain the previous rules.
- No analytics, external services, sync, or collection of browsing history. Rules are stored locally by Edge.

## Scope and limitations

This is a personal browser restriction, not tamper-proof parental control or a system firewall. Anyone with access to extension settings can change the list, disable the extension, or use another browser/profile. Edge internal pages, other extension pages, local files and browser-protected traffic are outside its web-blocking scope. InPrivate requires enabling **Allow in InPrivate** on the extension details page. Existing loaded/cached content and service-worker-generated responses may remain visible; close or reload existing tabs after installation or list changes. Other installed extensions can also affect request handling.

## Verify in Edge

1. With an empty list, visit `https://example.com`: expect the blocked page.
2. Save `example.com`; revisit it: expect it to load. Visit `https://www.wikipedia.org`: expect blocking.
3. Add `wikipedia.org`; verify it and its subdomains are allowed.
4. Remove `example.com` and revisit it: expect blocking. Restart Edge and repeat.
5. Enter `https://example.com/path` or `*.com`: saving must fail and retain the old rules.
6. Confirm unlisted images/API hosts are blocked using Edge DevTools Network panel.

Run automated policy and worker tests with `node --test tests/policy.test.mjs`.

References: https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading and https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
