/**
 * Owl Carousel v2 Accessibility Plugin
 * Version 0.3.0
 * © Geoffrey Roberts 2016
 *
 * Surcouche RGAA / WAI-ARIA : contrôles nommés et focusables,
 * diapositives masquées hors écran, annonce des changements,
 * sans défilement forcé de la page au clic.
 */
;(function($, window, document) {
	'use strict';

	var Owl2A11y = function(carousel) {
		this._core = carousel;
		this._initialized = false;
		this._uid = ++Owl2A11y.uid;
		this._userInteracted = false;
		this._announcePending = false;
		this._lastAnnounced = null;
		this._pausedByUser = false;
		this._stoppedForFocus = false;
		this._restoreFocusAfterMove = false;
		this._refreshTimer = null;
		this.$element = this._core.$element;
		this.$status = null;
		this.$toggle = null;

		// Fusion avant Owl.setup(), pour que les réglages arrivent dans settings.
		this._core.options = $.extend({}, Owl2A11y.defaults, this._core.options);

		this._handlers = {
			'initialized.owl.carousel': $.proxy(function(e) {
				if (!e.namespace) {
					return;
				}
				this.onInitialized();
			}, this),
			'changed.owl.carousel': $.proxy(function(e) {
				if (!e.namespace || !this._initialized) {
					return;
				}
				if (!e.property || e.property.name !== 'position') {
					return;
				}
				// Avant update()/animate() : sortir le focus d'une diapositive
				// qui va bouger, sinon le navigateur fait défiler la page pour la suivre.
				this.detachFocusFromSlide();
				this.scheduleRefresh(true);
			}, this),
			'translated.owl.carousel refreshed.owl.carousel resized.owl.carousel': $.proxy(function(e) {
				if (!e.namespace || !this._initialized) {
					return;
				}
				this.scheduleRefresh(e.type === 'translated');
			}, this)
		};

		this.$element.on(this._handlers);
	};

	Owl2A11y.uid = 0;

	/**
	 * Libellés surchargeables dans les options owlCarousel().
	 * %s est remplacé dans l'ordre (numéro, total).
	 */
	Owl2A11y.defaults = {
		a11yCarouselLabel: 'Carrousel',
		a11yRoleDescription: 'carrousel',
		a11ySlideRoleDescription: 'diapositive',
		a11ySlideLabel: '%s sur %s',
		a11yPrevLabel: 'Diapositive précédente',
		a11yNextLabel: 'Diapositive suivante',
		a11yDotLabel: 'Aller à la diapositive %s',
		a11yNavLabel: 'Navigation du carrousel',
		a11yDotsLabel: 'Pagination du carrousel',
		a11yStatusLabel: 'Diapositive %s sur %s',
		a11yPauseLabel: 'Mettre le défilement en pause',
		a11yPlayLabel: 'Lancer le défilement'
	};

	Owl2A11y.icons = {
		play: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5.14v13.72c0 1.18 1.26 1.93 2.3 1.36l11.1-6.86c1.04-.64 1.04-2.08 0-2.72L10.3 3.78C9.26 3.21 8 3.96 8 5.14z"/></svg>',
		pause: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor" aria-hidden="true" focusable="false"><rect x="6" y="4" width="4.5" height="16" rx="2.25"/><rect x="13.5" y="4" width="4.5" height="16" rx="2.25"/></svg>'
	};

	/* SETUP */

	Owl2A11y.prototype.onInitialized = function() {
		if (this._initialized) {
			this.refresh();
			return;
		}

		this._initialized = true;
		this._onKeyDown = $.proxy(this.onKeyDown, this);
		this._onFocusIn = $.proxy(this.onFocusIn, this);
		this._onFocusOut = $.proxy(this.onFocusOut, this);
		this._onControlClick = $.proxy(this.onControlClick, this);
		this._onClickCapture = $.proxy(this.onClickCapture, this);

		// Capture : Empêche Espace de faire défiler la page avant l'action par défaut du navigateur.
		this.$element[0].addEventListener('keydown', this._onKeyDown, true);
		this.$element.on('focusin.owl.a11y', this._onFocusIn);
		this.$element.on('focusout.owl.a11y', this._onFocusOut);
		this.$element.on('click.owl.a11y', '.owl-prev, .owl-next, .owl-dot, .owl-a11y-toggle', this._onControlClick);
		this.$element[0].addEventListener('click', this._onClickCapture, true);

		this._reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		if (this._core.settings.autoplay && this._reduceMotion) {
			this._pausedByUser = true;
			this.$element.trigger('stop.owl.autoplay');
		}

		this.refresh();
	};

	Owl2A11y.prototype.setupRoot = function() {
		var settings = this._core.settings;
		var role = this.$element.attr('role');
		var label = settings.a11yCarouselLabel;

		if (!role || role === 'listbox') {
			this.$element.attr('role', 'region');
		}

		if (!this.$element.attr('aria-roledescription')) {
			this.$element.attr('aria-roledescription', settings.a11yRoleDescription);
		}

		if (!this.$element.attr('aria-label') && !this.$element.attr('aria-labelledby')) {
			if (label === Owl2A11y.defaults.a11yCarouselLabel) {
				label = label + ' ' + this._uid;
			}
			this.$element.attr('aria-label', label);
		}

		// Pas de tabindex sur le conteneur : un tabindex >= 0 (ou -1, focusable au clic)
		// donnait le focus à toute la région et faisait défiler la page.
		if (!this.$element.attr('id')) {
			this.$element.attr('id', 'owl-carousel-' + this._uid);
		}
	};

	Owl2A11y.prototype.ensureStatus = function() {
		if (this.$status && this.$status.length) {
			return;
		}

		this.$status = $('<div>', {
			'class': 'owl-a11y-status',
			'aria-live': 'polite',
			'aria-atomic': 'true'
		}).css({
			position: 'absolute',
			width: '1px',
			height: '1px',
			padding: 0,
			margin: '-1px',
			overflow: 'hidden',
			clip: 'rect(0, 0, 0, 0)',
			whiteSpace: 'nowrap',
			border: 0
		});

		this.$element.append(this.$status);
	};

	Owl2A11y.prototype.setupAutoplayControl = function() {
		var settings = this._core.settings;
		var isPaused = this._pausedByUser;
		var label = isPaused ? settings.a11yPlayLabel : settings.a11yPauseLabel;
		var icon = isPaused ? Owl2A11y.icons.play : Owl2A11y.icons.pause;

		if (!settings.autoplay) {
			return;
		}

		if (!this.$toggle || !this.$toggle.length) {
			this.$toggle = $('<button>', {
				type: 'button',
				'class': 'owl-a11y-toggle'
			});
			this.$element.append(this.$toggle);
		}

		this.$toggle
			.empty()
			.append(icon)
			.append($('<span>', {
				'class': 'sr-only',
				text: label
			}));
	};

	Owl2A11y.prototype.setupControls = function() {
		var settings = this._core.settings;
		var nav = this._core._plugins && this._core._plugins.navigation;
		var $nav = this.$element.children('.owl-nav');
		var $prev = $nav.find('.owl-prev');
		var $next = $nav.find('.owl-next');
		var $dots = this.$element.children('.owl-dots');
		var carouselId = this.$element.attr('id');

		if (nav && nav._controls) {
			if (nav._controls.$relative && nav._controls.$relative.length) {
				$nav = nav._controls.$relative;
			}
			if (nav._controls.$previous && nav._controls.$previous.length) {
				$prev = nav._controls.$previous;
			}
			if (nav._controls.$next && nav._controls.$next.length) {
				$next = nav._controls.$next;
			}
			if (nav._controls.$absolute && nav._controls.$absolute.length) {
				$dots = nav._controls.$absolute;
			}
		}

		if ($nav.length) {
			if (!$nav.attr('role')) {
				$nav.attr('role', 'group');
			}
			if (!$nav.attr('aria-label') && !$nav.attr('aria-labelledby')) {
				$nav.attr('aria-label', settings.a11yNavLabel);
			}
		}

		this.enhanceControl($prev, settings.a11yPrevLabel, carouselId);
		this.enhanceControl($next, settings.a11yNextLabel, carouselId);

		if ($dots.length) {
			if (!$dots.attr('role')) {
				$dots.attr('role', 'group');
			}
			if (!$dots.attr('aria-label') && !$dots.attr('aria-labelledby')) {
				$dots.attr('aria-label', settings.a11yDotsLabel);
			}
		}

		this.enhanceDots($dots, carouselId);
		this.setupAutoplayControl();
	};

	/**
	 * Bouton précédent / suivant : nom accessible, rôle et focus clavier.
	 * Un <button> natif garde son rôle implicite ; role="presentation" (Owl 2.3) est retiré.
	 */
	Owl2A11y.prototype.enhanceControl = function($control, label, carouselId) {
		var self = this;

		if (!$control || !$control.length) {
			return;
		}

		$control.each(function() {
			var $button = $(this);
			var disabled = $button.hasClass('disabled');

			self.ensureButtonSemantics($button);

			if (!$button.attr('aria-label') && !$button.attr('aria-labelledby') && !self.hasAccessibleName($button)) {
				$button.attr('aria-label', label);
			}

			if (carouselId) {
				$button.attr('aria-controls', carouselId);
			}

			$button.attr('aria-disabled', disabled ? 'true' : 'false');
			$button.attr('tabindex', '0');
		});
	};

	Owl2A11y.prototype.enhanceDots = function($dots, carouselId) {
		var self = this;
		var settings = this._core.settings;

		if (!$dots || !$dots.length) {
			return;
		}

		$dots.children().each(function(index) {
			var $dot = $(this);
			var label = formatLabel(settings.a11yDotLabel, [index + 1]);

			self.ensureButtonSemantics($dot);

			if (!$dot.attr('aria-label') && !$dot.attr('aria-labelledby') && !self.hasAccessibleName($dot)) {
				$dot.attr('aria-label', label);
			}

			if (carouselId) {
				$dot.attr('aria-controls', carouselId);
			}

			if (String($dot.attr('tabindex')) !== '0') {
				$dot.attr('tabindex', '0');
			}

			if ($dot.hasClass('active')) {
				$dot.attr('aria-current', 'true');
			} else {
				$dot.removeAttr('aria-current');
			}
		});
	};

	Owl2A11y.prototype.ensureButtonSemantics = function($control) {
		var tag = $control.prop('tagName');
		var role = $control.attr('role');

		if (typeof tag === 'string') {
			tag = tag.toLowerCase();
		}

		if (tag === 'button') {
			if (!$control.attr('type')) {
				$control.attr('type', 'button');
			}
			if (role === 'presentation' || role === 'none') {
				$control.removeAttr('role');
			}
			return;
		}

		if (tag === 'a') {
			if (!$control.attr('role')) {
				$control.attr('role', 'button');
			}
			return;
		}

		$control.attr('role', 'button');
	};

	Owl2A11y.prototype.hasAccessibleName = function($control) {
		var text = $.trim($control.text());

		if (!text) {
			return false;
		}

		// Glyphes Owl (‹ ›) et icônes seules : pas un nom accessible.
		return !/^[\s\u2039\u203A\u00AB\u00BB<>←→▲▼▶◀]+$/.test(text);
	};

	/* SLIDES */

	Owl2A11y.prototype.updateSlides = function() {
		var self = this;
		var settings = this._core.settings;
		var $stage = this._core.$stage;
		var total = this._core.items().length;

		if (!$stage || !total) {
			return;
		}

		$stage.children('.owl-item').each(function(index) {
			var $item = $(this);
			var isActive = $item.hasClass('active');
			var position = self._core.relative(index);

			$item.attr({
				role: 'group',
				'aria-roledescription': settings.a11ySlideRoleDescription,
				'aria-label': formatLabel(settings.a11ySlideLabel, [position + 1, total]),
				'aria-hidden': isActive ? 'false' : 'true'
			});

			self.adjustFocus(self.focusableElems(this), isActive);
		});
	};

	Owl2A11y.prototype.announce = function() {
		var current;
		var total;
		var message;

		if (!this._announcePending || !this._userInteracted || !this.$status) {
			this._announcePending = false;
			return;
		}

		this._announcePending = false;
		total = this._core.items().length;
		current = this._core.relative(this._core.current()) + 1;

		if (!total || current === this._lastAnnounced) {
			return;
		}

		this._lastAnnounced = current;
		message = formatLabel(this._core.settings.a11yStatusLabel, [current, total]);
		this.$status.text(message);
	};

	Owl2A11y.prototype.scheduleRefresh = function(announce) {
		var self = this;

		if (announce) {
			this._announcePending = true;
		}

		window.clearTimeout(this._refreshTimer);
		this._refreshTimer = window.setTimeout(function() {
			self.refresh();
		}, 0);
	};

	Owl2A11y.prototype.refresh = function() {
		if (!this._core.$stage) {
			return;
		}

		this.setupRoot();
		this.ensureStatus();
		this.setupControls();
		this.updateSlides();
		this.announce();
	};

	/* EVENTS */

	Owl2A11y.prototype.onKeyDown = function(e) {
		var $target = $(e.target);
		var $control;
		var key = e.key;
		var code = e.keyCode || e.which;
		var rtl = !!this._core.settings.rtl;
		var prevCode = rtl ? 39 : 37;
		var nextCode = rtl ? 37 : 39;
		var isPrev = key === (rtl ? 'ArrowRight' : 'ArrowLeft') || code === prevCode;
		var isNext = key === (rtl ? 'ArrowLeft' : 'ArrowRight') || code === nextCode;
		var isHome = key === 'Home' || code === 36;
		var isEnd = key === 'End' || code === 35;
		var isEnter = key === 'Enter' || code === 13;
		var isSpace = key === ' ' || key === 'Spacebar' || code === 32;

		if (this.isTypingTarget($target) || e.altKey || e.ctrlKey || e.metaKey) {
			return;
		}

		$control = $target.closest('.owl-prev, .owl-next, .owl-dot, .owl-a11y-toggle');

		if ((isEnter || isSpace) && $control.length && !isNativeActivate($control[0])) {
			e.preventDefault();
			if ($control.hasClass('disabled') || $control.attr('aria-disabled') === 'true') {
				return;
			}
			this._userInteracted = true;
			if ($control.hasClass('owl-a11y-toggle')) {
				this.toggleAutoplay();
				return;
			}
			if ($control.hasClass('owl-dot')) {
				this.$element.trigger('to.owl.carousel', [$control.index()]);
				return;
			}
			this._restoreFocusAfterMove = true;
			$control.trigger('click');
			return;
		}

		if (!isPrev && !isNext && !isHome && !isEnd) {
			return;
		}

		e.preventDefault();
		this._userInteracted = true;
		this._restoreFocusAfterMove = true;

		if (isHome) {
			this.$element.trigger('to.owl.carousel', [0]);
		} else if (isEnd) {
			this.$element.trigger('to.owl.carousel', [this.lastPageIndex()]);
		} else if (isPrev) {
			this.$element.trigger('prev.owl.carousel');
		} else {
			this.$element.trigger('next.owl.carousel');
		}
	};

	Owl2A11y.prototype.onFocusIn = function() {
		if (this._core.settings.autoplay && !this._pausedByUser) {
			this.$element.trigger('stop.owl.autoplay');
			this._stoppedForFocus = true;
		}
	};

	Owl2A11y.prototype.onFocusOut = function(e) {
		var next = e.relatedTarget;

		if (next && this.$element[0].contains(next)) {
			return;
		}

		if (this._stoppedForFocus && !this._pausedByUser && this._core.settings.autoplay) {
			this._stoppedForFocus = false;
			this.$element.trigger('play.owl.autoplay');
		}
	};

	Owl2A11y.prototype.onControlClick = function(e) {
		this._userInteracted = true;

		if ($(e.currentTarget).hasClass('owl-a11y-toggle')) {
			e.preventDefault();
			this.toggleAutoplay();
		}
	};

	/**
	 * Phase capture : bloque le saut des liens href="#" et l'activation
	 * d'un contrôle déjà en bout de course.
	 */
	Owl2A11y.prototype.onClickCapture = function(e) {
		var $control = $(e.target).closest('.owl-prev, .owl-next, .owl-dot');

		if (!$control.length || !this.$element[0].contains($control[0])) {
			return;
		}

		if ($control.prop('tagName').toLowerCase() === 'a') {
			e.preventDefault();
		}

		if ($control.hasClass('disabled') || $control.attr('aria-disabled') === 'true') {
			e.preventDefault();
			e.stopPropagation();
		}
	};

	Owl2A11y.prototype.toggleAutoplay = function() {
		this._pausedByUser = !this._pausedByUser;
		this._stoppedForFocus = false;
		this.$element.trigger(this._pausedByUser ? 'stop.owl.autoplay' : 'play.owl.autoplay');
		this.setupAutoplayControl();
	};

	/**
	 * Si le focus est dans une diapositive, le déplacer sur un contrôle
	 * visible avant l'animation. Focaliser le conteneur faisait défiler la page.
	 */
	Owl2A11y.prototype.detachFocusFromSlide = function() {
		var active = document.activeElement;
		var $fallback;

		if (!this._restoreFocusAfterMove || !active || !this.$element[0].contains(active)) {
			return;
		}

		if (!$(active).closest('.owl-item').length) {
			this._restoreFocusAfterMove = false;
			return;
		}

		$fallback = this.$element.find('.owl-next, .owl-prev, .owl-dot.active').filter(':visible').first();
		if ($fallback.length) {
			this.focusWithoutScroll($fallback);
		}

		this._restoreFocusAfterMove = false;
	};

	Owl2A11y.prototype.lastPageIndex = function() {
		var nav = this._core._plugins && this._core._plugins.navigation;

		if (nav && nav._pages && nav._pages.length) {
			return nav._pages.length - 1;
		}

		return Math.max(this._core.items().length - 1, 0);
	};

	Owl2A11y.prototype.focusWithoutScroll = function($el) {
		var node = $el && $el[0];

		if (!node || typeof node.focus !== 'function') {
			return;
		}

		try {
			node.focus({ preventScroll: true });
		} catch (err) {
			node.focus();
		}
	};

	Owl2A11y.prototype.isTypingTarget = function($target) {
		return $target.is('input, textarea, select, option, [contenteditable="true"]');
	};

	/* FOCUS DANS LES DIAPOSITIVES */

	Owl2A11y.prototype.focusableElems = function(elem) {
		return $(elem).find([
			'a[href]',
			'area[href]',
			'button:not([disabled])',
			'input:not([disabled]):not([type="hidden"])',
			'select:not([disabled])',
			'textarea:not([disabled])',
			'iframe',
			'summary',
			'[contenteditable="true"]',
			'[tabindex]'
		].join(', '));
	};

	Owl2A11y.prototype.adjustFocus = function(elems, enable) {
		elems.each(function() {
			var item = $(this);
			var currentTabIndex = item.attr('tabindex');
			var storedTabIndex = item.attr('data-owl-temp-tabindex');

			if (enable) {
				if (typeof storedTabIndex === 'undefined') {
					return;
				}
				if (storedTabIndex === '') {
					item.removeAttr('tabindex');
				} else {
					item.attr('tabindex', storedTabIndex);
				}
				item.removeAttr('data-owl-temp-tabindex');
				return;
			}

			if (typeof currentTabIndex !== 'undefined' && currentTabIndex === '-1' && typeof storedTabIndex !== 'undefined') {
				return;
			}

			if (typeof storedTabIndex === 'undefined') {
				item.attr('data-owl-temp-tabindex', typeof currentTabIndex === 'undefined' ? '' : currentTabIndex);
			}

			item.attr('tabindex', '-1');
		});
	};

	Owl2A11y.prototype.destroy = function() {
		var handler;

		window.clearTimeout(this._refreshTimer);

		if (this._onKeyDown) {
			this.$element[0].removeEventListener('keydown', this._onKeyDown, true);
		}
		if (this._onClickCapture) {
			this.$element[0].removeEventListener('click', this._onClickCapture, true);
		}

		this.$element.off('.owl.a11y');

		for (handler in this._handlers) {
			if (Object.prototype.hasOwnProperty.call(this._handlers, handler)) {
				this.$element.off(handler, this._handlers[handler]);
			}
		}

		if (this.$status) {
			this.$status.remove();
		}
		if (this.$toggle) {
			this.$toggle.remove();
		}
	};

	function formatLabel(template, values) {
		var index = 0;

		return String(template).replace(/%s/g, function() {
			var value = values[index];
			index += 1;
			return value === undefined ? '' : String(value);
		});
	}

	function isNativeActivate(el) {
		var tag = el.tagName ? el.tagName.toLowerCase() : '';
		return tag === 'button' || tag === 'input';
	}

	$.fn.owlCarousel.Constructor.Plugins.Owl2A11y = Owl2A11y;
})(window.Zepto || window.jQuery, window, document);
