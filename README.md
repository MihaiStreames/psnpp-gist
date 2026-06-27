# <img src="https://github.com/MihaiStreames/psnpp-gist/raw/master/assets/icon.png?raw=true" alt="psnpp-gist icon" height="28" width="28"> psnpp-gist

`psnpp-gist` is a companion userscript for [PSNP+](https://psnp-plus.huskycode.dev/) that syncs your game lists to GitHub Gists, keeping them in sync across browsers and devices.

[![Release](https://img.shields.io/github/v/release/MihaiStreames/psnpp-gist?label=release)](https://github.com/MihaiStreames/psnpp-gist/releases/latest)
[![License](https://img.shields.io/github/license/MihaiStreames/psnpp-gist?label=license)](LICENSE)

## Install

> [!IMPORTANT]
> [PSNP+](https://psnp-plus.huskycode.dev/) must be installed first.

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. **[Click here to install the script](https://github.com/MihaiStreames/psnpp-gist/releases/latest/download/psnpp-gist-sync.user.js)**
3. Confirm the install prompt

> [!WARNING]
> **GitHub Releases is the only official source.** Each release includes a `.sha256` file. Verify it matches before trusting the script:
>
> ```sh
> sha256sum psnpp-gist-sync.user.js
> cat psnpp-gist-sync.user.js.sha256
> ```

## Setup

You need a GitHub account. **GitHub Gist is the only storage option for now.**

### 1. Create a personal access token

GitHub -> Settings -> Developer settings -> Personal access tokens -> Tokens (classic) -> Generate new token -> Generate new token (classic). **Enable only the `gist` scope.** Copy it.

### 2. Create a Gist

Create a new (preferably **secret**) Gist at [gist.github.com](https://gist.github.com). The ID is the long hash at the end of the URL, after your username.

### 3. Configure the script

Open PSNP+ settings. You should see the **Gist Sync** section at the bottom:

1. Paste your token in the **GitHub PAT** field
2. Paste the Gist ID in the **Add Gist** field and click the download button
3. Check the lists you want to sync, then save

That's it!

![Gist Sync settings panel](assets/settings.png)

Each list gets its own file in the Gist (`{uuid}.json`), plus a `psnpp-manifest.json` that maps IDs to names. You can add multiple Gists if you need to.

## Usage

On the game lists page a cloud button appears next to the delete button:

![Sync status button](assets/button.png)

| State      | Meaning                   |
| ---------- | ------------------------- |
| Spinning   | Sync in progress          |
| Blue cloud | Up to date                |
| Red circle | Error -- hover to see why |

Synced lists get a ☁ suffix in the dropdown:

![Dropdown with cloud icon](assets/dropdown-icon.png)

Changes push automatically after you save. On page load, the script pulls the latest from your Gist. Switching back to the tab re-pulls if the Gist was updated elsewhere.

Sync activity is logged to the browser console under `[psnpp-gist]`.

### Upgrading from `v0.1.x`

`v0.2.0` changed the storage format. After updating, make sure to add your Gist back in settings. Your lists will still be there, the config needs a refresh.

## Bugs

Found a bug? Open an issue on [GitHub](https://github.com/MihaiStreames/psnpp-gist/issues)! Including any `[psnpp-gist]` errors from the browser console will help me fix it faster.

## Acknowledgments

Built on top of [PSNP+](https://psnp-plus.huskycode.dev/) by [huskydev](https://forum.psnprofiles.com/profile/229685-husky/). None of this would work without it!

## License

MIT. See [LICENSE](LICENSE).

<div align="center">
  Made with ❤️
</div>
