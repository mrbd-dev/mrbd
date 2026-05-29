---
"@mrbd/auth": patch
---

Polish the glasses sign-in UI. `MrbdSignInScreen` now displays the pairing code in dash-separated groups of three (e.g. `A1B-2C3`) to match how mrbd.link formats it. `MrbdOtpNumpad` now handles D-pad Up/Down to move a full row across the 3-column grid (and Left/Right by one) instead of inheriting the app-level linear navigation that made every arrow move sideways.
