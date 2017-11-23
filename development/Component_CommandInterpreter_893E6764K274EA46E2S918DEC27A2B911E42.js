var Component_CommandInterpreter, InterpreterContext, LivePreviewInfo,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

LivePreviewInfo = (function() {

  /**
  * Stores internal preview-info if the game runs currently in Live-Preview.
  *        
  * @module gs
  * @class LivePreviewInfo
  * @memberof gs
   */
  function LivePreviewInfo() {

    /**
    * Timer ID if a timeout for live-preview was configured to exit the game loop after a certain amount of time.
    * @property timeout
    * @type number
     */
    this.timeout = null;

    /** 
    * Indicates if Live-Preview is currently waiting for the next user-action. (Selecting another command, etc.)
    * @property waiting  
    * @type boolean
     */
    this.waiting = false;

    /**
    * Counts the amount of executed commands since the last 
    * interpreter-pause(waiting, etc.). If its more than 500, the interpreter will automatically pause for 1 frame to 
    * avoid that Live-Preview freezes the Editor in case of endless loops.
    * @property executedCommands
    * @type number
     */
    this.executedCommands = 0;
  }

  return LivePreviewInfo;

})();

gs.LivePreviewInfo = LivePreviewInfo;

InterpreterContext = (function() {
  InterpreterContext.objectCodecBlackList = ["owner"];


  /**
  * Describes an interpreter-context which holds information about
  * the interpreter's owner and also unique ID used for accessing correct
  * local variables.
  *
  * @module gs
  * @class InterpreterContext
  * @memberof gs
  * @param {number|string} id - A unique ID
  * @param {Object} owner - The owner of the interpreter
   */

  function InterpreterContext(id, owner) {

    /**
    * A unique numeric or textual ID used for accessing correct local variables.
    * @property id
    * @type number|string
     */
    this.id = id;

    /**
    * The owner of the interpreter (e.g. current scene, etc.).
    * @property owner
    * @type Object
     */
    this.owner = owner;
  }


  /**
  * Sets the context's data.
  * @param {number|string} id - A unique ID
  * @param {Object} owner - The owner of the interpreter
  * @method set
   */

  InterpreterContext.prototype.set = function(id, owner) {
    this.id = id;
    return this.owner = owner;
  };

  return InterpreterContext;

})();

gs.InterpreterContext = InterpreterContext;

Component_CommandInterpreter = (function(superClass) {
  extend(Component_CommandInterpreter, superClass);

  Component_CommandInterpreter.objectCodecBlackList = ["object", "command", "onMessageADVWaiting", "onMessageADVDisappear", "onMessageADVFinish"];


  /**
  * Called if this object instance is restored from a data-bundle. It can be used
  * re-assign event-handler, anonymous functions, etc.
  * 
  * @method onDataBundleRestore.
  * @param Object data - The data-bundle
  * @param gs.ObjectCodecContext context - The codec-context.
   */

  Component_CommandInterpreter.prototype.onDataBundleRestore = function(data, context) {};


  /**
  * A component which allows a game object to process commands like for
  * scene-objects. For each command a command-function exists. To add
  * own custom commands to the interpreter just create a sub-class and
  * override the gs.Component_CommandInterpreter.assignCommand method
  * and assign the command-function for your custom-command.
  *
  * @module gs
  * @class Component_CommandInterpreter
  * @extends gs.Component
  * @memberof gs
   */

  function Component_CommandInterpreter() {
    Component_CommandInterpreter.__super__.constructor.call(this);

    /**
    * Wait-Counter in frames. If greater than 0, the interpreter will for that amount of frames before continue.
    * @property waitCounter
    * @type number
     */
    this.waitCounter = 0;

    /**
    * Index to the next command to execute.
    * @property pointer
    * @type number
     */
    this.pointer = 0;

    /**
    * Stores states of conditions.
    * @property conditions
    * @type number
    * @protected
     */
    this.conditions = [];

    /**
    * Stores states of loops.
    * @property loops
    * @type number
    * @protected
     */
    this.loops = [];
    this.timers = [];

    /**
    * Indicates if the interpreter is currently running.
    * @property isRunning
    * @type boolean
    * @readOnly
     */
    this.isRunning = false;

    /**
    * Indicates if the interpreter is currently waiting.
    * @property isWaiting
    * @type boolean
     */
    this.isWaiting = false;

    /**
    * Indicates if the interpreter is currently waiting until a message processed by another context like a Common Event
    * is finished.
    * FIXME: Conflict handling can be removed maybe. 
    * @property isWaitingForMessage
    * @type boolean
     */
    this.isWaitingForMessage = false;

    /**
    * Stores internal preview-info if the game runs currently in Live-Preview.
    * <ul>
    * <li>previewInfo.timeout - Timer ID if a timeout for live-preview was configured to exit the game loop after a certain amount of time.</li>
    * <li>previewInfo.waiting - Indicates if Live-Preview is currently waiting for the next user-action. (Selecting another command, etc.)</li>
    * <li>previewInfo.executedCommands - Counts the amount of executed commands since the last 
    * interpreter-pause(waiting, etc.). If its more than 500, the interpreter will automatically pause for 1 frame to 
    * avoid that Live-Preview freezes the Editor in case of endless loops.</li>
    * </ul>
    * @property previewInfo
    * @type boolean
    * @protected
     */
    this.previewInfo = new gs.LivePreviewInfo();

    /**
    * Stores Live-Preview related info passed from the VN Maker editor like the command-index the player clicked on, etc.
    * @property previewData
    * @type Object
    * @protected
     */
    this.previewData = null;

    /**
    * Indicates if the interpreter automatically repeats execution after the last command was executed.
    * @property repeat
    * @type boolean
     */
    this.repeat = false;

    /**
    * The execution context of the interpreter.
    * @property context
    * @type gs.InterpreterContext
    * @protected
     */
    this.context = new gs.InterpreterContext(0, null);

    /**
    * Sub-Interpreter from a Common Event Call. The interpreter will wait until the sub-interpreter is done and set back to
    * <b>null</b>.
    * @property subInterpreter
    * @type gs.Component_CommandInterpreter
    * @protected
     */
    this.subInterpreter = null;

    /**
    * Current indent-level of execution
    * @property indent
    * @type number
    * @protected
     */
    this.indent = 0;

    /**
    * Stores information about for what the interpreter is currently waiting for like for a ADV message, etc. to
    * restore probably when loaded from a save-game.
    * @property waitingFor
    * @type Object
    * @protected
     */
    this.waitingFor = {};

    /**
    * Stores interpreter related settings like how to handle messages, etc.
    * @property settings
    * @type Object
    * @protected
     */
    this.settings = {
      message: {
        byId: {},
        autoErase: true,
        waitAtEnd: true,
        backlog: true
      },
      screen: {
        pan: new gs.Point(0, 0)
      }
    };

    /**
    * Mapping table to quickly get the anchor point for the an inserted anchor-point constant such as
    * Top-Left(0), Top(1), Top-Right(2) and so on.
    * @property graphicAnchorPointsByConstant
    * @type gs.Point[]
    * @protected
     */
    this.graphicAnchorPointsByConstant = [new gs.Point(0.0, 0.0), new gs.Point(0.5, 0.0), new gs.Point(1.0, 0.0), new gs.Point(1.0, 0.5), new gs.Point(1.0, 1.0), new gs.Point(0.5, 1.0), new gs.Point(0.0, 1.0), new gs.Point(0.0, 0.5), new gs.Point(0.5, 0.5)];
  }

  Component_CommandInterpreter.prototype.onHotspotClick = function(e, data) {
    return this.executeAction(data.params.actions.onClick, false, data.bindValue);
  };

  Component_CommandInterpreter.prototype.onHotspotEnter = function(e, data) {
    return this.executeAction(data.params.actions.onEnter, true, data.bindValue);
  };

  Component_CommandInterpreter.prototype.onHotspotLeave = function(e, data) {
    return this.executeAction(data.params.actions.onLeave, false, data.bindValue);
  };

  Component_CommandInterpreter.prototype.onHotspotDragStart = function(e, data) {
    return this.executeAction(data.params.actions.onDrag, true, data.bindValue);
  };

  Component_CommandInterpreter.prototype.onHotspotDrag = function(e, data) {
    return this.executeAction(data.params.actions.onDrag, true, data.bindValue);
  };

  Component_CommandInterpreter.prototype.onHotspotDragEnd = function(e, data) {
    return this.executeAction(data.params.actions.onDrag, false, data.bindValue);
  };

  Component_CommandInterpreter.prototype.onHotspotStateChanged = function(e, params) {
    if (e.sender.behavior.selected) {
      return this.executeAction(params.actions.onSelect, true);
    } else {
      return this.executeAction(params.actions.onDeselect, false);
    }
  };


  /**
  * Called when a ADV message finished rendering and is now waiting
  * for the user/autom-message timer to proceed.
  *
  * @method onMessageADVWaiting
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onMessageADVWaiting = function(e) {
    var messageObject;
    messageObject = e.sender.object;
    if (!this.messageSettings().waitAtEnd) {
      if (e.data.params.waitForCompletion) {
        this.isWaiting = false;
      }
      messageObject.textRenderer.isWaiting = false;
      messageObject.textRenderer.isRunning = false;
    }
    messageObject.events.off("waiting", e.handler);
    if (this.messageSettings().backlog && (messageObject.settings.autoErase || messageObject.settings.paragraphSpacing > 0)) {
      return GameManager.backlog.push({
        character: messageObject.character,
        message: messageObject.behavior.message,
        choices: []
      });
    }
  };


  /**
  * Called when an ADV message finished fade-out.
  *
  * @method onMessageADVDisappear
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onMessageADVDisappear = function(messageObject, waitForCompletion) {
    SceneManager.scene.currentCharacter = {
      name: ""
    };
    messageObject.behavior.clear();
    messageObject.visible = false;
    if (waitForCompletion) {
      this.isWaiting = false;
    }
    return this.waitingFor.messageADV = null;
  };


  /**
  * Called when an ADV message finished clear.
  *
  * @method onMessageADVClear
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onMessageADVClear = function(messageObject, waitForCompletion) {
    messageObject = this.targetMessage();
    if (this.messageSettings().backlog) {
      GameManager.backlog.push({
        character: messageObject.character,
        message: messageObject.behavior.message,
        choices: []
      });
    }
    return this.onMessageADVDisappear(messageObject, waitForCompletion);
  };


  /**
  * Called when a hotspot/image-map sends a "jumpTo" event to let the
  * interpreter jump to the position defined in the event object.
  *
  * @method onJumpTo
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onJumpTo = function(e) {
    this.jumpToLabel(e.label);
    return this.isWaiting = false;
  };


  /**
  * Called when a hotspot/image-map sends a "callCommonEvent" event to let the
  * interpreter call the common event defined in the event object.
  *
  * @method onJumpTo
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onCallCommonEvent = function(e) {
    var ref;
    this.callCommonEvent(e.commonEventId, e.params || [], !e.finish);
    return this.isWaiting = (ref = e.waiting) != null ? ref : false;
  };


  /**
  * Called when a ADV message finishes. 
  *
  * @method onMessageNVLFinish
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onMessageADVFinish = function(e) {
    var commands, duration, fading, messageObject, pointer;
    messageObject = e.sender.object;
    if (!this.messageSettings().waitAtEnd) {
      return;
    }
    GameManager.globalData.messages[lcsm(e.data.params.message)] = {
      read: true
    };
    GameManager.saveGlobalData();
    if (e.data.params.waitForCompletion) {
      this.isWaiting = false;
    }
    this.waitingFor.messageADV = null;
    pointer = this.pointer;
    commands = this.object.commands;
    messageObject.events.off("finish", e.handler);
    if ((messageObject.voice != null) && GameManager.settings.skipVoiceOnAction) {
      AudioManager.stopSound(messageObject.voice.name);
    }
    if (!this.isMessageCommand(pointer, commands) && this.messageSettings().autoErase) {
      this.isWaiting = true;
      this.waitingFor.messageADV = e.data.params;
      fading = GameManager.tempSettings.messageFading;
      duration = GameManager.tempSettings.skip ? 0 : fading.duration;
      messageObject.waitForCompletion = e.data.params.waitForCompletion;
      return messageObject.animator.disappear(fading.animation, fading.easing, duration, gs.CallBack("onMessageADVDisappear", this, e.data.params.waitForCompletion));
    }
  };


  /**
  * Called when a common event finished execution.
  *
  * @method onCommonEventFinish
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onCommonEventFinish = function(e) {
    SceneManager.scene.commonEventContainer.removeObject(e.sender.object);
    e.sender.object.events.off("finish");
    this.subInterpreter = null;
    return this.isWaiting = false;
  };


  /**
  * Called when a scene call finished execution.
  *
  * @method onCallSceneFinish
  * @param {Object} sender - The sender of this event.
  * @protected
   */

  Component_CommandInterpreter.prototype.onCallSceneFinish = function(sender) {
    this.isWaiting = false;
    return this.subInterpreter = null;
  };


  /**
  * Serializes the interpreter into a data-bundle.
  *
  * @method toDataBundle
  * @return {Object} The data-bundle.
   */

  Component_CommandInterpreter.prototype.toDataBundle = function() {
    if (this.isInputDataCommand(Math.max(this.pointer - 1, 0), this.object.commands)) {
      return {
        pointer: Math.max(this.pointer - 1, 0),
        choice: this.choice,
        conditions: this.conditions,
        loops: this.loops,
        labels: this.labels,
        isWaiting: false,
        isRunning: this.isRunning,
        waitCounter: this.waitCounter,
        waitingFor: this.waitingFor,
        indent: this.indent,
        settings: this.settings
      };
    } else {
      return {
        pointer: this.pointer,
        choice: this.choice,
        conditions: this.conditions,
        loops: this.loops,
        labels: this.labels,
        isWaiting: this.isWaiting,
        isRunning: this.isRunning,
        waitCounter: this.waitCounter,
        waitingFor: this.waitingFor,
        indent: this.indent,
        settings: this.settings
      };
    }
  };


  /**
   * Previews the current scene at the specified pointer. This method is called from the
   * VN Maker Scene-Editor if live-preview is enabled and the user clicked on a command.
   *
   * @method preview
   */

  Component_CommandInterpreter.prototype.preview = function() {
    var ex, scene;
    try {
      if (!$PARAMS.preview || !$PARAMS.preview.scene) {
        return;
      }
      GameManager.tempFields.choices = [];
      GameManager.setupCursor();
      this.previewData = $PARAMS.preview;
      gs.GlobalEventManager.emit("previewRestart");
      if (this.previewInfo.timeout) {
        clearTimeout(this.previewInfo.timeout);
      }
      if (Graphics.stopped) {
        Graphics.stopped = false;
        Graphics.onEachFrame(gs.Main.frameCallback);
      }
      scene = new vn.Object_Scene();
      scene.sceneData.uid = this.previewData.scene.uid;
      return SceneManager.switchTo(scene);
    } catch (error) {
      ex = error;
      return console.warn(ex);
    }
  };


  /**
   * Sets up the interpreter.
   *
   * @method setup
   */

  Component_CommandInterpreter.prototype.setup = function() {
    this.previewData = $PARAMS.preview;
    if (this.previewData) {
      return gs.GlobalEventManager.on("mouseDown", ((function(_this) {
        return function() {
          if (_this.previewInfo.waiting) {
            if (_this.previewInfo.timeout) {
              clearTimeout(_this.previewInfo.timeout);
            }
            _this.previewInfo.waiting = false;
            GameManager.tempSettings.skip = false;
            _this.previewData = null;
            return gs.GlobalEventManager.emit("previewRestart");
          }
        };
      })(this)), null, this.object);
    }
  };


  /**
   * Disposes the interpreter.
   *
   * @method dispose
   */

  Component_CommandInterpreter.prototype.dispose = function() {
    if (this.previewData) {
      gs.GlobalEventManager.offByOwner("mouseDown", this.object);
    }
    return Component_CommandInterpreter.__super__.dispose.apply(this, arguments);
  };

  Component_CommandInterpreter.prototype.isInstantSkip = function() {
    return GameManager.tempSettings.skip && GameManager.tempSettings.skipTime === 0;
  };


  /**
  * Restores the interpreter from a data-bundle
  *
  * @method restore
  * @param {Object} bundle- The data-bundle.
   */

  Component_CommandInterpreter.prototype.restore = function() {};


  /**
  * Gets the game message for novel-mode.
  *
  * @method messageObjectNVL
  * @return {ui.Object_Message} The NVL game message object.
   */

  Component_CommandInterpreter.prototype.messageObjectNVL = function() {
    return gs.ObjectManager.current.objectById("gameMessageNVL_message");
  };


  /**
  * Gets the game message for adventure-mode.
  *
  * @method messageObjectADV
  * @return {ui.Object_Message} The ADV game message object.
   */

  Component_CommandInterpreter.prototype.messageObjectADV = function() {
    return gs.ObjectManager.current.objectById("gameMessage_message");
  };


  /**
  * Starts the interpreter
  *
  * @method start
   */

  Component_CommandInterpreter.prototype.start = function() {
    this.conditions = [];
    this.loops = [];
    this.indent = 0;
    this.pointer = 0;
    this.isRunning = true;
    return this.isWaiting = false;
  };


  /**
  * Stops the interpreter
  *
  * @method stop
   */

  Component_CommandInterpreter.prototype.stop = function() {
    return this.isRunning = false;
  };


  /**
  * Resumes the interpreter
  *
  * @method resume
   */

  Component_CommandInterpreter.prototype.resume = function() {
    return this.isRunning = true;
  };


  /**
  * Updates the interpreter and executes all commands until the next wait is 
  * triggered by a command. So in the case of an endless-loop the method will 
  * never return.
  *
  * @method update
   */

  Component_CommandInterpreter.prototype.update = function() {
    if (this.subInterpreter != null) {
      this.subInterpreter.update();
      return;
    }
    GameManager.variableStore.setupTempVariables(this.context);
    if (((this.object.commands == null) || this.pointer >= this.object.commands.length) && !this.isWaiting) {
      if (this.repeat) {
        this.start();
      } else if (this.isRunning) {
        this.isRunning = false;
        if (this.onFinish != null) {
          this.onFinish(this);
        }
        return;
      }
    }
    if (!this.isRunning) {
      return;
    }
    if (!this.object.commands.optimized) {
      DataOptimizer.optimizeEventCommands(this.object.commands);
    }
    if (this.waitCounter > 0) {
      this.waitCounter--;
      this.isWaiting = this.waitCounter > 0;
      return;
    }
    if (this.isWaitingForMessage) {
      this.isWaiting = true;
      if (!this.isProcessingMessageInOtherContext()) {
        this.isWaiting = false;
        this.isWaitingForMessage = false;
      } else {
        return;
      }
    }
    if (GameManager.inLivePreview) {
      while (!(this.isWaiting || this.previewInfo.waiting) && this.pointer < this.object.commands.length && this.isRunning) {
        this.executeCommand(this.pointer);
        this.previewInfo.executedCommands++;
        if (this.previewInfo.executedCommands > 500) {
          this.previewInfo.executedCommands = 0;
          this.isWaiting = true;
          this.waitCounter = 1;
        }
      }
    } else {
      while (!(this.isWaiting || this.previewInfo.waiting) && this.pointer < this.object.commands.length && this.isRunning) {
        this.executeCommand(this.pointer);
      }
    }
    if (this.pointer >= this.object.commands.length && !this.isWaiting) {
      if (this.repeat) {
        return this.start();
      } else if (this.isRunning) {
        this.isRunning = false;
        if (this.onFinish != null) {
          return this.onFinish(this);
        }
      }
    }
  };


  /**
  * Assigns the correct command-function to the specified command-object if 
  * necessary.
  *
  * @method assignCommand
   */

  Component_CommandInterpreter.prototype.assignCommand = function(command) {
    switch (command.id) {
      case "gs.Idle":
        return command.execute = this.commandIdle;
      case "gs.StartTimer":
        return command.execute = this.commandStartTimer;
      case "gs.PauseTimer":
        return command.execute = this.commandPauseTimer;
      case "gs.ResumeTimer":
        return command.execute = this.commandResumeTimer;
      case "gs.StopTimer":
        return command.execute = this.commandStopTimer;
      case "gs.WaitCommand":
        return command.execute = this.commandWait;
      case "gs.LoopCommand":
        return command.execute = this.commandLoop;
      case "gs.BreakLoopCommand":
        return command.execute = this.commandBreakLoop;
      case "gs.Comment":
        return command.execute = function() {
          return 0;
        };
      case "gs.EmptyCommand":
        return command.execute = function() {
          return 0;
        };
      case "gs.ListAdd":
        return command.execute = this.commandListAdd;
      case "gs.ListPop":
        return command.execute = this.commandListPop;
      case "gs.ListShift":
        return command.execute = this.commandListShift;
      case "gs.ListRemoveAt":
        return command.execute = this.commandListRemoveAt;
      case "gs.ListInsertAt":
        return command.execute = this.commandListInsertAt;
      case "gs.ListValueAt":
        return command.execute = this.commandListValueAt;
      case "gs.ListClear":
        return command.execute = this.commandListClear;
      case "gs.ListShuffle":
        return command.execute = this.commandListShuffle;
      case "gs.ListSort":
        return command.execute = this.commandListSort;
      case "gs.ListIndexOf":
        return command.execute = this.commandListIndexOf;
      case "gs.ListSet":
        return command.execute = this.commandListSet;
      case "gs.ListCopy":
        return command.execute = this.commandListCopy;
      case "gs.ListLength":
        return command.execute = this.commandListLength;
      case "gs.ListJoin":
        return command.execute = this.commandListJoin;
      case "gs.ListFromText":
        return command.execute = this.commandListFromText;
      case "gs.ResetVariables":
        return command.execute = this.commandResetVariables;
      case "gs.ChangeVariableDomain":
        return command.execute = this.commandChangeVariableDomain;
      case "gs.ChangeNumberVariables":
        return command.execute = this.commandChangeNumberVariables;
      case "gs.ChangeDecimalVariables":
        return command.execute = this.commandChangeDecimalVariables;
      case "gs.ChangeBooleanVariables":
        return command.execute = this.commandChangeBooleanVariables;
      case "gs.ChangeStringVariables":
        return command.execute = this.commandChangeStringVariables;
      case "gs.CheckSwitch":
        return command.execute = this.commandCheckSwitch;
      case "gs.CheckNumberVariable":
        return command.execute = this.commandCheckNumberVariable;
      case "gs.CheckTextVariable":
        return command.execute = this.commandCheckTextVariable;
      case "gs.Condition":
        return command.execute = this.commandCondition;
      case "gs.ConditionElse":
        return command.execute = this.commandConditionElse;
      case "gs.ConditionElseIf":
        return command.execute = this.commandConditionElseIf;
      case "gs.Label":
        return command.execute = this.commandLabel;
      case "gs.JumpToLabel":
        return command.execute = this.commandJumpToLabel;
      case "gs.SetMessageArea":
        return command.execute = this.commandSetMessageArea;
      case "gs.ShowMessage":
        return command.execute = this.commandShowMessage;
      case "gs.ShowPartialMessage":
        return command.execute = this.commandShowPartialMessage;
      case "gs.MessageFading":
        return command.execute = this.commandMessageFading;
      case "gs.MessageSettings":
        return command.execute = this.commandMessageSettings;
      case "gs.CreateMessageArea":
        return command.execute = this.commandCreateMessageArea;
      case "gs.EraseMessageArea":
        return command.execute = this.commandEraseMessageArea;
      case "gs.SetTargetMessage":
        return command.execute = this.commandSetTargetMessage;
      case "vn.MessageBoxDefaults":
        return command.execute = this.commandMessageBoxDefaults;
      case "vn.MessageBoxVisibility":
        return command.execute = this.commandMessageBoxVisibility;
      case "vn.MessageVisibility":
        return command.execute = this.commandMessageVisibility;
      case "vn.BacklogVisibility":
        return command.execute = this.commandBacklogVisibility;
      case "vn.ShowMessageNVL":
        return command.execute = this.commandShowMessageNVL;
      case "gs.ClearMessage":
        return command.execute = this.commandClearMessage;
      case "vn.ClosePageNVL":
        return command.execute = this.commandClosePageNVL;
      case "gs.ChangeWeather":
        return command.execute = this.commandChangeWeather;
      case "gs.FreezeScreen":
        return command.execute = this.commandFreezeScreen;
      case "gs.ScreenTransition":
        return command.execute = this.commandScreenTransition;
      case "gs.ShakeScreen":
        return command.execute = this.commandShakeScreen;
      case "gs.TintScreen":
        return command.execute = this.commandTintScreen;
      case "gs.FlashScreen":
        return command.execute = this.commandFlashScreen;
      case "gs.ZoomScreen":
        return command.execute = this.commandZoomScreen;
      case "gs.RotateScreen":
        return command.execute = this.commandRotateScreen;
      case "gs.PanScreen":
        return command.execute = this.commandPanScreen;
      case "gs.ScreenEffect":
        return command.execute = this.commandScreenEffect;
      case "gs.ShowVideo":
        return command.execute = this.commandShowVideo;
      case "gs.MoveVideo":
        return command.execute = this.commandMoveVideo;
      case "gs.MoveVideoPath":
        return command.execute = this.commandMoveVideoPath;
      case "gs.TintVideo":
        return command.execute = this.commandTintVideo;
      case "gs.FlashVideo":
        return command.execute = this.commandFlashVideo;
      case "gs.CropVideo":
        return command.execute = this.commandCropVideo;
      case "gs.RotateVideo":
        return command.execute = this.commandRotateVideo;
      case "gs.ZoomVideo":
        return command.execute = this.commandZoomVideo;
      case "gs.BlendVideo":
        return command.execute = this.commandBlendVideo;
      case "gs.MaskVideo":
        return command.execute = this.commandMaskVideo;
      case "gs.VideoEffect":
        return command.execute = this.commandVideoEffect;
      case "gs.VideoMotionBlur":
        return command.execute = this.commandVideoMotionBlur;
      case "gs.VideoDefaults":
        return command.execute = this.commandVideoDefaults;
      case "gs.EraseVideo":
        return command.execute = this.commandEraseVideo;
      case "gs.ShowImageMap":
        return command.execute = this.commandShowImageMap;
      case "gs.EraseImageMap":
        return command.execute = this.commandEraseImageMap;
      case "gs.AddHotspot":
        return command.execute = this.commandAddHotspot;
      case "gs.EraseHotspot":
        return command.execute = this.commandEraseHotspot;
      case "gs.ChangeHotspotState":
        return command.execute = this.commandChangeHotspotState;
      case "gs.ShowPicture":
        return command.execute = this.commandShowPicture;
      case "gs.MovePicture":
        return command.execute = this.commandMovePicture;
      case "gs.MovePicturePath":
        return command.execute = this.commandMovePicturePath;
      case "gs.TintPicture":
        return command.execute = this.commandTintPicture;
      case "gs.FlashPicture":
        return command.execute = this.commandFlashPicture;
      case "gs.CropPicture":
        return command.execute = this.commandCropPicture;
      case "gs.RotatePicture":
        return command.execute = this.commandRotatePicture;
      case "gs.ZoomPicture":
        return command.execute = this.commandZoomPicture;
      case "gs.BlendPicture":
        return command.execute = this.commandBlendPicture;
      case "gs.ShakePicture":
        return command.execute = this.commandShakePicture;
      case "gs.MaskPicture":
        return command.execute = this.commandMaskPicture;
      case "gs.PictureEffect":
        return command.execute = this.commandPictureEffect;
      case "gs.PictureMotionBlur":
        return command.execute = this.commandPictureMotionBlur;
      case "gs.PictureDefaults":
        return command.execute = this.commandPictureDefaults;
      case "gs.PlayPictureAnimation":
        return command.execute = this.commandPlayPictureAnimation;
      case "gs.ErasePicture":
        return command.execute = this.commandErasePicture;
      case "gs.InputNumber":
        return command.execute = this.commandInputNumber;
      case "vn.Choice":
        return command.execute = this.commandShowChoice;
      case "vn.ChoiceTimer":
        return command.execute = this.commandChoiceTimer;
      case "vn.ShowChoices":
        return command.execute = this.commandShowChoices;
      case "vn.UnlockCG":
        return command.execute = this.commandUnlockCG;
      case "vn.L2DJoinScene":
        return command.execute = this.commandL2DJoinScene;
      case "vn.L2DExitScene":
        return command.execute = this.commandL2DExitScene;
      case "vn.L2DMotion":
        return command.execute = this.commandL2DMotion;
      case "vn.L2DMotionGroup":
        return command.execute = this.commandL2DMotionGroup;
      case "vn.L2DExpression":
        return command.execute = this.commandL2DExpression;
      case "vn.L2DMove":
        return command.execute = this.commandL2DMove;
      case "vn.L2DParameter":
        return command.execute = this.commandL2DParameter;
      case "vn.L2DSettings":
        return command.execute = this.commandL2DSettings;
      case "vn.L2DDefaults":
        return command.execute = this.commandL2DDefaults;
      case "vn.CharacterJoinScene":
        return command.execute = this.commandCharacterJoinScene;
      case "vn.CharacterExitScene":
        return command.execute = this.commandCharacterExitScene;
      case "vn.CharacterChangeExpression":
        return command.execute = this.commandCharacterChangeExpression;
      case "vn.CharacterSetParameter":
        return command.execute = this.commandCharacterSetParameter;
      case "vn.CharacterGetParameter":
        return command.execute = this.commandCharacterGetParameter;
      case "vn.CharacterDefaults":
        return command.execute = this.commandCharacterDefaults;
      case "vn.CharacterEffect":
        return command.execute = this.commandCharacterEffect;
      case "vn.ZoomCharacter":
        return command.execute = this.commandZoomCharacter;
      case "vn.RotateCharacter":
        return command.execute = this.commandRotateCharacter;
      case "vn.BlendCharacter":
        return command.execute = this.commandBlendCharacter;
      case "vn.ShakeCharacter":
        return command.execute = this.commandShakeCharacter;
      case "vn.MaskCharacter":
        return command.execute = this.commandMaskCharacter;
      case "vn.MoveCharacter":
        return command.execute = this.commandMoveCharacter;
      case "vn.MoveCharacterPath":
        return command.execute = this.commandMoveCharacterPath;
      case "vn.FlashCharacter":
        return command.execute = this.commandFlashCharacter;
      case "vn.TintCharacter":
        return command.execute = this.commandTintCharacter;
      case "vn.CharacterMotionBlur":
        return command.execute = this.commandCharacterMotionBlur;
      case "vn.ChangeBackground":
        return command.execute = this.commandChangeBackground;
      case "vn.ShakeBackground":
        return command.execute = this.commandShakeBackground;
      case "vn.ScrollBackground":
        return command.execute = this.commandScrollBackground;
      case "vn.ScrollBackgroundTo":
        return command.execute = this.commandScrollBackgroundTo;
      case "vn.ScrollBackgroundPath":
        return command.execute = this.commandScrollBackgroundPath;
      case "vn.ZoomBackground":
        return command.execute = this.commandZoomBackground;
      case "vn.RotateBackground":
        return command.execute = this.commandRotateBackground;
      case "vn.TintBackground":
        return command.execute = this.commandTintBackground;
      case "vn.BlendBackground":
        return command.execute = this.commandBlendBackground;
      case "vn.MaskBackground":
        return command.execute = this.commandMaskBackground;
      case "vn.BackgroundMotionBlur":
        return command.execute = this.commandBackgroundMotionBlur;
      case "vn.BackgroundEffect":
        return command.execute = this.commandBackgroundEffect;
      case "vn.BackgroundDefaults":
        return command.execute = this.commandBackgroundDefaults;
      case "vn.ChangeScene":
        return command.execute = this.commandChangeScene;
      case "vn.ReturnToPreviousScene":
        return command.execute = this.commandReturnToPreviousScene;
      case "vn.CallScene":
        return command.execute = this.commandCallScene;
      case "vn.SwitchToLayout":
        return command.execute = this.commandSwitchToLayout;
      case "gs.ChangeTransition":
        return command.execute = this.commandChangeTransition;
      case "gs.ChangeWindowSkin":
        return command.execute = this.commandChangeWindowSkin;
      case "gs.ChangeScreenTransitions":
        return command.execute = this.commandChangeScreenTransitions;
      case "vn.UIAccess":
        return command.execute = this.commandUIAccess;
      case "gs.PlayVideo":
        return command.execute = this.commandPlayVideo;
      case "gs.PlayMusic":
        return command.execute = this.commandPlayMusic;
      case "gs.StopMusic":
        return command.execute = this.commandStopMusic;
      case "gs.PlaySound":
        return command.execute = this.commandPlaySound;
      case "gs.StopSound":
        return command.execute = this.commandStopSound;
      case "gs.PauseMusic":
        return command.execute = this.commandPauseMusic;
      case "gs.ResumeMusic":
        return command.execute = this.commandResumeMusic;
      case "gs.AudioDefaults":
        return command.execute = this.commandAudioDefaults;
      case "gs.EndCommonEvent":
        return command.execute = this.commandEndCommonEvent;
      case "gs.ResumeCommonEvent":
        return command.execute = this.commandResumeCommonEvent;
      case "gs.CallCommonEvent":
        return command.execute = this.commandCallCommonEvent;
      case "gs.ChangeTimer":
        return command.execute = this.commandChangeTimer;
      case "gs.ShowText":
        return command.execute = this.commandShowText;
      case "gs.RefreshText":
        return command.execute = this.commandRefreshText;
      case "gs.TextMotionBlur":
        return command.execute = this.commandTextMotionBlur;
      case "gs.MoveText":
        return command.execute = this.commandMoveText;
      case "gs.MoveTextPath":
        return command.execute = this.commandMoveTextPath;
      case "gs.RotateText":
        return command.execute = this.commandRotateText;
      case "gs.ZoomText":
        return command.execute = this.commandZoomText;
      case "gs.BlendText":
        return command.execute = this.commandBlendText;
      case "gs.ColorText":
        return command.execute = this.commandColorText;
      case "gs.EraseText":
        return command.execute = this.commandEraseText;
      case "gs.TextEffect":
        return command.execute = this.commandTextEffect;
      case "gs.TextDefaults":
        return command.execute = this.commandTextDefaults;
      case "gs.ChangeTextSettings":
        return command.execute = this.commandChangeTextSettings;
      case "gs.InputText":
        return command.execute = this.commandInputText;
      case "gs.InputName":
        return command.execute = this.commandInputName;
      case "gs.SavePersistentData":
        return command.execute = this.commandSavePersistentData;
      case "gs.SaveSettings":
        return command.execute = this.commandSaveSettings;
      case "gs.PrepareSaveGame":
        return command.execute = this.commandPrepareSaveGame;
      case "gs.SaveGame":
        return command.execute = this.commandSaveGame;
      case "gs.LoadGame":
        return command.execute = this.commandLoadGame;
      case "gs.GetInputData":
        return command.execute = this.commandGetInputData;
      case "gs.WaitForInput":
        return command.execute = this.commandWaitForInput;
      case "gs.ChangeObjectDomain":
        return command.execute = this.commandChangeObjectDomain;
      case "vn.GetGameData":
        return command.execute = this.commandGetGameData;
      case "vn.SetGameData":
        return command.execute = this.commandSetGameData;
      case "vn.GetObjectData":
        return command.execute = this.commandGetObjectData;
      case "vn.SetObjectData":
        return command.execute = this.commandSetObjectData;
      case "vn.ChangeSounds":
        return command.execute = this.commandChangeSounds;
      case "vn.ChangeColors":
        return command.execute = this.commandChangeColors;
      case "gs.ChangeScreenCursor":
        return command.execute = this.commandChangeScreenCursor;
      case "gs.ResetGlobalData":
        return command.execute = this.commandResetGlobalData;
      case "gs.Script":
        return command.execute = this.commandScript;
    }
  };


  /**
  * Executes the command at the specified index and increases the command-pointer.
  *
  * @method executeCommand
   */

  Component_CommandInterpreter.prototype.executeCommand = function(index) {
    var indent;
    this.command = this.object.commands[index];
    if (this.previewData) {
      if (this.pointer < this.previewData.pointer) {
        GameManager.tempSettings.skip = true;
        GameManager.tempSettings.skipTime = 0;
      } else {
        GameManager.tempSettings.skip = this.previewData.settings.animationDisabled;
        GameManager.tempSettings.skipTime = 0;
        this.previewInfo.waiting = true;
        gs.GlobalEventManager.emit("previewWaiting");
        if (this.previewData.settings.animationDisabled || this.previewData.settings.animationTime > 0) {
          this.previewInfo.timeout = setTimeout((function() {
            return Graphics.stopped = true;
          }), this.previewData.settings.animationTime * 1000);
        }
      }
    }
    if (this.command.execute != null) {
      this.command.interpreter = this;
      if (this.command.indent === this.indent) {
        this.command.execute();
      }
      this.pointer++;
      this.command = this.object.commands[this.pointer];
      if (this.command != null) {
        indent = this.command.indent;
      } else {
        indent = this.indent;
        while (indent > 0 && (this.loops[indent] == null)) {
          indent--;
        }
      }
      if (indent < this.indent) {
        this.indent = indent;
        if (this.loops[this.indent] != null) {
          this.pointer = this.loops[this.indent];
          this.command = this.object.commands[this.pointer];
          return this.command.interpreter = this;
        }
      }
    } else {
      this.assignCommand(this.command);
      if (this.command.execute != null) {
        this.command.interpreter = this;
        if (this.command.indent === this.indent) {
          this.command.execute();
        }
        this.pointer++;
        this.command = this.object.commands[this.pointer];
        if (this.command != null) {
          indent = this.command.indent;
        } else {
          indent = this.indent;
          while (indent > 0 && (this.loops[indent] == null)) {
            indent--;
          }
        }
        if (indent < this.indent) {
          this.indent = indent;
          if (this.loops[this.indent] != null) {
            this.pointer = this.loops[this.indent];
            this.command = this.object.commands[this.pointer];
            return this.command.interpreter = this;
          }
        }
      } else {
        return this.pointer++;
      }
    }
  };


  /**
  * Skips all commands until a command with the specified indent-level is 
  * found. So for example: To jump from a Condition-Command to the next
  * Else-Command just pass the indent-level of the Condition/Else command.
  *
  * @method skip
  * @param {number} indent - The indent-level.
  * @param {boolean} backward - If true the skip runs backward.
   */

  Component_CommandInterpreter.prototype.skip = function(indent, backward) {
    var results, results1;
    if (backward) {
      this.pointer--;
      results = [];
      while (this.pointer > 0 && this.object.commands[this.pointer].indent !== indent) {
        results.push(this.pointer--);
      }
      return results;
    } else {
      this.pointer++;
      results1 = [];
      while (this.pointer < this.object.commands.length && this.object.commands[this.pointer].indent !== indent) {
        results1.push(this.pointer++);
      }
      return results1;
    }
  };


  /**
  * Halts the interpreter for the specified amount of time. An optionally
  * callback function can be passed which is called when the time is up.
  *
  * @method wait
  * @param {number} time - The time to wait
  * @param {gs.Callback} callback - Called if the wait time is up.
   */

  Component_CommandInterpreter.prototype.wait = function(time, callback) {
    this.isWaiting = true;
    this.waitCounter = time;
    return this.waitCallback = callback;
  };


  /**
  * Checks if the command at the specified pointer-index is a game message
  * related command.
  *
  * @method isMessageCommand
  * @param {number} pointer - The pointer/index.
  * @param {Object[]} commands - The list of commands to check.
  * @return {boolean} <b>true</b> if its a game message related command. Otherwise <b>false</b>.
   */

  Component_CommandInterpreter.prototype.isMessageCommand = function(pointer, commands) {
    var result;
    result = true;
    if (pointer >= commands.length || (commands[pointer].id !== "gs.InputNumber" && commands[pointer].id !== "vn.Choice" && commands[pointer].id !== "gs.InputText" && commands[pointer].id !== "gs.InputName")) {
      result = false;
    }
    return result;
  };


  /**
  * Checks if the command at the specified pointer-index asks for user-input like
  * the Input Number or Input Text command.
  *
  * @method isInputDataCommand
  * @param {number} pointer - The pointer/index.
  * @param {Object[]} commands - The list of commands to check.
  * @return {boolean} <b>true</b> if its an input-data command. Otherwise <b>false</b>
   */

  Component_CommandInterpreter.prototype.isInputDataCommand = function(pointer, commands) {
    return pointer < commands.length && (commands[pointer].id === "gs.InputNumber" || commands[pointer].id === "gs.InputText" || commands[pointer].id === "vn.Choice" || commands[pointer].id === "vn.ShowChoices");
  };


  /**
  * Checks if a game message is currently running by another interpreter like a
  * common-event interpreter.
  *
  * @method isProcessingMessageInOtherContext
  * @return {boolean} <b>true</b> a game message is running in another context. Otherwise <b>false</b>
   */

  Component_CommandInterpreter.prototype.isProcessingMessageInOtherContext = function() {
    var gm, result, s;
    result = false;
    gm = GameManager;
    s = SceneManager.scene;
    result = ((s.inputNumberWindow != null) && s.inputNumberWindow.visible && s.inputNumberWindow.executionContext !== this.context) || ((s.inputTextWindow != null) && s.inputTextWindow.active && s.inputTextWindow.executionContext !== this.context);
    return result;
  };


  /**
  * If a game message is currently running by an other interpreter like a common-event
  * interpreter, this method trigger a wait until the other interpreter is finished
  * with the game message.
  *
  * @method waitForMessage
  * @return {boolean} <b>true</b> a game message is running in another context. Otherwise <b>false</b>
   */

  Component_CommandInterpreter.prototype.waitForMessage = function() {
    this.isWaitingForMessage = true;
    this.isWaiting = true;
    return this.pointer--;
  };


  /**
  * Gets the value the number variable at the specified index.
  *
  * @method numberValueAtIndex
  * @param {number} scope - The variable's scope.
  * @param {number} index - The index of the variable to get the value from.
  * @return {Number} The value of the variable.
   */

  Component_CommandInterpreter.prototype.numberValueAtIndex = function(scope, index) {
    return GameManager.variableStore.numberValueAtIndex(scope, index);
  };


  /**
  * Gets the value of a (possible) number variable. If a constant number value is specified, this method
  * does nothing an just returns that constant value. That's to make it more comfortable to just pass a value which
  * can be calculated by variable but also be just a constant value.
  *
  * @method numberValueOf
  * @param {number|Object} object - A number variable or constant number value.
  * @return {Number} The value of the variable.
   */

  Component_CommandInterpreter.prototype.numberValueOf = function(object) {
    return GameManager.variableStore.numberValueOf(object);
  };


  /**
  * It does the same like <b>numberValueOf</b> with one difference: If the specified object
  * is a variable, it's value is considered as a duration-value in milliseconds and automatically converted
  * into frames.
  *
  * @method durationValueOf
  * @param {number|Object} object - A number variable or constant number value.
  * @return {Number} The value of the variable.
   */

  Component_CommandInterpreter.prototype.durationValueOf = function(object) {
    if (object && (object.index != null)) {
      return Math.round(GameManager.variableStore.numberValueOf(object) / 1000 * Graphics.frameRate);
    } else {
      return Math.round(GameManager.variableStore.numberValueOf(object));
    }
  };


  /**
  * Gets a position ({x, y}) for the specified predefined object position configured in 
  * Database - System.
  *
  * @method predefinedObjectPosition
  * @param {number} position - The index/ID of the predefined object position to set.
  * @param {gs.Object_Base} object - The game object to set the position for.
  * @param {Object} params - The params object of the scene command.
  * @return {Object} The position {x, y}.
   */

  Component_CommandInterpreter.prototype.predefinedObjectPosition = function(position, object, params) {
    var f, objectPosition;
    objectPosition = RecordManager.system.objectPositions[position];
    if (!objectPosition) {
      return {
        x: 0,
        y: 0
      };
    }
    if (objectPosition.func == null) {
      f = eval("(function(object, params){" + objectPosition.script + "})");
      objectPosition.func = f;
    }
    return objectPosition.func(object, params) || {
      x: 0,
      y: 0
    };
  };


  /**
  * Sets the value of a number variable at the specified index.
  *
  * @method setNumberValueAtIndex
  * @param {number} scope - The variable's scope.
  * @param {number} index - The index of the variable to set.
  * @param {number} value - The number value to set the variable to.
   */

  Component_CommandInterpreter.prototype.setNumberValueAtIndex = function(scope, index, value, domain) {
    return GameManager.variableStore.setNumberValueAtIndex(scope, index, value, domain);
  };


  /**
  * Sets the value of a number variable.
  *
  * @method setNumberValueTo
  * @param {number} variable - The variable to set.
  * @param {number} value - The number value to set the variable to.
   */

  Component_CommandInterpreter.prototype.setNumberValueTo = function(variable, value) {
    return GameManager.variableStore.setNumberValueTo(variable, value);
  };


  /**
  * Sets the value of a list variable.
  *
  * @method setListObjectTo
  * @param {Object} variable - The variable to set.
  * @param {Object} value - The list object to set the variable to.
   */

  Component_CommandInterpreter.prototype.setListObjectTo = function(variable, value) {
    return GameManager.variableStore.setListObjectTo(variable, value);
  };


  /**
  * Sets the value of a boolean/switch variable.
  *
  * @method setBooleanValueTo
  * @param {Object} variable - The variable to set.
  * @param {boolean} value - The boolean value to set the variable to.
   */

  Component_CommandInterpreter.prototype.setBooleanValueTo = function(variable, value) {
    return GameManager.variableStore.setBooleanValueTo(variable, value);
  };


  /**
  * Sets the value of a number variable at the specified index.
  *
  * @method setBooleanValueAtIndex
  * @param {number} scope - The variable's scope.
  * @param {number} index - The index of the variable to set.
  * @param {boolean} value - The boolean value to set the variable to.
   */

  Component_CommandInterpreter.prototype.setBooleanValueAtIndex = function(scope, index, value, domain) {
    return GameManager.variableStore.setBooleanValueAtIndex(scope, index, value, domain);
  };


  /**
  * Sets the value of a string/text variable.
  *
  * @method setStringValueTo
  * @param {Object} variable - The variable to set.
  * @param {string} value - The string/text value to set the variable to.
   */

  Component_CommandInterpreter.prototype.setStringValueTo = function(variable, value) {
    return GameManager.variableStore.setStringValueTo(variable, value);
  };


  /**
  * Sets the value of the string variable at the specified index.
  *
  * @method setStringValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @param {string} value - The value to set.
   */

  Component_CommandInterpreter.prototype.setStringValueAtIndex = function(scope, index, value, domain) {
    return GameManager.variableStore.setStringValueAtIndex(scope, index, value, domain);
  };


  /**
  * Gets the value of a (possible) string variable. If a constant string value is specified, this method
  * does nothing an just returns that constant value. That's to make it more comfortable to just pass a value which
  * can be calculated by variable but also be just a constant value.
  *
  * @method stringValueOf
  * @param {string|Object} object - A string variable or constant string value.
  * @return {string} The value of the variable.
   */

  Component_CommandInterpreter.prototype.stringValueOf = function(object) {
    return GameManager.variableStore.stringValueOf(object);
  };


  /**
  * Gets the value of the string variable at the specified index.
  *
  * @method stringValueAtIndex
  * @param {number} scope - The variable's scope.
  * @param {number} index - The index of the variable to get the value from.
  * @return {string} The value of the variable.
   */

  Component_CommandInterpreter.prototype.stringValueAtIndex = function(scope, index, domain) {
    return GameManager.variableStore.stringValueAtIndex(scope, index, domain);
  };


  /**
  * Gets the value of a (possible) boolean variable. If a constant boolean value is specified, this method
  * does nothing an just returns that constant value. That's to make it more comfortable to just pass a value which
  * can be calculated by variable but also be just a constant value.
  *
  * @method booleanValueOf
  * @param {boolean|Object} object - A boolean variable or constant boolean value.
  * @return {boolean} The value of the variable.
   */

  Component_CommandInterpreter.prototype.booleanValueOf = function(object) {
    return GameManager.variableStore.booleanValueOf(object);
  };


  /**
  * Gets the value of the boolean variable at the specified index.
  *
  * @method booleanValueAtIndex
  * @param {number} scope - The variable's scope.
  * @param {number} index - The index of the variable to get the value from.
  * @return {string} The value of the variable.
   */

  Component_CommandInterpreter.prototype.booleanValueAtIndex = function(scope, index, domain) {
    return GameManager.variableStore.booleanValueAtIndex(scope, index, domain);
  };


  /**
  * Gets the value of a (possible) list variable.
  *
  * @method listObjectOf
  * @param {Object} object - A list variable.
  * @return {Object} The value of the list variable.
   */

  Component_CommandInterpreter.prototype.listObjectOf = function(object) {
    return GameManager.variableStore.listObjectOf(object);
  };


  /**
  * Compares two object using the specified operation and returns the result.
  *
  * @method compare
  * @param {Object} a - Object A.
  * @param {Object} b - Object B.
  * @param {number} operation - The compare-operation to compare Object A with Object B.
  * <ul>
  * <li>0 = Equal To</li>
  * <li>1 = Not Equal To</li>
  * <li>2 = Greater Than</li>
  * <li>3 = Greater or Equal To</li>
  * <li>4 = Less Than</li>
  * <li>5 = Less or Equal To</li>
  * </ul>
  * @return {boolean} The comparison result.
   */

  Component_CommandInterpreter.prototype.compare = function(a, b, operation) {
    switch (operation) {
      case 0:
        return a == b;
      case 1:
        return a != b;
      case 2:
        return a > b;
      case 3:
        return a >= b;
      case 4:
        return a < b;
      case 5:
        return a <= b;
    }
  };


  /**
  * Changes number variables and allows decimal values such as 0.5 too.
  *
  * @method changeDecimalVariables
  * @param {Object} params - Input params from the command
  * @param {Object} roundMethod - The result of the operation will be rounded using the specified method.
  * <ul>
  * <li>0 = None. The result will not be rounded.</li>
  * <li>1 = Commercially</li>
  * <li>2 = Round Up</li>
  * <li>3 = Round Down</li>
  * </ul>
   */

  Component_CommandInterpreter.prototype.changeDecimalVariables = function(params, roundMethod) {
    var diff, end, i, index, k, ref, ref1, roundFunc, scope, source, start;
    source = 0;
    roundFunc = null;
    switch (roundMethod) {
      case 0:
        roundFunc = function(value) {
          return value;
        };
        break;
      case 1:
        roundFunc = function(value) {
          return Math.round(value);
        };
        break;
      case 2:
        roundFunc = function(value) {
          return Math.ceil(value);
        };
        break;
      case 3:
        roundFunc = function(value) {
          return Math.floor(value);
        };
    }
    switch (params.source) {
      case 0:
        source = this.numberValueOf(params.sourceValue);
        break;
      case 1:
        start = this.numberValueOf(params.sourceRandom.start);
        end = this.numberValueOf(params.sourceRandom.end);
        diff = end - start;
        source = Math.floor(start + Math.random() * (diff + 1));
        break;
      case 2:
        source = this.numberValueAtIndex(params.sourceScope, this.numberValueOf(params.sourceReference) - 1, params.sourceReferenceDomain);
        break;
      case 3:
        source = this.numberValueOfGameData(params.sourceValue1);
        break;
      case 4:
        source = this.numberValueOfDatabaseData(params.sourceValue1);
    }
    switch (params.target) {
      case 0:
        switch (params.operation) {
          case 0:
            this.setNumberValueTo(params.targetVariable, roundFunc(source));
            break;
          case 1:
            this.setNumberValueTo(params.targetVariable, roundFunc(this.numberValueOf(params.targetVariable) + source));
            break;
          case 2:
            this.setNumberValueTo(params.targetVariable, roundFunc(this.numberValueOf(params.targetVariable) - source));
            break;
          case 3:
            this.setNumberValueTo(params.targetVariable, roundFunc(this.numberValueOf(params.targetVariable) * source));
            break;
          case 4:
            this.setNumberValueTo(params.targetVariable, roundFunc(this.numberValueOf(params.targetVariable) / source));
            break;
          case 5:
            this.setNumberValueTo(params.targetVariable, this.numberValueOf(params.targetVariable) % source);
        }
        break;
      case 1:
        scope = params.targetScope;
        start = params.targetRange.start - 1;
        end = params.targetRange.end - 1;
        for (i = k = ref = start, ref1 = end; ref <= ref1 ? k <= ref1 : k >= ref1; i = ref <= ref1 ? ++k : --k) {
          switch (params.operation) {
            case 0:
              this.setNumberValueAtIndex(scope, i, roundFunc(source));
              break;
            case 1:
              this.setNumberValueAtIndex(scope, i, roundFunc(this.numberValueAtIndex(scope, i) + source));
              break;
            case 2:
              this.setNumberValueAtIndex(scope, i, roundFunc(this.numberValueAtIndex(scope, i) - source));
              break;
            case 3:
              this.setNumberValueAtIndex(scope, i, roundFunc(this.numberValueAtIndex(scope, i) * source));
              break;
            case 4:
              this.setNumberValueAtIndex(scope, i, roundFunc(this.numberValueAtIndex(scope, i) / source));
              break;
            case 5:
              this.setNumberValueAtIndex(scope, i, this.numberValueAtIndex(scope, i) % source);
          }
        }
        break;
      case 2:
        index = this.numberValueOf(params.targetReference) - 1;
        switch (params.operation) {
          case 0:
            this.setNumberValueAtIndex(params.targetScope, index, roundFunc(source), params.targetReferenceDomain);
            break;
          case 1:
            this.setNumberValueAtIndex(params.targetScope, index, roundFunc(this.numberValueAtIndex(params.targetScope, index, params.targetReferenceDomain) + source), params.targetReferenceDomain);
            break;
          case 2:
            this.setNumberValueAtIndex(params.targetScope, index, roundFunc(this.numberValueAtIndex(params.targetScope, index, params.targetReferenceDomain) - source), params.targetReferenceDomain);
            break;
          case 3:
            this.setNumberValueAtIndex(params.targetScope, index, roundFunc(this.numberValueAtIndex(params.targetScope, index, params.targetReferenceDomain) * source), params.targetReferenceDomain);
            break;
          case 4:
            this.setNumberValueAtIndex(params.targetScope, index, roundFunc(this.numberValueAtIndex(params.targetScope, index, params.targetReferenceDomain) / source), params.targetReferenceDomain);
            break;
          case 5:
            this.setNumberValueAtIndex(params.targetScope, index, this.numberValueAtIndex(params.targetScope, index, params.targetReferenceDomain) % source, params.targetReferenceDomain);
        }
    }
    return null;
  };


  /**
  * Shakes a game object.
  *
  * @method shakeObject
  * @param {gs.Object_Base} object - The game object to shake.
  * @return {Object} A params object containing additional info about the shake-animation.
   */

  Component_CommandInterpreter.prototype.shakeObject = function(object, params) {
    var duration, easing;
    duration = Math.max(Math.round(this.durationValueOf(params.duration)), 2);
    easing = gs.Easings.fromObject(params.easing);
    object.animator.shake({
      x: this.numberValueOf(params.range.x),
      y: this.numberValueOf(params.range.y)
    }, this.numberValueOf(params.speed) / 100, duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Lets the interpreter wait for the completion of a running operation like an animation, etc.
  *
  * @method waitForCompletion
  * @param {gs.Object_Base} object - The game object the operation is executed on. Can be <b>null</b>.
  * @return {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.waitForCompletion = function(object, params) {
    var duration;
    duration = this.durationValueOf(params.duration);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Erases a game object.
  *
  * @method eraseObject
  * @param {gs.Object_Base} object - The game object to erase.
  * @return {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.eraseObject = function(object, params) {
    var duration, easing;
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.disappear(params.animation, easing, duration, (function(_this) {
      return function(sender) {
        return sender.dispose();
      };
    })(this));
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Shows a game object on screen.
  *
  * @method showObject
  * @param {gs.Object_Base} object - The game object to show.
  * @param {gs.Point} position - The position where the game object should be shown.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.showObject = function(object, position, params) {
    var duration, easing, x, y;
    x = this.numberValueOf(position.x);
    y = this.numberValueOf(position.y);
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.appear(x, y, params.animation, easing, duration);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Moves a game object.
  *
  * @method moveObject
  * @param {gs.Object_Base} object - The game object to move.
  * @param {gs.Point} position - The position to move the game object to.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.moveObject = function(object, position, params) {
    var duration, easing, p, x, y;
    if (params.positionType === 0) {
      p = this.predefinedObjectPosition(params.predefinedPositionId, object, params);
      x = p.x;
      y = p.y;
    } else {
      x = this.numberValueOf(position.x);
      y = this.numberValueOf(position.y);
    }
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.moveTo(x, y, duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Moves a game object along a path.
  *
  * @method moveObjectPath
  * @param {gs.Object_Base} object - The game object to move.
  * @param {Object} path - The path to move the game object along.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.moveObjectPath = function(object, path, params) {
    var duration, easing, ref;
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.movePath(path.data, params.loopType, duration, easing, (ref = path.effects) != null ? ref.data : void 0);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Scrolls a scrollable game object along a path.
  *
  * @method scrollObjectPath
  * @param {gs.Object_Base} object - The game object to scroll.
  * @param {Object} path - The path to scroll the game object along.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.scrollObjectPath = function(object, path, params) {
    var duration, easing;
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.scrollPath(path, params.loopType, duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Zooms/Scales a game object.
  *
  * @method zoomObject
  * @param {gs.Object_Base} object - The game object to zoom.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.zoomObject = function(object, params) {
    var duration, easing;
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.zoomTo(this.numberValueOf(params.zooming.x) / 100, this.numberValueOf(params.zooming.y) / 100, duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Rotates a game object.
  *
  * @method rotateObject
  * @param {gs.Object_Base} object - The game object to rotate.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.rotateObject = function(object, params) {
    var duration, easing;
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    easing = gs.Easings.fromObject(params.easing);
    object.animator.rotate(params.direction, this.numberValueOf(params.speed) / 100, duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Blends a game object.
  *
  * @method blendObject
  * @param {gs.Object_Base} object - The game object to blend.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.blendObject = function(object, params) {
    var duration, easing;
    easing = gs.Easings.fromObject(params.easing);
    duration = this.durationValueOf(params.duration);
    object.animator.blendTo(this.numberValueOf(params.opacity), duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Executes a masking-effect on a game object..
  *
  * @method maskObject
  * @param {gs.Object_Base} object - The game object to execute a masking-effect on.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.maskObject = function(object, params) {
    var duration, easing, ref, ref1, ref2;
    easing = gs.Easings.fromObject(params.easing);
    if (params.mask.type === 0) {
      object.mask.type = 0;
      object.mask.ox = this.numberValueOf(params.mask.ox);
      object.mask.oy = this.numberValueOf(params.mask.oy);
      if (((ref = object.mask.source) != null ? ref.videoElement : void 0) != null) {
        object.mask.source.pause();
      }
      if (params.mask.sourceType === 0) {
        object.mask.source = ResourceManager.getBitmap("Graphics/Masks/" + ((ref1 = params.mask.graphic) != null ? ref1.name : void 0));
      } else {
        object.mask.source = ResourceManager.getVideo("Movies/" + ((ref2 = params.mask.video) != null ? ref2.name : void 0));
        if (object.mask.source) {
          object.mask.source.play();
          object.mask.source.loop = true;
        }
      }
    } else {
      duration = this.durationValueOf(params.duration);
      object.animator.maskTo(params.mask, duration, easing);
    }
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Tints a game object.
  *
  * @method tintObject
  * @param {gs.Object_Base} object - The game object to tint.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.tintObject = function(object, params) {
    var duration, easing;
    duration = this.durationValueOf(params.duration);
    easing = gs.Easings.fromObject(params.easing);
    object.animator.tintTo(params.tone, duration, easing);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Flashes a game object.
  *
  * @method flashObject
  * @param {gs.Object_Base} object - The game object to flash.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.flashObject = function(object, params) {
    var duration;
    duration = this.durationValueOf(params.duration);
    object.animator.flash(new Color(params.color), duration);
    if (params.waitForCompletion && !(duration === 0 || this.isInstantSkip())) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Cropes a game object.
  *
  * @method cropObject
  * @param {gs.Object_Base} object - The game object to crop.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.cropObject = function(object, params) {
    object.srcRect.x = this.numberValueOf(params.x);
    object.srcRect.y = this.numberValueOf(params.y);
    object.srcRect.width = this.numberValueOf(params.width);
    object.srcRect.height = this.numberValueOf(params.height);
    object.dstRect.width = this.numberValueOf(params.width);
    return object.dstRect.height = this.numberValueOf(params.height);
  };


  /**
  * Sets the motion blur settings of a game object.
  *
  * @method objectMotionBlur
  * @param {gs.Object_Base} object - The game object to set the motion blur settings for.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.objectMotionBlur = function(object, params) {
    return object.motionBlur.set(params.motionBlur);
  };


  /**
  * Enables an effect on a game object.
  *
  * @method objectEffect
  * @param {gs.Object_Base} object - The game object to execute a masking-effect on.
  * @param {Object} A params object containing additional info.
   */

  Component_CommandInterpreter.prototype.objectEffect = function(object, params) {
    var duration, easing, wobble;
    duration = this.durationValueOf(params.duration);
    easing = gs.Easings.fromObject(params.easing);
    switch (params.type) {
      case 0:
        object.animator.wobbleTo(params.wobble.power / 10000, params.wobble.speed / 100, duration, easing);
        wobble = object.effects.wobble;
        wobble.enabled = params.wobble.power > 0;
        wobble.vertical = params.wobble.orientation === 0 || params.wobble.orientation === 2;
        wobble.horizontal = params.wobble.orientation === 1 || params.wobble.orientation === 2;
        break;
      case 1:
        object.animator.blurTo(params.blur.power / 100, duration, easing);
        object.effects.blur.enabled = true;
        break;
      case 2:
        object.animator.pixelateTo(params.pixelate.size.width, params.pixelate.size.height, duration, easing);
        object.effects.pixelate.enabled = true;
    }
    if (params.waitForCompletion && duration !== 0) {
      this.isWaiting = true;
      return this.waitCounter = duration;
    }
  };


  /**
  * Executes an action like for a hotspot.
  *
  * @method executeAction
  * @param {Object} action - Action-Data.
  * @param {boolean} stateValue - In case of switch-binding, the switch is set to this value.
  * @param {number} bindValue - A number value which be put into the action's bind-value variable.
   */

  Component_CommandInterpreter.prototype.executeAction = function(action, stateValue, bindValue) {
    var domain, ref;
    switch (action.type) {
      case 0:
        if (action.labelIndex) {
          return this.pointer = action.labelIndex;
        } else {
          return this.jumpToLabel(action.label);
        }
        break;
      case 1:
        return this.callCommonEvent(action.commonEventId, null, this.isWaiting);
      case 2:
        domain = GameManager.variableStore.domain;
        return this.setBooleanValueTo(action["switch"], stateValue);
      case 3:
        return this.callScene((ref = action.scene) != null ? ref.uid : void 0);
      case 4:
        domain = GameManager.variableStore.domain;
        this.setNumberValueTo(action.bindValueVariable, bindValue);
        if (action.labelIndex) {
          return this.pointer = action.labelIndex;
        } else {
          return this.jumpToLabel(action.label);
        }
    }
  };


  /**
  * Calls a common event and returns the sub-interpreter for it.
  *
  * @method callCommonEvent
  * @param {number} id - The ID of the common event to call.
  * @param {Object} parameters - Optional common event parameters.
  * @param {boolean} wait - Indicates if the interpreter should be stay in waiting-mode even if the sub-interpreter is finished.
   */

  Component_CommandInterpreter.prototype.callCommonEvent = function(id, parameters, wait) {
    var commonEvent, ref;
    commonEvent = GameManager.commonEvents[id];
    if (commonEvent != null) {
      if (SceneManager.scene.commonEventContainer.subObjects.indexOf(commonEvent) === -1) {
        SceneManager.scene.commonEventContainer.addObject(commonEvent);
      }
      if ((ref = commonEvent.events) != null) {
        ref.on("finish", gs.CallBack("onCommonEventFinish", this));
      }
      this.subInterpreter = commonEvent.behavior.call(parameters || [], this.settings, this.context);
      commonEvent.behavior.update();
      if (this.subInterpreter != null) {
        this.isWaiting = true;
        this.subInterpreter.settings = this.settings;
        this.subInterpreter.start();
        return this.subInterpreter.update();
      }
    }
  };


  /**
  * Calls a scene and returns the sub-interpreter for it.
  *
  * @method callScene
  * @param {String} uid - The UID of the scene to call.
   */

  Component_CommandInterpreter.prototype.callScene = function(uid) {
    var object, sceneDocument;
    sceneDocument = DataManager.getDocument(uid);
    if (sceneDocument != null) {
      this.isWaiting = true;
      this.subInterpreter = new vn.Component_CallSceneInterpreter();
      object = {
        commands: sceneDocument.items.commands
      };
      this.subInterpreter.repeat = false;
      this.subInterpreter.context.set(sceneDocument.uid, sceneDocument);
      this.subInterpreter.object = object;
      this.subInterpreter.onFinish = gs.CallBack("onCallSceneFinish", this);
      this.subInterpreter.start();
      this.subInterpreter.settings = this.settings;
      return this.subInterpreter.update();
    }
  };


  /**
  * Calls a common event and returns the sub-interpreter for it.
  *
  * @method storeListValue
  * @param {number} id - The ID of the common event to call.
  * @param {Object} parameters - Optional common event parameters.
  * @param {boolean} wait - Indicates if the interpreter should be stay in waiting-mode even if the sub-interpreter is finished.
   */

  Component_CommandInterpreter.prototype.storeListValue = function(variable, list, value, valueType) {
    switch (valueType) {
      case 0:
        return this.setNumberValueTo(variable, (!isNaN(value) ? value : 0));
      case 1:
        return this.setBooleanValueTo(variable, (value ? 1 : 0));
      case 2:
        return this.setStringValueTo(variable, value.toString());
      case 3:
        return this.setListObjectTo(variable, (value.length != null ? value : []));
    }
  };


  /**
  * @method jumpToLabel
   */

  Component_CommandInterpreter.prototype.jumpToLabel = function(label) {
    var found, i, k, ref;
    if (!label) {
      return;
    }
    found = false;
    for (i = k = 0, ref = this.object.commands.length; 0 <= ref ? k < ref : k > ref; i = 0 <= ref ? ++k : --k) {
      if (this.object.commands[i].id === "gs.Label" && this.object.commands[i].params.name === label) {
        this.pointer = i;
        this.indent = this.object.commands[i].indent;
        found = true;
        break;
      }
    }
    if (found) {
      this.waitCounter = 0;
      return this.isWaiting = false;
    }
  };


  /**
  * Gets the current message box object depending on game mode (ADV or NVL).
  *
  * @method messageBoxObject
  * @return {gs.Object_Base} The message box object.
  * @protected
   */

  Component_CommandInterpreter.prototype.messageBoxObject = function(id) {
    if (SceneManager.scene.layout.visible) {
      return gs.ObjectManager.current.objectById(id || "messageBox");
    } else {
      return gs.ObjectManager.current.objectById(id || "messageBoxNVL");
    }
  };


  /**
  * Gets the current message object depending on game mode (ADV or NVL).
  *
  * @method messageObject
  * @return {ui.Object_Message} The message object.
  * @protected
   */

  Component_CommandInterpreter.prototype.messageObject = function() {
    if (SceneManager.scene.layout.visible) {
      return gs.ObjectManager.current.objectById("gameMessage_message");
    } else {
      return gs.ObjectManager.current.objectById("gameMessageNVL_message");
    }
  };


  /**
  * Gets the current message ID depending on game mode (ADV or NVL).
  *
  * @method messageObjectId
  * @return {string} The message object ID.
  * @protected
   */

  Component_CommandInterpreter.prototype.messageObjectId = function() {
    if (SceneManager.scene.layout.visible) {
      return "gameMessage_message";
    } else {
      return "gameMessageNVL_message";
    }
  };


  /**
  * Gets the current message settings.
  *
  * @method messageSettings
  * @return {Object} The message settings
  * @protected
   */

  Component_CommandInterpreter.prototype.messageSettings = function() {
    var message;
    message = this.targetMessage();
    return message.settings;
  };


  /**
  * Gets the current target message object where all message commands are executed on.
  *
  * @method targetMessage
  * @return {ui.Object_Message} The target message object.
  * @protected
   */

  Component_CommandInterpreter.prototype.targetMessage = function() {
    var message, ref, ref1, ref2, target;
    message = this.messageObject();
    target = this.settings.message.target;
    if (target != null) {
      switch (target.type) {
        case 0:
          message = (ref = gs.ObjectManager.current.objectById(target.id)) != null ? ref : this.messageObject();
          break;
        case 1:
          message = (ref1 = (ref2 = SceneManager.scene.messageAreas[target.id]) != null ? ref2.message : void 0) != null ? ref1 : this.messageObject();
      }
    }
    return message;
  };


  /**
  * Gets the current target message box containing the current target message.
  *
  * @method targetMessageBox
  * @return {ui.Object_UIElement} The target message box.
  * @protected
   */

  Component_CommandInterpreter.prototype.targetMessageBox = function() {
    var messageBox, ref, ref1, target;
    messageBox = this.messageObject();
    target = this.settings.message.target;
    if (target != null) {
      switch (target.type) {
        case 0:
          messageBox = (ref = gs.ObjectManager.current.objectById(target.id)) != null ? ref : this.messageObject();
          break;
        case 1:
          messageBox = (ref1 = gs.ObjectManager.current.objectById("customGameMessage_" + target.id)) != null ? ref1 : this.messageObject();
      }
    }
    return messageBox;
  };


  /**
  * Called after an input number dialog was accepted by the user. It takes the user's input and puts
  * it in the configured number variable.
  *
  * @method onInputNumberFinish
  * @return {Object} Event Object containing additional data like the number, etc.
  * @protected
   */

  Component_CommandInterpreter.prototype.onInputNumberFinish = function(e) {
    this.messageObject().behavior.clear();
    this.setNumberValueTo(this.waitingFor.inputNumber.variable, parseInt(ui.Component_FormulaHandler.fieldValue(e.sender, e.number)));
    this.isWaiting = false;
    this.waitingFor.inputNumber = null;
    return SceneManager.scene.inputNumberBox.dispose();
  };


  /**
  * Called after an input text dialog was accepted by the user. It takes the user's text input and puts
  * it in the configured string variable.
  *
  * @method onInputTextFinish
  * @return {Object} Event Object containing additional data like the text, etc.
  * @protected
   */

  Component_CommandInterpreter.prototype.onInputTextFinish = function(e) {
    this.messageObject().behavior.clear();
    this.setStringValueTo(this.waitingFor.inputText.variable, ui.Component_FormulaHandler.fieldValue(e.sender, e.text).replace(/_/g, ""));
    this.isWaiting = false;
    this.waitingFor.inputText = null;
    return SceneManager.scene.inputTextBox.dispose();
  };


  /**
  * Called after a choice was selected by the user. It jumps to the corresponding label
  * and also puts the choice into backlog.
  *
  * @method onChoiceAccept
  * @return {Object} Event Object containing additional data like the label, etc.
  * @protected
   */

  Component_CommandInterpreter.prototype.onChoiceAccept = function(e) {
    var duration, fading, messageObject, scene;
    scene = SceneManager.scene;
    scene.choiceTimer.behavior.stop();
    e.isSelected = true;
    delete e.sender;
    GameManager.backlog.push({
      character: {
        name: ""
      },
      message: "",
      choice: e,
      choices: $tempFields.choices,
      isChoice: true
    });
    GameManager.tempFields.choices = [];
    messageObject = this.messageObject();
    if (messageObject != null ? messageObject.visible : void 0) {
      this.isWaiting = true;
      fading = GameManager.tempSettings.messageFading;
      duration = GameManager.tempSettings.skip ? 0 : fading.duration;
      messageObject.animator.disappear(fading.animation, fading.easing, duration, (function(_this) {
        return function() {
          messageObject.behavior.clear();
          messageObject.visible = false;
          _this.isWaiting = false;
          _this.waitingFor.choice = null;
          return _this.executeAction(e.action, true);
        };
      })(this));
    } else {
      this.isWaiting = false;
      this.executeAction(e.action, true);
    }
    return scene.choiceWindow.dispose();
  };


  /**
  * Called when a NVL message finishes. 
  *
  * @method onMessageNVLFinish
  * @return {Object} Event Object containing additional data.
  * @protected
   */

  Component_CommandInterpreter.prototype.onMessageNVLFinish = function(e) {
    var messageObject;
    messageObject = gs.ObjectManager.current.objectById("gameMessageNVL_message");
    messageObject.character = null;
    messageObject.events.off("finish", e.handler);
    this.isWaiting = false;
    this.waitingFor.messageNVL = null;
    if ((messageObject.voice != null) && GameManager.settings.skipVoiceOnAction) {
      return AudioManager.stopSound(messageObject.voice.name);
    }
  };


  /**
  * Idle
  * @method commandIdle
  * @protected
   */

  Component_CommandInterpreter.prototype.commandIdle = function() {
    return this.interpreter.isWaiting = true;
  };


  /**
  * Start Timer
  * @method commandStartTimer
  * @protected
   */

  Component_CommandInterpreter.prototype.commandStartTimer = function() {
    var number, scene, timer, timers;
    scene = SceneManager.scene;
    timers = scene.timers;
    number = this.interpreter.numberValueOf(this.params.number);
    timer = timers[number];
    if (timer == null) {
      timer = new gs.Object_IntervalTimer();
      timers[number] = timer;
    }
    timer.events.offByOwner("elapsed", this.object);
    timer.events.on("elapsed", (function(_this) {
      return function(e) {
        var params;
        params = e.data.params;
        switch (params.action.type) {
          case 0:
            if (params.labelIndex != null) {
              return SceneManager.scene.interpreter.pointer = params.labelIndex;
            } else {
              return SceneManager.scene.interpreter.jumpToLabel(params.action.data.label);
            }
            break;
          case 1:
            return SceneManager.scene.interpreter.callCommonEvent(params.action.data.commonEventId);
        }
      };
    })(this), {
      params: this.params
    }, this.object);
    timer.behavior.interval = this.interpreter.durationValueOf(this.params.interval);
    return timer.behavior.start();
  };


  /**
  * Resume Timer
  * @method commandResumeTimer
  * @protected
   */

  Component_CommandInterpreter.prototype.commandResumeTimer = function() {
    var number, ref, timers;
    timers = SceneManager.scene.timers;
    number = this.interpreter.numberValueOf(this.params.number);
    return (ref = timers[number]) != null ? ref.behavior.resume() : void 0;
  };


  /**
  * Pauses Timer
  * @method commandPauseTimer
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPauseTimer = function() {
    var number, ref, timers;
    timers = SceneManager.scene.timers;
    number = this.interpreter.numberValueOf(this.params.number);
    return (ref = timers[number]) != null ? ref.behavior.pause() : void 0;
  };


  /**
  * Stop Timer
  * @method commandStopTimer
  * @protected
   */

  Component_CommandInterpreter.prototype.commandStopTimer = function() {
    var number, ref, timers;
    timers = SceneManager.scene.timers;
    number = this.interpreter.numberValueOf(this.params.number);
    return (ref = timers[number]) != null ? ref.behavior.stop() : void 0;
  };


  /**
  * Wait
  * @method commandWait
  * @protected
   */

  Component_CommandInterpreter.prototype.commandWait = function() {
    var time;
    time = this.interpreter.durationValueOf(this.params.time);
    if ((time != null) && time > 0 && !this.interpreter.previewData) {
      this.interpreter.waitCounter = time;
      return this.interpreter.isWaiting = true;
    }
  };


  /**
  * Loop
  * @method commandLoop
  * @protected
   */

  Component_CommandInterpreter.prototype.commandLoop = function() {
    this.interpreter.loops[this.interpreter.indent] = this.interpreter.pointer;
    return this.interpreter.indent++;
  };


  /**
  * Break Loop
  * @method commandBreakLoop
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBreakLoop = function() {
    var indent;
    indent = this.indent;
    while ((this.interpreter.loops[indent] == null) && indent > 0) {
      indent--;
    }
    this.interpreter.loops[indent] = null;
    return this.interpreter.indent = indent;
  };


  /**
  * @method commandListAdd
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListAdd = function() {
    var list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    switch (this.params.valueType) {
      case 0:
        list.push(this.interpreter.numberValueOf(this.params.numberValue));
        break;
      case 1:
        list.push(this.interpreter.booleanValueOf(this.params.switchValue));
        break;
      case 2:
        list.push(this.interpreter.stringValueOf(this.params.stringValue));
        break;
      case 3:
        list.push(this.interpreter.listObjectOf(this.params.listValue));
    }
    return this.interpreter.setListObjectTo(this.params.listVariable, list);
  };


  /**
  * @method commandListPop
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListPop = function() {
    var list, ref, value;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    value = (ref = list.pop()) != null ? ref : 0;
    return this.interpreter.storeListValue(this.params.targetVariable, list, value, this.params.valueType);
  };


  /**
  * @method commandListShift
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListShift = function() {
    var list, ref, value;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    value = (ref = list.shift()) != null ? ref : 0;
    return this.interpreter.storeListValue(this.params.targetVariable, list, value, this.params.valueType);
  };


  /**
  * @method commandListIndexOf
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListIndexOf = function() {
    var list, value;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    value = -1;
    switch (this.params.valueType) {
      case 0:
        value = list.indexOf(this.interpreter.numberValueOf(this.params.numberValue));
        break;
      case 1:
        value = list.indexOf(this.interpreter.booleanValueOf(this.params.switchValue));
        break;
      case 2:
        value = list.indexOf(this.interpreter.stringValueOf(this.params.stringValue));
        break;
      case 3:
        value = list.indexOf(this.interpreter.listObjectOf(this.params.listValue));
    }
    return this.interpreter.setNumberValueTo(this.params.targetVariable, value);
  };


  /**
  * @method commandListClear
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListClear = function() {
    var list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    return list.length = 0;
  };


  /**
  * @method commandListValueAt
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListValueAt = function() {
    var index, list, ref, value;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    index = this.interpreter.numberValueOf(this.params.index);
    if (index >= 0 && index < list.length) {
      value = (ref = list[index]) != null ? ref : 0;
      return this.interpreter.storeListValue(this.params.targetVariable, list, value, this.params.valueType);
    }
  };


  /**
  * @method commandListRemoveAt
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListRemoveAt = function() {
    var index, list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    index = this.interpreter.numberValueOf(this.params.index);
    if (index >= 0 && index < list.length) {
      return list.splice(index, 1);
    }
  };


  /**
  * @method commandListInsertAt
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListInsertAt = function() {
    var index, list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    index = this.interpreter.numberValueOf(this.params.index);
    if (index >= 0 && index < list.length) {
      switch (this.params.valueType) {
        case 0:
          list.splice(index, 0, this.interpreter.numberValueOf(this.params.numberValue));
          break;
        case 1:
          list.splice(index, 0, this.interpreter.booleanValueOf(this.params.switchValue));
          break;
        case 2:
          list.splice(index, 0, this.interpreter.stringValueOf(this.params.stringValue));
          break;
        case 3:
          list.splice(index, 0, this.interpreter.listObjectOf(this.params.listValue));
      }
      return this.interpreter.setListObjectTo(this.params.listVariable, list);
    }
  };


  /**
  * @method commandListSet
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListSet = function() {
    var index, list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    index = this.interpreter.numberValueOf(this.params.index);
    if (index >= 0) {
      switch (this.params.valueType) {
        case 0:
          list[index] = this.interpreter.numberValueOf(this.params.numberValue);
          break;
        case 1:
          list[index] = this.interpreter.booleanValueOf(this.params.switchValue);
          break;
        case 2:
          list[index] = this.interpreter.stringValueOf(this.params.stringValue);
          break;
        case 3:
          list[index] = this.interpreter.listObjectOf(this.params.listValue);
      }
      return this.interpreter.setListObjectTo(this.params.listVariable, list);
    }
  };


  /**
  * @method commandListCopy
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListCopy = function() {
    var copy, list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    copy = Object.deepCopy(list);
    return this.interpreter.setListObjectTo(this.params.targetVariable, copy);
  };


  /**
  * @method commandListLength
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListLength = function() {
    var list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    return this.interpreter.setNumberValueTo(this.params.targetVariable, list.length);
  };


  /**
  * @method commandListJoin
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListJoin = function() {
    var list, value;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    value = this.params.order === 0 ? list.join("") : list.reverse().join("");
    return this.interpreter.setStringValueTo(this.params.targetVariable, value);
  };


  /**
  * @method commandListFromText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListFromText = function() {
    var list, separator, text;
    text = this.interpreter.stringValueOf(this.params.textVariable);
    separator = this.interpreter.stringValueOf(this.params.separator);
    list = text.split(separator);
    return this.interpreter.setListObjectTo(this.params.targetVariable, list);
  };


  /**
  * @method commandListShuffle
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListShuffle = function() {
    var i, j, k, list, ref, results, tempi, tempj;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    if (list.length === 0) {
      return;
    }
    results = [];
    for (i = k = ref = list.length - 1; ref <= 1 ? k <= 1 : k >= 1; i = ref <= 1 ? ++k : --k) {
      j = Math.floor(Math.random() * (i + 1));
      tempi = list[i];
      tempj = list[j];
      list[i] = tempj;
      results.push(list[j] = tempi);
    }
    return results;
  };


  /**
  * @method commandListSort
  * @protected
   */

  Component_CommandInterpreter.prototype.commandListSort = function() {
    var list;
    list = this.interpreter.listObjectOf(this.params.listVariable);
    if (list.length === 0) {
      return;
    }
    switch (this.params.sortOrder) {
      case 0:
        return list.sort(function(a, b) {
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
      case 1:
        return list.sort(function(a, b) {
          if (a > b) {
            return -1;
          }
          if (a < b) {
            return 1;
          }
          return 0;
        });
    }
  };


  /**
  * @method commandResetVariables
  * @protected
   */

  Component_CommandInterpreter.prototype.commandResetVariables = function() {
    var range;
    switch (this.params.target) {
      case 0:
        range = null;
        break;
      case 1:
        range = this.params.range;
    }
    switch (this.params.scope) {
      case 0:
        if (this.params.scene) {
          return GameManager.variableStore.clearLocalVariables({
            id: this.params.scene.uid
          }, this.params.type, range);
        }
        break;
      case 1:
        return GameManager.variableStore.clearLocalVariables(null, this.params.type, range);
      case 2:
        return GameManager.variableStore.clearGlobalVariables(this.params.type, range);
      case 3:
        GameManager.variableStore.clearPersistentVariables(this.params.type, range);
        return GameManager.saveGlobalData();
    }
  };


  /**
  * @method commandChangeVariableDomain
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeVariableDomain = function() {
    return GameManager.variableStore.changeDomain(this.interpreter.stringValueOf(this.params.domain));
  };


  /**
  * @method commandChangeDecimalVariables
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeDecimalVariables = function() {
    return this.interpreter.changeDecimalVariables(this.params, this.params.roundMethod);
  };


  /**
  * @method commandChangeNumberVariables
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeNumberVariables = function() {
    var diff, end, i, index, k, ref, ref1, scope, source, start;
    source = 0;
    switch (this.params.source) {
      case 0:
        source = this.interpreter.numberValueOf(this.params.sourceValue);
        break;
      case 1:
        start = this.interpreter.numberValueOf(this.params.sourceRandom.start);
        end = this.interpreter.numberValueOf(this.params.sourceRandom.end);
        diff = end - start;
        source = Math.floor(start + Math.random() * (diff + 1));
        break;
      case 2:
        source = this.interpreter.numberValueAtIndex(this.params.sourceScope, this.interpreter.numberValueOf(this.params.sourceReference) - 1, this.params.sourceReferenceDomain);
        break;
      case 3:
        source = this.interpreter.numberValueOfGameData(this.params.sourceValue1);
        break;
      case 4:
        source = this.interpreter.numberValueOfDatabaseData(this.params.sourceValue1);
    }
    switch (this.params.target) {
      case 0:
        switch (this.params.operation) {
          case 0:
            this.interpreter.setNumberValueTo(this.params.targetVariable, source);
            break;
          case 1:
            this.interpreter.setNumberValueTo(this.params.targetVariable, this.interpreter.numberValueOf(this.params.targetVariable) + source);
            break;
          case 2:
            this.interpreter.setNumberValueTo(this.params.targetVariable, this.interpreter.numberValueOf(this.params.targetVariable) - source);
            break;
          case 3:
            this.interpreter.setNumberValueTo(this.params.targetVariable, this.interpreter.numberValueOf(this.params.targetVariable) * source);
            break;
          case 4:
            this.interpreter.setNumberValueTo(this.params.targetVariable, Math.floor(this.interpreter.numberValueOf(this.params.targetVariable) / source));
            break;
          case 5:
            this.interpreter.setNumberValueTo(this.params.targetVariable, this.interpreter.numberValueOf(this.params.targetVariable) % source);
        }
        break;
      case 1:
        scope = this.params.targetScope;
        start = this.params.targetRange.start - 1;
        end = this.params.targetRange.end - 1;
        for (i = k = ref = start, ref1 = end; ref <= ref1 ? k <= ref1 : k >= ref1; i = ref <= ref1 ? ++k : --k) {
          switch (this.params.operation) {
            case 0:
              this.interpreter.setNumberValueAtIndex(scope, i, source);
              break;
            case 1:
              this.interpreter.setNumberValueAtIndex(scope, i, this.interpreter.numberValueAtIndex(scope, i) + source);
              break;
            case 2:
              this.interpreter.setNumberValueAtIndex(scope, i, this.interpreter.numberValueAtIndex(scope, i) - source);
              break;
            case 3:
              this.interpreter.setNumberValueAtIndex(scope, i, this.interpreter.numberValueAtIndex(scope, i) * source);
              break;
            case 4:
              this.interpreter.setNumberValueAtIndex(scope, i, Math.floor(this.interpreter.numberValueAtIndex(scope, i) / source));
              break;
            case 5:
              this.interpreter.setNumberValueAtIndex(scope, i, this.interpreter.numberValueAtIndex(scope, i) % source);
          }
        }
        break;
      case 2:
        index = this.interpreter.numberValueOf(this.params.targetReference) - 1;
        switch (this.params.operation) {
          case 0:
            this.interpreter.setNumberValueAtIndex(this.params.targetScope, index, source, this.params.targetReferenceDomain);
            break;
          case 1:
            this.interpreter.setNumberValueAtIndex(this.params.targetScope, index, this.interpreter.numberValueAtIndex(this.params.targetScope, index, this.params.targetReferenceDomain) + source, this.params.targetReferenceDomain);
            break;
          case 2:
            this.interpreter.setNumberValueAtIndex(this.params.targetScope, index, this.interpreter.numberValueAtIndex(this.params.targetScope, index, this.params.targetReferenceDomain) - source, this.params.targetReferenceDomain);
            break;
          case 3:
            this.interpreter.setNumberValueAtIndex(this.params.targetScope, index, this.interpreter.numberValueAtIndex(this.params.targetScope, index, this.params.targetReferenceDomain) * source, this.params.targetReferenceDomain);
            break;
          case 4:
            this.interpreter.setNumberValueAtIndex(this.params.targetScope, index, Math.floor(this.interpreter.numberValueAtIndex(this.params.targetScope, index, this.params.targetReferenceDomain) / source), this.params.targetReferenceDomain);
            break;
          case 5:
            this.interpreter.setNumberValueAtIndex(this.params.targetScope, index, this.interpreter.numberValueAtIndex(this.params.targetScope, index, this.params.targetReferenceDomain) % source, this.params.targetReferenceDomain);
        }
    }
    return null;
  };


  /**
  * @method commandChangeBooleanVariables
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeBooleanVariables = function() {
    var i, index, k, ref, ref1, source, targetValue, variable;
    source = this.interpreter.booleanValueOf(this.params.value);
    switch (this.params.target) {
      case 0:
        if (this.params.value === 2) {
          targetValue = this.interpreter.booleanValueOf(this.params.targetVariable);
          this.interpreter.setBooleanValueTo(this.params.targetVariable, targetValue ? false : true);
        } else {
          this.interpreter.setBooleanValueTo(this.params.targetVariable, source);
        }
        break;
      case 1:
        variable = {
          index: 0,
          scope: this.params.targetRangeScope
        };
        for (i = k = ref = this.params.rangeStart - 1, ref1 = this.params.rangeEnd - 1; ref <= ref1 ? k <= ref1 : k >= ref1; i = ref <= ref1 ? ++k : --k) {
          variable.index = i;
          if (this.params.value === 2) {
            targetValue = this.interpreter.booleanValueOf(variable);
            this.interpreter.setBooleanValueTo(variable, targetValue ? false : true);
          } else {
            this.interpreter.setBooleanValueTo(variable, source);
          }
        }
        break;
      case 2:
        index = this.interpreter.numberValueOf(this.params.targetReference) - 1;
        this.interpreter.setBooleanValueAtIndex(this.params.targetRangeScope, index, source, this.params.targetReferenceDomain);
    }
    return null;
  };


  /**
  * @method commandChangeStringVariables
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeStringVariables = function() {
    var ex, i, index, k, ref, ref1, source, targetValue, variable;
    source = "";
    switch (this.params.source) {
      case 0:
        source = lcs(this.params.textValue);
        break;
      case 1:
        source = this.interpreter.stringValueOf(this.params.sourceVariable);
        break;
      case 2:
        source = this.interpreter.stringValueOfDatabaseData(this.params.databaseData);
        break;
      case 2:
        try {
          source = eval(this.params.script);
        } catch (error) {
          ex = error;
          source = "ERR: " + ex.message;
        }
        break;
      default:
        source = lcs(this.params.textValue);
    }
    switch (this.params.target) {
      case 0:
        switch (this.params.operation) {
          case 0:
            this.interpreter.setStringValueTo(this.params.targetVariable, source);
            break;
          case 1:
            this.interpreter.setStringValueTo(this.params.targetVariable, this.interpreter.stringValueOf(this.params.targetVariable) + source);
            break;
          case 2:
            this.interpreter.setStringValueTo(this.params.targetVariable, this.interpreter.stringValueOf(this.params.targetVariable).toUpperCase());
            break;
          case 3:
            this.interpreter.setStringValueTo(this.params.targetVariable, this.interpreter.stringValueOf(this.params.targetVariable).toLowerCase());
        }
        break;
      case 1:
        variable = {
          index: 0,
          scope: this.params.targetRangeScope
        };
        for (i = k = ref = this.params.rangeStart - 1, ref1 = this.params.rangeEnd - 1; ref <= ref1 ? k <= ref1 : k >= ref1; i = ref <= ref1 ? ++k : --k) {
          variable.index = i;
          switch (this.params.operation) {
            case 0:
              this.interpreter.setStringValueTo(variable, source);
              break;
            case 1:
              this.interpreter.setStringValueTo(variable, this.interpreter.stringValueOf(variable) + source);
              break;
            case 2:
              this.interpreter.setStringValueTo(variable, this.interpreter.stringValueOf(variable).toUpperCase());
              break;
            case 3:
              this.interpreter.setStringValueTo(variable, this.interpreter.stringValueOf(variable).toLowerCase());
          }
        }
        break;
      case 2:
        index = this.interpreter.numberValueOf(this.params.targetReference) - 1;
        switch (this.params.operation) {
          case 0:
            this.interpreter.setStringValueAtIndex(this.params.targetRangeScope, index, source, this.params.targetReferenceDomain);
            break;
          case 1:
            targetValue = this.interpreter.stringValueAtIndex(this.params.targetRangeScope, index, this.params.targetReferenceDomain);
            this.interpreter.setStringValueAtIndex(this.params.targetRangeScope, index, targetValue + source, this.params.targetReferenceDomain);
            break;
          case 2:
            targetValue = this.interpreter.stringValueAtIndex(this.params.targetRangeScope, index, this.params.targetReferenceDomain);
            this.interpreter.setStringValueAtIndex(this.params.targetRangeScope, index, targetValue.toUpperCase(), this.params.targetReferenceDomain);
            break;
          case 3:
            targetValue = this.interpreter.stringValueAtIndex(this.params.targetRangeScope, index, this.params.targetReferenceDomain);
            this.interpreter.setStringValueTo(this.params.targetRangeScope, index, targetValue.toLowerCase(), this.params.targetReferenceDomain);
        }
    }
    return null;
  };


  /**
  * @method commandCheckSwitch
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCheckSwitch = function() {
    var result;
    result = this.interpreter.booleanValueOf(this.params.targetVariable) && this.params.value;
    if (result) {
      return this.interpreter.pointer = this.params.labelIndex;
    }
  };


  /**
  * @method commandNumberCondition
  * @protected
   */

  Component_CommandInterpreter.prototype.commandNumberCondition = function() {
    var result;
    result = this.interpreter.compare(this.interpreter.numberValueOf(this.params.targetVariable), this.interpreter.numberValueOf(this.params.value), this.params.operation);
    this.interpreter.conditions[this.interpreter.indent] = result;
    if (result) {
      return this.interpreter.indent++;
    }
  };


  /**
  * @method commandCondition
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCondition = function() {
    var result;
    switch (this.params.valueType) {
      case 0:
        result = this.interpreter.compare(this.interpreter.numberValueOf(this.params.variable), this.interpreter.numberValueOf(this.params.numberValue), this.params.operation);
        break;
      case 1:
        result = this.interpreter.compare(this.interpreter.booleanValueOf(this.params.variable), this.interpreter.booleanValueOf(this.params.switchValue), this.params.operation);
        break;
      case 2:
        result = this.interpreter.compare(lcs(this.interpreter.stringValueOf(this.params.variable)), lcs(this.interpreter.stringValueOf(this.params.textValue)), this.params.operation);
    }
    this.interpreter.conditions[this.interpreter.indent] = result;
    if (result) {
      return this.interpreter.indent++;
    }
  };


  /**
  * @method commandConditionElse
  * @protected
   */

  Component_CommandInterpreter.prototype.commandConditionElse = function() {
    if (!this.interpreter.conditions[this.interpreter.indent]) {
      return this.interpreter.indent++;
    }
  };


  /**
  * @method commandConditionElseIf
  * @protected
   */

  Component_CommandInterpreter.prototype.commandConditionElseIf = function() {
    if (!this.interpreter.conditions[this.interpreter.indent]) {
      return this.interpreter.commandCondition.call(this);
    }
  };


  /**
  * @method commandCheckNumberVariable
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCheckNumberVariable = function() {
    var result;
    result = this.interpreter.compare(this.interpreter.numberValueOf(this.params.targetVariable), this.interpreter.numberValueOf(this.params.value), this.params.operation);
    if (result) {
      return this.interpreter.pointer = this.params.labelIndex;
    }
  };


  /**
  * @method commandCheckTextVariable
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCheckTextVariable = function() {
    var result, text1, text2;
    result = false;
    text1 = this.interpreter.stringValueOf(this.params.targetVariable);
    text2 = this.interpreter.stringValueOf(this.params.value);
    switch (this.params.operation) {
      case 0:
        result = text1 === text2;
        break;
      case 1:
        result = text1 !== text2;
        break;
      case 2:
        result = text1.length > text2.length;
        break;
      case 3:
        result = text1.length >= text2.length;
        break;
      case 4:
        result = text1.length < text2.length;
        break;
      case 5:
        result = text1.length <= text2.length;
    }
    if (result) {
      return this.interpreter.pointer = this.params.labelIndex;
    }
  };


  /**
  * @method commandLabel
  * @protected
   */

  Component_CommandInterpreter.prototype.commandLabel = function() {};


  /**
  * @method commandJumpToLabel
  * @protected
   */

  Component_CommandInterpreter.prototype.commandJumpToLabel = function() {
    var label;
    label = this.params.labelIndex;
    if (label != null) {
      this.interpreter.pointer = label;
      return this.interpreter.indent = this.interpreter.object.commands[label].indent;
    } else {
      return this.interpreter.jumpToLabel(this.params.name);
    }
  };


  /**
  * @method commandClearMessage
  * @protected
   */

  Component_CommandInterpreter.prototype.commandClearMessage = function() {
    var duration, fading, flags, isLocked, messageObject, scene;
    scene = SceneManager.scene;
    messageObject = this.interpreter.targetMessage();
    if (messageObject == null) {
      return;
    }
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    duration = 0;
    fading = GameManager.tempSettings.messageFading;
    if (!GameManager.tempSettings.skip) {
      duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : fading.duration;
    }
    messageObject.animator.disappear(fading.animation, fading.easing, duration, gs.CallBack("onMessageADVClear", this.interpreter));
    this.interpreter.waitForCompletion(messageObject, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandClosePageNVL
  * @protected
   */

  Component_CommandInterpreter.prototype.commandClosePageNVL = function() {
    var messageBox, messageObject, scene;
    scene = SceneManager.scene;
    messageObject = gs.ObjectManager.current.objectById("gameMessageNVL_message");
    if (messageObject == null) {
      return;
    }
    messageObject.message.clear();
    messageBox = gs.ObjectManager.current.objectById("messageBoxNVL");
    if (messageBox && this.params.visible !== messageBox.visible) {
      return messageBox.visible = false;
    }
  };


  /**
  * @method commandMessageBoxDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMessageBoxDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.messageBox;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.appearDuration)) {
      defaults.appearDuration = this.interpreter.durationValueOf(this.params.appearDuration);
    }
    if (!isLocked(flags.disappearDuration)) {
      defaults.disappearDuration = this.interpreter.durationValueOf(this.params.disappearDuration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags["appearEasing.type"])) {
      defaults.appearEasing = this.params.appearEasing;
    }
    if (!isLocked(flags["appearAnimation.type"])) {
      defaults.appearAnimation = this.params.appearAnimation;
    }
    if (!isLocked(flags["disappearEasing.type"])) {
      defaults.disappearEasing = this.params.disappearEasing;
    }
    if (!isLocked(flags["disappearAnimation.type"])) {
      return defaults.disappearAnimation = this.params.disappearAnimation;
    }
  };


  /**
  * @method commandShowMessageNVL
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowMessageNVL = function() {
    var character, messageObject, ref, ref1, ref2, scene, voiceSettings;
    scene = SceneManager.scene;
    scene.messageMode = vn.MessageMode.NVL;
    character = RecordManager.characters[this.params.characterId];
    scene.layout.visible = false;
    scene.layoutNVL.visible = true;
    messageObject = gs.ObjectManager.current.objectById("gameMessageNVL_message");
    if (messageObject == null) {
      return;
    }
    if ((ref = this.interpreter.messageBoxObject()) != null) {
      ref.visible = true;
    }
    messageObject.character = character;
    messageObject.message.addMessage(lcsm(this.params.message), character, !this.params.partial && messageObject.messages.length > 0, true);
    if (this.interpreter.messageSettings().backlog) {
      GameManager.backlog.push({
        character: character,
        message: lcsm(this.params.message),
        choices: []
      });
    }
    messageObject.events.on("finish", (function(_this) {
      return function(e) {
        return _this.interpreter.onMessageNVLFinish(e);
      };
    })(this));
    voiceSettings = GameManager.settings.voicesByCharacter[(ref1 = messageObject.character) != null ? ref1.index : void 0];
    if ((this.params.voice != null) && GameManager.settings.voiceEnabled && (!voiceSettings || voiceSettings.enabled)) {
      if (GameManager.settings.skipVoiceOnAction || !((ref2 = AudioManager.voice) != null ? ref2.playing : void 0)) {
        messageObject.voice = this.params.voice;
        AudioManager.playVoice(this.params.voice);
      }
    } else {
      AudioManager.voice = null;
    }
    this.interpreter.isWaiting = true;
    return this.interpreter.waitingFor.messageNVL = this.params;
  };


  /**
  * @method commandShowMessage
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowMessage = function() {
    var animation, character, defaults, duration, easing, expression, ref, scene, showMessage;
    scene = SceneManager.scene;
    scene.messageMode = vn.MessageMode.ADV;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    showMessage = (function(_this) {
      return function() {
        var messageObject, ref, settings, voiceSettings;
        character = RecordManager.characters[_this.params.characterId];
        scene.layout.visible = true;
        scene.layoutNVL.visible = false;
        messageObject = _this.interpreter.targetMessage();
        if (messageObject == null) {
          return;
        }
        scene.currentCharacter = character;
        messageObject.character = character;
        messageObject.opacity = 255;
        messageObject.events.offByOwner("callCommonEvent", _this.interpreter);
        messageObject.events.on("callCommonEvent", gs.CallBack("onCallCommonEvent", _this.interpreter), {
          params: _this.params
        }, _this.interpreter);
        messageObject.events.once("finish", gs.CallBack("onMessageADVFinish", _this.interpreter), {
          params: _this.params
        }, _this.interpreter);
        messageObject.events.once("waiting", gs.CallBack("onMessageADVWaiting", _this.interpreter), {
          params: _this.params
        }, _this.interpreter);
        if (messageObject.settings.useCharacterColor) {
          messageObject.message.showMessage(_this.interpreter, _this.params, character);
        } else {
          messageObject.message.showMessage(_this.interpreter, _this.params);
        }
        settings = GameManager.settings;
        voiceSettings = settings.voicesByCharacter[character.index];
        if ((_this.params.voice != null) && GameManager.settings.voiceEnabled && (!voiceSettings || voiceSettings > 0)) {
          if ((GameManager.settings.skipVoiceOnAction || !((ref = AudioManager.voice) != null ? ref.playing : void 0)) && !GameManager.tempSettings.skip) {
            messageObject.voice = _this.params.voice;
            return messageObject.behavior.voice = AudioManager.playVoice(_this.params.voice);
          }
        } else {
          return messageObject.behavior.voice = null;
        }
      };
    })(this);
    if ((this.params.expressionId != null) && (character != null)) {
      expression = RecordManager.characterExpressions[this.params.expressionId || 0];
      defaults = GameManager.defaults.character;
      duration = !gs.CommandFieldFlags.isLocked(this.params.fieldFlags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.expressionDuration;
      easing = gs.Easings.fromObject(defaults.changeEasing);
      animation = defaults.changeAnimation;
      character.behavior.changeExpression(expression, animation, easing, duration, (function(_this) {
        return function() {
          return showMessage();
        };
      })(this));
    } else {
      showMessage();
    }
    this.interpreter.isWaiting = ((ref = this.params.waitForCompletion) != null ? ref : true) && !(GameManager.tempSettings.skip && GameManager.tempSettings.skipTime === 0);
    return this.interpreter.waitingFor.messageADV = this.params;
  };


  /**
  * @method commandSetMessageArea
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSetMessageArea = function() {
    var messageLayout, number, scene;
    scene = SceneManager.scene;
    number = this.interpreter.numberValueOf(this.params.number);
    if (scene.messageAreas[number]) {
      messageLayout = scene.messageAreas[number].layout;
      messageLayout.dstRect.x = this.params.box.x;
      messageLayout.dstRect.y = this.params.box.y;
      messageLayout.dstRect.width = this.params.box.size.width;
      messageLayout.dstRect.height = this.params.box.size.height;
      return messageLayout.needsUpdate = true;
    }
  };


  /**
  * @method commandMessageFading
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMessageFading = function() {
    return GameManager.tempSettings.messageFading = {
      duration: this.interpreter.durationValueOf(this.params.duration),
      animation: this.params.animation,
      easing: gs.Easings.fromObject(this.params.easing)
    };
  };


  /**
  * @method commandMessageSettings
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMessageSettings = function() {
    var flags, font, fontName, fontSize, isLocked, messageObject, messageSettings, ref, ref1, ref2, ref3, ref4, ref5;
    messageObject = this.interpreter.targetMessage();
    if (!messageObject) {
      return;
    }
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    messageSettings = this.interpreter.messageSettings();
    if (!isLocked(flags.autoErase)) {
      messageSettings.autoErase = this.params.autoErase;
    }
    if (!isLocked(flags.waitAtEnd)) {
      messageSettings.waitAtEnd = this.params.waitAtEnd;
    }
    if (!isLocked(flags.backlog)) {
      messageSettings.backlog = this.params.backlog;
    }
    if (!isLocked(flags.lineHeight)) {
      messageSettings.lineHeight = this.params.lineHeight;
    }
    if (!isLocked(flags.lineSpacing)) {
      messageSettings.lineSpacing = this.params.lineSpacing;
    }
    if (!isLocked(flags.linePadding)) {
      messageSettings.linePadding = this.params.linePadding;
    }
    if (!isLocked(flags.paragraphSpacing)) {
      messageSettings.paragraphSpacing = this.params.paragraphSpacing;
    }
    if (!isLocked(flags.useCharacterColor)) {
      messageSettings.useCharacterColor = this.params.useCharacterColor;
    }
    messageObject.textRenderer.minLineHeight = (ref = messageSettings.lineHeight) != null ? ref : 0;
    messageObject.textRenderer.lineSpacing = (ref1 = messageSettings.lineSpacing) != null ? ref1 : messageObject.textRenderer.lineSpacing;
    messageObject.textRenderer.padding = (ref2 = messageSettings.linePadding) != null ? ref2 : messageObject.textRenderer.padding;
    fontName = !isLocked(flags.font) ? this.params.font : messageObject.font.name;
    fontSize = !isLocked(flags.size) ? this.params.size : messageObject.font.size;
    font = messageObject.font;
    if (!isLocked(flags.font) || !isLocked(flags.size)) {
      messageObject.font = new Font(fontName, fontSize);
    }
    if (!isLocked(flags.bold)) {
      messageObject.font.bold = this.params.bold;
    }
    if (!isLocked(flags.italic)) {
      messageObject.font.italic = this.params.italic;
    }
    if (!isLocked(flags.smallCaps)) {
      messageObject.font.smallCaps = this.params.smallCaps;
    }
    if (!isLocked(flags.underline)) {
      messageObject.font.underline = this.params.underline;
    }
    if (!isLocked(flags.strikeThrough)) {
      messageObject.font.strikeThrough = this.params.strikeThrough;
    }
    if (!isLocked(flags.color)) {
      messageObject.font.color = new Color(this.params.color);
    }
    messageObject.font.color = (flags.color != null) && !isLocked(flags.color) ? new Color(this.params.color) : font.color;
    messageObject.font.border = (flags.outline != null) && !isLocked(flags.outline) ? this.params.outline : font.border;
    messageObject.font.borderColor = (flags.outlineColor != null) && !isLocked(flags.outlineColor) ? new Color(this.params.outlineColor) : new Color(font.borderColor);
    messageObject.font.borderSize = (flags.outlineSize != null) && !isLocked(flags.outlineSize) ? (ref3 = this.params.outlineSize) != null ? ref3 : 4 : font.borderSize;
    messageObject.font.shadow = (flags.shadow != null) && !isLocked(flags.shadow) ? this.params.shadow : font.shadow;
    messageObject.font.shadowColor = (flags.shadowColor != null) && !isLocked(flags.shadowColor) ? new Color(this.params.shadowColor) : new Color(font.shadowColor);
    messageObject.font.shadowOffsetX = (flags.shadowOffsetX != null) && !isLocked(flags.shadowOffsetX) ? (ref4 = this.params.shadowOffsetX) != null ? ref4 : 1 : font.shadowOffsetX;
    messageObject.font.shadowOffsetY = (flags.shadowOffsetY != null) && !isLocked(flags.shadowOffsetY) ? (ref5 = this.params.shadowOffsetY) != null ? ref5 : 1 : font.shadowOffsetY;
    messageObject.font.bold = font.bold;
    messageObject.font.italic = font.italic;
    return messageObject.font.smallCaps = font.smallCaps;
  };


  /**
  * @method commandCreateMessageArea
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCreateMessageArea = function() {
    var messageArea, number, scene;
    number = this.interpreter.numberValueOf(this.params.number);
    scene = SceneManager.scene;
    scene.behavior.changeMessageAreaDomain(this.params.numberDomain);
    if (!scene.messageAreas[number]) {
      messageArea = new gs.Object_MessageArea();
      messageArea.layout = ui.UIManager.createControlFromDescriptor({
        type: "ui.CustomGameMessage",
        id: "customGameMessage_" + number,
        params: {
          id: "customGameMessage_" + number
        }
      }, messageArea);
      messageArea.message = gs.ObjectManager.current.objectById("customGameMessage_" + number + "_message");
      messageArea.message.domain = this.params.numberDomain;
      messageArea.addObject(messageArea.layout);
      messageArea.layout.dstRect.x = this.params.box.x;
      messageArea.layout.dstRect.y = this.params.box.y;
      messageArea.layout.dstRect.width = this.params.box.size.width;
      messageArea.layout.dstRect.height = this.params.box.size.height;
      messageArea.layout.needsUpdate = true;
      return scene.messageAreas[number] = messageArea;
    }
  };


  /**
  * @method commandEraseMessageArea
  * @protected
   */

  Component_CommandInterpreter.prototype.commandEraseMessageArea = function() {
    var area, number, scene;
    number = this.interpreter.numberValueOf(this.params.number);
    scene = SceneManager.scene;
    scene.behavior.changeMessageAreaDomain(this.params.numberDomain);
    area = scene.messageAreas[number];
    if (area != null) {
      area.layout.dispose();
    }
    return scene.messageAreas[number] = null;
  };


  /**
  * @method commandSetTargetMessage
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSetTargetMessage = function() {
    var message, ref, scene, target;
    message = this.interpreter.targetMessage();
    if (message != null) {
      message.textRenderer.isWaiting = false;
    }
    if (message != null) {
      message.behavior.isWaiting = false;
    }
    scene = SceneManager.scene;
    scene.behavior.changeMessageAreaDomain(this.params.numberDomain);
    target = {
      type: this.params.type,
      id: null
    };
    switch (this.params.type) {
      case 0:
        target.id = this.params.id;
        break;
      case 1:
        target.id = this.interpreter.numberValueOf(this.params.number);
    }
    this.interpreter.settings.message.target = target;
    if (this.params.clear) {
      return (ref = this.interpreter.targetMessage()) != null ? ref.behavior.clear() : void 0;
    }
  };


  /**
  * @method commandBacklogVisibility
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBacklogVisibility = function() {
    var control;
    if (this.params.visible) {
      control = gs.ObjectManager.current.objectById("backlogBox");
      if (control == null) {
        control = gs.ObjectManager.current.objectById("backlog");
      }
      if (control != null) {
        control.dispose();
      }
      if (this.params.backgroundVisible) {
        return control = SceneManager.scene.behavior.createControl(this, {
          descriptor: "ui.MessageBacklogBox"
        });
      } else {
        return control = SceneManager.scene.behavior.createControl(this, {
          descriptor: "ui.MessageBacklog"
        });
      }
    } else {
      control = gs.ObjectManager.current.objectById("backlogBox");
      if (control == null) {
        control = gs.ObjectManager.current.objectById("backlog");
      }
      return control != null ? control.dispose() : void 0;
    }
  };


  /**
  * @method commandMessageVisibility
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMessageVisibility = function() {
    var animation, defaults, duration, easing, flags, isLocked, message;
    defaults = GameManager.defaults.messageBox;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    message = this.interpreter.targetMessage();
    if ((message == null) || this.params.visible === message.visible) {
      return;
    }
    if (this.params.visible) {
      duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
      easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromObject(this.params.easing) : gs.Easings.fromObject(defaults.appearEasing);
      animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
      message.animator.appear(message.dstRect.x, message.dstRect.y, this.params.animation, easing, duration);
    } else {
      duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.disappearDuration;
      easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromObject(this.params.easing) : gs.Easings.fromObject(defaults.disappearEasing);
      animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.disappearAnimation;
      message.animator.disappear(animation, easing, duration, function() {
        return message.visible = false;
      });
    }
    message.update();
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMessageBoxVisibility
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMessageBoxVisibility = function() {
    var animation, defaults, duration, easing, flags, isLocked, messageBox, visible;
    defaults = GameManager.defaults.messageBox;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    messageBox = this.interpreter.messageBoxObject(this.interpreter.stringValueOf(this.params.id));
    visible = this.params.visible === 1;
    if ((messageBox == null) || visible === messageBox.visible) {
      return;
    }
    if (this.params.visible) {
      duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
      easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromObject(this.params.easing) : gs.Easings.fromObject(defaults.appearEasing);
      animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
      messageBox.animator.appear(messageBox.dstRect.x, messageBox.dstRect.y, animation, easing, duration);
    } else {
      duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.disappearDuration;
      easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromObject(this.params.easing) : gs.Easings.fromObject(defaults.disappearEasing);
      animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.disappearAnimation;
      messageBox.animator.disappear(animation, easing, duration, function() {
        return messageBox.visible = false;
      });
    }
    messageBox.update();
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandUIAccess
  * @protected
   */

  Component_CommandInterpreter.prototype.commandUIAccess = function() {
    var flags, isLocked;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.generalMenu)) {
      GameManager.tempSettings.menuAccess = this.interpreter.booleanValueOf(this.params.generalMenu);
    }
    if (!isLocked(flags.saveMenu)) {
      GameManager.tempSettings.saveMenuAccess = this.interpreter.booleanValueOf(this.params.saveMenu);
    }
    if (!isLocked(flags.loadMenu)) {
      GameManager.tempSettings.loadMenuAccess = this.interpreter.booleanValueOf(this.params.loadMenu);
    }
    if (!isLocked(flags.backlog)) {
      return GameManager.tempSettings.backlogAccess = this.interpreter.booleanValueOf(this.params.backlog);
    }
  };


  /**
  * @method commandUnlockCG
  * @protected
   */

  Component_CommandInterpreter.prototype.commandUnlockCG = function() {
    var cg;
    cg = RecordManager.cgGallery[this.interpreter.stringValueOf(this.params.cgId)];
    if (cg != null) {
      GameManager.globalData.cgGallery[cg.index] = {
        unlocked: true
      };
      return GameManager.saveGlobalData();
    }
  };


  /**
  * @method commandL2DMove
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DMove = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!character instanceof vn.Object_Live2DCharacter) {
      return;
    }
    this.interpreter.moveObject(character, this.params.position, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DMotionGroup
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DMotionGroup = function() {
    var character, motions, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!character instanceof vn.Object_Live2DCharacter) {
      return;
    }
    character.motionGroup = {
      name: this.params.data.motionGroup,
      loop: this.params.loop,
      playType: this.params.playType
    };
    if (this.params.waitForCompletion && !this.params.loop) {
      motions = character.model.motionsByGroup[character.motionGroup.name];
      if (motions != null) {
        this.interpreter.isWaiting = true;
        this.interpreter.waitCounter = motions.sum(function(m) {
          return m.getDurationMSec() / 16.6;
        });
      }
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DMotion
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DMotion = function() {
    var character, defaults, fadeInTime, flags, isLocked, motion, scene;
    defaults = GameManager.defaults.live2d;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!character instanceof vn.Object_Live2DCharacter) {
      return;
    }
    fadeInTime = !isLocked(flags.fadeInTime) ? this.params.fadeInTime : defaults.motionFadeInTime;
    character.motion = {
      name: this.params.data.motion,
      fadeInTime: fadeInTime,
      loop: this.params.loop
    };
    character.motionGroup = null;
    if (this.params.waitForCompletion && !this.params.loop) {
      motion = character.model.motions[character.motion.name];
      if (motion != null) {
        this.interpreter.isWaiting = true;
        this.interpreter.waitCounter = motion.getDurationMSec() / 16.6;
      }
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DExpression
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DExpression = function() {
    var character, defaults, fadeInTime, flags, isLocked, scene;
    defaults = GameManager.defaults.live2d;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!character instanceof vn.Object_Live2DCharacter) {
      return;
    }
    fadeInTime = !isLocked(flags.fadeInTime) ? this.params.fadeInTime : defaults.expressionFadeInTime;
    character.expression = {
      name: this.params.data.expression,
      fadeInTime: fadeInTime
    };
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DExitScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DExitScene = function() {
    var defaults;
    defaults = GameManager.defaults.live2d;
    this.interpreter.commandCharacterExitScene.call(this, defaults);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DSettings
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DSettings = function() {
    var character, flags, isLocked, scene;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!(character != null ? character.visual.l2dObject : void 0)) {
      return;
    }
    if (!isLocked(flags.lipSyncSensitivity)) {
      character.visual.l2dObject.lipSyncSensitivity = this.interpreter.numberValueOf(this.params.lipSyncSensitivity);
    }
    if (!isLocked(flags.idleIntensity)) {
      character.visual.l2dObject.idleIntensity = this.interpreter.numberValueOf(this.params.idleIntensity);
    }
    if (!isLocked(flags.breathIntensity)) {
      character.visual.l2dObject.breathIntensity = this.interpreter.numberValueOf(this.params.breathIntensity);
    }
    if (!isLocked(flags["eyeBlink.enabled"])) {
      character.visual.l2dObject.eyeBlink.enabled = this.params.eyeBlink.enabled;
    }
    if (!isLocked(flags["eyeBlink.interval"])) {
      character.visual.l2dObject.eyeBlink.blinkIntervalMsec = this.interpreter.numberValueOf(this.params.eyeBlink.interval);
    }
    if (!isLocked(flags["eyeBlink.closedMotionTime"])) {
      character.visual.l2dObject.eyeBlink.closedMotionMsec = this.interpreter.numberValueOf(this.params.eyeBlink.closedMotionTime);
    }
    if (!isLocked(flags["eyeBlink.closingMotionTime"])) {
      character.visual.l2dObject.eyeBlink.closingMotionMsec = this.interpreter.numberValueOf(this.params.eyeBlink.closingMotionTime);
    }
    if (!isLocked(flags["eyeBlink.openingMotionTime"])) {
      character.visual.l2dObject.eyeBlink.openingMotionMsec = this.interpreter.numberValueOf(this.params.eyeBlink.openingMotionTime);
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DParameter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DParameter = function() {
    var character, duration, easing, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!character instanceof vn.Object_Live2DCharacter) {
      return;
    }
    easing = gs.Easings.fromObject(this.params.easing);
    duration = this.interpreter.durationValueOf(this.params.duration);
    character.animator.l2dParameterTo(this.params.param.name, this.interpreter.numberValueOf(this.params.param.value), duration, easing);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.live2d;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.appearDuration)) {
      defaults.appearDuration = this.interpreter.durationValueOf(this.params.appearDuration);
    }
    if (!isLocked(flags.disappearDuration)) {
      defaults.disappearDuration = this.interpreter.durationValueOf(this.params.disappearDuration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags.motionFadeInTime)) {
      defaults.motionFadeInTime = this.interpreter.numberValueOf(this.params.motionFadeInTime);
    }
    if (!isLocked(flags["appearEasing.type"])) {
      defaults.appearEasing = this.params.appearEasing;
    }
    if (!isLocked(flags["appearAnimation.type"])) {
      defaults.appearAnimation = this.params.appearAnimation;
    }
    if (!isLocked(flags["disappearEasing.type"])) {
      defaults.disappearEasing = this.params.disappearEasing;
    }
    if (!isLocked(flags["disappearAnimation.type"])) {
      defaults.disappearAnimation = this.params.disappearAnimation;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandL2DJoinScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandL2DJoinScene = function() {
    var animation, character, defaults, duration, easing, flags, isLocked, motionBlur, origin, p, record, ref, ref1, ref2, ref3, ref4, ref5, scene, x, y, zIndex;
    defaults = GameManager.defaults.live2d;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    record = RecordManager.characters[this.interpreter.stringValueOf(this.params.characterId)];
    if (!record || scene.characters.first(function(v) {
      return !v.disposed && v.rid === record.index;
    })) {
      return;
    }
    if (this.params.positionType === 1) {
      x = this.params.position.x;
      y = this.params.position.y;
    } else if (this.params.positionType === 2) {
      x = this.interpreter.numberValueOf(this.params.position.x);
      y = this.interpreter.numberValueOf(this.params.position.y);
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
    zIndex = !isLocked(flags.zOrder) ? this.interpreter.numberValueOf(this.params.zOrder) : defaults.zOrder;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
    motionBlur = !isLocked(flags["motionBlur.enabled"]) ? this.params.motionBlur : defaults.motionBlur;
    origin = !isLocked(flags.origin) ? this.params.origin : defaults.origin;
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    character = new vn.Object_Live2DCharacter(record);
    character.modelName = ((ref = this.params.model) != null ? ref.name : void 0) || "";
    character.model = ResourceManager.getLive2DModel("Live2D/" + character.modelName);
    if (character.model.motions) {
      character.motion = {
        name: "",
        fadeInTime: 0,
        loop: true
      };
    }
    character.dstRect.x = x;
    character.dstRect.y = y;
    character.anchor.x = !origin ? 0 : 0.5;
    character.anchor.y = !origin ? 0 : 0.5;
    character.blendMode = this.interpreter.numberValueOf(this.params.blendMode);
    character.zoom.x = this.params.position.zoom.d;
    character.zoom.y = this.params.position.zoom.d;
    character.zIndex = zIndex || 200;
    if ((ref1 = character.model) != null) {
      ref1.reset();
    }
    character.setup();
    character.visual.l2dObject.idleIntensity = (ref2 = record.idleIntensity) != null ? ref2 : 1.0;
    character.visual.l2dObject.breathIntensity = (ref3 = record.breathIntensity) != null ? ref3 : 1.0;
    character.visual.l2dObject.lipSyncSensitivity = (ref4 = record.lipSyncSensitivity) != null ? ref4 : 1.0;
    character.update();
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, character, this.params);
      character.dstRect.x = p.x;
      character.dstRect.y = p.y;
    }
    scene.behavior.addCharacter(character, false, {
      animation: animation,
      duration: duration,
      easing: easing,
      motionBlur: motionBlur
    });
    if (((ref5 = this.params.viewport) != null ? ref5.type : void 0) === "ui") {
      character.viewport = Graphics.viewport;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCharacterJoinScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterJoinScene = function() {
    var angle, animation, bitmap, character, defaults, duration, easing, flags, isLocked, mirror, motionBlur, origin, p, record, ref, ref1, ref2, ref3, ref4, scene, x, y, zIndex, zoom;
    defaults = GameManager.defaults.character;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    record = RecordManager.characters[this.params.characterId];
    if (!record || scene.characters.first(function(v) {
      return !v.disposed && v.rid === record.index && !v.disposed;
    })) {
      return;
    }
    character = new vn.Object_Character(record, null, scene);
    character.expression = RecordManager.characterExpressions[((ref = this.params.expressionId) != null ? ref : record.defaultExpressionId) || 0];
    if (character.expression != null) {
      bitmap = ResourceManager.getBitmap("Graphics/Characters/" + ((ref1 = character.expression.idle[0]) != null ? ref1.resource.name : void 0));
    }
    mirror = false;
    angle = 0;
    zoom = 1;
    if (this.params.positionType === 1) {
      x = this.interpreter.numberValueOf(this.params.position.x);
      y = this.interpreter.numberValueOf(this.params.position.y);
      mirror = this.params.position.horizontalFlip;
      angle = this.params.position.angle || 0;
      zoom = ((ref2 = this.params.position.data) != null ? ref2.zoom : void 0) || 1;
    } else if (this.params.positionType === 2) {
      x = this.interpreter.numberValueOf(this.params.position.x);
      y = this.interpreter.numberValueOf(this.params.position.y);
      mirror = false;
      angle = 0;
      zoom = 1;
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
    origin = !isLocked(flags.origin) ? this.params.origin : defaults.origin;
    zIndex = !isLocked(flags.zOrder) ? this.interpreter.numberValueOf(this.params.zOrder) : defaults.zOrder;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
    motionBlur = !isLocked(flags["motionBlur.enabled"]) ? this.params.motionBlur : defaults.motionBlur;
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    if (character.expression != null) {
      bitmap = ResourceManager.getBitmap("Graphics/Characters/" + ((ref3 = character.expression.idle[0]) != null ? ref3.resource.name : void 0));
      if (this.params.origin === 1 && (bitmap != null)) {
        x += (bitmap.width * zoom - bitmap.width) / 2;
        y += (bitmap.height * zoom - bitmap.height) / 2;
      }
    }
    character.mirror = mirror;
    character.anchor.x = !origin ? 0 : 0.5;
    character.anchor.y = !origin ? 0 : 0.5;
    character.zoom.x = zoom;
    character.zoom.y = zoom;
    character.dstRect.x = x;
    character.dstRect.y = y;
    character.zIndex = zIndex || 200;
    character.blendMode = this.interpreter.numberValueOf(this.params.blendMode);
    character.angle = angle;
    character.setup();
    character.update();
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, character, this.params);
      character.dstRect.x = p.x;
      character.dstRect.y = p.y;
    }
    scene.behavior.addCharacter(character, false, {
      animation: animation,
      duration: duration,
      easing: easing,
      motionBlur: motionBlur
    });
    if (((ref4 = this.params.viewport) != null ? ref4.type : void 0) === "ui") {
      character.viewport = Graphics.viewport;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCharacterExitScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterExitScene = function(defaults) {
    var animation, character, duration, easing, flags, isLocked, scene;
    defaults = defaults || GameManager.defaults.character;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.disappearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.disappearDuration;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.disappearAnimation;
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    scene.behavior.removeCharacter(character, {
      animation: animation,
      duration: duration,
      easing: easing
    });
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCharacterChangeExpression
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterChangeExpression = function() {
    var animation, character, defaults, duration, easing, expression, flags, isLocked, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    defaults = GameManager.defaults.character;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.expressionDuration;
    expression = RecordManager.characterExpressions[this.params.expressionId || 0];
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromObject(this.params.easing) : gs.Easings.fromObject(defaults.changeEasing);
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.changeAnimation;
    character.behavior.changeExpression(expression, this.params.animation, easing, duration);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCharacterSetParameter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterSetParameter = function() {
    var params, value;
    params = GameManager.characterParams[this.interpreter.stringValueOf(this.params.characterId)];
    if ((params == null) || (this.params.param == null)) {
      return;
    }
    switch (this.params.valueType) {
      case 0:
        switch (this.params.param.type) {
          case 0:
            return params[this.params.param.name] = this.interpreter.numberValueOf(this.params.numberValue);
          case 1:
            return params[this.params.param.name] = this.interpreter.numberValueOf(this.params.numberValue) > 0;
          case 2:
            return params[this.params.param.name] = this.interpreter.numberValueOf(this.params.numberValue).toString();
        }
        break;
      case 1:
        switch (this.params.param.type) {
          case 0:
            value = this.interpreter.booleanValueOf(this.params.switchValue);
            return params[this.params.param.name] = value ? 1 : 0;
          case 1:
            return params[this.params.param.name] = this.interpreter.booleanValueOf(this.params.switchValue);
          case 2:
            value = this.interpreter.booleanValueOf(this.params.switchValue);
            return params[this.params.param.name] = value ? "ON" : "OFF";
        }
        break;
      case 2:
        switch (this.params.param.type) {
          case 0:
            value = this.interpreter.stringValueOf(this.params.textValue);
            return params[this.params.param.name] = value.length;
          case 1:
            return params[this.params.param.name] = this.interpreter.stringValueOf(this.params.textValue) === "ON";
          case 2:
            return params[this.params.param.name] = this.interpreter.stringValueOf(this.params.textValue);
        }
    }
  };


  /**
  * @method commandCharacterGetParameter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterGetParameter = function() {
    var params, value;
    params = GameManager.characterParams[this.interpreter.stringValueOf(this.params.characterId)];
    if ((params == null) || (this.params.param == null)) {
      return;
    }
    value = params[this.params.param.name];
    switch (this.params.valueType) {
      case 0:
        switch (this.params.param.type) {
          case 0:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, value);
          case 1:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, value ? 1 : 0);
          case 2:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, value != null ? value.length : 0);
        }
        break;
      case 1:
        switch (this.params.param.type) {
          case 0:
            return this.interpreter.setBooleanValueTo(this.params.targetVariable, value > 0);
          case 1:
            return this.interpreter.setBooleanValueTo(this.params.targetVariable, value);
          case 2:
            return this.interpreter.setBooleanValueTo(this.params.targetVariable, value === "ON");
        }
        break;
      case 2:
        switch (this.params.param.type) {
          case 0:
            return this.interpreter.setStringValueTo(this.params.targetVariable, value != null ? value.toString() : "");
          case 1:
            return this.interpreter.setStringValueTo(this.params.targetVariable, value ? "ON" : "OFF");
          case 2:
            return this.interpreter.setStringValueTo(this.params.targetVariable, value);
        }
    }
  };


  /**
  * @method commandCharacterMotionBlur
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterMotionBlur = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    return character.motionBlur.set(this.params.motionBlur);
  };


  /**
  * @method commandCharacterDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.character;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.appearDuration)) {
      defaults.appearDuration = this.interpreter.durationValueOf(this.params.appearDuration);
    }
    if (!isLocked(flags.disappearDuration)) {
      defaults.disappearDuration = this.interpreter.durationValueOf(this.params.disappearDuration);
    }
    if (!isLocked(flags.expressionDuration)) {
      defaults.expressionDuration = this.interpreter.durationValueOf(this.params.expressionDuration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags["appearEasing.type"])) {
      defaults.appearEasing = this.params.appearEasing;
    }
    if (!isLocked(flags["appearAnimation.type"])) {
      defaults.appearAnimation = this.params.appearAnimation;
    }
    if (!isLocked(flags["disappearEasing.type"])) {
      defaults.disappearEasing = this.params.disappearEasing;
    }
    if (!isLocked(flags["disappearAnimation.type"])) {
      defaults.disappearAnimation = this.params.disappearAnimation;
    }
    if (!isLocked(flags["motionBlur.enabled"])) {
      defaults.motionBlur = this.params.motionBlur;
    }
    if (!isLocked(flags.origin)) {
      return defaults.origin = this.params.origin;
    }
  };


  /**
  * @method commandCharacterEffect
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCharacterEffect = function() {
    var character, characterId, scene;
    scene = SceneManager.scene;
    characterId = this.interpreter.stringValueOf(this.params.characterId);
    character = scene.characters.first(function(c) {
      return !c.disposed && c.rid === characterId;
    });
    if (character == null) {
      return;
    }
    this.interpreter.objectEffect(character, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandFlashCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandFlashCharacter = function() {
    var character, duration, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (!character) {
      return;
    }
    duration = this.interpreter.durationValueOf(this.params.duration);
    character.animator.flash(new Color(this.params.color), duration);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandTintCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTintCharacter = function() {
    var character, duration, easing, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    easing = gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut);
    if (!character) {
      return;
    }
    duration = this.interpreter.durationValueOf(this.params.duration);
    character.animator.tintTo(this.params.tone, duration, easing);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandZoomCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandZoomCharacter = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.zoomObject(character, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandRotateCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRotateCharacter = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.rotateObject(character, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBlendCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBlendCharacter = function() {
    var character;
    character = SceneManager.scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.blendObject(character, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandShakeCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShakeCharacter = function() {
    var character;
    character = SceneManager.scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.shakeObject(character, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMaskCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMaskCharacter = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.maskObject(character, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMoveCharacter
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMoveCharacter = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.moveObject(character, this.params.position, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMoveCharacterPath
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMoveCharacterPath = function() {
    var character, scene;
    scene = SceneManager.scene;
    character = scene.characters.first((function(_this) {
      return function(v) {
        return !v.disposed && v.rid === _this.params.characterId;
      };
    })(this));
    if (character == null) {
      return;
    }
    this.interpreter.moveObjectPath(character, this.params.path, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandShakeBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShakeBackground = function() {
    var background;
    background = SceneManager.scene.backgrounds[this.interpreter.numberValueOf(this.params.layer)];
    if (background == null) {
      return;
    }
    this.interpreter.shakeObject(background, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandScrollBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandScrollBackground = function() {
    var duration, easing, horizontalSpeed, layer, ref, scene, verticalSpeed;
    scene = SceneManager.scene;
    duration = this.interpreter.durationValueOf(this.params.duration);
    horizontalSpeed = this.interpreter.numberValueOf(this.params.horizontalSpeed);
    verticalSpeed = this.interpreter.numberValueOf(this.params.verticalSpeed);
    easing = gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut);
    layer = this.interpreter.numberValueOf(this.params.layer);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    if ((ref = scene.backgrounds[layer]) != null) {
      ref.animator.move(horizontalSpeed, verticalSpeed, duration, easing);
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandScrollBackgroundTo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandScrollBackgroundTo = function() {
    var background, duration, easing, layer, p, scene, x, y;
    scene = SceneManager.scene;
    duration = this.interpreter.durationValueOf(this.params.duration);
    x = this.interpreter.numberValueOf(this.params.background.location.x);
    y = this.interpreter.numberValueOf(this.params.background.location.y);
    easing = gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut);
    layer = this.interpreter.numberValueOf(this.params.layer);
    background = scene.backgrounds[layer];
    if (!background) {
      return;
    }
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, background, this.params);
      x = p.x;
      y = p.y;
    }
    background.animator.moveTo(x, y, duration, easing);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandScrollBackgroundPath
  * @protected
   */

  Component_CommandInterpreter.prototype.commandScrollBackgroundPath = function() {
    var background, scene;
    scene = SceneManager.scene;
    background = scene.backgrounds[this.interpreter.numberValueOf(this.params.layer)];
    if (background == null) {
      return;
    }
    this.interpreter.moveObjectPath(background, this.params.path, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMaskBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMaskBackground = function() {
    var background, scene;
    scene = SceneManager.scene;
    background = scene.backgrounds[this.interpreter.numberValueOf(this.params.layer)];
    if (background == null) {
      return;
    }
    this.interpreter.maskObject(background, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandZoomBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandZoomBackground = function() {
    var duration, easing, layer, ref, scene, x, y;
    scene = SceneManager.scene;
    duration = this.interpreter.durationValueOf(this.params.duration);
    x = this.interpreter.numberValueOf(this.params.zooming.x);
    y = this.interpreter.numberValueOf(this.params.zooming.y);
    easing = gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut);
    layer = this.interpreter.numberValueOf(this.params.layer);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    if ((ref = scene.backgrounds[layer]) != null) {
      ref.animator.zoomTo(x / 100, y / 100, duration, easing);
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandRotateBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRotateBackground = function() {
    var background, scene;
    scene = SceneManager.scene;
    background = scene.backgrounds[this.interpreter.numberValueOf(this.params.layer)];
    if (background) {
      this.interpreter.rotateObject(background, this.params);
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**        
  * @method commandTintBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTintBackground = function() {
    var background, duration, easing, layer, scene;
    scene = SceneManager.scene;
    layer = this.interpreter.numberValueOf(this.params.layer);
    background = scene.backgrounds[layer];
    if (background == null) {
      return;
    }
    duration = this.interpreter.durationValueOf(this.params.duration);
    easing = gs.Easings.fromObject(this.params.easing);
    background.animator.tintTo(this.params.tone, duration, easing);
    this.interpreter.waitForCompletion(background, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBlendBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBlendBackground = function() {
    var background, layer;
    layer = this.interpreter.numberValueOf(this.params.layer);
    background = SceneManager.scene.backgrounds[layer];
    if (background == null) {
      return;
    }
    this.interpreter.blendObject(background, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBackgroundEffect
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBackgroundEffect = function() {
    var background, layer;
    layer = this.interpreter.numberValueOf(this.params.layer);
    background = SceneManager.scene.backgrounds[layer];
    if (background == null) {
      return;
    }
    this.interpreter.objectEffect(background, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBackgroundDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBackgroundDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.background;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.duration)) {
      defaults.duration = this.interpreter.durationValueOf(this.params.duration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags["easing.type"])) {
      defaults.easing = this.params.easing;
    }
    if (!isLocked(flags["animation.type"])) {
      defaults.animation = this.params.animation;
    }
    if (!isLocked(flags.origin)) {
      defaults.origin = this.params.origin;
    }
    if (!isLocked(flags.loopHorizontal)) {
      defaults.loopHorizontal = this.params.loopHorizontal;
    }
    if (!isLocked(flags.loopVertical)) {
      return defaults.loopVertical = this.params.loopVertical;
    }
  };


  /**
  * @method commandBackgroundMotionBlur
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBackgroundMotionBlur = function() {
    var background, layer;
    layer = this.interpreter.numberValueOf(this.params.layer);
    background = SceneManager.scene.backgrounds[layer];
    if (background == null) {
      return;
    }
    return background.motionBlur.set(this.params.motionBlur);
  };


  /**
  * @method commandChangeBackground
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeBackground = function() {
    var animation, defaults, duration, easing, flags, isLocked, layer, loopH, loopV, origin, ref, scene, zIndex;
    defaults = GameManager.defaults.background;
    scene = SceneManager.scene;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.duration;
    loopH = !isLocked(flags.loopHorizontal) ? this.params.loopHorizontal : defaults.loopHorizontal;
    loopV = !isLocked(flags.loopVertical) ? this.params.loopVertical : defaults.loopVertical;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.animation;
    origin = !isLocked(flags.origin) ? this.params.origin : defaults.origin;
    zIndex = !isLocked(flags.zOrder) ? this.interpreter.numberValueOf(this.params.zOrder) : defaults.zOrder;
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromObject(this.params.easing) : gs.Easings.fromObject(defaults.easing);
    layer = this.interpreter.numberValueOf(this.params.layer);
    scene.behavior.changeBackground(this.params.graphic, false, animation, easing, duration, 0, 0, layer, loopH, loopV);
    if (scene.backgrounds[layer]) {
      if (((ref = this.params.viewport) != null ? ref.type : void 0) === "ui") {
        scene.backgrounds[layer].viewport = Graphics.viewport;
      }
      scene.backgrounds[layer].anchor.x = origin === 0 ? 0 : 0.5;
      scene.backgrounds[layer].anchor.y = origin === 0 ? 0 : 0.5;
      scene.backgrounds[layer].blendMode = this.interpreter.numberValueOf(this.params.blendMode);
      scene.backgrounds[layer].zIndex = zIndex;
      if (origin === 1) {
        scene.backgrounds[layer].dstRect.x = scene.backgrounds[layer].dstRect.x;
        scene.backgrounds[layer].dstRect.y = scene.backgrounds[layer].dstRect.y;
      }
      scene.backgrounds[layer].setup();
      scene.backgrounds[layer].update();
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCallScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCallScene = function() {
    return this.interpreter.callScene(this.interpreter.stringValueOf(this.params.scene.uid || this.params.scene));
  };


  /**
  * @method commandChangeScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeScene = function() {
    var flags, isLocked, k, len, len1, n, newScene, picture, ref, ref1, scene, uid, video;
    if (GameManager.inLivePreview) {
      return;
    }
    if (!this.params.savePrevious) {
      SceneManager.clear();
    }
    scene = SceneManager.scene;
    if (!this.params.erasePictures && !this.params.savePrevious) {
      scene.removeObject(scene.pictureContainer);
      ref = scene.pictures;
      for (k = 0, len = ref.length; k < len; k++) {
        picture = ref[k];
        if (picture) {
          ResourceManager.context.remove("Graphics/Pictures/" + picture.image);
        }
      }
    }
    if (!this.params.eraseTexts && !this.params.savePrevious) {
      scene.removeObject(scene.textContainer);
    }
    if (!this.params.eraseVideos && !this.params.savePrevious) {
      scene.removeObject(scene.videoContainer);
      ref1 = scene.videos;
      for (n = 0, len1 = ref1.length; n < len1; n++) {
        video = ref1[n];
        if (video) {
          ResourceManager.context.remove("Movies/" + video.video);
        }
      }
    }
    if (this.params.scene) {
      if (this.params.savePrevious) {
        GameManager.sceneData = {
          uid: uid = this.params.scene.uid,
          pictures: [],
          texts: [],
          videos: []
        };
      } else {
        GameManager.sceneData = {
          uid: uid = this.params.scene.uid,
          pictures: scene.pictureContainer.subObjectsByDomain,
          texts: scene.textContainer.subObjectsByDomain,
          videos: scene.videoContainer.subObjectsByDomain
        };
      }
      flags = this.params.fieldFlags || {};
      isLocked = gs.CommandFieldFlags.isLocked;
      newScene = new vn.Object_Scene();
      if (this.params.savePrevious) {
        newScene.sceneData = {
          uid: uid = this.params.scene.uid,
          pictures: [],
          texts: [],
          videos: [],
          backlog: GameManager.backlog
        };
      } else {
        newScene.sceneData = {
          uid: uid = this.params.scene.uid,
          pictures: scene.pictureContainer.subObjectsByDomain,
          texts: scene.textContainer.subObjectsByDomain,
          videos: scene.videoContainer.subObjectsByDomain
        };
      }
      SceneManager.switchTo(newScene, this.params.savePrevious, (function(_this) {
        return function() {
          return _this.interpreter.isWaiting = false;
        };
      })(this));
    } else {
      SceneManager.switchTo(null);
    }
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandReturnToPreviousScene
  * @protected
   */

  Component_CommandInterpreter.prototype.commandReturnToPreviousScene = function() {
    if (GameManager.inLivePreview) {
      return;
    }
    SceneManager.returnToPrevious((function(_this) {
      return function() {
        return _this.interpreter.isWaiting = false;
      };
    })(this));
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandSwitchToLayout
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSwitchToLayout = function() {
    var scene;
    if (GameManager.inLivePreview) {
      return;
    }
    if (ui.UIManager.layouts[this.params.layout.name] != null) {
      scene = new gs.Object_Layout(this.params.layout.name);
      SceneManager.switchTo(scene, this.params.savePrevious);
      return this.interpreter.isWaiting = true;
    }
  };


  /**
  * @method commandChangeTransition
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeTransition = function() {
    var flags, isLocked;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.duration)) {
      SceneManager.transitionData.duration = this.interpreter.durationValueOf(this.params.duration);
    }
    if (!isLocked(flags.graphic)) {
      SceneManager.transitionData.graphic = this.params.graphic;
    }
    if (!isLocked(flags.vague)) {
      return SceneManager.transitionData.vague = this.params.vague;
    }
  };


  /**
  * @method commandFreezeScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandFreezeScreen = function() {
    return Graphics.freeze();
  };


  /**
  * @method commandScreenTransition
  * @protected
   */

  Component_CommandInterpreter.prototype.commandScreenTransition = function() {
    var bitmap, defaults, duration, flags, graphicName, isLocked, ref, ref1, vague;
    defaults = GameManager.defaults.scene;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    graphicName = !isLocked(flags.graphic) ? (ref = this.params.graphic) != null ? ref.name : void 0 : (ref1 = SceneManager.transitionData.graphic) != null ? ref1.name : void 0;
    if (graphicName) {
      bitmap = !isLocked(flags.graphic) ? ResourceManager.getBitmap("Graphics/Masks/" + graphicName) : ResourceManager.getBitmap("Graphics/Masks/" + graphicName);
    }
    vague = !isLocked(flags.vague) ? this.interpreter.numberValueOf(this.params.vague) : SceneManager.transitionData.vague;
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : SceneManager.transitionData.duration;
    this.interpreter.isWaiting = !GameManager.inLivePreview;
    this.interpreter.waitCounter = duration;
    return Graphics.transition(duration, bitmap, vague);
  };


  /**
  * @method commandShakeScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShakeScreen = function() {
    if (SceneManager.scene.viewport == null) {
      return;
    }
    this.interpreter.shakeObject(SceneManager.scene.viewport, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandTintScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTintScreen = function() {
    var duration;
    duration = this.interpreter.durationValueOf(this.params.duration);
    SceneManager.scene.viewport.animator.tintTo(new Tone(this.params.tone), duration, gs.Easings.EASE_LINEAR[0]);
    if (this.params.waitForCompletion && duration > 0) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandZoomScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandZoomScreen = function() {
    var duration, easing, scene;
    easing = gs.Easings.fromObject(this.params.easing);
    duration = this.interpreter.durationValueOf(this.params.duration);
    scene = SceneManager.scene;
    SceneManager.scene.viewport.anchor.x = 0.5;
    SceneManager.scene.viewport.anchor.y = 0.5;
    SceneManager.scene.viewport.animator.zoomTo(this.interpreter.numberValueOf(this.params.zooming.x) / 100, this.interpreter.numberValueOf(this.params.zooming.y) / 100, duration, easing);
    this.interpreter.waitForCompletion(null, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandPanScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPanScreen = function() {
    var duration, easing, scene, viewport;
    scene = SceneManager.scene;
    duration = this.interpreter.durationValueOf(this.params.duration);
    easing = gs.Easings.fromObject(this.params.easing);
    this.interpreter.settings.screen.pan.x -= this.params.position.x;
    this.interpreter.settings.screen.pan.y -= this.params.position.y;
    viewport = SceneManager.scene.viewport;
    viewport.animator.scrollTo(-this.params.position.x + viewport.dstRect.x, -this.params.position.y + viewport.dstRect.y, duration, easing);
    this.interpreter.waitForCompletion(null, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandRotateScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRotateScreen = function() {
    var duration, easing, pan, scene;
    scene = SceneManager.scene;
    easing = gs.Easings.fromObject(this.params.easing);
    duration = this.interpreter.durationValueOf(this.params.duration);
    pan = this.interpreter.settings.screen.pan;
    SceneManager.scene.viewport.anchor.x = 0.5;
    SceneManager.scene.viewport.anchor.y = 0.5;
    SceneManager.scene.viewport.animator.rotate(this.params.direction, this.interpreter.numberValueOf(this.params.speed) / 100, duration, easing);
    this.interpreter.waitForCompletion(null, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandFlashScreen
  * @protected
   */

  Component_CommandInterpreter.prototype.commandFlashScreen = function() {
    var duration;
    duration = this.interpreter.durationValueOf(this.params.duration);
    SceneManager.scene.viewport.animator.flash(new Color(this.params.color), duration, gs.Easings.EASE_LINEAR[0]);
    if (this.params.waitForCompletion && duration !== 0) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandScreenEffect
  * @protected
   */

  Component_CommandInterpreter.prototype.commandScreenEffect = function() {
    var duration, easing, flags, isLocked, scene, viewport, wobble, zOrder;
    scene = SceneManager.scene;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    duration = this.interpreter.durationValueOf(this.params.duration);
    easing = gs.Easings.fromObject(this.params.easing);
    if (!gs.CommandFieldFlags.isLocked(flags.zOrder)) {
      zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    } else {
      zOrder = SceneManager.scene.viewport.zIndex;
    }
    viewport = scene.viewportContainer.subObjects.first(function(v) {
      return v.zIndex === zOrder;
    });
    if (!viewport) {
      viewport = new gs.Object_Viewport();
      viewport.zIndex = zOrder;
      scene.viewportContainer.addObject(viewport);
    }
    switch (this.params.type) {
      case 0:
        viewport.animator.wobbleTo(this.params.wobble.power / 10000, this.params.wobble.speed / 100, duration, easing);
        wobble = viewport.effects.wobble;
        wobble.enabled = this.params.wobble.power > 0;
        wobble.vertical = this.params.wobble.orientation === 0 || this.params.wobble.orientation === 2;
        wobble.horizontal = this.params.wobble.orientation === 1 || this.params.wobble.orientation === 2;
        break;
      case 1:
        viewport.animator.blurTo(this.params.blur.power / 100, duration, easing);
        viewport.effects.blur.enabled = true;
        break;
      case 2:
        viewport.animator.pixelateTo(this.params.pixelate.size.width, this.params.pixelate.size.height, duration, easing);
        viewport.effects.pixelate.enabled = true;
    }
    if (this.params.waitForCompletion && duration !== 0) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandVideoDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandVideoDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.video;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.appearDuration)) {
      defaults.appearDuration = this.interpreter.durationValueOf(this.params.appearDuration);
    }
    if (!isLocked(flags.disappearDuration)) {
      defaults.disappearDuration = this.interpreter.durationValueOf(this.params.disappearDuration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags["appearEasing.type"])) {
      defaults.appearEasing = this.params.appearEasing;
    }
    if (!isLocked(flags["appearAnimation.type"])) {
      defaults.appearAnimation = this.params.appearAnimation;
    }
    if (!isLocked(flags["disappearEasing.type"])) {
      defaults.disappearEasing = this.params.disappearEasing;
    }
    if (!isLocked(flags["disappearAnimation.type"])) {
      defaults.disappearAnimation = this.params.disappearAnimation;
    }
    if (!isLocked(flags["motionBlur.enabled"])) {
      defaults.motionBlur = this.params.motionBlur;
    }
    if (!isLocked(flags.origin)) {
      return defaults.origin = this.params.origin;
    }
  };


  /**
  * @method commandShowVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowVideo = function() {
    var animation, defaults, duration, easing, flags, isLocked, number, origin, p, ref, ref1, scene, video, videos, x, y, zIndex;
    defaults = GameManager.defaults.video;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    videos = scene.videos;
    if (videos[number] == null) {
      videos[number] = new gs.Object_Video();
    }
    x = this.interpreter.numberValueOf(this.params.position.x);
    y = this.interpreter.numberValueOf(this.params.position.y);
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
    origin = !isLocked(flags.origin) ? this.params.origin : defaults.origin;
    zIndex = !isLocked(flags.zOrder) ? this.interpreter.numberValueOf(this.params.zOrder) : defaults.zOrder;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
    video = videos[number];
    video.domain = this.params.numberDomain;
    video.video = (ref = this.params.video) != null ? ref.name : void 0;
    video.loop = true;
    video.dstRect.x = x;
    video.dstRect.y = y;
    video.blendMode = this.interpreter.numberValueOf(this.params.blendMode);
    video.anchor.x = origin === 0 ? 0 : 0.5;
    video.anchor.y = origin === 0 ? 0 : 0.5;
    video.zIndex = zIndex || (1000 + number);
    if (((ref1 = this.params.viewport) != null ? ref1.type : void 0) === "scene") {
      video.viewport = SceneManager.scene.behavior.viewport;
    }
    video.update();
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, video, this.params);
      video.dstRect.x = p.x;
      video.dstRect.y = p.y;
    }
    video.animator.appear(x, y, animation, easing, duration);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMoveVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMoveVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.moveObject(video, this.params.picture.position, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMoveVideoPath
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMoveVideoPath = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.moveObjectPath(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandRotateVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRotateVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.rotateObject(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandZoomVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandZoomVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.zoomObject(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBlendVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBlendVideo = function() {
    var video;
    SceneManager.scene.behavior.changeVideoDomain(this.params.numberDomain);
    video = SceneManager.scene.videos[this.interpreter.numberValueOf(this.params.number)];
    if (video == null) {
      return;
    }
    this.interpreter.blendObject(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandTintVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTintVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.tintObject(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandFlashVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandFlashVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.flashObject(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCropVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCropVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    return this.interpreter.cropObject(video, this.params);
  };


  /**
  * @method commandVideoMotionBlur
  * @protected
   */

  Component_CommandInterpreter.prototype.commandVideoMotionBlur = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    return this.interpreter.objectMotionBlur(video, this.params);
  };


  /**
  * @method commandMaskVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMaskVideo = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.maskObject(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandVideoEffect
  * @protected
   */

  Component_CommandInterpreter.prototype.commandVideoEffect = function() {
    var number, scene, video;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    this.interpreter.objectEffect(video, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandEraseVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandEraseVideo = function() {
    var animation, defaults, duration, easing, flags, isLocked, number, scene, video;
    defaults = GameManager.defaults.video;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    scene.behavior.changeVideoDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    video = scene.videos[number];
    if (video == null) {
      return;
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.disappearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.disappearDuration;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.disappearAnimation;
    video.animator.disappear(animation, easing, duration, (function(_this) {
      return function(sender) {
        sender.dispose();
        scene.behavior.changeTextDomain(sender.domain);
        return scene.videos[number] = null;
      };
    })(this));
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandShowImageMap
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowImageMap = function() {
    var bitmap, flags, imageMap, isLocked, number, p, ref, ref1, ref2, ref3, ref4, ref5;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    SceneManager.scene.behavior.changePictureDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    imageMap = SceneManager.scene.pictures[number];
    if (imageMap != null) {
      imageMap.dispose();
    }
    imageMap = new gs.Object_ImageMap();
    imageMap.visual.variableContext = this.interpreter.context;
    SceneManager.scene.pictures[number] = imageMap;
    bitmap = ResourceManager.getBitmap("Graphics/Pictures/" + ((ref = this.params.ground) != null ? ref.name : void 0));
    imageMap.dstRect.width = bitmap.width;
    imageMap.dstRect.height = bitmap.height;
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, imageMap, this.params);
      imageMap.dstRect.x = p.x;
      imageMap.dstRect.y = p.y;
    } else {
      imageMap.dstRect.x = this.interpreter.numberValueOf(this.params.position.x);
      imageMap.dstRect.y = this.interpreter.numberValueOf(this.params.position.y);
    }
    imageMap.anchor.x = this.params.origin === 1 ? 0.5 : 0;
    imageMap.anchor.y = this.params.origin === 1 ? 0.5 : 0;
    imageMap.zIndex = !isLocked(flags.zOrder) ? this.interpreter.numberValueOf(this.params.zOrder) : 400;
    imageMap.blendMode = !isLocked(flags.blendMode) ? this.params.blendMode : 0;
    imageMap.hotspots = this.params.hotspots;
    imageMap.images = [(ref1 = this.params.ground) != null ? ref1.name : void 0, (ref2 = this.params.hover) != null ? ref2.name : void 0, (ref3 = this.params.unselected) != null ? ref3.name : void 0, (ref4 = this.params.selected) != null ? ref4.name : void 0, (ref5 = this.params.selectedHover) != null ? ref5.name : void 0];
    imageMap.events.on("jumpTo", gs.CallBack("onJumpTo", this.interpreter));
    imageMap.events.on("callCommonEvent", gs.CallBack("onCallCommonEvent", this.interpreter));
    imageMap.setup();
    imageMap.update();
    this.interpreter.showObject(imageMap, {
      x: 0,
      y: 0
    }, this.params);
    if (this.params.waitForCompletion) {
      this.interpreter.waitCounter = 0;
      this.interpreter.isWaiting = true;
    }
    imageMap.events.on("finish", (function(_this) {
      return function(sender) {
        return _this.interpreter.isWaiting = false;
      };
    })(this));
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandEraseImageMap
  * @protected
   */

  Component_CommandInterpreter.prototype.commandEraseImageMap = function() {
    var imageMap, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain);
    imageMap = scene.pictures[this.interpreter.numberValueOf(this.params.number)];
    if (imageMap == null) {
      return;
    }
    imageMap.events.emit("finish", imageMap);
    imageMap.visual.active = false;
    this.interpreter.eraseObject(imageMap, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandAddHotspot
  * @protected
   */

  Component_CommandInterpreter.prototype.commandAddHotspot = function() {
    var dragging, hotspot, hotspots, number, picture, ref, ref1, ref2, ref3, ref4, ref5, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeHotspotDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    hotspots = scene.hotspots;
    if (hotspots[number] == null) {
      hotspots[number] = new gs.Object_Hotspot();
    }
    hotspot = hotspots[number];
    hotspot.domain = this.params.numberDomain;
    switch (this.params.positionType) {
      case 0:
        hotspot.dstRect.x = this.params.box.x;
        hotspot.dstRect.y = this.params.box.y;
        hotspot.dstRect.width = this.params.box.size.width;
        hotspot.dstRect.height = this.params.box.size.height;
        break;
      case 1:
        hotspot.dstRect.x = this.interpreter.numberValueOf(this.params.box.x);
        hotspot.dstRect.y = this.interpreter.numberValueOf(this.params.box.y);
        hotspot.dstRect.width = this.interpreter.numberValueOf(this.params.box.size.width);
        hotspot.dstRect.height = this.interpreter.numberValueOf(this.params.box.size.height);
        break;
      case 2:
        picture = scene.pictures[this.interpreter.numberValueOf(this.params.pictureNumber)];
        if (picture != null) {
          hotspot.target = picture;
        }
        break;
      case 3:
        text = scene.texts[this.interpreter.numberValueOf(this.params.textNumber)];
        if (text != null) {
          hotspot.target = text;
        }
    }
    hotspot.behavior.shape = (ref = this.params.shape) != null ? ref : gs.HotspotShape.RECTANGLE;
    if (text != null) {
      hotspot.images = null;
    } else {
      hotspot.images = [((ref1 = this.params.baseGraphic) != null ? ref1.name : void 0) || this.interpreter.stringValueOf(this.params.baseGraphic) || (picture != null ? picture.image : void 0), ((ref2 = this.params.hoverGraphic) != null ? ref2.name : void 0) || this.interpreter.stringValueOf(this.params.hoverGraphic), ((ref3 = this.params.selectedGraphic) != null ? ref3.name : void 0) || this.interpreter.stringValueOf(this.params.selectedGraphic), ((ref4 = this.params.selectedHoverGraphic) != null ? ref4.name : void 0) || this.interpreter.stringValueOf(this.params.selectedHoverGraphic), ((ref5 = this.params.unselectedGraphic) != null ? ref5.name : void 0) || this.interpreter.stringValueOf(this.params.unselectedGraphic)];
    }
    if (this.params.actions.onClick.type !== 0 || this.params.actions.onClick.label) {
      hotspot.events.on("click", gs.CallBack("onHotspotClick", this.interpreter, {
        params: this.params,
        bindValue: this.interpreter.numberValueOf(this.params.actions.onClick.bindValue)
      }));
    }
    if (this.params.actions.onEnter.type !== 0 || this.params.actions.onEnter.label) {
      hotspot.events.on("enter", gs.CallBack("onHotspotEnter", this.interpreter, {
        params: this.params,
        bindValue: this.interpreter.numberValueOf(this.params.actions.onEnter.bindValue)
      }));
    }
    if (this.params.actions.onLeave.type !== 0 || this.params.actions.onLeave.label) {
      hotspot.events.on("leave", gs.CallBack("onHotspotLeave", this.interpreter, {
        params: this.params,
        bindValue: this.interpreter.numberValueOf(this.params.actions.onLeave.bindValue)
      }));
    }
    if (this.params.actions.onDrag.type !== 0 || this.params.actions.onDrag.label) {
      hotspot.events.on("dragStart", gs.CallBack("onHotspotDragStart", this.interpreter, {
        params: this.params,
        bindValue: this.interpreter.numberValueOf(this.params.actions.onDrag.bindValue)
      }));
      hotspot.events.on("drag", gs.CallBack("onHotspotDrag", this.interpreter, {
        params: this.params,
        bindValue: this.interpreter.numberValueOf(this.params.actions.onDrag.bindValue)
      }));
      hotspot.events.on("dragEnd", gs.CallBack("onHotspotDragEnd", this.interpreter, {
        params: this.params,
        bindValue: this.interpreter.numberValueOf(this.params.actions.onDrag.bindValue)
      }));
    }
    if (this.params.actions.onSelect.type !== 0 || this.params.actions.onSelect.label || this.params.actions.onDeselect.type !== 0 || this.params.actions.onDeselect.label) {
      hotspot.events.on("stateChanged", gs.CallBack("onHotspotStateChanged", this.interpreter, this.params));
    }
    hotspot.selectable = true;
    hotspot.setup();
    if (this.params.dragging.enabled) {
      dragging = this.params.dragging;
      hotspot.draggable = {
        rect: new Rect(dragging.rect.x, dragging.rect.y, dragging.rect.size.width, dragging.rect.size.height),
        axisX: dragging.horizontal,
        axisY: dragging.vertical
      };
      hotspot.addComponent(new ui.Component_Draggable());
      return hotspot.events.on("drag", (function(_this) {
        return function(e) {
          var drag;
          drag = e.sender.draggable;
          GameManager.variableStore.setupTempVariables(_this.interpreter.context);
          if (_this.params.dragging.horizontal) {
            return _this.interpreter.setNumberValueTo(_this.params.dragging.variable, Math.round((e.sender.dstRect.x - drag.rect.x) / (drag.rect.width - e.sender.dstRect.width) * 100));
          } else {
            return _this.interpreter.setNumberValueTo(_this.params.dragging.variable, Math.round((e.sender.dstRect.y - drag.rect.y) / (drag.rect.height - e.sender.dstRect.height) * 100));
          }
        };
      })(this));
    }
  };


  /**
  * @method commandChangeHotspotState
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeHotspotState = function() {
    var flags, hotspot, isLocked, number, scene;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    scene.behavior.changeHotspotDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    hotspot = scene.hotspots[number];
    if (!hotspot) {
      return;
    }
    if (!isLocked(flags.selected)) {
      hotspot.behavior.selected = this.interpreter.booleanValueOf(this.params.selected);
    }
    if (!isLocked(flags.enabled)) {
      hotspot.behavior.enabled = this.interpreter.booleanValueOf(this.params.enabled);
    }
    hotspot.behavior.updateInput();
    return hotspot.behavior.updateImage();
  };


  /**
  * @method commandEraseHotspot
  * @protected
   */

  Component_CommandInterpreter.prototype.commandEraseHotspot = function() {
    var number, scene;
    scene = SceneManager.scene;
    scene.behavior.changeHotspotDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    if (scene.hotspots[number] != null) {
      scene.hotspots[number].dispose();
      return scene.hotspotContainer.eraseObject(number);
    }
  };


  /**
  * @method commandChangeObjectDomain
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeObjectDomain = function() {
    return SceneManager.scene.behavior.changeObjectDomain(this.interpreter.stringValueOf(this.params.domain));
  };


  /**
  * @method commandPictureDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPictureDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.picture;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.appearDuration)) {
      defaults.appearDuration = this.interpreter.durationValueOf(this.params.appearDuration);
    }
    if (!isLocked(flags.disappearDuration)) {
      defaults.disappearDuration = this.interpreter.durationValueOf(this.params.disappearDuration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags["appearEasing.type"])) {
      defaults.appearEasing = this.params.appearEasing;
    }
    if (!isLocked(flags["appearAnimation.type"])) {
      defaults.appearAnimation = this.params.appearAnimation;
    }
    if (!isLocked(flags["disappearEasing.type"])) {
      defaults.disappearEasing = this.params.disappearEasing;
    }
    if (!isLocked(flags["disappearAnimation.type"])) {
      defaults.disappearAnimation = this.params.disappearAnimation;
    }
    if (!isLocked(flags["motionBlur.enabled"])) {
      defaults.motionBlur = this.params.motionBlur;
    }
    if (!isLocked(flags.origin)) {
      return defaults.origin = this.params.origin;
    }
  };

  Component_CommandInterpreter.prototype.createPicture = function(graphic, params) {
    var animation, bitmap, defaults, duration, easing, flags, graphicName, isLocked, number, origin, picture, pictures, ref, ref1, ref2, ref3, ref4, ref5, ref6, scene, snapshot, x, y, zIndex;
    graphic = this.stringValueOf(graphic);
    graphicName = (graphic != null ? graphic.name : void 0) != null ? graphic.name : graphic;
    bitmap = ResourceManager.getBitmap("Graphics/Pictures/" + graphicName);
    if (bitmap && !bitmap.loaded) {
      return null;
    }
    defaults = GameManager.defaults.picture;
    flags = params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    number = this.numberValueOf(params.number);
    pictures = scene.pictures;
    if (pictures[number] == null) {
      picture = new gs.Object_Picture(null, null, (ref = params.visual) != null ? ref.type : void 0);
      picture.domain = params.numberDomain;
      pictures[number] = picture;
      switch ((ref1 = params.visual) != null ? ref1.type : void 0) {
        case 1:
          picture.visual.looping.vertical = true;
          picture.visual.looping.horizontal = true;
          break;
        case 2:
          picture.frameThickness = params.visual.frame.thickness;
          picture.frameCornerSize = params.visual.frame.cornerSize;
          break;
        case 3:
          picture.visual.orientation = params.visual.threePartImage.orientation;
          break;
        case 4:
          picture.color = gs.Color.fromObject(params.visual.quad.color);
          break;
        case 5:
          snapshot = Graphics.snapshot();
          picture.bitmap = snapshot;
          picture.dstRect.width = snapshot.width;
          picture.dstRect.height = snapshot.height;
          picture.srcRect.set(0, 0, snapshot.width, snapshot.height);
      }
    }
    x = this.numberValueOf(params.position.x);
    y = this.numberValueOf(params.position.y);
    picture = pictures[number];
    if (!picture.bitmap) {
      picture.image = graphicName;
    } else {
      picture.image = null;
    }
    bitmap = (ref2 = picture.bitmap) != null ? ref2 : ResourceManager.getBitmap("Graphics/Pictures/" + graphicName);
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.numberValueOf(params.easing.type), params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.durationValueOf(params.duration) : defaults.appearDuration;
    origin = !isLocked(flags.origin) ? params.origin : defaults.origin;
    zIndex = !isLocked(flags.zOrder) ? this.numberValueOf(params.zOrder) : defaults.zOrder;
    animation = !isLocked(flags["animation.type"]) ? params.animation : defaults.appearAnimation;
    picture.mirror = params.position.horizontalFlip;
    picture.angle = params.position.angle || 0;
    picture.zoom.x = ((ref3 = params.position.data) != null ? ref3.zoom : void 0) || 1;
    picture.zoom.y = ((ref4 = params.position.data) != null ? ref4.zoom : void 0) || 1;
    picture.blendMode = this.numberValueOf(params.blendMode);
    if (params.origin === 1 && (bitmap != null)) {
      x += (bitmap.width * picture.zoom.x - bitmap.width) / 2;
      y += (bitmap.height * picture.zoom.y - bitmap.height) / 2;
    }
    picture.dstRect.x = x;
    picture.dstRect.y = y;
    picture.anchor.x = origin === 1 ? 0.5 : 0;
    picture.anchor.y = origin === 1 ? 0.5 : 0;
    picture.zIndex = zIndex || (700 + number);
    if (((ref5 = params.viewport) != null ? ref5.type : void 0) === "scene") {
      picture.viewport = SceneManager.scene.behavior.viewport;
    }
    if (((ref6 = params.size) != null ? ref6.type : void 0) === 1) {
      picture.dstRect.width = params.size.width;
      picture.dstRect.height = params.size.height;
    }
    picture.update();
    return picture;
  };


  /**
  * @method commandShowPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowPicture = function() {
    var animation, defaults, duration, easing, flags, isLocked, p, picture;
    SceneManager.scene.behavior.changePictureDomain(this.params.numberDomain || "");
    defaults = GameManager.defaults.picture;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    picture = this.interpreter.createPicture(this.params.graphic, this.params);
    if (!picture) {
      this.interpreter.pointer--;
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = 1;
      return;
    }
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, picture, this.params);
      picture.dstRect.x = p.x;
      picture.dstRect.y = p.y;
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
    picture.animator.appear(picture.dstRect.x, picture.dstRect.y, animation, easing, duration);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandPlayPictureAnimation
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPlayPictureAnimation = function() {
    var animation, bitmap, component, defaults, duration, easing, flags, isLocked, p, picture, record;
    SceneManager.scene.behavior.changePictureDomain(this.params.numberDomain || "");
    defaults = GameManager.defaults.picture;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    picture = null;
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
    if (this.params.animationId != null) {
      record = RecordManager.animations[this.params.animationId];
      if (record != null) {
        picture = this.interpreter.createPicture(record.graphic, this.params);
        component = picture.findComponent("Component_FrameAnimation");
        if (component != null) {
          component.refresh(record);
          component.start();
        } else {
          component = new gs.Component_FrameAnimation(record);
          picture.addComponent(component);
        }
        component.update();
        if (this.params.positionType === 0) {
          p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, picture, this.params);
          picture.dstRect.x = p.x;
          picture.dstRect.y = p.y;
        }
        picture.animator.appear(picture.dstRect.x, picture.dstRect.y, animation, easing, duration);
      }
    } else {
      picture = SceneManager.scene.pictures[this.interpreter.numberValueOf(this.params.number)];
      animation = picture != null ? picture.findComponent("Component_FrameAnimation") : void 0;
      if (animation != null) {
        picture.removeComponent(animation);
        bitmap = ResourceManager.getBitmap("Graphics/Animations/" + picture.image);
        if (bitmap != null) {
          picture.srcRect.set(0, 0, bitmap.width, bitmap.height);
          picture.dstRect.width = picture.srcRect.width;
          picture.dstRect.height = picture.srcRect.height;
        }
      }
    }
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMovePicturePath
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMovePicturePath = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.moveObjectPath(picture, this.params.path, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMovePicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMovePicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.moveObject(picture, this.params.picture.position, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandTintPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTintPicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.tintObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandFlashPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandFlashPicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.flashObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandCropPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCropPicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    return this.interpreter.cropObject(picture, this.params);
  };


  /**
  * @method commandRotatePicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRotatePicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.rotateObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandZoomPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandZoomPicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.zoomObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBlendPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBlendPicture = function() {
    var picture;
    SceneManager.scene.behavior.changePictureDomain(this.params.numberDomain || "");
    picture = SceneManager.scene.pictures[this.interpreter.numberValueOf(this.params.number)];
    if (picture == null) {
      return;
    }
    this.interpreter.blendObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandShakePicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShakePicture = function() {
    var picture;
    picture = SceneManager.scene.pictures[this.interpreter.numberValueOf(this.params.number)];
    if (picture == null) {
      return;
    }
    this.interpreter.shakeObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMaskPicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMaskPicture = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.maskObject(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandPictureMotionBlur
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPictureMotionBlur = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.objectMotionBlur(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandPictureEffect
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPictureEffect = function() {
    var number, picture, scene;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    this.interpreter.objectEffect(picture, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandErasePicture
  * @protected
   */

  Component_CommandInterpreter.prototype.commandErasePicture = function() {
    var animation, defaults, duration, easing, flags, isLocked, number, picture, scene;
    defaults = GameManager.defaults.picture;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    scene.behavior.changePictureDomain(this.params.numberDomain || "");
    number = this.interpreter.numberValueOf(this.params.number);
    picture = scene.pictures[number];
    if (picture == null) {
      return;
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.disappearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.disappearDuration;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.disappearAnimation;
    picture.animator.disappear(animation, easing, duration, (function(_this) {
      return function(sender) {
        sender.dispose();
        scene.behavior.changePictureDomain(sender.domain);
        return scene.pictures[number] = null;
      };
    })(this));
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandInputNumber
  * @protected
   */

  Component_CommandInterpreter.prototype.commandInputNumber = function() {
    var scene;
    scene = SceneManager.scene;
    this.interpreter.isWaiting = true;
    if (this.interpreter.isProcessingMessageInOtherContext()) {
      this.interpreter.waitForMessage();
      return;
    }
    if ((GameManager.settings.allowChoiceSkip || this.interpreter.preview) && GameManager.tempSettings.skip) {
      this.interpreter.isWaiting = false;
      this.interpreter.messageObject().behavior.clear();
      this.interpreter.setNumberValueTo(this.params.variable, 0);
      return;
    }
    $tempFields.digits = this.params.digits;
    scene.behavior.showInputNumber(this.params.digits, gs.CallBack("onInputNumberFinish", this.interpreter, this.params));
    this.interpreter.waitingFor.inputNumber = this.params;
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandChoiceTimer
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChoiceTimer = function() {
    var scene;
    scene = SceneManager.scene;
    GameManager.tempFields.choiceTimer = scene.choiceTimer;
    GameManager.tempFields.choiceTimerVisible = this.params.visible;
    if (this.params.enabled) {
      scene.choiceTimer.behavior.seconds = this.interpreter.numberValueOf(this.params.seconds);
      scene.choiceTimer.behavior.minutes = this.interpreter.numberValueOf(this.params.minutes);
      scene.choiceTimer.behavior.start();
      return scene.choiceTimer.events.on("finish", (function(_this) {
        return function(sender) {
          var defaultChoice, ref;
          if (scene.choiceWindow && ((ref = GameManager.tempFields.choices) != null ? ref.length : void 0) > 0) {
            defaultChoice = (GameManager.tempFields.choices.first(function(c) {
              return c.isDefault;
            })) || GameManager.tempFields.choices[0];
            return scene.choiceWindow.events.emit("selectionAccept", scene.choiceWindow, defaultChoice);
          }
        };
      })(this));
    } else {
      return scene.choiceTimer.stop();
    }
  };


  /**
  * @method commandShowChoices
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowChoices = function() {
    var choices, defaultChoice, messageObject, pointer, scene;
    scene = SceneManager.scene;
    pointer = this.interpreter.pointer;
    choices = GameManager.tempFields.choices || [];
    if ((GameManager.settings.allowChoiceSkip || this.interpreter.previewData) && GameManager.tempSettings.skip) {
      messageObject = this.interpreter.messageObject();
      if (messageObject != null ? messageObject.visible : void 0) {
        messageObject.behavior.clear();
      }
      defaultChoice = (choices.first(function(c) {
        return c.isDefault;
      })) || choices[0];
      if (defaultChoice.action.labelIndex != null) {
        this.interpreter.pointer = defaultChoice.action.labelIndex;
      } else {
        this.interpreter.jumpToLabel(defaultChoice.action.label);
      }
    } else {
      if (choices.length > 0) {
        this.interpreter.isWaiting = true;
        scene.behavior.showChoices(choices, gs.CallBack("onChoiceAccept", this.interpreter, {
          pointer: pointer,
          params: this.params
        }));
      }
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandShowChoice
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowChoice = function() {
    var choices, command, commands, dstRect, index, pointer, scene;
    scene = SceneManager.scene;
    commands = this.interpreter.object.commands;
    command = null;
    index = 0;
    pointer = this.interpreter.pointer;
    choices = null;
    dstRect = null;
    switch (this.params.positionType) {
      case 0:
        dstRect = null;
        break;
      case 1:
        dstRect = new Rect(this.params.box.x, this.params.box.y, this.params.box.size.width, this.params.box.size.height);
    }
    if (!GameManager.tempFields.choices) {
      GameManager.tempFields.choices = [];
    }
    choices = GameManager.tempFields.choices;
    return choices.push({
      dstRect: dstRect,
      text: this.params.text,
      index: index,
      action: this.params.action,
      isSelected: false,
      isDefault: this.params.defaultChoice,
      isEnabled: this.interpreter.booleanValueOf(this.params.enabled)
    });
  };


  /**
  * @method commandOpenMenu
  * @protected
   */

  Component_CommandInterpreter.prototype.commandOpenMenu = function() {
    SceneManager.switchTo(new gs.Object_Layout("menuLayout"), true);
    this.interpreter.waitCounter = 1;
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandOpenLoadMenu
  * @protected
   */

  Component_CommandInterpreter.prototype.commandOpenLoadMenu = function() {
    SceneManager.switchTo(new gs.Object_Layout("loadMenuLayout"), true);
    this.interpreter.waitCounter = 1;
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandOpenSaveMenu
  * @protected
   */

  Component_CommandInterpreter.prototype.commandOpenSaveMenu = function() {
    SceneManager.switchTo(new gs.Object_Layout("saveMenuLayout"), true);
    this.interpreter.waitCounter = 1;
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandReturnToTitle
  * @protected
   */

  Component_CommandInterpreter.prototype.commandReturnToTitle = function() {
    SceneManager.clear();
    SceneManager.switchTo(new gs.Object_Layout("titleLayout"));
    this.interpreter.waitCounter = 1;
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandPlayVideo
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPlayVideo = function() {
    var ref, scene;
    if ((GameManager.inLivePreview || GameManager.settings.allowVideoSkip) && GameManager.tempSettings.skip) {
      return;
    }
    GameManager.tempSettings.skip = false;
    scene = SceneManager.scene;
    if (((ref = this.params.video) != null ? ref.name : void 0) != null) {
      scene.video = ResourceManager.getVideo("Movies/" + this.params.video.name);
      this.videoSprite = new Sprite(Graphics.viewport);
      this.videoSprite.srcRect = new Rect(0, 0, scene.video.width, scene.video.height);
      this.videoSprite.video = scene.video;
      this.videoSprite.zoomX = Graphics.width / scene.video.width;
      this.videoSprite.zoomY = Graphics.height / scene.video.height;
      this.videoSprite.z = 99999999;
      scene.video.onEnded = (function(_this) {
        return function() {
          _this.interpreter.isWaiting = false;
          _this.videoSprite.dispose();
          return scene.video = null;
        };
      })(this);
      scene.video.volume = this.params.volume / 100;
      scene.video.playbackRate = this.params.playbackRate / 100;
      this.interpreter.isWaiting = true;
      scene.video.play();
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandAudioDefaults
  * @protected
   */

  Component_CommandInterpreter.prototype.commandAudioDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.audio;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.musicFadeInDuration)) {
      defaults.musicFadeInDuration = this.params.musicFadeInDuration;
    }
    if (!isLocked(flags.musicFadeOutDuration)) {
      defaults.musicFadeOutDuration = this.params.musicFadeOutDuration;
    }
    if (!isLocked(flags.musicVolume)) {
      defaults.musicVolume = this.params.musicVolume;
    }
    if (!isLocked(flags.musicPlaybackRate)) {
      defaults.musicPlaybackRate = this.params.musicPlaybackRate;
    }
    if (!isLocked(flags.soundVolume)) {
      defaults.soundVolume = this.params.soundVolume;
    }
    if (!isLocked(flags.soundPlaybackRate)) {
      defaults.soundPlaybackRate = this.params.soundPlaybackRate;
    }
    if (!isLocked(flags.voiceVolume)) {
      defaults.voiceVolume = this.params.voiceVolume;
    }
    if (!isLocked(flags.voicePlaybackRate)) {
      return defaults.voicePlaybackRate = this.params.voicePlaybackRate;
    }
  };


  /**
  * @method commandPlayMusic
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPlayMusic = function() {
    var defaults, fadeDuration, flags, isLocked, music, playRange, playTime, playbackRate, volume;
    if (this.params.music == null) {
      return;
    }
    defaults = GameManager.defaults.audio;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (GameManager.settings.bgmEnabled) {
      fadeDuration = !isLocked(flags.fadeInDuration) ? this.params.fadeInDuration : defaults.musicFadeInDuration;
      volume = !isLocked(flags["music.volume"]) ? this.params.music.volume : defaults.musicVolume;
      playbackRate = !isLocked(flags["music.playbackRate"]) ? this.params.music.playbackRate : defaults.musicPlaybackRate;
      music = {
        name: this.params.music.name,
        volume: volume,
        playbackRate: playbackRate
      };
      if (this.params.playType === 1) {
        playTime = {
          min: this.params.playTime.min * 60,
          max: this.params.playTime.max * 60
        };
        playRange = {
          start: this.params.playRange.start * 60,
          end: this.params.playRange.end * 60
        };
        AudioManager.playMusicRandom(music, fadeDuration, this.params.layer || 0, playTime, playRange);
      } else {
        AudioManager.playMusic(this.params.music.name, volume, playbackRate, fadeDuration, this.params.layer || 0);
      }
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandStopMusic
  * @protected
   */

  Component_CommandInterpreter.prototype.commandStopMusic = function() {
    var defaults, fadeDuration, flags, isLocked;
    defaults = GameManager.defaults.audio;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    fadeDuration = !isLocked(flags.fadeOutDuration) ? this.params.fadeOutDuration : defaults.musicFadeOutDuration;
    AudioManager.stopMusic(fadeDuration, this.interpreter.numberValueOf(this.params.layer));
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandPauseMusic
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPauseMusic = function() {
    var defaults, fadeDuration, flags, isLocked;
    defaults = GameManager.defaults.audio;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    fadeDuration = !isLocked(flags.fadeOutDuration) ? this.params.fadeOutDuration : defaults.musicFadeOutDuration;
    return AudioManager.stopMusic(fadeDuration, this.interpreter.numberValueOf(this.params.layer));
  };


  /**
  * @method commandResumeMusic
  * @protected
   */

  Component_CommandInterpreter.prototype.commandResumeMusic = function() {
    var defaults, fadeDuration, flags, isLocked;
    defaults = GameManager.defaults.audio;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    fadeDuration = !isLocked(flags.fadeInDuration) ? this.params.fadeInDuration : defaults.musicFadeInDuration;
    AudioManager.resumeMusic(fadeDuration, this.interpreter.numberValueOf(this.params.layer));
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandPlaySound
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPlaySound = function() {
    var defaults, flags, isLocked, playbackRate, volume;
    defaults = GameManager.defaults.audio;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (GameManager.settings.soundEnabled && !GameManager.tempSettings.skip) {
      volume = !isLocked(flags["sound.volume"]) ? this.params.sound.volume : defaults.soundVolume;
      playbackRate = !isLocked(flags["sound.playbackRate"]) ? this.params.sound.playbackRate : defaults.soundPlaybackRate;
      AudioManager.playSound(this.params.sound.name, volume, playbackRate, this.params.musicEffect);
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandStopSound
  * @protected
   */

  Component_CommandInterpreter.prototype.commandStopSound = function() {
    AudioManager.stopSound(this.params.sound.name);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandEndCommonEvent
  * @protected
   */

  Component_CommandInterpreter.prototype.commandEndCommonEvent = function() {
    var event, eventId;
    eventId = this.interpreter.stringValueOf(this.params.commonEventId);
    event = GameManager.commonEvents[eventId];
    return event != null ? event.behavior.stop() : void 0;
  };


  /**
  * @method commandResumeCommonEvent
  * @protected
   */

  Component_CommandInterpreter.prototype.commandResumeCommonEvent = function() {
    var event, eventId;
    eventId = this.interpreter.stringValueOf(this.params.commonEventId);
    event = GameManager.commonEvents[eventId];
    return event != null ? event.behavior.resume() : void 0;
  };


  /**
  * @method commandCallCommonEvent
  * @protected
   */

  Component_CommandInterpreter.prototype.commandCallCommonEvent = function() {
    var eventId, list, params, scene;
    scene = SceneManager.scene;
    eventId = null;
    if (this.params.commonEventId.index != null) {
      eventId = this.interpreter.stringValueOf(this.params.commonEventId);
      list = this.interpreter.listObjectOf(this.params.parameters.values[0]);
      params = {
        values: list
      };
    } else {
      params = this.params.parameters;
      eventId = this.params.commonEventId;
    }
    return this.interpreter.callCommonEvent(eventId, params);
  };


  /**
  * @method commandChangeTextSettings
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeTextSettings = function() {
    var flags, font, fontName, fontSize, isLocked, number, padding, ref, ref1, ref2, ref3, ref4, scene, textSprite, texts;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    texts = scene.texts;
    if (texts[number] == null) {
      texts[number] = new gs.Object_Text();
      texts[number].visible = false;
    }
    textSprite = texts[number];
    padding = textSprite.behavior.padding;
    font = textSprite.font;
    fontName = textSprite.font.name;
    fontSize = textSprite.font.size;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.lineSpacing)) {
      textSprite.textRenderer.lineSpacing = (ref = this.params.lineSpacing) != null ? ref : textSprite.textRenderer.lineSpacing;
    }
    if (!isLocked(flags.font)) {
      fontName = this.interpreter.stringValueOf(this.params.font);
    }
    if (!isLocked(flags.size)) {
      fontSize = this.interpreter.numberValueOf(this.params.size);
    }
    if (!isLocked(flags.font) || !isLocked(flags.size)) {
      textSprite.font = new Font(fontName, fontSize);
    }
    padding.left = !isLocked(flags["padding.0"]) ? (ref1 = this.params.padding) != null ? ref1[0] : void 0 : padding.left;
    padding.top = !isLocked(flags["padding.1"]) ? (ref2 = this.params.padding) != null ? ref2[1] : void 0 : padding.top;
    padding.right = !isLocked(flags["padding.2"]) ? (ref3 = this.params.padding) != null ? ref3[2] : void 0 : padding.right;
    padding.bottom = !isLocked(flags["padding.3"]) ? (ref4 = this.params.padding) != null ? ref4[3] : void 0 : padding.bottom;
    if (!isLocked(flags.bold)) {
      textSprite.font.bold = this.params.bold;
    }
    if (!isLocked(flags.italic)) {
      textSprite.font.italic = this.params.italic;
    }
    if (!isLocked(flags.smallCaps)) {
      textSprite.font.smallCaps = this.params.smallCaps;
    }
    if (!isLocked(flags.underline)) {
      textSprite.font.underline = this.params.underline;
    }
    if (!isLocked(flags.strikeThrough)) {
      textSprite.font.strikeThrough = this.params.strikeThrough;
    }
    textSprite.font.color = !isLocked(flags.color) ? new Color(this.params.color) : font.color;
    textSprite.font.border = !isLocked(flags.outline) ? this.params.outline : font.border;
    textSprite.font.borderColor = !isLocked(flags.outlineColor) ? new Color(this.params.outlineColor) : new Color(font.borderColor);
    textSprite.font.borderSize = !isLocked(flags.outlineSize) ? this.params.outlineSize : font.borderSize;
    textSprite.font.shadow = !isLocked(flags.shadow) ? this.params.shadow : font.shadow;
    textSprite.font.shadowColor = !isLocked(flags.shadowColor) ? new Color(this.params.shadowColor) : new Color(font.shadowColor);
    textSprite.font.shadowOffsetX = !isLocked(flags.shadowOffsetX) ? this.params.shadowOffsetX : font.shadowOffsetX;
    textSprite.font.shadowOffsetY = !isLocked(flags.shadowOffsetY) ? this.params.shadowOffsetY : font.shadowOffsetY;
    textSprite.behavior.refresh();
    return textSprite.update();
  };


  /**
  * @method commandChangeTextSettings
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTextDefaults = function() {
    var defaults, flags, isLocked;
    defaults = GameManager.defaults.text;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    if (!isLocked(flags.appearDuration)) {
      defaults.appearDuration = this.interpreter.durationValueOf(this.params.appearDuration);
    }
    if (!isLocked(flags.disappearDuration)) {
      defaults.disappearDuration = this.interpreter.durationValueOf(this.params.disappearDuration);
    }
    if (!isLocked(flags.zOrder)) {
      defaults.zOrder = this.interpreter.numberValueOf(this.params.zOrder);
    }
    if (!isLocked(flags["appearEasing.type"])) {
      defaults.appearEasing = this.params.appearEasing;
    }
    if (!isLocked(flags["appearAnimation.type"])) {
      defaults.appearAnimation = this.params.appearAnimation;
    }
    if (!isLocked(flags["disappearEasing.type"])) {
      defaults.disappearEasing = this.params.disappearEasing;
    }
    if (!isLocked(flags["disappearAnimation.type"])) {
      defaults.disappearAnimation = this.params.disappearAnimation;
    }
    if (!isLocked(flags["motionBlur.enabled"])) {
      defaults.motionBlur = this.params.motionBlur;
    }
    if (!isLocked(flags.origin)) {
      return defaults.origin = this.params.origin;
    }
  };


  /**
  * @method commandShowText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandShowText = function() {
    var animation, defaults, duration, easing, flags, isLocked, number, origin, p, positionAnchor, ref, scene, text, textObject, texts, x, y, zIndex;
    defaults = GameManager.defaults.text;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = this.params.text;
    texts = scene.texts;
    if (texts[number] == null) {
      texts[number] = new gs.Object_Text();
    }
    x = this.interpreter.numberValueOf(this.params.position.x);
    y = this.interpreter.numberValueOf(this.params.position.y);
    textObject = texts[number];
    textObject.domain = this.params.numberDomain;
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.appearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.appearDuration;
    origin = !isLocked(flags.origin) ? this.params.origin : defaults.origin;
    zIndex = !isLocked(flags.zOrder) ? this.interpreter.numberValueOf(this.params.zOrder) : defaults.zOrder;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.appearAnimation;
    positionAnchor = !isLocked(flags.positionOrigin) ? this.interpreter.graphicAnchorPointsByConstant[this.params.positionOrigin] || new gs.Point(0, 0) : this.interpreter.graphicAnchorPointsByConstant[defaults.positionOrigin];
    textObject.text = text;
    textObject.dstRect.x = x;
    textObject.dstRect.y = y;
    textObject.blendMode = this.interpreter.numberValueOf(this.params.blendMode);
    textObject.anchor.x = origin === 0 ? 0 : 0.5;
    textObject.anchor.y = origin === 0 ? 0 : 0.5;
    textObject.positionAnchor.x = positionAnchor.x;
    textObject.positionAnchor.y = positionAnchor.y;
    textObject.zIndex = zIndex || (700 + number);
    textObject.sizeToFit = true;
    textObject.formatting = true;
    if (((ref = this.params.viewport) != null ? ref.type : void 0) === "scene") {
      textObject.viewport = SceneManager.scene.behavior.viewport;
    }
    textObject.update();
    if (this.params.positionType === 0) {
      p = this.interpreter.predefinedObjectPosition(this.params.predefinedPositionId, textObject, this.params);
      textObject.dstRect.x = p.x;
      textObject.dstRect.y = p.y;
    }
    textObject.animator.appear(x, y, animation, easing, duration);
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandTextMotionBlur
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTextMotionBlur = function() {
    var number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    return text.motionBlur.set(this.params.motionBlur);
  };


  /**
  * @method commandRefreshText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRefreshText = function() {
    var number, scene, texts;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    texts = scene.texts;
    if (texts[number] == null) {
      return;
    }
    return texts[number].behavior.refresh(true);
  };


  /**
  * @method commandMoveText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMoveText = function() {
    var number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    this.interpreter.moveObject(text, this.params.picture.position, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandMoveTextPath
  * @protected
   */

  Component_CommandInterpreter.prototype.commandMoveTextPath = function() {
    var number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    this.interpreter.moveObjectPath(text, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandRotateText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandRotateText = function() {
    var number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    this.interpreter.rotateObject(text, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandZoomText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandZoomText = function() {
    var number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    this.interpreter.zoomObject(text, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandBlendText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandBlendText = function() {
    var text;
    SceneManager.scene.behavior.changeTextDomain(this.params.numberDomain);
    text = SceneManager.scene.texts[this.interpreter.numberValueOf(this.params.number)];
    if (text == null) {
      return;
    }
    this.interpreter.blendObject(text, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandColorText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandColorText = function() {
    var duration, easing, number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    duration = this.interpreter.durationValueOf(this.params.duration);
    easing = gs.Easings.fromObject(this.params.easing);
    if (text != null) {
      text.animator.colorTo(new Color(this.params.color), duration, easing);
      if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
        this.interpreter.isWaiting = true;
        this.interpreter.waitCounter = duration;
      }
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandEraseText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandEraseText = function() {
    var animation, defaults, duration, easing, flags, isLocked, number, scene, text;
    defaults = GameManager.defaults.text;
    flags = this.params.fieldFlags || {};
    isLocked = gs.CommandFieldFlags.isLocked;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    easing = !isLocked(flags["easing.type"]) ? gs.Easings.fromValues(this.interpreter.numberValueOf(this.params.easing.type), this.params.easing.inOut) : gs.Easings.fromObject(defaults.disappearEasing);
    duration = !isLocked(flags.duration) ? this.interpreter.durationValueOf(this.params.duration) : defaults.disappearDuration;
    animation = !isLocked(flags["animation.type"]) ? this.params.animation : defaults.disappearAnimation;
    text.animator.disappear(animation, easing, duration, (function(_this) {
      return function(sender) {
        sender.dispose();
        scene.behavior.changeTextDomain(sender.domain);
        return scene.texts[number] = null;
      };
    })(this));
    if (this.params.waitForCompletion && !(duration === 0 || this.interpreter.isInstantSkip())) {
      this.interpreter.isWaiting = true;
      this.interpreter.waitCounter = duration;
    }
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandTextEffect
  * @protected
   */

  Component_CommandInterpreter.prototype.commandTextEffect = function() {
    var number, scene, text;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    number = this.interpreter.numberValueOf(this.params.number);
    text = scene.texts[number];
    if (text == null) {
      return;
    }
    this.interpreter.objectEffect(text, this.params);
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandInputText
  * @protected
   */

  Component_CommandInterpreter.prototype.commandInputText = function() {
    var scene;
    scene = SceneManager.scene;
    scene.behavior.changeTextDomain(this.params.numberDomain);
    if ((GameManager.settings.allowChoiceSkip || this.interpreter.preview) && GameManager.tempSettings.skip) {
      this.interpreter.messageObject().behavior.clear();
      this.interpreter.setStringValueTo(this.params.variable, "");
      return;
    }
    this.interpreter.isWaiting = true;
    if (this.interpreter.isProcessingMessageInOtherContext()) {
      this.interpreter.waitForMessage();
      return;
    }
    $tempFields.letters = this.params.letters;
    scene.behavior.showInputText(this.params.letters, gs.CallBack("onInputTextFinish", this.interpreter, this.interpreter));
    this.interpreter.waitingFor.inputText = this.params;
    return gs.GameNotifier.postMinorChange();
  };


  /**
  * @method commandSavePersistentData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSavePersistentData = function() {
    return GameManager.saveGlobalData();
  };


  /**
  * @method commandSaveSettings
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSaveSettings = function() {
    return GameManager.saveSettings();
  };


  /**
  * @method commandPrepareSaveGame
  * @protected
   */

  Component_CommandInterpreter.prototype.commandPrepareSaveGame = function() {
    if (this.interpreter.previewData != null) {
      return;
    }
    this.interpreter.pointer++;
    GameManager.prepareSaveGame(this.params.snapshot);
    return this.interpreter.pointer--;
  };


  /**
  * @method commandSaveGame
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSaveGame = function() {
    var thumbHeight, thumbWidth;
    if (this.interpreter.previewData != null) {
      return;
    }
    thumbWidth = this.interpreter.numberValueOf(this.params.thumbWidth);
    thumbHeight = this.interpreter.numberValueOf(this.params.thumbHeight);
    return GameManager.save(this.interpreter.numberValueOf(this.params.slot) - 1, thumbWidth, thumbHeight);
  };


  /**
  * @method commandLoadGame
  * @protected
   */

  Component_CommandInterpreter.prototype.commandLoadGame = function() {
    if (this.interpreter.previewData != null) {
      return;
    }
    return GameManager.load(this.interpreter.numberValueOf(this.params.slot) - 1);
  };


  /**
  * @method commandWaitForInput
  * @protected
   */

  Component_CommandInterpreter.prototype.commandWaitForInput = function() {
    var f;
    gs.GlobalEventManager.offByOwner("mouseDown", this.object);
    gs.GlobalEventManager.offByOwner("mouseUp", this.object);
    gs.GlobalEventManager.offByOwner("keyDown", this.object);
    gs.GlobalEventManager.offByOwner("keyUp", this.object);
    f = (function(_this) {
      return function() {
        var executeAction;
        executeAction = false;
        if (Input.Mouse.isButton(_this.params.key)) {
          executeAction = Input.Mouse.buttons[_this.params.key] === _this.params.state;
        } else {
          executeAction = Input.keys[_this.params.key] === _this.params.state;
        }
        if (executeAction) {
          _this.interpreter.isWaiting = false;
          gs.GlobalEventManager.offByOwner("mouseDown", _this.object);
          gs.GlobalEventManager.offByOwner("mouseUp", _this.object);
          gs.GlobalEventManager.offByOwner("keyDown", _this.object);
          return gs.GlobalEventManager.offByOwner("keyUp", _this.object);
        }
      };
    })(this);
    gs.GlobalEventManager.on("mouseDown", f, null, this.object);
    gs.GlobalEventManager.on("mouseUp", f, null, this.object);
    gs.GlobalEventManager.on("keyDown", f, null, this.object);
    gs.GlobalEventManager.on("KeyUp", f, null, this.object);
    return this.interpreter.isWaiting = true;
  };


  /**
  * @method commandGetInputData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandGetInputData = function() {
    switch (this.params.field) {
      case 0:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.A]);
      case 1:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.B]);
      case 2:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.X]);
      case 3:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.Y]);
      case 4:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.L]);
      case 5:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.R]);
      case 6:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.START]);
      case 7:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.keys[Input.SELECT]);
      case 8:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.Mouse.x);
      case 9:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.Mouse.y);
      case 10:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.Mouse.wheel);
      case 11:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.Mouse.buttons[Input.Mouse.LEFT]);
      case 12:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.Mouse.buttons[Input.Mouse.RIGHT]);
      case 13:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Input.Mouse.buttons[Input.Mouse.MIDDLE]);
    }
  };


  /**
  * @method commandGetGameData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandGetGameData = function() {
    var ref, ref1, settings, tempSettings;
    tempSettings = GameManager.tempSettings;
    settings = GameManager.settings;
    switch (this.params.field) {
      case 0:
        return this.interpreter.setStringValueTo(this.params.targetVariable, SceneManager.scene.sceneDocument.uid);
      case 1:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(Graphics.frameCount / 60));
      case 2:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(Graphics.frameCount / 60 / 60));
      case 3:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(Graphics.frameCount / 60 / 60 / 60));
      case 4:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, new Date().getDate());
      case 5:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, new Date().getDay());
      case 6:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, new Date().getMonth());
      case 7:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, new Date().getFullYear());
      case 8:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.allowSkip);
      case 9:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.allowSkipUnreadMessages);
      case 10:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, settings.messageSpeed);
      case 11:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.autoMessage.enabled);
      case 12:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, settings.autoMessage.time);
      case 13:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.autoMessage.waitForVoice);
      case 14:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.autoMessage.stopOnAction);
      case 15:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.timeMessageToVoice);
      case 16:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.allowVideoSkip);
      case 17:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.allowChoiceSkip);
      case 18:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.skipVoiceOnAction);
      case 19:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.fullScreen);
      case 20:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.adjustAspectRatio);
      case 21:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.confirmation);
      case 22:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, settings.bgmVolume);
      case 23:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, settings.voiceVolume);
      case 24:
        return this.interpreter.setNumberValueTo(this.params.targetVariable, settings.seVolume);
      case 25:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.bgmEnabled);
      case 26:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.voiceEnabled);
      case 27:
        return this.interpreter.setBooleanValueTo(this.params.targetVariable, settings.seEnabled);
      case 28:
        return this.interpreter.setStringValueTo(this.params.targetVariable, ((ref = LanguageManager.language) != null ? ref.code : void 0) || "");
      case 29:
        return this.interpreter.setStringValueTo(this.params.targetVariable, ((ref1 = LanguageManager.language) != null ? ref1.name : void 0) || "");
    }
  };


  /**
  * @method commandSetGameData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSetGameData = function() {
    var code, language, settings, tempSettings;
    tempSettings = GameManager.tempSettings;
    settings = GameManager.settings;
    switch (this.params.field) {
      case 0:
        return settings.allowSkip = this.interpreter.booleanValueOf(this.params.switchValue);
      case 1:
        return settings.allowSkipUnreadMessages = this.interpreter.booleanValueOf(this.params.switchValue);
      case 2:
        return settings.messageSpeed = this.interpreter.numberValueOf(this.params.numberValue);
      case 3:
        return settings.autoMessage.enabled = this.interpreter.booleanValueOf(this.params.switchValue);
      case 4:
        return settings.autoMessage.time = this.interpreter.numberValueOf(this.params.numberValue);
      case 5:
        return settings.autoMessage.waitForVoice = this.interpreter.booleanValueOf(this.params.switchValue);
      case 6:
        return settings.autoMessage.stopOnAction = this.interpreter.booleanValueOf(this.params.switchValue);
      case 7:
        return settings.timeMessageToVoice = this.interpreter.booleanValueOf(this.params.switchValue);
      case 8:
        return settings.allowVideoSkip = this.interpreter.booleanValueOf(this.params.switchValue);
      case 9:
        return settings.allowChoiceSkip = this.interpreter.booleanValueOf(this.params.switchValue);
      case 10:
        return settings.skipVoiceOnAction = this.interpreter.booleanValueOf(this.params.switchValue);
      case 11:
        settings.fullScreen = this.interpreter.booleanValueOf(this.params.switchValue);
        if (settings.fullScreen) {
          return SceneManager.scene.behavior.enterFullScreen();
        } else {
          return SceneManager.scene.behavior.leaveFullScreen();
        }
        break;
      case 12:
        settings.adjustAspectRatio = this.interpreter.booleanValueOf(this.params.switchValue);
        Graphics.keepRatio = settings.adjustAspectRatio;
        return Graphics.onResize();
      case 13:
        return settings.confirmation = this.interpreter.booleanValueOf(this.params.switchValue);
      case 14:
        return settings.bgmVolume = this.interpreter.numberValueOf(this.params.numberValue);
      case 15:
        return settings.voiceVolume = this.interpreter.numberValueOf(this.params.numberValue);
      case 16:
        return settings.seVolume = this.interpreter.numberValueOf(this.params.numberValue);
      case 17:
        return settings.bgmEnabled = this.interpreter.booleanValueOf(this.params.switchValue);
      case 18:
        return settings.voiceEnabled = this.interpreter.booleanValueOf(this.params.switchValue);
      case 19:
        return settings.seEnabled = this.interpreter.booleanValueOf(this.params.switchValue);
      case 20:
        code = this.interpreter.stringValueOf(this.params.textValue);
        language = LanguageManager.languages.first((function(_this) {
          return function(l) {
            return l.code === code;
          };
        })(this));
        if (language) {
          return LanguageManager.selectLanguage(language);
        }
    }
  };


  /**
  * @method commandGetObjectData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandGetObjectData = function() {
    debugger;
    var area, characterId, field, object, ref, ref1, scene;
    scene = SceneManager.scene;
    switch (this.params.objectType) {
      case 0:
        scene.behavior.changePictureDomain(this.params.numberDomain);
        object = SceneManager.scene.pictures[this.interpreter.numberValueOf(this.params.number)];
        break;
      case 1:
        object = SceneManager.scene.backgrounds[this.interpreter.numberValueOf(this.params.layer)];
        break;
      case 2:
        scene.behavior.changeTextDomain(this.params.numberDomain);
        object = SceneManager.scene.texts[this.interpreter.numberValueOf(this.params.number)];
        break;
      case 3:
        scene.behavior.changeVideoDomain(this.params.numberDomain);
        object = SceneManager.scene.videos[this.interpreter.numberValueOf(this.params.number)];
        break;
      case 4:
        characterId = this.interpreter.stringValueOf(this.params.characterId);
        object = SceneManager.scene.characters.first((function(_this) {
          return function(v) {
            return !v.disposed && v.rid === characterId;
          };
        })(this));
        break;
      case 5:
        object = gs.ObjectManager.current.objectById("messageBox");
        break;
      case 6:
        scene.behavior.changeMessageAreaDomain(this.params.numberDomain);
        area = SceneManager.scene.messageAreas[this.interpreter.numberValueOf(this.params.number)];
        object = area != null ? area.layout : void 0;
        break;
      case 7:
        scene.behavior.changeHotspotDomain(this.params.numberDomain);
        object = SceneManager.scene.hotspots[this.interpreter.numberValueOf(this.params.number)];
    }
    field = this.params.field;
    if (this.params.objectType === 4) {
      switch (this.params.field) {
        case 0:
          this.interpreter.setStringValueTo(this.params.targetVariable, ((ref = RecordManager.characters[characterId]) != null ? ref.index : void 0) || "");
          break;
        case 1:
          this.interpreter.setStringValueTo(this.params.targetVariable, lcs((ref1 = RecordManager.characters[characterId]) != null ? ref1.name : void 0) || "");
      }
      field -= 2;
    }
    if (object != null) {
      if (field >= 0) {
        switch (field) {
          case 0:
            switch (this.params.objectType) {
              case 2:
                return this.interpreter.setStringValueTo(this.params.targetVariable, object.text || "");
              case 3:
                return this.interpreter.setStringValueTo(this.params.targetVariable, object.video || "");
              default:
                return this.interpreter.setStringValueTo(this.params.targetVariable, object.image || "");
            }
            break;
          case 1:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.dstRect.x);
          case 2:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.dstRect.y);
          case 3:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(object.anchor.x * 100));
          case 4:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(object.anchor.y * 100));
          case 5:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(object.zoom.x * 100));
          case 6:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, Math.round(object.zoom.y * 100));
          case 7:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.dstRect.width);
          case 8:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.dstRect.height);
          case 9:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.zIndex);
          case 10:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.opacity);
          case 11:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.angle);
          case 12:
            return this.interpreter.setBooleanValueTo(this.params.targetVariable, object.visible);
          case 13:
            return this.interpreter.setNumberValueTo(this.params.targetVariable, object.blendMode);
          case 14:
            return this.interpreter.setBooleanValueTo(this.params.targetVariable, object.mirror);
        }
      }
    }
  };


  /**
  * @method commandSetObjectData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandSetObjectData = function() {
    var area, characterId, field, name, object, ref, scene;
    scene = SceneManager.scene;
    switch (this.params.objectType) {
      case 0:
        scene.behavior.changePictureDomain(this.params.numberDomain);
        object = SceneManager.scene.pictures[this.interpreter.numberValueOf(this.params.number)];
        break;
      case 1:
        object = SceneManager.scene.backgrounds[this.interpreter.numberValueOf(this.params.layer)];
        break;
      case 2:
        scene.behavior.changeTextDomain(this.params.numberDomain);
        object = SceneManager.scene.texts[this.interpreter.numberValueOf(this.params.number)];
        break;
      case 3:
        scene.behavior.changeVideoDomain(this.params.numberDomain);
        object = SceneManager.scene.videos[this.interpreter.numberValueOf(this.params.number)];
        break;
      case 4:
        characterId = this.interpreter.stringValueOf(this.params.characterId);
        object = SceneManager.scene.characters.first((function(_this) {
          return function(v) {
            return !v.disposed && v.rid === characterId;
          };
        })(this));
        break;
      case 5:
        object = gs.ObjectManager.current.objectById("messageBox");
        break;
      case 6:
        scene.behavior.changeMessageAreaDomain(this.params.numberDomain);
        area = SceneManager.scene.messageAreas[this.interpreter.numberValueOf(this.params.number)];
        object = area != null ? area.layout : void 0;
        break;
      case 7:
        scene.behavior.changeHotspotDomain(this.params.numberDomain);
        object = SceneManager.scene.hotspots[this.interpreter.numberValueOf(this.params.number)];
    }
    field = this.params.field;
    if (this.params.objectType === 4) {
      switch (field) {
        case 0:
          name = this.interpreter.stringValueOf(this.params.textValue);
          if (object != null) {
            object.name = name;
          }
          if ((ref = RecordManager.characters[characterId]) != null) {
            ref.name = name;
          }
      }
      field--;
    }
    if (object != null) {
      if (field >= 0) {
        switch (field) {
          case 0:
            switch (this.params.objectType) {
              case 2:
                return object.text = this.interpreter.stringValueOf(this.params.textValue);
              case 3:
                return object.video = this.interpreter.stringValueOf(this.params.textValue);
              default:
                return object.image = this.interpreter.stringValueOf(this.params.textValue);
            }
            break;
          case 1:
            return object.dstRect.x = this.interpreter.numberValueOf(this.params.numberValue);
          case 2:
            return object.dstRect.y = this.interpreter.numberValueOf(this.params.numberValue);
          case 3:
            return object.anchor.x = this.interpreter.numberValueOf(this.params.numberValue) / 100;
          case 4:
            return object.anchor.y = this.interpreter.numberValueOf(this.params.numberValue) / 100;
          case 5:
            return object.zoom.x = this.interpreter.numberValueOf(this.params.numberValue) / 100;
          case 6:
            return object.zoom.y = this.interpreter.numberValueOf(this.params.numberValue) / 100;
          case 7:
            return object.zIndex = this.interpreter.numberValueOf(this.params.numberValue);
          case 8:
            return object.opacity = this.interpreter.numberValueOf(this.params.numberValue);
          case 9:
            return object.angle = this.interpreter.numberValueOf(this.params.numberValue);
          case 10:
            return object.visible = this.interpreter.booleanValueOf(this.params.switchValue);
          case 11:
            return object.blendMode = this.interpreter.numberValueOf(this.params.numberValue);
          case 12:
            return object.mirror = this.interpreter.booleanValueOf(this.params.switchValue);
        }
      }
    }
  };


  /**
  * @method commandChangeSounds
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeSounds = function() {
    var fieldFlags, i, k, len, ref, results, sound, sounds;
    sounds = RecordManager.system.sounds;
    fieldFlags = this.params.fieldFlags || {};
    ref = this.params.sounds;
    results = [];
    for (i = k = 0, len = ref.length; k < len; i = ++k) {
      sound = ref[i];
      if (!gs.CommandFieldFlags.isLocked(fieldFlags["sounds." + i])) {
        results.push(sounds[i] = this.params.sounds[i]);
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * @method commandChangeColors
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeColors = function() {
    var color, colors, fieldFlags, i, k, len, ref, results;
    colors = RecordManager.system.colors;
    fieldFlags = this.params.fieldFlags || {};
    ref = this.params.colors;
    results = [];
    for (i = k = 0, len = ref.length; k < len; i = ++k) {
      color = ref[i];
      if (!gs.CommandFieldFlags.isLocked(fieldFlags["colors." + i])) {
        results.push(colors[i] = new gs.Color(this.params.colors[i]));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * @method commandChangeScreenCursor
  * @protected
   */

  Component_CommandInterpreter.prototype.commandChangeScreenCursor = function() {
    var bitmap, ref;
    if (((ref = this.params.graphic) != null ? ref.name : void 0) != null) {
      bitmap = ResourceManager.getBitmap("Graphics/Pictures/" + this.params.graphic.name);
      return Graphics.setCursorBitmap(bitmap, this.params.hx, this.params.hy);
    } else {
      return Graphics.setCursorBitmap(null, 0, 0);
    }
  };


  /**
  * @method commandResetGlobalData
  * @protected
   */

  Component_CommandInterpreter.prototype.commandResetGlobalData = function() {
    return GameManager.resetGlobalData();
  };


  /**
  * @method commandScript
  * @protected
   */

  Component_CommandInterpreter.prototype.commandScript = function() {
    var ex;
    try {
      if (!this.params.scriptFunc) {
        this.params.scriptFunc = eval("(function(){" + this.params.script + "})");
      }
      return this.params.scriptFunc();
    } catch (error) {
      ex = error;
      return console.log(ex);
    }
  };

  return Component_CommandInterpreter;

})(gs.Component);

window.CommandInterpreter = Component_CommandInterpreter;

gs.Component_CommandInterpreter = Component_CommandInterpreter;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVFBLElBQUEsaUVBQUE7RUFBQTs7O0FBQU07O0FBQ0Y7Ozs7Ozs7RUFPYSx5QkFBQTs7QUFDVDs7Ozs7SUFLQSxJQUFDLENBQUEsT0FBRCxHQUFXOztBQUVYOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBRVg7Ozs7Ozs7SUFPQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0I7RUF0Qlg7Ozs7OztBQXdCakIsRUFBRSxDQUFDLGVBQUgsR0FBcUI7O0FBRWY7RUFDRixrQkFBQyxDQUFBLG9CQUFELEdBQXdCLENBQUMsT0FBRDs7O0FBRXhCOzs7Ozs7Ozs7Ozs7RUFXYSw0QkFBQyxFQUFELEVBQUssS0FBTDs7QUFDVDs7Ozs7SUFLQSxJQUFDLENBQUEsRUFBRCxHQUFNOztBQUVOOzs7OztJQUtBLElBQUMsQ0FBQSxLQUFELEdBQVM7RUFiQTs7O0FBZWI7Ozs7Ozs7K0JBTUEsR0FBQSxHQUFLLFNBQUMsRUFBRCxFQUFLLEtBQUw7SUFDRCxJQUFDLENBQUEsRUFBRCxHQUFNO1dBQ04sSUFBQyxDQUFBLEtBQUQsR0FBUztFQUZSOzs7Ozs7QUFJVCxFQUFFLENBQUMsa0JBQUgsR0FBd0I7O0FBRWxCOzs7RUFDRiw0QkFBQyxDQUFBLG9CQUFELEdBQXdCLENBQUMsUUFBRCxFQUFXLFNBQVgsRUFBc0IscUJBQXRCLEVBQTZDLHVCQUE3QyxFQUFzRSxvQkFBdEU7OztBQUV4Qjs7Ozs7Ozs7O3lDQVFBLG1CQUFBLEdBQXFCLFNBQUMsSUFBRCxFQUFPLE9BQVAsR0FBQTs7O0FBR3JCOzs7Ozs7Ozs7Ozs7O0VBWWEsc0NBQUE7SUFDVCw0REFBQTs7QUFFQTs7Ozs7SUFLQSxJQUFDLENBQUEsV0FBRCxHQUFlOztBQUVmOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBRVg7Ozs7OztJQU1BLElBQUMsQ0FBQSxVQUFELEdBQWM7O0FBRWQ7Ozs7OztJQU1BLElBQUMs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QUFDLFNBQWhCLENBQTBCLG9CQUFBLEdBQXFCLElBQUMsQ0FBQSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQS9EO2FBQ1QsUUFBUSxDQUFDLGVBQVQsQ0FBeUIsTUFBekIsRUFBaUMsSUFBQyxDQUFBLE1BQU0sQ0FBQyxFQUF6QyxFQUE2QyxJQUFDLENBQUEsTUFBTSxDQUFDLEVBQXJELEVBRko7S0FBQSxNQUFBO2FBSUksUUFBUSxDQUFDLGVBQVQsQ0FBeUIsSUFBekIsRUFBK0IsQ0FBL0IsRUFBa0MsQ0FBbEMsRUFKSjs7RUFEdUI7OztBQU8zQjs7Ozs7eUNBSUEsc0JBQUEsR0FBd0IsU0FBQTtXQUNwQixXQUFXLENBQUMsZUFBWixDQUFBO0VBRG9COzs7QUFHeEI7Ozs7O3lDQUlBLGFBQUEsR0FBZSxTQUFBO0FBQ1gsUUFBQTtBQUFBO01BQ0ksSUFBRyxDQUFDLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBWjtRQUNJLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixHQUFxQixJQUFBLENBQUssY0FBQSxHQUFpQixJQUFDLENBQUEsTUFBTSxDQUFDLE1BQXpCLEdBQWtDLElBQXZDLEVBRHpCOzthQUdBLElBQUMsQ0FBQSxNQUFNLENBQUMsVUFBUixDQUFBLEVBSko7S0FBQSxhQUFBO01BS007YUFDRixPQUFPLENBQUMsR0FBUixDQUFZLEVBQVosRUFOSjs7RUFEVzs7OztHQS9uTHdCLEVBQUUsQ0FBQzs7QUF3b0w5QyxNQUFNLENBQUMsa0JBQVAsR0FBNEI7O0FBQzVCLEVBQUUsQ0FBQyw0QkFBSCxHQUFrQyIsInNvdXJjZXNDb250ZW50IjpbIiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuI1xuIyAgIFNjcmlwdDogQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuI1xuIyAgICQkQ09QWVJJR0hUJCRcbiNcbiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jbGFzcyBMaXZlUHJldmlld0luZm9cbiAgICAjIyMqXG4gICAgKiBTdG9yZXMgaW50ZXJuYWwgcHJldmlldy1pbmZvIGlmIHRoZSBnYW1lIHJ1bnMgY3VycmVudGx5IGluIExpdmUtUHJldmlldy5cbiAgICAqICAgICAgICBcbiAgICAqIEBtb2R1bGUgZ3NcbiAgICAqIEBjbGFzcyBMaXZlUHJldmlld0luZm9cbiAgICAqIEBtZW1iZXJvZiBnc1xuICAgICMjI1xuICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICAjIyMqXG4gICAgICAgICogVGltZXIgSUQgaWYgYSB0aW1lb3V0IGZvciBsaXZlLXByZXZpZXcgd2FzIGNvbmZpZ3VyZWQgdG8gZXhpdCB0aGUgZ2FtZSBsb29wIGFmdGVyIGEgY2VydGFpbiBhbW91bnQgb2YgdGltZS5cbiAgICAgICAgKiBAcHJvcGVydHkgdGltZW91dFxuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAjIyNcbiAgICAgICAgQHRpbWVvdXQgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqIFxuICAgICAgICAqIEluZGljYXRlcyBpZiBMaXZlLVByZXZpZXcgaXMgY3VycmVudGx5IHdhaXRpbmcgZm9yIHRoZSBuZXh0IHVzZXItYWN0aW9uLiAoU2VsZWN0aW5nIGFub3RoZXIgY29tbWFuZCwgZXRjLilcbiAgICAgICAgKiBAcHJvcGVydHkgd2FpdGluZyAgXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAjIyNcbiAgICAgICAgQHdhaXRpbmcgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIENvdW50cyB0aGUgYW1vdW50IG9mIGV4ZWN1dGVkIGNvbW1hbmRzIHNpbmNlIHRoZSBsYXN0IFxuICAgICAgICAqIGludGVycHJldGVyLXBhdXNlKHdhaXRpbmcsIGV0Yy4pLiBJZiBpdHMgbW9yZSB0aGFuIDUwMCwgdGhlIGludGVycHJldGVyIHdpbGwgYXV0b21hdGljYWxseSBwYXVzZSBmb3IgMSBmcmFtZSB0byBcbiAgICAgICAgKiBhdm9pZCB0aGF0IExpdmUtUHJldmlldyBmcmVlemVzIHRoZSBFZGl0b3IgaW4gY2FzZSBvZiBlbmRsZXNzIGxvb3BzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBleGVjdXRlZENvbW1hbmRzXG4gICAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAgICMjI1xuICAgICAgICBAZXhlY3V0ZWRDb21tYW5kcyA9IDBcbiAgICAgICAgXG5ncy5MaXZlUHJldmlld0luZm8gPSBMaXZlUHJldmlld0luZm9cbiAgICAgICAgXG5jbGFzcyBJbnRlcnByZXRlckNvbnRleHRcbiAgICBAb2JqZWN0Q29kZWNCbGFja0xpc3QgPSBbXCJvd25lclwiXVxuICAgIFxuICAgICMjIypcbiAgICAqIERlc2NyaWJlcyBhbiBpbnRlcnByZXRlci1jb250ZXh0IHdoaWNoIGhvbGRzIGluZm9ybWF0aW9uIGFib3V0XG4gICAgKiB0aGUgaW50ZXJwcmV0ZXIncyBvd25lciBhbmQgYWxzbyB1bmlxdWUgSUQgdXNlZCBmb3IgYWNjZXNzaW5nIGNvcnJlY3RcbiAgICAqIGxvY2FsIHZhcmlhYmxlcy5cbiAgICAqXG4gICAgKiBAbW9kdWxlIGdzXG4gICAgKiBAY2xhc3MgSW50ZXJwcmV0ZXJDb250ZXh0XG4gICAgKiBAbWVtYmVyb2YgZ3NcbiAgICAqIEBwYXJhbSB7bnVtYmVyfHN0cmluZ30gaWQgLSBBIHVuaXF1ZSBJRFxuICAgICogQHBhcmFtIHtPYmplY3R9IG93bmVyIC0gVGhlIG93bmVyIG9mIHRoZSBpbnRlcnByZXRlclxuICAgICMjI1xuICAgIGNvbnN0cnVjdG9yOiAoaWQsIG93bmVyKSAtPlxuICAgICAgICAjIyMqXG4gICAgICAgICogQSB1bmlxdWUgbnVtZXJpYyBvciB0ZXh0dWFsIElEIHVzZWQgZm9yIGFjY2Vzc2luZyBjb3JyZWN0IGxvY2FsIHZhcmlhYmxlcy5cbiAgICAgICAgKiBAcHJvcGVydHkgaWRcbiAgICAgICAgKiBAdHlwZSBudW1iZXJ8c3RyaW5nXG4gICAgICAgICMjI1xuICAgICAgICBAaWQgPSBpZFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBvd25lciBvZiB0aGUgaW50ZXJwcmV0ZXIgKGUuZy4gY3VycmVudCBzY2VuZSwgZXRjLikuXG4gICAgICAgICogQHByb3BlcnR5IG93bmVyXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjI1xuICAgICAgICBAb3duZXIgPSBvd25lclxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIGNvbnRleHQncyBkYXRhLlxuICAgICogQHBhcmFtIHtudW1iZXJ8c3RyaW5nfSBpZCAtIEEgdW5pcXVlIElEXG4gICAgKiBAcGFyYW0ge09iamVjdH0gb3duZXIgLSBUaGUgb3duZXIgb2YgdGhlIGludGVycHJldGVyXG4gICAgKiBAbWV0aG9kIHNldFxuICAgICMjIyAgICBcbiAgICBzZXQ6IChpZCwgb3duZXIpIC0+XG4gICAgICAgIEBpZCA9IGlkXG4gICAgICAgIEBvd25lciA9IG93bmVyXG4gICAgICAgIFxuZ3MuSW50ZXJwcmV0ZXJDb250ZXh0ID0gSW50ZXJwcmV0ZXJDb250ZXh0XG5cbmNsYXNzIENvbXBvbmVudF9Db21tYW5kSW50ZXJwcmV0ZXIgZXh0ZW5kcyBncy5Db21wb25lbnRcbiAgICBAb2JqZWN0Q29kZWNCbGFja0xpc3QgPSBbXCJvYmplY3RcIiwgXCJjb21tYW5kXCIsIFwib25NZXNzYWdlQURWV2FpdGluZ1wiLCBcIm9uTWVzc2FnZUFEVkRpc2FwcGVhclwiLCBcIm9uTWVzc2FnZUFEVkZpbmlzaFwiXVxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCBpZiB0aGlzIG9iamVjdCBpbnN0YW5jZSBpcyByZXN0b3JlZCBmcm9tIGEgZGF0YS1idW5kbGUuIEl0IGNhbiBiZSB1c2VkXG4gICAgKiByZS1hc3NpZ24gZXZlbnQtaGFuZGxlciwgYW5vbnltb3VzIGZ1bmN0aW9ucywgZXRjLlxuICAgICogXG4gICAgKiBAbWV0aG9kIG9uRGF0YUJ1bmRsZVJlc3RvcmUuXG4gICAgKiBAcGFyYW0gT2JqZWN0IGRhdGEgLSBUaGUgZGF0YS1idW5kbGVcbiAgICAqIEBwYXJhbSBncy5PYmplY3RDb2RlY0NvbnRleHQgY29udGV4dCAtIFRoZSBjb2RlYy1jb250ZXh0LlxuICAgICMjI1xuICAgIG9uRGF0YUJ1bmRsZVJlc3RvcmU6IChkYXRhLCBjb250ZXh0KSAtPlxuICAgIFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBBIGNvbXBvbmVudCB3aGljaCBhbGxvd3MgYSBnYW1lIG9iamVjdCB0byBwcm9jZXNzIGNvbW1hbmRzIGxpa2UgZm9yXG4gICAgKiBzY2VuZS1vYmplY3RzLiBGb3IgZWFjaCBjb21tYW5kIGEgY29tbWFuZC1mdW5jdGlvbiBleGlzdHMuIFRvIGFkZFxuICAgICogb3duIGN1c3RvbSBjb21tYW5kcyB0byB0aGUgaW50ZXJwcmV0ZXIganVzdCBjcmVhdGUgYSBzdWItY2xhc3MgYW5kXG4gICAgKiBvdmVycmlkZSB0aGUgZ3MuQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlci5hc3NpZ25Db21tYW5kIG1ldGhvZFxuICAgICogYW5kIGFzc2lnbiB0aGUgY29tbWFuZC1mdW5jdGlvbiBmb3IgeW91ciBjdXN0b20tY29tbWFuZC5cbiAgICAqXG4gICAgKiBAbW9kdWxlIGdzXG4gICAgKiBAY2xhc3MgQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuICAgICogQGV4dGVuZHMgZ3MuQ29tcG9uZW50XG4gICAgKiBAbWVtYmVyb2YgZ3NcbiAgICAjIyNcbiAgICBjb25zdHJ1Y3RvcjogKCkgLT5cbiAgICAgICAgc3VwZXIoKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFdhaXQtQ291bnRlciBpbiBmcmFtZXMuIElmIGdyZWF0ZXIgdGhhbiAwLCB0aGUgaW50ZXJwcmV0ZXIgd2lsbCBmb3IgdGhhdCBhbW91bnQgb2YgZnJhbWVzIGJlZm9yZSBjb250aW51ZS5cbiAgICAgICAgKiBAcHJvcGVydHkgd2FpdENvdW50ZXJcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgIyMjXG4gICAgICAgIEB3YWl0Q291bnRlciA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRleCB0byB0aGUgbmV4dCBjb21tYW5kIHRvIGV4ZWN1dGUuXG4gICAgICAgICogQHByb3BlcnR5IHBvaW50ZXJcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgIyMjXG4gICAgICAgIEBwb2ludGVyID0gMFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBzdGF0ZXMgb2YgY29uZGl0aW9ucy5cbiAgICAgICAgKiBAcHJvcGVydHkgY29uZGl0aW9uc1xuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBjb25kaXRpb25zID0gW11cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBTdG9yZXMgc3RhdGVzIG9mIGxvb3BzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBsb29wc1xuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBsb29wcyA9IFtdXG4gICAgICAgIFxuICAgICAgICAjIEZJWE1FOiBTaG91bGQgbm90IGJlIHN0b3JlZCBpbiB0aGUgaW50ZXJwcmV0ZXIuXG4gICAgICAgIEB0aW1lcnMgPSBbXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgaXMgY3VycmVudGx5IHJ1bm5pbmcuXG4gICAgICAgICogQHByb3BlcnR5IGlzUnVubmluZ1xuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgKiBAcmVhZE9ubHlcbiAgICAgICAgIyMjXG4gICAgICAgIEBpc1J1bm5pbmcgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgaXMgY3VycmVudGx5IHdhaXRpbmcuXG4gICAgICAgICogQHByb3BlcnR5IGlzV2FpdGluZ1xuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgIyMjXG4gICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgaXMgY3VycmVudGx5IHdhaXRpbmcgdW50aWwgYSBtZXNzYWdlIHByb2Nlc3NlZCBieSBhbm90aGVyIGNvbnRleHQgbGlrZSBhIENvbW1vbiBFdmVudFxuICAgICAgICAqIGlzIGZpbmlzaGVkLlxuICAgICAgICAqIEZJWE1FOiBDb25mbGljdCBoYW5kbGluZyBjYW4gYmUgcmVtb3ZlZCBtYXliZS4gXG4gICAgICAgICogQHByb3BlcnR5IGlzV2FpdGluZ0Zvck1lc3NhZ2VcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICMjI1xuICAgICAgICBAaXNXYWl0aW5nRm9yTWVzc2FnZSA9IG5vXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3RvcmVzIGludGVybmFsIHByZXZpZXctaW5mbyBpZiB0aGUgZ2FtZSBydW5zIGN1cnJlbnRseSBpbiBMaXZlLVByZXZpZXcuXG4gICAgICAgICogPHVsPlxuICAgICAgICAqIDxsaT5wcmV2aWV3SW5mby50aW1lb3V0IC0gVGltZXIgSUQgaWYgYSB0aW1lb3V0IGZvciBsaXZlLXByZXZpZXcgd2FzIGNvbmZpZ3VyZWQgdG8gZXhpdCB0aGUgZ2FtZSBsb29wIGFmdGVyIGEgY2VydGFpbiBhbW91bnQgb2YgdGltZS48L2xpPlxuICAgICAgICAqIDxsaT5wcmV2aWV3SW5mby53YWl0aW5nIC0gSW5kaWNhdGVzIGlmIExpdmUtUHJldmlldyBpcyBjdXJyZW50bHkgd2FpdGluZyBmb3IgdGhlIG5leHQgdXNlci1hY3Rpb24uIChTZWxlY3RpbmcgYW5vdGhlciBjb21tYW5kLCBldGMuKTwvbGk+XG4gICAgICAgICogPGxpPnByZXZpZXdJbmZvLmV4ZWN1dGVkQ29tbWFuZHMgLSBDb3VudHMgdGhlIGFtb3VudCBvZiBleGVjdXRlZCBjb21tYW5kcyBzaW5jZSB0aGUgbGFzdCBcbiAgICAgICAgKiBpbnRlcnByZXRlci1wYXVzZSh3YWl0aW5nLCBldGMuKS4gSWYgaXRzIG1vcmUgdGhhbiA1MDAsIHRoZSBpbnRlcnByZXRlciB3aWxsIGF1dG9tYXRpY2FsbHkgcGF1c2UgZm9yIDEgZnJhbWUgdG8gXG4gICAgICAgICogYXZvaWQgdGhhdCBMaXZlLVByZXZpZXcgZnJlZXplcyB0aGUgRWRpdG9yIGluIGNhc2Ugb2YgZW5kbGVzcyBsb29wcy48L2xpPlxuICAgICAgICAqIDwvdWw+XG4gICAgICAgICogQHByb3BlcnR5IHByZXZpZXdJbmZvXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBwcmV2aWV3SW5mbyA9IG5ldyBncy5MaXZlUHJldmlld0luZm8oKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBMaXZlLVByZXZpZXcgcmVsYXRlZCBpbmZvIHBhc3NlZCBmcm9tIHRoZSBWTiBNYWtlciBlZGl0b3IgbGlrZSB0aGUgY29tbWFuZC1pbmRleCB0aGUgcGxheWVyIGNsaWNrZWQgb24sIGV0Yy5cbiAgICAgICAgKiBAcHJvcGVydHkgcHJldmlld0RhdGFcbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAcHJldmlld0RhdGEgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogSW5kaWNhdGVzIGlmIHRoZSBpbnRlcnByZXRlciBhdXRvbWF0aWNhbGx5IHJlcGVhdHMgZXhlY3V0aW9uIGFmdGVyIHRoZSBsYXN0IGNvbW1hbmQgd2FzIGV4ZWN1dGVkLlxuICAgICAgICAqIEBwcm9wZXJ0eSByZXBlYXRcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICMjI1xuICAgICAgICBAcmVwZWF0ID0gbm9cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZXhlY3V0aW9uIGNvbnRleHQgb2YgdGhlIGludGVycHJldGVyLlxuICAgICAgICAqIEBwcm9wZXJ0eSBjb250ZXh0XG4gICAgICAgICogQHR5cGUgZ3MuSW50ZXJwcmV0ZXJDb250ZXh0XG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQGNvbnRleHQgPSBuZXcgZ3MuSW50ZXJwcmV0ZXJDb250ZXh0KDAsIG51bGwpXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3ViLUludGVycHJldGVyIGZyb20gYSBDb21tb24gRXZlbnQgQ2FsbC4gVGhlIGludGVycHJldGVyIHdpbGwgd2FpdCB1bnRpbCB0aGUgc3ViLWludGVycHJldGVyIGlzIGRvbmUgYW5kIHNldCBiYWNrIHRvXG4gICAgICAgICogPGI+bnVsbDwvYj4uXG4gICAgICAgICogQHByb3BlcnR5IHN1YkludGVycHJldGVyXG4gICAgICAgICogQHR5cGUgZ3MuQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBzdWJJbnRlcnByZXRlciA9IG51bGxcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBDdXJyZW50IGluZGVudC1sZXZlbCBvZiBleGVjdXRpb25cbiAgICAgICAgKiBAcHJvcGVydHkgaW5kZW50XG4gICAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQGluZGVudCA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBTdG9yZXMgaW5mb3JtYXRpb24gYWJvdXQgZm9yIHdoYXQgdGhlIGludGVycHJldGVyIGlzIGN1cnJlbnRseSB3YWl0aW5nIGZvciBsaWtlIGZvciBhIEFEViBtZXNzYWdlLCBldGMuIHRvXG4gICAgICAgICogcmVzdG9yZSBwcm9iYWJseSB3aGVuIGxvYWRlZCBmcm9tIGEgc2F2ZS1nYW1lLlxuICAgICAgICAqIEBwcm9wZXJ0eSB3YWl0aW5nRm9yXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQHdhaXRpbmdGb3IgPSB7fVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBpbnRlcnByZXRlciByZWxhdGVkIHNldHRpbmdzIGxpa2UgaG93IHRvIGhhbmRsZSBtZXNzYWdlcywgZXRjLlxuICAgICAgICAqIEBwcm9wZXJ0eSBzZXR0aW5nc1xuICAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBzZXR0aW5ncyA9IHsgbWVzc2FnZTogeyBieUlkOiB7fSwgYXV0b0VyYXNlOiB5ZXMsIHdhaXRBdEVuZDogeWVzLCBiYWNrbG9nOiB5ZXMgfSwgc2NyZWVuOiB7IHBhbjogbmV3IGdzLlBvaW50KDAsIDApIH0gfVxuICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogTWFwcGluZyB0YWJsZSB0byBxdWlja2x5IGdldCB0aGUgYW5jaG9yIHBvaW50IGZvciB0aGUgYW4gaW5zZXJ0ZWQgYW5jaG9yLXBvaW50IGNvbnN0YW50IHN1Y2ggYXNcbiAgICAgICAgKiBUb3AtTGVmdCgwKSwgVG9wKDEpLCBUb3AtUmlnaHQoMikgYW5kIHNvIG9uLlxuICAgICAgICAqIEBwcm9wZXJ0eSBncmFwaGljQW5jaG9yUG9pbnRzQnlDb25zdGFudFxuICAgICAgICAqIEB0eXBlIGdzLlBvaW50W11cbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAZ3JhcGhpY0FuY2hvclBvaW50c0J5Q29uc3RhbnQgPSBbXG4gICAgICAgICAgICBuZXcgZ3MuUG9pbnQoMC4wLCAwLjApLFxuICAgICAgICAgICAgbmV3IGdzLlBvaW50KDAuNSwgMC4wKSxcbiAgICAgICAgICAgIG5ldyBncy5Qb2ludCgxLjAsIDAuMCksXG4gICAgICAgICAgICBuZXcgZ3MuUG9pbnQoMS4wLCAwLjUpLFxuICAgICAgICAgICAgbmV3IGdzLlBvaW50KDEuMCwgMS4wKSxcbiAgICAgICAgICAgIG5ldyBncy5Qb2ludCgwLjUsIDEuMCksXG4gICAgICAgICAgICBuZXcgZ3MuUG9pbnQoMC4wLCAxLjApLFxuICAgICAgICAgICAgbmV3IGdzLlBvaW50KDAuMCwgMC41KSxcbiAgICAgICAgICAgIG5ldyBncy5Qb2ludCgwLjUsIDAuNSlcbiAgICAgICAgXVxuICAgICAgICBcbiAgICBvbkhvdHNwb3RDbGljazogKGUsIGRhdGEpIC0+IFxuICAgICAgICBAZXhlY3V0ZUFjdGlvbihkYXRhLnBhcmFtcy5hY3Rpb25zLm9uQ2xpY2ssIG5vLCBkYXRhLmJpbmRWYWx1ZSlcbiAgICAgICAgXG4gICAgb25Ib3RzcG90RW50ZXI6IChlLCBkYXRhKSAtPiBcbiAgICAgICAgQGV4ZWN1dGVBY3Rpb24oZGF0YS5wYXJhbXMuYWN0aW9ucy5vbkVudGVyLCB5ZXMsIGRhdGEuYmluZFZhbHVlKVxuICAgICAgICBcbiAgICBvbkhvdHNwb3RMZWF2ZTogKGUsIGRhdGEpIC0+IFxuICAgICAgICBAZXhlY3V0ZUFjdGlvbihkYXRhLnBhcmFtcy5hY3Rpb25zLm9uTGVhdmUsIG5vLCBkYXRhLmJpbmRWYWx1ZSlcbiAgICBvbkhvdHNwb3REcmFnU3RhcnQ6IChlLCBkYXRhKSAtPiBcbiAgICAgICAgQGV4ZWN1dGVBY3Rpb24oZGF0YS5wYXJhbXMuYWN0aW9ucy5vbkRyYWcsIHllcywgZGF0YS5iaW5kVmFsdWUpXG4gICAgb25Ib3RzcG90RHJhZzogKGUsIGRhdGEpIC0+IFxuICAgICAgICBAZXhlY3V0ZUFjdGlvbihkYXRhLnBhcmFtcy5hY3Rpb25zLm9uRHJhZywgeWVzLCBkYXRhLmJpbmRWYWx1ZSlcbiAgICBvbkhvdHNwb3REcmFnRW5kOiAoZSwgZGF0YSkgLT4gXG4gICAgICAgIEBleGVjdXRlQWN0aW9uKGRhdGEucGFyYW1zLmFjdGlvbnMub25EcmFnLCBubywgZGF0YS5iaW5kVmFsdWUpXG4gICAgb25Ib3RzcG90U3RhdGVDaGFuZ2VkOiAoZSwgcGFyYW1zKSAtPiBcbiAgICAgICAgaWYgZS5zZW5kZXIuYmVoYXZpb3Iuc2VsZWN0ZWRcbiAgICAgICAgICAgIEBleGVjdXRlQWN0aW9uKHBhcmFtcy5hY3Rpb25zLm9uU2VsZWN0LCB5ZXMpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBleGVjdXRlQWN0aW9uKHBhcmFtcy5hY3Rpb25zLm9uRGVzZWxlY3QsIG5vKVxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIHdoZW4gYSBBRFYgbWVzc2FnZSBmaW5pc2hlZCByZW5kZXJpbmcgYW5kIGlzIG5vdyB3YWl0aW5nXG4gICAgKiBmb3IgdGhlIHVzZXIvYXV0b20tbWVzc2FnZSB0aW1lciB0byBwcm9jZWVkLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlQURWV2FpdGluZ1xuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgIFxuICAgIG9uTWVzc2FnZUFEVldhaXRpbmc6IChlKSAtPlxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZS5zZW5kZXIub2JqZWN0XG4gICAgICAgIGlmICFAbWVzc2FnZVNldHRpbmdzKCkud2FpdEF0RW5kXG4gICAgICAgICAgICBpZiBlLmRhdGEucGFyYW1zLndhaXRGb3JDb21wbGV0aW9uXG4gICAgICAgICAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LnRleHRSZW5kZXJlci5pc1dhaXRpbmcgPSBub1xuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC50ZXh0UmVuZGVyZXIuaXNSdW5uaW5nID0gbm9cbiAgICAgICAgbWVzc2FnZU9iamVjdC5ldmVudHMub2ZmIFwid2FpdGluZ1wiLCBlLmhhbmRsZXJcbiAgICAgICAgXG4gICAgICAgIGlmIEBtZXNzYWdlU2V0dGluZ3MoKS5iYWNrbG9nIGFuZCAobWVzc2FnZU9iamVjdC5zZXR0aW5ncy5hdXRvRXJhc2Ugb3IgbWVzc2FnZU9iamVjdC5zZXR0aW5ncy5wYXJhZ3JhcGhTcGFjaW5nID4gMClcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLmJhY2tsb2cucHVzaCh7IGNoYXJhY3RlcjogbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIsIG1lc3NhZ2U6IG1lc3NhZ2VPYmplY3QuYmVoYXZpb3IubWVzc2FnZSwgY2hvaWNlczogW10gfSkgXG4gICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGFuIEFEViBtZXNzYWdlIGZpbmlzaGVkIGZhZGUtb3V0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlQURWRGlzYXBwZWFyXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEV2ZW50IE9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgZGF0YS5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgb25NZXNzYWdlQURWRGlzYXBwZWFyOiAobWVzc2FnZU9iamVjdCwgd2FpdEZvckNvbXBsZXRpb24pIC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5jdXJyZW50Q2hhcmFjdGVyID0geyBuYW1lOiBcIlwiIH1cbiAgICAgICAgbWVzc2FnZU9iamVjdC5iZWhhdmlvci5jbGVhcigpXG4gICAgICAgIG1lc3NhZ2VPYmplY3QudmlzaWJsZSA9IG5vXG4gICAgICAgIFxuICAgICAgICBpZiB3YWl0Rm9yQ29tcGxldGlvbiAgICBcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBAd2FpdGluZ0Zvci5tZXNzYWdlQURWID0gbnVsbFxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGFuIEFEViBtZXNzYWdlIGZpbmlzaGVkIGNsZWFyLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlQURWQ2xlYXJcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhLlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgb25NZXNzYWdlQURWQ2xlYXI6IChtZXNzYWdlT2JqZWN0LCB3YWl0Rm9yQ29tcGxldGlvbikgLT5cbiAgICAgICAgbWVzc2FnZU9iamVjdCA9IEB0YXJnZXRNZXNzYWdlKClcbiAgICAgICAgaWYgQG1lc3NhZ2VTZXR0aW5ncygpLmJhY2tsb2cgICBcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLmJhY2tsb2cucHVzaCh7IGNoYXJhY3RlcjogbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIsIG1lc3NhZ2U6IG1lc3NhZ2VPYmplY3QuYmVoYXZpb3IubWVzc2FnZSwgY2hvaWNlczogW10gfSkgXG4gICAgICAgIEBvbk1lc3NhZ2VBRFZEaXNhcHBlYXIobWVzc2FnZU9iamVjdCwgd2FpdEZvckNvbXBsZXRpb24pXG4gICAgICAgIFxuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIGhvdHNwb3QvaW1hZ2UtbWFwIHNlbmRzIGEgXCJqdW1wVG9cIiBldmVudCB0byBsZXQgdGhlXG4gICAgKiBpbnRlcnByZXRlciBqdW1wIHRvIHRoZSBwb3NpdGlvbiBkZWZpbmVkIGluIHRoZSBldmVudCBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBvbkp1bXBUb1xuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBvbkp1bXBUbzogKGUpIC0+XG4gICAgICAgIEBqdW1wVG9MYWJlbChlLmxhYmVsKVxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIHdoZW4gYSBob3RzcG90L2ltYWdlLW1hcCBzZW5kcyBhIFwiY2FsbENvbW1vbkV2ZW50XCIgZXZlbnQgdG8gbGV0IHRoZVxuICAgICogaW50ZXJwcmV0ZXIgY2FsbCB0aGUgY29tbW9uIGV2ZW50IGRlZmluZWQgaW4gdGhlIGV2ZW50IG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uSnVtcFRvXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEV2ZW50IE9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgZGF0YS5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIG9uQ2FsbENvbW1vbkV2ZW50OiAoZSkgLT5cbiAgICAgICAgQGNhbGxDb21tb25FdmVudChlLmNvbW1vbkV2ZW50SWQsIGUucGFyYW1zIHx8IFtdLCAhZS5maW5pc2gpXG4gICAgICAgIEBpc1dhaXRpbmcgPSBlLndhaXRpbmcgPyBub1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIEFEViBtZXNzYWdlIGZpbmlzaGVzLiBcbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uTWVzc2FnZU5WTEZpbmlzaFxuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBvbk1lc3NhZ2VBRFZGaW5pc2g6IChlKSAtPlxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZS5zZW5kZXIub2JqZWN0IFxuICBcbiAgICAgICAgaWYgbm90IEBtZXNzYWdlU2V0dGluZ3MoKS53YWl0QXRFbmQgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEdhbWVNYW5hZ2VyLmdsb2JhbERhdGEubWVzc2FnZXNbbGNzbShlLmRhdGEucGFyYW1zLm1lc3NhZ2UpXSA9IHsgcmVhZDogeWVzIH1cbiAgICAgICAgR2FtZU1hbmFnZXIuc2F2ZUdsb2JhbERhdGEoKVxuICAgICAgICBpZiBlLmRhdGEucGFyYW1zLndhaXRGb3JDb21wbGV0aW9uXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgQHdhaXRpbmdGb3IubWVzc2FnZUFEViA9IG51bGxcbiAgICAgICAgcG9pbnRlciA9IEBwb2ludGVyXG4gICAgICAgIGNvbW1hbmRzID0gQG9iamVjdC5jb21tYW5kc1xuICAgICAgICBcbiAgICAgICAgbWVzc2FnZU9iamVjdC5ldmVudHMub2ZmIFwiZmluaXNoXCIsIGUuaGFuZGxlclxuICAgICAgICAjbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBpZiBtZXNzYWdlT2JqZWN0LnZvaWNlPyBhbmQgR2FtZU1hbmFnZXIuc2V0dGluZ3Muc2tpcFZvaWNlT25BY3Rpb25cbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5zdG9wU291bmQobWVzc2FnZU9iamVjdC52b2ljZS5uYW1lKVxuICAgICAgICBcbiAgICAgICAgaWYgbm90IEBpc01lc3NhZ2VDb21tYW5kKHBvaW50ZXIsIGNvbW1hbmRzKSBhbmQgQG1lc3NhZ2VTZXR0aW5ncygpLmF1dG9FcmFzZVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRpbmdGb3IubWVzc2FnZUFEViA9IGUuZGF0YS5wYXJhbXNcbiAgICAgICAgXG4gICAgICAgICAgICBmYWRpbmcgPSBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3MubWVzc2FnZUZhZGluZ1xuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCB0aGVuIDAgZWxzZSBmYWRpbmcuZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC53YWl0Rm9yQ29tcGxldGlvbiA9IGUuZGF0YS5wYXJhbXMud2FpdEZvckNvbXBsZXRpb25cbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuYW5pbWF0b3IuZGlzYXBwZWFyKGZhZGluZy5hbmltYXRpb24sIGZhZGluZy5lYXNpbmcsIGR1cmF0aW9uLCBncy5DYWxsQmFjayhcIm9uTWVzc2FnZUFEVkRpc2FwcGVhclwiLCB0aGlzLCBlLmRhdGEucGFyYW1zLndhaXRGb3JDb21wbGV0aW9uKSlcblxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGEgY29tbW9uIGV2ZW50IGZpbmlzaGVkIGV4ZWN1dGlvbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uQ29tbW9uRXZlbnRGaW5pc2hcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhLlxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIG9uQ29tbW9uRXZlbnRGaW5pc2g6IChlKSAtPiAgICBcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmNvbW1vbkV2ZW50Q29udGFpbmVyLnJlbW92ZU9iamVjdChlLnNlbmRlci5vYmplY3QpXG4gICAgICAgIGUuc2VuZGVyLm9iamVjdC5ldmVudHMub2ZmIFwiZmluaXNoXCJcbiAgICAgICAgQHN1YkludGVycHJldGVyID0gbnVsbFxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIHNjZW5lIGNhbGwgZmluaXNoZWQgZXhlY3V0aW9uLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25DYWxsU2NlbmVGaW5pc2hcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZW5kZXIgLSBUaGUgc2VuZGVyIG9mIHRoaXMgZXZlbnQuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIG9uQ2FsbFNjZW5lRmluaXNoOiAoc2VuZGVyKSAtPlxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgQHN1YkludGVycHJldGVyID0gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTZXJpYWxpemVzIHRoZSBpbnRlcnByZXRlciBpbnRvIGEgZGF0YS1idW5kbGUuXG4gICAgKlxuICAgICogQG1ldGhvZCB0b0RhdGFCdW5kbGVcbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGRhdGEtYnVuZGxlLlxuICAgICMjIyAgIFxuICAgIHRvRGF0YUJ1bmRsZTogLT5cbiAgICAgICAgaWYgQGlzSW5wdXREYXRhQ29tbWFuZChNYXRoLm1heChAcG9pbnRlciAtIDEsIDApLCBAb2JqZWN0LmNvbW1hbmRzKSBcbiAgICAgICAgICAgIHBvaW50ZXI6IE1hdGgubWF4KEBwb2ludGVyIC0gMSAsIDApLFxuICAgICAgICAgICAgY2hvaWNlOiBAY2hvaWNlLCBcbiAgICAgICAgICAgIGNvbmRpdGlvbnM6IEBjb25kaXRpb25zLCBcbiAgICAgICAgICAgIGxvb3BzOiBAbG9vcHMsXG4gICAgICAgICAgICBsYWJlbHM6IEBsYWJlbHMsXG4gICAgICAgICAgICBpc1dhaXRpbmc6IG5vLFxuICAgICAgICAgICAgaXNSdW5uaW5nOiBAaXNSdW5uaW5nLFxuICAgICAgICAgICAgd2FpdENvdW50ZXI6IEB3YWl0Q291bnRlcixcbiAgICAgICAgICAgIHdhaXRpbmdGb3I6IEB3YWl0aW5nRm9yLFxuICAgICAgICAgICAgaW5kZW50OiBAaW5kZW50LFxuICAgICAgICAgICAgc2V0dGluZ3M6IEBzZXR0aW5nc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBwb2ludGVyOiBAcG9pbnRlcixcbiAgICAgICAgICAgIGNob2ljZTogQGNob2ljZSwgXG4gICAgICAgICAgICBjb25kaXRpb25zOiBAY29uZGl0aW9ucywgXG4gICAgICAgICAgICBsb29wczogQGxvb3BzLFxuICAgICAgICAgICAgbGFiZWxzOiBAbGFiZWxzLFxuICAgICAgICAgICAgaXNXYWl0aW5nOiBAaXNXYWl0aW5nLFxuICAgICAgICAgICAgaXNSdW5uaW5nOiBAaXNSdW5uaW5nLFxuICAgICAgICAgICAgd2FpdENvdW50ZXI6IEB3YWl0Q291bnRlcixcbiAgICAgICAgICAgIHdhaXRpbmdGb3I6IEB3YWl0aW5nRm9yLFxuICAgICAgICAgICAgaW5kZW50OiBAaW5kZW50LFxuICAgICAgICAgICAgc2V0dGluZ3M6IEBzZXR0aW5nc1xuICAgIFxuICAgICMjIypcbiAgICAjIFByZXZpZXdzIHRoZSBjdXJyZW50IHNjZW5lIGF0IHRoZSBzcGVjaWZpZWQgcG9pbnRlci4gVGhpcyBtZXRob2QgaXMgY2FsbGVkIGZyb20gdGhlXG4gICAgIyBWTiBNYWtlciBTY2VuZS1FZGl0b3IgaWYgbGl2ZS1wcmV2aWV3IGlzIGVuYWJsZWQgYW5kIHRoZSB1c2VyIGNsaWNrZWQgb24gYSBjb21tYW5kLlxuICAgICNcbiAgICAjIEBtZXRob2QgcHJldmlld1xuICAgICMjI1xuICAgIHByZXZpZXc6IC0+XG4gICAgICAgIHRyeVxuICAgICAgICAgICAgcmV0dXJuIGlmICEkUEFSQU1TLnByZXZpZXcgb3IgISRQQVJBTVMucHJldmlldy5zY2VuZVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzID0gW11cbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnNldHVwQ3Vyc29yKClcbiAgICAgICAgICAgIEBwcmV2aWV3RGF0YSA9ICRQQVJBTVMucHJldmlld1xuICAgICAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLmVtaXQoXCJwcmV2aWV3UmVzdGFydFwiKVxuICAgICAgICAgICAgaWYgQHByZXZpZXdJbmZvLnRpbWVvdXRcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoQHByZXZpZXdJbmZvLnRpbWVvdXQpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBHcmFwaGljcy5zdG9wcGVkXG4gICAgICAgICAgICAgICAgR3JhcGhpY3Muc3RvcHBlZCA9IG5vXG4gICAgICAgICAgICAgICAgR3JhcGhpY3Mub25FYWNoRnJhbWUoZ3MuTWFpbi5mcmFtZUNhbGxiYWNrKVxuICAgICAgICAgICBcbiAgICAgICAgICAgIHNjZW5lID0gbmV3IHZuLk9iamVjdF9TY2VuZSgpIFxuICAgICAgICBcbiAgICAgICAgICAgIHNjZW5lLnNjZW5lRGF0YS51aWQgPSBAcHJldmlld0RhdGEuc2NlbmUudWlkICAgIFxuICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKHNjZW5lKVxuICAgICAgICBjYXRjaCBleFxuICAgICAgICAgICAgY29uc29sZS53YXJuKGV4KVxuICAgIFxuICAgICMjIypcbiAgICAjIFNldHMgdXAgdGhlIGludGVycHJldGVyLlxuICAgICNcbiAgICAjIEBtZXRob2Qgc2V0dXBcbiAgICAjIyMgICAgXG4gICAgc2V0dXA6IC0+XG4gICAgICAgIEBwcmV2aWV3RGF0YSA9ICRQQVJBTVMucHJldmlld1xuICAgICAgICBpZiBAcHJldmlld0RhdGFcbiAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vbiBcIm1vdXNlRG93blwiLCAoPT5cbiAgICAgICAgICAgICAgICBpZiBAcHJldmlld0luZm8ud2FpdGluZ1xuICAgICAgICAgICAgICAgICAgICBpZiBAcHJldmlld0luZm8udGltZW91dFxuICAgICAgICAgICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KEBwcmV2aWV3SW5mby50aW1lb3V0KVxuICAgICAgICAgICAgICAgICAgICBAcHJldmlld0luZm8ud2FpdGluZyA9IG5vXG4gICAgICAgICAgICAgICAgICAgICNAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXAgPSBub1xuICAgICAgICAgICAgICAgICAgICBAcHJldmlld0RhdGEgPSBudWxsXG4gICAgICAgICAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5lbWl0KFwicHJldmlld1Jlc3RhcnRcIilcbiAgICAgICAgICAgICAgICApLCBudWxsLCBAb2JqZWN0XG4gICAgIFxuICAgICMjIypcbiAgICAjIERpc3Bvc2VzIHRoZSBpbnRlcnByZXRlci5cbiAgICAjXG4gICAgIyBAbWV0aG9kIGRpc3Bvc2VcbiAgICAjIyMgICAgICAgXG4gICAgZGlzcG9zZTogLT5cbiAgICAgICAgaWYgQHByZXZpZXdEYXRhXG4gICAgICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub2ZmQnlPd25lcihcIm1vdXNlRG93blwiLCBAb2JqZWN0KVxuICAgICAgICAgXG4gICAgICAgICAgIFxuICAgICAgICBzdXBlclxuICAgICBcbiAgICAgXG4gICAgaXNJbnN0YW50U2tpcDogLT4gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXAgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwVGltZSA9PSAwICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogUmVzdG9yZXMgdGhlIGludGVycHJldGVyIGZyb20gYSBkYXRhLWJ1bmRsZVxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzdG9yZVxuICAgICogQHBhcmFtIHtPYmplY3R9IGJ1bmRsZS0gVGhlIGRhdGEtYnVuZGxlLlxuICAgICMjIyAgICAgXG4gICAgcmVzdG9yZTogLT5cbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIGdhbWUgbWVzc2FnZSBmb3Igbm92ZWwtbW9kZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG1lc3NhZ2VPYmplY3ROVkxcbiAgICAqIEByZXR1cm4ge3VpLk9iamVjdF9NZXNzYWdlfSBUaGUgTlZMIGdhbWUgbWVzc2FnZSBvYmplY3QuXG4gICAgIyMjICAgICAgICAgICBcbiAgICBtZXNzYWdlT2JqZWN0TlZMOiAtPiBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImdhbWVNZXNzYWdlTlZMX21lc3NhZ2VcIilcbiAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBnYW1lIG1lc3NhZ2UgZm9yIGFkdmVudHVyZS1tb2RlLlxuICAgICpcbiAgICAqIEBtZXRob2QgbWVzc2FnZU9iamVjdEFEVlxuICAgICogQHJldHVybiB7dWkuT2JqZWN0X01lc3NhZ2V9IFRoZSBBRFYgZ2FtZSBtZXNzYWdlIG9iamVjdC5cbiAgICAjIyMgICAgICAgICAgIFxuICAgIG1lc3NhZ2VPYmplY3RBRFY6IC0+IFxuICAgICAgICBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImdhbWVNZXNzYWdlX21lc3NhZ2VcIilcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTdGFydHMgdGhlIGludGVycHJldGVyXG4gICAgKlxuICAgICogQG1ldGhvZCBzdGFydFxuICAgICMjIyAgIFxuICAgIHN0YXJ0OiAtPlxuICAgICAgICBAY29uZGl0aW9ucyA9IFtdXG4gICAgICAgIEBsb29wcyA9IFtdXG4gICAgICAgIEBpbmRlbnQgPSAwXG4gICAgICAgIEBwb2ludGVyID0gMFxuICAgICAgICBAaXNSdW5uaW5nID0geWVzXG4gICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTdG9wcyB0aGUgaW50ZXJwcmV0ZXJcbiAgICAqXG4gICAgKiBAbWV0aG9kIHN0b3BcbiAgICAjIyMgICBcbiAgICBzdG9wOiAtPlxuICAgICAgICBAaXNSdW5uaW5nID0gbm9cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogUmVzdW1lcyB0aGUgaW50ZXJwcmV0ZXJcbiAgICAqXG4gICAgKiBAbWV0aG9kIHJlc3VtZVxuICAgICMjIyAgXG4gICAgcmVzdW1lOiAtPlxuICAgICAgICBAaXNSdW5uaW5nID0geWVzICAgICAgICBcbiAgICAgXG4gICAgIyMjKlxuICAgICogVXBkYXRlcyB0aGUgaW50ZXJwcmV0ZXIgYW5kIGV4ZWN1dGVzIGFsbCBjb21tYW5kcyB1bnRpbCB0aGUgbmV4dCB3YWl0IGlzIFxuICAgICogdHJpZ2dlcmVkIGJ5IGEgY29tbWFuZC4gU28gaW4gdGhlIGNhc2Ugb2YgYW4gZW5kbGVzcy1sb29wIHRoZSBtZXRob2Qgd2lsbCBcbiAgICAqIG5ldmVyIHJldHVybi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHVwZGF0ZVxuICAgICMjIyAgICAgIFxuICAgIHVwZGF0ZTogLT5cbiAgICAgICAgaWYgQHN1YkludGVycHJldGVyP1xuICAgICAgICAgICAgQHN1YkludGVycHJldGVyLnVwZGF0ZSgpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0dXBUZW1wVmFyaWFibGVzKEBjb250ZXh0KVxuICAgICAgICBcbiAgICAgICAgaWYgKG5vdCBAb2JqZWN0LmNvbW1hbmRzPyBvciBAcG9pbnRlciA+PSBAb2JqZWN0LmNvbW1hbmRzLmxlbmd0aCkgYW5kIG5vdCBAaXNXYWl0aW5nXG4gICAgICAgICAgICBpZiBAcmVwZWF0XG4gICAgICAgICAgICAgICAgQHN0YXJ0KClcbiAgICAgICAgICAgIGVsc2UgaWYgQGlzUnVubmluZ1xuICAgICAgICAgICAgICAgIEBpc1J1bm5pbmcgPSBub1xuICAgICAgICAgICAgICAgIGlmIEBvbkZpbmlzaD8gdGhlbiBAb25GaW5pc2godGhpcylcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIFxuICAgICAgICBpZiBub3QgQGlzUnVubmluZyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgaWYgbm90IEBvYmplY3QuY29tbWFuZHMub3B0aW1pemVkXG4gICAgICAgICAgICBEYXRhT3B0aW1pemVyLm9wdGltaXplRXZlbnRDb21tYW5kcyhAb2JqZWN0LmNvbW1hbmRzKVxuXG4gICAgICAgIGlmIEB3YWl0Q291bnRlciA+IDBcbiAgICAgICAgICAgIEB3YWl0Q291bnRlci0tXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0gQHdhaXRDb3VudGVyID4gMFxuICAgICAgICAgICAgcmV0dXJuICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgQGlzV2FpdGluZ0Zvck1lc3NhZ2VcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIGlmIG5vdCBAaXNQcm9jZXNzaW5nTWVzc2FnZUluT3RoZXJDb250ZXh0KClcbiAgICAgICAgICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICBAaXNXYWl0aW5nRm9yTWVzc2FnZSA9IG5vXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXdcbiAgICAgICAgICAgIHdoaWxlIG5vdCAoQGlzV2FpdGluZyBvciBAcHJldmlld0luZm8ud2FpdGluZykgYW5kIEBwb2ludGVyIDwgQG9iamVjdC5jb21tYW5kcy5sZW5ndGggYW5kIEBpc1J1bm5pbmdcbiAgICAgICAgICAgICAgICBAZXhlY3V0ZUNvbW1hbmQoQHBvaW50ZXIpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIEBwcmV2aWV3SW5mby5leGVjdXRlZENvbW1hbmRzKytcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiBAcHJldmlld0luZm8uZXhlY3V0ZWRDb21tYW5kcyA+IDUwMFxuICAgICAgICAgICAgICAgICAgICBAcHJldmlld0luZm8uZXhlY3V0ZWRDb21tYW5kcyA9IDBcbiAgICAgICAgICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgICAgICAgICBAd2FpdENvdW50ZXIgPSAxXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHdoaWxlIG5vdCAoQGlzV2FpdGluZyBvciBAcHJldmlld0luZm8ud2FpdGluZykgYW5kIEBwb2ludGVyIDwgQG9iamVjdC5jb21tYW5kcy5sZW5ndGggYW5kIEBpc1J1bm5pbmdcbiAgICAgICAgICAgICAgICBAZXhlY3V0ZUNvbW1hbmQoQHBvaW50ZXIpXG4gICAgIFxuICAgICAgICAgIFxuICAgICAgICBpZiBAcG9pbnRlciA+PSBAb2JqZWN0LmNvbW1hbmRzLmxlbmd0aCBhbmQgbm90IEBpc1dhaXRpbmdcbiAgICAgICAgICAgIGlmIEByZXBlYXRcbiAgICAgICAgICAgICAgICBAc3RhcnQoKVxuICAgICAgICAgICAgZWxzZSBpZiBAaXNSdW5uaW5nXG4gICAgICAgICAgICAgICAgQGlzUnVubmluZyA9IG5vXG4gICAgICAgICAgICAgICAgaWYgQG9uRmluaXNoPyB0aGVuIEBvbkZpbmlzaCh0aGlzKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBBc3NpZ25zIHRoZSBjb3JyZWN0IGNvbW1hbmQtZnVuY3Rpb24gdG8gdGhlIHNwZWNpZmllZCBjb21tYW5kLW9iamVjdCBpZiBcbiAgICAqIG5lY2Vzc2FyeS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGFzc2lnbkNvbW1hbmRcbiAgICAjIyMgICAgICBcbiAgICBhc3NpZ25Db21tYW5kOiAoY29tbWFuZCkgLT5cbiAgICAgICAgc3dpdGNoIGNvbW1hbmQuaWRcbiAgICAgICAgICAgIHdoZW4gXCJncy5JZGxlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZElkbGVcbiAgICAgICAgICAgIHdoZW4gXCJncy5TdGFydFRpbWVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFN0YXJ0VGltZXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5QYXVzZVRpbWVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBhdXNlVGltZXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5SZXN1bWVUaW1lclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSZXN1bWVUaW1lclxuICAgICAgICAgICAgd2hlbiBcImdzLlN0b3BUaW1lclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTdG9wVGltZXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5XYWl0Q29tbWFuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRXYWl0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuTG9vcENvbW1hbmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTG9vcFxuICAgICAgICAgICAgd2hlbiBcImdzLkJyZWFrTG9vcENvbW1hbmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQnJlYWtMb29wXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ29tbWVudFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gLT4gMFxuICAgICAgICAgICAgd2hlbiBcImdzLkVtcHR5Q29tbWFuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gLT4gMFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RBZGRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdEFkZFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RQb3BcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdFBvcFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RTaGlmdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0U2hpZnRcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0UmVtb3ZlQXRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdFJlbW92ZUF0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdEluc2VydEF0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RJbnNlcnRBdFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RWYWx1ZUF0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RWYWx1ZUF0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdENsZWFyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RDbGVhclxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RTaHVmZmxlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RTaHVmZmxlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdFNvcnRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdFNvcnRcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0SW5kZXhPZlwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0SW5kZXhPZlxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RTZXRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdFNldFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RDb3B5XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RDb3B5XG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdExlbmd0aFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0TGVuZ3RoXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdEpvaW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdEpvaW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0RnJvbVRleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdEZyb21UZXh0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuUmVzZXRWYXJpYWJsZXNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUmVzZXRWYXJpYWJsZXNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VWYXJpYWJsZURvbWFpblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VWYXJpYWJsZURvbWFpblxuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZU51bWJlclZhcmlhYmxlc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VOdW1iZXJWYXJpYWJsZXNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VEZWNpbWFsVmFyaWFibGVzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZURlY2ltYWxWYXJpYWJsZXNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VCb29sZWFuVmFyaWFibGVzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZUJvb2xlYW5WYXJpYWJsZXNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VTdHJpbmdWYXJpYWJsZXNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlU3RyaW5nVmFyaWFibGVzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hlY2tTd2l0Y2hcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hlY2tTd2l0Y2hcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGVja051bWJlclZhcmlhYmxlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoZWNrTnVtYmVyVmFyaWFibGVcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGVja1RleHRWYXJpYWJsZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGVja1RleHRWYXJpYWJsZVxuICAgICAgICAgICAgd2hlbiBcImdzLkNvbmRpdGlvblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDb25kaXRpb25cbiAgICAgICAgICAgIHdoZW4gXCJncy5Db25kaXRpb25FbHNlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENvbmRpdGlvbkVsc2VcbiAgICAgICAgICAgIHdoZW4gXCJncy5Db25kaXRpb25FbHNlSWZcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ29uZGl0aW9uRWxzZUlmXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGFiZWxcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGFiZWxcbiAgICAgICAgICAgIHdoZW4gXCJncy5KdW1wVG9MYWJlbFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRKdW1wVG9MYWJlbFxuICAgICAgICAgICAgd2hlbiBcImdzLlNldE1lc3NhZ2VBcmVhXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNldE1lc3NhZ2VBcmVhXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hvd01lc3NhZ2VcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd01lc3NhZ2VcbiAgICAgICAgICAgIHdoZW4gXCJncy5TaG93UGFydGlhbE1lc3NhZ2VcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd1BhcnRpYWxNZXNzYWdlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTWVzc2FnZUZhZGluZ1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNZXNzYWdlRmFkaW5nXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTWVzc2FnZVNldHRpbmdzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1lc3NhZ2VTZXR0aW5nc1xuICAgICAgICAgICAgd2hlbiBcImdzLkNyZWF0ZU1lc3NhZ2VBcmVhXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENyZWF0ZU1lc3NhZ2VBcmVhXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRXJhc2VNZXNzYWdlQXJlYVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRFcmFzZU1lc3NhZ2VBcmVhXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2V0VGFyZ2V0TWVzc2FnZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTZXRUYXJnZXRNZXNzYWdlXG4gICAgICAgICAgICB3aGVuIFwidm4uTWVzc2FnZUJveERlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1lc3NhZ2VCb3hEZWZhdWx0c1xuICAgICAgICAgICAgd2hlbiBcInZuLk1lc3NhZ2VCb3hWaXNpYmlsaXR5XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1lc3NhZ2VCb3hWaXNpYmlsaXR5XG4gICAgICAgICAgICB3aGVuIFwidm4uTWVzc2FnZVZpc2liaWxpdHlcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTWVzc2FnZVZpc2liaWxpdHlcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5CYWNrbG9nVmlzaWJpbGl0eVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRCYWNrbG9nVmlzaWJpbGl0eVxuICAgICAgICAgICAgd2hlbiBcInZuLlNob3dNZXNzYWdlTlZMXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNob3dNZXNzYWdlTlZMXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2xlYXJNZXNzYWdlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENsZWFyTWVzc2FnZVxuICAgICAgICAgICAgd2hlbiBcInZuLkNsb3NlUGFnZU5WTFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDbG9zZVBhZ2VOVkxcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VXZWF0aGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVdlYXRoZXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5GcmVlemVTY3JlZW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kRnJlZXplU2NyZWVuXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2NyZWVuVHJhbnNpdGlvblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTY3JlZW5UcmFuc2l0aW9uXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hha2VTY3JlZW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hha2VTY3JlZW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5UaW50U2NyZWVuXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRpbnRTY3JlZW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5GbGFzaFNjcmVlblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRGbGFzaFNjcmVlblxuICAgICAgICAgICAgd2hlbiBcImdzLlpvb21TY3JlZW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kWm9vbVNjcmVlblxuICAgICAgICAgICAgd2hlbiBcImdzLlJvdGF0ZVNjcmVlblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSb3RhdGVTY3JlZW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5QYW5TY3JlZW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGFuU2NyZWVuXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2NyZWVuRWZmZWN0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNjcmVlbkVmZmVjdFxuICAgICAgICAgICAgd2hlbiBcImdzLlNob3dWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaG93VmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5Nb3ZlVmlkZW9cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTW92ZVZpZGVvXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTW92ZVZpZGVvUGF0aFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlVmlkZW9QYXRoXG4gICAgICAgICAgICB3aGVuIFwiZ3MuVGludFZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRpbnRWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLkZsYXNoVmlkZW9cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kRmxhc2hWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLkNyb3BWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDcm9wVmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5Sb3RhdGVWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSb3RhdGVWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLlpvb21WaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRab29tVmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5CbGVuZFZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEJsZW5kVmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5NYXNrVmlkZW9cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTWFza1ZpZGVvXG4gICAgICAgICAgICB3aGVuIFwiZ3MuVmlkZW9FZmZlY3RcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVmlkZW9FZmZlY3RcbiAgICAgICAgICAgIHdoZW4gXCJncy5WaWRlb01vdGlvbkJsdXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVmlkZW9Nb3Rpb25CbHVyXG4gICAgICAgICAgICB3aGVuIFwiZ3MuVmlkZW9EZWZhdWx0c1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRWaWRlb0RlZmF1bHRzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRXJhc2VWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRFcmFzZVZpZGVvXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hvd0ltYWdlTWFwXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNob3dJbWFnZU1hcFxuICAgICAgICAgICAgd2hlbiBcImdzLkVyYXNlSW1hZ2VNYXBcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kRXJhc2VJbWFnZU1hcFxuICAgICAgICAgICAgd2hlbiBcImdzLkFkZEhvdHNwb3RcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQWRkSG90c3BvdFxuICAgICAgICAgICAgd2hlbiBcImdzLkVyYXNlSG90c3BvdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRFcmFzZUhvdHNwb3RcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VIb3RzcG90U3RhdGVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlSG90c3BvdFN0YXRlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hvd1BpY3R1cmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd1BpY3R1cmVcbiAgICAgICAgICAgIHdoZW4gXCJncy5Nb3ZlUGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLk1vdmVQaWN0dXJlUGF0aFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlUGljdHVyZVBhdGhcbiAgICAgICAgICAgIHdoZW4gXCJncy5UaW50UGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRUaW50UGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLkZsYXNoUGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRGbGFzaFBpY3R1cmVcbiAgICAgICAgICAgIHdoZW4gXCJncy5Dcm9wUGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDcm9wUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLlJvdGF0ZVBpY3R1cmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUm90YXRlUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLlpvb21QaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFpvb21QaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQmxlbmRQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEJsZW5kUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLlNoYWtlUGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaGFrZVBpY3R1cmVcbiAgICAgICAgICAgIHdoZW4gXCJncy5NYXNrUGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNYXNrUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLlBpY3R1cmVFZmZlY3RcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGljdHVyZUVmZmVjdFxuICAgICAgICAgICAgd2hlbiBcImdzLlBpY3R1cmVNb3Rpb25CbHVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBpY3R1cmVNb3Rpb25CbHVyXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGljdHVyZURlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBpY3R1cmVEZWZhdWx0c1xuICAgICAgICAgICAgd2hlbiBcImdzLlBsYXlQaWN0dXJlQW5pbWF0aW9uXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBsYXlQaWN0dXJlQW5pbWF0aW9uXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRXJhc2VQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEVyYXNlUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLklucHV0TnVtYmVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZElucHV0TnVtYmVyXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hvaWNlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNob3dDaG9pY2VcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaG9pY2VUaW1lclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaG9pY2VUaW1lclxuICAgICAgICAgICAgd2hlbiBcInZuLlNob3dDaG9pY2VzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNob3dDaG9pY2VzXG4gICAgICAgICAgICB3aGVuIFwidm4uVW5sb2NrQ0dcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVW5sb2NrQ0dcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5MMkRKb2luU2NlbmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTDJESm9pblNjZW5lXG4gICAgICAgICAgICB3aGVuIFwidm4uTDJERXhpdFNjZW5lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEwyREV4aXRTY2VuZVxuICAgICAgICAgICAgd2hlbiBcInZuLkwyRE1vdGlvblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRNb3Rpb25cbiAgICAgICAgICAgIHdoZW4gXCJ2bi5MMkRNb3Rpb25Hcm91cFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRNb3Rpb25Hcm91cFxuICAgICAgICAgICAgd2hlbiBcInZuLkwyREV4cHJlc3Npb25cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTDJERXhwcmVzc2lvblxuICAgICAgICAgICAgd2hlbiBcInZuLkwyRE1vdmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTDJETW92ZVxuICAgICAgICAgICAgd2hlbiBcInZuLkwyRFBhcmFtZXRlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRQYXJhbWV0ZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5MMkRTZXR0aW5nc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRTZXR0aW5nc1xuICAgICAgICAgICAgd2hlbiBcInZuLkwyRERlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEwyRERlZmF1bHRzXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhcmFjdGVySm9pblNjZW5lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYXJhY3RlckpvaW5TY2VuZVxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYXJhY3RlckV4aXRTY2VuZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFyYWN0ZXJFeGl0U2NlbmVcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFyYWN0ZXJDaGFuZ2VFeHByZXNzaW9uXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYXJhY3RlckNoYW5nZUV4cHJlc3Npb25cbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFyYWN0ZXJTZXRQYXJhbWV0ZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVyU2V0UGFyYW1ldGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhcmFjdGVyR2V0UGFyYW1ldGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYXJhY3RlckdldFBhcmFtZXRlclxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYXJhY3RlckRlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYXJhY3RlckRlZmF1bHRzXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhcmFjdGVyRWZmZWN0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYXJhY3RlckVmZmVjdFxuICAgICAgICAgICAgd2hlbiBcInZuLlpvb21DaGFyYWN0ZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kWm9vbUNoYXJhY3RlclxuICAgICAgICAgICAgd2hlbiBcInZuLlJvdGF0ZUNoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSb3RhdGVDaGFyYWN0ZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5CbGVuZENoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRCbGVuZENoYXJhY3RlclxuICAgICAgICAgICAgd2hlbiBcInZuLlNoYWtlQ2hhcmFjdGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNoYWtlQ2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uTWFza0NoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNYXNrQ2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uTW92ZUNoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlQ2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uTW92ZUNoYXJhY3RlclBhdGhcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTW92ZUNoYXJhY3RlclBhdGhcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5GbGFzaENoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRGbGFzaENoYXJhY3RlclxuICAgICAgICAgICAgd2hlbiBcInZuLlRpbnRDaGFyYWN0ZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVGludENoYXJhY3RlclxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYXJhY3Rlck1vdGlvbkJsdXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVyTW90aW9uQmx1clxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYW5nZUJhY2tncm91bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlQmFja2dyb3VuZFxuICAgICAgICAgICAgd2hlbiBcInZuLlNoYWtlQmFja2dyb3VuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaGFrZUJhY2tncm91bmRcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5TY3JvbGxCYWNrZ3JvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNjcm9sbEJhY2tncm91bmRcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5TY3JvbGxCYWNrZ3JvdW5kVG9cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2Nyb2xsQmFja2dyb3VuZFRvXG4gICAgICAgICAgICB3aGVuIFwidm4uU2Nyb2xsQmFja2dyb3VuZFBhdGhcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2Nyb2xsQmFja2dyb3VuZFBhdGhcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5ab29tQmFja2dyb3VuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRab29tQmFja2dyb3VuZFxuICAgICAgICAgICAgd2hlbiBcInZuLlJvdGF0ZUJhY2tncm91bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUm90YXRlQmFja2dyb3VuZFxuICAgICAgICAgICAgd2hlbiBcInZuLlRpbnRCYWNrZ3JvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRpbnRCYWNrZ3JvdW5kXG4gICAgICAgICAgICB3aGVuIFwidm4uQmxlbmRCYWNrZ3JvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEJsZW5kQmFja2dyb3VuZFxuICAgICAgICAgICAgd2hlbiBcInZuLk1hc2tCYWNrZ3JvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1hc2tCYWNrZ3JvdW5kXG4gICAgICAgICAgICB3aGVuIFwidm4uQmFja2dyb3VuZE1vdGlvbkJsdXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmFja2dyb3VuZE1vdGlvbkJsdXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5CYWNrZ3JvdW5kRWZmZWN0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEJhY2tncm91bmRFZmZlY3RcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5CYWNrZ3JvdW5kRGVmYXVsdHNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmFja2dyb3VuZERlZmF1bHRzXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhbmdlU2NlbmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlU2NlbmVcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5SZXR1cm5Ub1ByZXZpb3VzU2NlbmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUmV0dXJuVG9QcmV2aW91c1NjZW5lXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2FsbFNjZW5lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENhbGxTY2VuZVxuICAgICAgICAgICAgd2hlbiBcInZuLlN3aXRjaFRvTGF5b3V0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFN3aXRjaFRvTGF5b3V0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hhbmdlVHJhbnNpdGlvblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VUcmFuc2l0aW9uXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hhbmdlV2luZG93U2tpblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VXaW5kb3dTa2luXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hhbmdlU2NyZWVuVHJhbnNpdGlvbnNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlU2NyZWVuVHJhbnNpdGlvbnNcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5VSUFjY2Vzc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRVSUFjY2Vzc1xuICAgICAgICAgICAgd2hlbiBcImdzLlBsYXlWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQbGF5VmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5QbGF5TXVzaWNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGxheU11c2ljXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU3RvcE11c2ljXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFN0b3BNdXNpY1xuICAgICAgICAgICAgd2hlbiBcImdzLlBsYXlTb3VuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQbGF5U291bmRcbiAgICAgICAgICAgIHdoZW4gXCJncy5TdG9wU291bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU3RvcFNvdW5kXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGF1c2VNdXNpY1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQYXVzZU11c2ljXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUmVzdW1lTXVzaWNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUmVzdW1lTXVzaWNcbiAgICAgICAgICAgIHdoZW4gXCJncy5BdWRpb0RlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEF1ZGlvRGVmYXVsdHNcbiAgICAgICAgICAgIHdoZW4gXCJncy5FbmRDb21tb25FdmVudFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRFbmRDb21tb25FdmVudFxuICAgICAgICAgICAgd2hlbiBcImdzLlJlc3VtZUNvbW1vbkV2ZW50XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJlc3VtZUNvbW1vbkV2ZW50XG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2FsbENvbW1vbkV2ZW50XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENhbGxDb21tb25FdmVudFxuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZVRpbWVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVRpbWVyXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hvd1RleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd1RleHRcbiAgICAgICAgICAgIHdoZW4gXCJncy5SZWZyZXNoVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSZWZyZXNoVGV4dFxuICAgICAgICAgICAgd2hlbiBcImdzLlRleHRNb3Rpb25CbHVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRleHRNb3Rpb25CbHVyXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTW92ZVRleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTW92ZVRleHRcbiAgICAgICAgICAgIHdoZW4gXCJncy5Nb3ZlVGV4dFBhdGhcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTW92ZVRleHRQYXRoXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUm90YXRlVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSb3RhdGVUZXh0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuWm9vbVRleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kWm9vbVRleHRcbiAgICAgICAgICAgIHdoZW4gXCJncy5CbGVuZFRleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmxlbmRUZXh0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ29sb3JUZXh0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENvbG9yVGV4dFxuICAgICAgICAgICAgd2hlbiBcImdzLkVyYXNlVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRFcmFzZVRleHQgXG4gICAgICAgICAgICB3aGVuIFwiZ3MuVGV4dEVmZmVjdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRUZXh0RWZmZWN0IFxuICAgICAgICAgICAgd2hlbiBcImdzLlRleHREZWZhdWx0c1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRUZXh0RGVmYXVsdHNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VUZXh0U2V0dGluZ3NcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlVGV4dFNldHRpbmdzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuSW5wdXRUZXh0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZElucHV0VGV4dFxuICAgICAgICAgICAgd2hlbiBcImdzLklucHV0TmFtZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRJbnB1dE5hbWVcbiAgICAgICAgICAgIHdoZW4gXCJncy5TYXZlUGVyc2lzdGVudERhdGFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2F2ZVBlcnNpc3RlbnREYXRhXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2F2ZVNldHRpbmdzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNhdmVTZXR0aW5nc1xuICAgICAgICAgICAgd2hlbiBcImdzLlByZXBhcmVTYXZlR2FtZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQcmVwYXJlU2F2ZUdhbWVcbiAgICAgICAgICAgIHdoZW4gXCJncy5TYXZlR2FtZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTYXZlR2FtZVxuICAgICAgICAgICAgd2hlbiBcImdzLkxvYWRHYW1lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExvYWRHYW1lXG4gICAgICAgICAgICB3aGVuIFwiZ3MuR2V0SW5wdXREYXRhXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEdldElucHV0RGF0YVxuICAgICAgICAgICAgd2hlbiBcImdzLldhaXRGb3JJbnB1dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRXYWl0Rm9ySW5wdXRcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VPYmplY3REb21haW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlT2JqZWN0RG9tYWluXG4gICAgICAgICAgICB3aGVuIFwidm4uR2V0R2FtZURhdGFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kR2V0R2FtZURhdGFcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5TZXRHYW1lRGF0YVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTZXRHYW1lRGF0YVxuICAgICAgICAgICAgd2hlbiBcInZuLkdldE9iamVjdERhdGFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kR2V0T2JqZWN0RGF0YVxuICAgICAgICAgICAgd2hlbiBcInZuLlNldE9iamVjdERhdGFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2V0T2JqZWN0RGF0YVxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYW5nZVNvdW5kc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VTb3VuZHNcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFuZ2VDb2xvcnNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlQ29sb3JzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hhbmdlU2NyZWVuQ3Vyc29yXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVNjcmVlbkN1cnNvclxuICAgICAgICAgICAgd2hlbiBcImdzLlJlc2V0R2xvYmFsRGF0YVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSZXNldEdsb2JhbERhdGFcbiAgICAgICAgICAgIHdoZW4gXCJncy5TY3JpcHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2NyaXB0XG4gICAgXG4gICAgIyMjKlxuICAgICogRXhlY3V0ZXMgdGhlIGNvbW1hbmQgYXQgdGhlIHNwZWNpZmllZCBpbmRleCBhbmQgaW5jcmVhc2VzIHRoZSBjb21tYW5kLXBvaW50ZXIuXG4gICAgKlxuICAgICogQG1ldGhvZCBleGVjdXRlQ29tbWFuZFxuICAgICMjIyAgICAgICBcbiAgICBleGVjdXRlQ29tbWFuZDogKGluZGV4KSAtPlxuICAgICAgICBAY29tbWFuZCA9IEBvYmplY3QuY29tbWFuZHNbaW5kZXhdXG5cbiAgICAgICAgaWYgQHByZXZpZXdEYXRhXG4gICAgICAgICAgICBpZiBAcG9pbnRlciA8IEBwcmV2aWV3RGF0YS5wb2ludGVyXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXAgPSB5ZXNcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcFRpbWUgPSAwXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXAgPSBAcHJldmlld0RhdGEuc2V0dGluZ3MuYW5pbWF0aW9uRGlzYWJsZWRcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcFRpbWUgPSAwXG4gICAgICAgICAgICAgICAgQHByZXZpZXdJbmZvLndhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIuZW1pdChcInByZXZpZXdXYWl0aW5nXCIpXG4gICAgICAgICAgICAgICAgaWYgQHByZXZpZXdEYXRhLnNldHRpbmdzLmFuaW1hdGlvbkRpc2FibGVkIG9yIEBwcmV2aWV3RGF0YS5zZXR0aW5ncy5hbmltYXRpb25UaW1lID4gMFxuICAgICAgICAgICAgICAgICAgICBAcHJldmlld0luZm8udGltZW91dCA9IHNldFRpbWVvdXQgKC0+IEdyYXBoaWNzLnN0b3BwZWQgPSB5ZXMpLCAoQHByZXZpZXdEYXRhLnNldHRpbmdzLmFuaW1hdGlvblRpbWUpKjEwMDBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgaWYgQGNvbW1hbmQuZXhlY3V0ZT9cbiAgICAgICAgICAgIEBjb21tYW5kLmludGVycHJldGVyID0gdGhpc1xuICAgICAgICAgICAgQGNvbW1hbmQuZXhlY3V0ZSgpIGlmIEBjb21tYW5kLmluZGVudCA9PSBAaW5kZW50XG4gICAgICAgICAgICBAcG9pbnRlcisrXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEBjb21tYW5kID0gQG9iamVjdC5jb21tYW5kc1tAcG9pbnRlcl1cbiAgICAgICAgICAgIGlmIEBjb21tYW5kP1xuICAgICAgICAgICAgICAgIGluZGVudCA9IEBjb21tYW5kLmluZGVudFxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGluZGVudCA9IEBpbmRlbnRcbiAgICAgICAgICAgICAgICB3aGlsZSBpbmRlbnQgPiAwIGFuZCAobm90IEBsb29wc1tpbmRlbnRdPylcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50LS1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBpbmRlbnQgPCBAaW5kZW50XG4gICAgICAgICAgICAgICAgQGluZGVudCA9IGluZGVudFxuICAgICAgICAgICAgICAgIGlmIEBsb29wc1tAaW5kZW50XT9cbiAgICAgICAgICAgICAgICAgICAgQHBvaW50ZXIgPSBAbG9vcHNbQGluZGVudF1cbiAgICAgICAgICAgICAgICAgICAgQGNvbW1hbmQgPSBAb2JqZWN0LmNvbW1hbmRzW0Bwb2ludGVyXVxuICAgICAgICAgICAgICAgICAgICBAY29tbWFuZC5pbnRlcnByZXRlciA9IHRoaXNcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQGFzc2lnbkNvbW1hbmQoQGNvbW1hbmQpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBAY29tbWFuZC5leGVjdXRlP1xuICAgICAgICAgICAgICAgIEBjb21tYW5kLmludGVycHJldGVyID0gdGhpc1xuICAgICAgICAgICAgICAgIEBjb21tYW5kLmV4ZWN1dGUoKSBpZiBAY29tbWFuZC5pbmRlbnQgPT0gQGluZGVudFxuICAgICAgICAgICAgICAgIEBwb2ludGVyKytcbiAgICAgICAgICAgICAgICBAY29tbWFuZCA9IEBvYmplY3QuY29tbWFuZHNbQHBvaW50ZXJdXG4gICAgICAgICAgICAgICAgaWYgQGNvbW1hbmQ/XG4gICAgICAgICAgICAgICAgICAgIGluZGVudCA9IEBjb21tYW5kLmluZGVudFxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgaW5kZW50ID0gQGluZGVudFxuICAgICAgICAgICAgICAgICAgICB3aGlsZSBpbmRlbnQgPiAwIGFuZCAobm90IEBsb29wc1tpbmRlbnRdPylcbiAgICAgICAgICAgICAgICAgICAgICAgIGluZGVudC0tXG4gICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiBpbmRlbnQgPCBAaW5kZW50XG4gICAgICAgICAgICAgICAgICAgIEBpbmRlbnQgPSBpbmRlbnRcbiAgICAgICAgICAgICAgICAgICAgaWYgQGxvb3BzW0BpbmRlbnRdP1xuICAgICAgICAgICAgICAgICAgICAgICAgQHBvaW50ZXIgPSBAbG9vcHNbQGluZGVudF1cbiAgICAgICAgICAgICAgICAgICAgICAgIEBjb21tYW5kID0gQG9iamVjdC5jb21tYW5kc1tAcG9pbnRlcl1cbiAgICAgICAgICAgICAgICAgICAgICAgIEBjb21tYW5kLmludGVycHJldGVyID0gdGhpc1xuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEBwb2ludGVyKytcbiAgICAjIyMqXG4gICAgKiBTa2lwcyBhbGwgY29tbWFuZHMgdW50aWwgYSBjb21tYW5kIHdpdGggdGhlIHNwZWNpZmllZCBpbmRlbnQtbGV2ZWwgaXMgXG4gICAgKiBmb3VuZC4gU28gZm9yIGV4YW1wbGU6IFRvIGp1bXAgZnJvbSBhIENvbmRpdGlvbi1Db21tYW5kIHRvIHRoZSBuZXh0XG4gICAgKiBFbHNlLUNvbW1hbmQganVzdCBwYXNzIHRoZSBpbmRlbnQtbGV2ZWwgb2YgdGhlIENvbmRpdGlvbi9FbHNlIGNvbW1hbmQuXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZW50IC0gVGhlIGluZGVudC1sZXZlbC5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gYmFja3dhcmQgLSBJZiB0cnVlIHRoZSBza2lwIHJ1bnMgYmFja3dhcmQuXG4gICAgIyMjICAgXG4gICAgc2tpcDogKGluZGVudCwgYmFja3dhcmQpIC0+XG4gICAgICAgIGlmIGJhY2t3YXJkXG4gICAgICAgICAgICBAcG9pbnRlci0tXG4gICAgICAgICAgICB3aGlsZSBAcG9pbnRlciA+IDAgYW5kIEBvYmplY3QuY29tbWFuZHNbQHBvaW50ZXJdLmluZGVudCAhPSBpbmRlbnRcbiAgICAgICAgICAgICAgICBAcG9pbnRlci0tXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBwb2ludGVyKytcbiAgICAgICAgICAgIHdoaWxlIEBwb2ludGVyIDwgQG9iamVjdC5jb21tYW5kcy5sZW5ndGggYW5kIEBvYmplY3QuY29tbWFuZHNbQHBvaW50ZXJdLmluZGVudCAhPSBpbmRlbnRcbiAgICAgICAgICAgICAgICBAcG9pbnRlcisrXG4gICAgXG4gICAgIyMjKlxuICAgICogSGFsdHMgdGhlIGludGVycHJldGVyIGZvciB0aGUgc3BlY2lmaWVkIGFtb3VudCBvZiB0aW1lLiBBbiBvcHRpb25hbGx5XG4gICAgKiBjYWxsYmFjayBmdW5jdGlvbiBjYW4gYmUgcGFzc2VkIHdoaWNoIGlzIGNhbGxlZCB3aGVuIHRoZSB0aW1lIGlzIHVwLlxuICAgICpcbiAgICAqIEBtZXRob2Qgd2FpdFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHRpbWUgLSBUaGUgdGltZSB0byB3YWl0XG4gICAgKiBAcGFyYW0ge2dzLkNhbGxiYWNrfSBjYWxsYmFjayAtIENhbGxlZCBpZiB0aGUgd2FpdCB0aW1lIGlzIHVwLlxuICAgICMjIyAgXG4gICAgd2FpdDogKHRpbWUsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgIEB3YWl0Q291bnRlciA9IHRpbWVcbiAgICAgICAgQHdhaXRDYWxsYmFjayA9IGNhbGxiYWNrXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIENoZWNrcyBpZiB0aGUgY29tbWFuZCBhdCB0aGUgc3BlY2lmaWVkIHBvaW50ZXItaW5kZXggaXMgYSBnYW1lIG1lc3NhZ2VcbiAgICAqIHJlbGF0ZWQgY29tbWFuZC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGlzTWVzc2FnZUNvbW1hbmRcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludGVyIC0gVGhlIHBvaW50ZXIvaW5kZXguXG4gICAgKiBAcGFyYW0ge09iamVjdFtdfSBjb21tYW5kcyAtIFRoZSBsaXN0IG9mIGNvbW1hbmRzIHRvIGNoZWNrLlxuICAgICogQHJldHVybiB7Ym9vbGVhbn0gPGI+dHJ1ZTwvYj4gaWYgaXRzIGEgZ2FtZSBtZXNzYWdlIHJlbGF0ZWQgY29tbWFuZC4gT3RoZXJ3aXNlIDxiPmZhbHNlPC9iPi5cbiAgICAjIyMgXG4gICAgaXNNZXNzYWdlQ29tbWFuZDogKHBvaW50ZXIsIGNvbW1hbmRzKSAtPlxuICAgICAgICByZXN1bHQgPSB5ZXNcbiAgICAgICAgaWYgcG9pbnRlciA+PSBjb21tYW5kcy5sZW5ndGggb3IgKGNvbW1hbmRzW3BvaW50ZXJdLmlkICE9IFwiZ3MuSW5wdXROdW1iZXJcIiBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzW3BvaW50ZXJdLmlkICE9IFwidm4uQ2hvaWNlXCIgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1twb2ludGVyXS5pZCAhPSBcImdzLklucHV0VGV4dFwiIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbcG9pbnRlcl0uaWQgIT0gXCJncy5JbnB1dE5hbWVcIilcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBub1xuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgXG4gICAgIyMjKlxuICAgICogQ2hlY2tzIGlmIHRoZSBjb21tYW5kIGF0IHRoZSBzcGVjaWZpZWQgcG9pbnRlci1pbmRleCBhc2tzIGZvciB1c2VyLWlucHV0IGxpa2VcbiAgICAqIHRoZSBJbnB1dCBOdW1iZXIgb3IgSW5wdXQgVGV4dCBjb21tYW5kLlxuICAgICpcbiAgICAqIEBtZXRob2QgaXNJbnB1dERhdGFDb21tYW5kXG4gICAgKiBAcGFyYW0ge251bWJlcn0gcG9pbnRlciAtIFRoZSBwb2ludGVyL2luZGV4LlxuICAgICogQHBhcmFtIHtPYmplY3RbXX0gY29tbWFuZHMgLSBUaGUgbGlzdCBvZiBjb21tYW5kcyB0byBjaGVjay5cbiAgICAqIEByZXR1cm4ge2Jvb2xlYW59IDxiPnRydWU8L2I+IGlmIGl0cyBhbiBpbnB1dC1kYXRhIGNvbW1hbmQuIE90aGVyd2lzZSA8Yj5mYWxzZTwvYj5cbiAgICAjIyMgICAgIFxuICAgIGlzSW5wdXREYXRhQ29tbWFuZDogKHBvaW50ZXIsIGNvbW1hbmRzKSAtPlxuICAgICAgICBwb2ludGVyIDwgY29tbWFuZHMubGVuZ3RoIGFuZCAoXG4gICAgICAgICAgICBjb21tYW5kc1twb2ludGVyXS5pZCA9PSBcImdzLklucHV0TnVtYmVyXCIgb3JcbiAgICAgICAgICAgIGNvbW1hbmRzW3BvaW50ZXJdLmlkID09IFwiZ3MuSW5wdXRUZXh0XCIgb3JcbiAgICAgICAgICAgIGNvbW1hbmRzW3BvaW50ZXJdLmlkID09IFwidm4uQ2hvaWNlXCIgb3JcbiAgICAgICAgICAgIGNvbW1hbmRzW3BvaW50ZXJdLmlkID09IFwidm4uU2hvd0Nob2ljZXNcIlxuICAgICAgICApXG4gICAgIFxuICAgICMjIypcbiAgICAqIENoZWNrcyBpZiBhIGdhbWUgbWVzc2FnZSBpcyBjdXJyZW50bHkgcnVubmluZyBieSBhbm90aGVyIGludGVycHJldGVyIGxpa2UgYVxuICAgICogY29tbW9uLWV2ZW50IGludGVycHJldGVyLlxuICAgICpcbiAgICAqIEBtZXRob2QgaXNQcm9jZXNzaW5nTWVzc2FnZUluT3RoZXJDb250ZXh0XG4gICAgKiBAcmV0dXJuIHtib29sZWFufSA8Yj50cnVlPC9iPiBhIGdhbWUgbWVzc2FnZSBpcyBydW5uaW5nIGluIGFub3RoZXIgY29udGV4dC4gT3RoZXJ3aXNlIDxiPmZhbHNlPC9iPlxuICAgICMjIyAgICAgXG4gICAgaXNQcm9jZXNzaW5nTWVzc2FnZUluT3RoZXJDb250ZXh0OiAtPlxuICAgICAgICByZXN1bHQgPSBub1xuICAgICAgICBnbSA9IEdhbWVNYW5hZ2VyXG4gICAgICAgIHMgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgXG4gICAgICAgIHJlc3VsdCA9XG4gICAgICAgICAgICAgICAgIChzLmlucHV0TnVtYmVyV2luZG93PyBhbmQgcy5pbnB1dE51bWJlcldpbmRvdy52aXNpYmxlIGFuZCBzLmlucHV0TnVtYmVyV2luZG93LmV4ZWN1dGlvbkNvbnRleHQgIT0gQGNvbnRleHQpIG9yXG4gICAgICAgICAgICAgICAgIChzLmlucHV0VGV4dFdpbmRvdz8gYW5kIHMuaW5wdXRUZXh0V2luZG93LmFjdGl2ZSBhbmQgcy5pbnB1dFRleHRXaW5kb3cuZXhlY3V0aW9uQ29udGV4dCAhPSBAY29udGV4dClcbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICBcbiAgICAjIyMqXG4gICAgKiBJZiBhIGdhbWUgbWVzc2FnZSBpcyBjdXJyZW50bHkgcnVubmluZyBieSBhbiBvdGhlciBpbnRlcnByZXRlciBsaWtlIGEgY29tbW9uLWV2ZW50XG4gICAgKiBpbnRlcnByZXRlciwgdGhpcyBtZXRob2QgdHJpZ2dlciBhIHdhaXQgdW50aWwgdGhlIG90aGVyIGludGVycHJldGVyIGlzIGZpbmlzaGVkXG4gICAgKiB3aXRoIHRoZSBnYW1lIG1lc3NhZ2UuXG4gICAgKlxuICAgICogQG1ldGhvZCB3YWl0Rm9yTWVzc2FnZVxuICAgICogQHJldHVybiB7Ym9vbGVhbn0gPGI+dHJ1ZTwvYj4gYSBnYW1lIG1lc3NhZ2UgaXMgcnVubmluZyBpbiBhbm90aGVyIGNvbnRleHQuIE90aGVyd2lzZSA8Yj5mYWxzZTwvYj5cbiAgICAjIyMgICAgICAgXG4gICAgd2FpdEZvck1lc3NhZ2U6IC0+XG4gICAgICAgIEBpc1dhaXRpbmdGb3JNZXNzYWdlID0geWVzXG4gICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgQHBvaW50ZXItLVxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIHRoZSBudW1iZXIgdmFyaWFibGUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG51bWJlclZhbHVlQXRJbmRleFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3BlIC0gVGhlIHZhcmlhYmxlJ3Mgc2NvcGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBUaGUgaW5kZXggb2YgdGhlIHZhcmlhYmxlIHRvIGdldCB0aGUgdmFsdWUgZnJvbS5cbiAgICAqIEByZXR1cm4ge051bWJlcn0gVGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgICAgIFxuICAgIG51bWJlclZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCkgLT4gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5udW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGluZGV4KVxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgKHBvc3NpYmxlKSBudW1iZXIgdmFyaWFibGUuIElmIGEgY29uc3RhbnQgbnVtYmVyIHZhbHVlIGlzIHNwZWNpZmllZCwgdGhpcyBtZXRob2RcbiAgICAqIGRvZXMgbm90aGluZyBhbiBqdXN0IHJldHVybnMgdGhhdCBjb25zdGFudCB2YWx1ZS4gVGhhdCdzIHRvIG1ha2UgaXQgbW9yZSBjb21mb3J0YWJsZSB0byBqdXN0IHBhc3MgYSB2YWx1ZSB3aGljaFxuICAgICogY2FuIGJlIGNhbGN1bGF0ZWQgYnkgdmFyaWFibGUgYnV0IGFsc28gYmUganVzdCBhIGNvbnN0YW50IHZhbHVlLlxuICAgICpcbiAgICAqIEBtZXRob2QgbnVtYmVyVmFsdWVPZlxuICAgICogQHBhcmFtIHtudW1iZXJ8T2JqZWN0fSBvYmplY3QgLSBBIG51bWJlciB2YXJpYWJsZSBvciBjb25zdGFudCBudW1iZXIgdmFsdWUuXG4gICAgKiBAcmV0dXJuIHtOdW1iZXJ9IFRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuXG4gICAgIyMjICAgICBcbiAgICBudW1iZXJWYWx1ZU9mOiAob2JqZWN0KSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLm51bWJlclZhbHVlT2Yob2JqZWN0KVxuICAgIFxuICAgICMjIypcbiAgICAqIEl0IGRvZXMgdGhlIHNhbWUgbGlrZSA8Yj5udW1iZXJWYWx1ZU9mPC9iPiB3aXRoIG9uZSBkaWZmZXJlbmNlOiBJZiB0aGUgc3BlY2lmaWVkIG9iamVjdFxuICAgICogaXMgYSB2YXJpYWJsZSwgaXQncyB2YWx1ZSBpcyBjb25zaWRlcmVkIGFzIGEgZHVyYXRpb24tdmFsdWUgaW4gbWlsbGlzZWNvbmRzIGFuZCBhdXRvbWF0aWNhbGx5IGNvbnZlcnRlZFxuICAgICogaW50byBmcmFtZXMuXG4gICAgKlxuICAgICogQG1ldGhvZCBkdXJhdGlvblZhbHVlT2ZcbiAgICAqIEBwYXJhbSB7bnVtYmVyfE9iamVjdH0gb2JqZWN0IC0gQSBudW1iZXIgdmFyaWFibGUgb3IgY29uc3RhbnQgbnVtYmVyIHZhbHVlLlxuICAgICogQHJldHVybiB7TnVtYmVyfSBUaGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyAgICAgXG4gICAgZHVyYXRpb25WYWx1ZU9mOiAob2JqZWN0KSAtPiBcbiAgICAgICAgaWYgb2JqZWN0IGFuZCBvYmplY3QuaW5kZXg/XG4gICAgICAgICAgICBNYXRoLnJvdW5kKEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUubnVtYmVyVmFsdWVPZihvYmplY3QpIC8gMTAwMCAqIEdyYXBoaWNzLmZyYW1lUmF0ZSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgTWF0aC5yb3VuZChHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLm51bWJlclZhbHVlT2Yob2JqZWN0KSlcbiAgICAgXG4gICAgIyMjKlxuICAgICogR2V0cyBhIHBvc2l0aW9uICh7eCwgeX0pIGZvciB0aGUgc3BlY2lmaWVkIHByZWRlZmluZWQgb2JqZWN0IHBvc2l0aW9uIGNvbmZpZ3VyZWQgaW4gXG4gICAgKiBEYXRhYmFzZSAtIFN5c3RlbS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHByZWRlZmluZWRPYmplY3RQb3NpdGlvblxuICAgICogQHBhcmFtIHtudW1iZXJ9IHBvc2l0aW9uIC0gVGhlIGluZGV4L0lEIG9mIHRoZSBwcmVkZWZpbmVkIG9iamVjdCBwb3NpdGlvbiB0byBzZXQuXG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gc2V0IHRoZSBwb3NpdGlvbiBmb3IuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gVGhlIHBhcmFtcyBvYmplY3Qgb2YgdGhlIHNjZW5lIGNvbW1hbmQuXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSBwb3NpdGlvbiB7eCwgeX0uXG4gICAgIyMjXG4gICAgcHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uOiAocG9zaXRpb24sIG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBvYmplY3RQb3NpdGlvbiA9IFJlY29yZE1hbmFnZXIuc3lzdGVtLm9iamVjdFBvc2l0aW9uc1twb3NpdGlvbl1cbiAgICAgICAgaWYgIW9iamVjdFBvc2l0aW9uIHRoZW4gcmV0dXJuIHsgeDogMCwgeTogMCB9XG4gICAgICAgIFxuICAgICAgICBpZiBub3Qgb2JqZWN0UG9zaXRpb24uZnVuYz9cbiAgICAgICAgICAgIGYgPSBldmFsKFwiKGZ1bmN0aW9uKG9iamVjdCwgcGFyYW1zKXtcIiArIG9iamVjdFBvc2l0aW9uLnNjcmlwdCArIFwifSlcIilcbiAgICAgICAgICAgIG9iamVjdFBvc2l0aW9uLmZ1bmMgPSBmXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gb2JqZWN0UG9zaXRpb24uZnVuYyhvYmplY3QsIHBhcmFtcykgfHwgeyB4OiAwLCB5OiAwIH1cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgdmFsdWUgb2YgYSBudW1iZXIgdmFyaWFibGUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldE51bWJlclZhbHVlQXRJbmRleFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3BlIC0gVGhlIHZhcmlhYmxlJ3Mgc2NvcGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBUaGUgaW5kZXggb2YgdGhlIHZhcmlhYmxlIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBudW1iZXIgdmFsdWUgdG8gc2V0IHRoZSB2YXJpYWJsZSB0by5cbiAgICAjIyNcbiAgICBzZXROdW1iZXJWYWx1ZUF0SW5kZXg6IChzY29wZSwgaW5kZXgsIHZhbHVlLCBkb21haW4pIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbilcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIG51bWJlciB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldE51bWJlclZhbHVlVG9cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YXJpYWJsZSAtIFRoZSB2YXJpYWJsZSB0byBzZXQuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgbnVtYmVyIHZhbHVlIHRvIHNldCB0aGUgdmFyaWFibGUgdG8uXG4gICAgIyMjXG4gICAgc2V0TnVtYmVyVmFsdWVUbzogKHZhcmlhYmxlLCB2YWx1ZSkgLT4gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXROdW1iZXJWYWx1ZVRvKHZhcmlhYmxlLCB2YWx1ZSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIGxpc3QgdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXRMaXN0T2JqZWN0VG9cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSB2YXJpYWJsZSAtIFRoZSB2YXJpYWJsZSB0byBzZXQuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgLSBUaGUgbGlzdCBvYmplY3QgdG8gc2V0IHRoZSB2YXJpYWJsZSB0by5cbiAgICAjIyNcbiAgICBzZXRMaXN0T2JqZWN0VG86ICh2YXJpYWJsZSwgdmFsdWUpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0TGlzdE9iamVjdFRvKHZhcmlhYmxlLCB2YWx1ZSlcblxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIHZhbHVlIG9mIGEgYm9vbGVhbi9zd2l0Y2ggdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXRCb29sZWFuVmFsdWVUb1xuICAgICogQHBhcmFtIHtPYmplY3R9IHZhcmlhYmxlIC0gVGhlIHZhcmlhYmxlIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgLSBUaGUgYm9vbGVhbiB2YWx1ZSB0byBzZXQgdGhlIHZhcmlhYmxlIHRvLlxuICAgICMjI1xuICAgIHNldEJvb2xlYW5WYWx1ZVRvOiAodmFyaWFibGUsIHZhbHVlKSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldEJvb2xlYW5WYWx1ZVRvKHZhcmlhYmxlLCB2YWx1ZSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIG51bWJlciB2YXJpYWJsZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0Qm9vbGVhblZhbHVlQXRJbmRleFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3BlIC0gVGhlIHZhcmlhYmxlJ3Mgc2NvcGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBUaGUgaW5kZXggb2YgdGhlIHZhcmlhYmxlIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgLSBUaGUgYm9vbGVhbiB2YWx1ZSB0byBzZXQgdGhlIHZhcmlhYmxlIHRvLlxuICAgICMjI1xuICAgIHNldEJvb2xlYW5WYWx1ZUF0SW5kZXg6IChzY29wZSwgaW5kZXgsIHZhbHVlLCBkb21haW4pIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0Qm9vbGVhblZhbHVlQXRJbmRleChzY29wZSwgaW5kZXgsIHZhbHVlLCBkb21haW4pXG4gICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgdmFsdWUgb2YgYSBzdHJpbmcvdGV4dCB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldFN0cmluZ1ZhbHVlVG9cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSB2YXJpYWJsZSAtIFRoZSB2YXJpYWJsZSB0byBzZXQuXG4gICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc3RyaW5nL3RleHQgdmFsdWUgdG8gc2V0IHRoZSB2YXJpYWJsZSB0by5cbiAgICAjIyNcbiAgICBzZXRTdHJpbmdWYWx1ZVRvOiAodmFyaWFibGUsIHZhbHVlKSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldFN0cmluZ1ZhbHVlVG8odmFyaWFibGUsIHZhbHVlKVxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBzdHJpbmcgdmFyaWFibGUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldFN0cmluZ1ZhbHVlQXRJbmRleFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3BlIC0gVGhlIHZhcmlhYmxlIHNjb3BlLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gVGhlIHZhcmlhYmxlJ3MgaW5kZXguXG4gICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gc2V0LlxuICAgICMjIyAgICAgXG4gICAgc2V0U3RyaW5nVmFsdWVBdEluZGV4OiAoc2NvcGUsIGluZGV4LCB2YWx1ZSwgZG9tYWluKSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldFN0cmluZ1ZhbHVlQXRJbmRleChzY29wZSwgaW5kZXgsIHZhbHVlLCBkb21haW4pXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIChwb3NzaWJsZSkgc3RyaW5nIHZhcmlhYmxlLiBJZiBhIGNvbnN0YW50IHN0cmluZyB2YWx1ZSBpcyBzcGVjaWZpZWQsIHRoaXMgbWV0aG9kXG4gICAgKiBkb2VzIG5vdGhpbmcgYW4ganVzdCByZXR1cm5zIHRoYXQgY29uc3RhbnQgdmFsdWUuIFRoYXQncyB0byBtYWtlIGl0IG1vcmUgY29tZm9ydGFibGUgdG8ganVzdCBwYXNzIGEgdmFsdWUgd2hpY2hcbiAgICAqIGNhbiBiZSBjYWxjdWxhdGVkIGJ5IHZhcmlhYmxlIGJ1dCBhbHNvIGJlIGp1c3QgYSBjb25zdGFudCB2YWx1ZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHN0cmluZ1ZhbHVlT2ZcbiAgICAqIEBwYXJhbSB7c3RyaW5nfE9iamVjdH0gb2JqZWN0IC0gQSBzdHJpbmcgdmFyaWFibGUgb3IgY29uc3RhbnQgc3RyaW5nIHZhbHVlLlxuICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyBcbiAgICBzdHJpbmdWYWx1ZU9mOiAob2JqZWN0KSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnN0cmluZ1ZhbHVlT2Yob2JqZWN0KVxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIHRoZSBzdHJpbmcgdmFyaWFibGUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHN0cmluZ1ZhbHVlQXRJbmRleFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3BlIC0gVGhlIHZhcmlhYmxlJ3Mgc2NvcGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBUaGUgaW5kZXggb2YgdGhlIHZhcmlhYmxlIHRvIGdldCB0aGUgdmFsdWUgZnJvbS5cbiAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgICAgIFxuICAgIHN0cmluZ1ZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgZG9tYWluKSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnN0cmluZ1ZhbHVlQXRJbmRleChzY29wZSwgaW5kZXgsIGRvbWFpbilcbiAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIChwb3NzaWJsZSkgYm9vbGVhbiB2YXJpYWJsZS4gSWYgYSBjb25zdGFudCBib29sZWFuIHZhbHVlIGlzIHNwZWNpZmllZCwgdGhpcyBtZXRob2RcbiAgICAqIGRvZXMgbm90aGluZyBhbiBqdXN0IHJldHVybnMgdGhhdCBjb25zdGFudCB2YWx1ZS4gVGhhdCdzIHRvIG1ha2UgaXQgbW9yZSBjb21mb3J0YWJsZSB0byBqdXN0IHBhc3MgYSB2YWx1ZSB3aGljaFxuICAgICogY2FuIGJlIGNhbGN1bGF0ZWQgYnkgdmFyaWFibGUgYnV0IGFsc28gYmUganVzdCBhIGNvbnN0YW50IHZhbHVlLlxuICAgICpcbiAgICAqIEBtZXRob2QgYm9vbGVhblZhbHVlT2ZcbiAgICAqIEBwYXJhbSB7Ym9vbGVhbnxPYmplY3R9IG9iamVjdCAtIEEgYm9vbGVhbiB2YXJpYWJsZSBvciBjb25zdGFudCBib29sZWFuIHZhbHVlLlxuICAgICogQHJldHVybiB7Ym9vbGVhbn0gVGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgXG4gICAgYm9vbGVhblZhbHVlT2Y6IChvYmplY3QpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuYm9vbGVhblZhbHVlT2Yob2JqZWN0KVxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIHRoZSBib29sZWFuIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBib29sZWFuVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUncyBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSBpbmRleCBvZiB0aGUgdmFyaWFibGUgdG8gZ2V0IHRoZSB2YWx1ZSBmcm9tLlxuICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyAgICAgXG4gICAgYm9vbGVhblZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgZG9tYWluKSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLmJvb2xlYW5WYWx1ZUF0SW5kZXgoc2NvcGUsIGluZGV4LCBkb21haW4pXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgdmFsdWUgb2YgYSAocG9zc2libGUpIGxpc3QgdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBsaXN0T2JqZWN0T2ZcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBBIGxpc3QgdmFyaWFibGUuXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IFRoZSB2YWx1ZSBvZiB0aGUgbGlzdCB2YXJpYWJsZS5cbiAgICAjIyMgXG4gICAgbGlzdE9iamVjdE9mOiAob2JqZWN0KSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLmxpc3RPYmplY3RPZihvYmplY3QpXG4gICAgXG4gICAgIyMjKlxuICAgICogQ29tcGFyZXMgdHdvIG9iamVjdCB1c2luZyB0aGUgc3BlY2lmaWVkIG9wZXJhdGlvbiBhbmQgcmV0dXJucyB0aGUgcmVzdWx0LlxuICAgICpcbiAgICAqIEBtZXRob2QgY29tcGFyZVxuICAgICogQHBhcmFtIHtPYmplY3R9IGEgLSBPYmplY3QgQS5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBiIC0gT2JqZWN0IEIuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gb3BlcmF0aW9uIC0gVGhlIGNvbXBhcmUtb3BlcmF0aW9uIHRvIGNvbXBhcmUgT2JqZWN0IEEgd2l0aCBPYmplY3QgQi5cbiAgICAqIDx1bD5cbiAgICAqIDxsaT4wID0gRXF1YWwgVG88L2xpPlxuICAgICogPGxpPjEgPSBOb3QgRXF1YWwgVG88L2xpPlxuICAgICogPGxpPjIgPSBHcmVhdGVyIFRoYW48L2xpPlxuICAgICogPGxpPjMgPSBHcmVhdGVyIG9yIEVxdWFsIFRvPC9saT5cbiAgICAqIDxsaT40ID0gTGVzcyBUaGFuPC9saT5cbiAgICAqIDxsaT41ID0gTGVzcyBvciBFcXVhbCBUbzwvbGk+XG4gICAgKiA8L3VsPlxuICAgICogQHJldHVybiB7Ym9vbGVhbn0gVGhlIGNvbXBhcmlzb24gcmVzdWx0LlxuICAgICMjIyBcbiAgICBjb21wYXJlOiAoYSwgYiwgb3BlcmF0aW9uKSAtPlxuICAgICAgICBzd2l0Y2ggb3BlcmF0aW9uXG4gICAgICAgICAgICB3aGVuIDAgdGhlbiByZXR1cm4gYGEgPT0gYmBcbiAgICAgICAgICAgIHdoZW4gMSB0aGVuIHJldHVybiBgYSAhPSBiYFxuICAgICAgICAgICAgd2hlbiAyIHRoZW4gcmV0dXJuIGEgPiBiXG4gICAgICAgICAgICB3aGVuIDMgdGhlbiByZXR1cm4gYSA+PSBiXG4gICAgICAgICAgICB3aGVuIDQgdGhlbiByZXR1cm4gYSA8IGJcbiAgICAgICAgICAgIHdoZW4gNSB0aGVuIHJldHVybiBhIDw9IGJcbiAgICAgXG4gICAgIyMjKlxuICAgICogQ2hhbmdlcyBudW1iZXIgdmFyaWFibGVzIGFuZCBhbGxvd3MgZGVjaW1hbCB2YWx1ZXMgc3VjaCBhcyAwLjUgdG9vLlxuICAgICpcbiAgICAqIEBtZXRob2QgY2hhbmdlRGVjaW1hbFZhcmlhYmxlc1xuICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIElucHV0IHBhcmFtcyBmcm9tIHRoZSBjb21tYW5kXG4gICAgKiBAcGFyYW0ge09iamVjdH0gcm91bmRNZXRob2QgLSBUaGUgcmVzdWx0IG9mIHRoZSBvcGVyYXRpb24gd2lsbCBiZSByb3VuZGVkIHVzaW5nIHRoZSBzcGVjaWZpZWQgbWV0aG9kLlxuICAgICogPHVsPlxuICAgICogPGxpPjAgPSBOb25lLiBUaGUgcmVzdWx0IHdpbGwgbm90IGJlIHJvdW5kZWQuPC9saT5cbiAgICAqIDxsaT4xID0gQ29tbWVyY2lhbGx5PC9saT5cbiAgICAqIDxsaT4yID0gUm91bmQgVXA8L2xpPlxuICAgICogPGxpPjMgPSBSb3VuZCBEb3duPC9saT5cbiAgICAqIDwvdWw+XG4gICAgIyMjICAgICAgIFxuICAgIGNoYW5nZURlY2ltYWxWYXJpYWJsZXM6IChwYXJhbXMsIHJvdW5kTWV0aG9kKSAtPlxuICAgICAgICBzb3VyY2UgPSAwXG4gICAgICAgIHJvdW5kRnVuYyA9IG51bGxcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCByb3VuZE1ldGhvZFxuICAgICAgICAgICAgd2hlbiAwIHRoZW4gcm91bmRGdW5jID0gKHZhbHVlKSAtPiB2YWx1ZVxuICAgICAgICAgICAgd2hlbiAxIHRoZW4gcm91bmRGdW5jID0gKHZhbHVlKSAtPiBNYXRoLnJvdW5kKHZhbHVlKVxuICAgICAgICAgICAgd2hlbiAyIHRoZW4gcm91bmRGdW5jID0gKHZhbHVlKSAtPiBNYXRoLmNlaWwodmFsdWUpXG4gICAgICAgICAgICB3aGVuIDMgdGhlbiByb3VuZEZ1bmMgPSAodmFsdWUpIC0+IE1hdGguZmxvb3IodmFsdWUpXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggcGFyYW1zLnNvdXJjZVxuICAgICAgICAgICAgd2hlbiAwICMgQ29uc3RhbnQgVmFsdWUgLyBWYXJpYWJsZSBWYWx1ZVxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5zb3VyY2VWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFJhbmRvbVxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gQG51bWJlclZhbHVlT2YocGFyYW1zLnNvdXJjZVJhbmRvbS5zdGFydClcbiAgICAgICAgICAgICAgICBlbmQgPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMuc291cmNlUmFuZG9tLmVuZClcbiAgICAgICAgICAgICAgICBkaWZmID0gZW5kIC0gc3RhcnRcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBNYXRoLmZsb29yKHN0YXJ0ICsgTWF0aC5yYW5kb20oKSAqIChkaWZmKzEpKVxuICAgICAgICAgICAgd2hlbiAyICMgUG9pbnRlclxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEBudW1iZXJWYWx1ZUF0SW5kZXgocGFyYW1zLnNvdXJjZVNjb3BlLCBAbnVtYmVyVmFsdWVPZihwYXJhbXMuc291cmNlUmVmZXJlbmNlKS0xLCBwYXJhbXMuc291cmNlUmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgd2hlbiAzICMgR2FtZSBEYXRhXG4gICAgICAgICAgICAgICAgc291cmNlID0gQG51bWJlclZhbHVlT2ZHYW1lRGF0YShwYXJhbXMuc291cmNlVmFsdWUxKVxuICAgICAgICAgICAgd2hlbiA0ICMgRGF0YWJhc2UgRGF0YVxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEBudW1iZXJWYWx1ZU9mRGF0YWJhc2VEYXRhKHBhcmFtcy5zb3VyY2VWYWx1ZTEpXG4gICAgICAgICAgICBcbiAgICAgICAgc3dpdGNoIHBhcmFtcy50YXJnZXRcbiAgICAgICAgICAgIHdoZW4gMCAjIFZhcmlhYmxlXG4gICAgICAgICAgICAgICAgc3dpdGNoIHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHJvdW5kRnVuYyhzb3VyY2UpKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBBZGRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZVRvKHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgcm91bmRGdW5jKEBudW1iZXJWYWx1ZU9mKHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgKyBzb3VyY2UpIClcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgU3ViXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVPZihwYXJhbXMudGFyZ2V0VmFyaWFibGUpIC0gc291cmNlKSApXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMyAjIE11bFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlVG8ocGFyYW1zLnRhcmdldFZhcmlhYmxlLCByb3VuZEZ1bmMoQG51bWJlclZhbHVlT2YocGFyYW1zLnRhcmdldFZhcmlhYmxlKSAqIHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNCAjIERpdlxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlVG8ocGFyYW1zLnRhcmdldFZhcmlhYmxlLCByb3VuZEZ1bmMoQG51bWJlclZhbHVlT2YocGFyYW1zLnRhcmdldFZhcmlhYmxlKSAvIHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNSAjIE1vZFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlVG8ocGFyYW1zLnRhcmdldFZhcmlhYmxlLCBAbnVtYmVyVmFsdWVPZihwYXJhbXMudGFyZ2V0VmFyaWFibGUpICUgc291cmNlKVxuICAgICAgICAgICAgd2hlbiAxICMgUmFuZ2VcbiAgICAgICAgICAgICAgICBzY29wZSA9IHBhcmFtcy50YXJnZXRTY29wZVxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gcGFyYW1zLnRhcmdldFJhbmdlLnN0YXJ0LTFcbiAgICAgICAgICAgICAgICBlbmQgPSBwYXJhbXMudGFyZ2V0UmFuZ2UuZW5kLTFcbiAgICAgICAgICAgICAgICBmb3IgaSBpbiBbc3RhcnQuLmVuZF1cbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIFNldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIHJvdW5kRnVuYyhzb3VyY2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgcm91bmRGdW5jKEBudW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGkpICsgc291cmNlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFN1YlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpKSAtIHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBNdWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpLCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgKiBzb3VyY2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiA0ICMgRGl2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgcm91bmRGdW5jKEBudW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGkpIC8gc291cmNlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gNSAjIE1vZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIEBudW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGkpICUgc291cmNlKVxuICAgICAgICAgICAgd2hlbiAyICMgUmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgaW5kZXggPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMudGFyZ2V0UmVmZXJlbmNlKSAtIDFcbiAgICAgICAgICAgICAgICBzd2l0Y2ggcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZUF0SW5kZXgocGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgcm91bmRGdW5jKHNvdXJjZSksIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKSArIHNvdXJjZSksIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFN1YlxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKSAtIHNvdXJjZSksIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMyAjIE11bFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKSAqIHNvdXJjZSksIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNCAjIERpdlxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKSAvIHNvdXJjZSksIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNSAjIE1vZFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAbnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pICUgc291cmNlLCBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICBcbiAgICAjIyMqXG4gICAgKiBTaGFrZXMgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNoYWtlT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gc2hha2UuXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mbyBhYm91dCB0aGUgc2hha2UtYW5pbWF0aW9uLlxuICAgICMjIyAgICAgICAgXG4gICAgc2hha2VPYmplY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgZHVyYXRpb24gPSBNYXRoLm1heChNYXRoLnJvdW5kKEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKSksIDIpXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLnNoYWtlKHsgeDogQG51bWJlclZhbHVlT2YocGFyYW1zLnJhbmdlLngpLCB5OiBAbnVtYmVyVmFsdWVPZihwYXJhbXMucmFuZ2UueSkgfSwgQG51bWJlclZhbHVlT2YocGFyYW1zLnNwZWVkKSAvIDEwMCwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgIFxuICAgICMjIypcbiAgICAqIExldHMgdGhlIGludGVycHJldGVyIHdhaXQgZm9yIHRoZSBjb21wbGV0aW9uIG9mIGEgcnVubmluZyBvcGVyYXRpb24gbGlrZSBhbiBhbmltYXRpb24sIGV0Yy5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHdhaXRGb3JDb21wbGV0aW9uXG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdGhlIG9wZXJhdGlvbiBpcyBleGVjdXRlZCBvbi4gQ2FuIGJlIDxiPm51bGw8L2I+LlxuICAgICogQHJldHVybiB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjICBcbiAgICB3YWl0Rm9yQ29tcGxldGlvbjogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICBcbiAgICAjIyMqXG4gICAgKiBFcmFzZXMgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGVyYXNlT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gZXJhc2UuXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgICAgICBcbiAgICBlcmFzZU9iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLmRpc2FwcGVhcihwYXJhbXMuYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uLCAoc2VuZGVyKSA9PiBcbiAgICAgICAgICAgIHNlbmRlci5kaXNwb3NlKClcbiAgICAgICAgKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uIFxuICAgIFxuICAgICMjIypcbiAgICAqIFNob3dzIGEgZ2FtZSBvYmplY3Qgb24gc2NyZWVuLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2hvd09iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIHNob3cuXG4gICAgKiBAcGFyYW0ge2dzLlBvaW50fSBwb3NpdGlvbiAtIFRoZSBwb3NpdGlvbiB3aGVyZSB0aGUgZ2FtZSBvYmplY3Qgc2hvdWxkIGJlIHNob3duLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgICAgICAgICAgXG4gICAgc2hvd09iamVjdDogKG9iamVjdCwgcG9zaXRpb24sIHBhcmFtcykgLT5cbiAgICAgICAgeCA9IEBudW1iZXJWYWx1ZU9mKHBvc2l0aW9uLngpXG4gICAgICAgIHkgPSBAbnVtYmVyVmFsdWVPZihwb3NpdGlvbi55KVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgIFxuICAgICAgICBvYmplY3QuYW5pbWF0b3IuYXBwZWFyKHgsIHksIHBhcmFtcy5hbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24pXG4gICAgICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgXG4gICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIE1vdmVzIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBtb3ZlT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gbW92ZS5cbiAgICAqIEBwYXJhbSB7Z3MuUG9pbnR9IHBvc2l0aW9uIC0gVGhlIHBvc2l0aW9uIHRvIG1vdmUgdGhlIGdhbWUgb2JqZWN0IHRvLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgXG4gICAgbW92ZU9iamVjdDogKG9iamVjdCwgcG9zaXRpb24sIHBhcmFtcykgLT5cbiAgICAgICAgaWYgcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICBwID0gQHByZWRlZmluZWRPYmplY3RQb3NpdGlvbihwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIG9iamVjdCwgcGFyYW1zKVxuICAgICAgICAgICAgeCA9IHAueFxuICAgICAgICAgICAgeSA9IHAueVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICB4ID0gQG51bWJlclZhbHVlT2YocG9zaXRpb24ueClcbiAgICAgICAgICAgIHkgPSBAbnVtYmVyVmFsdWVPZihwb3NpdGlvbi55KVxuICAgIFxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIG9iamVjdC5hbmltYXRvci5tb3ZlVG8oeCwgeSwgZHVyYXRpb24sIGVhc2luZylcbiAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBNb3ZlcyBhIGdhbWUgb2JqZWN0IGFsb25nIGEgcGF0aC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG1vdmVPYmplY3RQYXRoXG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gbW92ZS5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoIC0gVGhlIHBhdGggdG8gbW92ZSB0aGUgZ2FtZSBvYmplY3QgYWxvbmcuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyBcbiAgICBtb3ZlT2JqZWN0UGF0aDogKG9iamVjdCwgcGF0aCwgcGFyYW1zKSAtPlxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLm1vdmVQYXRoKHBhdGguZGF0YSwgcGFyYW1zLmxvb3BUeXBlLCBkdXJhdGlvbiwgZWFzaW5nLCBwYXRoLmVmZmVjdHM/LmRhdGEpXG4gICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgIFxuICAgICMjIypcbiAgICAqIFNjcm9sbHMgYSBzY3JvbGxhYmxlIGdhbWUgb2JqZWN0IGFsb25nIGEgcGF0aC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNjcm9sbE9iamVjdFBhdGhcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBzY3JvbGwuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gcGF0aCAtIFRoZSBwYXRoIHRvIHNjcm9sbCB0aGUgZ2FtZSBvYmplY3QgYWxvbmcuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyAgICAgICAgXG4gICAgc2Nyb2xsT2JqZWN0UGF0aDogKG9iamVjdCwgcGF0aCwgcGFyYW1zKSAtPlxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLnNjcm9sbFBhdGgocGF0aCwgcGFyYW1zLmxvb3BUeXBlLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIFpvb21zL1NjYWxlcyBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgem9vbU9iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIHpvb20uXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyBcbiAgICB6b29tT2JqZWN0OiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3Iuem9vbVRvKEBudW1iZXJWYWx1ZU9mKHBhcmFtcy56b29taW5nLngpIC8gMTAwLCBAbnVtYmVyVmFsdWVPZihwYXJhbXMuem9vbWluZy55KSAvIDEwMCwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogUm90YXRlcyBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgcm90YXRlT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gcm90YXRlLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgXG4gICAgcm90YXRlT2JqZWN0OiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgI2lmIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwXG4gICAgICAgICMgICAgYWN0dWFsRHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgICMgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKEBkdXJhdGlvbilcbiAgICAgICAgIyAgICBzcGVlZCA9IEBudW1iZXJWYWx1ZU9mKEBwYXJhbXMuc3BlZWQpIC8gMTAwXG4gICAgICAgICMgICAgc3BlZWQgPSBNYXRoLnJvdW5kKGR1cmF0aW9uIC8gKGFjdHVhbER1cmF0aW9ufHwxKSAqIHNwZWVkKVxuICAgICAgICAjICAgIHBpY3R1cmUuYW5pbWF0b3Iucm90YXRlKEBwYXJhbXMuZGlyZWN0aW9uLCBzcGVlZCwgYWN0dWFsRHVyYXRpb258fDEsIGVhc2luZylcbiAgICAgICAgIyAgICBkdXJhdGlvbiA9IGFjdHVhbER1cmF0aW9uXG4gICAgICAgICNlbHNlXG4gICAgICAgICMgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgIyAgICBvYmplY3QuYW5pbWF0b3Iucm90YXRlKHBhcmFtcy5kaXJlY3Rpb24sIEBudW1iZXJWYWx1ZU9mKEBwYXJhbXMuc3BlZWQpIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLnJvdGF0ZShwYXJhbXMuZGlyZWN0aW9uLCBAbnVtYmVyVmFsdWVPZihwYXJhbXMuc3BlZWQpIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogQmxlbmRzIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBibGVuZE9iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIGJsZW5kLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyNcbiAgICBibGVuZE9iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLmJsZW5kVG8oQG51bWJlclZhbHVlT2YocGFyYW1zLm9wYWNpdHkpLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBFeGVjdXRlcyBhIG1hc2tpbmctZWZmZWN0IG9uIGEgZ2FtZSBvYmplY3QuLlxuICAgICpcbiAgICAqIEBtZXRob2QgbWFza09iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIGV4ZWN1dGUgYSBtYXNraW5nLWVmZmVjdCBvbi5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjIFxuICAgIG1hc2tPYmplY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KHBhcmFtcy5lYXNpbmcpXG4gICAgICBcbiAgICAgICAgaWYgcGFyYW1zLm1hc2sudHlwZSA9PSAwXG4gICAgICAgICAgICBvYmplY3QubWFzay50eXBlID0gMFxuICAgICAgICAgICAgb2JqZWN0Lm1hc2sub3ggPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMubWFzay5veClcbiAgICAgICAgICAgIG9iamVjdC5tYXNrLm95ID0gQG51bWJlclZhbHVlT2YocGFyYW1zLm1hc2sub3kpXG4gICAgICAgICAgICBpZiBvYmplY3QubWFzay5zb3VyY2U/LnZpZGVvRWxlbWVudD9cbiAgICAgICAgICAgICAgICBvYmplY3QubWFzay5zb3VyY2UucGF1c2UoKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgcGFyYW1zLm1hc2suc291cmNlVHlwZSA9PSAwXG4gICAgICAgICAgICAgICAgb2JqZWN0Lm1hc2suc291cmNlID0gUmVzb3VyY2VNYW5hZ2VyLmdldEJpdG1hcChcIkdyYXBoaWNzL01hc2tzLyN7cGFyYW1zLm1hc2suZ3JhcGhpYz8ubmFtZX1cIilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBvYmplY3QubWFzay5zb3VyY2UgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0VmlkZW8oXCJNb3ZpZXMvI3twYXJhbXMubWFzay52aWRlbz8ubmFtZX1cIilcbiAgICAgICAgICAgICAgICBpZiBvYmplY3QubWFzay5zb3VyY2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lm1hc2suc291cmNlLnBsYXkoKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QubWFzay5zb3VyY2UubG9vcCA9IHllc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICAgICAgb2JqZWN0LmFuaW1hdG9yLm1hc2tUbyhwYXJhbXMubWFzaywgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgXG4gICAgIyMjKlxuICAgICogVGludHMgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHRpbnRPYmplY3RcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byB0aW50LlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgICAgICAgXG4gICAgdGludE9iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLnRpbnRUbyhwYXJhbXMudG9uZSwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICBcbiAgICAjIyMqXG4gICAgKiBGbGFzaGVzIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBmbGFzaE9iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIGZsYXNoLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgXG4gICAgZmxhc2hPYmplY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLmZsYXNoKG5ldyBDb2xvcihwYXJhbXMuY29sb3IpLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgIFxuICAgICMjIypcbiAgICAqIENyb3BlcyBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2QgY3JvcE9iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIGNyb3AuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyAgICAgICAgIFxuICAgIGNyb3BPYmplY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgb2JqZWN0LnNyY1JlY3QueCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy54KVxuICAgICAgICBvYmplY3Quc3JjUmVjdC55ID0gQG51bWJlclZhbHVlT2YocGFyYW1zLnkpXG4gICAgICAgIG9iamVjdC5zcmNSZWN0LndpZHRoID0gQG51bWJlclZhbHVlT2YocGFyYW1zLndpZHRoKVxuICAgICAgICBvYmplY3Quc3JjUmVjdC5oZWlnaHQgPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMuaGVpZ2h0KVxuICAgICAgICBcbiAgICAgICAgb2JqZWN0LmRzdFJlY3Qud2lkdGggPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMud2lkdGgpXG4gICAgICAgIG9iamVjdC5kc3RSZWN0LmhlaWdodCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5oZWlnaHQpXG4gICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgbW90aW9uIGJsdXIgc2V0dGluZ3Mgb2YgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9iamVjdE1vdGlvbkJsdXJcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBzZXQgdGhlIG1vdGlvbiBibHVyIHNldHRpbmdzIGZvci5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjXG4gICAgb2JqZWN0TW90aW9uQmx1cjogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBvYmplY3QubW90aW9uQmx1ci5zZXQocGFyYW1zLm1vdGlvbkJsdXIpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEVuYWJsZXMgYW4gZWZmZWN0IG9uIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBvYmplY3RFZmZlY3RcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBleGVjdXRlIGEgbWFza2luZy1lZmZlY3Qgb24uXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyBcbiAgICBvYmplY3RFZmZlY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgZHVyYXRpb24gPSBAZHVyYXRpb25WYWx1ZU9mKHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggcGFyYW1zLnR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIFdvYmJsZVxuICAgICAgICAgICAgICAgIG9iamVjdC5hbmltYXRvci53b2JibGVUbyhwYXJhbXMud29iYmxlLnBvd2VyIC8gMTAwMDAsIHBhcmFtcy53b2JibGUuc3BlZWQgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgd29iYmxlID0gb2JqZWN0LmVmZmVjdHMud29iYmxlXG4gICAgICAgICAgICAgICAgd29iYmxlLmVuYWJsZWQgPSBwYXJhbXMud29iYmxlLnBvd2VyID4gMFxuICAgICAgICAgICAgICAgIHdvYmJsZS52ZXJ0aWNhbCA9IHBhcmFtcy53b2JibGUub3JpZW50YXRpb24gPT0gMCBvciBwYXJhbXMud29iYmxlLm9yaWVudGF0aW9uID09IDJcbiAgICAgICAgICAgICAgICB3b2JibGUuaG9yaXpvbnRhbCA9IHBhcmFtcy53b2JibGUub3JpZW50YXRpb24gPT0gMSBvciBwYXJhbXMud29iYmxlLm9yaWVudGF0aW9uID09IDJcbiAgICAgICAgICAgIHdoZW4gMSAjIEJsdXJcbiAgICAgICAgICAgICAgICBvYmplY3QuYW5pbWF0b3IuYmx1clRvKHBhcmFtcy5ibHVyLnBvd2VyIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICAgICAgICAgIG9iamVjdC5lZmZlY3RzLmJsdXIuZW5hYmxlZCA9IHllc1xuICAgICAgICAgICAgd2hlbiAyICMgUGl4ZWxhdGVcbiAgICAgICAgICAgICAgICBvYmplY3QuYW5pbWF0b3IucGl4ZWxhdGVUbyhwYXJhbXMucGl4ZWxhdGUuc2l6ZS53aWR0aCwgcGFyYW1zLnBpeGVsYXRlLnNpemUuaGVpZ2h0LCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICAgICAgICAgIG9iamVjdC5lZmZlY3RzLnBpeGVsYXRlLmVuYWJsZWQgPSB5ZXNcbiAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBkdXJhdGlvbiAhPSAwXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuIFxuICAgICMjIypcbiAgICAqIEV4ZWN1dGVzIGFuIGFjdGlvbiBsaWtlIGZvciBhIGhvdHNwb3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBleGVjdXRlQWN0aW9uXG4gICAgKiBAcGFyYW0ge09iamVjdH0gYWN0aW9uIC0gQWN0aW9uLURhdGEuXG4gICAgKiBAcGFyYW0ge2Jvb2xlYW59IHN0YXRlVmFsdWUgLSBJbiBjYXNlIG9mIHN3aXRjaC1iaW5kaW5nLCB0aGUgc3dpdGNoIGlzIHNldCB0byB0aGlzIHZhbHVlLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGJpbmRWYWx1ZSAtIEEgbnVtYmVyIHZhbHVlIHdoaWNoIGJlIHB1dCBpbnRvIHRoZSBhY3Rpb24ncyBiaW5kLXZhbHVlIHZhcmlhYmxlLlxuICAgICMjI1xuICAgIGV4ZWN1dGVBY3Rpb246IChhY3Rpb24sIHN0YXRlVmFsdWUsIGJpbmRWYWx1ZSkgLT5cbiAgICAgICAgc3dpdGNoIGFjdGlvbi50eXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBKdW1wIFRvIExhYmVsXG4gICAgICAgICAgICAgICAgaWYgYWN0aW9uLmxhYmVsSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgQHBvaW50ZXIgPSBhY3Rpb24ubGFiZWxJbmRleFxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgQGp1bXBUb0xhYmVsKGFjdGlvbi5sYWJlbClcbiAgICAgICAgICAgIHdoZW4gMSAjIENhbGwgQ29tbW9uIEV2ZW50XG4gICAgICAgICAgICAgICAgQGNhbGxDb21tb25FdmVudChhY3Rpb24uY29tbW9uRXZlbnRJZCwgbnVsbCwgQGlzV2FpdGluZylcbiAgICAgICAgICAgIHdoZW4gMiAjIEJpbmQgVG8gU3dpdGNoXG4gICAgICAgICAgICAgICAgZG9tYWluID0gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5kb21haW5cbiAgICAgICAgICAgICAgICBAc2V0Qm9vbGVhblZhbHVlVG8oYWN0aW9uLnN3aXRjaCwgc3RhdGVWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMyAjIENhbGwgU2NlbmVcbiAgICAgICAgICAgICAgICBAY2FsbFNjZW5lKGFjdGlvbi5zY2VuZT8udWlkKVxuICAgICAgICAgICAgd2hlbiA0ICMgQmluZCBWYWx1ZSB0byBWYXJpYWJsZVxuICAgICAgICAgICAgICAgIGRvbWFpbiA9IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuZG9tYWluXG4gICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlVG8oYWN0aW9uLmJpbmRWYWx1ZVZhcmlhYmxlLCBiaW5kVmFsdWUpXG4gICAgICAgICAgICAgICAgaWYgYWN0aW9uLmxhYmVsSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgQHBvaW50ZXIgPSBhY3Rpb24ubGFiZWxJbmRleFxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgQGp1bXBUb0xhYmVsKGFjdGlvbi5sYWJlbClcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbHMgYSBjb21tb24gZXZlbnQgYW5kIHJldHVybnMgdGhlIHN1Yi1pbnRlcnByZXRlciBmb3IgaXQuXG4gICAgKlxuICAgICogQG1ldGhvZCBjYWxsQ29tbW9uRXZlbnRcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpZCAtIFRoZSBJRCBvZiB0aGUgY29tbW9uIGV2ZW50IHRvIGNhbGwuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVycyAtIE9wdGlvbmFsIGNvbW1vbiBldmVudCBwYXJhbWV0ZXJzLlxuICAgICogQHBhcmFtIHtib29sZWFufSB3YWl0IC0gSW5kaWNhdGVzIGlmIHRoZSBpbnRlcnByZXRlciBzaG91bGQgYmUgc3RheSBpbiB3YWl0aW5nLW1vZGUgZXZlbiBpZiB0aGUgc3ViLWludGVycHJldGVyIGlzIGZpbmlzaGVkLlxuICAgICMjIyBcbiAgICBjYWxsQ29tbW9uRXZlbnQ6IChpZCwgcGFyYW1ldGVycywgd2FpdCkgLT5cbiAgICAgICAgY29tbW9uRXZlbnQgPSBHYW1lTWFuYWdlci5jb21tb25FdmVudHNbaWRdXG4gICAgICAgIFxuICAgICAgICBpZiBjb21tb25FdmVudD9cbiAgICAgICAgICAgIGlmIFNjZW5lTWFuYWdlci5zY2VuZS5jb21tb25FdmVudENvbnRhaW5lci5zdWJPYmplY3RzLmluZGV4T2YoY29tbW9uRXZlbnQpID09IC0xXG4gICAgICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmNvbW1vbkV2ZW50Q29udGFpbmVyLmFkZE9iamVjdChjb21tb25FdmVudClcbiAgICAgICAgICAgIGNvbW1vbkV2ZW50LmV2ZW50cz8ub24gXCJmaW5pc2hcIiwgZ3MuQ2FsbEJhY2soXCJvbkNvbW1vbkV2ZW50RmluaXNoXCIsIHRoaXMpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlciA9IGNvbW1vbkV2ZW50LmJlaGF2aW9yLmNhbGwocGFyYW1ldGVycyB8fCBbXSwgQHNldHRpbmdzLCBAY29udGV4dClcbiAgICAgICAgICAgICNHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldHVwTG9jYWxWYXJpYWJsZXMoQHN1YkludGVycHJldGVyLmNvbnRleHQpXG4gICAgICAgICAgICAjR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXR1cFRlbXBWYXJpYWJsZXMoQHN1YkludGVycHJldGVyLmNvbnRleHQpXG4gICAgICAgICAgICBjb21tb25FdmVudC5iZWhhdmlvci51cGRhdGUoKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBAc3ViSW50ZXJwcmV0ZXI/XG4gICAgICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5zZXR0aW5ncyA9IEBzZXR0aW5nc1xuICAgICAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5zdGFydCgpXG4gICAgICAgICAgICAgICAgQHN1YkludGVycHJldGVyLnVwZGF0ZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQ2FsbHMgYSBzY2VuZSBhbmQgcmV0dXJucyB0aGUgc3ViLWludGVycHJldGVyIGZvciBpdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGNhbGxTY2VuZVxuICAgICogQHBhcmFtIHtTdHJpbmd9IHVpZCAtIFRoZSBVSUQgb2YgdGhlIHNjZW5lIHRvIGNhbGwuXG4gICAgIyMjICAgICAgICAgXG4gICAgY2FsbFNjZW5lOiAodWlkKSAtPlxuICAgICAgICBzY2VuZURvY3VtZW50ID0gRGF0YU1hbmFnZXIuZ2V0RG9jdW1lbnQodWlkKVxuICAgICAgICBcbiAgICAgICAgaWYgc2NlbmVEb2N1bWVudD9cbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlciA9IG5ldyB2bi5Db21wb25lbnRfQ2FsbFNjZW5lSW50ZXJwcmV0ZXIoKVxuICAgICAgICAgICAgb2JqZWN0ID0geyBjb21tYW5kczogc2NlbmVEb2N1bWVudC5pdGVtcy5jb21tYW5kcyB9XG4gICAgICAgICAgICBAc3ViSW50ZXJwcmV0ZXIucmVwZWF0ID0gbm9cbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5jb250ZXh0LnNldChzY2VuZURvY3VtZW50LnVpZCwgc2NlbmVEb2N1bWVudClcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5vYmplY3QgPSBvYmplY3RcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5vbkZpbmlzaCA9IGdzLkNhbGxCYWNrKFwib25DYWxsU2NlbmVGaW5pc2hcIiwgdGhpcylcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5zdGFydCgpXG4gICAgICAgICAgICBAc3ViSW50ZXJwcmV0ZXIuc2V0dGluZ3MgPSBAc2V0dGluZ3NcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci51cGRhdGUoKVxuICAgICAgICAgICAgXG4gIFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxscyBhIGNvbW1vbiBldmVudCBhbmQgcmV0dXJucyB0aGUgc3ViLWludGVycHJldGVyIGZvciBpdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHN0b3JlTGlzdFZhbHVlXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaWQgLSBUaGUgSUQgb2YgdGhlIGNvbW1vbiBldmVudCB0byBjYWxsLlxuICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtZXRlcnMgLSBPcHRpb25hbCBjb21tb24gZXZlbnQgcGFyYW1ldGVycy5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gd2FpdCAtIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgc2hvdWxkIGJlIHN0YXkgaW4gd2FpdGluZy1tb2RlIGV2ZW4gaWYgdGhlIHN1Yi1pbnRlcnByZXRlciBpcyBmaW5pc2hlZC5cbiAgICAjIyMgICAgICAgIFxuICAgIHN0b3JlTGlzdFZhbHVlOiAodmFyaWFibGUsIGxpc3QsIHZhbHVlLCB2YWx1ZVR5cGUpIC0+XG4gICAgICAgIHN3aXRjaCB2YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZVRvKHZhcmlhYmxlLCAoaWYgIWlzTmFOKHZhbHVlKSB0aGVuIHZhbHVlIGVsc2UgMCkpXG4gICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2ggVmFsdWVcbiAgICAgICAgICAgICAgICBAc2V0Qm9vbGVhblZhbHVlVG8odmFyaWFibGUsIChpZiB2YWx1ZSB0aGVuIDEgZWxzZSAwKSlcbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHQgVmFsdWVcbiAgICAgICAgICAgICAgICBAc2V0U3RyaW5nVmFsdWVUbyh2YXJpYWJsZSwgdmFsdWUudG9TdHJpbmcoKSlcbiAgICAgICAgICAgIHdoZW4gMyAjIExpc3QgVmFsdWVcbiAgICAgICAgICAgICAgICBAc2V0TGlzdE9iamVjdFRvKHZhcmlhYmxlLCAoaWYgdmFsdWUubGVuZ3RoPyB0aGVuIHZhbHVlIGVsc2UgW10pKSBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBqdW1wVG9MYWJlbFxuICAgICMjIyAgICAgICAgIFxuICAgIGp1bXBUb0xhYmVsOiAobGFiZWwpIC0+XG4gICAgICAgIHJldHVybiBpZiBub3QgbGFiZWxcbiAgICAgICAgZm91bmQgPSBub1xuICAgICAgICBcbiAgICAgICAgZm9yIGkgaW4gWzAuLi5Ab2JqZWN0LmNvbW1hbmRzLmxlbmd0aF1cbiAgICAgICAgICAgIGlmIEBvYmplY3QuY29tbWFuZHNbaV0uaWQgPT0gXCJncy5MYWJlbFwiIGFuZCBAb2JqZWN0LmNvbW1hbmRzW2ldLnBhcmFtcy5uYW1lID09IGxhYmVsXG4gICAgICAgICAgICAgICAgQHBvaW50ZXIgPSBpXG4gICAgICAgICAgICAgICAgQGluZGVudCA9IEBvYmplY3QuY29tbWFuZHNbaV0uaW5kZW50XG4gICAgICAgICAgICAgICAgZm91bmQgPSB5ZXNcbiAgICAgICAgICAgICAgICBicmVha1xuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiBmb3VuZFxuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gMFxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgY3VycmVudCBtZXNzYWdlIGJveCBvYmplY3QgZGVwZW5kaW5nIG9uIGdhbWUgbW9kZSAoQURWIG9yIE5WTCkuXG4gICAgKlxuICAgICogQG1ldGhvZCBtZXNzYWdlQm94T2JqZWN0XG4gICAgKiBAcmV0dXJuIHtncy5PYmplY3RfQmFzZX0gVGhlIG1lc3NhZ2UgYm94IG9iamVjdC5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICBcbiAgICBtZXNzYWdlQm94T2JqZWN0OiAoaWQpIC0+XG4gICAgICAgIGlmIFNjZW5lTWFuYWdlci5zY2VuZS5sYXlvdXQudmlzaWJsZVxuICAgICAgICAgICAgcmV0dXJuIGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKGlkIHx8IFwibWVzc2FnZUJveFwiKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoaWQgfHwgXCJtZXNzYWdlQm94TlZMXCIpXG4gICAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBjdXJyZW50IG1lc3NhZ2Ugb2JqZWN0IGRlcGVuZGluZyBvbiBnYW1lIG1vZGUgKEFEViBvciBOVkwpLlxuICAgICpcbiAgICAqIEBtZXRob2QgbWVzc2FnZU9iamVjdFxuICAgICogQHJldHVybiB7dWkuT2JqZWN0X01lc3NhZ2V9IFRoZSBtZXNzYWdlIG9iamVjdC5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgXG4gICAgbWVzc2FnZU9iamVjdDogLT5cbiAgICAgICAgaWYgU2NlbmVNYW5hZ2VyLnNjZW5lLmxheW91dC52aXNpYmxlXG4gICAgICAgICAgICByZXR1cm4gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJnYW1lTWVzc2FnZV9tZXNzYWdlXCIpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImdhbWVNZXNzYWdlTlZMX21lc3NhZ2VcIilcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBjdXJyZW50IG1lc3NhZ2UgSUQgZGVwZW5kaW5nIG9uIGdhbWUgbW9kZSAoQURWIG9yIE5WTCkuXG4gICAgKlxuICAgICogQG1ldGhvZCBtZXNzYWdlT2JqZWN0SWRcbiAgICAqIEByZXR1cm4ge3N0cmluZ30gVGhlIG1lc3NhZ2Ugb2JqZWN0IElELlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgXG4gICAgbWVzc2FnZU9iamVjdElkOiAtPlxuICAgICAgICBpZiBTY2VuZU1hbmFnZXIuc2NlbmUubGF5b3V0LnZpc2libGVcbiAgICAgICAgICAgIHJldHVybiBcImdhbWVNZXNzYWdlX21lc3NhZ2VcIlxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXR1cm4gXCJnYW1lTWVzc2FnZU5WTF9tZXNzYWdlXCJcbiAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBjdXJyZW50IG1lc3NhZ2Ugc2V0dGluZ3MuXG4gICAgKlxuICAgICogQG1ldGhvZCBtZXNzYWdlU2V0dGluZ3NcbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIG1lc3NhZ2Ugc2V0dGluZ3NcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIG1lc3NhZ2VTZXR0aW5nczogLT5cbiAgICAgICAgbWVzc2FnZSA9IEB0YXJnZXRNZXNzYWdlKClcblxuICAgICAgICByZXR1cm4gbWVzc2FnZS5zZXR0aW5nc1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBjdXJyZW50IHRhcmdldCBtZXNzYWdlIG9iamVjdCB3aGVyZSBhbGwgbWVzc2FnZSBjb21tYW5kcyBhcmUgZXhlY3V0ZWQgb24uXG4gICAgKlxuICAgICogQG1ldGhvZCB0YXJnZXRNZXNzYWdlXG4gICAgKiBAcmV0dXJuIHt1aS5PYmplY3RfTWVzc2FnZX0gVGhlIHRhcmdldCBtZXNzYWdlIG9iamVjdC5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICBcbiAgICB0YXJnZXRNZXNzYWdlOiAtPlxuICAgICAgICBtZXNzYWdlID0gQG1lc3NhZ2VPYmplY3QoKVxuICAgICAgICB0YXJnZXQgPSBAc2V0dGluZ3MubWVzc2FnZS50YXJnZXRcbiAgICAgICAgaWYgdGFyZ2V0P1xuICAgICAgICAgICAgc3dpdGNoIHRhcmdldC50eXBlXG4gICAgICAgICAgICAgICAgd2hlbiAwICMgTGF5b3V0LUJhc2VkXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZCh0YXJnZXQuaWQpID8gQG1lc3NhZ2VPYmplY3QoKVxuICAgICAgICAgICAgICAgIHdoZW4gMSAjIEN1c3RvbVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlID0gU2NlbmVNYW5hZ2VyLnNjZW5lLm1lc3NhZ2VBcmVhc1t0YXJnZXQuaWRdPy5tZXNzYWdlID8gQG1lc3NhZ2VPYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgY3VycmVudCB0YXJnZXQgbWVzc2FnZSBib3ggY29udGFpbmluZyB0aGUgY3VycmVudCB0YXJnZXQgbWVzc2FnZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHRhcmdldE1lc3NhZ2VCb3hcbiAgICAqIEByZXR1cm4ge3VpLk9iamVjdF9VSUVsZW1lbnR9IFRoZSB0YXJnZXQgbWVzc2FnZSBib3guXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICB0YXJnZXRNZXNzYWdlQm94OiAtPlxuICAgICAgICBtZXNzYWdlQm94ID0gQG1lc3NhZ2VPYmplY3QoKVxuICAgICAgICB0YXJnZXQgPSBAc2V0dGluZ3MubWVzc2FnZS50YXJnZXRcbiAgICAgICAgaWYgdGFyZ2V0P1xuICAgICAgICAgICAgc3dpdGNoIHRhcmdldC50eXBlXG4gICAgICAgICAgICAgICAgd2hlbiAwICMgTGF5b3V0LUJhc2VkXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VCb3ggPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZCh0YXJnZXQuaWQpID8gQG1lc3NhZ2VPYmplY3QoKVxuICAgICAgICAgICAgICAgIHdoZW4gMSAjIEN1c3RvbVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlQm94ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJjdXN0b21HYW1lTWVzc2FnZV9cIit0YXJnZXQuaWQpID8gQG1lc3NhZ2VPYmplY3QoKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIG1lc3NhZ2VCb3hcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIGFmdGVyIGFuIGlucHV0IG51bWJlciBkaWFsb2cgd2FzIGFjY2VwdGVkIGJ5IHRoZSB1c2VyLiBJdCB0YWtlcyB0aGUgdXNlcidzIGlucHV0IGFuZCBwdXRzXG4gICAgKiBpdCBpbiB0aGUgY29uZmlndXJlZCBudW1iZXIgdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBvbklucHV0TnVtYmVyRmluaXNoXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEV2ZW50IE9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgZGF0YSBsaWtlIHRoZSBudW1iZXIsIGV0Yy5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgXG4gICAgb25JbnB1dE51bWJlckZpbmlzaDogKGUpIC0+XG4gICAgICAgIEBtZXNzYWdlT2JqZWN0KCkuYmVoYXZpb3IuY2xlYXIoKVxuICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhAd2FpdGluZ0Zvci5pbnB1dE51bWJlci52YXJpYWJsZSwgcGFyc2VJbnQodWkuQ29tcG9uZW50X0Zvcm11bGFIYW5kbGVyLmZpZWxkVmFsdWUoZS5zZW5kZXIsIGUubnVtYmVyKSkpXG4gICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBAd2FpdGluZ0Zvci5pbnB1dE51bWJlciA9IG51bGxcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmlucHV0TnVtYmVyQm94LmRpc3Bvc2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCBhZnRlciBhbiBpbnB1dCB0ZXh0IGRpYWxvZyB3YXMgYWNjZXB0ZWQgYnkgdGhlIHVzZXIuIEl0IHRha2VzIHRoZSB1c2VyJ3MgdGV4dCBpbnB1dCBhbmQgcHV0c1xuICAgICogaXQgaW4gdGhlIGNvbmZpZ3VyZWQgc3RyaW5nIHZhcmlhYmxlLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25JbnB1dFRleHRGaW5pc2hcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhIGxpa2UgdGhlIHRleHQsIGV0Yy5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgb25JbnB1dFRleHRGaW5pc2g6IChlKSAtPlxuICAgICAgICBAbWVzc2FnZU9iamVjdCgpLmJlaGF2aW9yLmNsZWFyKClcbiAgICAgICAgQHNldFN0cmluZ1ZhbHVlVG8oQHdhaXRpbmdGb3IuaW5wdXRUZXh0LnZhcmlhYmxlLCB1aS5Db21wb25lbnRfRm9ybXVsYUhhbmRsZXIuZmllbGRWYWx1ZShlLnNlbmRlciwgZS50ZXh0KS5yZXBsYWNlKC9fL2csIFwiXCIpKVxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgQHdhaXRpbmdGb3IuaW5wdXRUZXh0ID0gbnVsbFxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuaW5wdXRUZXh0Qm94LmRpc3Bvc2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCBhZnRlciBhIGNob2ljZSB3YXMgc2VsZWN0ZWQgYnkgdGhlIHVzZXIuIEl0IGp1bXBzIHRvIHRoZSBjb3JyZXNwb25kaW5nIGxhYmVsXG4gICAgKiBhbmQgYWxzbyBwdXRzIHRoZSBjaG9pY2UgaW50byBiYWNrbG9nLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25DaG9pY2VBY2NlcHRcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhIGxpa2UgdGhlIGxhYmVsLCBldGMuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICBcbiAgICBvbkNob2ljZUFjY2VwdDogKGUpIC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmNob2ljZVRpbWVyLmJlaGF2aW9yLnN0b3AoKVxuICAgICAgICBcbiAgICAgICAgZS5pc1NlbGVjdGVkID0geWVzXG4gICAgICAgIGRlbGV0ZSBlLnNlbmRlclxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIuYmFja2xvZy5wdXNoKHsgY2hhcmFjdGVyOiB7IG5hbWU6IFwiXCIgfSwgbWVzc2FnZTogXCJcIiwgY2hvaWNlOiBlLCBjaG9pY2VzOiAkdGVtcEZpZWxkcy5jaG9pY2VzLCBpc0Nob2ljZTogeWVzIH0pXG4gICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlcyA9IFtdXG4gICAgICAgIG1lc3NhZ2VPYmplY3QgPSBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgIGlmIG1lc3NhZ2VPYmplY3Q/LnZpc2libGVcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIGZhZGluZyA9IEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5tZXNzYWdlRmFkaW5nXG4gICAgICAgICAgICBkdXJhdGlvbiA9IGlmIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwIHRoZW4gMCBlbHNlIGZhZGluZy5kdXJhdGlvblxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5hbmltYXRvci5kaXNhcHBlYXIoZmFkaW5nLmFuaW1hdGlvbiwgZmFkaW5nLmVhc2luZywgZHVyYXRpb24sID0+XG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5iZWhhdmlvci5jbGVhcigpXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC52aXNpYmxlID0gbm9cbiAgICAgICAgICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICBAd2FpdGluZ0Zvci5jaG9pY2UgPSBudWxsXG4gICAgICAgICAgICAgICAgQGV4ZWN1dGVBY3Rpb24oZS5hY3Rpb24sIHRydWUpXG4gICAgICAgICAgICApXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICAgICAgQGV4ZWN1dGVBY3Rpb24oZS5hY3Rpb24sIHRydWUpXG4gICAgICAgIHNjZW5lLmNob2ljZVdpbmRvdy5kaXNwb3NlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIE5WTCBtZXNzYWdlIGZpbmlzaGVzLiBcbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uTWVzc2FnZU5WTEZpbmlzaFxuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgICBcbiAgICBvbk1lc3NhZ2VOVkxGaW5pc2g6IChlKSAtPlxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJnYW1lTWVzc2FnZU5WTF9tZXNzYWdlXCIpXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuY2hhcmFjdGVyID0gbnVsbFxuICAgICAgICBtZXNzYWdlT2JqZWN0LmV2ZW50cy5vZmYgXCJmaW5pc2hcIiwgZS5oYW5kbGVyXG4gICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBAd2FpdGluZ0Zvci5tZXNzYWdlTlZMID0gbnVsbFxuICAgICAgICBpZiBtZXNzYWdlT2JqZWN0LnZvaWNlPyBhbmQgR2FtZU1hbmFnZXIuc2V0dGluZ3Muc2tpcFZvaWNlT25BY3Rpb25cbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5zdG9wU291bmQobWVzc2FnZU9iamVjdC52b2ljZS5uYW1lKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBJZGxlXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRJZGxlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRJZGxlOiAtPlxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogU3RhcnQgVGltZXJcbiAgICAqIEBtZXRob2QgY29tbWFuZFN0YXJ0VGltZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRTdGFydFRpbWVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICB0aW1lcnMgPSBzY2VuZS50aW1lcnNcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRpbWVyID0gdGltZXJzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRpbWVyP1xuICAgICAgICAgICAgdGltZXIgPSBuZXcgZ3MuT2JqZWN0X0ludGVydmFsVGltZXIoKVxuICAgICAgICAgICAgdGltZXJzW251bWJlcl0gPSB0aW1lclxuICAgICAgICAgICAgXG4gICAgICAgIHRpbWVyLmV2ZW50cy5vZmZCeU93bmVyKFwiZWxhcHNlZFwiLCBAb2JqZWN0KVxuICAgICAgICB0aW1lci5ldmVudHMub24oXCJlbGFwc2VkXCIsIChlKSA9PlxuICAgICAgICAgICAgcGFyYW1zID0gZS5kYXRhLnBhcmFtc1xuICAgICAgICAgICAgc3dpdGNoIHBhcmFtcy5hY3Rpb24udHlwZVxuICAgICAgICAgICAgICAgIHdoZW4gMCAjIEp1bXAgVG8gTGFiZWxcbiAgICAgICAgICAgICAgICAgICAgaWYgcGFyYW1zLmxhYmVsSW5kZXg/XG4gICAgICAgICAgICAgICAgICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuaW50ZXJwcmV0ZXIucG9pbnRlciA9IHBhcmFtcy5sYWJlbEluZGV4XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5pbnRlcnByZXRlci5qdW1wVG9MYWJlbChwYXJhbXMuYWN0aW9uLmRhdGEubGFiZWwpXG4gICAgICAgICAgICAgICAgd2hlbiAxICMgQ2FsbCBDb21tb24gRXZlbnRcbiAgICAgICAgICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmludGVycHJldGVyLmNhbGxDb21tb25FdmVudChwYXJhbXMuYWN0aW9uLmRhdGEuY29tbW9uRXZlbnRJZClcbiAgICAgICAgeyBwYXJhbXM6IEBwYXJhbXMgfSwgQG9iamVjdClcbiAgICAgICAgXG4gICAgICAgIHRpbWVyLmJlaGF2aW9yLmludGVydmFsID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmludGVydmFsKVxuICAgICAgICB0aW1lci5iZWhhdmlvci5zdGFydCgpXG4gICAgICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIFJlc3VtZSBUaW1lclxuICAgICogQG1ldGhvZCBjb21tYW5kUmVzdW1lVGltZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRSZXN1bWVUaW1lcjogLT5cbiAgICAgICAgdGltZXJzID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnRpbWVyc1xuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGltZXJzW251bWJlcl0/LmJlaGF2aW9yLnJlc3VtZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFBhdXNlcyBUaW1lclxuICAgICogQG1ldGhvZCBjb21tYW5kUGF1c2VUaW1lclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZFBhdXNlVGltZXI6IC0+XG4gICAgICAgIHRpbWVycyA9IFNjZW5lTWFuYWdlci5zY2VuZS50aW1lcnNcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRpbWVyc1tudW1iZXJdPy5iZWhhdmlvci5wYXVzZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFN0b3AgVGltZXJcbiAgICAqIEBtZXRob2QgY29tbWFuZFN0b3BUaW1lclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRTdG9wVGltZXI6IC0+XG4gICAgICAgIHRpbWVycyA9IFNjZW5lTWFuYWdlci5zY2VuZS50aW1lcnNcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRpbWVyc1tudW1iZXJdPy5iZWhhdmlvci5zdG9wKClcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIFdhaXRcbiAgICAqIEBtZXRob2QgY29tbWFuZFdhaXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZFdhaXQ6IC0+XG4gICAgICAgIHRpbWUgPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMudGltZSkgXG4gICAgICAgIFxuICAgICAgICBpZiB0aW1lPyBhbmQgdGltZSA+IDAgYW5kICFAaW50ZXJwcmV0ZXIucHJldmlld0RhdGFcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IHRpbWVcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogTG9vcFxuICAgICogQG1ldGhvZCBjb21tYW5kTG9vcFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kTG9vcDogLT5cbiAgICAgICAgQGludGVycHJldGVyLmxvb3BzW0BpbnRlcnByZXRlci5pbmRlbnRdID0gQGludGVycHJldGVyLnBvaW50ZXJcbiAgICAgICAgQGludGVycHJldGVyLmluZGVudCsrXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEJyZWFrIExvb3BcbiAgICAqIEBtZXRob2QgY29tbWFuZEJyZWFrTG9vcFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kQnJlYWtMb29wOiAtPlxuICAgICAgICBpbmRlbnQgPSBAaW5kZW50XG4gICAgICAgIHdoaWxlIG5vdCBAaW50ZXJwcmV0ZXIubG9vcHNbaW5kZW50XT8gYW5kIGluZGVudCA+IDBcbiAgICAgICAgICAgIGluZGVudC0tXG4gICAgICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmxvb3BzW2luZGVudF0gPSBudWxsXG4gICAgICAgIEBpbnRlcnByZXRlci5pbmRlbnQgPSBpbmRlbnRcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0QWRkXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kTGlzdEFkZDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaCBWYWx1ZVxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSkpXG4gICAgICAgICAgICB3aGVuIDIgIyBUZXh0IFZhbHVlXG4gICAgICAgICAgICAgICAgbGlzdC5wdXNoKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc3RyaW5nVmFsdWUpKVxuICAgICAgICAgICAgd2hlbiAzICMgTGlzdCBWYWx1ZVxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhbHVlKSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNldExpc3RPYmplY3RUbyhAcGFyYW1zLmxpc3RWYXJpYWJsZSwgbGlzdClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0UG9wXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRMaXN0UG9wOiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgdmFsdWUgPSBsaXN0LnBvcCgpID8gMFxuXG4gICAgICAgIEBpbnRlcnByZXRlci5zdG9yZUxpc3RWYWx1ZShAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBsaXN0LCB2YWx1ZSwgQHBhcmFtcy52YWx1ZVR5cGUpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RTaGlmdFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kTGlzdFNoaWZ0OiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgdmFsdWUgPSBsaXN0LnNoaWZ0KCkgPyAwXG5cbiAgICAgICAgQGludGVycHJldGVyLnN0b3JlTGlzdFZhbHVlKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIGxpc3QsIHZhbHVlLCBAcGFyYW1zLnZhbHVlVHlwZSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0SW5kZXhPZlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kTGlzdEluZGV4T2Y6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICB2YWx1ZSA9IC0xXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIHZhbHVlID0gbGlzdC5pbmRleE9mKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpKVxuICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoIFZhbHVlXG4gICAgICAgICAgICAgICAgdmFsdWUgPSBsaXN0LmluZGV4T2YoQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpKVxuICAgICAgICAgICAgd2hlbiAyICMgVGV4dCBWYWx1ZVxuICAgICAgICAgICAgICAgIHZhbHVlID0gbGlzdC5pbmRleE9mKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc3RyaW5nVmFsdWUpKVxuICAgICAgICAgICAgd2hlbiAzICMgTGlzdCBWYWx1ZVxuICAgICAgICAgICAgICAgIHZhbHVlID0gbGlzdC5pbmRleE9mKEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFsdWUpKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0Q2xlYXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRMaXN0Q2xlYXI6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBsaXN0Lmxlbmd0aCA9IDBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdFZhbHVlQXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRMaXN0VmFsdWVBdDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5pbmRleClcbiAgICAgICAgXG4gICAgICAgIGlmIGluZGV4ID49IDAgYW5kIGluZGV4IDwgbGlzdC5sZW5ndGhcbiAgICAgICAgICAgIHZhbHVlID0gbGlzdFtpbmRleF0gPyAwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc3RvcmVMaXN0VmFsdWUoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbGlzdCwgdmFsdWUsIEBwYXJhbXMudmFsdWVUeXBlKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0UmVtb3ZlQXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgXG4gICAgY29tbWFuZExpc3RSZW1vdmVBdDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5pbmRleClcbiAgICAgICAgXG4gICAgICAgIGlmIGluZGV4ID49IDAgYW5kIGluZGV4IDwgbGlzdC5sZW5ndGhcbiAgICAgICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAxKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RJbnNlcnRBdFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICBcbiAgICBjb21tYW5kTGlzdEluc2VydEF0OiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgaW5kZXggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmluZGV4KVxuICAgICAgICBcbiAgICAgICAgaWYgaW5kZXggPj0gMCBhbmQgaW5kZXggPCBsaXN0Lmxlbmd0aFxuICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMudmFsdWVUeXBlXG4gICAgICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyIFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAwLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSlcbiAgICAgICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2ggVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgbGlzdC5zcGxpY2UoaW5kZXgsIDAsIEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKSlcbiAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0IFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAwLCBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnN0cmluZ1ZhbHVlKSlcbiAgICAgICAgICAgICAgICB3aGVuIDMgIyBMaXN0IFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAwLCBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhbHVlKSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TGlzdE9iamVjdFRvKEBwYXJhbXMubGlzdFZhcmlhYmxlLCBsaXN0KVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RTZXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRMaXN0U2V0OiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgaW5kZXggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmluZGV4KVxuICAgICAgICBcbiAgICAgICAgaWYgaW5kZXggPj0gMFxuICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMudmFsdWVUeXBlXG4gICAgICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyIFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3RbaW5kZXhdID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2ggVmFsdWVcbiAgICAgICAgICAgICAgICAgICAgbGlzdFtpbmRleF0gPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0IFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3RbaW5kZXhdID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5zdHJpbmdWYWx1ZSlcbiAgICAgICAgICAgICAgICB3aGVuIDMgIyBMaXN0IFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3RbaW5kZXhdID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TGlzdE9iamVjdFRvKEBwYXJhbXMubGlzdFZhcmlhYmxlLCBsaXN0KSAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RDb3B5XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgIFxuICAgIGNvbW1hbmRMaXN0Q29weTogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIGNvcHkgPSBPYmplY3QuZGVlcENvcHkobGlzdClcbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5zZXRMaXN0T2JqZWN0VG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgY29weSkgXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RMZW5ndGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZExpc3RMZW5ndGg6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuXG4gICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIGxpc3QubGVuZ3RoKSBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0Sm9pblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZExpc3RKb2luOiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgdmFsdWUgPSBpZiBAcGFyYW1zLm9yZGVyID09IDAgdGhlbiBsaXN0LmpvaW4oXCJcIikgZWxzZSBsaXN0LnJldmVyc2UoKS5qb2luKFwiXCIpXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSkgXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RGcm9tVGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZExpc3RGcm9tVGV4dDogLT5cbiAgICAgICAgdGV4dCA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGV4dFZhcmlhYmxlKVxuICAgICAgICBzZXBhcmF0b3IgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnNlcGFyYXRvcilcbiAgICAgICAgbGlzdCA9IHRleHQuc3BsaXQoc2VwYXJhdG9yKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNldExpc3RPYmplY3RUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBsaXN0KSBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdFNodWZmbGVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kTGlzdFNodWZmbGU6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBpZiBsaXN0Lmxlbmd0aCA9PSAwIHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBmb3IgaSBpbiBbbGlzdC5sZW5ndGgtMS4uMV1cbiAgICAgICAgICAgIGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSsxKSlcbiAgICAgICAgICAgIHRlbXBpID0gbGlzdFtpXVxuICAgICAgICAgICAgdGVtcGogPSBsaXN0W2pdXG4gICAgICAgICAgICBsaXN0W2ldID0gdGVtcGpcbiAgICAgICAgICAgIGxpc3Rbal0gPSB0ZW1waVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0U29ydFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICBcbiAgICBjb21tYW5kTGlzdFNvcnQ6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBpZiBsaXN0Lmxlbmd0aCA9PSAwIHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5zb3J0T3JkZXJcbiAgICAgICAgICAgIHdoZW4gMCAjIEFzY2VuZGluZ1xuICAgICAgICAgICAgICAgIGxpc3Quc29ydCAoYSwgYikgLT4gXG4gICAgICAgICAgICAgICAgICAgIGlmIGEgPCBiIHRoZW4gcmV0dXJuIC0xXG4gICAgICAgICAgICAgICAgICAgIGlmIGEgPiBiIHRoZW4gcmV0dXJuIDFcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgICAgICAgIHdoZW4gMSAjIERlc2NlbmRpbmdcbiAgICAgICAgICAgICAgICBsaXN0LnNvcnQgKGEsIGIpIC0+XG4gICAgICAgICAgICAgICAgICAgIGlmIGEgPiBiIHRoZW4gcmV0dXJuIC0xXG4gICAgICAgICAgICAgICAgICAgIGlmIGEgPCBiIHRoZW4gcmV0dXJuIDFcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUmVzZXRWYXJpYWJsZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICBcbiAgICBjb21tYW5kUmVzZXRWYXJpYWJsZXM6IC0+XG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnRhcmdldFxuICAgICAgICAgICAgd2hlbiAwICMgQWxsXG4gICAgICAgICAgICAgICAgcmFuZ2UgPSBudWxsXG4gICAgICAgICAgICB3aGVuIDEgIyBSYW5nZVxuICAgICAgICAgICAgICAgIHJhbmdlID0gQHBhcmFtcy5yYW5nZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5zY29wZVxuICAgICAgICAgICAgd2hlbiAwICMgTG9jYWxcbiAgICAgICAgICAgICAgICBpZiBAcGFyYW1zLnNjZW5lXG4gICAgICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuY2xlYXJMb2NhbFZhcmlhYmxlcyh7IGlkOiBAcGFyYW1zLnNjZW5lLnVpZCB9LCBAcGFyYW1zLnR5cGUsIHJhbmdlKVxuICAgICAgICAgICAgd2hlbiAxICMgQWxsIExvY2Fsc1xuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuY2xlYXJMb2NhbFZhcmlhYmxlcyhudWxsLCBAcGFyYW1zLnR5cGUsIHJhbmdlKVxuICAgICAgICAgICAgd2hlbiAyICMgR2xvYmFsXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5jbGVhckdsb2JhbFZhcmlhYmxlcyhAcGFyYW1zLnR5cGUsIHJhbmdlKVxuICAgICAgICAgICAgd2hlbiAzICMgUGVyc2lzdGVudFxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuY2xlYXJQZXJzaXN0ZW50VmFyaWFibGVzKEBwYXJhbXMudHlwZSwgcmFuZ2UpXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIuc2F2ZUdsb2JhbERhdGEoKVxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVZhcmlhYmxlRG9tYWluXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRDaGFuZ2VWYXJpYWJsZURvbWFpbjogLT5cbiAgICAgICAgR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5jaGFuZ2VEb21haW4oQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5kb21haW4pKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VEZWNpbWFsVmFyaWFibGVzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDaGFuZ2VEZWNpbWFsVmFyaWFibGVzOiAtPiBAaW50ZXJwcmV0ZXIuY2hhbmdlRGVjaW1hbFZhcmlhYmxlcyhAcGFyYW1zLCBAcGFyYW1zLnJvdW5kTWV0aG9kKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZU51bWJlclZhcmlhYmxlc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kQ2hhbmdlTnVtYmVyVmFyaWFibGVzOiAtPlxuICAgICAgICBzb3VyY2UgPSAwXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5zb3VyY2VcbiAgICAgICAgICAgIHdoZW4gMCAjIENvbnN0YW50IFZhbHVlIC8gVmFyaWFibGUgVmFsdWVcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNvdXJjZVZhbHVlKVxuICAgICAgICAgICAgd2hlbiAxICMgUmFuZG9tXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNvdXJjZVJhbmRvbS5zdGFydClcbiAgICAgICAgICAgICAgICBlbmQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNvdXJjZVJhbmRvbS5lbmQpXG4gICAgICAgICAgICAgICAgZGlmZiA9IGVuZCAtIHN0YXJ0XG4gICAgICAgICAgICAgICAgc291cmNlID0gTWF0aC5mbG9vcihzdGFydCArIE1hdGgucmFuZG9tKCkgKiAoZGlmZisxKSlcbiAgICAgICAgICAgIHdoZW4gMiAjIFBvaW50ZXJcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMuc291cmNlU2NvcGUsIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuc291cmNlUmVmZXJlbmNlKS0xLCBAcGFyYW1zLnNvdXJjZVJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgIHdoZW4gMyAjIEdhbWUgRGF0YVxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mR2FtZURhdGEoQHBhcmFtcy5zb3VyY2VWYWx1ZTEpXG4gICAgICAgICAgICB3aGVuIDQgIyBEYXRhYmFzZSBEYXRhXG4gICAgICAgICAgICAgICAgc291cmNlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2ZEYXRhYmFzZURhdGEoQHBhcmFtcy5zb3VyY2VWYWx1ZTEpXG4gICAgICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMudGFyZ2V0XG4gICAgICAgICAgICB3aGVuIDAgIyBWYXJpYWJsZVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSArIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgU3ViXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSAtIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgTXVsXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSAqIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA0ICMgRGl2XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLmZsb29yKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUpIC8gc291cmNlKSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgTW9kXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSAlIHNvdXJjZSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFJhbmdlXG4gICAgICAgICAgICAgICAgc2NvcGUgPSBAcGFyYW1zLnRhcmdldFNjb3BlXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBAcGFyYW1zLnRhcmdldFJhbmdlLnN0YXJ0LTFcbiAgICAgICAgICAgICAgICBlbmQgPSBAcGFyYW1zLnRhcmdldFJhbmdlLmVuZC0xXG4gICAgICAgICAgICAgICAgZm9yIGkgaW4gW3N0YXJ0Li5lbmRdXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgKyBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBTdWJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpKSAtIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMyAjIE11bFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGkpICogc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiA0ICMgRGl2XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgTWF0aC5mbG9vcihAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpKSAvIHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDUgIyBNb2RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpKSAlIHNvdXJjZSlcbiAgICAgICAgICAgIHdoZW4gMiAjIFJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRSZWZlcmVuY2UpIC0gMVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHNvdXJjZSwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pICsgc291cmNlLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgU3ViXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbikgLSBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBNdWxcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKSAqIHNvdXJjZSwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNCAjIERpdlxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgTWF0aC5mbG9vcihAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbikgLyBzb3VyY2UpLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgTW9kXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbikgJSBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZUJvb2xlYW5WYXJpYWJsZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENoYW5nZUJvb2xlYW5WYXJpYWJsZXM6IC0+XG4gICAgICAgIHNvdXJjZSA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnZhbHVlKVxuXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnRhcmdldFxuICAgICAgICAgICAgd2hlbiAwICMgVmFyaWFibGVcbiAgICAgICAgICAgICAgICBpZiBAcGFyYW1zLnZhbHVlID09IDIgIyBUcmlnZ2VyXG4gICAgICAgICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUpXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBpZiB0YXJnZXRWYWx1ZSB0aGVuIGZhbHNlIGVsc2UgdHJ1ZSlcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzb3VyY2UpXG4gICAgICAgICAgICB3aGVuIDEgIyBSYW5nZVxuICAgICAgICAgICAgICAgIHZhcmlhYmxlID0geyBpbmRleDogMCwgc2NvcGU6IEBwYXJhbXMudGFyZ2V0UmFuZ2VTY29wZSB9XG4gICAgICAgICAgICAgICAgZm9yIGkgaW4gWyhAcGFyYW1zLnJhbmdlU3RhcnQtMSkuLihAcGFyYW1zLnJhbmdlRW5kLTEpXVxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZS5pbmRleCA9IGlcbiAgICAgICAgICAgICAgICAgICAgaWYgQHBhcmFtcy52YWx1ZSA9PSAyICMgVHJpZ2dlclxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YodmFyaWFibGUpXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8odmFyaWFibGUsIGlmIHRhcmdldFZhbHVlIHRoZW4gZmFsc2UgZWxzZSB0cnVlKVxuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8odmFyaWFibGUsIHNvdXJjZSlcbiAgICAgICAgICAgIHdoZW4gMiAjIFJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRSZWZlcmVuY2UpIC0gMVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0UmFuZ2VTY29wZSwgaW5kZXgsIHNvdXJjZSwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVN0cmluZ1ZhcmlhYmxlc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kQ2hhbmdlU3RyaW5nVmFyaWFibGVzOiAtPlxuICAgICAgICBzb3VyY2UgPSBcIlwiXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnNvdXJjZVxuICAgICAgICAgICAgd2hlbiAwICMgQ29uc3RhbnQgVGV4dFxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IGxjcyhAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFZhcmlhYmxlXG4gICAgICAgICAgICAgICAgc291cmNlID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5zb3VyY2VWYXJpYWJsZSlcbiAgICAgICAgICAgIHdoZW4gMiAjIERhdGFiYXNlIERhdGFcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZkRhdGFiYXNlRGF0YShAcGFyYW1zLmRhdGFiYXNlRGF0YSlcbiAgICAgICAgICAgIHdoZW4gMiAjIFNjcmlwdFxuICAgICAgICAgICAgICAgIHRyeVxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UgPSBldmFsKEBwYXJhbXMuc2NyaXB0KVxuICAgICAgICAgICAgICAgIGNhdGNoIGV4XG4gICAgICAgICAgICAgICAgICAgIHNvdXJjZSA9IFwiRVJSOiBcIiArIGV4Lm1lc3NhZ2VcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBsY3MoQHBhcmFtcy50ZXh0VmFsdWUpXG4gICAgICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMudGFyZ2V0XG4gICAgICAgICAgICB3aGVuIDAgIyBWYXJpYWJsZVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSArIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgVG8gVXBwZXItQ2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkudG9VcHBlckNhc2UoKSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgVG8gTG93ZXItQ2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkudG9Mb3dlckNhc2UoKSlcblxuICAgICAgICAgICAgd2hlbiAxICMgUmFuZ2VcbiAgICAgICAgICAgICAgICB2YXJpYWJsZSA9IHsgaW5kZXg6IDAsIHNjb3BlOiBAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUgfVxuICAgICAgICAgICAgICAgIGZvciBpIGluIFtAcGFyYW1zLnJhbmdlU3RhcnQtMS4uQHBhcmFtcy5yYW5nZUVuZC0xXVxuICAgICAgICAgICAgICAgICAgICB2YXJpYWJsZS5pbmRleCA9IGlcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMub3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyh2YXJpYWJsZSwgc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8odmFyaWFibGUsIEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKHZhcmlhYmxlKSArIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFRvIFVwcGVyLUNhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyh2YXJpYWJsZSwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YodmFyaWFibGUpLnRvVXBwZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBUbyBMb3dlci1DYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8odmFyaWFibGUsIEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKHZhcmlhYmxlKS50b0xvd2VyQ2FzZSgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgd2hlbiAyICMgUmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgaW5kZXggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFJlZmVyZW5jZSkgLSAxXG4gICAgICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMub3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIFNldFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUsIGluZGV4LCBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBBZGRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUsIGluZGV4LCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlLCBpbmRleCwgdGFyZ2V0VmFsdWUgKyBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUbyBVcHBlci1DYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRWYWx1ZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0UmFuZ2VTY29wZSwgaW5kZXgsIHRhcmdldFZhbHVlLnRvVXBwZXJDYXNlKCksIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBUbyBMb3dlci1DYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRWYWx1ZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUsIGluZGV4LCB0YXJnZXRWYWx1ZS50b0xvd2VyQ2FzZSgpLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hlY2tTd2l0Y2hcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRDaGVja1N3aXRjaDogLT5cbiAgICAgICAgcmVzdWx0ID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUpICYmIEBwYXJhbXMudmFsdWVcbiAgICAgICAgaWYgcmVzdWx0XG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlciA9IEBwYXJhbXMubGFiZWxJbmRleFxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZE51bWJlckNvbmRpdGlvblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgIFxuICAgIGNvbW1hbmROdW1iZXJDb25kaXRpb246IC0+XG4gICAgICAgIHJlc3VsdCA9IEBpbnRlcnByZXRlci5jb21wYXJlKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUpLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnZhbHVlKSwgQHBhcmFtcy5vcGVyYXRpb24pXG4gICAgICAgIEBpbnRlcnByZXRlci5jb25kaXRpb25zW0BpbnRlcnByZXRlci5pbmRlbnRdID0gcmVzdWx0XG4gICAgICAgIFxuICAgICAgICBpZiByZXN1bHRcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pbmRlbnQrK1xuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENvbmRpdGlvblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICBcbiAgICBjb21tYW5kQ29uZGl0aW9uOiAtPlxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBpbnRlcnByZXRlci5jb21wYXJlKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudmFyaWFibGUpLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSwgQHBhcmFtcy5vcGVyYXRpb24pXG4gICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2hcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAaW50ZXJwcmV0ZXIuY29tcGFyZShAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy52YXJpYWJsZSksIEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKSwgQHBhcmFtcy5vcGVyYXRpb24pXG4gICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gQGludGVycHJldGVyLmNvbXBhcmUobGNzKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudmFyaWFibGUpKSwgbGNzKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGV4dFZhbHVlKSksIEBwYXJhbXMub3BlcmF0aW9uKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmNvbmRpdGlvbnNbQGludGVycHJldGVyLmluZGVudF0gPSByZXN1bHRcbiAgICAgICAgaWYgcmVzdWx0XG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaW5kZW50KysgICAgXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENvbmRpdGlvbkVsc2VcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kQ29uZGl0aW9uRWxzZTogLT5cbiAgICAgICAgaWYgbm90IEBpbnRlcnByZXRlci5jb25kaXRpb25zW0BpbnRlcnByZXRlci5pbmRlbnRdXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaW5kZW50KytcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDb25kaXRpb25FbHNlSWZcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIGNvbW1hbmRDb25kaXRpb25FbHNlSWY6IC0+XG4gICAgICAgIGlmIG5vdCBAaW50ZXJwcmV0ZXIuY29uZGl0aW9uc1tAaW50ZXJwcmV0ZXIuaW5kZW50XVxuICAgICAgICAgICAgQGludGVycHJldGVyLmNvbW1hbmRDb25kaXRpb24uY2FsbCh0aGlzKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoZWNrTnVtYmVyVmFyaWFibGVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIGNvbW1hbmRDaGVja051bWJlclZhcmlhYmxlOiAtPlxuICAgICAgICByZXN1bHQgPSBAaW50ZXJwcmV0ZXIuY29tcGFyZShAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy52YWx1ZSksIEBwYXJhbXMub3BlcmF0aW9uKVxuICAgICAgICBpZiByZXN1bHRcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5wb2ludGVyID0gQHBhcmFtcy5sYWJlbEluZGV4XG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hlY2tUZXh0VmFyaWFibGVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIGNvbW1hbmRDaGVja1RleHRWYXJpYWJsZTogLT5cbiAgICAgICAgcmVzdWx0ID0gbm9cbiAgICAgICAgdGV4dDEgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKVxuICAgICAgICB0ZXh0MiA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudmFsdWUpXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgd2hlbiAwIHRoZW4gcmVzdWx0ID0gdGV4dDEgPT0gdGV4dDJcbiAgICAgICAgICAgIHdoZW4gMSB0aGVuIHJlc3VsdCA9IHRleHQxICE9IHRleHQyXG4gICAgICAgICAgICB3aGVuIDIgdGhlbiByZXN1bHQgPSB0ZXh0MS5sZW5ndGggPiB0ZXh0Mi5sZW5ndGhcbiAgICAgICAgICAgIHdoZW4gMyB0aGVuIHJlc3VsdCA9IHRleHQxLmxlbmd0aCA+PSB0ZXh0Mi5sZW5ndGhcbiAgICAgICAgICAgIHdoZW4gNCB0aGVuIHJlc3VsdCA9IHRleHQxLmxlbmd0aCA8IHRleHQyLmxlbmd0aFxuICAgICAgICAgICAgd2hlbiA1IHRoZW4gcmVzdWx0ID0gdGV4dDEubGVuZ3RoIDw9IHRleHQyLmxlbmd0aFxuICAgICAgICAgICAgXG4gICAgICAgIGlmIHJlc3VsdFxuICAgICAgICAgICAgQGludGVycHJldGVyLnBvaW50ZXIgPSBAcGFyYW1zLmxhYmVsSW5kZXhcbiAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGFiZWxcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICBcbiAgICBjb21tYW5kTGFiZWw6IC0+ICMgRG9lcyBOb3RoaW5nXG4gICAgICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEp1bXBUb0xhYmVsXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgICBcbiAgICBjb21tYW5kSnVtcFRvTGFiZWw6IC0+XG4gICAgICAgIGxhYmVsID0gQHBhcmFtcy5sYWJlbEluZGV4ICNAaW50ZXJwcmV0ZXIubGFiZWxzW0BwYXJhbXMubmFtZV1cbiAgICAgICAgaWYgbGFiZWw/XG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlciA9IGxhYmVsXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaW5kZW50ID0gQGludGVycHJldGVyLm9iamVjdC5jb21tYW5kc1tsYWJlbF0uaW5kZW50XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5qdW1wVG9MYWJlbChAcGFyYW1zLm5hbWUpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENsZWFyTWVzc2FnZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgY29tbWFuZENsZWFyTWVzc2FnZTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgbWVzc2FnZU9iamVjdCA9IEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKClcbiAgICAgICAgaWYgbm90IG1lc3NhZ2VPYmplY3Q/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIGR1cmF0aW9uID0gMFxuICAgICAgICBmYWRpbmcgPSBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3MubWVzc2FnZUZhZGluZ1xuICAgICAgICBpZiBub3QgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBmYWRpbmcuZHVyYXRpb25cbiAgICAgICAgbWVzc2FnZU9iamVjdC5hbmltYXRvci5kaXNhcHBlYXIoZmFkaW5nLmFuaW1hdGlvbiwgZmFkaW5nLmVhc2luZywgZHVyYXRpb24sIGdzLkNhbGxCYWNrKFwib25NZXNzYWdlQURWQ2xlYXJcIiwgQGludGVycHJldGVyKSlcblxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obWVzc2FnZU9iamVjdCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENsb3NlUGFnZU5WTFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kQ2xvc2VQYWdlTlZMOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJnYW1lTWVzc2FnZU5WTF9tZXNzYWdlXCIpXG4gICAgICAgIGlmIG5vdCBtZXNzYWdlT2JqZWN0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgbWVzc2FnZU9iamVjdC5tZXNzYWdlLmNsZWFyKClcbiAgICAgICAgXG4gICAgICAgIG1lc3NhZ2VCb3ggPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcIm1lc3NhZ2VCb3hOVkxcIilcbiAgICAgICAgaWYgbWVzc2FnZUJveCBhbmQgQHBhcmFtcy52aXNpYmxlICE9IG1lc3NhZ2VCb3gudmlzaWJsZVxuICAgICAgICAgICAgbWVzc2FnZUJveC52aXNpYmxlID0gbm9cbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNZXNzYWdlQm94RGVmYXVsdHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZE1lc3NhZ2VCb3hEZWZhdWx0czogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5tZXNzYWdlQm94XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5hcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5hcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmRpc2FwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmRpc2FwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNob3dNZXNzYWdlTlZMXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kU2hvd01lc3NhZ2VOVkw6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLm1lc3NhZ2VNb2RlID0gdm4uTWVzc2FnZU1vZGUuTlZMXG4gICAgICAgIGNoYXJhY3RlciA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyc1tAcGFyYW1zLmNoYXJhY3RlcklkXVxuICBcbiAgICAgICAgc2NlbmUubGF5b3V0LnZpc2libGUgPSBub1xuICAgICAgICBzY2VuZS5sYXlvdXROVkwudmlzaWJsZSA9IHllc1xuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJnYW1lTWVzc2FnZU5WTF9tZXNzYWdlXCIpXG4gICAgICAgIGlmIG5vdCBtZXNzYWdlT2JqZWN0PyB0aGVuIHJldHVyblxuXG4gICAgICAgIEBpbnRlcnByZXRlci5tZXNzYWdlQm94T2JqZWN0KCk/LnZpc2libGUgPSB0cnVlXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuY2hhcmFjdGVyID0gY2hhcmFjdGVyXG4gICAgICAgIG1lc3NhZ2VPYmplY3QubWVzc2FnZS5hZGRNZXNzYWdlKGxjc20oQHBhcmFtcy5tZXNzYWdlKSwgY2hhcmFjdGVyLCAhQHBhcmFtcy5wYXJ0aWFsIGFuZCBtZXNzYWdlT2JqZWN0Lm1lc3NhZ2VzLmxlbmd0aCA+IDAsIHllcylcbiAgICAgICAgXG4gICAgICAgIGlmIEBpbnRlcnByZXRlci5tZXNzYWdlU2V0dGluZ3MoKS5iYWNrbG9nXG4gICAgICAgICAgICBHYW1lTWFuYWdlci5iYWNrbG9nLnB1c2goeyBjaGFyYWN0ZXI6IGNoYXJhY3RlciwgbWVzc2FnZTogbGNzbShAcGFyYW1zLm1lc3NhZ2UpLCBjaG9pY2VzOiBbXSB9KVxuXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZXZlbnRzLm9uIFwiZmluaXNoXCIsIChlKSA9PiBAaW50ZXJwcmV0ZXIub25NZXNzYWdlTlZMRmluaXNoKGUpXG5cbiAgICAgICAgdm9pY2VTZXR0aW5ncyA9IEdhbWVNYW5hZ2VyLnNldHRpbmdzLnZvaWNlc0J5Q2hhcmFjdGVyW21lc3NhZ2VPYmplY3QuY2hhcmFjdGVyPy5pbmRleF1cbiAgICAgICAgaWYgQHBhcmFtcy52b2ljZT8gYW5kIEdhbWVNYW5hZ2VyLnNldHRpbmdzLnZvaWNlRW5hYmxlZCBhbmQgKCF2b2ljZVNldHRpbmdzIG9yIHZvaWNlU2V0dGluZ3MuZW5hYmxlZClcbiAgICAgICAgICAgIGlmIEdhbWVNYW5hZ2VyLnNldHRpbmdzLnNraXBWb2ljZU9uQWN0aW9uIG9yIG5vdCAoQXVkaW9NYW5hZ2VyLnZvaWNlPy5wbGF5aW5nKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2VPYmplY3Qudm9pY2UgPSBAcGFyYW1zLnZvaWNlXG4gICAgICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnBsYXlWb2ljZShAcGFyYW1zLnZvaWNlKSAgICAgXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci52b2ljZSA9IG51bGxcbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgQGludGVycHJldGVyLndhaXRpbmdGb3IubWVzc2FnZU5WTCA9IEBwYXJhbXNcbiAgICBcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93TWVzc2FnZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZFNob3dNZXNzYWdlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5tZXNzYWdlTW9kZSA9IHZuLk1lc3NhZ2VNb2RlLkFEVlxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgXG4gICAgICAgIHNob3dNZXNzYWdlID0gPT5cbiAgICAgICAgICAgIGNoYXJhY3RlciA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyc1tAcGFyYW1zLmNoYXJhY3RlcklkXVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzY2VuZS5sYXlvdXQudmlzaWJsZSA9IHllc1xuICAgICAgICAgICAgc2NlbmUubGF5b3V0TlZMLnZpc2libGUgPSBub1xuICAgICAgICAgICAgbWVzc2FnZU9iamVjdCA9IEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIG5vdCBtZXNzYWdlT2JqZWN0PyB0aGVuIHJldHVyblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzY2VuZS5jdXJyZW50Q2hhcmFjdGVyID0gY2hhcmFjdGVyXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmNoYXJhY3RlciA9IGNoYXJhY3RlclxuICAgICAgICAgICAgXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0Lm9wYWNpdHkgPSAyNTVcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZXZlbnRzLm9mZkJ5T3duZXIoXCJjYWxsQ29tbW9uRXZlbnRcIiwgQGludGVycHJldGVyKVxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5ldmVudHMub24oXCJjYWxsQ29tbW9uRXZlbnRcIiwgZ3MuQ2FsbEJhY2soXCJvbkNhbGxDb21tb25FdmVudFwiLCBAaW50ZXJwcmV0ZXIpLCBwYXJhbXM6IEBwYXJhbXMsIEBpbnRlcnByZXRlcilcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZXZlbnRzLm9uY2UoXCJmaW5pc2hcIiwgZ3MuQ2FsbEJhY2soXCJvbk1lc3NhZ2VBRFZGaW5pc2hcIiwgQGludGVycHJldGVyKSwgcGFyYW1zOiBAcGFyYW1zLCBAaW50ZXJwcmV0ZXIpXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmV2ZW50cy5vbmNlKFwid2FpdGluZ1wiLCBncy5DYWxsQmFjayhcIm9uTWVzc2FnZUFEVldhaXRpbmdcIiwgQGludGVycHJldGVyKSwgcGFyYW1zOiBAcGFyYW1zLCBAaW50ZXJwcmV0ZXIpICAgXG4gICAgICAgICAgICBpZiBtZXNzYWdlT2JqZWN0LnNldHRpbmdzLnVzZUNoYXJhY3RlckNvbG9yXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5tZXNzYWdlLnNob3dNZXNzYWdlKEBpbnRlcnByZXRlciwgQHBhcmFtcywgY2hhcmFjdGVyKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QubWVzc2FnZS5zaG93TWVzc2FnZShAaW50ZXJwcmV0ZXIsIEBwYXJhbXMpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNldHRpbmdzID0gR2FtZU1hbmFnZXIuc2V0dGluZ3NcbiAgICAgICAgICAgIHZvaWNlU2V0dGluZ3MgPSBzZXR0aW5ncy52b2ljZXNCeUNoYXJhY3RlcltjaGFyYWN0ZXIuaW5kZXhdXG4gICAgICBcbiAgICAgICAgICAgIGlmIEBwYXJhbXMudm9pY2U/IGFuZCBHYW1lTWFuYWdlci5zZXR0aW5ncy52b2ljZUVuYWJsZWQgYW5kICghdm9pY2VTZXR0aW5ncyBvciB2b2ljZVNldHRpbmdzID4gMClcbiAgICAgICAgICAgICAgICBpZiAoR2FtZU1hbmFnZXIuc2V0dGluZ3Muc2tpcFZvaWNlT25BY3Rpb24gb3IgIUF1ZGlvTWFuYWdlci52b2ljZT8ucGxheWluZykgYW5kICFHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcFxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0LnZvaWNlID0gQHBhcmFtcy52b2ljZVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmJlaGF2aW9yLnZvaWNlID0gQXVkaW9NYW5hZ2VyLnBsYXlWb2ljZShAcGFyYW1zLnZvaWNlKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuYmVoYXZpb3Iudm9pY2UgPSBudWxsXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMuZXhwcmVzc2lvbklkPyBhbmQgY2hhcmFjdGVyP1xuICAgICAgICAgICAgZXhwcmVzc2lvbiA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyRXhwcmVzc2lvbnNbQHBhcmFtcy5leHByZXNzaW9uSWQgfHwgMF1cbiAgICAgICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuY2hhcmFjdGVyXG4gICAgICAgICAgICBkdXJhdGlvbiA9IGlmICFncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZChAcGFyYW1zLmZpZWxkRmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmV4cHJlc3Npb25EdXJhdGlvblxuICAgICAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmNoYW5nZUVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGRlZmF1bHRzLmNoYW5nZUFuaW1hdGlvblxuICAgICAgICAgICAgXG4gICAgICAgICAgICBjaGFyYWN0ZXIuYmVoYXZpb3IuY2hhbmdlRXhwcmVzc2lvbihleHByZXNzaW9uLCBhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sID0+XG4gICAgICAgICAgICAgICAgc2hvd01lc3NhZ2UoKVxuICAgICAgICAgICAgKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzaG93TWVzc2FnZSgpXG4gICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSAoQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiA/IHllcykgYW5kICEoR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXAgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwVGltZSA9PSAwKVxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdGluZ0Zvci5tZXNzYWdlQURWID0gQHBhcmFtc1xuICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kU2V0TWVzc2FnZUFyZWFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kU2V0TWVzc2FnZUFyZWE6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBcbiAgICAgICAgaWYgc2NlbmUubWVzc2FnZUFyZWFzW251bWJlcl1cbiAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQgPSBzY2VuZS5tZXNzYWdlQXJlYXNbbnVtYmVyXS5sYXlvdXRcbiAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQuZHN0UmVjdC54ID0gQHBhcmFtcy5ib3gueFxuICAgICAgICAgICAgbWVzc2FnZUxheW91dC5kc3RSZWN0LnkgPSBAcGFyYW1zLmJveC55XG4gICAgICAgICAgICBtZXNzYWdlTGF5b3V0LmRzdFJlY3Qud2lkdGggPSBAcGFyYW1zLmJveC5zaXplLndpZHRoXG4gICAgICAgICAgICBtZXNzYWdlTGF5b3V0LmRzdFJlY3QuaGVpZ2h0ID0gQHBhcmFtcy5ib3guc2l6ZS5oZWlnaHRcbiAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQubmVlZHNVcGRhdGUgPSB5ZXNcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZE1lc3NhZ2VGYWRpbmdcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZE1lc3NhZ2VGYWRpbmc6IC0+XG4gICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5tZXNzYWdlRmFkaW5nID0gZHVyYXRpb246IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbiksIGFuaW1hdGlvbjogQHBhcmFtcy5hbmltYXRpb24sIGVhc2luZzogZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNZXNzYWdlU2V0dGluZ3NcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRNZXNzYWdlU2V0dGluZ3M6IC0+XG4gICAgICAgIG1lc3NhZ2VPYmplY3QgPSBAaW50ZXJwcmV0ZXIudGFyZ2V0TWVzc2FnZSgpXG4gICAgICAgIGlmICFtZXNzYWdlT2JqZWN0IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIG1lc3NhZ2VTZXR0aW5ncyA9IEBpbnRlcnByZXRlci5tZXNzYWdlU2V0dGluZ3MoKVxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmF1dG9FcmFzZSlcbiAgICAgICAgICAgIG1lc3NhZ2VTZXR0aW5ncy5hdXRvRXJhc2UgPSBAcGFyYW1zLmF1dG9FcmFzZVxuICAgICAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy53YWl0QXRFbmQpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3Mud2FpdEF0RW5kID0gQHBhcmFtcy53YWl0QXRFbmRcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYmFja2xvZylcbiAgICAgICAgICAgIG1lc3NhZ2VTZXR0aW5ncy5iYWNrbG9nID0gQHBhcmFtcy5iYWNrbG9nXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubGluZUhlaWdodClcbiAgICAgICAgICAgIG1lc3NhZ2VTZXR0aW5ncy5saW5lSGVpZ2h0ID0gQHBhcmFtcy5saW5lSGVpZ2h0XG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubGluZVNwYWNpbmcpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MubGluZVNwYWNpbmcgPSBAcGFyYW1zLmxpbmVTcGFjaW5nXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubGluZVBhZGRpbmcpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MubGluZVBhZGRpbmcgPSBAcGFyYW1zLmxpbmVQYWRkaW5nXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnBhcmFncmFwaFNwYWNpbmcpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MucGFyYWdyYXBoU3BhY2luZyA9IEBwYXJhbXMucGFyYWdyYXBoU3BhY2luZ1xuICAgICAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy51c2VDaGFyYWN0ZXJDb2xvcilcbiAgICAgICAgICAgIG1lc3NhZ2VTZXR0aW5ncy51c2VDaGFyYWN0ZXJDb2xvciA9IEBwYXJhbXMudXNlQ2hhcmFjdGVyQ29sb3JcbiAgICAgICAgICAgIFxuICAgICAgICBtZXNzYWdlT2JqZWN0LnRleHRSZW5kZXJlci5taW5MaW5lSGVpZ2h0ID0gbWVzc2FnZVNldHRpbmdzLmxpbmVIZWlnaHQgPyAwXG4gICAgICAgIG1lc3NhZ2VPYmplY3QudGV4dFJlbmRlcmVyLmxpbmVTcGFjaW5nID0gbWVzc2FnZVNldHRpbmdzLmxpbmVTcGFjaW5nID8gbWVzc2FnZU9iamVjdC50ZXh0UmVuZGVyZXIubGluZVNwYWNpbmdcbiAgICAgICAgbWVzc2FnZU9iamVjdC50ZXh0UmVuZGVyZXIucGFkZGluZyA9IG1lc3NhZ2VTZXR0aW5ncy5saW5lUGFkZGluZyA/IG1lc3NhZ2VPYmplY3QudGV4dFJlbmRlcmVyLnBhZGRpbmdcbiAgICAgICAgXG4gICAgICAgIGZvbnROYW1lID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZvbnQpIHRoZW4gQHBhcmFtcy5mb250IGVsc2UgbWVzc2FnZU9iamVjdC5mb250Lm5hbWVcbiAgICAgICAgZm9udFNpemUgPSBpZiAhaXNMb2NrZWQoZmxhZ3Muc2l6ZSkgdGhlbiBAcGFyYW1zLnNpemUgZWxzZSBtZXNzYWdlT2JqZWN0LmZvbnQuc2l6ZVxuICAgICAgICBmb250ID0gbWVzc2FnZU9iamVjdC5mb250XG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5mb250KSBvciAhaXNMb2NrZWQoZmxhZ3Muc2l6ZSlcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udCA9IG5ldyBGb250KGZvbnROYW1lLCBmb250U2l6ZSlcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYm9sZClcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5ib2xkID0gQHBhcmFtcy5ib2xkXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5pdGFsaWMpXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuaXRhbGljID0gQHBhcmFtcy5pdGFsaWNcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNtYWxsQ2FwcylcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5zbWFsbENhcHMgPSBAcGFyYW1zLnNtYWxsQ2Fwc1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MudW5kZXJsaW5lKVxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LnVuZGVybGluZSA9IEBwYXJhbXMudW5kZXJsaW5lXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5zdHJpa2VUaHJvdWdoKVxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LnN0cmlrZVRocm91Z2ggPSBAcGFyYW1zLnN0cmlrZVRocm91Z2hcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmNvbG9yKVxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LmNvbG9yID0gbmV3IENvbG9yKEBwYXJhbXMuY29sb3IpXG4gICAgICAgICAgICBcbiAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LmNvbG9yID0gaWYgZmxhZ3MuY29sb3I/IGFuZCAhaXNMb2NrZWQoZmxhZ3MuY29sb3IpIHRoZW4gbmV3IENvbG9yKEBwYXJhbXMuY29sb3IpIGVsc2UgZm9udC5jb2xvclxuICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuYm9yZGVyID0gaWYgZmxhZ3Mub3V0bGluZT8gYW5kICFpc0xvY2tlZChmbGFncy5vdXRsaW5lKSB0aGVuIEBwYXJhbXMub3V0bGluZSBlbHNlIGZvbnQuYm9yZGVyXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5ib3JkZXJDb2xvciA9IGlmIGZsYWdzLm91dGxpbmVDb2xvcj8gYW5kICFpc0xvY2tlZChmbGFncy5vdXRsaW5lQ29sb3IpIHRoZW4gbmV3IENvbG9yKEBwYXJhbXMub3V0bGluZUNvbG9yKSBlbHNlIG5ldyBDb2xvcihmb250LmJvcmRlckNvbG9yKVxuICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuYm9yZGVyU2l6ZSA9IGlmIGZsYWdzLm91dGxpbmVTaXplPyBhbmQgIWlzTG9ja2VkKGZsYWdzLm91dGxpbmVTaXplKSB0aGVuIChAcGFyYW1zLm91dGxpbmVTaXplID8gNCkgZWxzZSBmb250LmJvcmRlclNpemVcbiAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LnNoYWRvdyA9IGlmIGZsYWdzLnNoYWRvdz8gYW5kICFpc0xvY2tlZChmbGFncy5zaGFkb3cpdGhlbiBAcGFyYW1zLnNoYWRvdyBlbHNlIGZvbnQuc2hhZG93XG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5zaGFkb3dDb2xvciA9IGlmIGZsYWdzLnNoYWRvd0NvbG9yPyBhbmQgIWlzTG9ja2VkKGZsYWdzLnNoYWRvd0NvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLnNoYWRvd0NvbG9yKSBlbHNlIG5ldyBDb2xvcihmb250LnNoYWRvd0NvbG9yKVxuICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuc2hhZG93T2Zmc2V0WCA9IGlmIGZsYWdzLnNoYWRvd09mZnNldFg/IGFuZCAhaXNMb2NrZWQoZmxhZ3Muc2hhZG93T2Zmc2V0WCkgdGhlbiAoQHBhcmFtcy5zaGFkb3dPZmZzZXRYID8gMSkgZWxzZSBmb250LnNoYWRvd09mZnNldFhcbiAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LnNoYWRvd09mZnNldFkgPSBpZiBmbGFncy5zaGFkb3dPZmZzZXRZPyBhbmQgIWlzTG9ja2VkKGZsYWdzLnNoYWRvd09mZnNldFkpIHRoZW4gKEBwYXJhbXMuc2hhZG93T2Zmc2V0WSA/IDEpIGVsc2UgZm9udC5zaGFkb3dPZmZzZXRZXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5ib2xkID0gZm9udC5ib2xkXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5pdGFsaWMgPSBmb250Lml0YWxpY1xuICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuc21hbGxDYXBzID0gZm9udC5zbWFsbENhcHNcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENyZWF0ZU1lc3NhZ2VBcmVhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kQ3JlYXRlTWVzc2FnZUFyZWE6IC0+XG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VNZXNzYWdlQXJlYURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgaWYgIXNjZW5lLm1lc3NhZ2VBcmVhc1tudW1iZXJdXG4gICAgICAgICAgICBtZXNzYWdlQXJlYSA9IG5ldyBncy5PYmplY3RfTWVzc2FnZUFyZWEoKVxuICAgICAgICAgICAgbWVzc2FnZUFyZWEubGF5b3V0ID0gdWkuVUlNYW5hZ2VyLmNyZWF0ZUNvbnRyb2xGcm9tRGVzY3JpcHRvcih0eXBlOiBcInVpLkN1c3RvbUdhbWVNZXNzYWdlXCIsIGlkOiBcImN1c3RvbUdhbWVNZXNzYWdlX1wiK251bWJlciwgcGFyYW1zOiB7IGlkOiBcImN1c3RvbUdhbWVNZXNzYWdlX1wiK251bWJlciB9LCBtZXNzYWdlQXJlYSlcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhLm1lc3NhZ2UgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImN1c3RvbUdhbWVNZXNzYWdlX1wiK251bWJlcitcIl9tZXNzYWdlXCIpXG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5tZXNzYWdlLmRvbWFpbiA9IEBwYXJhbXMubnVtYmVyRG9tYWluXG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5hZGRPYmplY3QobWVzc2FnZUFyZWEubGF5b3V0KVxuICAgICAgICAgICAgbWVzc2FnZUFyZWEubGF5b3V0LmRzdFJlY3QueCA9IEBwYXJhbXMuYm94LnhcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhLmxheW91dC5kc3RSZWN0LnkgPSBAcGFyYW1zLmJveC55XG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5sYXlvdXQuZHN0UmVjdC53aWR0aCA9IEBwYXJhbXMuYm94LnNpemUud2lkdGhcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhLmxheW91dC5kc3RSZWN0LmhlaWdodCA9IEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0XG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5sYXlvdXQubmVlZHNVcGRhdGUgPSB5ZXNcbiAgICAgICAgICAgIHNjZW5lLm1lc3NhZ2VBcmVhc1tudW1iZXJdID0gbWVzc2FnZUFyZWFcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZU1lc3NhZ2VBcmVhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kRXJhc2VNZXNzYWdlQXJlYTogLT5cbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZU1lc3NhZ2VBcmVhRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBhcmVhID0gc2NlbmUubWVzc2FnZUFyZWFzW251bWJlcl0gXG4gICAgICAgIGFyZWE/LmxheW91dC5kaXNwb3NlKClcbiAgICAgICAgc2NlbmUubWVzc2FnZUFyZWFzW251bWJlcl0gPSBudWxsXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTZXRUYXJnZXRNZXNzYWdlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kU2V0VGFyZ2V0TWVzc2FnZTogLT5cbiAgICAgICAgbWVzc2FnZSA9IEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKClcbiAgICAgICAgbWVzc2FnZT8udGV4dFJlbmRlcmVyLmlzV2FpdGluZyA9IGZhbHNlXG4gICAgICAgIG1lc3NhZ2U/LmJlaGF2aW9yLmlzV2FpdGluZyA9IGZhbHNlXG4gICAgICAgIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VNZXNzYWdlQXJlYURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgdGFyZ2V0ID0geyB0eXBlOiBAcGFyYW1zLnR5cGUsIGlkOiBudWxsIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIExheW91dC1iYXNlZFxuICAgICAgICAgICAgICAgIHRhcmdldC5pZCA9IEBwYXJhbXMuaWRcbiAgICAgICAgICAgIHdoZW4gMSAjIEN1c3RvbVxuICAgICAgICAgICAgICAgIHRhcmdldC5pZCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0dGluZ3MubWVzc2FnZS50YXJnZXQgPSB0YXJnZXRcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMuY2xlYXJcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKCk/LmJlaGF2aW9yLmNsZWFyKClcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJhY2tsb2dWaXNpYmlsaXR5XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kQmFja2xvZ1Zpc2liaWxpdHk6IC0+XG4gICAgICAgIGlmIEBwYXJhbXMudmlzaWJsZSBcbiAgICAgICAgICAgIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dCb3hcIilcbiAgICAgICAgICAgIGlmIG5vdCBjb250cm9sPyB0aGVuIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dcIilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgY29udHJvbD9cbiAgICAgICAgICAgICAgICBjb250cm9sLmRpc3Bvc2UoKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBAcGFyYW1zLmJhY2tncm91bmRWaXNpYmxlXG4gICAgICAgICAgICAgICAgY29udHJvbCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jcmVhdGVDb250cm9sKHRoaXMsIHsgZGVzY3JpcHRvcjogXCJ1aS5NZXNzYWdlQmFja2xvZ0JveFwiIH0pXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY29udHJvbCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jcmVhdGVDb250cm9sKHRoaXMsIHsgZGVzY3JpcHRvcjogXCJ1aS5NZXNzYWdlQmFja2xvZ1wiIH0pXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dCb3hcIilcbiAgICAgICAgICAgIGlmIG5vdCBjb250cm9sPyB0aGVuIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dcIilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udHJvbD8uZGlzcG9zZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWVzc2FnZVZpc2liaWxpdHlcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZE1lc3NhZ2VWaXNpYmlsaXR5OiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLm1lc3NhZ2VCb3hcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgbWVzc2FnZSA9IEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKClcbiAgICAgICAgaWYgbm90IG1lc3NhZ2U/IG9yIEBwYXJhbXMudmlzaWJsZSA9PSBtZXNzYWdlLnZpc2libGUgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlzaWJsZVxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmFwcGVhckR1cmF0aW9uXG4gICAgICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmFwcGVhckVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlLmFuaW1hdG9yLmFwcGVhcihtZXNzYWdlLmRzdFJlY3QueCwgbWVzc2FnZS5kc3RSZWN0LnksIEBwYXJhbXMuYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb25cbiAgICAgICAgICAgIGVhc2luZyA9IGlmICFpc0xvY2tlZChmbGFnc1tcImVhc2luZy50eXBlXCJdKSB0aGVuIGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZykgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nKVxuICAgICAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgICAgIG1lc3NhZ2UuYW5pbWF0b3IuZGlzYXBwZWFyKGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgLT4gbWVzc2FnZS52aXNpYmxlID0gbm8pXG4gICAgICAgIG1lc3NhZ2UudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWVzc2FnZUJveFZpc2liaWxpdHlcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1lc3NhZ2VCb3hWaXNpYmlsaXR5OiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLm1lc3NhZ2VCb3hcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBtZXNzYWdlQm94ID0gQGludGVycHJldGVyLm1lc3NhZ2VCb3hPYmplY3QoQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5pZCkpXG4gICAgICAgIHZpc2libGUgPSBAcGFyYW1zLnZpc2libGUgPT0gMVxuICAgICAgICBpZiBub3QgbWVzc2FnZUJveD8gb3IgdmlzaWJsZSA9PSBtZXNzYWdlQm94LnZpc2libGUgdGhlbiByZXR1cm5cbiAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlzaWJsZVxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmFwcGVhckR1cmF0aW9uXG4gICAgICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmFwcGVhckVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlQm94LmFuaW1hdG9yLmFwcGVhcihtZXNzYWdlQm94LmRzdFJlY3QueCwgbWVzc2FnZUJveC5kc3RSZWN0LnksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uXG4gICAgICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmRpc2FwcGVhckVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlQm94LmFuaW1hdG9yLmRpc2FwcGVhcihhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sIC0+IG1lc3NhZ2VCb3gudmlzaWJsZSA9IG5vKVxuICAgICAgICBtZXNzYWdlQm94LnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFVJQWNjZXNzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRVSUFjY2VzczogLT5cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmdlbmVyYWxNZW51KVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLm1lbnVBY2Nlc3MgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5nZW5lcmFsTWVudSlcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNhdmVNZW51KVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNhdmVNZW51QWNjZXNzID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc2F2ZU1lbnUpXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5sb2FkTWVudSlcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5sb2FkTWVudUFjY2VzcyA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLmxvYWRNZW51KVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYmFja2xvZylcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5iYWNrbG9nQWNjZXNzID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuYmFja2xvZylcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFVubG9ja0NHXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgXG4gICAgY29tbWFuZFVubG9ja0NHOiAtPlxuICAgICAgICBjZyA9IFJlY29yZE1hbmFnZXIuY2dHYWxsZXJ5W0BpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuY2dJZCldXG4gICAgICAgIFxuICAgICAgICBpZiBjZz9cbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLmdsb2JhbERhdGEuY2dHYWxsZXJ5W2NnLmluZGV4XSA9IHsgdW5sb2NrZWQ6IHllcyB9XG4gICAgICAgICAgICBHYW1lTWFuYWdlci5zYXZlR2xvYmFsRGF0YSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyRE1vdmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIGNvbW1hbmRMMkRNb3ZlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3RlciBpbnN0YW5jZW9mIHZuLk9iamVjdF9MaXZlMkRDaGFyYWN0ZXIgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tb3ZlT2JqZWN0KGNoYXJhY3RlciwgQHBhcmFtcy5wb3NpdGlvbiwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTDJETW90aW9uR3JvdXBcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICBcbiAgICBjb21tYW5kTDJETW90aW9uR3JvdXA6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyIGluc3RhbmNlb2Ygdm4uT2JqZWN0X0xpdmUyRENoYXJhY3RlciB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbkdyb3VwID0geyBuYW1lOiBAcGFyYW1zLmRhdGEubW90aW9uR3JvdXAsIGxvb3A6IEBwYXJhbXMubG9vcCwgcGxheVR5cGU6IEBwYXJhbXMucGxheVR5cGUgfVxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgQHBhcmFtcy5sb29wXG4gICAgICAgICAgICBtb3Rpb25zID0gY2hhcmFjdGVyLm1vZGVsLm1vdGlvbnNCeUdyb3VwW2NoYXJhY3Rlci5tb3Rpb25Hcm91cC5uYW1lXVxuICAgICAgICAgICAgaWYgbW90aW9ucz9cbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gbW90aW9ucy5zdW0gKG0pIC0+IG0uZ2V0RHVyYXRpb25NU2VjKCkgLyAxNi42XG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyRE1vdGlvblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZEwyRE1vdGlvbjogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5saXZlMmRcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3RlciBpbnN0YW5jZW9mIHZuLk9iamVjdF9MaXZlMkRDaGFyYWN0ZXIgdGhlbiByZXR1cm5cbiAgICAgICAgZmFkZUluVGltZSA9IGlmICFpc0xvY2tlZChmbGFncy5mYWRlSW5UaW1lKSB0aGVuIEBwYXJhbXMuZmFkZUluVGltZSBlbHNlIGRlZmF1bHRzLm1vdGlvbkZhZGVJblRpbWVcbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbiA9IHsgbmFtZTogQHBhcmFtcy5kYXRhLm1vdGlvbiwgZmFkZUluVGltZTogZmFkZUluVGltZSwgbG9vcDogQHBhcmFtcy5sb29wIH1cbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbkdyb3VwID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IEBwYXJhbXMubG9vcFxuICAgICAgICAgICAgbW90aW9uID0gY2hhcmFjdGVyLm1vZGVsLm1vdGlvbnNbY2hhcmFjdGVyLm1vdGlvbi5uYW1lXVxuICAgICAgICAgICAgaWYgbW90aW9uP1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBtb3Rpb24uZ2V0RHVyYXRpb25NU2VjKCkgLyAxNi42XG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyREV4cHJlc3Npb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEwyREV4cHJlc3Npb246IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMubGl2ZTJkXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXIgaW5zdGFuY2VvZiB2bi5PYmplY3RfTGl2ZTJEQ2hhcmFjdGVyIHRoZW4gcmV0dXJuXG4gICAgICAgIGZhZGVJblRpbWUgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZmFkZUluVGltZSkgdGhlbiBAcGFyYW1zLmZhZGVJblRpbWUgZWxzZSBkZWZhdWx0cy5leHByZXNzaW9uRmFkZUluVGltZVxuICAgICAgICBcbiAgICAgICAgY2hhcmFjdGVyLmV4cHJlc3Npb24gPSB7IG5hbWU6IEBwYXJhbXMuZGF0YS5leHByZXNzaW9uLCBmYWRlSW5UaW1lOiBmYWRlSW5UaW1lIH1cbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyREV4aXRTY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZEwyREV4aXRTY2VuZTogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5saXZlMmRcbiAgICAgICAgQGludGVycHJldGVyLmNvbW1hbmRDaGFyYWN0ZXJFeGl0U2NlbmUuY2FsbCh0aGlzLCBkZWZhdWx0cylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTDJEU2V0dGluZ3NcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZEwyRFNldHRpbmdzOiAtPlxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8udmlzdWFsLmwyZE9iamVjdCB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5saXBTeW5jU2Vuc2l0aXZpdHkpXG4gICAgICAgICAgICBjaGFyYWN0ZXIudmlzdWFsLmwyZE9iamVjdC5saXBTeW5jU2Vuc2l0aXZpdHkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxpcFN5bmNTZW5zaXRpdml0eSlcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmlkbGVJbnRlbnNpdHkpICAgIFxuICAgICAgICAgICAgY2hhcmFjdGVyLnZpc3VhbC5sMmRPYmplY3QuaWRsZUludGVuc2l0eSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuaWRsZUludGVuc2l0eSlcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmJyZWF0aEludGVuc2l0eSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmJyZWF0aEludGVuc2l0eSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYnJlYXRoSW50ZW5zaXR5KVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJleWVCbGluay5lbmFibGVkXCJdKVxuICAgICAgICAgICAgY2hhcmFjdGVyLnZpc3VhbC5sMmRPYmplY3QuZXllQmxpbmsuZW5hYmxlZCA9IEBwYXJhbXMuZXllQmxpbmsuZW5hYmxlZFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJleWVCbGluay5pbnRlcnZhbFwiXSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmV5ZUJsaW5rLmJsaW5rSW50ZXJ2YWxNc2VjID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5leWVCbGluay5pbnRlcnZhbClcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZXllQmxpbmsuY2xvc2VkTW90aW9uVGltZVwiXSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmV5ZUJsaW5rLmNsb3NlZE1vdGlvbk1zZWMgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmV5ZUJsaW5rLmNsb3NlZE1vdGlvblRpbWUpXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImV5ZUJsaW5rLmNsb3NpbmdNb3Rpb25UaW1lXCJdKVxuICAgICAgICAgICAgY2hhcmFjdGVyLnZpc3VhbC5sMmRPYmplY3QuZXllQmxpbmsuY2xvc2luZ01vdGlvbk1zZWMgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmV5ZUJsaW5rLmNsb3NpbmdNb3Rpb25UaW1lKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJleWVCbGluay5vcGVuaW5nTW90aW9uVGltZVwiXSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmV5ZUJsaW5rLm9wZW5pbmdNb3Rpb25Nc2VjID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5leWVCbGluay5vcGVuaW5nTW90aW9uVGltZSlcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyRFBhcmFtZXRlclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kTDJEUGFyYW1ldGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3RlciBpbnN0YW5jZW9mIHZuLk9iamVjdF9MaXZlMkRDaGFyYWN0ZXIgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGNoYXJhY3Rlci5hbmltYXRvci5sMmRQYXJhbWV0ZXJUbyhAcGFyYW1zLnBhcmFtLm5hbWUsIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucGFyYW0udmFsdWUpLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMMkREZWZhdWx0c1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kTDJERGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMubGl2ZTJkXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5hcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5hcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmRpc2FwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmRpc2FwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubW90aW9uRmFkZUluVGltZSkgdGhlbiBkZWZhdWx0cy5tb3Rpb25GYWRlSW5UaW1lID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5tb3Rpb25GYWRlSW5UaW1lKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTDJESm9pblNjZW5lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZEwyREpvaW5TY2VuZTogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5saXZlMmRcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICByZWNvcmQgPSBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNbQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jaGFyYWN0ZXJJZCldXG4gICAgICAgIHJldHVybiBpZiAhcmVjb3JkIG9yIHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpIC0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSByZWNvcmQuaW5kZXhcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDFcbiAgICAgICAgICAgIHggPSBAcGFyYW1zLnBvc2l0aW9uLnhcbiAgICAgICAgICAgIHkgPSBAcGFyYW1zLnBvc2l0aW9uLnlcbiAgICAgICAgZWxzZSBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAyXG4gICAgICAgICAgICB4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucG9zaXRpb24ueSlcbiAgICAgICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICB6SW5kZXggPSBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKSBlbHNlIGRlZmF1bHRzLnpPcmRlclxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBtb3Rpb25CbHVyID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wibW90aW9uQmx1ci5lbmFibGVkXCJdKSB0aGVuIEBwYXJhbXMubW90aW9uQmx1ciBlbHNlIGRlZmF1bHRzLm1vdGlvbkJsdXJcbiAgICAgICAgb3JpZ2luID0gaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBAcGFyYW1zLm9yaWdpbiBlbHNlIGRlZmF1bHRzLm9yaWdpblxuXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuXG4gICAgICAgIGNoYXJhY3RlciA9IG5ldyB2bi5PYmplY3RfTGl2ZTJEQ2hhcmFjdGVyKHJlY29yZClcbiAgICAgICAgY2hhcmFjdGVyLm1vZGVsTmFtZSA9IEBwYXJhbXMubW9kZWw/Lm5hbWUgfHwgXCJcIlxuICAgICAgICBjaGFyYWN0ZXIubW9kZWwgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0TGl2ZTJETW9kZWwoXCJMaXZlMkQvI3tjaGFyYWN0ZXIubW9kZWxOYW1lfVwiKVxuICAgICAgICBjaGFyYWN0ZXIubW90aW9uID0geyBuYW1lOiBcIlwiLCBmYWRlSW5UaW1lOiAwLCBsb29wOiB0cnVlIH0gaWYgY2hhcmFjdGVyLm1vZGVsLm1vdGlvbnNcbiAgICAgICAgI2NoYXJhY3Rlci5leHByZXNzaW9uID0geyBuYW1lOiBPYmplY3Qua2V5cyhjaGFyYWN0ZXIubW9kZWwuZXhwcmVzc2lvbnMpWzBdLCBmYWRlSW5UaW1lOiAwIH0gaWYgY2hhcmFjdGVyLm1vZGVsLmV4cHJlc3Npb25zXG4gICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnggPSB4XG4gICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnkgPSB5XG4gICAgICAgIGNoYXJhY3Rlci5hbmNob3IueCA9IGlmICFvcmlnaW4gdGhlbiAwIGVsc2UgMC41XG4gICAgICAgIGNoYXJhY3Rlci5hbmNob3IueSA9IGlmICFvcmlnaW4gdGhlbiAwIGVsc2UgMC41XG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIuYmxlbmRNb2RlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5ibGVuZE1vZGUpXG4gICAgICAgIGNoYXJhY3Rlci56b29tLnggPSBAcGFyYW1zLnBvc2l0aW9uLnpvb20uZFxuICAgICAgICBjaGFyYWN0ZXIuem9vbS55ID0gQHBhcmFtcy5wb3NpdGlvbi56b29tLmRcbiAgICAgICAgY2hhcmFjdGVyLnpJbmRleCA9IHpJbmRleCB8fCAyMDBcbiAgICAgICAgY2hhcmFjdGVyLm1vZGVsPy5yZXNldCgpXG4gICAgICAgIGNoYXJhY3Rlci5zZXR1cCgpXG4gICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmlkbGVJbnRlbnNpdHkgPSByZWNvcmQuaWRsZUludGVuc2l0eSA/IDEuMFxuICAgICAgICBjaGFyYWN0ZXIudmlzdWFsLmwyZE9iamVjdC5icmVhdGhJbnRlbnNpdHkgPSByZWNvcmQuYnJlYXRoSW50ZW5zaXR5ID8gMS4wIFxuICAgICAgICBjaGFyYWN0ZXIudmlzdWFsLmwyZE9iamVjdC5saXBTeW5jU2Vuc2l0aXZpdHkgPSByZWNvcmQubGlwU3luY1NlbnNpdGl2aXR5ID8gMS4wXG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIGNoYXJhY3RlciwgQHBhcmFtcylcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnggPSBwLnhcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmFkZENoYXJhY3RlcihjaGFyYWN0ZXIsIG5vLCB7IGFuaW1hdGlvbjogYW5pbWF0aW9uLCBkdXJhdGlvbjogZHVyYXRpb24sIGVhc2luZzogZWFzaW5nLCBtb3Rpb25CbHVyOiBtb3Rpb25CbHVyfSlcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlld3BvcnQ/LnR5cGUgPT0gXCJ1aVwiXG4gICAgICAgICAgICBjaGFyYWN0ZXIudmlld3BvcnQgPSBHcmFwaGljcy52aWV3cG9ydFxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYXJhY3RlckpvaW5TY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJKb2luU2NlbmU6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuY2hhcmFjdGVyXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgcmVjb3JkID0gUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzW0BwYXJhbXMuY2hhcmFjdGVySWRdXG4gICAgICAgIHJldHVybiBpZiAhcmVjb3JkIG9yIHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpIC0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSByZWNvcmQuaW5kZXggYW5kICF2LmRpc3Bvc2VkXG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIgPSBuZXcgdm4uT2JqZWN0X0NoYXJhY3RlcihyZWNvcmQsIG51bGwsIHNjZW5lKVxuICAgICAgICBjaGFyYWN0ZXIuZXhwcmVzc2lvbiA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyRXhwcmVzc2lvbnNbQHBhcmFtcy5leHByZXNzaW9uSWQgPyByZWNvcmQuZGVmYXVsdEV4cHJlc3Npb25JZHx8MF0gI2NoYXJhY3Rlci5leHByZXNzaW9uXG4gICAgICAgIGlmIGNoYXJhY3Rlci5leHByZXNzaW9uP1xuICAgICAgICAgICAgYml0bWFwID0gUmVzb3VyY2VNYW5hZ2VyLmdldEJpdG1hcChcIkdyYXBoaWNzL0NoYXJhY3RlcnMvI3tjaGFyYWN0ZXIuZXhwcmVzc2lvbi5pZGxlWzBdPy5yZXNvdXJjZS5uYW1lfVwiKVxuICAgICAgICBcbiAgICAgICAgbWlycm9yID0gbm9cbiAgICAgICAgYW5nbGUgPSAwXG4gICAgICAgIHpvb20gPSAxXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAxXG4gICAgICAgICAgICB4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucG9zaXRpb24ueSlcbiAgICAgICAgICAgIG1pcnJvciA9IEBwYXJhbXMucG9zaXRpb24uaG9yaXpvbnRhbEZsaXBcbiAgICAgICAgICAgIGFuZ2xlID0gQHBhcmFtcy5wb3NpdGlvbi5hbmdsZXx8MFxuICAgICAgICAgICAgem9vbSA9IEBwYXJhbXMucG9zaXRpb24uZGF0YT8uem9vbSB8fCAxXG4gICAgICAgIGVsc2UgaWYgQHBhcmFtcy5wb3NpdGlvblR5cGUgPT0gMlxuICAgICAgICAgICAgeCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucG9zaXRpb24ueClcbiAgICAgICAgICAgIHkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBvc2l0aW9uLnkpXG4gICAgICAgICAgICBtaXJyb3IgPSBub1xuICAgICAgICAgICAgYW5nbGUgPSAwXG4gICAgICAgICAgICB6b29tID0gMVxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuYXBwZWFyRHVyYXRpb25cbiAgICAgICAgb3JpZ2luID0gaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBAcGFyYW1zLm9yaWdpbiBlbHNlIGRlZmF1bHRzLm9yaWdpblxuICAgICAgICB6SW5kZXggPSBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKSBlbHNlIGRlZmF1bHRzLnpPcmRlclxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBtb3Rpb25CbHVyID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wibW90aW9uQmx1ci5lbmFibGVkXCJdKSB0aGVuIEBwYXJhbXMubW90aW9uQmx1ciBlbHNlIGRlZmF1bHRzLm1vdGlvbkJsdXJcbiAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgaWYgY2hhcmFjdGVyLmV4cHJlc3Npb24/XG4gICAgICAgICAgICBiaXRtYXAgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvQ2hhcmFjdGVycy8je2NoYXJhY3Rlci5leHByZXNzaW9uLmlkbGVbMF0/LnJlc291cmNlLm5hbWV9XCIpXG4gICAgICAgICAgICBpZiBAcGFyYW1zLm9yaWdpbiA9PSAxIGFuZCBiaXRtYXA/XG4gICAgICAgICAgICAgICAgeCArPSAoYml0bWFwLndpZHRoKnpvb20tYml0bWFwLndpZHRoKS8yXG4gICAgICAgICAgICAgICAgeSArPSAoYml0bWFwLmhlaWdodCp6b29tLWJpdG1hcC5oZWlnaHQpLzJcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgY2hhcmFjdGVyLm1pcnJvciA9IG1pcnJvclxuICAgICAgICBjaGFyYWN0ZXIuYW5jaG9yLnggPSBpZiAhb3JpZ2luIHRoZW4gMCBlbHNlIDAuNVxuICAgICAgICBjaGFyYWN0ZXIuYW5jaG9yLnkgPSBpZiAhb3JpZ2luIHRoZW4gMCBlbHNlIDAuNVxuICAgICAgICBjaGFyYWN0ZXIuem9vbS54ID0gem9vbVxuICAgICAgICBjaGFyYWN0ZXIuem9vbS55ID0gem9vbVxuICAgICAgICBjaGFyYWN0ZXIuZHN0UmVjdC54ID0geFxuICAgICAgICBjaGFyYWN0ZXIuZHN0UmVjdC55ID0geVxuICAgICAgICBjaGFyYWN0ZXIuekluZGV4ID0gekluZGV4IHx8ICAyMDBcbiAgICAgICAgY2hhcmFjdGVyLmJsZW5kTW9kZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYmxlbmRNb2RlKVxuICAgICAgICBjaGFyYWN0ZXIuYW5nbGUgPSBhbmdsZVxuICAgICAgICBjaGFyYWN0ZXIuc2V0dXAoKVxuICAgICAgICBjaGFyYWN0ZXIudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIGNoYXJhY3RlciwgQHBhcmFtcylcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnggPSBwLnhcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmFkZENoYXJhY3RlcihjaGFyYWN0ZXIsIG5vLCB7IGFuaW1hdGlvbjogYW5pbWF0aW9uLCBkdXJhdGlvbjogZHVyYXRpb24sIGVhc2luZzogZWFzaW5nLCBtb3Rpb25CbHVyOiBtb3Rpb25CbHVyfSlcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlld3BvcnQ/LnR5cGUgPT0gXCJ1aVwiXG4gICAgICAgICAgICBjaGFyYWN0ZXIudmlld3BvcnQgPSBHcmFwaGljcy52aWV3cG9ydFxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYXJhY3RlckV4aXRTY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJFeGl0U2NlbmU6IChkZWZhdWx0cykgLT5cbiAgICAgICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCBHYW1lTWFuYWdlci5kZWZhdWx0cy5jaGFyYWN0ZXJcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWRcbiAgICAgICAgXG4gICAgICAgIGVhc2luZyA9IGlmICFpc0xvY2tlZChmbGFnc1tcImVhc2luZy50eXBlXCJdKSB0aGVuIGdzLkVhc2luZ3MuZnJvbVZhbHVlcyhAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmVhc2luZy50eXBlKSwgQHBhcmFtcy5lYXNpbmcuaW5PdXQpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmRpc2FwcGVhckVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uXG4gICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLnJlbW92ZUNoYXJhY3RlcihjaGFyYWN0ZXIsIHsgYW5pbWF0aW9uOiBhbmltYXRpb24sIGR1cmF0aW9uOiBkdXJhdGlvbiwgZWFzaW5nOiBlYXNpbmd9KSAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFyYWN0ZXJDaGFuZ2VFeHByZXNzaW9uXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kQ2hhcmFjdGVyQ2hhbmdlRXhwcmVzc2lvbjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuY2hhcmFjdGVyXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5leHByZXNzaW9uRHVyYXRpb25cbiAgICAgICAgZXhwcmVzc2lvbiA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyRXhwcmVzc2lvbnNbQHBhcmFtcy5leHByZXNzaW9uSWQgfHwgMF1cbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5jaGFuZ2VFYXNpbmcpXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuY2hhbmdlQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIuYmVoYXZpb3IuY2hhbmdlRXhwcmVzc2lvbihleHByZXNzaW9uLCBAcGFyYW1zLmFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcblxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyU2V0UGFyYW1ldGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJTZXRQYXJhbWV0ZXI6IC0+XG4gICAgICAgIHBhcmFtcyA9IEdhbWVNYW5hZ2VyLmNoYXJhY3RlclBhcmFtc1tAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKV1cbiAgICAgICAgaWYgbm90IHBhcmFtcz8gb3Igbm90IEBwYXJhbXMucGFyYW0/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLnBhcmFtLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXNbQHBhcmFtcy5wYXJhbS5uYW1lXSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSA+IDBcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgVGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKS50b1N0cmluZygpXG4gICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2ggVmFsdWVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wYXJhbS50eXBlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gaWYgdmFsdWUgdGhlbiAxIGVsc2UgMFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpICAgIFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBpZiB2YWx1ZSB0aGVuIFwiT05cIiBlbHNlIFwiT0ZGXCJcbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHQgVmFsdWVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wYXJhbS50eXBlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gdmFsdWUubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSkgPT0gXCJPTlwiXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50ZXh0VmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyR2V0UGFyYW1ldGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJHZXRQYXJhbWV0ZXI6IC0+XG4gICAgICAgIHBhcmFtcyA9IEdhbWVNYW5hZ2VyLmNoYXJhY3RlclBhcmFtc1tAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKV1cbiAgICAgICAgaWYgbm90IHBhcmFtcz8gb3Igbm90IEBwYXJhbXMucGFyYW0/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICB2YWx1ZSA9IHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLnBhcmFtLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBpZiB2YWx1ZSB0aGVuIDEgZWxzZSAwKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBpZiB2YWx1ZT8gdGhlbiB2YWx1ZS5sZW5ndGggZWxzZSAwKVxuICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoIFZhbHVlXG4gICAgICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMucGFyYW0udHlwZVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBOdW1iZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSA+IDApXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgdmFsdWUgPT0gXCJPTlwiKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHQgVmFsdWVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wYXJhbS50eXBlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgaWYgdmFsdWU/IHRoZW4gdmFsdWUudG9TdHJpbmcoKSBlbHNlIFwiXCIpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgaWYgdmFsdWUgdGhlbiBcIk9OXCIgZWxzZSBcIk9GRlwiKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFyYWN0ZXJNb3Rpb25CbHVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZENoYXJhY3Rlck1vdGlvbkJsdXI6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG5cbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbkJsdXIuc2V0KEBwYXJhbXMubW90aW9uQmx1cilcbiAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyRGVmYXVsdHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZENoYXJhY3RlckRlZmF1bHRzOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmNoYXJhY3RlclxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kaXNhcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kaXNhcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmV4cHJlc3Npb25EdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5leHByZXNzaW9uRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZXhwcmVzc2lvbkR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJtb3Rpb25CbHVyLmVuYWJsZWRcIl0pIHRoZW4gZGVmYXVsdHMubW90aW9uQmx1ciA9IEBwYXJhbXMubW90aW9uQmx1clxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIGRlZmF1bHRzLm9yaWdpbiA9IEBwYXJhbXMub3JpZ2luXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyRWZmZWN0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZENoYXJhY3RlckVmZmVjdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVySWQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0IChjKSAtPiAhYy5kaXNwb3NlZCBhbmQgYy5yaWQgPT0gY2hhcmFjdGVySWRcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RFZmZlY3QoY2hhcmFjdGVyLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZsYXNoQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZEZsYXNoQ2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgcmV0dXJuIGlmIG5vdCBjaGFyYWN0ZXJcbiAgICAgICAgXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBjaGFyYWN0ZXIuYW5pbWF0b3IuZmxhc2gobmV3IENvbG9yKEBwYXJhbXMuY29sb3IpLCBkdXJhdGlvbilcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFRpbnRDaGFyYWN0ZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRUaW50Q2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dClcbiAgICAgICAgcmV0dXJuIGlmIG5vdCBjaGFyYWN0ZXJcbiAgICAgICAgXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBjaGFyYWN0ZXIuYW5pbWF0b3IudGludFRvKEBwYXJhbXMudG9uZSwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRab29tQ2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCAgICAgIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnpvb21PYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG5cbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSb3RhdGVDaGFyYWN0ZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZFJvdGF0ZUNoYXJhY3RlcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgICAgICBcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5yb3RhdGVPYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJsZW5kQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZEJsZW5kQ2hhcmFjdGVyOiAtPlxuICAgICAgICBjaGFyYWN0ZXIgPSBTY2VuZU1hbmFnZXIuc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgICAgICBcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5ibGVuZE9iamVjdChjaGFyYWN0ZXIsIEBwYXJhbXMpIFxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNoYWtlQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZFNoYWtlQ2hhcmFjdGVyOiAtPiBcbiAgICAgICAgY2hhcmFjdGVyID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCAgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCAgICAgIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyPyB0aGVuIHJldHVyblxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2hha2VPYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zKSAgXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNYXNrQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZE1hc2tDaGFyYWN0ZXI6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkICAgICAgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubWFza09iamVjdChjaGFyYWN0ZXIsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNb3ZlQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRNb3ZlQ2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCAgICAgIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zLnBvc2l0aW9uLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZUNoYXJhY3RlclBhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kTW92ZUNoYXJhY3RlclBhdGg6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkICAgICAgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubW92ZU9iamVjdFBhdGgoY2hhcmFjdGVyLCBAcGFyYW1zLnBhdGgsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaGFrZUJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZFNoYWtlQmFja2dyb3VuZDogLT4gXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcildXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNoYWtlT2JqZWN0KGJhY2tncm91bmQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcblxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcm9sbEJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTY3JvbGxCYWNrZ3JvdW5kOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgaG9yaXpvbnRhbFNwZWVkID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5ob3Jpem9udGFsU3BlZWQpXG4gICAgICAgIHZlcnRpY2FsU3BlZWQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnZlcnRpY2FsU3BlZWQpXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbVZhbHVlcyhAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmVhc2luZy50eXBlKSwgQHBhcmFtcy5lYXNpbmcuaW5PdXQpXG4gICAgICAgIGxheWVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcilcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICBcbiAgICAgICAgc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdPy5hbmltYXRvci5tb3ZlKGhvcml6b250YWxTcGVlZCwgdmVydGljYWxTcGVlZCwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcm9sbEJhY2tncm91bmRUb1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZFNjcm9sbEJhY2tncm91bmRUbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIHggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJhY2tncm91bmQubG9jYXRpb24ueClcbiAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYmFja2dyb3VuZC5sb2NhdGlvbi55KVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KVxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl1cbiAgICAgICAgaWYgIWJhY2tncm91bmQgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICBwID0gQGludGVycHJldGVyLnByZWRlZmluZWRPYmplY3RQb3NpdGlvbihAcGFyYW1zLnByZWRlZmluZWRQb3NpdGlvbklkLCBiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICAgICAgeCA9IHAueFxuICAgICAgICAgICAgeSA9IHAueVxuICAgICBcbiAgICAgICAgYmFja2dyb3VuZC5hbmltYXRvci5tb3ZlVG8oeCwgeSwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcm9sbEJhY2tncm91bmRQYXRoXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZFNjcm9sbEJhY2tncm91bmRQYXRoOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBiYWNrZ3JvdW5kID0gc2NlbmUuYmFja2dyb3VuZHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcildXG4gICAgICAgIHJldHVybiB1bmxlc3MgYmFja2dyb3VuZD9cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tb3ZlT2JqZWN0UGF0aChiYWNrZ3JvdW5kLCBAcGFyYW1zLnBhdGgsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNYXNrQmFja2dyb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRNYXNrQmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgYmFja2dyb3VuZCA9IHNjZW5lLmJhY2tncm91bmRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXVxuICAgICAgICByZXR1cm4gdW5sZXNzIGJhY2tncm91bmQ/XG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubWFza09iamVjdChiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFpvb21CYWNrZ3JvdW5kXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRab29tQmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIHggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpvb21pbmcueClcbiAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuem9vbWluZy55KVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KVxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0/LmFuaW1hdG9yLnpvb21Ubyh4IC8gMTAwLCB5IC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUm90YXRlQmFja2dyb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUm90YXRlQmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgYmFja2dyb3VuZCA9IHNjZW5lLmJhY2tncm91bmRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXVxuICAgICAgICBcbiAgICAgICAgaWYgYmFja2dyb3VuZFxuICAgICAgICAgICAgQGludGVycHJldGVyLnJvdGF0ZU9iamVjdChiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICAgICAgXG4gICAgIyMjKiAgICAgICAgXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRUaW50QmFja2dyb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRUaW50QmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgbGF5ZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKVxuICAgICAgICBiYWNrZ3JvdW5kID0gc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgYmFja2dyb3VuZC5hbmltYXRvci50aW50VG8oQHBhcmFtcy50b25lLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLndhaXRGb3JDb21wbGV0aW9uKGJhY2tncm91bmQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCbGVuZEJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kQmxlbmRCYWNrZ3JvdW5kOiAtPlxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmJsZW5kT2JqZWN0KGJhY2tncm91bmQsIEBwYXJhbXMpIFxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJhY2tncm91bmRFZmZlY3RcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRCYWNrZ3JvdW5kRWZmZWN0OiAtPlxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm9iamVjdEVmZmVjdChiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQmFja2dyb3VuZERlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZEJhY2tncm91bmREZWZhdWx0czogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5iYWNrZ3JvdW5kXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnpPcmRlcikgdGhlbiBkZWZhdWx0cy56T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZWFzaW5nID0gQHBhcmFtcy5lYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYW5pbWF0aW9uID0gQHBhcmFtcy5hbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBkZWZhdWx0cy5vcmlnaW4gPSBAcGFyYW1zLm9yaWdpblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubG9vcEhvcml6b250YWwpIHRoZW4gZGVmYXVsdHMubG9vcEhvcml6b250YWwgPSBAcGFyYW1zLmxvb3BIb3Jpem9udGFsXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5sb29wVmVydGljYWwpIHRoZW4gZGVmYXVsdHMubG9vcFZlcnRpY2FsID0gQHBhcmFtcy5sb29wVmVydGljYWxcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCYWNrZ3JvdW5kTW90aW9uQmx1clxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZEJhY2tncm91bmRNb3Rpb25CbHVyOiAtPlxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgYmFja2dyb3VuZC5tb3Rpb25CbHVyLnNldChAcGFyYW1zLm1vdGlvbkJsdXIpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZUJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRDaGFuZ2VCYWNrZ3JvdW5kOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmJhY2tncm91bmRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZHVyYXRpb25cbiAgICAgICAgbG9vcEggPSBpZiAhaXNMb2NrZWQoZmxhZ3MubG9vcEhvcml6b250YWwpIHRoZW4gQHBhcmFtcy5sb29wSG9yaXpvbnRhbCBlbHNlIGRlZmF1bHRzLmxvb3BIb3Jpem9udGFsXG4gICAgICAgIGxvb3BWID0gaWYgIWlzTG9ja2VkKGZsYWdzLmxvb3BWZXJ0aWNhbCkgdGhlbiBAcGFyYW1zLmxvb3BWZXJ0aWNhbCBlbHNlIGRlZmF1bHRzLmxvb3BWZXJ0aWNhbFxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFuaW1hdGlvblxuICAgICAgICBvcmlnaW4gPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIEBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpIGVsc2UgZGVmYXVsdHMuek9yZGVyXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgXG4gICAgICAgIGVhc2luZyA9IGlmICFpc0xvY2tlZChmbGFnc1tcImVhc2luZy50eXBlXCJdKSB0aGVuICBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmVhc2luZylcbiAgICAgICAgbGF5ZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VCYWNrZ3JvdW5kKEBwYXJhbXMuZ3JhcGhpYywgbm8sIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgMCwgMCwgbGF5ZXIsIGxvb3BILCBsb29wVilcbiAgICAgICAgXG4gICAgICAgIGlmIHNjZW5lLmJhY2tncm91bmRzW2xheWVyXVxuICAgICAgICAgICAgaWYgQHBhcmFtcy52aWV3cG9ydD8udHlwZSA9PSBcInVpXCJcbiAgICAgICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0udmlld3BvcnQgPSBHcmFwaGljcy52aWV3cG9ydFxuICAgICAgICAgICAgc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLmFuY2hvci54ID0gaWYgb3JpZ2luID09IDAgdGhlbiAwIGVsc2UgMC41XG4gICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uYW5jaG9yLnkgPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgICAgIHNjZW5lLmJhY2tncm91bmRzW2xheWVyXS5ibGVuZE1vZGUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJsZW5kTW9kZSlcbiAgICAgICAgICAgIHNjZW5lLmJhY2tncm91bmRzW2xheWVyXS56SW5kZXggPSB6SW5kZXhcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgb3JpZ2luID09IDFcbiAgICAgICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uZHN0UmVjdC54ID0gc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLmRzdFJlY3QueCMgKyBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uYml0bWFwLndpZHRoLzJcbiAgICAgICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uZHN0UmVjdC55ID0gc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLmRzdFJlY3QueSMgKyBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uYml0bWFwLmhlaWdodC8yXG4gICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uc2V0dXAoKVxuICAgICAgICAgICAgc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLnVwZGF0ZSgpXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2FsbFNjZW5lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZENhbGxTY2VuZTogLT5cbiAgICAgICAgQGludGVycHJldGVyLmNhbGxTY2VuZShAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnNjZW5lLnVpZCB8fCBAcGFyYW1zLnNjZW5lKSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhbmdlU2NlbmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kQ2hhbmdlU2NlbmU6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXcgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmICFAcGFyYW1zLnNhdmVQcmV2aW91c1xuICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLmNsZWFyKClcbiAgICAgICAgICAgIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBpZiAhQHBhcmFtcy5lcmFzZVBpY3R1cmVzIGFuZCAhQHBhcmFtcy5zYXZlUHJldmlvdXNcbiAgICAgICAgICAgIHNjZW5lLnJlbW92ZU9iamVjdChzY2VuZS5waWN0dXJlQ29udGFpbmVyKVxuICAgICAgICAgICAgZm9yIHBpY3R1cmUgaW4gc2NlbmUucGljdHVyZXNcbiAgICAgICAgICAgICAgICBSZXNvdXJjZU1hbmFnZXIuY29udGV4dC5yZW1vdmUoXCJHcmFwaGljcy9QaWN0dXJlcy8je3BpY3R1cmUuaW1hZ2V9XCIpIGlmIHBpY3R1cmVcbiAgICAgICAgaWYgIUBwYXJhbXMuZXJhc2VUZXh0cyBhbmQgIUBwYXJhbXMuc2F2ZVByZXZpb3VzXG4gICAgICAgICAgICBzY2VuZS5yZW1vdmVPYmplY3Qoc2NlbmUudGV4dENvbnRhaW5lcilcbiAgICAgICAgaWYgIUBwYXJhbXMuZXJhc2VWaWRlb3MgYW5kICFAcGFyYW1zLnNhdmVQcmV2aW91c1xuICAgICAgICAgICAgc2NlbmUucmVtb3ZlT2JqZWN0KHNjZW5lLnZpZGVvQ29udGFpbmVyKVxuICAgICAgICAgICAgZm9yIHZpZGVvIGluIHNjZW5lLnZpZGVvc1xuICAgICAgICAgICAgICAgIFJlc291cmNlTWFuYWdlci5jb250ZXh0LnJlbW92ZShcIk1vdmllcy8je3ZpZGVvLnZpZGVvfVwiKSBpZiB2aWRlb1xuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy5zY2VuZVxuICAgICAgICAgICAgaWYgQHBhcmFtcy5zYXZlUHJldmlvdXNcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci5zY2VuZURhdGEgPSB1aWQ6IHVpZCA9IEBwYXJhbXMuc2NlbmUudWlkLCBwaWN0dXJlczogW10sIHRleHRzOiBbXSwgdmlkZW9zOiBbXVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnNjZW5lRGF0YSA9IHVpZDogdWlkID0gQHBhcmFtcy5zY2VuZS51aWQsIHBpY3R1cmVzOiBzY2VuZS5waWN0dXJlQ29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpbiwgdGV4dHM6IHNjZW5lLnRleHRDb250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluLCB2aWRlb3M6IHNjZW5lLnZpZGVvQ29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpblxuICAgICAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgICAgIG5ld1NjZW5lID0gbmV3IHZuLk9iamVjdF9TY2VuZSgpXG4gICAgICAgICAgICBpZiBAcGFyYW1zLnNhdmVQcmV2aW91c1xuICAgICAgICAgICAgICAgIG5ld1NjZW5lLnNjZW5lRGF0YSA9IHVpZDogdWlkID0gQHBhcmFtcy5zY2VuZS51aWQsIHBpY3R1cmVzOiBbXSwgdGV4dHM6IFtdLCB2aWRlb3M6IFtdLCBiYWNrbG9nOiBHYW1lTWFuYWdlci5iYWNrbG9nXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbmV3U2NlbmUuc2NlbmVEYXRhID0gdWlkOiB1aWQgPSBAcGFyYW1zLnNjZW5lLnVpZCwgcGljdHVyZXM6IHNjZW5lLnBpY3R1cmVDb250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluLCB0ZXh0czogc2NlbmUudGV4dENvbnRhaW5lci5zdWJPYmplY3RzQnlEb21haW4sIHZpZGVvczogc2NlbmUudmlkZW9Db250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFNjZW5lTWFuYWdlci5zd2l0Y2hUbyhuZXdTY2VuZSwgQHBhcmFtcy5zYXZlUHJldmlvdXMsID0+IEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSBubylcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG51bGwpXG4gICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSZXR1cm5Ub1ByZXZpb3VzU2NlbmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRSZXR1cm5Ub1ByZXZpb3VzU2NlbmU6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXcgdGhlbiByZXR1cm5cbiAgICAgICAgU2NlbmVNYW5hZ2VyLnJldHVyblRvUHJldmlvdXMoPT4gQGludGVycHJldGVyLmlzV2FpdGluZyA9IG5vKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTd2l0Y2hUb0xheW91dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kU3dpdGNoVG9MYXlvdXQ6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXcgdGhlbiByZXR1cm5cbiAgICAgICAgaWYgdWkuVUlNYW5hZ2VyLmxheW91dHNbQHBhcmFtcy5sYXlvdXQubmFtZV0/XG4gICAgICAgICAgICBzY2VuZSA9IG5ldyBncy5PYmplY3RfTGF5b3V0KEBwYXJhbXMubGF5b3V0Lm5hbWUpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIuc3dpdGNoVG8oc2NlbmUsIEBwYXJhbXMuc2F2ZVByZXZpb3VzKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVRyYW5zaXRpb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZENoYW5nZVRyYW5zaXRpb246IC0+XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbilcbiAgICAgICAgICAgIFNjZW5lTWFuYWdlci50cmFuc2l0aW9uRGF0YS5kdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmdyYXBoaWMpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEuZ3JhcGhpYyA9IEBwYXJhbXMuZ3JhcGhpY1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MudmFndWUpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEudmFndWUgPSBAcGFyYW1zLnZhZ3VlXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZyZWV6ZVNjcmVlblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRGcmVlemVTY3JlZW46IC0+IFxuICAgICAgICBHcmFwaGljcy5mcmVlemUoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcmVlblRyYW5zaXRpb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTY3JlZW5UcmFuc2l0aW9uOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLnNjZW5lXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgZ3JhcGhpY05hbWUgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZ3JhcGhpYykgdGhlbiBAcGFyYW1zLmdyYXBoaWM/Lm5hbWUgZWxzZSBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEuZ3JhcGhpYz8ubmFtZVxuICAgICAgICBcbiAgICAgICAgaWYgZ3JhcGhpY05hbWVcbiAgICAgICAgICAgIGJpdG1hcCA9IGlmICFpc0xvY2tlZChmbGFncy5ncmFwaGljKSB0aGVuIFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9NYXNrcy8je2dyYXBoaWNOYW1lfVwiKSBlbHNlIFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9NYXNrcy8je2dyYXBoaWNOYW1lfVwiKVxuICAgICAgICB2YWd1ZSA9IGlmICFpc0xvY2tlZChmbGFncy52YWd1ZSkgdGhlbiBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnZhZ3VlKSBlbHNlIFNjZW5lTWFuYWdlci50cmFuc2l0aW9uRGF0YS52YWd1ZVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgU2NlbmVNYW5hZ2VyLnRyYW5zaXRpb25EYXRhLmR1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gIUdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXdcbiAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBHcmFwaGljcy50cmFuc2l0aW9uKGR1cmF0aW9uLCBiaXRtYXAsIHZhZ3VlKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNoYWtlU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZFNoYWtlU2NyZWVuOiAtPlxuICAgICAgICBpZiBub3QgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0PyB0aGVuIHJldHVybiAgICAgICAgICAgICAgICBcbiAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNoYWtlT2JqZWN0KFNjZW5lTWFuYWdlci5zY2VuZS52aWV3cG9ydCwgQHBhcmFtcykgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRUaW50U2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRUaW50U2NyZWVuOiAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuaW1hdG9yLnRpbnRUbyhuZXcgVG9uZShAcGFyYW1zLnRvbmUpLCBkdXJhdGlvbiwgZ3MuRWFzaW5ncy5FQVNFX0xJTkVBUlswXSlcbiAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgZHVyYXRpb24gPiAwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kWm9vbVNjcmVlbjogLT5cbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcblxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUudmlld3BvcnQuYW5jaG9yLnggPSAwLjVcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuY2hvci55ID0gMC41XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS52aWV3cG9ydC5hbmltYXRvci56b29tVG8oQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56b29taW5nLngpIC8gMTAwLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpvb21pbmcueSkgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obnVsbCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFBhblNjcmVlblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgIFxuICAgIGNvbW1hbmRQYW5TY3JlZW46IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIEBpbnRlcnByZXRlci5zZXR0aW5ncy5zY3JlZW4ucGFuLnggLT0gQHBhcmFtcy5wb3NpdGlvbi54XG4gICAgICAgIEBpbnRlcnByZXRlci5zZXR0aW5ncy5zY3JlZW4ucGFuLnkgLT0gQHBhcmFtcy5wb3NpdGlvbi55XG4gICAgICAgIHZpZXdwb3J0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0XG5cbiAgICAgICAgdmlld3BvcnQuYW5pbWF0b3Iuc2Nyb2xsVG8oLUBwYXJhbXMucG9zaXRpb24ueCArIHZpZXdwb3J0LmRzdFJlY3QueCwgLUBwYXJhbXMucG9zaXRpb24ueSArIHZpZXdwb3J0LmRzdFJlY3QueSwgZHVyYXRpb24sIGVhc2luZykgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obnVsbCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUm90YXRlU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRSb3RhdGVTY3JlZW46IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBwYW4gPSBAaW50ZXJwcmV0ZXIuc2V0dGluZ3Muc2NyZWVuLnBhblxuXG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS52aWV3cG9ydC5hbmNob3IueCA9IDAuNVxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUudmlld3BvcnQuYW5jaG9yLnkgPSAwLjVcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuaW1hdG9yLnJvdGF0ZShAcGFyYW1zLmRpcmVjdGlvbiwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5zcGVlZCkgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obnVsbCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZsYXNoU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZEZsYXNoU2NyZWVuOiAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuaW1hdG9yLmZsYXNoKG5ldyBDb2xvcihAcGFyYW1zLmNvbG9yKSwgZHVyYXRpb24sIGdzLkVhc2luZ3MuRUFTRV9MSU5FQVJbMF0pXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBkdXJhdGlvbiAhPSAwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTY3JlZW5FZmZlY3RcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgXG4gICAgY29tbWFuZFNjcmVlbkVmZmVjdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgIWdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkKGZsYWdzLnpPcmRlcikgXG4gICAgICAgICAgICB6T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgek9yZGVyID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LnpJbmRleFxuICAgICAgICAgICAgXG4gICAgICAgIHZpZXdwb3J0ID0gc2NlbmUudmlld3BvcnRDb250YWluZXIuc3ViT2JqZWN0cy5maXJzdCAodikgLT4gdi56SW5kZXggPT0gek9yZGVyXG4gICAgICAgIFxuICAgICAgICBpZiAhdmlld3BvcnRcbiAgICAgICAgICAgIHZpZXdwb3J0ID0gbmV3IGdzLk9iamVjdF9WaWV3cG9ydCgpXG4gICAgICAgICAgICB2aWV3cG9ydC56SW5kZXggPSB6T3JkZXJcbiAgICAgICAgICAgIHNjZW5lLnZpZXdwb3J0Q29udGFpbmVyLmFkZE9iamVjdCh2aWV3cG9ydClcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIFdvYmJsZVxuICAgICAgICAgICAgICAgIHZpZXdwb3J0LmFuaW1hdG9yLndvYmJsZVRvKEBwYXJhbXMud29iYmxlLnBvd2VyIC8gMTAwMDAsIEBwYXJhbXMud29iYmxlLnNwZWVkIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICAgICAgICAgIHdvYmJsZSA9IHZpZXdwb3J0LmVmZmVjdHMud29iYmxlXG4gICAgICAgICAgICAgICAgd29iYmxlLmVuYWJsZWQgPSBAcGFyYW1zLndvYmJsZS5wb3dlciA+IDBcbiAgICAgICAgICAgICAgICB3b2JibGUudmVydGljYWwgPSBAcGFyYW1zLndvYmJsZS5vcmllbnRhdGlvbiA9PSAwIG9yIEBwYXJhbXMud29iYmxlLm9yaWVudGF0aW9uID09IDJcbiAgICAgICAgICAgICAgICB3b2JibGUuaG9yaXpvbnRhbCA9IEBwYXJhbXMud29iYmxlLm9yaWVudGF0aW9uID09IDEgb3IgQHBhcmFtcy53b2JibGUub3JpZW50YXRpb24gPT0gMlxuICAgICAgICAgICAgd2hlbiAxICMgQmx1clxuICAgICAgICAgICAgICAgIHZpZXdwb3J0LmFuaW1hdG9yLmJsdXJUbyhAcGFyYW1zLmJsdXIucG93ZXIgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgdmlld3BvcnQuZWZmZWN0cy5ibHVyLmVuYWJsZWQgPSB5ZXNcbiAgICAgICAgICAgIHdoZW4gMiAjIFBpeGVsYXRlXG4gICAgICAgICAgICAgICAgdmlld3BvcnQuYW5pbWF0b3IucGl4ZWxhdGVUbyhAcGFyYW1zLnBpeGVsYXRlLnNpemUud2lkdGgsIEBwYXJhbXMucGl4ZWxhdGUuc2l6ZS5oZWlnaHQsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgdmlld3BvcnQuZWZmZWN0cy5waXhlbGF0ZS5lbmFibGVkID0geWVzXG4gICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIGR1cmF0aW9uICE9IDBcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFZpZGVvRGVmYXVsdHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZFZpZGVvRGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudmlkZW9cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmFwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmFwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmFwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuZGlzYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZGlzYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gZGVmYXVsdHMuek9yZGVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImFwcGVhckVhc2luZy50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmFwcGVhckVhc2luZyA9IEBwYXJhbXMuYXBwZWFyRWFzaW5nXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImFwcGVhckFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvbiA9IEBwYXJhbXMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImRpc2FwcGVhckVhc2luZy50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckVhc2luZyA9IEBwYXJhbXMuZGlzYXBwZWFyRWFzaW5nXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImRpc2FwcGVhckFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckFuaW1hdGlvbiA9IEBwYXJhbXMuZGlzYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcIm1vdGlvbkJsdXIuZW5hYmxlZFwiXSkgdGhlbiBkZWZhdWx0cy5tb3Rpb25CbHVyID0gQHBhcmFtcy5tb3Rpb25CbHVyXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5vcmlnaW4pIHRoZW4gZGVmYXVsdHMub3JpZ2luID0gQHBhcmFtcy5vcmlnaW5cbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93VmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRTaG93VmlkZW86IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudmlkZW9cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VWaWRlb0RvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHZpZGVvcyA9IHNjZW5lLnZpZGVvc1xuICAgICAgICBpZiBub3QgdmlkZW9zW251bWJlcl0/IHRoZW4gdmlkZW9zW251bWJlcl0gPSBuZXcgZ3MuT2JqZWN0X1ZpZGVvKClcbiAgICAgICAgXG4gICAgICAgIHggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBvc2l0aW9uLngpXG4gICAgICAgIHkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBvc2l0aW9uLnkpXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICBvcmlnaW4gPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIEBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpIGVsc2UgZGVmYXVsdHMuek9yZGVyXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICAgICB2aWRlbyA9IHZpZGVvc1tudW1iZXJdXG4gICAgICAgIHZpZGVvLmRvbWFpbiA9IEBwYXJhbXMubnVtYmVyRG9tYWluXG4gICAgICAgIHZpZGVvLnZpZGVvID0gQHBhcmFtcy52aWRlbz8ubmFtZVxuICAgICAgICB2aWRlby5sb29wID0geWVzXG4gICAgICAgIHZpZGVvLmRzdFJlY3QueCA9IHhcbiAgICAgICAgdmlkZW8uZHN0UmVjdC55ID0geVxuICAgICAgICB2aWRlby5ibGVuZE1vZGUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJsZW5kTW9kZSlcbiAgICAgICAgdmlkZW8uYW5jaG9yLnggPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgdmlkZW8uYW5jaG9yLnkgPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgdmlkZW8uekluZGV4ID0gekluZGV4IHx8ICAoMTAwMCArIG51bWJlcilcbiAgICAgICAgaWYgQHBhcmFtcy52aWV3cG9ydD8udHlwZSA9PSBcInNjZW5lXCJcbiAgICAgICAgICAgIHZpZGVvLnZpZXdwb3J0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmJlaGF2aW9yLnZpZXdwb3J0XG4gICAgICAgIHZpZGVvLnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICBwID0gQGludGVycHJldGVyLnByZWRlZmluZWRPYmplY3RQb3NpdGlvbihAcGFyYW1zLnByZWRlZmluZWRQb3NpdGlvbklkLCB2aWRlbywgQHBhcmFtcylcbiAgICAgICAgICAgIHZpZGVvLmRzdFJlY3QueCA9IHAueFxuICAgICAgICAgICAgdmlkZW8uZHN0UmVjdC55ID0gcC55XG4gICAgICAgICAgICBcbiAgICAgICAgdmlkZW8uYW5pbWF0b3IuYXBwZWFyKHgsIHksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZVZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kTW92ZVZpZGVvOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VWaWRlb0RvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHZpZGVvID0gc2NlbmUudmlkZW9zW251bWJlcl1cbiAgICAgICAgaWYgbm90IHZpZGVvPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3QodmlkZW8sIEBwYXJhbXMucGljdHVyZS5wb3NpdGlvbiwgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZE1vdmVWaWRlb1BhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kTW92ZVZpZGVvUGF0aDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tb3ZlT2JqZWN0UGF0aCh2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJvdGF0ZVZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRSb3RhdGVWaWRlbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5yb3RhdGVPYmplY3QodmlkZW8sIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tVmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZFpvb21WaWRlbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci56b29tT2JqZWN0KHZpZGVvLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQmxlbmRWaWRlb1xuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRCbGVuZFZpZGVvOiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIHZpZGVvID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZGVvc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5ibGVuZE9iamVjdCh2aWRlbywgQHBhcmFtcykgXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kVGludFZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRUaW50VmlkZW86IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIudGludE9iamVjdCh2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZsYXNoVmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEZsYXNoVmlkZW86IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuZmxhc2hPYmplY3QodmlkZW8sIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDcm9wVmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENyb3BWaWRlbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5jcm9wT2JqZWN0KHZpZGVvLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRWaWRlb01vdGlvbkJsdXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRWaWRlb01vdGlvbkJsdXI6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIub2JqZWN0TW90aW9uQmx1cih2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWFza1ZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRNYXNrVmlkZW86IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubWFza09iamVjdCh2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFZpZGVvRWZmZWN0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRWaWRlb0VmZmVjdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RFZmZlY3QodmlkZW8sIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZVZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kRXJhc2VWaWRlbzogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy52aWRlb1xuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvblxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBcbiAgICAgICAgdmlkZW8uYW5pbWF0b3IuZGlzYXBwZWFyKGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgKHNlbmRlcikgPT4gXG4gICAgICAgICAgICBzZW5kZXIuZGlzcG9zZSgpXG4gICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKHNlbmRlci5kb21haW4pXG4gICAgICAgICAgICBzY2VuZS52aWRlb3NbbnVtYmVyXSA9IG51bGxcbiAgICAgICAgICAjICBzZW5kZXIudmlkZW8ucGF1c2UoKVxuICAgICAgICApXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93SW1hZ2VNYXBcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTaG93SW1hZ2VNYXA6IC0+XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBpbWFnZU1hcCA9IFNjZW5lTWFuYWdlci5zY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIGltYWdlTWFwP1xuICAgICAgICAgICAgaW1hZ2VNYXAuZGlzcG9zZSgpXG4gICAgICAgIGltYWdlTWFwID0gbmV3IGdzLk9iamVjdF9JbWFnZU1hcCgpXG4gICAgICAgIGltYWdlTWFwLnZpc3VhbC52YXJpYWJsZUNvbnRleHQgPSBAaW50ZXJwcmV0ZXIuY29udGV4dFxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUucGljdHVyZXNbbnVtYmVyXSA9IGltYWdlTWFwXG4gICAgICAgIGJpdG1hcCA9IFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9QaWN0dXJlcy8je0BwYXJhbXMuZ3JvdW5kPy5uYW1lfVwiKVxuICAgICAgICBcbiAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC53aWR0aCA9IGJpdG1hcC53aWR0aFxuICAgICAgICBpbWFnZU1hcC5kc3RSZWN0LmhlaWdodCA9IGJpdG1hcC5oZWlnaHRcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIGltYWdlTWFwLCBAcGFyYW1zKVxuICAgICAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC54ID0gcC54XG4gICAgICAgICAgICBpbWFnZU1hcC5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC54ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi55KVxuICAgICAgICAgICAgXG4gICAgICAgIGltYWdlTWFwLmFuY2hvci54ID0gaWYgQHBhcmFtcy5vcmlnaW4gPT0gMSB0aGVuIDAuNSBlbHNlIDBcbiAgICAgICAgaW1hZ2VNYXAuYW5jaG9yLnkgPSBpZiBAcGFyYW1zLm9yaWdpbiA9PSAxIHRoZW4gMC41IGVsc2UgMFxuICAgICAgICBpbWFnZU1hcC56SW5kZXggPSBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKSBlbHNlIDQwMFxuICAgICAgICBpbWFnZU1hcC5ibGVuZE1vZGUgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuYmxlbmRNb2RlKSB0aGVuIEBwYXJhbXMuYmxlbmRNb2RlIGVsc2UgMFxuICAgICAgICBpbWFnZU1hcC5ob3RzcG90cyA9IEBwYXJhbXMuaG90c3BvdHNcbiAgICAgICAgaW1hZ2VNYXAuaW1hZ2VzID0gW1xuICAgICAgICAgICAgQHBhcmFtcy5ncm91bmQ/Lm5hbWUsXG4gICAgICAgICAgICBAcGFyYW1zLmhvdmVyPy5uYW1lLFxuICAgICAgICAgICAgQHBhcmFtcy51bnNlbGVjdGVkPy5uYW1lLFxuICAgICAgICAgICAgQHBhcmFtcy5zZWxlY3RlZD8ubmFtZSxcbiAgICAgICAgICAgIEBwYXJhbXMuc2VsZWN0ZWRIb3Zlcj8ubmFtZVxuICAgICAgICBdXG4gICAgICAgIFxuICAgICAgICBpbWFnZU1hcC5ldmVudHMub24gXCJqdW1wVG9cIiwgZ3MuQ2FsbEJhY2soXCJvbkp1bXBUb1wiLCBAaW50ZXJwcmV0ZXIpXG4gICAgICAgIGltYWdlTWFwLmV2ZW50cy5vbiBcImNhbGxDb21tb25FdmVudFwiLCBncy5DYWxsQmFjayhcIm9uQ2FsbENvbW1vbkV2ZW50XCIsIEBpbnRlcnByZXRlcilcbiAgICAgICAgXG4gICAgICAgIGltYWdlTWFwLnNldHVwKClcbiAgICAgICAgaW1hZ2VNYXAudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5zaG93T2JqZWN0KGltYWdlTWFwLCB7eDowLCB5OjB9LCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvblxuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gMFxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgXG4gICAgICAgIGltYWdlTWFwLmV2ZW50cy5vbiBcImZpbmlzaFwiLCAoc2VuZGVyKSA9PlxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IG5vXG4gICAgICAgICAgICMgQGludGVycHJldGVyLmVyYXNlT2JqZWN0KHNjZW5lLmltYWdlTWFwLCBAcGFyYW1zKVxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAgICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZUltYWdlTWFwXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgIFxuICAgIGNvbW1hbmRFcmFzZUltYWdlTWFwOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBpbWFnZU1hcCA9IHNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgaWYgbm90IGltYWdlTWFwPyB0aGVuIHJldHVyblxuIFxuICAgICAgICBpbWFnZU1hcC5ldmVudHMuZW1pdChcImZpbmlzaFwiLCBpbWFnZU1hcClcbiAgICAgICAgaW1hZ2VNYXAudmlzdWFsLmFjdGl2ZSA9IG5vXG4gICAgICAgIEBpbnRlcnByZXRlci5lcmFzZU9iamVjdChpbWFnZU1hcCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEFkZEhvdHNwb3RcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kQWRkSG90c3BvdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIGhvdHNwb3RzID0gc2NlbmUuaG90c3BvdHNcbiAgICAgXG4gICAgICAgIGlmIG5vdCBob3RzcG90c1tudW1iZXJdP1xuICAgICAgICAgICAgaG90c3BvdHNbbnVtYmVyXSA9IG5ldyBncy5PYmplY3RfSG90c3BvdCgpXG4gICAgICAgICAgICBcbiAgICAgICAgaG90c3BvdCA9IGhvdHNwb3RzW251bWJlcl1cbiAgICAgICAgaG90c3BvdC5kb21haW4gPSBAcGFyYW1zLm51bWJlckRvbWFpblxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMucG9zaXRpb25UeXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBEaXJlY3RcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3QueCA9IEBwYXJhbXMuYm94LnhcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3QueSA9IEBwYXJhbXMuYm94LnlcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3Qud2lkdGggPSBAcGFyYW1zLmJveC5zaXplLndpZHRoXG4gICAgICAgICAgICAgICAgaG90c3BvdC5kc3RSZWN0LmhlaWdodCA9IEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0XG4gICAgICAgICAgICB3aGVuIDEgIyBDYWxjdWxhdGVkXG4gICAgICAgICAgICAgICAgaG90c3BvdC5kc3RSZWN0LnggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJveC54KVxuICAgICAgICAgICAgICAgIGhvdHNwb3QuZHN0UmVjdC55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5ib3gueSlcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3Qud2lkdGggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJveC5zaXplLndpZHRoKVxuICAgICAgICAgICAgICAgIGhvdHNwb3QuZHN0UmVjdC5oZWlnaHQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJveC5zaXplLmhlaWdodClcbiAgICAgICAgICAgIHdoZW4gMiAjIEJpbmQgdG8gUGljdHVyZVxuICAgICAgICAgICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBpY3R1cmVOdW1iZXIpXVxuICAgICAgICAgICAgICAgIGlmIHBpY3R1cmU/XG4gICAgICAgICAgICAgICAgICAgIGhvdHNwb3QudGFyZ2V0ID0gcGljdHVyZVxuICAgICAgICAgICAgd2hlbiAzICMgQmluZCB0byBUZXh0XG4gICAgICAgICAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGV4dE51bWJlcildXG4gICAgICAgICAgICAgICAgaWYgdGV4dD9cbiAgICAgICAgICAgICAgICAgICAgaG90c3BvdC50YXJnZXQgPSB0ZXh0XG4gICAgICAgIFxuICAgICAgICBob3RzcG90LmJlaGF2aW9yLnNoYXBlID0gQHBhcmFtcy5zaGFwZSA/IGdzLkhvdHNwb3RTaGFwZS5SRUNUQU5HTEUgXG4gICAgICAgIFxuICAgICAgICBpZiB0ZXh0P1xuICAgICAgICAgICAgaG90c3BvdC5pbWFnZXMgPSBudWxsXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGhvdHNwb3QuaW1hZ2VzID0gW1xuICAgICAgICAgICAgICAgIEBwYXJhbXMuYmFzZUdyYXBoaWM/Lm5hbWUgfHwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5iYXNlR3JhcGhpYykgfHwgcGljdHVyZT8uaW1hZ2UsXG4gICAgICAgICAgICAgICAgQHBhcmFtcy5ob3ZlckdyYXBoaWM/Lm5hbWUgfHwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5ob3ZlckdyYXBoaWMpLFxuICAgICAgICAgICAgICAgIEBwYXJhbXMuc2VsZWN0ZWRHcmFwaGljPy5uYW1lIHx8IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc2VsZWN0ZWRHcmFwaGljKSxcbiAgICAgICAgICAgICAgICBAcGFyYW1zLnNlbGVjdGVkSG92ZXJHcmFwaGljPy5uYW1lIHx8IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc2VsZWN0ZWRIb3ZlckdyYXBoaWMpLFxuICAgICAgICAgICAgICAgIEBwYXJhbXMudW5zZWxlY3RlZEdyYXBoaWM/Lm5hbWUgfHwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy51bnNlbGVjdGVkR3JhcGhpYylcbiAgICAgICAgICAgIF1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25DbGljay50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uQ2xpY2subGFiZWwgICAgICAgIFxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJjbGlja1wiLCBncy5DYWxsQmFjayhcIm9uSG90c3BvdENsaWNrXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uQ2xpY2suYmluZFZhbHVlKSB9KVxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25FbnRlci50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uRW50ZXIubGFiZWwgICAgICAgIFxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJlbnRlclwiLCBncy5DYWxsQmFjayhcIm9uSG90c3BvdEVudGVyXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRW50ZXIuYmluZFZhbHVlKSB9KVxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25MZWF2ZS50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uTGVhdmUubGFiZWwgICAgICAgIFxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJsZWF2ZVwiLCBncy5DYWxsQmFjayhcIm9uSG90c3BvdExlYXZlXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uTGVhdmUuYmluZFZhbHVlKSB9KVxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25EcmFnLnR5cGUgIT0gMCBvciBAcGFyYW1zLmFjdGlvbnMub25EcmFnLmxhYmVsICAgICAgICBcbiAgICAgICAgICAgIGhvdHNwb3QuZXZlbnRzLm9uIFwiZHJhZ1N0YXJ0XCIsIGdzLkNhbGxCYWNrKFwib25Ib3RzcG90RHJhZ1N0YXJ0XCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRHJhZy5iaW5kVmFsdWUpIH0pXG4gICAgICAgICAgICBob3RzcG90LmV2ZW50cy5vbiBcImRyYWdcIiwgZ3MuQ2FsbEJhY2soXCJvbkhvdHNwb3REcmFnXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRHJhZy5iaW5kVmFsdWUpIH0pXG4gICAgICAgICAgICBob3RzcG90LmV2ZW50cy5vbiBcImRyYWdFbmRcIiwgZ3MuQ2FsbEJhY2soXCJvbkhvdHNwb3REcmFnRW5kXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRHJhZy5iaW5kVmFsdWUpIH0pXG4gICAgICAgIGlmIEBwYXJhbXMuYWN0aW9ucy5vblNlbGVjdC50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uU2VsZWN0LmxhYmVsIG9yXG4gICAgICAgICAgIEBwYXJhbXMuYWN0aW9ucy5vbkRlc2VsZWN0LnR5cGUgIT0gMCBvciBAcGFyYW1zLmFjdGlvbnMub25EZXNlbGVjdC5sYWJlbCAgICBcbiAgICAgICAgICAgIGhvdHNwb3QuZXZlbnRzLm9uIFwic3RhdGVDaGFuZ2VkXCIsIGdzLkNhbGxCYWNrKFwib25Ib3RzcG90U3RhdGVDaGFuZ2VkXCIsIEBpbnRlcnByZXRlciwgQHBhcmFtcylcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgaG90c3BvdC5zZWxlY3RhYmxlID0geWVzXG4gICAgICAgIGhvdHNwb3Quc2V0dXAoKVxuXG4gICAgICAgIGlmIEBwYXJhbXMuZHJhZ2dpbmcuZW5hYmxlZFxuICAgICAgICAgICAgZHJhZ2dpbmcgPSBAcGFyYW1zLmRyYWdnaW5nXG4gICAgICAgICAgICBob3RzcG90LmRyYWdnYWJsZSA9IHsgXG4gICAgICAgICAgICAgICAgcmVjdDogbmV3IFJlY3QoZHJhZ2dpbmcucmVjdC54LCBkcmFnZ2luZy5yZWN0LnksIGRyYWdnaW5nLnJlY3Quc2l6ZS53aWR0aCwgZHJhZ2dpbmcucmVjdC5zaXplLmhlaWdodCksIFxuICAgICAgICAgICAgICAgIGF4aXNYOiBkcmFnZ2luZy5ob3Jpem9udGFsLCBcbiAgICAgICAgICAgICAgICBheGlzWTogZHJhZ2dpbmcudmVydGljYWwgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBob3RzcG90LmFkZENvbXBvbmVudChuZXcgdWkuQ29tcG9uZW50X0RyYWdnYWJsZSgpKVxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJkcmFnXCIsIChlKSA9PiBcbiAgICAgICAgICAgICAgICBkcmFnID0gZS5zZW5kZXIuZHJhZ2dhYmxlXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXR1cFRlbXBWYXJpYWJsZXMoQGludGVycHJldGVyLmNvbnRleHQpXG4gICAgICAgICAgICAgICAgaWYgQHBhcmFtcy5kcmFnZ2luZy5ob3Jpem9udGFsXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMuZHJhZ2dpbmcudmFyaWFibGUsIE1hdGgucm91bmQoKGUuc2VuZGVyLmRzdFJlY3QueC1kcmFnLnJlY3QueCkgLyAoZHJhZy5yZWN0LndpZHRoLWUuc2VuZGVyLmRzdFJlY3Qud2lkdGgpICogMTAwKSlcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMuZHJhZ2dpbmcudmFyaWFibGUsIE1hdGgucm91bmQoKGUuc2VuZGVyLmRzdFJlY3QueS1kcmFnLnJlY3QueSkgLyAoZHJhZy5yZWN0LmhlaWdodC1lLnNlbmRlci5kc3RSZWN0LmhlaWdodCkgKiAxMDApKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZUhvdHNwb3RTdGF0ZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRDaGFuZ2VIb3RzcG90U3RhdGU6IC0+XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIGhvdHNwb3QgPSBzY2VuZS5ob3RzcG90c1tudW1iZXJdXG4gICAgICAgIHJldHVybiBpZiAhaG90c3BvdFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNlbGVjdGVkKSB0aGVuIGhvdHNwb3QuYmVoYXZpb3Iuc2VsZWN0ZWQgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zZWxlY3RlZClcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmVuYWJsZWQpIHRoZW4gaG90c3BvdC5iZWhhdmlvci5lbmFibGVkID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuZW5hYmxlZClcbiAgICAgICAgXG4gICAgICAgIGhvdHNwb3QuYmVoYXZpb3IudXBkYXRlSW5wdXQoKVxuICAgICAgICBob3RzcG90LmJlaGF2aW9yLnVwZGF0ZUltYWdlKClcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kRXJhc2VIb3RzcG90XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZEVyYXNlSG90c3BvdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIFxuICAgICAgICBpZiBzY2VuZS5ob3RzcG90c1tudW1iZXJdP1xuICAgICAgICAgICAgc2NlbmUuaG90c3BvdHNbbnVtYmVyXS5kaXNwb3NlKClcbiAgICAgICAgICAgIHNjZW5lLmhvdHNwb3RDb250YWluZXIuZXJhc2VPYmplY3QobnVtYmVyKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZU9iamVjdERvbWFpblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kQ2hhbmdlT2JqZWN0RG9tYWluOiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuY2hhbmdlT2JqZWN0RG9tYWluKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuZG9tYWluKSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUGljdHVyZURlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZFBpY3R1cmVEZWZhdWx0czogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5waWN0dXJlXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5hcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5hcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmRpc2FwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmRpc2FwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJtb3Rpb25CbHVyLmVuYWJsZWRcIl0pIHRoZW4gZGVmYXVsdHMubW90aW9uQmx1ciA9IEBwYXJhbXMubW90aW9uQmx1clxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIGRlZmF1bHRzLm9yaWdpbiA9IEBwYXJhbXMub3JpZ2luXG4gICAgXG4gICAgXG4gICAgY3JlYXRlUGljdHVyZTogKGdyYXBoaWMsIHBhcmFtcykgLT5cbiAgICAgICAgZ3JhcGhpYyA9IEBzdHJpbmdWYWx1ZU9mKGdyYXBoaWMpXG4gICAgICAgIGdyYXBoaWNOYW1lID0gaWYgZ3JhcGhpYz8ubmFtZT8gdGhlbiBncmFwaGljLm5hbWUgZWxzZSBncmFwaGljXG4gICAgICAgIGJpdG1hcCA9IFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9QaWN0dXJlcy8je2dyYXBoaWNOYW1lfVwiKVxuICAgICAgICByZXR1cm4gbnVsbCBpZiBiaXRtYXAgJiYgIWJpdG1hcC5sb2FkZWRcbiAgICAgICAgXG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMucGljdHVyZVxuICAgICAgICBmbGFncyA9IHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgbnVtYmVyID0gQG51bWJlclZhbHVlT2YocGFyYW1zLm51bWJlcilcbiAgICAgICAgcGljdHVyZXMgPSBzY2VuZS5waWN0dXJlc1xuICAgICAgICBpZiBub3QgcGljdHVyZXNbbnVtYmVyXT9cbiAgICAgICAgICAgIHBpY3R1cmUgPSBuZXcgZ3MuT2JqZWN0X1BpY3R1cmUobnVsbCwgbnVsbCwgcGFyYW1zLnZpc3VhbD8udHlwZSlcbiAgICAgICAgICAgIHBpY3R1cmUuZG9tYWluID0gcGFyYW1zLm51bWJlckRvbWFpblxuICAgICAgICAgICAgcGljdHVyZXNbbnVtYmVyXSA9IHBpY3R1cmVcbiAgICAgICAgICAgIHN3aXRjaCBwYXJhbXMudmlzdWFsPy50eXBlXG4gICAgICAgICAgICAgICAgd2hlbiAxXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUudmlzdWFsLmxvb3BpbmcudmVydGljYWwgPSB5ZXNcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS52aXN1YWwubG9vcGluZy5ob3Jpem9udGFsID0geWVzXG4gICAgICAgICAgICAgICAgd2hlbiAyXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZnJhbWVUaGlja25lc3MgPSBwYXJhbXMudmlzdWFsLmZyYW1lLnRoaWNrbmVzc1xuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLmZyYW1lQ29ybmVyU2l6ZSA9IHBhcmFtcy52aXN1YWwuZnJhbWUuY29ybmVyU2l6ZVxuICAgICAgICAgICAgICAgIHdoZW4gM1xuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLnZpc3VhbC5vcmllbnRhdGlvbiA9IHBhcmFtcy52aXN1YWwudGhyZWVQYXJ0SW1hZ2Uub3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICB3aGVuIDRcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5jb2xvciA9IGdzLkNvbG9yLmZyb21PYmplY3QocGFyYW1zLnZpc3VhbC5xdWFkLmNvbG9yKVxuICAgICAgICAgICAgICAgIHdoZW4gNVxuICAgICAgICAgICAgICAgICAgICBzbmFwc2hvdCA9IEdyYXBoaWNzLnNuYXBzaG90KClcbiAgICAgICAgICAgICAgICAgICAgI1Jlc291cmNlTWFuYWdlci5hZGRDdXN0b21CaXRtYXAoc25hcHNob3QpXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuYml0bWFwID0gc25hcHNob3RcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LndpZHRoID0gc25hcHNob3Qud2lkdGhcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LmhlaWdodCA9IHNuYXBzaG90LmhlaWdodFxuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLnNyY1JlY3Quc2V0KDAsIDAsIHNuYXBzaG90LndpZHRoLCBzbmFwc2hvdC5oZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIHggPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMucG9zaXRpb24ueClcbiAgICAgICAgeSA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5wb3NpdGlvbi55KVxuICAgICAgICBwaWN0dXJlID0gcGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBcbiAgICAgICAgaWYgIXBpY3R1cmUuYml0bWFwXG4gICAgICAgICAgICBwaWN0dXJlLmltYWdlID0gZ3JhcGhpY05hbWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcGljdHVyZS5pbWFnZSA9IG51bGxcbiAgICBcbiAgICAgICAgYml0bWFwID0gcGljdHVyZS5iaXRtYXAgPyBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvUGljdHVyZXMvI3tncmFwaGljTmFtZX1cIilcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5lYXNpbmcudHlwZSksIHBhcmFtcy5lYXNpbmcuaW5PdXQpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmFwcGVhckVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuYXBwZWFyRHVyYXRpb25cbiAgICAgICAgb3JpZ2luID0gaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQG51bWJlclZhbHVlT2YocGFyYW1zLnpPcmRlcikgZWxzZSBkZWZhdWx0cy56T3JkZXJcbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgIFxuICAgICAgICBwaWN0dXJlLm1pcnJvciA9IHBhcmFtcy5wb3NpdGlvbi5ob3Jpem9udGFsRmxpcFxuICAgICAgICBwaWN0dXJlLmFuZ2xlID0gcGFyYW1zLnBvc2l0aW9uLmFuZ2xlIHx8IDBcbiAgICAgICAgcGljdHVyZS56b29tLnggPSAocGFyYW1zLnBvc2l0aW9uLmRhdGE/Lnpvb218fDEpXG4gICAgICAgIHBpY3R1cmUuem9vbS55ID0gKHBhcmFtcy5wb3NpdGlvbi5kYXRhPy56b29tfHwxKVxuICAgICAgICBwaWN0dXJlLmJsZW5kTW9kZSA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5ibGVuZE1vZGUpXG4gICAgICAgIFxuICAgICAgICBpZiBwYXJhbXMub3JpZ2luID09IDEgYW5kIGJpdG1hcD9cbiAgICAgICAgICAgIHggKz0gKGJpdG1hcC53aWR0aCpwaWN0dXJlLnpvb20ueC1iaXRtYXAud2lkdGgpLzJcbiAgICAgICAgICAgIHkgKz0gKGJpdG1hcC5oZWlnaHQqcGljdHVyZS56b29tLnktYml0bWFwLmhlaWdodCkvMlxuICAgICAgICAgICAgXG4gICAgICAgIHBpY3R1cmUuZHN0UmVjdC54ID0geFxuICAgICAgICBwaWN0dXJlLmRzdFJlY3QueSA9IHlcbiAgICAgICAgcGljdHVyZS5hbmNob3IueCA9IGlmIG9yaWdpbiA9PSAxIHRoZW4gMC41IGVsc2UgMFxuICAgICAgICBwaWN0dXJlLmFuY2hvci55ID0gaWYgb3JpZ2luID09IDEgdGhlbiAwLjUgZWxzZSAwXG4gICAgICAgIHBpY3R1cmUuekluZGV4ID0gekluZGV4IHx8ICAoNzAwICsgbnVtYmVyKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLnZpZXdwb3J0Py50eXBlID09IFwic2NlbmVcIlxuICAgICAgICAgICAgcGljdHVyZS52aWV3cG9ydCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci52aWV3cG9ydFxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLnNpemU/LnR5cGUgPT0gMVxuICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LndpZHRoID0gcGFyYW1zLnNpemUud2lkdGhcbiAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC5oZWlnaHQgPSBwYXJhbXMuc2l6ZS5oZWlnaHRcbiAgICAgICAgICAgIFxuICAgICAgICBwaWN0dXJlLnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGljdHVyZVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNob3dQaWN0dXJlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRTaG93UGljdHVyZTogLT4gXG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMucGljdHVyZVxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIHBpY3R1cmUgPSBAaW50ZXJwcmV0ZXIuY3JlYXRlUGljdHVyZShAcGFyYW1zLmdyYXBoaWMsIEBwYXJhbXMpXG4gICAgICAgIGlmICFwaWN0dXJlXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlci0tXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSAxXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgICAgICBwaWN0dXJlLmRzdFJlY3QueCA9IHAueFxuICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgIFxuICAgICAgICBwaWN0dXJlLmFuaW1hdG9yLmFwcGVhcihwaWN0dXJlLmRzdFJlY3QueCwgcGljdHVyZS5kc3RSZWN0LnksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRQbGF5UGljdHVyZUFuaW1hdGlvblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUGxheVBpY3R1cmVBbmltYXRpb246IC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIFxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLnBpY3R1cmVcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBwaWN0dXJlID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuYXBwZWFyRHVyYXRpb25cbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMuYW5pbWF0aW9uSWQ/XG4gICAgICAgICAgICByZWNvcmQgPSBSZWNvcmRNYW5hZ2VyLmFuaW1hdGlvbnNbQHBhcmFtcy5hbmltYXRpb25JZF1cbiAgICAgICAgICAgIGlmIHJlY29yZD9cbiAgICAgICAgICAgICAgICBwaWN0dXJlID0gQGludGVycHJldGVyLmNyZWF0ZVBpY3R1cmUocmVjb3JkLmdyYXBoaWMsIEBwYXJhbXMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29tcG9uZW50ID0gcGljdHVyZS5maW5kQ29tcG9uZW50KFwiQ29tcG9uZW50X0ZyYW1lQW5pbWF0aW9uXCIpXG4gICAgICAgICAgICAgICAgaWYgY29tcG9uZW50P1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQucmVmcmVzaChyZWNvcmQpXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdGFydCgpXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgPSBuZXcgZ3MuQ29tcG9uZW50X0ZyYW1lQW5pbWF0aW9uKHJlY29yZClcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5hZGRDb21wb25lbnQoY29tcG9uZW50KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb21wb25lbnQudXBkYXRlKClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC54ID0gcC54XG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC55ID0gcC55XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHBpY3R1cmUuYW5pbWF0b3IuYXBwZWFyKHBpY3R1cmUuZHN0UmVjdC54LCBwaWN0dXJlLmRzdFJlY3QueSwgYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBwaWN0dXJlID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IHBpY3R1cmU/LmZpbmRDb21wb25lbnQoXCJDb21wb25lbnRfRnJhbWVBbmltYXRpb25cIilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYW5pbWF0aW9uP1xuICAgICAgICAgICAgICAgIHBpY3R1cmUucmVtb3ZlQ29tcG9uZW50KGFuaW1hdGlvbilcbiAgICAgICAgICAgICAgICBiaXRtYXAgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvQW5pbWF0aW9ucy8je3BpY3R1cmUuaW1hZ2V9XCIpXG4gICAgICAgICAgICAgICAgaWYgYml0bWFwP1xuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLnNyY1JlY3Quc2V0KDAsIDAsIGJpdG1hcC53aWR0aCwgYml0bWFwLmhlaWdodClcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LndpZHRoID0gcGljdHVyZS5zcmNSZWN0LndpZHRoXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC5oZWlnaHQgPSBwaWN0dXJlLnNyY1JlY3QuaGVpZ2h0XG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNb3ZlUGljdHVyZVBhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kTW92ZVBpY3R1cmVQYXRoOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgcGljdHVyZSA9IHNjZW5lLnBpY3R1cmVzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHBpY3R1cmU/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubW92ZU9iamVjdFBhdGgocGljdHVyZSwgQHBhcmFtcy5wYXRoLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZVBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRNb3ZlUGljdHVyZTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3QocGljdHVyZSwgQHBhcmFtcy5waWN0dXJlLnBvc2l0aW9uLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgXG5cbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRUaW50UGljdHVyZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgY29tbWFuZFRpbnRQaWN0dXJlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci50aW50T2JqZWN0KHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRGbGFzaFBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEZsYXNoUGljdHVyZTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbiB8fCBcIlwiKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgcGljdHVyZSA9IHNjZW5lLnBpY3R1cmVzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHBpY3R1cmU/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuZmxhc2hPYmplY3QocGljdHVyZSwgQHBhcmFtcylcbiAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ3JvcFBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kQ3JvcFBpY3R1cmU6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmNyb3BPYmplY3QocGljdHVyZSwgQHBhcmFtcylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUm90YXRlUGljdHVyZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgY29tbWFuZFJvdGF0ZVBpY3R1cmU6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnJvdGF0ZU9iamVjdChwaWN0dXJlLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kWm9vbVBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kWm9vbVBpY3R1cmU6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnpvb21PYmplY3QocGljdHVyZSwgQHBhcmFtcylcblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCbGVuZFBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kQmxlbmRQaWN0dXJlOiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbiB8fCBcIlwiKVxuICAgICAgICBwaWN0dXJlID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgaWYgbm90IHBpY3R1cmU/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuYmxlbmRPYmplY3QocGljdHVyZSwgQHBhcmFtcykgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaGFrZVBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kU2hha2VQaWN0dXJlOiAtPiBcbiAgICAgICAgcGljdHVyZSA9IFNjZW5lTWFuYWdlci5zY2VuZS5waWN0dXJlc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNoYWtlT2JqZWN0KHBpY3R1cmUsIEBwYXJhbXMpICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWFza1BpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1hc2tQaWN0dXJlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tYXNrT2JqZWN0KHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFBpY3R1cmVNb3Rpb25CbHVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZFBpY3R1cmVNb3Rpb25CbHVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RNb3Rpb25CbHVyKHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRQaWN0dXJlRWZmZWN0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRQaWN0dXJlRWZmZWN0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RFZmZlY3QocGljdHVyZSwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kRXJhc2VQaWN0dXJlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZEVyYXNlUGljdHVyZTogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5waWN0dXJlXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb25cbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIHBpY3R1cmUuYW5pbWF0b3IuZGlzYXBwZWFyKGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgXG4gICAgICAgICAgICAoc2VuZGVyKSA9PiBcbiAgICAgICAgICAgICAgICBzZW5kZXIuZGlzcG9zZSgpXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihzZW5kZXIuZG9tYWluKVxuICAgICAgICAgICAgICAgIHNjZW5lLnBpY3R1cmVzW251bWJlcl0gPSBudWxsXG4gICAgICAgIClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb24gXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRJbnB1dE51bWJlclxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRJbnB1dE51bWJlcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICBpZiBAaW50ZXJwcmV0ZXIuaXNQcm9jZXNzaW5nTWVzc2FnZUluT3RoZXJDb250ZXh0KClcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Rm9yTWVzc2FnZSgpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoR2FtZU1hbmFnZXIuc2V0dGluZ3MuYWxsb3dDaG9pY2VTa2lwfHxAaW50ZXJwcmV0ZXIucHJldmlldykgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5tZXNzYWdlT2JqZWN0KCkuYmVoYXZpb3IuY2xlYXIoKVxuICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy52YXJpYWJsZSwgMClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgXG4gICAgICAgICR0ZW1wRmllbGRzLmRpZ2l0cyA9IEBwYXJhbXMuZGlnaXRzXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLnNob3dJbnB1dE51bWJlcihAcGFyYW1zLmRpZ2l0cywgZ3MuQ2FsbEJhY2soXCJvbklucHV0TnVtYmVyRmluaXNoXCIsIEBpbnRlcnByZXRlciwgQHBhcmFtcykpXG4gICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci53YWl0aW5nRm9yLmlucHV0TnVtYmVyID0gQHBhcmFtc1xuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaG9pY2VUaW1lclxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRDaG9pY2VUaW1lcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgXG4gICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlVGltZXIgPSBzY2VuZS5jaG9pY2VUaW1lclxuICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZVRpbWVyVmlzaWJsZSA9IEBwYXJhbXMudmlzaWJsZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmVuYWJsZWRcbiAgICAgICAgICAgIHNjZW5lLmNob2ljZVRpbWVyLmJlaGF2aW9yLnNlY29uZHMgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNlY29uZHMpXG4gICAgICAgICAgICBzY2VuZS5jaG9pY2VUaW1lci5iZWhhdmlvci5taW51dGVzID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5taW51dGVzKVxuICAgICAgICAgICAgc2NlbmUuY2hvaWNlVGltZXIuYmVoYXZpb3Iuc3RhcnQoKVxuICAgICAgICAgICAgc2NlbmUuY2hvaWNlVGltZXIuZXZlbnRzLm9uIFwiZmluaXNoXCIsIChzZW5kZXIpID0+XG4gICAgICAgICAgICAgICAgaWYgIHNjZW5lLmNob2ljZVdpbmRvdyBhbmQgR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzPy5sZW5ndGggPiAwICAgIFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2hvaWNlID0gKEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlcy5maXJzdCAoYykgLT4gYy5pc0RlZmF1bHQpIHx8IEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlc1swXVxuICAgICAgICAgICAgICAgICAgICAjc2NlbmUuY2hvaWNlV2luZG93LmV2ZW50cy5lbWl0KFwic2VsZWN0aW9uQWNjZXB0XCIsIHNjZW5lLmNob2ljZVdpbmRvdywgeyBsYWJlbEluZGV4OiBkZWZhdWx0Q2hvaWNlLmFjdGlvbi5sYWJlbEluZGV4IH0pXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lLmNob2ljZVdpbmRvdy5ldmVudHMuZW1pdChcInNlbGVjdGlvbkFjY2VwdFwiLCBzY2VuZS5jaG9pY2VXaW5kb3csIGRlZmF1bHRDaG9pY2UpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNjZW5lLmNob2ljZVRpbWVyLnN0b3AoKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93Q2hvaWNlc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRTaG93Q2hvaWNlczogLT4gIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBwb2ludGVyID0gQGludGVycHJldGVyLnBvaW50ZXJcbiAgICAgICAgY2hvaWNlcyA9IEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlcyB8fCBbXVxuICAgICAgICBcbiAgICAgICAgaWYgKEdhbWVNYW5hZ2VyLnNldHRpbmdzLmFsbG93Q2hvaWNlU2tpcHx8QGludGVycHJldGVyLnByZXZpZXdEYXRhKSBhbmQgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QgPSBAaW50ZXJwcmV0ZXIubWVzc2FnZU9iamVjdCgpXG4gICAgICAgICAgICBpZiBtZXNzYWdlT2JqZWN0Py52aXNpYmxlXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5iZWhhdmlvci5jbGVhcigpXG4gICAgICAgICAgICBkZWZhdWx0Q2hvaWNlID0gKGNob2ljZXMuZmlyc3QoKGMpIC0+IGMuaXNEZWZhdWx0KSkgfHwgY2hvaWNlc1swXSAgICBcbiAgICAgICAgICAgIGlmIGRlZmF1bHRDaG9pY2UuYWN0aW9uLmxhYmVsSW5kZXg/XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnBvaW50ZXIgPSBkZWZhdWx0Q2hvaWNlLmFjdGlvbi5sYWJlbEluZGV4XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLmp1bXBUb0xhYmVsKGRlZmF1bHRDaG9pY2UuYWN0aW9uLmxhYmVsKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBpZiBjaG9pY2VzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3Iuc2hvd0Nob2ljZXMoY2hvaWNlcywgZ3MuQ2FsbEJhY2soXCJvbkNob2ljZUFjY2VwdFwiLCBAaW50ZXJwcmV0ZXIsIHsgcG9pbnRlcjogcG9pbnRlciwgcGFyYW1zOiBAcGFyYW1zIH0pKVxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93Q2hvaWNlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICBcbiAgICBjb21tYW5kU2hvd0Nob2ljZTogLT4gXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNvbW1hbmRzID0gQGludGVycHJldGVyLm9iamVjdC5jb21tYW5kc1xuICAgICAgICBjb21tYW5kID0gbnVsbFxuICAgICAgICBpbmRleCA9IDBcbiAgICAgICAgcG9pbnRlciA9IEBpbnRlcnByZXRlci5wb2ludGVyXG4gICAgICAgIGNob2ljZXMgPSBudWxsXG4gICAgICAgIGRzdFJlY3QgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wb3NpdGlvblR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIEF1dG9cbiAgICAgICAgICAgICAgICBkc3RSZWN0ID0gbnVsbFxuICAgICAgICAgICAgd2hlbiAxICMgRGlyZWN0XG4gICAgICAgICAgICAgICAgZHN0UmVjdCA9IG5ldyBSZWN0KEBwYXJhbXMuYm94LngsIEBwYXJhbXMuYm94LnksIEBwYXJhbXMuYm94LnNpemUud2lkdGgsIEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0KVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAhR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzXG4gICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZXMgPSBbXVxuICAgICAgICBjaG9pY2VzID0gR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzXG4gICAgICAgIGNob2ljZXMucHVzaCh7IFxuICAgICAgICAgICAgZHN0UmVjdDogZHN0UmVjdCwgXG4gICAgICAgICAgICAjdGV4dDogbGNzKEBwYXJhbXMudGV4dCksIFxuICAgICAgICAgICAgdGV4dDogQHBhcmFtcy50ZXh0LCBcbiAgICAgICAgICAgIGluZGV4OiBpbmRleCwgXG4gICAgICAgICAgICBhY3Rpb246IEBwYXJhbXMuYWN0aW9uLCBcbiAgICAgICAgICAgIGlzU2VsZWN0ZWQ6IG5vLCBcbiAgICAgICAgICAgIGlzRGVmYXVsdDogQHBhcmFtcy5kZWZhdWx0Q2hvaWNlLCBcbiAgICAgICAgICAgIGlzRW5hYmxlZDogQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuZW5hYmxlZCkgfSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRPcGVuTWVudVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgIFxuICAgIGNvbW1hbmRPcGVuTWVudTogLT5cbiAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG5ldyBncy5PYmplY3RfTGF5b3V0KFwibWVudUxheW91dFwiKSwgdHJ1ZSlcbiAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gMVxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kT3BlbkxvYWRNZW51XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kT3BlbkxvYWRNZW51OiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc3dpdGNoVG8obmV3IGdzLk9iamVjdF9MYXlvdXQoXCJsb2FkTWVudUxheW91dFwiKSwgdHJ1ZSlcbiAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gMVxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZE9wZW5TYXZlTWVudVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZE9wZW5TYXZlTWVudTogLT5cbiAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG5ldyBncy5PYmplY3RfTGF5b3V0KFwic2F2ZU1lbnVMYXlvdXRcIiksIHRydWUpXG4gICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IDFcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUmV0dXJuVG9UaXRsZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZFJldHVyblRvVGl0bGU6IC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5jbGVhcigpXG4gICAgICAgIFNjZW5lTWFuYWdlci5zd2l0Y2hUbyhuZXcgZ3MuT2JqZWN0X0xheW91dChcInRpdGxlTGF5b3V0XCIpKVxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSAxXG4gICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcblxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFBsYXlWaWRlb1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUGxheVZpZGVvOiAtPlxuICAgICAgICBpZiAoR2FtZU1hbmFnZXIuaW5MaXZlUHJldmlldyBvciBHYW1lTWFuYWdlci5zZXR0aW5ncy5hbGxvd1ZpZGVvU2tpcCkgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwIHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCA9IG5vXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnZpZGVvPy5uYW1lP1xuICAgICAgICAgICAgc2NlbmUudmlkZW8gPSBSZXNvdXJjZU1hbmFnZXIuZ2V0VmlkZW8oXCJNb3ZpZXMvI3tAcGFyYW1zLnZpZGVvLm5hbWV9XCIpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEB2aWRlb1Nwcml0ZSA9IG5ldyBTcHJpdGUoR3JhcGhpY3Mudmlld3BvcnQpXG4gICAgICAgICAgICBAdmlkZW9TcHJpdGUuc3JjUmVjdCA9IG5ldyBSZWN0KDAsIDAsIHNjZW5lLnZpZGVvLndpZHRoLCBzY2VuZS52aWRlby5oZWlnaHQpXG4gICAgICAgICAgICBAdmlkZW9TcHJpdGUudmlkZW8gPSBzY2VuZS52aWRlb1xuICAgICAgICAgICAgQHZpZGVvU3ByaXRlLnpvb21YID0gR3JhcGhpY3Mud2lkdGggLyBzY2VuZS52aWRlby53aWR0aFxuICAgICAgICAgICAgQHZpZGVvU3ByaXRlLnpvb21ZID0gR3JhcGhpY3MuaGVpZ2h0IC8gc2NlbmUudmlkZW8uaGVpZ2h0XG4gICAgICAgICAgICBAdmlkZW9TcHJpdGUueiA9IDk5OTk5OTk5XG4gICAgICAgICAgICBzY2VuZS52aWRlby5vbkVuZGVkID0gPT5cbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICBAdmlkZW9TcHJpdGUuZGlzcG9zZSgpXG4gICAgICAgICAgICAgICAgc2NlbmUudmlkZW8gPSBudWxsXG4gICAgICAgICAgICBzY2VuZS52aWRlby52b2x1bWUgPSBAcGFyYW1zLnZvbHVtZSAvIDEwMFxuICAgICAgICAgICAgc2NlbmUudmlkZW8ucGxheWJhY2tSYXRlID0gQHBhcmFtcy5wbGF5YmFja1JhdGUgLyAxMDBcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIHNjZW5lLnZpZGVvLnBsYXkoKVxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRBdWRpb0RlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRBdWRpb0RlZmF1bHRzOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmF1ZGlvXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5tdXNpY0ZhZGVJbkR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLm11c2ljRmFkZUluRHVyYXRpb24gPSBAcGFyYW1zLm11c2ljRmFkZUluRHVyYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLm11c2ljRmFkZU91dER1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLm11c2ljRmFkZU91dER1cmF0aW9uID0gQHBhcmFtcy5tdXNpY0ZhZGVPdXREdXJhdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubXVzaWNWb2x1bWUpIHRoZW4gZGVmYXVsdHMubXVzaWNWb2x1bWUgPSBAcGFyYW1zLm11c2ljVm9sdW1lXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5tdXNpY1BsYXliYWNrUmF0ZSkgdGhlbiBkZWZhdWx0cy5tdXNpY1BsYXliYWNrUmF0ZSA9IEBwYXJhbXMubXVzaWNQbGF5YmFja1JhdGVcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNvdW5kVm9sdW1lKSB0aGVuIGRlZmF1bHRzLnNvdW5kVm9sdW1lID0gQHBhcmFtcy5zb3VuZFZvbHVtZVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muc291bmRQbGF5YmFja1JhdGUpIHRoZW4gZGVmYXVsdHMuc291bmRQbGF5YmFja1JhdGUgPSBAcGFyYW1zLnNvdW5kUGxheWJhY2tSYXRlXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy52b2ljZVZvbHVtZSkgdGhlbiBkZWZhdWx0cy52b2ljZVZvbHVtZSA9IEBwYXJhbXMudm9pY2VWb2x1bWVcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnZvaWNlUGxheWJhY2tSYXRlKSB0aGVuIGRlZmF1bHRzLnZvaWNlUGxheWJhY2tSYXRlID0gQHBhcmFtcy52b2ljZVBsYXliYWNrUmF0ZVxuICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRQbGF5TXVzaWNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kUGxheU11c2ljOiAtPlxuICAgICAgICBpZiBub3QgQHBhcmFtcy5tdXNpYz8gdGhlbiByZXR1cm5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5hdWRpb1xuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIuc2V0dGluZ3MuYmdtRW5hYmxlZFxuICAgICAgICAgICAgZmFkZUR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZhZGVJbkR1cmF0aW9uKSB0aGVuIEBwYXJhbXMuZmFkZUluRHVyYXRpb24gZWxzZSBkZWZhdWx0cy5tdXNpY0ZhZGVJbkR1cmF0aW9uXG4gICAgICAgICAgICB2b2x1bWUgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJtdXNpYy52b2x1bWVcIl0pIHRoZW4gQHBhcmFtcy5tdXNpYy52b2x1bWUgZWxzZSBkZWZhdWx0cy5tdXNpY1ZvbHVtZVxuICAgICAgICAgICAgcGxheWJhY2tSYXRlID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wibXVzaWMucGxheWJhY2tSYXRlXCJdKSB0aGVuIEBwYXJhbXMubXVzaWMucGxheWJhY2tSYXRlIGVsc2UgZGVmYXVsdHMubXVzaWNQbGF5YmFja1JhdGVcbiAgICAgICAgICAgIG11c2ljID0geyBuYW1lOiBAcGFyYW1zLm11c2ljLm5hbWUsIHZvbHVtZTogdm9sdW1lLCBwbGF5YmFja1JhdGU6IHBsYXliYWNrUmF0ZSB9XG4gICAgICAgICAgICBpZiBAcGFyYW1zLnBsYXlUeXBlID09IDFcbiAgICAgICAgICAgICAgICBwbGF5VGltZSA9IG1pbjogQHBhcmFtcy5wbGF5VGltZS5taW4gKiA2MCwgbWF4OiBAcGFyYW1zLnBsYXlUaW1lLm1heCAqIDYwXG4gICAgICAgICAgICAgICAgcGxheVJhbmdlID0gc3RhcnQ6IEBwYXJhbXMucGxheVJhbmdlLnN0YXJ0ICogNjAsIGVuZDogQHBhcmFtcy5wbGF5UmFuZ2UuZW5kICogNjBcbiAgICAgICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheU11c2ljUmFuZG9tKG11c2ljLCBmYWRlRHVyYXRpb24sIEBwYXJhbXMubGF5ZXIgfHwgMCwgcGxheVRpbWUsIHBsYXlSYW5nZSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheU11c2ljKEBwYXJhbXMubXVzaWMubmFtZSwgdm9sdW1lLCBwbGF5YmFja1JhdGUsIGZhZGVEdXJhdGlvbiwgQHBhcmFtcy5sYXllciB8fCAwKVxuICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTdG9wTXVzaWNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kU3RvcE11c2ljOiAtPiBcbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5hdWRpb1xuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIGZhZGVEdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5mYWRlT3V0RHVyYXRpb24pIHRoZW4gQHBhcmFtcy5mYWRlT3V0RHVyYXRpb24gZWxzZSBkZWZhdWx0cy5tdXNpY0ZhZGVPdXREdXJhdGlvblxuICAgICAgICBcbiAgICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BNdXNpYyhmYWRlRHVyYXRpb24sIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUGF1c2VNdXNpY1xuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRQYXVzZU11c2ljOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmF1ZGlvXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgZmFkZUR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZhZGVPdXREdXJhdGlvbikgdGhlbiBAcGFyYW1zLmZhZGVPdXREdXJhdGlvbiBlbHNlIGRlZmF1bHRzLm11c2ljRmFkZU91dER1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBBdWRpb01hbmFnZXIuc3RvcE11c2ljKGZhZGVEdXJhdGlvbiwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcikpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUmVzdW1lTXVzaWNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kUmVzdW1lTXVzaWM6IC0+IFxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmF1ZGlvXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgZmFkZUR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZhZGVJbkR1cmF0aW9uKSB0aGVuIEBwYXJhbXMuZmFkZUluRHVyYXRpb24gZWxzZSBkZWZhdWx0cy5tdXNpY0ZhZGVJbkR1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBBdWRpb01hbmFnZXIucmVzdW1lTXVzaWMoZmFkZUR1cmF0aW9uLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKSlcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUGxheVNvdW5kXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRQbGF5U291bmQ6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuYXVkaW9cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIuc2V0dGluZ3Muc291bmRFbmFibGVkIGFuZCAhR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgIHZvbHVtZSA9IGlmICFpc0xvY2tlZChmbGFnc1tcInNvdW5kLnZvbHVtZVwiXSkgdGhlbiBAcGFyYW1zLnNvdW5kLnZvbHVtZSBlbHNlIGRlZmF1bHRzLnNvdW5kVm9sdW1lXG4gICAgICAgICAgICBwbGF5YmFja1JhdGUgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJzb3VuZC5wbGF5YmFja1JhdGVcIl0pIHRoZW4gQHBhcmFtcy5zb3VuZC5wbGF5YmFja1JhdGUgZWxzZSBkZWZhdWx0cy5zb3VuZFBsYXliYWNrUmF0ZVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheVNvdW5kKEBwYXJhbXMuc291bmQubmFtZSwgdm9sdW1lLCBwbGF5YmFja1JhdGUsIEBwYXJhbXMubXVzaWNFZmZlY3QpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFN0b3BTb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kU3RvcFNvdW5kOiAtPlxuICAgICAgICBBdWRpb01hbmFnZXIuc3RvcFNvdW5kKEBwYXJhbXMuc291bmQubmFtZSlcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kRW5kQ29tbW9uRXZlbnRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kRW5kQ29tbW9uRXZlbnQ6IC0+XG4gICAgICAgIGV2ZW50SWQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNvbW1vbkV2ZW50SWQpXG4gICAgICAgIGV2ZW50ID0gR2FtZU1hbmFnZXIuY29tbW9uRXZlbnRzW2V2ZW50SWRdIFxuICAgICAgICBldmVudD8uYmVoYXZpb3Iuc3RvcCgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJlc3VtZUNvbW1vbkV2ZW50XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZFJlc3VtZUNvbW1vbkV2ZW50OiAtPlxuICAgICAgICBldmVudElkID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jb21tb25FdmVudElkKVxuICAgICAgICBldmVudCA9IEdhbWVNYW5hZ2VyLmNvbW1vbkV2ZW50c1tldmVudElkXSBcbiAgICAgICAgZXZlbnQ/LmJlaGF2aW9yLnJlc3VtZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2FsbENvbW1vbkV2ZW50XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDYWxsQ29tbW9uRXZlbnQ6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGV2ZW50SWQgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmNvbW1vbkV2ZW50SWQuaW5kZXg/XG4gICAgICAgICAgICBldmVudElkID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jb21tb25FdmVudElkKVxuICAgICAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5wYXJhbWV0ZXJzLnZhbHVlc1swXSlcbiAgICAgICAgICAgIHBhcmFtcyA9IHsgdmFsdWVzOiBsaXN0IH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcGFyYW1zID0gQHBhcmFtcy5wYXJhbWV0ZXJzXG4gICAgICAgICAgICBldmVudElkID0gQHBhcmFtcy5jb21tb25FdmVudElkXG5cbiAgICAgICAgQGludGVycHJldGVyLmNhbGxDb21tb25FdmVudChldmVudElkLCBwYXJhbXMpXG4gICAgIFxuICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VUZXh0U2V0dGluZ3NcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENoYW5nZVRleHRTZXR0aW5nczogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHRzID0gc2NlbmUudGV4dHNcbiAgICAgICAgaWYgbm90IHRleHRzW251bWJlcl0/IFxuICAgICAgICAgICAgdGV4dHNbbnVtYmVyXSA9IG5ldyBncy5PYmplY3RfVGV4dCgpXG4gICAgICAgICAgICB0ZXh0c1tudW1iZXJdLnZpc2libGUgPSBub1xuICAgICAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0ZXh0U3ByaXRlID0gdGV4dHNbbnVtYmVyXVxuICAgICAgICBwYWRkaW5nID0gdGV4dFNwcml0ZS5iZWhhdmlvci5wYWRkaW5nXG4gICAgICAgIGZvbnQgPSB0ZXh0U3ByaXRlLmZvbnRcbiAgICAgICAgZm9udE5hbWUgPSB0ZXh0U3ByaXRlLmZvbnQubmFtZVxuICAgICAgICBmb250U2l6ZSA9IHRleHRTcHJpdGUuZm9udC5zaXplXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmxpbmVTcGFjaW5nKSB0aGVuIHRleHRTcHJpdGUudGV4dFJlbmRlcmVyLmxpbmVTcGFjaW5nID0gQHBhcmFtcy5saW5lU3BhY2luZyA/IHRleHRTcHJpdGUudGV4dFJlbmRlcmVyLmxpbmVTcGFjaW5nXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5mb250KSB0aGVuIGZvbnROYW1lID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5mb250KVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muc2l6ZSkgdGhlbiBmb250U2l6ZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuc2l6ZSlcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuZm9udCkgb3IgIWlzTG9ja2VkKGZsYWdzLnNpemUpXG4gICAgICAgICAgICB0ZXh0U3ByaXRlLmZvbnQgPSBuZXcgRm9udChmb250TmFtZSwgZm9udFNpemUpXG4gICAgICAgICAgICBcbiAgICAgICAgcGFkZGluZy5sZWZ0ID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wicGFkZGluZy4wXCJdKSB0aGVuIEBwYXJhbXMucGFkZGluZz9bMF0gZWxzZSBwYWRkaW5nLmxlZnRcbiAgICAgICAgcGFkZGluZy50b3AgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJwYWRkaW5nLjFcIl0pIHRoZW4gQHBhcmFtcy5wYWRkaW5nP1sxXSBlbHNlIHBhZGRpbmcudG9wXG4gICAgICAgIHBhZGRpbmcucmlnaHQgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJwYWRkaW5nLjJcIl0pIHRoZW4gQHBhcmFtcy5wYWRkaW5nP1syXSBlbHNlIHBhZGRpbmcucmlnaHRcbiAgICAgICAgcGFkZGluZy5ib3R0b20gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJwYWRkaW5nLjNcIl0pIHRoZW4gQHBhcmFtcy5wYWRkaW5nP1szXSBlbHNlIHBhZGRpbmcuYm90dG9tXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYm9sZClcbiAgICAgICAgICAgIHRleHRTcHJpdGUuZm9udC5ib2xkID0gQHBhcmFtcy5ib2xkXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5pdGFsaWMpXG4gICAgICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuaXRhbGljID0gQHBhcmFtcy5pdGFsaWNcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNtYWxsQ2FwcylcbiAgICAgICAgICAgIHRleHRTcHJpdGUuZm9udC5zbWFsbENhcHMgPSBAcGFyYW1zLnNtYWxsQ2Fwc1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MudW5kZXJsaW5lKVxuICAgICAgICAgICAgdGV4dFNwcml0ZS5mb250LnVuZGVybGluZSA9IEBwYXJhbXMudW5kZXJsaW5lXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5zdHJpa2VUaHJvdWdoKVxuICAgICAgICAgICAgdGV4dFNwcml0ZS5mb250LnN0cmlrZVRocm91Z2ggPSBAcGFyYW1zLnN0cmlrZVRocm91Z2hcbiAgICAgICAgICAgIFxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuY29sb3IgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuY29sb3IpIHRoZW4gbmV3IENvbG9yKEBwYXJhbXMuY29sb3IpIGVsc2UgZm9udC5jb2xvclxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuYm9yZGVyID0gaWYgIWlzTG9ja2VkKGZsYWdzLm91dGxpbmUpdGhlbiBAcGFyYW1zLm91dGxpbmUgZWxzZSBmb250LmJvcmRlclxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuYm9yZGVyQ29sb3IgPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3V0bGluZUNvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLm91dGxpbmVDb2xvcikgZWxzZSBuZXcgQ29sb3IoZm9udC5ib3JkZXJDb2xvcilcbiAgICAgICAgdGV4dFNwcml0ZS5mb250LmJvcmRlclNpemUgPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3V0bGluZVNpemUpIHRoZW4gQHBhcmFtcy5vdXRsaW5lU2l6ZSBlbHNlIGZvbnQuYm9yZGVyU2l6ZVxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuc2hhZG93ID0gaWYgIWlzTG9ja2VkKGZsYWdzLnNoYWRvdyl0aGVuIEBwYXJhbXMuc2hhZG93IGVsc2UgZm9udC5zaGFkb3dcbiAgICAgICAgdGV4dFNwcml0ZS5mb250LnNoYWRvd0NvbG9yID0gaWYgIWlzTG9ja2VkKGZsYWdzLnNoYWRvd0NvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLnNoYWRvd0NvbG9yKSBlbHNlIG5ldyBDb2xvcihmb250LnNoYWRvd0NvbG9yKVxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuc2hhZG93T2Zmc2V0WCA9IGlmICFpc0xvY2tlZChmbGFncy5zaGFkb3dPZmZzZXRYKSB0aGVuIEBwYXJhbXMuc2hhZG93T2Zmc2V0WCBlbHNlIGZvbnQuc2hhZG93T2Zmc2V0WFxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuc2hhZG93T2Zmc2V0WSA9IGlmICFpc0xvY2tlZChmbGFncy5zaGFkb3dPZmZzZXRZKSB0aGVuIEBwYXJhbXMuc2hhZG93T2Zmc2V0WSBlbHNlIGZvbnQuc2hhZG93T2Zmc2V0WVxuICAgICAgICB0ZXh0U3ByaXRlLmJlaGF2aW9yLnJlZnJlc2goKVxuICAgICAgICB0ZXh0U3ByaXRlLnVwZGF0ZSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVRleHRTZXR0aW5nc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRUZXh0RGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudGV4dFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kaXNhcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kaXNhcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnpPcmRlcikgdGhlbiBkZWZhdWx0cy56T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYXBwZWFyRWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRWFzaW5nID0gQHBhcmFtcy5hcHBlYXJFYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYXBwZWFyQW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uID0gQHBhcmFtcy5hcHBlYXJBbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZGlzYXBwZWFyRWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nID0gQHBhcmFtcy5kaXNhcHBlYXJFYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZGlzYXBwZWFyQW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uID0gQHBhcmFtcy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wibW90aW9uQmx1ci5lbmFibGVkXCJdKSB0aGVuIGRlZmF1bHRzLm1vdGlvbkJsdXIgPSBAcGFyYW1zLm1vdGlvbkJsdXJcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBkZWZhdWx0cy5vcmlnaW4gPSBAcGFyYW1zLm9yaWdpblxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNob3dUZXh0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kU2hvd1RleHQ6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudGV4dFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVRleHREb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0ZXh0ID0gQHBhcmFtcy50ZXh0XG4gICAgICAgIHRleHRzID0gc2NlbmUudGV4dHNcbiAgICAgICAgaWYgbm90IHRleHRzW251bWJlcl0/IHRoZW4gdGV4dHNbbnVtYmVyXSA9IG5ldyBncy5PYmplY3RfVGV4dCgpXG4gICAgICAgIFxuICAgICAgICB4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICB5ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi55KVxuICAgICAgICB0ZXh0T2JqZWN0ID0gdGV4dHNbbnVtYmVyXVxuICAgICAgICB0ZXh0T2JqZWN0LmRvbWFpbiA9IEBwYXJhbXMubnVtYmVyRG9tYWluXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICBvcmlnaW4gPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIEBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpIGVsc2UgZGVmYXVsdHMuek9yZGVyXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIHBvc2l0aW9uQW5jaG9yID0gaWYgIWlzTG9ja2VkKGZsYWdzLnBvc2l0aW9uT3JpZ2luKSB0aGVuIEBpbnRlcnByZXRlci5ncmFwaGljQW5jaG9yUG9pbnRzQnlDb25zdGFudFtAcGFyYW1zLnBvc2l0aW9uT3JpZ2luXSB8fCBuZXcgZ3MuUG9pbnQoMCwgMCkgZWxzZSBAaW50ZXJwcmV0ZXIuZ3JhcGhpY0FuY2hvclBvaW50c0J5Q29uc3RhbnRbZGVmYXVsdHMucG9zaXRpb25PcmlnaW5dXG4gICAgICAgIFxuICAgICAgICB0ZXh0T2JqZWN0LnRleHQgPSB0ZXh0XG4gICAgICAgIHRleHRPYmplY3QuZHN0UmVjdC54ID0geCBcbiAgICAgICAgdGV4dE9iamVjdC5kc3RSZWN0LnkgPSB5IFxuICAgICAgICB0ZXh0T2JqZWN0LmJsZW5kTW9kZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYmxlbmRNb2RlKVxuICAgICAgICB0ZXh0T2JqZWN0LmFuY2hvci54ID0gaWYgb3JpZ2luID09IDAgdGhlbiAwIGVsc2UgMC41XG4gICAgICAgIHRleHRPYmplY3QuYW5jaG9yLnkgPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgdGV4dE9iamVjdC5wb3NpdGlvbkFuY2hvci54ID0gcG9zaXRpb25BbmNob3IueFxuICAgICAgICB0ZXh0T2JqZWN0LnBvc2l0aW9uQW5jaG9yLnkgPSBwb3NpdGlvbkFuY2hvci55XG4gICAgICAgIHRleHRPYmplY3QuekluZGV4ID0gekluZGV4IHx8ICAoNzAwICsgbnVtYmVyKVxuICAgICAgICB0ZXh0T2JqZWN0LnNpemVUb0ZpdCA9IHllc1xuICAgICAgICB0ZXh0T2JqZWN0LmZvcm1hdHRpbmcgPSB5ZXNcbiAgICAgICAgaWYgQHBhcmFtcy52aWV3cG9ydD8udHlwZSA9PSBcInNjZW5lXCJcbiAgICAgICAgICAgIHRleHRPYmplY3Qudmlld3BvcnQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3Iudmlld3BvcnRcbiAgICAgICAgdGV4dE9iamVjdC51cGRhdGUoKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy5wb3NpdGlvblR5cGUgPT0gMFxuICAgICAgICAgICAgcCA9IEBpbnRlcnByZXRlci5wcmVkZWZpbmVkT2JqZWN0UG9zaXRpb24oQHBhcmFtcy5wcmVkZWZpbmVkUG9zaXRpb25JZCwgdGV4dE9iamVjdCwgQHBhcmFtcylcbiAgICAgICAgICAgIHRleHRPYmplY3QuZHN0UmVjdC54ID0gcC54XG4gICAgICAgICAgICB0ZXh0T2JqZWN0LmRzdFJlY3QueSA9IHAueVxuICAgICAgICAgICAgXG4gICAgICAgIHRleHRPYmplY3QuYW5pbWF0b3IuYXBwZWFyKHgsIHksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kVGV4dE1vdGlvbkJsdXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRUZXh0TW90aW9uQmx1cjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHQgPSBzY2VuZS50ZXh0c1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0ZXh0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgdGV4dC5tb3Rpb25CbHVyLnNldChAcGFyYW1zLm1vdGlvbkJsdXIpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJlZnJlc2hUZXh0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kUmVmcmVzaFRleHQ6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVRleHREb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0ZXh0cyA9IHNjZW5lLnRleHRzXG4gICAgICAgIGlmIG5vdCB0ZXh0c1tudW1iZXJdPyB0aGVuIHJldHVyblxuXG4gICAgICAgIHRleHRzW251bWJlcl0uYmVoYXZpb3IucmVmcmVzaCh5ZXMpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZVRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1vdmVUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubW92ZU9iamVjdCh0ZXh0LCBAcGFyYW1zLnBpY3R1cmUucG9zaXRpb24sIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNb3ZlVGV4dFBhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1vdmVUZXh0UGF0aDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHQgPSBzY2VuZS50ZXh0c1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0ZXh0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3RQYXRoKHRleHQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSb3RhdGVUZXh0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRSb3RhdGVUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIucm90YXRlT2JqZWN0KHRleHQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tVGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZFpvb21UZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuem9vbU9iamVjdCh0ZXh0LCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJsZW5kVGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRCbGVuZFRleHQ6IC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICB0ZXh0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnRleHRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuYmxlbmRPYmplY3QodGV4dCwgQHBhcmFtcykgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDb2xvclRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kQ29sb3JUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGlmIHRleHQ/XG4gICAgICAgICAgICB0ZXh0LmFuaW1hdG9yLmNvbG9yVG8obmV3IENvbG9yKEBwYXJhbXMuY29sb3IpLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZVRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgXG4gICAgY29tbWFuZEVyYXNlVGV4dDogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy50ZXh0XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHQgPSBzY2VuZS50ZXh0c1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0ZXh0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb25cbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0ZXh0LmFuaW1hdG9yLmRpc2FwcGVhcihhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sIChzZW5kZXIpID0+IFxuICAgICAgICAgICAgc2VuZGVyLmRpc3Bvc2UoKVxuICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihzZW5kZXIuZG9tYWluKVxuICAgICAgICAgICAgc2NlbmUudGV4dHNbbnVtYmVyXSA9IG51bGxcbiAgICAgICAgKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvbiBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kVGV4dEVmZmVjdFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRUZXh0RWZmZWN0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIub2JqZWN0RWZmZWN0KHRleHQsIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZElucHV0VGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kSW5wdXRUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBpZiAoR2FtZU1hbmFnZXIuc2V0dGluZ3MuYWxsb3dDaG9pY2VTa2lwfHxAaW50ZXJwcmV0ZXIucHJldmlldykgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIubWVzc2FnZU9iamVjdCgpLmJlaGF2aW9yLmNsZWFyKClcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudmFyaWFibGUsIFwiXCIpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgIGlmIEBpbnRlcnByZXRlci5pc1Byb2Nlc3NpbmdNZXNzYWdlSW5PdGhlckNvbnRleHQoKVxuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRGb3JNZXNzYWdlKClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICBcbiAgICAgICAgJHRlbXBGaWVsZHMubGV0dGVycyA9IEBwYXJhbXMubGV0dGVyc1xuICAgICAgICBzY2VuZS5iZWhhdmlvci5zaG93SW5wdXRUZXh0KEBwYXJhbXMubGV0dGVycywgZ3MuQ2FsbEJhY2soXCJvbklucHV0VGV4dEZpbmlzaFwiLCBAaW50ZXJwcmV0ZXIsIEBpbnRlcnByZXRlcikpICBcbiAgICAgICAgQGludGVycHJldGVyLndhaXRpbmdGb3IuaW5wdXRUZXh0ID0gQHBhcmFtc1xuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTYXZlUGVyc2lzdGVudERhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZFNhdmVQZXJzaXN0ZW50RGF0YTogLT4gR2FtZU1hbmFnZXIuc2F2ZUdsb2JhbERhdGEoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNhdmVTZXR0aW5nc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kU2F2ZVNldHRpbmdzOiAtPiBHYW1lTWFuYWdlci5zYXZlU2V0dGluZ3MoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFByZXBhcmVTYXZlR2FtZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUHJlcGFyZVNhdmVHYW1lOiAtPlxuICAgICAgICBpZiBAaW50ZXJwcmV0ZXIucHJldmlld0RhdGE/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlcisrXG4gICAgICAgIEdhbWVNYW5hZ2VyLnByZXBhcmVTYXZlR2FtZShAcGFyYW1zLnNuYXBzaG90KVxuICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlci0tXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNhdmVHYW1lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRTYXZlR2FtZTogLT5cbiAgICAgICAgaWYgQGludGVycHJldGVyLnByZXZpZXdEYXRhPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgdGh1bWJXaWR0aCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGh1bWJXaWR0aClcbiAgICAgICAgdGh1bWJIZWlnaHQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRodW1iSGVpZ2h0KVxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIuc2F2ZShAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNsb3QpIC0gMSwgdGh1bWJXaWR0aCwgdGh1bWJIZWlnaHQpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExvYWRHYW1lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRMb2FkR2FtZTogLT5cbiAgICAgICAgaWYgQGludGVycHJldGVyLnByZXZpZXdEYXRhPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIubG9hZChAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNsb3QpIC0gMSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kV2FpdEZvcklucHV0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRXYWl0Rm9ySW5wdXQ6IC0+XG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwibW91c2VEb3duXCIsIEBvYmplY3QpXG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwibW91c2VVcFwiLCBAb2JqZWN0KVxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub2ZmQnlPd25lcihcImtleURvd25cIiwgQG9iamVjdClcbiAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9mZkJ5T3duZXIoXCJrZXlVcFwiLCBAb2JqZWN0KVxuICAgICAgICBcbiAgICAgICAgZiA9ID0+XG4gICAgICAgICAgICBleGVjdXRlQWN0aW9uID0gbm9cbiAgICAgICAgICAgIGlmIElucHV0Lk1vdXNlLmlzQnV0dG9uKEBwYXJhbXMua2V5KVxuICAgICAgICAgICAgICAgIGV4ZWN1dGVBY3Rpb24gPSBJbnB1dC5Nb3VzZS5idXR0b25zW0BwYXJhbXMua2V5XSA9PSBAcGFyYW1zLnN0YXRlXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgZXhlY3V0ZUFjdGlvbiA9IElucHV0LmtleXNbQHBhcmFtcy5rZXldID09IEBwYXJhbXMuc3RhdGVcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIGV4ZWN1dGVBY3Rpb25cbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwibW91c2VEb3duXCIsIEBvYmplY3QpXG4gICAgICAgICAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9mZkJ5T3duZXIoXCJtb3VzZVVwXCIsIEBvYmplY3QpXG4gICAgICAgICAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9mZkJ5T3duZXIoXCJrZXlEb3duXCIsIEBvYmplY3QpXG4gICAgICAgICAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9mZkJ5T3duZXIoXCJrZXlVcFwiLCBAb2JqZWN0KVxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vbiBcIm1vdXNlRG93blwiLCBmLCBudWxsLCBAb2JqZWN0XG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vbiBcIm1vdXNlVXBcIiwgZiwgbnVsbCwgQG9iamVjdFxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub24gXCJrZXlEb3duXCIsIGYsIG51bGwsIEBvYmplY3RcbiAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9uIFwiS2V5VXBcIiwgZiwgbnVsbCwgQG9iamVjdFxuICAgICAgICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kR2V0SW5wdXREYXRhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZEdldElucHV0RGF0YTogLT5cbiAgICAgICAgc3dpdGNoIEBwYXJhbXMuZmllbGRcbiAgICAgICAgICAgIHdoZW4gMCAjIEJ1dHRvbiBBXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQua2V5c1tJbnB1dC5BXSlcbiAgICAgICAgICAgIHdoZW4gMSAjIEJ1dHRvbiBCXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQua2V5c1tJbnB1dC5CXSlcbiAgICAgICAgICAgIHdoZW4gMiAjIEJ1dHRvbiBYXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQua2V5c1tJbnB1dC5YXSlcbiAgICAgICAgICAgIHdoZW4gMyAjIEJ1dHRvbiBZXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQua2V5c1tJbnB1dC5ZXSlcbiAgICAgICAgICAgIHdoZW4gNCAjIEJ1dHRvbiBMXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQua2V5c1tJbnB1dC5MXSlcbiAgICAgICAgICAgIHdoZW4gNSAjIEJ1dHRvbiBSXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQua2V5c1tJbnB1dC5SXSlcbiAgICAgICAgICAgIHdoZW4gNiAjIEJ1dHRvbiBTVEFSVFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuU1RBUlRdKVxuICAgICAgICAgICAgd2hlbiA3ICMgQnV0dG9uIFNFTEVDVFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuU0VMRUNUXSlcbiAgICAgICAgICAgIHdoZW4gOCAjIE1vdXNlIFhcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5Nb3VzZS54KVxuICAgICAgICAgICAgd2hlbiA5ICMgTW91c2UgWVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0Lk1vdXNlLnkpXG4gICAgICAgICAgICB3aGVuIDEwICMgTW91c2UgV2hlZWxcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5Nb3VzZS53aGVlbClcbiAgICAgICAgICAgIHdoZW4gMTEgIyBNb3VzZSBMZWZ0XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQuTW91c2UuYnV0dG9uc1tJbnB1dC5Nb3VzZS5MRUZUXSlcbiAgICAgICAgICAgIHdoZW4gMTIgIyBNb3VzZSBSaWdodFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0Lk1vdXNlLmJ1dHRvbnNbSW5wdXQuTW91c2UuUklHSFRdKVxuICAgICAgICAgICAgd2hlbiAxMyAjIE1vdXNlIE1pZGRsZVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0Lk1vdXNlLmJ1dHRvbnNbSW5wdXQuTW91c2UuTUlERExFXSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRHZXRHYW1lRGF0YVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgIFxuICAgIGNvbW1hbmRHZXRHYW1lRGF0YTogLT5cbiAgICAgICAgdGVtcFNldHRpbmdzID0gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzXG4gICAgICAgIHNldHRpbmdzID0gR2FtZU1hbmFnZXIuc2V0dGluZ3NcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLmZpZWxkXG4gICAgICAgICAgICB3aGVuIDAgIyBTY2VuZSBJRFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIFNjZW5lTWFuYWdlci5zY2VuZS5zY2VuZURvY3VtZW50LnVpZClcbiAgICAgICAgICAgIHdoZW4gMSAjIEdhbWUgVGltZSAtIFNlY29uZHNcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLnJvdW5kKEdyYXBoaWNzLmZyYW1lQ291bnQgLyA2MCkpXG4gICAgICAgICAgICB3aGVuIDIgIyBHYW1lIFRpbWUgLSBNaW51dGVzXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgTWF0aC5yb3VuZChHcmFwaGljcy5mcmFtZUNvdW50IC8gNjAgLyA2MCkpXG4gICAgICAgICAgICB3aGVuIDMgIyBHYW1lIFRpbWUgLSBIb3Vyc1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIE1hdGgucm91bmQoR3JhcGhpY3MuZnJhbWVDb3VudCAvIDYwIC8gNjAgLyA2MCkpXG4gICAgICAgICAgICB3aGVuIDQgIyBEYXRlIC0gRGF5IG9mIE1vbnRoXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbmV3IERhdGUoKS5nZXREYXRlKCkpXG4gICAgICAgICAgICB3aGVuIDUgIyBEYXRlIC0gRGF5IG9mIFdlZWtcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBuZXcgRGF0ZSgpLmdldERheSgpKVxuICAgICAgICAgICAgd2hlbiA2ICMgRGF0ZSAtIE1vbnRoXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbmV3IERhdGUoKS5nZXRNb250aCgpKVxuICAgICAgICAgICAgd2hlbiA3ICMgRGF0ZSAtIFllYXJcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBuZXcgRGF0ZSgpLmdldEZ1bGxZZWFyKCkpXG4gICAgICAgICAgICB3aGVuIDhcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYWxsb3dTa2lwKVxuICAgICAgICAgICAgd2hlbiA5XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmFsbG93U2tpcFVucmVhZE1lc3NhZ2VzKVxuICAgICAgICAgICAgd2hlbiAxMFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLm1lc3NhZ2VTcGVlZClcbiAgICAgICAgICAgIHdoZW4gMTFcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYXV0b01lc3NhZ2UuZW5hYmxlZClcbiAgICAgICAgICAgIHdoZW4gMTJcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5hdXRvTWVzc2FnZS50aW1lKVxuICAgICAgICAgICAgd2hlbiAxM1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5hdXRvTWVzc2FnZS53YWl0Rm9yVm9pY2UpXG4gICAgICAgICAgICB3aGVuIDE0XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmF1dG9NZXNzYWdlLnN0b3BPbkFjdGlvbilcbiAgICAgICAgICAgIHdoZW4gMTVcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MudGltZU1lc3NhZ2VUb1ZvaWNlKVxuICAgICAgICAgICAgd2hlbiAxNlxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5hbGxvd1ZpZGVvU2tpcClcbiAgICAgICAgICAgIHdoZW4gMTdcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYWxsb3dDaG9pY2VTa2lwKVxuICAgICAgICAgICAgd2hlbiAxOFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5za2lwVm9pY2VPbkFjdGlvbilcbiAgICAgICAgICAgIHdoZW4gMTlcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuZnVsbFNjcmVlbilcbiAgICAgICAgICAgIHdoZW4gMjBcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYWRqdXN0QXNwZWN0UmF0aW8pXG4gICAgICAgICAgICB3aGVuIDIxXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmNvbmZpcm1hdGlvbilcbiAgICAgICAgICAgIHdoZW4gMjJcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5iZ21Wb2x1bWUpXG4gICAgICAgICAgICB3aGVuIDIzXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3Mudm9pY2VWb2x1bWUpXG4gICAgICAgICAgICB3aGVuIDI0XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3Muc2VWb2x1bWUpXG4gICAgICAgICAgICB3aGVuIDI1XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmJnbUVuYWJsZWQpXG4gICAgICAgICAgICB3aGVuIDI2XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLnZvaWNlRW5hYmxlZClcbiAgICAgICAgICAgIHdoZW4gMjdcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3Muc2VFbmFibGVkKVxuICAgICAgICAgICAgd2hlbiAyOCAjIExhbmd1YWdlIC0gQ29kZVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIExhbmd1YWdlTWFuYWdlci5sYW5ndWFnZT8uY29kZSB8fCBcIlwiKVxuICAgICAgICAgICAgd2hlbiAyOSAjIExhbmd1YWdlIC0gTmFtZVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIExhbmd1YWdlTWFuYWdlci5sYW5ndWFnZT8ubmFtZSB8fCBcIlwiKSAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTZXRHYW1lRGF0YVxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRTZXRHYW1lRGF0YTogLT5cbiAgICAgICAgdGVtcFNldHRpbmdzID0gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzXG4gICAgICAgIHNldHRpbmdzID0gR2FtZU1hbmFnZXIuc2V0dGluZ3NcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLmZpZWxkXG4gICAgICAgICAgICB3aGVuIDBcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hbGxvd1NraXAgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMVxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmFsbG93U2tpcFVucmVhZE1lc3NhZ2VzID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDJcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5tZXNzYWdlU3BlZWQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgd2hlbiAzXG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYXV0b01lc3NhZ2UuZW5hYmxlZCA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiA0XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYXV0b01lc3NhZ2UudGltZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDVcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hdXRvTWVzc2FnZS53YWl0Rm9yVm9pY2UgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gNlxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmF1dG9NZXNzYWdlLnN0b3BPbkFjdGlvbiA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiA3XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MudGltZU1lc3NhZ2VUb1ZvaWNlID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDhcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hbGxvd1ZpZGVvU2tpcCA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiA5XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYWxsb3dDaG9pY2VTa2lwID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDEwXG4gICAgICAgICAgICAgICAgc2V0dGluZ3Muc2tpcFZvaWNlT25BY3Rpb24gPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMTFcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5mdWxsU2NyZWVuID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICAgICAgaWYgc2V0dGluZ3MuZnVsbFNjcmVlblxuICAgICAgICAgICAgICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuZW50ZXJGdWxsU2NyZWVuKClcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5sZWF2ZUZ1bGxTY3JlZW4oKVxuICAgICAgICAgICAgd2hlbiAxMlxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmFkanVzdEFzcGVjdFJhdGlvID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICAgICAgR3JhcGhpY3Mua2VlcFJhdGlvID0gc2V0dGluZ3MuYWRqdXN0QXNwZWN0UmF0aW9cbiAgICAgICAgICAgICAgICBHcmFwaGljcy5vblJlc2l6ZSgpXG4gICAgICAgICAgICB3aGVuIDEzXG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuY29uZmlybWF0aW9uID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDE0XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYmdtVm9sdW1lID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMTVcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy52b2ljZVZvbHVtZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDE2XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Muc2VWb2x1bWUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgd2hlbiAxN1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLmJnbUVuYWJsZWQgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMThcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy52b2ljZUVuYWJsZWQgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMTlcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5zZUVuYWJsZWQgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSkgICBcbiAgICAgICAgICAgIHdoZW4gMjAgXG4gICAgICAgICAgICAgICAgY29kZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGV4dFZhbHVlKVxuICAgICAgICAgICAgICAgIGxhbmd1YWdlID0gTGFuZ3VhZ2VNYW5hZ2VyLmxhbmd1YWdlcy5maXJzdCAobCkgPT4gbC5jb2RlID09IGNvZGVcbiAgICAgICAgICAgICAgICBMYW5ndWFnZU1hbmFnZXIuc2VsZWN0TGFuZ3VhZ2UobGFuZ3VhZ2UpIGlmIGxhbmd1YWdlXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kR2V0T2JqZWN0RGF0YVxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRHZXRPYmplY3REYXRhOiAtPlxuICAgICAgICBkZWJ1Z2dlclxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vYmplY3RUeXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBQaWN0dXJlXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUucGljdHVyZXNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgd2hlbiAxICMgQmFja2dyb3VuZFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iYWNrZ3JvdW5kc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKV1cbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHRcbiAgICAgICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IFNjZW5lTWFuYWdlci5zY2VuZS50ZXh0c1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgICAgICB3aGVuIDMgIyBNb3ZpZVxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IFNjZW5lTWFuYWdlci5zY2VuZS52aWRlb3NbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgd2hlbiA0ICMgQ2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgY2hhcmFjdGVySWQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IFNjZW5lTWFuYWdlci5zY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gY2hhcmFjdGVySWRcbiAgICAgICAgICAgIHdoZW4gNSAjIE1lc3NhZ2UgQm94XG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJtZXNzYWdlQm94XCIpXG4gICAgICAgICAgICB3aGVuIDYgIyBNZXNzYWdlIEFyZWFcbiAgICAgICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VNZXNzYWdlQXJlYURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBhcmVhID0gU2NlbmVNYW5hZ2VyLnNjZW5lLm1lc3NhZ2VBcmVhc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gYXJlYT8ubGF5b3V0XG4gICAgICAgICAgICB3aGVuIDcgIyBIb3RzcG90XG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUuaG90c3BvdHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBmaWVsZCA9IEBwYXJhbXMuZmllbGRcbiAgICAgICAgaWYgQHBhcmFtcy5vYmplY3RUeXBlID09IDQgIyBDaGFyYWN0ZXJcbiAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLmZpZWxkXG4gICAgICAgICAgICAgICAgd2hlbiAwICMgSURcbiAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzW2NoYXJhY3RlcklkXT8uaW5kZXggfHwgXCJcIilcbiAgICAgICAgICAgICAgICB3aGVuIDEgIyBOYW1lXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIGxjcyhSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNbY2hhcmFjdGVySWRdPy5uYW1lKSB8fCBcIlwiKVxuICAgICAgICAgICAgZmllbGQgLT0gMlxuICAgICAgICAgICAgXG4gICAgICAgIGlmIG9iamVjdD8gICAgICAgIFxuICAgICAgICAgICAgaWYgZmllbGQgPj0gMFxuICAgICAgICAgICAgICAgIHN3aXRjaCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBSZXNvdXJjZSBOYW1lXG4gICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vYmplY3RUeXBlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC50ZXh0IHx8IFwiXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC52aWRlbyB8fCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LmltYWdlIHx8IFwiXCIpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFBvc2l0aW9uIC0gWFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LmRzdFJlY3QueClcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgUG9zaXRpb24gLSBZXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QuZHN0UmVjdC55KVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBBbmNob3IgLSBYXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLnJvdW5kKG9iamVjdC5hbmNob3IueCAqIDEwMCkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNCAjIEFuY2hvciAtIFlcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIE1hdGgucm91bmQob2JqZWN0LmFuY2hvci55ICogMTAwKSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgWm9vbSAtIFhcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIE1hdGgucm91bmQob2JqZWN0Lnpvb20ueCAqIDEwMCkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNiAjIFpvb20gLSBZXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLnJvdW5kKG9iamVjdC56b29tLnkgKiAxMDApKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDcgIyBTaXplIC0gV2lkdGhcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC5kc3RSZWN0LndpZHRoKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDggIyBTaXplIC0gSGVpZ2h0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QuZHN0UmVjdC5oZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gOSAjIFotSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC56SW5kZXgpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTAgIyBPcGFjaXR5XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3Qub3BhY2l0eSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxMSAjIEFuZ2xlXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QuYW5nbGUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTIgIyBWaXNpYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LnZpc2libGUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTMgIyBCbGVuZCBNb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QuYmxlbmRNb2RlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDE0ICMgRmxpcHBlZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC5taXJyb3IpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kU2V0T2JqZWN0RGF0YVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgICAgICBcbiAgICBjb21tYW5kU2V0T2JqZWN0RGF0YTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMub2JqZWN0VHlwZVxuICAgICAgICAgICAgd2hlbiAwICMgUGljdHVyZVxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIHdoZW4gMSAjIEJhY2tncm91bmRcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcildXG4gICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUudGV4dHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgd2hlbiAzICMgTW92aWVcbiAgICAgICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VWaWRlb0RvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUudmlkZW9zW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIHdoZW4gNCAjIENoYXJhY3RlclxuICAgICAgICAgICAgICAgIGNoYXJhY3RlcklkID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jaGFyYWN0ZXJJZClcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IGNoYXJhY3RlcklkXG4gICAgICAgICAgICB3aGVuIDUgIyBNZXNzYWdlIEJveFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwibWVzc2FnZUJveFwiKVxuICAgICAgICAgICAgd2hlbiA2ICMgTWVzc2FnZSBBcmVhXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlTWVzc2FnZUFyZWFEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgYXJlYSA9IFNjZW5lTWFuYWdlci5zY2VuZS5tZXNzYWdlQXJlYXNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IGFyZWE/LmxheW91dFxuICAgICAgICAgICAgd2hlbiA3ICMgSG90c3BvdFxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZUhvdHNwb3REb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmhvdHNwb3RzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGZpZWxkID0gQHBhcmFtcy5maWVsZFxuICAgICAgICBpZiBAcGFyYW1zLm9iamVjdFR5cGUgPT0gNCAjIENoYXJhY3RlclxuICAgICAgICAgICAgc3dpdGNoIGZpZWxkXG4gICAgICAgICAgICAgICAgd2hlbiAwICMgTmFtZVxuICAgICAgICAgICAgICAgICAgICBuYW1lID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50ZXh0VmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIGlmIG9iamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5uYW1lID0gbmFtZVxuICAgICAgICAgICAgICAgICAgICBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNbY2hhcmFjdGVySWRdPy5uYW1lID0gbmFtZVxuICAgICAgICAgICAgZmllbGQtLVxuICAgICAgICAgICAgXG4gICAgICAgIGlmIG9iamVjdD8gICAgICAgIFxuICAgICAgICAgICAgaWYgZmllbGQgPj0gMFxuICAgICAgICAgICAgICAgIHN3aXRjaCBmaWVsZFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBSZXNvdXJjZSBOYW1lIC8gVGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMub2JqZWN0VHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QudGV4dCA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGV4dFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QudmlkZW8gPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5pbWFnZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGV4dFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBQb3NpdGlvbiAtIFhcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5kc3RSZWN0LnggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBQb3NpdGlvbiAtIFlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5kc3RSZWN0LnkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBBbmNob3IgLSBYXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuYW5jaG9yLnggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSAvIDEwMFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDQgIyBBbmNob3IgLSBZXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuYW5jaG9yLnkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSAvIDEwMFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDUgIyBab29tIC0gWFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lnpvb20ueCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpIC8gMTAwXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNiAjIFpvb20gLSBZXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Quem9vbS55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSkgLyAxMDBcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA3ICMgWi1JbmRleFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnpJbmRleCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gOCAjIE9wYWNpdHlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5vcGFjaXR5PSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDkgIyBBbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFuZ2xlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxMCAjIFZpc2libGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC52aXNpYmxlID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTEgIyBCbGVuZCBNb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuYmxlbmRNb2RlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSkgICAgXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTIgIyBGbGlwcGVkXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QubWlycm9yID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VTb3VuZHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZENoYW5nZVNvdW5kczogLT5cbiAgICAgICAgc291bmRzID0gUmVjb3JkTWFuYWdlci5zeXN0ZW0uc291bmRzXG4gICAgICAgIGZpZWxkRmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgXG4gICAgICAgIGZvciBzb3VuZCwgaSBpbiBAcGFyYW1zLnNvdW5kc1xuICAgICAgICAgICAgaWYgIWdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkKGZpZWxkRmxhZ3NbXCJzb3VuZHMuXCIraV0pXG4gICAgICAgICAgICAgICAgc291bmRzW2ldID0gQHBhcmFtcy5zb3VuZHNbaV1cbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VDb2xvcnNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICBcbiAgICBjb21tYW5kQ2hhbmdlQ29sb3JzOiAtPlxuICAgICAgICBjb2xvcnMgPSBSZWNvcmRNYW5hZ2VyLnN5c3RlbS5jb2xvcnNcbiAgICAgICAgZmllbGRGbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBcbiAgICAgICAgZm9yIGNvbG9yLCBpIGluIEBwYXJhbXMuY29sb3JzXG4gICAgICAgICAgICBpZiAhZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWQoZmllbGRGbGFnc1tcImNvbG9ycy5cIitpXSlcbiAgICAgICAgICAgICAgICBjb2xvcnNbaV0gPSBuZXcgZ3MuQ29sb3IoQHBhcmFtcy5jb2xvcnNbaV0pXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhbmdlU2NyZWVuQ3Vyc29yXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgXG4gICAgY29tbWFuZENoYW5nZVNjcmVlbkN1cnNvcjogLT5cbiAgICAgICAgaWYgQHBhcmFtcy5ncmFwaGljPy5uYW1lP1xuICAgICAgICAgICAgYml0bWFwID0gUmVzb3VyY2VNYW5hZ2VyLmdldEJpdG1hcChcIkdyYXBoaWNzL1BpY3R1cmVzLyN7QHBhcmFtcy5ncmFwaGljLm5hbWV9XCIpXG4gICAgICAgICAgICBHcmFwaGljcy5zZXRDdXJzb3JCaXRtYXAoYml0bWFwLCBAcGFyYW1zLmh4LCBAcGFyYW1zLmh5KVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBHcmFwaGljcy5zZXRDdXJzb3JCaXRtYXAobnVsbCwgMCwgMClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSZXNldEdsb2JhbERhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRSZXNldEdsb2JhbERhdGE6IC0+XG4gICAgICAgIEdhbWVNYW5hZ2VyLnJlc2V0R2xvYmFsRGF0YSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kU2NyaXB0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgIFxuICAgIGNvbW1hbmRTY3JpcHQ6IC0+XG4gICAgICAgIHRyeVxuICAgICAgICAgICAgaWYgIUBwYXJhbXMuc2NyaXB0RnVuY1xuICAgICAgICAgICAgICAgIEBwYXJhbXMuc2NyaXB0RnVuYyA9IGV2YWwoXCIoZnVuY3Rpb24oKXtcIiArIEBwYXJhbXMuc2NyaXB0ICsgXCJ9KVwiKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgQHBhcmFtcy5zY3JpcHRGdW5jKClcbiAgICAgICAgY2F0Y2ggZXhcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGV4KVxuICAgICAgICAgICAgXG53aW5kb3cuQ29tbWFuZEludGVycHJldGVyID0gQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuZ3MuQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlciA9IENvbXBvbmVudF9Db21tYW5kSW50ZXJwcmV0ZXJcbiAgICBcbiAgICAgICAgXG4gICAgICAgICJdfQ==
//# sourceURL=Component_CommandInterpreter_166.js