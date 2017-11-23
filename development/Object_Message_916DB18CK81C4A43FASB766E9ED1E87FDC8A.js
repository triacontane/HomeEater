var MessageSettings, Object_Message,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

MessageSettings = (function() {

  /**
  * Stores the different kind of settings for a message object such as
  * auto-erase, wait-at-end, backlog writing, etc.
  *
  * @module ui
  * @class MessageSettings
  * @memberof ui
  * @constructor
   */
  function MessageSettings() {

    /**
    * The domain the object belongs to.
    * @property domain
    * @type string
     */
    this.domain = "com.degica.vnm.default";

    /**
    * Indicates if the message should wait for user-action to continue.
    * @property waitAtEnd
    * @type boolean
    * @default true
     */
    this.waitAtEnd = true;

    /**
    * Indicates if the message should automatically erase it's content 
    * before displaying the next message.
    * @property autoErase
    * @type boolean
    * @default true
     */
    this.autoErase = true;

    /**
    * Indicates if the message should be added to the backlog.
    * @property backlog
    * @type boolean
    * @default true
     */
    this.backlog = true;

    /**
    * Spacing between text lines in pixels.
    * @property lineSpacing
    * @type number
    * @default 0
     */
    this.lineSpacing = 0;

    /**
    * Left and right padding of a text line in pixels.
    * @property linePadding
    * @type number
    * @default 6
     */
    this.linePadding = 6;

    /**
    * Spacing between text paragraphs in pixels. A paragraph is a single
    * message added if the <b>autoErase</b> property is off.
    * @property paragraphSpacing
    * @type number
    * @default 0
     */
    this.paragraphSpacing = 0;

    /**
    * Indicates if the defined text-color of the currently speaking character should
    * be used as message text color. That is useful for NVL style messages.
    * @property useCharacterColor
    * @type boolean
    * @default false
     */
    this.useCharacterColor = false;
  }

  return MessageSettings;

})();

ui.MessageSettings = MessageSettings;

Object_Message = (function(superClass) {
  extend(Object_Message, superClass);

  Object_Message.objectCodecBlackList = ["parent", "controlsByStyle", "parentsByStyle", "styles", "activeStyles"];


  /**
  * A message object to display game messages on screen.
  *
  * @module ui
  * @class Object_Message
  * @extends ui.Object_UIElement
  * @memberof ui
  * @constructor
   */

  function Object_Message() {
    Object_Message.__super__.constructor.apply(this, arguments);
    this.visible = false;

    /**
    * The font used for the message text.
    * @property font
    * @type gs.Font
     */
    this.font = new Font("Verdana", Math.round(9 / 240 * Graphics.height));
    this.font.border = false;
    this.font.borderColor = new Color(0, 0, 0);

    /**
    * Message specific settings such as auto-erase, wait-at-end, etc.
    * @property settings
    * @type ui.MessageSettings
     */
    this.settings = new ui.MessageSettings();

    /**
    * All message paragraphs 
    * @property messages
    * @type Object[]
     */
    this.messages = [];

    /**
    * The text-renderer used to render the message text.
    * @property textRenderer
    * @type gs.Component_MessageTextRenderer
     */
    this.textRenderer = new gs.Component_MessageTextRenderer();

    /**
    * The UI object's animator-component to execute different kind of animations like move, rotate, etc. on it.
    * @property animator
    * @type gs.Component_Animator
     */
    this.animator = new gs.Animator();

    /**
    * The UI object's source rectangle on screen.
    * @property srcRect
    * @type gs.Rect
     */
    this.srcRect = new Rect(0, 0, 1, 1);
    this.message = new vn.Component_MessageBehavior();

    /**
    * The UI object's component to add message-specific behavior.
    * @property behavior
    * @type vn.Component_MessageBehavior
     */
    this.behavior = this.message;
    this.addComponent(this.animator);
    this.addComponent(this.textRenderer);
    this.addComponent(this.message);
  }


  /**
  * Restores the object from a data-bundle.
  *
  * @method restore
  * @param {Object} data - The data-bundle.
   */

  Object_Message.prototype.restore = function(data) {
    Object_Message.__super__.restore.call(this, data);
    this.font = new Font(data.font.name, data.font.size);
    this.font.restore(data.font);
    this.dstRect.width = data.width;
    return this.dstRect.height = data.height;
  };


  /**
  * Serializes the object into a data-bundle.
  *
  * @method toDataBundle
  * @return {Object} The data-bundle.
   */

  Object_Message.prototype.toDataBundle = function() {
    var bundle;
    bundle = Object_Message.__super__.toDataBundle.call(this);
    bundle.font = this.font.toDataBundle();
    bundle.width = this.dstRect.width;
    bundle.height = this.dstRect.height;
    return bundle;
  };

  return Object_Message;

})(ui.Object_UIElement);

