var Component_BlurAnimation,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Component_BlurAnimation = (function(superClass) {
  extend(Component_BlurAnimation, superClass);


  /**
  * Executes a blur-animation on a game-object.
  *
  * @module gs
  * @class Component_BlurAnimation
  * @extends gs.Component_Animation
  * @memberof gs
  * @constructor
   */

  function Component_BlurAnimation(data) {
    Component_BlurAnimation.__super__.constructor.apply(this, arguments);

    /**
    * The easing-object used for the animation.
    * @property easing
    * @type gs.Easing
     */
    this.easing = new gs.Easing(null, data != null ? data.easing : void 0);
  }


  /**
  * Serializes the blend-animation into a data-bundle.
  *
  * @method toDataBundle
   */

  Component_BlurAnimation.prototype.toDataBundle = function() {
    return {
      easing: this.easing
    };
  };


  /**
  * Updates the blend-animation.
  *
  * @method update
   */

  Component_BlurAnimation.prototype.update = function() {
    Component_BlurAnimation.__super__.update.apply(this, arguments);
    if (!this.easing.isRunning) {
      return;
    }
    this.easing.updateValue();
    this.object.effects.blur.power = this.easing.value;
    if (!this.easing.isRunning) {
      this.object.effects.blur.enabled = this.object.effects.blur.power > 0;
      return typeof this.callback === "function" ? this.callback(this.object, this) : void 0;
    }
  };


  /**
  * Starts the blend-animation.
  *
  * @method start
  * @param {number} power The target power.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback called if the animation is finished.
   */

  Component_BlurAnimation.prototype.start = function(power, duration, easingType, callback) {
    this.callback = callback;
    this.easing.type = easingType || gs.Easings.EASE_LINEAR[gs.EasingTypes.EASE_IN];
    if (this.object.effects.blur.power === power) {
      return typeof this.callback === "function" ? this.callback(this.object, this) : void 0;
    }
    if (duration === 0 || this.isInstantSkip()) {
      this.object.effects.blur.power = power;
      return typeof this.callback === "function" ? this.callback(this.object, this) : void 0;
    } else {
      return this.easing.startValue(this.object.effects.blur.power, power - this.object.effects.blur.power, duration);
    }
  };

  return Component_BlurAnimation;

})(gs.Component_Animation);

