---
title: Manifest And Icons
description: "Add app metadata and PNG icons that work in the glasses runtime."
order: 8
---
# Manifest And Icons

Use a web app manifest and high-resolution PNG icons.

```html
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/icons/icon-192.png" sizes="192x192">
```

Example manifest:

```json
{
  "name": "My MRBD App",
  "short_name": "My MRBD App",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    }
  ],
  "background_color": "#000000",
  "theme_color": "#000000",
  "display": "standalone"
}
```

Do not rely on SVG app icons. Use PNGs larger than 52x52 or simple Unicode symbols.
