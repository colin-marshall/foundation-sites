'use strict';

!function($) {

/**
 * OffCanvas module.
 * @module foundation.offcanvas
 * @requires foundation.util.mediaQuery
 * @requires foundation.util.triggers
 * @requires foundation.util.motion
 */

class OffCanvas {
  /**
   * Creates a new instance of an off-canvas wrapper.
   * @class
   * @fires OffCanvas#init
   * @param {Object} element - jQuery object to initialize.
   * @param {Object} options - Overrides to the default plugin settings.
   */
  constructor(element, options) {
    this.$element = element;
    this.options = $.extend({}, OffCanvas.defaults, this.$element.data(), options);
    this.$lastTrigger = $();
    this.$triggers = $();

    this._init();
    this._events();

    Foundation.registerPlugin(this, 'OffCanvas')
    Foundation.Keyboard.register('OffCanvas', {
      'ESCAPE': 'close'
    });

  }

  /**
   * Initializes the off-canvas wrapper by adding the exit overlay (if needed).
   * @function
   * @private
   */
  _init() {
    var id = this.$element.attr('id');

    this.$element.attr('aria-hidden', 'true');

    this.$element.addClass(`is-transition-${this.options.transition}`);

    // Find triggers that affect this element and add aria-expanded to them
    this.$triggers = $(document)
      .find('[data-open="'+id+'"], [data-close="'+id+'"], [data-toggle="'+id+'"]')
      .attr('aria-expanded', 'false')
      .attr('aria-controls', id);

    // Add a close trigger over the body if necessary
    if (this.options.contentOverlay) {
      if ($('.js-off-canvas-exit').length) {
        this.$overlay = $('.js-off-canvas-exit');
      } else {
        var overlay = document.createElement('div');
        overlay.setAttribute('class', 'js-off-canvas-exit');
        $('[data-off-canvas-content]').append(overlay);

        this.$overlay = $(overlay);
      }
    }

    this.options.isRevealed = this.options.isRevealed || new RegExp(this.options.revealClass, 'g').test(this.$element[0].className);

    if (this.options.isRevealed) {
      this.options.revealOn = this.options.revealOn || this.$element[0].className.match(/(reveal-for-medium|reveal-for-large)/g)[0].split('-')[2];
      this._setMQChecker();
    }
    if (!this.options.transitionTime) {
      this.options.transitionTime = parseFloat(window.getComputedStyle($('[data-off-canvas-content]')[0]).transitionDuration) * 1000;
    }
  }

  /**
   * Adds event handlers to the off-canvas wrapper and the exit overlay.
   * @function
   * @private
   */
  _events() {
    this.$element.off('.zf.trigger .zf.offcanvas').on({
      'open.zf.trigger': this.open.bind(this),
      'close.zf.trigger': this.close.bind(this),
      'toggle.zf.trigger': this.toggle.bind(this),
      'keydown.zf.offcanvas': this._handleKeyboard.bind(this)
    });

    // If we have an overlay and close on click, let it close the off canvas menu.
    if (this.options.closeOnClick && this.options.contentOverlay && this.$overlay.length) {
      this.$overlay.on({'click.zf.offcanvas': this.close.bind(this)});
    }

    // If content overlay is false but close on click is true, close via click on content.
    if (this.options.closeOnClick && this.options.contentOverlay !== true) {
      $('[data-off-canvas-content]').on({'click.zf.offcanvas': this.close.bind(this)});
    }
  }

  /**
   * Applies event listener for elements that will reveal at certain breakpoints.
   * @private
   */
  _setMQChecker() {
    var _this = this;

    $(window).on('changed.zf.mediaquery', function() {
      if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
        _this.reveal(true);
      } else {
        _this.reveal(false);
      }
    }).one('load.zf.offcanvas', function() {
      if (Foundation.MediaQuery.atLeast(_this.options.revealOn)) {
        _this.reveal(true);
      }
    });
  }

  /**
   * Handles the revealing/hiding the off-canvas at breakpoints, not the same as open.
   * @param {Boolean} isRevealed - true if element should be revealed.
   * @function
   */
  reveal(isRevealed) {
    var $closer = this.$element.find('[data-close]');
    if (isRevealed) {
      this.close();
      this.isRevealed = true;
      this.$element.off('open.zf.trigger toggle.zf.trigger');
      if ($closer.length) { $closer.hide(); }
    } else {
      this.isRevealed = false;
      this.$element.on({
        'open.zf.trigger': this.open.bind(this),
        'toggle.zf.trigger': this.toggle.bind(this)
      });
      if ($closer.length) {
        $closer.show();
      }
    }
  }

  /**
   * Opens the off-canvas menu.
   * @function
   * @param {Object} event - Event object passed from listener.
   * @param {jQuery} trigger - element that triggered the off-canvas to open.
   * @fires OffCanvas#opened
   */
  open(event, trigger) {
    if (this.$element.hasClass('is-open') || this.isRevealed) { return; }
    var _this = this,
        $body = $(document.body);

    if (this.options.forceTo === 'top') {
      window.scrollTo(0, 0);
    } else if (this.options.forceTo === 'bottom') {
      window.scrollTo(0,document.body.scrollHeight);
    }

    $('body').addClass('is-off-canvas-open');
    _this.$element.addClass('is-open');

    /**
     * Fires when the off-canvas menu opens.
     * @event OffCanvas#opened
     */
    Foundation.Move(this.options.transitionTime, this.$element, function() {
      
    });

    this.$triggers.attr('aria-expanded', 'true');
    this.$element.attr('aria-hidden', 'false')
        .trigger('opened.zf.offcanvas');

    // If we have an overlay lets make it visible.
    if (this.options.contentOverlay) {
      this.$overlay.addClass('is-visible');
    }

    // If we have close on click and an overlay add a `is-closable` class.
    if (this.options.closeOnClick && this.options.contentOverlay) {
      this.$overlay.addClass('is-closable');
    }

    if (trigger) {
      this.$lastTrigger = trigger;
    }

    if (this.options.autoFocus) {
      this.$element.one(Foundation.transitionend(this.$element), function() {
        _this.$element.find('a, button').eq(0).focus();
      });
    }

    if (this.options.trapFocus) {
      $('[data-off-canvas-content]').attr('tabindex', '-1');
      this._trapFocus();
    }
  }

  /**
   * Traps focus within the offcanvas on open.
   * @private
   */
  _trapFocus() {
    var focusable = Foundation.Keyboard.findFocusable(this.$element),
        first = focusable.eq(0),
        last = focusable.eq(-1);

    focusable.off('.zf.offcanvas').on('keydown.zf.offcanvas', function(e) {
      if (e.which === 9 || e.keycode === 9) {
        if (e.target === last[0] && !e.shiftKey) {
          e.preventDefault();
          first.focus();
        }
        if (e.target === first[0] && e.shiftKey) {
          e.preventDefault();
          last.focus();
        }
      }
    });
  }

  /**
   * Closes the off-canvas menu.
   * @function
   * @param {Function} cb - optional cb to fire after closure.
   * @fires OffCanvas#closed
   */
  close(cb) {
    if (!this.$element.hasClass('is-open') || this.isRevealed) { return; }

    var _this = this;

    $('body').removeClass('is-off-canvas-open');
    _this.$element.removeClass('is-open');

    this.$element.attr('aria-hidden', 'true')
      /**
       * Fires when the off-canvas menu opens.
       * @event OffCanvas#closed
       */
        .trigger('closed.zf.offcanvas');

    // Remove `is-visible` class from overlay.
    if (this.options.contentOverlay) {
      this.$overlay.removeClass('is-visible');
    }

    // If we have `closeOnClick` and `contentOverlay` add `is-closable` class.
    if (this.options.closeOnClick && this.options.contentOverlay) {
      this.$overlay.removeClass('is-closable');
    }

    this.$triggers.attr('aria-expanded', 'false');
    if (this.options.trapFocus) {
      $('[data-off-canvas-content]').removeAttr('tabindex');
    }
  }

  /**
   * Toggles the off-canvas menu open or closed.
   * @function
   * @param {Object} event - Event object passed from listener.
   * @param {jQuery} trigger - element that triggered the off-canvas to open.
   */
  toggle(event, trigger) {
    if (this.$element.hasClass('is-open')) {
      this.close(event, trigger);
    }
    else {
      this.open(event, trigger);
    }
  }

  /**
   * Handles keyboard input when detected. When the escape key is pressed, the off-canvas menu closes, and focus is restored to the element that opened the menu.
   * @function
   * @private
   */
  _handleKeyboard(event) {
    if (event.which !== 27) return;

    event.stopPropagation();
    event.preventDefault();
    this.close();
    this.$lastTrigger.focus();
  }

  /**
   * Destroys the offcanvas plugin.
   * @function
   */
  destroy() {
    this.close();
    this.$element.off('.zf.trigger .zf.offcanvas');
    this.$overlay.off('.zf.offcanvas');

    Foundation.unregisterPlugin(this);
  }
}

