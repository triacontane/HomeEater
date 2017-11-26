var GameManager;

GameManager = (function() {

  /**
  * Manages all general things around the game like holding the game settings,
  * manages the save/load of a game, etc.
  *
  * @module gs
  * @class GameManager
  * @memberof gs
  * @constructor
   */
  function GameManager() {

    /**
    * The current scene data.
    * @property sceneData
    * @type Object
     */
    this.sceneData = {};

    /**
    * The scene viewport containing all visual objects which are part of the scene and influenced
    * by the in-game camera.
    * @property sceneViewport
    * @type gs.Object_Viewport
     */
    this.sceneViewport = null;

    /**
    * The list of common events.
    * @property commonEvents
    * @type gs.Object_CommonEvent[]
     */
    this.commonEvents = [];

    /**
    * Indicates if the GameManager is initialized.
    * @property commonEvents
    * @type gs.Object_CommonEvent[]
     */
    this.initialized = false;

    /**
    * Temporary game settings.
    * @property tempSettings
    * @type Object
     */
    this.tempSettings = {
      skip: false,
      skipTime: 5,
      loadMenuAccess: true,
      menuAccess: true,
      backlogAccess: true,
      saveMenuAccess: true,
      messageFading: {
        animation: {
          type: 1
        },
        duration: 15,
        easing: null
      }

      /**
      * Temporary game fields.
      * @property tempFields
      * @type Object
       */
    };
    this.tempFields = null;

    /**
    * Stores default values for backgrounds, pictures, etc.
    * @property defaults
    * @type Object
     */
    this.defaults = {
      background: {
        "duration": 30,
        "origin": 0,
        "zOrder": 0,
        "loopVertical": 0,
        "loopHorizontal": 0,
        "easing": {
          "type": 0,
          "inOut": 1
        },
        "animation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "motionBlur": {
          "enabled": 0,
          "delay": 2,
          "opacity": 100,
          "dissolveSpeed": 3
        }
      },
      picture: {
        "appearDuration": 30,
        "disappearDuration": 30,
        "origin": 0,
        "zOrder": 0,
        "appearEasing": {
          "type": 0,
          "inOut": 1
        },
        "disappearEasing": {
          "type": 0,
          "inOut": 1
        },
        "appearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "disappearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "motionBlur": {
          "enabled": 0,
          "delay": 2,
          "opacity": 100,
          "dissolveSpeed": 3
        }
      },
      character: {
        "expressionDuration": 0,
        "appearDuration": 40,
        "disappearDuration": 40,
        "origin": 0,
        "zOrder": 0,
        "appearEasing": {
          "type": 2,
          "inOut": 2
        },
        "disappearEasing": {
          "type": 1,
          "inOut": 1
        },
        "appearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "disappearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "motionBlur": {
          "enabled": 0,
          "delay": 2,
          "opacity": 100,
          "dissolveSpeed": 3
        },
        "changeAnimation": {
          "type": 1,
          "movement": 0,
          "fading": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "changeEasing": {
          "type": 2,
          "inOut": 2
        }
      },
      text: {
        "appearDuration": 30,
        "disappearDuration": 30,
        "positionOrigin": 0,
        "origin": 0,
        "zOrder": 0,
        "appearEasing": {
          "type": 0,
          "inOut": 1
        },
        "disappearEasing": {
          "type": 0,
          "inOut": 1
        },
        "appearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "disappearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "motionBlur": {
          "enabled": 0,
          "delay": 2,
          "opacity": 100,
          "dissolveSpeed": 3
        }
      },
      video: {
        "appearDuration": 30,
        "disappearDuration": 30,
        "origin": 0,
        "zOrder": 0,
        "appearEasing": {
          "type": 0,
          "inOut": 1
        },
        "disappearEasing": {
          "type": 0,
          "inOut": 1
        },
        "appearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "disappearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "motionBlur": {
          "enabled": 0,
          "delay": 2,
          "opacity": 100,
          "dissolveSpeed": 3
        }
      },
      live2d: {
        "motionFadeInTime": 1000,
        "appearDuration": 30,
        "disappearDuration": 30,
        "zOrder": 0,
        "appearEasing": {
          "type": 0,
          "inOut": 1
        },
        "disappearEasing": {
          "type": 0,
          "inOut": 1
        },
        "appearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "disappearAnimation": {
          "type": 1,
          "movement": 0,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        }
      },
      messageBox: {
        "appearDuration": 30,
        "disappearDuration": 30,
        "zOrder": 0,
        "appearEasing": {
          "type": 0,
          "inOut": 1
        },
        "disappearEasing": {
          "type": 0,
          "inOut": 1
        },
        "appearAnimation": {
          "type": 0,
          "movement": 3,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        },
        "disappearAnimation": {
          "type": 0,
          "movement": 3,
          "mask": {
            "graphic": null,
            "vague": 30
          }
        }
      },
      audio: {
        "musicFadeInDuration": 0,
        "musicFadeOutDuration": 0,
        "musicVolume": 100,
        "musicPlaybackRate": 100,
        "soundVolume": 100,
        "soundPlaybackRate": 100,
        "voiceVolume": 100,
        "voicePlaybackRate": 100
      }
    };

    /**
    * The game's backlog.
    * @property backlog
    * @type Object[]
     */
    this.backlog = [];

    /**
    * Character parameters by character ID.
    * @property characterParams
    * @type Object[]
     */
    this.characterParams = [];

    /**
    * The game's chapter
    * @property chapters
    * @type gs.Document[]
     */
    this.chapters = [];

    /**
    * The game's current displayed messages. Especially in NVL mode the messages 
    * of the current page are stored here.
    * @property messages
    * @type Object[]
     */
    this.messages = [];

    /**
    * Count of save slots. Default is 100.
    * @property saveSlotCount
    * @type number
     */
    this.saveSlotCount = 100;

    /**
    * The index of save games. Contains the header-info for each save game slot.
    * @property saveGameSlots
    * @type Object[]
     */
    this.saveGameSlots = [];

    /**
    * Stores global data like the state of persistent game variables.
    * @property globalData
    * @type Object
     */
    this.globalData = null;

    /**
    * Indicates if the game runs in editor's live-preview.
    * @property inLivePreview
    * @type Object
     */
    this.inLivePreview = false;
  }


  /**
  * Initializes the GameManager, should be called before the actual game starts.
  *
  * @method initialize
   */

  GameManager.prototype.initialize = function() {
    var character, i, j, k, l, len, len1, param, ref, ref1, ref2, ref3, ref4, ref5, ref6;
    this.initialized = true;
    this.inLivePreview = $PARAMS.preview != null;
    this.saveSlotCount = RecordManager.system.saveSlotCount || 100;
    this.tempFields = new gs.GameTemp();
    window.$tempFields = this.tempFields;
    this.createSaveGameIndex();
    this.variableStore = new gs.VariableStore();
    this.variableStore.setupDomains(DataManager.getDocumentsByType("global_variables").select(function(v) {
      return v.items.domain || "";
    }));
    this.variableStore.persistentNumbers = (ref = this.globalData.persistentNumbers) != null ? ref : this.variableStore.persistentNumbers;
    this.variableStore.persistentBooleans = (ref1 = this.globalData.persistentBooleans) != null ? ref1 : this.variableStore.persistentBooleans;
    this.variableStore.persistentStrings = (ref2 = this.globalData.persistentStrings) != null ? ref2 : this.variableStore.persistentStrings;
    this.variableStore.persistentLists = (ref3 = this.globalData.persistentLists) != null ? ref3 : this.variableStore.persistentLists;
    this.sceneViewport = new gs.Object_Viewport(new Viewport(0, 0, Graphics.width, Graphics.height, Graphics.viewport));
    ref4 = RecordManager.charactersArray;
    for (j = 0, len = ref4.length; j < len; j++) {
      character = ref4[j];
      if (character != null) {
        this.characterParams[character.index] = {};
        if (character.params != null) {
          ref5 = character.params;
          for (k = 0, len1 = ref5.length; k < len1; k++) {
            param = ref5[k];
            this.characterParams[character.index][param.name] = param.value;
          }
        }
      }
    }
    this.setupCommonEvents();
    for (i = l = 0, ref6 = RecordManager.characters; 0 <= ref6 ? l < ref6 : l > ref6; i = 0 <= ref6 ? ++l : --l) {
      this.settings.voicesPerCharacter[i] = 100;
    }
    this.chapters = DataManager.getDocumentsByType("vn.chapter");
    return this.chapters.sort(function(a, b) {
      if (a.items.order > b.items.order) {
        return 1;
      } else if (a.items.order < b.items.order) {
        return -1;
      } else {
        return 0;
      }
    });
  };


  /**
  * Sets up common events.
  *
  * @method setupCommonEvents
   */

  GameManager.prototype.setupCommonEvents = function() {
    var event, j, k, len, len1, object, ref, ref1, results;
    ref = this.commonEvents;
    for (j = 0, len = ref.length; j < len; j++) {
      event = ref[j];
      if (event != null) {
        event.dispose();
      }
    }
    this.commonEvents = [];
    ref1 = RecordManager.commonEvents;
    results = [];
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      event = ref1[k];
      if (!event) {
        continue;
      }
      if (event.startCondition === 1 && event.autoPreload) {
        gs.ResourceLoader.loadEventCommandsGraphics(event.commands);
      }
      object = new gs.Object_CommonEvent();
      object.record = event;
      object.rid = event.index;
      this.commonEvents[event.index] = object;
      results.push(this.commonEvents.push(object));
    }
    return results;
  };


  /**
  * Sets up cursor depending on system settings.
  *
  * @method setupCursor
   */

  GameManager.prototype.setupCursor = function() {
    var bitmap, ref;
    if ((ref = RecordManager.system.cursor) != null ? ref.name : void 0) {
      bitmap = ResourceManager.getBitmap("Graphics/Pictures/" + RecordManager.system.cursor.name);
      return Graphics.setCursorBitmap(bitmap, RecordManager.system.cursor.hx, RecordManager.system.cursor.hy);
    } else {
      return Graphics.setCursorBitmap(null);
    }
  };


  /**
  * Disposes the GameManager. Should be called before quit the game.
  *
  * @method dispose
   */

  GameManager.prototype.dispose = function() {};


  /**
  * Quits the game. The implementation depends on the platform. So for example on mobile
  * devices this method has no effect.
  *
  * @method exit
   */

  GameManager.prototype.exit = function() {
    return Application.exit();
  };


  /**
  * Resets the GameManager by disposing and re-initializing it.
  *
  * @method reset
   */

  GameManager.prototype.reset = function() {
    this.initialized = false;
    this.interpreter = null;
    this.dispose();
    return this.initialize();
  };


  /**
  * Starts a new game.
  *
  * @method newGame
   */

  GameManager.prototype.newGame = function() {
    this.messages = [];
    this.variableStore.clearAllGlobalVariables();
    this.variableStore.clearAllLocalVariables();
    this.tempSettings.skip = false;
    this.tempFields.clear();
    this.tempFields.inGame = true;
    this.setupCommonEvents();
    this.tempSettings.menuAccess = true;
    this.tempSettings.saveMenuAccess = true;
    this.tempSettings.loadMenuAccess = true;
    return this.tempSettings.backlogAccess = true;
  };


  /**
  * Exists the game and resets the GameManager which is important before going back to
  * the main menu or title screen.
  *
  * @method exitGame
   */

  GameManager.prototype.exitGame = function() {
    this.tempFields.inGame = false;
    return this.tempFields.isExitingGame = true;
  };


  /**
  * Updates the GameManager. Should be called once per frame.
  *
  * @method update
   */

  GameManager.prototype.update = function() {};


  /**
  * Creates the index of all save-games. Should be called whenever a new save game
  * is created.
  *
  * @method createSaveGameIndex
  * @protected
   */

  GameManager.prototype.createSaveGameIndex = function() {
    var chaper, chapter, header, i, image, j, ref, scene;
    this.saveGameSlots = [];
    for (i = j = 0, ref = this.saveSlotCount; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      if (GameStorage.exists("SaveGame_" + i + "_Header")) {
        header = GameStorage.getObject("SaveGame_" + i + "_Header");
        chapter = DataManager.getDocument(header.chapterUid);
        scene = DataManager.getDocumentSummary(header.sceneUid);
        image = header.image;
      } else {
        header = null;
        chaper = null;
        scene = null;
      }
      if ((chapter != null) && (scene != null) && !this.inLivePreview) {
        this.saveGameSlots.push({
          date: header.date,
          chapter: chapter.items.name || "DELETED",
          scene: scene.items.name || "DELETED",
          image: image
        });
      } else {
        this.saveGameSlots.push({
          "date": "",
          "chapter": "",
          "scene": "",
          "image": null
        });
      }
    }
    return this.saveGameSlots;
  };


  /**
  * Resets the game's settings to its default values.
  *
  * @method resetSettings
   */

  GameManager.prototype.resetSettings = function() {
    var i, j, ref;
    this.settings = {
      version: 338,
      renderer: 0,
      filter: 1,
      confirmation: true,
      adjustAspectRatio: false,
      allowSkip: true,
      allowSkipUnreadMessages: true,
      allowVideoSkip: true,
      skipVoiceOnAction: true,
      allowChoiceSkip: false,
      voicesByCharacter: [],
      timeMessageToVoice: true,
      "autoMessage": {
        enabled: false,
        time: 0,
        waitForVoice: true,
        stopOnAction: false
      },
      "voiceEnabled": true,
      "bgmEnabled": true,
      "soundEnabled": true,
      "voiceVolume": 100,
      "bgmVolume": 100,
      "seVolume": 100,
      "messageSpeed": 4,
      "fullScreen": false,
      "aspectRatio": 0
    };
    this.saveGameSlots = [];
    for (i = j = 0, ref = this.saveSlotCount; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
      GameStorage.remove("SaveGame_" + i + "_Header");
      GameStorage.remove("SaveGame_" + i);
      this.saveGameSlots.push({
        "date": "",
        "chapter": "",
        "scene": "",
        "thumb": ""
      });
    }
    GameStorage.setObject("settings", this.settings);
    this.globalData = {
      messages: {},
      cgGallery: {}
    };
    return GameStorage.setObject("globalData", this.globalData);
  };


  /**
  * Saves current game settings.
  *
  * @method saveSettings
   */

  GameManager.prototype.saveSettings = function() {
    return GameStorage.setObject("settings", this.settings);
  };


  /**
  * Saves current global data.
  *
  * @method saveGlobalData
   */

  GameManager.prototype.saveGlobalData = function() {
    this.globalData.persistentNumbers = this.variableStore.persistentNumbers;
    this.globalData.persistentLists = this.variableStore.persistentLists;
    this.globalData.persistentBooleans = this.variableStore.persistentBooleans;
    this.globalData.persistentStrings = this.variableStore.persistentStrings;
    return GameStorage.setObject("globalData", this.globalData);
  };


  /**
  * Resets current global data. All stored data about read messages, persistent variables and
  * CG gallery will be deleted.
  *
  * @method resetGlobalData
   */

  GameManager.prototype.resetGlobalData = function() {
    var cg, i, j, len, ref;
    this.globalData = {
      messages: {},
      cgGallery: {}
    };
    ref = RecordManager.cgGalleryArray;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      cg = ref[i];
      if (cg != null) {
        this.globalData.cgGallery[cg.index] = {
          unlocked: false
        };
      }
    }
    return GameStorage.setObject("globalData", this.globalData);
  };

  GameManager.prototype.readSaveGame = function(saveGame) {};

  GameManager.prototype.writeSaveGame = function(saveGame) {};

  GameManager.prototype.prepareSaveGame = function(snapshot) {
    var context, messageBoxIds, messageBoxes, messageIds, messages, saveGame, sceneData;
    if (snapshot) {
      snapshot = ResourceManager.getCustomBitmap("$snapshot");
      if (snapshot != null) {
        snapshot.dispose();
      }
      ResourceManager.setCustomBitmap("$snapshot", Graphics.snapshot());
    }
    context = new gs.ObjectCodecContext();
    context.decodedObjectStore.push(Graphics.viewport);
    context.decodedObjectStore.push(this.scene);
    context.decodedObjectStore.push(this.scene.behavior);
    messageBoxIds = ["messageBox", "nvlMessageBox", "messageMenu"];
    messageIds = ["gameMessage_message", "gameMessageNVL_message"];
    messageBoxes = messageBoxIds.select((function(_this) {
      return function(id) {
        return _this.scene.behavior.objectManager.objectById(id);
      };
    })(this));
    messages = messageIds.select((function(_this) {
      return function(id) {
        return _this.scene.behavior.objectManager.objectById(id);
      };
    })(this));
    sceneData = {};
    saveGame = {};
    saveGame.encodedObjectStore = null;
    saveGame.sceneUid = this.scene.sceneDocument.uid;
    saveGame.data = {
      resourceContext: this.scene.behavior.resourceContext.toDataBundle(),
      currentCharacter: this.scene.currentCharacter,
      characterParams: this.characterParams,
      frameCount: Graphics.frameCount,
      tempFields: this.tempFields,
      viewport: this.scene.viewport,
      characters: this.scene.characters,
      characterNames: RecordManager.charactersArray.select(function(c) {
        return {
          name: c.name,
          index: c.index
        };
      }),
      backgrounds: this.scene.backgrounds,
      pictures: this.scene.pictureContainer.subObjectsByDomain,
      texts: this.scene.textContainer.subObjectsByDomain,
      videos: this.scene.videoContainer.subObjectsByDomain,
      viewports: this.scene.viewportContainer.subObjects,
      commonEvents: this.scene.commonEventContainer.subObjects,
      hotspots: this.scene.hotspotContainer.subObjectsByDomain,
      interpreter: this.scene.interpreter,
      messageBoxes: messageBoxes.select((function(_this) {
        return function(mb, i) {
          return {
            visible: mb.visible,
            id: mb.id,
            message: messages[i]
          };
        };
      })(this)),
      backlog: this.backlog,
      variableStore: this.variableStore,
      defaults: this.defaults,
      transitionData: SceneManager.transitionData,
      audio: {
        audioBuffers: AudioManager.audioBuffers,
        audioBuffersByLayer: AudioManager.audioBuffersByLayer,
        audioLayers: AudioManager.audioLayers,
        soundReferences: AudioManager.soundReferences
      },
      messageAreas: this.scene.messageAreaContainer.subObjectsByDomain
    };
    saveGame.data = gs.ObjectCodec.encode(saveGame.data, context);
    saveGame.encodedObjectStore = context.encodedObjectStore;
    return this.saveGame = saveGame;
  };

  GameManager.prototype.createSaveGameSlot = function(header) {
    var slot;
    slot = {
      "date": new Date().toDateString(),
      "chapter": this.scene.chapter.items.name,
      "scene": this.scene.sceneDocument.items.name,
      "image": header.image
    };
    return slot;
  };

  GameManager.prototype.createSaveGameHeader = function(thumbWidth, thumbHeight) {
    var header, thumbImage;
    thumbImage = this.createSaveGameThumbImage(thumbWidth, thumbHeight);
    header = {
      "date": new Date().toDateString(),
      "chapterUid": this.scene.chapter.uid,
      "sceneUid": this.scene.sceneDocument.uid,
      "image": thumbImage != null ? thumbImage.image.toDataURL() : void 0
    };
    if (thumbImage != null) {
      thumbImage.dispose();
    }
    return header;
  };

  GameManager.prototype.createSaveGameThumbImage = function(width, height) {
    var snapshot, thumbImage;
    snapshot = ResourceManager.getBitmap("$snapshot");
    thumbImage = null;
    if (snapshot) {
      if (width && height) {
        thumbImage = new Bitmap(width, height);
      } else {
        thumbImage = new Bitmap(Graphics.width / 8, Graphics.height / 8);
      }
      thumbImage.stretchBlt(new Rect(0, 0, thumbImage.width, thumbImage.height), snapshot, new Rect(0, 0, snapshot.width, snapshot.height));
    }
    return thumbImage;
  };

  GameManager.prototype.storeSaveGame = function(name, saveGame, header) {
    if (header) {
      GameStorage.setData(name + "_Header", JSON.stringify(header));
    }
    return GameStorage.setData(name, JSON.stringify(saveGame));
  };


  /**
  * Saves the current game at the specified slot.
  *
  * @method save
  * @param {number} slot - The slot where the game should be saved at.
  * @param {number} thumbWidth - The width for the snapshot-thumb. You can specify <b>null</b> or 0 to use an auto calculated width.
  * @param {number} thumbHeight - The height for the snapshot-thumb. You can specify <b>null</b> or 0 to use an auto calculated height.
   */

  GameManager.prototype.save = function(slot, thumbWidth, thumbHeight) {
    var header;
    if (this.saveGame) {
      header = this.createSaveGameHeader(thumbWidth, thumbHeight);
      this.saveGameSlots[slot] = this.createSaveGameSlot(header);
      this.storeSaveGame("SaveGame_" + slot, this.saveGame, header);
      this.sceneData = {};
      return this.saveGame;
    }
  };

  GameManager.prototype.restore = function(saveGame) {
    this.backlog = saveGame.data.backlog;
    this.defaults = saveGame.data.defaults;
    this.variableStore = saveGame.data.variableStore;
    this.sceneData = saveGame.data;
    this.saveGame = null;
    this.loadedSaveGame = null;
    this.tempFields = saveGame.data.tempFields;
    this.characterParams = saveGame.data.characterParams;
    window.$tempFields = this.tempFields;
    return window.$dataFields.backlog = this.backlog;
  };

  GameManager.prototype.prepareLoadGame = function() {
    return AudioManager.stopAllMusic(30);
  };


  /**
  * Loads the game from the specified save game slot. This method triggers
  * a automatic scene change.
  *
  * @method load
  * @param {number} slot - The slot where the game should be loaded from.
   */

  GameManager.prototype.load = function(slot) {
    if (!this.saveGameSlots[slot] || this.saveGameSlots[slot].date.trim().length === 0) {
      return;
    }
    this.prepareLoadGame();
    this.loadedSaveGame = this.loadSaveGame("SaveGame_" + slot);
    SceneManager.switchTo(new vn.Object_Scene());
    return SceneManager.clear();
  };

  GameManager.prototype.loadSaveGame = function(name) {
    return JSON.parse(GameStorage.getData(name));
  };


  /**
  * Gets the save game data for a specified slot.
  *
  * @method getSaveGame
  * @param {number} slot - The slot to get the save data from.
  * @return {Object} The save game data.
   */

  GameManager.prototype.getSaveGame = function(slot) {
    return JSON.parse(GameStorage.getData("SaveGame_" + slot));
  };

  return GameManager;

})();

