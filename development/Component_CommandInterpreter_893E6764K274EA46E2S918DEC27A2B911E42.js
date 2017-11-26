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
      AudioManager.stopAllSounds();
      AudioManager.stopAllMusic();
      AudioManager.stopAllVoices();
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
    return this.interpreter.isWaiting = !this.interpreter.isInstantSkip();
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
    if (isLocked(flags.bold)) {
      messageObject.font.bold = font.bold;
    }
    if (isLocked(flags.italic)) {
      messageObject.font.italic = font.italic;
    }
    if (isLocked(flags.smallCaps)) {
      return messageObject.font.smallCaps = font.smallCaps;
    }
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
    if (this.interpreter.isInstantSkip()) {
      return;
    }
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQVFBLElBQUEsaUVBQUE7RUFBQTs7O0FBQU07O0FBQ0Y7Ozs7Ozs7RUFPYSx5QkFBQTs7QUFDVDs7Ozs7SUFLQSxJQUFDLENBQUEsT0FBRCxHQUFXOztBQUVYOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBRVg7Ozs7Ozs7SUFPQSxJQUFDLENBQUEsZ0JBQUQsR0FBb0I7RUF0Qlg7Ozs7OztBQXdCakIsRUFBRSxDQUFDLGVBQUgsR0FBcUI7O0FBRWY7RUFDRixrQkFBQyxDQUFBLG9CQUFELEdBQXdCLENBQUMsT0FBRDs7O0FBRXhCOzs7Ozs7Ozs7Ozs7RUFXYSw0QkFBQyxFQUFELEVBQUssS0FBTDs7QUFDVDs7Ozs7SUFLQSxJQUFDLENBQUEsRUFBRCxHQUFNOztBQUVOOzs7OztJQUtBLElBQUMsQ0FBQSxLQUFELEdBQVM7RUFiQTs7O0FBZWI7Ozs7Ozs7K0JBTUEsR0FBQSxHQUFLLFNBQUMsRUFBRCxFQUFLLEtBQUw7SUFDRCxJQUFDLENBQUEsRUFBRCxHQUFNO1dBQ04sSUFBQyxDQUFBLEtBQUQsR0FBUztFQUZSOzs7Ozs7QUFJVCxFQUFFLENBQUMsa0JBQUgsR0FBd0I7O0FBRWxCOzs7RUFDRiw0QkFBQyxDQUFBLG9CQUFELEdBQXdCLENBQUMsUUFBRCxFQUFXLFNBQVgsRUFBc0IscUJBQXRCLEVBQTZDLHVCQUE3QyxFQUFzRSxvQkFBdEU7OztBQUV4Qjs7Ozs7Ozs7O3lDQVFBLG1CQUFBLEdBQXFCLFNBQUMsSUFBRCxFQUFPLE9BQVAsR0FBQTs7O0FBR3JCOzs7Ozs7Ozs7Ozs7O0VBWWEsc0NBQUE7SUFDVCw0REFBQTs7QUFFQTs7Ozs7SUFLQSxJQUFDLENBQUEsV0FBRCxHQUFlOztBQUVmOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBRVg7Ozs7OztJQU1BLElBQUMsQ0FBQSxVQUFELEdBQWM7O0FBRWQ7Ozs7OztJQU1BLElBQUMs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OztHQXBvTHdCLEVBQUUsQ0FBQzs7QUE2b0w5QyxNQUFNLENBQUMsa0JBQVAsR0FBNEI7O0FBQzVCLEVBQUUsQ0FBQyw0QkFBSCxHQUFrQyIsInNvdXJjZXNDb250ZW50IjpbIiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuI1xuIyAgIFNjcmlwdDogQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuI1xuIyAgICQkQ09QWVJJR0hUJCRcbiNcbiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jbGFzcyBMaXZlUHJldmlld0luZm9cbiAgICAjIyMqXG4gICAgKiBTdG9yZXMgaW50ZXJuYWwgcHJldmlldy1pbmZvIGlmIHRoZSBnYW1lIHJ1bnMgY3VycmVudGx5IGluIExpdmUtUHJldmlldy5cbiAgICAqICAgICAgICBcbiAgICAqIEBtb2R1bGUgZ3NcbiAgICAqIEBjbGFzcyBMaXZlUHJldmlld0luZm9cbiAgICAqIEBtZW1iZXJvZiBnc1xuICAgICMjI1xuICAgIGNvbnN0cnVjdG9yOiAtPlxuICAgICAgICAjIyMqXG4gICAgICAgICogVGltZXIgSUQgaWYgYSB0aW1lb3V0IGZvciBsaXZlLXByZXZpZXcgd2FzIGNvbmZpZ3VyZWQgdG8gZXhpdCB0aGUgZ2FtZSBsb29wIGFmdGVyIGEgY2VydGFpbiBhbW91bnQgb2YgdGltZS5cbiAgICAgICAgKiBAcHJvcGVydHkgdGltZW91dFxuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAjIyNcbiAgICAgICAgQHRpbWVvdXQgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqIFxuICAgICAgICAqIEluZGljYXRlcyBpZiBMaXZlLVByZXZpZXcgaXMgY3VycmVudGx5IHdhaXRpbmcgZm9yIHRoZSBuZXh0IHVzZXItYWN0aW9uLiAoU2VsZWN0aW5nIGFub3RoZXIgY29tbWFuZCwgZXRjLilcbiAgICAgICAgKiBAcHJvcGVydHkgd2FpdGluZyAgXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAjIyNcbiAgICAgICAgQHdhaXRpbmcgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIENvdW50cyB0aGUgYW1vdW50IG9mIGV4ZWN1dGVkIGNvbW1hbmRzIHNpbmNlIHRoZSBsYXN0IFxuICAgICAgICAqIGludGVycHJldGVyLXBhdXNlKHdhaXRpbmcsIGV0Yy4pLiBJZiBpdHMgbW9yZSB0aGFuIDUwMCwgdGhlIGludGVycHJldGVyIHdpbGwgYXV0b21hdGljYWxseSBwYXVzZSBmb3IgMSBmcmFtZSB0byBcbiAgICAgICAgKiBhdm9pZCB0aGF0IExpdmUtUHJldmlldyBmcmVlemVzIHRoZSBFZGl0b3IgaW4gY2FzZSBvZiBlbmRsZXNzIGxvb3BzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBleGVjdXRlZENvbW1hbmRzXG4gICAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAgICMjI1xuICAgICAgICBAZXhlY3V0ZWRDb21tYW5kcyA9IDBcbiAgICAgICAgXG5ncy5MaXZlUHJldmlld0luZm8gPSBMaXZlUHJldmlld0luZm9cbiAgICAgICAgXG5jbGFzcyBJbnRlcnByZXRlckNvbnRleHRcbiAgICBAb2JqZWN0Q29kZWNCbGFja0xpc3QgPSBbXCJvd25lclwiXVxuICAgIFxuICAgICMjIypcbiAgICAqIERlc2NyaWJlcyBhbiBpbnRlcnByZXRlci1jb250ZXh0IHdoaWNoIGhvbGRzIGluZm9ybWF0aW9uIGFib3V0XG4gICAgKiB0aGUgaW50ZXJwcmV0ZXIncyBvd25lciBhbmQgYWxzbyB1bmlxdWUgSUQgdXNlZCBmb3IgYWNjZXNzaW5nIGNvcnJlY3RcbiAgICAqIGxvY2FsIHZhcmlhYmxlcy5cbiAgICAqXG4gICAgKiBAbW9kdWxlIGdzXG4gICAgKiBAY2xhc3MgSW50ZXJwcmV0ZXJDb250ZXh0XG4gICAgKiBAbWVtYmVyb2YgZ3NcbiAgICAqIEBwYXJhbSB7bnVtYmVyfHN0cmluZ30gaWQgLSBBIHVuaXF1ZSBJRFxuICAgICogQHBhcmFtIHtPYmplY3R9IG93bmVyIC0gVGhlIG93bmVyIG9mIHRoZSBpbnRlcnByZXRlclxuICAgICMjI1xuICAgIGNvbnN0cnVjdG9yOiAoaWQsIG93bmVyKSAtPlxuICAgICAgICAjIyMqXG4gICAgICAgICogQSB1bmlxdWUgbnVtZXJpYyBvciB0ZXh0dWFsIElEIHVzZWQgZm9yIGFjY2Vzc2luZyBjb3JyZWN0IGxvY2FsIHZhcmlhYmxlcy5cbiAgICAgICAgKiBAcHJvcGVydHkgaWRcbiAgICAgICAgKiBAdHlwZSBudW1iZXJ8c3RyaW5nXG4gICAgICAgICMjI1xuICAgICAgICBAaWQgPSBpZFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBvd25lciBvZiB0aGUgaW50ZXJwcmV0ZXIgKGUuZy4gY3VycmVudCBzY2VuZSwgZXRjLikuXG4gICAgICAgICogQHByb3BlcnR5IG93bmVyXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjI1xuICAgICAgICBAb3duZXIgPSBvd25lclxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIGNvbnRleHQncyBkYXRhLlxuICAgICogQHBhcmFtIHtudW1iZXJ8c3RyaW5nfSBpZCAtIEEgdW5pcXVlIElEXG4gICAgKiBAcGFyYW0ge09iamVjdH0gb3duZXIgLSBUaGUgb3duZXIgb2YgdGhlIGludGVycHJldGVyXG4gICAgKiBAbWV0aG9kIHNldFxuICAgICMjIyAgICBcbiAgICBzZXQ6IChpZCwgb3duZXIpIC0+XG4gICAgICAgIEBpZCA9IGlkXG4gICAgICAgIEBvd25lciA9IG93bmVyXG4gICAgICAgIFxuZ3MuSW50ZXJwcmV0ZXJDb250ZXh0ID0gSW50ZXJwcmV0ZXJDb250ZXh0XG5cbmNsYXNzIENvbXBvbmVudF9Db21tYW5kSW50ZXJwcmV0ZXIgZXh0ZW5kcyBncy5Db21wb25lbnRcbiAgICBAb2JqZWN0Q29kZWNCbGFja0xpc3QgPSBbXCJvYmplY3RcIiwgXCJjb21tYW5kXCIsIFwib25NZXNzYWdlQURWV2FpdGluZ1wiLCBcIm9uTWVzc2FnZUFEVkRpc2FwcGVhclwiLCBcIm9uTWVzc2FnZUFEVkZpbmlzaFwiXVxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCBpZiB0aGlzIG9iamVjdCBpbnN0YW5jZSBpcyByZXN0b3JlZCBmcm9tIGEgZGF0YS1idW5kbGUuIEl0IGNhbiBiZSB1c2VkXG4gICAgKiByZS1hc3NpZ24gZXZlbnQtaGFuZGxlciwgYW5vbnltb3VzIGZ1bmN0aW9ucywgZXRjLlxuICAgICogXG4gICAgKiBAbWV0aG9kIG9uRGF0YUJ1bmRsZVJlc3RvcmUuXG4gICAgKiBAcGFyYW0gT2JqZWN0IGRhdGEgLSBUaGUgZGF0YS1idW5kbGVcbiAgICAqIEBwYXJhbSBncy5PYmplY3RDb2RlY0NvbnRleHQgY29udGV4dCAtIFRoZSBjb2RlYy1jb250ZXh0LlxuICAgICMjI1xuICAgIG9uRGF0YUJ1bmRsZVJlc3RvcmU6IChkYXRhLCBjb250ZXh0KSAtPlxuICAgIFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBBIGNvbXBvbmVudCB3aGljaCBhbGxvd3MgYSBnYW1lIG9iamVjdCB0byBwcm9jZXNzIGNvbW1hbmRzIGxpa2UgZm9yXG4gICAgKiBzY2VuZS1vYmplY3RzLiBGb3IgZWFjaCBjb21tYW5kIGEgY29tbWFuZC1mdW5jdGlvbiBleGlzdHMuIFRvIGFkZFxuICAgICogb3duIGN1c3RvbSBjb21tYW5kcyB0byB0aGUgaW50ZXJwcmV0ZXIganVzdCBjcmVhdGUgYSBzdWItY2xhc3MgYW5kXG4gICAgKiBvdmVycmlkZSB0aGUgZ3MuQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlci5hc3NpZ25Db21tYW5kIG1ldGhvZFxuICAgICogYW5kIGFzc2lnbiB0aGUgY29tbWFuZC1mdW5jdGlvbiBmb3IgeW91ciBjdXN0b20tY29tbWFuZC5cbiAgICAqXG4gICAgKiBAbW9kdWxlIGdzXG4gICAgKiBAY2xhc3MgQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuICAgICogQGV4dGVuZHMgZ3MuQ29tcG9uZW50XG4gICAgKiBAbWVtYmVyb2YgZ3NcbiAgICAjIyNcbiAgICBjb25zdHJ1Y3RvcjogKCkgLT5cbiAgICAgICAgc3VwZXIoKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFdhaXQtQ291bnRlciBpbiBmcmFtZXMuIElmIGdyZWF0ZXIgdGhhbiAwLCB0aGUgaW50ZXJwcmV0ZXIgd2lsbCBmb3IgdGhhdCBhbW91bnQgb2YgZnJhbWVzIGJlZm9yZSBjb250aW51ZS5cbiAgICAgICAgKiBAcHJvcGVydHkgd2FpdENvdW50ZXJcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgIyMjXG4gICAgICAgIEB3YWl0Q291bnRlciA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBJbmRleCB0byB0aGUgbmV4dCBjb21tYW5kIHRvIGV4ZWN1dGUuXG4gICAgICAgICogQHByb3BlcnR5IHBvaW50ZXJcbiAgICAgICAgKiBAdHlwZSBudW1iZXJcbiAgICAgICAgIyMjXG4gICAgICAgIEBwb2ludGVyID0gMFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBzdGF0ZXMgb2YgY29uZGl0aW9ucy5cbiAgICAgICAgKiBAcHJvcGVydHkgY29uZGl0aW9uc1xuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBjb25kaXRpb25zID0gW11cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBTdG9yZXMgc3RhdGVzIG9mIGxvb3BzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBsb29wc1xuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBsb29wcyA9IFtdXG4gICAgICAgIFxuICAgICAgICAjIEZJWE1FOiBTaG91bGQgbm90IGJlIHN0b3JlZCBpbiB0aGUgaW50ZXJwcmV0ZXIuXG4gICAgICAgIEB0aW1lcnMgPSBbXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgaXMgY3VycmVudGx5IHJ1bm5pbmcuXG4gICAgICAgICogQHByb3BlcnR5IGlzUnVubmluZ1xuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgKiBAcmVhZE9ubHlcbiAgICAgICAgIyMjXG4gICAgICAgIEBpc1J1bm5pbmcgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgaXMgY3VycmVudGx5IHdhaXRpbmcuXG4gICAgICAgICogQHByb3BlcnR5IGlzV2FpdGluZ1xuICAgICAgICAqIEB0eXBlIGJvb2xlYW5cbiAgICAgICAgIyMjXG4gICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEluZGljYXRlcyBpZiB0aGUgaW50ZXJwcmV0ZXIgaXMgY3VycmVudGx5IHdhaXRpbmcgdW50aWwgYSBtZXNzYWdlIHByb2Nlc3NlZCBieSBhbm90aGVyIGNvbnRleHQgbGlrZSBhIENvbW1vbiBFdmVudFxuICAgICAgICAqIGlzIGZpbmlzaGVkLlxuICAgICAgICAqIEZJWE1FOiBDb25mbGljdCBoYW5kbGluZyBjYW4gYmUgcmVtb3ZlZCBtYXliZS4gXG4gICAgICAgICogQHByb3BlcnR5IGlzV2FpdGluZ0Zvck1lc3NhZ2VcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICMjI1xuICAgICAgICBAaXNXYWl0aW5nRm9yTWVzc2FnZSA9IG5vXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3RvcmVzIGludGVybmFsIHByZXZpZXctaW5mbyBpZiB0aGUgZ2FtZSBydW5zIGN1cnJlbnRseSBpbiBMaXZlLVByZXZpZXcuXG4gICAgICAgICogPHVsPlxuICAgICAgICAqIDxsaT5wcmV2aWV3SW5mby50aW1lb3V0IC0gVGltZXIgSUQgaWYgYSB0aW1lb3V0IGZvciBsaXZlLXByZXZpZXcgd2FzIGNvbmZpZ3VyZWQgdG8gZXhpdCB0aGUgZ2FtZSBsb29wIGFmdGVyIGEgY2VydGFpbiBhbW91bnQgb2YgdGltZS48L2xpPlxuICAgICAgICAqIDxsaT5wcmV2aWV3SW5mby53YWl0aW5nIC0gSW5kaWNhdGVzIGlmIExpdmUtUHJldmlldyBpcyBjdXJyZW50bHkgd2FpdGluZyBmb3IgdGhlIG5leHQgdXNlci1hY3Rpb24uIChTZWxlY3RpbmcgYW5vdGhlciBjb21tYW5kLCBldGMuKTwvbGk+XG4gICAgICAgICogPGxpPnByZXZpZXdJbmZvLmV4ZWN1dGVkQ29tbWFuZHMgLSBDb3VudHMgdGhlIGFtb3VudCBvZiBleGVjdXRlZCBjb21tYW5kcyBzaW5jZSB0aGUgbGFzdCBcbiAgICAgICAgKiBpbnRlcnByZXRlci1wYXVzZSh3YWl0aW5nLCBldGMuKS4gSWYgaXRzIG1vcmUgdGhhbiA1MDAsIHRoZSBpbnRlcnByZXRlciB3aWxsIGF1dG9tYXRpY2FsbHkgcGF1c2UgZm9yIDEgZnJhbWUgdG8gXG4gICAgICAgICogYXZvaWQgdGhhdCBMaXZlLVByZXZpZXcgZnJlZXplcyB0aGUgRWRpdG9yIGluIGNhc2Ugb2YgZW5kbGVzcyBsb29wcy48L2xpPlxuICAgICAgICAqIDwvdWw+XG4gICAgICAgICogQHByb3BlcnR5IHByZXZpZXdJbmZvXG4gICAgICAgICogQHR5cGUgYm9vbGVhblxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBwcmV2aWV3SW5mbyA9IG5ldyBncy5MaXZlUHJldmlld0luZm8oKVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBMaXZlLVByZXZpZXcgcmVsYXRlZCBpbmZvIHBhc3NlZCBmcm9tIHRoZSBWTiBNYWtlciBlZGl0b3IgbGlrZSB0aGUgY29tbWFuZC1pbmRleCB0aGUgcGxheWVyIGNsaWNrZWQgb24sIGV0Yy5cbiAgICAgICAgKiBAcHJvcGVydHkgcHJldmlld0RhdGFcbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAcHJldmlld0RhdGEgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogSW5kaWNhdGVzIGlmIHRoZSBpbnRlcnByZXRlciBhdXRvbWF0aWNhbGx5IHJlcGVhdHMgZXhlY3V0aW9uIGFmdGVyIHRoZSBsYXN0IGNvbW1hbmQgd2FzIGV4ZWN1dGVkLlxuICAgICAgICAqIEBwcm9wZXJ0eSByZXBlYXRcbiAgICAgICAgKiBAdHlwZSBib29sZWFuXG4gICAgICAgICMjI1xuICAgICAgICBAcmVwZWF0ID0gbm9cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZXhlY3V0aW9uIGNvbnRleHQgb2YgdGhlIGludGVycHJldGVyLlxuICAgICAgICAqIEBwcm9wZXJ0eSBjb250ZXh0XG4gICAgICAgICogQHR5cGUgZ3MuSW50ZXJwcmV0ZXJDb250ZXh0XG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQGNvbnRleHQgPSBuZXcgZ3MuSW50ZXJwcmV0ZXJDb250ZXh0KDAsIG51bGwpXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogU3ViLUludGVycHJldGVyIGZyb20gYSBDb21tb24gRXZlbnQgQ2FsbC4gVGhlIGludGVycHJldGVyIHdpbGwgd2FpdCB1bnRpbCB0aGUgc3ViLWludGVycHJldGVyIGlzIGRvbmUgYW5kIHNldCBiYWNrIHRvXG4gICAgICAgICogPGI+bnVsbDwvYj4uXG4gICAgICAgICogQHByb3BlcnR5IHN1YkludGVycHJldGVyXG4gICAgICAgICogQHR5cGUgZ3MuQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlclxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBzdWJJbnRlcnByZXRlciA9IG51bGxcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBDdXJyZW50IGluZGVudC1sZXZlbCBvZiBleGVjdXRpb25cbiAgICAgICAgKiBAcHJvcGVydHkgaW5kZW50XG4gICAgICAgICogQHR5cGUgbnVtYmVyXG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQGluZGVudCA9IDBcbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBTdG9yZXMgaW5mb3JtYXRpb24gYWJvdXQgZm9yIHdoYXQgdGhlIGludGVycHJldGVyIGlzIGN1cnJlbnRseSB3YWl0aW5nIGZvciBsaWtlIGZvciBhIEFEViBtZXNzYWdlLCBldGMuIHRvXG4gICAgICAgICogcmVzdG9yZSBwcm9iYWJseSB3aGVuIGxvYWRlZCBmcm9tIGEgc2F2ZS1nYW1lLlxuICAgICAgICAqIEBwcm9wZXJ0eSB3YWl0aW5nRm9yXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICogQHByb3RlY3RlZFxuICAgICAgICAjIyNcbiAgICAgICAgQHdhaXRpbmdGb3IgPSB7fVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBpbnRlcnByZXRlciByZWxhdGVkIHNldHRpbmdzIGxpa2UgaG93IHRvIGhhbmRsZSBtZXNzYWdlcywgZXRjLlxuICAgICAgICAqIEBwcm9wZXJ0eSBzZXR0aW5nc1xuICAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICAqIEBwcm90ZWN0ZWRcbiAgICAgICAgIyMjXG4gICAgICAgIEBzZXR0aW5ncyA9IHsgbWVzc2FnZTogeyBieUlkOiB7fSwgYXV0b0VyYXNlOiB5ZXMsIHdhaXRBdEVuZDogeWVzLCBiYWNrbG9nOiB5ZXMgfSwgc2NyZWVuOiB7IHBhbjogbmV3IGdzLlBvaW50KDAsIDApIH0gfVxuICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogTWFwcGluZyB0YWJsZSB0byBxdWlja2x5IGdldCB0aGUgYW5jaG9yIHBvaW50IGZvciB0aGUgYW4gaW5zZXJ0ZWQgYW5jaG9yLXBvaW50IGNvbnN0YW50IHN1Y2ggYXNcbiAgICAgICAgKiBUb3AtTGVmdCgwKSwgVG9wKDEpLCBUb3AtUmlnaHQoMikgYW5kIHNvIG9uLlxuICAgICAgICAqIEBwcm9wZXJ0eSBncmFwaGljQW5jaG9yUG9pbnRzQnlDb25zdGFudFxuICAgICAgICAqIEB0eXBlIGdzLlBvaW50W11cbiAgICAgICAgKiBAcHJvdGVjdGVkXG4gICAgICAgICMjI1xuICAgICAgICBAZ3JhcGhpY0FuY2hvclBvaW50c0J5Q29uc3RhbnQgPSBbXG4gICAgICAgICAgICBuZXcgZ3MuUG9pbnQoMC4wLCAwLjApLFxuICAgICAgICAgICAgbmV3IGdzLlBvaW50KDAuNSwgMC4wKSxcbiAgICAgICAgICAgIG5ldyBncy5Qb2ludCgxLjAsIDAuMCksXG4gICAgICAgICAgICBuZXcgZ3MuUG9pbnQoMS4wLCAwLjUpLFxuICAgICAgICAgICAgbmV3IGdzLlBvaW50KDEuMCwgMS4wKSxcbiAgICAgICAgICAgIG5ldyBncy5Qb2ludCgwLjUsIDEuMCksXG4gICAgICAgICAgICBuZXcgZ3MuUG9pbnQoMC4wLCAxLjApLFxuICAgICAgICAgICAgbmV3IGdzLlBvaW50KDAuMCwgMC41KSxcbiAgICAgICAgICAgIG5ldyBncy5Qb2ludCgwLjUsIDAuNSlcbiAgICAgICAgXVxuICAgICAgICBcbiAgICBvbkhvdHNwb3RDbGljazogKGUsIGRhdGEpIC0+IFxuICAgICAgICBAZXhlY3V0ZUFjdGlvbihkYXRhLnBhcmFtcy5hY3Rpb25zLm9uQ2xpY2ssIG5vLCBkYXRhLmJpbmRWYWx1ZSlcbiAgICAgICAgXG4gICAgb25Ib3RzcG90RW50ZXI6IChlLCBkYXRhKSAtPiBcbiAgICAgICAgQGV4ZWN1dGVBY3Rpb24oZGF0YS5wYXJhbXMuYWN0aW9ucy5vbkVudGVyLCB5ZXMsIGRhdGEuYmluZFZhbHVlKVxuICAgICAgICBcbiAgICBvbkhvdHNwb3RMZWF2ZTogKGUsIGRhdGEpIC0+IFxuICAgICAgICBAZXhlY3V0ZUFjdGlvbihkYXRhLnBhcmFtcy5hY3Rpb25zLm9uTGVhdmUsIG5vLCBkYXRhLmJpbmRWYWx1ZSlcbiAgICBvbkhvdHNwb3REcmFnU3RhcnQ6IChlLCBkYXRhKSAtPiBcbiAgICAgICAgQGV4ZWN1dGVBY3Rpb24oZGF0YS5wYXJhbXMuYWN0aW9ucy5vbkRyYWcsIHllcywgZGF0YS5iaW5kVmFsdWUpXG4gICAgb25Ib3RzcG90RHJhZzogKGUsIGRhdGEpIC0+IFxuICAgICAgICBAZXhlY3V0ZUFjdGlvbihkYXRhLnBhcmFtcy5hY3Rpb25zLm9uRHJhZywgeWVzLCBkYXRhLmJpbmRWYWx1ZSlcbiAgICBvbkhvdHNwb3REcmFnRW5kOiAoZSwgZGF0YSkgLT4gXG4gICAgICAgIEBleGVjdXRlQWN0aW9uKGRhdGEucGFyYW1zLmFjdGlvbnMub25EcmFnLCBubywgZGF0YS5iaW5kVmFsdWUpXG4gICAgb25Ib3RzcG90U3RhdGVDaGFuZ2VkOiAoZSwgcGFyYW1zKSAtPiBcbiAgICAgICAgaWYgZS5zZW5kZXIuYmVoYXZpb3Iuc2VsZWN0ZWRcbiAgICAgICAgICAgIEBleGVjdXRlQWN0aW9uKHBhcmFtcy5hY3Rpb25zLm9uU2VsZWN0LCB5ZXMpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBleGVjdXRlQWN0aW9uKHBhcmFtcy5hY3Rpb25zLm9uRGVzZWxlY3QsIG5vKVxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIHdoZW4gYSBBRFYgbWVzc2FnZSBmaW5pc2hlZCByZW5kZXJpbmcgYW5kIGlzIG5vdyB3YWl0aW5nXG4gICAgKiBmb3IgdGhlIHVzZXIvYXV0b20tbWVzc2FnZSB0aW1lciB0byBwcm9jZWVkLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlQURWV2FpdGluZ1xuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgIFxuICAgIG9uTWVzc2FnZUFEVldhaXRpbmc6IChlKSAtPlxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZS5zZW5kZXIub2JqZWN0XG4gICAgICAgIGlmICFAbWVzc2FnZVNldHRpbmdzKCkud2FpdEF0RW5kXG4gICAgICAgICAgICBpZiBlLmRhdGEucGFyYW1zLndhaXRGb3JDb21wbGV0aW9uXG4gICAgICAgICAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LnRleHRSZW5kZXJlci5pc1dhaXRpbmcgPSBub1xuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC50ZXh0UmVuZGVyZXIuaXNSdW5uaW5nID0gbm9cbiAgICAgICAgbWVzc2FnZU9iamVjdC5ldmVudHMub2ZmIFwid2FpdGluZ1wiLCBlLmhhbmRsZXJcbiAgICAgICAgXG4gICAgICAgIGlmIEBtZXNzYWdlU2V0dGluZ3MoKS5iYWNrbG9nIGFuZCAobWVzc2FnZU9iamVjdC5zZXR0aW5ncy5hdXRvRXJhc2Ugb3IgbWVzc2FnZU9iamVjdC5zZXR0aW5ncy5wYXJhZ3JhcGhTcGFjaW5nID4gMClcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLmJhY2tsb2cucHVzaCh7IGNoYXJhY3RlcjogbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIsIG1lc3NhZ2U6IG1lc3NhZ2VPYmplY3QuYmVoYXZpb3IubWVzc2FnZSwgY2hvaWNlczogW10gfSkgXG4gICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGFuIEFEViBtZXNzYWdlIGZpbmlzaGVkIGZhZGUtb3V0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlQURWRGlzYXBwZWFyXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEV2ZW50IE9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgZGF0YS5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgb25NZXNzYWdlQURWRGlzYXBwZWFyOiAobWVzc2FnZU9iamVjdCwgd2FpdEZvckNvbXBsZXRpb24pIC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5jdXJyZW50Q2hhcmFjdGVyID0geyBuYW1lOiBcIlwiIH1cbiAgICAgICAgbWVzc2FnZU9iamVjdC5iZWhhdmlvci5jbGVhcigpXG4gICAgICAgIG1lc3NhZ2VPYmplY3QudmlzaWJsZSA9IG5vXG4gICAgICAgIFxuICAgICAgICBpZiB3YWl0Rm9yQ29tcGxldGlvbiAgICBcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBAd2FpdGluZ0Zvci5tZXNzYWdlQURWID0gbnVsbFxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGFuIEFEViBtZXNzYWdlIGZpbmlzaGVkIGNsZWFyLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlQURWQ2xlYXJcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhLlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgb25NZXNzYWdlQURWQ2xlYXI6IChtZXNzYWdlT2JqZWN0LCB3YWl0Rm9yQ29tcGxldGlvbikgLT5cbiAgICAgICAgbWVzc2FnZU9iamVjdCA9IEB0YXJnZXRNZXNzYWdlKClcbiAgICAgICAgaWYgQG1lc3NhZ2VTZXR0aW5ncygpLmJhY2tsb2cgICBcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLmJhY2tsb2cucHVzaCh7IGNoYXJhY3RlcjogbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIsIG1lc3NhZ2U6IG1lc3NhZ2VPYmplY3QuYmVoYXZpb3IubWVzc2FnZSwgY2hvaWNlczogW10gfSkgXG4gICAgICAgIEBvbk1lc3NhZ2VBRFZEaXNhcHBlYXIobWVzc2FnZU9iamVjdCwgd2FpdEZvckNvbXBsZXRpb24pXG4gICAgICAgIFxuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIGhvdHNwb3QvaW1hZ2UtbWFwIHNlbmRzIGEgXCJqdW1wVG9cIiBldmVudCB0byBsZXQgdGhlXG4gICAgKiBpbnRlcnByZXRlciBqdW1wIHRvIHRoZSBwb3NpdGlvbiBkZWZpbmVkIGluIHRoZSBldmVudCBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBvbkp1bXBUb1xuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBvbkp1bXBUbzogKGUpIC0+XG4gICAgICAgIEBqdW1wVG9MYWJlbChlLmxhYmVsKVxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIHdoZW4gYSBob3RzcG90L2ltYWdlLW1hcCBzZW5kcyBhIFwiY2FsbENvbW1vbkV2ZW50XCIgZXZlbnQgdG8gbGV0IHRoZVxuICAgICogaW50ZXJwcmV0ZXIgY2FsbCB0aGUgY29tbW9uIGV2ZW50IGRlZmluZWQgaW4gdGhlIGV2ZW50IG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uSnVtcFRvXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEV2ZW50IE9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgZGF0YS5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIG9uQ2FsbENvbW1vbkV2ZW50OiAoZSkgLT5cbiAgICAgICAgQGNhbGxDb21tb25FdmVudChlLmNvbW1vbkV2ZW50SWQsIGUucGFyYW1zIHx8IFtdLCAhZS5maW5pc2gpXG4gICAgICAgIEBpc1dhaXRpbmcgPSBlLndhaXRpbmcgPyBub1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIEFEViBtZXNzYWdlIGZpbmlzaGVzLiBcbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uTWVzc2FnZU5WTEZpbmlzaFxuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBvbk1lc3NhZ2VBRFZGaW5pc2g6IChlKSAtPlxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZS5zZW5kZXIub2JqZWN0IFxuICBcbiAgICAgICAgaWYgbm90IEBtZXNzYWdlU2V0dGluZ3MoKS53YWl0QXRFbmQgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEdhbWVNYW5hZ2VyLmdsb2JhbERhdGEubWVzc2FnZXNbbGNzbShlLmRhdGEucGFyYW1zLm1lc3NhZ2UpXSA9IHsgcmVhZDogeWVzIH1cbiAgICAgICAgR2FtZU1hbmFnZXIuc2F2ZUdsb2JhbERhdGEoKVxuICAgICAgICBpZiBlLmRhdGEucGFyYW1zLndhaXRGb3JDb21wbGV0aW9uXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgQHdhaXRpbmdGb3IubWVzc2FnZUFEViA9IG51bGxcbiAgICAgICAgcG9pbnRlciA9IEBwb2ludGVyXG4gICAgICAgIGNvbW1hbmRzID0gQG9iamVjdC5jb21tYW5kc1xuICAgICAgICBcbiAgICAgICAgbWVzc2FnZU9iamVjdC5ldmVudHMub2ZmIFwiZmluaXNoXCIsIGUuaGFuZGxlclxuICAgICAgICAjbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBpZiBtZXNzYWdlT2JqZWN0LnZvaWNlPyBhbmQgR2FtZU1hbmFnZXIuc2V0dGluZ3Muc2tpcFZvaWNlT25BY3Rpb25cbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5zdG9wU291bmQobWVzc2FnZU9iamVjdC52b2ljZS5uYW1lKVxuICAgICAgICBcbiAgICAgICAgaWYgbm90IEBpc01lc3NhZ2VDb21tYW5kKHBvaW50ZXIsIGNvbW1hbmRzKSBhbmQgQG1lc3NhZ2VTZXR0aW5ncygpLmF1dG9FcmFzZVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRpbmdGb3IubWVzc2FnZUFEViA9IGUuZGF0YS5wYXJhbXNcbiAgICAgICAgXG4gICAgICAgICAgICBmYWRpbmcgPSBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3MubWVzc2FnZUZhZGluZ1xuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCB0aGVuIDAgZWxzZSBmYWRpbmcuZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC53YWl0Rm9yQ29tcGxldGlvbiA9IGUuZGF0YS5wYXJhbXMud2FpdEZvckNvbXBsZXRpb25cbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuYW5pbWF0b3IuZGlzYXBwZWFyKGZhZGluZy5hbmltYXRpb24sIGZhZGluZy5lYXNpbmcsIGR1cmF0aW9uLCBncy5DYWxsQmFjayhcIm9uTWVzc2FnZUFEVkRpc2FwcGVhclwiLCB0aGlzLCBlLmRhdGEucGFyYW1zLndhaXRGb3JDb21wbGV0aW9uKSlcblxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGEgY29tbW9uIGV2ZW50IGZpbmlzaGVkIGV4ZWN1dGlvbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uQ29tbW9uRXZlbnRGaW5pc2hcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhLlxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIG9uQ29tbW9uRXZlbnRGaW5pc2g6IChlKSAtPiAgICBcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmNvbW1vbkV2ZW50Q29udGFpbmVyLnJlbW92ZU9iamVjdChlLnNlbmRlci5vYmplY3QpXG4gICAgICAgIGUuc2VuZGVyLm9iamVjdC5ldmVudHMub2ZmIFwiZmluaXNoXCJcbiAgICAgICAgQHN1YkludGVycHJldGVyID0gbnVsbFxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgd2hlbiBhIHNjZW5lIGNhbGwgZmluaXNoZWQgZXhlY3V0aW9uLlxuICAgICpcbiAgICAqIEBtZXRob2Qgb25DYWxsU2NlbmVGaW5pc2hcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZW5kZXIgLSBUaGUgc2VuZGVyIG9mIHRoaXMgZXZlbnQuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIG9uQ2FsbFNjZW5lRmluaXNoOiAoc2VuZGVyKSAtPlxuICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICAgICAgQHN1YkludGVycHJldGVyID0gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTZXJpYWxpemVzIHRoZSBpbnRlcnByZXRlciBpbnRvIGEgZGF0YS1idW5kbGUuXG4gICAgKlxuICAgICogQG1ldGhvZCB0b0RhdGFCdW5kbGVcbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGRhdGEtYnVuZGxlLlxuICAgICMjIyAgIFxuICAgIHRvRGF0YUJ1bmRsZTogLT5cbiAgICAgICAgaWYgQGlzSW5wdXREYXRhQ29tbWFuZChNYXRoLm1heChAcG9pbnRlciAtIDEsIDApLCBAb2JqZWN0LmNvbW1hbmRzKSBcbiAgICAgICAgICAgIHBvaW50ZXI6IE1hdGgubWF4KEBwb2ludGVyIC0gMSAsIDApLFxuICAgICAgICAgICAgY2hvaWNlOiBAY2hvaWNlLCBcbiAgICAgICAgICAgIGNvbmRpdGlvbnM6IEBjb25kaXRpb25zLCBcbiAgICAgICAgICAgIGxvb3BzOiBAbG9vcHMsXG4gICAgICAgICAgICBsYWJlbHM6IEBsYWJlbHMsXG4gICAgICAgICAgICBpc1dhaXRpbmc6IG5vLFxuICAgICAgICAgICAgaXNSdW5uaW5nOiBAaXNSdW5uaW5nLFxuICAgICAgICAgICAgd2FpdENvdW50ZXI6IEB3YWl0Q291bnRlcixcbiAgICAgICAgICAgIHdhaXRpbmdGb3I6IEB3YWl0aW5nRm9yLFxuICAgICAgICAgICAgaW5kZW50OiBAaW5kZW50LFxuICAgICAgICAgICAgc2V0dGluZ3M6IEBzZXR0aW5nc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBwb2ludGVyOiBAcG9pbnRlcixcbiAgICAgICAgICAgIGNob2ljZTogQGNob2ljZSwgXG4gICAgICAgICAgICBjb25kaXRpb25zOiBAY29uZGl0aW9ucywgXG4gICAgICAgICAgICBsb29wczogQGxvb3BzLFxuICAgICAgICAgICAgbGFiZWxzOiBAbGFiZWxzLFxuICAgICAgICAgICAgaXNXYWl0aW5nOiBAaXNXYWl0aW5nLFxuICAgICAgICAgICAgaXNSdW5uaW5nOiBAaXNSdW5uaW5nLFxuICAgICAgICAgICAgd2FpdENvdW50ZXI6IEB3YWl0Q291bnRlcixcbiAgICAgICAgICAgIHdhaXRpbmdGb3I6IEB3YWl0aW5nRm9yLFxuICAgICAgICAgICAgaW5kZW50OiBAaW5kZW50LFxuICAgICAgICAgICAgc2V0dGluZ3M6IEBzZXR0aW5nc1xuICAgIFxuICAgICMjIypcbiAgICAjIFByZXZpZXdzIHRoZSBjdXJyZW50IHNjZW5lIGF0IHRoZSBzcGVjaWZpZWQgcG9pbnRlci4gVGhpcyBtZXRob2QgaXMgY2FsbGVkIGZyb20gdGhlXG4gICAgIyBWTiBNYWtlciBTY2VuZS1FZGl0b3IgaWYgbGl2ZS1wcmV2aWV3IGlzIGVuYWJsZWQgYW5kIHRoZSB1c2VyIGNsaWNrZWQgb24gYSBjb21tYW5kLlxuICAgICNcbiAgICAjIEBtZXRob2QgcHJldmlld1xuICAgICMjI1xuICAgIHByZXZpZXc6IC0+XG4gICAgICAgIHRyeVxuICAgICAgICAgICAgcmV0dXJuIGlmICEkUEFSQU1TLnByZXZpZXcgb3IgISRQQVJBTVMucHJldmlldy5zY2VuZVxuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BBbGxTb3VuZHMoKVxuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BBbGxNdXNpYygpXG4gICAgICAgICAgICBBdWRpb01hbmFnZXIuc3RvcEFsbFZvaWNlcygpXG4gICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZXMgPSBbXVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIuc2V0dXBDdXJzb3IoKVxuICAgICAgICAgICAgQHByZXZpZXdEYXRhID0gJFBBUkFNUy5wcmV2aWV3XG4gICAgICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIuZW1pdChcInByZXZpZXdSZXN0YXJ0XCIpXG4gICAgICAgICAgICBpZiBAcHJldmlld0luZm8udGltZW91dFxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dChAcHJldmlld0luZm8udGltZW91dClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIEdyYXBoaWNzLnN0b3BwZWRcbiAgICAgICAgICAgICAgICBHcmFwaGljcy5zdG9wcGVkID0gbm9cbiAgICAgICAgICAgICAgICBHcmFwaGljcy5vbkVhY2hGcmFtZShncy5NYWluLmZyYW1lQ2FsbGJhY2spXG4gICAgICAgICAgIFxuICAgICAgICAgICAgc2NlbmUgPSBuZXcgdm4uT2JqZWN0X1NjZW5lKCkgXG4gICAgICAgIFxuICAgICAgICAgICAgc2NlbmUuc2NlbmVEYXRhLnVpZCA9IEBwcmV2aWV3RGF0YS5zY2VuZS51aWQgICAgXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIuc3dpdGNoVG8oc2NlbmUpXG4gICAgICAgIGNhdGNoIGV4XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oZXgpXG4gICAgXG4gICAgIyMjKlxuICAgICMgU2V0cyB1cCB0aGUgaW50ZXJwcmV0ZXIuXG4gICAgI1xuICAgICMgQG1ldGhvZCBzZXR1cFxuICAgICMjIyAgICBcbiAgICBzZXR1cDogLT5cbiAgICAgICAgQHByZXZpZXdEYXRhID0gJFBBUkFNUy5wcmV2aWV3XG4gICAgICAgIGlmIEBwcmV2aWV3RGF0YVxuICAgICAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9uIFwibW91c2VEb3duXCIsICg9PlxuICAgICAgICAgICAgICAgIGlmIEBwcmV2aWV3SW5mby53YWl0aW5nXG4gICAgICAgICAgICAgICAgICAgIGlmIEBwcmV2aWV3SW5mby50aW1lb3V0XG4gICAgICAgICAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQoQHByZXZpZXdJbmZvLnRpbWVvdXQpXG4gICAgICAgICAgICAgICAgICAgIEBwcmV2aWV3SW5mby53YWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICAgICAgI0Bpc1dhaXRpbmcgPSBub1xuICAgICAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCA9IG5vXG4gICAgICAgICAgICAgICAgICAgIEBwcmV2aWV3RGF0YSA9IG51bGxcbiAgICAgICAgICAgICAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLmVtaXQoXCJwcmV2aWV3UmVzdGFydFwiKVxuICAgICAgICAgICAgICAgICksIG51bGwsIEBvYmplY3RcbiAgICAgXG4gICAgIyMjKlxuICAgICMgRGlzcG9zZXMgdGhlIGludGVycHJldGVyLlxuICAgICNcbiAgICAjIEBtZXRob2QgZGlzcG9zZVxuICAgICMjIyAgICAgICBcbiAgICBkaXNwb3NlOiAtPlxuICAgICAgICBpZiBAcHJldmlld0RhdGFcbiAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwibW91c2VEb3duXCIsIEBvYmplY3QpXG4gICAgICAgICBcbiAgICAgICAgICAgXG4gICAgICAgIHN1cGVyXG4gICAgIFxuICAgICBcbiAgICBpc0luc3RhbnRTa2lwOiAtPiBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCBhbmQgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBUaW1lID09IDAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBSZXN0b3JlcyB0aGUgaW50ZXJwcmV0ZXIgZnJvbSBhIGRhdGEtYnVuZGxlXG4gICAgKlxuICAgICogQG1ldGhvZCByZXN0b3JlXG4gICAgKiBAcGFyYW0ge09iamVjdH0gYnVuZGxlLSBUaGUgZGF0YS1idW5kbGUuXG4gICAgIyMjICAgICBcbiAgICByZXN0b3JlOiAtPlxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgZ2FtZSBtZXNzYWdlIGZvciBub3ZlbC1tb2RlLlxuICAgICpcbiAgICAqIEBtZXRob2QgbWVzc2FnZU9iamVjdE5WTFxuICAgICogQHJldHVybiB7dWkuT2JqZWN0X01lc3NhZ2V9IFRoZSBOVkwgZ2FtZSBtZXNzYWdlIG9iamVjdC5cbiAgICAjIyMgICAgICAgICAgIFxuICAgIG1lc3NhZ2VPYmplY3ROVkw6IC0+IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VOVkxfbWVzc2FnZVwiKVxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIGdhbWUgbWVzc2FnZSBmb3IgYWR2ZW50dXJlLW1vZGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBtZXNzYWdlT2JqZWN0QURWXG4gICAgKiBAcmV0dXJuIHt1aS5PYmplY3RfTWVzc2FnZX0gVGhlIEFEViBnYW1lIG1lc3NhZ2Ugb2JqZWN0LlxuICAgICMjIyAgICAgICAgICAgXG4gICAgbWVzc2FnZU9iamVjdEFEVjogLT4gXG4gICAgICAgIGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VfbWVzc2FnZVwiKVxuICAgIFxuICAgICMjIypcbiAgICAqIFN0YXJ0cyB0aGUgaW50ZXJwcmV0ZXJcbiAgICAqXG4gICAgKiBAbWV0aG9kIHN0YXJ0XG4gICAgIyMjICAgXG4gICAgc3RhcnQ6IC0+XG4gICAgICAgIEBjb25kaXRpb25zID0gW11cbiAgICAgICAgQGxvb3BzID0gW11cbiAgICAgICAgQGluZGVudCA9IDBcbiAgICAgICAgQHBvaW50ZXIgPSAwXG4gICAgICAgIEBpc1J1bm5pbmcgPSB5ZXNcbiAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFN0b3BzIHRoZSBpbnRlcnByZXRlclxuICAgICpcbiAgICAqIEBtZXRob2Qgc3RvcFxuICAgICMjIyAgIFxuICAgIHN0b3A6IC0+XG4gICAgICAgIEBpc1J1bm5pbmcgPSBub1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBSZXN1bWVzIHRoZSBpbnRlcnByZXRlclxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzdW1lXG4gICAgIyMjICBcbiAgICByZXN1bWU6IC0+XG4gICAgICAgIEBpc1J1bm5pbmcgPSB5ZXMgICAgICAgIFxuICAgICBcbiAgICAjIyMqXG4gICAgKiBVcGRhdGVzIHRoZSBpbnRlcnByZXRlciBhbmQgZXhlY3V0ZXMgYWxsIGNvbW1hbmRzIHVudGlsIHRoZSBuZXh0IHdhaXQgaXMgXG4gICAgKiB0cmlnZ2VyZWQgYnkgYSBjb21tYW5kLiBTbyBpbiB0aGUgY2FzZSBvZiBhbiBlbmRsZXNzLWxvb3AgdGhlIG1ldGhvZCB3aWxsIFxuICAgICogbmV2ZXIgcmV0dXJuLlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgIyMjICAgICAgXG4gICAgdXBkYXRlOiAtPlxuICAgICAgICBpZiBAc3ViSW50ZXJwcmV0ZXI/XG4gICAgICAgICAgICBAc3ViSW50ZXJwcmV0ZXIudXBkYXRlKClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXR1cFRlbXBWYXJpYWJsZXMoQGNvbnRleHQpXG4gICAgICAgIFxuICAgICAgICBpZiAobm90IEBvYmplY3QuY29tbWFuZHM/IG9yIEBwb2ludGVyID49IEBvYmplY3QuY29tbWFuZHMubGVuZ3RoKSBhbmQgbm90IEBpc1dhaXRpbmdcbiAgICAgICAgICAgIGlmIEByZXBlYXRcbiAgICAgICAgICAgICAgICBAc3RhcnQoKVxuICAgICAgICAgICAgZWxzZSBpZiBAaXNSdW5uaW5nXG4gICAgICAgICAgICAgICAgQGlzUnVubmluZyA9IG5vXG4gICAgICAgICAgICAgICAgaWYgQG9uRmluaXNoPyB0aGVuIEBvbkZpbmlzaCh0aGlzKVxuICAgICAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgXG4gICAgICAgIGlmIG5vdCBAaXNSdW5uaW5nIHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBpZiBub3QgQG9iamVjdC5jb21tYW5kcy5vcHRpbWl6ZWRcbiAgICAgICAgICAgIERhdGFPcHRpbWl6ZXIub3B0aW1pemVFdmVudENvbW1hbmRzKEBvYmplY3QuY29tbWFuZHMpXG5cbiAgICAgICAgaWYgQHdhaXRDb3VudGVyID4gMFxuICAgICAgICAgICAgQHdhaXRDb3VudGVyLS1cbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSBAd2FpdENvdW50ZXIgPiAwXG4gICAgICAgICAgICByZXR1cm4gICAgICBcbiAgICAgICAgICAgIFxuICAgICAgICBpZiBAaXNXYWl0aW5nRm9yTWVzc2FnZVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgaWYgbm90IEBpc1Byb2Nlc3NpbmdNZXNzYWdlSW5PdGhlckNvbnRleHQoKVxuICAgICAgICAgICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICAgICAgICAgIEBpc1dhaXRpbmdGb3JNZXNzYWdlID0gbm9cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIuaW5MaXZlUHJldmlld1xuICAgICAgICAgICAgd2hpbGUgbm90IChAaXNXYWl0aW5nIG9yIEBwcmV2aWV3SW5mby53YWl0aW5nKSBhbmQgQHBvaW50ZXIgPCBAb2JqZWN0LmNvbW1hbmRzLmxlbmd0aCBhbmQgQGlzUnVubmluZ1xuICAgICAgICAgICAgICAgIEBleGVjdXRlQ29tbWFuZChAcG9pbnRlcilcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgQHByZXZpZXdJbmZvLmV4ZWN1dGVkQ29tbWFuZHMrK1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIEBwcmV2aWV3SW5mby5leGVjdXRlZENvbW1hbmRzID4gNTAwXG4gICAgICAgICAgICAgICAgICAgIEBwcmV2aWV3SW5mby5leGVjdXRlZENvbW1hbmRzID0gMFxuICAgICAgICAgICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IDFcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgd2hpbGUgbm90IChAaXNXYWl0aW5nIG9yIEBwcmV2aWV3SW5mby53YWl0aW5nKSBhbmQgQHBvaW50ZXIgPCBAb2JqZWN0LmNvbW1hbmRzLmxlbmd0aCBhbmQgQGlzUnVubmluZ1xuICAgICAgICAgICAgICAgIEBleGVjdXRlQ29tbWFuZChAcG9pbnRlcilcbiAgICAgXG4gICAgICAgICAgXG4gICAgICAgIGlmIEBwb2ludGVyID49IEBvYmplY3QuY29tbWFuZHMubGVuZ3RoIGFuZCBub3QgQGlzV2FpdGluZ1xuICAgICAgICAgICAgaWYgQHJlcGVhdFxuICAgICAgICAgICAgICAgIEBzdGFydCgpXG4gICAgICAgICAgICBlbHNlIGlmIEBpc1J1bm5pbmdcbiAgICAgICAgICAgICAgICBAaXNSdW5uaW5nID0gbm9cbiAgICAgICAgICAgICAgICBpZiBAb25GaW5pc2g/IHRoZW4gQG9uRmluaXNoKHRoaXMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEFzc2lnbnMgdGhlIGNvcnJlY3QgY29tbWFuZC1mdW5jdGlvbiB0byB0aGUgc3BlY2lmaWVkIGNvbW1hbmQtb2JqZWN0IGlmIFxuICAgICogbmVjZXNzYXJ5LlxuICAgICpcbiAgICAqIEBtZXRob2QgYXNzaWduQ29tbWFuZFxuICAgICMjIyAgICAgIFxuICAgIGFzc2lnbkNvbW1hbmQ6IChjb21tYW5kKSAtPlxuICAgICAgICBzd2l0Y2ggY29tbWFuZC5pZFxuICAgICAgICAgICAgd2hlbiBcImdzLklkbGVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kSWRsZVxuICAgICAgICAgICAgd2hlbiBcImdzLlN0YXJ0VGltZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU3RhcnRUaW1lclxuICAgICAgICAgICAgd2hlbiBcImdzLlBhdXNlVGltZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGF1c2VUaW1lclxuICAgICAgICAgICAgd2hlbiBcImdzLlJlc3VtZVRpbWVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJlc3VtZVRpbWVyXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU3RvcFRpbWVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFN0b3BUaW1lclxuICAgICAgICAgICAgd2hlbiBcImdzLldhaXRDb21tYW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFdhaXRcbiAgICAgICAgICAgIHdoZW4gXCJncy5Mb29wQ29tbWFuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMb29wXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQnJlYWtMb29wQ29tbWFuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRCcmVha0xvb3BcbiAgICAgICAgICAgIHdoZW4gXCJncy5Db21tZW50XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSAtPiAwXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRW1wdHlDb21tYW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSAtPiAwXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdEFkZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0QWRkXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdFBvcFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0UG9wXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdFNoaWZ0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RTaGlmdFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RSZW1vdmVBdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0UmVtb3ZlQXRcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0SW5zZXJ0QXRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdEluc2VydEF0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdFZhbHVlQXRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdFZhbHVlQXRcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0Q2xlYXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdENsZWFyXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdFNodWZmbGVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdFNodWZmbGVcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0U29ydFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0U29ydFxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RJbmRleE9mXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RJbmRleE9mXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdFNldFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0U2V0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuTGlzdENvcHlcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTGlzdENvcHlcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0TGVuZ3RoXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZExpc3RMZW5ndGhcbiAgICAgICAgICAgIHdoZW4gXCJncy5MaXN0Sm9pblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0Sm9pblxuICAgICAgICAgICAgd2hlbiBcImdzLkxpc3RGcm9tVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMaXN0RnJvbVRleHRcbiAgICAgICAgICAgIHdoZW4gXCJncy5SZXNldFZhcmlhYmxlc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSZXNldFZhcmlhYmxlc1xuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZVZhcmlhYmxlRG9tYWluXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVZhcmlhYmxlRG9tYWluXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hhbmdlTnVtYmVyVmFyaWFibGVzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZU51bWJlclZhcmlhYmxlc1xuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZURlY2ltYWxWYXJpYWJsZXNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlRGVjaW1hbFZhcmlhYmxlc1xuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZUJvb2xlYW5WYXJpYWJsZXNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlQm9vbGVhblZhcmlhYmxlc1xuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZVN0cmluZ1ZhcmlhYmxlc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VTdHJpbmdWYXJpYWJsZXNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGVja1N3aXRjaFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGVja1N3aXRjaFxuICAgICAgICAgICAgd2hlbiBcImdzLkNoZWNrTnVtYmVyVmFyaWFibGVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hlY2tOdW1iZXJWYXJpYWJsZVxuICAgICAgICAgICAgd2hlbiBcImdzLkNoZWNrVGV4dFZhcmlhYmxlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoZWNrVGV4dFZhcmlhYmxlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ29uZGl0aW9uXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENvbmRpdGlvblxuICAgICAgICAgICAgd2hlbiBcImdzLkNvbmRpdGlvbkVsc2VcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ29uZGl0aW9uRWxzZVxuICAgICAgICAgICAgd2hlbiBcImdzLkNvbmRpdGlvbkVsc2VJZlwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDb25kaXRpb25FbHNlSWZcbiAgICAgICAgICAgIHdoZW4gXCJncy5MYWJlbFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMYWJlbFxuICAgICAgICAgICAgd2hlbiBcImdzLkp1bXBUb0xhYmVsXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEp1bXBUb0xhYmVsXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2V0TWVzc2FnZUFyZWFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2V0TWVzc2FnZUFyZWFcbiAgICAgICAgICAgIHdoZW4gXCJncy5TaG93TWVzc2FnZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaG93TWVzc2FnZVxuICAgICAgICAgICAgd2hlbiBcImdzLlNob3dQYXJ0aWFsTWVzc2FnZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaG93UGFydGlhbE1lc3NhZ2VcbiAgICAgICAgICAgIHdoZW4gXCJncy5NZXNzYWdlRmFkaW5nXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1lc3NhZ2VGYWRpbmdcbiAgICAgICAgICAgIHdoZW4gXCJncy5NZXNzYWdlU2V0dGluZ3NcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTWVzc2FnZVNldHRpbmdzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ3JlYXRlTWVzc2FnZUFyZWFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ3JlYXRlTWVzc2FnZUFyZWFcbiAgICAgICAgICAgIHdoZW4gXCJncy5FcmFzZU1lc3NhZ2VBcmVhXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEVyYXNlTWVzc2FnZUFyZWFcbiAgICAgICAgICAgIHdoZW4gXCJncy5TZXRUYXJnZXRNZXNzYWdlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNldFRhcmdldE1lc3NhZ2VcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5NZXNzYWdlQm94RGVmYXVsdHNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTWVzc2FnZUJveERlZmF1bHRzXG4gICAgICAgICAgICB3aGVuIFwidm4uTWVzc2FnZUJveFZpc2liaWxpdHlcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTWVzc2FnZUJveFZpc2liaWxpdHlcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5NZXNzYWdlVmlzaWJpbGl0eVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNZXNzYWdlVmlzaWJpbGl0eVxuICAgICAgICAgICAgd2hlbiBcInZuLkJhY2tsb2dWaXNpYmlsaXR5XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEJhY2tsb2dWaXNpYmlsaXR5XG4gICAgICAgICAgICB3aGVuIFwidm4uU2hvd01lc3NhZ2VOVkxcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd01lc3NhZ2VOVkxcbiAgICAgICAgICAgIHdoZW4gXCJncy5DbGVhck1lc3NhZ2VcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2xlYXJNZXNzYWdlXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2xvc2VQYWdlTlZMXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENsb3NlUGFnZU5WTFxuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZVdlYXRoZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlV2VhdGhlclxuICAgICAgICAgICAgd2hlbiBcImdzLkZyZWV6ZVNjcmVlblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRGcmVlemVTY3JlZW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5TY3JlZW5UcmFuc2l0aW9uXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNjcmVlblRyYW5zaXRpb25cbiAgICAgICAgICAgIHdoZW4gXCJncy5TaGFrZVNjcmVlblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaGFrZVNjcmVlblxuICAgICAgICAgICAgd2hlbiBcImdzLlRpbnRTY3JlZW5cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVGludFNjcmVlblxuICAgICAgICAgICAgd2hlbiBcImdzLkZsYXNoU2NyZWVuXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEZsYXNoU2NyZWVuXG4gICAgICAgICAgICB3aGVuIFwiZ3MuWm9vbVNjcmVlblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRab29tU2NyZWVuXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUm90YXRlU2NyZWVuXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJvdGF0ZVNjcmVlblxuICAgICAgICAgICAgd2hlbiBcImdzLlBhblNjcmVlblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQYW5TY3JlZW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5TY3JlZW5FZmZlY3RcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2NyZWVuRWZmZWN0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hvd1ZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNob3dWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLk1vdmVWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlVmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5Nb3ZlVmlkZW9QYXRoXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1vdmVWaWRlb1BhdGhcbiAgICAgICAgICAgIHdoZW4gXCJncy5UaW50VmlkZW9cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVGludFZpZGVvXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRmxhc2hWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRGbGFzaFZpZGVvXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ3JvcFZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENyb3BWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLlJvdGF0ZVZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJvdGF0ZVZpZGVvXG4gICAgICAgICAgICB3aGVuIFwiZ3MuWm9vbVZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFpvb21WaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLkJsZW5kVmlkZW9cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmxlbmRWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLk1hc2tWaWRlb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNYXNrVmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5WaWRlb0VmZmVjdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRWaWRlb0VmZmVjdFxuICAgICAgICAgICAgd2hlbiBcImdzLlZpZGVvTW90aW9uQmx1clwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRWaWRlb01vdGlvbkJsdXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5WaWRlb0RlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFZpZGVvRGVmYXVsdHNcbiAgICAgICAgICAgIHdoZW4gXCJncy5FcmFzZVZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEVyYXNlVmlkZW9cbiAgICAgICAgICAgIHdoZW4gXCJncy5TaG93SW1hZ2VNYXBcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd0ltYWdlTWFwXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRXJhc2VJbWFnZU1hcFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRFcmFzZUltYWdlTWFwXG4gICAgICAgICAgICB3aGVuIFwiZ3MuQWRkSG90c3BvdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRBZGRIb3RzcG90XG4gICAgICAgICAgICB3aGVuIFwiZ3MuRXJhc2VIb3RzcG90XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEVyYXNlSG90c3BvdFxuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZUhvdHNwb3RTdGF0ZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VIb3RzcG90U3RhdGVcbiAgICAgICAgICAgIHdoZW4gXCJncy5TaG93UGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaG93UGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLk1vdmVQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1vdmVQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTW92ZVBpY3R1cmVQYXRoXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1vdmVQaWN0dXJlUGF0aFxuICAgICAgICAgICAgd2hlbiBcImdzLlRpbnRQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRpbnRQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuRmxhc2hQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEZsYXNoUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLkNyb3BQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENyb3BQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUm90YXRlUGljdHVyZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSb3RhdGVQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuWm9vbVBpY3R1cmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kWm9vbVBpY3R1cmVcbiAgICAgICAgICAgIHdoZW4gXCJncy5CbGVuZFBpY3R1cmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmxlbmRQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuU2hha2VQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNoYWtlUGljdHVyZVxuICAgICAgICAgICAgd2hlbiBcImdzLk1hc2tQaWN0dXJlXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1hc2tQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGljdHVyZUVmZmVjdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQaWN0dXJlRWZmZWN0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGljdHVyZU1vdGlvbkJsdXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGljdHVyZU1vdGlvbkJsdXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5QaWN0dXJlRGVmYXVsdHNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGljdHVyZURlZmF1bHRzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGxheVBpY3R1cmVBbmltYXRpb25cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUGxheVBpY3R1cmVBbmltYXRpb25cbiAgICAgICAgICAgIHdoZW4gXCJncy5FcmFzZVBpY3R1cmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kRXJhc2VQaWN0dXJlXG4gICAgICAgICAgICB3aGVuIFwiZ3MuSW5wdXROdW1iZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kSW5wdXROdW1iZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaG9pY2VcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd0Nob2ljZVxuICAgICAgICAgICAgd2hlbiBcInZuLkNob2ljZVRpbWVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENob2ljZVRpbWVyXG4gICAgICAgICAgICB3aGVuIFwidm4uU2hvd0Nob2ljZXNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hvd0Nob2ljZXNcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5VbmxvY2tDR1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRVbmxvY2tDR1xuICAgICAgICAgICAgd2hlbiBcInZuLkwyREpvaW5TY2VuZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRKb2luU2NlbmVcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5MMkRFeGl0U2NlbmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTDJERXhpdFNjZW5lXG4gICAgICAgICAgICB3aGVuIFwidm4uTDJETW90aW9uXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEwyRE1vdGlvblxuICAgICAgICAgICAgd2hlbiBcInZuLkwyRE1vdGlvbkdyb3VwXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEwyRE1vdGlvbkdyb3VwXG4gICAgICAgICAgICB3aGVuIFwidm4uTDJERXhwcmVzc2lvblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRFeHByZXNzaW9uXG4gICAgICAgICAgICB3aGVuIFwidm4uTDJETW92ZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRMMkRNb3ZlXG4gICAgICAgICAgICB3aGVuIFwidm4uTDJEUGFyYW1ldGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEwyRFBhcmFtZXRlclxuICAgICAgICAgICAgd2hlbiBcInZuLkwyRFNldHRpbmdzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEwyRFNldHRpbmdzXG4gICAgICAgICAgICB3aGVuIFwidm4uTDJERGVmYXVsdHNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTDJERGVmYXVsdHNcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFyYWN0ZXJKb2luU2NlbmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVySm9pblNjZW5lXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhcmFjdGVyRXhpdFNjZW5lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYXJhY3RlckV4aXRTY2VuZVxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYXJhY3RlckNoYW5nZUV4cHJlc3Npb25cIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVyQ2hhbmdlRXhwcmVzc2lvblxuICAgICAgICAgICAgd2hlbiBcInZuLkNoYXJhY3RlclNldFBhcmFtZXRlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFyYWN0ZXJTZXRQYXJhbWV0ZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFyYWN0ZXJHZXRQYXJhbWV0ZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVyR2V0UGFyYW1ldGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhcmFjdGVyRGVmYXVsdHNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVyRGVmYXVsdHNcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFyYWN0ZXJFZmZlY3RcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhcmFjdGVyRWZmZWN0XG4gICAgICAgICAgICB3aGVuIFwidm4uWm9vbUNoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRab29tQ2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uUm90YXRlQ2hhcmFjdGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJvdGF0ZUNoYXJhY3RlclxuICAgICAgICAgICAgd2hlbiBcInZuLkJsZW5kQ2hhcmFjdGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEJsZW5kQ2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uU2hha2VDaGFyYWN0ZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2hha2VDaGFyYWN0ZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5NYXNrQ2hhcmFjdGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1hc2tDaGFyYWN0ZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5Nb3ZlQ2hhcmFjdGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZE1vdmVDaGFyYWN0ZXJcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5Nb3ZlQ2hhcmFjdGVyUGF0aFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlQ2hhcmFjdGVyUGF0aFxuICAgICAgICAgICAgd2hlbiBcInZuLkZsYXNoQ2hhcmFjdGVyXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEZsYXNoQ2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uVGludENoYXJhY3RlclwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRUaW50Q2hhcmFjdGVyXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhcmFjdGVyTW90aW9uQmx1clwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFyYWN0ZXJNb3Rpb25CbHVyXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhbmdlQmFja2dyb3VuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VCYWNrZ3JvdW5kXG4gICAgICAgICAgICB3aGVuIFwidm4uU2hha2VCYWNrZ3JvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNoYWtlQmFja2dyb3VuZFxuICAgICAgICAgICAgd2hlbiBcInZuLlNjcm9sbEJhY2tncm91bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2Nyb2xsQmFja2dyb3VuZFxuICAgICAgICAgICAgd2hlbiBcInZuLlNjcm9sbEJhY2tncm91bmRUb1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTY3JvbGxCYWNrZ3JvdW5kVG9cbiAgICAgICAgICAgIHdoZW4gXCJ2bi5TY3JvbGxCYWNrZ3JvdW5kUGF0aFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTY3JvbGxCYWNrZ3JvdW5kUGF0aFxuICAgICAgICAgICAgd2hlbiBcInZuLlpvb21CYWNrZ3JvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFpvb21CYWNrZ3JvdW5kXG4gICAgICAgICAgICB3aGVuIFwidm4uUm90YXRlQmFja2dyb3VuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSb3RhdGVCYWNrZ3JvdW5kXG4gICAgICAgICAgICB3aGVuIFwidm4uVGludEJhY2tncm91bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVGludEJhY2tncm91bmRcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5CbGVuZEJhY2tncm91bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmxlbmRCYWNrZ3JvdW5kXG4gICAgICAgICAgICB3aGVuIFwidm4uTWFza0JhY2tncm91bmRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTWFza0JhY2tncm91bmRcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5CYWNrZ3JvdW5kTW90aW9uQmx1clwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRCYWNrZ3JvdW5kTW90aW9uQmx1clxuICAgICAgICAgICAgd2hlbiBcInZuLkJhY2tncm91bmRFZmZlY3RcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQmFja2dyb3VuZEVmZmVjdFxuICAgICAgICAgICAgd2hlbiBcInZuLkJhY2tncm91bmREZWZhdWx0c1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRCYWNrZ3JvdW5kRGVmYXVsdHNcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DaGFuZ2VTY2VuZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VTY2VuZVxuICAgICAgICAgICAgd2hlbiBcInZuLlJldHVyblRvUHJldmlvdXNTY2VuZVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSZXR1cm5Ub1ByZXZpb3VzU2NlbmVcbiAgICAgICAgICAgIHdoZW4gXCJ2bi5DYWxsU2NlbmVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2FsbFNjZW5lXG4gICAgICAgICAgICB3aGVuIFwidm4uU3dpdGNoVG9MYXlvdXRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU3dpdGNoVG9MYXlvdXRcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VUcmFuc2l0aW9uXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVRyYW5zaXRpb25cbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VXaW5kb3dTa2luXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVdpbmRvd1NraW5cbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VTY3JlZW5UcmFuc2l0aW9uc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VTY3JlZW5UcmFuc2l0aW9uc1xuICAgICAgICAgICAgd2hlbiBcInZuLlVJQWNjZXNzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFVJQWNjZXNzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGxheVZpZGVvXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBsYXlWaWRlb1xuICAgICAgICAgICAgd2hlbiBcImdzLlBsYXlNdXNpY1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRQbGF5TXVzaWNcbiAgICAgICAgICAgIHdoZW4gXCJncy5TdG9wTXVzaWNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU3RvcE11c2ljXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUGxheVNvdW5kXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBsYXlTb3VuZFxuICAgICAgICAgICAgd2hlbiBcImdzLlN0b3BTb3VuZFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTdG9wU291bmRcbiAgICAgICAgICAgIHdoZW4gXCJncy5QYXVzZU11c2ljXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFBhdXNlTXVzaWNcbiAgICAgICAgICAgIHdoZW4gXCJncy5SZXN1bWVNdXNpY1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRSZXN1bWVNdXNpY1xuICAgICAgICAgICAgd2hlbiBcImdzLkF1ZGlvRGVmYXVsdHNcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQXVkaW9EZWZhdWx0c1xuICAgICAgICAgICAgd2hlbiBcImdzLkVuZENvbW1vbkV2ZW50XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEVuZENvbW1vbkV2ZW50XG4gICAgICAgICAgICB3aGVuIFwiZ3MuUmVzdW1lQ29tbW9uRXZlbnRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kUmVzdW1lQ29tbW9uRXZlbnRcbiAgICAgICAgICAgIHdoZW4gXCJncy5DYWxsQ29tbW9uRXZlbnRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2FsbENvbW1vbkV2ZW50XG4gICAgICAgICAgICB3aGVuIFwiZ3MuQ2hhbmdlVGltZXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlVGltZXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5TaG93VGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTaG93VGV4dFxuICAgICAgICAgICAgd2hlbiBcImdzLlJlZnJlc2hUZXh0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJlZnJlc2hUZXh0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuVGV4dE1vdGlvbkJsdXJcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kVGV4dE1vdGlvbkJsdXJcbiAgICAgICAgICAgIHdoZW4gXCJncy5Nb3ZlVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlVGV4dFxuICAgICAgICAgICAgd2hlbiBcImdzLk1vdmVUZXh0UGF0aFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRNb3ZlVGV4dFBhdGhcbiAgICAgICAgICAgIHdoZW4gXCJncy5Sb3RhdGVUZXh0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJvdGF0ZVRleHRcbiAgICAgICAgICAgIHdoZW4gXCJncy5ab29tVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRab29tVGV4dFxuICAgICAgICAgICAgd2hlbiBcImdzLkJsZW5kVGV4dFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRCbGVuZFRleHRcbiAgICAgICAgICAgIHdoZW4gXCJncy5Db2xvclRleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ29sb3JUZXh0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuRXJhc2VUZXh0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZEVyYXNlVGV4dCBcbiAgICAgICAgICAgIHdoZW4gXCJncy5UZXh0RWZmZWN0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRleHRFZmZlY3QgXG4gICAgICAgICAgICB3aGVuIFwiZ3MuVGV4dERlZmF1bHRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFRleHREZWZhdWx0c1xuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZVRleHRTZXR0aW5nc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VUZXh0U2V0dGluZ3NcbiAgICAgICAgICAgIHdoZW4gXCJncy5JbnB1dFRleHRcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kSW5wdXRUZXh0XG4gICAgICAgICAgICB3aGVuIFwiZ3MuSW5wdXROYW1lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZElucHV0TmFtZVxuICAgICAgICAgICAgd2hlbiBcImdzLlNhdmVQZXJzaXN0ZW50RGF0YVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTYXZlUGVyc2lzdGVudERhdGFcbiAgICAgICAgICAgIHdoZW4gXCJncy5TYXZlU2V0dGluZ3NcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kU2F2ZVNldHRpbmdzXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUHJlcGFyZVNhdmVHYW1lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFByZXBhcmVTYXZlR2FtZVxuICAgICAgICAgICAgd2hlbiBcImdzLlNhdmVHYW1lXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNhdmVHYW1lXG4gICAgICAgICAgICB3aGVuIFwiZ3MuTG9hZEdhbWVcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kTG9hZEdhbWVcbiAgICAgICAgICAgIHdoZW4gXCJncy5HZXRJbnB1dERhdGFcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kR2V0SW5wdXREYXRhXG4gICAgICAgICAgICB3aGVuIFwiZ3MuV2FpdEZvcklucHV0XCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFdhaXRGb3JJbnB1dFxuICAgICAgICAgICAgd2hlbiBcImdzLkNoYW5nZU9iamVjdERvbWFpblwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VPYmplY3REb21haW5cbiAgICAgICAgICAgIHdoZW4gXCJ2bi5HZXRHYW1lRGF0YVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRHZXRHYW1lRGF0YVxuICAgICAgICAgICAgd2hlbiBcInZuLlNldEdhbWVEYXRhXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFNldEdhbWVEYXRhXG4gICAgICAgICAgICB3aGVuIFwidm4uR2V0T2JqZWN0RGF0YVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRHZXRPYmplY3REYXRhXG4gICAgICAgICAgICB3aGVuIFwidm4uU2V0T2JqZWN0RGF0YVwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTZXRPYmplY3REYXRhXG4gICAgICAgICAgICB3aGVuIFwidm4uQ2hhbmdlU291bmRzXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZENoYW5nZVNvdW5kc1xuICAgICAgICAgICAgd2hlbiBcInZuLkNoYW5nZUNvbG9yc1wiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRDaGFuZ2VDb2xvcnNcbiAgICAgICAgICAgIHdoZW4gXCJncy5DaGFuZ2VTY3JlZW5DdXJzb3JcIiB0aGVuIGNvbW1hbmQuZXhlY3V0ZSA9IEBjb21tYW5kQ2hhbmdlU2NyZWVuQ3Vyc29yXG4gICAgICAgICAgICB3aGVuIFwiZ3MuUmVzZXRHbG9iYWxEYXRhXCIgdGhlbiBjb21tYW5kLmV4ZWN1dGUgPSBAY29tbWFuZFJlc2V0R2xvYmFsRGF0YVxuICAgICAgICAgICAgd2hlbiBcImdzLlNjcmlwdFwiIHRoZW4gY29tbWFuZC5leGVjdXRlID0gQGNvbW1hbmRTY3JpcHRcbiAgICBcbiAgICAjIyMqXG4gICAgKiBFeGVjdXRlcyB0aGUgY29tbWFuZCBhdCB0aGUgc3BlY2lmaWVkIGluZGV4IGFuZCBpbmNyZWFzZXMgdGhlIGNvbW1hbmQtcG9pbnRlci5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGV4ZWN1dGVDb21tYW5kXG4gICAgIyMjICAgICAgIFxuICAgIGV4ZWN1dGVDb21tYW5kOiAoaW5kZXgpIC0+XG4gICAgICAgIEBjb21tYW5kID0gQG9iamVjdC5jb21tYW5kc1tpbmRleF1cblxuICAgICAgICBpZiBAcHJldmlld0RhdGFcbiAgICAgICAgICAgIGlmIEBwb2ludGVyIDwgQHByZXZpZXdEYXRhLnBvaW50ZXJcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCA9IHllc1xuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwVGltZSA9IDBcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCA9IEBwcmV2aWV3RGF0YS5zZXR0aW5ncy5hbmltYXRpb25EaXNhYmxlZFxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwVGltZSA9IDBcbiAgICAgICAgICAgICAgICBAcHJldmlld0luZm8ud2FpdGluZyA9IHllc1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5lbWl0KFwicHJldmlld1dhaXRpbmdcIilcbiAgICAgICAgICAgICAgICBpZiBAcHJldmlld0RhdGEuc2V0dGluZ3MuYW5pbWF0aW9uRGlzYWJsZWQgb3IgQHByZXZpZXdEYXRhLnNldHRpbmdzLmFuaW1hdGlvblRpbWUgPiAwXG4gICAgICAgICAgICAgICAgICAgIEBwcmV2aWV3SW5mby50aW1lb3V0ID0gc2V0VGltZW91dCAoLT4gR3JhcGhpY3Muc3RvcHBlZCA9IHllcyksIChAcHJldmlld0RhdGEuc2V0dGluZ3MuYW5pbWF0aW9uVGltZSkqMTAwMFxuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiBAY29tbWFuZC5leGVjdXRlP1xuICAgICAgICAgICAgQGNvbW1hbmQuaW50ZXJwcmV0ZXIgPSB0aGlzXG4gICAgICAgICAgICBAY29tbWFuZC5leGVjdXRlKCkgaWYgQGNvbW1hbmQuaW5kZW50ID09IEBpbmRlbnRcbiAgICAgICAgICAgIEBwb2ludGVyKytcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQGNvbW1hbmQgPSBAb2JqZWN0LmNvbW1hbmRzW0Bwb2ludGVyXVxuICAgICAgICAgICAgaWYgQGNvbW1hbmQ/XG4gICAgICAgICAgICAgICAgaW5kZW50ID0gQGNvbW1hbmQuaW5kZW50XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgaW5kZW50ID0gQGluZGVudFxuICAgICAgICAgICAgICAgIHdoaWxlIGluZGVudCA+IDAgYW5kIChub3QgQGxvb3BzW2luZGVudF0/KVxuICAgICAgICAgICAgICAgICAgICBpbmRlbnQtLVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIGluZGVudCA8IEBpbmRlbnRcbiAgICAgICAgICAgICAgICBAaW5kZW50ID0gaW5kZW50XG4gICAgICAgICAgICAgICAgaWYgQGxvb3BzW0BpbmRlbnRdP1xuICAgICAgICAgICAgICAgICAgICBAcG9pbnRlciA9IEBsb29wc1tAaW5kZW50XVxuICAgICAgICAgICAgICAgICAgICBAY29tbWFuZCA9IEBvYmplY3QuY29tbWFuZHNbQHBvaW50ZXJdXG4gICAgICAgICAgICAgICAgICAgIEBjb21tYW5kLmludGVycHJldGVyID0gdGhpc1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICBAYXNzaWduQ29tbWFuZChAY29tbWFuZClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIEBjb21tYW5kLmV4ZWN1dGU/XG4gICAgICAgICAgICAgICAgQGNvbW1hbmQuaW50ZXJwcmV0ZXIgPSB0aGlzXG4gICAgICAgICAgICAgICAgQGNvbW1hbmQuZXhlY3V0ZSgpIGlmIEBjb21tYW5kLmluZGVudCA9PSBAaW5kZW50XG4gICAgICAgICAgICAgICAgQHBvaW50ZXIrK1xuICAgICAgICAgICAgICAgIEBjb21tYW5kID0gQG9iamVjdC5jb21tYW5kc1tAcG9pbnRlcl1cbiAgICAgICAgICAgICAgICBpZiBAY29tbWFuZD9cbiAgICAgICAgICAgICAgICAgICAgaW5kZW50ID0gQGNvbW1hbmQuaW5kZW50XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBpbmRlbnQgPSBAaW5kZW50XG4gICAgICAgICAgICAgICAgICAgIHdoaWxlIGluZGVudCA+IDAgYW5kIChub3QgQGxvb3BzW2luZGVudF0/KVxuICAgICAgICAgICAgICAgICAgICAgICAgaW5kZW50LS1cbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIGluZGVudCA8IEBpbmRlbnRcbiAgICAgICAgICAgICAgICAgICAgQGluZGVudCA9IGluZGVudFxuICAgICAgICAgICAgICAgICAgICBpZiBAbG9vcHNbQGluZGVudF0/XG4gICAgICAgICAgICAgICAgICAgICAgICBAcG9pbnRlciA9IEBsb29wc1tAaW5kZW50XVxuICAgICAgICAgICAgICAgICAgICAgICAgQGNvbW1hbmQgPSBAb2JqZWN0LmNvbW1hbmRzW0Bwb2ludGVyXVxuICAgICAgICAgICAgICAgICAgICAgICAgQGNvbW1hbmQuaW50ZXJwcmV0ZXIgPSB0aGlzXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQHBvaW50ZXIrK1xuICAgICMjIypcbiAgICAqIFNraXBzIGFsbCBjb21tYW5kcyB1bnRpbCBhIGNvbW1hbmQgd2l0aCB0aGUgc3BlY2lmaWVkIGluZGVudC1sZXZlbCBpcyBcbiAgICAqIGZvdW5kLiBTbyBmb3IgZXhhbXBsZTogVG8ganVtcCBmcm9tIGEgQ29uZGl0aW9uLUNvbW1hbmQgdG8gdGhlIG5leHRcbiAgICAqIEVsc2UtQ29tbWFuZCBqdXN0IHBhc3MgdGhlIGluZGVudC1sZXZlbCBvZiB0aGUgQ29uZGl0aW9uL0Vsc2UgY29tbWFuZC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNraXBcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRlbnQgLSBUaGUgaW5kZW50LWxldmVsLlxuICAgICogQHBhcmFtIHtib29sZWFufSBiYWNrd2FyZCAtIElmIHRydWUgdGhlIHNraXAgcnVucyBiYWNrd2FyZC5cbiAgICAjIyMgICBcbiAgICBza2lwOiAoaW5kZW50LCBiYWNrd2FyZCkgLT5cbiAgICAgICAgaWYgYmFja3dhcmRcbiAgICAgICAgICAgIEBwb2ludGVyLS1cbiAgICAgICAgICAgIHdoaWxlIEBwb2ludGVyID4gMCBhbmQgQG9iamVjdC5jb21tYW5kc1tAcG9pbnRlcl0uaW5kZW50ICE9IGluZGVudFxuICAgICAgICAgICAgICAgIEBwb2ludGVyLS1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHBvaW50ZXIrK1xuICAgICAgICAgICAgd2hpbGUgQHBvaW50ZXIgPCBAb2JqZWN0LmNvbW1hbmRzLmxlbmd0aCBhbmQgQG9iamVjdC5jb21tYW5kc1tAcG9pbnRlcl0uaW5kZW50ICE9IGluZGVudFxuICAgICAgICAgICAgICAgIEBwb2ludGVyKytcbiAgICBcbiAgICAjIyMqXG4gICAgKiBIYWx0cyB0aGUgaW50ZXJwcmV0ZXIgZm9yIHRoZSBzcGVjaWZpZWQgYW1vdW50IG9mIHRpbWUuIEFuIG9wdGlvbmFsbHlcbiAgICAqIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbiBiZSBwYXNzZWQgd2hpY2ggaXMgY2FsbGVkIHdoZW4gdGhlIHRpbWUgaXMgdXAuXG4gICAgKlxuICAgICogQG1ldGhvZCB3YWl0XG4gICAgKiBAcGFyYW0ge251bWJlcn0gdGltZSAtIFRoZSB0aW1lIHRvIHdhaXRcbiAgICAqIEBwYXJhbSB7Z3MuQ2FsbGJhY2t9IGNhbGxiYWNrIC0gQ2FsbGVkIGlmIHRoZSB3YWl0IHRpbWUgaXMgdXAuXG4gICAgIyMjICBcbiAgICB3YWl0OiAodGltZSwgY2FsbGJhY2spIC0+XG4gICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgQHdhaXRDb3VudGVyID0gdGltZVxuICAgICAgICBAd2FpdENhbGxiYWNrID0gY2FsbGJhY2tcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2hlY2tzIGlmIHRoZSBjb21tYW5kIGF0IHRoZSBzcGVjaWZpZWQgcG9pbnRlci1pbmRleCBpcyBhIGdhbWUgbWVzc2FnZVxuICAgICogcmVsYXRlZCBjb21tYW5kLlxuICAgICpcbiAgICAqIEBtZXRob2QgaXNNZXNzYWdlQ29tbWFuZFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHBvaW50ZXIgLSBUaGUgcG9pbnRlci9pbmRleC5cbiAgICAqIEBwYXJhbSB7T2JqZWN0W119IGNvbW1hbmRzIC0gVGhlIGxpc3Qgb2YgY29tbWFuZHMgdG8gY2hlY2suXG4gICAgKiBAcmV0dXJuIHtib29sZWFufSA8Yj50cnVlPC9iPiBpZiBpdHMgYSBnYW1lIG1lc3NhZ2UgcmVsYXRlZCBjb21tYW5kLiBPdGhlcndpc2UgPGI+ZmFsc2U8L2I+LlxuICAgICMjIyBcbiAgICBpc01lc3NhZ2VDb21tYW5kOiAocG9pbnRlciwgY29tbWFuZHMpIC0+XG4gICAgICAgIHJlc3VsdCA9IHllc1xuICAgICAgICBpZiBwb2ludGVyID49IGNvbW1hbmRzLmxlbmd0aCBvciAoY29tbWFuZHNbcG9pbnRlcl0uaWQgIT0gXCJncy5JbnB1dE51bWJlclwiIGFuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29tbWFuZHNbcG9pbnRlcl0uaWQgIT0gXCJ2bi5DaG9pY2VcIiBhbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbW1hbmRzW3BvaW50ZXJdLmlkICE9IFwiZ3MuSW5wdXRUZXh0XCIgYW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21tYW5kc1twb2ludGVyXS5pZCAhPSBcImdzLklucHV0TmFtZVwiKVxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IG5vXG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDaGVja3MgaWYgdGhlIGNvbW1hbmQgYXQgdGhlIHNwZWNpZmllZCBwb2ludGVyLWluZGV4IGFza3MgZm9yIHVzZXItaW5wdXQgbGlrZVxuICAgICogdGhlIElucHV0IE51bWJlciBvciBJbnB1dCBUZXh0IGNvbW1hbmQuXG4gICAgKlxuICAgICogQG1ldGhvZCBpc0lucHV0RGF0YUNvbW1hbmRcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBwb2ludGVyIC0gVGhlIHBvaW50ZXIvaW5kZXguXG4gICAgKiBAcGFyYW0ge09iamVjdFtdfSBjb21tYW5kcyAtIFRoZSBsaXN0IG9mIGNvbW1hbmRzIHRvIGNoZWNrLlxuICAgICogQHJldHVybiB7Ym9vbGVhbn0gPGI+dHJ1ZTwvYj4gaWYgaXRzIGFuIGlucHV0LWRhdGEgY29tbWFuZC4gT3RoZXJ3aXNlIDxiPmZhbHNlPC9iPlxuICAgICMjIyAgICAgXG4gICAgaXNJbnB1dERhdGFDb21tYW5kOiAocG9pbnRlciwgY29tbWFuZHMpIC0+XG4gICAgICAgIHBvaW50ZXIgPCBjb21tYW5kcy5sZW5ndGggYW5kIChcbiAgICAgICAgICAgIGNvbW1hbmRzW3BvaW50ZXJdLmlkID09IFwiZ3MuSW5wdXROdW1iZXJcIiBvclxuICAgICAgICAgICAgY29tbWFuZHNbcG9pbnRlcl0uaWQgPT0gXCJncy5JbnB1dFRleHRcIiBvclxuICAgICAgICAgICAgY29tbWFuZHNbcG9pbnRlcl0uaWQgPT0gXCJ2bi5DaG9pY2VcIiBvclxuICAgICAgICAgICAgY29tbWFuZHNbcG9pbnRlcl0uaWQgPT0gXCJ2bi5TaG93Q2hvaWNlc1wiXG4gICAgICAgIClcbiAgICAgXG4gICAgIyMjKlxuICAgICogQ2hlY2tzIGlmIGEgZ2FtZSBtZXNzYWdlIGlzIGN1cnJlbnRseSBydW5uaW5nIGJ5IGFub3RoZXIgaW50ZXJwcmV0ZXIgbGlrZSBhXG4gICAgKiBjb21tb24tZXZlbnQgaW50ZXJwcmV0ZXIuXG4gICAgKlxuICAgICogQG1ldGhvZCBpc1Byb2Nlc3NpbmdNZXNzYWdlSW5PdGhlckNvbnRleHRcbiAgICAqIEByZXR1cm4ge2Jvb2xlYW59IDxiPnRydWU8L2I+IGEgZ2FtZSBtZXNzYWdlIGlzIHJ1bm5pbmcgaW4gYW5vdGhlciBjb250ZXh0LiBPdGhlcndpc2UgPGI+ZmFsc2U8L2I+XG4gICAgIyMjICAgICBcbiAgICBpc1Byb2Nlc3NpbmdNZXNzYWdlSW5PdGhlckNvbnRleHQ6IC0+XG4gICAgICAgIHJlc3VsdCA9IG5vXG4gICAgICAgIGdtID0gR2FtZU1hbmFnZXJcbiAgICAgICAgcyA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBcbiAgICAgICAgcmVzdWx0ID1cbiAgICAgICAgICAgICAgICAgKHMuaW5wdXROdW1iZXJXaW5kb3c/IGFuZCBzLmlucHV0TnVtYmVyV2luZG93LnZpc2libGUgYW5kIHMuaW5wdXROdW1iZXJXaW5kb3cuZXhlY3V0aW9uQ29udGV4dCAhPSBAY29udGV4dCkgb3JcbiAgICAgICAgICAgICAgICAgKHMuaW5wdXRUZXh0V2luZG93PyBhbmQgcy5pbnB1dFRleHRXaW5kb3cuYWN0aXZlIGFuZCBzLmlucHV0VGV4dFdpbmRvdy5leGVjdXRpb25Db250ZXh0ICE9IEBjb250ZXh0KVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIFxuICAgICMjIypcbiAgICAqIElmIGEgZ2FtZSBtZXNzYWdlIGlzIGN1cnJlbnRseSBydW5uaW5nIGJ5IGFuIG90aGVyIGludGVycHJldGVyIGxpa2UgYSBjb21tb24tZXZlbnRcbiAgICAqIGludGVycHJldGVyLCB0aGlzIG1ldGhvZCB0cmlnZ2VyIGEgd2FpdCB1bnRpbCB0aGUgb3RoZXIgaW50ZXJwcmV0ZXIgaXMgZmluaXNoZWRcbiAgICAqIHdpdGggdGhlIGdhbWUgbWVzc2FnZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHdhaXRGb3JNZXNzYWdlXG4gICAgKiBAcmV0dXJuIHtib29sZWFufSA8Yj50cnVlPC9iPiBhIGdhbWUgbWVzc2FnZSBpcyBydW5uaW5nIGluIGFub3RoZXIgY29udGV4dC4gT3RoZXJ3aXNlIDxiPmZhbHNlPC9iPlxuICAgICMjIyAgICAgICBcbiAgICB3YWl0Rm9yTWVzc2FnZTogLT5cbiAgICAgICAgQGlzV2FpdGluZ0Zvck1lc3NhZ2UgPSB5ZXNcbiAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICBAcG9pbnRlci0tXG4gICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgdmFsdWUgdGhlIG51bWJlciB2YXJpYWJsZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICpcbiAgICAqIEBtZXRob2QgbnVtYmVyVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUncyBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSBpbmRleCBvZiB0aGUgdmFyaWFibGUgdG8gZ2V0IHRoZSB2YWx1ZSBmcm9tLlxuICAgICogQHJldHVybiB7TnVtYmVyfSBUaGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyAgICAgXG4gICAgbnVtYmVyVmFsdWVBdEluZGV4OiAoc2NvcGUsIGluZGV4KSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLm51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaW5kZXgpXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgdmFsdWUgb2YgYSAocG9zc2libGUpIG51bWJlciB2YXJpYWJsZS4gSWYgYSBjb25zdGFudCBudW1iZXIgdmFsdWUgaXMgc3BlY2lmaWVkLCB0aGlzIG1ldGhvZFxuICAgICogZG9lcyBub3RoaW5nIGFuIGp1c3QgcmV0dXJucyB0aGF0IGNvbnN0YW50IHZhbHVlLiBUaGF0J3MgdG8gbWFrZSBpdCBtb3JlIGNvbWZvcnRhYmxlIHRvIGp1c3QgcGFzcyBhIHZhbHVlIHdoaWNoXG4gICAgKiBjYW4gYmUgY2FsY3VsYXRlZCBieSB2YXJpYWJsZSBidXQgYWxzbyBiZSBqdXN0IGEgY29uc3RhbnQgdmFsdWUuXG4gICAgKlxuICAgICogQG1ldGhvZCBudW1iZXJWYWx1ZU9mXG4gICAgKiBAcGFyYW0ge251bWJlcnxPYmplY3R9IG9iamVjdCAtIEEgbnVtYmVyIHZhcmlhYmxlIG9yIGNvbnN0YW50IG51bWJlciB2YWx1ZS5cbiAgICAqIEByZXR1cm4ge051bWJlcn0gVGhlIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgICAgIFxuICAgIG51bWJlclZhbHVlT2Y6IChvYmplY3QpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUubnVtYmVyVmFsdWVPZihvYmplY3QpXG4gICAgXG4gICAgIyMjKlxuICAgICogSXQgZG9lcyB0aGUgc2FtZSBsaWtlIDxiPm51bWJlclZhbHVlT2Y8L2I+IHdpdGggb25lIGRpZmZlcmVuY2U6IElmIHRoZSBzcGVjaWZpZWQgb2JqZWN0XG4gICAgKiBpcyBhIHZhcmlhYmxlLCBpdCdzIHZhbHVlIGlzIGNvbnNpZGVyZWQgYXMgYSBkdXJhdGlvbi12YWx1ZSBpbiBtaWxsaXNlY29uZHMgYW5kIGF1dG9tYXRpY2FsbHkgY29udmVydGVkXG4gICAgKiBpbnRvIGZyYW1lcy5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGR1cmF0aW9uVmFsdWVPZlxuICAgICogQHBhcmFtIHtudW1iZXJ8T2JqZWN0fSBvYmplY3QgLSBBIG51bWJlciB2YXJpYWJsZSBvciBjb25zdGFudCBudW1iZXIgdmFsdWUuXG4gICAgKiBAcmV0dXJuIHtOdW1iZXJ9IFRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuXG4gICAgIyMjICAgICBcbiAgICBkdXJhdGlvblZhbHVlT2Y6IChvYmplY3QpIC0+IFxuICAgICAgICBpZiBvYmplY3QgYW5kIG9iamVjdC5pbmRleD9cbiAgICAgICAgICAgIE1hdGgucm91bmQoR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5udW1iZXJWYWx1ZU9mKG9iamVjdCkgLyAxMDAwICogR3JhcGhpY3MuZnJhbWVSYXRlKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBNYXRoLnJvdW5kKEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUubnVtYmVyVmFsdWVPZihvYmplY3QpKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIGEgcG9zaXRpb24gKHt4LCB5fSkgZm9yIHRoZSBzcGVjaWZpZWQgcHJlZGVmaW5lZCBvYmplY3QgcG9zaXRpb24gY29uZmlndXJlZCBpbiBcbiAgICAqIERhdGFiYXNlIC0gU3lzdGVtLlxuICAgICpcbiAgICAqIEBtZXRob2QgcHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uXG4gICAgKiBAcGFyYW0ge251bWJlcn0gcG9zaXRpb24gLSBUaGUgaW5kZXgvSUQgb2YgdGhlIHByZWRlZmluZWQgb2JqZWN0IHBvc2l0aW9uIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBzZXQgdGhlIHBvc2l0aW9uIGZvci5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBUaGUgcGFyYW1zIG9iamVjdCBvZiB0aGUgc2NlbmUgY29tbWFuZC5cbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIHBvc2l0aW9uIHt4LCB5fS5cbiAgICAjIyNcbiAgICBwcmVkZWZpbmVkT2JqZWN0UG9zaXRpb246IChwb3NpdGlvbiwgb2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIG9iamVjdFBvc2l0aW9uID0gUmVjb3JkTWFuYWdlci5zeXN0ZW0ub2JqZWN0UG9zaXRpb25zW3Bvc2l0aW9uXVxuICAgICAgICBpZiAhb2JqZWN0UG9zaXRpb24gdGhlbiByZXR1cm4geyB4OiAwLCB5OiAwIH1cbiAgICAgICAgXG4gICAgICAgIGlmIG5vdCBvYmplY3RQb3NpdGlvbi5mdW5jP1xuICAgICAgICAgICAgZiA9IGV2YWwoXCIoZnVuY3Rpb24ob2JqZWN0LCBwYXJhbXMpe1wiICsgb2JqZWN0UG9zaXRpb24uc2NyaXB0ICsgXCJ9KVwiKVxuICAgICAgICAgICAgb2JqZWN0UG9zaXRpb24uZnVuYyA9IGZcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBvYmplY3RQb3NpdGlvbi5mdW5jKG9iamVjdCwgcGFyYW1zKSB8fCB7IHg6IDAsIHk6IDAgfVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIG51bWJlciB2YXJpYWJsZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0TnVtYmVyVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUncyBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSBpbmRleCBvZiB0aGUgdmFyaWFibGUgdG8gc2V0LlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIG51bWJlciB2YWx1ZSB0byBzZXQgdGhlIHZhcmlhYmxlIHRvLlxuICAgICMjI1xuICAgIHNldE51bWJlclZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbikgLT4gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGluZGV4LCB2YWx1ZSwgZG9tYWluKVxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIHZhbHVlIG9mIGEgbnVtYmVyIHZhcmlhYmxlLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0TnVtYmVyVmFsdWVUb1xuICAgICogQHBhcmFtIHtudW1iZXJ9IHZhcmlhYmxlIC0gVGhlIHZhcmlhYmxlIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBudW1iZXIgdmFsdWUgdG8gc2V0IHRoZSB2YXJpYWJsZSB0by5cbiAgICAjIyNcbiAgICBzZXROdW1iZXJWYWx1ZVRvOiAodmFyaWFibGUsIHZhbHVlKSAtPiBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldE51bWJlclZhbHVlVG8odmFyaWFibGUsIHZhbHVlKVxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIHZhbHVlIG9mIGEgbGlzdCB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldExpc3RPYmplY3RUb1xuICAgICogQHBhcmFtIHtPYmplY3R9IHZhcmlhYmxlIC0gVGhlIHZhcmlhYmxlIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSB2YWx1ZSAtIFRoZSBsaXN0IG9iamVjdCB0byBzZXQgdGhlIHZhcmlhYmxlIHRvLlxuICAgICMjI1xuICAgIHNldExpc3RPYmplY3RUbzogKHZhcmlhYmxlLCB2YWx1ZSkgLT4gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXRMaXN0T2JqZWN0VG8odmFyaWFibGUsIHZhbHVlKVxuXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgdmFsdWUgb2YgYSBib29sZWFuL3N3aXRjaCB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldEJvb2xlYW5WYWx1ZVRvXG4gICAgKiBAcGFyYW0ge09iamVjdH0gdmFyaWFibGUgLSBUaGUgdmFyaWFibGUgdG8gc2V0LlxuICAgICogQHBhcmFtIHtib29sZWFufSB2YWx1ZSAtIFRoZSBib29sZWFuIHZhbHVlIHRvIHNldCB0aGUgdmFyaWFibGUgdG8uXG4gICAgIyMjXG4gICAgc2V0Qm9vbGVhblZhbHVlVG86ICh2YXJpYWJsZSwgdmFsdWUpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0Qm9vbGVhblZhbHVlVG8odmFyaWFibGUsIHZhbHVlKVxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIHZhbHVlIG9mIGEgbnVtYmVyIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXRCb29sZWFuVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUncyBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSBpbmRleCBvZiB0aGUgdmFyaWFibGUgdG8gc2V0LlxuICAgICogQHBhcmFtIHtib29sZWFufSB2YWx1ZSAtIFRoZSBib29sZWFuIHZhbHVlIHRvIHNldCB0aGUgdmFyaWFibGUgdG8uXG4gICAgIyMjXG4gICAgc2V0Qm9vbGVhblZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbikgLT4gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXRCb29sZWFuVmFsdWVBdEluZGV4KHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbilcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHN0cmluZy90ZXh0IHZhcmlhYmxlLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0U3RyaW5nVmFsdWVUb1xuICAgICogQHBhcmFtIHtPYmplY3R9IHZhcmlhYmxlIC0gVGhlIHZhcmlhYmxlIHRvIHNldC5cbiAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzdHJpbmcvdGV4dCB2YWx1ZSB0byBzZXQgdGhlIHZhcmlhYmxlIHRvLlxuICAgICMjI1xuICAgIHNldFN0cmluZ1ZhbHVlVG86ICh2YXJpYWJsZSwgdmFsdWUpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0U3RyaW5nVmFsdWVUbyh2YXJpYWJsZSwgdmFsdWUpXG4gICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgdmFsdWUgb2YgdGhlIHN0cmluZyB2YXJpYWJsZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0U3RyaW5nVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUgc2NvcGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBUaGUgdmFyaWFibGUncyBpbmRleC5cbiAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBzZXQuXG4gICAgIyMjICAgICBcbiAgICBzZXRTdHJpbmdWYWx1ZUF0SW5kZXg6IChzY29wZSwgaW5kZXgsIHZhbHVlLCBkb21haW4pIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0U3RyaW5nVmFsdWVBdEluZGV4KHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbilcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgKHBvc3NpYmxlKSBzdHJpbmcgdmFyaWFibGUuIElmIGEgY29uc3RhbnQgc3RyaW5nIHZhbHVlIGlzIHNwZWNpZmllZCwgdGhpcyBtZXRob2RcbiAgICAqIGRvZXMgbm90aGluZyBhbiBqdXN0IHJldHVybnMgdGhhdCBjb25zdGFudCB2YWx1ZS4gVGhhdCdzIHRvIG1ha2UgaXQgbW9yZSBjb21mb3J0YWJsZSB0byBqdXN0IHBhc3MgYSB2YWx1ZSB3aGljaFxuICAgICogY2FuIGJlIGNhbGN1bGF0ZWQgYnkgdmFyaWFibGUgYnV0IGFsc28gYmUganVzdCBhIGNvbnN0YW50IHZhbHVlLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc3RyaW5nVmFsdWVPZlxuICAgICogQHBhcmFtIHtzdHJpbmd8T2JqZWN0fSBvYmplY3QgLSBBIHN0cmluZyB2YXJpYWJsZSBvciBjb25zdGFudCBzdHJpbmcgdmFsdWUuXG4gICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuXG4gICAgIyMjIFxuICAgIHN0cmluZ1ZhbHVlT2Y6IChvYmplY3QpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc3RyaW5nVmFsdWVPZihvYmplY3QpXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgdmFsdWUgb2YgdGhlIHN0cmluZyB2YXJpYWJsZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc3RyaW5nVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUncyBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSBpbmRleCBvZiB0aGUgdmFyaWFibGUgdG8gZ2V0IHRoZSB2YWx1ZSBmcm9tLlxuICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyAgICAgXG4gICAgc3RyaW5nVmFsdWVBdEluZGV4OiAoc2NvcGUsIGluZGV4LCBkb21haW4pIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc3RyaW5nVmFsdWVBdEluZGV4KHNjb3BlLCBpbmRleCwgZG9tYWluKVxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgKHBvc3NpYmxlKSBib29sZWFuIHZhcmlhYmxlLiBJZiBhIGNvbnN0YW50IGJvb2xlYW4gdmFsdWUgaXMgc3BlY2lmaWVkLCB0aGlzIG1ldGhvZFxuICAgICogZG9lcyBub3RoaW5nIGFuIGp1c3QgcmV0dXJucyB0aGF0IGNvbnN0YW50IHZhbHVlLiBUaGF0J3MgdG8gbWFrZSBpdCBtb3JlIGNvbWZvcnRhYmxlIHRvIGp1c3QgcGFzcyBhIHZhbHVlIHdoaWNoXG4gICAgKiBjYW4gYmUgY2FsY3VsYXRlZCBieSB2YXJpYWJsZSBidXQgYWxzbyBiZSBqdXN0IGEgY29uc3RhbnQgdmFsdWUuXG4gICAgKlxuICAgICogQG1ldGhvZCBib29sZWFuVmFsdWVPZlxuICAgICogQHBhcmFtIHtib29sZWFufE9iamVjdH0gb2JqZWN0IC0gQSBib29sZWFuIHZhcmlhYmxlIG9yIGNvbnN0YW50IGJvb2xlYW4gdmFsdWUuXG4gICAgKiBAcmV0dXJuIHtib29sZWFufSBUaGUgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyBcbiAgICBib29sZWFuVmFsdWVPZjogKG9iamVjdCkgLT4gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5ib29sZWFuVmFsdWVPZihvYmplY3QpXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgdmFsdWUgb2YgdGhlIGJvb2xlYW4gdmFyaWFibGUgYXQgdGhlIHNwZWNpZmllZCBpbmRleC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGJvb2xlYW5WYWx1ZUF0SW5kZXhcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29wZSAtIFRoZSB2YXJpYWJsZSdzIHNjb3BlLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gVGhlIGluZGV4IG9mIHRoZSB2YXJpYWJsZSB0byBnZXQgdGhlIHZhbHVlIGZyb20uXG4gICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuXG4gICAgIyMjICAgICBcbiAgICBib29sZWFuVmFsdWVBdEluZGV4OiAoc2NvcGUsIGluZGV4LCBkb21haW4pIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuYm9vbGVhblZhbHVlQXRJbmRleChzY29wZSwgaW5kZXgsIGRvbWFpbilcbiAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIChwb3NzaWJsZSkgbGlzdCB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGxpc3RPYmplY3RPZlxuICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIEEgbGlzdCB2YXJpYWJsZS5cbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIHZhbHVlIG9mIHRoZSBsaXN0IHZhcmlhYmxlLlxuICAgICMjIyBcbiAgICBsaXN0T2JqZWN0T2Y6IChvYmplY3QpIC0+IEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUubGlzdE9iamVjdE9mKG9iamVjdClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDb21wYXJlcyB0d28gb2JqZWN0IHVzaW5nIHRoZSBzcGVjaWZpZWQgb3BlcmF0aW9uIGFuZCByZXR1cm5zIHRoZSByZXN1bHQuXG4gICAgKlxuICAgICogQG1ldGhvZCBjb21wYXJlXG4gICAgKiBAcGFyYW0ge09iamVjdH0gYSAtIE9iamVjdCBBLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGIgLSBPYmplY3QgQi5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBvcGVyYXRpb24gLSBUaGUgY29tcGFyZS1vcGVyYXRpb24gdG8gY29tcGFyZSBPYmplY3QgQSB3aXRoIE9iamVjdCBCLlxuICAgICogPHVsPlxuICAgICogPGxpPjAgPSBFcXVhbCBUbzwvbGk+XG4gICAgKiA8bGk+MSA9IE5vdCBFcXVhbCBUbzwvbGk+XG4gICAgKiA8bGk+MiA9IEdyZWF0ZXIgVGhhbjwvbGk+XG4gICAgKiA8bGk+MyA9IEdyZWF0ZXIgb3IgRXF1YWwgVG88L2xpPlxuICAgICogPGxpPjQgPSBMZXNzIFRoYW48L2xpPlxuICAgICogPGxpPjUgPSBMZXNzIG9yIEVxdWFsIFRvPC9saT5cbiAgICAqIDwvdWw+XG4gICAgKiBAcmV0dXJuIHtib29sZWFufSBUaGUgY29tcGFyaXNvbiByZXN1bHQuXG4gICAgIyMjIFxuICAgIGNvbXBhcmU6IChhLCBiLCBvcGVyYXRpb24pIC0+XG4gICAgICAgIHN3aXRjaCBvcGVyYXRpb25cbiAgICAgICAgICAgIHdoZW4gMCB0aGVuIHJldHVybiBgYSA9PSBiYFxuICAgICAgICAgICAgd2hlbiAxIHRoZW4gcmV0dXJuIGBhICE9IGJgXG4gICAgICAgICAgICB3aGVuIDIgdGhlbiByZXR1cm4gYSA+IGJcbiAgICAgICAgICAgIHdoZW4gMyB0aGVuIHJldHVybiBhID49IGJcbiAgICAgICAgICAgIHdoZW4gNCB0aGVuIHJldHVybiBhIDwgYlxuICAgICAgICAgICAgd2hlbiA1IHRoZW4gcmV0dXJuIGEgPD0gYlxuICAgICBcbiAgICAjIyMqXG4gICAgKiBDaGFuZ2VzIG51bWJlciB2YXJpYWJsZXMgYW5kIGFsbG93cyBkZWNpbWFsIHZhbHVlcyBzdWNoIGFzIDAuNSB0b28uXG4gICAgKlxuICAgICogQG1ldGhvZCBjaGFuZ2VEZWNpbWFsVmFyaWFibGVzXG4gICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gSW5wdXQgcGFyYW1zIGZyb20gdGhlIGNvbW1hbmRcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSByb3VuZE1ldGhvZCAtIFRoZSByZXN1bHQgb2YgdGhlIG9wZXJhdGlvbiB3aWxsIGJlIHJvdW5kZWQgdXNpbmcgdGhlIHNwZWNpZmllZCBtZXRob2QuXG4gICAgKiA8dWw+XG4gICAgKiA8bGk+MCA9IE5vbmUuIFRoZSByZXN1bHQgd2lsbCBub3QgYmUgcm91bmRlZC48L2xpPlxuICAgICogPGxpPjEgPSBDb21tZXJjaWFsbHk8L2xpPlxuICAgICogPGxpPjIgPSBSb3VuZCBVcDwvbGk+XG4gICAgKiA8bGk+MyA9IFJvdW5kIERvd248L2xpPlxuICAgICogPC91bD5cbiAgICAjIyMgICAgICAgXG4gICAgY2hhbmdlRGVjaW1hbFZhcmlhYmxlczogKHBhcmFtcywgcm91bmRNZXRob2QpIC0+XG4gICAgICAgIHNvdXJjZSA9IDBcbiAgICAgICAgcm91bmRGdW5jID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIHJvdW5kTWV0aG9kXG4gICAgICAgICAgICB3aGVuIDAgdGhlbiByb3VuZEZ1bmMgPSAodmFsdWUpIC0+IHZhbHVlXG4gICAgICAgICAgICB3aGVuIDEgdGhlbiByb3VuZEZ1bmMgPSAodmFsdWUpIC0+IE1hdGgucm91bmQodmFsdWUpXG4gICAgICAgICAgICB3aGVuIDIgdGhlbiByb3VuZEZ1bmMgPSAodmFsdWUpIC0+IE1hdGguY2VpbCh2YWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMyB0aGVuIHJvdW5kRnVuYyA9ICh2YWx1ZSkgLT4gTWF0aC5mbG9vcih2YWx1ZSlcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBwYXJhbXMuc291cmNlXG4gICAgICAgICAgICB3aGVuIDAgIyBDb25zdGFudCBWYWx1ZSAvIFZhcmlhYmxlIFZhbHVlXG4gICAgICAgICAgICAgICAgc291cmNlID0gQG51bWJlclZhbHVlT2YocGFyYW1zLnNvdXJjZVZhbHVlKVxuICAgICAgICAgICAgd2hlbiAxICMgUmFuZG9tXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMuc291cmNlUmFuZG9tLnN0YXJ0KVxuICAgICAgICAgICAgICAgIGVuZCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5zb3VyY2VSYW5kb20uZW5kKVxuICAgICAgICAgICAgICAgIGRpZmYgPSBlbmQgLSBzdGFydFxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IE1hdGguZmxvb3Ioc3RhcnQgKyBNYXRoLnJhbmRvbSgpICogKGRpZmYrMSkpXG4gICAgICAgICAgICB3aGVuIDIgIyBQb2ludGVyXG4gICAgICAgICAgICAgICAgc291cmNlID0gQG51bWJlclZhbHVlQXRJbmRleChwYXJhbXMuc291cmNlU2NvcGUsIEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5zb3VyY2VSZWZlcmVuY2UpLTEsIHBhcmFtcy5zb3VyY2VSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICB3aGVuIDMgIyBHYW1lIERhdGFcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBAbnVtYmVyVmFsdWVPZkdhbWVEYXRhKHBhcmFtcy5zb3VyY2VWYWx1ZTEpXG4gICAgICAgICAgICB3aGVuIDQgIyBEYXRhYmFzZSBEYXRhXG4gICAgICAgICAgICAgICAgc291cmNlID0gQG51bWJlclZhbHVlT2ZEYXRhYmFzZURhdGEocGFyYW1zLnNvdXJjZVZhbHVlMSlcbiAgICAgICAgICAgIFxuICAgICAgICBzd2l0Y2ggcGFyYW1zLnRhcmdldFxuICAgICAgICAgICAgd2hlbiAwICMgVmFyaWFibGVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZVRvKHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgcm91bmRGdW5jKHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlVG8ocGFyYW1zLnRhcmdldFZhcmlhYmxlLCByb3VuZEZ1bmMoQG51bWJlclZhbHVlT2YocGFyYW1zLnRhcmdldFZhcmlhYmxlKSArIHNvdXJjZSkgKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBTdWJcbiAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZVRvKHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgcm91bmRGdW5jKEBudW1iZXJWYWx1ZU9mKHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgLSBzb3VyY2UpIClcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgTXVsXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVPZihwYXJhbXMudGFyZ2V0VmFyaWFibGUpICogc291cmNlKSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA0ICMgRGl2XG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVPZihwYXJhbXMudGFyZ2V0VmFyaWFibGUpIC8gc291cmNlKSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgTW9kXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhwYXJhbXMudGFyZ2V0VmFyaWFibGUsIEBudW1iZXJWYWx1ZU9mKHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgJSBzb3VyY2UpXG4gICAgICAgICAgICB3aGVuIDEgIyBSYW5nZVxuICAgICAgICAgICAgICAgIHNjb3BlID0gcGFyYW1zLnRhcmdldFNjb3BlXG4gICAgICAgICAgICAgICAgc3RhcnQgPSBwYXJhbXMudGFyZ2V0UmFuZ2Uuc3RhcnQtMVxuICAgICAgICAgICAgICAgIGVuZCA9IHBhcmFtcy50YXJnZXRSYW5nZS5lbmQtMVxuICAgICAgICAgICAgICAgIGZvciBpIGluIFtzdGFydC4uZW5kXVxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgcm91bmRGdW5jKHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBBZGRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpLCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgKyBzb3VyY2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgU3ViXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgcm91bmRGdW5jKEBudW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGkpIC0gc291cmNlKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMyAjIE11bFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBzZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpKSAqIHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDQgIyBEaXZcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpLCByb3VuZEZ1bmMoQG51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgLyBzb3VyY2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgTW9kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgQG51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgJSBzb3VyY2UpXG4gICAgICAgICAgICB3aGVuIDIgIyBSZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBpbmRleCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy50YXJnZXRSZWZlcmVuY2UpIC0gMVxuICAgICAgICAgICAgICAgIHN3aXRjaCBwYXJhbXMub3BlcmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIFNldFxuICAgICAgICAgICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlQXRJbmRleChwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCByb3VuZEZ1bmMoc291cmNlKSwgcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pICsgc291cmNlKSwgcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgU3ViXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pIC0gc291cmNlKSwgcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgTXVsXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pICogc291cmNlKSwgcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA0ICMgRGl2XG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHJvdW5kRnVuYyhAbnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pIC8gc291cmNlKSwgcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgTW9kXG4gICAgICAgICAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVBdEluZGV4KHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIEBudW1iZXJWYWx1ZUF0SW5kZXgocGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbikgJSBzb3VyY2UsIHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiBudWxsXG4gICAgIFxuICAgICMjIypcbiAgICAqIFNoYWtlcyBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2hha2VPYmplY3RcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBzaGFrZS5cbiAgICAqIEByZXR1cm4ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvIGFib3V0IHRoZSBzaGFrZS1hbmltYXRpb24uXG4gICAgIyMjICAgICAgICBcbiAgICBzaGFrZU9iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBkdXJhdGlvbiA9IE1hdGgubWF4KE1hdGgucm91bmQoQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pKSwgMilcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBvYmplY3QuYW5pbWF0b3Iuc2hha2UoeyB4OiBAbnVtYmVyVmFsdWVPZihwYXJhbXMucmFuZ2UueCksIHk6IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5yYW5nZS55KSB9LCBAbnVtYmVyVmFsdWVPZihwYXJhbXMuc3BlZWQpIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogTGV0cyB0aGUgaW50ZXJwcmV0ZXIgd2FpdCBmb3IgdGhlIGNvbXBsZXRpb24gb2YgYSBydW5uaW5nIG9wZXJhdGlvbiBsaWtlIGFuIGFuaW1hdGlvbiwgZXRjLlxuICAgICpcbiAgICAqIEBtZXRob2Qgd2FpdEZvckNvbXBsZXRpb25cbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0aGUgb3BlcmF0aW9uIGlzIGV4ZWN1dGVkIG9uLiBDYW4gYmUgPGI+bnVsbDwvYj4uXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgIFxuICAgIHdhaXRGb3JDb21wbGV0aW9uOiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIGR1cmF0aW9uID0gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgIFxuICAgICMjIypcbiAgICAqIEVyYXNlcyBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2QgZXJhc2VPYmplY3RcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBlcmFzZS5cbiAgICAqIEByZXR1cm4ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyAgICAgIFxuICAgIGVyYXNlT2JqZWN0OiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3IuZGlzYXBwZWFyKHBhcmFtcy5hbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sIChzZW5kZXIpID0+IFxuICAgICAgICAgICAgc2VuZGVyLmRpc3Bvc2UoKVxuICAgICAgICApXG4gICAgICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb24gXG4gICAgXG4gICAgIyMjKlxuICAgICogU2hvd3MgYSBnYW1lIG9iamVjdCBvbiBzY3JlZW4uXG4gICAgKlxuICAgICogQG1ldGhvZCBzaG93T2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gc2hvdy5cbiAgICAqIEBwYXJhbSB7Z3MuUG9pbnR9IHBvc2l0aW9uIC0gVGhlIHBvc2l0aW9uIHdoZXJlIHRoZSBnYW1lIG9iamVjdCBzaG91bGQgYmUgc2hvd24uXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyAgICAgICAgICBcbiAgICBzaG93T2JqZWN0OiAob2JqZWN0LCBwb3NpdGlvbiwgcGFyYW1zKSAtPlxuICAgICAgICB4ID0gQG51bWJlclZhbHVlT2YocG9zaXRpb24ueClcbiAgICAgICAgeSA9IEBudW1iZXJWYWx1ZU9mKHBvc2l0aW9uLnkpXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgXG4gICAgICAgIG9iamVjdC5hbmltYXRvci5hcHBlYXIoeCwgeSwgcGFyYW1zLmFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICBcbiAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogTW92ZXMgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG1vdmVPYmplY3RcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBtb3ZlLlxuICAgICogQHBhcmFtIHtncy5Qb2ludH0gcG9zaXRpb24gLSBUaGUgcG9zaXRpb24gdG8gbW92ZSB0aGUgZ2FtZSBvYmplY3QgdG8uXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyBcbiAgICBtb3ZlT2JqZWN0OiAob2JqZWN0LCBwb3NpdGlvbiwgcGFyYW1zKSAtPlxuICAgICAgICBpZiBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAcHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKHBhcmFtcy5wcmVkZWZpbmVkUG9zaXRpb25JZCwgb2JqZWN0LCBwYXJhbXMpXG4gICAgICAgICAgICB4ID0gcC54XG4gICAgICAgICAgICB5ID0gcC55XG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHggPSBAbnVtYmVyVmFsdWVPZihwb3NpdGlvbi54KVxuICAgICAgICAgICAgeSA9IEBudW1iZXJWYWx1ZU9mKHBvc2l0aW9uLnkpXG4gICAgXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBcbiAgICAgICAgb2JqZWN0LmFuaW1hdG9yLm1vdmVUbyh4LCB5LCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIE1vdmVzIGEgZ2FtZSBvYmplY3QgYWxvbmcgYSBwYXRoLlxuICAgICpcbiAgICAqIEBtZXRob2QgbW92ZU9iamVjdFBhdGhcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byBtb3ZlLlxuICAgICogQHBhcmFtIHtPYmplY3R9IHBhdGggLSBUaGUgcGF0aCB0byBtb3ZlIHRoZSBnYW1lIG9iamVjdCBhbG9uZy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjIFxuICAgIG1vdmVPYmplY3RQYXRoOiAob2JqZWN0LCBwYXRoLCBwYXJhbXMpIC0+XG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3IubW92ZVBhdGgocGF0aC5kYXRhLCBwYXJhbXMubG9vcFR5cGUsIGR1cmF0aW9uLCBlYXNpbmcsIHBhdGguZWZmZWN0cz8uZGF0YSlcbiAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogU2Nyb2xscyBhIHNjcm9sbGFibGUgZ2FtZSBvYmplY3QgYWxvbmcgYSBwYXRoLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2Nyb2xsT2JqZWN0UGF0aFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIHNjcm9sbC5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXRoIC0gVGhlIHBhdGggdG8gc2Nyb2xsIHRoZSBnYW1lIG9iamVjdCBhbG9uZy5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjICAgICAgICBcbiAgICBzY3JvbGxPYmplY3RQYXRoOiAob2JqZWN0LCBwYXRoLCBwYXJhbXMpIC0+XG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3Iuc2Nyb2xsUGF0aChwYXRoLCBwYXJhbXMubG9vcFR5cGUsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgXG4gICAgICAgIGlmIHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogWm9vbXMvU2NhbGVzIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCB6b29tT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gem9vbS5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjIFxuICAgIHpvb21PYmplY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIG9iamVjdC5hbmltYXRvci56b29tVG8oQG51bWJlclZhbHVlT2YocGFyYW1zLnpvb21pbmcueCkgLyAxMDAsIEBudW1iZXJWYWx1ZU9mKHBhcmFtcy56b29taW5nLnkpIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBSb3RhdGVzIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCByb3RhdGVPYmplY3RcbiAgICAqIEBwYXJhbSB7Z3MuT2JqZWN0X0Jhc2V9IG9iamVjdCAtIFRoZSBnYW1lIG9iamVjdCB0byByb3RhdGUuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyBcbiAgICByb3RhdGVPYmplY3Q6IChvYmplY3QsIHBhcmFtcykgLT5cbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIFxuICAgICAgICAjaWYgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgIyAgICBhY3R1YWxEdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgIyAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YoQGR1cmF0aW9uKVxuICAgICAgICAjICAgIHNwZWVkID0gQG51bWJlclZhbHVlT2YoQHBhcmFtcy5zcGVlZCkgLyAxMDBcbiAgICAgICAgIyAgICBzcGVlZCA9IE1hdGgucm91bmQoZHVyYXRpb24gLyAoYWN0dWFsRHVyYXRpb258fDEpICogc3BlZWQpXG4gICAgICAgICMgICAgcGljdHVyZS5hbmltYXRvci5yb3RhdGUoQHBhcmFtcy5kaXJlY3Rpb24sIHNwZWVkLCBhY3R1YWxEdXJhdGlvbnx8MSwgZWFzaW5nKVxuICAgICAgICAjICAgIGR1cmF0aW9uID0gYWN0dWFsRHVyYXRpb25cbiAgICAgICAgI2Vsc2VcbiAgICAgICAgIyAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICAjICAgIG9iamVjdC5hbmltYXRvci5yb3RhdGUocGFyYW1zLmRpcmVjdGlvbiwgQG51bWJlclZhbHVlT2YoQHBhcmFtcy5zcGVlZCkgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBvYmplY3QuYW5pbWF0b3Iucm90YXRlKHBhcmFtcy5kaXJlY3Rpb24sIEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5zcGVlZCkgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICBcbiAgICAjIyMqXG4gICAgKiBCbGVuZHMgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGJsZW5kT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gYmxlbmQuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjI1xuICAgIGJsZW5kT2JqZWN0OiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3IuYmxlbmRUbyhAbnVtYmVyVmFsdWVPZihwYXJhbXMub3BhY2l0eSksIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHdhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEV4ZWN1dGVzIGEgbWFza2luZy1lZmZlY3Qgb24gYSBnYW1lIG9iamVjdC4uXG4gICAgKlxuICAgICogQG1ldGhvZCBtYXNrT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gZXhlY3V0ZSBhIG1hc2tpbmctZWZmZWN0IG9uLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyMgXG4gICAgbWFza09iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgIFxuICAgICAgICBpZiBwYXJhbXMubWFzay50eXBlID09IDBcbiAgICAgICAgICAgIG9iamVjdC5tYXNrLnR5cGUgPSAwXG4gICAgICAgICAgICBvYmplY3QubWFzay5veCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5tYXNrLm94KVxuICAgICAgICAgICAgb2JqZWN0Lm1hc2sub3kgPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMubWFzay5veSlcbiAgICAgICAgICAgIGlmIG9iamVjdC5tYXNrLnNvdXJjZT8udmlkZW9FbGVtZW50P1xuICAgICAgICAgICAgICAgIG9iamVjdC5tYXNrLnNvdXJjZS5wYXVzZSgpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBwYXJhbXMubWFzay5zb3VyY2VUeXBlID09IDBcbiAgICAgICAgICAgICAgICBvYmplY3QubWFzay5zb3VyY2UgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvTWFza3MvI3twYXJhbXMubWFzay5ncmFwaGljPy5uYW1lfVwiKVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIG9iamVjdC5tYXNrLnNvdXJjZSA9IFJlc291cmNlTWFuYWdlci5nZXRWaWRlbyhcIk1vdmllcy8je3BhcmFtcy5tYXNrLnZpZGVvPy5uYW1lfVwiKVxuICAgICAgICAgICAgICAgIGlmIG9iamVjdC5tYXNrLnNvdXJjZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QubWFzay5zb3VyY2UucGxheSgpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5tYXNrLnNvdXJjZS5sb29wID0geWVzXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGR1cmF0aW9uID0gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgICAgICBvYmplY3QuYW5pbWF0b3IubWFza1RvKHBhcmFtcy5tYXNrLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICBcbiAgICAjIyMqXG4gICAgKiBUaW50cyBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2QgdGludE9iamVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIHRpbnQuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyAgICAgICBcbiAgICB0aW50T2JqZWN0OiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIGR1cmF0aW9uID0gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChwYXJhbXMuZWFzaW5nKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3IudGludFRvKHBhcmFtcy50b25lLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgIFxuICAgICMjIypcbiAgICAqIEZsYXNoZXMgYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGZsYXNoT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gZmxhc2guXG4gICAgKiBAcGFyYW0ge09iamVjdH0gQSBwYXJhbXMgb2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBpbmZvLlxuICAgICMjIyBcbiAgICBmbGFzaE9iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBvYmplY3QuYW5pbWF0b3IuZmxhc2gobmV3IENvbG9yKHBhcmFtcy5jb2xvciksIGR1cmF0aW9uKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgXG4gICAgIyMjKlxuICAgICogQ3JvcGVzIGEgZ2FtZSBvYmplY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBjcm9wT2JqZWN0XG4gICAgKiBAcGFyYW0ge2dzLk9iamVjdF9CYXNlfSBvYmplY3QgLSBUaGUgZ2FtZSBvYmplY3QgdG8gY3JvcC5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjICAgICAgICAgXG4gICAgY3JvcE9iamVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBvYmplY3Quc3JjUmVjdC54ID0gQG51bWJlclZhbHVlT2YocGFyYW1zLngpXG4gICAgICAgIG9iamVjdC5zcmNSZWN0LnkgPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMueSlcbiAgICAgICAgb2JqZWN0LnNyY1JlY3Qud2lkdGggPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMud2lkdGgpXG4gICAgICAgIG9iamVjdC5zcmNSZWN0LmhlaWdodCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5oZWlnaHQpXG4gICAgICAgIFxuICAgICAgICBvYmplY3QuZHN0UmVjdC53aWR0aCA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy53aWR0aClcbiAgICAgICAgb2JqZWN0LmRzdFJlY3QuaGVpZ2h0ID0gQG51bWJlclZhbHVlT2YocGFyYW1zLmhlaWdodClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSBtb3Rpb24gYmx1ciBzZXR0aW5ncyBvZiBhIGdhbWUgb2JqZWN0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgb2JqZWN0TW90aW9uQmx1clxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIHNldCB0aGUgbW90aW9uIGJsdXIgc2V0dGluZ3MgZm9yLlxuICAgICogQHBhcmFtIHtPYmplY3R9IEEgcGFyYW1zIG9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgaW5mby5cbiAgICAjIyNcbiAgICBvYmplY3RNb3Rpb25CbHVyOiAob2JqZWN0LCBwYXJhbXMpIC0+XG4gICAgICAgIG9iamVjdC5tb3Rpb25CbHVyLnNldChwYXJhbXMubW90aW9uQmx1cilcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogRW5hYmxlcyBhbiBlZmZlY3Qgb24gYSBnYW1lIG9iamVjdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9iamVjdEVmZmVjdFxuICAgICogQHBhcmFtIHtncy5PYmplY3RfQmFzZX0gb2JqZWN0IC0gVGhlIGdhbWUgb2JqZWN0IHRvIGV4ZWN1dGUgYSBtYXNraW5nLWVmZmVjdCBvbi5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBBIHBhcmFtcyBvYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGluZm8uXG4gICAgIyMjIFxuICAgIG9iamVjdEVmZmVjdDogKG9iamVjdCwgcGFyYW1zKSAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBkdXJhdGlvblZhbHVlT2YocGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QocGFyYW1zLmVhc2luZylcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBwYXJhbXMudHlwZVxuICAgICAgICAgICAgd2hlbiAwICMgV29iYmxlXG4gICAgICAgICAgICAgICAgb2JqZWN0LmFuaW1hdG9yLndvYmJsZVRvKHBhcmFtcy53b2JibGUucG93ZXIgLyAxMDAwMCwgcGFyYW1zLndvYmJsZS5zcGVlZCAvIDEwMCwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgICAgICAgICB3b2JibGUgPSBvYmplY3QuZWZmZWN0cy53b2JibGVcbiAgICAgICAgICAgICAgICB3b2JibGUuZW5hYmxlZCA9IHBhcmFtcy53b2JibGUucG93ZXIgPiAwXG4gICAgICAgICAgICAgICAgd29iYmxlLnZlcnRpY2FsID0gcGFyYW1zLndvYmJsZS5vcmllbnRhdGlvbiA9PSAwIG9yIHBhcmFtcy53b2JibGUub3JpZW50YXRpb24gPT0gMlxuICAgICAgICAgICAgICAgIHdvYmJsZS5ob3Jpem9udGFsID0gcGFyYW1zLndvYmJsZS5vcmllbnRhdGlvbiA9PSAxIG9yIHBhcmFtcy53b2JibGUub3JpZW50YXRpb24gPT0gMlxuICAgICAgICAgICAgd2hlbiAxICMgQmx1clxuICAgICAgICAgICAgICAgIG9iamVjdC5hbmltYXRvci5ibHVyVG8ocGFyYW1zLmJsdXIucG93ZXIgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgb2JqZWN0LmVmZmVjdHMuYmx1ci5lbmFibGVkID0geWVzXG4gICAgICAgICAgICB3aGVuIDIgIyBQaXhlbGF0ZVxuICAgICAgICAgICAgICAgIG9iamVjdC5hbmltYXRvci5waXhlbGF0ZVRvKHBhcmFtcy5waXhlbGF0ZS5zaXplLndpZHRoLCBwYXJhbXMucGl4ZWxhdGUuc2l6ZS5oZWlnaHQsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgb2JqZWN0LmVmZmVjdHMucGl4ZWxhdGUuZW5hYmxlZCA9IHllc1xuICAgIFxuICAgICAgICBpZiBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIGR1cmF0aW9uICE9IDBcbiAgICAgICAgICAgIEBpc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEB3YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gXG4gICAgIyMjKlxuICAgICogRXhlY3V0ZXMgYW4gYWN0aW9uIGxpa2UgZm9yIGEgaG90c3BvdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGV4ZWN1dGVBY3Rpb25cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBhY3Rpb24gLSBBY3Rpb24tRGF0YS5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gc3RhdGVWYWx1ZSAtIEluIGNhc2Ugb2Ygc3dpdGNoLWJpbmRpbmcsIHRoZSBzd2l0Y2ggaXMgc2V0IHRvIHRoaXMgdmFsdWUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gYmluZFZhbHVlIC0gQSBudW1iZXIgdmFsdWUgd2hpY2ggYmUgcHV0IGludG8gdGhlIGFjdGlvbidzIGJpbmQtdmFsdWUgdmFyaWFibGUuXG4gICAgIyMjXG4gICAgZXhlY3V0ZUFjdGlvbjogKGFjdGlvbiwgc3RhdGVWYWx1ZSwgYmluZFZhbHVlKSAtPlxuICAgICAgICBzd2l0Y2ggYWN0aW9uLnR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIEp1bXAgVG8gTGFiZWxcbiAgICAgICAgICAgICAgICBpZiBhY3Rpb24ubGFiZWxJbmRleFxuICAgICAgICAgICAgICAgICAgICBAcG9pbnRlciA9IGFjdGlvbi5sYWJlbEluZGV4XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBAanVtcFRvTGFiZWwoYWN0aW9uLmxhYmVsKVxuICAgICAgICAgICAgd2hlbiAxICMgQ2FsbCBDb21tb24gRXZlbnRcbiAgICAgICAgICAgICAgICBAY2FsbENvbW1vbkV2ZW50KGFjdGlvbi5jb21tb25FdmVudElkLCBudWxsLCBAaXNXYWl0aW5nKVxuICAgICAgICAgICAgd2hlbiAyICMgQmluZCBUbyBTd2l0Y2hcbiAgICAgICAgICAgICAgICBkb21haW4gPSBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLmRvbWFpblxuICAgICAgICAgICAgICAgIEBzZXRCb29sZWFuVmFsdWVUbyhhY3Rpb24uc3dpdGNoLCBzdGF0ZVZhbHVlKVxuICAgICAgICAgICAgd2hlbiAzICMgQ2FsbCBTY2VuZVxuICAgICAgICAgICAgICAgIEBjYWxsU2NlbmUoYWN0aW9uLnNjZW5lPy51aWQpXG4gICAgICAgICAgICB3aGVuIDQgIyBCaW5kIFZhbHVlIHRvIFZhcmlhYmxlXG4gICAgICAgICAgICAgICAgZG9tYWluID0gR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5kb21haW5cbiAgICAgICAgICAgICAgICBAc2V0TnVtYmVyVmFsdWVUbyhhY3Rpb24uYmluZFZhbHVlVmFyaWFibGUsIGJpbmRWYWx1ZSlcbiAgICAgICAgICAgICAgICBpZiBhY3Rpb24ubGFiZWxJbmRleFxuICAgICAgICAgICAgICAgICAgICBAcG9pbnRlciA9IGFjdGlvbi5sYWJlbEluZGV4XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBAanVtcFRvTGFiZWwoYWN0aW9uLmxhYmVsKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxscyBhIGNvbW1vbiBldmVudCBhbmQgcmV0dXJucyB0aGUgc3ViLWludGVycHJldGVyIGZvciBpdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGNhbGxDb21tb25FdmVudFxuICAgICogQHBhcmFtIHtudW1iZXJ9IGlkIC0gVGhlIElEIG9mIHRoZSBjb21tb24gZXZlbnQgdG8gY2FsbC5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbWV0ZXJzIC0gT3B0aW9uYWwgY29tbW9uIGV2ZW50IHBhcmFtZXRlcnMuXG4gICAgKiBAcGFyYW0ge2Jvb2xlYW59IHdhaXQgLSBJbmRpY2F0ZXMgaWYgdGhlIGludGVycHJldGVyIHNob3VsZCBiZSBzdGF5IGluIHdhaXRpbmctbW9kZSBldmVuIGlmIHRoZSBzdWItaW50ZXJwcmV0ZXIgaXMgZmluaXNoZWQuXG4gICAgIyMjIFxuICAgIGNhbGxDb21tb25FdmVudDogKGlkLCBwYXJhbWV0ZXJzLCB3YWl0KSAtPlxuICAgICAgICBjb21tb25FdmVudCA9IEdhbWVNYW5hZ2VyLmNvbW1vbkV2ZW50c1tpZF1cbiAgICAgICAgXG4gICAgICAgIGlmIGNvbW1vbkV2ZW50P1xuICAgICAgICAgICAgaWYgU2NlbmVNYW5hZ2VyLnNjZW5lLmNvbW1vbkV2ZW50Q29udGFpbmVyLnN1Yk9iamVjdHMuaW5kZXhPZihjb21tb25FdmVudCkgPT0gLTFcbiAgICAgICAgICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuY29tbW9uRXZlbnRDb250YWluZXIuYWRkT2JqZWN0KGNvbW1vbkV2ZW50KVxuICAgICAgICAgICAgY29tbW9uRXZlbnQuZXZlbnRzPy5vbiBcImZpbmlzaFwiLCBncy5DYWxsQmFjayhcIm9uQ29tbW9uRXZlbnRGaW5pc2hcIiwgdGhpcylcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQHN1YkludGVycHJldGVyID0gY29tbW9uRXZlbnQuYmVoYXZpb3IuY2FsbChwYXJhbWV0ZXJzIHx8IFtdLCBAc2V0dGluZ3MsIEBjb250ZXh0KVxuICAgICAgICAgICAgI0dhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuc2V0dXBMb2NhbFZhcmlhYmxlcyhAc3ViSW50ZXJwcmV0ZXIuY29udGV4dClcbiAgICAgICAgICAgICNHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldHVwVGVtcFZhcmlhYmxlcyhAc3ViSW50ZXJwcmV0ZXIuY29udGV4dClcbiAgICAgICAgICAgIGNvbW1vbkV2ZW50LmJlaGF2aW9yLnVwZGF0ZSgpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIEBzdWJJbnRlcnByZXRlcj9cbiAgICAgICAgICAgICAgICBAaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICAgICAgQHN1YkludGVycHJldGVyLnNldHRpbmdzID0gQHNldHRpbmdzXG4gICAgICAgICAgICAgICAgQHN1YkludGVycHJldGVyLnN0YXJ0KClcbiAgICAgICAgICAgICAgICBAc3ViSW50ZXJwcmV0ZXIudXBkYXRlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxscyBhIHNjZW5lIGFuZCByZXR1cm5zIHRoZSBzdWItaW50ZXJwcmV0ZXIgZm9yIGl0LlxuICAgICpcbiAgICAqIEBtZXRob2QgY2FsbFNjZW5lXG4gICAgKiBAcGFyYW0ge1N0cmluZ30gdWlkIC0gVGhlIFVJRCBvZiB0aGUgc2NlbmUgdG8gY2FsbC5cbiAgICAjIyMgICAgICAgICBcbiAgICBjYWxsU2NlbmU6ICh1aWQpIC0+XG4gICAgICAgIHNjZW5lRG9jdW1lbnQgPSBEYXRhTWFuYWdlci5nZXREb2N1bWVudCh1aWQpXG4gICAgICAgIFxuICAgICAgICBpZiBzY2VuZURvY3VtZW50P1xuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQHN1YkludGVycHJldGVyID0gbmV3IHZuLkNvbXBvbmVudF9DYWxsU2NlbmVJbnRlcnByZXRlcigpXG4gICAgICAgICAgICBvYmplY3QgPSB7IGNvbW1hbmRzOiBzY2VuZURvY3VtZW50Lml0ZW1zLmNvbW1hbmRzIH1cbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5yZXBlYXQgPSBub1xuICAgICAgICAgICAgQHN1YkludGVycHJldGVyLmNvbnRleHQuc2V0KHNjZW5lRG9jdW1lbnQudWlkLCBzY2VuZURvY3VtZW50KVxuICAgICAgICAgICAgQHN1YkludGVycHJldGVyLm9iamVjdCA9IG9iamVjdFxuICAgICAgICAgICAgQHN1YkludGVycHJldGVyLm9uRmluaXNoID0gZ3MuQ2FsbEJhY2soXCJvbkNhbGxTY2VuZUZpbmlzaFwiLCB0aGlzKVxuICAgICAgICAgICAgQHN1YkludGVycHJldGVyLnN0YXJ0KClcbiAgICAgICAgICAgIEBzdWJJbnRlcnByZXRlci5zZXR0aW5ncyA9IEBzZXR0aW5nc1xuICAgICAgICAgICAgQHN1YkludGVycHJldGVyLnVwZGF0ZSgpXG4gICAgICAgICAgICBcbiAgXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIENhbGxzIGEgY29tbW9uIGV2ZW50IGFuZCByZXR1cm5zIHRoZSBzdWItaW50ZXJwcmV0ZXIgZm9yIGl0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc3RvcmVMaXN0VmFsdWVcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpZCAtIFRoZSBJRCBvZiB0aGUgY29tbW9uIGV2ZW50IHRvIGNhbGwuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1ldGVycyAtIE9wdGlvbmFsIGNvbW1vbiBldmVudCBwYXJhbWV0ZXJzLlxuICAgICogQHBhcmFtIHtib29sZWFufSB3YWl0IC0gSW5kaWNhdGVzIGlmIHRoZSBpbnRlcnByZXRlciBzaG91bGQgYmUgc3RheSBpbiB3YWl0aW5nLW1vZGUgZXZlbiBpZiB0aGUgc3ViLWludGVycHJldGVyIGlzIGZpbmlzaGVkLlxuICAgICMjIyAgICAgICAgXG4gICAgc3RvcmVMaXN0VmFsdWU6ICh2YXJpYWJsZSwgbGlzdCwgdmFsdWUsIHZhbHVlVHlwZSkgLT5cbiAgICAgICAgc3dpdGNoIHZhbHVlVHlwZVxuICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyIFZhbHVlXG4gICAgICAgICAgICAgICAgQHNldE51bWJlclZhbHVlVG8odmFyaWFibGUsIChpZiAhaXNOYU4odmFsdWUpIHRoZW4gdmFsdWUgZWxzZSAwKSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaCBWYWx1ZVxuICAgICAgICAgICAgICAgIEBzZXRCb29sZWFuVmFsdWVUbyh2YXJpYWJsZSwgKGlmIHZhbHVlIHRoZW4gMSBlbHNlIDApKVxuICAgICAgICAgICAgd2hlbiAyICMgVGV4dCBWYWx1ZVxuICAgICAgICAgICAgICAgIEBzZXRTdHJpbmdWYWx1ZVRvKHZhcmlhYmxlLCB2YWx1ZS50b1N0cmluZygpKVxuICAgICAgICAgICAgd2hlbiAzICMgTGlzdCBWYWx1ZVxuICAgICAgICAgICAgICAgIEBzZXRMaXN0T2JqZWN0VG8odmFyaWFibGUsIChpZiB2YWx1ZS5sZW5ndGg/IHRoZW4gdmFsdWUgZWxzZSBbXSkpIFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGp1bXBUb0xhYmVsXG4gICAgIyMjICAgICAgICAgXG4gICAganVtcFRvTGFiZWw6IChsYWJlbCkgLT5cbiAgICAgICAgcmV0dXJuIGlmIG5vdCBsYWJlbFxuICAgICAgICBmb3VuZCA9IG5vXG4gICAgICAgIFxuICAgICAgICBmb3IgaSBpbiBbMC4uLkBvYmplY3QuY29tbWFuZHMubGVuZ3RoXVxuICAgICAgICAgICAgaWYgQG9iamVjdC5jb21tYW5kc1tpXS5pZCA9PSBcImdzLkxhYmVsXCIgYW5kIEBvYmplY3QuY29tbWFuZHNbaV0ucGFyYW1zLm5hbWUgPT0gbGFiZWxcbiAgICAgICAgICAgICAgICBAcG9pbnRlciA9IGlcbiAgICAgICAgICAgICAgICBAaW5kZW50ID0gQG9iamVjdC5jb21tYW5kc1tpXS5pbmRlbnRcbiAgICAgICAgICAgICAgICBmb3VuZCA9IHllc1xuICAgICAgICAgICAgICAgIGJyZWFrXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIGlmIGZvdW5kXG4gICAgICAgICAgICBAd2FpdENvdW50ZXIgPSAwXG4gICAgICAgICAgICBAaXNXYWl0aW5nID0gbm9cbiAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBjdXJyZW50IG1lc3NhZ2UgYm94IG9iamVjdCBkZXBlbmRpbmcgb24gZ2FtZSBtb2RlIChBRFYgb3IgTlZMKS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG1lc3NhZ2VCb3hPYmplY3RcbiAgICAqIEByZXR1cm4ge2dzLk9iamVjdF9CYXNlfSBUaGUgbWVzc2FnZSBib3ggb2JqZWN0LlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgIFxuICAgIG1lc3NhZ2VCb3hPYmplY3Q6IChpZCkgLT5cbiAgICAgICAgaWYgU2NlbmVNYW5hZ2VyLnNjZW5lLmxheW91dC52aXNpYmxlXG4gICAgICAgICAgICByZXR1cm4gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoaWQgfHwgXCJtZXNzYWdlQm94XCIpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChpZCB8fCBcIm1lc3NhZ2VCb3hOVkxcIilcbiAgICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIGN1cnJlbnQgbWVzc2FnZSBvYmplY3QgZGVwZW5kaW5nIG9uIGdhbWUgbW9kZSAoQURWIG9yIE5WTCkuXG4gICAgKlxuICAgICogQG1ldGhvZCBtZXNzYWdlT2JqZWN0XG4gICAgKiBAcmV0dXJuIHt1aS5PYmplY3RfTWVzc2FnZX0gVGhlIG1lc3NhZ2Ugb2JqZWN0LlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICBcbiAgICBtZXNzYWdlT2JqZWN0OiAtPlxuICAgICAgICBpZiBTY2VuZU1hbmFnZXIuc2NlbmUubGF5b3V0LnZpc2libGVcbiAgICAgICAgICAgIHJldHVybiBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImdhbWVNZXNzYWdlX21lc3NhZ2VcIilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmV0dXJuIGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VOVkxfbWVzc2FnZVwiKVxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIGN1cnJlbnQgbWVzc2FnZSBJRCBkZXBlbmRpbmcgb24gZ2FtZSBtb2RlIChBRFYgb3IgTlZMKS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG1lc3NhZ2VPYmplY3RJZFxuICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgbWVzc2FnZSBvYmplY3QgSUQuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICBcbiAgICBtZXNzYWdlT2JqZWN0SWQ6IC0+XG4gICAgICAgIGlmIFNjZW5lTWFuYWdlci5zY2VuZS5sYXlvdXQudmlzaWJsZVxuICAgICAgICAgICAgcmV0dXJuIFwiZ2FtZU1lc3NhZ2VfbWVzc2FnZVwiXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJldHVybiBcImdhbWVNZXNzYWdlTlZMX21lc3NhZ2VcIlxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIGN1cnJlbnQgbWVzc2FnZSBzZXR0aW5ncy5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG1lc3NhZ2VTZXR0aW5nc1xuICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbWVzc2FnZSBzZXR0aW5nc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgbWVzc2FnZVNldHRpbmdzOiAtPlxuICAgICAgICBtZXNzYWdlID0gQHRhcmdldE1lc3NhZ2UoKVxuXG4gICAgICAgIHJldHVybiBtZXNzYWdlLnNldHRpbmdzXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIGN1cnJlbnQgdGFyZ2V0IG1lc3NhZ2Ugb2JqZWN0IHdoZXJlIGFsbCBtZXNzYWdlIGNvbW1hbmRzIGFyZSBleGVjdXRlZCBvbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHRhcmdldE1lc3NhZ2VcbiAgICAqIEByZXR1cm4ge3VpLk9iamVjdF9NZXNzYWdlfSBUaGUgdGFyZ2V0IG1lc3NhZ2Ugb2JqZWN0LlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIHRhcmdldE1lc3NhZ2U6IC0+XG4gICAgICAgIG1lc3NhZ2UgPSBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgIHRhcmdldCA9IEBzZXR0aW5ncy5tZXNzYWdlLnRhcmdldFxuICAgICAgICBpZiB0YXJnZXQ/XG4gICAgICAgICAgICBzd2l0Y2ggdGFyZ2V0LnR5cGVcbiAgICAgICAgICAgICAgICB3aGVuIDAgIyBMYXlvdXQtQmFzZWRcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKHRhcmdldC5pZCkgPyBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgICAgICAgICAgd2hlbiAxICMgQ3VzdG9tXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBTY2VuZU1hbmFnZXIuc2NlbmUubWVzc2FnZUFyZWFzW3RhcmdldC5pZF0/Lm1lc3NhZ2UgPyBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gbWVzc2FnZVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSBjdXJyZW50IHRhcmdldCBtZXNzYWdlIGJveCBjb250YWluaW5nIHRoZSBjdXJyZW50IHRhcmdldCBtZXNzYWdlLlxuICAgICpcbiAgICAqIEBtZXRob2QgdGFyZ2V0TWVzc2FnZUJveFxuICAgICogQHJldHVybiB7dWkuT2JqZWN0X1VJRWxlbWVudH0gVGhlIHRhcmdldCBtZXNzYWdlIGJveC5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIHRhcmdldE1lc3NhZ2VCb3g6IC0+XG4gICAgICAgIG1lc3NhZ2VCb3ggPSBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgIHRhcmdldCA9IEBzZXR0aW5ncy5tZXNzYWdlLnRhcmdldFxuICAgICAgICBpZiB0YXJnZXQ/XG4gICAgICAgICAgICBzd2l0Y2ggdGFyZ2V0LnR5cGVcbiAgICAgICAgICAgICAgICB3aGVuIDAgIyBMYXlvdXQtQmFzZWRcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUJveCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKHRhcmdldC5pZCkgPyBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgICAgICAgICAgd2hlbiAxICMgQ3VzdG9tXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VCb3ggPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImN1c3RvbUdhbWVNZXNzYWdlX1wiK3RhcmdldC5pZCkgPyBAbWVzc2FnZU9iamVjdCgpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gbWVzc2FnZUJveFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDYWxsZWQgYWZ0ZXIgYW4gaW5wdXQgbnVtYmVyIGRpYWxvZyB3YXMgYWNjZXB0ZWQgYnkgdGhlIHVzZXIuIEl0IHRha2VzIHRoZSB1c2VyJ3MgaW5wdXQgYW5kIHB1dHNcbiAgICAqIGl0IGluIHRoZSBjb25maWd1cmVkIG51bWJlciB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG9uSW5wdXROdW1iZXJGaW5pc2hcbiAgICAqIEByZXR1cm4ge09iamVjdH0gRXZlbnQgT2JqZWN0IGNvbnRhaW5pbmcgYWRkaXRpb25hbCBkYXRhIGxpa2UgdGhlIG51bWJlciwgZXRjLlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgICBcbiAgICBvbklucHV0TnVtYmVyRmluaXNoOiAoZSkgLT5cbiAgICAgICAgQG1lc3NhZ2VPYmplY3QoKS5iZWhhdmlvci5jbGVhcigpXG4gICAgICAgIEBzZXROdW1iZXJWYWx1ZVRvKEB3YWl0aW5nRm9yLmlucHV0TnVtYmVyLnZhcmlhYmxlLCBwYXJzZUludCh1aS5Db21wb25lbnRfRm9ybXVsYUhhbmRsZXIuZmllbGRWYWx1ZShlLnNlbmRlciwgZS5udW1iZXIpKSlcbiAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgICAgIEB3YWl0aW5nRm9yLmlucHV0TnVtYmVyID0gbnVsbFxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuaW5wdXROdW1iZXJCb3guZGlzcG9zZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIGFmdGVyIGFuIGlucHV0IHRleHQgZGlhbG9nIHdhcyBhY2NlcHRlZCBieSB0aGUgdXNlci4gSXQgdGFrZXMgdGhlIHVzZXIncyB0ZXh0IGlucHV0IGFuZCBwdXRzXG4gICAgKiBpdCBpbiB0aGUgY29uZmlndXJlZCBzdHJpbmcgdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBvbklucHV0VGV4dEZpbmlzaFxuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEgbGlrZSB0aGUgdGV4dCwgZXRjLlxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBvbklucHV0VGV4dEZpbmlzaDogKGUpIC0+XG4gICAgICAgIEBtZXNzYWdlT2JqZWN0KCkuYmVoYXZpb3IuY2xlYXIoKVxuICAgICAgICBAc2V0U3RyaW5nVmFsdWVUbyhAd2FpdGluZ0Zvci5pbnB1dFRleHQudmFyaWFibGUsIHVpLkNvbXBvbmVudF9Gb3JtdWxhSGFuZGxlci5maWVsZFZhbHVlKGUuc2VuZGVyLCBlLnRleHQpLnJlcGxhY2UoL18vZywgXCJcIikpXG4gICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICBAd2FpdGluZ0Zvci5pbnB1dFRleHQgPSBudWxsXG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5pbnB1dFRleHRCb3guZGlzcG9zZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIGFmdGVyIGEgY2hvaWNlIHdhcyBzZWxlY3RlZCBieSB0aGUgdXNlci4gSXQganVtcHMgdG8gdGhlIGNvcnJlc3BvbmRpbmcgbGFiZWxcbiAgICAqIGFuZCBhbHNvIHB1dHMgdGhlIGNob2ljZSBpbnRvIGJhY2tsb2cuXG4gICAgKlxuICAgICogQG1ldGhvZCBvbkNob2ljZUFjY2VwdFxuICAgICogQHJldHVybiB7T2JqZWN0fSBFdmVudCBPYmplY3QgY29udGFpbmluZyBhZGRpdGlvbmFsIGRhdGEgbGlrZSB0aGUgbGFiZWwsIGV0Yy5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIG9uQ2hvaWNlQWNjZXB0OiAoZSkgLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuY2hvaWNlVGltZXIuYmVoYXZpb3Iuc3RvcCgpXG4gICAgICAgIFxuICAgICAgICBlLmlzU2VsZWN0ZWQgPSB5ZXNcbiAgICAgICAgZGVsZXRlIGUuc2VuZGVyXG4gICAgICAgIFxuICAgICAgICBHYW1lTWFuYWdlci5iYWNrbG9nLnB1c2goeyBjaGFyYWN0ZXI6IHsgbmFtZTogXCJcIiB9LCBtZXNzYWdlOiBcIlwiLCBjaG9pY2U6IGUsIGNob2ljZXM6ICR0ZW1wRmllbGRzLmNob2ljZXMsIGlzQ2hvaWNlOiB5ZXMgfSlcbiAgICAgICAgR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzID0gW11cbiAgICAgICAgbWVzc2FnZU9iamVjdCA9IEBtZXNzYWdlT2JqZWN0KClcbiAgICAgICAgaWYgbWVzc2FnZU9iamVjdD8udmlzaWJsZVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgZmFkaW5nID0gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLm1lc3NhZ2VGYWRpbmdcbiAgICAgICAgICAgIGR1cmF0aW9uID0gaWYgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXAgdGhlbiAwIGVsc2UgZmFkaW5nLmR1cmF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmFuaW1hdG9yLmRpc2FwcGVhcihmYWRpbmcuYW5pbWF0aW9uLCBmYWRpbmcuZWFzaW5nLCBkdXJhdGlvbiwgPT5cbiAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmJlaGF2aW9yLmNsZWFyKClcbiAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0LnZpc2libGUgPSBub1xuICAgICAgICAgICAgICAgIEBpc1dhaXRpbmcgPSBub1xuICAgICAgICAgICAgICAgIEB3YWl0aW5nRm9yLmNob2ljZSA9IG51bGxcbiAgICAgICAgICAgICAgICBAZXhlY3V0ZUFjdGlvbihlLmFjdGlvbiwgdHJ1ZSlcbiAgICAgICAgICAgIClcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgICAgICAgICBAZXhlY3V0ZUFjdGlvbihlLmFjdGlvbiwgdHJ1ZSlcbiAgICAgICAgc2NlbmUuY2hvaWNlV2luZG93LmRpc3Bvc2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIENhbGxlZCB3aGVuIGEgTlZMIG1lc3NhZ2UgZmluaXNoZXMuIFxuICAgICpcbiAgICAqIEBtZXRob2Qgb25NZXNzYWdlTlZMRmluaXNoXG4gICAgKiBAcmV0dXJuIHtPYmplY3R9IEV2ZW50IE9iamVjdCBjb250YWluaW5nIGFkZGl0aW9uYWwgZGF0YS5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgIFxuICAgIG9uTWVzc2FnZU5WTEZpbmlzaDogKGUpIC0+XG4gICAgICAgIG1lc3NhZ2VPYmplY3QgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImdhbWVNZXNzYWdlTlZMX21lc3NhZ2VcIilcbiAgICAgICAgbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIgPSBudWxsXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZXZlbnRzLm9mZiBcImZpbmlzaFwiLCBlLmhhbmRsZXJcbiAgICAgICAgQGlzV2FpdGluZyA9IG5vXG4gICAgICAgIEB3YWl0aW5nRm9yLm1lc3NhZ2VOVkwgPSBudWxsXG4gICAgICAgIGlmIG1lc3NhZ2VPYmplY3Qudm9pY2U/IGFuZCBHYW1lTWFuYWdlci5zZXR0aW5ncy5za2lwVm9pY2VPbkFjdGlvblxuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BTb3VuZChtZXNzYWdlT2JqZWN0LnZvaWNlLm5hbWUpXG4gICAgIFxuICAgICMjIypcbiAgICAqIElkbGVcbiAgICAqIEBtZXRob2QgY29tbWFuZElkbGVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZElkbGU6IC0+XG4gICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSAhQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKVxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIFN0YXJ0IFRpbWVyXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTdGFydFRpbWVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kU3RhcnRUaW1lcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgdGltZXJzID0gc2NlbmUudGltZXJzXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0aW1lciA9IHRpbWVyc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0aW1lcj9cbiAgICAgICAgICAgIHRpbWVyID0gbmV3IGdzLk9iamVjdF9JbnRlcnZhbFRpbWVyKClcbiAgICAgICAgICAgIHRpbWVyc1tudW1iZXJdID0gdGltZXJcbiAgICAgICAgICAgIFxuICAgICAgICB0aW1lci5ldmVudHMub2ZmQnlPd25lcihcImVsYXBzZWRcIiwgQG9iamVjdClcbiAgICAgICAgdGltZXIuZXZlbnRzLm9uKFwiZWxhcHNlZFwiLCAoZSkgPT5cbiAgICAgICAgICAgIHBhcmFtcyA9IGUuZGF0YS5wYXJhbXNcbiAgICAgICAgICAgIHN3aXRjaCBwYXJhbXMuYWN0aW9uLnR5cGVcbiAgICAgICAgICAgICAgICB3aGVuIDAgIyBKdW1wIFRvIExhYmVsXG4gICAgICAgICAgICAgICAgICAgIGlmIHBhcmFtcy5sYWJlbEluZGV4P1xuICAgICAgICAgICAgICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmludGVycHJldGVyLnBvaW50ZXIgPSBwYXJhbXMubGFiZWxJbmRleFxuICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuaW50ZXJwcmV0ZXIuanVtcFRvTGFiZWwocGFyYW1zLmFjdGlvbi5kYXRhLmxhYmVsKVxuICAgICAgICAgICAgICAgIHdoZW4gMSAjIENhbGwgQ29tbW9uIEV2ZW50XG4gICAgICAgICAgICAgICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5pbnRlcnByZXRlci5jYWxsQ29tbW9uRXZlbnQocGFyYW1zLmFjdGlvbi5kYXRhLmNvbW1vbkV2ZW50SWQpXG4gICAgICAgIHsgcGFyYW1zOiBAcGFyYW1zIH0sIEBvYmplY3QpXG4gICAgICAgIFxuICAgICAgICB0aW1lci5iZWhhdmlvci5pbnRlcnZhbCA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5pbnRlcnZhbClcbiAgICAgICAgdGltZXIuYmVoYXZpb3Iuc3RhcnQoKVxuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBSZXN1bWUgVGltZXJcbiAgICAqIEBtZXRob2QgY29tbWFuZFJlc3VtZVRpbWVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kUmVzdW1lVGltZXI6IC0+XG4gICAgICAgIHRpbWVycyA9IFNjZW5lTWFuYWdlci5zY2VuZS50aW1lcnNcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRpbWVyc1tudW1iZXJdPy5iZWhhdmlvci5yZXN1bWUoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBQYXVzZXMgVGltZXJcbiAgICAqIEBtZXRob2QgY29tbWFuZFBhdXNlVGltZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRQYXVzZVRpbWVyOiAtPlxuICAgICAgICB0aW1lcnMgPSBTY2VuZU1hbmFnZXIuc2NlbmUudGltZXJzXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0aW1lcnNbbnVtYmVyXT8uYmVoYXZpb3IucGF1c2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTdG9wIFRpbWVyXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTdG9wVGltZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICBcbiAgICBjb21tYW5kU3RvcFRpbWVyOiAtPlxuICAgICAgICB0aW1lcnMgPSBTY2VuZU1hbmFnZXIuc2NlbmUudGltZXJzXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0aW1lcnNbbnVtYmVyXT8uYmVoYXZpb3Iuc3RvcCgpXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBXYWl0XG4gICAgKiBAbWV0aG9kIGNvbW1hbmRXYWl0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRXYWl0OiAtPlxuICAgICAgICB0aW1lID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLnRpbWUpIFxuICAgICAgICBcbiAgICAgICAgaWYgdGltZT8gYW5kIHRpbWUgPiAwIGFuZCAhQGludGVycHJldGVyLnByZXZpZXdEYXRhXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSB0aW1lXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIExvb3BcbiAgICAqIEBtZXRob2QgY29tbWFuZExvb3BcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZExvb3A6IC0+XG4gICAgICAgIEBpbnRlcnByZXRlci5sb29wc1tAaW50ZXJwcmV0ZXIuaW5kZW50XSA9IEBpbnRlcnByZXRlci5wb2ludGVyXG4gICAgICAgIEBpbnRlcnByZXRlci5pbmRlbnQrK1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBCcmVhayBMb29wXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCcmVha0xvb3BcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEJyZWFrTG9vcDogLT5cbiAgICAgICAgaW5kZW50ID0gQGluZGVudFxuICAgICAgICB3aGlsZSBub3QgQGludGVycHJldGVyLmxvb3BzW2luZGVudF0/IGFuZCBpbmRlbnQgPiAwXG4gICAgICAgICAgICBpbmRlbnQtLVxuICAgICAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5sb29wc1tpbmRlbnRdID0gbnVsbFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaW5kZW50ID0gaW5kZW50XG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdEFkZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZExpc3RBZGQ6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMudmFsdWVUeXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBOdW1iZXIgVmFsdWVcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2goQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSkpXG4gICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2ggVmFsdWVcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2goQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpKVxuICAgICAgICAgICAgd2hlbiAyICMgVGV4dCBWYWx1ZVxuICAgICAgICAgICAgICAgIGxpc3QucHVzaChAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnN0cmluZ1ZhbHVlKSlcbiAgICAgICAgICAgIHdoZW4gMyAjIExpc3QgVmFsdWVcbiAgICAgICAgICAgICAgICBsaXN0LnB1c2goQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYWx1ZSkpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5zZXRMaXN0T2JqZWN0VG8oQHBhcmFtcy5saXN0VmFyaWFibGUsIGxpc3QpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdFBvcFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kTGlzdFBvcDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIHZhbHVlID0gbGlzdC5wb3AoKSA/IDBcblxuICAgICAgICBAaW50ZXJwcmV0ZXIuc3RvcmVMaXN0VmFsdWUoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbGlzdCwgdmFsdWUsIEBwYXJhbXMudmFsdWVUeXBlKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0U2hpZnRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZExpc3RTaGlmdDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIHZhbHVlID0gbGlzdC5zaGlmdCgpID8gMFxuXG4gICAgICAgIEBpbnRlcnByZXRlci5zdG9yZUxpc3RWYWx1ZShAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBsaXN0LCB2YWx1ZSwgQHBhcmFtcy52YWx1ZVR5cGUpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdEluZGV4T2ZcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZExpc3RJbmRleE9mOiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgdmFsdWUgPSAtMVxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMudmFsdWVUeXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBOdW1iZXIgVmFsdWVcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxpc3QuaW5kZXhPZihAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaCBWYWx1ZVxuICAgICAgICAgICAgICAgIHZhbHVlID0gbGlzdC5pbmRleE9mKEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKSlcbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHQgVmFsdWVcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxpc3QuaW5kZXhPZihAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnN0cmluZ1ZhbHVlKSlcbiAgICAgICAgICAgIHdoZW4gMyAjIExpc3QgVmFsdWVcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IGxpc3QuaW5kZXhPZihAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhbHVlKSlcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgdmFsdWUpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdENsZWFyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kTGlzdENsZWFyOiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgbGlzdC5sZW5ndGggPSAwXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RWYWx1ZUF0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kTGlzdFZhbHVlQXQ6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBpbmRleCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuaW5kZXgpXG4gICAgICAgIFxuICAgICAgICBpZiBpbmRleCA+PSAwIGFuZCBpbmRleCA8IGxpc3QubGVuZ3RoXG4gICAgICAgICAgICB2YWx1ZSA9IGxpc3RbaW5kZXhdID8gMFxuICAgICAgICAgICAgQGludGVycHJldGVyLnN0b3JlTGlzdFZhbHVlKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIGxpc3QsIHZhbHVlLCBAcGFyYW1zLnZhbHVlVHlwZSlcbiAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdFJlbW92ZUF0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgIFxuICAgIGNvbW1hbmRMaXN0UmVtb3ZlQXQ6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBpbmRleCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuaW5kZXgpXG4gICAgICAgIFxuICAgICAgICBpZiBpbmRleCA+PSAwIGFuZCBpbmRleCA8IGxpc3QubGVuZ3RoXG4gICAgICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0SW5zZXJ0QXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgXG4gICAgY29tbWFuZExpc3RJbnNlcnRBdDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5pbmRleClcbiAgICAgICAgXG4gICAgICAgIGlmIGluZGV4ID49IDAgYW5kIGluZGV4IDwgbGlzdC5sZW5ndGhcbiAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLnZhbHVlVHlwZVxuICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMCwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSkpXG4gICAgICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoIFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3Quc3BsaWNlKGluZGV4LCAwLCBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSkpXG4gICAgICAgICAgICAgICAgd2hlbiAyICMgVGV4dCBWYWx1ZVxuICAgICAgICAgICAgICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMCwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5zdHJpbmdWYWx1ZSkpXG4gICAgICAgICAgICAgICAgd2hlbiAzICMgTGlzdCBWYWx1ZVxuICAgICAgICAgICAgICAgICAgICBsaXN0LnNwbGljZShpbmRleCwgMCwgQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYWx1ZSkpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgQGludGVycHJldGVyLnNldExpc3RPYmplY3RUbyhAcGFyYW1zLmxpc3RWYXJpYWJsZSwgbGlzdClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0U2V0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kTGlzdFNldDogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5pbmRleClcbiAgICAgICAgXG4gICAgICAgIGlmIGluZGV4ID49IDBcbiAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLnZhbHVlVHlwZVxuICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgICAgICBsaXN0W2luZGV4XSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoIFZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGxpc3RbaW5kZXhdID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICAgICAgd2hlbiAyICMgVGV4dCBWYWx1ZVxuICAgICAgICAgICAgICAgICAgICBsaXN0W2luZGV4XSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc3RyaW5nVmFsdWUpXG4gICAgICAgICAgICAgICAgd2hlbiAzICMgTGlzdCBWYWx1ZVxuICAgICAgICAgICAgICAgICAgICBsaXN0W2luZGV4XSA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgQGludGVycHJldGVyLnNldExpc3RPYmplY3RUbyhAcGFyYW1zLmxpc3RWYXJpYWJsZSwgbGlzdCkgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0Q29weVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICBcbiAgICBjb21tYW5kTGlzdENvcHk6IC0+XG4gICAgICAgIGxpc3QgPSBAaW50ZXJwcmV0ZXIubGlzdE9iamVjdE9mKEBwYXJhbXMubGlzdFZhcmlhYmxlKVxuICAgICAgICBjb3B5ID0gT2JqZWN0LmRlZXBDb3B5KGxpc3QpXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TGlzdE9iamVjdFRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIGNvcHkpIFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0TGVuZ3RoXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRMaXN0TGVuZ3RoOiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcblxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBsaXN0Lmxlbmd0aCkgXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdEpvaW5cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRMaXN0Sm9pbjogLT5cbiAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5saXN0VmFyaWFibGUpXG4gICAgICAgIHZhbHVlID0gaWYgQHBhcmFtcy5vcmRlciA9PSAwIHRoZW4gbGlzdC5qb2luKFwiXCIpIGVsc2UgbGlzdC5yZXZlcnNlKCkuam9pbihcIlwiKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgdmFsdWUpIFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMaXN0RnJvbVRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRMaXN0RnJvbVRleHQ6IC0+XG4gICAgICAgIHRleHQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYXJpYWJsZSlcbiAgICAgICAgc2VwYXJhdG9yID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5zZXBhcmF0b3IpXG4gICAgICAgIGxpc3QgPSB0ZXh0LnNwbGl0KHNlcGFyYXRvcilcbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5zZXRMaXN0T2JqZWN0VG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbGlzdCkgXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExpc3RTaHVmZmxlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZExpc3RTaHVmZmxlOiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgaWYgbGlzdC5sZW5ndGggPT0gMCB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZm9yIGkgaW4gW2xpc3QubGVuZ3RoLTEuLjFdXG4gICAgICAgICAgICBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkrMSkpXG4gICAgICAgICAgICB0ZW1waSA9IGxpc3RbaV1cbiAgICAgICAgICAgIHRlbXBqID0gbGlzdFtqXVxuICAgICAgICAgICAgbGlzdFtpXSA9IHRlbXBqXG4gICAgICAgICAgICBsaXN0W2pdID0gdGVtcGlcbiAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTGlzdFNvcnRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgXG4gICAgY29tbWFuZExpc3RTb3J0OiAtPlxuICAgICAgICBsaXN0ID0gQGludGVycHJldGVyLmxpc3RPYmplY3RPZihAcGFyYW1zLmxpc3RWYXJpYWJsZSlcbiAgICAgICAgaWYgbGlzdC5sZW5ndGggPT0gMCB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMuc29ydE9yZGVyXG4gICAgICAgICAgICB3aGVuIDAgIyBBc2NlbmRpbmdcbiAgICAgICAgICAgICAgICBsaXN0LnNvcnQgKGEsIGIpIC0+IFxuICAgICAgICAgICAgICAgICAgICBpZiBhIDwgYiB0aGVuIHJldHVybiAtMVxuICAgICAgICAgICAgICAgICAgICBpZiBhID4gYiB0aGVuIHJldHVybiAxXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwXG4gICAgICAgICAgICB3aGVuIDEgIyBEZXNjZW5kaW5nXG4gICAgICAgICAgICAgICAgbGlzdC5zb3J0IChhLCBiKSAtPlxuICAgICAgICAgICAgICAgICAgICBpZiBhID4gYiB0aGVuIHJldHVybiAtMVxuICAgICAgICAgICAgICAgICAgICBpZiBhIDwgYiB0aGVuIHJldHVybiAxXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiAwXG4gICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJlc2V0VmFyaWFibGVzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZFJlc2V0VmFyaWFibGVzOiAtPlxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy50YXJnZXRcbiAgICAgICAgICAgIHdoZW4gMCAjIEFsbFxuICAgICAgICAgICAgICAgIHJhbmdlID0gbnVsbFxuICAgICAgICAgICAgd2hlbiAxICMgUmFuZ2VcbiAgICAgICAgICAgICAgICByYW5nZSA9IEBwYXJhbXMucmFuZ2VcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMuc2NvcGVcbiAgICAgICAgICAgIHdoZW4gMCAjIExvY2FsXG4gICAgICAgICAgICAgICAgaWYgQHBhcmFtcy5zY2VuZVxuICAgICAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLmNsZWFyTG9jYWxWYXJpYWJsZXMoeyBpZDogQHBhcmFtcy5zY2VuZS51aWQgfSwgQHBhcmFtcy50eXBlLCByYW5nZSlcbiAgICAgICAgICAgIHdoZW4gMSAjIEFsbCBMb2NhbHNcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLmNsZWFyTG9jYWxWYXJpYWJsZXMobnVsbCwgQHBhcmFtcy50eXBlLCByYW5nZSlcbiAgICAgICAgICAgIHdoZW4gMiAjIEdsb2JhbFxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuY2xlYXJHbG9iYWxWYXJpYWJsZXMoQHBhcmFtcy50eXBlLCByYW5nZSlcbiAgICAgICAgICAgIHdoZW4gMyAjIFBlcnNpc3RlbnRcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLmNsZWFyUGVyc2lzdGVudFZhcmlhYmxlcyhAcGFyYW1zLnR5cGUsIHJhbmdlKVxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnNhdmVHbG9iYWxEYXRhKClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VWYXJpYWJsZURvbWFpblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kQ2hhbmdlVmFyaWFibGVEb21haW46IC0+XG4gICAgICAgIEdhbWVNYW5hZ2VyLnZhcmlhYmxlU3RvcmUuY2hhbmdlRG9tYWluKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuZG9tYWluKSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhbmdlRGVjaW1hbFZhcmlhYmxlc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kQ2hhbmdlRGVjaW1hbFZhcmlhYmxlczogLT4gQGludGVycHJldGVyLmNoYW5nZURlY2ltYWxWYXJpYWJsZXMoQHBhcmFtcywgQHBhcmFtcy5yb3VuZE1ldGhvZClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VOdW1iZXJWYXJpYWJsZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENoYW5nZU51bWJlclZhcmlhYmxlczogLT5cbiAgICAgICAgc291cmNlID0gMFxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMuc291cmNlXG4gICAgICAgICAgICB3aGVuIDAgIyBDb25zdGFudCBWYWx1ZSAvIFZhcmlhYmxlIFZhbHVlXG4gICAgICAgICAgICAgICAgc291cmNlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5zb3VyY2VWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMSAjIFJhbmRvbVxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5zb3VyY2VSYW5kb20uc3RhcnQpXG4gICAgICAgICAgICAgICAgZW5kID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5zb3VyY2VSYW5kb20uZW5kKVxuICAgICAgICAgICAgICAgIGRpZmYgPSBlbmQgLSBzdGFydFxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IE1hdGguZmxvb3Ioc3RhcnQgKyBNYXRoLnJhbmRvbSgpICogKGRpZmYrMSkpXG4gICAgICAgICAgICB3aGVuIDIgIyBQb2ludGVyXG4gICAgICAgICAgICAgICAgc291cmNlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnNvdXJjZVNjb3BlLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNvdXJjZVJlZmVyZW5jZSktMSwgQHBhcmFtcy5zb3VyY2VSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICB3aGVuIDMgIyBHYW1lIERhdGFcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZkdhbWVEYXRhKEBwYXJhbXMuc291cmNlVmFsdWUxKVxuICAgICAgICAgICAgd2hlbiA0ICMgRGF0YWJhc2UgRGF0YVxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mRGF0YWJhc2VEYXRhKEBwYXJhbXMuc291cmNlVmFsdWUxKVxuICAgICAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnRhcmdldFxuICAgICAgICAgICAgd2hlbiAwICMgVmFyaWFibGVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgKyBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFN1YlxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgLSBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMyAjIE11bFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgKiBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNCAjIERpdlxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgTWF0aC5mbG9vcihAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSAvIHNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNSAjIE1vZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgJSBzb3VyY2UpXG4gICAgICAgICAgICB3aGVuIDEgIyBSYW5nZVxuICAgICAgICAgICAgICAgIHNjb3BlID0gQHBhcmFtcy50YXJnZXRTY29wZVxuICAgICAgICAgICAgICAgIHN0YXJ0ID0gQHBhcmFtcy50YXJnZXRSYW5nZS5zdGFydC0xXG4gICAgICAgICAgICAgICAgZW5kID0gQHBhcmFtcy50YXJnZXRSYW5nZS5lbmQtMVxuICAgICAgICAgICAgICAgIGZvciBpIGluIFtzdGFydC4uZW5kXVxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIFNldFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGkpICsgc291cmNlKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgU3ViXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgLSBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDMgIyBNdWxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KHNjb3BlLCBpKSAqIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gNCAjIERpdlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoc2NvcGUsIGksIE1hdGguZmxvb3IoQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgLyBzb3VyY2UpKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgTW9kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSwgQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChzY29wZSwgaSkgJSBzb3VyY2UpXG4gICAgICAgICAgICB3aGVuIDIgIyBSZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBpbmRleCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlKSAtIDFcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBBZGRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKSArIHNvdXJjZSwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFN1YlxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pIC0gc291cmNlLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgTXVsXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0U2NvcGUsIGluZGV4LCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbikgKiBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDQgIyBEaXZcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRTY29wZSwgaW5kZXgsIE1hdGguZmxvb3IoQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pIC8gc291cmNlKSwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNSAjIE1vZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQGludGVycHJldGVyLm51bWJlclZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pICUgc291cmNlLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VCb29sZWFuVmFyaWFibGVzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRDaGFuZ2VCb29sZWFuVmFyaWFibGVzOiAtPlxuICAgICAgICBzb3VyY2UgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy52YWx1ZSlcblxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy50YXJnZXRcbiAgICAgICAgICAgIHdoZW4gMCAjIFZhcmlhYmxlXG4gICAgICAgICAgICAgICAgaWYgQHBhcmFtcy52YWx1ZSA9PSAyICMgVHJpZ2dlclxuICAgICAgICAgICAgICAgICAgICB0YXJnZXRWYWx1ZSA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKVxuICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgaWYgdGFyZ2V0VmFsdWUgdGhlbiBmYWxzZSBlbHNlIHRydWUpXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc291cmNlKVxuICAgICAgICAgICAgd2hlbiAxICMgUmFuZ2VcbiAgICAgICAgICAgICAgICB2YXJpYWJsZSA9IHsgaW5kZXg6IDAsIHNjb3BlOiBAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUgfVxuICAgICAgICAgICAgICAgIGZvciBpIGluIFsoQHBhcmFtcy5yYW5nZVN0YXJ0LTEpLi4oQHBhcmFtcy5yYW5nZUVuZC0xKV1cbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGUuaW5kZXggPSBpXG4gICAgICAgICAgICAgICAgICAgIGlmIEBwYXJhbXMudmFsdWUgPT0gMiAjIFRyaWdnZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldFZhbHVlID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKHZhcmlhYmxlKVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKHZhcmlhYmxlLCBpZiB0YXJnZXRWYWx1ZSB0aGVuIGZhbHNlIGVsc2UgdHJ1ZSlcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKHZhcmlhYmxlLCBzb3VyY2UpXG4gICAgICAgICAgICB3aGVuIDIgIyBSZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBpbmRleCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlKSAtIDFcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUsIGluZGV4LCBzb3VyY2UsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VTdHJpbmdWYXJpYWJsZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENoYW5nZVN0cmluZ1ZhcmlhYmxlczogLT5cbiAgICAgICAgc291cmNlID0gXCJcIlxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5zb3VyY2VcbiAgICAgICAgICAgIHdoZW4gMCAjIENvbnN0YW50IFRleHRcbiAgICAgICAgICAgICAgICBzb3VyY2UgPSBsY3MoQHBhcmFtcy50ZXh0VmFsdWUpXG4gICAgICAgICAgICB3aGVuIDEgIyBWYXJpYWJsZVxuICAgICAgICAgICAgICAgIHNvdXJjZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc291cmNlVmFyaWFibGUpXG4gICAgICAgICAgICB3aGVuIDIgIyBEYXRhYmFzZSBEYXRhXG4gICAgICAgICAgICAgICAgc291cmNlID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2ZEYXRhYmFzZURhdGEoQHBhcmFtcy5kYXRhYmFzZURhdGEpXG4gICAgICAgICAgICB3aGVuIDIgIyBTY3JpcHRcbiAgICAgICAgICAgICAgICB0cnlcbiAgICAgICAgICAgICAgICAgICAgc291cmNlID0gZXZhbChAcGFyYW1zLnNjcmlwdClcbiAgICAgICAgICAgICAgICBjYXRjaCBleFxuICAgICAgICAgICAgICAgICAgICBzb3VyY2UgPSBcIkVSUjogXCIgKyBleC5tZXNzYWdlXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgc291cmNlID0gbGNzKEBwYXJhbXMudGV4dFZhbHVlKVxuICAgICAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnRhcmdldFxuICAgICAgICAgICAgd2hlbiAwICMgVmFyaWFibGVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSkgKyBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFRvIFVwcGVyLUNhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUpLnRvVXBwZXJDYXNlKCkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMyAjIFRvIExvd2VyLUNhc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUpLnRvTG93ZXJDYXNlKCkpXG5cbiAgICAgICAgICAgIHdoZW4gMSAjIFJhbmdlXG4gICAgICAgICAgICAgICAgdmFyaWFibGUgPSB7IGluZGV4OiAwLCBzY29wZTogQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlIH1cbiAgICAgICAgICAgICAgICBmb3IgaSBpbiBbQHBhcmFtcy5yYW5nZVN0YXJ0LTEuLkBwYXJhbXMucmFuZ2VFbmQtMV1cbiAgICAgICAgICAgICAgICAgICAgdmFyaWFibGUuaW5kZXggPSBpXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgU2V0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8odmFyaWFibGUsIHNvdXJjZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIEFkZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKHZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZih2YXJpYWJsZSkgKyBzb3VyY2UpXG4gICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUbyBVcHBlci1DYXNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8odmFyaWFibGUsIEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKHZhcmlhYmxlKS50b1VwcGVyQ2FzZSgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgVG8gTG93ZXItQ2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKHZhcmlhYmxlLCBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZih2YXJpYWJsZSkudG9Mb3dlckNhc2UoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHdoZW4gMiAjIFJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGluZGV4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRSZWZlcmVuY2UpIC0gMVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9wZXJhdGlvblxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBTZXRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlLCBpbmRleCwgc291cmNlLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgQWRkXG4gICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXRWYWx1ZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZUF0SW5kZXgoQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlLCBpbmRleCwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0UmFuZ2VTY29wZSwgaW5kZXgsIHRhcmdldFZhbHVlICsgc291cmNlLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgVG8gVXBwZXItQ2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0UmFuZ2VTY29wZSwgaW5kZXgsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlQXRJbmRleChAcGFyYW1zLnRhcmdldFJhbmdlU2NvcGUsIGluZGV4LCB0YXJnZXRWYWx1ZS50b1VwcGVyQ2FzZSgpLCBAcGFyYW1zLnRhcmdldFJlZmVyZW5jZURvbWFpbilcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgVG8gTG93ZXItQ2FzZVxuICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0VmFsdWUgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVBdEluZGV4KEBwYXJhbXMudGFyZ2V0UmFuZ2VTY29wZSwgaW5kZXgsIEBwYXJhbXMudGFyZ2V0UmVmZXJlbmNlRG9tYWluKVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRSYW5nZVNjb3BlLCBpbmRleCwgdGFyZ2V0VmFsdWUudG9Mb3dlckNhc2UoKSwgQHBhcmFtcy50YXJnZXRSZWZlcmVuY2VEb21haW4pXG4gICAgICAgIHJldHVybiBudWxsXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoZWNrU3dpdGNoXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kQ2hlY2tTd2l0Y2g6IC0+XG4gICAgICAgIHJlc3VsdCA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSAmJiBAcGFyYW1zLnZhbHVlXG4gICAgICAgIGlmIHJlc3VsdFxuICAgICAgICAgICAgQGludGVycHJldGVyLnBvaW50ZXIgPSBAcGFyYW1zLmxhYmVsSW5kZXhcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmROdW1iZXJDb25kaXRpb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kTnVtYmVyQ29uZGl0aW9uOiAtPlxuICAgICAgICByZXN1bHQgPSBAaW50ZXJwcmV0ZXIuY29tcGFyZShAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRhcmdldFZhcmlhYmxlKSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy52YWx1ZSksIEBwYXJhbXMub3BlcmF0aW9uKVxuICAgICAgICBAaW50ZXJwcmV0ZXIuY29uZGl0aW9uc1tAaW50ZXJwcmV0ZXIuaW5kZW50XSA9IHJlc3VsdFxuICAgICAgICBcbiAgICAgICAgaWYgcmVzdWx0XG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaW5kZW50KytcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDb25kaXRpb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgXG4gICAgY29tbWFuZENvbmRpdGlvbjogLT5cbiAgICAgICAgc3dpdGNoIEBwYXJhbXMudmFsdWVUeXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBOdW1iZXJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAaW50ZXJwcmV0ZXIuY29tcGFyZShAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnZhcmlhYmxlKSwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSksIEBwYXJhbXMub3BlcmF0aW9uKVxuICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gQGludGVycHJldGVyLmNvbXBhcmUoQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMudmFyaWFibGUpLCBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSksIEBwYXJhbXMub3BlcmF0aW9uKVxuICAgICAgICAgICAgd2hlbiAyICMgVGV4dFxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBpbnRlcnByZXRlci5jb21wYXJlKGxjcyhAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnZhcmlhYmxlKSksIGxjcyhAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSkpLCBAcGFyYW1zLm9wZXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5jb25kaXRpb25zW0BpbnRlcnByZXRlci5pbmRlbnRdID0gcmVzdWx0XG4gICAgICAgIGlmIHJlc3VsdFxuICAgICAgICAgICAgQGludGVycHJldGVyLmluZGVudCsrICAgIFxuICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDb25kaXRpb25FbHNlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZENvbmRpdGlvbkVsc2U6IC0+XG4gICAgICAgIGlmIG5vdCBAaW50ZXJwcmV0ZXIuY29uZGl0aW9uc1tAaW50ZXJwcmV0ZXIuaW5kZW50XVxuICAgICAgICAgICAgQGludGVycHJldGVyLmluZGVudCsrXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ29uZGl0aW9uRWxzZUlmXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICBcbiAgICBjb21tYW5kQ29uZGl0aW9uRWxzZUlmOiAtPlxuICAgICAgICBpZiBub3QgQGludGVycHJldGVyLmNvbmRpdGlvbnNbQGludGVycHJldGVyLmluZGVudF1cbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5jb21tYW5kQ29uZGl0aW9uLmNhbGwodGhpcylcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGVja051bWJlclZhcmlhYmxlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICBcbiAgICBjb21tYW5kQ2hlY2tOdW1iZXJWYXJpYWJsZTogLT5cbiAgICAgICAgcmVzdWx0ID0gQGludGVycHJldGVyLmNvbXBhcmUoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSksIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudmFsdWUpLCBAcGFyYW1zLm9wZXJhdGlvbilcbiAgICAgICAgaWYgcmVzdWx0XG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlciA9IEBwYXJhbXMubGFiZWxJbmRleFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoZWNrVGV4dFZhcmlhYmxlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICBcbiAgICBjb21tYW5kQ2hlY2tUZXh0VmFyaWFibGU6IC0+XG4gICAgICAgIHJlc3VsdCA9IG5vXG4gICAgICAgIHRleHQxID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50YXJnZXRWYXJpYWJsZSlcbiAgICAgICAgdGV4dDIgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnZhbHVlKVxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5vcGVyYXRpb25cbiAgICAgICAgICAgIHdoZW4gMCB0aGVuIHJlc3VsdCA9IHRleHQxID09IHRleHQyXG4gICAgICAgICAgICB3aGVuIDEgdGhlbiByZXN1bHQgPSB0ZXh0MSAhPSB0ZXh0MlxuICAgICAgICAgICAgd2hlbiAyIHRoZW4gcmVzdWx0ID0gdGV4dDEubGVuZ3RoID4gdGV4dDIubGVuZ3RoXG4gICAgICAgICAgICB3aGVuIDMgdGhlbiByZXN1bHQgPSB0ZXh0MS5sZW5ndGggPj0gdGV4dDIubGVuZ3RoXG4gICAgICAgICAgICB3aGVuIDQgdGhlbiByZXN1bHQgPSB0ZXh0MS5sZW5ndGggPCB0ZXh0Mi5sZW5ndGhcbiAgICAgICAgICAgIHdoZW4gNSB0aGVuIHJlc3VsdCA9IHRleHQxLmxlbmd0aCA8PSB0ZXh0Mi5sZW5ndGhcbiAgICAgICAgICAgIFxuICAgICAgICBpZiByZXN1bHRcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5wb2ludGVyID0gQHBhcmFtcy5sYWJlbEluZGV4XG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExhYmVsXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgXG4gICAgY29tbWFuZExhYmVsOiAtPiAjIERvZXMgTm90aGluZ1xuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRKdW1wVG9MYWJlbFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgICAgXG4gICAgY29tbWFuZEp1bXBUb0xhYmVsOiAtPlxuICAgICAgICBsYWJlbCA9IEBwYXJhbXMubGFiZWxJbmRleCAjQGludGVycHJldGVyLmxhYmVsc1tAcGFyYW1zLm5hbWVdXG4gICAgICAgIGlmIGxhYmVsP1xuICAgICAgICAgICAgQGludGVycHJldGVyLnBvaW50ZXIgPSBsYWJlbFxuICAgICAgICAgICAgQGludGVycHJldGVyLmluZGVudCA9IEBpbnRlcnByZXRlci5vYmplY3QuY29tbWFuZHNbbGFiZWxdLmluZGVudFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuanVtcFRvTGFiZWwoQHBhcmFtcy5uYW1lKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDbGVhck1lc3NhZ2VcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIGNvbW1hbmRDbGVhck1lc3NhZ2U6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIG1lc3NhZ2VPYmplY3QgPSBAaW50ZXJwcmV0ZXIudGFyZ2V0TWVzc2FnZSgpXG4gICAgICAgIGlmIG5vdCBtZXNzYWdlT2JqZWN0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBkdXJhdGlvbiA9IDBcbiAgICAgICAgZmFkaW5nID0gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLm1lc3NhZ2VGYWRpbmdcbiAgICAgICAgaWYgbm90IEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwXG4gICAgICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZmFkaW5nLmR1cmF0aW9uXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuYW5pbWF0b3IuZGlzYXBwZWFyKGZhZGluZy5hbmltYXRpb24sIGZhZGluZy5lYXNpbmcsIGR1cmF0aW9uLCBncy5DYWxsQmFjayhcIm9uTWVzc2FnZUFEVkNsZWFyXCIsIEBpbnRlcnByZXRlcikpXG5cbiAgICAgICAgQGludGVycHJldGVyLndhaXRGb3JDb21wbGV0aW9uKG1lc3NhZ2VPYmplY3QsIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDbG9zZVBhZ2VOVkxcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZENsb3NlUGFnZU5WTDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgbWVzc2FnZU9iamVjdCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VOVkxfbWVzc2FnZVwiKVxuICAgICAgICBpZiBub3QgbWVzc2FnZU9iamVjdD8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIG1lc3NhZ2VPYmplY3QubWVzc2FnZS5jbGVhcigpXG4gICAgICAgIFxuICAgICAgICBtZXNzYWdlQm94ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJtZXNzYWdlQm94TlZMXCIpXG4gICAgICAgIGlmIG1lc3NhZ2VCb3ggYW5kIEBwYXJhbXMudmlzaWJsZSAhPSBtZXNzYWdlQm94LnZpc2libGVcbiAgICAgICAgICAgIG1lc3NhZ2VCb3gudmlzaWJsZSA9IG5vXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWVzc2FnZUJveERlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRNZXNzYWdlQm94RGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMubWVzc2FnZUJveFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kaXNhcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kaXNhcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnpPcmRlcikgdGhlbiBkZWZhdWx0cy56T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYXBwZWFyRWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRWFzaW5nID0gQHBhcmFtcy5hcHBlYXJFYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYXBwZWFyQW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uID0gQHBhcmFtcy5hcHBlYXJBbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZGlzYXBwZWFyRWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nID0gQHBhcmFtcy5kaXNhcHBlYXJFYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZGlzYXBwZWFyQW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uID0gQHBhcmFtcy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93TWVzc2FnZU5WTFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZFNob3dNZXNzYWdlTlZMOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5tZXNzYWdlTW9kZSA9IHZuLk1lc3NhZ2VNb2RlLk5WTFxuICAgICAgICBjaGFyYWN0ZXIgPSBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNbQHBhcmFtcy5jaGFyYWN0ZXJJZF1cbiAgXG4gICAgICAgIHNjZW5lLmxheW91dC52aXNpYmxlID0gbm9cbiAgICAgICAgc2NlbmUubGF5b3V0TlZMLnZpc2libGUgPSB5ZXNcbiAgICAgICAgbWVzc2FnZU9iamVjdCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VOVkxfbWVzc2FnZVwiKVxuICAgICAgICBpZiBub3QgbWVzc2FnZU9iamVjdD8gdGhlbiByZXR1cm5cblxuICAgICAgICBAaW50ZXJwcmV0ZXIubWVzc2FnZUJveE9iamVjdCgpPy52aXNpYmxlID0gdHJ1ZVxuICAgICAgICBtZXNzYWdlT2JqZWN0LmNoYXJhY3RlciA9IGNoYXJhY3RlclxuICAgICAgICBtZXNzYWdlT2JqZWN0Lm1lc3NhZ2UuYWRkTWVzc2FnZShsY3NtKEBwYXJhbXMubWVzc2FnZSksIGNoYXJhY3RlciwgIUBwYXJhbXMucGFydGlhbCBhbmQgbWVzc2FnZU9iamVjdC5tZXNzYWdlcy5sZW5ndGggPiAwLCB5ZXMpXG4gICAgICAgIFxuICAgICAgICBpZiBAaW50ZXJwcmV0ZXIubWVzc2FnZVNldHRpbmdzKCkuYmFja2xvZ1xuICAgICAgICAgICAgR2FtZU1hbmFnZXIuYmFja2xvZy5wdXNoKHsgY2hhcmFjdGVyOiBjaGFyYWN0ZXIsIG1lc3NhZ2U6IGxjc20oQHBhcmFtcy5tZXNzYWdlKSwgY2hvaWNlczogW10gfSlcblxuICAgICAgICBtZXNzYWdlT2JqZWN0LmV2ZW50cy5vbiBcImZpbmlzaFwiLCAoZSkgPT4gQGludGVycHJldGVyLm9uTWVzc2FnZU5WTEZpbmlzaChlKVxuXG4gICAgICAgIHZvaWNlU2V0dGluZ3MgPSBHYW1lTWFuYWdlci5zZXR0aW5ncy52b2ljZXNCeUNoYXJhY3RlclttZXNzYWdlT2JqZWN0LmNoYXJhY3Rlcj8uaW5kZXhdXG4gICAgICAgIGlmIEBwYXJhbXMudm9pY2U/IGFuZCBHYW1lTWFuYWdlci5zZXR0aW5ncy52b2ljZUVuYWJsZWQgYW5kICghdm9pY2VTZXR0aW5ncyBvciB2b2ljZVNldHRpbmdzLmVuYWJsZWQpXG4gICAgICAgICAgICBpZiBHYW1lTWFuYWdlci5zZXR0aW5ncy5za2lwVm9pY2VPbkFjdGlvbiBvciBub3QgKEF1ZGlvTWFuYWdlci52b2ljZT8ucGxheWluZylcbiAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0LnZvaWNlID0gQHBhcmFtcy52b2ljZVxuICAgICAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5wbGF5Vm9pY2UoQHBhcmFtcy52b2ljZSkgICAgIFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBBdWRpb01hbmFnZXIudm9pY2UgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgIEBpbnRlcnByZXRlci53YWl0aW5nRm9yLm1lc3NhZ2VOVkwgPSBAcGFyYW1zXG4gICAgXG4gICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kU2hvd01lc3NhZ2VcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTaG93TWVzc2FnZTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUubWVzc2FnZU1vZGUgPSB2bi5NZXNzYWdlTW9kZS5BRFZcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgXG4gICAgICAgIFxuICAgICAgICBzaG93TWVzc2FnZSA9ID0+XG4gICAgICAgICAgICBjaGFyYWN0ZXIgPSBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNbQHBhcmFtcy5jaGFyYWN0ZXJJZF1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2NlbmUubGF5b3V0LnZpc2libGUgPSB5ZXNcbiAgICAgICAgICAgIHNjZW5lLmxheW91dE5WTC52aXNpYmxlID0gbm9cbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QgPSBAaW50ZXJwcmV0ZXIudGFyZ2V0TWVzc2FnZSgpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBub3QgbWVzc2FnZU9iamVjdD8gdGhlbiByZXR1cm5cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgc2NlbmUuY3VycmVudENoYXJhY3RlciA9IGNoYXJhY3RlclxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5jaGFyYWN0ZXIgPSBjaGFyYWN0ZXJcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5vcGFjaXR5ID0gMjU1XG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmV2ZW50cy5vZmZCeU93bmVyKFwiY2FsbENvbW1vbkV2ZW50XCIsIEBpbnRlcnByZXRlcilcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZXZlbnRzLm9uKFwiY2FsbENvbW1vbkV2ZW50XCIsIGdzLkNhbGxCYWNrKFwib25DYWxsQ29tbW9uRXZlbnRcIiwgQGludGVycHJldGVyKSwgcGFyYW1zOiBAcGFyYW1zLCBAaW50ZXJwcmV0ZXIpXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmV2ZW50cy5vbmNlKFwiZmluaXNoXCIsIGdzLkNhbGxCYWNrKFwib25NZXNzYWdlQURWRmluaXNoXCIsIEBpbnRlcnByZXRlciksIHBhcmFtczogQHBhcmFtcywgQGludGVycHJldGVyKVxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5ldmVudHMub25jZShcIndhaXRpbmdcIiwgZ3MuQ2FsbEJhY2soXCJvbk1lc3NhZ2VBRFZXYWl0aW5nXCIsIEBpbnRlcnByZXRlciksIHBhcmFtczogQHBhcmFtcywgQGludGVycHJldGVyKSAgIFxuICAgICAgICAgICAgaWYgbWVzc2FnZU9iamVjdC5zZXR0aW5ncy51c2VDaGFyYWN0ZXJDb2xvclxuICAgICAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QubWVzc2FnZS5zaG93TWVzc2FnZShAaW50ZXJwcmV0ZXIsIEBwYXJhbXMsIGNoYXJhY3RlcilcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0Lm1lc3NhZ2Uuc2hvd01lc3NhZ2UoQGludGVycHJldGVyLCBAcGFyYW1zKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBzZXR0aW5ncyA9IEdhbWVNYW5hZ2VyLnNldHRpbmdzXG4gICAgICAgICAgICB2b2ljZVNldHRpbmdzID0gc2V0dGluZ3Mudm9pY2VzQnlDaGFyYWN0ZXJbY2hhcmFjdGVyLmluZGV4XVxuICAgICAgXG4gICAgICAgICAgICBpZiBAcGFyYW1zLnZvaWNlPyBhbmQgR2FtZU1hbmFnZXIuc2V0dGluZ3Mudm9pY2VFbmFibGVkIGFuZCAoIXZvaWNlU2V0dGluZ3Mgb3Igdm9pY2VTZXR0aW5ncyA+IDApXG4gICAgICAgICAgICAgICAgaWYgKEdhbWVNYW5hZ2VyLnNldHRpbmdzLnNraXBWb2ljZU9uQWN0aW9uIG9yICFBdWRpb01hbmFnZXIudm9pY2U/LnBsYXlpbmcpIGFuZCAhR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC52b2ljZSA9IEBwYXJhbXMudm9pY2VcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5iZWhhdmlvci52b2ljZSA9IEF1ZGlvTWFuYWdlci5wbGF5Vm9pY2UoQHBhcmFtcy52b2ljZSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmJlaGF2aW9yLnZvaWNlID0gbnVsbFxuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmV4cHJlc3Npb25JZD8gYW5kIGNoYXJhY3Rlcj9cbiAgICAgICAgICAgIGV4cHJlc3Npb24gPSBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlckV4cHJlc3Npb25zW0BwYXJhbXMuZXhwcmVzc2lvbklkIHx8IDBdXG4gICAgICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmNoYXJhY3RlclxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWQoQHBhcmFtcy5maWVsZEZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5leHByZXNzaW9uRHVyYXRpb25cbiAgICAgICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5jaGFuZ2VFYXNpbmcpXG4gICAgICAgICAgICBhbmltYXRpb24gPSBkZWZhdWx0cy5jaGFuZ2VBbmltYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY2hhcmFjdGVyLmJlaGF2aW9yLmNoYW5nZUV4cHJlc3Npb24oZXhwcmVzc2lvbiwgYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uLCA9PlxuICAgICAgICAgICAgICAgIHNob3dNZXNzYWdlKClcbiAgICAgICAgICAgIClcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2hvd01lc3NhZ2UoKVxuICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gKEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gPyB5ZXMpIGFuZCAhKEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwIGFuZCBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcFRpbWUgPT0gMClcbiAgICAgICAgQGludGVycHJldGVyLndhaXRpbmdGb3IubWVzc2FnZUFEViA9IEBwYXJhbXNcbiAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNldE1lc3NhZ2VBcmVhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZFNldE1lc3NhZ2VBcmVhOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgXG4gICAgICAgIGlmIHNjZW5lLm1lc3NhZ2VBcmVhc1tudW1iZXJdXG4gICAgICAgICAgICBtZXNzYWdlTGF5b3V0ID0gc2NlbmUubWVzc2FnZUFyZWFzW251bWJlcl0ubGF5b3V0XG4gICAgICAgICAgICBtZXNzYWdlTGF5b3V0LmRzdFJlY3QueCA9IEBwYXJhbXMuYm94LnhcbiAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQuZHN0UmVjdC55ID0gQHBhcmFtcy5ib3gueVxuICAgICAgICAgICAgbWVzc2FnZUxheW91dC5kc3RSZWN0LndpZHRoID0gQHBhcmFtcy5ib3guc2l6ZS53aWR0aFxuICAgICAgICAgICAgbWVzc2FnZUxheW91dC5kc3RSZWN0LmhlaWdodCA9IEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0XG4gICAgICAgICAgICBtZXNzYWdlTGF5b3V0Lm5lZWRzVXBkYXRlID0geWVzXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNZXNzYWdlRmFkaW5nXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRNZXNzYWdlRmFkaW5nOiAtPlxuICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3MubWVzc2FnZUZhZGluZyA9IGR1cmF0aW9uOiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pLCBhbmltYXRpb246IEBwYXJhbXMuYW5pbWF0aW9uLCBlYXNpbmc6IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWVzc2FnZVNldHRpbmdzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kTWVzc2FnZVNldHRpbmdzOiAtPlxuICAgICAgICBtZXNzYWdlT2JqZWN0ID0gQGludGVycHJldGVyLnRhcmdldE1lc3NhZ2UoKVxuICAgICAgICBpZiAhbWVzc2FnZU9iamVjdCB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBtZXNzYWdlU2V0dGluZ3MgPSBAaW50ZXJwcmV0ZXIubWVzc2FnZVNldHRpbmdzKClcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5hdXRvRXJhc2UpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MuYXV0b0VyYXNlID0gQHBhcmFtcy5hdXRvRXJhc2VcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Mud2FpdEF0RW5kKVxuICAgICAgICAgICAgbWVzc2FnZVNldHRpbmdzLndhaXRBdEVuZCA9IEBwYXJhbXMud2FpdEF0RW5kXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmJhY2tsb2cpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MuYmFja2xvZyA9IEBwYXJhbXMuYmFja2xvZ1xuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmxpbmVIZWlnaHQpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MubGluZUhlaWdodCA9IEBwYXJhbXMubGluZUhlaWdodFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmxpbmVTcGFjaW5nKVxuICAgICAgICAgICAgbWVzc2FnZVNldHRpbmdzLmxpbmVTcGFjaW5nID0gQHBhcmFtcy5saW5lU3BhY2luZ1xuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmxpbmVQYWRkaW5nKVxuICAgICAgICAgICAgbWVzc2FnZVNldHRpbmdzLmxpbmVQYWRkaW5nID0gQHBhcmFtcy5saW5lUGFkZGluZ1xuICAgICAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5wYXJhZ3JhcGhTcGFjaW5nKVxuICAgICAgICAgICAgbWVzc2FnZVNldHRpbmdzLnBhcmFncmFwaFNwYWNpbmcgPSBAcGFyYW1zLnBhcmFncmFwaFNwYWNpbmdcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MudXNlQ2hhcmFjdGVyQ29sb3IpXG4gICAgICAgICAgICBtZXNzYWdlU2V0dGluZ3MudXNlQ2hhcmFjdGVyQ29sb3IgPSBAcGFyYW1zLnVzZUNoYXJhY3RlckNvbG9yXG4gICAgICAgICAgICBcbiAgICAgICAgbWVzc2FnZU9iamVjdC50ZXh0UmVuZGVyZXIubWluTGluZUhlaWdodCA9IG1lc3NhZ2VTZXR0aW5ncy5saW5lSGVpZ2h0ID8gMFxuICAgICAgICBtZXNzYWdlT2JqZWN0LnRleHRSZW5kZXJlci5saW5lU3BhY2luZyA9IG1lc3NhZ2VTZXR0aW5ncy5saW5lU3BhY2luZyA/IG1lc3NhZ2VPYmplY3QudGV4dFJlbmRlcmVyLmxpbmVTcGFjaW5nXG4gICAgICAgIG1lc3NhZ2VPYmplY3QudGV4dFJlbmRlcmVyLnBhZGRpbmcgPSBtZXNzYWdlU2V0dGluZ3MubGluZVBhZGRpbmcgPyBtZXNzYWdlT2JqZWN0LnRleHRSZW5kZXJlci5wYWRkaW5nXG4gICAgICAgIFxuICAgICAgICBmb250TmFtZSA9IGlmICFpc0xvY2tlZChmbGFncy5mb250KSB0aGVuIEBwYXJhbXMuZm9udCBlbHNlIG1lc3NhZ2VPYmplY3QuZm9udC5uYW1lXG4gICAgICAgIGZvbnRTaXplID0gaWYgIWlzTG9ja2VkKGZsYWdzLnNpemUpIHRoZW4gQHBhcmFtcy5zaXplIGVsc2UgbWVzc2FnZU9iamVjdC5mb250LnNpemVcbiAgICAgICAgZm9udCA9IG1lc3NhZ2VPYmplY3QuZm9udFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuZm9udCkgb3IgIWlzTG9ja2VkKGZsYWdzLnNpemUpXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQgPSBuZXcgRm9udChmb250TmFtZSwgZm9udFNpemUpXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmJvbGQpXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuYm9sZCA9IEBwYXJhbXMuYm9sZFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuaXRhbGljKVxuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5mb250Lml0YWxpYyA9IEBwYXJhbXMuaXRhbGljXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5zbWFsbENhcHMpXG4gICAgICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuc21hbGxDYXBzID0gQHBhcmFtcy5zbWFsbENhcHNcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnVuZGVybGluZSlcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC51bmRlcmxpbmUgPSBAcGFyYW1zLnVuZGVybGluZVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muc3RyaWtlVGhyb3VnaClcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5zdHJpa2VUaHJvdWdoID0gQHBhcmFtcy5zdHJpa2VUaHJvdWdoXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5jb2xvcilcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5jb2xvciA9IG5ldyBDb2xvcihAcGFyYW1zLmNvbG9yKVxuICAgICAgICAgICAgXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5jb2xvciA9IGlmIGZsYWdzLmNvbG9yPyBhbmQgIWlzTG9ja2VkKGZsYWdzLmNvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLmNvbG9yKSBlbHNlIGZvbnQuY29sb3JcbiAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LmJvcmRlciA9IGlmIGZsYWdzLm91dGxpbmU/IGFuZCAhaXNMb2NrZWQoZmxhZ3Mub3V0bGluZSkgdGhlbiBAcGFyYW1zLm91dGxpbmUgZWxzZSBmb250LmJvcmRlclxuICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuYm9yZGVyQ29sb3IgPSBpZiBmbGFncy5vdXRsaW5lQ29sb3I/IGFuZCAhaXNMb2NrZWQoZmxhZ3Mub3V0bGluZUNvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLm91dGxpbmVDb2xvcikgZWxzZSBuZXcgQ29sb3IoZm9udC5ib3JkZXJDb2xvcilcbiAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LmJvcmRlclNpemUgPSBpZiBmbGFncy5vdXRsaW5lU2l6ZT8gYW5kICFpc0xvY2tlZChmbGFncy5vdXRsaW5lU2l6ZSkgdGhlbiAoQHBhcmFtcy5vdXRsaW5lU2l6ZSA/IDQpIGVsc2UgZm9udC5ib3JkZXJTaXplXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5zaGFkb3cgPSBpZiBmbGFncy5zaGFkb3c/IGFuZCAhaXNMb2NrZWQoZmxhZ3Muc2hhZG93KXRoZW4gQHBhcmFtcy5zaGFkb3cgZWxzZSBmb250LnNoYWRvd1xuICAgICAgICBtZXNzYWdlT2JqZWN0LmZvbnQuc2hhZG93Q29sb3IgPSBpZiBmbGFncy5zaGFkb3dDb2xvcj8gYW5kICFpc0xvY2tlZChmbGFncy5zaGFkb3dDb2xvcikgdGhlbiBuZXcgQ29sb3IoQHBhcmFtcy5zaGFkb3dDb2xvcikgZWxzZSBuZXcgQ29sb3IoZm9udC5zaGFkb3dDb2xvcilcbiAgICAgICAgbWVzc2FnZU9iamVjdC5mb250LnNoYWRvd09mZnNldFggPSBpZiBmbGFncy5zaGFkb3dPZmZzZXRYPyBhbmQgIWlzTG9ja2VkKGZsYWdzLnNoYWRvd09mZnNldFgpIHRoZW4gKEBwYXJhbXMuc2hhZG93T2Zmc2V0WCA/IDEpIGVsc2UgZm9udC5zaGFkb3dPZmZzZXRYXG4gICAgICAgIG1lc3NhZ2VPYmplY3QuZm9udC5zaGFkb3dPZmZzZXRZID0gaWYgZmxhZ3Muc2hhZG93T2Zmc2V0WT8gYW5kICFpc0xvY2tlZChmbGFncy5zaGFkb3dPZmZzZXRZKSB0aGVuIChAcGFyYW1zLnNoYWRvd09mZnNldFkgPyAxKSBlbHNlIGZvbnQuc2hhZG93T2Zmc2V0WVxuICAgICAgICBcbiAgICAgICAgaWYgaXNMb2NrZWQoZmxhZ3MuYm9sZCkgdGhlbiBtZXNzYWdlT2JqZWN0LmZvbnQuYm9sZCA9IGZvbnQuYm9sZFxuICAgICAgICBpZiBpc0xvY2tlZChmbGFncy5pdGFsaWMpIHRoZW4gbWVzc2FnZU9iamVjdC5mb250Lml0YWxpYyA9IGZvbnQuaXRhbGljXG4gICAgICAgIGlmIGlzTG9ja2VkKGZsYWdzLnNtYWxsQ2FwcykgdGhlbiBtZXNzYWdlT2JqZWN0LmZvbnQuc21hbGxDYXBzID0gZm9udC5zbWFsbENhcHNcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENyZWF0ZU1lc3NhZ2VBcmVhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kQ3JlYXRlTWVzc2FnZUFyZWE6IC0+XG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VNZXNzYWdlQXJlYURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgaWYgIXNjZW5lLm1lc3NhZ2VBcmVhc1tudW1iZXJdXG4gICAgICAgICAgICBtZXNzYWdlQXJlYSA9IG5ldyBncy5PYmplY3RfTWVzc2FnZUFyZWEoKVxuICAgICAgICAgICAgbWVzc2FnZUFyZWEubGF5b3V0ID0gdWkuVUlNYW5hZ2VyLmNyZWF0ZUNvbnRyb2xGcm9tRGVzY3JpcHRvcih0eXBlOiBcInVpLkN1c3RvbUdhbWVNZXNzYWdlXCIsIGlkOiBcImN1c3RvbUdhbWVNZXNzYWdlX1wiK251bWJlciwgcGFyYW1zOiB7IGlkOiBcImN1c3RvbUdhbWVNZXNzYWdlX1wiK251bWJlciB9LCBtZXNzYWdlQXJlYSlcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhLm1lc3NhZ2UgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImN1c3RvbUdhbWVNZXNzYWdlX1wiK251bWJlcitcIl9tZXNzYWdlXCIpXG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5tZXNzYWdlLmRvbWFpbiA9IEBwYXJhbXMubnVtYmVyRG9tYWluXG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5hZGRPYmplY3QobWVzc2FnZUFyZWEubGF5b3V0KVxuICAgICAgICAgICAgbWVzc2FnZUFyZWEubGF5b3V0LmRzdFJlY3QueCA9IEBwYXJhbXMuYm94LnhcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhLmxheW91dC5kc3RSZWN0LnkgPSBAcGFyYW1zLmJveC55XG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5sYXlvdXQuZHN0UmVjdC53aWR0aCA9IEBwYXJhbXMuYm94LnNpemUud2lkdGhcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhLmxheW91dC5kc3RSZWN0LmhlaWdodCA9IEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0XG4gICAgICAgICAgICBtZXNzYWdlQXJlYS5sYXlvdXQubmVlZHNVcGRhdGUgPSB5ZXNcbiAgICAgICAgICAgIHNjZW5lLm1lc3NhZ2VBcmVhc1tudW1iZXJdID0gbWVzc2FnZUFyZWFcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZU1lc3NhZ2VBcmVhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kRXJhc2VNZXNzYWdlQXJlYTogLT5cbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZU1lc3NhZ2VBcmVhRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBhcmVhID0gc2NlbmUubWVzc2FnZUFyZWFzW251bWJlcl0gXG4gICAgICAgIGFyZWE/LmxheW91dC5kaXNwb3NlKClcbiAgICAgICAgc2NlbmUubWVzc2FnZUFyZWFzW251bWJlcl0gPSBudWxsXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTZXRUYXJnZXRNZXNzYWdlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kU2V0VGFyZ2V0TWVzc2FnZTogLT5cbiAgICAgICAgbWVzc2FnZSA9IEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKClcbiAgICAgICAgbWVzc2FnZT8udGV4dFJlbmRlcmVyLmlzV2FpdGluZyA9IGZhbHNlXG4gICAgICAgIG1lc3NhZ2U/LmJlaGF2aW9yLmlzV2FpdGluZyA9IGZhbHNlXG4gICAgICAgIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VNZXNzYWdlQXJlYURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgdGFyZ2V0ID0geyB0eXBlOiBAcGFyYW1zLnR5cGUsIGlkOiBudWxsIH1cbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIExheW91dC1iYXNlZFxuICAgICAgICAgICAgICAgIHRhcmdldC5pZCA9IEBwYXJhbXMuaWRcbiAgICAgICAgICAgIHdoZW4gMSAjIEN1c3RvbVxuICAgICAgICAgICAgICAgIHRhcmdldC5pZCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0dGluZ3MubWVzc2FnZS50YXJnZXQgPSB0YXJnZXRcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMuY2xlYXJcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKCk/LmJlaGF2aW9yLmNsZWFyKClcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJhY2tsb2dWaXNpYmlsaXR5XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kQmFja2xvZ1Zpc2liaWxpdHk6IC0+XG4gICAgICAgIGlmIEBwYXJhbXMudmlzaWJsZSBcbiAgICAgICAgICAgIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dCb3hcIilcbiAgICAgICAgICAgIGlmIG5vdCBjb250cm9sPyB0aGVuIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dcIilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgY29udHJvbD9cbiAgICAgICAgICAgICAgICBjb250cm9sLmRpc3Bvc2UoKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBAcGFyYW1zLmJhY2tncm91bmRWaXNpYmxlXG4gICAgICAgICAgICAgICAgY29udHJvbCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jcmVhdGVDb250cm9sKHRoaXMsIHsgZGVzY3JpcHRvcjogXCJ1aS5NZXNzYWdlQmFja2xvZ0JveFwiIH0pXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgY29udHJvbCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jcmVhdGVDb250cm9sKHRoaXMsIHsgZGVzY3JpcHRvcjogXCJ1aS5NZXNzYWdlQmFja2xvZ1wiIH0pXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dCb3hcIilcbiAgICAgICAgICAgIGlmIG5vdCBjb250cm9sPyB0aGVuIGNvbnRyb2wgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImJhY2tsb2dcIilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgY29udHJvbD8uZGlzcG9zZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWVzc2FnZVZpc2liaWxpdHlcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZE1lc3NhZ2VWaXNpYmlsaXR5OiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLm1lc3NhZ2VCb3hcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgbWVzc2FnZSA9IEBpbnRlcnByZXRlci50YXJnZXRNZXNzYWdlKClcbiAgICAgICAgaWYgbm90IG1lc3NhZ2U/IG9yIEBwYXJhbXMudmlzaWJsZSA9PSBtZXNzYWdlLnZpc2libGUgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlzaWJsZVxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmFwcGVhckR1cmF0aW9uXG4gICAgICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmFwcGVhckVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlLmFuaW1hdG9yLmFwcGVhcihtZXNzYWdlLmRzdFJlY3QueCwgbWVzc2FnZS5kc3RSZWN0LnksIEBwYXJhbXMuYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb25cbiAgICAgICAgICAgIGVhc2luZyA9IGlmICFpc0xvY2tlZChmbGFnc1tcImVhc2luZy50eXBlXCJdKSB0aGVuIGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZykgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nKVxuICAgICAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgICAgIG1lc3NhZ2UuYW5pbWF0b3IuZGlzYXBwZWFyKGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgLT4gbWVzc2FnZS52aXNpYmxlID0gbm8pXG4gICAgICAgIG1lc3NhZ2UudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWVzc2FnZUJveFZpc2liaWxpdHlcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1lc3NhZ2VCb3hWaXNpYmlsaXR5OiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLm1lc3NhZ2VCb3hcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBtZXNzYWdlQm94ID0gQGludGVycHJldGVyLm1lc3NhZ2VCb3hPYmplY3QoQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5pZCkpXG4gICAgICAgIHZpc2libGUgPSBAcGFyYW1zLnZpc2libGUgPT0gMVxuICAgICAgICBpZiBub3QgbWVzc2FnZUJveD8gb3IgdmlzaWJsZSA9PSBtZXNzYWdlQm94LnZpc2libGUgdGhlbiByZXR1cm5cbiAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlzaWJsZVxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmFwcGVhckR1cmF0aW9uXG4gICAgICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmFwcGVhckVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlQm94LmFuaW1hdG9yLmFwcGVhcihtZXNzYWdlQm94LmRzdFJlY3QueCwgbWVzc2FnZUJveC5kc3RSZWN0LnksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uXG4gICAgICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmRpc2FwcGVhckVhc2luZylcbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgICAgICBtZXNzYWdlQm94LmFuaW1hdG9yLmRpc2FwcGVhcihhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sIC0+IG1lc3NhZ2VCb3gudmlzaWJsZSA9IG5vKVxuICAgICAgICBtZXNzYWdlQm94LnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFVJQWNjZXNzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRVSUFjY2VzczogLT5cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmdlbmVyYWxNZW51KVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLm1lbnVBY2Nlc3MgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5nZW5lcmFsTWVudSlcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNhdmVNZW51KVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNhdmVNZW51QWNjZXNzID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc2F2ZU1lbnUpXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5sb2FkTWVudSlcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5sb2FkTWVudUFjY2VzcyA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLmxvYWRNZW51KVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYmFja2xvZylcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5iYWNrbG9nQWNjZXNzID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuYmFja2xvZylcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFVubG9ja0NHXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgXG4gICAgY29tbWFuZFVubG9ja0NHOiAtPlxuICAgICAgICBjZyA9IFJlY29yZE1hbmFnZXIuY2dHYWxsZXJ5W0BpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuY2dJZCldXG4gICAgICAgIFxuICAgICAgICBpZiBjZz9cbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLmdsb2JhbERhdGEuY2dHYWxsZXJ5W2NnLmluZGV4XSA9IHsgdW5sb2NrZWQ6IHllcyB9XG4gICAgICAgICAgICBHYW1lTWFuYWdlci5zYXZlR2xvYmFsRGF0YSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyRE1vdmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIGNvbW1hbmRMMkRNb3ZlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3RlciBpbnN0YW5jZW9mIHZuLk9iamVjdF9MaXZlMkRDaGFyYWN0ZXIgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tb3ZlT2JqZWN0KGNoYXJhY3RlciwgQHBhcmFtcy5wb3NpdGlvbiwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTDJETW90aW9uR3JvdXBcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICBcbiAgICBjb21tYW5kTDJETW90aW9uR3JvdXA6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyIGluc3RhbmNlb2Ygdm4uT2JqZWN0X0xpdmUyRENoYXJhY3RlciB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbkdyb3VwID0geyBuYW1lOiBAcGFyYW1zLmRhdGEubW90aW9uR3JvdXAsIGxvb3A6IEBwYXJhbXMubG9vcCwgcGxheVR5cGU6IEBwYXJhbXMucGxheVR5cGUgfVxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgQHBhcmFtcy5sb29wXG4gICAgICAgICAgICBtb3Rpb25zID0gY2hhcmFjdGVyLm1vZGVsLm1vdGlvbnNCeUdyb3VwW2NoYXJhY3Rlci5tb3Rpb25Hcm91cC5uYW1lXVxuICAgICAgICAgICAgaWYgbW90aW9ucz9cbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gbW90aW9ucy5zdW0gKG0pIC0+IG0uZ2V0RHVyYXRpb25NU2VjKCkgLyAxNi42XG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyRE1vdGlvblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZEwyRE1vdGlvbjogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5saXZlMmRcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3RlciBpbnN0YW5jZW9mIHZuLk9iamVjdF9MaXZlMkRDaGFyYWN0ZXIgdGhlbiByZXR1cm5cbiAgICAgICAgZmFkZUluVGltZSA9IGlmICFpc0xvY2tlZChmbGFncy5mYWRlSW5UaW1lKSB0aGVuIEBwYXJhbXMuZmFkZUluVGltZSBlbHNlIGRlZmF1bHRzLm1vdGlvbkZhZGVJblRpbWVcbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbiA9IHsgbmFtZTogQHBhcmFtcy5kYXRhLm1vdGlvbiwgZmFkZUluVGltZTogZmFkZUluVGltZSwgbG9vcDogQHBhcmFtcy5sb29wIH1cbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbkdyb3VwID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IEBwYXJhbXMubG9vcFxuICAgICAgICAgICAgbW90aW9uID0gY2hhcmFjdGVyLm1vZGVsLm1vdGlvbnNbY2hhcmFjdGVyLm1vdGlvbi5uYW1lXVxuICAgICAgICAgICAgaWYgbW90aW9uP1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBtb3Rpb24uZ2V0RHVyYXRpb25NU2VjKCkgLyAxNi42XG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyREV4cHJlc3Npb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEwyREV4cHJlc3Npb246IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMubGl2ZTJkXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXIgaW5zdGFuY2VvZiB2bi5PYmplY3RfTGl2ZTJEQ2hhcmFjdGVyIHRoZW4gcmV0dXJuXG4gICAgICAgIGZhZGVJblRpbWUgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZmFkZUluVGltZSkgdGhlbiBAcGFyYW1zLmZhZGVJblRpbWUgZWxzZSBkZWZhdWx0cy5leHByZXNzaW9uRmFkZUluVGltZVxuICAgICAgICBcbiAgICAgICAgY2hhcmFjdGVyLmV4cHJlc3Npb24gPSB7IG5hbWU6IEBwYXJhbXMuZGF0YS5leHByZXNzaW9uLCBmYWRlSW5UaW1lOiBmYWRlSW5UaW1lIH1cbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyREV4aXRTY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZEwyREV4aXRTY2VuZTogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5saXZlMmRcbiAgICAgICAgQGludGVycHJldGVyLmNvbW1hbmRDaGFyYWN0ZXJFeGl0U2NlbmUuY2FsbCh0aGlzLCBkZWZhdWx0cylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTDJEU2V0dGluZ3NcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZEwyRFNldHRpbmdzOiAtPlxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8udmlzdWFsLmwyZE9iamVjdCB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5saXBTeW5jU2Vuc2l0aXZpdHkpXG4gICAgICAgICAgICBjaGFyYWN0ZXIudmlzdWFsLmwyZE9iamVjdC5saXBTeW5jU2Vuc2l0aXZpdHkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxpcFN5bmNTZW5zaXRpdml0eSlcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmlkbGVJbnRlbnNpdHkpICAgIFxuICAgICAgICAgICAgY2hhcmFjdGVyLnZpc3VhbC5sMmRPYmplY3QuaWRsZUludGVuc2l0eSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuaWRsZUludGVuc2l0eSlcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmJyZWF0aEludGVuc2l0eSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmJyZWF0aEludGVuc2l0eSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYnJlYXRoSW50ZW5zaXR5KVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJleWVCbGluay5lbmFibGVkXCJdKVxuICAgICAgICAgICAgY2hhcmFjdGVyLnZpc3VhbC5sMmRPYmplY3QuZXllQmxpbmsuZW5hYmxlZCA9IEBwYXJhbXMuZXllQmxpbmsuZW5hYmxlZFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJleWVCbGluay5pbnRlcnZhbFwiXSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmV5ZUJsaW5rLmJsaW5rSW50ZXJ2YWxNc2VjID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5leWVCbGluay5pbnRlcnZhbClcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZXllQmxpbmsuY2xvc2VkTW90aW9uVGltZVwiXSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmV5ZUJsaW5rLmNsb3NlZE1vdGlvbk1zZWMgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmV5ZUJsaW5rLmNsb3NlZE1vdGlvblRpbWUpXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImV5ZUJsaW5rLmNsb3NpbmdNb3Rpb25UaW1lXCJdKVxuICAgICAgICAgICAgY2hhcmFjdGVyLnZpc3VhbC5sMmRPYmplY3QuZXllQmxpbmsuY2xvc2luZ01vdGlvbk1zZWMgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmV5ZUJsaW5rLmNsb3NpbmdNb3Rpb25UaW1lKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJleWVCbGluay5vcGVuaW5nTW90aW9uVGltZVwiXSlcbiAgICAgICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmV5ZUJsaW5rLm9wZW5pbmdNb3Rpb25Nc2VjID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5leWVCbGluay5vcGVuaW5nTW90aW9uVGltZSlcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEwyRFBhcmFtZXRlclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kTDJEUGFyYW1ldGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgaWYgbm90IGNoYXJhY3RlciBpbnN0YW5jZW9mIHZuLk9iamVjdF9MaXZlMkRDaGFyYWN0ZXIgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGNoYXJhY3Rlci5hbmltYXRvci5sMmRQYXJhbWV0ZXJUbyhAcGFyYW1zLnBhcmFtLm5hbWUsIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucGFyYW0udmFsdWUpLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRMMkREZWZhdWx0c1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kTDJERGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMubGl2ZTJkXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5hcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5hcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmRpc2FwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmRpc2FwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubW90aW9uRmFkZUluVGltZSkgdGhlbiBkZWZhdWx0cy5tb3Rpb25GYWRlSW5UaW1lID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5tb3Rpb25GYWRlSW5UaW1lKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTDJESm9pblNjZW5lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZEwyREpvaW5TY2VuZTogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5saXZlMmRcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICByZWNvcmQgPSBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNbQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jaGFyYWN0ZXJJZCldXG4gICAgICAgIHJldHVybiBpZiAhcmVjb3JkIG9yIHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpIC0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSByZWNvcmQuaW5kZXhcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDFcbiAgICAgICAgICAgIHggPSBAcGFyYW1zLnBvc2l0aW9uLnhcbiAgICAgICAgICAgIHkgPSBAcGFyYW1zLnBvc2l0aW9uLnlcbiAgICAgICAgZWxzZSBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAyXG4gICAgICAgICAgICB4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucG9zaXRpb24ueSlcbiAgICAgICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICB6SW5kZXggPSBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKSBlbHNlIGRlZmF1bHRzLnpPcmRlclxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBtb3Rpb25CbHVyID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wibW90aW9uQmx1ci5lbmFibGVkXCJdKSB0aGVuIEBwYXJhbXMubW90aW9uQmx1ciBlbHNlIGRlZmF1bHRzLm1vdGlvbkJsdXJcbiAgICAgICAgb3JpZ2luID0gaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBAcGFyYW1zLm9yaWdpbiBlbHNlIGRlZmF1bHRzLm9yaWdpblxuXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuXG4gICAgICAgIGNoYXJhY3RlciA9IG5ldyB2bi5PYmplY3RfTGl2ZTJEQ2hhcmFjdGVyKHJlY29yZClcbiAgICAgICAgY2hhcmFjdGVyLm1vZGVsTmFtZSA9IEBwYXJhbXMubW9kZWw/Lm5hbWUgfHwgXCJcIlxuICAgICAgICBjaGFyYWN0ZXIubW9kZWwgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0TGl2ZTJETW9kZWwoXCJMaXZlMkQvI3tjaGFyYWN0ZXIubW9kZWxOYW1lfVwiKVxuICAgICAgICBjaGFyYWN0ZXIubW90aW9uID0geyBuYW1lOiBcIlwiLCBmYWRlSW5UaW1lOiAwLCBsb29wOiB0cnVlIH0gaWYgY2hhcmFjdGVyLm1vZGVsLm1vdGlvbnNcbiAgICAgICAgI2NoYXJhY3Rlci5leHByZXNzaW9uID0geyBuYW1lOiBPYmplY3Qua2V5cyhjaGFyYWN0ZXIubW9kZWwuZXhwcmVzc2lvbnMpWzBdLCBmYWRlSW5UaW1lOiAwIH0gaWYgY2hhcmFjdGVyLm1vZGVsLmV4cHJlc3Npb25zXG4gICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnggPSB4XG4gICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnkgPSB5XG4gICAgICAgIGNoYXJhY3Rlci5hbmNob3IueCA9IGlmICFvcmlnaW4gdGhlbiAwIGVsc2UgMC41XG4gICAgICAgIGNoYXJhY3Rlci5hbmNob3IueSA9IGlmICFvcmlnaW4gdGhlbiAwIGVsc2UgMC41XG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIuYmxlbmRNb2RlID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5ibGVuZE1vZGUpXG4gICAgICAgIGNoYXJhY3Rlci56b29tLnggPSBAcGFyYW1zLnBvc2l0aW9uLnpvb20uZFxuICAgICAgICBjaGFyYWN0ZXIuem9vbS55ID0gQHBhcmFtcy5wb3NpdGlvbi56b29tLmRcbiAgICAgICAgY2hhcmFjdGVyLnpJbmRleCA9IHpJbmRleCB8fCAyMDBcbiAgICAgICAgY2hhcmFjdGVyLm1vZGVsPy5yZXNldCgpXG4gICAgICAgIGNoYXJhY3Rlci5zZXR1cCgpXG4gICAgICAgIGNoYXJhY3Rlci52aXN1YWwubDJkT2JqZWN0LmlkbGVJbnRlbnNpdHkgPSByZWNvcmQuaWRsZUludGVuc2l0eSA/IDEuMFxuICAgICAgICBjaGFyYWN0ZXIudmlzdWFsLmwyZE9iamVjdC5icmVhdGhJbnRlbnNpdHkgPSByZWNvcmQuYnJlYXRoSW50ZW5zaXR5ID8gMS4wIFxuICAgICAgICBjaGFyYWN0ZXIudmlzdWFsLmwyZE9iamVjdC5saXBTeW5jU2Vuc2l0aXZpdHkgPSByZWNvcmQubGlwU3luY1NlbnNpdGl2aXR5ID8gMS4wXG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIGNoYXJhY3RlciwgQHBhcmFtcylcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnggPSBwLnhcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmFkZENoYXJhY3RlcihjaGFyYWN0ZXIsIG5vLCB7IGFuaW1hdGlvbjogYW5pbWF0aW9uLCBkdXJhdGlvbjogZHVyYXRpb24sIGVhc2luZzogZWFzaW5nLCBtb3Rpb25CbHVyOiBtb3Rpb25CbHVyfSlcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlld3BvcnQ/LnR5cGUgPT0gXCJ1aVwiXG4gICAgICAgICAgICBjaGFyYWN0ZXIudmlld3BvcnQgPSBHcmFwaGljcy52aWV3cG9ydFxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYXJhY3RlckpvaW5TY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJKb2luU2NlbmU6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuY2hhcmFjdGVyXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgcmVjb3JkID0gUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzW0BwYXJhbXMuY2hhcmFjdGVySWRdXG4gICAgICAgIHJldHVybiBpZiAhcmVjb3JkIG9yIHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpIC0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSByZWNvcmQuaW5kZXggYW5kICF2LmRpc3Bvc2VkXG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIgPSBuZXcgdm4uT2JqZWN0X0NoYXJhY3RlcihyZWNvcmQsIG51bGwsIHNjZW5lKVxuICAgICAgICBjaGFyYWN0ZXIuZXhwcmVzc2lvbiA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyRXhwcmVzc2lvbnNbQHBhcmFtcy5leHByZXNzaW9uSWQgPyByZWNvcmQuZGVmYXVsdEV4cHJlc3Npb25JZHx8MF0gI2NoYXJhY3Rlci5leHByZXNzaW9uXG4gICAgICAgIGlmIGNoYXJhY3Rlci5leHByZXNzaW9uP1xuICAgICAgICAgICAgYml0bWFwID0gUmVzb3VyY2VNYW5hZ2VyLmdldEJpdG1hcChcIkdyYXBoaWNzL0NoYXJhY3RlcnMvI3tjaGFyYWN0ZXIuZXhwcmVzc2lvbi5pZGxlWzBdPy5yZXNvdXJjZS5uYW1lfVwiKVxuICAgICAgICBcbiAgICAgICAgbWlycm9yID0gbm9cbiAgICAgICAgYW5nbGUgPSAwXG4gICAgICAgIHpvb20gPSAxXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAxXG4gICAgICAgICAgICB4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucG9zaXRpb24ueSlcbiAgICAgICAgICAgIG1pcnJvciA9IEBwYXJhbXMucG9zaXRpb24uaG9yaXpvbnRhbEZsaXBcbiAgICAgICAgICAgIGFuZ2xlID0gQHBhcmFtcy5wb3NpdGlvbi5hbmdsZXx8MFxuICAgICAgICAgICAgem9vbSA9IEBwYXJhbXMucG9zaXRpb24uZGF0YT8uem9vbSB8fCAxXG4gICAgICAgIGVsc2UgaWYgQHBhcmFtcy5wb3NpdGlvblR5cGUgPT0gMlxuICAgICAgICAgICAgeCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMucG9zaXRpb24ueClcbiAgICAgICAgICAgIHkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBvc2l0aW9uLnkpXG4gICAgICAgICAgICBtaXJyb3IgPSBub1xuICAgICAgICAgICAgYW5nbGUgPSAwXG4gICAgICAgICAgICB6b29tID0gMVxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuYXBwZWFyRHVyYXRpb25cbiAgICAgICAgb3JpZ2luID0gaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBAcGFyYW1zLm9yaWdpbiBlbHNlIGRlZmF1bHRzLm9yaWdpblxuICAgICAgICB6SW5kZXggPSBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKSBlbHNlIGRlZmF1bHRzLnpPcmRlclxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBtb3Rpb25CbHVyID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wibW90aW9uQmx1ci5lbmFibGVkXCJdKSB0aGVuIEBwYXJhbXMubW90aW9uQmx1ciBlbHNlIGRlZmF1bHRzLm1vdGlvbkJsdXJcbiAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgaWYgY2hhcmFjdGVyLmV4cHJlc3Npb24/XG4gICAgICAgICAgICBiaXRtYXAgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvQ2hhcmFjdGVycy8je2NoYXJhY3Rlci5leHByZXNzaW9uLmlkbGVbMF0/LnJlc291cmNlLm5hbWV9XCIpXG4gICAgICAgICAgICBpZiBAcGFyYW1zLm9yaWdpbiA9PSAxIGFuZCBiaXRtYXA/XG4gICAgICAgICAgICAgICAgeCArPSAoYml0bWFwLndpZHRoKnpvb20tYml0bWFwLndpZHRoKS8yXG4gICAgICAgICAgICAgICAgeSArPSAoYml0bWFwLmhlaWdodCp6b29tLWJpdG1hcC5oZWlnaHQpLzJcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgY2hhcmFjdGVyLm1pcnJvciA9IG1pcnJvclxuICAgICAgICBjaGFyYWN0ZXIuYW5jaG9yLnggPSBpZiAhb3JpZ2luIHRoZW4gMCBlbHNlIDAuNVxuICAgICAgICBjaGFyYWN0ZXIuYW5jaG9yLnkgPSBpZiAhb3JpZ2luIHRoZW4gMCBlbHNlIDAuNVxuICAgICAgICBjaGFyYWN0ZXIuem9vbS54ID0gem9vbVxuICAgICAgICBjaGFyYWN0ZXIuem9vbS55ID0gem9vbVxuICAgICAgICBjaGFyYWN0ZXIuZHN0UmVjdC54ID0geFxuICAgICAgICBjaGFyYWN0ZXIuZHN0UmVjdC55ID0geVxuICAgICAgICBjaGFyYWN0ZXIuekluZGV4ID0gekluZGV4IHx8ICAyMDBcbiAgICAgICAgY2hhcmFjdGVyLmJsZW5kTW9kZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYmxlbmRNb2RlKVxuICAgICAgICBjaGFyYWN0ZXIuYW5nbGUgPSBhbmdsZVxuICAgICAgICBjaGFyYWN0ZXIuc2V0dXAoKVxuICAgICAgICBjaGFyYWN0ZXIudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIGNoYXJhY3RlciwgQHBhcmFtcylcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnggPSBwLnhcbiAgICAgICAgICAgIGNoYXJhY3Rlci5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmFkZENoYXJhY3RlcihjaGFyYWN0ZXIsIG5vLCB7IGFuaW1hdGlvbjogYW5pbWF0aW9uLCBkdXJhdGlvbjogZHVyYXRpb24sIGVhc2luZzogZWFzaW5nLCBtb3Rpb25CbHVyOiBtb3Rpb25CbHVyfSlcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMudmlld3BvcnQ/LnR5cGUgPT0gXCJ1aVwiXG4gICAgICAgICAgICBjaGFyYWN0ZXIudmlld3BvcnQgPSBHcmFwaGljcy52aWV3cG9ydFxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYXJhY3RlckV4aXRTY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJFeGl0U2NlbmU6IChkZWZhdWx0cykgLT5cbiAgICAgICAgZGVmYXVsdHMgPSBkZWZhdWx0cyB8fCBHYW1lTWFuYWdlci5kZWZhdWx0cy5jaGFyYWN0ZXJcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWRcbiAgICAgICAgXG4gICAgICAgIGVhc2luZyA9IGlmICFpc0xvY2tlZChmbGFnc1tcImVhc2luZy50eXBlXCJdKSB0aGVuIGdzLkVhc2luZ3MuZnJvbVZhbHVlcyhAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmVhc2luZy50eXBlKSwgQHBhcmFtcy5lYXNpbmcuaW5PdXQpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmRpc2FwcGVhckVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKSBlbHNlIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uXG4gICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLnJlbW92ZUNoYXJhY3RlcihjaGFyYWN0ZXIsIHsgYW5pbWF0aW9uOiBhbmltYXRpb24sIGR1cmF0aW9uOiBkdXJhdGlvbiwgZWFzaW5nOiBlYXNpbmd9KSAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFyYWN0ZXJDaGFuZ2VFeHByZXNzaW9uXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kQ2hhcmFjdGVyQ2hhbmdlRXhwcmVzc2lvbjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuY2hhcmFjdGVyXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5leHByZXNzaW9uRHVyYXRpb25cbiAgICAgICAgZXhwcmVzc2lvbiA9IFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyRXhwcmVzc2lvbnNbQHBhcmFtcy5leHByZXNzaW9uSWQgfHwgMF1cbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5jaGFuZ2VFYXNpbmcpXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuY2hhbmdlQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICAgICBjaGFyYWN0ZXIuYmVoYXZpb3IuY2hhbmdlRXhwcmVzc2lvbihleHByZXNzaW9uLCBAcGFyYW1zLmFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcblxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyU2V0UGFyYW1ldGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJTZXRQYXJhbWV0ZXI6IC0+XG4gICAgICAgIHBhcmFtcyA9IEdhbWVNYW5hZ2VyLmNoYXJhY3RlclBhcmFtc1tAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKV1cbiAgICAgICAgaWYgbm90IHBhcmFtcz8gb3Igbm90IEBwYXJhbXMucGFyYW0/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLnBhcmFtLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJhbXNbQHBhcmFtcy5wYXJhbS5uYW1lXSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSA+IDBcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgVGV4dFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKS50b1N0cmluZygpXG4gICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2ggVmFsdWVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wYXJhbS50eXBlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gaWYgdmFsdWUgdGhlbiAxIGVsc2UgMFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBTd2l0Y2hcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpICAgIFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICB2YWx1ZSA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBpZiB2YWx1ZSB0aGVuIFwiT05cIiBlbHNlIFwiT0ZGXCJcbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHQgVmFsdWVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wYXJhbS50eXBlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFsdWUgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gdmFsdWUubGVuZ3RoXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW0BwYXJhbXMucGFyYW0ubmFtZV0gPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSkgPT0gXCJPTlwiXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50ZXh0VmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyR2V0UGFyYW1ldGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDaGFyYWN0ZXJHZXRQYXJhbWV0ZXI6IC0+XG4gICAgICAgIHBhcmFtcyA9IEdhbWVNYW5hZ2VyLmNoYXJhY3RlclBhcmFtc1tAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKV1cbiAgICAgICAgaWYgbm90IHBhcmFtcz8gb3Igbm90IEBwYXJhbXMucGFyYW0/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICB2YWx1ZSA9IHBhcmFtc1tAcGFyYW1zLnBhcmFtLm5hbWVdXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy52YWx1ZVR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlciBWYWx1ZVxuICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLnBhcmFtLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgTnVtYmVyXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBpZiB2YWx1ZSB0aGVuIDEgZWxzZSAwKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBpZiB2YWx1ZT8gdGhlbiB2YWx1ZS5sZW5ndGggZWxzZSAwKVxuICAgICAgICAgICAgd2hlbiAxICMgU3dpdGNoIFZhbHVlXG4gICAgICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMucGFyYW0udHlwZVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDAgIyBOdW1iZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSA+IDApXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgdmFsdWUgPT0gXCJPTlwiKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIHdoZW4gMiAjIFRleHQgVmFsdWVcbiAgICAgICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wYXJhbS50eXBlXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMCAjIE51bWJlclxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgaWYgdmFsdWU/IHRoZW4gdmFsdWUudG9TdHJpbmcoKSBlbHNlIFwiXCIpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldFN0cmluZ1ZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgaWYgdmFsdWUgdGhlbiBcIk9OXCIgZWxzZSBcIk9GRlwiKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCB2YWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFyYWN0ZXJNb3Rpb25CbHVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZENoYXJhY3Rlck1vdGlvbkJsdXI6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG5cbiAgICAgICAgY2hhcmFjdGVyLm1vdGlvbkJsdXIuc2V0KEBwYXJhbXMubW90aW9uQmx1cilcbiAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyRGVmYXVsdHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZENoYXJhY3RlckRlZmF1bHRzOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmNoYXJhY3RlclxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kaXNhcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kaXNhcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmV4cHJlc3Npb25EdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5leHByZXNzaW9uRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZXhwcmVzc2lvbkR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJtb3Rpb25CbHVyLmVuYWJsZWRcIl0pIHRoZW4gZGVmYXVsdHMubW90aW9uQmx1ciA9IEBwYXJhbXMubW90aW9uQmx1clxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIGRlZmF1bHRzLm9yaWdpbiA9IEBwYXJhbXMub3JpZ2luXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhcmFjdGVyRWZmZWN0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZENoYXJhY3RlckVmZmVjdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVySWQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNoYXJhY3RlcklkKVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0IChjKSAtPiAhYy5kaXNwb3NlZCBhbmQgYy5yaWQgPT0gY2hhcmFjdGVySWRcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RFZmZlY3QoY2hhcmFjdGVyLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZsYXNoQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZEZsYXNoQ2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgcmV0dXJuIGlmIG5vdCBjaGFyYWN0ZXJcbiAgICAgICAgXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBjaGFyYWN0ZXIuYW5pbWF0b3IuZmxhc2gobmV3IENvbG9yKEBwYXJhbXMuY29sb3IpLCBkdXJhdGlvbilcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFRpbnRDaGFyYWN0ZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRUaW50Q2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCBcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dClcbiAgICAgICAgcmV0dXJuIGlmIG5vdCBjaGFyYWN0ZXJcbiAgICAgICAgXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBjaGFyYWN0ZXIuYW5pbWF0b3IudGludFRvKEBwYXJhbXMudG9uZSwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRab29tQ2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCAgICAgIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnpvb21PYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG5cbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSb3RhdGVDaGFyYWN0ZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZFJvdGF0ZUNoYXJhY3RlcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgY2hhcmFjdGVyID0gc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgICAgICBcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5yb3RhdGVPYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJsZW5kQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZEJsZW5kQ2hhcmFjdGVyOiAtPlxuICAgICAgICBjaGFyYWN0ZXIgPSBTY2VuZU1hbmFnZXIuc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IEBwYXJhbXMuY2hhcmFjdGVySWQgICAgICBcbiAgICAgICAgaWYgbm90IGNoYXJhY3Rlcj8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5ibGVuZE9iamVjdChjaGFyYWN0ZXIsIEBwYXJhbXMpIFxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNoYWtlQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZFNoYWtlQ2hhcmFjdGVyOiAtPiBcbiAgICAgICAgY2hhcmFjdGVyID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCAgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCAgICAgIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyPyB0aGVuIHJldHVyblxuICAgICAgICBAaW50ZXJwcmV0ZXIuc2hha2VPYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zKSAgXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNYXNrQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZE1hc2tDaGFyYWN0ZXI6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkICAgICAgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubWFza09iamVjdChjaGFyYWN0ZXIsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNb3ZlQ2hhcmFjdGVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRNb3ZlQ2hhcmFjdGVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBjaGFyYWN0ZXIgPSBzY2VuZS5jaGFyYWN0ZXJzLmZpcnN0ICh2KSA9PiAhdi5kaXNwb3NlZCBhbmQgdi5yaWQgPT0gQHBhcmFtcy5jaGFyYWN0ZXJJZCAgICAgIFxuICAgICAgICBpZiBub3QgY2hhcmFjdGVyPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3QoY2hhcmFjdGVyLCBAcGFyYW1zLnBvc2l0aW9uLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZUNoYXJhY3RlclBhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kTW92ZUNoYXJhY3RlclBhdGg6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNoYXJhY3RlciA9IHNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBAcGFyYW1zLmNoYXJhY3RlcklkICAgICAgXG4gICAgICAgIGlmIG5vdCBjaGFyYWN0ZXI/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubW92ZU9iamVjdFBhdGgoY2hhcmFjdGVyLCBAcGFyYW1zLnBhdGgsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaGFrZUJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZFNoYWtlQmFja2dyb3VuZDogLT4gXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcildXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNoYWtlT2JqZWN0KGJhY2tncm91bmQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcblxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcm9sbEJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTY3JvbGxCYWNrZ3JvdW5kOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgaG9yaXpvbnRhbFNwZWVkID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5ob3Jpem9udGFsU3BlZWQpXG4gICAgICAgIHZlcnRpY2FsU3BlZWQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnZlcnRpY2FsU3BlZWQpXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbVZhbHVlcyhAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmVhc2luZy50eXBlKSwgQHBhcmFtcy5lYXNpbmcuaW5PdXQpXG4gICAgICAgIGxheWVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcilcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICBcbiAgICAgICAgc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdPy5hbmltYXRvci5tb3ZlKGhvcml6b250YWxTcGVlZCwgdmVydGljYWxTcGVlZCwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcm9sbEJhY2tncm91bmRUb1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgY29tbWFuZFNjcm9sbEJhY2tncm91bmRUbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIHggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJhY2tncm91bmQubG9jYXRpb24ueClcbiAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYmFja2dyb3VuZC5sb2NhdGlvbi55KVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KVxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl1cbiAgICAgICAgaWYgIWJhY2tncm91bmQgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICBwID0gQGludGVycHJldGVyLnByZWRlZmluZWRPYmplY3RQb3NpdGlvbihAcGFyYW1zLnByZWRlZmluZWRQb3NpdGlvbklkLCBiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICAgICAgeCA9IHAueFxuICAgICAgICAgICAgeSA9IHAueVxuICAgICBcbiAgICAgICAgYmFja2dyb3VuZC5hbmltYXRvci5tb3ZlVG8oeCwgeSwgZHVyYXRpb24sIGVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcm9sbEJhY2tncm91bmRQYXRoXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZFNjcm9sbEJhY2tncm91bmRQYXRoOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBiYWNrZ3JvdW5kID0gc2NlbmUuYmFja2dyb3VuZHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcildXG4gICAgICAgIHJldHVybiB1bmxlc3MgYmFja2dyb3VuZD9cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tb3ZlT2JqZWN0UGF0aChiYWNrZ3JvdW5kLCBAcGFyYW1zLnBhdGgsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNYXNrQmFja2dyb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRNYXNrQmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgYmFja2dyb3VuZCA9IHNjZW5lLmJhY2tncm91bmRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXVxuICAgICAgICByZXR1cm4gdW5sZXNzIGJhY2tncm91bmQ/XG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubWFza09iamVjdChiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFpvb21CYWNrZ3JvdW5kXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRab29tQmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIHggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpvb21pbmcueClcbiAgICAgICAgeSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuem9vbWluZy55KVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KVxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0/LmFuaW1hdG9yLnpvb21Ubyh4IC8gMTAwLCB5IC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUm90YXRlQmFja2dyb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUm90YXRlQmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgYmFja2dyb3VuZCA9IHNjZW5lLmJhY2tncm91bmRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXVxuICAgICAgICBcbiAgICAgICAgaWYgYmFja2dyb3VuZFxuICAgICAgICAgICAgQGludGVycHJldGVyLnJvdGF0ZU9iamVjdChiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICAgICAgXG4gICAgIyMjKiAgICAgICAgXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRUaW50QmFja2dyb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRUaW50QmFja2dyb3VuZDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgbGF5ZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKVxuICAgICAgICBiYWNrZ3JvdW5kID0gc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgYmFja2dyb3VuZC5hbmltYXRvci50aW50VG8oQHBhcmFtcy50b25lLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLndhaXRGb3JDb21wbGV0aW9uKGJhY2tncm91bmQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCbGVuZEJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kQmxlbmRCYWNrZ3JvdW5kOiAtPlxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmJsZW5kT2JqZWN0KGJhY2tncm91bmQsIEBwYXJhbXMpIFxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJhY2tncm91bmRFZmZlY3RcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRCYWNrZ3JvdW5kRWZmZWN0OiAtPlxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm9iamVjdEVmZmVjdChiYWNrZ3JvdW5kLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQmFja2dyb3VuZERlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZEJhY2tncm91bmREZWZhdWx0czogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5iYWNrZ3JvdW5kXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnpPcmRlcikgdGhlbiBkZWZhdWx0cy56T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZWFzaW5nID0gQHBhcmFtcy5lYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYW5pbWF0aW9uID0gQHBhcmFtcy5hbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBkZWZhdWx0cy5vcmlnaW4gPSBAcGFyYW1zLm9yaWdpblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubG9vcEhvcml6b250YWwpIHRoZW4gZGVmYXVsdHMubG9vcEhvcml6b250YWwgPSBAcGFyYW1zLmxvb3BIb3Jpem9udGFsXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5sb29wVmVydGljYWwpIHRoZW4gZGVmYXVsdHMubG9vcFZlcnRpY2FsID0gQHBhcmFtcy5sb29wVmVydGljYWxcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCYWNrZ3JvdW5kTW90aW9uQmx1clxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZEJhY2tncm91bmRNb3Rpb25CbHVyOiAtPlxuICAgICAgICBsYXllciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXG4gICAgICAgIGJhY2tncm91bmQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdXG4gICAgICAgIGlmIG5vdCBiYWNrZ3JvdW5kPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgYmFja2dyb3VuZC5tb3Rpb25CbHVyLnNldChAcGFyYW1zLm1vdGlvbkJsdXIpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZUJhY2tncm91bmRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRDaGFuZ2VCYWNrZ3JvdW5kOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmJhY2tncm91bmRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZHVyYXRpb25cbiAgICAgICAgbG9vcEggPSBpZiAhaXNMb2NrZWQoZmxhZ3MubG9vcEhvcml6b250YWwpIHRoZW4gQHBhcmFtcy5sb29wSG9yaXpvbnRhbCBlbHNlIGRlZmF1bHRzLmxvb3BIb3Jpem9udGFsXG4gICAgICAgIGxvb3BWID0gaWYgIWlzTG9ja2VkKGZsYWdzLmxvb3BWZXJ0aWNhbCkgdGhlbiBAcGFyYW1zLmxvb3BWZXJ0aWNhbCBlbHNlIGRlZmF1bHRzLmxvb3BWZXJ0aWNhbFxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFuaW1hdGlvblxuICAgICAgICBvcmlnaW4gPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIEBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpIGVsc2UgZGVmYXVsdHMuek9yZGVyXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgXG4gICAgICAgIGVhc2luZyA9IGlmICFpc0xvY2tlZChmbGFnc1tcImVhc2luZy50eXBlXCJdKSB0aGVuICBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmVhc2luZylcbiAgICAgICAgbGF5ZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VCYWNrZ3JvdW5kKEBwYXJhbXMuZ3JhcGhpYywgbm8sIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgMCwgMCwgbGF5ZXIsIGxvb3BILCBsb29wVilcbiAgICAgICAgXG4gICAgICAgIGlmIHNjZW5lLmJhY2tncm91bmRzW2xheWVyXVxuICAgICAgICAgICAgaWYgQHBhcmFtcy52aWV3cG9ydD8udHlwZSA9PSBcInVpXCJcbiAgICAgICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0udmlld3BvcnQgPSBHcmFwaGljcy52aWV3cG9ydFxuICAgICAgICAgICAgc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLmFuY2hvci54ID0gaWYgb3JpZ2luID09IDAgdGhlbiAwIGVsc2UgMC41XG4gICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uYW5jaG9yLnkgPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgICAgIHNjZW5lLmJhY2tncm91bmRzW2xheWVyXS5ibGVuZE1vZGUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJsZW5kTW9kZSlcbiAgICAgICAgICAgIHNjZW5lLmJhY2tncm91bmRzW2xheWVyXS56SW5kZXggPSB6SW5kZXhcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgb3JpZ2luID09IDFcbiAgICAgICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uZHN0UmVjdC54ID0gc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLmRzdFJlY3QueCMgKyBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uYml0bWFwLndpZHRoLzJcbiAgICAgICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uZHN0UmVjdC55ID0gc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLmRzdFJlY3QueSMgKyBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uYml0bWFwLmhlaWdodC8yXG4gICAgICAgICAgICBzY2VuZS5iYWNrZ3JvdW5kc1tsYXllcl0uc2V0dXAoKVxuICAgICAgICAgICAgc2NlbmUuYmFja2dyb3VuZHNbbGF5ZXJdLnVwZGF0ZSgpXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2FsbFNjZW5lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZENhbGxTY2VuZTogLT5cbiAgICAgICAgQGludGVycHJldGVyLmNhbGxTY2VuZShAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnNjZW5lLnVpZCB8fCBAcGFyYW1zLnNjZW5lKSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhbmdlU2NlbmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kQ2hhbmdlU2NlbmU6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXcgdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmICFAcGFyYW1zLnNhdmVQcmV2aW91c1xuICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLmNsZWFyKClcbiAgICAgICAgICAgIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBpZiAhQHBhcmFtcy5lcmFzZVBpY3R1cmVzIGFuZCAhQHBhcmFtcy5zYXZlUHJldmlvdXNcbiAgICAgICAgICAgIHNjZW5lLnJlbW92ZU9iamVjdChzY2VuZS5waWN0dXJlQ29udGFpbmVyKVxuICAgICAgICAgICAgZm9yIHBpY3R1cmUgaW4gc2NlbmUucGljdHVyZXNcbiAgICAgICAgICAgICAgICBSZXNvdXJjZU1hbmFnZXIuY29udGV4dC5yZW1vdmUoXCJHcmFwaGljcy9QaWN0dXJlcy8je3BpY3R1cmUuaW1hZ2V9XCIpIGlmIHBpY3R1cmVcbiAgICAgICAgaWYgIUBwYXJhbXMuZXJhc2VUZXh0cyBhbmQgIUBwYXJhbXMuc2F2ZVByZXZpb3VzXG4gICAgICAgICAgICBzY2VuZS5yZW1vdmVPYmplY3Qoc2NlbmUudGV4dENvbnRhaW5lcilcbiAgICAgICAgaWYgIUBwYXJhbXMuZXJhc2VWaWRlb3MgYW5kICFAcGFyYW1zLnNhdmVQcmV2aW91c1xuICAgICAgICAgICAgc2NlbmUucmVtb3ZlT2JqZWN0KHNjZW5lLnZpZGVvQ29udGFpbmVyKVxuICAgICAgICAgICAgZm9yIHZpZGVvIGluIHNjZW5lLnZpZGVvc1xuICAgICAgICAgICAgICAgIFJlc291cmNlTWFuYWdlci5jb250ZXh0LnJlbW92ZShcIk1vdmllcy8je3ZpZGVvLnZpZGVvfVwiKSBpZiB2aWRlb1xuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy5zY2VuZVxuICAgICAgICAgICAgaWYgQHBhcmFtcy5zYXZlUHJldmlvdXNcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci5zY2VuZURhdGEgPSB1aWQ6IHVpZCA9IEBwYXJhbXMuc2NlbmUudWlkLCBwaWN0dXJlczogW10sIHRleHRzOiBbXSwgdmlkZW9zOiBbXVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnNjZW5lRGF0YSA9IHVpZDogdWlkID0gQHBhcmFtcy5zY2VuZS51aWQsIHBpY3R1cmVzOiBzY2VuZS5waWN0dXJlQ29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpbiwgdGV4dHM6IHNjZW5lLnRleHRDb250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluLCB2aWRlb3M6IHNjZW5lLnZpZGVvQ29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpblxuICAgICAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgICAgIG5ld1NjZW5lID0gbmV3IHZuLk9iamVjdF9TY2VuZSgpXG4gICAgICAgICAgICBpZiBAcGFyYW1zLnNhdmVQcmV2aW91c1xuICAgICAgICAgICAgICAgIG5ld1NjZW5lLnNjZW5lRGF0YSA9IHVpZDogdWlkID0gQHBhcmFtcy5zY2VuZS51aWQsIHBpY3R1cmVzOiBbXSwgdGV4dHM6IFtdLCB2aWRlb3M6IFtdLCBiYWNrbG9nOiBHYW1lTWFuYWdlci5iYWNrbG9nXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbmV3U2NlbmUuc2NlbmVEYXRhID0gdWlkOiB1aWQgPSBAcGFyYW1zLnNjZW5lLnVpZCwgcGljdHVyZXM6IHNjZW5lLnBpY3R1cmVDb250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluLCB0ZXh0czogc2NlbmUudGV4dENvbnRhaW5lci5zdWJPYmplY3RzQnlEb21haW4sIHZpZGVvczogc2NlbmUudmlkZW9Db250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIFNjZW5lTWFuYWdlci5zd2l0Y2hUbyhuZXdTY2VuZSwgQHBhcmFtcy5zYXZlUHJldmlvdXMsID0+IEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSBubylcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG51bGwpXG4gICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSZXR1cm5Ub1ByZXZpb3VzU2NlbmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRSZXR1cm5Ub1ByZXZpb3VzU2NlbmU6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXcgdGhlbiByZXR1cm5cbiAgICAgICAgU2NlbmVNYW5hZ2VyLnJldHVyblRvUHJldmlvdXMoPT4gQGludGVycHJldGVyLmlzV2FpdGluZyA9IG5vKVxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTd2l0Y2hUb0xheW91dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kU3dpdGNoVG9MYXlvdXQ6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXcgdGhlbiByZXR1cm5cbiAgICAgICAgaWYgdWkuVUlNYW5hZ2VyLmxheW91dHNbQHBhcmFtcy5sYXlvdXQubmFtZV0/XG4gICAgICAgICAgICBzY2VuZSA9IG5ldyBncy5PYmplY3RfTGF5b3V0KEBwYXJhbXMubGF5b3V0Lm5hbWUpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIuc3dpdGNoVG8oc2NlbmUsIEBwYXJhbXMuc2F2ZVByZXZpb3VzKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVRyYW5zaXRpb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZENoYW5nZVRyYW5zaXRpb246IC0+XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbilcbiAgICAgICAgICAgIFNjZW5lTWFuYWdlci50cmFuc2l0aW9uRGF0YS5kdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmdyYXBoaWMpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEuZ3JhcGhpYyA9IEBwYXJhbXMuZ3JhcGhpY1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MudmFndWUpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEudmFndWUgPSBAcGFyYW1zLnZhZ3VlXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZyZWV6ZVNjcmVlblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRGcmVlemVTY3JlZW46IC0+IFxuICAgICAgICBHcmFwaGljcy5mcmVlemUoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcmVlblRyYW5zaXRpb25cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTY3JlZW5UcmFuc2l0aW9uOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLnNjZW5lXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgZ3JhcGhpY05hbWUgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZ3JhcGhpYykgdGhlbiBAcGFyYW1zLmdyYXBoaWM/Lm5hbWUgZWxzZSBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEuZ3JhcGhpYz8ubmFtZVxuICAgICAgICBcbiAgICAgICAgaWYgZ3JhcGhpY05hbWVcbiAgICAgICAgICAgIGJpdG1hcCA9IGlmICFpc0xvY2tlZChmbGFncy5ncmFwaGljKSB0aGVuIFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9NYXNrcy8je2dyYXBoaWNOYW1lfVwiKSBlbHNlIFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9NYXNrcy8je2dyYXBoaWNOYW1lfVwiKVxuICAgICAgICB2YWd1ZSA9IGlmICFpc0xvY2tlZChmbGFncy52YWd1ZSkgdGhlbiBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnZhZ3VlKSBlbHNlIFNjZW5lTWFuYWdlci50cmFuc2l0aW9uRGF0YS52YWd1ZVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgU2NlbmVNYW5hZ2VyLnRyYW5zaXRpb25EYXRhLmR1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gIUdhbWVNYW5hZ2VyLmluTGl2ZVByZXZpZXdcbiAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBHcmFwaGljcy50cmFuc2l0aW9uKGR1cmF0aW9uLCBiaXRtYXAsIHZhZ3VlKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNoYWtlU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZFNoYWtlU2NyZWVuOiAtPlxuICAgICAgICBpZiBub3QgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0PyB0aGVuIHJldHVybiAgICAgICAgICAgICAgICBcbiAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNoYWtlT2JqZWN0KFNjZW5lTWFuYWdlci5zY2VuZS52aWV3cG9ydCwgQHBhcmFtcykgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRUaW50U2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRUaW50U2NyZWVuOiAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuaW1hdG9yLnRpbnRUbyhuZXcgVG9uZShAcGFyYW1zLnRvbmUpLCBkdXJhdGlvbiwgZ3MuRWFzaW5ncy5FQVNFX0xJTkVBUlswXSlcbiAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgZHVyYXRpb24gPiAwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kWm9vbVNjcmVlbjogLT5cbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcblxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUudmlld3BvcnQuYW5jaG9yLnggPSAwLjVcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuY2hvci55ID0gMC41XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS52aWV3cG9ydC5hbmltYXRvci56b29tVG8oQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56b29taW5nLngpIC8gMTAwLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpvb21pbmcueSkgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obnVsbCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFBhblNjcmVlblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgIFxuICAgIGNvbW1hbmRQYW5TY3JlZW46IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIEBpbnRlcnByZXRlci5zZXR0aW5ncy5zY3JlZW4ucGFuLnggLT0gQHBhcmFtcy5wb3NpdGlvbi54XG4gICAgICAgIEBpbnRlcnByZXRlci5zZXR0aW5ncy5zY3JlZW4ucGFuLnkgLT0gQHBhcmFtcy5wb3NpdGlvbi55XG4gICAgICAgIHZpZXdwb3J0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0XG5cbiAgICAgICAgdmlld3BvcnQuYW5pbWF0b3Iuc2Nyb2xsVG8oLUBwYXJhbXMucG9zaXRpb24ueCArIHZpZXdwb3J0LmRzdFJlY3QueCwgLUBwYXJhbXMucG9zaXRpb24ueSArIHZpZXdwb3J0LmRzdFJlY3QueSwgZHVyYXRpb24sIGVhc2luZykgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obnVsbCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUm90YXRlU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRSb3RhdGVTY3JlZW46IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBncy5FYXNpbmdzLmZyb21PYmplY3QoQHBhcmFtcy5lYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmR1cmF0aW9uKVxuICAgICAgICBwYW4gPSBAaW50ZXJwcmV0ZXIuc2V0dGluZ3Muc2NyZWVuLnBhblxuXG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS52aWV3cG9ydC5hbmNob3IueCA9IDAuNVxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUudmlld3BvcnQuYW5jaG9yLnkgPSAwLjVcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuaW1hdG9yLnJvdGF0ZShAcGFyYW1zLmRpcmVjdGlvbiwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5zcGVlZCkgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdEZvckNvbXBsZXRpb24obnVsbCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZsYXNoU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZEZsYXNoU2NyZWVuOiAtPlxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LmFuaW1hdG9yLmZsYXNoKG5ldyBDb2xvcihAcGFyYW1zLmNvbG9yKSwgZHVyYXRpb24sIGdzLkVhc2luZ3MuRUFTRV9MSU5FQVJbMF0pXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBkdXJhdGlvbiAhPSAwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTY3JlZW5FZmZlY3RcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgXG4gICAgY29tbWFuZFNjcmVlbkVmZmVjdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBkdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbilcbiAgICAgICAgZWFzaW5nID0gZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KEBwYXJhbXMuZWFzaW5nKVxuICAgICAgICBcbiAgICAgICAgaWYgIWdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkKGZsYWdzLnpPcmRlcikgXG4gICAgICAgICAgICB6T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgek9yZGVyID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZXdwb3J0LnpJbmRleFxuICAgICAgICAgICAgXG4gICAgICAgIHZpZXdwb3J0ID0gc2NlbmUudmlld3BvcnRDb250YWluZXIuc3ViT2JqZWN0cy5maXJzdCAodikgLT4gdi56SW5kZXggPT0gek9yZGVyXG4gICAgICAgIFxuICAgICAgICBpZiAhdmlld3BvcnRcbiAgICAgICAgICAgIHZpZXdwb3J0ID0gbmV3IGdzLk9iamVjdF9WaWV3cG9ydCgpXG4gICAgICAgICAgICB2aWV3cG9ydC56SW5kZXggPSB6T3JkZXJcbiAgICAgICAgICAgIHNjZW5lLnZpZXdwb3J0Q29udGFpbmVyLmFkZE9iamVjdCh2aWV3cG9ydClcbiAgICAgICAgXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLnR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIFdvYmJsZVxuICAgICAgICAgICAgICAgIHZpZXdwb3J0LmFuaW1hdG9yLndvYmJsZVRvKEBwYXJhbXMud29iYmxlLnBvd2VyIC8gMTAwMDAsIEBwYXJhbXMud29iYmxlLnNwZWVkIC8gMTAwLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICAgICAgICAgIHdvYmJsZSA9IHZpZXdwb3J0LmVmZmVjdHMud29iYmxlXG4gICAgICAgICAgICAgICAgd29iYmxlLmVuYWJsZWQgPSBAcGFyYW1zLndvYmJsZS5wb3dlciA+IDBcbiAgICAgICAgICAgICAgICB3b2JibGUudmVydGljYWwgPSBAcGFyYW1zLndvYmJsZS5vcmllbnRhdGlvbiA9PSAwIG9yIEBwYXJhbXMud29iYmxlLm9yaWVudGF0aW9uID09IDJcbiAgICAgICAgICAgICAgICB3b2JibGUuaG9yaXpvbnRhbCA9IEBwYXJhbXMud29iYmxlLm9yaWVudGF0aW9uID09IDEgb3IgQHBhcmFtcy53b2JibGUub3JpZW50YXRpb24gPT0gMlxuICAgICAgICAgICAgd2hlbiAxICMgQmx1clxuICAgICAgICAgICAgICAgIHZpZXdwb3J0LmFuaW1hdG9yLmJsdXJUbyhAcGFyYW1zLmJsdXIucG93ZXIgLyAxMDAsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgdmlld3BvcnQuZWZmZWN0cy5ibHVyLmVuYWJsZWQgPSB5ZXNcbiAgICAgICAgICAgIHdoZW4gMiAjIFBpeGVsYXRlXG4gICAgICAgICAgICAgICAgdmlld3BvcnQuYW5pbWF0b3IucGl4ZWxhdGVUbyhAcGFyYW1zLnBpeGVsYXRlLnNpemUud2lkdGgsIEBwYXJhbXMucGl4ZWxhdGUuc2l6ZS5oZWlnaHQsIGR1cmF0aW9uLCBlYXNpbmcpXG4gICAgICAgICAgICAgICAgdmlld3BvcnQuZWZmZWN0cy5waXhlbGF0ZS5lbmFibGVkID0geWVzXG4gICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIGR1cmF0aW9uICE9IDBcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFZpZGVvRGVmYXVsdHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZFZpZGVvRGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudmlkZW9cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmFwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmFwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmFwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuZGlzYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZGlzYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gZGVmYXVsdHMuek9yZGVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImFwcGVhckVhc2luZy50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmFwcGVhckVhc2luZyA9IEBwYXJhbXMuYXBwZWFyRWFzaW5nXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImFwcGVhckFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvbiA9IEBwYXJhbXMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImRpc2FwcGVhckVhc2luZy50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckVhc2luZyA9IEBwYXJhbXMuZGlzYXBwZWFyRWFzaW5nXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcImRpc2FwcGVhckFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckFuaW1hdGlvbiA9IEBwYXJhbXMuZGlzYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFnc1tcIm1vdGlvbkJsdXIuZW5hYmxlZFwiXSkgdGhlbiBkZWZhdWx0cy5tb3Rpb25CbHVyID0gQHBhcmFtcy5tb3Rpb25CbHVyXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5vcmlnaW4pIHRoZW4gZGVmYXVsdHMub3JpZ2luID0gQHBhcmFtcy5vcmlnaW5cbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93VmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRTaG93VmlkZW86IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudmlkZW9cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VWaWRlb0RvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHZpZGVvcyA9IHNjZW5lLnZpZGVvc1xuICAgICAgICBpZiBub3QgdmlkZW9zW251bWJlcl0/IHRoZW4gdmlkZW9zW251bWJlcl0gPSBuZXcgZ3MuT2JqZWN0X1ZpZGVvKClcbiAgICAgICAgXG4gICAgICAgIHggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBvc2l0aW9uLngpXG4gICAgICAgIHkgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBvc2l0aW9uLnkpXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICBvcmlnaW4gPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIEBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpIGVsc2UgZGVmYXVsdHMuek9yZGVyXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIFxuICAgICAgICB2aWRlbyA9IHZpZGVvc1tudW1iZXJdXG4gICAgICAgIHZpZGVvLmRvbWFpbiA9IEBwYXJhbXMubnVtYmVyRG9tYWluXG4gICAgICAgIHZpZGVvLnZpZGVvID0gQHBhcmFtcy52aWRlbz8ubmFtZVxuICAgICAgICB2aWRlby5sb29wID0geWVzXG4gICAgICAgIHZpZGVvLmRzdFJlY3QueCA9IHhcbiAgICAgICAgdmlkZW8uZHN0UmVjdC55ID0geVxuICAgICAgICB2aWRlby5ibGVuZE1vZGUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJsZW5kTW9kZSlcbiAgICAgICAgdmlkZW8uYW5jaG9yLnggPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgdmlkZW8uYW5jaG9yLnkgPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgdmlkZW8uekluZGV4ID0gekluZGV4IHx8ICAoMTAwMCArIG51bWJlcilcbiAgICAgICAgaWYgQHBhcmFtcy52aWV3cG9ydD8udHlwZSA9PSBcInNjZW5lXCJcbiAgICAgICAgICAgIHZpZGVvLnZpZXdwb3J0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmJlaGF2aW9yLnZpZXdwb3J0XG4gICAgICAgIHZpZGVvLnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICBwID0gQGludGVycHJldGVyLnByZWRlZmluZWRPYmplY3RQb3NpdGlvbihAcGFyYW1zLnByZWRlZmluZWRQb3NpdGlvbklkLCB2aWRlbywgQHBhcmFtcylcbiAgICAgICAgICAgIHZpZGVvLmRzdFJlY3QueCA9IHAueFxuICAgICAgICAgICAgdmlkZW8uZHN0UmVjdC55ID0gcC55XG4gICAgICAgICAgICBcbiAgICAgICAgdmlkZW8uYW5pbWF0b3IuYXBwZWFyKHgsIHksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZVZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICBcbiAgICBjb21tYW5kTW92ZVZpZGVvOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VWaWRlb0RvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHZpZGVvID0gc2NlbmUudmlkZW9zW251bWJlcl1cbiAgICAgICAgaWYgbm90IHZpZGVvPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3QodmlkZW8sIEBwYXJhbXMucGljdHVyZS5wb3NpdGlvbiwgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZE1vdmVWaWRlb1BhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kTW92ZVZpZGVvUGF0aDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tb3ZlT2JqZWN0UGF0aCh2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJvdGF0ZVZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRSb3RhdGVWaWRlbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5yb3RhdGVPYmplY3QodmlkZW8sIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tVmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZFpvb21WaWRlbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci56b29tT2JqZWN0KHZpZGVvLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQmxlbmRWaWRlb1xuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRCbGVuZFZpZGVvOiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIHZpZGVvID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZGVvc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5ibGVuZE9iamVjdCh2aWRlbywgQHBhcmFtcykgXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kVGludFZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRUaW50VmlkZW86IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIudGludE9iamVjdCh2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEZsYXNoVmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEZsYXNoVmlkZW86IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuZmxhc2hPYmplY3QodmlkZW8sIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDcm9wVmlkZW9cbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENyb3BWaWRlbzogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5jcm9wT2JqZWN0KHZpZGVvLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRWaWRlb01vdGlvbkJsdXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRWaWRlb01vdGlvbkJsdXI6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIub2JqZWN0TW90aW9uQmx1cih2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWFza1ZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRNYXNrVmlkZW86IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubWFza09iamVjdCh2aWRlbywgQHBhcmFtcylcbiAgICAgICAgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFZpZGVvRWZmZWN0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRWaWRlb0VmZmVjdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB2aWRlbyA9IHNjZW5lLnZpZGVvc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB2aWRlbz8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RFZmZlY3QodmlkZW8sIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZVZpZGVvXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kRXJhc2VWaWRlbzogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy52aWRlb1xuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVZpZGVvRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdmlkZW8gPSBzY2VuZS52aWRlb3NbbnVtYmVyXVxuICAgICAgICBpZiBub3QgdmlkZW8/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvblxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBcbiAgICAgICAgdmlkZW8uYW5pbWF0b3IuZGlzYXBwZWFyKGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgKHNlbmRlcikgPT4gXG4gICAgICAgICAgICBzZW5kZXIuZGlzcG9zZSgpXG4gICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKHNlbmRlci5kb21haW4pXG4gICAgICAgICAgICBzY2VuZS52aWRlb3NbbnVtYmVyXSA9IG51bGxcbiAgICAgICAgICAjICBzZW5kZXIudmlkZW8ucGF1c2UoKVxuICAgICAgICApXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93SW1hZ2VNYXBcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIGNvbW1hbmRTaG93SW1hZ2VNYXA6IC0+XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBpbWFnZU1hcCA9IFNjZW5lTWFuYWdlci5zY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIGltYWdlTWFwP1xuICAgICAgICAgICAgaW1hZ2VNYXAuZGlzcG9zZSgpXG4gICAgICAgIGltYWdlTWFwID0gbmV3IGdzLk9iamVjdF9JbWFnZU1hcCgpXG4gICAgICAgIGltYWdlTWFwLnZpc3VhbC52YXJpYWJsZUNvbnRleHQgPSBAaW50ZXJwcmV0ZXIuY29udGV4dFxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUucGljdHVyZXNbbnVtYmVyXSA9IGltYWdlTWFwXG4gICAgICAgIGJpdG1hcCA9IFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9QaWN0dXJlcy8je0BwYXJhbXMuZ3JvdW5kPy5uYW1lfVwiKVxuICAgICAgICBcbiAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC53aWR0aCA9IGJpdG1hcC53aWR0aFxuICAgICAgICBpbWFnZU1hcC5kc3RSZWN0LmhlaWdodCA9IGJpdG1hcC5oZWlnaHRcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIGltYWdlTWFwLCBAcGFyYW1zKVxuICAgICAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC54ID0gcC54XG4gICAgICAgICAgICBpbWFnZU1hcC5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC54ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICAgICAgaW1hZ2VNYXAuZHN0UmVjdC55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi55KVxuICAgICAgICAgICAgXG4gICAgICAgIGltYWdlTWFwLmFuY2hvci54ID0gaWYgQHBhcmFtcy5vcmlnaW4gPT0gMSB0aGVuIDAuNSBlbHNlIDBcbiAgICAgICAgaW1hZ2VNYXAuYW5jaG9yLnkgPSBpZiBAcGFyYW1zLm9yaWdpbiA9PSAxIHRoZW4gMC41IGVsc2UgMFxuICAgICAgICBpbWFnZU1hcC56SW5kZXggPSBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKSBlbHNlIDQwMFxuICAgICAgICBpbWFnZU1hcC5ibGVuZE1vZGUgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuYmxlbmRNb2RlKSB0aGVuIEBwYXJhbXMuYmxlbmRNb2RlIGVsc2UgMFxuICAgICAgICBpbWFnZU1hcC5ob3RzcG90cyA9IEBwYXJhbXMuaG90c3BvdHNcbiAgICAgICAgaW1hZ2VNYXAuaW1hZ2VzID0gW1xuICAgICAgICAgICAgQHBhcmFtcy5ncm91bmQ/Lm5hbWUsXG4gICAgICAgICAgICBAcGFyYW1zLmhvdmVyPy5uYW1lLFxuICAgICAgICAgICAgQHBhcmFtcy51bnNlbGVjdGVkPy5uYW1lLFxuICAgICAgICAgICAgQHBhcmFtcy5zZWxlY3RlZD8ubmFtZSxcbiAgICAgICAgICAgIEBwYXJhbXMuc2VsZWN0ZWRIb3Zlcj8ubmFtZVxuICAgICAgICBdXG4gICAgICAgIFxuICAgICAgICBpbWFnZU1hcC5ldmVudHMub24gXCJqdW1wVG9cIiwgZ3MuQ2FsbEJhY2soXCJvbkp1bXBUb1wiLCBAaW50ZXJwcmV0ZXIpXG4gICAgICAgIGltYWdlTWFwLmV2ZW50cy5vbiBcImNhbGxDb21tb25FdmVudFwiLCBncy5DYWxsQmFjayhcIm9uQ2FsbENvbW1vbkV2ZW50XCIsIEBpbnRlcnByZXRlcilcbiAgICAgICAgXG4gICAgICAgIGltYWdlTWFwLnNldHVwKClcbiAgICAgICAgaW1hZ2VNYXAudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5zaG93T2JqZWN0KGltYWdlTWFwLCB7eDowLCB5OjB9LCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvblxuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gMFxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgXG4gICAgICAgIGltYWdlTWFwLmV2ZW50cy5vbiBcImZpbmlzaFwiLCAoc2VuZGVyKSA9PlxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IG5vXG4gICAgICAgICAgICMgQGludGVycHJldGVyLmVyYXNlT2JqZWN0KHNjZW5lLmltYWdlTWFwLCBAcGFyYW1zKVxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAgICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZUltYWdlTWFwXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgIFxuICAgIGNvbW1hbmRFcmFzZUltYWdlTWFwOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBpbWFnZU1hcCA9IHNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgaWYgbm90IGltYWdlTWFwPyB0aGVuIHJldHVyblxuIFxuICAgICAgICBpbWFnZU1hcC5ldmVudHMuZW1pdChcImZpbmlzaFwiLCBpbWFnZU1hcClcbiAgICAgICAgaW1hZ2VNYXAudmlzdWFsLmFjdGl2ZSA9IG5vXG4gICAgICAgIEBpbnRlcnByZXRlci5lcmFzZU9iamVjdChpbWFnZU1hcCwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEFkZEhvdHNwb3RcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kQWRkSG90c3BvdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIGhvdHNwb3RzID0gc2NlbmUuaG90c3BvdHNcbiAgICAgXG4gICAgICAgIGlmIG5vdCBob3RzcG90c1tudW1iZXJdP1xuICAgICAgICAgICAgaG90c3BvdHNbbnVtYmVyXSA9IG5ldyBncy5PYmplY3RfSG90c3BvdCgpXG4gICAgICAgICAgICBcbiAgICAgICAgaG90c3BvdCA9IGhvdHNwb3RzW251bWJlcl1cbiAgICAgICAgaG90c3BvdC5kb21haW4gPSBAcGFyYW1zLm51bWJlckRvbWFpblxuICAgICAgICBcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMucG9zaXRpb25UeXBlXG4gICAgICAgICAgICB3aGVuIDAgIyBEaXJlY3RcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3QueCA9IEBwYXJhbXMuYm94LnhcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3QueSA9IEBwYXJhbXMuYm94LnlcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3Qud2lkdGggPSBAcGFyYW1zLmJveC5zaXplLndpZHRoXG4gICAgICAgICAgICAgICAgaG90c3BvdC5kc3RSZWN0LmhlaWdodCA9IEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0XG4gICAgICAgICAgICB3aGVuIDEgIyBDYWxjdWxhdGVkXG4gICAgICAgICAgICAgICAgaG90c3BvdC5kc3RSZWN0LnggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJveC54KVxuICAgICAgICAgICAgICAgIGhvdHNwb3QuZHN0UmVjdC55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5ib3gueSlcbiAgICAgICAgICAgICAgICBob3RzcG90LmRzdFJlY3Qud2lkdGggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJveC5zaXplLndpZHRoKVxuICAgICAgICAgICAgICAgIGhvdHNwb3QuZHN0UmVjdC5oZWlnaHQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmJveC5zaXplLmhlaWdodClcbiAgICAgICAgICAgIHdoZW4gMiAjIEJpbmQgdG8gUGljdHVyZVxuICAgICAgICAgICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnBpY3R1cmVOdW1iZXIpXVxuICAgICAgICAgICAgICAgIGlmIHBpY3R1cmU/XG4gICAgICAgICAgICAgICAgICAgIGhvdHNwb3QudGFyZ2V0ID0gcGljdHVyZVxuICAgICAgICAgICAgd2hlbiAzICMgQmluZCB0byBUZXh0XG4gICAgICAgICAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGV4dE51bWJlcildXG4gICAgICAgICAgICAgICAgaWYgdGV4dD9cbiAgICAgICAgICAgICAgICAgICAgaG90c3BvdC50YXJnZXQgPSB0ZXh0XG4gICAgICAgIFxuICAgICAgICBob3RzcG90LmJlaGF2aW9yLnNoYXBlID0gQHBhcmFtcy5zaGFwZSA/IGdzLkhvdHNwb3RTaGFwZS5SRUNUQU5HTEUgXG4gICAgICAgIFxuICAgICAgICBpZiB0ZXh0P1xuICAgICAgICAgICAgaG90c3BvdC5pbWFnZXMgPSBudWxsXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIGhvdHNwb3QuaW1hZ2VzID0gW1xuICAgICAgICAgICAgICAgIEBwYXJhbXMuYmFzZUdyYXBoaWM/Lm5hbWUgfHwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5iYXNlR3JhcGhpYykgfHwgcGljdHVyZT8uaW1hZ2UsXG4gICAgICAgICAgICAgICAgQHBhcmFtcy5ob3ZlckdyYXBoaWM/Lm5hbWUgfHwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5ob3ZlckdyYXBoaWMpLFxuICAgICAgICAgICAgICAgIEBwYXJhbXMuc2VsZWN0ZWRHcmFwaGljPy5uYW1lIHx8IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc2VsZWN0ZWRHcmFwaGljKSxcbiAgICAgICAgICAgICAgICBAcGFyYW1zLnNlbGVjdGVkSG92ZXJHcmFwaGljPy5uYW1lIHx8IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuc2VsZWN0ZWRIb3ZlckdyYXBoaWMpLFxuICAgICAgICAgICAgICAgIEBwYXJhbXMudW5zZWxlY3RlZEdyYXBoaWM/Lm5hbWUgfHwgQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy51bnNlbGVjdGVkR3JhcGhpYylcbiAgICAgICAgICAgIF1cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25DbGljay50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uQ2xpY2subGFiZWwgICAgICAgIFxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJjbGlja1wiLCBncy5DYWxsQmFjayhcIm9uSG90c3BvdENsaWNrXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uQ2xpY2suYmluZFZhbHVlKSB9KVxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25FbnRlci50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uRW50ZXIubGFiZWwgICAgICAgIFxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJlbnRlclwiLCBncy5DYWxsQmFjayhcIm9uSG90c3BvdEVudGVyXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRW50ZXIuYmluZFZhbHVlKSB9KVxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25MZWF2ZS50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uTGVhdmUubGFiZWwgICAgICAgIFxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJsZWF2ZVwiLCBncy5DYWxsQmFjayhcIm9uSG90c3BvdExlYXZlXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uTGVhdmUuYmluZFZhbHVlKSB9KVxuICAgICAgICBpZiBAcGFyYW1zLmFjdGlvbnMub25EcmFnLnR5cGUgIT0gMCBvciBAcGFyYW1zLmFjdGlvbnMub25EcmFnLmxhYmVsICAgICAgICBcbiAgICAgICAgICAgIGhvdHNwb3QuZXZlbnRzLm9uIFwiZHJhZ1N0YXJ0XCIsIGdzLkNhbGxCYWNrKFwib25Ib3RzcG90RHJhZ1N0YXJ0XCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRHJhZy5iaW5kVmFsdWUpIH0pXG4gICAgICAgICAgICBob3RzcG90LmV2ZW50cy5vbiBcImRyYWdcIiwgZ3MuQ2FsbEJhY2soXCJvbkhvdHNwb3REcmFnXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRHJhZy5iaW5kVmFsdWUpIH0pXG4gICAgICAgICAgICBob3RzcG90LmV2ZW50cy5vbiBcImRyYWdFbmRcIiwgZ3MuQ2FsbEJhY2soXCJvbkhvdHNwb3REcmFnRW5kXCIsIEBpbnRlcnByZXRlciwgeyBwYXJhbXM6IEBwYXJhbXMsIGJpbmRWYWx1ZTogQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5hY3Rpb25zLm9uRHJhZy5iaW5kVmFsdWUpIH0pXG4gICAgICAgIGlmIEBwYXJhbXMuYWN0aW9ucy5vblNlbGVjdC50eXBlICE9IDAgb3IgQHBhcmFtcy5hY3Rpb25zLm9uU2VsZWN0LmxhYmVsIG9yXG4gICAgICAgICAgIEBwYXJhbXMuYWN0aW9ucy5vbkRlc2VsZWN0LnR5cGUgIT0gMCBvciBAcGFyYW1zLmFjdGlvbnMub25EZXNlbGVjdC5sYWJlbCAgICBcbiAgICAgICAgICAgIGhvdHNwb3QuZXZlbnRzLm9uIFwic3RhdGVDaGFuZ2VkXCIsIGdzLkNhbGxCYWNrKFwib25Ib3RzcG90U3RhdGVDaGFuZ2VkXCIsIEBpbnRlcnByZXRlciwgQHBhcmFtcylcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgaG90c3BvdC5zZWxlY3RhYmxlID0geWVzXG4gICAgICAgIGhvdHNwb3Quc2V0dXAoKVxuXG4gICAgICAgIGlmIEBwYXJhbXMuZHJhZ2dpbmcuZW5hYmxlZFxuICAgICAgICAgICAgZHJhZ2dpbmcgPSBAcGFyYW1zLmRyYWdnaW5nXG4gICAgICAgICAgICBob3RzcG90LmRyYWdnYWJsZSA9IHsgXG4gICAgICAgICAgICAgICAgcmVjdDogbmV3IFJlY3QoZHJhZ2dpbmcucmVjdC54LCBkcmFnZ2luZy5yZWN0LnksIGRyYWdnaW5nLnJlY3Quc2l6ZS53aWR0aCwgZHJhZ2dpbmcucmVjdC5zaXplLmhlaWdodCksIFxuICAgICAgICAgICAgICAgIGF4aXNYOiBkcmFnZ2luZy5ob3Jpem9udGFsLCBcbiAgICAgICAgICAgICAgICBheGlzWTogZHJhZ2dpbmcudmVydGljYWwgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBob3RzcG90LmFkZENvbXBvbmVudChuZXcgdWkuQ29tcG9uZW50X0RyYWdnYWJsZSgpKVxuICAgICAgICAgICAgaG90c3BvdC5ldmVudHMub24gXCJkcmFnXCIsIChlKSA9PiBcbiAgICAgICAgICAgICAgICBkcmFnID0gZS5zZW5kZXIuZHJhZ2dhYmxlXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIudmFyaWFibGVTdG9yZS5zZXR1cFRlbXBWYXJpYWJsZXMoQGludGVycHJldGVyLmNvbnRleHQpXG4gICAgICAgICAgICAgICAgaWYgQHBhcmFtcy5kcmFnZ2luZy5ob3Jpem9udGFsXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMuZHJhZ2dpbmcudmFyaWFibGUsIE1hdGgucm91bmQoKGUuc2VuZGVyLmRzdFJlY3QueC1kcmFnLnJlY3QueCkgLyAoZHJhZy5yZWN0LndpZHRoLWUuc2VuZGVyLmRzdFJlY3Qud2lkdGgpICogMTAwKSlcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMuZHJhZ2dpbmcudmFyaWFibGUsIE1hdGgucm91bmQoKGUuc2VuZGVyLmRzdFJlY3QueS1kcmFnLnJlY3QueSkgLyAoZHJhZy5yZWN0LmhlaWdodC1lLnNlbmRlci5kc3RSZWN0LmhlaWdodCkgKiAxMDApKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZUhvdHNwb3RTdGF0ZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRDaGFuZ2VIb3RzcG90U3RhdGU6IC0+XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIGhvdHNwb3QgPSBzY2VuZS5ob3RzcG90c1tudW1iZXJdXG4gICAgICAgIHJldHVybiBpZiAhaG90c3BvdFxuICAgICAgICBcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNlbGVjdGVkKSB0aGVuIGhvdHNwb3QuYmVoYXZpb3Iuc2VsZWN0ZWQgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zZWxlY3RlZClcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmVuYWJsZWQpIHRoZW4gaG90c3BvdC5iZWhhdmlvci5lbmFibGVkID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuZW5hYmxlZClcbiAgICAgICAgXG4gICAgICAgIGhvdHNwb3QuYmVoYXZpb3IudXBkYXRlSW5wdXQoKVxuICAgICAgICBob3RzcG90LmJlaGF2aW9yLnVwZGF0ZUltYWdlKClcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kRXJhc2VIb3RzcG90XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZEVyYXNlSG90c3BvdDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlSG90c3BvdERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIFxuICAgICAgICBpZiBzY2VuZS5ob3RzcG90c1tudW1iZXJdP1xuICAgICAgICAgICAgc2NlbmUuaG90c3BvdHNbbnVtYmVyXS5kaXNwb3NlKClcbiAgICAgICAgICAgIHNjZW5lLmhvdHNwb3RDb250YWluZXIuZXJhc2VPYmplY3QobnVtYmVyKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZU9iamVjdERvbWFpblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kQ2hhbmdlT2JqZWN0RG9tYWluOiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuY2hhbmdlT2JqZWN0RG9tYWluKEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuZG9tYWluKSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUGljdHVyZURlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgXG4gICAgY29tbWFuZFBpY3R1cmVEZWZhdWx0czogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5waWN0dXJlXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5hcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5hcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmRpc2FwcGVhckR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLmRpc2FwcGVhckR1cmF0aW9uID0gQGludGVycHJldGVyLmR1cmF0aW9uVmFsdWVPZihAcGFyYW1zLmRpc2FwcGVhckR1cmF0aW9uKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muek9yZGVyKSB0aGVuIGRlZmF1bHRzLnpPcmRlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuek9yZGVyKVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmFwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmFwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJFYXNpbmcudHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJFYXNpbmcgPSBAcGFyYW1zLmRpc2FwcGVhckVhc2luZ1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJkaXNhcHBlYXJBbmltYXRpb24udHlwZVwiXSkgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb24gPSBAcGFyYW1zLmRpc2FwcGVhckFuaW1hdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJtb3Rpb25CbHVyLmVuYWJsZWRcIl0pIHRoZW4gZGVmYXVsdHMubW90aW9uQmx1ciA9IEBwYXJhbXMubW90aW9uQmx1clxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIGRlZmF1bHRzLm9yaWdpbiA9IEBwYXJhbXMub3JpZ2luXG4gICAgXG4gICAgXG4gICAgY3JlYXRlUGljdHVyZTogKGdyYXBoaWMsIHBhcmFtcykgLT5cbiAgICAgICAgZ3JhcGhpYyA9IEBzdHJpbmdWYWx1ZU9mKGdyYXBoaWMpXG4gICAgICAgIGdyYXBoaWNOYW1lID0gaWYgZ3JhcGhpYz8ubmFtZT8gdGhlbiBncmFwaGljLm5hbWUgZWxzZSBncmFwaGljXG4gICAgICAgIGJpdG1hcCA9IFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9QaWN0dXJlcy8je2dyYXBoaWNOYW1lfVwiKVxuICAgICAgICByZXR1cm4gbnVsbCBpZiBiaXRtYXAgJiYgIWJpdG1hcC5sb2FkZWRcbiAgICAgICAgXG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMucGljdHVyZVxuICAgICAgICBmbGFncyA9IHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgbnVtYmVyID0gQG51bWJlclZhbHVlT2YocGFyYW1zLm51bWJlcilcbiAgICAgICAgcGljdHVyZXMgPSBzY2VuZS5waWN0dXJlc1xuICAgICAgICBpZiBub3QgcGljdHVyZXNbbnVtYmVyXT9cbiAgICAgICAgICAgIHBpY3R1cmUgPSBuZXcgZ3MuT2JqZWN0X1BpY3R1cmUobnVsbCwgbnVsbCwgcGFyYW1zLnZpc3VhbD8udHlwZSlcbiAgICAgICAgICAgIHBpY3R1cmUuZG9tYWluID0gcGFyYW1zLm51bWJlckRvbWFpblxuICAgICAgICAgICAgcGljdHVyZXNbbnVtYmVyXSA9IHBpY3R1cmVcbiAgICAgICAgICAgIHN3aXRjaCBwYXJhbXMudmlzdWFsPy50eXBlXG4gICAgICAgICAgICAgICAgd2hlbiAxXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUudmlzdWFsLmxvb3BpbmcudmVydGljYWwgPSB5ZXNcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS52aXN1YWwubG9vcGluZy5ob3Jpem9udGFsID0geWVzXG4gICAgICAgICAgICAgICAgd2hlbiAyXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZnJhbWVUaGlja25lc3MgPSBwYXJhbXMudmlzdWFsLmZyYW1lLnRoaWNrbmVzc1xuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLmZyYW1lQ29ybmVyU2l6ZSA9IHBhcmFtcy52aXN1YWwuZnJhbWUuY29ybmVyU2l6ZVxuICAgICAgICAgICAgICAgIHdoZW4gM1xuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLnZpc3VhbC5vcmllbnRhdGlvbiA9IHBhcmFtcy52aXN1YWwudGhyZWVQYXJ0SW1hZ2Uub3JpZW50YXRpb25cbiAgICAgICAgICAgICAgICB3aGVuIDRcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5jb2xvciA9IGdzLkNvbG9yLmZyb21PYmplY3QocGFyYW1zLnZpc3VhbC5xdWFkLmNvbG9yKVxuICAgICAgICAgICAgICAgIHdoZW4gNVxuICAgICAgICAgICAgICAgICAgICBzbmFwc2hvdCA9IEdyYXBoaWNzLnNuYXBzaG90KClcbiAgICAgICAgICAgICAgICAgICAgI1Jlc291cmNlTWFuYWdlci5hZGRDdXN0b21CaXRtYXAoc25hcHNob3QpXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuYml0bWFwID0gc25hcHNob3RcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LndpZHRoID0gc25hcHNob3Qud2lkdGhcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LmhlaWdodCA9IHNuYXBzaG90LmhlaWdodFxuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLnNyY1JlY3Quc2V0KDAsIDAsIHNuYXBzaG90LndpZHRoLCBzbmFwc2hvdC5oZWlnaHQpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgXG4gICAgICAgIHggPSBAbnVtYmVyVmFsdWVPZihwYXJhbXMucG9zaXRpb24ueClcbiAgICAgICAgeSA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5wb3NpdGlvbi55KVxuICAgICAgICBwaWN0dXJlID0gcGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBcbiAgICAgICAgaWYgIXBpY3R1cmUuYml0bWFwXG4gICAgICAgICAgICBwaWN0dXJlLmltYWdlID0gZ3JhcGhpY05hbWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcGljdHVyZS5pbWFnZSA9IG51bGxcbiAgICBcbiAgICAgICAgYml0bWFwID0gcGljdHVyZS5iaXRtYXAgPyBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvUGljdHVyZXMvI3tncmFwaGljTmFtZX1cIilcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5lYXNpbmcudHlwZSksIHBhcmFtcy5lYXNpbmcuaW5PdXQpIGVsc2UgZ3MuRWFzaW5ncy5mcm9tT2JqZWN0KGRlZmF1bHRzLmFwcGVhckVhc2luZylcbiAgICAgICAgZHVyYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3MuZHVyYXRpb24pIHRoZW4gQGR1cmF0aW9uVmFsdWVPZihwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuYXBwZWFyRHVyYXRpb25cbiAgICAgICAgb3JpZ2luID0gaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQG51bWJlclZhbHVlT2YocGFyYW1zLnpPcmRlcikgZWxzZSBkZWZhdWx0cy56T3JkZXJcbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgIFxuICAgICAgICBwaWN0dXJlLm1pcnJvciA9IHBhcmFtcy5wb3NpdGlvbi5ob3Jpem9udGFsRmxpcFxuICAgICAgICBwaWN0dXJlLmFuZ2xlID0gcGFyYW1zLnBvc2l0aW9uLmFuZ2xlIHx8IDBcbiAgICAgICAgcGljdHVyZS56b29tLnggPSAocGFyYW1zLnBvc2l0aW9uLmRhdGE/Lnpvb218fDEpXG4gICAgICAgIHBpY3R1cmUuem9vbS55ID0gKHBhcmFtcy5wb3NpdGlvbi5kYXRhPy56b29tfHwxKVxuICAgICAgICBwaWN0dXJlLmJsZW5kTW9kZSA9IEBudW1iZXJWYWx1ZU9mKHBhcmFtcy5ibGVuZE1vZGUpXG4gICAgICAgIFxuICAgICAgICBpZiBwYXJhbXMub3JpZ2luID09IDEgYW5kIGJpdG1hcD9cbiAgICAgICAgICAgIHggKz0gKGJpdG1hcC53aWR0aCpwaWN0dXJlLnpvb20ueC1iaXRtYXAud2lkdGgpLzJcbiAgICAgICAgICAgIHkgKz0gKGJpdG1hcC5oZWlnaHQqcGljdHVyZS56b29tLnktYml0bWFwLmhlaWdodCkvMlxuICAgICAgICAgICAgXG4gICAgICAgIHBpY3R1cmUuZHN0UmVjdC54ID0geFxuICAgICAgICBwaWN0dXJlLmRzdFJlY3QueSA9IHlcbiAgICAgICAgcGljdHVyZS5hbmNob3IueCA9IGlmIG9yaWdpbiA9PSAxIHRoZW4gMC41IGVsc2UgMFxuICAgICAgICBwaWN0dXJlLmFuY2hvci55ID0gaWYgb3JpZ2luID09IDEgdGhlbiAwLjUgZWxzZSAwXG4gICAgICAgIHBpY3R1cmUuekluZGV4ID0gekluZGV4IHx8ICAoNzAwICsgbnVtYmVyKVxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLnZpZXdwb3J0Py50eXBlID09IFwic2NlbmVcIlxuICAgICAgICAgICAgcGljdHVyZS52aWV3cG9ydCA9IFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci52aWV3cG9ydFxuICAgICAgICBcbiAgICAgICAgaWYgcGFyYW1zLnNpemU/LnR5cGUgPT0gMVxuICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LndpZHRoID0gcGFyYW1zLnNpemUud2lkdGhcbiAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC5oZWlnaHQgPSBwYXJhbXMuc2l6ZS5oZWlnaHRcbiAgICAgICAgICAgIFxuICAgICAgICBwaWN0dXJlLnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcGljdHVyZVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNob3dQaWN0dXJlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRTaG93UGljdHVyZTogLT4gXG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMucGljdHVyZVxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIHBpY3R1cmUgPSBAaW50ZXJwcmV0ZXIuY3JlYXRlUGljdHVyZShAcGFyYW1zLmdyYXBoaWMsIEBwYXJhbXMpXG4gICAgICAgIGlmICFwaWN0dXJlXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlci0tXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSAxXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMucG9zaXRpb25UeXBlID09IDBcbiAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgICAgICBwaWN0dXJlLmRzdFJlY3QueCA9IHAueFxuICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LnkgPSBwLnlcbiAgICAgICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICBhbmltYXRpb24gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJhbmltYXRpb24udHlwZVwiXSkgdGhlbiBAcGFyYW1zLmFuaW1hdGlvbiBlbHNlIGRlZmF1bHRzLmFwcGVhckFuaW1hdGlvblxuICAgIFxuICAgICAgICBwaWN0dXJlLmFuaW1hdG9yLmFwcGVhcihwaWN0dXJlLmRzdFJlY3QueCwgcGljdHVyZS5kc3RSZWN0LnksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICAgICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRQbGF5UGljdHVyZUFuaW1hdGlvblxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUGxheVBpY3R1cmVBbmltYXRpb246IC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIFxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLnBpY3R1cmVcbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBwaWN0dXJlID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuYXBwZWFyRHVyYXRpb25cbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5hcHBlYXJBbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMuYW5pbWF0aW9uSWQ/XG4gICAgICAgICAgICByZWNvcmQgPSBSZWNvcmRNYW5hZ2VyLmFuaW1hdGlvbnNbQHBhcmFtcy5hbmltYXRpb25JZF1cbiAgICAgICAgICAgIGlmIHJlY29yZD9cbiAgICAgICAgICAgICAgICBwaWN0dXJlID0gQGludGVycHJldGVyLmNyZWF0ZVBpY3R1cmUocmVjb3JkLmdyYXBoaWMsIEBwYXJhbXMpXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgY29tcG9uZW50ID0gcGljdHVyZS5maW5kQ29tcG9uZW50KFwiQ29tcG9uZW50X0ZyYW1lQW5pbWF0aW9uXCIpXG4gICAgICAgICAgICAgICAgaWYgY29tcG9uZW50P1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQucmVmcmVzaChyZWNvcmQpXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5zdGFydCgpXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQgPSBuZXcgZ3MuQ29tcG9uZW50X0ZyYW1lQW5pbWF0aW9uKHJlY29yZClcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5hZGRDb21wb25lbnQoY29tcG9uZW50KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBjb21wb25lbnQudXBkYXRlKClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiBAcGFyYW1zLnBvc2l0aW9uVHlwZSA9PSAwXG4gICAgICAgICAgICAgICAgICAgIHAgPSBAaW50ZXJwcmV0ZXIucHJlZGVmaW5lZE9iamVjdFBvc2l0aW9uKEBwYXJhbXMucHJlZGVmaW5lZFBvc2l0aW9uSWQsIHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC54ID0gcC54XG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC55ID0gcC55XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHBpY3R1cmUuYW5pbWF0b3IuYXBwZWFyKHBpY3R1cmUuZHN0UmVjdC54LCBwaWN0dXJlLmRzdFJlY3QueSwgYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBwaWN0dXJlID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIGFuaW1hdGlvbiA9IHBpY3R1cmU/LmZpbmRDb21wb25lbnQoXCJDb21wb25lbnRfRnJhbWVBbmltYXRpb25cIilcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgYW5pbWF0aW9uP1xuICAgICAgICAgICAgICAgIHBpY3R1cmUucmVtb3ZlQ29tcG9uZW50KGFuaW1hdGlvbilcbiAgICAgICAgICAgICAgICBiaXRtYXAgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiR3JhcGhpY3MvQW5pbWF0aW9ucy8je3BpY3R1cmUuaW1hZ2V9XCIpXG4gICAgICAgICAgICAgICAgaWYgYml0bWFwP1xuICAgICAgICAgICAgICAgICAgICBwaWN0dXJlLnNyY1JlY3Quc2V0KDAsIDAsIGJpdG1hcC53aWR0aCwgYml0bWFwLmhlaWdodClcbiAgICAgICAgICAgICAgICAgICAgcGljdHVyZS5kc3RSZWN0LndpZHRoID0gcGljdHVyZS5zcmNSZWN0LndpZHRoXG4gICAgICAgICAgICAgICAgICAgIHBpY3R1cmUuZHN0UmVjdC5oZWlnaHQgPSBwaWN0dXJlLnNyY1JlY3QuaGVpZ2h0XG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLndhaXRGb3JDb21wbGV0aW9uIGFuZCBub3QgKGR1cmF0aW9uID09IDAgb3IgQGludGVycHJldGVyLmlzSW5zdGFudFNraXAoKSlcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNb3ZlUGljdHVyZVBhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kTW92ZVBpY3R1cmVQYXRoOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgcGljdHVyZSA9IHNjZW5lLnBpY3R1cmVzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHBpY3R1cmU/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubW92ZU9iamVjdFBhdGgocGljdHVyZSwgQHBhcmFtcy5wYXRoLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZVBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRNb3ZlUGljdHVyZTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3QocGljdHVyZSwgQHBhcmFtcy5waWN0dXJlLnBvc2l0aW9uLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgXG5cbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRUaW50UGljdHVyZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgY29tbWFuZFRpbnRQaWN0dXJlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci50aW50T2JqZWN0KHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRGbGFzaFBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZEZsYXNoUGljdHVyZTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbiB8fCBcIlwiKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgcGljdHVyZSA9IHNjZW5lLnBpY3R1cmVzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHBpY3R1cmU/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuZmxhc2hPYmplY3QocGljdHVyZSwgQHBhcmFtcylcbiAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ3JvcFBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kQ3JvcFBpY3R1cmU6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmNyb3BPYmplY3QocGljdHVyZSwgQHBhcmFtcylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUm90YXRlUGljdHVyZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgXG4gICAgY29tbWFuZFJvdGF0ZVBpY3R1cmU6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnJvdGF0ZU9iamVjdChwaWN0dXJlLCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kWm9vbVBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICBjb21tYW5kWm9vbVBpY3R1cmU6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnpvb21PYmplY3QocGljdHVyZSwgQHBhcmFtcylcblxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRCbGVuZFBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kQmxlbmRQaWN0dXJlOiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbiB8fCBcIlwiKVxuICAgICAgICBwaWN0dXJlID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgaWYgbm90IHBpY3R1cmU/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuYmxlbmRPYmplY3QocGljdHVyZSwgQHBhcmFtcykgXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaGFrZVBpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kU2hha2VQaWN0dXJlOiAtPiBcbiAgICAgICAgcGljdHVyZSA9IFNjZW5lTWFuYWdlci5zY2VuZS5waWN0dXJlc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLnNoYWtlT2JqZWN0KHBpY3R1cmUsIEBwYXJhbXMpICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTWFza1BpY3R1cmVcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1hc2tQaWN0dXJlOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5tYXNrT2JqZWN0KHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFBpY3R1cmVNb3Rpb25CbHVyXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgY29tbWFuZFBpY3R1cmVNb3Rpb25CbHVyOiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RNb3Rpb25CbHVyKHBpY3R1cmUsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRQaWN0dXJlRWZmZWN0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRQaWN0dXJlRWZmZWN0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluIHx8IFwiXCIpXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICBwaWN0dXJlID0gc2NlbmUucGljdHVyZXNbbnVtYmVyXVxuICAgICAgICBpZiBub3QgcGljdHVyZT8gdGhlbiByZXR1cm5cbiAgICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci5vYmplY3RFZmZlY3QocGljdHVyZSwgQHBhcmFtcylcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kRXJhc2VQaWN0dXJlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjXG4gICAgY29tbWFuZEVyYXNlUGljdHVyZTogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5waWN0dXJlXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4gfHwgXCJcIilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHBpY3R1cmUgPSBzY2VuZS5waWN0dXJlc1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCBwaWN0dXJlPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb25cbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIHBpY3R1cmUuYW5pbWF0b3IuZGlzYXBwZWFyKGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiwgXG4gICAgICAgICAgICAoc2VuZGVyKSA9PiBcbiAgICAgICAgICAgICAgICBzZW5kZXIuZGlzcG9zZSgpXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlUGljdHVyZURvbWFpbihzZW5kZXIuZG9tYWluKVxuICAgICAgICAgICAgICAgIHNjZW5lLnBpY3R1cmVzW251bWJlcl0gPSBudWxsXG4gICAgICAgIClcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb24gXG4gICAgICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRJbnB1dE51bWJlclxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRJbnB1dE51bWJlcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICBpZiBAaW50ZXJwcmV0ZXIuaXNQcm9jZXNzaW5nTWVzc2FnZUluT3RoZXJDb250ZXh0KClcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Rm9yTWVzc2FnZSgpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIFxuICAgICAgICBpZiAoR2FtZU1hbmFnZXIuc2V0dGluZ3MuYWxsb3dDaG9pY2VTa2lwfHxAaW50ZXJwcmV0ZXIucHJldmlldykgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5tZXNzYWdlT2JqZWN0KCkuYmVoYXZpb3IuY2xlYXIoKVxuICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy52YXJpYWJsZSwgMClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICAgICAgXG4gICAgICAgICR0ZW1wRmllbGRzLmRpZ2l0cyA9IEBwYXJhbXMuZGlnaXRzXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLnNob3dJbnB1dE51bWJlcihAcGFyYW1zLmRpZ2l0cywgZ3MuQ2FsbEJhY2soXCJvbklucHV0TnVtYmVyRmluaXNoXCIsIEBpbnRlcnByZXRlciwgQHBhcmFtcykpXG4gICAgICAgXG4gICAgICAgIEBpbnRlcnByZXRlci53YWl0aW5nRm9yLmlucHV0TnVtYmVyID0gQHBhcmFtc1xuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaG9pY2VUaW1lclxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRDaG9pY2VUaW1lcjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgXG4gICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlVGltZXIgPSBzY2VuZS5jaG9pY2VUaW1lclxuICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZVRpbWVyVmlzaWJsZSA9IEBwYXJhbXMudmlzaWJsZVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmVuYWJsZWRcbiAgICAgICAgICAgIHNjZW5lLmNob2ljZVRpbWVyLmJlaGF2aW9yLnNlY29uZHMgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNlY29uZHMpXG4gICAgICAgICAgICBzY2VuZS5jaG9pY2VUaW1lci5iZWhhdmlvci5taW51dGVzID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5taW51dGVzKVxuICAgICAgICAgICAgc2NlbmUuY2hvaWNlVGltZXIuYmVoYXZpb3Iuc3RhcnQoKVxuICAgICAgICAgICAgc2NlbmUuY2hvaWNlVGltZXIuZXZlbnRzLm9uIFwiZmluaXNoXCIsIChzZW5kZXIpID0+XG4gICAgICAgICAgICAgICAgaWYgIHNjZW5lLmNob2ljZVdpbmRvdyBhbmQgR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzPy5sZW5ndGggPiAwICAgIFxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0Q2hvaWNlID0gKEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlcy5maXJzdCAoYykgLT4gYy5pc0RlZmF1bHQpIHx8IEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlc1swXVxuICAgICAgICAgICAgICAgICAgICAjc2NlbmUuY2hvaWNlV2luZG93LmV2ZW50cy5lbWl0KFwic2VsZWN0aW9uQWNjZXB0XCIsIHNjZW5lLmNob2ljZVdpbmRvdywgeyBsYWJlbEluZGV4OiBkZWZhdWx0Q2hvaWNlLmFjdGlvbi5sYWJlbEluZGV4IH0pXG4gICAgICAgICAgICAgICAgICAgIHNjZW5lLmNob2ljZVdpbmRvdy5ldmVudHMuZW1pdChcInNlbGVjdGlvbkFjY2VwdFwiLCBzY2VuZS5jaG9pY2VXaW5kb3csIGRlZmF1bHRDaG9pY2UpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHNjZW5lLmNob2ljZVRpbWVyLnN0b3AoKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93Q2hvaWNlc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRTaG93Q2hvaWNlczogLT4gIFxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBwb2ludGVyID0gQGludGVycHJldGVyLnBvaW50ZXJcbiAgICAgICAgY2hvaWNlcyA9IEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuY2hvaWNlcyB8fCBbXVxuICAgICAgICBcbiAgICAgICAgaWYgKEdhbWVNYW5hZ2VyLnNldHRpbmdzLmFsbG93Q2hvaWNlU2tpcHx8QGludGVycHJldGVyLnByZXZpZXdEYXRhKSBhbmQgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QgPSBAaW50ZXJwcmV0ZXIubWVzc2FnZU9iamVjdCgpXG4gICAgICAgICAgICBpZiBtZXNzYWdlT2JqZWN0Py52aXNpYmxlXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5iZWhhdmlvci5jbGVhcigpXG4gICAgICAgICAgICBkZWZhdWx0Q2hvaWNlID0gKGNob2ljZXMuZmlyc3QoKGMpIC0+IGMuaXNEZWZhdWx0KSkgfHwgY2hvaWNlc1swXSAgICBcbiAgICAgICAgICAgIGlmIGRlZmF1bHRDaG9pY2UuYWN0aW9uLmxhYmVsSW5kZXg/XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnBvaW50ZXIgPSBkZWZhdWx0Q2hvaWNlLmFjdGlvbi5sYWJlbEluZGV4XG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLmp1bXBUb0xhYmVsKGRlZmF1bHRDaG9pY2UuYWN0aW9uLmxhYmVsKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBpZiBjaG9pY2VzLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3Iuc2hvd0Nob2ljZXMoY2hvaWNlcywgZ3MuQ2FsbEJhY2soXCJvbkNob2ljZUFjY2VwdFwiLCBAaW50ZXJwcmV0ZXIsIHsgcG9pbnRlcjogcG9pbnRlciwgcGFyYW1zOiBAcGFyYW1zIH0pKVxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTaG93Q2hvaWNlXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICBcbiAgICBjb21tYW5kU2hvd0Nob2ljZTogLT4gXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGNvbW1hbmRzID0gQGludGVycHJldGVyLm9iamVjdC5jb21tYW5kc1xuICAgICAgICBjb21tYW5kID0gbnVsbFxuICAgICAgICBpbmRleCA9IDBcbiAgICAgICAgcG9pbnRlciA9IEBpbnRlcnByZXRlci5wb2ludGVyXG4gICAgICAgIGNob2ljZXMgPSBudWxsXG4gICAgICAgIGRzdFJlY3QgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5wb3NpdGlvblR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIEF1dG9cbiAgICAgICAgICAgICAgICBkc3RSZWN0ID0gbnVsbFxuICAgICAgICAgICAgd2hlbiAxICMgRGlyZWN0XG4gICAgICAgICAgICAgICAgZHN0UmVjdCA9IG5ldyBSZWN0KEBwYXJhbXMuYm94LngsIEBwYXJhbXMuYm94LnksIEBwYXJhbXMuYm94LnNpemUud2lkdGgsIEBwYXJhbXMuYm94LnNpemUuaGVpZ2h0KVxuICAgICAgICAgICAgICAgIFxuICAgICAgICBpZiAhR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzXG4gICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZXMgPSBbXVxuICAgICAgICBjaG9pY2VzID0gR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5jaG9pY2VzXG4gICAgICAgIGNob2ljZXMucHVzaCh7IFxuICAgICAgICAgICAgZHN0UmVjdDogZHN0UmVjdCwgXG4gICAgICAgICAgICAjdGV4dDogbGNzKEBwYXJhbXMudGV4dCksIFxuICAgICAgICAgICAgdGV4dDogQHBhcmFtcy50ZXh0LCBcbiAgICAgICAgICAgIGluZGV4OiBpbmRleCwgXG4gICAgICAgICAgICBhY3Rpb246IEBwYXJhbXMuYWN0aW9uLCBcbiAgICAgICAgICAgIGlzU2VsZWN0ZWQ6IG5vLCBcbiAgICAgICAgICAgIGlzRGVmYXVsdDogQHBhcmFtcy5kZWZhdWx0Q2hvaWNlLCBcbiAgICAgICAgICAgIGlzRW5hYmxlZDogQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuZW5hYmxlZCkgfSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRPcGVuTWVudVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgIFxuICAgIGNvbW1hbmRPcGVuTWVudTogLT5cbiAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG5ldyBncy5PYmplY3RfTGF5b3V0KFwibWVudUxheW91dFwiKSwgdHJ1ZSlcbiAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gMVxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kT3BlbkxvYWRNZW51XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kT3BlbkxvYWRNZW51OiAtPlxuICAgICAgICBTY2VuZU1hbmFnZXIuc3dpdGNoVG8obmV3IGdzLk9iamVjdF9MYXlvdXQoXCJsb2FkTWVudUxheW91dFwiKSwgdHJ1ZSlcbiAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gMVxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZE9wZW5TYXZlTWVudVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZE9wZW5TYXZlTWVudTogLT5cbiAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG5ldyBncy5PYmplY3RfTGF5b3V0KFwic2F2ZU1lbnVMYXlvdXRcIiksIHRydWUpXG4gICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IDFcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUmV0dXJuVG9UaXRsZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZFJldHVyblRvVGl0bGU6IC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5jbGVhcigpXG4gICAgICAgIFNjZW5lTWFuYWdlci5zd2l0Y2hUbyhuZXcgZ3MuT2JqZWN0X0xheW91dChcInRpdGxlTGF5b3V0XCIpKVxuICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSAxXG4gICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcblxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFBsYXlWaWRlb1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUGxheVZpZGVvOiAtPlxuICAgICAgICBpZiAoR2FtZU1hbmFnZXIuaW5MaXZlUHJldmlldyBvciBHYW1lTWFuYWdlci5zZXR0aW5ncy5hbGxvd1ZpZGVvU2tpcCkgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwIHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCA9IG5vXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLnZpZGVvPy5uYW1lP1xuICAgICAgICAgICAgc2NlbmUudmlkZW8gPSBSZXNvdXJjZU1hbmFnZXIuZ2V0VmlkZW8oXCJNb3ZpZXMvI3tAcGFyYW1zLnZpZGVvLm5hbWV9XCIpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEB2aWRlb1Nwcml0ZSA9IG5ldyBTcHJpdGUoR3JhcGhpY3Mudmlld3BvcnQpXG4gICAgICAgICAgICBAdmlkZW9TcHJpdGUuc3JjUmVjdCA9IG5ldyBSZWN0KDAsIDAsIHNjZW5lLnZpZGVvLndpZHRoLCBzY2VuZS52aWRlby5oZWlnaHQpXG4gICAgICAgICAgICBAdmlkZW9TcHJpdGUudmlkZW8gPSBzY2VuZS52aWRlb1xuICAgICAgICAgICAgQHZpZGVvU3ByaXRlLnpvb21YID0gR3JhcGhpY3Mud2lkdGggLyBzY2VuZS52aWRlby53aWR0aFxuICAgICAgICAgICAgQHZpZGVvU3ByaXRlLnpvb21ZID0gR3JhcGhpY3MuaGVpZ2h0IC8gc2NlbmUudmlkZW8uaGVpZ2h0XG4gICAgICAgICAgICBAdmlkZW9TcHJpdGUueiA9IDk5OTk5OTk5XG4gICAgICAgICAgICBzY2VuZS52aWRlby5vbkVuZGVkID0gPT5cbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICBAdmlkZW9TcHJpdGUuZGlzcG9zZSgpXG4gICAgICAgICAgICAgICAgc2NlbmUudmlkZW8gPSBudWxsXG4gICAgICAgICAgICBzY2VuZS52aWRlby52b2x1bWUgPSBAcGFyYW1zLnZvbHVtZSAvIDEwMFxuICAgICAgICAgICAgc2NlbmUudmlkZW8ucGxheWJhY2tSYXRlID0gQHBhcmFtcy5wbGF5YmFja1JhdGUgLyAxMDBcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5pc1dhaXRpbmcgPSB5ZXNcbiAgICAgICAgICAgIHNjZW5lLnZpZGVvLnBsYXkoKVxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRBdWRpb0RlZmF1bHRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRBdWRpb0RlZmF1bHRzOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmF1ZGlvXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5tdXNpY0ZhZGVJbkR1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLm11c2ljRmFkZUluRHVyYXRpb24gPSBAcGFyYW1zLm11c2ljRmFkZUluRHVyYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLm11c2ljRmFkZU91dER1cmF0aW9uKSB0aGVuIGRlZmF1bHRzLm11c2ljRmFkZU91dER1cmF0aW9uID0gQHBhcmFtcy5tdXNpY0ZhZGVPdXREdXJhdGlvblxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MubXVzaWNWb2x1bWUpIHRoZW4gZGVmYXVsdHMubXVzaWNWb2x1bWUgPSBAcGFyYW1zLm11c2ljVm9sdW1lXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5tdXNpY1BsYXliYWNrUmF0ZSkgdGhlbiBkZWZhdWx0cy5tdXNpY1BsYXliYWNrUmF0ZSA9IEBwYXJhbXMubXVzaWNQbGF5YmFja1JhdGVcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNvdW5kVm9sdW1lKSB0aGVuIGRlZmF1bHRzLnNvdW5kVm9sdW1lID0gQHBhcmFtcy5zb3VuZFZvbHVtZVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muc291bmRQbGF5YmFja1JhdGUpIHRoZW4gZGVmYXVsdHMuc291bmRQbGF5YmFja1JhdGUgPSBAcGFyYW1zLnNvdW5kUGxheWJhY2tSYXRlXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy52b2ljZVZvbHVtZSkgdGhlbiBkZWZhdWx0cy52b2ljZVZvbHVtZSA9IEBwYXJhbXMudm9pY2VWb2x1bWVcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnZvaWNlUGxheWJhY2tSYXRlKSB0aGVuIGRlZmF1bHRzLnZvaWNlUGxheWJhY2tSYXRlID0gQHBhcmFtcy52b2ljZVBsYXliYWNrUmF0ZVxuICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRQbGF5TXVzaWNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kUGxheU11c2ljOiAtPlxuICAgICAgICBpZiBub3QgQHBhcmFtcy5tdXNpYz8gdGhlbiByZXR1cm5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5hdWRpb1xuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIuc2V0dGluZ3MuYmdtRW5hYmxlZFxuICAgICAgICAgICAgZmFkZUR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZhZGVJbkR1cmF0aW9uKSB0aGVuIEBwYXJhbXMuZmFkZUluRHVyYXRpb24gZWxzZSBkZWZhdWx0cy5tdXNpY0ZhZGVJbkR1cmF0aW9uXG4gICAgICAgICAgICB2b2x1bWUgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJtdXNpYy52b2x1bWVcIl0pIHRoZW4gQHBhcmFtcy5tdXNpYy52b2x1bWUgZWxzZSBkZWZhdWx0cy5tdXNpY1ZvbHVtZVxuICAgICAgICAgICAgcGxheWJhY2tSYXRlID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wibXVzaWMucGxheWJhY2tSYXRlXCJdKSB0aGVuIEBwYXJhbXMubXVzaWMucGxheWJhY2tSYXRlIGVsc2UgZGVmYXVsdHMubXVzaWNQbGF5YmFja1JhdGVcbiAgICAgICAgICAgIG11c2ljID0geyBuYW1lOiBAcGFyYW1zLm11c2ljLm5hbWUsIHZvbHVtZTogdm9sdW1lLCBwbGF5YmFja1JhdGU6IHBsYXliYWNrUmF0ZSB9XG4gICAgICAgICAgICBpZiBAcGFyYW1zLnBsYXlUeXBlID09IDFcbiAgICAgICAgICAgICAgICBwbGF5VGltZSA9IG1pbjogQHBhcmFtcy5wbGF5VGltZS5taW4gKiA2MCwgbWF4OiBAcGFyYW1zLnBsYXlUaW1lLm1heCAqIDYwXG4gICAgICAgICAgICAgICAgcGxheVJhbmdlID0gc3RhcnQ6IEBwYXJhbXMucGxheVJhbmdlLnN0YXJ0ICogNjAsIGVuZDogQHBhcmFtcy5wbGF5UmFuZ2UuZW5kICogNjBcbiAgICAgICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheU11c2ljUmFuZG9tKG11c2ljLCBmYWRlRHVyYXRpb24sIEBwYXJhbXMubGF5ZXIgfHwgMCwgcGxheVRpbWUsIHBsYXlSYW5nZSlcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheU11c2ljKEBwYXJhbXMubXVzaWMubmFtZSwgdm9sdW1lLCBwbGF5YmFja1JhdGUsIGZhZGVEdXJhdGlvbiwgQHBhcmFtcy5sYXllciB8fCAwKVxuICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTdG9wTXVzaWNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kU3RvcE11c2ljOiAtPiBcbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy5hdWRpb1xuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIGZhZGVEdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5mYWRlT3V0RHVyYXRpb24pIHRoZW4gQHBhcmFtcy5mYWRlT3V0RHVyYXRpb24gZWxzZSBkZWZhdWx0cy5tdXNpY0ZhZGVPdXREdXJhdGlvblxuICAgICAgICBcbiAgICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BNdXNpYyhmYWRlRHVyYXRpb24sIEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUGF1c2VNdXNpY1xuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRQYXVzZU11c2ljOiAtPlxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmF1ZGlvXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgZmFkZUR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZhZGVPdXREdXJhdGlvbikgdGhlbiBAcGFyYW1zLmZhZGVPdXREdXJhdGlvbiBlbHNlIGRlZmF1bHRzLm11c2ljRmFkZU91dER1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBBdWRpb01hbmFnZXIuc3RvcE11c2ljKGZhZGVEdXJhdGlvbiwgQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcikpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUmVzdW1lTXVzaWNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kUmVzdW1lTXVzaWM6IC0+IFxuICAgICAgICBkZWZhdWx0cyA9IEdhbWVNYW5hZ2VyLmRlZmF1bHRzLmF1ZGlvXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgZmFkZUR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmZhZGVJbkR1cmF0aW9uKSB0aGVuIEBwYXJhbXMuZmFkZUluRHVyYXRpb24gZWxzZSBkZWZhdWx0cy5tdXNpY0ZhZGVJbkR1cmF0aW9uXG4gICAgICAgIFxuICAgICAgICBBdWRpb01hbmFnZXIucmVzdW1lTXVzaWMoZmFkZUR1cmF0aW9uLCBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLmxheWVyKSlcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUGxheVNvdW5kXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRQbGF5U291bmQ6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMuYXVkaW9cbiAgICAgICAgZmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgaXNMb2NrZWQgPSBncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZFxuICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIuc2V0dGluZ3Muc291bmRFbmFibGVkIGFuZCAhR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgIHZvbHVtZSA9IGlmICFpc0xvY2tlZChmbGFnc1tcInNvdW5kLnZvbHVtZVwiXSkgdGhlbiBAcGFyYW1zLnNvdW5kLnZvbHVtZSBlbHNlIGRlZmF1bHRzLnNvdW5kVm9sdW1lXG4gICAgICAgICAgICBwbGF5YmFja1JhdGUgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJzb3VuZC5wbGF5YmFja1JhdGVcIl0pIHRoZW4gQHBhcmFtcy5zb3VuZC5wbGF5YmFja1JhdGUgZWxzZSBkZWZhdWx0cy5zb3VuZFBsYXliYWNrUmF0ZVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBBdWRpb01hbmFnZXIucGxheVNvdW5kKEBwYXJhbXMuc291bmQubmFtZSwgdm9sdW1lLCBwbGF5YmFja1JhdGUsIEBwYXJhbXMubXVzaWNFZmZlY3QpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFN0b3BTb3VuZFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICBcbiAgICBjb21tYW5kU3RvcFNvdW5kOiAtPlxuICAgICAgICBBdWRpb01hbmFnZXIuc3RvcFNvdW5kKEBwYXJhbXMuc291bmQubmFtZSlcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kRW5kQ29tbW9uRXZlbnRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kRW5kQ29tbW9uRXZlbnQ6IC0+XG4gICAgICAgIGV2ZW50SWQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLmNvbW1vbkV2ZW50SWQpXG4gICAgICAgIGV2ZW50ID0gR2FtZU1hbmFnZXIuY29tbW9uRXZlbnRzW2V2ZW50SWRdIFxuICAgICAgICBldmVudD8uYmVoYXZpb3Iuc3RvcCgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJlc3VtZUNvbW1vbkV2ZW50XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgY29tbWFuZFJlc3VtZUNvbW1vbkV2ZW50OiAtPlxuICAgICAgICBldmVudElkID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jb21tb25FdmVudElkKVxuICAgICAgICBldmVudCA9IEdhbWVNYW5hZ2VyLmNvbW1vbkV2ZW50c1tldmVudElkXSBcbiAgICAgICAgZXZlbnQ/LmJlaGF2aW9yLnJlc3VtZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2FsbENvbW1vbkV2ZW50XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDYWxsQ29tbW9uRXZlbnQ6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIGV2ZW50SWQgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBpZiBAcGFyYW1zLmNvbW1vbkV2ZW50SWQuaW5kZXg/XG4gICAgICAgICAgICBldmVudElkID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jb21tb25FdmVudElkKVxuICAgICAgICAgICAgbGlzdCA9IEBpbnRlcnByZXRlci5saXN0T2JqZWN0T2YoQHBhcmFtcy5wYXJhbWV0ZXJzLnZhbHVlc1swXSlcbiAgICAgICAgICAgIHBhcmFtcyA9IHsgdmFsdWVzOiBsaXN0IH1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcGFyYW1zID0gQHBhcmFtcy5wYXJhbWV0ZXJzXG4gICAgICAgICAgICBldmVudElkID0gQHBhcmFtcy5jb21tb25FdmVudElkXG5cbiAgICAgICAgQGludGVycHJldGVyLmNhbGxDb21tb25FdmVudChldmVudElkLCBwYXJhbXMpXG4gICAgIFxuICBcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDaGFuZ2VUZXh0U2V0dGluZ3NcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZENoYW5nZVRleHRTZXR0aW5nczogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHRzID0gc2NlbmUudGV4dHNcbiAgICAgICAgaWYgbm90IHRleHRzW251bWJlcl0/IFxuICAgICAgICAgICAgdGV4dHNbbnVtYmVyXSA9IG5ldyBncy5PYmplY3RfVGV4dCgpXG4gICAgICAgICAgICB0ZXh0c1tudW1iZXJdLnZpc2libGUgPSBub1xuICAgICAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0ZXh0U3ByaXRlID0gdGV4dHNbbnVtYmVyXVxuICAgICAgICBwYWRkaW5nID0gdGV4dFNwcml0ZS5iZWhhdmlvci5wYWRkaW5nXG4gICAgICAgIGZvbnQgPSB0ZXh0U3ByaXRlLmZvbnRcbiAgICAgICAgZm9udE5hbWUgPSB0ZXh0U3ByaXRlLmZvbnQubmFtZVxuICAgICAgICBmb250U2l6ZSA9IHRleHRTcHJpdGUuZm9udC5zaXplXG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLmxpbmVTcGFjaW5nKSB0aGVuIHRleHRTcHJpdGUudGV4dFJlbmRlcmVyLmxpbmVTcGFjaW5nID0gQHBhcmFtcy5saW5lU3BhY2luZyA/IHRleHRTcHJpdGUudGV4dFJlbmRlcmVyLmxpbmVTcGFjaW5nXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5mb250KSB0aGVuIGZvbnROYW1lID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5mb250KVxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3Muc2l6ZSkgdGhlbiBmb250U2l6ZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuc2l6ZSlcbiAgICAgICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuZm9udCkgb3IgIWlzTG9ja2VkKGZsYWdzLnNpemUpXG4gICAgICAgICAgICB0ZXh0U3ByaXRlLmZvbnQgPSBuZXcgRm9udChmb250TmFtZSwgZm9udFNpemUpXG4gICAgICAgICAgICBcbiAgICAgICAgcGFkZGluZy5sZWZ0ID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wicGFkZGluZy4wXCJdKSB0aGVuIEBwYXJhbXMucGFkZGluZz9bMF0gZWxzZSBwYWRkaW5nLmxlZnRcbiAgICAgICAgcGFkZGluZy50b3AgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJwYWRkaW5nLjFcIl0pIHRoZW4gQHBhcmFtcy5wYWRkaW5nP1sxXSBlbHNlIHBhZGRpbmcudG9wXG4gICAgICAgIHBhZGRpbmcucmlnaHQgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJwYWRkaW5nLjJcIl0pIHRoZW4gQHBhcmFtcy5wYWRkaW5nP1syXSBlbHNlIHBhZGRpbmcucmlnaHRcbiAgICAgICAgcGFkZGluZy5ib3R0b20gPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJwYWRkaW5nLjNcIl0pIHRoZW4gQHBhcmFtcy5wYWRkaW5nP1szXSBlbHNlIHBhZGRpbmcuYm90dG9tXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYm9sZClcbiAgICAgICAgICAgIHRleHRTcHJpdGUuZm9udC5ib2xkID0gQHBhcmFtcy5ib2xkXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5pdGFsaWMpXG4gICAgICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuaXRhbGljID0gQHBhcmFtcy5pdGFsaWNcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnNtYWxsQ2FwcylcbiAgICAgICAgICAgIHRleHRTcHJpdGUuZm9udC5zbWFsbENhcHMgPSBAcGFyYW1zLnNtYWxsQ2Fwc1xuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MudW5kZXJsaW5lKVxuICAgICAgICAgICAgdGV4dFNwcml0ZS5mb250LnVuZGVybGluZSA9IEBwYXJhbXMudW5kZXJsaW5lXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5zdHJpa2VUaHJvdWdoKVxuICAgICAgICAgICAgdGV4dFNwcml0ZS5mb250LnN0cmlrZVRocm91Z2ggPSBAcGFyYW1zLnN0cmlrZVRocm91Z2hcbiAgICAgICAgICAgIFxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuY29sb3IgPSBpZiAhaXNMb2NrZWQoZmxhZ3MuY29sb3IpIHRoZW4gbmV3IENvbG9yKEBwYXJhbXMuY29sb3IpIGVsc2UgZm9udC5jb2xvclxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuYm9yZGVyID0gaWYgIWlzTG9ja2VkKGZsYWdzLm91dGxpbmUpdGhlbiBAcGFyYW1zLm91dGxpbmUgZWxzZSBmb250LmJvcmRlclxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuYm9yZGVyQ29sb3IgPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3V0bGluZUNvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLm91dGxpbmVDb2xvcikgZWxzZSBuZXcgQ29sb3IoZm9udC5ib3JkZXJDb2xvcilcbiAgICAgICAgdGV4dFNwcml0ZS5mb250LmJvcmRlclNpemUgPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3V0bGluZVNpemUpIHRoZW4gQHBhcmFtcy5vdXRsaW5lU2l6ZSBlbHNlIGZvbnQuYm9yZGVyU2l6ZVxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuc2hhZG93ID0gaWYgIWlzTG9ja2VkKGZsYWdzLnNoYWRvdyl0aGVuIEBwYXJhbXMuc2hhZG93IGVsc2UgZm9udC5zaGFkb3dcbiAgICAgICAgdGV4dFNwcml0ZS5mb250LnNoYWRvd0NvbG9yID0gaWYgIWlzTG9ja2VkKGZsYWdzLnNoYWRvd0NvbG9yKSB0aGVuIG5ldyBDb2xvcihAcGFyYW1zLnNoYWRvd0NvbG9yKSBlbHNlIG5ldyBDb2xvcihmb250LnNoYWRvd0NvbG9yKVxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuc2hhZG93T2Zmc2V0WCA9IGlmICFpc0xvY2tlZChmbGFncy5zaGFkb3dPZmZzZXRYKSB0aGVuIEBwYXJhbXMuc2hhZG93T2Zmc2V0WCBlbHNlIGZvbnQuc2hhZG93T2Zmc2V0WFxuICAgICAgICB0ZXh0U3ByaXRlLmZvbnQuc2hhZG93T2Zmc2V0WSA9IGlmICFpc0xvY2tlZChmbGFncy5zaGFkb3dPZmZzZXRZKSB0aGVuIEBwYXJhbXMuc2hhZG93T2Zmc2V0WSBlbHNlIGZvbnQuc2hhZG93T2Zmc2V0WVxuICAgICAgICB0ZXh0U3ByaXRlLmJlaGF2aW9yLnJlZnJlc2goKVxuICAgICAgICB0ZXh0U3ByaXRlLnVwZGF0ZSgpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVRleHRTZXR0aW5nc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIGNvbW1hbmRUZXh0RGVmYXVsdHM6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudGV4dFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIFxuICAgICAgICBpZiAhaXNMb2NrZWQoZmxhZ3MuYXBwZWFyRHVyYXRpb24pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuYXBwZWFyRHVyYXRpb24pXG4gICAgICAgIGlmICFpc0xvY2tlZChmbGFncy5kaXNhcHBlYXJEdXJhdGlvbikgdGhlbiBkZWZhdWx0cy5kaXNhcHBlYXJEdXJhdGlvbiA9IEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kaXNhcHBlYXJEdXJhdGlvbilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLnpPcmRlcikgdGhlbiBkZWZhdWx0cy56T3JkZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnpPcmRlcilcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYXBwZWFyRWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYXBwZWFyRWFzaW5nID0gQHBhcmFtcy5hcHBlYXJFYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiYXBwZWFyQW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uID0gQHBhcmFtcy5hcHBlYXJBbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZGlzYXBwZWFyRWFzaW5nLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nID0gQHBhcmFtcy5kaXNhcHBlYXJFYXNpbmdcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wiZGlzYXBwZWFyQW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gZGVmYXVsdHMuZGlzYXBwZWFyQW5pbWF0aW9uID0gQHBhcmFtcy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzW1wibW90aW9uQmx1ci5lbmFibGVkXCJdKSB0aGVuIGRlZmF1bHRzLm1vdGlvbkJsdXIgPSBAcGFyYW1zLm1vdGlvbkJsdXJcbiAgICAgICAgaWYgIWlzTG9ja2VkKGZsYWdzLm9yaWdpbikgdGhlbiBkZWZhdWx0cy5vcmlnaW4gPSBAcGFyYW1zLm9yaWdpblxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNob3dUZXh0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kU2hvd1RleHQ6IC0+XG4gICAgICAgIGRlZmF1bHRzID0gR2FtZU1hbmFnZXIuZGVmYXVsdHMudGV4dFxuICAgICAgICBmbGFncyA9IEBwYXJhbXMuZmllbGRGbGFncyB8fCB7fVxuICAgICAgICBpc0xvY2tlZCA9IGdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkXG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVRleHREb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0ZXh0ID0gQHBhcmFtcy50ZXh0XG4gICAgICAgIHRleHRzID0gc2NlbmUudGV4dHNcbiAgICAgICAgaWYgbm90IHRleHRzW251bWJlcl0/IHRoZW4gdGV4dHNbbnVtYmVyXSA9IG5ldyBncy5PYmplY3RfVGV4dCgpXG4gICAgICAgIFxuICAgICAgICB4ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi54KVxuICAgICAgICB5ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5wb3NpdGlvbi55KVxuICAgICAgICB0ZXh0T2JqZWN0ID0gdGV4dHNbbnVtYmVyXVxuICAgICAgICB0ZXh0T2JqZWN0LmRvbWFpbiA9IEBwYXJhbXMubnVtYmVyRG9tYWluXG4gICAgICAgIFxuICAgICAgICBlYXNpbmcgPSBpZiAhaXNMb2NrZWQoZmxhZ3NbXCJlYXNpbmcudHlwZVwiXSkgdGhlbiBncy5FYXNpbmdzLmZyb21WYWx1ZXMoQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5lYXNpbmcudHlwZSksIEBwYXJhbXMuZWFzaW5nLmluT3V0KSBlbHNlIGdzLkVhc2luZ3MuZnJvbU9iamVjdChkZWZhdWx0cy5hcHBlYXJFYXNpbmcpXG4gICAgICAgIGR1cmF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzLmR1cmF0aW9uKSB0aGVuIEBpbnRlcnByZXRlci5kdXJhdGlvblZhbHVlT2YoQHBhcmFtcy5kdXJhdGlvbikgZWxzZSBkZWZhdWx0cy5hcHBlYXJEdXJhdGlvblxuICAgICAgICBvcmlnaW4gPSBpZiAhaXNMb2NrZWQoZmxhZ3Mub3JpZ2luKSB0aGVuIEBwYXJhbXMub3JpZ2luIGVsc2UgZGVmYXVsdHMub3JpZ2luXG4gICAgICAgIHpJbmRleCA9IGlmICFpc0xvY2tlZChmbGFncy56T3JkZXIpIHRoZW4gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy56T3JkZXIpIGVsc2UgZGVmYXVsdHMuek9yZGVyXG4gICAgICAgIGFuaW1hdGlvbiA9IGlmICFpc0xvY2tlZChmbGFnc1tcImFuaW1hdGlvbi50eXBlXCJdKSB0aGVuIEBwYXJhbXMuYW5pbWF0aW9uIGVsc2UgZGVmYXVsdHMuYXBwZWFyQW5pbWF0aW9uXG4gICAgICAgIHBvc2l0aW9uQW5jaG9yID0gaWYgIWlzTG9ja2VkKGZsYWdzLnBvc2l0aW9uT3JpZ2luKSB0aGVuIEBpbnRlcnByZXRlci5ncmFwaGljQW5jaG9yUG9pbnRzQnlDb25zdGFudFtAcGFyYW1zLnBvc2l0aW9uT3JpZ2luXSB8fCBuZXcgZ3MuUG9pbnQoMCwgMCkgZWxzZSBAaW50ZXJwcmV0ZXIuZ3JhcGhpY0FuY2hvclBvaW50c0J5Q29uc3RhbnRbZGVmYXVsdHMucG9zaXRpb25PcmlnaW5dXG4gICAgICAgIFxuICAgICAgICB0ZXh0T2JqZWN0LnRleHQgPSB0ZXh0XG4gICAgICAgIHRleHRPYmplY3QuZHN0UmVjdC54ID0geCBcbiAgICAgICAgdGV4dE9iamVjdC5kc3RSZWN0LnkgPSB5IFxuICAgICAgICB0ZXh0T2JqZWN0LmJsZW5kTW9kZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuYmxlbmRNb2RlKVxuICAgICAgICB0ZXh0T2JqZWN0LmFuY2hvci54ID0gaWYgb3JpZ2luID09IDAgdGhlbiAwIGVsc2UgMC41XG4gICAgICAgIHRleHRPYmplY3QuYW5jaG9yLnkgPSBpZiBvcmlnaW4gPT0gMCB0aGVuIDAgZWxzZSAwLjVcbiAgICAgICAgdGV4dE9iamVjdC5wb3NpdGlvbkFuY2hvci54ID0gcG9zaXRpb25BbmNob3IueFxuICAgICAgICB0ZXh0T2JqZWN0LnBvc2l0aW9uQW5jaG9yLnkgPSBwb3NpdGlvbkFuY2hvci55XG4gICAgICAgIHRleHRPYmplY3QuekluZGV4ID0gekluZGV4IHx8ICAoNzAwICsgbnVtYmVyKVxuICAgICAgICB0ZXh0T2JqZWN0LnNpemVUb0ZpdCA9IHllc1xuICAgICAgICB0ZXh0T2JqZWN0LmZvcm1hdHRpbmcgPSB5ZXNcbiAgICAgICAgaWYgQHBhcmFtcy52aWV3cG9ydD8udHlwZSA9PSBcInNjZW5lXCJcbiAgICAgICAgICAgIHRleHRPYmplY3Qudmlld3BvcnQgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3Iudmlld3BvcnRcbiAgICAgICAgdGV4dE9iamVjdC51cGRhdGUoKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy5wb3NpdGlvblR5cGUgPT0gMFxuICAgICAgICAgICAgcCA9IEBpbnRlcnByZXRlci5wcmVkZWZpbmVkT2JqZWN0UG9zaXRpb24oQHBhcmFtcy5wcmVkZWZpbmVkUG9zaXRpb25JZCwgdGV4dE9iamVjdCwgQHBhcmFtcylcbiAgICAgICAgICAgIHRleHRPYmplY3QuZHN0UmVjdC54ID0gcC54XG4gICAgICAgICAgICB0ZXh0T2JqZWN0LmRzdFJlY3QueSA9IHAueVxuICAgICAgICAgICAgXG4gICAgICAgIHRleHRPYmplY3QuYW5pbWF0b3IuYXBwZWFyKHgsIHksIGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbilcbiAgICAgICAgXG4gICAgICAgIGlmIEBwYXJhbXMud2FpdEZvckNvbXBsZXRpb24gYW5kIG5vdCAoZHVyYXRpb24gPT0gMCBvciBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpKVxuICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRDb3VudGVyID0gZHVyYXRpb25cbiAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kVGV4dE1vdGlvbkJsdXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgIFxuICAgIGNvbW1hbmRUZXh0TW90aW9uQmx1cjogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHQgPSBzY2VuZS50ZXh0c1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0ZXh0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgdGV4dC5tb3Rpb25CbHVyLnNldChAcGFyYW1zLm1vdGlvbkJsdXIpXG4gICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFJlZnJlc2hUZXh0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kUmVmcmVzaFRleHQ6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVRleHREb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgIG51bWJlciA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKVxuICAgICAgICB0ZXh0cyA9IHNjZW5lLnRleHRzXG4gICAgICAgIGlmIG5vdCB0ZXh0c1tudW1iZXJdPyB0aGVuIHJldHVyblxuXG4gICAgICAgIHRleHRzW251bWJlcl0uYmVoYXZpb3IucmVmcmVzaCh5ZXMpXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kTW92ZVRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1vdmVUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIubW92ZU9iamVjdCh0ZXh0LCBAcGFyYW1zLnBpY3R1cmUucG9zaXRpb24sIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRNb3ZlVGV4dFBhdGhcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgXG4gICAgY29tbWFuZE1vdmVUZXh0UGF0aDogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHQgPSBzY2VuZS50ZXh0c1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0ZXh0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLm1vdmVPYmplY3RQYXRoKHRleHQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRSb3RhdGVUZXh0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRSb3RhdGVUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIucm90YXRlT2JqZWN0KHRleHQsIEBwYXJhbXMpXG4gICAgICAgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRab29tVGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgXG4gICAgY29tbWFuZFpvb21UZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuem9vbU9iamVjdCh0ZXh0LCBAcGFyYW1zKVxuICAgICAgICBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEJsZW5kVGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRCbGVuZFRleHQ6IC0+XG4gICAgICAgIFNjZW5lTWFuYWdlci5zY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICB0ZXh0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnRleHRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuYmxlbmRPYmplY3QodGV4dCwgQHBhcmFtcykgIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRDb2xvclRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICBcbiAgICBjb21tYW5kQ29sb3JUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgZHVyYXRpb24gPSBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pXG4gICAgICAgIGVhc2luZyA9IGdzLkVhc2luZ3MuZnJvbU9iamVjdChAcGFyYW1zLmVhc2luZylcbiAgICAgICAgXG4gICAgICAgIGlmIHRleHQ/XG4gICAgICAgICAgICB0ZXh0LmFuaW1hdG9yLmNvbG9yVG8obmV3IENvbG9yKEBwYXJhbXMuY29sb3IpLCBkdXJhdGlvbiwgZWFzaW5nKVxuICAgICAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci53YWl0Q291bnRlciA9IGR1cmF0aW9uIFxuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRFcmFzZVRleHRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgXG4gICAgY29tbWFuZEVyYXNlVGV4dDogLT5cbiAgICAgICAgZGVmYXVsdHMgPSBHYW1lTWFuYWdlci5kZWZhdWx0cy50ZXh0XG4gICAgICAgIGZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIGlzTG9ja2VkID0gZ3MuQ29tbWFuZEZpZWxkRmxhZ3MuaXNMb2NrZWRcbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgbnVtYmVyID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXG4gICAgICAgIHRleHQgPSBzY2VuZS50ZXh0c1tudW1iZXJdXG4gICAgICAgIGlmIG5vdCB0ZXh0PyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgZWFzaW5nID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiZWFzaW5nLnR5cGVcIl0pIHRoZW4gZ3MuRWFzaW5ncy5mcm9tVmFsdWVzKEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMuZWFzaW5nLnR5cGUpLCBAcGFyYW1zLmVhc2luZy5pbk91dCkgZWxzZSBncy5FYXNpbmdzLmZyb21PYmplY3QoZGVmYXVsdHMuZGlzYXBwZWFyRWFzaW5nKVxuICAgICAgICBkdXJhdGlvbiA9IGlmICFpc0xvY2tlZChmbGFncy5kdXJhdGlvbikgdGhlbiBAaW50ZXJwcmV0ZXIuZHVyYXRpb25WYWx1ZU9mKEBwYXJhbXMuZHVyYXRpb24pIGVsc2UgZGVmYXVsdHMuZGlzYXBwZWFyRHVyYXRpb25cbiAgICAgICAgYW5pbWF0aW9uID0gaWYgIWlzTG9ja2VkKGZsYWdzW1wiYW5pbWF0aW9uLnR5cGVcIl0pIHRoZW4gQHBhcmFtcy5hbmltYXRpb24gZWxzZSBkZWZhdWx0cy5kaXNhcHBlYXJBbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIFxuICAgICAgICB0ZXh0LmFuaW1hdG9yLmRpc2FwcGVhcihhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sIChzZW5kZXIpID0+IFxuICAgICAgICAgICAgc2VuZGVyLmRpc3Bvc2UoKVxuICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihzZW5kZXIuZG9tYWluKVxuICAgICAgICAgICAgc2NlbmUudGV4dHNbbnVtYmVyXSA9IG51bGxcbiAgICAgICAgKVxuICAgICAgICBcbiAgICAgICAgaWYgQHBhcmFtcy53YWl0Rm9yQ29tcGxldGlvbiBhbmQgbm90IChkdXJhdGlvbiA9PSAwIG9yIEBpbnRlcnByZXRlci5pc0luc3RhbnRTa2lwKCkpXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPSBkdXJhdGlvbiBcbiAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RNaW5vckNoYW5nZSgpXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kVGV4dEVmZmVjdFxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRUZXh0RWZmZWN0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBudW1iZXIgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcilcbiAgICAgICAgdGV4dCA9IHNjZW5lLnRleHRzW251bWJlcl1cbiAgICAgICAgaWYgbm90IHRleHQ/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIub2JqZWN0RWZmZWN0KHRleHQsIEBwYXJhbXMpXG4gICAgICAgIGdzLkdhbWVOb3RpZmllci5wb3N0TWlub3JDaGFuZ2UoKVxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZElucHV0VGV4dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kSW5wdXRUZXh0OiAtPlxuICAgICAgICBzY2VuZSA9IFNjZW5lTWFuYWdlci5zY2VuZVxuICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VUZXh0RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICBpZiAoR2FtZU1hbmFnZXIuc2V0dGluZ3MuYWxsb3dDaG9pY2VTa2lwfHxAaW50ZXJwcmV0ZXIucHJldmlldykgYW5kIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwXG4gICAgICAgICAgICBAaW50ZXJwcmV0ZXIubWVzc2FnZU9iamVjdCgpLmJlaGF2aW9yLmNsZWFyKClcbiAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudmFyaWFibGUsIFwiXCIpXG4gICAgICAgICAgICByZXR1cm5cbiAgICAgICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0geWVzXG4gICAgICAgIGlmIEBpbnRlcnByZXRlci5pc1Byb2Nlc3NpbmdNZXNzYWdlSW5PdGhlckNvbnRleHQoKVxuICAgICAgICAgICAgQGludGVycHJldGVyLndhaXRGb3JNZXNzYWdlKClcbiAgICAgICAgICAgIHJldHVyblxuICAgICAgICBcbiAgICAgICAgJHRlbXBGaWVsZHMubGV0dGVycyA9IEBwYXJhbXMubGV0dGVyc1xuICAgICAgICBzY2VuZS5iZWhhdmlvci5zaG93SW5wdXRUZXh0KEBwYXJhbXMubGV0dGVycywgZ3MuQ2FsbEJhY2soXCJvbklucHV0VGV4dEZpbmlzaFwiLCBAaW50ZXJwcmV0ZXIsIEBpbnRlcnByZXRlcikpICBcbiAgICAgICAgQGludGVycHJldGVyLndhaXRpbmdGb3IuaW5wdXRUZXh0ID0gQHBhcmFtc1xuICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdE1pbm9yQ2hhbmdlKClcbiAgICAjIyMqXG4gICAgKiBAbWV0aG9kIGNvbW1hbmRTYXZlUGVyc2lzdGVudERhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgY29tbWFuZFNhdmVQZXJzaXN0ZW50RGF0YTogLT4gR2FtZU1hbmFnZXIuc2F2ZUdsb2JhbERhdGEoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNhdmVTZXR0aW5nc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kU2F2ZVNldHRpbmdzOiAtPiBHYW1lTWFuYWdlci5zYXZlU2V0dGluZ3MoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFByZXBhcmVTYXZlR2FtZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjb21tYW5kUHJlcGFyZVNhdmVHYW1lOiAtPlxuICAgICAgICBpZiBAaW50ZXJwcmV0ZXIucHJldmlld0RhdGE/IHRoZW4gcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlcisrXG4gICAgICAgIEdhbWVNYW5hZ2VyLnByZXBhcmVTYXZlR2FtZShAcGFyYW1zLnNuYXBzaG90KVxuICAgICAgICBAaW50ZXJwcmV0ZXIucG9pbnRlci0tXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNhdmVHYW1lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRTYXZlR2FtZTogLT5cbiAgICAgICAgaWYgQGludGVycHJldGVyLnByZXZpZXdEYXRhPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgdGh1bWJXaWR0aCA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMudGh1bWJXaWR0aClcbiAgICAgICAgdGh1bWJIZWlnaHQgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnRodW1iSGVpZ2h0KVxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIuc2F2ZShAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNsb3QpIC0gMSwgdGh1bWJXaWR0aCwgdGh1bWJIZWlnaHQpXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZExvYWRHYW1lXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRMb2FkR2FtZTogLT5cbiAgICAgICAgaWYgQGludGVycHJldGVyLnByZXZpZXdEYXRhPyB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIubG9hZChAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLnNsb3QpIC0gMSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kV2FpdEZvcklucHV0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIGNvbW1hbmRXYWl0Rm9ySW5wdXQ6IC0+XG4gICAgICAgIHJldHVybiBpZiBAaW50ZXJwcmV0ZXIuaXNJbnN0YW50U2tpcCgpXG4gICAgICAgIFxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub2ZmQnlPd25lcihcIm1vdXNlRG93blwiLCBAb2JqZWN0KVxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub2ZmQnlPd25lcihcIm1vdXNlVXBcIiwgQG9iamVjdClcbiAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9mZkJ5T3duZXIoXCJrZXlEb3duXCIsIEBvYmplY3QpXG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwia2V5VXBcIiwgQG9iamVjdClcbiAgICAgICAgXG4gICAgICAgIGYgPSA9PlxuICAgICAgICAgICAgZXhlY3V0ZUFjdGlvbiA9IG5vXG4gICAgICAgICAgICBpZiBJbnB1dC5Nb3VzZS5pc0J1dHRvbihAcGFyYW1zLmtleSlcbiAgICAgICAgICAgICAgICBleGVjdXRlQWN0aW9uID0gSW5wdXQuTW91c2UuYnV0dG9uc1tAcGFyYW1zLmtleV0gPT0gQHBhcmFtcy5zdGF0ZVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGV4ZWN1dGVBY3Rpb24gPSBJbnB1dC5rZXlzW0BwYXJhbXMua2V5XSA9PSBAcGFyYW1zLnN0YXRlXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBleGVjdXRlQWN0aW9uXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IG5vXG4gICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub2ZmQnlPd25lcihcIm1vdXNlRG93blwiLCBAb2JqZWN0KVxuICAgICAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwibW91c2VVcFwiLCBAb2JqZWN0KVxuICAgICAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwia2V5RG93blwiLCBAb2JqZWN0KVxuICAgICAgICAgICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vZmZCeU93bmVyKFwia2V5VXBcIiwgQG9iamVjdClcbiAgICAgICAgICAgIFxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub24gXCJtb3VzZURvd25cIiwgZiwgbnVsbCwgQG9iamVjdFxuICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIub24gXCJtb3VzZVVwXCIsIGYsIG51bGwsIEBvYmplY3RcbiAgICAgICAgZ3MuR2xvYmFsRXZlbnRNYW5hZ2VyLm9uIFwia2V5RG93blwiLCBmLCBudWxsLCBAb2JqZWN0XG4gICAgICAgIGdzLkdsb2JhbEV2ZW50TWFuYWdlci5vbiBcIktleVVwXCIsIGYsIG51bGwsIEBvYmplY3RcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgQGludGVycHJldGVyLmlzV2FpdGluZyA9IHllc1xuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEdldElucHV0RGF0YVxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIGNvbW1hbmRHZXRJbnB1dERhdGE6IC0+XG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLmZpZWxkXG4gICAgICAgICAgICB3aGVuIDAgIyBCdXR0b24gQVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuQV0pXG4gICAgICAgICAgICB3aGVuIDEgIyBCdXR0b24gQlxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuQl0pXG4gICAgICAgICAgICB3aGVuIDIgIyBCdXR0b24gWFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuWF0pXG4gICAgICAgICAgICB3aGVuIDMgIyBCdXR0b24gWVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuWV0pXG4gICAgICAgICAgICB3aGVuIDQgIyBCdXR0b24gTFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuTF0pXG4gICAgICAgICAgICB3aGVuIDUgIyBCdXR0b24gUlxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0LmtleXNbSW5wdXQuUl0pXG4gICAgICAgICAgICB3aGVuIDYgIyBCdXR0b24gU1RBUlRcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5rZXlzW0lucHV0LlNUQVJUXSlcbiAgICAgICAgICAgIHdoZW4gNyAjIEJ1dHRvbiBTRUxFQ1RcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5rZXlzW0lucHV0LlNFTEVDVF0pXG4gICAgICAgICAgICB3aGVuIDggIyBNb3VzZSBYXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQuTW91c2UueClcbiAgICAgICAgICAgIHdoZW4gOSAjIE1vdXNlIFlcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5Nb3VzZS55KVxuICAgICAgICAgICAgd2hlbiAxMCAjIE1vdXNlIFdoZWVsXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgSW5wdXQuTW91c2Uud2hlZWwpXG4gICAgICAgICAgICB3aGVuIDExICMgTW91c2UgTGVmdFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIElucHV0Lk1vdXNlLmJ1dHRvbnNbSW5wdXQuTW91c2UuTEVGVF0pXG4gICAgICAgICAgICB3aGVuIDEyICMgTW91c2UgUmlnaHRcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5Nb3VzZS5idXR0b25zW0lucHV0Lk1vdXNlLlJJR0hUXSlcbiAgICAgICAgICAgIHdoZW4gMTMgIyBNb3VzZSBNaWRkbGVcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBJbnB1dC5Nb3VzZS5idXR0b25zW0lucHV0Lk1vdXNlLk1JRERMRV0pXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kR2V0R2FtZURhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICBcbiAgICBjb21tYW5kR2V0R2FtZURhdGE6IC0+XG4gICAgICAgIHRlbXBTZXR0aW5ncyA9IEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5nc1xuICAgICAgICBzZXR0aW5ncyA9IEdhbWVNYW5hZ2VyLnNldHRpbmdzXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5maWVsZFxuICAgICAgICAgICAgd2hlbiAwICMgU2NlbmUgSURcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBTY2VuZU1hbmFnZXIuc2NlbmUuc2NlbmVEb2N1bWVudC51aWQpXG4gICAgICAgICAgICB3aGVuIDEgIyBHYW1lIFRpbWUgLSBTZWNvbmRzXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgTWF0aC5yb3VuZChHcmFwaGljcy5mcmFtZUNvdW50IC8gNjApKVxuICAgICAgICAgICAgd2hlbiAyICMgR2FtZSBUaW1lIC0gTWludXRlc1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIE1hdGgucm91bmQoR3JhcGhpY3MuZnJhbWVDb3VudCAvIDYwIC8gNjApKVxuICAgICAgICAgICAgd2hlbiAzICMgR2FtZSBUaW1lIC0gSG91cnNcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLnJvdW5kKEdyYXBoaWNzLmZyYW1lQ291bnQgLyA2MCAvIDYwIC8gNjApKVxuICAgICAgICAgICAgd2hlbiA0ICMgRGF0ZSAtIERheSBvZiBNb250aFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG5ldyBEYXRlKCkuZ2V0RGF0ZSgpKVxuICAgICAgICAgICAgd2hlbiA1ICMgRGF0ZSAtIERheSBvZiBXZWVrXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbmV3IERhdGUoKS5nZXREYXkoKSlcbiAgICAgICAgICAgIHdoZW4gNiAjIERhdGUgLSBNb250aFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG5ldyBEYXRlKCkuZ2V0TW9udGgoKSlcbiAgICAgICAgICAgIHdoZW4gNyAjIERhdGUgLSBZZWFyXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpKVxuICAgICAgICAgICAgd2hlbiA4XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmFsbG93U2tpcClcbiAgICAgICAgICAgIHdoZW4gOVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5hbGxvd1NraXBVbnJlYWRNZXNzYWdlcylcbiAgICAgICAgICAgIHdoZW4gMTBcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5tZXNzYWdlU3BlZWQpXG4gICAgICAgICAgICB3aGVuIDExXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmF1dG9NZXNzYWdlLmVuYWJsZWQpXG4gICAgICAgICAgICB3aGVuIDEyXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYXV0b01lc3NhZ2UudGltZSlcbiAgICAgICAgICAgIHdoZW4gMTNcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYXV0b01lc3NhZ2Uud2FpdEZvclZvaWNlKVxuICAgICAgICAgICAgd2hlbiAxNFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5hdXRvTWVzc2FnZS5zdG9wT25BY3Rpb24pXG4gICAgICAgICAgICB3aGVuIDE1XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLnRpbWVNZXNzYWdlVG9Wb2ljZSlcbiAgICAgICAgICAgIHdoZW4gMTZcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYWxsb3dWaWRlb1NraXApXG4gICAgICAgICAgICB3aGVuIDE3XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmFsbG93Q2hvaWNlU2tpcClcbiAgICAgICAgICAgIHdoZW4gMThcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0Qm9vbGVhblZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3Muc2tpcFZvaWNlT25BY3Rpb24pXG4gICAgICAgICAgICB3aGVuIDE5XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmZ1bGxTY3JlZW4pXG4gICAgICAgICAgICB3aGVuIDIwXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLmFkanVzdEFzcGVjdFJhdGlvKVxuICAgICAgICAgICAgd2hlbiAyMVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5jb25maXJtYXRpb24pXG4gICAgICAgICAgICB3aGVuIDIyXG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgc2V0dGluZ3MuYmdtVm9sdW1lKVxuICAgICAgICAgICAgd2hlbiAyM1xuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLnZvaWNlVm9sdW1lKVxuICAgICAgICAgICAgd2hlbiAyNFxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLnNlVm9sdW1lKVxuICAgICAgICAgICAgd2hlbiAyNVxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy5iZ21FbmFibGVkKVxuICAgICAgICAgICAgd2hlbiAyNlxuICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBzZXR0aW5ncy52b2ljZUVuYWJsZWQpXG4gICAgICAgICAgICB3aGVuIDI3XG4gICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIHNldHRpbmdzLnNlRW5hYmxlZClcbiAgICAgICAgICAgIHdoZW4gMjggIyBMYW5ndWFnZSAtIENvZGVcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBMYW5ndWFnZU1hbmFnZXIubGFuZ3VhZ2U/LmNvZGUgfHwgXCJcIilcbiAgICAgICAgICAgIHdoZW4gMjkgIyBMYW5ndWFnZSAtIE5hbWVcbiAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBMYW5ndWFnZU1hbmFnZXIubGFuZ3VhZ2U/Lm5hbWUgfHwgXCJcIikgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kU2V0R2FtZURhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kU2V0R2FtZURhdGE6IC0+XG4gICAgICAgIHRlbXBTZXR0aW5ncyA9IEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5nc1xuICAgICAgICBzZXR0aW5ncyA9IEdhbWVNYW5hZ2VyLnNldHRpbmdzXG4gICAgICAgIFxuICAgICAgICBzd2l0Y2ggQHBhcmFtcy5maWVsZFxuICAgICAgICAgICAgd2hlbiAwXG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYWxsb3dTa2lwID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDFcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hbGxvd1NraXBVbnJlYWRNZXNzYWdlcyA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiAyXG4gICAgICAgICAgICAgICAgc2V0dGluZ3MubWVzc2FnZVNwZWVkID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gM1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLmF1dG9NZXNzYWdlLmVuYWJsZWQgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gNFxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmF1dG9NZXNzYWdlLnRpbWUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgd2hlbiA1XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYXV0b01lc3NhZ2Uud2FpdEZvclZvaWNlID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDZcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hdXRvTWVzc2FnZS5zdG9wT25BY3Rpb24gPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gN1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLnRpbWVNZXNzYWdlVG9Wb2ljZSA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiA4XG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuYWxsb3dWaWRlb1NraXAgPSBAaW50ZXJwcmV0ZXIuYm9vbGVhblZhbHVlT2YoQHBhcmFtcy5zd2l0Y2hWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gOVxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmFsbG93Q2hvaWNlU2tpcCA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiAxMFxuICAgICAgICAgICAgICAgIHNldHRpbmdzLnNraXBWb2ljZU9uQWN0aW9uID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDExXG4gICAgICAgICAgICAgICAgc2V0dGluZ3MuZnVsbFNjcmVlbiA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgICAgIGlmIHNldHRpbmdzLmZ1bGxTY3JlZW5cbiAgICAgICAgICAgICAgICAgICAgU2NlbmVNYW5hZ2VyLnNjZW5lLmJlaGF2aW9yLmVudGVyRnVsbFNjcmVlbigpXG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBTY2VuZU1hbmFnZXIuc2NlbmUuYmVoYXZpb3IubGVhdmVGdWxsU2NyZWVuKClcbiAgICAgICAgICAgIHdoZW4gMTJcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5hZGp1c3RBc3BlY3RSYXRpbyA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgICAgIEdyYXBoaWNzLmtlZXBSYXRpbyA9IHNldHRpbmdzLmFkanVzdEFzcGVjdFJhdGlvXG4gICAgICAgICAgICAgICAgR3JhcGhpY3Mub25SZXNpemUoKVxuICAgICAgICAgICAgd2hlbiAxM1xuICAgICAgICAgICAgICAgIHNldHRpbmdzLmNvbmZpcm1hdGlvbiA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgd2hlbiAxNFxuICAgICAgICAgICAgICAgIHNldHRpbmdzLmJnbVZvbHVtZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDE1XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Mudm9pY2VWb2x1bWUgPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgd2hlbiAxNlxuICAgICAgICAgICAgICAgIHNldHRpbmdzLnNlVm9sdW1lID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgIHdoZW4gMTdcbiAgICAgICAgICAgICAgICBzZXR0aW5ncy5iZ21FbmFibGVkID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDE4XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Mudm9pY2VFbmFibGVkID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpXG4gICAgICAgICAgICB3aGVuIDE5XG4gICAgICAgICAgICAgICAgc2V0dGluZ3Muc2VFbmFibGVkID0gQGludGVycHJldGVyLmJvb2xlYW5WYWx1ZU9mKEBwYXJhbXMuc3dpdGNoVmFsdWUpICAgXG4gICAgICAgICAgICB3aGVuIDIwIFxuICAgICAgICAgICAgICAgIGNvZGUgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgICAgICBsYW5ndWFnZSA9IExhbmd1YWdlTWFuYWdlci5sYW5ndWFnZXMuZmlyc3QgKGwpID0+IGwuY29kZSA9PSBjb2RlXG4gICAgICAgICAgICAgICAgTGFuZ3VhZ2VNYW5hZ2VyLnNlbGVjdExhbmd1YWdlKGxhbmd1YWdlKSBpZiBsYW5ndWFnZVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZEdldE9iamVjdERhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyNcbiAgICBjb21tYW5kR2V0T2JqZWN0RGF0YTogLT5cbiAgICAgICAgc2NlbmUgPSBTY2VuZU1hbmFnZXIuc2NlbmVcbiAgICAgICAgc3dpdGNoIEBwYXJhbXMub2JqZWN0VHlwZVxuICAgICAgICAgICAgd2hlbiAwICMgUGljdHVyZVxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVBpY3R1cmVEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnBpY3R1cmVzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIHdoZW4gMSAjIEJhY2tncm91bmRcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUuYmFja2dyb3VuZHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5sYXllcildXG4gICAgICAgICAgICB3aGVuIDIgIyBUZXh0XG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVGV4dERvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUudGV4dHNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgd2hlbiAzICMgTW92aWVcbiAgICAgICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VWaWRlb0RvbWFpbihAcGFyYW1zLm51bWJlckRvbWFpbilcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUudmlkZW9zW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIHdoZW4gNCAjIENoYXJhY3RlclxuICAgICAgICAgICAgICAgIGNoYXJhY3RlcklkID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy5jaGFyYWN0ZXJJZClcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBTY2VuZU1hbmFnZXIuc2NlbmUuY2hhcmFjdGVycy5maXJzdCAodikgPT4gIXYuZGlzcG9zZWQgYW5kIHYucmlkID09IGNoYXJhY3RlcklkXG4gICAgICAgICAgICB3aGVuIDUgIyBNZXNzYWdlIEJveFxuICAgICAgICAgICAgICAgIG9iamVjdCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwibWVzc2FnZUJveFwiKVxuICAgICAgICAgICAgd2hlbiA2ICMgTWVzc2FnZSBBcmVhXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlTWVzc2FnZUFyZWFEb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgYXJlYSA9IFNjZW5lTWFuYWdlci5zY2VuZS5tZXNzYWdlQXJlYXNbQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXIpXVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IGFyZWE/LmxheW91dFxuICAgICAgICAgICAgd2hlbiA3ICMgSG90c3BvdFxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZUhvdHNwb3REb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmhvdHNwb3RzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIFxuICAgICAgICBcbiAgICAgICAgZmllbGQgPSBAcGFyYW1zLmZpZWxkXG4gICAgICAgIGlmIEBwYXJhbXMub2JqZWN0VHlwZSA9PSA0ICMgQ2hhcmFjdGVyXG4gICAgICAgICAgICBzd2l0Y2ggQHBhcmFtcy5maWVsZFxuICAgICAgICAgICAgICAgIHdoZW4gMCAjIElEXG4gICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyc1tjaGFyYWN0ZXJJZF0/LmluZGV4IHx8IFwiXCIpXG4gICAgICAgICAgICAgICAgd2hlbiAxICMgTmFtZVxuICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBsY3MoUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzW2NoYXJhY3RlcklkXT8ubmFtZSkgfHwgXCJcIilcbiAgICAgICAgICAgIGZpZWxkIC09IDJcbiAgICAgICAgICAgIFxuICAgICAgICBpZiBvYmplY3Q/ICAgICAgICBcbiAgICAgICAgICAgIGlmIGZpZWxkID49IDBcbiAgICAgICAgICAgICAgICBzd2l0Y2ggZmllbGRcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgUmVzb3VyY2UgTmFtZVxuICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIEBwYXJhbXMub2JqZWN0VHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gMlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QudGV4dCB8fCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdoZW4gM1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0U3RyaW5nVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QudmlkZW8gfHwgXCJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRTdHJpbmdWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC5pbWFnZSB8fCBcIlwiKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEgIyBQb3NpdGlvbiAtIFhcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXROdW1iZXJWYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC5kc3RSZWN0LngpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMiAjIFBvc2l0aW9uIC0gWVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LmRzdFJlY3QueSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgQW5jaG9yIC0gWFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgTWF0aC5yb3VuZChvYmplY3QuYW5jaG9yLnggKiAxMDApKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDQgIyBBbmNob3IgLSBZXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLnJvdW5kKG9iamVjdC5hbmNob3IueSAqIDEwMCkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNSAjIFpvb20gLSBYXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBNYXRoLnJvdW5kKG9iamVjdC56b29tLnggKiAxMDApKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDYgIyBab29tIC0gWVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgTWF0aC5yb3VuZChvYmplY3Quem9vbS55ICogMTAwKSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA3ICMgU2l6ZSAtIFdpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QuZHN0UmVjdC53aWR0aClcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA4ICMgU2l6ZSAtIEhlaWdodFxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LmRzdFJlY3QuaGVpZ2h0KVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDkgIyBaLUluZGV4XG4gICAgICAgICAgICAgICAgICAgICAgICBAaW50ZXJwcmV0ZXIuc2V0TnVtYmVyVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QuekluZGV4KVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEwICMgT3BhY2l0eVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0Lm9wYWNpdHkpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTEgIyBBbmdsZVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LmFuZ2xlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEyICMgVmlzaWJsZVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldEJvb2xlYW5WYWx1ZVRvKEBwYXJhbXMudGFyZ2V0VmFyaWFibGUsIG9iamVjdC52aXNpYmxlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEzICMgQmxlbmQgTW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgQGludGVycHJldGVyLnNldE51bWJlclZhbHVlVG8oQHBhcmFtcy50YXJnZXRWYXJpYWJsZSwgb2JqZWN0LmJsZW5kTW9kZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxNCAjIEZsaXBwZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIEBpbnRlcnByZXRlci5zZXRCb29sZWFuVmFsdWVUbyhAcGFyYW1zLnRhcmdldFZhcmlhYmxlLCBvYmplY3QubWlycm9yKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNldE9iamVjdERhdGFcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgICAgXG4gICAgY29tbWFuZFNldE9iamVjdERhdGE6IC0+XG4gICAgICAgIHNjZW5lID0gU2NlbmVNYW5hZ2VyLnNjZW5lXG4gICAgICAgIHN3aXRjaCBAcGFyYW1zLm9iamVjdFR5cGVcbiAgICAgICAgICAgIHdoZW4gMCAjIFBpY3R1cmVcbiAgICAgICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VQaWN0dXJlRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IFNjZW5lTWFuYWdlci5zY2VuZS5waWN0dXJlc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgICAgICB3aGVuIDEgIyBCYWNrZ3JvdW5kXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmJhY2tncm91bmRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubGF5ZXIpXVxuICAgICAgICAgICAgd2hlbiAyICMgVGV4dFxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZVRleHREb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnRleHRzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgIHdoZW4gMyAjIE1vdmllXG4gICAgICAgICAgICAgICAgc2NlbmUuYmVoYXZpb3IuY2hhbmdlVmlkZW9Eb21haW4oQHBhcmFtcy5udW1iZXJEb21haW4pXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLnZpZGVvc1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgICAgICB3aGVuIDQgIyBDaGFyYWN0ZXJcbiAgICAgICAgICAgICAgICBjaGFyYWN0ZXJJZCA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMuY2hhcmFjdGVySWQpXG4gICAgICAgICAgICAgICAgb2JqZWN0ID0gU2NlbmVNYW5hZ2VyLnNjZW5lLmNoYXJhY3RlcnMuZmlyc3QgKHYpID0+ICF2LmRpc3Bvc2VkIGFuZCB2LnJpZCA9PSBjaGFyYWN0ZXJJZFxuICAgICAgICAgICAgd2hlbiA1ICMgTWVzc2FnZSBCb3hcbiAgICAgICAgICAgICAgICBvYmplY3QgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcIm1lc3NhZ2VCb3hcIilcbiAgICAgICAgICAgIHdoZW4gNiAjIE1lc3NhZ2UgQXJlYVxuICAgICAgICAgICAgICAgIHNjZW5lLmJlaGF2aW9yLmNoYW5nZU1lc3NhZ2VBcmVhRG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICAgICAgICAgIGFyZWEgPSBTY2VuZU1hbmFnZXIuc2NlbmUubWVzc2FnZUFyZWFzW0BpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyKV1cbiAgICAgICAgICAgICAgICBvYmplY3QgPSBhcmVhPy5sYXlvdXRcbiAgICAgICAgICAgIHdoZW4gNyAjIEhvdHNwb3RcbiAgICAgICAgICAgICAgICBzY2VuZS5iZWhhdmlvci5jaGFuZ2VIb3RzcG90RG9tYWluKEBwYXJhbXMubnVtYmVyRG9tYWluKVxuICAgICAgICAgICAgICAgIG9iamVjdCA9IFNjZW5lTWFuYWdlci5zY2VuZS5ob3RzcG90c1tAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlcildXG4gICAgICAgICAgICAgICAgXG4gICAgICAgIFxuICAgICAgICBmaWVsZCA9IEBwYXJhbXMuZmllbGRcbiAgICAgICAgaWYgQHBhcmFtcy5vYmplY3RUeXBlID09IDQgIyBDaGFyYWN0ZXJcbiAgICAgICAgICAgIHN3aXRjaCBmaWVsZFxuICAgICAgICAgICAgICAgIHdoZW4gMCAjIE5hbWVcbiAgICAgICAgICAgICAgICAgICAgbmFtZSA9IEBpbnRlcnByZXRlci5zdHJpbmdWYWx1ZU9mKEBwYXJhbXMudGV4dFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICBpZiBvYmplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QubmFtZSA9IG5hbWVcbiAgICAgICAgICAgICAgICAgICAgUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzW2NoYXJhY3RlcklkXT8ubmFtZSA9IG5hbWVcbiAgICAgICAgICAgIGZpZWxkLS1cbiAgICAgICAgICAgIFxuICAgICAgICBpZiBvYmplY3Q/ICAgICAgICBcbiAgICAgICAgICAgIGlmIGZpZWxkID49IDBcbiAgICAgICAgICAgICAgICBzd2l0Y2ggZmllbGRcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAwICMgUmVzb3VyY2UgTmFtZSAvIFRleHRcbiAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCBAcGFyYW1zLm9iamVjdFR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnRleHQgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3aGVuIDNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnZpZGVvID0gQGludGVycHJldGVyLnN0cmluZ1ZhbHVlT2YoQHBhcmFtcy50ZXh0VmFsdWUpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuaW1hZ2UgPSBAaW50ZXJwcmV0ZXIuc3RyaW5nVmFsdWVPZihAcGFyYW1zLnRleHRWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAxICMgUG9zaXRpb24gLSBYXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuZHN0UmVjdC54ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAyICMgUG9zaXRpb24gLSBZXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuZHN0UmVjdC55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiAzICMgQW5jaG9yIC0gWFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFuY2hvci54ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSkgLyAxMDBcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA0ICMgQW5jaG9yIC0gWVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFuY2hvci55ID0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSkgLyAxMDBcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA1ICMgWm9vbSAtIFhcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC56b29tLnggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKSAvIDEwMFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDYgIyBab29tIC0gWVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lnpvb20ueSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpIC8gMTAwXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gNyAjIFotSW5kZXhcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC56SW5kZXggPSBAaW50ZXJwcmV0ZXIubnVtYmVyVmFsdWVPZihAcGFyYW1zLm51bWJlclZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDggIyBPcGFjaXR5XG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3Qub3BhY2l0eT0gQGludGVycHJldGVyLm51bWJlclZhbHVlT2YoQHBhcmFtcy5udW1iZXJWYWx1ZSlcbiAgICAgICAgICAgICAgICAgICAgd2hlbiA5ICMgQW5nbGVcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5hbmdsZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpXG4gICAgICAgICAgICAgICAgICAgIHdoZW4gMTAgIyBWaXNpYmxlXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QudmlzaWJsZSA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKVxuICAgICAgICAgICAgICAgICAgICB3aGVuIDExICMgQmxlbmQgTW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmJsZW5kTW9kZSA9IEBpbnRlcnByZXRlci5udW1iZXJWYWx1ZU9mKEBwYXJhbXMubnVtYmVyVmFsdWUpICAgIFxuICAgICAgICAgICAgICAgICAgICB3aGVuIDEyICMgRmxpcHBlZFxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lm1pcnJvciA9IEBpbnRlcnByZXRlci5ib29sZWFuVmFsdWVPZihAcGFyYW1zLnN3aXRjaFZhbHVlKSAgXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhbmdlU291bmRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIGNvbW1hbmRDaGFuZ2VTb3VuZHM6IC0+XG4gICAgICAgIHNvdW5kcyA9IFJlY29yZE1hbmFnZXIuc3lzdGVtLnNvdW5kc1xuICAgICAgICBmaWVsZEZsYWdzID0gQHBhcmFtcy5maWVsZEZsYWdzIHx8IHt9XG4gICAgICAgIFxuICAgICAgICBmb3Igc291bmQsIGkgaW4gQHBhcmFtcy5zb3VuZHNcbiAgICAgICAgICAgIGlmICFncy5Db21tYW5kRmllbGRGbGFncy5pc0xvY2tlZChmaWVsZEZsYWdzW1wic291bmRzLlwiK2ldKVxuICAgICAgICAgICAgICAgIHNvdW5kc1tpXSA9IEBwYXJhbXMuc291bmRzW2ldXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kQ2hhbmdlQ29sb3JzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgICAgXG4gICAgY29tbWFuZENoYW5nZUNvbG9yczogLT5cbiAgICAgICAgY29sb3JzID0gUmVjb3JkTWFuYWdlci5zeXN0ZW0uY29sb3JzXG4gICAgICAgIGZpZWxkRmxhZ3MgPSBAcGFyYW1zLmZpZWxkRmxhZ3MgfHwge31cbiAgICAgICAgXG4gICAgICAgIGZvciBjb2xvciwgaSBpbiBAcGFyYW1zLmNvbG9yc1xuICAgICAgICAgICAgaWYgIWdzLkNvbW1hbmRGaWVsZEZsYWdzLmlzTG9ja2VkKGZpZWxkRmxhZ3NbXCJjb2xvcnMuXCIraV0pXG4gICAgICAgICAgICAgICAgY29sb3JzW2ldID0gbmV3IGdzLkNvbG9yKEBwYXJhbXMuY29sb3JzW2ldKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZENoYW5nZVNjcmVlbkN1cnNvclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICAgICAgIFxuICAgIGNvbW1hbmRDaGFuZ2VTY3JlZW5DdXJzb3I6IC0+XG4gICAgICAgIGlmIEBwYXJhbXMuZ3JhcGhpYz8ubmFtZT9cbiAgICAgICAgICAgIGJpdG1hcCA9IFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9QaWN0dXJlcy8je0BwYXJhbXMuZ3JhcGhpYy5uYW1lfVwiKVxuICAgICAgICAgICAgR3JhcGhpY3Muc2V0Q3Vyc29yQml0bWFwKGJpdG1hcCwgQHBhcmFtcy5oeCwgQHBhcmFtcy5oeSlcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgR3JhcGhpY3Muc2V0Q3Vyc29yQml0bWFwKG51bGwsIDAsIDApXG4gICAgXG4gICAgIyMjKlxuICAgICogQG1ldGhvZCBjb21tYW5kUmVzZXRHbG9iYWxEYXRhXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICBcbiAgICBjb21tYW5kUmVzZXRHbG9iYWxEYXRhOiAtPlxuICAgICAgICBHYW1lTWFuYWdlci5yZXNldEdsb2JhbERhdGEoKVxuICAgIFxuICAgICMjIypcbiAgICAqIEBtZXRob2QgY29tbWFuZFNjcmlwdFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICBcbiAgICBjb21tYW5kU2NyaXB0OiAtPlxuICAgICAgICB0cnlcbiAgICAgICAgICAgIGlmICFAcGFyYW1zLnNjcmlwdEZ1bmNcbiAgICAgICAgICAgICAgICBAcGFyYW1zLnNjcmlwdEZ1bmMgPSBldmFsKFwiKGZ1bmN0aW9uKCl7XCIgKyBAcGFyYW1zLnNjcmlwdCArIFwifSlcIilcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIEBwYXJhbXMuc2NyaXB0RnVuYygpXG4gICAgICAgIGNhdGNoIGV4XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhleClcbiAgICAgICAgICAgIFxud2luZG93LkNvbW1hbmRJbnRlcnByZXRlciA9IENvbXBvbmVudF9Db21tYW5kSW50ZXJwcmV0ZXJcbmdzLkNvbXBvbmVudF9Db21tYW5kSW50ZXJwcmV0ZXIgPSBDb21wb25lbnRfQ29tbWFuZEludGVycHJldGVyXG4gICAgXG4gICAgICAgIFxuICAgICAgICAiXX0=
//# sourceURL=Component_CommandInterpreter_166.js