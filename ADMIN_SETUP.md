# Making the restriction harder to bypass

The password protects the allowlist inside the extension. It cannot stop a user who can open Edge extension management from disabling or removing the extension.

For a child's Windows device:

1. Give the child a Standard Windows account and keep the parent account as Administrator.
2. Add the child to Microsoft Family Safety. Under the child's Edge content filters, enable **Only use allowed websites**. Microsoft says unsupported browsers are blocked while web filtering is enabled.
3. After this extension is published, copy its extension ID from its Microsoft Edge Add-ons URL.
4. On a managed Windows device, configure Microsoft Edge's **ExtensionInstallForcelist** with that ID. A force-installed extension cannot be disabled or removed by the user. For Edge Add-ons installations, the ID alone is sufficient.
5. Consider disabling developer tools for the child account through Edge policy if the child is technically capable. Microsoft notes that users with developer tools may alter extension code.

Official guidance:

- https://support.microsoft.com/en-us/family-safety/filter-websites-and-searches-using-microsoft-family-safety
- https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/extensioninstallforcelist
- https://learn.microsoft.com/en-us/deployedge/microsoft-edge-manage-extensions-policies

The store extension ID is not available until Microsoft creates the listing, so the force-install step must be finished after submission.
