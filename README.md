# Owl Carousel v2 Accessibility Layer

Accessibility layer for [Owl Carousel v2](https://github.com/OwlCarousel2/OwlCarousel2). Version 0.3.0.

## Authorship

Written by [Geoffrey Roberts](mailto:g.roberts@blackicemedia.com)

## License

MIT

## Requirements

* jQuery
* Owl Carousel v2

## Features

* Named, focusable previous / next controls (`aria-label`, `tabindex="0"`, `role="button"` when the control is not a native `<button>`)
* Named pagination dots with `aria-current` on the active page
* Carousel exposed as a named `region` (`aria-roledescription="carrousel"`)
* Visible slides described as groups (`n sur total`); off-screen slides get `aria-hidden="true"` and their focusable children are taken out of the tab order
* Keyboard navigation: Left / Right (reversed in RTL), Home / End, Enter and Space on custom controls
* Live region announcing the current slide after a user action
* No forced page scroll on click or slide change
* Autoplay pause / play button (SVG pictogram + `span.sr-only` label), plus pause on focus and when `prefers-reduced-motion` is set

## Installation

In the `<head>` of your page, after jQuery and Owl Carousel, add:

```html
<script type="text/javascript" src="owlcarousel2-a11ylayer.js"></script>
```

The layer registers itself as an Owl plugin and runs automatically when you instantiate the carousel.

## Usage

```javascript
$('.owl-carousel').owlCarousel({
	nav: true,
	dots: true,
	autoplay: true,
	a11yCarouselLabel: 'À la une',
	a11yPrevLabel: 'Diapositive précédente',
	a11yNextLabel: 'Diapositive suivante'
});
```

Existing `aria-label` / `aria-labelledby` values, or a real visible text name, are left as-is. Glyph-only labels (`‹` / `›`) are treated as unnamed and receive the default `aria-label`.

The autoplay toggle (`.owl-a11y-toggle`) needs a `.sr-only` utility in your stylesheet so the text stays available to assistive technologies only. Style `:focus` / `:focus-visible` on `.owl-prev`, `.owl-next`, `.owl-dot` and `.owl-a11y-toggle` in the theme.

### Options

| Option | Default | Description |
| --- | --- | --- |
| `a11yCarouselLabel` | `Carrousel` | Accessible name of the carousel region (a unique suffix is added when the default is kept) |
| `a11yRoleDescription` | `carrousel` | `aria-roledescription` on the root |
| `a11ySlideRoleDescription` | `diapositive` | `aria-roledescription` on each slide |
| `a11ySlideLabel` | `%s sur %s` | Slide name (`current`, `total`) |
| `a11yPrevLabel` | `Diapositive précédente` | Previous button |
| `a11yNextLabel` | `Diapositive suivante` | Next button |
| `a11yDotLabel` | `Aller à la diapositive %s` | Pagination dot |
| `a11yNavLabel` | `Navigation du carrousel` | Previous / next group |
| `a11yDotsLabel` | `Pagination du carrousel` | Dots group |
| `a11yStatusLabel` | `Diapositive %s sur %s` | Live region announcement |
| `a11yPauseLabel` | `Mettre le défilement en pause` | Autoplay pause control |
| `a11yPlayLabel` | `Lancer le défilement` | Autoplay play control |

`%s` placeholders are replaced in order (slide number, then total when present).

## Changelog

### v0.3.0

RGAA / WAI-ARIA refresh: named and focusable nav controls, slide announcements, autoplay pause / play pictograms, and removal of the page jump caused by forced `scrollTo` / focus on the carousel root.

### v0.2

Fixed a bunch of nasty bugs, brought up to date with latest OCv2 API.

### v0.1

Initial commit
