/**
 * Owl Carousel v2 Accessibility Plugin
 * Version 0.2.2
 * © Geoffrey Roberts 2016
 */

;(function($, window, document){
  var controlsObservers = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  /**
   * Apply W3C carousel pattern attributes on the root element.
   */
  function syncCarouselRootA11y($carousel) {
    var attrs = {
      role: 'region',
      'aria-roledescription': 'diaporama'
    };

    if (!$carousel.attr('aria-label') && !$carousel.attr('aria-labelledby')) {
      attrs['aria-label'] = 'Diaporama';
    }

    if (typeof $carousel.attr('tabindex') === 'undefined') {
      attrs.tabindex = '0';
    }

    $carousel.attr(attrs);
  }

  /**
   * Apply W3C slide pattern attributes on stage items.
   */
  function syncCarouselSlidesA11y($carousel, core) {
    if (!core || !core.$stage) {
      return;
    }

    var total = core.items().length;
    var slideLabel = (core.relative(core.current()) + 1) + ' sur ' + total;

    core.$stage.children().each(function() {
      var item = $(this);
      var isActive = item.hasClass('active');
      var attrs = {
        role: 'group',
        'aria-roledescription': 'diapositive',
        'aria-hidden': isActive ? 'false' : 'true'
      };

      if (isActive) {
        attrs['aria-label'] = slideLabel;
      }

      item.attr(attrs);

      if (!isActive) {
        item.removeAttr('aria-label');
      }
    });
  }

  /**
   * Sync nav disabled state and dot list roles for one carousel instance.
   */
  function syncCarouselControlsA11y($carousel, core) {
    var navButtons = $carousel.find('.owl-prev, .owl-next');

    if (!!core && !!core._plugins && !!core._plugins.navigation && !!core._plugins.navigation._controls) {
      var controls = core._plugins.navigation._controls;
      if (!!controls.$previous) {
        navButtons = navButtons.add(controls.$previous);
      }
      if (!!controls.$next) {
        navButtons = navButtons.add(controls.$next);
      }
    }

    navButtons.each(function() {
      var btn = $(this);
      var hadFocus = document.activeElement === this;

      if (btn.hasClass('disabled')) {
        btn.attr('disabled', 'true');
        if (hadFocus) {
          var $carouselRoot = btn.closest('.owl-carousel');
          var fallback = btn.siblings('.owl-prev, .owl-next').not('.disabled').first();
          if (fallback.length) {
            fallback[0].focus({ preventScroll: true });
          }
          else if ($carouselRoot.length) {
            $carouselRoot[0].focus({ preventScroll: true });
          }
        }
      }
      else {
        btn.removeAttr('disabled');
      }
    });

    var dotsContainers = $carousel.find('.owl-dots');
    if (!!core && !!core._plugins && !!core._plugins.navigation && !!core._plugins.navigation._controls.$indicators) {
      dotsContainers = dotsContainers.add(core._plugins.navigation._controls.$indicators);
    }
    if (!!core && !!core.settings && !!core.settings.dotsContainer) {
      dotsContainers = dotsContainers.add($(core.settings.dotsContainer));
    }

    dotsContainers.each(function(index, el) {
      if (dotsContainers.index(el) !== index) {
        return;
      }
      var dots = $(el);
      dots.attr('role', 'list');
      dots.children().each(function() {
        var dot = $(this);
        dot.attr('role', 'listitem');
        if (dot.hasClass('active')) {
          dot.attr('aria-current', 'true');
        }
        else {
          dot.removeAttr('aria-current');
        }
      });
    });
  }

  /**
   * Sync all carousel a11y attributes for one instance.
   */
  function syncCarouselA11y($carousel, core) {
    syncCarouselRootA11y($carousel);
    syncCarouselSlidesA11y($carousel, core);
    syncCarouselControlsA11y($carousel, core);
  }

  /**
   * Watch controls DOM changes for one carousel (dots rebuild, disabled class).
   */
  function observeCarouselControls($carousel, core) {
    if ($carousel.data('owl-a11y-controls-observer')) {
      return;
    }

    var controlsEl = $carousel.find('.owl-controls')[0];
    if (!controlsEl && !!core && !!core._plugins && !!core._plugins.navigation && !!core._plugins.navigation._controls.$element) {
      controlsEl = core._plugins.navigation._controls.$element[0];
    }

    if (!controlsEl || typeof MutationObserver === 'undefined') {
      return;
    }

    var observer = new MutationObserver(function() {
      syncCarouselControlsA11y($carousel, core);
    });

    observer.observe(controlsEl, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });

    $carousel.data('owl-a11y-controls-observer', observer);
    if (!!controlsObservers) {
      controlsObservers.set(controlsEl, observer);
    }
  }

  var Owl2A11y = function(carousel) {
    this._core = carousel;
    this._initialized = false;

    this._core._options = $.extend(Owl2A11y.defaults, this._core.options);

    this.$element = this._core.$element;

    var setCurrent = $.proxy(function(e) {
      this.setCurrent(e);
    }, this);

    this._handlers = {
      'initialized.owl.carousel': $.proxy(function(e) {
        this.setupRoot();
        if (e.namespace && !this._initialized) {
          this.setupFocus();
          this.setupKeyboard();
          this._initialized = true;
        }
        this.setCurrent(e);
        var self = this;
        setTimeout(function() {
          self.syncControlsA11y();
          self.observeControls();
        }, 0);
      }, this),
      'changed.owl.carousel': setCurrent,
      'translated.owl.carousel': setCurrent,
      'refreshed.owl.carousel': setCurrent,
      'resized.owl.carousel': setCurrent
    };
    this.$element.on(this._handlers);
  };


  /* PREFERENCES */

  /**
   * Contains default parameters, if there were any.
   */
  Owl2A11y.defaults = {};


  /* EVENT HANDLERS */

  /**
   * Adds support for things that don't map nicely to the root object
   * such as event handlers.
   */
  Owl2A11y.eventHandlers = {};

  /**
   * Get a callback for keyup events within this carousel.
   *
   * @return callback
   *   An event callback that takes an Event as an argument.
   */
  Owl2A11y.prototype.getDocumentKeyUp = function(){
    var self = this;
    return function(e) {
      var eventTarg = $(e.target),
      targ = self.focused(eventTarg),
      action = null;

      if (!!targ) {
        if (e.keyCode == 37 || e.keyCode == 38) {
          action = 'prev.owl.carousel';
        }
        else if (e.keyCode == 39 || e.keyCode == 40) {
          action = 'next.owl.carousel';
        }
        else if (e.keyCode == 13) {
          if (eventTarg.hasClass('owl-prev')) action = 'prev.owl.carousel';
          else if (eventTarg.hasClass('owl-next')) action = 'next.owl.carousel';
          else if (eventTarg.hasClass('owl-dot')) action = 'click';
        }

        if (!!action) targ.trigger(action);
      }
    };
  };


  /* SETUP AND TEAR DOWN */

  /**
   * Assign attributes to the root element (W3C carousel pattern).
   */
  Owl2A11y.prototype.setupRoot = function() {
    syncCarouselRootA11y(this.$element);
  };

  /**
   * Setup keyboard events for this carousel.
   */
  Owl2A11y.prototype.setupKeyboard = function(){
    // Only needed to initialise once for the entire document
    if (!this.$element.attr('data-owl-access-keyup')) {
      this.$element.bind('keyup', this.getDocumentKeyUp())
      .attr('data-owl-access-keyup', '1');
    }
    this.$element.attr('data-owl-carousel-focusable', '1');
  };

  /**
   * Setup focusing behaviour for the carousel.
   */
  Owl2A11y.prototype.setupFocus = function(){
    // Only needed to initialise once for the entire document
    this.$element.bind('focusin', function(){
      $(this).attr({
        'data-owl-carousel-focused': '1',
        'aria-live': 'polite'
      }).trigger('stop.owl.autoplay');
    }).bind('focusout', function(){
      $(this).attr({
        'data-owl-carousel-focused': '0',
        'aria-live': 'off'
      }).trigger('play.owl.autoplay');
    });

    // Add tabindex to allow navigation to be focused.
    var toFocus = [];
    toFocus.push(this.$element.find('.owl-prev, .owl-next'));
    toFocus.push(this.$element.find('.owl-dots').children());
    $.each(toFocus, function() {
      this.attr('tabindex', '0');
    });
  };

  /**
   * Sync a11y attributes on nav buttons and dot indicators for this carousel.
   */
  Owl2A11y.prototype.syncControlsA11y = function() {
    syncCarouselA11y(this.$element, this._core);
  };

  /**
   * Observe controls DOM changes for this carousel instance.
   */
  Owl2A11y.prototype.observeControls = function() {
    observeCarouselControls(this.$element, this._core);
  };

  /**
   * Assign attributes to the root element.
   */
  Owl2A11y.prototype.destroy = function() {
    var observer = this.$element.data('owl-a11y-controls-observer');
    if (!!observer) {
      observer.disconnect();
      this.$element.removeData('owl-a11y-controls-observer');
    }
    this.$element.unbind('keyup', this.eventHandlers.documentKeyUp)
    .removeAttr('data-owl-access-keyup data-owl-carousel-focusable')
    .unbind('focusin focusout');
  };


  /* HELPER FUNCTIONS */

  /**
   * Identifies all focusable elements within a given element.
   *
   * @param DOMElement elem
   *   A DOM element.
   *
   * @return jQuery
   *   A jQuery object that may refer to zero or more focusable elements.
   */
  Owl2A11y.prototype.focusableElems = function(elem) {
    return $(elem).find('a, input, select, button, *[tabindex]');
  };

  /**
   * Identifies all focusable elements within a given element.
   *
   * @param jQeury elems
   *   A jQuery object that may refer to zero or more focusable elements.
   * @param boolean enable
   *   Whether focus is to be enabled on these elements or not.
   */
  Owl2A11y.prototype.adjustFocus = function(elems, enable){
    elems.each(function(){
      var item = $(this);
      var newTabIndex = '0',
      storeTabIndex = '0';

      currentTabIndex = item.attr('tabindex'),
      storedTabIndex = item.attr('data-owl-temp-tabindex');

      if (enable) {
        newTabIndex = (
          typeof(storedTabIndex) != 'undefined' && (storedTabIndex != '-1') ?
          item.attr('data-owl-temp-tabindex') :
          '0'
        );
        storedTabIndex = newTabIndex;
      }
      else {
        newTabIndex = '-1';
        storedTabIndex = (
          (typeof(currentTabIndex) != 'undefined') || (currentTabIndex != '-1') ?
          currentTabIndex :
          '0'
        );
      }

      item.attr({
        tabindex: newTabIndex,
        'data-owl-temp-tabindex': storeTabIndex
      });
    });
  };

  /**
   * Get the root element if we are focused within it.
   *
   * @param DOMElement targ
   *   An element that might be within this carousel.
   *
   * @return mixed
   *   Either the jQuery element containing the root element, or NULL.
   */
  Owl2A11y.prototype.focused = function(targ){
    var targ = $(targ);
    if (targ.attr('data-owl-carousel-focused') == 1) {
      return targ;
    }
    var closest = targ.closest('[data-owl-carousel-focused="1"]');
    if (closest.length > 0) return closest;
    return null;
  };


  /* UPDATE FUNCTIONS */

  /**
   * Identify active elements, set WAI-ARIA sttributes accordingly,
   * scroll to show element if we need to, and set up focusing.
   *
   * @param Event e
   *   The triggering event.
   */
  Owl2A11y.prototype.setCurrent = function(e) {
    var element = this._core.$element,
    stage = this._core.$stage,
    focusableElems = this.focusableElems,
    adjustFocus = this.adjustFocus;

    if (!!stage) {
      this._core.$stage.children().each(function(i) {
        var item = $(this);
        var focusable = focusableElems(this);
        var isActive = item.hasClass('active');

        if (isActive) {
          adjustFocus(focusable, true);
        }
        else {
          adjustFocus(focusable, false);
        }
      });
    }

    this.syncControlsA11y();
  };

  function registerOwl2A11yPlugin() {
    if (!$.fn.owlCarousel || !$.fn.owlCarousel.Constructor) {
      return false;
    }
    $.fn.owlCarousel.Constructor.Plugins['Owl2A11y'] = Owl2A11y;
    return true;
  }

  function handleCarouselControlsA11y(e) {
    if (!e.namespace) {
      return;
    }
    var $carousel = $(e.target);
    var core = $carousel.data('owl.carousel');
    syncCarouselA11y($carousel, core);
    if (e.type === 'initialized') {
      observeCarouselControls($carousel, core);
    }
  }

  $(document).on(
    'initialized.owl.carousel refreshed.owl.carousel resized.owl.carousel changed.owl.carousel translated.owl.carousel',
    '.owl-carousel',
    handleCarouselControlsA11y
  );

  if (!registerOwl2A11yPlugin()) {
    $(registerOwl2A11yPlugin);
  }

  $(function() {
    $('.owl-carousel').each(function() {
      var $carousel = $(this);
      var core = $carousel.data('owl.carousel');
      if (!!core) {
        syncCarouselA11y($carousel, core);
        observeCarouselControls($carousel, core);
      }
    });
  });
})(window.Zepto || window.jQuery, window,  document);
