var Component_GameSceneBehavior,
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Component_GameSceneBehavior = (function(superClass) {
  extend(Component_GameSceneBehavior, superClass);


  /**
  * Defines the behavior of visual novel game scene.
  *
  * @module vn
  * @class Component_GameSceneBehavior
  * @extends gs.Component_LayoutSceneBehavior
  * @memberof vn
   */

  function Component_GameSceneBehavior() {
    Component_GameSceneBehavior.__super__.constructor.call(this);
    this.onAutoCommonEventStart = (function(_this) {
      return function() {
        _this.object.removeComponent(_this.object.interpreter);
        return _this.object.interpreter.stop();
      };
    })(this);
    this.onAutoCommonEventFinish = (function(_this) {
      return function() {
        if (!_this.object.components.contains(_this.object.interpreter)) {
          _this.object.addComponent(_this.object.interpreter);
        }
        return _this.object.interpreter.resume();
      };
    })(this);
    this.resourceContext = null;
    this.objectDomain = "";
  }


  /**
  * Initializes the scene. 
  *
  * @method initialize
   */

  Component_GameSceneBehavior.prototype.initialize = function() {
    var ref, saveGame, sceneUid, sprite;
    if (SceneManager.previousScenes.length === 0) {
      gs.GlobalEventManager.clear();
    }
    this.resourceContext = ResourceManager.createContext();
    ResourceManager.context = this.resourceContext;
    Graphics.freeze();
    saveGame = GameManager.loadedSaveGame;
    sceneUid = null;
    if (saveGame) {
      sceneUid = saveGame.sceneUid;
      this.object.sceneData = saveGame.data;
    } else {
      sceneUid = ((ref = $PARAMS.preview) != null ? ref.scene.uid : void 0) || this.object.sceneData.uid || RecordManager.system.startInfo.scene.uid;
    }
    this.object.sceneDocument = DataManager.getDocument(sceneUid);
    if (this.object.sceneDocument && this.object.sceneDocument.items.type === "vn.scene") {
      this.object.chapter = DataManager.getDocument(this.object.sceneDocument.items.chapterUid);
      this.object.currentCharacter = {
        "name": ""
      };
      if (!GameManager.initialized) {
        GameManager.initialize();
      }
      LanguageManager.loadBundles();
    } else {
      sprite = new gs.Sprite();
      sprite.bitmap = new gs.Bitmap(Graphics.width, 50);
      sprite.bitmap.drawText(0, 0, Graphics.width, 50, "No Start Scene selected", 1, 0);
      sprite.srcRect = new gs.Rect(0, 0, Graphics.width, 50);
      sprite.y = (Graphics.height - 50) / 2;
      sprite.z = 10000;
    }
    return this.setupScreen();
  };


  /**
  * Disposes the scene. 
  *
  * @method dispose
   */

  Component_GameSceneBehavior.prototype.dispose = function() {
    var event, j, len, ref;
    ResourceManager.context = this.resourceContext;
    this.object.removeObject(this.object.commonEventContainer);
    this.show(false);
    ref = GameManager.commonEvents;
    for (j = 0, len = ref.length; j < len; j++) {
      event = ref[j];
      if (event) {
        event.events.offByOwner("start", this.object);
        event.events.offByOwner("finish", this.object);
      }
    }
    if (this.object.video) {
      this.object.video.dispose();
      this.object.video.onEnded();
    }
    return Component_GameSceneBehavior.__super__.dispose.call(this);
  };

  Component_GameSceneBehavior.prototype.changePictureDomain = function(domain) {
    this.object.pictureContainer.behavior.changeDomain(domain);
    return this.object.pictures = this.object.pictureContainer.subObjects;
  };

  Component_GameSceneBehavior.prototype.changeTextDomain = function(domain) {
    this.object.textContainer.behavior.changeDomain(domain);
    return this.object.texts = this.object.textContainer.subObjects;
  };

  Component_GameSceneBehavior.prototype.changeVideoDomain = function(domain) {
    this.object.videoContainer.behavior.changeDomain(domain);
    return this.object.videos = this.object.videoContainer.subObjects;
  };

  Component_GameSceneBehavior.prototype.changeHotspotDomain = function(domain) {
    this.object.hotspotContainer.behavior.changeDomain(domain);
    return this.object.hotspots = this.object.hotspotContainer.subObjects;
  };

  Component_GameSceneBehavior.prototype.changeMessageAreaDomain = function(domain) {
    this.object.messageAreaContainer.behavior.changeDomain(domain);
    return this.object.messageAreas = this.object.messageAreaContainer.subObjects;
  };


  /**
  * Shows/Hides the current scene. A hidden scene is no longer shown and executed
  * but all objects and data is still there and be shown again anytime.
  *
  * @method show
  * @param {boolean} visible - Indicates if the scene should be shown or hidden.
   */

  Component_GameSceneBehavior.prototype.show = function(visible) {
    var ref, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8;
    this.object.visible = visible;
    if ((ref = this.object.layout) != null) {
      ref.update();
    }
    if ((ref1 = this.object.layoutNVL) != null) {
      ref1.update();
    }
    this.object.pictureContainer.behavior.setVisible(visible);
    this.object.hotspotContainer.behavior.setVisible(visible);
    this.object.textContainer.behavior.setVisible(visible);
    this.object.videoContainer.behavior.setVisible(visible);
    this.object.messageAreaContainer.behavior.setVisible(visible);
    this.object.viewportContainer.behavior.setVisible(visible);
    this.object.characterContainer.behavior.setVisible(visible);
    this.object.backgroundContainer.behavior.setVisible(visible);
    if ((ref2 = this.viewport) != null) {
      ref2.visible = visible;
    }
    if ((ref3 = this.object.choiceWindow) != null) {
      ref3.visible = visible;
    }
    if ((ref4 = this.object.inputNumberBox) != null) {
      ref4.visible = visible;
    }
    if ((ref5 = this.object.inputTextBox) != null) {
      ref5.visible = visible;
    }
    if ((ref6 = this.object.inputTextBox) != null) {
      ref6.update();
    }
    if ((ref7 = this.object.inputNumberBox) != null) {
      ref7.update();
    }
    if ((ref8 = this.object.choiceWindow) != null) {
      ref8.update();
    }
    return this.setupCommonEvents();
  };


  /**
  * Sets up common event handling.
  *
  * @method setupCommonEvents
   */

  Component_GameSceneBehavior.prototype.setupCommonEvents = function() {
    var commonEvents, event, i, j, k, len, len1, ref, ref1, ref2, ref3;
    commonEvents = (ref = this.object.sceneData) != null ? ref.commonEvents : void 0;
    if (commonEvents) {
      for (i = j = 0, len = commonEvents.length; j < len; i = ++j) {
        event = commonEvents[i];
        if (event && this.object.commonEventContainer.subObjects.indexOf(event) === -1) {
          this.object.commonEventContainer.setObject(event, i);
          event.behavior.setupEventHandlers();
          if ((ref1 = event.interpreter) != null ? ref1.isRunning : void 0) {
            event.events.emit("start", event);
          }
        }
      }
    } else {
      ref2 = GameManager.commonEvents;
      for (i = k = 0, len1 = ref2.length; k < len1; i = ++k) {
        event = ref2[i];
        if (event && (event.record.startCondition === 1 || event.record.parallel) && this.object.commonEventContainer.subObjects.indexOf(event) === -1) {
          this.object.commonEventContainer.setObject(event, i);
          event.events.offByOwner("start", this.object);
          event.events.offByOwner("finish", this.object);
          if (!event.record.parallel) {
            event.events.on("start", gs.CallBack("onAutoCommonEventStart", this), null, this.object);
            event.events.on("finish", gs.CallBack("onAutoCommonEventFinish", this), null, this.object);
          }
          if ((ref3 = event.interpreter) != null ? ref3.isRunning : void 0) {
            event.events.emit("start", event);
          }
        }
      }
    }
    return null;
  };


  /**
  * Sets up main interpreter.
  *
  * @method setupInterpreter
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupInterpreter = function() {
    this.object.commands = this.object.sceneDocument.items.commands;
    if (this.object.sceneData.interpreter) {
      this.object.removeComponent(this.object.interpreter);
      this.object.interpreter = this.object.sceneData.interpreter;
      this.object.addComponent(this.object.interpreter);
      this.object.interpreter.context.set(this.object.sceneDocument.uid, this.object);
      return this.object.interpreter.object = this.object;
    } else {
      this.object.interpreter.setup();
      this.object.interpreter.context.set(this.object.sceneDocument.uid, this.object);
      return this.object.interpreter.start();
    }
  };


  /**
  * Sets up characters and restores them from loaded save game if necessary.
  *
  * @method setupCharacters
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupCharacters = function() {
    var c, i, j, len, ref;
    if (this.object.sceneData.characters != null) {
      ref = this.object.sceneData.characters;
      for (i = j = 0, len = ref.length; j < len; i = ++j) {
        c = ref[i];
        this.object.characterContainer.setObject(c, i);
      }
    }
    return this.object.currentCharacter = this.object.sceneData.currentCharacter || {
      name: ""
    };
  };


  /**
  * Sets up viewports and restores them from loaded save game if necessary.
  *
  * @method setupViewports
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupViewports = function() {
    var i, j, len, ref, ref1, results, viewport, viewports;
    viewports = (ref = (ref1 = this.object.sceneData) != null ? ref1.viewports : void 0) != null ? ref : [];
    results = [];
    for (i = j = 0, len = viewports.length; j < len; i = ++j) {
      viewport = viewports[i];
      if (viewport) {
        results.push(this.object.viewportContainer.setObject(viewport, i));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * Sets up backgrounds and restores them from loaded save game if necessary.
  *
  * @method setupBackgrounds
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupBackgrounds = function() {
    var b, backgrounds, i, j, len, ref, ref1, results;
    backgrounds = (ref = (ref1 = this.object.sceneData) != null ? ref1.backgrounds : void 0) != null ? ref : [];
    results = [];
    for (i = j = 0, len = backgrounds.length; j < len; i = ++j) {
      b = backgrounds[i];
      results.push(this.object.backgroundContainer.setObject(b, i));
    }
    return results;
  };


  /**
  * Sets up pictures and restores them from loaded save game if necessary.
  *
  * @method setupPictures
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupPictures = function() {
    var domain, i, path, picture, pictures, ref, ref1, results;
    pictures = (ref = (ref1 = this.object.sceneData) != null ? ref1.pictures : void 0) != null ? ref : {};
    results = [];
    for (domain in pictures) {
      this.object.pictureContainer.behavior.changeDomain(domain);
      if (pictures[domain]) {
        results.push((function() {
          var j, len, ref2, results1;
          ref2 = pictures[domain];
          results1 = [];
          for (i = j = 0, len = ref2.length; j < len; i = ++j) {
            picture = ref2[i];
            this.object.pictureContainer.setObject(picture, i);
            if (picture != null ? picture.image : void 0) {
              path = "Graphics/Pictures/" + picture.image;
              results1.push(this.resourceContext.add(path, ResourceManager.resourcesByPath[path]));
            } else {
              results1.push(void 0);
            }
          }
          return results1;
        }).call(this));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * Sets up texts and restores them from loaded save game if necessary.
  *
  * @method setupTexts
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupTexts = function() {
    var domain, i, ref, ref1, results, text, texts;
    texts = (ref = (ref1 = this.object.sceneData) != null ? ref1.texts : void 0) != null ? ref : {};
    results = [];
    for (domain in texts) {
      this.object.textContainer.behavior.changeDomain(domain);
      if (texts[domain]) {
        results.push((function() {
          var j, len, ref2, results1;
          ref2 = texts[domain];
          results1 = [];
          for (i = j = 0, len = ref2.length; j < len; i = ++j) {
            text = ref2[i];
            results1.push(this.object.textContainer.setObject(text, i));
          }
          return results1;
        }).call(this));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * Sets up videos and restores them from loaded save game if necessary.
  *
  * @method setupVideos
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupVideos = function() {
    var domain, i, path, ref, ref1, results, video, videos;
    videos = (ref = (ref1 = this.object.sceneData) != null ? ref1.videos : void 0) != null ? ref : {};
    results = [];
    for (domain in videos) {
      this.object.videoContainer.behavior.changeDomain(domain);
      if (videos[domain]) {
        results.push((function() {
          var j, len, ref2, results1;
          ref2 = videos[domain];
          results1 = [];
          for (i = j = 0, len = ref2.length; j < len; i = ++j) {
            video = ref2[i];
            if (video) {
              path = "Movies/" + video.video;
              this.resourceContext.add(path, ResourceManager.resourcesByPath[path]);
              video.visible = true;
              video.update();
            }
            results1.push(this.object.videoContainer.setObject(video, i));
          }
          return results1;
        }).call(this));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * Sets up hotspots and restores them from loaded save game if necessary.
  *
  * @method setupHotspots
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupHotspots = function() {
    var domain, hotspot, hotspots, i, ref, ref1, results;
    hotspots = (ref = (ref1 = this.object.sceneData) != null ? ref1.hotspots : void 0) != null ? ref : {};
    results = [];
    for (domain in hotspots) {
      this.object.hotspotContainer.behavior.changeDomain(domain);
      if (hotspots[domain]) {
        results.push((function() {
          var j, len, ref2, results1;
          ref2 = hotspots[domain];
          results1 = [];
          for (i = j = 0, len = ref2.length; j < len; i = ++j) {
            hotspot = ref2[i];
            results1.push(this.object.hotspotContainer.setObject(hotspot, i));
          }
          return results1;
        }).call(this));
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * Sets up layout.
  *
  * @method setupLayout
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupLayout = function() {
    var advVisible, nvlVisible, ref;
    this.dataFields = ui.UIManager.dataSources[ui.UiFactory.layouts.gameLayout.dataSource || "default"]();
    this.dataFields.scene = this.object;
    window.$dataFields = this.dataFields;
    advVisible = this.object.messageMode === vn.MessageMode.ADV;
    nvlVisible = this.object.messageMode === vn.MessageMode.NVL;
    this.object.layoutNVL = ui.UiFactory.createFromDescriptor(ui.UiFactory.layouts.gameLayoutNVL, this.object);
    this.object.layout = ui.UiFactory.createFromDescriptor(ui.UiFactory.layouts.gameLayout, this.object);
    this.object.layoutNVL.visible = nvlVisible;
    this.object.layout.visible = advVisible;
    $gameMessageNVL_message.visible = nvlVisible;
    $gameMessage_message.visible = advVisible;
    this.object.layout.ui.prepare();
    this.object.layoutNVL.ui.prepare();
    if (((ref = $tempFields.choices) != null ? ref.length : void 0) > 0) {
      this.showChoices(GameManager.tempFields.choices, gs.CallBack("onChoiceAccept", this.object.interpreter, {
        pointer: this.object.interpreter.pointer,
        params: this.params
      }));
    }
    if (this.object.interpreter.waitingFor.inputNumber) {
      this.showInputNumber(GameManager.tempFields.digits, gs.CallBack("onInputNumberFinish", this.object.interpreter, this.object.interpreter));
    }
    if (this.object.interpreter.waitingFor.inputText) {
      return this.showInputText(GameManager.tempFields.letters, gs.CallBack("onInputTextFinish", this.object.interpreter, this.object.interpreter));
    }
  };


  /**
  * Sets up the main viewport / screen viewport.
  *
  * @method setupMainViewport
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupMainViewport = function() {
    if (!this.object.sceneData.viewport) {
      GameManager.sceneViewport.removeComponent(GameManager.sceneViewport.visual);
      GameManager.sceneViewport.dispose();
      GameManager.sceneViewport = new gs.Object_Viewport(GameManager.sceneViewport.visual.viewport);
      this.viewport = GameManager.sceneViewport.visual.viewport;
      return this.object.viewport = GameManager.sceneViewport;
    } else {
      GameManager.sceneViewport.dispose();
      GameManager.sceneViewport = this.object.sceneData.viewport;
      this.object.viewport = this.object.sceneData.viewport;
      this.viewport = this.object.viewport.visual.viewport;
      this.viewport.viewport = Graphics.viewport;
      return this.object.addObject(this.object.viewport);
    }
  };


  /**
  * Sets up screen.
  *
  * @method setupScreen
  * @protected
   */

  Component_GameSceneBehavior.prototype.setupScreen = function() {
    if (this.object.sceneData.screen) {
      return this.object.viewport.restore(this.object.sceneData.screen);
    }
  };


  /**
  * Restores main interpreter from loaded save game.
  *
  * @method restoreInterpreter
  * @protected
   */

  Component_GameSceneBehavior.prototype.restoreInterpreter = function() {
    if (this.object.sceneData.interpreter) {
      return this.object.interpreter.restore();
    }
  };


  /**
  * Restores message box from loaded save game.
  *
  * @method restoreMessageBox
  * @protected
   */

  Component_GameSceneBehavior.prototype.restoreMessageBox = function() {
    var c, j, len, message, messageBox, messageBoxes, messageObject, ref, results;
    messageBoxes = (ref = this.object.sceneData) != null ? ref.messageBoxes : void 0;
    if (messageBoxes) {
      results = [];
      for (j = 0, len = messageBoxes.length; j < len; j++) {
        messageBox = messageBoxes[j];
        messageObject = gs.ObjectManager.current.objectById(messageBox.id);
        messageObject.visible = messageBox.visible;
        if (messageBox.message) {
          message = gs.ObjectManager.current.objectById(messageBox.message.id);
          message.textRenderer.dispose();
          Object.mixin(message, messageBox.message, ui.Object_Message.objectCodecBlackList.concat(["origin"]));
          results.push((function() {
            var k, len1, ref1, results1;
            ref1 = message.components;
            results1 = [];
            for (k = 0, len1 = ref1.length; k < len1; k++) {
              c = ref1[k];
              results1.push(c.object = message);
            }
            return results1;
          })());
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };


  /**
  * Restores message from loaded save game.
  *
  * @method restoreMessages
  * @protected
   */

  Component_GameSceneBehavior.prototype.restoreMessages = function() {
    var area, c, domain, i, message, messageArea, messageAreas, messageLayout, messageObject, ref, ref1, ref2, results;
    if (this.object.messageMode === vn.MessageMode.NVL) {
      messageObject = gs.ObjectManager.current.objectById("gameMessageNVL_message");
    } else {
      messageObject = gs.ObjectManager.current.objectById("gameMessage_message");
    }
    if ((ref = this.object.sceneData) != null ? ref.message : void 0) {
      messageObject.restore(this.object.sceneData.message);
    }
    if ((ref1 = this.object.sceneData) != null ? ref1.messages : void 0) {
      messageObject.message.restoreMessages(this.object.sceneData.messages);
      messageObject.textRenderer.restore(this.object.sceneData.messageTextRenderer);
    }
    if ((ref2 = this.object.sceneData) != null ? ref2.messageAreas : void 0) {
      results = [];
      for (domain in this.object.sceneData.messageAreas) {
        this.object.messageAreaContainer.behavior.changeDomain(domain);
        messageAreas = this.object.sceneData.messageAreas;
        if (messageAreas[domain]) {
          results.push((function() {
            var j, k, len, len1, ref3, ref4, results1;
            ref3 = messageAreas[domain];
            results1 = [];
            for (i = j = 0, len = ref3.length; j < len; i = ++j) {
              area = ref3[i];
              if (area) {
                messageArea = new gs.Object_MessageArea();
                messageLayout = ui.UIManager.createControlFromDescriptor({
                  type: "ui.CustomGameMessage",
                  id: "customGameMessage_" + i,
                  params: {
                    id: "customGameMessage_" + i
                  }
                }, messageArea);
                message = gs.ObjectManager.current.objectById("customGameMessage_" + i + "_message");
                Object.mixin(message, area.message);
                ref4 = message.components;
                for (k = 0, len1 = ref4.length; k < len1; k++) {
                  c = ref4[k];
                  c.object = message;
                }
                messageLayout.dstRect.x = area.layout.dstRect.x;
                messageLayout.dstRect.y = area.layout.dstRect.y;
                messageLayout.dstRect.width = area.layout.dstRect.width;
                messageLayout.dstRect.height = area.layout.dstRect.height;
                messageLayout.needsUpdate = true;
                messageLayout.update();
                messageArea.message = message;
                messageArea.layout = messageLayout;
                messageArea.addObject(messageLayout);
                results1.push(this.object.messageAreaContainer.setObject(messageArea, i));
              } else {
                results1.push(void 0);
              }
            }
            return results1;
          }).call(this));
        } else {
          results.push(void 0);
        }
      }
      return results;
    }
  };


  /**
  * Restores audio-playback from loaded save game.
  *
  * @method restoreAudioPlayback
  * @protected
   */

  Component_GameSceneBehavior.prototype.restoreAudioPlayback = function() {
    var b, j, len, ref;
    if (this.object.sceneData.audio) {
      ref = this.object.sceneData.audio.audioBuffers;
      for (j = 0, len = ref.length; j < len; j++) {
        b = ref[j];
        AudioManager.audioBuffers.push(b);
      }
      AudioManager.audioBuffersByLayer = this.object.sceneData.audio.audioBuffersByLayer;
      AudioManager.audioLayers = this.object.sceneData.audio.audioLayers;
      return AudioManager.soundReferences = this.object.sceneData.audio.soundReferences;
    }
  };


  /**
  * Restores the scene objects from the current loaded save-game. If no save-game is
  * present in GameManager.loadedSaveGame, nothing will happen.
  *
  * @method restoreScene
  * @protected
   */

  Component_GameSceneBehavior.prototype.restoreScene = function() {
    var c, context, ref, saveGame;
    saveGame = GameManager.loadedSaveGame;
    if (saveGame) {
      context = new gs.ObjectCodecContext([Graphics.viewport, this.object, this], saveGame.encodedObjectStore, null);
      saveGame.data = gs.ObjectCodec.decode(saveGame.data, context);
      if ((function() {
        var j, len, ref, results;
        ref = saveGame.data.characterNames;
        results = [];
        for (j = 0, len = ref.length; j < len; j++) {
          c = ref[j];
          results.push(c);
        }
        return results;
      })()) {
        if ((ref = RecordManager.characters[c.index]) != null) {
          ref.name = c.name;
        }
      }
      GameManager.restore(saveGame);
      gs.ObjectCodec.onRestore(saveGame.data, context);
      this.resourceContext.fromDataBundle(saveGame.data.resourceContext, ResourceManager.resourcesByPath);
      this.object.sceneData = saveGame.data;
      return Graphics.frameCount = saveGame.data.frameCount;
    }
  };


  /**
  * Prepares all data for the scene and loads the necessary graphic and audio resources.
  *
  * @method prepareData
  * @abstract
   */

  Component_GameSceneBehavior.prototype.prepareData = function() {
    GameManager.scene = this.object;
    gs.ObjectManager.current = this.objectManager;
    this.object.sceneData.uid = this.object.sceneDocument.uid;
    if (!ResourceLoader.loadEventCommandsData(this.object.sceneDocument.items.commands)) {
      ResourceLoader.loadEventCommandsGraphics(this.object.sceneDocument.items.commands);
      GameManager.backlog = this.object.sceneData.backlog || GameManager.sceneData.backlog || [];
      ResourceLoader.loadSystemSounds();
      ResourceLoader.loadSystemGraphics();
      ResourceLoader.loadUiTypesGraphics(ui.UiFactory.customTypes);
      ResourceLoader.loadUiLayoutGraphics(ui.UiFactory.layouts.gameLayout);
      if (this.dataFields != null) {
        ResourceLoader.loadUiDataFieldsGraphics(this.dataFields);
      }
      $tempFields.choiceTimer = this.object.choiceTimer;
      return GameManager.variableStore.setup({
        id: this.object.sceneDocument.uid
      });
    }
  };


  /**
  * Prepares all visual game object for the scene.
  *
  * @method prepareVisual
   */

  Component_GameSceneBehavior.prototype.prepareVisual = function() {
    var ref;
    if (this.object.layout) {
      return;
    }
    if (GameManager.tempFields.isExitingGame) {
      GameManager.tempFields.isExitingGame = false;
      gs.GameNotifier.postResetSceneChange(this.object.sceneDocument.items.name);
    } else {
      gs.GameNotifier.postSceneChange(this.object.sceneDocument.items.name);
    }
    this.restoreScene();
    this.object.messageMode = (ref = this.object.sceneData.messageMode) != null ? ref : vn.MessageMode.ADV;
    this.setupMainViewport();
    this.setupViewports();
    this.setupCharacters();
    this.setupBackgrounds();
    this.setupPictures();
    this.setupTexts();
    this.setupVideos();
    this.setupHotspots();
    this.setupInterpreter();
    this.setupLayout();
    this.setupCommonEvents();
    this.restoreMessageBox();
    this.restoreInterpreter();
    this.restoreMessages();
    this.restoreAudioPlayback();
    this.show(true);
    this.object.sceneData = {};
    GameManager.sceneData = {};
    Graphics.update();
    return this.transition({
      duration: 0
    });
  };


  /**
  * Adds a new character to the scene.
  *
  * @method addCharacter
  * @param {vn.Object_Character} character - The character to add.
  * @param {boolean} noAnimation - Indicates if the character should be added immediately witout any appear-animation.
  * @param {Object} animationData - Contains the appear-animation data -> { animation, easing, duration }.
   */

  Component_GameSceneBehavior.prototype.addCharacter = function(character, noAnimation, animationData) {
    if (!noAnimation) {
      character.motionBlur.set(animationData.motionBlur);
      if (animationData.duration > 0) {
        if (!noAnimation) {
          character.animator.appear(character.dstRect.x, character.dstRect.y, animationData.animation, animationData.easing, animationData.duration);
        }
      }
    }
    character.viewport = this.viewport;
    character.visible = true;
    return this.object.characterContainer.addObject(character);
  };


  /**
  * Removes a character from the scene.
  *
  * @method removeCharacter
  * @param {vn.Object_Character} character - The character to remove.
  * @param {Object} animationData - Contains the disappear-animation data -> { animation, easing, duration }.
   */

  Component_GameSceneBehavior.prototype.removeCharacter = function(character, animationData) {
    return character != null ? character.animator.disappear(animationData.animation, animationData.easing, animationData.duration, function(sender) {
      return sender.dispose();
    }) : void 0;
  };


  /**
  * Resumes the current scene if it has been paused.
  *
  * @method resumeScene
   */

  Component_GameSceneBehavior.prototype.resumeScene = function() {
    var message;
    this.object.pictureContainer.active = true;
    this.object.characterContainer.active = true;
    this.object.backgroundContainer.active = true;
    this.object.textContainer.active = true;
    this.object.hotspotContainer.active = true;
    this.object.videoContainer.active = true;
    message = gs.ObjectManager.current.objectById("gameMessage_message");
    return message.active = true;
  };


  /**
  * Pauses the current scene. A paused scene will not continue, messages, pictures, etc. will
  * stop until the scene resumes.
  *
  * @method pauseScene
   */

  Component_GameSceneBehavior.prototype.pauseScene = function() {
    var message;
    this.object.pictureContainer.active = false;
    this.object.characterContainer.active = false;
    this.object.backgroundContainer.active = false;
    this.object.textContainer.active = false;
    this.object.hotspotContainer.active = false;
    this.object.videoContainer.active = false;
    message = gs.ObjectManager.current.objectById("gameMessage_message");
    return message.active = false;
  };


  /**
  * Changes the visibility of the entire game UI like the message boxes, etc. to allows
  * the player to see the entire scene. Useful for CGs, etc.
  *
  * @param {boolean} visible - If <b>true</b>, the game UI will be visible. Otherwise it will be hidden.
  * @method changeUIVisibility
   */

  Component_GameSceneBehavior.prototype.changeUIVisibility = function(visible) {
    this.uiVisible = visible;
    return this.object.layout.visible = visible;
  };


  /**
  * Shows input-text box to let the user enter a text.
  *
  * @param {number} letters - The max. number of letters the user can enter.
  * @param {gs.Callback} callback - A callback function called if the input-text box has been accepted by the user.
  * @method showInputText
   */

  Component_GameSceneBehavior.prototype.showInputText = function(letters, callback) {
    var ref;
    if ((ref = this.object.inputTextBox) != null) {
      ref.dispose();
    }
    this.object.inputTextBox = ui.UiFactory.createControlFromDescriptor(ui.UiFactory.customTypes["ui.InputTextBox"], this.object.layout);
    this.object.inputTextBox.ui.prepare();
    return this.object.inputTextBox.events.on("accept", callback);
  };


  /**
  * Shows input-number box to let the user enter a number.
  *
  * @param {number} digits - The max. number of digits the user can enter.
  * @param {gs.Callback} callback - A callback function called if the input-number box has been accepted by the user.
  * @method showInputNumber
   */

  Component_GameSceneBehavior.prototype.showInputNumber = function(digits, callback) {
    var ref;
    if ((ref = this.object.inputNumberBox) != null) {
      ref.dispose();
    }
    this.object.inputNumberBox = ui.UiFactory.createControlFromDescriptor(ui.UiFactory.customTypes["ui.InputNumberBox"], this.object.layout);
    this.object.inputNumberBox.ui.prepare();
    return this.object.inputNumberBox.events.on("accept", callback);
  };


  /**
  * Shows choices to let the user pick a choice.
  *
  * @param {Object[]} choices - An array of choices
  * @param {gs.Callback} callback - A callback function called if a choice has been picked by the user.
  * @method showChoices
   */

  Component_GameSceneBehavior.prototype.showChoices = function(choices, callback) {
    var ref, useFreeLayout;
    useFreeLayout = choices.where(function(x) {
      return x.dstRect != null;
    }).length > 0;
    GameManager.tempFields.choices = choices;
    if ((ref = this.object.choiceWindow) != null) {
      ref.dispose();
    }
    if (useFreeLayout) {
      this.object.choiceWindow = ui.UiFactory.createControlFromDescriptor(ui.UiFactory.customTypes["ui.FreeChoiceBox"], this.object.layout);
    } else {
      this.object.choiceWindow = ui.UiFactory.createControlFromDescriptor(ui.UiFactory.customTypes["ui.ChoiceBox"], this.object.layout);
    }
    this.object.choiceWindow.events.on("selectionAccept", callback);
    return this.object.choiceWindow.ui.prepare();
  };


  /**
  * Changes the background of the scene.
  *
  * @method changeBackground
  * @param {Object} background - The background graphic object -> { name }
  * @param {boolean} noAnimation - Indicates if the background should be changed immediately witout any change-animation.
  * @param {Object} animation - The appear/disappear animation to use.
  * @param {Object} easing - The easing of the change animation.
  * @param {number} duration - The duration of the change in frames.
  * @param {number} ox - The x-origin of the background.
  * @param {number} oy - The y-origin of the background.
  * @param {number} layer - The background-layer to change.
  * @param {boolean} loopHorizontal - Indicates if the background should be looped horizontally.
  * @param {boolean} loopVertical - Indicates if the background should be looped vertically.
   */

  Component_GameSceneBehavior.prototype.changeBackground = function(background, noAnimation, animation, easing, duration, ox, oy, layer, loopHorizontal, loopVertical) {
    var object, otherObject, ref;
    if (background != null) {
      otherObject = this.object.backgrounds[layer];
      object = new vn.Object_Background();
      object.image = background.name;
      object.origin.x = ox;
      object.origin.y = oy;
      object.viewport = this.viewport;
      object.visual.looping.vertical = false;
      object.visual.looping.horizontal = false;
      object.update();
      this.object.backgroundContainer.setObject(object, layer);
      duration = duration != null ? duration : 30;
      if (otherObject != null) {
        otherObject.zIndex = layer;
      }
      if (duration === 0) {
        if (otherObject != null) {
          otherObject.dispose();
        }
        object.visual.looping.vertical = loopVertical;
        return object.visual.looping.horizontal = loopHorizontal;
      } else {
        if (noAnimation) {
          object.visual.looping.vertical = loopVertical;
          return object.visual.looping.horizontal = loopHorizontal;
        } else {
          object.animator.otherObject = otherObject;
          return object.animator.appear(0, 0, animation, easing, duration, (function(_this) {
            return function(sender) {
              var ref;
              sender.update();
              if ((ref = sender.animator.otherObject) != null) {
                ref.dispose();
              }
              sender.animator.otherObject = null;
              sender.visual.looping.vertical = loopVertical;
              return sender.visual.looping.horizontal = loopHorizontal;
            };
          })(this));
        }
      }
    } else {
      return (ref = this.object.backgrounds[layer]) != null ? ref.animator.hide(duration, easing, (function(_this) {
        return function() {
          _this.object.backgrounds[layer].dispose();
          return _this.object.backgrounds[layer] = null;
        };
      })(this)) : void 0;
    }
  };


  /**
  * Skips all viewport animations except the main viewport animation.
  *
  * @method skipViewports
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipViewports = function() {
    var component, j, k, len, len1, ref, viewport, viewports;
    viewports = this.object.viewportContainer.subObjects;
    for (j = 0, len = viewports.length; j < len; j++) {
      viewport = viewports[j];
      if (viewport) {
        ref = viewport.components;
        for (k = 0, len1 = ref.length; k < len1; k++) {
          component = ref[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips all picture animations.
  *
  * @method skipPictures
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipPictures = function() {
    var component, j, k, len, len1, picture, ref, ref1;
    ref = this.object.pictures;
    for (j = 0, len = ref.length; j < len; j++) {
      picture = ref[j];
      if (picture) {
        ref1 = picture.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips all text animations.
  *
  * @method skipTexts
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipTexts = function() {
    var component, j, k, len, len1, ref, ref1, text;
    ref = this.object.texts;
    for (j = 0, len = ref.length; j < len; j++) {
      text = ref[j];
      if (text) {
        ref1 = text.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips all video animations but not the video-playback itself.
  *
  * @method skipVideos
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipVideos = function() {
    var component, j, k, len, len1, ref, ref1, video;
    ref = this.object.videos;
    for (j = 0, len = ref.length; j < len; j++) {
      video = ref[j];
      if (video) {
        ref1 = video.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips all background animations.
  *
  * @method skipBackgrounds
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipBackgrounds = function() {
    var background, component, j, k, len, len1, ref, ref1;
    ref = this.object.backgrounds;
    for (j = 0, len = ref.length; j < len; j++) {
      background = ref[j];
      if (background) {
        ref1 = background.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips all character animations
  *
  * @method skipCharacters
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipCharacters = function() {
    var character, component, j, k, len, len1, ref, ref1;
    ref = this.object.characters;
    for (j = 0, len = ref.length; j < len; j++) {
      character = ref[j];
      if (character) {
        ref1 = character.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips the main viewport animation.
  *
  * @method skipMainViewport
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipMainViewport = function() {
    var component, j, len, ref;
    ref = this.object.viewport.components;
    for (j = 0, len = ref.length; j < len; j++) {
      component = ref[j];
      if (typeof component.skip === "function") {
        component.skip();
      }
    }
    return null;
  };


  /**
  * Skips all animations of all message boxes defined in MESSAGE_BOX_IDS ui constant.
  *
  * @method skipMessageBoxes
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipMessageBoxes = function() {
    var component, j, k, len, len1, messageBox, messageBoxId, ref, ref1;
    ref = gs.UIConstants.MESSAGE_BOX_IDS || ["messageBox", "messageBoxNVL"];
    for (j = 0, len = ref.length; j < len; j++) {
      messageBoxId = ref[j];
      messageBox = gs.ObjectManager.current.objectById(messageBoxId);
      if (messageBox.components) {
        ref1 = messageBox.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    return null;
  };


  /**
  * Skips all animations of all message areas.
  *
  * @method skipMessageAreas
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipMessageAreas = function() {
    var component, j, k, l, len, len1, len2, len3, m, messageArea, msg, ref, ref1, ref2, ref3;
    ref = this.object.messageAreas;
    for (j = 0, len = ref.length; j < len; j++) {
      messageArea = ref[j];
      if (messageArea != null ? messageArea.message : void 0) {
        ref1 = messageArea.message.components;
        for (k = 0, len1 = ref1.length; k < len1; k++) {
          component = ref1[k];
          if (typeof component.skip === "function") {
            component.skip();
          }
        }
      }
    }
    msg = gs.ObjectManager.current.objectById("gameMessage_message");
    if (msg) {
      ref2 = msg.components;
      for (l = 0, len2 = ref2.length; l < len2; l++) {
        component = ref2[l];
        if (typeof component.skip === "function") {
          component.skip();
        }
      }
    }
    msg = gs.ObjectManager.current.objectById("gameMessageNVL_message");
    if (msg) {
      ref3 = msg.components;
      for (m = 0, len3 = ref3.length; m < len3; m++) {
        component = ref3[m];
        if (typeof component.skip === "function") {
          component.skip();
        }
      }
    }
    return null;
  };


  /**
  * Skips the scene interpreter timer.
  *
  * @method skipInterpreter
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipInterpreter = function() {
    if (this.object.interpreter.waitCounter > GameManager.tempSettings.skipTime) {
      this.object.interpreter.waitCounter = GameManager.tempSettings.skipTime;
      if (this.object.interpreter.waitCounter === 0) {
        return this.object.interpreter.isWaiting = false;
      }
    }
  };


  /**
  * Skips the interpreter timer of all common events.
  *
  * @method skipCommonEvents
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipCommonEvents = function() {
    var event, events, j, len, results;
    events = this.object.commonEventContainer.subObjects;
    results = [];
    for (j = 0, len = events.length; j < len; j++) {
      event = events[j];
      if ((event != null ? event.interpreter : void 0) && event.interpreter.waitCounter > GameManager.tempSettings.skipTime) {
        event.interpreter.waitCounter = GameManager.tempSettings.skipTime;
        if (event.interpreter.waitCounter === 0) {
          results.push(event.interpreter.isWaiting = false);
        } else {
          results.push(void 0);
        }
      } else {
        results.push(void 0);
      }
    }
    return results;
  };


  /**
  * Skips the scene's content.
  *
  * @method skipContent
  * @protected
   */

  Component_GameSceneBehavior.prototype.skipContent = function() {
    this.skipPictures();
    this.skipTexts();
    this.skipVideos();
    this.skipBackgrounds();
    this.skipCharacters();
    this.skipMainViewport();
    this.skipViewports();
    this.skipMessageBoxes();
    this.skipMessageAreas();
    this.skipInterpreter();
    return this.skipCommonEvents();
  };


  /**
  * Checks for the shortcut to hide/show the game UI. By default, this is the space-key. You
  * can override this method to change the shortcut.
  *
  * @method updateUIVisibilityShortcut
  * @protected
   */

  Component_GameSceneBehavior.prototype.updateUIVisibilityShortcut = function() {
    if (!this.uiVisible && (Input.trigger(Input.C) || Input.Mouse.buttonDown)) {
      this.changeUIVisibility(!this.uiVisible);
    }
    if (Input.trigger(Input.KEY_SPACE)) {
      return this.changeUIVisibility(!this.uiVisible);
    }
  };


  /**
  * Checks for the shortcut to exit the game. By default, this is the escape-key. You
  * can override this method to change the shortcut.
  *
  * @method updateQuitShortcut
  * @protected
   */

  Component_GameSceneBehavior.prototype.updateQuitShortcut = function() {
    if (Input.trigger(Input.KEY_ESCAPE)) {
      return gs.Application.exit();
    }
  };


  /**
  * Checks for the shortcut to open the settings menu. By default, this is the s-key. You
  * can override this method to change the shortcut.
  *
  * @method updateSettingsShortcut
  * @protected
   */

  Component_GameSceneBehavior.prototype.updateSettingsShortcut = function() {
    if (GameManager.tempSettings.menuAccess && Input.trigger(Input.X)) {
      return SceneManager.switchTo(new gs.Object_Layout("settingsMenuLayout"), true);
    }
  };


  /**
  * Checks for the shortcut to open the settings menu. By default, this is the control-key. You
  * can override this method to change the shortcut.
  *
  * @method updateSkipShortcut
  * @protected
   */

  Component_GameSceneBehavior.prototype.updateSkipShortcut = function() {
    if (this.object.settings.allowSkip) {
      if (Input.keys[Input.KEY_CONTROL] === 1) {
        return GameManager.tempSettings.skip = true;
      } else if (Input.keys[Input.KEY_CONTROL] === 2) {
        return GameManager.tempSettings.skip = false;
      }
    }
  };


  /**
  * Checks for default keyboard shortcuts e.g space-key to hide the UI, etc.
  *
  * @method updateShortcuts
  * @protected
   */

  Component_GameSceneBehavior.prototype.updateShortcuts = function() {
    this.updateSettingsShortcut();
    this.updateQuitShortcut();
    this.updateUIVisibilityShortcut();
    return this.updateSkipShortcut();
  };


  /**
  * Updates the full screen video played via Play Movie command.
  *
  * @method updateVideo
   */

  Component_GameSceneBehavior.prototype.updateVideo = function() {
    if (this.object.video != null) {
      this.object.video.update();
      if (this.object.settings.allowVideoSkip && (Input.trigger(Input.C) || Input.Mouse.buttons[Input.Mouse.LEFT] === 2)) {
        this.object.video.stop();
      }
      return Input.clear();
    }
  };


  /**
  * Updates skipping if enabled.
  *
  * @method updateSkipping
   */

  Component_GameSceneBehavior.prototype.updateSkipping = function() {
    if (!this.object.settings.allowSkip) {
      this.object.tempSettings.skip = false;
    }
    if (GameManager.tempSettings.skip) {
      return this.skipContent();
    }
  };


  /**
  * Updates the scene's content.
  *
  * @method updateContent
   */

  Component_GameSceneBehavior.prototype.updateContent = function() {
    GameManager.scene = this.object;
    Graphics.viewport.update();
    this.object.viewport.update();
    this.updateSkipping();
    this.updateVideo();
    this.updateShortcuts();
    return Component_GameSceneBehavior.__super__.updateContent.call(this);
  };

  return Component_GameSceneBehavior;

})(gs.Component_LayoutSceneBehavior);

vn.Component_GameSceneBehavior = Component_GameSceneBehavior;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUEsMkJBQUE7RUFBQTs7O0FBQU07Ozs7QUFFRjs7Ozs7Ozs7O0VBUWEscUNBQUE7SUFDVCwyREFBQTtJQUVBLElBQUMsQ0FBQSxzQkFBRCxHQUEwQixDQUFBLFNBQUEsS0FBQTthQUFBLFNBQUE7UUFDdEIsS0FBQyxDQUFBLE1BQU0sQ0FBQyxlQUFSLENBQXdCLEtBQUMsQ0FBQSxNQUFNLENBQUMsV0FBaEM7ZUFDQSxLQUFDLENBQUEsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFwQixDQUFBO01BRnNCO0lBQUEsQ0FBQSxDQUFBLENBQUEsSUFBQTtJQUcxQixJQUFDLENBQUEsdUJBQUQsR0FBMkIsQ0FBQSxTQUFBLEtBQUE7YUFBQSxTQUFBO1FBQ3ZCLElBQUcsQ0FBQyxLQUFDLENBQUEsTUFBTSxDQUFDLFVBQVUsQ0FBQyxRQUFuQixDQUE0QixLQUFDLENBQUEsTUFBTSxDQUFDLFdBQXBDLENBQUo7VUFDSSxLQUFDLENBQUEsTUFBTSxDQUFDLFlBQVIsQ0FBcUIsS0FBQyxDQUFBLE1BQU0sQ0FBQyxXQUE3QixFQURKOztlQUVBLEtBQUMsQ0FBQSxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQXBCLENBQUE7TUFIdUI7SUFBQSxDQUFBLENBQUEsQ0FBQSxJQUFBO0lBSzNCLElBQUMsQ0FBQSxlQUFELEdBQW1CO0lBQ25CLElBQUMsQ0FBQSxZQUFELEdBQWdCO0VBWlA7OztBQWNiOzs7Ozs7d0NBS0EsVUFBQSxHQUFZLFNBQUE7QUFDUixRQUFBO0lBQUEsSUFBRyxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQTVCLEtBQXNDLENBQXpDO01BQ0ksRUFBRSxDQUFDLGtCQUFrQixDQUFDLEtBQXRCLENBQUEsRUFESjs7SUFHQSxJQUFDLENBQUEsZUFBRCxHQUFtQixlQUFlLENBQUMsYUFBaEIsQ0FBQTtJQUNuQixlQUFlLENBQUMsT0FBaEIsR0FBMEIsSUFBQyxDQUFB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Q0FBQyxJQUFaLENBQXBCLEtBQXlDLENBQXBFLENBQXZDO1FBQ0ksSUFBQyxDQUFBLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBZCxDQUFBLEVBREo7O2FBRUEsS0FBSyxDQUFDLEtBQU4sQ0FBQSxFQUpKOztFQURTOzs7QUFPYjs7Ozs7O3dDQUtBLGNBQUEsR0FBZ0IsU0FBQTtJQUNaLElBQUcsQ0FBQyxJQUFDLENBQUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFyQjtNQUNJLElBQUMsQ0FBQSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQXJCLEdBQTRCLE1BRGhDOztJQUdBLElBQUcsV0FBVyxDQUFDLFlBQVksQ0FBQyxJQUE1QjthQUNJLElBQUMsQ0FBQSxXQUFELENBQUEsRUFESjs7RUFKWTs7O0FBT2hCOzs7Ozs7d0NBS0EsYUFBQSxHQUFlLFNBQUE7SUFDWCxXQUFXLENBQUMsS0FBWixHQUFvQixJQUFDLENBQUE7SUFDckIsUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFsQixDQUFBO0lBQ0EsSUFBQyxDQUFBLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBakIsQ0FBQTtJQUVBLElBQUMsQ0FBQSxjQUFELENBQUE7SUFDQSxJQUFDLENBQUEsV0FBRCxDQUFBO0lBQ0EsSUFBQyxDQUFBLGVBQUQsQ0FBQTtXQUVBLDZEQUFBO0VBVFc7Ozs7R0FuOUJ1QixFQUFFLENBQUM7O0FBODlCN0MsRUFBRSxDQUFDLDJCQUFILEdBQWlDIiwic291cmNlc0NvbnRlbnQiOlsiIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4jXG4jICAgU2NyaXB0OiBDb21wb25lbnRfR2FtZVNjZW5lQmVoYXZpb3JcbiNcbiMgICAkJENPUFlSSUdIVCQkXG4jXG4jID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbmNsYXNzIENvbXBvbmVudF9HYW1lU2NlbmVCZWhhdmlvciBleHRlbmRzIGdzLkNvbXBvbmVudF9MYXlvdXRTY2VuZUJlaGF2aW9yXG4gIyAgIEBvYmplY3RDb2RlY0JsYWNrTGlzdCA9IFtcIm9iamVjdE1hbmFnZXJcIl1cbiAgICAjIyMqXG4gICAgKiBEZWZpbmVzIHRoZSBiZWhhdmlvciBvZiB2aXN1YWwgbm92ZWwgZ2FtZSBzY2VuZS5cbiAgICAqXG4gICAgKiBAbW9kdWxlIHZuXG4gICAgKiBAY2xhc3MgQ29tcG9uZW50X0dhbWVTY2VuZUJlaGF2aW9yXG4gICAgKiBAZXh0ZW5kcyBncy5Db21wb25lbnRfTGF5b3V0U2NlbmVCZWhhdmlvclxuICAgICogQG1lbWJlcm9mIHZuXG4gICAgIyMjXG4gICAgY29uc3RydWN0b3I6IC0+XG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgXG4gICAgICAgIEBvbkF1dG9Db21tb25FdmVudFN0YXJ0ID0gPT5cbiAgICAgICAgICAgIEBvYmplY3QucmVtb3ZlQ29tcG9uZW50KEBvYmplY3QuaW50ZXJwcmV0ZXIpXG4gICAgICAgICAgICBAb2JqZWN0LmludGVycHJldGVyLnN0b3AoKVxuICAgICAgICBAb25BdXRvQ29tbW9uRXZlbnRGaW5pc2ggPSA9PlxuICAgICAgICAgICAgaWYgIUBvYmplY3QuY29tcG9uZW50cy5jb250YWlucyhAb2JqZWN0LmludGVycHJldGVyKVxuICAgICAgICAgICAgICAgIEBvYmplY3QuYWRkQ29tcG9uZW50KEBvYmplY3QuaW50ZXJwcmV0ZXIpXG4gICAgICAgICAgICBAb2JqZWN0LmludGVycHJldGVyLnJlc3VtZSgpXG4gICAgICAgICAgICBcbiAgICAgICAgQHJlc291cmNlQ29udGV4dCA9IG51bGxcbiAgICAgICAgQG9iamVjdERvbWFpbiA9IFwiXCJcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogSW5pdGlhbGl6ZXMgdGhlIHNjZW5lLiBcbiAgICAqXG4gICAgKiBAbWV0aG9kIGluaXRpYWxpemVcbiAgICAjIyMgXG4gICAgaW5pdGlhbGl6ZTogLT5cbiAgICAgICAgaWYgU2NlbmVNYW5hZ2VyLnByZXZpb3VzU2NlbmVzLmxlbmd0aCA9PSAwXG4gICAgICAgICAgICBncy5HbG9iYWxFdmVudE1hbmFnZXIuY2xlYXIoKVxuICAgICAgICAgICAgXG4gICAgICAgIEByZXNvdXJjZUNvbnRleHQgPSBSZXNvdXJjZU1hbmFnZXIuY3JlYXRlQ29udGV4dCgpXG4gICAgICAgIFJlc291cmNlTWFuYWdlci5jb250ZXh0ID0gQHJlc291cmNlQ29udGV4dFxuICAgICAgICBcbiAgICAgICAgR3JhcGhpY3MuZnJlZXplKClcbiAgICAgICAgc2F2ZUdhbWUgPSBHYW1lTWFuYWdlci5sb2FkZWRTYXZlR2FtZVxuICAgICAgICBzY2VuZVVpZCA9IG51bGxcbiAgICAgICAgXG4gICAgICAgIGlmIHNhdmVHYW1lXG4gICAgICAgICAgICBzY2VuZVVpZCA9IHNhdmVHYW1lLnNjZW5lVWlkXG4gICAgICAgICAgICBAb2JqZWN0LnNjZW5lRGF0YSA9IHNhdmVHYW1lLmRhdGFcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgc2NlbmVVaWQgPSAkUEFSQU1TLnByZXZpZXc/LnNjZW5lLnVpZCB8fCBAb2JqZWN0LnNjZW5lRGF0YS51aWQgfHwgUmVjb3JkTWFuYWdlci5zeXN0ZW0uc3RhcnRJbmZvLnNjZW5lLnVpZFxuICAgICAgICBcbiAgICAgICAgQG9iamVjdC5zY2VuZURvY3VtZW50ID0gRGF0YU1hbmFnZXIuZ2V0RG9jdW1lbnQoc2NlbmVVaWQpXG4gICAgICAgIFxuICAgICAgICBpZiBAb2JqZWN0LnNjZW5lRG9jdW1lbnQgYW5kIEBvYmplY3Quc2NlbmVEb2N1bWVudC5pdGVtcy50eXBlID09IFwidm4uc2NlbmVcIlxuICAgICAgICAgICAgQG9iamVjdC5jaGFwdGVyID0gRGF0YU1hbmFnZXIuZ2V0RG9jdW1lbnQoQG9iamVjdC5zY2VuZURvY3VtZW50Lml0ZW1zLmNoYXB0ZXJVaWQpXG4gICAgICAgICAgICBAb2JqZWN0LmN1cnJlbnRDaGFyYWN0ZXIgPSB7IFwibmFtZVwiOiBcIlwiIH0gI1JlY29yZE1hbmFnZXIuY2hhcmFjdGVyc1swXVxuICAgIFxuICAgICAgICAgICAgaWYgbm90IEdhbWVNYW5hZ2VyLmluaXRpYWxpemVkXG4gICAgICAgICAgICAgICAgR2FtZU1hbmFnZXIuaW5pdGlhbGl6ZSgpXG4gICAgXG4gICAgICAgICAgICBMYW5ndWFnZU1hbmFnZXIubG9hZEJ1bmRsZXMoKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBzcHJpdGUgPSBuZXcgZ3MuU3ByaXRlKClcbiAgICAgICAgICAgIHNwcml0ZS5iaXRtYXAgPSBuZXcgZ3MuQml0bWFwKEdyYXBoaWNzLndpZHRoLCA1MClcbiAgICAgICAgICAgIHNwcml0ZS5iaXRtYXAuZHJhd1RleHQoMCwgMCwgR3JhcGhpY3Mud2lkdGgsIDUwLCBcIk5vIFN0YXJ0IFNjZW5lIHNlbGVjdGVkXCIsIDEsIDApXG4gICAgICAgICAgICBzcHJpdGUuc3JjUmVjdCA9IG5ldyBncy5SZWN0KDAsIDAsIEdyYXBoaWNzLndpZHRoLCA1MClcbiAgICAgICAgICAgIHNwcml0ZS55ID0gKEdyYXBoaWNzLmhlaWdodCAtIDUwKSAvIDJcbiAgICAgICAgICAgIHNwcml0ZS56ID0gMTAwMDBcbiAgIFxuICAgICAgICBAc2V0dXBTY3JlZW4oKSBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogRGlzcG9zZXMgdGhlIHNjZW5lLiBcbiAgICAqXG4gICAgKiBAbWV0aG9kIGRpc3Bvc2VcbiAgICAjIyNcbiAgICBkaXNwb3NlOiAtPlxuICAgICAgICBSZXNvdXJjZU1hbmFnZXIuY29udGV4dCA9IEByZXNvdXJjZUNvbnRleHRcbiAgICAgICAgQG9iamVjdC5yZW1vdmVPYmplY3QoQG9iamVjdC5jb21tb25FdmVudENvbnRhaW5lcilcbiAgICAgICAgQHNob3cobm8pXG5cbiAgICAgICAgZm9yIGV2ZW50IGluIEdhbWVNYW5hZ2VyLmNvbW1vbkV2ZW50c1xuICAgICAgICAgICAgaWYgZXZlbnRcbiAgICAgICAgICAgICAgICBldmVudC5ldmVudHMub2ZmQnlPd25lcihcInN0YXJ0XCIsIEBvYmplY3QpXG4gICAgICAgICAgICAgICAgZXZlbnQuZXZlbnRzLm9mZkJ5T3duZXIoXCJmaW5pc2hcIiwgQG9iamVjdClcbiAgICAgICAgICAgIFxuICAgICAgICBpZiBAb2JqZWN0LnZpZGVvXG4gICAgICAgICAgICBAb2JqZWN0LnZpZGVvLmRpc3Bvc2UoKVxuICAgICAgICAgICAgQG9iamVjdC52aWRlby5vbkVuZGVkKClcbiAgICAgICAgXG4gICAgICAgIHN1cGVyKClcbiAgICBcbiAgICBjaGFuZ2VQaWN0dXJlRG9tYWluOiAoZG9tYWluKSAtPlxuICAgICAgICBAb2JqZWN0LnBpY3R1cmVDb250YWluZXIuYmVoYXZpb3IuY2hhbmdlRG9tYWluKGRvbWFpbilcbiAgICAgICAgQG9iamVjdC5waWN0dXJlcyA9IEBvYmplY3QucGljdHVyZUNvbnRhaW5lci5zdWJPYmplY3RzXG4gICAgY2hhbmdlVGV4dERvbWFpbjogKGRvbWFpbikgLT5cbiAgICAgICAgQG9iamVjdC50ZXh0Q29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgIEBvYmplY3QudGV4dHMgPSBAb2JqZWN0LnRleHRDb250YWluZXIuc3ViT2JqZWN0c1xuICAgIGNoYW5nZVZpZGVvRG9tYWluOiAoZG9tYWluKSAtPlxuICAgICAgICBAb2JqZWN0LnZpZGVvQ29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgIEBvYmplY3QudmlkZW9zID0gQG9iamVjdC52aWRlb0NvbnRhaW5lci5zdWJPYmplY3RzXG4gICAgY2hhbmdlSG90c3BvdERvbWFpbjogKGRvbWFpbikgLT5cbiAgICAgICAgQG9iamVjdC5ob3RzcG90Q29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgIEBvYmplY3QuaG90c3BvdHMgPSBAb2JqZWN0LmhvdHNwb3RDb250YWluZXIuc3ViT2JqZWN0c1xuICAgIGNoYW5nZU1lc3NhZ2VBcmVhRG9tYWluOiAoZG9tYWluKSAtPlxuICAgICAgICBAb2JqZWN0Lm1lc3NhZ2VBcmVhQ29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgIEBvYmplY3QubWVzc2FnZUFyZWFzID0gQG9iamVjdC5tZXNzYWdlQXJlYUNvbnRhaW5lci5zdWJPYmplY3RzXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTaG93cy9IaWRlcyB0aGUgY3VycmVudCBzY2VuZS4gQSBoaWRkZW4gc2NlbmUgaXMgbm8gbG9uZ2VyIHNob3duIGFuZCBleGVjdXRlZFxuICAgICogYnV0IGFsbCBvYmplY3RzIGFuZCBkYXRhIGlzIHN0aWxsIHRoZXJlIGFuZCBiZSBzaG93biBhZ2FpbiBhbnl0aW1lLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2hvd1xuICAgICogQHBhcmFtIHtib29sZWFufSB2aXNpYmxlIC0gSW5kaWNhdGVzIGlmIHRoZSBzY2VuZSBzaG91bGQgYmUgc2hvd24gb3IgaGlkZGVuLlxuICAgICMjIyAgICAgICAgICBcbiAgICBzaG93OiAodmlzaWJsZSkgLT5cbiAgICAgICAgQG9iamVjdC52aXNpYmxlID0gdmlzaWJsZVxuICAgICAgICBcbiAgICAgICAgQG9iamVjdC5sYXlvdXQ/LnVwZGF0ZSgpXG4gICAgICAgIEBvYmplY3QubGF5b3V0TlZMPy51cGRhdGUoKVxuICAgICAgICBcbiAgICAgICAgQG9iamVjdC5waWN0dXJlQ29udGFpbmVyLmJlaGF2aW9yLnNldFZpc2libGUodmlzaWJsZSlcbiAgICAgICAgQG9iamVjdC5ob3RzcG90Q29udGFpbmVyLmJlaGF2aW9yLnNldFZpc2libGUodmlzaWJsZSlcbiAgICAgICAgQG9iamVjdC50ZXh0Q29udGFpbmVyLmJlaGF2aW9yLnNldFZpc2libGUodmlzaWJsZSlcbiAgICAgICAgQG9iamVjdC52aWRlb0NvbnRhaW5lci5iZWhhdmlvci5zZXRWaXNpYmxlKHZpc2libGUpXG4gICAgICAgIEBvYmplY3QubWVzc2FnZUFyZWFDb250YWluZXIuYmVoYXZpb3Iuc2V0VmlzaWJsZSh2aXNpYmxlKVxuICAgICAgICBAb2JqZWN0LnZpZXdwb3J0Q29udGFpbmVyLmJlaGF2aW9yLnNldFZpc2libGUodmlzaWJsZSlcbiAgICAgICAgQG9iamVjdC5jaGFyYWN0ZXJDb250YWluZXIuYmVoYXZpb3Iuc2V0VmlzaWJsZSh2aXNpYmxlKVxuICAgICAgICBAb2JqZWN0LmJhY2tncm91bmRDb250YWluZXIuYmVoYXZpb3Iuc2V0VmlzaWJsZSh2aXNpYmxlKVxuXG4gICAgICAgIEB2aWV3cG9ydD8udmlzaWJsZSA9IHZpc2libGVcbiAgICAgICAgQG9iamVjdC5jaG9pY2VXaW5kb3c/LnZpc2libGUgPSB2aXNpYmxlXG4gICAgICAgIEBvYmplY3QuaW5wdXROdW1iZXJCb3g/LnZpc2libGUgPSB2aXNpYmxlXG4gICAgICAgIEBvYmplY3QuaW5wdXRUZXh0Qm94Py52aXNpYmxlID0gdmlzaWJsZVxuICAgICAgICBAb2JqZWN0LmlucHV0VGV4dEJveD8udXBkYXRlKClcbiAgICAgICAgQG9iamVjdC5pbnB1dE51bWJlckJveD8udXBkYXRlKClcbiAgICAgICAgQG9iamVjdC5jaG9pY2VXaW5kb3c/LnVwZGF0ZSgpXG4gICAgICAgIFxuICAgICAgICAjaWYgdmlzaWJsZSBhbmQgQG9iamVjdC5jb21tb25FdmVudENvbnRhaW5lci5zdWJPYmplY3RzLmxlbmd0aCA9PSAwXG4gICAgICAgIEBzZXR1cENvbW1vbkV2ZW50cygpXG4gICAgXG4gICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdXAgY29tbW9uIGV2ZW50IGhhbmRsaW5nLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBDb21tb25FdmVudHNcbiAgICAjIyMgICBcbiAgICBzZXR1cENvbW1vbkV2ZW50czogLT5cbiAgICAgICAgY29tbW9uRXZlbnRzID0gQG9iamVjdC5zY2VuZURhdGE/LmNvbW1vbkV2ZW50c1xuICAgICAgICBcbiAgICAgICAgaWYgY29tbW9uRXZlbnRzXG4gICAgICAgICAgICBmb3IgZXZlbnQsIGkgaW4gY29tbW9uRXZlbnRzXG4gICAgICAgICAgICAgICAgaWYgZXZlbnQgYW5kIEBvYmplY3QuY29tbW9uRXZlbnRDb250YWluZXIuc3ViT2JqZWN0cy5pbmRleE9mKGV2ZW50KSA9PSAtMVxuICAgICAgICAgICAgICAgICAgICBAb2JqZWN0LmNvbW1vbkV2ZW50Q29udGFpbmVyLnNldE9iamVjdChldmVudCwgaSlcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuYmVoYXZpb3Iuc2V0dXBFdmVudEhhbmRsZXJzKClcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgZXZlbnQuaW50ZXJwcmV0ZXI/LmlzUnVubmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZXZlbnRzLmVtaXQoXCJzdGFydFwiLCBldmVudClcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgZm9yIGV2ZW50LCBpIGluIEdhbWVNYW5hZ2VyLmNvbW1vbkV2ZW50c1xuICAgICAgICAgICAgICAgIGlmIGV2ZW50IGFuZCAoZXZlbnQucmVjb3JkLnN0YXJ0Q29uZGl0aW9uID09IDEgb3IgZXZlbnQucmVjb3JkLnBhcmFsbGVsKSBhbmQgQG9iamVjdC5jb21tb25FdmVudENvbnRhaW5lci5zdWJPYmplY3RzLmluZGV4T2YoZXZlbnQpID09IC0xXG4gICAgICAgICAgICAgICAgICAgIEBvYmplY3QuY29tbW9uRXZlbnRDb250YWluZXIuc2V0T2JqZWN0KGV2ZW50LCBpKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuZXZlbnRzLm9mZkJ5T3duZXIoXCJzdGFydFwiLCBAb2JqZWN0KVxuICAgICAgICAgICAgICAgICAgICBldmVudC5ldmVudHMub2ZmQnlPd25lcihcImZpbmlzaFwiLCBAb2JqZWN0KVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgaWYgbm90IGV2ZW50LnJlY29yZC5wYXJhbGxlbFxuICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnQuZXZlbnRzLm9uIFwic3RhcnRcIiwgZ3MuQ2FsbEJhY2soXCJvbkF1dG9Db21tb25FdmVudFN0YXJ0XCIsIHRoaXMpLCBudWxsLCBAb2JqZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICBldmVudC5ldmVudHMub24gXCJmaW5pc2hcIiwgZ3MuQ2FsbEJhY2soXCJvbkF1dG9Db21tb25FdmVudEZpbmlzaFwiLCB0aGlzKSwgbnVsbCwgQG9iamVjdFxuXG4gICAgICAgICAgICAgICAgICAgIGlmIGV2ZW50LmludGVycHJldGVyPy5pc1J1bm5pbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGV2ZW50LmV2ZW50cy5lbWl0KFwic3RhcnRcIiwgZXZlbnQpXG4gICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB1cCBtYWluIGludGVycHJldGVyLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBJbnRlcnByZXRlclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgIFxuICAgIHNldHVwSW50ZXJwcmV0ZXI6IC0+XG4gICAgICAgIEBvYmplY3QuY29tbWFuZHMgPSBAb2JqZWN0LnNjZW5lRG9jdW1lbnQuaXRlbXMuY29tbWFuZHNcbiAgICAgICAgXG4gICAgICAgIGlmIEBvYmplY3Quc2NlbmVEYXRhLmludGVycHJldGVyXG4gICAgICAgICAgICBAb2JqZWN0LnJlbW92ZUNvbXBvbmVudChAb2JqZWN0LmludGVycHJldGVyKVxuICAgICAgICAgICAgQG9iamVjdC5pbnRlcnByZXRlciA9IEBvYmplY3Quc2NlbmVEYXRhLmludGVycHJldGVyXG4gICAgICAgICAgICBAb2JqZWN0LmFkZENvbXBvbmVudChAb2JqZWN0LmludGVycHJldGVyKVxuICAgICAgICAgICAgI09iamVjdC5taXhpbihAb2JqZWN0LmludGVycHJldGVyLCBAb2JqZWN0LnNjZW5lRGF0YS5pbnRlcnByZXRlciwgZ3MuQ29tcG9uZW50X0NvbW1hbmRJbnRlcnByZXRlci5vYmplY3RDb2RlY0JsYWNrTGlzdClcbiAgICAgICAgICAgIEBvYmplY3QuaW50ZXJwcmV0ZXIuY29udGV4dC5zZXQoQG9iamVjdC5zY2VuZURvY3VtZW50LnVpZCwgQG9iamVjdClcbiAgICAgICAgICAgIEBvYmplY3QuaW50ZXJwcmV0ZXIub2JqZWN0ID0gQG9iamVjdFxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBAb2JqZWN0LmludGVycHJldGVyLnNldHVwKClcbiAgICAgICAgICAgIEBvYmplY3QuaW50ZXJwcmV0ZXIuY29udGV4dC5zZXQoQG9iamVjdC5zY2VuZURvY3VtZW50LnVpZCwgQG9iamVjdClcbiAgICAgICAgICAgIEBvYmplY3QuaW50ZXJwcmV0ZXIuc3RhcnQoKVxuICAgICAgICAgICAgXG4gICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdXAgY2hhcmFjdGVycyBhbmQgcmVzdG9yZXMgdGhlbSBmcm9tIGxvYWRlZCBzYXZlIGdhbWUgaWYgbmVjZXNzYXJ5LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBDaGFyYWN0ZXJzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgIFxuICAgIHNldHVwQ2hhcmFjdGVyczogLT5cbiAgICAgICAgaWYgQG9iamVjdC5zY2VuZURhdGEuY2hhcmFjdGVycz9cbiAgICAgICAgICAgIGZvciBjLCBpIGluIEBvYmplY3Quc2NlbmVEYXRhLmNoYXJhY3RlcnNcbiAgICAgICAgICAgICAgICBAb2JqZWN0LmNoYXJhY3RlckNvbnRhaW5lci5zZXRPYmplY3QoYywgaSlcbiAgICAgICAgXG4gICAgICAgIEBvYmplY3QuY3VycmVudENoYXJhY3RlciA9IEBvYmplY3Quc2NlbmVEYXRhLmN1cnJlbnRDaGFyYWN0ZXIgfHwgeyBuYW1lOiBcIlwiIH0jUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzWzBdXG4gICAgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB1cCB2aWV3cG9ydHMgYW5kIHJlc3RvcmVzIHRoZW0gZnJvbSBsb2FkZWQgc2F2ZSBnYW1lIGlmIG5lY2Vzc2FyeS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldHVwVmlld3BvcnRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIHNldHVwVmlld3BvcnRzOiAtPlxuICAgICAgICB2aWV3cG9ydHMgPSBAb2JqZWN0LnNjZW5lRGF0YT8udmlld3BvcnRzID8gW11cbiAgICAgICAgZm9yIHZpZXdwb3J0LCBpIGluIHZpZXdwb3J0c1xuICAgICAgICAgICAgaWYgdmlld3BvcnRcbiAgICAgICAgICAgICAgICBAb2JqZWN0LnZpZXdwb3J0Q29udGFpbmVyLnNldE9iamVjdCh2aWV3cG9ydCwgaSlcbiAgICAjIyMqXG4gICAgKiBTZXRzIHVwIGJhY2tncm91bmRzIGFuZCByZXN0b3JlcyB0aGVtIGZyb20gbG9hZGVkIHNhdmUgZ2FtZSBpZiBuZWNlc3NhcnkuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cEJhY2tncm91bmRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgXG4gICAgc2V0dXBCYWNrZ3JvdW5kczogLT5cbiAgICAgICAgYmFja2dyb3VuZHMgPSBAb2JqZWN0LnNjZW5lRGF0YT8uYmFja2dyb3VuZHMgPyBbXVxuICAgICAgICBmb3IgYiwgaSBpbiBiYWNrZ3JvdW5kc1xuICAgICAgICAgICAgQG9iamVjdC5iYWNrZ3JvdW5kQ29udGFpbmVyLnNldE9iamVjdChiLCBpKVxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB1cCBwaWN0dXJlcyBhbmQgcmVzdG9yZXMgdGhlbSBmcm9tIGxvYWRlZCBzYXZlIGdhbWUgaWYgbmVjZXNzYXJ5LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBQaWN0dXJlc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIHNldHVwUGljdHVyZXM6IC0+XG4gICAgICAgIHBpY3R1cmVzID0gQG9iamVjdC5zY2VuZURhdGE/LnBpY3R1cmVzID8ge31cbiAgICAgICAgZm9yIGRvbWFpbiBvZiBwaWN0dXJlc1xuICAgICAgICAgICAgQG9iamVjdC5waWN0dXJlQ29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgICAgICBpZiBwaWN0dXJlc1tkb21haW5dIHRoZW4gZm9yIHBpY3R1cmUsIGkgaW4gcGljdHVyZXNbZG9tYWluXVxuICAgICAgICAgICAgICAgIEBvYmplY3QucGljdHVyZUNvbnRhaW5lci5zZXRPYmplY3QocGljdHVyZSwgaSlcbiAgICAgICAgICAgICAgICBpZiBwaWN0dXJlPy5pbWFnZVxuICAgICAgICAgICAgICAgICAgICBwYXRoID0gXCJHcmFwaGljcy9QaWN0dXJlcy8je3BpY3R1cmUuaW1hZ2V9XCJcbiAgICAgICAgICAgICAgICAgICAgQHJlc291cmNlQ29udGV4dC5hZGQocGF0aCwgUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlc0J5UGF0aFtwYXRoXSlcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB1cCB0ZXh0cyBhbmQgcmVzdG9yZXMgdGhlbSBmcm9tIGxvYWRlZCBzYXZlIGdhbWUgaWYgbmVjZXNzYXJ5LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBUZXh0c1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgIFxuICAgIHNldHVwVGV4dHM6IC0+XG4gICAgICAgIHRleHRzID0gQG9iamVjdC5zY2VuZURhdGE/LnRleHRzID8ge31cbiAgICAgICAgZm9yIGRvbWFpbiBvZiB0ZXh0c1xuICAgICAgICAgICAgQG9iamVjdC50ZXh0Q29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgICAgICBpZiB0ZXh0c1tkb21haW5dIHRoZW4gZm9yIHRleHQsIGkgaW4gdGV4dHNbZG9tYWluXVxuICAgICAgICAgICAgICAgIEBvYmplY3QudGV4dENvbnRhaW5lci5zZXRPYmplY3QodGV4dCwgaSlcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdXAgdmlkZW9zIGFuZCByZXN0b3JlcyB0aGVtIGZyb20gbG9hZGVkIHNhdmUgZ2FtZSBpZiBuZWNlc3NhcnkuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cFZpZGVvc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBzZXR1cFZpZGVvczogLT5cbiAgICAgICAgdmlkZW9zID0gQG9iamVjdC5zY2VuZURhdGE/LnZpZGVvcyA/IHt9XG4gICAgICAgIGZvciBkb21haW4gb2YgdmlkZW9zXG4gICAgICAgICAgICBAb2JqZWN0LnZpZGVvQ29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgICAgICBpZiB2aWRlb3NbZG9tYWluXSB0aGVuIGZvciB2aWRlbywgaSBpbiB2aWRlb3NbZG9tYWluXVxuICAgICAgICAgICAgICAgIGlmIHZpZGVvXG4gICAgICAgICAgICAgICAgICAgIHBhdGggPSBcIk1vdmllcy8je3ZpZGVvLnZpZGVvfVwiXG4gICAgICAgICAgICAgICAgICAgIEByZXNvdXJjZUNvbnRleHQuYWRkKHBhdGgsIFJlc291cmNlTWFuYWdlci5yZXNvdXJjZXNCeVBhdGhbcGF0aF0pXG4gICAgICAgICAgICAgICAgICAgIHZpZGVvLnZpc2libGUgPSB5ZXNcbiAgICAgICAgICAgICAgICAgICAgdmlkZW8udXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgQG9iamVjdC52aWRlb0NvbnRhaW5lci5zZXRPYmplY3QodmlkZW8sIGkpXG4gICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdXAgaG90c3BvdHMgYW5kIHJlc3RvcmVzIHRoZW0gZnJvbSBsb2FkZWQgc2F2ZSBnYW1lIGlmIG5lY2Vzc2FyeS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldHVwSG90c3BvdHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgIFxuICAgIHNldHVwSG90c3BvdHM6IC0+XG4gICAgICAgIGhvdHNwb3RzID0gQG9iamVjdC5zY2VuZURhdGE/LmhvdHNwb3RzID8ge31cbiAgICAgICAgZm9yIGRvbWFpbiBvZiBob3RzcG90c1xuICAgICAgICAgICAgQG9iamVjdC5ob3RzcG90Q29udGFpbmVyLmJlaGF2aW9yLmNoYW5nZURvbWFpbihkb21haW4pXG4gICAgICAgICAgICBpZiBob3RzcG90c1tkb21haW5dIHRoZW4gZm9yIGhvdHNwb3QsIGkgaW4gaG90c3BvdHNbZG9tYWluXVxuICAgICAgICAgICAgICAgIEBvYmplY3QuaG90c3BvdENvbnRhaW5lci5zZXRPYmplY3QoaG90c3BvdCwgaSlcbiAgICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB1cCBsYXlvdXQuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cExheW91dFxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgICBcbiAgICBzZXR1cExheW91dDogLT5cbiAgICAgICAgQGRhdGFGaWVsZHMgPSB1aS5VSU1hbmFnZXIuZGF0YVNvdXJjZXNbdWkuVWlGYWN0b3J5LmxheW91dHMuZ2FtZUxheW91dC5kYXRhU291cmNlIHx8IFwiZGVmYXVsdFwiXSgpXG4gICAgICAgIEBkYXRhRmllbGRzLnNjZW5lID0gQG9iamVjdFxuICAgICAgICB3aW5kb3cuJGRhdGFGaWVsZHMgPSBAZGF0YUZpZWxkc1xuICAgICAgICBhZHZWaXNpYmxlID0gQG9iamVjdC5tZXNzYWdlTW9kZSA9PSB2bi5NZXNzYWdlTW9kZS5BRFZcbiAgICAgICAgbnZsVmlzaWJsZSA9IEBvYmplY3QubWVzc2FnZU1vZGUgPT0gdm4uTWVzc2FnZU1vZGUuTlZMXG4gICAgICAgIEBvYmplY3QubGF5b3V0TlZMID0gdWkuVWlGYWN0b3J5LmNyZWF0ZUZyb21EZXNjcmlwdG9yKHVpLlVpRmFjdG9yeS5sYXlvdXRzLmdhbWVMYXlvdXROVkwsIEBvYmplY3QpXG4gICAgICAgIEBvYmplY3QubGF5b3V0ID0gdWkuVWlGYWN0b3J5LmNyZWF0ZUZyb21EZXNjcmlwdG9yKHVpLlVpRmFjdG9yeS5sYXlvdXRzLmdhbWVMYXlvdXQsIEBvYmplY3QpXG4gICAgICAgIEBvYmplY3QubGF5b3V0TlZMLnZpc2libGUgPSBudmxWaXNpYmxlXG4gICAgICAgIEBvYmplY3QubGF5b3V0LnZpc2libGUgPSBhZHZWaXNpYmxlXG4gICAgICAgICRnYW1lTWVzc2FnZU5WTF9tZXNzYWdlLnZpc2libGUgPSBudmxWaXNpYmxlXG4gICAgICAgICRnYW1lTWVzc2FnZV9tZXNzYWdlLnZpc2libGUgPSBhZHZWaXNpYmxlXG4gICAgICAgIEBvYmplY3QubGF5b3V0LnVpLnByZXBhcmUoKVxuICAgICAgICBAb2JqZWN0LmxheW91dE5WTC51aS5wcmVwYXJlKClcbiAgICAgICAgXG4gICAgICAgIGlmICR0ZW1wRmllbGRzLmNob2ljZXM/Lmxlbmd0aCA+IDBcbiAgICAgICAgICAgIEBzaG93Q2hvaWNlcyhHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZXMsIGdzLkNhbGxCYWNrKFwib25DaG9pY2VBY2NlcHRcIiwgQG9iamVjdC5pbnRlcnByZXRlciwgeyBwb2ludGVyOiBAb2JqZWN0LmludGVycHJldGVyLnBvaW50ZXIsIHBhcmFtczogQHBhcmFtcyB9KSlcbiAgICBcbiAgICAgICAgaWYgQG9iamVjdC5pbnRlcnByZXRlci53YWl0aW5nRm9yLmlucHV0TnVtYmVyXG4gICAgICAgICAgICBAc2hvd0lucHV0TnVtYmVyKEdhbWVNYW5hZ2VyLnRlbXBGaWVsZHMuZGlnaXRzLCBncy5DYWxsQmFjayhcIm9uSW5wdXROdW1iZXJGaW5pc2hcIiwgQG9iamVjdC5pbnRlcnByZXRlciwgQG9iamVjdC5pbnRlcnByZXRlcikpXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgQG9iamVjdC5pbnRlcnByZXRlci53YWl0aW5nRm9yLmlucHV0VGV4dFxuICAgICAgICAgICAgQHNob3dJbnB1dFRleHQoR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5sZXR0ZXJzLCBncy5DYWxsQmFjayhcIm9uSW5wdXRUZXh0RmluaXNoXCIsIEBvYmplY3QuaW50ZXJwcmV0ZXIsIEBvYmplY3QuaW50ZXJwcmV0ZXIpKVxuICAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHVwIHRoZSBtYWluIHZpZXdwb3J0IC8gc2NyZWVuIHZpZXdwb3J0LlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBNYWluVmlld3BvcnRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgc2V0dXBNYWluVmlld3BvcnQ6IC0+XG4gICAgICAgIGlmICFAb2JqZWN0LnNjZW5lRGF0YS52aWV3cG9ydFxuICAgICAgICAgICAgR2FtZU1hbmFnZXIuc2NlbmVWaWV3cG9ydC5yZW1vdmVDb21wb25lbnQoR2FtZU1hbmFnZXIuc2NlbmVWaWV3cG9ydC52aXN1YWwpXG4gICAgICAgICAgICBHYW1lTWFuYWdlci5zY2VuZVZpZXdwb3J0LmRpc3Bvc2UoKVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIuc2NlbmVWaWV3cG9ydCA9IG5ldyBncy5PYmplY3RfVmlld3BvcnQoR2FtZU1hbmFnZXIuc2NlbmVWaWV3cG9ydC52aXN1YWwudmlld3BvcnQpXG4gICAgICAgICAgICBAdmlld3BvcnQgPSBHYW1lTWFuYWdlci5zY2VuZVZpZXdwb3J0LnZpc3VhbC52aWV3cG9ydFxuICAgICAgICAgICAgQG9iamVjdC52aWV3cG9ydCA9IEdhbWVNYW5hZ2VyLnNjZW5lVmlld3BvcnRcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgR2FtZU1hbmFnZXIuc2NlbmVWaWV3cG9ydC5kaXNwb3NlKClcbiAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnNjZW5lVmlld3BvcnQgPSBAb2JqZWN0LnNjZW5lRGF0YS52aWV3cG9ydFxuICAgICAgICAgICAgQG9iamVjdC52aWV3cG9ydCA9IEBvYmplY3Quc2NlbmVEYXRhLnZpZXdwb3J0XG4gICAgICAgICAgICBAdmlld3BvcnQgPSBAb2JqZWN0LnZpZXdwb3J0LnZpc3VhbC52aWV3cG9ydFxuICAgICAgICAgICAgQHZpZXdwb3J0LnZpZXdwb3J0ID0gR3JhcGhpY3Mudmlld3BvcnRcbiAgICAgICAgICAgIEBvYmplY3QuYWRkT2JqZWN0KEBvYmplY3Qudmlld3BvcnQpXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHVwIHNjcmVlbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldHVwU2NyZWVuXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIHNldHVwU2NyZWVuOiAtPlxuICAgICAgICBpZiBAb2JqZWN0LnNjZW5lRGF0YS5zY3JlZW5cbiAgICAgICAgICAgIEBvYmplY3Qudmlld3BvcnQucmVzdG9yZShAb2JqZWN0LnNjZW5lRGF0YS5zY3JlZW4pXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBSZXN0b3JlcyBtYWluIGludGVycHJldGVyIGZyb20gbG9hZGVkIHNhdmUgZ2FtZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHJlc3RvcmVJbnRlcnByZXRlclxuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgICAgIFxuICAgIHJlc3RvcmVJbnRlcnByZXRlcjogLT5cbiAgICAgICAgaWYgQG9iamVjdC5zY2VuZURhdGEuaW50ZXJwcmV0ZXJcbiAgICAgICAgICAgIEBvYmplY3QuaW50ZXJwcmV0ZXIucmVzdG9yZSgpXG4gICAgXG4gICAgIyMjKlxuICAgICogUmVzdG9yZXMgbWVzc2FnZSBib3ggZnJvbSBsb2FkZWQgc2F2ZSBnYW1lLlxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzdG9yZU1lc3NhZ2VCb3hcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIHJlc3RvcmVNZXNzYWdlQm94OiAtPlxuICAgICAgICBtZXNzYWdlQm94ZXMgPSBAb2JqZWN0LnNjZW5lRGF0YT8ubWVzc2FnZUJveGVzXG4gICAgICAgIGlmIG1lc3NhZ2VCb3hlc1xuICAgICAgICAgICAgZm9yIG1lc3NhZ2VCb3ggaW4gbWVzc2FnZUJveGVzXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKG1lc3NhZ2VCb3guaWQpXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdC52aXNpYmxlID0gbWVzc2FnZUJveC52aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgbWVzc2FnZUJveC5tZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChtZXNzYWdlQm94Lm1lc3NhZ2UuaWQpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudGV4dFJlbmRlcmVyLmRpc3Bvc2UoKVxuICAgICAgICAgICAgICAgICAgICBPYmplY3QubWl4aW4obWVzc2FnZSwgbWVzc2FnZUJveC5tZXNzYWdlLCB1aS5PYmplY3RfTWVzc2FnZS5vYmplY3RDb2RlY0JsYWNrTGlzdC5jb25jYXQoW1wib3JpZ2luXCJdKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBmb3IgYyBpbiBtZXNzYWdlLmNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgICAgIGMub2JqZWN0ID0gbWVzc2FnZVxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogUmVzdG9yZXMgbWVzc2FnZSBmcm9tIGxvYWRlZCBzYXZlIGdhbWUuXG4gICAgKlxuICAgICogQG1ldGhvZCByZXN0b3JlTWVzc2FnZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgICAgIFxuICAgIHJlc3RvcmVNZXNzYWdlczogLT5cbiAgICAgICAgaWYgQG9iamVjdC5tZXNzYWdlTW9kZSA9PSB2bi5NZXNzYWdlTW9kZS5OVkxcbiAgICAgICAgICAgICAgICBtZXNzYWdlT2JqZWN0ID0gZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50Lm9iamVjdEJ5SWQoXCJnYW1lTWVzc2FnZU5WTF9tZXNzYWdlXCIpXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgbWVzc2FnZU9iamVjdCA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VfbWVzc2FnZVwiKVxuICAgICAgICBcbiAgICAgICAgaWYgQG9iamVjdC5zY2VuZURhdGE/Lm1lc3NhZ2VcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QucmVzdG9yZShAb2JqZWN0LnNjZW5lRGF0YS5tZXNzYWdlKVxuICAgICAgICAgICAgXG4gICAgICAgIGlmIEBvYmplY3Quc2NlbmVEYXRhPy5tZXNzYWdlc1xuICAgICAgICAgICAgbWVzc2FnZU9iamVjdC5tZXNzYWdlLnJlc3RvcmVNZXNzYWdlcyhAb2JqZWN0LnNjZW5lRGF0YS5tZXNzYWdlcylcbiAgICAgICAgICAgIG1lc3NhZ2VPYmplY3QudGV4dFJlbmRlcmVyLnJlc3RvcmUoQG9iamVjdC5zY2VuZURhdGEubWVzc2FnZVRleHRSZW5kZXJlcilcbiAgICAgICAgICAgIFxuICAgICAgICBpZiBAb2JqZWN0LnNjZW5lRGF0YT8ubWVzc2FnZUFyZWFzXG4gICAgICAgICAgICBmb3IgZG9tYWluIG9mIEBvYmplY3Quc2NlbmVEYXRhLm1lc3NhZ2VBcmVhc1xuICAgICAgICAgICAgICAgIEBvYmplY3QubWVzc2FnZUFyZWFDb250YWluZXIuYmVoYXZpb3IuY2hhbmdlRG9tYWluKGRvbWFpbilcbiAgICAgICAgICAgICAgICBtZXNzYWdlQXJlYXMgPSBAb2JqZWN0LnNjZW5lRGF0YS5tZXNzYWdlQXJlYXNcbiAgICAgICAgICAgICAgICBpZiBtZXNzYWdlQXJlYXNbZG9tYWluXSB0aGVuIGZvciBhcmVhLCBpIGluIG1lc3NhZ2VBcmVhc1tkb21haW5dXG4gICAgICAgICAgICAgICAgICAgIGlmIGFyZWFcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VBcmVhID0gbmV3IGdzLk9iamVjdF9NZXNzYWdlQXJlYSgpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGF5b3V0ID0gdWkuVUlNYW5hZ2VyLmNyZWF0ZUNvbnRyb2xGcm9tRGVzY3JpcHRvcih0eXBlOiBcInVpLkN1c3RvbUdhbWVNZXNzYWdlXCIsIGlkOiBcImN1c3RvbUdhbWVNZXNzYWdlX1wiK2ksIHBhcmFtczogeyBpZDogXCJjdXN0b21HYW1lTWVzc2FnZV9cIitpIH0sIG1lc3NhZ2VBcmVhKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiY3VzdG9tR2FtZU1lc3NhZ2VfXCIraStcIl9tZXNzYWdlXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBPYmplY3QubWl4aW4obWVzc2FnZSwgYXJlYS5tZXNzYWdlKVxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIGMgaW4gbWVzc2FnZS5jb21wb25lbnRzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYy5vYmplY3QgPSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICAjbWVzc2FnZS5yZXN0b3JlKGYubWVzc2FnZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZUxheW91dC5kc3RSZWN0LnggPSBhcmVhLmxheW91dC5kc3RSZWN0LnhcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQuZHN0UmVjdC55ID0gYXJlYS5sYXlvdXQuZHN0UmVjdC55XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGF5b3V0LmRzdFJlY3Qud2lkdGggPSBhcmVhLmxheW91dC5kc3RSZWN0LndpZHRoXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlTGF5b3V0LmRzdFJlY3QuaGVpZ2h0ID0gYXJlYS5sYXlvdXQuZHN0UmVjdC5oZWlnaHRcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQubmVlZHNVcGRhdGUgPSB5ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VMYXlvdXQudXBkYXRlKClcbiAgICAgICAgICAgICAgICAgICAgICAgICNtZXNzYWdlLm1lc3NhZ2UucmVzdG9yZU1lc3NhZ2VzKGYubWVzc2FnZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAjbWVzc2FnZS50ZXh0UmVuZGVyZXIucmVzdG9yZShmLnRleHRSZW5kZXJlcilcbiAgICAgICAgICAgICAgICAgICAgICAgICNtZXNzYWdlLnZpc2libGUgPSB5ZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VBcmVhLm1lc3NhZ2UgPSBtZXNzYWdlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlQXJlYS5sYXlvdXQgPSBtZXNzYWdlTGF5b3V0XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlQXJlYS5hZGRPYmplY3QobWVzc2FnZUxheW91dClcbiAgICAgICAgICAgICAgICAgICAgICAgIEBvYmplY3QubWVzc2FnZUFyZWFDb250YWluZXIuc2V0T2JqZWN0KG1lc3NhZ2VBcmVhLCBpKVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgXG4gICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogUmVzdG9yZXMgYXVkaW8tcGxheWJhY2sgZnJvbSBsb2FkZWQgc2F2ZSBnYW1lLlxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzdG9yZUF1ZGlvUGxheWJhY2tcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICBcbiAgICByZXN0b3JlQXVkaW9QbGF5YmFjazogLT5cbiAgICAgICAgaWYgQG9iamVjdC5zY2VuZURhdGEuYXVkaW9cbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5hdWRpb0J1ZmZlcnMucHVzaChiKSBmb3IgYiBpbiBAb2JqZWN0LnNjZW5lRGF0YS5hdWRpby5hdWRpb0J1ZmZlcnNcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5hdWRpb0J1ZmZlcnNCeUxheWVyID0gQG9iamVjdC5zY2VuZURhdGEuYXVkaW8uYXVkaW9CdWZmZXJzQnlMYXllclxuICAgICAgICAgICAgQXVkaW9NYW5hZ2VyLmF1ZGlvTGF5ZXJzID0gQG9iamVjdC5zY2VuZURhdGEuYXVkaW8uYXVkaW9MYXllcnNcbiAgICAgICAgICAgIEF1ZGlvTWFuYWdlci5zb3VuZFJlZmVyZW5jZXMgPSBAb2JqZWN0LnNjZW5lRGF0YS5hdWRpby5zb3VuZFJlZmVyZW5jZXNcbiAgICAgICAgICAgIFxuICAgICBcbiAgICAjIyMqXG4gICAgKiBSZXN0b3JlcyB0aGUgc2NlbmUgb2JqZWN0cyBmcm9tIHRoZSBjdXJyZW50IGxvYWRlZCBzYXZlLWdhbWUuIElmIG5vIHNhdmUtZ2FtZSBpc1xuICAgICogcHJlc2VudCBpbiBHYW1lTWFuYWdlci5sb2FkZWRTYXZlR2FtZSwgbm90aGluZyB3aWxsIGhhcHBlbi5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHJlc3RvcmVTY2VuZVxuICAgICogQHByb3RlY3RlZFxuICAgICMjI1xuICAgIHJlc3RvcmVTY2VuZTogLT5cbiAgICAgICAgc2F2ZUdhbWUgPSBHYW1lTWFuYWdlci5sb2FkZWRTYXZlR2FtZVxuICAgICAgICBpZiBzYXZlR2FtZVxuICAgICAgICAgICAgY29udGV4dCA9IG5ldyBncy5PYmplY3RDb2RlY0NvbnRleHQoW0dyYXBoaWNzLnZpZXdwb3J0LCBAb2JqZWN0LCB0aGlzXSwgc2F2ZUdhbWUuZW5jb2RlZE9iamVjdFN0b3JlLCBudWxsKVxuICAgICAgICAgICAgc2F2ZUdhbWUuZGF0YSA9IGdzLk9iamVjdENvZGVjLmRlY29kZShzYXZlR2FtZS5kYXRhLCBjb250ZXh0KVxuICAgICAgICAgICAgUmVjb3JkTWFuYWdlci5jaGFyYWN0ZXJzW2MuaW5kZXhdPy5uYW1lID0gYy5uYW1lIGlmIGMgZm9yIGMgaW4gc2F2ZUdhbWUuZGF0YS5jaGFyYWN0ZXJOYW1lc1xuICAgICAgICAgICAgR2FtZU1hbmFnZXIucmVzdG9yZShzYXZlR2FtZSlcbiAgICAgICAgICAgIGdzLk9iamVjdENvZGVjLm9uUmVzdG9yZShzYXZlR2FtZS5kYXRhLCBjb250ZXh0KVxuICAgICAgICAgICAgQHJlc291cmNlQ29udGV4dC5mcm9tRGF0YUJ1bmRsZShzYXZlR2FtZS5kYXRhLnJlc291cmNlQ29udGV4dCwgUmVzb3VyY2VNYW5hZ2VyLnJlc291cmNlc0J5UGF0aClcblxuICAgICAgICAgICAgQG9iamVjdC5zY2VuZURhdGEgPSBzYXZlR2FtZS5kYXRhXG4gICAgICAgICAgICBHcmFwaGljcy5mcmFtZUNvdW50ID0gc2F2ZUdhbWUuZGF0YS5mcmFtZUNvdW50XG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFByZXBhcmVzIGFsbCBkYXRhIGZvciB0aGUgc2NlbmUgYW5kIGxvYWRzIHRoZSBuZWNlc3NhcnkgZ3JhcGhpYyBhbmQgYXVkaW8gcmVzb3VyY2VzLlxuICAgICpcbiAgICAqIEBtZXRob2QgcHJlcGFyZURhdGFcbiAgICAqIEBhYnN0cmFjdFxuICAgICMjI1xuICAgIHByZXBhcmVEYXRhOiAtPlxuICAgICAgICAjUmVjb3JkTWFuYWdlci50cmFuc2xhdGUoKVxuICAgICAgICBcbiAgICAgICAgR2FtZU1hbmFnZXIuc2NlbmUgPSBAb2JqZWN0XG5cbiAgICAgICAgZ3MuT2JqZWN0TWFuYWdlci5jdXJyZW50ID0gQG9iamVjdE1hbmFnZXJcbiAgICAgICAgXG4gICAgICAgIEBvYmplY3Quc2NlbmVEYXRhLnVpZCA9IEBvYmplY3Quc2NlbmVEb2N1bWVudC51aWRcbiAgICAgICAgXG4gICAgICAgIGlmICFSZXNvdXJjZUxvYWRlci5sb2FkRXZlbnRDb21tYW5kc0RhdGEoQG9iamVjdC5zY2VuZURvY3VtZW50Lml0ZW1zLmNvbW1hbmRzKVxuICAgICAgICAgICAgUmVzb3VyY2VMb2FkZXIubG9hZEV2ZW50Q29tbWFuZHNHcmFwaGljcyhAb2JqZWN0LnNjZW5lRG9jdW1lbnQuaXRlbXMuY29tbWFuZHMpXG4gICAgICAgICAgICBHYW1lTWFuYWdlci5iYWNrbG9nID0gQG9iamVjdC5zY2VuZURhdGEuYmFja2xvZyB8fCBHYW1lTWFuYWdlci5zY2VuZURhdGEuYmFja2xvZyB8fCBbXVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBSZXNvdXJjZUxvYWRlci5sb2FkU3lzdGVtU291bmRzKClcbiAgICAgICAgICAgIFJlc291cmNlTG9hZGVyLmxvYWRTeXN0ZW1HcmFwaGljcygpXG4gICAgICAgICAgICBSZXNvdXJjZUxvYWRlci5sb2FkVWlUeXBlc0dyYXBoaWNzKHVpLlVpRmFjdG9yeS5jdXN0b21UeXBlcylcbiAgICAgICAgICAgIFJlc291cmNlTG9hZGVyLmxvYWRVaUxheW91dEdyYXBoaWNzKHVpLlVpRmFjdG9yeS5sYXlvdXRzLmdhbWVMYXlvdXQpXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIEBkYXRhRmllbGRzP1xuICAgICAgICAgICAgICAgIFJlc291cmNlTG9hZGVyLmxvYWRVaURhdGFGaWVsZHNHcmFwaGljcyhAZGF0YUZpZWxkcylcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICR0ZW1wRmllbGRzLmNob2ljZVRpbWVyID0gQG9iamVjdC5jaG9pY2VUaW1lclxuICAgICAgICAgICAgXG4gICAgICAgICAgICBHYW1lTWFuYWdlci52YXJpYWJsZVN0b3JlLnNldHVwKHsgaWQ6IEBvYmplY3Quc2NlbmVEb2N1bWVudC51aWR9KVxuICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogUHJlcGFyZXMgYWxsIHZpc3VhbCBnYW1lIG9iamVjdCBmb3IgdGhlIHNjZW5lLlxuICAgICpcbiAgICAqIEBtZXRob2QgcHJlcGFyZVZpc3VhbFxuICAgICMjIyBcbiAgICBwcmVwYXJlVmlzdWFsOiAtPlxuICAgICAgICBpZiBAb2JqZWN0LmxheW91dCB0aGVuIHJldHVyblxuICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIudGVtcEZpZWxkcy5pc0V4aXRpbmdHYW1lXG4gICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmlzRXhpdGluZ0dhbWUgPSBub1xuICAgICAgICAgICAgZ3MuR2FtZU5vdGlmaWVyLnBvc3RSZXNldFNjZW5lQ2hhbmdlKEBvYmplY3Quc2NlbmVEb2N1bWVudC5pdGVtcy5uYW1lKVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBncy5HYW1lTm90aWZpZXIucG9zdFNjZW5lQ2hhbmdlKEBvYmplY3Quc2NlbmVEb2N1bWVudC5pdGVtcy5uYW1lKVxuICAgICAgICBcbiAgICAgICAgQHJlc3RvcmVTY2VuZSgpXG4gICAgICAgIEBvYmplY3QubWVzc2FnZU1vZGUgPSBAb2JqZWN0LnNjZW5lRGF0YS5tZXNzYWdlTW9kZSA/IHZuLk1lc3NhZ2VNb2RlLkFEVlxuICAgICAgICBAc2V0dXBNYWluVmlld3BvcnQoKVxuICAgICAgICBAc2V0dXBWaWV3cG9ydHMoKVxuICAgICAgICBAc2V0dXBDaGFyYWN0ZXJzKClcbiAgICAgICAgQHNldHVwQmFja2dyb3VuZHMoKVxuICAgICAgICBAc2V0dXBQaWN0dXJlcygpXG4gICAgICAgIEBzZXR1cFRleHRzKClcbiAgICAgICAgQHNldHVwVmlkZW9zKClcbiAgICAgICAgQHNldHVwSG90c3BvdHMoKVxuICAgICAgICBAc2V0dXBJbnRlcnByZXRlcigpXG4gICAgICAgIEBzZXR1cExheW91dCgpXG4gICAgICAgIEBzZXR1cENvbW1vbkV2ZW50cygpXG4gICAgICAgIFxuICAgICAgICBAcmVzdG9yZU1lc3NhZ2VCb3goKVxuICAgICAgICBAcmVzdG9yZUludGVycHJldGVyKClcbiAgICAgICAgQHJlc3RvcmVNZXNzYWdlcygpXG4gICAgICAgIEByZXN0b3JlQXVkaW9QbGF5YmFjaygpXG4gICAgICAgIFxuICAgICAgICBAc2hvdyh0cnVlKVxuICAgICAgICBcbiAgICAgICAgQG9iamVjdC5zY2VuZURhdGEgPSB7fVxuICAgICAgICBHYW1lTWFuYWdlci5zY2VuZURhdGEgPSB7fVxuICAgICAgICBcbiAgICAgICAgR3JhcGhpY3MudXBkYXRlKClcbiAgICAgICAgQHRyYW5zaXRpb24oeyBkdXJhdGlvbjogMCB9KVxuICAgICAgICBcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQWRkcyBhIG5ldyBjaGFyYWN0ZXIgdG8gdGhlIHNjZW5lLlxuICAgICpcbiAgICAqIEBtZXRob2QgYWRkQ2hhcmFjdGVyXG4gICAgKiBAcGFyYW0ge3ZuLk9iamVjdF9DaGFyYWN0ZXJ9IGNoYXJhY3RlciAtIFRoZSBjaGFyYWN0ZXIgdG8gYWRkLlxuICAgICogQHBhcmFtIHtib29sZWFufSBub0FuaW1hdGlvbiAtIEluZGljYXRlcyBpZiB0aGUgY2hhcmFjdGVyIHNob3VsZCBiZSBhZGRlZCBpbW1lZGlhdGVseSB3aXRvdXQgYW55IGFwcGVhci1hbmltYXRpb24uXG4gICAgKiBAcGFyYW0ge09iamVjdH0gYW5pbWF0aW9uRGF0YSAtIENvbnRhaW5zIHRoZSBhcHBlYXItYW5pbWF0aW9uIGRhdGEgLT4geyBhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24gfS5cbiAgICAjIyMgXG4gICAgYWRkQ2hhcmFjdGVyOiAoY2hhcmFjdGVyLCBub0FuaW1hdGlvbiwgYW5pbWF0aW9uRGF0YSkgLT5cbiAgICAgICAgdW5sZXNzIG5vQW5pbWF0aW9uXG4gICAgICAgICAgICBjaGFyYWN0ZXIubW90aW9uQmx1ci5zZXQoYW5pbWF0aW9uRGF0YS5tb3Rpb25CbHVyKVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBhbmltYXRpb25EYXRhLmR1cmF0aW9uID4gMFxuICAgICAgICAgICAgICAgIGNoYXJhY3Rlci5hbmltYXRvci5hcHBlYXIoY2hhcmFjdGVyLmRzdFJlY3QueCwgY2hhcmFjdGVyLmRzdFJlY3QueSwgYW5pbWF0aW9uRGF0YS5hbmltYXRpb24sIGFuaW1hdGlvbkRhdGEuZWFzaW5nLCBhbmltYXRpb25EYXRhLmR1cmF0aW9uKSB1bmxlc3Mgbm9BbmltYXRpb25cbiAgICAgICAgXG4gICAgICAgIGNoYXJhY3Rlci52aWV3cG9ydCA9IEB2aWV3cG9ydFxuICAgICAgICBjaGFyYWN0ZXIudmlzaWJsZSA9IHllcyBcbiAgICBcbiAgICAgICAgQG9iamVjdC5jaGFyYWN0ZXJDb250YWluZXIuYWRkT2JqZWN0KGNoYXJhY3RlcilcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogUmVtb3ZlcyBhIGNoYXJhY3RlciBmcm9tIHRoZSBzY2VuZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHJlbW92ZUNoYXJhY3RlclxuICAgICogQHBhcmFtIHt2bi5PYmplY3RfQ2hhcmFjdGVyfSBjaGFyYWN0ZXIgLSBUaGUgY2hhcmFjdGVyIHRvIHJlbW92ZS5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBhbmltYXRpb25EYXRhIC0gQ29udGFpbnMgdGhlIGRpc2FwcGVhci1hbmltYXRpb24gZGF0YSAtPiB7IGFuaW1hdGlvbiwgZWFzaW5nLCBkdXJhdGlvbiB9LlxuICAgICMjI1xuICAgIHJlbW92ZUNoYXJhY3RlcjogKGNoYXJhY3RlciwgYW5pbWF0aW9uRGF0YSkgLT5cbiAgICAgICAgY2hhcmFjdGVyPy5hbmltYXRvci5kaXNhcHBlYXIoYW5pbWF0aW9uRGF0YS5hbmltYXRpb24sIGFuaW1hdGlvbkRhdGEuZWFzaW5nLCBhbmltYXRpb25EYXRhLmR1cmF0aW9uLCAoc2VuZGVyKSAtPiBzZW5kZXIuZGlzcG9zZSgpKVxuICAgIFxuICAgICMjIypcbiAgICAqIFJlc3VtZXMgdGhlIGN1cnJlbnQgc2NlbmUgaWYgaXQgaGFzIGJlZW4gcGF1c2VkLlxuICAgICpcbiAgICAqIEBtZXRob2QgcmVzdW1lU2NlbmVcbiAgICAjIyNcbiAgICByZXN1bWVTY2VuZTogLT5cbiAgICAgICAgQG9iamVjdC5waWN0dXJlQ29udGFpbmVyLmFjdGl2ZSA9IHllc1xuICAgICAgICBAb2JqZWN0LmNoYXJhY3RlckNvbnRhaW5lci5hY3RpdmUgPSB5ZXNcbiAgICAgICAgQG9iamVjdC5iYWNrZ3JvdW5kQ29udGFpbmVyLmFjdGl2ZSA9IHllc1xuICAgICAgICBAb2JqZWN0LnRleHRDb250YWluZXIuYWN0aXZlID0geWVzXG4gICAgICAgIEBvYmplY3QuaG90c3BvdENvbnRhaW5lci5hY3RpdmUgPSB5ZXNcbiAgICAgICAgQG9iamVjdC52aWRlb0NvbnRhaW5lci5hY3RpdmUgPSB5ZXNcbiAgICAgICAgXG4gICAgICAgIG1lc3NhZ2UgPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChcImdhbWVNZXNzYWdlX21lc3NhZ2VcIilcbiAgICAgICAgbWVzc2FnZS5hY3RpdmUgPSB5ZXNcbiBcbiAgICAjIyMqXG4gICAgKiBQYXVzZXMgdGhlIGN1cnJlbnQgc2NlbmUuIEEgcGF1c2VkIHNjZW5lIHdpbGwgbm90IGNvbnRpbnVlLCBtZXNzYWdlcywgcGljdHVyZXMsIGV0Yy4gd2lsbFxuICAgICogc3RvcCB1bnRpbCB0aGUgc2NlbmUgcmVzdW1lcy5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHBhdXNlU2NlbmVcbiAgICAjIyNcbiAgICBwYXVzZVNjZW5lOiAtPlxuICAgICAgICBAb2JqZWN0LnBpY3R1cmVDb250YWluZXIuYWN0aXZlID0gbm9cbiAgICAgICAgQG9iamVjdC5jaGFyYWN0ZXJDb250YWluZXIuYWN0aXZlID0gbm9cbiAgICAgICAgQG9iamVjdC5iYWNrZ3JvdW5kQ29udGFpbmVyLmFjdGl2ZSA9IG5vXG4gICAgICAgIEBvYmplY3QudGV4dENvbnRhaW5lci5hY3RpdmUgPSBub1xuICAgICAgICBAb2JqZWN0LmhvdHNwb3RDb250YWluZXIuYWN0aXZlID0gbm9cbiAgICAgICAgQG9iamVjdC52aWRlb0NvbnRhaW5lci5hY3RpdmUgPSBub1xuICAgICAgICBcbiAgICAgICAgbWVzc2FnZSA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VfbWVzc2FnZVwiKVxuICAgICAgICBtZXNzYWdlLmFjdGl2ZSA9IG5vXG4gICAgIFxuICAgICMjIypcbiAgICAqIENoYW5nZXMgdGhlIHZpc2liaWxpdHkgb2YgdGhlIGVudGlyZSBnYW1lIFVJIGxpa2UgdGhlIG1lc3NhZ2UgYm94ZXMsIGV0Yy4gdG8gYWxsb3dzXG4gICAgKiB0aGUgcGxheWVyIHRvIHNlZSB0aGUgZW50aXJlIHNjZW5lLiBVc2VmdWwgZm9yIENHcywgZXRjLlxuICAgICpcbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmlzaWJsZSAtIElmIDxiPnRydWU8L2I+LCB0aGUgZ2FtZSBVSSB3aWxsIGJlIHZpc2libGUuIE90aGVyd2lzZSBpdCB3aWxsIGJlIGhpZGRlbi5cbiAgICAqIEBtZXRob2QgY2hhbmdlVUlWaXNpYmlsaXR5XG4gICAgIyMjICAgXG4gICAgY2hhbmdlVUlWaXNpYmlsaXR5OiAodmlzaWJsZSkgLT5cbiAgICAgICAgQHVpVmlzaWJsZSA9IHZpc2libGVcbiAgICAgICAgQG9iamVjdC5sYXlvdXQudmlzaWJsZSA9IHZpc2libGVcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2hvd3MgaW5wdXQtdGV4dCBib3ggdG8gbGV0IHRoZSB1c2VyIGVudGVyIGEgdGV4dC5cbiAgICAqXG4gICAgKiBAcGFyYW0ge251bWJlcn0gbGV0dGVycyAtIFRoZSBtYXguIG51bWJlciBvZiBsZXR0ZXJzIHRoZSB1c2VyIGNhbiBlbnRlci5cbiAgICAqIEBwYXJhbSB7Z3MuQ2FsbGJhY2t9IGNhbGxiYWNrIC0gQSBjYWxsYmFjayBmdW5jdGlvbiBjYWxsZWQgaWYgdGhlIGlucHV0LXRleHQgYm94IGhhcyBiZWVuIGFjY2VwdGVkIGJ5IHRoZSB1c2VyLlxuICAgICogQG1ldGhvZCBzaG93SW5wdXRUZXh0XG4gICAgIyMjXG4gICAgc2hvd0lucHV0VGV4dDogKGxldHRlcnMsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAb2JqZWN0LmlucHV0VGV4dEJveD8uZGlzcG9zZSgpXG4gICAgICAgIEBvYmplY3QuaW5wdXRUZXh0Qm94ID0gdWkuVWlGYWN0b3J5LmNyZWF0ZUNvbnRyb2xGcm9tRGVzY3JpcHRvcih1aS5VaUZhY3RvcnkuY3VzdG9tVHlwZXNbXCJ1aS5JbnB1dFRleHRCb3hcIl0sIEBvYmplY3QubGF5b3V0KVxuICAgICAgICBAb2JqZWN0LmlucHV0VGV4dEJveC51aS5wcmVwYXJlKClcbiAgICAgICAgQG9iamVjdC5pbnB1dFRleHRCb3guZXZlbnRzLm9uKFwiYWNjZXB0XCIsIGNhbGxiYWNrKVxuICAgICAgIFxuICAgICMjIypcbiAgICAqIFNob3dzIGlucHV0LW51bWJlciBib3ggdG8gbGV0IHRoZSB1c2VyIGVudGVyIGEgbnVtYmVyLlxuICAgICpcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBkaWdpdHMgLSBUaGUgbWF4LiBudW1iZXIgb2YgZGlnaXRzIHRoZSB1c2VyIGNhbiBlbnRlci5cbiAgICAqIEBwYXJhbSB7Z3MuQ2FsbGJhY2t9IGNhbGxiYWNrIC0gQSBjYWxsYmFjayBmdW5jdGlvbiBjYWxsZWQgaWYgdGhlIGlucHV0LW51bWJlciBib3ggaGFzIGJlZW4gYWNjZXB0ZWQgYnkgdGhlIHVzZXIuXG4gICAgKiBAbWV0aG9kIHNob3dJbnB1dE51bWJlclxuICAgICMjIyBcbiAgICBzaG93SW5wdXROdW1iZXI6IChkaWdpdHMsIGNhbGxiYWNrKSAtPlxuICAgICAgICBAb2JqZWN0LmlucHV0TnVtYmVyQm94Py5kaXNwb3NlKClcbiAgICAgICAgQG9iamVjdC5pbnB1dE51bWJlckJveCA9IHVpLlVpRmFjdG9yeS5jcmVhdGVDb250cm9sRnJvbURlc2NyaXB0b3IodWkuVWlGYWN0b3J5LmN1c3RvbVR5cGVzW1widWkuSW5wdXROdW1iZXJCb3hcIl0sIEBvYmplY3QubGF5b3V0KVxuICAgICAgICBAb2JqZWN0LmlucHV0TnVtYmVyQm94LnVpLnByZXBhcmUoKVxuICAgICAgICBAb2JqZWN0LmlucHV0TnVtYmVyQm94LmV2ZW50cy5vbihcImFjY2VwdFwiLCBjYWxsYmFjaykgICAgXG4gICAgXG4gICAgIyMjKlxuICAgICogU2hvd3MgY2hvaWNlcyB0byBsZXQgdGhlIHVzZXIgcGljayBhIGNob2ljZS5cbiAgICAqXG4gICAgKiBAcGFyYW0ge09iamVjdFtdfSBjaG9pY2VzIC0gQW4gYXJyYXkgb2YgY2hvaWNlc1xuICAgICogQHBhcmFtIHtncy5DYWxsYmFja30gY2FsbGJhY2sgLSBBIGNhbGxiYWNrIGZ1bmN0aW9uIGNhbGxlZCBpZiBhIGNob2ljZSBoYXMgYmVlbiBwaWNrZWQgYnkgdGhlIHVzZXIuXG4gICAgKiBAbWV0aG9kIHNob3dDaG9pY2VzXG4gICAgIyMjICAgICBcbiAgICBzaG93Q2hvaWNlczogKGNob2ljZXMsIGNhbGxiYWNrKSAtPlxuICAgICAgICB1c2VGcmVlTGF5b3V0ID0gY2hvaWNlcy53aGVyZSgoeCkgLT4geC5kc3RSZWN0PykubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgIFxuICAgICAgICBHYW1lTWFuYWdlci50ZW1wRmllbGRzLmNob2ljZXMgPSBjaG9pY2VzIFxuICAgICAgICBAb2JqZWN0LmNob2ljZVdpbmRvdz8uZGlzcG9zZSgpXG4gICAgICAgIFxuICAgICAgICBpZiB1c2VGcmVlTGF5b3V0XG4gICAgICAgICAgICBAb2JqZWN0LmNob2ljZVdpbmRvdyA9IHVpLlVpRmFjdG9yeS5jcmVhdGVDb250cm9sRnJvbURlc2NyaXB0b3IodWkuVWlGYWN0b3J5LmN1c3RvbVR5cGVzW1widWkuRnJlZUNob2ljZUJveFwiXSwgQG9iamVjdC5sYXlvdXQpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEBvYmplY3QuY2hvaWNlV2luZG93ID0gdWkuVWlGYWN0b3J5LmNyZWF0ZUNvbnRyb2xGcm9tRGVzY3JpcHRvcih1aS5VaUZhY3RvcnkuY3VzdG9tVHlwZXNbXCJ1aS5DaG9pY2VCb3hcIl0sIEBvYmplY3QubGF5b3V0KVxuICAgICAgICBcbiAgICAgICAgQG9iamVjdC5jaG9pY2VXaW5kb3cuZXZlbnRzLm9uKFwic2VsZWN0aW9uQWNjZXB0XCIsIGNhbGxiYWNrKVxuICAgICAgICBAb2JqZWN0LmNob2ljZVdpbmRvdy51aS5wcmVwYXJlKClcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2hhbmdlcyB0aGUgYmFja2dyb3VuZCBvZiB0aGUgc2NlbmUuXG4gICAgKlxuICAgICogQG1ldGhvZCBjaGFuZ2VCYWNrZ3JvdW5kXG4gICAgKiBAcGFyYW0ge09iamVjdH0gYmFja2dyb3VuZCAtIFRoZSBiYWNrZ3JvdW5kIGdyYXBoaWMgb2JqZWN0IC0+IHsgbmFtZSB9XG4gICAgKiBAcGFyYW0ge2Jvb2xlYW59IG5vQW5pbWF0aW9uIC0gSW5kaWNhdGVzIGlmIHRoZSBiYWNrZ3JvdW5kIHNob3VsZCBiZSBjaGFuZ2VkIGltbWVkaWF0ZWx5IHdpdG91dCBhbnkgY2hhbmdlLWFuaW1hdGlvbi5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBhbmltYXRpb24gLSBUaGUgYXBwZWFyL2Rpc2FwcGVhciBhbmltYXRpb24gdG8gdXNlLlxuICAgICogQHBhcmFtIHtPYmplY3R9IGVhc2luZyAtIFRoZSBlYXNpbmcgb2YgdGhlIGNoYW5nZSBhbmltYXRpb24uXG4gICAgKiBAcGFyYW0ge251bWJlcn0gZHVyYXRpb24gLSBUaGUgZHVyYXRpb24gb2YgdGhlIGNoYW5nZSBpbiBmcmFtZXMuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gb3ggLSBUaGUgeC1vcmlnaW4gb2YgdGhlIGJhY2tncm91bmQuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gb3kgLSBUaGUgeS1vcmlnaW4gb2YgdGhlIGJhY2tncm91bmQuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gbGF5ZXIgLSBUaGUgYmFja2dyb3VuZC1sYXllciB0byBjaGFuZ2UuXG4gICAgKiBAcGFyYW0ge2Jvb2xlYW59IGxvb3BIb3Jpem9udGFsIC0gSW5kaWNhdGVzIGlmIHRoZSBiYWNrZ3JvdW5kIHNob3VsZCBiZSBsb29wZWQgaG9yaXpvbnRhbGx5LlxuICAgICogQHBhcmFtIHtib29sZWFufSBsb29wVmVydGljYWwgLSBJbmRpY2F0ZXMgaWYgdGhlIGJhY2tncm91bmQgc2hvdWxkIGJlIGxvb3BlZCB2ZXJ0aWNhbGx5LlxuICAgICMjIyAgIFxuICAgIGNoYW5nZUJhY2tncm91bmQ6IChiYWNrZ3JvdW5kLCBub0FuaW1hdGlvbiwgYW5pbWF0aW9uLCBlYXNpbmcsIGR1cmF0aW9uLCBveCwgb3ksIGxheWVyLCBsb29wSG9yaXpvbnRhbCwgbG9vcFZlcnRpY2FsKSAtPlxuICAgICAgICBpZiBiYWNrZ3JvdW5kP1xuICAgICAgICAgICAgb3RoZXJPYmplY3QgPSBAb2JqZWN0LmJhY2tncm91bmRzW2xheWVyXVxuICAgICAgICAgICAgb2JqZWN0ID0gbmV3IHZuLk9iamVjdF9CYWNrZ3JvdW5kKClcbiAgICAgICAgICAgIG9iamVjdC5pbWFnZSA9IGJhY2tncm91bmQubmFtZVxuICAgICAgICAgICAgb2JqZWN0Lm9yaWdpbi54ID0gb3hcbiAgICAgICAgICAgIG9iamVjdC5vcmlnaW4ueSA9IG95XG4gICAgICAgICAgICBvYmplY3Qudmlld3BvcnQgPSBAdmlld3BvcnRcbiAgICAgICAgICAgIG9iamVjdC52aXN1YWwubG9vcGluZy52ZXJ0aWNhbCA9IG5vXG4gICAgICAgICAgICBvYmplY3QudmlzdWFsLmxvb3BpbmcuaG9yaXpvbnRhbCA9IG5vXG4gICAgICAgICAgICBvYmplY3QudXBkYXRlKClcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgQG9iamVjdC5iYWNrZ3JvdW5kQ29udGFpbmVyLnNldE9iamVjdChvYmplY3QsIGxheWVyKVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgZHVyYXRpb24gPSBkdXJhdGlvbiA/IDMwXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIG90aGVyT2JqZWN0Py56SW5kZXggPSBsYXllclxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiBkdXJhdGlvbiA9PSAwXG4gICAgICAgICAgICAgICAgb3RoZXJPYmplY3Q/LmRpc3Bvc2UoKVxuICAgICAgICAgICAgICAgIG9iamVjdC52aXN1YWwubG9vcGluZy52ZXJ0aWNhbCA9IGxvb3BWZXJ0aWNhbFxuICAgICAgICAgICAgICAgIG9iamVjdC52aXN1YWwubG9vcGluZy5ob3Jpem9udGFsID0gbG9vcEhvcml6b250YWxcbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICBpZiBub0FuaW1hdGlvblxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudmlzdWFsLmxvb3BpbmcudmVydGljYWwgPSBsb29wVmVydGljYWxcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnZpc3VhbC5sb29waW5nLmhvcml6b250YWwgPSBsb29wSG9yaXpvbnRhbFxuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFuaW1hdG9yLm90aGVyT2JqZWN0ID0gb3RoZXJPYmplY3RcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmFuaW1hdG9yLmFwcGVhcigwLCAwLCBhbmltYXRpb24sIGVhc2luZywgZHVyYXRpb24sIChzZW5kZXIpID0+IFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VuZGVyLnVwZGF0ZSgpXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kZXIuYW5pbWF0b3Iub3RoZXJPYmplY3Q/LmRpc3Bvc2UoKVxuICAgICAgICAgICAgICAgICAgICAgICAgc2VuZGVyLmFuaW1hdG9yLm90aGVyT2JqZWN0ID0gbnVsbFxuICAgICAgICAgICAgICAgICAgICAgICAgc2VuZGVyLnZpc3VhbC5sb29waW5nLnZlcnRpY2FsID0gbG9vcFZlcnRpY2FsXG4gICAgICAgICAgICAgICAgICAgICAgICBzZW5kZXIudmlzdWFsLmxvb3BpbmcuaG9yaXpvbnRhbCA9IGxvb3BIb3Jpem9udGFsXG4gICAgICAgICAgICAgICAgICAgIClcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQG9iamVjdC5iYWNrZ3JvdW5kc1tsYXllcl0/LmFuaW1hdG9yLmhpZGUgZHVyYXRpb24sIGVhc2luZywgID0+XG4gICAgICAgICAgICAgICBAb2JqZWN0LmJhY2tncm91bmRzW2xheWVyXS5kaXNwb3NlKClcbiAgICAgICAgICAgICAgIEBvYmplY3QuYmFja2dyb3VuZHNbbGF5ZXJdID0gbnVsbFxuICAgIFxuICAgIFxuICAgICMjIypcbiAgICAqIFNraXBzIGFsbCB2aWV3cG9ydCBhbmltYXRpb25zIGV4Y2VwdCB0aGUgbWFpbiB2aWV3cG9ydCBhbmltYXRpb24uXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwVmlld3BvcnRzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIHNraXBWaWV3cG9ydHM6IC0+XG4gICAgICAgIHZpZXdwb3J0cyA9IEBvYmplY3Qudmlld3BvcnRDb250YWluZXIuc3ViT2JqZWN0c1xuICAgICAgICBmb3Igdmlld3BvcnQgaW4gdmlld3BvcnRzXG4gICAgICAgICAgICBpZiB2aWV3cG9ydFxuICAgICAgICAgICAgICAgIGZvciBjb21wb25lbnQgaW4gdmlld3BvcnQuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgIFxuICAgICMjIypcbiAgICAqIFNraXBzIGFsbCBwaWN0dXJlIGFuaW1hdGlvbnMuXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwUGljdHVyZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgIFxuICAgIHNraXBQaWN0dXJlczogLT5cbiAgICAgICAgZm9yIHBpY3R1cmUgaW4gQG9iamVjdC5waWN0dXJlc1xuICAgICAgICAgICAgaWYgcGljdHVyZVxuICAgICAgICAgICAgICAgIGZvciBjb21wb25lbnQgaW4gcGljdHVyZS5jb21wb25lbnRzXG4gICAgICAgICAgICAgICAgICAgIGNvbXBvbmVudC5za2lwPygpXG4gICAgICAgIHJldHVybiBudWxsXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIFNraXBzIGFsbCB0ZXh0IGFuaW1hdGlvbnMuXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwVGV4dHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgc2tpcFRleHRzOiAtPlxuICAgICAgIGZvciB0ZXh0IGluIEBvYmplY3QudGV4dHNcbiAgICAgICAgICAgIGlmIHRleHRcbiAgICAgICAgICAgICAgICBmb3IgY29tcG9uZW50IGluIHRleHQuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTa2lwcyBhbGwgdmlkZW8gYW5pbWF0aW9ucyBidXQgbm90IHRoZSB2aWRlby1wbGF5YmFjayBpdHNlbGYuXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwVmlkZW9zXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIHNraXBWaWRlb3M6IC0+XG4gICAgICAgIGZvciB2aWRlbyBpbiBAb2JqZWN0LnZpZGVvc1xuICAgICAgICAgICAgaWYgdmlkZW9cbiAgICAgICAgICAgICAgICBmb3IgY29tcG9uZW50IGluIHZpZGVvLmNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICAgICAgY29tcG9uZW50LnNraXA/KClcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2tpcHMgYWxsIGJhY2tncm91bmQgYW5pbWF0aW9ucy5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNraXBCYWNrZ3JvdW5kc1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyBcbiAgICBza2lwQmFja2dyb3VuZHM6IC0+XG4gICAgICAgIGZvciBiYWNrZ3JvdW5kIGluIEBvYmplY3QuYmFja2dyb3VuZHNcbiAgICAgICAgICAgIGlmIGJhY2tncm91bmRcbiAgICAgICAgICAgICAgICBmb3IgY29tcG9uZW50IGluIGJhY2tncm91bmQuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTa2lwcyBhbGwgY2hhcmFjdGVyIGFuaW1hdGlvbnNcbiAgICAqXG4gICAgKiBAbWV0aG9kIHNraXBDaGFyYWN0ZXJzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIHNraXBDaGFyYWN0ZXJzOiAtPlxuICAgICAgICBmb3IgY2hhcmFjdGVyIGluIEBvYmplY3QuY2hhcmFjdGVyc1xuICAgICAgICAgICAgaWYgY2hhcmFjdGVyXG4gICAgICAgICAgICAgICAgZm9yIGNvbXBvbmVudCBpbiBjaGFyYWN0ZXIuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICBcbiAgICAjIyMqXG4gICAgKiBTa2lwcyB0aGUgbWFpbiB2aWV3cG9ydCBhbmltYXRpb24uXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwTWFpblZpZXdwb3J0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIHNraXBNYWluVmlld3BvcnQ6IC0+XG4gICAgICAgIGZvciBjb21wb25lbnQgaW4gQG9iamVjdC52aWV3cG9ydC5jb21wb25lbnRzXG4gICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKVxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTa2lwcyBhbGwgYW5pbWF0aW9ucyBvZiBhbGwgbWVzc2FnZSBib3hlcyBkZWZpbmVkIGluIE1FU1NBR0VfQk9YX0lEUyB1aSBjb25zdGFudC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNraXBNZXNzYWdlQm94ZXNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgc2tpcE1lc3NhZ2VCb3hlczogLT5cbiAgICAgICAgZm9yIG1lc3NhZ2VCb3hJZCBpbiBncy5VSUNvbnN0YW50cy5NRVNTQUdFX0JPWF9JRFMgfHwgW1wibWVzc2FnZUJveFwiLCBcIm1lc3NhZ2VCb3hOVkxcIl1cbiAgICAgICAgICAgIG1lc3NhZ2VCb3ggPSBncy5PYmplY3RNYW5hZ2VyLmN1cnJlbnQub2JqZWN0QnlJZChtZXNzYWdlQm94SWQpXG4gICAgICAgICAgICBpZiBtZXNzYWdlQm94LmNvbXBvbmVudHNcbiAgICAgICAgICAgICAgICBmb3IgY29tcG9uZW50IGluIG1lc3NhZ2VCb3guY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKSBcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgXG4gICAgIyMjKlxuICAgICogU2tpcHMgYWxsIGFuaW1hdGlvbnMgb2YgYWxsIG1lc3NhZ2UgYXJlYXMuXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwTWVzc2FnZUFyZWFzXG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIHNraXBNZXNzYWdlQXJlYXM6IC0+XG4gICAgICAgIGZvciBtZXNzYWdlQXJlYSBpbiBAb2JqZWN0Lm1lc3NhZ2VBcmVhc1xuICAgICAgICAgICAgaWYgbWVzc2FnZUFyZWE/Lm1lc3NhZ2VcbiAgICAgICAgICAgICAgICBmb3IgY29tcG9uZW50IGluIG1lc3NhZ2VBcmVhLm1lc3NhZ2UuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgICAgICBjb21wb25lbnQuc2tpcD8oKVxuICAgICAgICAgICAgICAgXG4gICAgICAgIG1zZyA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VfbWVzc2FnZVwiKSAgICAgXG4gICAgICAgIGlmIG1zZ1xuICAgICAgICAgICAgZm9yIGNvbXBvbmVudCBpbiBtc2cuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5za2lwPygpXG4gICAgICAgIG1zZyA9IGdzLk9iamVjdE1hbmFnZXIuY3VycmVudC5vYmplY3RCeUlkKFwiZ2FtZU1lc3NhZ2VOVkxfbWVzc2FnZVwiKSAgICAgXG4gICAgICAgIGlmIG1zZ1xuICAgICAgICAgICAgZm9yIGNvbXBvbmVudCBpbiBtc2cuY29tcG9uZW50c1xuICAgICAgICAgICAgICAgIGNvbXBvbmVudC5za2lwPygpXG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gbnVsbFxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTa2lwcyB0aGUgc2NlbmUgaW50ZXJwcmV0ZXIgdGltZXIuXG4gICAgKlxuICAgICogQG1ldGhvZCBza2lwSW50ZXJwcmV0ZXJcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgc2tpcEludGVycHJldGVyOiAtPlxuICAgICAgICBpZiBAb2JqZWN0LmludGVycHJldGVyLndhaXRDb3VudGVyID4gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBUaW1lXG4gICAgICAgICAgICBAb2JqZWN0LmludGVycHJldGVyLndhaXRDb3VudGVyID0gR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBUaW1lXG4gICAgICAgICAgICBpZiBAb2JqZWN0LmludGVycHJldGVyLndhaXRDb3VudGVyID09IDBcbiAgICAgICAgICAgICAgICBAb2JqZWN0LmludGVycHJldGVyLmlzV2FpdGluZyA9IG5vXG4gICAgXG4gICAgIyMjKlxuICAgICogU2tpcHMgdGhlIGludGVycHJldGVyIHRpbWVyIG9mIGFsbCBjb21tb24gZXZlbnRzLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc2tpcENvbW1vbkV2ZW50c1xuICAgICogQHByb3RlY3RlZFxuICAgICMjIyAgXG4gICAgc2tpcENvbW1vbkV2ZW50czogLT5cbiAgICAgICAgZXZlbnRzID0gQG9iamVjdC5jb21tb25FdmVudENvbnRhaW5lci5zdWJPYmplY3RzXG4gICAgICAgIGZvciBldmVudCBpbiBldmVudHNcbiAgICAgICAgICAgIGlmIGV2ZW50Py5pbnRlcnByZXRlciBhbmQgZXZlbnQuaW50ZXJwcmV0ZXIud2FpdENvdW50ZXIgPiBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcFRpbWVcbiAgICAgICAgICAgICAgICBldmVudC5pbnRlcnByZXRlci53YWl0Q291bnRlciA9IEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwVGltZVxuICAgICAgICAgICAgICAgIGlmIGV2ZW50LmludGVycHJldGVyLndhaXRDb3VudGVyID09IDBcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQuaW50ZXJwcmV0ZXIuaXNXYWl0aW5nID0gbm9cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogU2tpcHMgdGhlIHNjZW5lJ3MgY29udGVudC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNraXBDb250ZW50XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgIFxuICAgIHNraXBDb250ZW50OiAtPlxuICAgICAgICBAc2tpcFBpY3R1cmVzKClcbiAgICAgICAgQHNraXBUZXh0cygpXG4gICAgICAgIEBza2lwVmlkZW9zKClcbiAgICAgICAgQHNraXBCYWNrZ3JvdW5kcygpXG4gICAgICAgIEBza2lwQ2hhcmFjdGVycygpXG4gICAgICAgIEBza2lwTWFpblZpZXdwb3J0KClcbiAgICAgICAgQHNraXBWaWV3cG9ydHMoKVxuICAgICAgICBAc2tpcE1lc3NhZ2VCb3hlcygpXG4gICAgICAgIEBza2lwTWVzc2FnZUFyZWFzKClcbiAgICAgICAgQHNraXBJbnRlcnByZXRlcigpXG4gICAgICAgIEBza2lwQ29tbW9uRXZlbnRzKClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDaGVja3MgZm9yIHRoZSBzaG9ydGN1dCB0byBoaWRlL3Nob3cgdGhlIGdhbWUgVUkuIEJ5IGRlZmF1bHQsIHRoaXMgaXMgdGhlIHNwYWNlLWtleS4gWW91XG4gICAgKiBjYW4gb3ZlcnJpZGUgdGhpcyBtZXRob2QgdG8gY2hhbmdlIHRoZSBzaG9ydGN1dC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHVwZGF0ZVVJVmlzaWJpbGl0eVNob3J0Y3V0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjIFxuICAgIHVwZGF0ZVVJVmlzaWJpbGl0eVNob3J0Y3V0OiAtPlxuICAgICAgICBpZiAhQHVpVmlzaWJsZSBhbmQgKElucHV0LnRyaWdnZXIoSW5wdXQuQykgb3IgSW5wdXQuTW91c2UuYnV0dG9uRG93bilcbiAgICAgICAgICAgIEBjaGFuZ2VVSVZpc2liaWxpdHkoIUB1aVZpc2libGUpXG4gICAgICAgIGlmIElucHV0LnRyaWdnZXIoSW5wdXQuS0VZX1NQQUNFKVxuICAgICAgICAgICAgQGNoYW5nZVVJVmlzaWJpbGl0eSghQHVpVmlzaWJsZSlcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDaGVja3MgZm9yIHRoZSBzaG9ydGN1dCB0byBleGl0IHRoZSBnYW1lLiBCeSBkZWZhdWx0LCB0aGlzIGlzIHRoZSBlc2NhcGUta2V5LiBZb3VcbiAgICAqIGNhbiBvdmVycmlkZSB0aGlzIG1ldGhvZCB0byBjaGFuZ2UgdGhlIHNob3J0Y3V0LlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlUXVpdFNob3J0Y3V0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgdXBkYXRlUXVpdFNob3J0Y3V0OiAtPlxuICAgICAgICBpZiBJbnB1dC50cmlnZ2VyKElucHV0LktFWV9FU0NBUEUpXG4gICAgICAgICAgICBncy5BcHBsaWNhdGlvbi5leGl0KClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBDaGVja3MgZm9yIHRoZSBzaG9ydGN1dCB0byBvcGVuIHRoZSBzZXR0aW5ncyBtZW51LiBCeSBkZWZhdWx0LCB0aGlzIGlzIHRoZSBzLWtleS4gWW91XG4gICAgKiBjYW4gb3ZlcnJpZGUgdGhpcyBtZXRob2QgdG8gY2hhbmdlIHRoZSBzaG9ydGN1dC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHVwZGF0ZVNldHRpbmdzU2hvcnRjdXRcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgICAgICAgICAgIFxuICAgIHVwZGF0ZVNldHRpbmdzU2hvcnRjdXQ6IC0+XG4gICAgICAgIGlmIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5tZW51QWNjZXNzIGFuZCBJbnB1dC50cmlnZ2VyKElucHV0LlgpXG4gICAgICAgICAgICBTY2VuZU1hbmFnZXIuc3dpdGNoVG8obmV3IGdzLk9iamVjdF9MYXlvdXQoXCJzZXR0aW5nc01lbnVMYXlvdXRcIiksIHRydWUpXG4gICAgIFxuICAgICMjIypcbiAgICAqIENoZWNrcyBmb3IgdGhlIHNob3J0Y3V0IHRvIG9wZW4gdGhlIHNldHRpbmdzIG1lbnUuIEJ5IGRlZmF1bHQsIHRoaXMgaXMgdGhlIGNvbnRyb2wta2V5LiBZb3VcbiAgICAqIGNhbiBvdmVycmlkZSB0aGlzIG1ldGhvZCB0byBjaGFuZ2UgdGhlIHNob3J0Y3V0LlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlU2tpcFNob3J0Y3V0XG4gICAgKiBAcHJvdGVjdGVkXG4gICAgIyMjICAgICAgICAgXG4gICAgdXBkYXRlU2tpcFNob3J0Y3V0OiAtPlxuICAgICAgICBpZiBAb2JqZWN0LnNldHRpbmdzLmFsbG93U2tpcFxuICAgICAgICAgICAgaWYgSW5wdXQua2V5c1tJbnB1dC5LRVlfQ09OVFJPTF0gPT0gMVxuICAgICAgICAgICAgICAgIEdhbWVNYW5hZ2VyLnRlbXBTZXR0aW5ncy5za2lwID0geWVzXG4gICAgICAgICAgICBlbHNlIGlmIElucHV0LmtleXNbSW5wdXQuS0VZX0NPTlRST0xdID09IDJcbiAgICAgICAgICAgICAgICBHYW1lTWFuYWdlci50ZW1wU2V0dGluZ3Muc2tpcCA9IG5vXG4gICAgICAgICAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2hlY2tzIGZvciBkZWZhdWx0IGtleWJvYXJkIHNob3J0Y3V0cyBlLmcgc3BhY2Uta2V5IHRvIGhpZGUgdGhlIFVJLCBldGMuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVTaG9ydGN1dHNcbiAgICAqIEBwcm90ZWN0ZWRcbiAgICAjIyMgXG4gICAgdXBkYXRlU2hvcnRjdXRzOiAtPlxuICAgICAgICBAdXBkYXRlU2V0dGluZ3NTaG9ydGN1dCgpXG4gICAgICAgIEB1cGRhdGVRdWl0U2hvcnRjdXQoKVxuICAgICAgICBAdXBkYXRlVUlWaXNpYmlsaXR5U2hvcnRjdXQoKVxuICAgICAgICBAdXBkYXRlU2tpcFNob3J0Y3V0KClcblxuICAgICMjIypcbiAgICAqIFVwZGF0ZXMgdGhlIGZ1bGwgc2NyZWVuIHZpZGVvIHBsYXllZCB2aWEgUGxheSBNb3ZpZSBjb21tYW5kLlxuICAgICpcbiAgICAqIEBtZXRob2QgdXBkYXRlVmlkZW9cbiAgICAjIyMgIFxuICAgIHVwZGF0ZVZpZGVvOiAtPlxuICAgICAgICBpZiBAb2JqZWN0LnZpZGVvP1xuICAgICAgICAgICAgQG9iamVjdC52aWRlby51cGRhdGUoKVxuICAgICAgICAgICAgaWYgQG9iamVjdC5zZXR0aW5ncy5hbGxvd1ZpZGVvU2tpcCBhbmQgKElucHV0LnRyaWdnZXIoSW5wdXQuQykgb3IgSW5wdXQuTW91c2UuYnV0dG9uc1tJbnB1dC5Nb3VzZS5MRUZUXSA9PSAyKVxuICAgICAgICAgICAgICAgIEBvYmplY3QudmlkZW8uc3RvcCgpXG4gICAgICAgICAgICBJbnB1dC5jbGVhcigpXG4gICAgIFxuICAgICMjIypcbiAgICAqIFVwZGF0ZXMgc2tpcHBpbmcgaWYgZW5hYmxlZC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHVwZGF0ZVNraXBwaW5nXG4gICAgIyMjICAgICAgICAgXG4gICAgdXBkYXRlU2tpcHBpbmc6IC0+XG4gICAgICAgIGlmICFAb2JqZWN0LnNldHRpbmdzLmFsbG93U2tpcFxuICAgICAgICAgICAgQG9iamVjdC50ZW1wU2V0dGluZ3Muc2tpcCA9IG5vXG4gICAgICAgICAgICBcbiAgICAgICAgaWYgR2FtZU1hbmFnZXIudGVtcFNldHRpbmdzLnNraXBcbiAgICAgICAgICAgIEBza2lwQ29udGVudCgpXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBVcGRhdGVzIHRoZSBzY2VuZSdzIGNvbnRlbnQuXG4gICAgKlxuICAgICogQG1ldGhvZCB1cGRhdGVDb250ZW50XG4gICAgIyMjICAgICAgXG4gICAgdXBkYXRlQ29udGVudDogLT5cbiAgICAgICAgR2FtZU1hbmFnZXIuc2NlbmUgPSBAb2JqZWN0XG4gICAgICAgIEdyYXBoaWNzLnZpZXdwb3J0LnVwZGF0ZSgpXG4gICAgICAgIEBvYmplY3Qudmlld3BvcnQudXBkYXRlKClcbiAgICAgICAgXG4gICAgICAgIEB1cGRhdGVTa2lwcGluZygpXG4gICAgICAgIEB1cGRhdGVWaWRlbygpXG4gICAgICAgIEB1cGRhdGVTaG9ydGN1dHMoKVxuXG4gICAgICAgIHN1cGVyKClcbiAgICAgICAgXG52bi5Db21wb25lbnRfR2FtZVNjZW5lQmVoYXZpb3IgPSBDb21wb25lbnRfR2FtZVNjZW5lQmVoYXZpb3IiXX0=
//# sourceURL=Component_GameSceneBehavior_42.js