# Privacy policy: BrowseLatch

Effective date: September 27, 2026.

BrowseLatch is a browser extension for Microsoft Edge and Google Chrome that either allows only listed websites or blocks listed websites, depending on the mode you select. It was previously called Only Listed Websites.

## Information used locally
The active list and any active blocked subdomain exceptions are stored in the browser's local extension rules. The inactive mode's list, saved exceptions, each allowed website's Supporting content choice, any original allowed entries saved during migration, a salted password verifier, and failed-attempt counters are stored locally in the browser profile. The password itself is never stored. When a website is blocked, the local blocked page displays its hostname. The denied address, including its path and query, is briefly carried in the local blocked-page URL fragment so the extension can return to that page after a parent allows it; the fragment is removed as the page loads. Clicking the parent settings button keeps that address and tab ID temporarily in browser session storage. It is cleared after the requested page opens or the parent locks settings, and it is ignored after five minutes. It is not a browsing-history log. The extension does not read webpage contents. A 15-minute access choice stores the website domain and expiry time locally until it ends. A one-visit choice keeps the domain and blocked tab ID in browser session storage until that tab leaves the site, closes, or the session ends. These choices are not included in backups.

## Collection and sharing
The extension does not send your website lists, browsing activity or personal information to the publisher or third parties. It contains no analytics, advertising, remote code, account system or external service integration. Websites you visit and your browser operate under their own privacy practices.

## Storage and control
You can change or clear either list and choose separately for each allowed website whether it may load supporting content from unlisted domains in extension settings. An empty Allowlist blocks websites by default; an empty Blocklist permits them. Uninstalling the extension removes its browser-managed dynamic rules and local extension storage. The extension does not synchronize settings through a publisher service.

You can download a local JSON backup of your website rules and import it into another browser profile. The file contains both website lists, blocked subdomain exceptions, the active mode, and the per-website supporting-content choices. It does not contain your parent password, password verifier, or browsing history. Keep the file private because it includes website names. Importing requires parent access on the destination profile and does not change that profile's password.

## Permissions
Network-rule permissions let the browser enforce the selected mode. Access to HTTP and HTTPS websites permits blocked web navigations to be redirected to a local explanatory page. The alarms permission removes timed access. The webNavigation permission observes main-frame navigation in the one-visit tab so that access ends when that tab leaves the website; no navigation history is stored or sent anywhere.

## Contact
Publisher: Vikas Kumar Gupta
Support: vikasgupta.net@live.com
