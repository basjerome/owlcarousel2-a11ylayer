# Owl Carousel v2 Accessibility Layer

Accessibility layer for [Owl Carousel v2](https://github.com/smashingboxes/OwlCarousel2).

## Authorship

Written by [Geoffrey Roberts](mailto:g.roberts@blackicemedia.com)

## License

MIT

## Features

* W3C carousel pattern on the root element (`role="region"`, `aria-roledescription`, `aria-label`)
* W3C slide pattern on stage items (`role="group"`, `aria-roledescription`, `aria-hidden`, `aria-label` on the active slide)
* Keyboard control (arrow keys for previous/next, Enter on nav and dots)
* Focusable carousel, nav buttons and dots
* Inactive slide contents are taken out of the tab order
* Nav `disabled` state synced from Owl’s `.disabled` class, with focus moved away from disabled buttons
* Dots exposed as a list (`role="list"` / `role="listitem"`) with `aria-current` on the active indicator
* Autoplay pauses while the carousel has focus (`aria-live="polite"`)
* Attributes stay in sync after refresh, resize, slide change, and DOM rebuilds of the controls

Default accessible names are in French (`Diaporama`, `diaporama`, `diapositive`, `N sur M`). Existing `aria-label` or `aria-labelledby` on the carousel root are left unchanged.

## Requirements

* jQuery
* Owl Carousel v2

## Installation

In the `<head>` of your page, after jQuery and Owl Carousel, add:

```html
<script type="text/javascript" src="owlcarousel2-a11ylayer.js"></script>
```

## Usage

Once the script is loaded, it registers as an Owl Carousel plugin and is applied automatically when you instantiate a carousel. If the carousel is already initialized when the script runs, attributes are synced on document ready.

## Changelog

### v0.2.2

Added WAI-ARIA roles, states and properties following the W3C carousel pattern (root region, slide groups, nav/dots), and keep them in sync when Owl rebuilds controls.

### v0.2.1

Made controls focusable, fixed focus behaviour.

### v0.2

Fixed a bunch of nasty bugs, brought up to date with latest OCv2 API.

### v0.1

Initial commit
