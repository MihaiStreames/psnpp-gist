# Changelog

All notable changes to `psnpp-gist`.

## [0.2.1] - 2026-06-27

### Fixed

- Cloud icon now hides on untracked lists (issue #10)

## [0.2.0] - 2026-06-26

### Added

- Multiple Gist support -- sync different lists to different Gists
- Add and remove Gists with a Fetch button in settings
- Pick which lists to sync per Gist with checkboxes
- Auto re-pull when switching back to the tab if the Gist was updated
- Better error messages for expired tokens, missing Gists, and permission issues

### Changed

- Each list is now stored as its own file in the Gist instead of one big JSON blob
- Sync is per-list instead of all-or-nothing

### Removed

- Old single-Gist setup: **re-add your Gist in settings after updating**

## [0.1.1] - 2026-06-22

### Changed

- Synced lists setting now uses checkboxes instead of a comma-separated text field

### Fixed

- Gist ID field now validates the format and highlights invalid input
- Corrupted localStorage data no longer crashes the extension on load

## [0.1.0] - 2026-05-19

### Added

- Sync selected PSNP+ game lists to a private GitHub Gist
- Settings panel under PSNP+ settings: GitHub PAT, Gist ID, list names to sync
- Cloud icon (☁) on synced lists in the dropdown
- Sync status button on the game lists page (syncing / synced / error)
- Automatic initial push if the Gist file doesn't exist yet
- Warning if your token has more than just the `gist` scope
- Auto-update support via Tampermonkey