ui.Object_Message = Object_Message;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUEsK0JBQUE7RUFBQTs7O0FBQU07O0FBQ0Y7Ozs7Ozs7OztFQVNhLHlCQUFBOztBQUNUOzs7OztJQUtBLElBQUMsQ0FBQSxNQUFELEdBQVU7O0FBRVY7Ozs7OztJQU1BLElBQUMsQ0FBQSxTQUFELEdBQWE7O0FBRWI7Ozs7Ozs7SUFPQSxJQUFDLENBQUEsU0FBRCxHQUFhOztBQUViOzs7Ozs7SUFNQSxJQUFDLENBQUEsT0FBRCxHQUFXOztBQUVYOzs7Ozs7SUFNQSxJQUFDLENBQUEsV0FBRCxHQUFlOztBQUVmOzs7Ozs7SUFNQSxJQUFDLENBQUEsV0FBRCxHQUFlOztBQUVmOzs7Ozs7O0lBT0EsSUFBQyxDQUFBLGdCQUFELEdBQW9COztBQUVwQjs7Ozs7OztJQU9BLElBQUMsQ0FBQSxpQkFBRCxHQUFxQjtFQWpFWjs7Ozs7O0FBbUVqQixFQUFFLENBQUMsZUFBSCxHQUFxQjs7QUFFZjs7O0VBQ0YsY0FBQyxDQUFBLG9CQUFELEdBQXdCLENBQUMsUUFBRCxFQUFXLGlCQUFYLEVBQThCLGdCQUE5QixFQUFnRCxRQUFoRCxFQUEwRCxjQUExRDs7O0FBRXhCOzs7Ozs7Ozs7O0VBU2Esd0JBQUE7SUFDVCxpREFBQSxTQUFBO0lBQ0EsSUFBQyxDQUFBLE9BQUQsR0FBVzs7QUFFWDs7Ozs7SUFLQSxJQUFDLENBQUEsSUFBRCxHQUFZLElBQUEsSUFBQSxDQUFLLFNBQUwsRUFBZ0IsSUFBSSxDQUFDLEtBQUwsQ0FBVyxDQUFBLEdBQUksR0FBSixHQUFVLFFBQVEsQ0FBQyxNQUE5QixDQUFoQjtJQUNaLElBQUMsQ0FBQSxJQUFJLENBQUMsTUFBTixHQUFlO0lBQ2YsSUFBQyxDQUFBLElBQUksQ0FBQyxXQUFOLEdBQXdCLElBQUEsS0FBQSxDQUFNLENBQU4sRUFBUyxDQUFULEVBQVksQ0FBWjs7QUFFeEI7Ozs7O0lBS0EsSUFBQyxDQUFBLFFBQUQsR0FBZ0IsSUFBQSxFQUFFLENBQUMsZUFBSCxDQUFBOztBQUVoQjs7Ozs7SUFLQSxJQUFDLENBQUEsUUFBRCxHQUFZOztBQUVaOzs7OztJQUtBLElBQUMsQ0FBQSxZQUFELEdBQW9CLElBQUEsRUFBRSxDQUFDLDZCQUFILENBQUE7O0FBRXBCOzs7OztJQUtBLElBQUMsQ0FBQSxRQUFELEdBQWdCLElBQUEsRUFBRSxDQUFDLFFBQUgsQ0FBQTs7QUFFaEI7Ozs7O0lBS0EsSUFBQyxDQUFBLE9BQUQsR0FBZSxJQUFBLElBQUEsQ0FBSyxDQUFMLEVBQVEsQ0FBUixFQUFXLENBQVgsRUFBYyxDQUFkO0lBRWYsSUFBQyxDQUFBLE9BQUQsR0FBZSxJQUFBLEVBQUUsQ0FBQyx5QkFBSCxDQUFBOztBQUVmOzs7OztJQUtBLElBQUMsQ0FBQSxRQUFELEdBQVksSUFBQyxDQUFBO0lBRWIsSUFBQyxDQUFBLFlBQUQsQ0FBYyxJQUFDLENBQUEsUUFBZjtJQUNBLElBQUMsQ0FBQSxZQUFELENBQWMsSUFBQyxDQUFBLFlBQWY7SUFDQSxJQUFDLENBQUEsWUFBRCxDQUFjLElBQUMsQ0FBQSxPQUFmO0VBM0RTOzs7QUE4RGI7Ozs7Ozs7MkJBTUEsT0FBQSxHQUFTLFNBQUMsSUFBRDtJQUNMLDRDQUFNLElBQU47SUFDQSxJQUFDLENBQUEsSUFBRCxHQUFZLElBQUEsSUFBQSxDQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBZixFQUFxQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQS9CO0lBQ1osSUFBQyxDQUFBLElBQUksQ0FBQyxPQUFOLENBQWMsSUFBSSxDQUFDLElBQW5CO0lBQ0EsSUFBQyxDQUFBLE9BQU8sQ0FBQyxLQUFULEdBQWlCLElBQUksQ0FBQztXQUN0QixJQUFDLENBQUEsT0FBTyxDQUFDLE1BQVQsR0FBa0IsSUFBSSxDQUFDO0VBTGxCOzs7QUFPVDs7Ozs7OzsyQkFNQSxZQUFBLEdBQWMsU0FBQTtBQUNWLFFBQUE7SUFBQSxNQUFBLEdBQVMsK0NBQUE7SUFFVCxNQUFNLENBQUMsSUFBUCxHQUFjLElBQUMsQ0FBQSxJQUFJLENBQUMsWUFBTixDQUFBO0lBQ2QsTUFBTSxDQUFDLEtBQVAsR0FBZSxJQUFDLENBQUEsT0FBTyxDQUFDO0lBQ3hCLE1BQU0sQ0FBQyxNQUFQLEdBQWdCLElBQUMsQ0FBQSxPQUFPLENBQUM7QUFFekIsV0FBTztFQVBHOzs7O0dBN0ZXLEVBQUUsQ0FBQzs7QUFzR2hDLEVBQUUsQ0FBQyxjQUFILEdBQW9CIiwic291cmNlc0NvbnRlbnQiOlsiIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4jXG4jICAgU2NyaXB0OiBPYmplY3RfTWVzc2FnZVxuI1xuIyAgICQkQ09QWVJJR0hUJCRcbiNcbiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuY2xhc3MgTWVzc2FnZVNldHRpbmdzXG4gICAgIyMjKlxuICAgICogU3RvcmVzIHRoZSBkaWZmZXJlbnQga2luZCBvZiBzZXR0aW5ncyBmb3IgYSBtZXNzYWdlIG9iamVjdCBzdWNoIGFzXG4gICAgKiBhdXRvLWVyYXNlLCB3YWl0LWF0LWVuZCwgYmFja2xvZyB3cml0aW5nLCBldGMuXG4gICAgKlxuICAgICogQG1vZHVsZSB1aVxuICAgICogQGNsYXNzIE1lc3NhZ2VTZXR0aW5nc1xuICAgICogQG1lbWJlcm9mIHVpXG4gICAgKiBAY29uc3RydWN0b3JcbiAgICAjIyMgXG4gICAgY29uc3RydWN0b3I6IC0+XG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZG9tYWluIHRoZSBvYmplY3QgYmVsb25ncyB0by5cbiAgICAgICAgKiBAcHJvcGVydHkgZG9tYWluXG4gICAgICAgICogQHR5cGUgc3RyaW5nXG4gICAgICAgICMjI1xuICAgICAgICBAZG9tYWluID0gXCJjb20uZGVnaWNhLnZubS5kZWZhdWx0XCJcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIG1lc3NhZ2Ugc2hvdWxkIHdhaXQgZm9yIHVzZXItYWN0aW9uIHRvIGNvbnRpbnVlLlxuICAgICAgICAqIEBwcm9wZXJ0eSB3YWl0QXRFbmRcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICogQGRlZmF1bHQgdHJ1ZVxuICAgICAgICAjIyNcbiAgICAgICAgQHdhaXRBdEVuZCA9IHllc1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgbWVzc2FnZSBzaG91bGQgYXV0b21hdGljYWxseSBlcmFzZSBpdCdzIGNvbnRlbnQgXG4gICAgICAgICogYmVmb3JlIGRpc3BsYXlpbmcgdGhlIG5leHQgbWVzc2FnZS5cbiAgICAgICAgKiBAcHJvcGVydHkgYXV0b0VyYXNlXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgICAgIyMjXG4gICAgICAgIEBhdXRvRXJhc2UgPSB5ZXNcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIG1lc3NhZ2Ugc2hvdWxkIGJlIGFkZGVkIHRvIHRoZSBiYWNrbG9nLlxuICAgICAgICAqIEBwcm9wZXJ0eSBiYWNrbG9nXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAqIEBkZWZhdWx0IHRydWVcbiAgICAgICAgIyMjXG4gICAgICAgIEBiYWNrbG9nID0geWVzXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3BhY2luZyBiZXR3ZWVuIHRleHQgbGluZXMgaW4gcGl4ZWxzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBsaW5lU3BhY2luZ1xuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAqIEBkZWZhdWx0IDBcbiAgICAgICAgIyMjXG4gICAgICAgIEBsaW5lU3BhY2luZyA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBMZWZ0IGFuZCByaWdodCBwYWRkaW5nIG9mIGEgdGV4dCBsaW5lIGluIHBpeGVscy5cbiAgICAgICAgKiBAcHJvcGVydHkgbGluZVBhZGRpbmdcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgKiBAZGVmYXVsdCA2XG4gICAgICAgICMjI1xuICAgICAgICBAbGluZVBhZGRpbmcgPSA2XG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3BhY2luZyBiZXR3ZWVuIHRleHQgcGFyYWdyYXBocyBpbiBwaXhlbHMuIEEgcGFyYWdyYXBoIGlzIGEgc2luZ2xlXG4gICAgICAgICogbWVzc2FnZSBhZGRlZCBpZiB0aGUgPGI+YXV0b0VyYXNlPC9iPiBwcm9wZXJ0eSBpcyBvZmYuXG4gICAgICAgICogQHByb3BlcnR5IHBhcmFncmFwaFNwYWNpbmdcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgKiBAZGVmYXVsdCAwXG4gICAgICAgICMjI1xuICAgICAgICBAcGFyYWdyYXBoU3BhY2luZyA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRpY2F0ZXMgaWYgdGhlIGRlZmluZWQgdGV4dC1jb2xvciBvZiB0aGUgY3VycmVudGx5IHNwZWFraW5nIGNoYXJhY3RlciBzaG91bGRcbiAgICAgICAgKiBiZSB1c2VkIGFzIG1lc3NhZ2UgdGV4dCBjb2xvci4gVGhhdCBpcyB1c2VmdWwgZm9yIE5WTCBzdHlsZSBtZXNzYWdlcy5cbiAgICAgICAgKiBAcHJvcGVydHkgdXNlQ2hhcmFjdGVyQ29sb3JcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICogQGRlZmF1bHQgZmFsc2VcbiAgICAgICAgIyMjXG4gICAgICAgIEB1c2VDaGFyYWN0ZXJDb2xvciA9IG5vXG4gICAgICAgIFxudWkuTWVzc2FnZVNldHRpbmdzID0gTWVzc2FnZVNldHRpbmdzXG5cbmNsYXNzIE9iamVjdF9NZXNzYWdlIGV4dGVuZHMgdWkuT2JqZWN0X1VJRWxlbWVudFxuICAgIEBvYmplY3RDb2RlY0JsYWNrTGlzdCA9IFtcInBhcmVudFwiLCBcImNvbnRyb2xzQnlTdHlsZVwiLCBcInBhcmVudHNCeVN0eWxlXCIsIFwic3R5bGVzXCIsIFwiYWN0aXZlU3R5bGVzXCJdXG4gICAgXG4gICAgIyMjKlxuICAgICogQSBtZXNzYWdlIG9iamVjdCB0byBkaXNwbGF5IGdhbWUgbWVzc2FnZXMgb24gc2NyZWVuLlxuICAgICpcbiAgICAqIEBtb2R1bGUgdWlcbiAgICAqIEBjbGFzcyBPYmplY3RfTWVzc2FnZVxuICAgICogQGV4dGVuZHMgdWkuT2JqZWN0X1VJRWxlbWVudFxuICAgICogQG1lbWJlcm9mIHVpXG4gICAgKiBAY29uc3RydWN0b3JcbiAgICAjIyMgXG4gICAgY29uc3RydWN0b3I6IC0+XG4gICAgICAgIHN1cGVyXG4gICAgICAgIEB2aXNpYmxlID0gbm9cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZm9udCB1c2VkIGZvciB0aGUgbWVzc2FnZSB0ZXh0LlxuICAgICAgICAqIEBwcm9wZXJ0eSBmb250XG4gICAgICAgICogQHR5cGUgZ3MuRm9udFxuICAgICAgICAjIyNcbiAgICAgICAgQGZvbnQgPSBuZXcgRm9udChcIlZlcmRhbmFcIiwgTWF0aC5yb3VuZCg5IC8gMjQwICogR3JhcGhpY3MuaGVpZ2h0KSlcbiAgICAgICAgQGZvbnQuYm9yZGVyID0gbm9cbiAgICAgICAgQGZvbnQuYm9yZGVyQ29sb3IgPSBuZXcgQ29sb3IoMCwgMCwgMClcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBNZXNzYWdlIHNwZWNpZmljIHNldHRpbmdzIHN1Y2ggYXMgYXV0by1lcmFzZSwgd2FpdC1hdC1lbmQsIGV0Yy5cbiAgICAgICAgKiBAcHJvcGVydHkgc2V0dGluZ3NcbiAgICAgICAgKiBAdHlwZSB1aS5NZXNzYWdlU2V0dGluZ3NcbiAgICAgICAgIyMjXG4gICAgICAgIEBzZXR0aW5ncyA9IG5ldyB1aS5NZXNzYWdlU2V0dGluZ3MoKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEFsbCBtZXNzYWdlIHBhcmFncmFwaHMgXG4gICAgICAgICogQHByb3BlcnR5IG1lc3NhZ2VzXG4gICAgICAgICogQHR5cGUgT2JqZWN0W11cbiAgICAgICAgIyMjXG4gICAgICAgIEBtZXNzYWdlcyA9IFtdXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIHRleHQtcmVuZGVyZXIgdXNlZCB0byByZW5kZXIgdGhlIG1lc3NhZ2UgdGV4dC5cbiAgICAgICAgKiBAcHJvcGVydHkgdGV4dFJlbmRlcmVyXG4gICAgICAgICogQHR5cGUgZ3MuQ29tcG9uZW50X01lc3NhZ2VUZXh0UmVuZGVyZXJcbiAgICAgICAgIyMjXG4gICAgICAgIEB0ZXh0UmVuZGVyZXIgPSBuZXcgZ3MuQ29tcG9uZW50X01lc3NhZ2VUZXh0UmVuZGVyZXIoKVxuXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgVUkgb2JqZWN0J3MgYW5pbWF0b3ItY29tcG9uZW50IHRvIGV4ZWN1dGUgZGlmZmVyZW50IGtpbmQgb2YgYW5pbWF0aW9ucyBsaWtlIG1vdmUsIHJvdGF0ZSwgZXRjLiBvbiBpdC5cbiAgICAgICAgKiBAcHJvcGVydHkgYW5pbWF0b3JcbiAgICAgICAgKiBAdHlwZSBncy5Db21wb25lbnRfQW5pbWF0b3JcbiAgICAgICAgIyMjXG4gICAgICAgIEBhbmltYXRvciA9IG5ldyBncy5BbmltYXRvcigpXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIFVJIG9iamVjdCdzIHNvdXJjZSByZWN0YW5nbGUgb24gc2NyZWVuLlxuICAgICAgICAqIEBwcm9wZXJ0eSBzcmNSZWN0XG4gICAgICAgICogQHR5cGUgZ3MuUmVjdFxuICAgICAgICAjIyNcbiAgICAgICAgQHNyY1JlY3QgPSBuZXcgUmVjdCgwLCAwLCAxLCAxKVxuICAgICAgICBcbiAgICAgICAgQG1lc3NhZ2UgPSBuZXcgdm4uQ29tcG9uZW50X01lc3NhZ2VCZWhhdmlvcigpXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIFVJIG9iamVjdCdzIGNvbXBvbmVudCB0byBhZGQgbWVzc2FnZS1zcGVjaWZpYyBiZWhhdmlvci5cbiAgICAgICAgKiBAcHJvcGVydHkgYmVoYXZpb3JcbiAgICAgICAgKiBAdHlwZSB2bi5Db21wb25lbnRfTWVzc2FnZUJlaGF2aW9yXG4gICAgICAgICMjI1xuICAgICAgICBAYmVoYXZpb3IgPSBAbWVzc2FnZVxuICAgICAgICBcbiAgICAgICAgQGFkZENvbXBvbmVudChAYW5pbWF0b3IpXG4gICAgICAgIEBhZGRDb21wb25lbnQoQHRleHRSZW5kZXJlcilcbiAgICAgICAgQGFkZENvbXBvbmVudChAbWVzc2FnZSlcbiAgICAgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogUmVzdG9yZXMgdGhlIG9iamVjdCBmcm9tIGEgZGF0YS1idW5kbGUuXG4gICAgKlxuICAgICogQG1ldGhvZCByZXN0b3JlXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBkYXRhLWJ1bmRsZS5cbiAgICAjIyMgICBcbiAgICByZXN0b3JlOiAoZGF0YSkgLT5cbiAgICAgICAgc3VwZXIoZGF0YSlcbiAgICAgICAgQGZvbnQgPSBuZXcgRm9udChkYXRhLmZvbnQubmFtZSwgZGF0YS5mb250LnNpemUpXG4gICAgICAgIEBmb250LnJlc3RvcmUoZGF0YS5mb250KVxuICAgICAgICBAZHN0UmVjdC53aWR0aCA9IGRhdGEud2lkdGhcbiAgICAgICAgQGRzdFJlY3QuaGVpZ2h0ID0gZGF0YS5oZWlnaHRcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2VyaWFsaXplcyB0aGUgb2JqZWN0IGludG8gYSBkYXRhLWJ1bmRsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHRvRGF0YUJ1bmRsZVxuICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgZGF0YS1idW5kbGUuXG4gICAgIyMjICAgXG4gICAgdG9EYXRhQnVuZGxlOiAtPiBcbiAgICAgICAgYnVuZGxlID0gc3VwZXIoKVxuICAgICAgICBcbiAgICAgICAgYnVuZGxlLmZvbnQgPSBAZm9udC50b0RhdGFCdW5kbGUoKVxuICAgICAgICBidW5kbGUud2lkdGggPSBAZHN0UmVjdC53aWR0aFxuICAgICAgICBidW5kbGUuaGVpZ2h0ID0gQGRzdFJlY3QuaGVpZ2h0XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gYnVuZGxlXG4gICAgICAgIFxudWkuT2JqZWN0X01lc3NhZ2UgPSBPYmplY3RfTWVzc2FnZSJdfQ==
//# sourceURL=Object_Message_62.js