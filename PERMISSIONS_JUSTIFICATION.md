# Permission Justification — YouTube Focus Mode

Single purpose: **let the user strip YouTube down to search + video and run optional timed focus sessions.** Every permission below is the minimum required for that purpose.

## `permissions`
| Permission | Why it is needed | What would break without it |
|------------|------------------|-----------------------------|
| `storage`  | Persist the user's Focus Mode on/off state and Timed Lock settings (duration, end time) across page loads and browser restarts. Uses `chrome.storage` (local/sync), no remote server. | Settings would reset on every navigation; Timed Lock could not survive a page reload. |

## `host_permissions`
| Host | Why it is needed | Scope |
|------|------------------|-------|
| `https://www.youtube.com/*` | The content script runs only on YouTube to hide distracting surfaces (feed, comments, related, Shorts, Explore, Trending) and render the focus state. | Limited to youtube.com over HTTPS. No other sites. |

## Not requested (deliberately)
- ❌ `tabs`, `<all_urls>`, `webNavigation`, `scripting` (host-scoped content script suffices)
- ❌ `cookies`, `history`, `bookmarks`, `downloads`
- ❌ No remote code, no `eval`, no externally hosted scripts (MV3-compliant; CSP default).

## Data handling
No data leaves the device. Only user preference flags are stored via `chrome.storage`. See [PRIVACY.md](PRIVACY.md).
