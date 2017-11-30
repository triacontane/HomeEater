var Component_HotspotBehavior, HotspotShape,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

HotspotShape = (function() {
  function HotspotShape() {}

  HotspotShape.RECTANGLE = "rect";

  HotspotShape.PIXEL = "pixel";

  return HotspotShape;

})();

gs.HotspotShape = HotspotShape;

Component_HotspotBehavior = (function(superClass) {
  extend(Component_HotspotBehavior, superClass);


  /**
  * Called if this object instance is restored from a data-bundle. It can be used
  * re-assign event-handler, anonymous functions, etc.
  * 
  * @method onDataBundleRestore.
  * @param Object data - The data-bundle
  * @param gs.ObjectCodecContext context - The codec-context.
   */

  Component_HotspotBehavior.prototype.onDataBundleRestore = function(data, context) {
    return this.setupEventHandlers();
  };


  /**
  * Adds a hotspot-behavior to a game object. That allows a game object
  * to respond to mouse/touch actions by firing an action-event or changing
  * the game object's image.
  *
  * @module gs
  * @class Component_HotspotBehavior
  * @extends gs.Component
  * @memberof gs
  * @constructor
   */

  function Component_HotspotBehavior(params) {

    /**
    * The shape used to detect if a hotspot is clicked, hovered, etc.
    * @property shape
    * @type boolean
     */
    var ref;
    this.shape = gs.HotspotShape.RECTANGLE;

    /**
    * Indicates if the hotspot is selected.
    * @property selected
    * @type boolean
     */
    this.selected = false;

    /**
    * Indicates if the hotspot is enabled.
    * @property enabled
    * @type boolean
     */
    this.enabled = true;

    /**
    * @property imageHandling
    * @type number
    * @protected
     */
    this.imageHandling = 0;

    /**
    * Indicates if the mouse/touch pointer is inside the hotspot bounds.
    * @property contains
    * @type boolean
    * @protected
     */
    this.containsPointer = false;

    /**
    * Indicates if the action-button was pressed before.
    * @property buttonUp
    * @type boolean
    * @protected
     */
    this.buttonUp = false;

    /**
    * Indicates if the action-button is pressed.
    * @property buttonDown
    * @type boolean
    * @protected
     */
    this.buttonDown = false;

    /**
    * @property actionButtons
    * @type Object
    * @protected
     */
    this.actionButtons = {
      "left": Input.Mouse.BUTTON_LEFT,
      "right": Input.Mouse.BUTTON_RIGHT,
      "middle": Input.Mouse.BUTTON_MIDDLE
    };

    /**
    * The default action-button. By default the left-button is used.
    *
    * @property actionButton
    * @type number
     */
    this.actionButton = this.actionButtons[(ref = params != null ? params.actionButton : void 0) != null ? ref : "left"];

    /**
    * The sound played if the hotspot action is executed.
    * @property sound
    * @type Object
     */
    this.sound = params != null ? params.sound : void 0;

    /**
    * <p>The sounds played depending on the hotspot state.</p>
    * <ul>
    * <li>0 = Select Sound</li>
    * <li>1 = Unselect Sound</li>
    * </ul>
    * @property sounds
    * @type Object[]
     */
    this.sounds = (params != null ? params.sounds : void 0) || [];
  }


  /**
  * Sets up event handlers.
  *
  * @method setupEventHandlers
   */

  Component_HotspotBehavior.prototype.setupEventHandlers = function() {
    gs.GlobalEventManager.on("mouseUp", ((function(_this) {
      return function(e) {
        var contains, mx, my;
        if (!_this.object.visible) {
          return;
        }
        mx = Input.Mouse.x - _this.object.origin.x;
        my = Input.Mouse.y - _this.object.origin.y;
        contains = Rect.contains(_this.object.dstRect.x, _this.object.dstRect.y, _this.object.dstRect.width, _this.object.dstRect.height, mx, my);
        if (contains) {
          contains = _this.checkShape(mx - _this.object.dstRect.x, my - _this.object.dstRect.y);
          if (contains) {
            _this.containsPointer = contains;
            _this.updateInput();
            _this.updateEvents();
            _this.object.needsUpdate = true;
            return e.breakChain = true;
          }
        }
      };
    })(this)), null, this.object);
    if (this.object.images || true) {
      return gs.GlobalEventManager.on("mouseMoved", ((function(_this) {
        return function(e) {
          var contains, mx, my;
          if (!_this.object.visible) {
            return;
          }
          contains = Rect.contains(_this.object.dstRect.x, _this.object.dstRect.y, _this.object.dstRect.width, _this.object.dstRect.height, Input.Mouse.x - _this.object.origin.x, Input.Mouse.y - _this.object.origin.y);
          if (contains) {
            mx = Input.Mouse.x - _this.object.origin.x;
            my = Input.Mouse.y - _this.object.origin.y;
            contains = _this.checkShape(mx - _this.object.dstRect.x, my - _this.object.dstRect.y);
          }
          if (_this.containsPointer !== contains) {
            _this.containsPointer = contains;
            _this.object.needsUpdate = true;
            if (contains) {
              _this.object.events.emit("enter", _this);
            } else {
              _this.object.events.emit("leave", _this);
            }
          }
          return _this.updateInput();
        };
      })(this)), null, this.object);
    }
  };


  /**
  * Initializes the hotspot component.
  *
  * @method setup
   */

  Component_HotspotBehavior.prototype.setup = function() {
    var i, j, len, ref, sound;
    Component_HotspotBehavior.__super__.setup.apply(this, arguments);
    this.sound = ui.Component_FormulaHandler.fieldValue(this.object, this.sound);
    if (this.sounds != null) {
      ref = this.sounds;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        sound = ref[i];
        this.sounds[i] = ui.Component_FormulaHandler.fieldValue(this.object, sound);
      }
    } else {
      this.sounds = [];
    }
    return this.setupEventHandlers();
  };


  /**
  * Disposes the component.
  *
  * @method dispose
   */

  Component_HotspotBehavior.prototype.dispose = function() {
    Component_HotspotBehavior.__super__.dispose.apply(this, arguments);
    gs.GlobalEventManager.offByOwner("mouseUp", this.object);
    return gs.GlobalEventManager.offByOwner("mouseMoved", this.object);
  };


  /**
  * Checks if the specified point is inside of the hotspot's shape.
  *
  * @method checkShape
  * @param x - The x-coordinate of the point.
  * @param y - The y-coordinate of the point.
  * @return If <b>true</b> the point is inside of the hotspot's shape. Otherwise <b>false</b>.
   */

  Component_HotspotBehavior.prototype.checkShape = function(x, y) {
    var ref, result;
    result = true;
    switch (this.shape) {
      case gs.HotspotShape.PIXEL:
        if (this.object.bitmap) {
          result = this.object.bitmap.isPixelSet(x, y);
        } else {
          result = (ref = this.object.target) != null ? ref.bitmap.isPixelSet(x, y) : void 0;
        }
    }
    return result;
  };


  /**
  * Updates the image depending on the hotspot state.
  *
  * @method updateImage
  * @protected
   */

  Component_HotspotBehavior.prototype.updateImage = function() {
    var baseImage, object;
    object = this.object.target || this.object;
    if (this.object.images != null) {
      baseImage = this.enabled ? this.object.images[4] || this.object.images[0] : this.object.images[0];
      if (this.containsPointer) {
        if (this.object.selected || this.selected) {
          object.image = this.object.images[3] || this.object.images[2] || baseImage;
        } else {
          object.image = this.object.images[1] || baseImage;
        }
      } else {
        if (this.object.selected || this.selected) {
          object.image = this.object.images[2] || this.object.images[4] || baseImage;
        } else {
          object.image = baseImage;
        }
      }
      if (!object.image) {
        return object.bitmap = null;
      }
    }
  };


  /**
  * Updates the hotspot position and size from an other target game object. For example, 
  * that is useful for adding a hotspot to an other moving game object.
  *
  * @method updateFromTarget
  * @protected
   */

  Component_HotspotBehavior.prototype.updateFromTarget = function() {
    if (this.object.target != null) {
      this.object.dstRect.x = this.object.target.dstRect.x;
      this.object.dstRect.y = this.object.target.dstRect.y;
      this.object.dstRect.width = this.object.target.dstRect.width;
      this.object.dstRect.height = this.object.target.dstRect.height;
      this.object.offset.x = this.object.target.offset.x;
      this.object.offset.y = this.object.target.offset.y;
      this.object.origin.x = this.object.target.origin.x;
      return this.object.origin.y = this.object.target.origin.y;
    }
  };


  /**
  * Updates the event-handling and fires necessary events.
  *
  * @method updateEvents
  * @protected
   */

  Component_HotspotBehavior.prototype.updateEvents = function() {
    var group, j, len, object;
    if (this.buttonUp && this.object.enabled && this.enabled && this.object.visible) {
      if (this.object.selectable) {
        group = gs.ObjectManager.current.objectsByGroup(this.object.group);
        for (j = 0, len = group.length; j < len; j++) {
          object = group[j];
          if (object !== this.object) {
            object.selected = false;
          }
        }
        if (this.object.group) {
          this.selected = true;
        } else {
          this.selected = !this.selected;
        }
        if (this.selected) {
          AudioManager.playSound(this.sounds[0] || this.sound);
        } else {
          AudioManager.playSound(this.sounds[1] || this.sound);
        }
        this.object.events.emit("click", this);
        return this.object.events.emit("stateChanged", this.object);
      } else {
        AudioManager.playSound(this.sounds[0] || this.sound);
        this.object.events.emit("click", this);
        return this.object.events.emit("action", this);
      }
    }
  };


  /**
  * Updates the game object's color depending on the state of the hotspot.
  *
  * @method updateColor
  * @protected
   */

  Component_HotspotBehavior.prototype.updateColor = function() {
    if (!this.object.enabled) {
      return this.object.color.set(0, 0, 0, 100);
    } else {
      return this.object.color.set(0, 0, 0, 0);
    }
  };


  /**
  * Stores current states of mouse/touch pointer and buttons.
  *
  * @method updateInput
  * @protected
   */

  Component_HotspotBehavior.prototype.updateInput = function() {
    this.buttonUp = Input.Mouse.buttons[this.actionButton] === 2 && this.containsPointer;
    return this.buttonDown = Input.Mouse.buttons[this.actionButton] === 1 && this.containsPointer;
  };


  /**
  * Updates the hotspot component.
  *
  * @method update
   */

  Component_HotspotBehavior.prototype.update = function() {
    if (!this.object.visible) {
      return;
    }
    this.updateColor();
    this.updateFromTarget();
    return this.updateImage();
  };

  return Component_HotspotBehavior;

})(gs.Component);

