---
"@mrbd/react": minor
---

Add swipe-to-type to the head keyboard. A bare pinch-and-hold (`Unidentified`) now starts a swipe word: the wearer glides the reticle across the letters and pinches (`Enter`) to finish, and the traced path is decoded into the most likely word and inserted with a trailing space. Alternative matches appear in the suggestion bar — swipe left/right to cycle them in place, or swipe down to pick from the word menu; back or another hold mid-swipe cancels.

Decoding is a compact, dependency-free SHARK2-style template matcher (scale-invariant shape channel + absolute location channel + endpoint weighting, with start/end pruning) that runs entirely on-device. Exposes `createMrbdSwipeDecoder(options?)` and a `swipeDecoder` prop on `MrbdKeyboardProvider` / `MrbdHeadKeyboard` to customize the vocabulary/tuning or disable swiping (`swipeDecoder={null}`).

Also expands `MRBD_DEFAULT_WORDLIST` to a ~2000-word frequency-ordered list (used by both predictive completion and swipe decoding) for much better coverage.