gs.Component_BlurAnimation = Component_BlurAnimation;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUEsdUJBQUE7RUFBQTs7O0FBQU07Ozs7QUFDRjs7Ozs7Ozs7OztFQVNhLGlDQUFDLElBQUQ7SUFDVCwwREFBQSxTQUFBOztBQUVBOzs7OztJQUtBLElBQUMsQ0FBQSxNQUFELEdBQWMsSUFBQSxFQUFFLENBQUMsTUFBSCxDQUFVLElBQVYsaUJBQWdCLElBQUksQ0FBRSxlQUF0QjtFQVJMOzs7QUFVYjs7Ozs7O29DQUtBLFlBQUEsR0FBYyxTQUFBO1dBQ1Y7TUFBQSxNQUFBLEVBQVEsSUFBQyxDQUFBLE1BQVQ7O0VBRFU7OztBQUdkOzs7Ozs7b0NBS0EsTUFBQSxHQUFRLFNBQUE7SUFDSixxREFBQSxTQUFBO0lBQ0EsSUFBRyxDQUFJLElBQUMsQ0FBQSxNQUFNLENBQUMsU0FBZjtBQUE4QixhQUE5Qjs7SUFFQSxJQUFDLENBQUEsTUFBTSxDQUFDLFdBQVIsQ0FBQTtJQUNBLElBQUMsQ0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFyQixHQUE2QixJQUFDLENBQUEsTUFBTSxDQUFDO0lBRXJDLElBQUcsQ0FBSSxJQUFDLENBQUEsTUFBTSxDQUFDLFNBQWY7TUFDSSxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBckIsR0FBK0IsSUFBQyxDQUFBLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQXJCLEdBQTZCO21EQUM1RCxJQUFDLENBQUEsU0FBVSxJQUFDLENBQUEsUUFBUSxlQUZ4Qjs7RUFQSTs7O0FBV1I7Ozs7Ozs7Ozs7b0NBU0EsS0FBQSxHQUFPLFNBQUMsS0FBRCxFQUFRLFFBQVIsRUFBa0IsVUFBbEIsRUFBOEIsUUFBOUI7SUFDSCxJQUFDLENBQUEsUUFBRCxHQUFZO0lBQ1osSUFBQyxDQUFBLE1BQU0sQ0FBQyxJQUFSLEdBQWUsVUFBQSxJQUFjLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBWSxDQUFBLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBZjtJQUNwRCxJQUFHLElBQUMsQ0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFyQixLQUE4QixLQUFqQztBQUE0QyxtREFBTyxJQUFDLENBQUEsU0FBVSxJQUFDLENBQUEsUUFBUSxlQUF2RTs7SUFFQSxJQUFHLFFBQUEsS0FBWSxDQUFaLElBQWlCLElBQUMsQ0FBQSxhQUFELENBQUEsQ0FBcEI7TUFDSSxJQUFDLENBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBckIsR0FBNkI7bURBQzdCLElBQUMsQ0FBQSxTQUFVLElBQUMsQ0FBQSxRQUFRLGVBRnhCO0tBQUEsTUFBQTthQUlJLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixDQUFtQixJQUFDLENBQUEsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBeEMsRUFBK0MsS0FBQSxHQUFRLElBQUMsQ0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUE1RSxFQUFtRixRQUFuRixFQUpKOztFQUxHOzs7O0dBckQyQixFQUFFLENBQUM7O0FBZ0V6QyxFQUFFLENBQUMsdUJBQUgsR0FBNkIiLCJzb3VyY2VzQ29udGVudCI6WyIjID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiNcbiMgICBTY3JpcHQ6IENvbXBvbmVudF9CbHVyQW5pbWF0aW9uXG4jXG4jICAgJCRDT1BZUklHSFQkJFxuI1xuIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5jbGFzcyBDb21wb25lbnRfQmx1ckFuaW1hdGlvbiBleHRlbmRzIGdzLkNvbXBvbmVudF9BbmltYXRpb25cbiAgICAjIyMqXG4gICAgKiBFeGVjdXRlcyBhIGJsdXItYW5pbWF0aW9uIG9uIGEgZ2FtZS1vYmplY3QuXG4gICAgKlxuICAgICogQG1vZHVsZSBnc1xuICAgICogQGNsYXNzIENvbXBvbmVudF9CbHVyQW5pbWF0aW9uXG4gICAgKiBAZXh0ZW5kcyBncy5Db21wb25lbnRfQW5pbWF0aW9uXG4gICAgKiBAbWVtYmVyb2YgZ3NcbiAgICAqIEBjb25zdHJ1Y3RvclxuICAgICMjI1xuICAgIGNvbnN0cnVjdG9yOiAoZGF0YSkgLT5cbiAgICAgICAgc3VwZXJcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZWFzaW5nLW9iamVjdCB1c2VkIGZvciB0aGUgYW5pbWF0aW9uLlxuICAgICAgICAqIEBwcm9wZXJ0eSBlYXNpbmdcbiAgICAgICAgKiBAdHlwZSBncy5FYXNpbmdcbiAgICAgICAgIyMjXG4gICAgICAgIEBlYXNpbmcgPSBuZXcgZ3MuRWFzaW5nKG51bGwsIGRhdGE/LmVhc2luZylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2VyaWFsaXplcyB0aGUgYmxlbmQtYW5pbWF0aW9uIGludG8gYSBkYXRhLWJ1bmRsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHRvRGF0YUJ1bmRsZVxuICAgICMjI1xuICAgIHRvRGF0YUJ1bmRsZTogLT5cbiAgICAgICAgZWFzaW5nOiBAZWFzaW5nXG4gICAgIFxuICAgICMjIypcbiAgICAqIFVwZGF0ZXMgdGhlIGJsZW5kLWFuaW1hdGlvbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICMjIyAgIFxuICAgIHVwZGF0ZTogLT5cbiAgICAgICAgc3VwZXJcbiAgICAgICAgaWYgbm90IEBlYXNpbmcuaXNSdW5uaW5nIHRoZW4gcmV0dXJuXG5cbiAgICAgICAgQGVhc2luZy51cGRhdGVWYWx1ZSgpXG4gICAgICAgIEBvYmplY3QuZWZmZWN0cy5ibHVyLnBvd2VyID0gQGVhc2luZy52YWx1ZVxuICAgICAgICBcbiAgICAgICAgaWYgbm90IEBlYXNpbmcuaXNSdW5uaW5nXG4gICAgICAgICAgICBAb2JqZWN0LmVmZmVjdHMuYmx1ci5lbmFibGVkID0gQG9iamVjdC5lZmZlY3RzLmJsdXIucG93ZXIgPiAwXG4gICAgICAgICAgICBAY2FsbGJhY2s/KEBvYmplY3QsIHRoaXMpXG4gXG4gICAgIyMjKlxuICAgICogU3RhcnRzIHRoZSBibGVuZC1hbmltYXRpb24uXG4gICAgKlxuICAgICogQG1ldGhvZCBzdGFydFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHBvd2VyIFRoZSB0YXJnZXQgcG93ZXIuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2sgY2FsbGVkIGlmIHRoZSBhbmltYXRpb24gaXMgZmluaXNoZWQuIFxuICAgICMjIyAgXG4gICAgc3RhcnQ6IChwb3dlciwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAY2FsbGJhY2sgPSBjYWxsYmFja1xuICAgICAgICBAZWFzaW5nLnR5cGUgPSBlYXNpbmdUeXBlIHx8IGdzLkVhc2luZ3MuRUFTRV9MSU5FQVJbZ3MuRWFzaW5nVHlwZXMuRUFTRV9JTl1cbiAgICAgICAgaWYgQG9iamVjdC5lZmZlY3RzLmJsdXIucG93ZXIgPT0gcG93ZXIgdGhlbiByZXR1cm4gQGNhbGxiYWNrPyhAb2JqZWN0LCB0aGlzKVxuICAgICAgICBcbiAgICAgICAgaWYgZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpXG4gICAgICAgICAgICBAb2JqZWN0LmVmZmVjdHMuYmx1ci5wb3dlciA9IHBvd2VyXG4gICAgICAgICAgICBAY2FsbGJhY2s/KEBvYmplY3QsIHRoaXMpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBlYXNpbmcuc3RhcnRWYWx1ZShAb2JqZWN0LmVmZmVjdHMuYmx1ci5wb3dlciwgcG93ZXIgLSBAb2JqZWN0LmVmZmVjdHMuYmx1ci5wb3dlciwgZHVyYXRpb24pXG4gICAgICAgIFxuZ3MuQ29tcG9uZW50X0JsdXJBbmltYXRpb24gPSBDb21wb25lbnRfQmx1ckFuaW1hdGlvbiJdfQ==
//# sourceURL=Component_BlurAnimation_138.js