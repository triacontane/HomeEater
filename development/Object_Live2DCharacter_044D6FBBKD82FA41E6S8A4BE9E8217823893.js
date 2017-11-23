var Object_Live2DCharacter,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Object_Live2DCharacter = (function(superClass) {
  extend(Object_Live2DCharacter, superClass);

  Object_Live2DCharacter.objectCodecBlackList = ["parent"];


  /**
  * A game object for an animated Live2D visual novel character. 
  *
  * @module gs
  * @class Object_Live2DCharacter
  * @extends gs.Object_Visual
  * @memberof gs
  * @constructor
   */

  function Object_Live2DCharacter(record, data) {
    var ref;
    Object_Live2DCharacter.__super__.constructor.call(this, data);
    this.zIndex = 200;

    /**
    * The ID of the character-record used.
    * @property rid
    * @type number
     */
    debugger;
    this.rid = (data != null ? data.id : void 0) || ((ref = record != null ? record.index : void 0) != null ? ref : -1);

    /**
    * The rotation-angle of the character in degrees. The rotation center depends on the
    * anchor-point.
    * @property angle
    * @type number
     */
    this.angle = 0;

    /**
    * The color tone of the object used for the visual presentation.
    * @property tone
    * @type gs.Tone
     */
    this.tone = new Tone(0, 0, 0, 0);

    /**
    * The color of the object used for the visual presentation.
    * @property color
    * @type gs.Color
     */
    this.color = new Color(255, 255, 255, 0);

    /**
    * The Live2D model used for the visual presentation.
    * @property model
    * @type gs.Live2DModel
     */
    this.model = data != null ? ResourceManager.getLive2DModel("Live2D/" + data.modelName) : null;

    /**
    * The resource name of a Live2D model used for the visual presentation.
    * @property modelName
    * @type string
     */
    this.modelName = data != null ? data.modelName : void 0;

    /**
    * The Live2D motion.
    * @property motion
    * @type gs.Live2DMotion
     */
    this.motion = (data != null ? data.motion : void 0) || {
      name: "",
      loop: true

      /**
      * The Live2D motion group.
      * @property motion
      * @type gs.Live2DMotionGroup
       */
    };
    this.motionGroup = data != null ? data.motionGroup : void 0;

    /**
    * The Live2D expression.
    * @property expression
    * @type gs.Live2DExpression
     */
    this.expression = (data != null ? data.expression : void 0) || {
      name: ""

      /**
      * The character's behavior component which contains the character-specific logic.
      * @property behavior
      * @type vn.Component_CharacterBehavior
       */
    };
    this.behavior = new vn.Component_CharacterBehavior();
    this.logic = this.behavior;

    /**
    * The object's animator-component to execute different kind of animations like move, rotate, etc. on it.
    * @property animator
    * @type vn.Component_Animator
     */
    this.animator = new gs.Component_Animator();

    /**
    * The object's visual-component to display the game object on screen.
    * @property visual
    * @type gs.Component_Sprite
     */
    this.visual = new gs.Component_Live2D();
    this.visual.modelFolder = "Live2D";
    this.addComponent(this.logic);
    this.addComponent(this.animator);
    this.addComponent(this.visual);
  }


  /**
  * Serializes the object into a data-bundle.
  *
  * @method toDataBundle
  * @return {Object} The data-bundle.
   */

  Object_Live2DCharacter.prototype.toDataBundle = function() {
    return {
      rid: this.rid,
      x: this.dstRect.x,
      y: this.dstRect.y,
      opacity: this.opacity,
      offset: this.offset,
      zoom: this.zoom,
      origin: this.origin,
      mirror: this.mirror,
      expression: this.expression,
      modelName: this.modelName,
      motion: this.motion,
      motionGroup: this.motionGroup,
      expression: this.expression
    };
  };

  return Object_Live2DCharacter;

})(gs.Object_Visual);