window.GameManager = new GameManager();

gs.GameManager = window.GameManager;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUE7O0FBQU07O0FBQ0Y7Ozs7Ozs7OztFQVNhLHFCQUFBOztBQUNUOzs7OztJQUtBLElBQUMsQ0FBQSxTQUFELEdBQWE7O0FBRWI7Ozs7OztJQU1BLElBQUMsQ0FBQSxhQUFELEdBQWlCOztBQUVqQjs7Ozs7SUFLQSxJQUFDLENBQUEsWUFBRCxHQUFnQjs7QUFFaEI7Ozs7O0lBS0EsSUFBQyxDQUFBLFdBQUQsR0FBZTs7QUFFZjs7Ozs7SUFLQSxJQUFDLENBQUEsWUFBRCxHQUFnQjtNQUFBLElBQUEsRUFBTSxLQUFOO01BQWEsUUFBQSxFQUFVLENBQXZCO01BQTBCLGNBQUEsRUFBZ0IsSUFBMUM7TUFBZ0QsVUFBQSxFQUFZLElBQTVEO01BQWtFLGFBQUEsRUFBZSxJQUFqRjtNQUF1RixjQUFBLEVBQWdCLElBQXZHO01BQTZHLGFBQUEsRUFBZTtRQUFFLFNBQUEsRUFBVztVQUFFLElBQUEsRUFBTSxDQUFSO1NBQWI7UUFBMEIsUUFBQSxFQUFVLEVBQXBDO1FBQXdDLE1BQUEsRUFBUSxJQUFoRDs7O0FBRTVJOzs7O1NBRmdCOztJQU9oQixJQUFDLENBQUEsVUFBRCxHQUFjOztBQUVkOzs7OztJQUtBLElBQUMsQ0FBQSxRQUFELEdBQVk7TUFDUixVQUFBLEVBQVk7UUFBRSxVQUFBLEVBQVksRUFBZDtRQUFrQixRQUFBLEVBQVUsQ0FBNUI7UUFBK0IsUUFBQSxFQUFVLENBQXpDO1FBQTRDLGNBQUEsRUFBZ0IsQ0FBNUQ7UUFBK0QsZ0JBQUEsRUFBa0IsQ0FBakY7UUFBb0YsUUFBQSxFQUFVO1VBQUUsTUFBQSxFQUFRLENBQVY7VUFBYSxPQUFBLEVBQVMsQ0FBdEI7U0FBOUY7UUFBeUgsV0FBQSxFQUFhO1VBQUUsTUFBQSxFQUFRLENBQVY7VUFBYSxVQUFBLEVBQVksQ0FBekI7VUFBNEIsTUFBQSxFQUFRO1lBQUUsU0FBQSxFQUFXLElBQWI7WUFBbUIsT0FB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QUFBLEVBQUUsQ0FBQyxZQUFILENBQUEsQ0FBMUI7V0FDQSxZQUFZLENBQUMsS0FBYixDQUFBO0VBUkU7O3dCQVdOLFlBQUEsR0FBYyxTQUFDLElBQUQ7V0FBVSxJQUFJLENBQUMsS0FBTCxDQUFXLFdBQVcsQ0FBQyxPQUFaLENBQW9CLElBQXBCLENBQVg7RUFBVjs7O0FBR2Q7Ozs7Ozs7O3dCQU9BLFdBQUEsR0FBYSxTQUFDLElBQUQ7V0FBVSxJQUFJLENBQUMsS0FBTCxDQUFXLFdBQVcsQ0FBQyxPQUFaLENBQW9CLFdBQUEsR0FBWSxJQUFoQyxDQUFYO0VBQVY7Ozs7OztBQUVqQixNQUFNLENBQUMsV0FBUCxHQUF5QixJQUFBLFdBQUEsQ0FBQTs7QUFDekIsRUFBRSxDQUFDLFdBQUgsR0FBaUIsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4jXG4jICAgU2NyaXB0OiBHYW1lTWFuYWdlclxuI1xuIyAgICQkQ09QWVJJR0hUJCRcbiNcbiMgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuY2xhc3MgR2FtZU1hbmFnZXJcbiAgICAjIyMqXG4gICAgKiBNYW5hZ2VzIGFsbCBnZW5lcmFsIHRoaW5ncyBhcm91bmQgdGhlIGdhbWUgbGlrZSBob2xkaW5nIHRoZSBnYW1lIHNldHRpbmdzLFxuICAgICogbWFuYWdlcyB0aGUgc2F2ZS9sb2FkIG9mIGEgZ2FtZSwgZXRjLlxuICAgICpcbiAgICAqIEBtb2R1bGUgZ3NcbiAgICAqIEBjbGFzcyBHYW1lTWFuYWdlclxuICAgICogQG1lbWJlcm9mIGdzXG4gICAgKiBAY29uc3RydWN0b3JcbiAgICAjIyNcbiAgICBjb25zdHJ1Y3RvcjogLT5cbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBjdXJyZW50IHNjZW5lIGRhdGEuXG4gICAgICAgICogQHByb3BlcnR5IHNjZW5lRGF0YVxuICAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICAjIyMgXG4gICAgICAgIEBzY2VuZURhdGEgPSB7fVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBzY2VuZSB2aWV3cG9ydCBjb250YWluaW5nIGFsbCB2aXN1YWwgb2JqZWN0cyB3aGljaCBhcmUgcGFydCBvZiB0aGUgc2NlbmUgYW5kIGluZmx1ZW5jZWRcbiAgICAgICAgKiBieSB0aGUgaW4tZ2FtZSBjYW1lcmEuXG4gICAgICAgICogQHByb3BlcnR5IHNjZW5lVmlld3BvcnRcbiAgICAgICAgKiBAdHlwZSBncy5PYmplY3RfVmlld3BvcnRcbiAgICAgICAgIyMjXG4gICAgICAgIEBzY2VuZVZpZXdwb3J0ID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBsaXN0IG9mIGNvbW1vbiBldmVudHMuXG4gICAgICAgICogQHByb3BlcnR5IGNvbW1vbkV2ZW50c1xuICAgICAgICAqIEB0eXBlIGdzLk9iamVjdF9Db21tb25FdmVudFtdXG4gICAgICAgICMjIyBcbiAgICAgICAgQGNvbW1vbkV2ZW50cyA9IFtdXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogSW5kaWNhdGVzIGlmIHRoZSBHYW1lTWFuYWdlciBpcyBpbml0aWFsaXplZC5cbiAgICAgICAgKiBAcHJvcGVydHkgY29tbW9uRXZlbnRzXG4gICAgICAgICogQHR5cGUgZ3MuT2JqZWN0X0NvbW1vbkV2ZW50W11cbiAgICAgICAgIyMjIFxuICAgICAgICBAaW5pdGlhbGl6ZWQgPSBub1xuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRlbXBvcmFyeSBnYW1lIHNldHRpbmdzLlxuICAgICAgICAqIEBwcm9wZXJ0eSB0ZW1wU2V0dGluZ3NcbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgIyMjIFxuICAgICAgICBAdGVtcFNldHRpbmdzID0gc2tpcDogZmFsc2UsIHNraXBUaW1lOiA1LCBsb2FkTWVudUFjY2VzczogdHJ1ZSwgbWVudUFjY2VzczogdHJ1ZSwgYmFja2xvZ0FjY2VzczogdHJ1ZSwgc2F2ZU1lbnVBY2Nlc3M6IHRydWUsIG1lc3NhZ2VGYWRpbmc6IHsgYW5pbWF0aW9uOiB7IHR5cGU6IDEgfSwgZHVyYXRpb246IDE1LCBlYXNpbmc6IG51bGwgfVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRlbXBvcmFyeSBnYW1lIGZpZWxkcy5cbiAgICAgICAgKiBAcHJvcGVydHkgdGVtcEZpZWxkc1xuICAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICAjIyMgXG4gICAgICAgIEB0ZW1wRmllbGRzID0gbnVsbFxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBkZWZhdWx0IHZhbHVlcyBmb3IgYmFja2dyb3VuZHMsIHBpY3R1cmVzLCBldGMuXG4gICAgICAgICogQHByb3BlcnR5IGRlZmF1bHRzXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjI1xuICAgICAgICBAZGVmYXVsdHMgPSB7IFxuICAgICAgICAgICAgYmFja2dyb3VuZDogeyBcImR1cmF0aW9uXCI6IDMwLCBcIm9yaWdpblwiOiAwLCBcInpPcmRlclwiOiAwLCBcImxvb3BWZXJ0aWNhbFwiOiAwLCBcImxvb3BIb3Jpem9udGFsXCI6IDAsIFwiZWFzaW5nXCI6IHsgXCJ0eXBlXCI6IDAsIFwiaW5PdXRcIjogMSB9LCBcImFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxLCBcIm1vdmVtZW50XCI6IDAsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJtb3Rpb25CbHVyXCI6IHsgXCJlbmFibGVkXCI6IDAsIFwiZGVsYXlcIjogMiwgXCJvcGFjaXR5XCI6IDEwMCwgXCJkaXNzb2x2ZVNwZWVkXCI6IDMgfSB9LFxuICAgICAgICAgICAgcGljdHVyZTogeyBcImFwcGVhckR1cmF0aW9uXCI6IDMwLCBcImRpc2FwcGVhckR1cmF0aW9uXCI6IDMwLCBcIm9yaWdpblwiOiAwLCBcInpPcmRlclwiOiAwLCBcImFwcGVhckVhc2luZ1wiOiB7IFwidHlwZVwiOiAwLCBcImluT3V0XCI6IDEgfSwgXCJkaXNhcHBlYXJFYXNpbmdcIjogeyBcInR5cGVcIjogMCwgXCJpbk91dFwiOiAxIH0sIFwiYXBwZWFyQW5pbWF0aW9uXCI6IHsgXCJ0eXBlXCI6IDEsIFwibW92ZW1lbnRcIjogMCwgXCJtYXNrXCI6IHsgXCJncmFwaGljXCI6IG51bGwsIFwidmFndWVcIjogMzAgfSB9LCBcImRpc2FwcGVhckFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxLCBcIm1vdmVtZW50XCI6IDAsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJtb3Rpb25CbHVyXCI6IHsgXCJlbmFibGVkXCI6IDAsIFwiZGVsYXlcIjogMiwgXCJvcGFjaXR5XCI6IDEwMCwgXCJkaXNzb2x2ZVNwZWVkXCI6IDMgfSB9LFxuICAgICAgICAgICAgY2hhcmFjdGVyOiB7IFwiZXhwcmVzc2lvbkR1cmF0aW9uXCI6IDAsIFwiYXBwZWFyRHVyYXRpb25cIjogNDAsIFwiZGlzYXBwZWFyRHVyYXRpb25cIjogNDAsIFwib3JpZ2luXCI6IDAsIFwiek9yZGVyXCI6IDAsIFwiYXBwZWFyRWFzaW5nXCI6IHsgXCJ0eXBlXCI6IDIsIFwiaW5PdXRcIjogMiB9LCBcImRpc2FwcGVhckVhc2luZ1wiOiB7IFwidHlwZVwiOiAxLCBcImluT3V0XCI6IDEgfSwgXCJhcHBlYXJBbmltYXRpb25cIjogeyBcInR5cGVcIjogMSwgXCJtb3ZlbWVudFwiOiAwLCBcIm1hc2tcIjogeyBcImdyYXBoaWNcIjogbnVsbCwgXCJ2YWd1ZVwiOiAzMCB9IH0sIFwiZGlzYXBwZWFyQW5pbWF0aW9uXCI6IHsgXCJ0eXBlXCI6IDEsIFwibW92ZW1lbnRcIjogMCwgXCJtYXNrXCI6IHsgXCJncmFwaGljXCI6IG51bGwsIFwidmFndWVcIjogMzAgfSB9LCBcIm1vdGlvbkJsdXJcIjogeyBcImVuYWJsZWRcIjogMCwgXCJkZWxheVwiOiAyLCBcIm9wYWNpdHlcIjogMTAwLCBcImRpc3NvbHZlU3BlZWRcIjogMyB9LCBcImNoYW5nZUFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxLCBcIm1vdmVtZW50XCI6IDAsIFwiZmFkaW5nXCI6IDAsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJjaGFuZ2VFYXNpbmdcIjogeyBcInR5cGVcIjogMiwgXCJpbk91dFwiOiAyIH0gfSxcbiAgICAgICAgICAgIHRleHQ6IHsgXCJhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJkaXNhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJwb3NpdGlvbk9yaWdpblwiOiAwLCBcIm9yaWdpblwiOiAwLCBcInpPcmRlclwiOiAwLCBcImFwcGVhckVhc2luZ1wiOiB7IFwidHlwZVwiOiAwLCBcImluT3V0XCI6IDEgfSwgXCJkaXNhcHBlYXJFYXNpbmdcIjogeyBcInR5cGVcIjogMCwgXCJpbk91dFwiOiAxIH0sIFwiYXBwZWFyQW5pbWF0aW9uXCI6IHsgXCJ0eXBlXCI6IDEsIFwibW92ZW1lbnRcIjogMCwgXCJtYXNrXCI6IHsgXCJncmFwaGljXCI6IG51bGwsIFwidmFndWVcIjogMzAgfSB9LCBcImRpc2FwcGVhckFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxLCBcIm1vdmVtZW50XCI6IDAsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJtb3Rpb25CbHVyXCI6IHsgXCJlbmFibGVkXCI6IDAsIFwiZGVsYXlcIjogMiwgXCJvcGFjaXR5XCI6IDEwMCwgXCJkaXNzb2x2ZVNwZWVkXCI6IDMgfSB9LFxuICAgICAgICAgICAgdmlkZW86IHsgXCJhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJkaXNhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJvcmlnaW5cIjogMCwgXCJ6T3JkZXJcIjogMCwgXCJhcHBlYXJFYXNpbmdcIjogeyBcInR5cGVcIjogMCwgXCJpbk91dFwiOiAxIH0sIFwiZGlzYXBwZWFyRWFzaW5nXCI6IHsgXCJ0eXBlXCI6IDAsIFwiaW5PdXRcIjogMSB9LCBcImFwcGVhckFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxLCBcIm1vdmVtZW50XCI6IDAsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJkaXNhcHBlYXJBbmltYXRpb25cIjogeyBcInR5cGVcIjogMSwgXCJtb3ZlbWVudFwiOiAwLCBcIm1hc2tcIjogeyBcImdyYXBoaWNcIjogbnVsbCwgXCJ2YWd1ZVwiOiAzMCB9IH0sIFwibW90aW9uQmx1clwiOiB7IFwiZW5hYmxlZFwiOiAwLCBcImRlbGF5XCI6IDIsIFwib3BhY2l0eVwiOiAxMDAsIFwiZGlzc29sdmVTcGVlZFwiOiAzIH0gfSxcbiAgICAgICAgICAgIGxpdmUyZDogeyBcIm1vdGlvbkZhZGVJblRpbWVcIjogMTAwMCwgXCJhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJkaXNhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJ6T3JkZXJcIjogMCwgXCJhcHBlYXJFYXNpbmdcIjogeyBcInR5cGVcIjogMCwgXCJpbk91dFwiOiAxIH0sIFwiZGlzYXBwZWFyRWFzaW5nXCI6IHsgXCJ0eXBlXCI6IDAsIFwiaW5PdXRcIjogMSB9LCBcImFwcGVhckFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAxLCBcIm1vdmVtZW50XCI6IDAsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJkaXNhcHBlYXJBbmltYXRpb25cIjogeyBcInR5cGVcIjogMSwgXCJtb3ZlbWVudFwiOiAwLCBcIm1hc2tcIjogeyBcImdyYXBoaWNcIjogbnVsbCwgXCJ2YWd1ZVwiOiAzMCB9IH0gfSxcbiAgICAgICAgICAgIG1lc3NhZ2VCb3g6IHsgXCJhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJkaXNhcHBlYXJEdXJhdGlvblwiOiAzMCwgXCJ6T3JkZXJcIjogMCwgXCJhcHBlYXJFYXNpbmdcIjogeyBcInR5cGVcIjogMCwgXCJpbk91dFwiOiAxIH0sIFwiZGlzYXBwZWFyRWFzaW5nXCI6IHsgXCJ0eXBlXCI6IDAsIFwiaW5PdXRcIjogMSB9LCBcImFwcGVhckFuaW1hdGlvblwiOiB7IFwidHlwZVwiOiAwLCBcIm1vdmVtZW50XCI6IDMsIFwibWFza1wiOiB7IFwiZ3JhcGhpY1wiOiBudWxsLCBcInZhZ3VlXCI6IDMwIH0gfSwgXCJkaXNhcHBlYXJBbmltYXRpb25cIjogeyBcInR5cGVcIjogMCwgXCJtb3ZlbWVudFwiOiAzLCBcIm1hc2tcIjogeyBcImdyYXBoaWNcIjogbnVsbCwgXCJ2YWd1ZVwiOiAzMCB9IH0gfSxcbiAgICAgICAgICAgIGF1ZGlvOiB7IFwibXVzaWNGYWRlSW5EdXJhdGlvblwiOiAwLCBcIm11c2ljRmFkZU91dER1cmF0aW9uXCI6IDAsIFwibXVzaWNWb2x1bWVcIjogMTAwLCBcIm11c2ljUGxheWJhY2tSYXRlXCI6IDEwMCwgXCJzb3VuZFZvbHVtZVwiOiAxMDAsIFwic291bmRQbGF5YmFja1JhdGVcIjogMTAwLCBcInZvaWNlVm9sdW1lXCI6IDEwMCwgXCJ2b2ljZVBsYXliYWNrUmF0ZVwiOiAxMDAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIGdhbWUncyBiYWNrbG9nLlxuICAgICAgICAqIEBwcm9wZXJ0eSBiYWNrbG9nXG4gICAgICAgICogQHR5cGUgT2JqZWN0W11cbiAgICAgICAgIyMjIFxuICAgICAgICBAYmFja2xvZyA9IFtdXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogQ2hhcmFjdGVyIHBhcmFtZXRlcnMgYnkgY2hhcmFjdGVyIElELlxuICAgICAgICAqIEBwcm9wZXJ0eSBjaGFyYWN0ZXJQYXJhbXNcbiAgICAgICAgKiBAdHlwZSBPYmplY3RbXVxuICAgICAgICAjIyMgXG4gICAgICAgIEBjaGFyYWN0ZXJQYXJhbXMgPSBbXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBnYW1lJ3MgY2hhcHRlclxuICAgICAgICAqIEBwcm9wZXJ0eSBjaGFwdGVyc1xuICAgICAgICAqIEB0eXBlIGdzLkRvY3VtZW50W11cbiAgICAgICAgIyMjIFxuICAgICAgICBAY2hhcHRlcnMgPSBbXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBnYW1lJ3MgY3VycmVudCBkaXNwbGF5ZWQgbWVzc2FnZXMuIEVzcGVjaWFsbHkgaW4gTlZMIG1vZGUgdGhlIG1lc3NhZ2VzIFxuICAgICAgICAqIG9mIHRoZSBjdXJyZW50IHBhZ2UgYXJlIHN0b3JlZCBoZXJlLlxuICAgICAgICAqIEBwcm9wZXJ0eSBtZXNzYWdlc1xuICAgICAgICAqIEB0eXBlIE9iamVjdFtdXG4gICAgICAgICMjIyBcbiAgICAgICAgQG1lc3NhZ2VzID0gW11cbiAgICAgICAgXG4gICAgICAgICMjIypcbiAgICAgICAgKiBDb3VudCBvZiBzYXZlIHNsb3RzLiBEZWZhdWx0IGlzIDEwMC5cbiAgICAgICAgKiBAcHJvcGVydHkgc2F2ZVNsb3RDb3VudFxuICAgICAgICAqIEB0eXBlIG51bWJlclxuICAgICAgICAjIyMgXG4gICAgICAgIEBzYXZlU2xvdENvdW50ID0gMTAwXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIGluZGV4IG9mIHNhdmUgZ2FtZXMuIENvbnRhaW5zIHRoZSBoZWFkZXItaW5mbyBmb3IgZWFjaCBzYXZlIGdhbWUgc2xvdC5cbiAgICAgICAgKiBAcHJvcGVydHkgc2F2ZUdhbWVTbG90c1xuICAgICAgICAqIEB0eXBlIE9iamVjdFtdXG4gICAgICAgICMjIyBcbiAgICAgICAgQHNhdmVHYW1lU2xvdHMgPSBbXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFN0b3JlcyBnbG9iYWwgZGF0YSBsaWtlIHRoZSBzdGF0ZSBvZiBwZXJzaXN0ZW50IGdhbWUgdmFyaWFibGVzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBnbG9iYWxEYXRhXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjIyBcbiAgICAgICAgQGdsb2JhbERhdGEgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogSW5kaWNhdGVzIGlmIHRoZSBnYW1lIHJ1bnMgaW4gZWRpdG9yJ3MgbGl2ZS1wcmV2aWV3LlxuICAgICAgICAqIEBwcm9wZXJ0eSBpbkxpdmVQcmV2aWV3XG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjIyBcbiAgICAgICAgQGluTGl2ZVByZXZpZXcgPSBub1xuICAgICAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBJbml0aWFsaXplcyB0aGUgR2FtZU1hbmFnZXIsIHNob3VsZCBiZSBjYWxsZWQgYmVmb3JlIHRoZSBhY3R1YWwgZ2FtZSBzdGFydHMuXG4gICAgKlxuICAgICogQG1ldGhvZCBpbml0aWFsaXplXG4gICAgIyMjICAgIFxuICAgIGluaXRpYWxpemU6IC0+XG4gICAgICAgIEBpbml0aWFsaXplZCA9IHllc1xuICAgICAgICBAaW5MaXZlUHJldmlldyA9ICRQQVJBTVMucHJldmlldz9cbiAgICAgICAgQHNhdmVTbG90Q291bnQgPSBSZWNvcmRNYW5hZ2VyLnN5c3RlbS5zYXZlU2xvdENvdW50IHx8IDEwMFxuICAgICAgICBAdGVtcEZpZWxkcyA9IG5ldyBncy5HYW1lVGVtcCgpXG4gICAgICAgIHdpbmRvdy4kdGVtcEZpZWxkcyA9IEB0ZW1wRmllbGRzXG4gICAgICAgIFxuICAgICAgICBAY3JlYXRlU2F2ZUdhbWVJbmRleCgpXG4gICAgICAgIEB2YXJpYWJsZVN0b3JlID0gbmV3IGdzLlZhcmlhYmxlU3RvcmUoKVxuICAgICAgICBAdmFyaWFibGVTdG9yZS5zZXR1cERvbWFpbnMoRGF0YU1hbmFnZXIuZ2V0RG9jdW1lbnRzQnlUeXBlKFwiZ2xvYmFsX3ZhcmlhYmxlc1wiKS5zZWxlY3QgKHYpIC0+IHYuaXRlbXMuZG9tYWlufHxcIlwiKVxuICAgICAgICBAdmFyaWFibGVTdG9yZS5wZXJzaXN0ZW50TnVtYmVycyA9IEBnbG9iYWxEYXRhLnBlcnNpc3RlbnROdW1iZXJzID8gQHZhcmlhYmxlU3RvcmUucGVyc2lzdGVudE51bWJlcnNcbiAgICAgICAgQHZhcmlhYmxlU3RvcmUucGVyc2lzdGVudEJvb2xlYW5zID0gQGdsb2JhbERhdGEucGVyc2lzdGVudEJvb2xlYW5zID8gQHZhcmlhYmxlU3RvcmUucGVyc2lzdGVudEJvb2xlYW5zXG4gICAgICAgIEB2YXJpYWJsZVN0b3JlLnBlcnNpc3RlbnRTdHJpbmdzID0gQGdsb2JhbERhdGEucGVyc2lzdGVudFN0cmluZ3MgPyBAdmFyaWFibGVTdG9yZS5wZXJzaXN0ZW50U3RyaW5nc1xuICAgICAgICBAdmFyaWFibGVTdG9yZS5wZXJzaXN0ZW50TGlzdHMgPSBAZ2xvYmFsRGF0YS5wZXJzaXN0ZW50TGlzdHMgPyBAdmFyaWFibGVTdG9yZS5wZXJzaXN0ZW50TGlzdHNcbiAgICAgICAgXG4gICAgICAgIEBzY2VuZVZpZXdwb3J0ID0gbmV3IGdzLk9iamVjdF9WaWV3cG9ydChuZXcgVmlld3BvcnQoMCwgMCwgR3JhcGhpY3Mud2lkdGgsIEdyYXBoaWNzLmhlaWdodCwgR3JhcGhpY3Mudmlld3BvcnQpKVxuICAgICAgICBmb3IgY2hhcmFjdGVyIGluIFJlY29yZE1hbmFnZXIuY2hhcmFjdGVyc0FycmF5XG4gICAgICAgICAgICBpZiBjaGFyYWN0ZXI/XG4gICAgICAgICAgICAgICAgQGNoYXJhY3RlclBhcmFtc1tjaGFyYWN0ZXIuaW5kZXhdID0ge31cbiAgICAgICAgICAgICAgICBpZiBjaGFyYWN0ZXIucGFyYW1zP1xuICAgICAgICAgICAgICAgICAgICBmb3IgcGFyYW0gaW4gY2hhcmFjdGVyLnBhcmFtc1xuICAgICAgICAgICAgICAgICAgICAgICAgQGNoYXJhY3RlclBhcmFtc1tjaGFyYWN0ZXIuaW5kZXhdW3BhcmFtLm5hbWVdID0gcGFyYW0udmFsdWUgXG5cbiAgICAgICAgXG4gICAgICAgIEBzZXR1cENvbW1vbkV2ZW50cygpXG4gICAgICAgICAgICBcbiAgICAgICAgZm9yIGkgaW4gWzAuLi5SZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNdXG4gICAgICAgICAgICBAc2V0dGluZ3Mudm9pY2VzUGVyQ2hhcmFjdGVyW2ldID0gMTAwXG4gICAgICAgICAgICAgXG4gICAgICAgIEBjaGFwdGVycyA9IERhdGFNYW5hZ2VyLmdldERvY3VtZW50c0J5VHlwZShcInZuLmNoYXB0ZXJcIilcbiAgICAgICAgQGNoYXB0ZXJzLnNvcnQgKGEsIGIpIC0+XG4gICAgICAgICAgICBpZiBhLml0ZW1zLm9yZGVyID4gYi5pdGVtcy5vcmRlclxuICAgICAgICAgICAgICAgIHJldHVybiAxXG4gICAgICAgICAgICBlbHNlIGlmIGEuaXRlbXMub3JkZXIgPCBiLml0ZW1zLm9yZGVyXG4gICAgICAgICAgICAgICAgcmV0dXJuIC0xXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmV0dXJuIDBcbiAgICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB1cCBjb21tb24gZXZlbnRzLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBDb21tb25FdmVudHNcbiAgICAjIyMgICAgICAgICAgICBcbiAgICBzZXR1cENvbW1vbkV2ZW50czogLT5cbiAgICAgICAgZm9yIGV2ZW50IGluIEBjb21tb25FdmVudHNcbiAgICAgICAgICAgIGV2ZW50Py5kaXNwb3NlKClcbiAgICAgICAgXG4gICAgICAgIEBjb21tb25FdmVudHMgPSBbXSAgICBcbiAgICAgICAgZm9yIGV2ZW50IGluIFJlY29yZE1hbmFnZXIuY29tbW9uRXZlbnRzXG4gICAgICAgICAgICBjb250aW51ZSBpZiBub3QgZXZlbnRcbiAgICAgICAgICAgIGlmIGV2ZW50LnN0YXJ0Q29uZGl0aW9uID09IDEgYW5kIGV2ZW50LmF1dG9QcmVsb2FkXG4gICAgICAgICAgICAgICAgZ3MuUmVzb3VyY2VMb2FkZXIubG9hZEV2ZW50Q29tbWFuZHNHcmFwaGljcyhldmVudC5jb21tYW5kcylcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgIG9iamVjdCA9IG5ldyBncy5PYmplY3RfQ29tbW9uRXZlbnQoKVxuICAgICAgICAgICAgb2JqZWN0LnJlY29yZCA9IGV2ZW50XG4gICAgICAgICAgICBvYmplY3QucmlkID0gZXZlbnQuaW5kZXhcbiAgICAgICAgICAgIEBjb21tb25FdmVudHNbZXZlbnQuaW5kZXhdID0gb2JqZWN0XG4gICAgICAgICAgICBAY29tbW9uRXZlbnRzLnB1c2gob2JqZWN0KVxuICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdXAgY3Vyc29yIGRlcGVuZGluZyBvbiBzeXN0ZW0gc2V0dGluZ3MuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cEN1cnNvclxuICAgICMjI1xuICAgIHNldHVwQ3Vyc29yOiAtPlxuICAgICAgICBpZiBSZWNvcmRNYW5hZ2VyLnN5c3RlbS5jdXJzb3I/Lm5hbWVcbiAgICAgICAgICAgIGJpdG1hcCA9IFJlc291cmNlTWFuYWdlci5nZXRCaXRtYXAoXCJHcmFwaGljcy9QaWN0dXJlcy8je1JlY29yZE1hbmFnZXIuc3lzdGVtLmN1cnNvci5uYW1lfVwiKVxuICAgICAgICAgICAgR3JhcGhpY3Muc2V0Q3Vyc29yQml0bWFwKGJpdG1hcCwgUmVjb3JkTWFuYWdlci5zeXN0ZW0uY3Vyc29yLmh4LCBSZWNvcmRNYW5hZ2VyLnN5c3RlbS5jdXJzb3IuaHkpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEdyYXBoaWNzLnNldEN1cnNvckJpdG1hcChudWxsKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBEaXNwb3NlcyB0aGUgR2FtZU1hbmFnZXIuIFNob3VsZCBiZSBjYWxsZWQgYmVmb3JlIHF1aXQgdGhlIGdhbWUuXG4gICAgKlxuICAgICogQG1ldGhvZCBkaXNwb3NlXG4gICAgIyMjICAgICAgICAgICAgICAgXG4gICAgZGlzcG9zZTogLT5cbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogUXVpdHMgdGhlIGdhbWUuIFRoZSBpbXBsZW1lbnRhdGlvbiBkZXBlbmRzIG9uIHRoZSBwbGF0Zm9ybS4gU28gZm9yIGV4YW1wbGUgb24gbW9iaWxlXG4gICAgKiBkZXZpY2VzIHRoaXMgbWV0aG9kIGhhcyBubyBlZmZlY3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBleGl0XG4gICAgIyMjICAgXG4gICAgZXhpdDogLT4gQXBwbGljYXRpb24uZXhpdCgpXG4gICAgXG4gICAgIyMjKlxuICAgICogUmVzZXRzIHRoZSBHYW1lTWFuYWdlciBieSBkaXNwb3NpbmcgYW5kIHJlLWluaXRpYWxpemluZyBpdC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHJlc2V0XG4gICAgIyMjICAgICAgICAgIFxuICAgIHJlc2V0OiAtPlxuICAgICAgICBAaW5pdGlhbGl6ZWQgPSBub1xuICAgICAgICBAaW50ZXJwcmV0ZXIgPSBudWxsXG4gICAgICAgIEBkaXNwb3NlKClcbiAgICAgICAgQGluaXRpYWxpemUoKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBTdGFydHMgYSBuZXcgZ2FtZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG5ld0dhbWVcbiAgICAjIyMgICAgICBcbiAgICBuZXdHYW1lOiAtPlxuICAgICAgICBAbWVzc2FnZXMgPSBbXVxuICAgICAgICBAdmFyaWFibGVTdG9yZS5jbGVhckFsbEdsb2JhbFZhcmlhYmxlcygpXG4gICAgICAgIEB2YXJpYWJsZVN0b3JlLmNsZWFyQWxsTG9jYWxWYXJpYWJsZXMoKVxuICAgICAgICBAdGVtcFNldHRpbmdzLnNraXAgPSBub1xuICAgICAgICBAdGVtcEZpZWxkcy5jbGVhcigpXG4gICAgICAgIEB0ZW1wRmllbGRzLmluR2FtZSA9IHllc1xuICAgICAgICBAc2V0dXBDb21tb25FdmVudHMoKVxuICAgICAgICBAdGVtcFNldHRpbmdzLm1lbnVBY2Nlc3MgPSB5ZXNcbiAgICAgICAgQHRlbXBTZXR0aW5ncy5zYXZlTWVudUFjY2VzcyA9IHllc1xuICAgICAgICBAdGVtcFNldHRpbmdzLmxvYWRNZW51QWNjZXNzID0geWVzXG4gICAgICAgIEB0ZW1wU2V0dGluZ3MuYmFja2xvZ0FjY2VzcyA9IHllc1xuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIEV4aXN0cyB0aGUgZ2FtZSBhbmQgcmVzZXRzIHRoZSBHYW1lTWFuYWdlciB3aGljaCBpcyBpbXBvcnRhbnQgYmVmb3JlIGdvaW5nIGJhY2sgdG9cbiAgICAqIHRoZSBtYWluIG1lbnUgb3IgdGl0bGUgc2NyZWVuLlxuICAgICpcbiAgICAqIEBtZXRob2QgZXhpdEdhbWVcbiAgICAjIyMgICAgXG4gICAgZXhpdEdhbWU6IC0+XG4gICAgICAgIEB0ZW1wRmllbGRzLmluR2FtZSA9IG5vICAgICBcbiAgICAgICAgQHRlbXBGaWVsZHMuaXNFeGl0aW5nR2FtZSA9IHllc1xuICAgIFxuICAgICMjIypcbiAgICAqIFVwZGF0ZXMgdGhlIEdhbWVNYW5hZ2VyLiBTaG91bGQgYmUgY2FsbGVkIG9uY2UgcGVyIGZyYW1lLlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlXG4gICAgIyMjICAgICBcbiAgICB1cGRhdGU6IC0+XG4gICAgXG4gICAgIyMjKlxuICAgICogQ3JlYXRlcyB0aGUgaW5kZXggb2YgYWxsIHNhdmUtZ2FtZXMuIFNob3VsZCBiZSBjYWxsZWQgd2hlbmV2ZXIgYSBuZXcgc2F2ZSBnYW1lXG4gICAgKiBpcyBjcmVhdGVkLlxuICAgICpcbiAgICAqIEBtZXRob2QgY3JlYXRlU2F2ZUdhbWVJbmRleFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBjcmVhdGVTYXZlR2FtZUluZGV4OiAtPlxuICAgICAgICBAc2F2ZUdhbWVTbG90cyA9IFtdXG4gICAgICAgIGZvciBpIGluIFswLi4uQHNhdmVTbG90Q291bnRdXG4gICAgICAgICAgICBpZiBHYW1lU3RvcmFnZS5leGlzdHMoXCJTYXZlR2FtZV8je2l9X0hlYWRlclwiKVxuICAgICAgICAgICAgICAgIGhlYWRlciA9IEdhbWVTdG9yYWdlLmdldE9iamVjdChcIlNhdmVHYW1lXyN7aX1fSGVhZGVyXCIpXG4gICAgICAgICAgICAgICAgY2hhcHRlciA9IERhdGFNYW5hZ2VyLmdldERvY3VtZW50KGhlYWRlci5jaGFwdGVyVWlkKVxuICAgICAgICAgICAgICAgIHNjZW5lID0gRGF0YU1hbmFnZXIuZ2V0RG9jdW1lbnRTdW1tYXJ5KGhlYWRlci5zY2VuZVVpZClcbiAgICAgICAgICAgICAgICBpbWFnZSA9IGhlYWRlci5pbWFnZVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGhlYWRlciA9IG51bGxcbiAgICAgICAgICAgICAgICBjaGFwZXIgPSBudWxsXG4gICAgICAgICAgICAgICAgc2NlbmUgPSBudWxsXG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBjaGFwdGVyPyBhbmQgc2NlbmU/IGFuZCAhQGluTGl2ZVByZXZpZXdcbiAgICAgICAgICAgICAgICBAc2F2ZUdhbWVTbG90cy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZTogaGVhZGVyLmRhdGUsXG4gICAgICAgICAgICAgICAgICAgIGNoYXB0ZXI6IGNoYXB0ZXIuaXRlbXMubmFtZSB8fCBcIkRFTEVURURcIlxuICAgICAgICAgICAgICAgICAgICBzY2VuZTogc2NlbmUuaXRlbXMubmFtZSB8fCBcIkRFTEVURURcIixcbiAgICAgICAgICAgICAgICAgICAgaW1hZ2U6IGltYWdlICNjaGFwdGVyLml0ZW1zLmNvbW1hbmRzWzBdLnBhcmFtcy5zYXZlR2FtZUdyYXBoaWM/Lm5hbWVcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIEBzYXZlR2FtZVNsb3RzLnB1c2goeyBcImRhdGVcIjogXCJcIiwgXCJjaGFwdGVyXCI6IFwiXCIsIFwic2NlbmVcIjogXCJcIiwgXCJpbWFnZVwiOiBudWxsIH0pXG4gICAgICAgIFxuICAgICAgICByZXR1cm4gQHNhdmVHYW1lU2xvdHNcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogUmVzZXRzIHRoZSBnYW1lJ3Mgc2V0dGluZ3MgdG8gaXRzIGRlZmF1bHQgdmFsdWVzLlxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzZXRTZXR0aW5nc1xuICAgICMjIyAgICAgICAgICAgIFxuICAgIHJlc2V0U2V0dGluZ3M6IC0+XG4gICAgICAgIEBzZXR0aW5ncyA9IHsgdmVyc2lvbjogMzM4LCByZW5kZXJlcjogMCwgZmlsdGVyOiAxLCBjb25maXJtYXRpb246IHllcywgYWRqdXN0QXNwZWN0UmF0aW86IG5vLCBhbGxvd1NraXA6IHllcywgYWxsb3dTa2lwVW5yZWFkTWVzc2FnZXM6IHllcywgIGFsbG93VmlkZW9Ta2lwOiB5ZXMsIHNraXBWb2ljZU9uQWN0aW9uOiB5ZXMsIGFsbG93Q2hvaWNlU2tpcDogbm8sIHZvaWNlc0J5Q2hhcmFjdGVyOiBbXSwgdGltZU1lc3NhZ2VUb1ZvaWNlOiB0cnVlLCAgXCJhdXRvTWVzc2FnZVwiOiB7IGVuYWJsZWQ6IGZhbHNlLCB0aW1lOiAwLCB3YWl0Rm9yVm9pY2U6IHllcywgc3RvcE9uQWN0aW9uOiBubyB9LCAgXCJ2b2ljZUVuYWJsZWRcIjogdHJ1ZSwgXCJiZ21FbmFibGVkXCI6IHRydWUsIFwic291bmRFbmFibGVkXCI6IHRydWUsIFwidm9pY2VWb2x1bWVcIjogMTAwLCBcImJnbVZvbHVtZVwiOiAxMDAsIFwic2VWb2x1bWVcIjogMTAwLCBcIm1lc3NhZ2VTcGVlZFwiOiA0LCBcImZ1bGxTY3JlZW5cIjogbm8sIFwiYXNwZWN0UmF0aW9cIjogMCB9XG4gICAgICAgIEBzYXZlR2FtZVNsb3RzID0gW11cbiAgICAgICAgZm9yIGkgaW4gWzAuLi5Ac2F2ZVNsb3RDb3VudF1cbiAgICAgICAgICAgIEdhbWVTdG9yYWdlLnJlbW92ZShcIlNhdmVHYW1lXyN7aX1fSGVhZGVyXCIpXG4gICAgICAgICAgICBHYW1lU3RvcmFnZS5yZW1vdmUoXCJTYXZlR2FtZV8je2l9XCIpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIEBzYXZlR2FtZVNsb3RzLnB1c2goeyBcImRhdGVcIjogXCJcIiwgXCJjaGFwdGVyXCI6IFwiXCIsIFwic2NlbmVcIjogXCJcIiwgXCJ0aHVtYlwiOiBcIlwiIH0pXG4gICAgICAgXG4gICAgICAgIEdhbWVTdG9yYWdlLnNldE9iamVjdChcInNldHRpbmdzXCIsIEBzZXR0aW5ncylcbiAgICAgICAgQGdsb2JhbERhdGEgPSB7IG1lc3NhZ2VzOiB7fSwgY2dHYWxsZXJ5OiB7fSB9XG4gICAgICAgIEdhbWVTdG9yYWdlLnNldE9iamVjdChcImdsb2JhbERhdGFcIiwgQGdsb2JhbERhdGEpXG4gICAgXG4gICAgIyMjKlxuICAgICogU2F2ZXMgY3VycmVudCBnYW1lIHNldHRpbmdzLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2F2ZVNldHRpbmdzXG4gICAgIyMjICAgICBcbiAgICBzYXZlU2V0dGluZ3M6IC0+XG4gICAgICAgIEdhbWVTdG9yYWdlLnNldE9iamVjdChcInNldHRpbmdzXCIsIEBzZXR0aW5ncylcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2F2ZXMgY3VycmVudCBnbG9iYWwgZGF0YS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNhdmVHbG9iYWxEYXRhXG4gICAgIyMjICBcbiAgICBzYXZlR2xvYmFsRGF0YTogLT5cbiAgICAgICAgQGdsb2JhbERhdGEucGVyc2lzdGVudE51bWJlcnMgPSBAdmFyaWFibGVTdG9yZS5wZXJzaXN0ZW50TnVtYmVyc1xuICAgICAgICBAZ2xvYmFsRGF0YS5wZXJzaXN0ZW50TGlzdHMgPSBAdmFyaWFibGVTdG9yZS5wZXJzaXN0ZW50TGlzdHNcbiAgICAgICAgQGdsb2JhbERhdGEucGVyc2lzdGVudEJvb2xlYW5zID0gQHZhcmlhYmxlU3RvcmUucGVyc2lzdGVudEJvb2xlYW5zXG4gICAgICAgIEBnbG9iYWxEYXRhLnBlcnNpc3RlbnRTdHJpbmdzID0gQHZhcmlhYmxlU3RvcmUucGVyc2lzdGVudFN0cmluZ3NcbiAgICAgICAgR2FtZVN0b3JhZ2Uuc2V0T2JqZWN0KFwiZ2xvYmFsRGF0YVwiLCBAZ2xvYmFsRGF0YSlcbiAgICAgXG4gICAgIyMjKlxuICAgICogUmVzZXRzIGN1cnJlbnQgZ2xvYmFsIGRhdGEuIEFsbCBzdG9yZWQgZGF0YSBhYm91dCByZWFkIG1lc3NhZ2VzLCBwZXJzaXN0ZW50IHZhcmlhYmxlcyBhbmRcbiAgICAqIENHIGdhbGxlcnkgd2lsbCBiZSBkZWxldGVkLlxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzZXRHbG9iYWxEYXRhXG4gICAgIyMjICAgICBcbiAgICByZXNldEdsb2JhbERhdGE6IC0+XG4gICAgICAgIEBnbG9iYWxEYXRhID0geyBtZXNzYWdlczoge30sIGNnR2FsbGVyeToge30gfVxuICAgICAgICBcbiAgICAgICAgZm9yIGNnLCBpIGluIFJlY29yZE1hbmFnZXIuY2dHYWxsZXJ5QXJyYXlcbiAgICAgICAgICAgIGlmIGNnP1xuICAgICAgICAgICAgICAgIEBnbG9iYWxEYXRhLmNnR2FsbGVyeVtjZy5pbmRleF0gPSB7IHVubG9ja2VkOiBubyB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgIEdhbWVTdG9yYWdlLnNldE9iamVjdChcImdsb2JhbERhdGFcIiwgQGdsb2JhbERhdGEpIFxuICAgICBcbiAgICAgXG4gICAgcmVhZFNhdmVHYW1lOiAoc2F2ZUdhbWUpIC0+XG4gICAgd3JpdGVTYXZlR2FtZTogKHNhdmVHYW1lKSAtPlxuICAgICAgICBcbiAgICBwcmVwYXJlU2F2ZUdhbWU6IChzbmFwc2hvdCkgLT5cbiAgICAgICAgaWYgc25hcHNob3RcbiAgICAgICAgICAgIHNuYXBzaG90ID0gUmVzb3VyY2VNYW5hZ2VyLmdldEN1c3RvbUJpdG1hcChcIiRzbmFwc2hvdFwiKVxuICAgICAgICAgICAgc25hcHNob3Q/LmRpc3Bvc2UoKVxuICAgICAgICAgICAgUmVzb3VyY2VNYW5hZ2VyLnNldEN1c3RvbUJpdG1hcChcIiRzbmFwc2hvdFwiLCBHcmFwaGljcy5zbmFwc2hvdCgpKVxuICAgICAgICBcbiAgICAgICAgY29udGV4dCA9IG5ldyBncy5PYmplY3RDb2RlY0NvbnRleHQoKVxuICAgICAgICBjb250ZXh0LmRlY29kZWRPYmplY3RTdG9yZS5wdXNoKEdyYXBoaWNzLnZpZXdwb3J0KVxuICAgICAgICBjb250ZXh0LmRlY29kZWRPYmplY3RTdG9yZS5wdXNoKEBzY2VuZSlcbiAgICAgICAgY29udGV4dC5kZWNvZGVkT2JqZWN0U3RvcmUucHVzaChAc2NlbmUuYmVoYXZpb3IpXG4gIFxuICAgICAgICBtZXNzYWdlQm94SWRzID0gW1wibWVzc2FnZUJveFwiLCBcIm52bE1lc3NhZ2VCb3hcIiwgXCJtZXNzYWdlTWVudVwiXTtcbiAgICAgICAgbWVzc2FnZUlkcyA9IFtcImdhbWVNZXNzYWdlX21lc3NhZ2VcIiwgXCJnYW1lTWVzc2FnZU5WTF9tZXNzYWdlXCJdO1xuICAgICAgICBtZXNzYWdlQm94ZXMgPSBtZXNzYWdlQm94SWRzLnNlbGVjdCAoaWQpID0+IEBzY2VuZS5iZWhhdmlvci5vYmplY3RNYW5hZ2VyLm9iamVjdEJ5SWQoaWQpXG4gICAgICAgIG1lc3NhZ2VzID0gbWVzc2FnZUlkcy5zZWxlY3QgKGlkKSA9PiBAc2NlbmUuYmVoYXZpb3Iub2JqZWN0TWFuYWdlci5vYmplY3RCeUlkKGlkKVxuICBcbiAgICAgICAgc2NlbmVEYXRhID0ge31cbiAgICAgICAgc2F2ZUdhbWUgPSB7fVxuICAgICAgICBzYXZlR2FtZS5lbmNvZGVkT2JqZWN0U3RvcmUgPSBudWxsXG4gICAgICAgIHNhdmVHYW1lLnNjZW5lVWlkID0gQHNjZW5lLnNjZW5lRG9jdW1lbnQudWlkXG4gICAgICAgIHNhdmVHYW1lLmRhdGEgPSB7XG4gICAgICAgICAgICByZXNvdXJjZUNvbnRleHQ6IEBzY2VuZS5iZWhhdmlvci5yZXNvdXJjZUNvbnRleHQudG9EYXRhQnVuZGxlKCksXG4gICAgICAgICAgICBjdXJyZW50Q2hhcmFjdGVyOiBAc2NlbmUuY3VycmVudENoYXJhY3RlcixcbiAgICAgICAgICAgIGNoYXJhY3RlclBhcmFtczogQGNoYXJhY3RlclBhcmFtcyxcbiAgICAgICAgICAgIGZyYW1lQ291bnQ6IEdyYXBoaWNzLmZyYW1lQ291bnQsXG4gICAgICAgICAgICB0ZW1wRmllbGRzOiBAdGVtcEZpZWxkcyxcbiAgICAgICAgICAgIHZpZXdwb3J0OiBAc2NlbmUudmlld3BvcnQsXG4gICAgICAgICAgICBjaGFyYWN0ZXJzOiBAc2NlbmUuY2hhcmFjdGVycyxcbiAgICAgICAgICAgIGNoYXJhY3Rlck5hbWVzOiBSZWNvcmRNYW5hZ2VyLmNoYXJhY3RlcnNBcnJheS5zZWxlY3QoKGMpIC0+IHsgbmFtZTogYy5uYW1lLCBpbmRleDogYy5pbmRleCB9KSxcbiAgICAgICAgICAgIGJhY2tncm91bmRzOiBAc2NlbmUuYmFja2dyb3VuZHMsXG4gICAgICAgICAgICBwaWN0dXJlczogQHNjZW5lLnBpY3R1cmVDb250YWluZXIuc3ViT2JqZWN0c0J5RG9tYWluLFxuICAgICAgICAgICAgdGV4dHM6IEBzY2VuZS50ZXh0Q29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpbixcbiAgICAgICAgICAgIHZpZGVvczogQHNjZW5lLnZpZGVvQ29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpbixcbiAgICAgICAgICAgIHZpZXdwb3J0czogQHNjZW5lLnZpZXdwb3J0Q29udGFpbmVyLnN1Yk9iamVjdHMsXG4gICAgICAgICAgICBjb21tb25FdmVudHM6IEBzY2VuZS5jb21tb25FdmVudENvbnRhaW5lci5zdWJPYmplY3RzLFxuICAgICAgICAgICAgaG90c3BvdHM6IEBzY2VuZS5ob3RzcG90Q29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpbixcbiAgICAgICAgICAgIGludGVycHJldGVyOiBAc2NlbmUuaW50ZXJwcmV0ZXIsXG4gICAgICAgICAgICBtZXNzYWdlQm94ZXM6IG1lc3NhZ2VCb3hlcy5zZWxlY3QoKG1iLCBpKSA9PiB7IHZpc2libGU6IG1iLnZpc2libGUsIGlkOiBtYi5pZCwgbWVzc2FnZTogbWVzc2FnZXNbaV0gfSksXG4gICAgICAgICAgICBiYWNrbG9nOiBAYmFja2xvZyxcbiAgICAgICAgICAgIHZhcmlhYmxlU3RvcmU6IEB2YXJpYWJsZVN0b3JlLFxuICAgICAgICAgICAgZGVmYXVsdHM6IEBkZWZhdWx0cyxcbiAgICAgICAgICAgIHRyYW5zaXRpb25EYXRhOiBTY2VuZU1hbmFnZXIudHJhbnNpdGlvbkRhdGEsXG4gICAgICAgICAgICBhdWRpbzogeyBhdWRpb0J1ZmZlcnM6IEF1ZGlvTWFuYWdlci5hdWRpb0J1ZmZlcnMsIGF1ZGlvQnVmZmVyc0J5TGF5ZXI6IEF1ZGlvTWFuYWdlci5hdWRpb0J1ZmZlcnNCeUxheWVyLCBhdWRpb0xheWVyczogQXVkaW9NYW5hZ2VyLmF1ZGlvTGF5ZXJzLCBzb3VuZFJlZmVyZW5jZXM6IEF1ZGlvTWFuYWdlci5zb3VuZFJlZmVyZW5jZXMgfSxcbiAgICAgICAgICAgIG1lc3NhZ2VBcmVhczogQHNjZW5lLm1lc3NhZ2VBcmVhQ29udGFpbmVyLnN1Yk9iamVjdHNCeURvbWFpblxuICAgICAgICAgICMgIG1lc3NhZ2VBcmVhczogQHNjZW5lLm1lc3NhZ2VBcmVhcy5zZWxlY3QgKGYpIC0+XG4gICAgICAgICAgIyAgICAgIGlmIGYgXG4gICAgICAgICAgIyAgICAgICAgICB7IFxuICAgICAgICAgICMgICAgICAgICAgICAgIG1lc3NhZ2U6IGYubWVzc2FnZSwgXG4gICAgICAgICAgIyAgICAgICAgICAgICAgbGF5b3V0OiB7IGRzdFJlY3Q6IGdzLlJlY3QuZnJvbU9iamVjdChmLmxheW91dC5kc3RSZWN0KSB9IFxuICAgICAgICAgICMgICAgICAgICAgfSBcbiAgICAgICAgICAjICAgICAgZWxzZSBcbiAgICAgICAgICAjICAgICAgICAgIG51bGxcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgI3NzID0gd2luZG93LnBlcmZvcm1hbmNlLm5vdygpXG4gICAgICAgIHNhdmVHYW1lLmRhdGEgPSBncy5PYmplY3RDb2RlYy5lbmNvZGUoc2F2ZUdhbWUuZGF0YSwgY29udGV4dClcbiAgICAgICAgI2NvbnNvbGUubG9nKHdpbmRvdy5wZXJmb3JtYW5jZS5ub3coKSAtIHNzKVxuICAgICAgICBzYXZlR2FtZS5lbmNvZGVkT2JqZWN0U3RvcmUgPSBjb250ZXh0LmVuY29kZWRPYmplY3RTdG9yZVxuXG4gICAgICAgIEBzYXZlR2FtZSA9IHNhdmVHYW1lXG4gICAgICBcbiAgICBjcmVhdGVTYXZlR2FtZVNsb3Q6IChoZWFkZXIpIC0+XG4gICAgICAgIHNsb3QgPSB7XG4gICAgICAgICAgICBcImRhdGVcIjogbmV3IERhdGUoKS50b0RhdGVTdHJpbmcoKSxcbiAgICAgICAgICAgIFwiY2hhcHRlclwiOiBAc2NlbmUuY2hhcHRlci5pdGVtcy5uYW1lLFxuICAgICAgICAgICAgXCJzY2VuZVwiOiBAc2NlbmUuc2NlbmVEb2N1bWVudC5pdGVtcy5uYW1lLFxuICAgICAgICAgICAgXCJpbWFnZVwiOiBoZWFkZXIuaW1hZ2VcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHNsb3Q7XG4gICAgICAgIFxuICAgIGNyZWF0ZVNhdmVHYW1lSGVhZGVyOiAodGh1bWJXaWR0aCwgdGh1bWJIZWlnaHQpIC0+XG4gICAgICAgIHRodW1iSW1hZ2UgPSBAY3JlYXRlU2F2ZUdhbWVUaHVtYkltYWdlKHRodW1iV2lkdGgsIHRodW1iSGVpZ2h0KVxuICAgICAgICBcbiAgICAgICAgaGVhZGVyID0ge1xuICAgICAgICAgICAgXCJkYXRlXCI6IG5ldyBEYXRlKCkudG9EYXRlU3RyaW5nKCksXG4gICAgICAgICAgICBcImNoYXB0ZXJVaWRcIjogQHNjZW5lLmNoYXB0ZXIudWlkLFxuICAgICAgICAgICAgXCJzY2VuZVVpZFwiOiBAc2NlbmUuc2NlbmVEb2N1bWVudC51aWQsXG4gICAgICAgICAgICBcImltYWdlXCI6IHRodW1iSW1hZ2U/LmltYWdlLnRvRGF0YVVSTCgpIFxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICB0aHVtYkltYWdlPy5kaXNwb3NlKClcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBoZWFkZXJcbiAgICAgICAgXG4gICAgY3JlYXRlU2F2ZUdhbWVUaHVtYkltYWdlOiAod2lkdGgsIGhlaWdodCkgLT5cbiAgICAgICAgc25hcHNob3QgPSBSZXNvdXJjZU1hbmFnZXIuZ2V0Qml0bWFwKFwiJHNuYXBzaG90XCIpXG4gICAgICAgIHRodW1iSW1hZ2UgPSBudWxsXG4gICAgICAgIFxuICAgICAgICBpZiBzbmFwc2hvdFxuICAgICAgICAgICAgaWYgd2lkdGggYW5kIGhlaWdodFxuICAgICAgICAgICAgICAgIHRodW1iSW1hZ2UgPSBuZXcgQml0bWFwKHdpZHRoLCBoZWlnaHQpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgdGh1bWJJbWFnZSA9IG5ldyBCaXRtYXAoR3JhcGhpY3Mud2lkdGggLyA4LCBHcmFwaGljcy5oZWlnaHQgLyA4KVxuICAgICAgICAgICAgdGh1bWJJbWFnZS5zdHJldGNoQmx0KG5ldyBSZWN0KDAsIDAsIHRodW1iSW1hZ2Uud2lkdGgsIHRodW1iSW1hZ2UuaGVpZ2h0KSwgc25hcHNob3QsIG5ldyBSZWN0KDAsIDAsIHNuYXBzaG90LndpZHRoLCBzbmFwc2hvdC5oZWlnaHQpKVxuICAgICAgICAgICAgXG4gICAgICAgIHJldHVybiB0aHVtYkltYWdlXG4gICAgICBcbiAgICBzdG9yZVNhdmVHYW1lOiAobmFtZSwgc2F2ZUdhbWUsIGhlYWRlcikgLT5cbiAgICAgICAgaWYgaGVhZGVyXG4gICAgICAgICAgICBHYW1lU3RvcmFnZS5zZXREYXRhKFwiI3tuYW1lfV9IZWFkZXJcIiwgSlNPTi5zdHJpbmdpZnkoaGVhZGVyKSlcbiAgICAgICAgICAgIFxuICAgICAgICBHYW1lU3RvcmFnZS5zZXREYXRhKG5hbWUsIEpTT04uc3RyaW5naWZ5KHNhdmVHYW1lKSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2F2ZXMgdGhlIGN1cnJlbnQgZ2FtZSBhdCB0aGUgc3BlY2lmaWVkIHNsb3QuXG4gICAgKlxuICAgICogQG1ldGhvZCBzYXZlXG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2xvdCAtIFRoZSBzbG90IHdoZXJlIHRoZSBnYW1lIHNob3VsZCBiZSBzYXZlZCBhdC5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB0aHVtYldpZHRoIC0gVGhlIHdpZHRoIGZvciB0aGUgc25hcHNob3QtdGh1bWIuIFlvdSBjYW4gc3BlY2lmeSA8Yj5udWxsPC9iPiBvciAwIHRvIHVzZSBhbiBhdXRvIGNhbGN1bGF0ZWQgd2lkdGguXG4gICAgKiBAcGFyYW0ge251bWJlcn0gdGh1bWJIZWlnaHQgLSBUaGUgaGVpZ2h0IGZvciB0aGUgc25hcHNob3QtdGh1bWIuIFlvdSBjYW4gc3BlY2lmeSA8Yj5udWxsPC9iPiBvciAwIHRvIHVzZSBhbiBhdXRvIGNhbGN1bGF0ZWQgaGVpZ2h0LlxuICAgICMjIyAgICAgXG4gICAgc2F2ZTogKHNsb3QsIHRodW1iV2lkdGgsIHRodW1iSGVpZ2h0KSAtPlxuICAgICAgICBpZiBAc2F2ZUdhbWVcbiAgICAgICAgICAgIGhlYWRlciA9IEBjcmVhdGVTYXZlR2FtZUhlYWRlcih0aHVtYldpZHRoLCB0aHVtYkhlaWdodClcbiAgICAgICAgICAgIEBzYXZlR2FtZVNsb3RzW3Nsb3RdID0gQGNyZWF0ZVNhdmVHYW1lU2xvdChoZWFkZXIpXG4gICAgICAgICAgICBAc3RvcmVTYXZlR2FtZShcIlNhdmVHYW1lXyN7c2xvdH1cIiwgQHNhdmVHYW1lLCBoZWFkZXIpXG4gICAgICAgICAgICBAc2NlbmVEYXRhID0ge31cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcmV0dXJuIEBzYXZlR2FtZVxuICAgIFxuICAgIHJlc3RvcmU6IChzYXZlR2FtZSkgLT5cbiAgICAgICAgQGJhY2tsb2cgPSBzYXZlR2FtZS5kYXRhLmJhY2tsb2dcbiAgICAgICAgQGRlZmF1bHRzID0gc2F2ZUdhbWUuZGF0YS5kZWZhdWx0c1xuICAgICAgICBAdmFyaWFibGVTdG9yZSA9IHNhdmVHYW1lLmRhdGEudmFyaWFibGVTdG9yZVxuICAgICAgICBAc2NlbmVEYXRhID0gc2F2ZUdhbWUuZGF0YVxuICAgICAgICBAc2F2ZUdhbWUgPSBudWxsXG4gICAgICAgIEBsb2FkZWRTYXZlR2FtZSA9IG51bGxcbiAgICAgICAgQHRlbXBGaWVsZHMgPSBzYXZlR2FtZS5kYXRhLnRlbXBGaWVsZHNcbiAgICAgICAgQGNoYXJhY3RlclBhcmFtcyA9IHNhdmVHYW1lLmRhdGEuY2hhcmFjdGVyUGFyYW1zXG4gICAgICAgIHdpbmRvdy4kdGVtcEZpZWxkcyA9IEB0ZW1wRmllbGRzXG4gICAgICAgIHdpbmRvdy4kZGF0YUZpZWxkcy5iYWNrbG9nID0gQGJhY2tsb2dcbiAgICAgICAgICAgIFxuICAgIFxuICAgIHByZXBhcmVMb2FkR2FtZTogLT5cbiAgICAgICAgQXVkaW9NYW5hZ2VyLnN0b3BBbGxNdXNpYygzMClcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogTG9hZHMgdGhlIGdhbWUgZnJvbSB0aGUgc3BlY2lmaWVkIHNhdmUgZ2FtZSBzbG90LiBUaGlzIG1ldGhvZCB0cmlnZ2Vyc1xuICAgICogYSBhdXRvbWF0aWMgc2NlbmUgY2hhbmdlLlxuICAgICpcbiAgICAqIEBtZXRob2QgbG9hZFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNsb3QgLSBUaGUgc2xvdCB3aGVyZSB0aGUgZ2FtZSBzaG91bGQgYmUgbG9hZGVkIGZyb20uXG4gICAgIyMjICAgICAgICBcbiAgICBsb2FkOiAoc2xvdCkgLT5cbiAgICAgICAgcmV0dXJuIGlmICFAc2F2ZUdhbWVTbG90c1tzbG90XSBvciBAc2F2ZUdhbWVTbG90c1tzbG90XS5kYXRlLnRyaW0oKS5sZW5ndGggPT0gMFxuICAgICAgICBcbiAgICAgICAgQHByZXBhcmVMb2FkR2FtZSgpXG4gICAgICAgIEBsb2FkZWRTYXZlR2FtZSA9IEBsb2FkU2F2ZUdhbWUoXCJTYXZlR2FtZV8je3Nsb3R9XCIpXG4gICAgICAgIFxuICAgICAgICBcbiAgICAgICAgU2NlbmVNYW5hZ2VyLnN3aXRjaFRvKG5ldyB2bi5PYmplY3RfU2NlbmUoKSlcbiAgICAgICAgU2NlbmVNYW5hZ2VyLmNsZWFyKClcbiAgICAgICAgXG4gICAgICAgIFxuICAgIGxvYWRTYXZlR2FtZTogKG5hbWUpIC0+IEpTT04ucGFyc2UoR2FtZVN0b3JhZ2UuZ2V0RGF0YShuYW1lKSlcbiAgICAgICAgXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHNhdmUgZ2FtZSBkYXRhIGZvciBhIHNwZWNpZmllZCBzbG90LlxuICAgICpcbiAgICAqIEBtZXRob2QgZ2V0U2F2ZUdhbWVcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzbG90IC0gVGhlIHNsb3QgdG8gZ2V0IHRoZSBzYXZlIGRhdGEgZnJvbS5cbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIHNhdmUgZ2FtZSBkYXRhLlxuICAgICMjIyAgICAgICAgXG4gICAgZ2V0U2F2ZUdhbWU6IChzbG90KSAtPiBKU09OLnBhcnNlKEdhbWVTdG9yYWdlLmdldERhdGEoXCJTYXZlR2FtZV8je3Nsb3R9XCIpKVxuICAgIFxud2luZG93LkdhbWVNYW5hZ2VyID0gbmV3IEdhbWVNYW5hZ2VyKClcbmdzLkdhbWVNYW5hZ2VyID0gd2luZG93LkdhbWVNYW5hZ2VyIl19
//# sourceURL=GameManager_27.js