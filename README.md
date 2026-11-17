# Frenzy Art Studio

A responsive, browser-based pixel art editor built with **vanilla HTML, CSS, and JavaScript**. Draw retro-style artwork one pixel at a time, use a bucket fill to colour connected areas, and export your finished canvas as a PNG — no build tools, frameworks, or dependencies required.

## Features

- **Pixel drawing:** Paint individual cells or drag to draw across the grid.
- **Eraser:** Remove pixels and return them to transparency.
- **Bucket fill:** Flood-fill a connected region with the selected colour.
- **Eyedropper:** Pick an existing colour directly from the artwork.
- **Custom colours:** Use the native colour picker or enter a HEX value, then save colours to the quick palette.
- **Adjustable canvas:** Set width and height independently from 4 to 64 pixels. Resizing preserves the artwork that still fits, anchored at the top-left.
- **Undo and redo:** Step backwards and forwards through recent edits (up to 60 history states).
- **PNG export:** Export at 24× scale per artwork pixel with crisp edges. Choose a transparent or white background.
- **Responsive controls:** Pointer Events support mouse, pen, and touch input.
- **Keyboard shortcuts:** Switch tools and undo/redo without reaching for the toolbar.
- **Grid visibility:** Toggle pixel boundary lines while you work.

## Run locally

This is a static site. No installation or compilation is needed.

1. Download or clone this repository.
2. Open `index.html` in a modern browser.

For a local development server, run one of these commands from the project directory:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Draw | Select Pencil and drag | `B` |
| Erase | Select Eraser and drag | `E` |
| Fill connected area | Select Fill and tap/click a pixel | `G` |
| Pick a colour | Select Pick and tap/click a painted pixel | `I` |
| Undo | Click Undo | `Ctrl/⌘ + Z` |
| Redo | Click Redo | `Ctrl/⌘ + Shift + Z` or `Ctrl/⌘ + Y` |
| Export | Click Export PNG | — |

## Project structure

```text
Frenzy-Art-Studio/
├── index.html    # App layout and accessible controls
├── styles.css    # Responsive studio styling
├── app.js        # Pixel grid, tools, history, and PNG export
├── README.md     # Project documentation
├── LICENSE       # MIT licence
└── .gitignore    # Common local/editor artefacts
```

## Browser support

Designed for current versions of Chrome, Edge, Firefox, and Safari. PNG export uses the HTML Canvas API and `HTMLCanvasElement.toBlob()`.

## Privacy

The editor runs locally in your browser. It does not send artwork or colour data to a server. Artwork is kept in the current page session; refresh or close the tab to start over.

## Licence

This project is available under the MIT Licence. See [LICENSE](LICENSE).