vn.Object_Live2DCharacter = Object_Live2DCharacter;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUEsc0JBQUE7RUFBQTs7O0FBQU07OztFQUNGLHNCQUFDLENBQUEsb0JBQUQsR0FBd0IsQ0FBQyxRQUFEOzs7QUFFeEI7Ozs7Ozs7Ozs7RUFTYSxnQ0FBQyxNQUFELEVBQVMsSUFBVDtBQUNULFFBQUE7SUFBQSx3REFBTSxJQUFOO0lBQ0EsSUFBQyxDQUFBLE1BQUQsR0FBVTs7QUFFVjs7Ozs7QUFLQTtJQUNBLElBQUMsQ0FBQSxHQUFELG1CQUFPLElBQUksQ0FBRSxZQUFOLElBQVksZ0VBQWlCLENBQUMsQ0FBbEI7O0FBRW5COzs7Ozs7SUFNQSxJQUFDLENBQUEsS0FBRCxHQUFTOztBQUVUOzs7OztJQUtBLElBQUMsQ0FBQSxJQUFELEdBQVksSUFBQSxJQUFBLENBQUssQ0FBTCxFQUFRLENBQVIsRUFBVyxDQUFYLEVBQWMsQ0FBZDs7QUFFWjs7Ozs7SUFLQSxJQUFDLENBQUEsS0FBRCxHQUFhLElBQUEsS0FBQSxDQUFNLEdBQU4sRUFBVyxHQUFYLEVBQWdCLEdBQWhCLEVBQXFCLENBQXJCOztBQUViOzs7OztJQUtBLElBQUMsQ0FBQSxLQUFELEdBQVksWUFBSCxHQUFjLGVBQWUsQ0FBQyxjQUFoQixDQUErQixTQUFBLEdBQVUsSUFBSSxDQUFDLFNBQTlDLENBQWQsR0FBOEU7O0FBRXZGOzs7OztJQUtBLElBQUMsQ0FBQSxTQUFELGtCQUFhLElBQUksQ0FBRTs7QUFFbkI7Ozs7O0lBS0EsSUFBQyxDQUFBLE1BQUQsbUJBQVUsSUFBSSxDQUFFLGdCQUFOLElBQWdCO01BQUEsSUFBQSxFQUFNLEVBQU47TUFBVSxJQUFBLEVBQU07O0FBRTFDOzs7O1NBRjBCOztJQU8xQixJQUFDLENBQUEsV0FBRCxrQkFBZSxJQUFJLENBQUU7O0FBRXJCOzs7OztJQUtBLElBQUMsQ0FBQSxVQUFELG1CQUFjLElBQUksQ0FBRSxvQkFBTixJQUFvQjtNQUFBLElBQUEsRUFBTTs7QUFFeEM7Ozs7U0FGa0M7O0lBT2xDLElBQUMsQ0FBQSxRQUFELEdBQWdCLElBQUEsRUFBRSxDQUFDLDJCQUFILENBQUE7SUFDaEIsSUFBQyxDQUFBLEtBQUQsR0FBUyxJQUFDLENBQUE7O0FBRVY7Ozs7O0lBS0EsSUFBQyxDQUFBLFFBQUQsR0FBZ0IsSUFBQSxFQUFFLENBQUMsa0JBQUgsQ0FBQTs7QUFFaEI7Ozs7O0lBS0EsSUFBQyxDQUFBLE1BQUQsR0FBYyxJQUFBLEVBQUUsQ0FBQyxnQkFBSCxDQUFBO0lBQ2QsSUFBQyxDQUFBLE1BQU0sQ0FBQyxXQUFSLEdBQXNCO0lBRXRCLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBQyxDQUFBLEtBQWY7SUFDQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQUMsQ0FBQSxRQUFmO0lBQ0EsSUFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFDLENBQUEsTUFBZjtFQTlGUzs7O0FBZ0diOzs7Ozs7O21DQU1BLFlBQUEsR0FBYyxTQUFBO1dBQ1Y7TUFBQSxHQUFBLEVBQUssSUFBQyxDQUFBLEdBQU47TUFDQSxDQUFBLEVBQUcsSUFBQyxDQUFBLE9BQU8sQ0FBQyxDQURaO01BRUEsQ0FBQSxFQUFHLElBQUMsQ0FBQSxPQUFPLENBQUMsQ0FGWjtNQUdBLE9BQUEsRUFBUyxJQUFDLENBQUEsT0FIVjtNQUlBLE1BQUEsRUFBUSxJQUFDLENBQUEsTUFKVDtNQUtBLElBQUEsRUFBTSxJQUFDLENBQUEsSUFMUDtNQU1BLE1BQUEsRUFBUSxJQUFDLENBQUEsTUFOVDtNQU9BLE1BQUEsRUFBUSxJQUFDLENBQUEsTUFQVDtNQVFBLFVBQUEsRUFBWSxJQUFDLENBQUEsVUFSYjtNQVNBLFNBQUEsRUFBVyxJQUFDLENBQUEsU0FUWjtNQVVBLE1BQUEsRUFBUSxJQUFDLENBQUEsTUFWVDtNQVdBLFdBQUEsRUFBYSxJQUFDLENBQUEsV0FYZDtNQVlBLFVBQUEsRUFBWSxJQUFDLENBQUEsVUFaYjs7RUFEVTs7OztHQWxIbUIsRUFBRSxDQUFDOztBQW1JeEMsRUFBRSxDQUFDLHNCQUFILEdBQTRCIiwic291cmNlc0NvbnRlbnQiOlsiIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4jXG4jICAgU2NyaXB0OiBPYmplY3RfTGl2ZTJEQ2hhcmFjdGVyXG4jXG4jICAgJCRDT1BZUklHSFQkJFxuI1xuIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5jbGFzcyBPYmplY3RfTGl2ZTJEQ2hhcmFjdGVyIGV4dGVuZHMgZ3MuT2JqZWN0X1Zpc3VhbFxuICAgIEBvYmplY3RDb2RlY0JsYWNrTGlzdCA9IFtcInBhcmVudFwiXVxuICAgIFxuICAgICMjIypcbiAgICAqIEEgZ2FtZSBvYmplY3QgZm9yIGFuIGFuaW1hdGVkIExpdmUyRCB2aXN1YWwgbm92ZWwgY2hhcmFjdGVyLiBcbiAgICAqXG4gICAgKiBAbW9kdWxlIGdzXG4gICAgKiBAY2xhc3MgT2JqZWN0X0xpdmUyRENoYXJhY3RlclxuICAgICogQGV4dGVuZHMgZ3MuT2JqZWN0X1Zpc3VhbFxuICAgICogQG1lbWJlcm9mIGdzXG4gICAgKiBAY29uc3RydWN0b3JcbiAgICAjIyNcbiAgICBjb25zdHJ1Y3RvcjogKHJlY29yZCwgZGF0YSkgLT5cbiAgICAgICAgc3VwZXIoZGF0YSlcbiAgICAgICAgQHpJbmRleCA9IDIwMFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBJRCBvZiB0aGUgY2hhcmFjdGVyLXJlY29yZCB1c2VkLlxuICAgICAgICAqIEBwcm9wZXJ0eSByaWRcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgIyMjXG4gICAgICAgIGRlYnVnZ2VyXG4gICAgICAgIEByaWQgPSBkYXRhPy5pZCB8fCAocmVjb3JkPy5pbmRleCA/IC0xKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSByb3RhdGlvbi1hbmdsZSBvZiB0aGUgY2hhcmFjdGVyIGluIGRlZ3JlZXMuIFRoZSByb3RhdGlvbiBjZW50ZXIgZGVwZW5kcyBvbiB0aGVcbiAgICAgICAgKiBhbmNob3ItcG9pbnQuXG4gICAgICAgICogQHByb3BlcnR5IGFuZ2xlXG4gICAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAgICMjI1xuICAgICAgICBAYW5nbGUgPSAwXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIGNvbG9yIHRvbmUgb2YgdGhlIG9iamVjdCB1c2VkIGZvciB0aGUgdmlzdWFsIHByZXNlbnRhdGlvbi5cbiAgICAgICAgKiBAcHJvcGVydHkgdG9uZVxuICAgICAgICAqIEB0eXBlIGdzLlRvbmVcbiAgICAgICAgIyMjXG4gICAgICAgIEB0b25lID0gbmV3IFRvbmUoMCwgMCwgMCwgMClcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgY29sb3Igb2YgdGhlIG9iamVjdCB1c2VkIGZvciB0aGUgdmlzdWFsIHByZXNlbnRhdGlvbi5cbiAgICAgICAgKiBAcHJvcGVydHkgY29sb3JcbiAgICAgICAgKiBAdHlwZSBncy5Db2xvclxuICAgICAgICAjIyNcbiAgICAgICAgQGNvbG9yID0gbmV3IENvbG9yKDI1NSwgMjU1LCAyNTUsIDApXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIExpdmUyRCBtb2RlbCB1c2VkIGZvciB0aGUgdmlzdWFsIHByZXNlbnRhdGlvbi5cbiAgICAgICAgKiBAcHJvcGVydHkgbW9kZWxcbiAgICAgICAgKiBAdHlwZSBncy5MaXZlMkRNb2RlbFxuICAgICAgICAjIyNcbiAgICAgICAgQG1vZGVsID0gaWYgZGF0YT8gdGhlbiBSZXNvdXJjZU1hbmFnZXIuZ2V0TGl2ZTJETW9kZWwoXCJMaXZlMkQvI3tkYXRhLm1vZGVsTmFtZX1cIikgZWxzZSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIHJlc291cmNlIG5hbWUgb2YgYSBMaXZlMkQgbW9kZWwgdXNlZCBmb3IgdGhlIHZpc3VhbCBwcmVzZW50YXRpb24uXG4gICAgICAgICogQHByb3BlcnR5IG1vZGVsTmFtZVxuICAgICAgICAqIEB0eXBlIHN0cmluZ1xuICAgICAgICAjIyNcbiAgICAgICAgQG1vZGVsTmFtZSA9IGRhdGE/Lm1vZGVsTmFtZVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBMaXZlMkQgbW90aW9uLlxuICAgICAgICAqIEBwcm9wZXJ0eSBtb3Rpb25cbiAgICAgICAgKiBAdHlwZSBncy5MaXZlMkRNb3Rpb25cbiAgICAgICAgIyMjXG4gICAgICAgIEBtb3Rpb24gPSBkYXRhPy5tb3Rpb24gfHwgbmFtZTogXCJcIiwgbG9vcDogeWVzXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIExpdmUyRCBtb3Rpb24gZ3JvdXAuXG4gICAgICAgICogQHByb3BlcnR5IG1vdGlvblxuICAgICAgICAqIEB0eXBlIGdzLkxpdmUyRE1vdGlvbkdyb3VwXG4gICAgICAgICMjI1xuICAgICAgICBAbW90aW9uR3JvdXAgPSBkYXRhPy5tb3Rpb25Hcm91cFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBMaXZlMkQgZXhwcmVzc2lvbi5cbiAgICAgICAgKiBAcHJvcGVydHkgZXhwcmVzc2lvblxuICAgICAgICAqIEB0eXBlIGdzLkxpdmUyREV4cHJlc3Npb25cbiAgICAgICAgIyMjXG4gICAgICAgIEBleHByZXNzaW9uID0gZGF0YT8uZXhwcmVzc2lvbiB8fCBuYW1lOiBcIlwiICNSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlckV4cHJlc3Npb25zW2RhdGE/LmV4cHJlc3Npb25JZCB8fCAwXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBjaGFyYWN0ZXIncyBiZWhhdmlvciBjb21wb25lbnQgd2hpY2ggY29udGFpbnMgdGhlIGNoYXJhY3Rlci1zcGVjaWZpYyBsb2dpYy5cbiAgICAgICAgKiBAcHJvcGVydHkgYmVoYXZpb3JcbiAgICAgICAgKiBAdHlwZSB2bi5Db21wb25lbnRfQ2hhcmFjdGVyQmVoYXZpb3JcbiAgICAgICAgIyMjXG4gICAgICAgIEBiZWhhdmlvciA9IG5ldyB2bi5Db21wb25lbnRfQ2hhcmFjdGVyQmVoYXZpb3IoKVxuICAgICAgICBAbG9naWMgPSBAYmVoYXZpb3JcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgb2JqZWN0J3MgYW5pbWF0b3ItY29tcG9uZW50IHRvIGV4ZWN1dGUgZGlmZmVyZW50IGtpbmQgb2YgYW5pbWF0aW9ucyBsaWtlIG1vdmUsIHJvdGF0ZSwgZXRjLiBvbiBpdC5cbiAgICAgICAgKiBAcHJvcGVydHkgYW5pbWF0b3JcbiAgICAgICAgKiBAdHlwZSB2bi5Db21wb25lbnRfQW5pbWF0b3JcbiAgICAgICAgIyMjXG4gICAgICAgIEBhbmltYXRvciA9IG5ldyBncy5Db21wb25lbnRfQW5pbWF0b3IoKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBvYmplY3QncyB2aXN1YWwtY29tcG9uZW50IHRvIGRpc3BsYXkgdGhlIGdhbWUgb2JqZWN0IG9uIHNjcmVlbi5cbiAgICAgICAgKiBAcHJvcGVydHkgdmlzdWFsXG4gICAgICAgICogQHR5cGUgZ3MuQ29tcG9uZW50X1Nwcml0ZVxuICAgICAgICAjIyNcbiAgICAgICAgQHZpc3VhbCA9IG5ldyBncy5Db21wb25lbnRfTGl2ZTJEKClcbiAgICAgICAgQHZpc3VhbC5tb2RlbEZvbGRlciA9IFwiTGl2ZTJEXCJcbiAgICAgICAgXG4gICAgICAgIEBhZGRDb21wb25lbnQoQGxvZ2ljKVxuICAgICAgICBAYWRkQ29tcG9uZW50KEBhbmltYXRvcilcbiAgICAgICAgQGFkZENvbXBvbmVudChAdmlzdWFsKVxuICAgICAgXG4gICAgIyMjKlxuICAgICogU2VyaWFsaXplcyB0aGUgb2JqZWN0IGludG8gYSBkYXRhLWJ1bmRsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHRvRGF0YUJ1bmRsZVxuICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgZGF0YS1idW5kbGUuXG4gICAgIyMjICAgIFxuICAgIHRvRGF0YUJ1bmRsZTogLT4gXG4gICAgICAgIHJpZDogQHJpZCwgXG4gICAgICAgIHg6IEBkc3RSZWN0LngsIFxuICAgICAgICB5OiBAZHN0UmVjdC55LCBcbiAgICAgICAgb3BhY2l0eTogQG9wYWNpdHksXG4gICAgICAgIG9mZnNldDogQG9mZnNldCxcbiAgICAgICAgem9vbTogQHpvb20sXG4gICAgICAgIG9yaWdpbjogQG9yaWdpbixcbiAgICAgICAgbWlycm9yOiBAbWlycm9yLCBcbiAgICAgICAgZXhwcmVzc2lvbjogQGV4cHJlc3Npb24sIFxuICAgICAgICBtb2RlbE5hbWU6IEBtb2RlbE5hbWUsXG4gICAgICAgIG1vdGlvbjogQG1vdGlvbixcbiAgICAgICAgbW90aW9uR3JvdXA6IEBtb3Rpb25Hcm91cCxcbiAgICAgICAgZXhwcmVzc2lvbjogQGV4cHJlc3Npb25cbiAgICAgICAgXG4gICAgICAgIFxuXG52bi5PYmplY3RfTGl2ZTJEQ2hhcmFjdGVyID0gT2JqZWN0X0xpdmUyRENoYXJhY3RlciJdfQ==
//# sourceURL=Object_Live2DCharacter_69.js