---
title: Viewport And Layout
description: "Layout rules for the fixed 600x600 wearable display canvas."
order: 3
---
# Viewport And Layout

MRBD web apps should render inside a fixed `600x600` viewport.

Use this viewport tag in ordinary HTML:

```html
<meta name="viewport" content="width=600, initial-scale=1.0, user-scalable=no">
```

For CSS:

```css
html,
body {
  width: 600px;
  height: 600px;
  overflow: hidden;
  background: #000000;
}
```

`#000000` is effectively transparent on the additive display. That is good for the page background, but visible UI surfaces should use dark grays like `#0a0a0f` or `#1c1e21`.

## Recommended rules

- Keep primary content inside the 600x600 canvas.
- Avoid body-level scrolling.
- Keep navigation shallow.
- Leave safe spacing around the edges.
- Use large text: at least 16 px for body text and 20-24 px for primary content.
- Keep interaction targets at least 88 px tall.
