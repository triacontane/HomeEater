var Component_Animator,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Component_Animator = (function(superClass) {
  extend(Component_Animator, superClass);


  /**
  * An animator-component allows to execute different kind of animations 
  * on a game object. The animations are using the game object's 
  * dstRect & offset-property to execute.
  *
  * @module gs
  * @class Component_Animator
  * @extends gs.Component
  * @memberof gs
  * @constructor
   */

  function Component_Animator() {
    Component_Animator.__super__.constructor.apply(this, arguments);
    this.moveAnimation = new gs.Component_MoveAnimation();
    this.pathAnimation = new gs.Component_PathAnimation();
    this.zoomAnimation = new gs.Component_ZoomAnimation();
    this.blendAnimation = new gs.Component_BlendAnimation();
    this.blurAnimation = new gs.Component_BlurAnimation();
    this.pixelateAnimation = new gs.Component_PixelateAnimation();
    this.wobbleAnimation = new gs.Component_WobbleAnimation();
    this.colorAnimation = new gs.Component_ColorAnimation();
    this.imageAnimation = new gs.Component_ImageAnimation();
    this.frameAnimation = new gs.Component_FrameAnimation();
    this.fieldAnimation = new gs.Component_FieldAnimation();
    this.shakeAnimation = new gs.Component_ShakeAnimation();
    this.tintAnimation = new gs.Component_TintAnimation();
    this.rotateAnimation = new gs.Component_RotateAnimation();
    this.maskAnimation = new gs.Component_MaskAnimation();
    this.l2dAnimation = new gs.Component_Live2DAnimation();

    /**
    * Standard Callback Routine
    * @property callback
    * @type function
    * @private
     */
    this.callback = function(object, animation) {
      return object.removeComponent(animation);
    };
    this.onBlendFinish = function(object, animation, callback) {
      object.removeComponent(animation);
      return typeof callback === "function" ? callback(object) : void 0;
    };
  }


  /**
  * Updates the animator.
  *
  * @method update
   */

  Component_Animator.prototype.update = function() {
    var ref, ref1;
    Component_Animator.__super__.update.apply(this, arguments);
    if (((ref = this.object.mask) != null ? (ref1 = ref.source) != null ? ref1.videoElement : void 0 : void 0) != null) {
      return this.object.mask.source.update();
    }
  };


  /**
  * Moves the game object with a specified speed.
  *
  * @method move
  * @param {number} speedX The speed on x-axis in pixels per frame.
  * @param {number} speedY The speed on y-axis in pixels per frame.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type used for the animation.
   */

  Component_Animator.prototype.move = function(speedX, speedY, duration, easingType) {
    this.object.addComponent(this.moveAnimation);
    this.moveAnimation.move(speedX, speedY, duration, easingType, this.callback);
    return this.moveAnimation;
  };


  /**
  * Moves the game object to a specified position.
  *
  * @method moveTo
  * @param {number} x The x-coordinate of the position.
  * @param {number} y The y-coordinate of the position.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.moveTo = function(x, y, duration, easingType) {
    this.object.addComponent(this.moveAnimation);
    this.moveAnimation.moveTo(x, y, duration, easingType, this.callback);
    return this.moveAnimation;
  };


  /**
  * Moves the game object along a path.
  *
  * @method movePath
  * @param {Object} path The path to follow.
  * @param {gs.AnimationLoopType} loopType The loop-Type.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {Object[]} effects Optional array of effects executed during the path-movement like playing a sound.
   */

  Component_Animator.prototype.movePath = function(path, loopType, duration, easingType, effects) {
    var c;
    c = this.object.findComponent("Component_PathAnimation");
    if (c != null) {
      c.loopType = loopType;
    } else {
      this.object.addComponent(this.pathAnimation);
      this.pathAnimation.start(path, loopType, duration, easingType, effects, this.callback);
    }
    return this.pathAnimation;
  };


  /**
  * Scrolls the game object with a specified speed.
  *
  * @method scroll
  * @param {number} speedX The speed on x-axis in pixels per frame.
  * @param {number} speedY The speed on y-axis in pixels per frame.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type used for the animation.
   */

  Component_Animator.prototype.scroll = function(speedX, speedY, duration, easingType) {
    this.object.addComponent(this.moveAnimation);
    this.moveAnimation.scroll(speedX, speedY, duration, easingType, this.callback);
    return this.moveAnimation;
  };


  /**
  * Scrolls the game object to a specified position.
  *
  * @method scrollTo
  * @param {number} x The x-coordinate of the position.
  * @param {number} y The y-coordinate of the position.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.scrollTo = function(x, y, duration, easingType) {
    this.object.addComponent(this.moveAnimation);
    this.moveAnimation.scrollTo(x, y, duration, easingType, this.callback);
    return this.moveAnimation;
  };


  /**
  * Scrolls the game object along a path.
  *
  * @method scrollPath
  * @param {Object} path The path to follow.
  * @param {gs.AnimationLoopType} loopType The loop-Type.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.scrollPath = function(path, loopType, duration, easingType) {
    this.object.addComponent(this.pathAnimation);
    this.pathAnimation.scroll(path, loopType, duration, easingType, this.callback);
    return this.pathAnimation;
  };


  /**
  * Zooms a game object to specified size.
  *
  * @method zoomTo
  * @param {number} x The x-axis zoom-factor.
  * @param {number} y The y-axis zoom-factor.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.zoomTo = function(x, y, duration, easingType) {
    this.object.addComponent(this.zoomAnimation);
    this.zoomAnimation.start(x, y, duration, easingType, this.callback);
    return this.zoomAnimation;
  };


  /**
  * Blends a game object to specified opacity.
  *
  * @method blendTo
  * @param {number} opacity The target opacity.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback called if blending is finished.
   */

  Component_Animator.prototype.blendTo = function(opacity, duration, easingType, callback) {
    this.object.addComponent(this.blendAnimation);
    this.blendAnimation.start(opacity, duration, easingType, gs.CallBack("onBlendFinish", this, callback));
    return this.blendAnimation;
  };


  /**
  * Animates a Live2D model parameter of a Live2D game object to a specified value.
  *
  * @method blendTo
  * @param {string} param The name of the parameter to animate.
  * @param {number} value The target value.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback called if blending is finished.
   */

  Component_Animator.prototype.l2dParameterTo = function(param, value, duration, easingType, callback) {
    this.object.addComponent(this.l2dAnimation);
    this.l2dAnimation.start(param, value, duration, easingType, gs.CallBack("onBlendFinish", this, callback));
    return this.l2dAnimation;
  };


  /**
  * Blurs a game object to specified blur-power.
  *
  * @method blurTo
  * @param {number} power The target blur-power.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.blurTo = function(power, duration, easingType) {
    this.object.addComponent(this.blurAnimation);
    this.blurAnimation.start(power, duration, easingType);
    return this.blurAnimation;
  };


  /**
  * Pixelates a game object to specified pixel-size/block-size
  *
  * @method pixelateTo
  * @param {number} width - The target block-width
  * @param {number} height - The target block-height
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.pixelateTo = function(width, height, duration, easingType) {
    this.object.addComponent(this.pixelateAnimation);
    this.pixelateAnimation.start(width, height, duration, easingType);
    return this.pixelateAnimation;
  };


  /**
  * Wobbles a game object to specified wobble-power and wobble-speed.
  *
  * @method wobbleTo
  * @param {number} power The target wobble-power.
  * @param {number} speed The target wobble-speed.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.wobbleTo = function(power, speed, duration, easingType) {
    this.object.addComponent(this.wobbleAnimation);
    this.wobbleAnimation.start(power, speed, duration, easingType);
    return this.wobbleAnimation;
  };


  /**
  * Colors a game object to a specified target color.
  *
  * @method colorTo
  * @param {Color} color The target color.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.colorTo = function(color, duration, easingType) {
    this.object.addComponent(this.colorAnimation);
    this.colorAnimation.start(color, duration, easingType, this.callback);
    return this.colorAnimation;
  };


  /**
  * An image animation runs from left to right using the game object's
  * image-property.
  *
  * @method changeImages
  * @param {Array} images An array of image names.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.changeImages = function(images, duration, easingType) {
    this.object.addComponent(this.imageAnimation);
    this.imageAnimation.start(images, duration, easingType, this.callback);
    return this.imageAnimation;
  };


  /**
  * A frame animation which modifies the game object's srcRect property
  * a play an animation.
  *
  * @method changeFrames
  * @param {gs.Rect[]} frames An array of source rectangles (frames).
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */


  /**
  * A frame animation which modifies the game object's srcRect property
  * a play an animation.
  *
  * @method playAnimation
  * @param {gs.Rect[]} frames An array of source rectangles (frames).
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.playAnimation = function(animationRecord) {
    this.frameAnimation.refresh(animationRecord);
    this.object.addComponent(this.frameAnimation);
    this.frameAnimation.start(this.callback);
    return this.frameAnimation;
  };


  /**
  * Changes a field of the game object to a specified value.
  *
  * @method change
  * @param {number} Value The target value.
  * @param {string} field The name of the field/property.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.change = function(value, field, duration, easingType) {
    this.object.addComponent(this.fieldAnimation);
    this.fieldAnimation.start(value, field, duration, easingType, this.callback);
    return this.fieldAnimation;
  };


  /**
  * Shakes the game object horizontally using the game object's offset-property.
  *
  * @method shake
  * @param {gs.Range} range The horizontal shake-range.
  * @param {number} speed The shake speed.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.shake = function(range, speed, duration, easing) {
    this.object.addComponent(this.shakeAnimation);
    this.shakeAnimation.start(range, speed, duration, easing, this.callback);
    return this.shakeAnimation;
  };


  /**
  * Tints the game object to a specified tone.
  *
  * @method tintTo
  * @param {Tone} tone The target tone.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.tintTo = function(tone, duration, easingType) {
    this.object.addComponent(this.tintAnimation);
    this.tintAnimation.start(tone, duration, easingType, this.callback);
    return this.tintAnimation;
  };


  /**
  * Rotates the game object around its anchor-point.
  *
  * @method rotate
  * @param {gs.RotationDirection} direction The rotation-direction.
  * @param {number} speed The rotation speed in degrees per frame.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.rotate = function(direction, speed, duration, easingType) {
    this.object.addComponent(this.rotateAnimation);
    this.rotateAnimation.rotate(direction, speed, duration, easingType, this.callback);
    return this.rotateAnimation;
  };


  /**
  * Rotates the game object around its anchor-point to a specified angle.
  *
  * @method rotateTo
  * @param {number} angle The target angle.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
   */

  Component_Animator.prototype.rotateTo = function(angle, duration, easingType) {
    this.object.addComponent(this.rotateAnimation);
    this.rotateAnimation.rotateTo(angle, duration, easingType, this.callback);
    return this.rotateAnimation;
  };


  /**
  * Lets a game object appear on screen using a masking-effect.
  *
  * @method maskIn
  * @param {gs.Mask} mask The mask used for the animation.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.maskIn = function(mask, duration, easing, callback) {
    this.object.addComponent(this.maskAnimation);
    this.maskAnimation.maskIn(mask, duration, easing, function(object, animation) {
      object.removeComponent(animation);
      return typeof callback === "function" ? callback(object) : void 0;
    });
    return this.maskAnimation;
  };


  /**
  * Description follows...
  *
  * @method maskTo
  * @param {gs.Mask} mask The mask used for the animation.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.maskTo = function(mask, duration, easing, callback) {
    this.object.addComponent(this.maskAnimation);
    this.maskAnimation.maskTo(mask, duration, easing, function(object, animation) {
      object.removeComponent(animation);
      return typeof callback === "function" ? callback(object) : void 0;
    });
    return this.maskAnimation;
  };


  /**
  * Lets a game object disappear from screen using a masking-effect.
  *
  * @method maskOut
  * @param {gs.Mask} mask The mask used for the animation.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.maskOut = function(mask, duration, easing, callback) {
    this.object.addComponent(this.maskAnimation);
    this.maskAnimation.maskOut(mask, duration, easing, function(object, animation) {
      object.removeComponent(animation);
      return typeof callback === "function" ? callback(object) : void 0;
    });
    return this.maskAnimation;
  };


  /**
  * Lets a game object appear on screen from left, top, right or bottom using 
  * a move-animation
  *
  * @method moveIn
  * @param {number} x The x-coordinate of the target-position.
  * @param {number} y The y-coordinate of the target-position.
  * @param {number} type The movement-direction from where the game object should move-in.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.moveIn = function(x, y, type, duration, easing, callback) {
    this.object.addComponent(this.moveAnimation);
    this.moveAnimation.moveIn(x, y, type, duration, easing, function(object, animation) {
      object.removeComponent(animation);
      return typeof callback === "function" ? callback(object) : void 0;
    });
    return this.moveAnimation;
  };


  /**
  * Lets a game object disappear from screen to the left, top, right or bottom using 
  * a move-animation
  *
  * @method moveOut
  * @param {number} type The movement-direction in which the game object should move-out.
  * @param {number} duration The duration in frames.
  * @param {Object} easingType The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.moveOut = function(type, duration, easing, callback) {
    this.object.addComponent(this.moveAnimation);
    this.moveAnimation.moveOut(type, duration, easing, function(object, animation) {
      object.removeComponent(animation);
      return typeof callback === "function" ? callback(object) : void 0;
    });
    return this.moveAnimation;
  };


  /**
  * Lets a game object appear on screen using blending.
  *
  * @method show
  * @param {number} duration The duration in frames.
  * @param {Object} easing The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.show = function(duration, easing, callback) {
    var ref;
    this.object.opacity = 0;
    if ((ref = this.object.visual) != null) {
      ref.update();
    }
    return this.blendTo(255, duration, easing, callback);
  };


  /**
  * Lets a game object disappear from screen using blending.
  *
  * @method hide
  * @param {number} duration The duration in frames.
  * @param {Object} easing The easing-type.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.hide = function(duration, easing, callback) {
    return this.blendTo(0, duration, easing, callback);
  };


  /**
  * Changes visible-property to true. This method is deprecated.
  * 
  * @method open
  * @deprecated
   */

  Component_Animator.prototype.open = function() {
    return this.object.visible = true;
  };


  /**
  * Changes visible-property to false. This method is deprecated.
  * 
  * @method close
  * @deprecated
   */

  Component_Animator.prototype.close = function() {
    return this.object.visible = false;
  };


  /**
  * Flashes the game object.
  *
  * @method flash
  * @param {Color} color The flash-color.
  * @param {number} duration The duration in frames.
   */

  Component_Animator.prototype.flash = function(color, duration) {
    this.object.color = color;
    color = new Color(color);
    color.alpha = 0;
    return this.colorTo(color, duration, gs.Easings.EASE_LINEAR[gs.EasingTypes.EASE_IN]);
  };


  /**
  * Lets a game object appear on screen using a specified animation.
  *
  * @method appear
  * @param {number} x The x-coordinate of the target-position.
  * @param {number} y The y-coordinate of the target-position.
  * @param {gs.AppearAnimationInfo} animation The animation info-object.
  * @param {Object} easing The easing-type.
  * @param {number} duration The duration in frames.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.appear = function(x, y, animation, easing, duration, callback) {
    easing = easing || gs.Easings.EASE_LINEAR[gs.EasingTypes.EASE_IN];
    this.object.visible = true;
    if (animation.type === gs.AnimationTypes.MOVEMENT) {
      return this.moveIn(x, y, animation.movement, duration, easing, callback);
    } else if (animation.type === gs.AnimationTypes.MASKING) {
      return this.maskIn(animation.mask, duration, easing, callback);
    } else {
      return this.show(duration, easing, callback);
    }
  };


  /**
  * Lets a game object disappear from screen using a specified animation.
  *
  * @method disappear
  * @param {gs.AppearAnimationInfo} animation The animation info-object.
  * @param {Object} easing The easing-type.
  * @param {number} duration The duration in frames.
  * @param {function} [callback] An optional callback-function called when the animation is finished.
   */

  Component_Animator.prototype.disappear = function(animation, easing, duration, callback) {
    this.object.visible = true;
    if (animation.type === gs.AnimationTypes.MOVEMENT) {
      return this.moveOut(animation.movement, duration, easing, callback);
    } else if (animation.type === gs.AnimationTypes.MASKING) {
      return this.maskOut(animation.mask, duration, easing, callback);
    } else {
      return this.hide(duration, easing, callback);
    }
  };

  return Component_Animator;

})(gs.Component);