gs.Component_HotspotBehavior = Component_HotspotBehavior;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVFBLElBQUEsdUNBQUE7RUFBQTs7O0FBQU07OztFQUNGLFlBQUMsQ0FBQSxTQUFELEdBQWE7O0VBQ2IsWUFBQyxDQUFBLEtBQUQsR0FBUzs7Ozs7O0FBQ2IsRUFBRSxDQUFDLFlBQUgsR0FBa0I7O0FBRVo7Ozs7QUFDRjs7Ozs7Ozs7O3NDQVFBLG1CQUFBLEdBQXFCLFNBQUMsSUFBRCxFQUFPLE9BQVA7V0FDakIsSUFBQyxDQUFBLGtCQUFELENBQUE7RUFEaUI7OztBQUdyQjs7Ozs7Ozs7Ozs7O0VBV2EsbUNBQUMsTUFBRDs7QUFDVDs7Ozs7QUFBQSxRQUFBO0lBS0EsSUFBQyxDQUFBLEtBQUQsR0FBUyxFQUFFLENBQUMsWUFBWSxDQUFDOztBQUV6Qjs7Ozs7SUFLQSxJQUFDLENBQUEsUUFBRCxHQUFZOztBQUVaOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBRVg7Ozs7O0lBS0EsSUFBQyxDQUFBLGFBQUQsR0FBaUI7O0FBRWpCOzs7Ozs7SUFNQSxJQUFDLENBQUEsZUFBRCxHQUFtQjs7QUFFbkI7Ozs7OztJQU1BLElBQUMsQ0FBQSxRQUFELEdBQVk7O0FBRVo7Ozs7OztJQU1BLElBQUMsQ0FBQSxVQUFELEdBQWM7O0FBRWQ7Ozs7O0lBS0EsSUFBQyxDQUFBLGFBQUQsR0FBaUI7TUFBRSxNQUFBLEVBQVEsS0FBSyxDQUFDLEtBQUssQ0FBQyxXQUF0QjtNQUFtQyxPQUFBLEVBQVMsS0FBSyxDQUFDLEtBQUssQ0FBQyxZQUF4RDtNQUFzRSxRQUFBLEVBQVUsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUE1Rjs7O0FBRWpCOzs7Ozs7SUFNQSxJQUFDLENBQUEsWUFBRCxHQUFnQixJQUFDLENBQUEsYUFBYyx1RUFBdUIsTUFBdkI7O0FBRS9COzs7OztJQUtBLElBQUMsQ0FBQSxLQUFELG9CQUFTLE1BQU0sQ0FBRTs7QUFFakI7Ozs7Ozs7OztJQVNBLElBQUMs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QWMsS0FBSyxDQUFDLEtBQUssQ0FBQyxPQUFRLENBQUEsSUFBQyxDQUFBLFlBQUQsQ0FBcEIsS0FBc0MsQ0FBdEMsSUFBNEMsSUFBQyxDQUFBO0VBRmxEOzs7QUFJYjs7Ozs7O3NDQUtBLE1BQUEsR0FBUSxTQUFBO0lBQ0osSUFBRyxDQUFJLElBQUMsQ0FBQSxNQUFNLENBQUMsT0FBZjtBQUE0QixhQUE1Qjs7SUFFQSxJQUFDLENBQUEsV0FBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLGdCQUFELENBQUE7V0FDQSxJQUFDLENBQUEsV0FBRCxDQUFBO0VBTEk7Ozs7R0F0VDRCLEVBQUUsQ0FBQzs7QUE2VDNDLEVBQUUsQ0FBQyx5QkFBSCxHQUErQiIsInNvdXJjZXNDb250ZW50IjpbIiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuI1xuIyAgIFNjcmlwdDogQ29tcG9uZW50X0hvdHNwb3RCZWhhdmlvclxuI1xuIyAgICQkQ09QWVJJR0hUJCRcbiNcbiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jbGFzcyBIb3RzcG90U2hhcGVcbiAgICBAUkVDVEFOR0xFID0gXCJyZWN0XCJcbiAgICBAUElYRUwgPSBcInBpeGVsXCJcbmdzLkhvdHNwb3RTaGFwZSA9IEhvdHNwb3RTaGFwZVxuXG5jbGFzcyBDb21wb25lbnRfSG90c3BvdEJlaGF2aW9yIGV4dGVuZHMgZ3MuQ29tcG9uZW50XG4gICAgIyMjKlxuICAgICogQ2FsbGVkIGlmIHRoaXMgb2JqZWN0IGluc3RhbmNlIGlzIHJlc3RvcmVkIGZyb20gYSBkYXRhLWJ1bmRsZS4gSXQgY2FuIGJlIHVzZWRcbiAgICAqIHJlLWFzc2lnbiBldmVudC1oYW5kbGVyLCBhbm9ueW1vdXMgZnVuY3Rpb25zLCBldGMuXG4gICAgKiBcbiAgICAqIEBtZXRob2Qgb25EYXRhQnVuZGxlUmVzdG9yZS5cbiAgICAqIEBwYXJhbSBPYmplY3QgZGF0YSAtIFRoZSBkYXRhLWJ1bmRsZVxuICAgICogQHBhcmFtIGdzLk9iamVjdENvZGVjQ29udGV4dCBjb250ZXh0IC0gVGhlIGNvZGVjLWNvbnRleHQuXG4gICAgIyMjXG4gICAgb25EYXRhQnVuZGxlUmVzdG9yZTogKGRhdGEsIGNvbnRleHQpIC0+XG4gICAgICAgIEBzZXR1cEV2ZW50SGFuZGxlcnMoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBBZGRzIGEgaG90c3BvdC1iZWhhdmlvciB0byBhIGdhbWUgb2JqZWN0LiBUaGF0IGFsbG93cyBhIGdhbWUgb2JqZWN0XG4gICAgKiB0byByZXNwb25kIHRvIG1vdXNlL3RvdWNoIGFjdGlvbnMgYnkgZmlyaW5nIGFuIGFjdGlvbi1ldmVudCBvciBjaGFuZ2luZ1xuICAgICogdGhlIGdhbWUgb2JqZWN0J3MgaW1hZ2UuXG4gICAgKlxuICAgICogQG1vZHVsZSBnc1xuICAgICogQGNsYXNzIENvbXBvbmVudF9Ib3RzcG90QmVoYXZpb3JcbiAgICAqIEBleHRlbmRzIGdzLkNvbXBvbmVudFxuICAgICogQG1lbWJlcm9mIGdzXG4gICAgKiBAY29uc3RydWN0b3JcbiAgICAjIyNcbiAgICBjb25zdHJ1Y3RvcjogKHBhcmFtcykgLT5cbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBzaGFwZSB1c2VkIHRvIGRldGVjdCBpZiBhIGhvdHNwb3QgaXMgY2xpY2tlZCwgaG92ZXJlZCwgZXRjLlxuICAgICAgICAqIEBwcm9wZXJ0eSBzaGFwZVxuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgIyMjXG4gICAgICAgIEBzaGFwZSA9IGdzLkhvdHNwb3RTaGFwZS5SRUNUQU5HTEVcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGhvdHNwb3QgaXMgc2VsZWN0ZWQuXG4gICAgICAgICogQHByb3BlcnR5IHNlbGVjdGVkXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAjIyNcbiAgICAgICAgQHNlbGVjdGVkID0gbm9cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGhvdHNwb3QgaXMgZW5hYmxlZC5cbiAgICAgICAgKiBAcHJvcGVydHkgZW5hYmxlZFxuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgIyMjXG4gICAgICAgIEBlbmFibGVkID0geWVzXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogQHByb3BlcnR5IGltYWdlSGFuZGxpbmdcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAaW1hZ2VIYW5kbGluZyA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIG1vdXNlL3RvdWNoIHBvaW50ZXIgaXMgaW5zaWRlIHRoZSBob3RzcG90IGJvdW5kcy5cbiAgICAgICAgKiBAcHJvcGVydHkgY29udGFpbnNcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQGNvbnRhaW5zUG9pbnRlciA9IG5vXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogSW5kaWNhdGVzIGlmIHRoZSBhY3Rpb24tYnV0dG9uIHdhcyBwcmVzc2VkIGJlZm9yZS5cbiAgICAgICAgKiBAcHJvcGVydHkgYnV0dG9uVXBcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQGJ1dHRvblVwID0gbm9cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGFjdGlvbi1idXR0b24gaXMgcHJlc3NlZC5cbiAgICAgICAgKiBAcHJvcGVydHkgYnV0dG9uRG93blxuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAYnV0dG9uRG93biA9IG5vXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogQHByb3BlcnR5IGFjdGlvbkJ1dHRvbnNcbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAYWN0aW9uQnV0dG9ucyA9IHsgXCJsZWZ0XCI6IElucHV0Lk1vdXNlLkJVVFRPTl9MRUZULCBcInJpZ2h0XCI6IElucHV0Lk1vdXNlLkJVVFRPTl9SSUdIVCwgXCJtaWRkbGVcIjogSW5wdXQuTW91c2UuQlVUVE9OX01JRERMRSB9XG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIGRlZmF1bHQgYWN0aW9uLWJ1dHRvbi4gQnkgZGVmYXVsdCB0aGUgbGVmdC1idXR0b24gaXMgdXNlZC5cbiAgICAgICAgKlxuICAgICAgICAqIEBwcm9wZXJ0eSBhY3Rpb25CdXR0b25cbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgIyMjXG4gICAgICAgIEBhY3Rpb25CdXR0b24gPSBAYWN0aW9uQnV0dG9uc1twYXJhbXM/LmFjdGlvbkJ1dHRvbiA/IFwibGVmdFwiXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBzb3VuZCBwbGF5ZWQgaWYgdGhlIGhvdHNwb3QgYWN0aW9uIGlzIGV4ZWN1dGVkLlxuICAgICAgICAqIEBwcm9wZXJ0eSBzb3VuZFxuICAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICAjIyNcbiAgICAgICAgQHNvdW5kID0gcGFyYW1zPy5zb3VuZFxuXG4gICAgICAgICMjIypcbiAgICAgICAgKiA8cD5UaGUgc291bmRzIHBsYXllZCBkZXBlbmRpbmcgb24gdGhlIGhvdHNwb3Qgc3RhdGUuPC9wPlxuICAgICAgICAqIDx1bD5cbiAgICAgICAgKiA8bGk+MCA9IFNlbGVjdCBTb3VuZDwvbGk+XG4gICAgICAgICogPGxpPjEgPSBVbnNlbGVjdCBTb3VuZDwvbGk+XG4gICAgICAgICogPC91bD5cbiAgICAgICAgKiBAcHJvcGVydHkgc291bmRzXG4gICAgICAgICogQHR5cGUgT2JqZWN0W11cbiAgICAgICAgIyMjXG4gICAgICAgIEBzb3VuZHMgPSBwYXJhbXM/LnNvdW5kcyB8fCBbXVxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cEV2ZW50SGFuZGxlcnNcbiAgICAjIyMgICBcbiAgICBzZXR1cEV2ZW50SGFuZGxlcnM6IC0+XG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vbiBcIm1vdXNlVXBcIiwgKChlKSA9PiBcbiAgICAgICAgICAgIHJldHVybiBpZiBub3QgQG9iamVjdC52aXNpYmxlXG4gICAgICAgICAgICBteCA9IElucHV0Lk1vdXNlLnggLSBAb2JqZWN0Lm9yaWdpbi54XG4gICAgICAgICAgICBteSA9IElucHV0Lk1vdXNlLnkgLSBAb2JqZWN0Lm9yaWdpbi55XG4gICAgICAgICAgICBjb250YWlucyA9IFJlY3QuY29udGFpbnMoQG9iamVjdC5kc3RSZWN0LngsIEBvYmplY3QuZHN0UmVjdC55LCBcbiAgICAgICAgICAgICAgICAgICAgICAgICBAb2JqZWN0LmRzdFJlY3Qud2lkdGgsIEBvYmplY3QuZHN0UmVjdC5oZWlnaHQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgbXgsIG15KVxuICAgICAgICAgICAgaWYgY29udGFpbnNcbiAgICAgICAgICAgICAgICBjb250YWlucyA9IEBjaGVja1NoYXBlKG14IC0gQG9iamVjdC5kc3RSZWN0LngsIG15IC0gQG9iamVjdC5kc3RSZWN0LnkpXG4gICAgICAgICAgICAgICAgaWYgY29udGFpbnMgICBcbiAgICAgICAgICAgICAgICAgICAgQGNvbnRhaW5zUG9pbnRlciA9IGNvbnRhaW5zXG4gICAgICAgICAgICAgICAgICAgIEB1cGRhdGVJbnB1dCgpXG4gICAgICAgICAgICAgICAgICAgIEB1cGRhdGVFdmVudHMoKVxuICAgICAgICAgICAgICAgICAgICBAb2JqZWN0Lm5lZWRzVXBkYXRlID0geWVzXG4gICAgICAgICAgICAgICAgICAgIGUuYnJlYWtDaGFpbiA9IHllc1xuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIG51bGwsIEBvYmplY3RcbiAgICAgICAgICAgIFxuICAgICAgICBpZiBAb2JqZWN0LmltYWdlcyBvciB5ZXNcbiAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vbiBcIm1vdXNlTW92ZWRcIiwgKChlKSA9PlxuICAgICAgICAgICAgICAgIHJldHVybiBpZiBub3QgQG9iamVjdC52aXNpYmxlXG4gICAgICAgICAgICAgICAgY29udGFpbnMgPSBSZWN0LmNvbnRhaW5zKEBvYmplY3QuZHN0UmVjdC54LCBAb2JqZWN0LmRzdFJlY3QueSwgXG4gICAgICAgICAgICAgICAgICAgICAgICAgQG9iamVjdC5kc3RSZWN0LndpZHRoLCBAb2JqZWN0LmRzdFJlY3QuaGVpZ2h0LFxuICAgICAgICAgICAgICAgICAgICAgICAgIElucHV0Lk1vdXNlLnggLSBAb2JqZWN0Lm9yaWdpbi54LCBJbnB1dC5Nb3VzZS55IC0gQG9iamVjdC5vcmlnaW4ueSlcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIGNvbnRhaW5zXG4gICAgICAgICAgICAgICAgICAgIG14ID0gSW5wdXQuTW91c2UueCAtIEBvYmplY3Qub3JpZ2luLnhcbiAgICAgICAgICAgICAgICAgICAgbXkgPSBJbnB1dC5Nb3VzZS55IC0gQG9iamVjdC5vcmlnaW4ueVxuICAgICAgICAgICAgICAgICAgICBjb250YWlucyA9IEBjaGVja1NoYXBlKG14IC0gQG9iamVjdC5kc3RSZWN0LngsIG15IC0gQG9iamVjdC5kc3RSZWN0LnkpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIEBjb250YWluc1BvaW50ZXIgIT0gY29udGFpbnNcbiAgICAgICAgICAgICAgICAgICAgQGNvbnRhaW5zUG9pbnRlciA9IGNvbnRhaW5zXG4gICAgICAgICAgICAgICAgICAgIEBvYmplY3QubmVlZHNVcGRhdGUgPSB5ZXNcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGlmIGNvbnRhaW5zXG4gICAgICAgICAgICAgICAgICAgICAgICBAb2JqZWN0LmV2ZW50cy5lbWl0KFwiZW50ZXJcIiwgdGhpcylcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgQG9iamVjdC5ldmVudHMuZW1pdChcImxlYXZlXCIsIHRoaXMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgQHVwZGF0ZUlucHV0KClcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBudWxsLCBAb2JqZWN0XG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBJbml0aWFsaXplcyB0aGUgaG90c3BvdCBjb21wb25lbnQuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cFxuICAgICMjI1xuICAgIHNldHVwOiAtPlxuICAgICAgICBzdXBlclxuICAgICAgICBcbiAgICAgICAgQHNvdW5kID0gdWkuQ29tcG9uZW50X0Zvcm11bGFIYW5kbGVyLmZpZWxkVmFsdWUoQG9iamVjdCwgQHNvdW5kKVxuICAgICAgICBcbiAgICAgICAgaWYgQHNvdW5kcz9cbiAgICAgICAgICAgIGZvciBzb3VuZCwgaSBpbiBAc291bmRzXG4gICAgICAgICAgICAgICAgQHNvdW5kc1tpXSA9IHVpLkNvbXBvbmVudF9Gb3JtdWxhSGFuZGxlci5maWVsZFZhbHVlKEBvYmplY3QsIHNvdW5kKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgIEBzb3VuZHMgPSBbXVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIEBzZXR1cEV2ZW50SGFuZGxlcnMoKVxuICAgICAgICAgICAgICAgIFxuIFxuICAgIFxuICAgICMjIypcbiAgICAqIERpc3Bvc2VzIHRoZSBjb21wb25lbnQuXG4gICAgKlxuICAgICogQG1ldGhvZCBkaXNwb3NlXG4gICAgIyMjXG4gICAgZGlzcG9zZTogLT5cbiAgICAgICAgc3VwZXJcbiAgICAgICAgXG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwibW91c2VVcFwiLCBAb2JqZWN0KVxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub2ZmQnlPd25lcihcIm1vdXNlTW92ZWRcIiwgQG9iamVjdClcbiAgICAgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogQ2hlY2tzIGlmIHRoZSBzcGVjaWZpZWQgcG9pbnQgaXMgaW5zaWRlIG9mIHRoZSBob3RzcG90J3Mgc2hhcGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBjaGVja1NoYXBlXG4gICAgKiBAcGFyYW0geCAtIFRoZSB4LWNvb3JkaW5hdGUgb2YgdGhlIHBvaW50LlxuICAgICogQHBhcmFtIHkgLSBUaGUgeS1jb29yZGluYXRlIG9mIHRoZSBwb2ludC5cbiAgICAqIEByZXR1cm4gSWYgPGI+dHJ1ZTwvYj4gdGhlIHBvaW50IGlzIGluc2lkZSBvZiB0aGUgaG90c3BvdCdzIHNoYXBlLiBPdGhlcndpc2UgPGI+ZmFsc2U8L2I+LlxuICAgICMjIyAgXG4gICAgY2hlY2tTaGFwZTogKHgsIHkpIC0+XG4gICAgICAgIHJlc3VsdCA9IHllc1xuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBzaGFwZVxuICAgICAgICAgICAgd2hlbiBncy5Ib3RzcG90U2hhcGUuUElYRUxcbiAgICAgICAgICAgICAgICBpZiBAb2JqZWN0LmJpdG1hcFxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBAb2JqZWN0LmJpdG1hcC5pc1BpeGVsU2V0KHgsIHkpXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICByZXN1bHQgPSBAb2JqZWN0LnRhcmdldD8uYml0bWFwLmlzUGl4ZWxTZXQoeCwgeSlcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogVXBkYXRlcyB0aGUgaW1hZ2UgZGVwZW5kaW5nIG9uIHRoZSBob3RzcG90IHN0YXRlLlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlSW1hZ2VcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgICAgXG4gICAgdXBkYXRlSW1hZ2U6IC0+XG4gICAgICAgIG9iamVjdCA9IEBvYmplY3QudGFyZ2V0IHx8IEBvYmplY3RcbiAgICAgICAgaWYgQG9iamVjdC5pbWFnZXM/XG4gICAgICAgICAgICBiYXNlSW1hZ2UgPSBpZiBAZW5hYmxlZCB0aGVuIEBvYmplY3QuaW1hZ2VzWzRdIHx8IEBvYmplY3QuaW1hZ2VzWzBdIGVsc2UgQG9iamVjdC5pbWFnZXNbMF1cbiAgICAgICAgICAgIGlmIEBjb250YWluc1BvaW50ZXJcbiAgICAgICAgICAgICAgICBpZiBAb2JqZWN0LnNlbGVjdGVkIG9yIEBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuaW1hZ2UgPSBAb2JqZWN0LmltYWdlc1szXSB8fCBAb2JqZWN0LmltYWdlc1syXSB8fCBiYXNlSW1hZ2VcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pbWFnZSA9IEBvYmplY3QuaW1hZ2VzWzFdIHx8IGJhc2VJbWFnZVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGlmIEBvYmplY3Quc2VsZWN0ZWQgb3IgQHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pbWFnZSA9IEBvYmplY3QuaW1hZ2VzWzJdIHx8IEBvYmplY3QuaW1hZ2VzWzRdIHx8IGJhc2VJbWFnZVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmltYWdlID0gYmFzZUltYWdlXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgIW9iamVjdC5pbWFnZVxuICAgICAgICAgICAgICAgIG9iamVjdC5iaXRtYXAgPSBudWxsXG5cbiAgICBcbiAgICAjIyMqXG4gICAgKiBVcGRhdGVzIHRoZSBob3RzcG90IHBvc2l0aW9uIGFuZCBzaXplIGZyb20gYW4gb3RoZXIgdGFyZ2V0IGdhbWUgb2JqZWN0LiBGb3IgZXhhbXBsZSwgXG4gICAgKiB0aGF0IGlzIHVzZWZ1bCBmb3IgYWRkaW5nIGEgaG90c3BvdCB0byBhbiBvdGhlciBtb3ZpbmcgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVGcm9tVGFyZ2V0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIHVwZGF0ZUZyb21UYXJnZXQ6IC0+XG4gICAgICAgIGlmIEBvYmplY3QudGFyZ2V0P1xuICAgICAgICAgICAgQG9iamVjdC5kc3RSZWN0LnggPSBAb2JqZWN0LnRhcmdldC5kc3RSZWN0LnhcbiAgICAgICAgICAgIEBvYmplY3QuZHN0UmVjdC55ID0gQG9iamVjdC50YXJnZXQuZHN0UmVjdC55XG4gICAgICAgICAgICBAb2JqZWN0LmRzdFJlY3Qud2lkdGggPSBAb2JqZWN0LnRhcmdldC5kc3RSZWN0LndpZHRoXG4gICAgICAgICAgICBAb2JqZWN0LmRzdFJlY3QuaGVpZ2h0ID0gQG9iamVjdC50YXJnZXQuZHN0UmVjdC5oZWlnaHRcbiAgICAgICAgICAgIEBvYmplY3Qub2Zmc2V0LnggPSBAb2JqZWN0LnRhcmdldC5vZmZzZXQueFxuICAgICAgICAgICAgQG9iamVjdC5vZmZzZXQueSA9IEBvYmplY3QudGFyZ2V0Lm9mZnNldC55XG4gICAgICAgICAgICBAb2JqZWN0Lm9yaWdpbi54ID0gQG9iamVjdC50YXJnZXQub3JpZ2luLnhcbiAgICAgICAgICAgIEBvYmplY3Qub3JpZ2luLnkgPSBAb2JqZWN0LnRhcmdldC5vcmlnaW4ueSBcbiAgICAgXG4gICAgIyMjKlxuICAgICogVXBkYXRlcyB0aGUgZXZlbnQtaGFuZGxpbmcgYW5kIGZpcmVzIG5lY2Vzc2FyeSBldmVudHMuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVFdmVudHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIHVwZGF0ZUV2ZW50czogLT5cbiAgICAgICAgaWYgQGJ1dHRvblVwIGFuZCBAb2JqZWN0LmVuYWJsZWQgYW5kIEBlbmFibGVkIGFuZCBAb2JqZWN0LnZpc2libGVcbiAgICAgICAgICAgIGlmIEBvYmplY3Quc2VsZWN0YWJsZVxuICAgICAgICAgICAgICAgIGdyb3VwID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdHNCeUdyb3VwKEBvYmplY3QuZ3JvdXApXG4gICAgICAgICAgICAgICAgZm9yIG9iamVjdCBpbiBncm91cFxuICAgICAgICAgICAgICAgICAgICBpZiBvYmplY3QgIT0gQG9iamVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnNlbGVjdGVkID0gbm9cbiAgICAgICAgICAgICAgICBpZiBAb2JqZWN0Lmdyb3VwXG4gICAgICAgICAgICAgICAgICAgIEBzZWxlY3RlZCA9IHllc1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgQHNlbGVjdGVkID0gIUBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIEBzZWxlY3RlZFxuICAgICAgICAgICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheVNvdW5kKEBzb3VuZHNbMF0gfHwgQHNvdW5kKVxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnBsYXlTb3VuZChAc291bmRzWzFdIHx8IEBzb3VuZClcbiAgICAgICAgICAgICAgICBAb2JqZWN0LmV2ZW50cy5lbWl0KFwiY2xpY2tcIiwgdGhpcylcbiAgICAgICAgICAgICAgICBAb2JqZWN0LmV2ZW50cy5lbWl0KFwic3RhdGVDaGFuZ2VkXCIsIEBvYmplY3QpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnBsYXlTb3VuZChAc291bmRzWzBdIHx8IEBzb3VuZClcbiAgICAgICAgICAgICAgICBAb2JqZWN0LmV2ZW50cy5lbWl0KFwiY2xpY2tcIiwgdGhpcylcbiAgICAgICAgICAgICAgICBAb2JqZWN0LmV2ZW50cy5lbWl0KFwiYWN0aW9uXCIsIHRoaXMpXG4gICAgXG4gICAgIyMjKlxuICAgICogVXBkYXRlcyB0aGUgZ2FtZSBvYmplY3QncyBjb2xvciBkZXBlbmRpbmcgb24gdGhlIHN0YXRlIG9mIHRoZSBob3RzcG90LlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlQ29sb3JcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIHVwZGF0ZUNvbG9yOiAtPlxuICAgICAgICBpZiAhQG9iamVjdC5lbmFibGVkXG4gICAgICAgICAgICBAb2JqZWN0LmNvbG9yLnNldCgwLCAwLCAwLCAxMDApXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBvYmplY3QuY29sb3Iuc2V0KDAsIDAsIDAsIDApXG4gICAgIFxuICAgICMjIypcbiAgICAqIFN0b3JlcyBjdXJyZW50IHN0YXRlcyBvZiBtb3VzZS90b3VjaCBwb2ludGVyIGFuZCBidXR0b25zLlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlSW5wdXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIHVwZGF0ZUlucHV0OiAtPlxuICAgICAgICBAYnV0dG9uVXAgPSBJbnB1dC5Nb3VzZS5idXR0b25zW0BhY3Rpb25CdXR0b25dID09IDIgYW5kIEBjb250YWluc1BvaW50ZXJcbiAgICAgICAgQGJ1dHRvbkRvd24gPSBJbnB1dC5Nb3VzZS5idXR0b25zW0BhY3Rpb25CdXR0b25dID09IDEgYW5kIEBjb250YWluc1BvaW50ZXJcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogVXBkYXRlcyB0aGUgaG90c3BvdCBjb21wb25lbnQuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAjIyNcbiAgICB1cGRhdGU6IC0+XG4gICAgICAgIGlmIG5vdCBAb2JqZWN0LnZpc2libGUgdGhlbiByZXR1cm5cblxuICAgICAgICBAdXBkYXRlQ29sb3IoKVxuICAgICAgICBAdXBkYXRlRnJvbVRhcmdldCgpXG4gICAgICAgIEB1cGRhdGVJbWFnZSgpXG4gICAgICAgIFxuZ3MuQ29tcG9uZW50X0hvdHNwb3RCZWhhdmlvciA9IENvbXBvbmVudF9Ib3RzcG90QmVoYXZpb3IiXX0=
//# sourceURL=Component_HotspotBehavior_19.js