OffCanvas.defaults = {
  /**
   * Allow the user to click outside of the menu to close it.
   * @option
   * @example true
   */
  closeOnClick: true,

  /**
   * Adds an overlay on top of `[data-off-canvas-content]`.
   * @option
   * @example true
   */
  contentOverlay: true,

  /**
   * Amount of time in ms the open and close transition requires. If none selected, pulls from body style.
   * @option
   * @example 500
   */
  transitionTime: 0,

  /**
   * Type of transition for the offcanvas menu. Options are 'push', 'detached' or 'slide'.
   * @option
   * @example push
   */
  transition: 'push',

  /**
   * Direction the offcanvas opens from. Determines class applied to body.
   * @option
   * @example left
   */
  position: 'left',

  /**
   * Force the page to scroll to top or bottom on open.
   * @option
   * @example top
   */
  forceTo: null,

  /**
   * Allow the offcanvas to remain open for certain breakpoints.
   * @option
   * @example false
   */
  isRevealed: false,

  /**
   * Breakpoint at which to reveal. JS will use a RegExp to target standard classes, if changing classnames, pass your class with the `revealClass` option.
   * @option
   * @example reveal-for-large
   */
  revealOn: null,

  /**
   * Force focus to the offcanvas on open. If true, will focus the opening trigger on close.
   * @option
   * @example true
   */
  autoFocus: true,

  /**
   * Class used to force an offcanvas to remain open. Foundation defaults for this are `reveal-for-large` & `reveal-for-medium`.
   * @option
   * TODO improve the regex testing for this.
   * @example reveal-for-large
   */
  revealClass: 'reveal-for-',

  /**
   * Triggers optional focus trapping when opening an offcanvas. Sets tabindex of [data-off-canvas-content] to -1 for accessibility purposes.
   * @option
   * @example true
   */
  trapFocus: false
}

// Window exports
Foundation.plugin(OffCanvas, 'OffCanvas');

}(jQuery);