gs.Animator = Component_Animator;

gs.Component_Animator = Component_Animator;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUEsa0JBQUE7RUFBQTs7O0FBQU07Ozs7QUFDRjs7Ozs7Ozs7Ozs7O0VBV2EsNEJBQUE7SUFDVCxxREFBQSxTQUFBO0lBRUEsSUFBQyxDQUFBLGFBQUQsR0FBcUIsSUFBQSxFQUFFLENBQUMsdUJBQUgsQ0FBQTtJQUNyQixJQUFDLENBQUEsYUFBRCxHQUFxQixJQUFBLEVBQUUsQ0FBQyx1QkFBSCxDQUFBO0lBQ3JCLElBQUMsQ0FBQSxhQUFELEdBQXFCLElBQUEsRUFBRSxDQUFDLHVCQUFILENBQUE7SUFDckIsSUFBQyxDQUFBLGNBQUQsR0FBc0IsSUFBQSxFQUFFLENBQUMsd0JBQUgsQ0FBQTtJQUN0QixJQUFDLENBQUEsYUFBRCxHQUFxQixJQUFBLEVBQUUsQ0FBQyx1QkFBSCxDQUFBO0lBQ3JCLElBQUMsQ0FBQSxpQkFBRCxHQUF5QixJQUFBLEVBQUUsQ0FBQywyQkFBSCxDQUFBO0lBQ3pCLElBQUMsQ0FBQSxlQUFELEdBQXVCLElBQUEsRUFBRSxDQUFDLHlCQUFILENBQUE7SUFDdkIsSUFBQyxDQUFBLGNBQUQsR0FBc0IsSUFBQSxFQUFFLENBQUMsd0JBQUgsQ0FBQTtJQUN0QixJQUFDLENBQUEsY0FBRCxHQUFzQixJQUFBLEVBQUUsQ0FBQyx3QkFBSCxDQUFBO0lBQ3RCLElBQUMsQ0FBQSxjQUFELEdBQXNCLElBQUEsRUFBRSxDQUFDLHdCQUFILENBQUE7SUFDdEIsSUFBQyxDQUFBLGNBQUQsR0FBc0IsSUFBQSxFQUFFLENBQUMsd0JBQUgsQ0FBQTtJQUN0QixJQUFDLENBQUEsY0FBRCxHQUFzQixJQUFBLEVBQUUsQ0FBQyx3QkFBSCxDQUFBO0lBQ3RCLElBQUMsQ0FBQSxhQUFELEdBQXFCLElBQUEsRUFBRSxDQUFDLHVCQUFILENBQUE7SUFDckIsSUFBQyxDQUFBLGVBQUQsR0FBdUIsSUFBQSxFQUFFLENBQUMseUJBQUgsQ0FBQTtJQUN2QixJ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dGVudCI6WyIjID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiNcbiMgICBTY3JpcHQ6IENvbXBvbmVudF9BbmltYXRvclxuI1xuIyAgICQkQ09QWVJJR0hUJCRcbiNcbiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuY2xhc3MgQ29tcG9uZW50X0FuaW1hdG9yIGV4dGVuZHMgZ3MuQ29tcG9uZW50XG4gICAgIyMjKlxuICAgICogQW4gYW5pbWF0b3ItY29tcG9uZW50IGFsbG93cyB0byBleGVjdXRlIGRpZmZlcmVudCBraW5kIG9mIGFuaW1hdGlvbnMgXG4gICAgKiBvbiBhIGdhbWUgb2JqZWN0LiBUaGUgYW5pbWF0aW9ucyBhcmUgdXNpbmcgdGhlIGdhbWUgb2JqZWN0J3MgXG4gICAgKiBkc3RSZWN0ICYgb2Zmc2V0LXByb3BlcnR5IHRvIGV4ZWN1dGUuXG4gICAgKlxuICAgICogQG1vZHVsZSBnc1xuICAgICogQGNsYXNzIENvbXBvbmVudF9BbmltYXRvclxuICAgICogQGV4dGVuZHMgZ3MuQ29tcG9uZW50XG4gICAgKiBAbWVtYmVyb2YgZ3NcbiAgICAqIEBjb25zdHJ1Y3RvclxuICAgICMjI1xuICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICBzdXBlclxuICAgICAgICBcbiAgICAgICAgQG1vdmVBbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X01vdmVBbmltYXRpb24oKVxuICAgICAgICBAcGF0aEFuaW1hdGlvbiA9IG5ldyBncy5Db21wb25lbnRfUGF0aEFuaW1hdGlvbigpXG4gICAgICAgIEB6b29tQW5pbWF0aW9uID0gbmV3IGdzLkNvbXBvbmVudF9ab29tQW5pbWF0aW9uKClcbiAgICAgICAgQGJsZW5kQW5pbWF0aW9uID0gbmV3IGdzLkNvbXBvbmVudF9CbGVuZEFuaW1hdGlvbigpXG4gICAgICAgIEBibHVyQW5pbWF0aW9uID0gbmV3IGdzLkNvbXBvbmVudF9CbHVyQW5pbWF0aW9uKClcbiAgICAgICAgQHBpeGVsYXRlQW5pbWF0aW9uID0gbmV3IGdzLkNvbXBvbmVudF9QaXhlbGF0ZUFuaW1hdGlvbigpXG4gICAgICAgIEB3b2JibGVBbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X1dvYmJsZUFuaW1hdGlvbigpXG4gICAgICAgIEBjb2xvckFuaW1hdGlvbiA9IG5ldyBncy5Db21wb25lbnRfQ29sb3JBbmltYXRpb24oKVxuICAgICAgICBAaW1hZ2VBbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X0ltYWdlQW5pbWF0aW9uKClcbiAgICAgICAgQGZyYW1lQW5pbWF0aW9uID0gbmV3IGdzLkNvbXBvbmVudF9GcmFtZUFuaW1hdGlvbigpXG4gICAgICAgIEBmaWVsZEFuaW1hdGlvbiA9IG5ldyBncy5Db21wb25lbnRfRmllbGRBbmltYXRpb24oKVxuICAgICAgICBAc2hha2VBbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X1NoYWtlQW5pbWF0aW9uKClcbiAgICAgICAgQHRpbnRBbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X1RpbnRBbmltYXRpb24oKVxuICAgICAgICBAcm90YXRlQW5pbWF0aW9uID0gbmV3IGdzLkNvbXBvbmVudF9Sb3RhdGVBbmltYXRpb24oKVxuICAgICAgICBAbWFza0FuaW1hdGlvbiA9IG5ldyBncy5Db21wb25lbnRfTWFza0FuaW1hdGlvbigpXG4gICAgICAgIEBsMmRBbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X0xpdmUyREFuaW1hdGlvbigpXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3RhbmRhcmQgQ2FsbGJhY2sgUm91dGluZVxuICAgICAgICAqIEBwcm9wZXJ0eSBjYWxsYmFja1xuICAgICAgICAqIEB0eXBlIGZ1bmN0aW9uXG4gICAgICAgICogQHByaXZhdGVcbiAgICAgICAgIyMjXG4gICAgICAgIEBjYWxsYmFjayA9IChvYmplY3QsIGFuaW1hdGlvbikgLT4gb2JqZWN0LnJlbW92ZUNvbXBvbmVudChhbmltYXRpb24pXG4gICAgICAgIFxuICAgICAgICBAb25CbGVuZEZpbmlzaCA9IChvYmplY3QsIGFuaW1hdGlvbiwgY2FsbGJhY2spIC0+IFxuICAgICAgICAgICAgb2JqZWN0LnJlbW92ZUNvbXBvbmVudChhbmltYXRpb24pXG4gICAgICAgICAgICBjYWxsYmFjaz8ob2JqZWN0KVxuICAgICAgICBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogVXBkYXRlcyB0aGUgYW5pbWF0b3IuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVcbiAgICAjIyNcbiAgICB1cGRhdGU6IC0+XG4gICAgICAgIHN1cGVyXG4gICAgICAgIFxuICAgICAgICBpZiBAb2JqZWN0Lm1hc2s/LnNvdXJjZT8udmlkZW9FbGVtZW50P1xuICAgICAgICAgICAgQG9iamVjdC5tYXNrLnNvdXJjZS51cGRhdGUoKVxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogTW92ZXMgdGhlIGdhbWUgb2JqZWN0IHdpdGggYSBzcGVjaWZpZWQgc3BlZWQuXG4gICAgKlxuICAgICogQG1ldGhvZCBtb3ZlXG4gICAgKiBAcGFyYW0ge251bWJlcn0gc3BlZWRYIFRoZSBzcGVlZCBvbiB4LWF4aXMgaW4gcGl4ZWxzIHBlciBmcmFtZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzcGVlZFkgVGhlIHNwZWVkIG9uIHktYXhpcyBpbiBwaXhlbHMgcGVyIGZyYW1lLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nVHlwZSBUaGUgZWFzaW5nLXR5cGUgdXNlZCBmb3IgdGhlIGFuaW1hdGlvbi5cbiAgICAjIyNcbiAgICBtb3ZlOiAoc3BlZWRYLCBzcGVlZFksIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAbW92ZUFuaW1hdGlvbilcbiAgICAgICAgQG1vdmVBbmltYXRpb24ubW92ZShzcGVlZFgsIHNwZWVkWSwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIEBjYWxsYmFjaylcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAbW92ZUFuaW1hdGlvblxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBNb3ZlcyB0aGUgZ2FtZSBvYmplY3QgdG8gYSBzcGVjaWZpZWQgcG9zaXRpb24uXG4gICAgKlxuICAgICogQG1ldGhvZCBtb3ZlVG9cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSB4LWNvb3JkaW5hdGUgb2YgdGhlIHBvc2l0aW9uLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHkgVGhlIHktY29vcmRpbmF0ZSBvZiB0aGUgcG9zaXRpb24uXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgIFxuICAgIG1vdmVUbzogKHgsIHksIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAbW92ZUFuaW1hdGlvbilcbiAgICAgICAgQG1vdmVBbmltYXRpb24ubW92ZVRvKHgsIHksIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBAY2FsbGJhY2spXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQG1vdmVBbmltYXRpb25cbiAgICBcbiAgICAjIyMqXG4gICAgKiBNb3ZlcyB0aGUgZ2FtZSBvYmplY3QgYWxvbmcgYSBwYXRoLlxuICAgICpcbiAgICAqIEBtZXRob2QgbW92ZVBhdGhcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoIFRoZSBwYXRoIHRvIGZvbGxvdy5cbiAgICAqIEBwYXJhbSB7Z3MuQW5pbWF0aW9uTG9vcFR5cGV9IGxvb3BUeXBlIFRoZSBsb29wLVR5cGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7T2JqZWN0W119IGVmZmVjdHMgT3B0aW9uYWwgYXJyYXkgb2YgZWZmZWN0cyBleGVjdXRlZCBkdXJpbmcgdGhlIHBhdGgtbW92ZW1lbnQgbGlrZSBwbGF5aW5nIGEgc291bmQuXG4gICAgIyMjICBcbiAgICBtb3ZlUGF0aDogKHBhdGgsIGxvb3BUeXBlLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSwgZWZmZWN0cykgLT5cbiAgICAgICAgYyA9IEBvYmplY3QuZmluZENvbXBvbmVudChcIkNvbXBvbmVudF9QYXRoQW5pbWF0aW9uXCIpXG4gICAgICAgIFxuICAgICAgICBpZiBjP1xuICAgICAgICAgICAgYy5sb29wVHlwZSA9IGxvb3BUeXBlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEBwYXRoQW5pbWF0aW9uKVxuICAgICAgICAgICAgQHBhdGhBbmltYXRpb24uc3RhcnQocGF0aCwgbG9vcFR5cGUsIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBlZmZlY3RzLCBAY2FsbGJhY2spXG4gICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBwYXRoQW5pbWF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogU2Nyb2xscyB0aGUgZ2FtZSBvYmplY3Qgd2l0aCBhIHNwZWNpZmllZCBzcGVlZC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNjcm9sbFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNwZWVkWCBUaGUgc3BlZWQgb24geC1heGlzIGluIHBpeGVscyBwZXIgZnJhbWUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gc3BlZWRZIFRoZSBzcGVlZCBvbiB5LWF4aXMgaW4gcGl4ZWxzIHBlciBmcmFtZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlIHVzZWQgZm9yIHRoZSBhbmltYXRpb24uXG4gICAgIyMjXG4gICAgc2Nyb2xsOiAoc3BlZWRYLCBzcGVlZFksIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAbW92ZUFuaW1hdGlvbilcbiAgICAgICAgQG1vdmVBbmltYXRpb24uc2Nyb2xsKHNwZWVkWCwgc3BlZWRZLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSwgQGNhbGxiYWNrKVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBtb3ZlQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFNjcm9sbHMgdGhlIGdhbWUgb2JqZWN0IHRvIGEgc3BlY2lmaWVkIHBvc2l0aW9uLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2Nyb2xsVG9cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSB4LWNvb3JkaW5hdGUgb2YgdGhlIHBvc2l0aW9uLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHkgVGhlIHktY29vcmRpbmF0ZSBvZiB0aGUgcG9zaXRpb24uXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgIFxuICAgIHNjcm9sbFRvOiAoeCwgeSwgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEBtb3ZlQW5pbWF0aW9uKVxuICAgICAgICBAbW92ZUFuaW1hdGlvbi5zY3JvbGxUbyh4LCB5LCBkdXJhdGlvbiwgZWFzaW5nVHlwZSwgQGNhbGxiYWNrKVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBtb3ZlQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFNjcm9sbHMgdGhlIGdhbWUgb2JqZWN0IGFsb25nIGEgcGF0aC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNjcm9sbFBhdGhcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoIFRoZSBwYXRoIHRvIGZvbGxvdy5cbiAgICAqIEBwYXJhbSB7Z3MuQW5pbWF0aW9uTG9vcFR5cGV9IGxvb3BUeXBlIFRoZSBsb29wLVR5cGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgIFxuICAgIHNjcm9sbFBhdGg6IChwYXRoLCBsb29wVHlwZSwgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEBwYXRoQW5pbWF0aW9uKVxuICAgICAgICBAcGF0aEFuaW1hdGlvbi5zY3JvbGwocGF0aCwgbG9vcFR5cGUsIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBAY2FsbGJhY2spXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQHBhdGhBbmltYXRpb25cbiAgICBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogWm9vbXMgYSBnYW1lIG9iamVjdCB0byBzcGVjaWZpZWQgc2l6ZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHpvb21Ub1xuICAgICogQHBhcmFtIHtudW1iZXJ9IHggVGhlIHgtYXhpcyB6b29tLWZhY3Rvci5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IFRoZSB5LWF4aXMgem9vbS1mYWN0b3IuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgICAgICBcbiAgICB6b29tVG86ICh4LCB5LCBkdXJhdGlvbiwgZWFzaW5nVHlwZSkgLT5cbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQHpvb21BbmltYXRpb24pXG4gICAgICAgIEB6b29tQW5pbWF0aW9uLnN0YXJ0KHgsIHksIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBAY2FsbGJhY2spXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQHpvb21BbmltYXRpb25cbiAgICAgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogQmxlbmRzIGEgZ2FtZSBvYmplY3QgdG8gc3BlY2lmaWVkIG9wYWNpdHkuXG4gICAgKlxuICAgICogQG1ldGhvZCBibGVuZFRvXG4gICAgKiBAcGFyYW0ge251bWJlcn0gb3BhY2l0eSBUaGUgdGFyZ2V0IG9wYWNpdHkuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2sgY2FsbGVkIGlmIGJsZW5kaW5nIGlzIGZpbmlzaGVkLiBcbiAgICAjIyMgICAgXG4gICAgYmxlbmRUbzogKG9wYWNpdHksIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBjYWxsYmFjaykgLT5cbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQGJsZW5kQW5pbWF0aW9uKVxuICAgICAgICBAYmxlbmRBbmltYXRpb24uc3RhcnQob3BhY2l0eSwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIGdzLkNhbGxCYWNrKFwib25CbGVuZEZpbmlzaFwiLCB0aGlzLCBjYWxsYmFjaykpIFxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBibGVuZEFuaW1hdGlvblxuICAgICBcbiAgICAjIyMqXG4gICAgKiBBbmltYXRlcyBhIExpdmUyRCBtb2RlbCBwYXJhbWV0ZXIgb2YgYSBMaXZlMkQgZ2FtZSBvYmplY3QgdG8gYSBzcGVjaWZpZWQgdmFsdWUuXG4gICAgKlxuICAgICogQG1ldGhvZCBibGVuZFRvXG4gICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW0gVGhlIG5hbWUgb2YgdGhlIHBhcmFtZXRlciB0byBhbmltYXRlLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFRoZSB0YXJnZXQgdmFsdWUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2sgY2FsbGVkIGlmIGJsZW5kaW5nIGlzIGZpbmlzaGVkLiBcbiAgICAjIyNcbiAgICBsMmRQYXJhbWV0ZXJUbzogKHBhcmFtLCB2YWx1ZSwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAbDJkQW5pbWF0aW9uKVxuICAgICAgICBAbDJkQW5pbWF0aW9uLnN0YXJ0KHBhcmFtLCB2YWx1ZSwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIGdzLkNhbGxCYWNrKFwib25CbGVuZEZpbmlzaFwiLCB0aGlzLCBjYWxsYmFjaykpIFxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBsMmRBbmltYXRpb25cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQmx1cnMgYSBnYW1lIG9iamVjdCB0byBzcGVjaWZpZWQgYmx1ci1wb3dlci5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGJsdXJUb1xuICAgICogQHBhcmFtIHtudW1iZXJ9IHBvd2VyIFRoZSB0YXJnZXQgYmx1ci1wb3dlci5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlLlxuICAgICMjIyAgICAgXG4gICAgYmx1clRvOiAocG93ZXIsIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAYmx1ckFuaW1hdGlvbilcbiAgICAgICAgQGJsdXJBbmltYXRpb24uc3RhcnQocG93ZXIsIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSBcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAYmx1ckFuaW1hdGlvblxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBQaXhlbGF0ZXMgYSBnYW1lIG9iamVjdCB0byBzcGVjaWZpZWQgcGl4ZWwtc2l6ZS9ibG9jay1zaXplXG4gICAgKlxuICAgICogQG1ldGhvZCBwaXhlbGF0ZVRvXG4gICAgKiBAcGFyYW0ge251bWJlcn0gd2lkdGggLSBUaGUgdGFyZ2V0IGJsb2NrLXdpZHRoXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaGVpZ2h0IC0gVGhlIHRhcmdldCBibG9jay1oZWlnaHRcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlLlxuICAgICMjIyAgICAgXG4gICAgcGl4ZWxhdGVUbzogKHdpZHRoLCBoZWlnaHQsIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAcGl4ZWxhdGVBbmltYXRpb24pXG4gICAgICAgIEBwaXhlbGF0ZUFuaW1hdGlvbi5zdGFydCh3aWR0aCwgaGVpZ2h0LCBkdXJhdGlvbiwgZWFzaW5nVHlwZSkgXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQHBpeGVsYXRlQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFdvYmJsZXMgYSBnYW1lIG9iamVjdCB0byBzcGVjaWZpZWQgd29iYmxlLXBvd2VyIGFuZCB3b2JibGUtc3BlZWQuXG4gICAgKlxuICAgICogQG1ldGhvZCB3b2JibGVUb1xuICAgICogQHBhcmFtIHtudW1iZXJ9IHBvd2VyIFRoZSB0YXJnZXQgd29iYmxlLXBvd2VyLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNwZWVkIFRoZSB0YXJnZXQgd29iYmxlLXNwZWVkLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nVHlwZSBUaGUgZWFzaW5nLXR5cGUuXG4gICAgIyMjICAgICBcbiAgICB3b2JibGVUbzogKHBvd2VyLCBzcGVlZCwgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEB3b2JibGVBbmltYXRpb24pXG4gICAgICAgIEB3b2JibGVBbmltYXRpb24uc3RhcnQocG93ZXIsIHNwZWVkLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSkgXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQHdvYmJsZUFuaW1hdGlvblxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDb2xvcnMgYSBnYW1lIG9iamVjdCB0byBhIHNwZWNpZmllZCB0YXJnZXQgY29sb3IuXG4gICAgKlxuICAgICogQG1ldGhvZCBjb2xvclRvXG4gICAgKiBAcGFyYW0ge0NvbG9yfSBjb2xvciBUaGUgdGFyZ2V0IGNvbG9yLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nVHlwZSBUaGUgZWFzaW5nLXR5cGUuXG4gICAgIyMjICBcbiAgICBjb2xvclRvOiAoY29sb3IsIGR1cmF0aW9uLCBlYXNpbmdUeXBlKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAY29sb3JBbmltYXRpb24pXG4gICAgICAgIEBjb2xvckFuaW1hdGlvbi5zdGFydChjb2xvciwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIEBjYWxsYmFjaylcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAY29sb3JBbmltYXRpb25cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQW4gaW1hZ2UgYW5pbWF0aW9uIHJ1bnMgZnJvbSBsZWZ0IHRvIHJpZ2h0IHVzaW5nIHRoZSBnYW1lIG9iamVjdCdzXG4gICAgKiBpbWFnZS1wcm9wZXJ0eS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGNoYW5nZUltYWdlc1xuICAgICogQHBhcmFtIHtBcnJheX0gaW1hZ2VzIEFuIGFycmF5IG9mIGltYWdlIG5hbWVzLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nVHlwZSBUaGUgZWFzaW5nLXR5cGUuXG4gICAgIyMjICAgICAgXG4gICAgY2hhbmdlSW1hZ2VzOiAoaW1hZ2VzLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSkgLT5cbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQGltYWdlQW5pbWF0aW9uKVxuICAgICAgICBAaW1hZ2VBbmltYXRpb24uc3RhcnQoaW1hZ2VzLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSwgQGNhbGxiYWNrKVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBpbWFnZUFuaW1hdGlvblxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBBIGZyYW1lIGFuaW1hdGlvbiB3aGljaCBtb2RpZmllcyB0aGUgZ2FtZSBvYmplY3QncyBzcmNSZWN0IHByb3BlcnR5XG4gICAgKiBhIHBsYXkgYW4gYW5pbWF0aW9uLlxuICAgICpcbiAgICAqIEBtZXRob2QgY2hhbmdlRnJhbWVzXG4gICAgKiBAcGFyYW0ge2dzLlJlY3RbXX0gZnJhbWVzIEFuIGFycmF5IG9mIHNvdXJjZSByZWN0YW5nbGVzIChmcmFtZXMpLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nVHlwZSBUaGUgZWFzaW5nLXR5cGUuXG4gICAgIyMjICAgICAgXG4gICAgI2NoYW5nZUZyYW1lczogKGZyYW1lcywgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgIyAgICBhbmltYXRpb24gPSBuZXcgZ3MuQ29tcG9uZW50X0ZyYW1lQW5pbWF0aW9uKClcbiAgICAjICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KGFuaW1hdGlvbilcbiAgICAjICAgIGFuaW1hdGlvbi5zdGFydChmcmFtZXMsIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBAY2FsbGJhY2spXG4gICAgICAgXG4gICAgIyMjKlxuICAgICogQSBmcmFtZSBhbmltYXRpb24gd2hpY2ggbW9kaWZpZXMgdGhlIGdhbWUgb2JqZWN0J3Mgc3JjUmVjdCBwcm9wZXJ0eVxuICAgICogYSBwbGF5IGFuIGFuaW1hdGlvbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHBsYXlBbmltYXRpb25cbiAgICAqIEBwYXJhbSB7Z3MuUmVjdFtdfSBmcmFtZXMgQW4gYXJyYXkgb2Ygc291cmNlIHJlY3RhbmdsZXMgKGZyYW1lcykuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgICAgIFxuICAgIHBsYXlBbmltYXRpb246IChhbmltYXRpb25SZWNvcmQpIC0+XG4gICAgICAgIEBmcmFtZUFuaW1hdGlvbi5yZWZyZXNoKGFuaW1hdGlvblJlY29yZClcbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQGZyYW1lQW5pbWF0aW9uKVxuICAgICAgICBAZnJhbWVBbmltYXRpb24uc3RhcnQoQGNhbGxiYWNrKVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBmcmFtZUFuaW1hdGlvblxuICAgICAgIFxuICAgICMjIypcbiAgICAqIENoYW5nZXMgYSBmaWVsZCBvZiB0aGUgZ2FtZSBvYmplY3QgdG8gYSBzcGVjaWZpZWQgdmFsdWUuXG4gICAgKlxuICAgICogQG1ldGhvZCBjaGFuZ2VcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBWYWx1ZSBUaGUgdGFyZ2V0IHZhbHVlLlxuICAgICogQHBhcmFtIHtzdHJpbmd9IGZpZWxkIFRoZSBuYW1lIG9mIHRoZSBmaWVsZC9wcm9wZXJ0eS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlLlxuICAgICMjIyAgIFxuICAgIGNoYW5nZTogKHZhbHVlLCBmaWVsZCwgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEBmaWVsZEFuaW1hdGlvbilcbiAgICAgICAgQGZpZWxkQW5pbWF0aW9uLnN0YXJ0KHZhbHVlLCBmaWVsZCwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIEBjYWxsYmFjaylcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAZmllbGRBbmltYXRpb25cbiAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTaGFrZXMgdGhlIGdhbWUgb2JqZWN0IGhvcml6b250YWxseSB1c2luZyB0aGUgZ2FtZSBvYmplY3QncyBvZmZzZXQtcHJvcGVydHkuXG4gICAgKlxuICAgICogQG1ldGhvZCBzaGFrZVxuICAgICogQHBhcmFtIHtncy5SYW5nZX0gcmFuZ2UgVGhlIGhvcml6b250YWwgc2hha2UtcmFuZ2UuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gc3BlZWQgVGhlIHNoYWtlIHNwZWVkLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nVHlwZSBUaGUgZWFzaW5nLXR5cGUuXG4gICAgIyMjIFxuICAgIHNoYWtlOiAocmFuZ2UsIHNwZWVkLCBkdXJhdGlvbiwgZWFzaW5nKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAc2hha2VBbmltYXRpb24pXG4gICAgICAgIEBzaGFrZUFuaW1hdGlvbi5zdGFydChyYW5nZSwgc3BlZWQsIGR1cmF0aW9uLCBlYXNpbmcsIEBjYWxsYmFjaylcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAc2hha2VBbmltYXRpb25cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogVGludHMgdGhlIGdhbWUgb2JqZWN0IHRvIGEgc3BlY2lmaWVkIHRvbmUuXG4gICAgKlxuICAgICogQG1ldGhvZCB0aW50VG9cbiAgICAqIEBwYXJhbSB7VG9uZX0gdG9uZSBUaGUgdGFyZ2V0IHRvbmUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgXG4gICAgdGludFRvOiAodG9uZSwgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEB0aW50QW5pbWF0aW9uKVxuICAgICAgICBAdGludEFuaW1hdGlvbi5zdGFydCh0b25lLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSwgQGNhbGxiYWNrKVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEB0aW50QW5pbWF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogUm90YXRlcyB0aGUgZ2FtZSBvYmplY3QgYXJvdW5kIGl0cyBhbmNob3ItcG9pbnQuXG4gICAgKlxuICAgICogQG1ldGhvZCByb3RhdGVcbiAgICAqIEBwYXJhbSB7Z3MuUm90YXRpb25EaXJlY3Rpb259IGRpcmVjdGlvbiBUaGUgcm90YXRpb24tZGlyZWN0aW9uLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNwZWVkIFRoZSByb3RhdGlvbiBzcGVlZCBpbiBkZWdyZWVzIHBlciBmcmFtZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlLlxuICAgICMjIyBcbiAgICByb3RhdGU6IChkaXJlY3Rpb24sIHNwZWVkLCBkdXJhdGlvbiwgZWFzaW5nVHlwZSkgLT5cbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQHJvdGF0ZUFuaW1hdGlvbilcbiAgICAgICAgQHJvdGF0ZUFuaW1hdGlvbi5yb3RhdGUoZGlyZWN0aW9uLCBzcGVlZCwgZHVyYXRpb24sIGVhc2luZ1R5cGUsIEBjYWxsYmFjaylcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAcm90YXRlQW5pbWF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogUm90YXRlcyB0aGUgZ2FtZSBvYmplY3QgYXJvdW5kIGl0cyBhbmNob3ItcG9pbnQgdG8gYSBzcGVjaWZpZWQgYW5nbGUuXG4gICAgKlxuICAgICogQG1ldGhvZCByb3RhdGVUb1xuICAgICogQHBhcmFtIHtudW1iZXJ9IGFuZ2xlIFRoZSB0YXJnZXQgYW5nbGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAjIyMgXG4gICAgcm90YXRlVG86IChhbmdsZSwgZHVyYXRpb24sIGVhc2luZ1R5cGUpIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEByb3RhdGVBbmltYXRpb24pXG4gICAgICAgIEByb3RhdGVBbmltYXRpb24ucm90YXRlVG8oYW5nbGUsIGR1cmF0aW9uLCBlYXNpbmdUeXBlLCBAY2FsbGJhY2spXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQHJvdGF0ZUFuaW1hdGlvblxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBMZXRzIGEgZ2FtZSBvYmplY3QgYXBwZWFyIG9uIHNjcmVlbiB1c2luZyBhIG1hc2tpbmctZWZmZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2QgbWFza0luXG4gICAgKiBAcGFyYW0ge2dzLk1hc2t9IG1hc2sgVGhlIG1hc2sgdXNlZCBmb3IgdGhlIGFuaW1hdGlvbi5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlLlxuICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSBBbiBvcHRpb25hbCBjYWxsYmFjay1mdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLiBcbiAgICAjIyMgICAgIFxuICAgIG1hc2tJbjogKG1hc2ssIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAbWFza0FuaW1hdGlvbilcbiAgICAgICAgQG1hc2tBbmltYXRpb24ubWFza0luKG1hc2ssIGR1cmF0aW9uLCBlYXNpbmcsIChvYmplY3QsIGFuaW1hdGlvbikgLT4gb2JqZWN0LnJlbW92ZUNvbXBvbmVudChhbmltYXRpb24pOyBjYWxsYmFjaz8ob2JqZWN0KTspXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQG1hc2tBbmltYXRpb25cbiAgICAgXG4gICAgIyMjKlxuICAgICogRGVzY3JpcHRpb24gZm9sbG93cy4uLlxuICAgICpcbiAgICAqIEBtZXRob2QgbWFza1RvXG4gICAgKiBAcGFyYW0ge2dzLk1hc2t9IG1hc2sgVGhlIG1hc2sgdXNlZCBmb3IgdGhlIGFuaW1hdGlvbi5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZ1R5cGUgVGhlIGVhc2luZy10eXBlLlxuICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSBBbiBvcHRpb25hbCBjYWxsYmFjay1mdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLiBcbiAgICAjIyMgICAgIFxuICAgIG1hc2tUbzogKG1hc2ssIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAbWFza0FuaW1hdGlvbilcbiAgICAgICAgQG1hc2tBbmltYXRpb24ubWFza1RvKG1hc2ssIGR1cmF0aW9uLCBlYXNpbmcsIChvYmplY3QsIGFuaW1hdGlvbikgLT4gb2JqZWN0LnJlbW92ZUNvbXBvbmVudChhbmltYXRpb24pOyBjYWxsYmFjaz8ob2JqZWN0KTspXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQG1hc2tBbmltYXRpb25cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogTGV0cyBhIGdhbWUgb2JqZWN0IGRpc2FwcGVhciBmcm9tIHNjcmVlbiB1c2luZyBhIG1hc2tpbmctZWZmZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2QgbWFza091dFxuICAgICogQHBhcmFtIHtncy5NYXNrfSBtYXNrIFRoZSBtYXNrIHVzZWQgZm9yIHRoZSBhbmltYXRpb24uXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2stZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC4gXG4gICAgIyMjICBcbiAgICBtYXNrT3V0OiAobWFzaywgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2spIC0+XG4gICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEBtYXNrQW5pbWF0aW9uKVxuICAgICAgICBAbWFza0FuaW1hdGlvbi5tYXNrT3V0KG1hc2ssIGR1cmF0aW9uLCBlYXNpbmcsIChvYmplY3QsIGFuaW1hdGlvbikgLT4gb2JqZWN0LnJlbW92ZUNvbXBvbmVudChhbmltYXRpb24pOyBjYWxsYmFjaz8ob2JqZWN0KTspXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQG1hc2tBbmltYXRpb25cblxuICAgICMjIypcbiAgICAqIExldHMgYSBnYW1lIG9iamVjdCBhcHBlYXIgb24gc2NyZWVuIGZyb20gbGVmdCwgdG9wLCByaWdodCBvciBib3R0b20gdXNpbmcgXG4gICAgKiBhIG1vdmUtYW5pbWF0aW9uXG4gICAgKlxuICAgICogQG1ldGhvZCBtb3ZlSW5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB4IFRoZSB4LWNvb3JkaW5hdGUgb2YgdGhlIHRhcmdldC1wb3NpdGlvbi5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB5IFRoZSB5LWNvb3JkaW5hdGUgb2YgdGhlIHRhcmdldC1wb3NpdGlvbi5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB0eXBlIFRoZSBtb3ZlbWVudC1kaXJlY3Rpb24gZnJvbSB3aGVyZSB0aGUgZ2FtZSBvYmplY3Qgc2hvdWxkIG1vdmUtaW4uXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2stZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC4gXG4gICAgIyMjICBcbiAgICBtb3ZlSW46ICh4LCB5LCB0eXBlLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjaykgLT5cbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQG1vdmVBbmltYXRpb24pXG4gICAgICAgIEBtb3ZlQW5pbWF0aW9uLm1vdmVJbih4LCB5LCB0eXBlLCBkdXJhdGlvbiwgZWFzaW5nLCAob2JqZWN0LCBhbmltYXRpb24pIC0+IFxuICAgICAgICAgICAgb2JqZWN0LnJlbW92ZUNvbXBvbmVudChhbmltYXRpb24pXG4gICAgICAgICAgICBjYWxsYmFjaz8ob2JqZWN0KSlcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBAbW92ZUFuaW1hdGlvblxuICAgICAgXG4gICAgIyMjKlxuICAgICogTGV0cyBhIGdhbWUgb2JqZWN0IGRpc2FwcGVhciBmcm9tIHNjcmVlbiB0byB0aGUgbGVmdCwgdG9wLCByaWdodCBvciBib3R0b20gdXNpbmcgXG4gICAgKiBhIG1vdmUtYW5pbWF0aW9uXG4gICAgKlxuICAgICogQG1ldGhvZCBtb3ZlT3V0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gdHlwZSBUaGUgbW92ZW1lbnQtZGlyZWN0aW9uIGluIHdoaWNoIHRoZSBnYW1lIG9iamVjdCBzaG91bGQgbW92ZS1vdXQuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBlYXNpbmdUeXBlIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2stZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC4gXG4gICAgIyMjICAgIFxuICAgIG1vdmVPdXQ6ICh0eXBlLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjaykgLT5cbiAgICAgICAgQG9iamVjdC5hZGRDb21wb25lbnQoQG1vdmVBbmltYXRpb24pXG4gICAgICAgIEBtb3ZlQW5pbWF0aW9uLm1vdmVPdXQodHlwZSwgZHVyYXRpb24sIGVhc2luZywgKG9iamVjdCwgYW5pbWF0aW9uKSAtPiBcbiAgICAgICAgICAgIG9iamVjdC5yZW1vdmVDb21wb25lbnQoYW5pbWF0aW9uKVxuICAgICAgICAgICAgY2FsbGJhY2s/KG9iamVjdClcbiAgICAgICAgKVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIEBtb3ZlQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIExldHMgYSBnYW1lIG9iamVjdCBhcHBlYXIgb24gc2NyZWVuIHVzaW5nIGJsZW5kaW5nLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2hvd1xuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2stZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC4gXG4gICAgIyMjICBcbiAgICBzaG93OiAoZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2spIC0+XG4gICAgICAgIEBvYmplY3Qub3BhY2l0eSA9IDBcbiAgICAgICAgQG9iamVjdC52aXN1YWw/LnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQGJsZW5kVG8oMjU1LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjaylcbiAgICAgXG4gICAgIyMjKlxuICAgICogTGV0cyBhIGdhbWUgb2JqZWN0IGRpc2FwcGVhciBmcm9tIHNjcmVlbiB1c2luZyBibGVuZGluZy5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGhpZGVcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZyBUaGUgZWFzaW5nLXR5cGUuXG4gICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBbY2FsbGJhY2tdIEFuIG9wdGlvbmFsIGNhbGxiYWNrLWZ1bmN0aW9uIGNhbGxlZCB3aGVuIHRoZSBhbmltYXRpb24gaXMgZmluaXNoZWQuIFxuICAgICMjIyAgICAgXG4gICAgaGlkZTogKGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrKSAtPlxuICAgICAgICByZXR1cm4gQGJsZW5kVG8oMCwgZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2spXG4gICAgICAgXG4gICAgIyMjKlxuICAgICogQ2hhbmdlcyB2aXNpYmxlLXByb3BlcnR5IHRvIHRydWUuIFRoaXMgbWV0aG9kIGlzIGRlcHJlY2F0ZWQuXG4gICAgKiBcbiAgICAqIEBtZXRob2Qgb3BlblxuICAgICogQGRlcHJlY2F0ZWRcbiAgICAjIyMgICBcbiAgICBvcGVuOiAtPiBAb2JqZWN0LnZpc2libGUgPSB5ZXNcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDaGFuZ2VzIHZpc2libGUtcHJvcGVydHkgdG8gZmFsc2UuIFRoaXMgbWV0aG9kIGlzIGRlcHJlY2F0ZWQuXG4gICAgKiBcbiAgICAqIEBtZXRob2QgY2xvc2VcbiAgICAqIEBkZXByZWNhdGVkXG4gICAgIyMjICAgXG4gICAgY2xvc2U6IC0+IEBvYmplY3QudmlzaWJsZSA9IG5vXG4gICAgXG4gICAgIyMjKlxuICAgICogRmxhc2hlcyB0aGUgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBmbGFzaFxuICAgICogQHBhcmFtIHtDb2xvcn0gY29sb3IgVGhlIGZsYXNoLWNvbG9yLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGR1cmF0aW9uIFRoZSBkdXJhdGlvbiBpbiBmcmFtZXMuXG4gICAgIyMjXG4gICAgZmxhc2g6IChjb2xvciwgZHVyYXRpb24pIC0+XG4gICAgICAgIEBvYmplY3QuY29sb3IgPSBjb2xvclxuICAgICAgICBjb2xvciA9IG5ldyBDb2xvcihjb2xvcilcbiAgICAgICAgY29sb3IuYWxwaGEgPSAwXG4gICAgICAgIHJldHVybiBAY29sb3JUbyhjb2xvciwgZHVyYXRpb24sIGdzLkVhc2luZ3MuRUFTRV9MSU5FQVJbZ3MuRWFzaW5nVHlwZXMuRUFTRV9JTl0pXG4gICAgXG4gICAgIyMjKlxuICAgICogTGV0cyBhIGdhbWUgb2JqZWN0IGFwcGVhciBvbiBzY3JlZW4gdXNpbmcgYSBzcGVjaWZpZWQgYW5pbWF0aW9uLlxuICAgICpcbiAgICAqIEBtZXRob2QgYXBwZWFyXG4gICAgKiBAcGFyYW0ge251bWJlcn0geCBUaGUgeC1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQtcG9zaXRpb24uXG4gICAgKiBAcGFyYW0ge251bWJlcn0geSBUaGUgeS1jb29yZGluYXRlIG9mIHRoZSB0YXJnZXQtcG9zaXRpb24uXG4gICAgKiBAcGFyYW0ge2dzLkFwcGVhckFuaW1hdGlvbkluZm99IGFuaW1hdGlvbiBUaGUgYW5pbWF0aW9uIGluZm8tb2JqZWN0LlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZyBUaGUgZWFzaW5nLXR5cGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gVGhlIGR1cmF0aW9uIGluIGZyYW1lcy5cbiAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gQW4gb3B0aW9uYWwgY2FsbGJhY2stZnVuY3Rpb24gY2FsbGVkIHdoZW4gdGhlIGFuaW1hdGlvbiBpcyBmaW5pc2hlZC4gXG4gICAgIyMjICAgICAgXG4gICAgYXBwZWFyOiAoeCwgeSwgYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uLCBjYWxsYmFjaykgLT5cbiAgICAgICAgZWFzaW5nID0gZWFzaW5nIHx8IGdzLkVhc2luZ3MuRUFTRV9MSU5FQVJbZ3MuRWFzaW5nVHlwZXMuRUFTRV9JTl1cbiAgICAgICAgQG9iamVjdC52aXNpYmxlID0geWVzXG5cbiAgICAgICAgaWYgYW5pbWF0aW9uLnR5cGUgPT0gZ3MuQW5pbWF0aW9uVHlwZXMuTU9WRU1FTlRcbiAgICAgICAgICAgIEBtb3ZlSW4oeCwgeSwgYW5pbWF0aW9uLm1vdmVtZW50LCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjaylcbiAgICAgICAgZWxzZSBpZiBhbmltYXRpb24udHlwZSA9PSBncy5BbmltYXRpb25UeXBlcy5NQVNLSU5HXG4gICAgICAgICAgICBAbWFza0luKGFuaW1hdGlvbi5tYXNrLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjaylcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHNob3coZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2spXG4gICAgXG4gICAgIyMjKlxuICAgICogTGV0cyBhIGdhbWUgb2JqZWN0IGRpc2FwcGVhciBmcm9tIHNjcmVlbiB1c2luZyBhIHNwZWNpZmllZCBhbmltYXRpb24uXG4gICAgKlxuICAgICogQG1ldGhvZCBkaXNhcHBlYXJcbiAgICAqIEBwYXJhbSB7Z3MuQXBwZWFyQW5pbWF0aW9uSW5mb30gYW5pbWF0aW9uIFRoZSBhbmltYXRpb24gaW5mby1vYmplY3QuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZWFzaW5nIFRoZSBlYXNpbmctdHlwZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkdXJhdGlvbiBUaGUgZHVyYXRpb24gaW4gZnJhbWVzLlxuICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSBBbiBvcHRpb25hbCBjYWxsYmFjay1mdW5jdGlvbiBjYWxsZWQgd2hlbiB0aGUgYW5pbWF0aW9uIGlzIGZpbmlzaGVkLiBcbiAgICAjIyMgICAgICAgXG4gICAgZGlzYXBwZWFyOiAoYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uLCBjYWxsYmFjaykgLT5cbiAgICAgICAgQG9iamVjdC52aXNpYmxlID0geWVzXG4gICAgICAgIGlmIGFuaW1hdGlvbi50eXBlID09IGdzLkFuaW1hdGlvblR5cGVzLk1PVkVNRU5UXG4gICAgICAgICAgICBAbW92ZU91dChhbmltYXRpb24ubW92ZW1lbnQsIGR1cmF0aW9uLCBlYXNpbmcsIGNhbGxiYWNrKVxuICAgICAgICBlbHNlIGlmIGFuaW1hdGlvbi50eXBlID09IGdzLkFuaW1hdGlvblR5cGVzLk1BU0tJTkdcbiAgICAgICAgICAgIEBtYXNrT3V0KGFuaW1hdGlvbi5tYXNrLCBkdXJhdGlvbiwgZWFzaW5nLCBjYWxsYmFjaylcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQGhpZGUoZHVyYXRpb24sIGVhc2luZywgY2FsbGJhY2spXG4gICAgICAgIFxuXG5ncy5BbmltYXRvciA9IENvbXBvbmVudF9BbmltYXRvclxuZ3MuQ29tcG9uZW50X0FuaW1hdG9yID0gQ29tcG9uZW50X0FuaW1hdG9yIl19
//# sourceURL=Component_Animator_139.js