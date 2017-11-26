var VariableStore;

VariableStore = (function() {
  VariableStore.objectCodecBlackList = ["persistentNumbers", "persistentStrings", "persistentBooleans", "persistentLists"];


  /**
  * <p>A storage for different kind of game variables. The following scopes
  * for variables exist:</p>
  * 
  * - Local Variables -> Only valid for the current scene.
  * - Global Variables -> Valid for the whole game but bound to a single save-game.
  * - Persistent Variables -> Valid for the whole game indepentent from the save-games.
  * 
  * <p>The following data-types exist:</p>
  * - Strings -> Variables storing text data.
  * - Numbers -> Variables storing integer number values.
  * - Booleans -> Variables storing boolean values. (Called "Switches" for easier understanding)
  * - Lists -> Variables storing multiple other variables. Lists can also contain Lists.
  * <p>
  * Local variables are stored by scene UID. For each scene UID a list of local variables is stored.</p>
  * 
  * <p>Global and persistent variables are stored and a specific domain. A domain is just a unique name such
  * as <i>com.example.game</i> for example. The default domain is an empty string. Domains are useful to avoid
  * overlapping of variable numbers when sharing content with other users. </p>
  *
  * @module gs
  * @class VariableStore
  * @memberof gs
  * @constructor
   */

  function VariableStore() {
    debugger;

    /**
    * Current local variable context
    * @property context
    * @type Object
     */
    this.context = null;

    /**
    * Current domain for global and persistent variables. Each domain has its own
    * variables. Please use <b>changeDomain</b> method to change the domain.
    * @property domain
    * @type Object
    * @readOnly
     */
    this.domain = "";

    /**
    * List of available domains for global and persistent variables.
    * @property domains
    * @type string[]
     */
    this.domains = [""];

    /**
    * The global number variables of the current domain.
    * @property numbers
    * @type number[]
     */
    this.numbers = null;

    /**
    * The global boolean variables of the current domain.
    * @property booleans
    * @type boolean[]
     */
    this.booleans = null;

    /**
    * The global string variables of the current domain.
    * @property strings
    * @type string[]
     */
    this.strings = null;

    /**
    * The global list variables of the current domain.
    * @property lists
    * @type Object[][]
     */
    this.lists = null;

    /**
    * The storage of all global variables by domain.
    * @property globalVariablesByDomain
    * @type Object[][]
     */
    this.globalVariablesByDomain = {};

    /**
    * The storage of all persistent variables by domain.
    * @property persistentVariablesByDomain
    * @type Object[][]
     */
    this.persistentVariablesByDomain = {};

    /**
    * The persistent number variables of the current domain.
    * @property persistentNumbers
    * @type number[]
     */
    this.persistentNumbers = [];

    /**
    * The persistent string variables of the current domain.
    * @property persistentStrings
    * @type string[]
     */
    this.persistentStrings = [];

    /**
    * The persistent boolean variables of the current domain.
    * @property persistentBooleans
    * @type boolean[]
     */
    this.persistentBooleans = [];

    /**
    * The persistent list variables of the current domain.
    * @property persistentLists
    * @type Object[][]
     */
    this.persistentLists = [];

    /**
    * The local number variables.
    * @property localNumbers
    * @type Object
     */
    this.localNumbers = {};

    /**
    * The local string variables.
    * @property localStrings
    * @type Object
     */
    this.localStrings = {};

    /**
    * The local boolean variables.
    * @property localBooleans
    * @type Object
     */
    this.localBooleans = {};

    /**
    * The local list variables.
    * @property localLists
    * @type Object
     */
    this.localLists = {};

    /**
    * @property tempNumbers
    * @type number[]
     */
    this.tempNumbers = null;

    /**
    * @property tempStrings
    * @type string[]
     */
    this.tempStrings = null;

    /**
    * @property localBooleans
    * @type number[]
     */
    this.tempBooleans = null;

    /**
    * @property localLists
    * @type Object[][]
     */
    this.tempLists = null;
  }


  /**
  * Called if this object instance is restored from a data-bundle. It can be used
  * re-assign event-handler, anonymous functions, etc.
  * 
  * @method onDataBundleRestore.
  * @param Object data - The data-bundle
  * @param gs.ObjectCodecContext context - The codec-context.
   */

  VariableStore.prototype.onDataBundleRestore = function(data, context) {
    var domain, domains, i, j, len;
    domains = DataManager.getDocumentsByType("global_variables").select(function(d) {
      return d.items.domain;
    });
    for (i = j = 0, len = domains.length; j < len; i = ++j) {
      domain = domains[i];
      this.numbersByDomain[domain] = this.numbersByDomain[i];
      this.stringsByDomain[domain] = this.stringsByDomain[i];
      this.booleansByDomain[domain] = this.booleansByDomain[i];
      this.listsByDomain[domain] = this.listsByDomain[i];
    }
    return null;
  };

  VariableStore.prototype.setupGlobalDomains = function() {
    var domain, i, j, len, ref;
    this.numbersByDomain = [];
    this.stringsByDomain = [];
    this.booleansByDomain = [];
    this.listsByDomain = [];
    ref = this.domains;
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      domain = ref[i];
      this.numbersByDomain[i] = new Array(1000);
      this.numbersByDomain[domain] = this.numbersByDomain[i];
      this.stringsByDomain[i] = new Array(1000);
      this.stringsByDomain[domain] = this.stringsByDomain[i];
      this.booleansByDomain[i] = new Array(1000);
      this.booleansByDomain[domain] = this.booleansByDomain[i];
      this.listsByDomain[i] = new Array(1000);
      this.listsByDomain[domain] = this.listsByDomain[i];
    }
    this.numbers = this.numbersByDomain[0];
    this.strings = this.stringsByDomain[0];
    this.booleans = this.booleansByDomain[0];
    return this.lists = this.numbersByDomain[0];
  };

  VariableStore.prototype.setupPersistentDomains = function(domains) {
    var domain, i, j, len, ref, results;
    ref = this.domains;
    results = [];
    for (i = j = 0, len = ref.length; j < len; i = ++j) {
      domain = ref[i];
      this.persistentNumbers[i] = new Array(10);
      this.persistentNumbers[domain] = this.persistentNumbers[i];
      this.persistentStrings[i] = new Array(10);
      this.persistentStrings[domain] = this.persistentStrings[i];
      this.persistentBooleans[i] = new Array(10);
      this.persistentBooleans[domain] = this.persistentBooleans[i];
      this.persistentLists[i] = new Array(10);
      results.push(this.persistentLists[domain] = this.persistentLists[i]);
    }
    return results;
  };

  VariableStore.prototype.setupDomains = function(domains) {
    this.domains = domains;
    this.setupGlobalDomains();
    return this.setupPersistentDomains();
  };


  /**
  * Changes the current domain.
  *
  * @deprecated
  * @method changeDomain
  * @param {string} domain - The domain to change to.
   */

  VariableStore.prototype.changeDomain = function(domain) {
    var globalVariables, persistentVariables;
    this.domain = domain;
    globalVariables = this.globalVariablesByDomain[domain];
    persistentVariables = this.persistentVariablesByDomain[domain];
    if (!globalVariables) {
      globalVariables = this.globalVariablesByDomain[domain] = {
        numbers: new Array(500),
        strings: new Array(500),
        booleans: new Array(500),
        lists: new Array(500)
      };
    }
    if (!persistentVariables) {
      persistentVariables = this.persistentVariablesByDomain[domain] = {
        numbers: new Array(500),
        strings: new Array(500),
        booleans: new Array(500),
        lists: new Array(500)
      };
    }
    this.numbers = globalVariables.numbers;
    this.strings = globalVariables.strings;
    this.booleans = globalVariables.booleans;
    this.lists = globalVariables.lists;
    this.persistentNumbers = persistentVariables.numbers;
    this.persistentBooleans = persistentVariables.booleans;
    this.persistentStrings = persistentVariables.strings;
    return this.persistentLists = persistentVariables.lists;
  };


  /**
  * Clears all global variables
  *
  * @method clearGlobalVariables
   */

  VariableStore.prototype.clearAllGlobalVariables = function() {
    var globalVariables;
    this.setupGlobalDomains();
    return;
    globalVariables = this.globalVariablesByDomain[this.domain];
    this.numbersByDomain = new Array(1000);
    globalVariables.booleans = new Array(1000);
    globalVariables.strings = new Array(1000);
    this.numbers = globalVariables.numbers;
    this.strings = globalVariables.strings;
    return this.booleans = globalVariables.booleans;
  };


  /**
  * Clears all local variables for all contexts/scenes/common-events.
  *
  * @method clearAllLocalVariables
   */

  VariableStore.prototype.clearAllLocalVariables = function() {
    this.localNumbers = {};
    this.localStrings = {};
    this.localBooleans = {};
    return this.localLists = {};
  };


  /**
  * Clears specified variables.
  *
  * @method clearVariables
  * @param {number[]} numbers - The number variables to clear.
  * @param {string[]} strings - The string variables to clear.
  * @param {boolean[]} booleans - The boolean variables to clear.
  * @param {Array[]} lists - The list variables to clear.
  * @param {number} type - Determines what kind of variables should be cleared.
  * <ul>
  * <li>0 = All</li>
  * <li>1 = Switches / Booleans</li>
  * <li>2 = Numbers</li>
  * <li>3 = Texts</li>
  * <li>4 = Lists</li>
  * </ul>
  * @param {Object} range - The variable id-range to clear. If <b>null</b> all specified variables are cleared.
   */

  VariableStore.prototype.clearVariables = function(numbers, strings, booleans, lists, type, range) {
    switch (type) {
      case 0:
        if (numbers != null) {
          numbers.fill(0, range.start, range.end);
        }
        if (strings != null) {
          strings.fill("", range.start, range.end);
        }
        if (booleans != null) {
          booleans.fill(false, range.start, range.end);
        }
        return lists != null ? lists.fill([], range.start, range.end) : void 0;
      case 1:
        return booleans != null ? booleans.fill(false, range.start, range.end) : void 0;
      case 2:
        return numbers != null ? numbers.fill(0, range.start, range.end) : void 0;
      case 3:
        return strings != null ? strings.fill("", range.start, range.end) : void 0;
      case 4:
        return lists != null ? lists.fill([], range.start, range.end) : void 0;
    }
  };


  /**
  * Clears all local variables for a specified context. If the context is not specified, all
  * local variables for all contexts/scenes/common-events are cleared.
  *
  * @method clearLocalVariables
  * @param {Object} context - The context to clear the local variables for. If <b>null</b>, all
  * @param {number} type - Determines what kind of variables should be cleared.
  * <ul>
  * <li>0 = All</li>
  * <li>1 = Switches / Booleans</li>
  * <li>2 = Numbers</li>
  * <li>3 = Texts</li>
  * <li>4 = Lists</li>
  * </ul>
  * @param {Object} range - The variable id-range to clear. If <b>null</b> all variables are cleared.
   */

  VariableStore.prototype.clearLocalVariables = function(context, type, range) {
    var id, ids, j, len, results;
    if (context != null) {
      ids = [context.id];
    } else {
      ids = Object.keys(this.localNumbers);
    }
    if (range != null) {
      range = {
        start: range.start,
        end: range.end + 1
      };
    } else {
      range = {
        start: 0,
        end: null
      };
    }
    results = [];
    for (j = 0, len = ids.length; j < len; j++) {
      id = ids[j];
      results.push(this.clearVariables(this.localNumbers[id], this.localStrings[id], this.localBooleans[id], this.localLists[id], type, range));
    }
    return results;
  };


  /**
  * Clears global variables.
  *
  * @method clearGlobalVariables
  * @param {number} type - Determines what kind of variables should be cleared.
  * <ul>
  * <li>0 = All</li>
  * <li>1 = Switches / Booleans</li>
  * <li>2 = Numbers</li>
  * <li>3 = Texts</li>
  * <li>4 = Lists</li>
  * </ul>
  * @param {Object} range - The variable id-range to clear. If <b>null</b> all variables are cleared.
   */

  VariableStore.prototype.clearGlobalVariables = function(type, range) {
    if (range != null) {
      range = {
        start: range.start,
        end: range.end + 1
      };
    } else {
      range = {
        start: 0,
        end: null
      };
    }
    return this.clearVariables(this.numbers, this.strings, this.booleans, this.lists, type, range);
  };


  /**
  * Clears persistent variables.
  *
  * @method clearPersistentVariables
  * @param {number} type - Determines what kind of variables should be cleared.
  * <ul>
  * <li>0 = All</li>
  * <li>1 = Switches / Booleans</li>
  * <li>2 = Numbers</li>
  * <li>3 = Texts</li>
  * <li>4 = Lists</li>
  * </ul>
  * @param {Object} range - The variable id-range to clear. If <b>null</b> all variables are cleared.
   */

  VariableStore.prototype.clearPersistentVariables = function(type, range) {
    if (range != null) {
      range = {
        start: range.start,
        end: range.end + 1
      };
    } else {
      range = {
        start: 0,
        end: null
      };
    }
    return this.clearVariables(this.persistentNumbers, this.persistentstrings, this.persistentBooleans, this.persistentLists, type, range);
  };


  /**
  * Initializes the variables. Should be called whenever the context changes. (Like after a scene change)
  *
  * @method setup
  * @param {Object} context - The context(current scene) needed for local variables. Needs have at least an id-property.
   */

  VariableStore.prototype.setup = function(context) {
    this.setupLocalVariables(context);
    return this.setupTempVariables(context);
  };


  /**
  * Initializes the local variables for the specified context. Should be called on first time use.
  *
  * @method setupLocalVariables
  * @param {Object} context - The context(current scene). Needs have at least an id-property.
   */

  VariableStore.prototype.setupLocalVariables = function(context) {
    this.setupVariables(context, "localNumbers", 0);
    this.setupVariables(context, "localStrings", "");
    this.setupVariables(context, "localBooleans", false);
    return this.setupVariables(context, "localLists", []);
  };


  /**
  * Initializes the specified kind of variables.
  *
  * @method setupVariables                                       
  * @param {Object} context - The context(current scene). Needs have at least an id-property.
  * @param {string} property - The kind of variables (property-name).
  * @param {Object} defaultValue - The default value for each variable.
   */

  VariableStore.prototype.setupVariables = function(context, property, defaultValue) {
    if (this[property][context.id] == null) {
      return this[property][context.id] = [];
    }
  };


  /**
  * Initializes the current temp variables for the specified context. Should be called whenever the context changed.
  *
  * @method setupTempVariables
  * @param {Object} context - The context(current scene). Needs have at least an id-property.
   */

  VariableStore.prototype.setupTempVariables = function(context) {
    this.context = context;
    if (!this.localNumbers[context.id]) {
      this.setupLocalVariables(context);
    }
    this.tempNumbers = this.localNumbers[context.id];
    this.tempStrings = this.localStrings[context.id];
    this.tempBooleans = this.localBooleans[context.id];
    return this.tempLists = this.localLists[context.id];
  };

  VariableStore.prototype.clearTempVariables = function(context) {};


  /**
  * Sets the value of the number variable at the specified index.
  *
  * @method setNumberValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @param {number} value - The value to set.
   */

  VariableStore.prototype.setNumberValueAtIndex = function(scope, index, value, domain) {
    if (scope === 2) {
      return this.persistentNumbers[domain][index] = value;
    } else if (scope === 1) {
      return this.numbersByDomain[domain || 0][index] = value;
    } else {
      return this.tempNumbers[index] = value;
    }
  };


  /**
  * Sets the value of a specified number variable.
  *
  * @method setNumberValueAtIndex
  * @param {number} variable - The variable to set. 
  * @param {number} value - The value to set.
   */

  VariableStore.prototype.setNumberValueTo = function(variable, value) {
    if (variable.scope === 2) {
      return this.persistentNumbers[variable.domain || 0][variable.index] = value;
    } else if (variable.scope === 1) {
      return this.numbersByDomain[variable.domain || 0][variable.index] = value;
    } else {
      return this.tempNumbers[variable.index] = value;
    }
  };


  /**
  * Sets the value of a specified list variable.
  *
  * @method setListObjectTo
  * @param {Object} variable - The variable to set. 
  * @param {Object} value - The value to set.
   */

  VariableStore.prototype.setListObjectTo = function(variable, value) {
    if (variable.scope === 2) {
      return this.persistentLists[variable.domain || 0][variable.index] = value;
    } else if (variable.scope === 1) {
      return this.listsByDomain[variable.domain || 0][variable.index] = value;
    } else {
      return this.tempLists[variable.index] = value;
    }
  };


  /**
  * Sets the value of a specified boolean variable.
  *
  * @method setBooleanValueTo
  * @param {Object} variable - The variable to set. 
  * @param {boolean} value - The value to set.
   */

  VariableStore.prototype.setBooleanValueTo = function(variable, value) {
    if (variable.scope === 2) {
      return this.persistentBooleans[variable.domain][variable.index] = value;
    } else if (variable.scope === 1) {
      return this.booleansByDomain[variable.domain][variable.index] = value;
    } else {
      return this.tempBooleans[variable.index] = value;
    }
  };


  /**
  * Sets the value of the boolean variable at the specified index.
  *
  * @method setBooleanValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @param {boolean} value - The value to set.
   */

  VariableStore.prototype.setBooleanValueAtIndex = function(scope, index, value, domain) {
    if (scope === 2) {
      return this.persistentBooleans[domain][index] = value;
    } else if (scope === 1) {
      return this.booleansByDomain[domain][index] = value;
    } else {
      return this.tempBooleans[index] = value;
    }
  };


  /**
  * Sets the value of a specified string variable.
  *
  * @method setStringValueTo
  * @param {Object} variable - The variable to set. 
  * @param {string} value - The value to set.
   */

  VariableStore.prototype.setStringValueTo = function(variable, value) {
    if (variable.scope === 2) {
      return this.persistentStrings[variable.domain][variable.index] = value;
    } else if (variable.scope === 1) {
      return this.stringsByDomain[variable.domain][variable.index] = value;
    } else {
      return this.tempStrings[variable.index] = value;
    }
  };


  /**
  * Sets the value of the string variable at the specified index.
  *
  * @method setStringValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @param {string} value - The value to set.
   */

  VariableStore.prototype.setStringValueAtIndex = function(scope, index, value, domain) {
    if (scope === 2) {
      return this.persistentStrings[domain][index] = value;
    } else if (scope === 1) {
      return this.stringsByDomain[domain][index] = value;
    } else {
      return this.tempStrings[index] = value;
    }
  };


  /**
  * Gets the value of a specified list variable.
  *
  * @method listObjectOf
  * @param {Object} object - The list-variable/object to get the value from.
  * @return {Object} The list-object.
   */

  VariableStore.prototype.listObjectOf = function(object) {
    var result;
    result = 0;
    if ((object != null) && (object.index != null)) {
      if (object.scope === 2) {
        result = this.persistentLists[object.domain][object.index];
      } else if (object.scope === 1) {
        result = this.listsByDomain[object.domain][object.index];
      } else {
        result = this.tempLists[object.index];
      }
    } else {
      result = object;
    }
    return result || [];
  };


  /**
  * Gets the value of a number variable at the specified index.
  *
  * @method numberValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @return {Object} The number value of the variable.
   */

  VariableStore.prototype.numberValueAtIndex = function(scope, index, domain) {
    var result;
    result = 0;
    if (scope === 2) {
      result = this.persistentNumbers[domain][index];
    } else if (scope === 1) {
      result = this.numbersByDomain[domain][index];
    } else {
      result = this.tempNumbers[index];
    }
    return result;
  };


  /**
  * Gets the value of a specified number variable.
  *
  * @method numberValueOf
  * @param {Object} object - The variable to get the value from.
  * @return {Object} The number value of the variable.
   */

  VariableStore.prototype.numberValueOf = function(object) {
    var result;
    result = 0;
    if ((object != null) && (object.index != null)) {
      if (object.scope === 2) {
        result = this.persistentNumbers[object.domain][object.index];
      } else if (object.scope === 1) {
        result = this.numbersByDomain[object.domain][object.index];
      } else {
        result = this.tempNumbers[object.index];
      }
    } else {
      result = object;
    }
    return result || 0;
  };


  /**
  * Gets the value of a specified string variable.
  *
  * @method stringValueOf
  * @param {Object} object - The variable to get the value from.
  * @return {string} The string value of the variable.
   */

  VariableStore.prototype.stringValueOf = function(object) {
    var result;
    result = "";
    if ((object != null) && (object.index != null)) {
      if (object.scope === 2) {
        result = this.persistentStrings[object.domain][object.index];
      } else if (object.scope === 1) {
        result = this.stringsByDomain[object.domain][object.index];
      } else {
        result = this.tempStrings[object.index];
      }
    } else {
      result = object;
    }
    return result || "";
  };


  /**
  * Gets the value of a string variable at the specified index.
  *
  * @method stringValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @return {string} The string value of the variable.
   */

  VariableStore.prototype.stringValueAtIndex = function(scope, index, domain) {
    var result;
    result = "";
    if (scope === 2) {
      result = this.persistentStrings[domain][index];
    } else if (scope === 1) {
      result = this.stringsByDomain[domain][index];
    } else {
      result = this.tempStrings[index];
    }
    return result || "";
  };


  /**
  * Gets the value of a specified boolean variable.
  *
  * @method booleanValueOf
  * @param {Object} object - The variable to get the value from.
  * @return {Object} The boolean value of the variable.
   */

  VariableStore.prototype.booleanValueOf = function(object) {
    var result;
    result = false;
    if ((object != null) && (object.index != null)) {
      if (object.scope === 2) {
        result = this.persistentBooleans[object.domain][object.index] || false;
      } else if (object.scope === 1) {
        result = this.booleansByDomain[object.domain][object.index] || false;
      } else {
        result = this.tempBooleans[object.index] || false;
      }
    } else {
      result = object ? true : false;
    }
    return result;
  };


  /**
  * Gets the value of a boolean variable at the specified index.
  *
  * @method booleanValueAtIndex
  * @param {number} scope - The variable scope.
  * @param {number} index - The variable's index.
  * @return {boolean} The boolean value of the variable.
   */

  VariableStore.prototype.booleanValueAtIndex = function(scope, index, domain) {
    var result;
    result = false;
    if (scope === 2) {
      result = this.persistenBooleans[domain][index] || false;
    } else if (scope === 1) {
      result = this.booleansByDomain[domain][index] || false;
    } else {
      result = this.tempBooleans[index] || false;
    }
    return result;
  };

  return VariableStore;

})();

gs.VariableStore = VariableStore;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQU9BLElBQUE7O0FBQU07RUFDRixhQUFDLENBQUEsb0JBQUQsR0FBd0IsQ0FBQyxtQkFBRCxFQUFzQixtQkFBdEIsRUFBMkMsb0JBQTNDLEVBQWlFLGlCQUFqRTs7O0FBRXhCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztFQXlCYSx1QkFBQTtBQUNUOztBQUNBOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBRVg7Ozs7Ozs7SUFPQSxJQUFDLENBQUEsTUFBRCxHQUFVOztBQUVWOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVcsQ0FBQyxFQUFEOztBQUVYOzs7OztJQUtBLElBQUMsQ0FBQSxPQUFELEdBQVc7O0FBQ1g7Ozs7O0lBS0EsSUFBQyxDQUFBLFFBQUQsR0FBWTs7QUFDWjs7Ozs7SUFLQSxJQUFDLENBQUEsT0FBRCxHQUFXOztBQUNYOzs7OztJQUtBLElBQUMsQ0FBQSxLQUFELEdBQVM7O0FBRVQ7Ozs7O0lBS0EsSUFBQyxDQUFBLHVCQUFELEdBQTJCOztBQUUzQjs7Ozs7SUFLQSxJQUFDLENBQUEsMkJBQUQsR0FBK0I7O0FBRS9COzs7OztJQUtBLElBQUMsQ0FBQSxpQkFBRCxHQUFxQjs7QUFDckI7Ozs7O0lBS0EsSUFBQyxDQUFBLGlCQUFELEdBQXFCOztBQUNyQjs7Ozs7SUFLQSxJQUFDLENBQUEsa0JBQUQsR0FBc0I7O0FBQ3RCOzs7OztJQUtBLElBQUMsQ0FBQSxlQUFELEdBQW1COztBQUNuQjs7Ozs7SUFLQSxJQUFDLENBQUEsWUFBRCxHQUFnQjs7QUFDaEI7Ozs7O0lBS0EsSUFBQyxDQUFBLFlBQUQsR0FBZ0I7O0FBQ2hCOzs7OztJQUtBLElBQUMsQ0FBQSxhQUFELEdBQWlCOztBQUNqQjs7Ozs7SUFLQSxJQUFDLENBQUEsVUFBRCxHQUFjOztBQUNkOzs7O0lBSUEsSUFBQyxDQUFBLFdBQUQsR0FBZTs7QUFDZjs7OztJQUlBLElB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UCxDQUFlLENBQUEsTUFBTSxDQUFDLEtBQVAsQ0FBbkMsSUFBb0QsTUFEakU7T0FBQSxNQUVLLElBQUcsTUFBTSxDQUFDLEtBQVAsS0FBZ0IsQ0FBbkI7UUFDRCxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFpQixDQUFBLE1BQU0sQ0FBQyxNQUFQLENBQWUsQ0FBQSxNQUFNLENBQUMsS0FBUCxDQUFqQyxJQUFrRCxNQUQxRDtPQUFBLE1BQUE7UUFHRCxNQUFBLEdBQVMsSUFBQyxDQUFBLFlBQWEsQ0FBQSxNQUFNLENBQUMsS0FBUCxDQUFkLElBQStCLE1BSHZDO09BSFQ7S0FBQSxNQUFBO01BU0ksTUFBQSxHQUFZLE1BQUgsR0FBZSxJQUFmLEdBQXlCLE1BVHRDOztBQVdBLFdBQU87RUFiSzs7O0FBZWhCOzs7Ozs7Ozs7MEJBUUEsbUJBQUEsR0FBcUIsU0FBQyxLQUFELEVBQVEsS0FBUixFQUFlLE1BQWY7QUFDakIsUUFBQTtJQUFBLE1BQUEsR0FBUztJQUVULElBQUcsS0FBQSxLQUFTLENBQVo7TUFDSSxNQUFBLEdBQVMsSUFBQyxDQUFBLGlCQUFrQixDQUFBLE1BQUEsQ0FBUSxDQUFBLEtBQUEsQ0FBM0IsSUFBcUMsTUFEbEQ7S0FBQSxNQUVLLElBQUcsS0FBQSxLQUFTLENBQVo7TUFDRCxNQUFBLEdBQVMsSUFBQyxDQUFBLGdCQUFpQixDQUFBLE1BQUEsQ0FBUSxDQUFBLEtBQUEsQ0FBMUIsSUFBb0MsTUFENUM7S0FBQSxNQUFBO01BR0QsTUFBQSxHQUFTLElBQUMsQ0FBQSxZQUFhLENBQUEsS0FBQSxDQUFkLElBQXdCLE1BSGhDOztBQUtMLFdBQU87RUFWVTs7Ozs7O0FBWXpCLEVBQUUsQ0FBQyxhQUFILEdBQW1CIiwic291cmNlc0NvbnRlbnQiOlsiIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4jXG4jICAgU2NyaXB0OiBWYXJpYWJsZVN0b3JlXG4jXG4jICAgJCRDT1BZUklHSFQkJFxuI1xuIyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5jbGFzcyBWYXJpYWJsZVN0b3JlXG4gICAgQG9iamVjdENvZGVjQmxhY2tMaXN0ID0gW1wicGVyc2lzdGVudE51bWJlcnNcIiwgXCJwZXJzaXN0ZW50U3RyaW5nc1wiLCBcInBlcnNpc3RlbnRCb29sZWFuc1wiLCBcInBlcnNpc3RlbnRMaXN0c1wiXVxuICAgIFxuICAgICMjIypcbiAgICAqIDxwPkEgc3RvcmFnZSBmb3IgZGlmZmVyZW50IGtpbmQgb2YgZ2FtZSB2YXJpYWJsZXMuIFRoZSBmb2xsb3dpbmcgc2NvcGVzXG4gICAgKiBmb3IgdmFyaWFibGVzIGV4aXN0OjwvcD5cbiAgICAqIFxuICAgICogLSBMb2NhbCBWYXJpYWJsZXMgLT4gT25seSB2YWxpZCBmb3IgdGhlIGN1cnJlbnQgc2NlbmUuXG4gICAgKiAtIEdsb2JhbCBWYXJpYWJsZXMgLT4gVmFsaWQgZm9yIHRoZSB3aG9sZSBnYW1lIGJ1dCBib3VuZCB0byBhIHNpbmdsZSBzYXZlLWdhbWUuXG4gICAgKiAtIFBlcnNpc3RlbnQgVmFyaWFibGVzIC0+IFZhbGlkIGZvciB0aGUgd2hvbGUgZ2FtZSBpbmRlcGVudGVudCBmcm9tIHRoZSBzYXZlLWdhbWVzLlxuICAgICogXG4gICAgKiA8cD5UaGUgZm9sbG93aW5nIGRhdGEtdHlwZXMgZXhpc3Q6PC9wPlxuICAgICogLSBTdHJpbmdzIC0+IFZhcmlhYmxlcyBzdG9yaW5nIHRleHQgZGF0YS5cbiAgICAqIC0gTnVtYmVycyAtPiBWYXJpYWJsZXMgc3RvcmluZyBpbnRlZ2VyIG51bWJlciB2YWx1ZXMuXG4gICAgKiAtIEJvb2xlYW5zIC0+IFZhcmlhYmxlcyBzdG9yaW5nIGJvb2xlYW4gdmFsdWVzLiAoQ2FsbGVkIFwiU3dpdGNoZXNcIiBmb3IgZWFzaWVyIHVuZGVyc3RhbmRpbmcpXG4gICAgKiAtIExpc3RzIC0+IFZhcmlhYmxlcyBzdG9yaW5nIG11bHRpcGxlIG90aGVyIHZhcmlhYmxlcy4gTGlzdHMgY2FuIGFsc28gY29udGFpbiBMaXN0cy5cbiAgICAqIDxwPlxuICAgICogTG9jYWwgdmFyaWFibGVzIGFyZSBzdG9yZWQgYnkgc2NlbmUgVUlELiBGb3IgZWFjaCBzY2VuZSBVSUQgYSBsaXN0IG9mIGxvY2FsIHZhcmlhYmxlcyBpcyBzdG9yZWQuPC9wPlxuICAgICogXG4gICAgKiA8cD5HbG9iYWwgYW5kIHBlcnNpc3RlbnQgdmFyaWFibGVzIGFyZSBzdG9yZWQgYW5kIGEgc3BlY2lmaWMgZG9tYWluLiBBIGRvbWFpbiBpcyBqdXN0IGEgdW5pcXVlIG5hbWUgc3VjaFxuICAgICogYXMgPGk+Y29tLmV4YW1wbGUuZ2FtZTwvaT4gZm9yIGV4YW1wbGUuIFRoZSBkZWZhdWx0IGRvbWFpbiBpcyBhbiBlbXB0eSBzdHJpbmcuIERvbWFpbnMgYXJlIHVzZWZ1bCB0byBhdm9pZFxuICAgICogb3ZlcmxhcHBpbmcgb2YgdmFyaWFibGUgbnVtYmVycyB3aGVuIHNoYXJpbmcgY29udGVudCB3aXRoIG90aGVyIHVzZXJzLiA8L3A+XG4gICAgKlxuICAgICogQG1vZHVsZSBnc1xuICAgICogQGNsYXNzIFZhcmlhYmxlU3RvcmVcbiAgICAqIEBtZW1iZXJvZiBnc1xuICAgICogQGNvbnN0cnVjdG9yXG4gICAgIyMjXG4gICAgY29uc3RydWN0b3I6ICgpIC0+XG4gICAgICAgIGRlYnVnZ2VyXG4gICAgICAgICMjIypcbiAgICAgICAgKiBDdXJyZW50IGxvY2FsIHZhcmlhYmxlIGNvbnRleHRcbiAgICAgICAgKiBAcHJvcGVydHkgY29udGV4dFxuICAgICAgICAqIEB0eXBlIE9iamVjdFxuICAgICAgICAjIyNcbiAgICAgICAgQGNvbnRleHQgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogQ3VycmVudCBkb21haW4gZm9yIGdsb2JhbCBhbmQgcGVyc2lzdGVudCB2YXJpYWJsZXMuIEVhY2ggZG9tYWluIGhhcyBpdHMgb3duXG4gICAgICAgICogdmFyaWFibGVzLiBQbGVhc2UgdXNlIDxiPmNoYW5nZURvbWFpbjwvYj4gbWV0aG9kIHRvIGNoYW5nZSB0aGUgZG9tYWluLlxuICAgICAgICAqIEBwcm9wZXJ0eSBkb21haW5cbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgKiBAcmVhZE9ubHlcbiAgICAgICAgIyMjXG4gICAgICAgIEBkb21haW4gPSBcIlwiXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogTGlzdCBvZiBhdmFpbGFibGUgZG9tYWlucyBmb3IgZ2xvYmFsIGFuZCBwZXJzaXN0ZW50IHZhcmlhYmxlcy5cbiAgICAgICAgKiBAcHJvcGVydHkgZG9tYWluc1xuICAgICAgICAqIEB0eXBlIHN0cmluZ1tdXG4gICAgICAgICMjI1xuICAgICAgICBAZG9tYWlucyA9IFtcIlwiXVxuICAgICAgICBcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBnbG9iYWwgbnVtYmVyIHZhcmlhYmxlcyBvZiB0aGUgY3VycmVudCBkb21haW4uXG4gICAgICAgICogQHByb3BlcnR5IG51bWJlcnNcbiAgICAgICAgKiBAdHlwZSBudW1iZXJbXVxuICAgICAgICAjIyNcbiAgICAgICAgQG51bWJlcnMgPSBudWxsXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZ2xvYmFsIGJvb2xlYW4gdmFyaWFibGVzIG9mIHRoZSBjdXJyZW50IGRvbWFpbi5cbiAgICAgICAgKiBAcHJvcGVydHkgYm9vbGVhbnNcbiAgICAgICAgKiBAdHlwZSBib29sZWFuW11cbiAgICAgICAgIyMjXG4gICAgICAgIEBib29sZWFucyA9IG51bGxcbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBnbG9iYWwgc3RyaW5nIHZhcmlhYmxlcyBvZiB0aGUgY3VycmVudCBkb21haW4uXG4gICAgICAgICogQHByb3BlcnR5IHN0cmluZ3NcbiAgICAgICAgKiBAdHlwZSBzdHJpbmdbXVxuICAgICAgICAjIyNcbiAgICAgICAgQHN0cmluZ3MgPSBudWxsXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgZ2xvYmFsIGxpc3QgdmFyaWFibGVzIG9mIHRoZSBjdXJyZW50IGRvbWFpbi5cbiAgICAgICAgKiBAcHJvcGVydHkgbGlzdHNcbiAgICAgICAgKiBAdHlwZSBPYmplY3RbXVtdXG4gICAgICAgICMjI1xuICAgICAgICBAbGlzdHMgPSBudWxsXG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIHN0b3JhZ2Ugb2YgYWxsIGdsb2JhbCB2YXJpYWJsZXMgYnkgZG9tYWluLlxuICAgICAgICAqIEBwcm9wZXJ0eSBnbG9iYWxWYXJpYWJsZXNCeURvbWFpblxuICAgICAgICAqIEB0eXBlIE9iamVjdFtdW11cbiAgICAgICAgIyMjXG4gICAgICAgIEBnbG9iYWxWYXJpYWJsZXNCeURvbWFpbiA9IHt9XG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIHN0b3JhZ2Ugb2YgYWxsIHBlcnNpc3RlbnQgdmFyaWFibGVzIGJ5IGRvbWFpbi5cbiAgICAgICAgKiBAcHJvcGVydHkgcGVyc2lzdGVudFZhcmlhYmxlc0J5RG9tYWluXG4gICAgICAgICogQHR5cGUgT2JqZWN0W11bXVxuICAgICAgICAjIyNcbiAgICAgICAgQHBlcnNpc3RlbnRWYXJpYWJsZXNCeURvbWFpbiA9IHt9XG4gICAgICAgIFxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIHBlcnNpc3RlbnQgbnVtYmVyIHZhcmlhYmxlcyBvZiB0aGUgY3VycmVudCBkb21haW4uXG4gICAgICAgICogQHByb3BlcnR5IHBlcnNpc3RlbnROdW1iZXJzXG4gICAgICAgICogQHR5cGUgbnVtYmVyW11cbiAgICAgICAgIyMjXG4gICAgICAgIEBwZXJzaXN0ZW50TnVtYmVycyA9IFtdXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgcGVyc2lzdGVudCBzdHJpbmcgdmFyaWFibGVzIG9mIHRoZSBjdXJyZW50IGRvbWFpbi5cbiAgICAgICAgKiBAcHJvcGVydHkgcGVyc2lzdGVudFN0cmluZ3NcbiAgICAgICAgKiBAdHlwZSBzdHJpbmdbXVxuICAgICAgICAjIyNcbiAgICAgICAgQHBlcnNpc3RlbnRTdHJpbmdzID0gW11cbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBwZXJzaXN0ZW50IGJvb2xlYW4gdmFyaWFibGVzIG9mIHRoZSBjdXJyZW50IGRvbWFpbi5cbiAgICAgICAgKiBAcHJvcGVydHkgcGVyc2lzdGVudEJvb2xlYW5zXG4gICAgICAgICogQHR5cGUgYm9vbGVhbltdXG4gICAgICAgICMjI1xuICAgICAgICBAcGVyc2lzdGVudEJvb2xlYW5zID0gW11cbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBwZXJzaXN0ZW50IGxpc3QgdmFyaWFibGVzIG9mIHRoZSBjdXJyZW50IGRvbWFpbi5cbiAgICAgICAgKiBAcHJvcGVydHkgcGVyc2lzdGVudExpc3RzXG4gICAgICAgICogQHR5cGUgT2JqZWN0W11bXVxuICAgICAgICAjIyNcbiAgICAgICAgQHBlcnNpc3RlbnRMaXN0cyA9IFtdXG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgbG9jYWwgbnVtYmVyIHZhcmlhYmxlcy5cbiAgICAgICAgKiBAcHJvcGVydHkgbG9jYWxOdW1iZXJzXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjI1xuICAgICAgICBAbG9jYWxOdW1iZXJzID0ge31cbiAgICAgICAgIyMjKlxuICAgICAgICAqIFRoZSBsb2NhbCBzdHJpbmcgdmFyaWFibGVzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBsb2NhbFN0cmluZ3NcbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgIyMjXG4gICAgICAgIEBsb2NhbFN0cmluZ3MgPSB7fVxuICAgICAgICAjIyMqXG4gICAgICAgICogVGhlIGxvY2FsIGJvb2xlYW4gdmFyaWFibGVzLlxuICAgICAgICAqIEBwcm9wZXJ0eSBsb2NhbEJvb2xlYW5zXG4gICAgICAgICogQHR5cGUgT2JqZWN0XG4gICAgICAgICMjI1xuICAgICAgICBAbG9jYWxCb29sZWFucyA9IHt9XG4gICAgICAgICMjIypcbiAgICAgICAgKiBUaGUgbG9jYWwgbGlzdCB2YXJpYWJsZXMuXG4gICAgICAgICogQHByb3BlcnR5IGxvY2FsTGlzdHNcbiAgICAgICAgKiBAdHlwZSBPYmplY3RcbiAgICAgICAgIyMjXG4gICAgICAgIEBsb2NhbExpc3RzID0ge31cbiAgICAgICAgIyMjKlxuICAgICAgICAqIEBwcm9wZXJ0eSB0ZW1wTnVtYmVyc1xuICAgICAgICAqIEB0eXBlIG51bWJlcltdXG4gICAgICAgICMjI1xuICAgICAgICBAdGVtcE51bWJlcnMgPSBudWxsXG4gICAgICAgICMjIypcbiAgICAgICAgKiBAcHJvcGVydHkgdGVtcFN0cmluZ3NcbiAgICAgICAgKiBAdHlwZSBzdHJpbmdbXVxuICAgICAgICAjIyNcbiAgICAgICAgQHRlbXBTdHJpbmdzID0gbnVsbFxuICAgICAgICAjIyMqXG4gICAgICAgICogQHByb3BlcnR5IGxvY2FsQm9vbGVhbnNcbiAgICAgICAgKiBAdHlwZSBudW1iZXJbXVxuICAgICAgICAjIyNcbiAgICAgICAgQHRlbXBCb29sZWFucyA9IG51bGxcbiAgICAgICAgIyMjKlxuICAgICAgICAqIEBwcm9wZXJ0eSBsb2NhbExpc3RzXG4gICAgICAgICogQHR5cGUgT2JqZWN0W11bXVxuICAgICAgICAjIyNcbiAgICAgICAgQHRlbXBMaXN0cyA9IG51bGxcbiAgICAgICAgXG4gICAgIyMjKlxuICAgICogQ2FsbGVkIGlmIHRoaXMgb2JqZWN0IGluc3RhbmNlIGlzIHJlc3RvcmVkIGZyb20gYSBkYXRhLWJ1bmRsZS4gSXQgY2FuIGJlIHVzZWRcbiAgICAqIHJlLWFzc2lnbiBldmVudC1oYW5kbGVyLCBhbm9ueW1vdXMgZnVuY3Rpb25zLCBldGMuXG4gICAgKiBcbiAgICAqIEBtZXRob2Qgb25EYXRhQnVuZGxlUmVzdG9yZS5cbiAgICAqIEBwYXJhbSBPYmplY3QgZGF0YSAtIFRoZSBkYXRhLWJ1bmRsZVxuICAgICogQHBhcmFtIGdzLk9iamVjdENvZGVjQ29udGV4dCBjb250ZXh0IC0gVGhlIGNvZGVjLWNvbnRleHQuXG4gICAgIyMjXG4gICAgb25EYXRhQnVuZGxlUmVzdG9yZTogKGRhdGEsIGNvbnRleHQpIC0+XG4gICAgICAgIGRvbWFpbnMgPSBEYXRhTWFuYWdlci5nZXREb2N1bWVudHNCeVR5cGUoXCJnbG9iYWxfdmFyaWFibGVzXCIpLnNlbGVjdCAoZCkgLT4gZC5pdGVtcy5kb21haW5cbiAgICAgICAgXG4gICAgICAgIGZvciBkb21haW4sIGkgaW4gZG9tYWluc1xuICAgICAgICAgICAgQG51bWJlcnNCeURvbWFpbltkb21haW5dID0gQG51bWJlcnNCeURvbWFpbltpXVxuICAgICAgICAgICAgQHN0cmluZ3NCeURvbWFpbltkb21haW5dID0gQHN0cmluZ3NCeURvbWFpbltpXVxuICAgICAgICAgICAgQGJvb2xlYW5zQnlEb21haW5bZG9tYWluXSA9IEBib29sZWFuc0J5RG9tYWluW2ldXG4gICAgICAgICAgICBAbGlzdHNCeURvbWFpbltkb21haW5dID0gQGxpc3RzQnlEb21haW5baV1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIG51bGxcbiAgICAgXG4gICAgc2V0dXBHbG9iYWxEb21haW5zOiAoKSAtPlxuICAgICAgICBAbnVtYmVyc0J5RG9tYWluID0gW11cbiAgICAgICAgQHN0cmluZ3NCeURvbWFpbiA9IFtdXG4gICAgICAgIEBib29sZWFuc0J5RG9tYWluID0gW11cbiAgICAgICAgQGxpc3RzQnlEb21haW4gPSBbXVxuICAgICAgICBcbiAgICAgICAgZm9yIGRvbWFpbiwgaSBpbiBAZG9tYWluc1xuICAgICAgICAgICAgQG51bWJlcnNCeURvbWFpbltpXSA9IG5ldyBBcnJheSgxMDAwKVxuICAgICAgICAgICAgQG51bWJlcnNCeURvbWFpbltkb21haW5dID0gQG51bWJlcnNCeURvbWFpbltpXVxuICAgICAgICAgICAgQHN0cmluZ3NCeURvbWFpbltpXSA9IG5ldyBBcnJheSgxMDAwKVxuICAgICAgICAgICAgQHN0cmluZ3NCeURvbWFpbltkb21haW5dID0gQHN0cmluZ3NCeURvbWFpbltpXVxuICAgICAgICAgICAgQGJvb2xlYW5zQnlEb21haW5baV0gPSBuZXcgQXJyYXkoMTAwMClcbiAgICAgICAgICAgIEBib29sZWFuc0J5RG9tYWluW2RvbWFpbl0gPSBAYm9vbGVhbnNCeURvbWFpbltpXVxuICAgICAgICAgICAgQGxpc3RzQnlEb21haW5baV0gPSBuZXcgQXJyYXkoMTAwMClcbiAgICAgICAgICAgIEBsaXN0c0J5RG9tYWluW2RvbWFpbl0gPSBAbGlzdHNCeURvbWFpbltpXVxuICAgICAgICAgICAgXG4gICAgICAgIEBudW1iZXJzID0gQG51bWJlcnNCeURvbWFpblswXVxuICAgICAgICBAc3RyaW5ncyA9IEBzdHJpbmdzQnlEb21haW5bMF1cbiAgICAgICAgQGJvb2xlYW5zID0gQGJvb2xlYW5zQnlEb21haW5bMF1cbiAgICAgICAgQGxpc3RzID0gQG51bWJlcnNCeURvbWFpblswXVxuICAgICAgICBcbiAgICBzZXR1cFBlcnNpc3RlbnREb21haW5zOiAoZG9tYWlucykgLT5cbiAgICAgICAgZm9yIGRvbWFpbiwgaSBpbiBAZG9tYWluc1xuICAgICAgICAgICAgQHBlcnNpc3RlbnROdW1iZXJzW2ldID0gbmV3IEFycmF5KDEwKVxuICAgICAgICAgICAgQHBlcnNpc3RlbnROdW1iZXJzW2RvbWFpbl0gPSBAcGVyc2lzdGVudE51bWJlcnNbaV1cbiAgICAgICAgICAgIEBwZXJzaXN0ZW50U3RyaW5nc1tpXSA9IG5ldyBBcnJheSgxMClcbiAgICAgICAgICAgIEBwZXJzaXN0ZW50U3RyaW5nc1tkb21haW5dID0gQHBlcnNpc3RlbnRTdHJpbmdzW2ldXG4gICAgICAgICAgICBAcGVyc2lzdGVudEJvb2xlYW5zW2ldID0gbmV3IEFycmF5KDEwKVxuICAgICAgICAgICAgQHBlcnNpc3RlbnRCb29sZWFuc1tkb21haW5dID0gQHBlcnNpc3RlbnRCb29sZWFuc1tpXVxuICAgICAgICAgICAgQHBlcnNpc3RlbnRMaXN0c1tpXSA9IG5ldyBBcnJheSgxMClcbiAgICAgICAgICAgIEBwZXJzaXN0ZW50TGlzdHNbZG9tYWluXSA9IEBwZXJzaXN0ZW50TGlzdHNbaV1cbiAgICAgICAgICAgIFxuICAgIHNldHVwRG9tYWluczogKGRvbWFpbnMpIC0+XG4gICAgICAgIEBkb21haW5zID0gZG9tYWluc1xuICAgICAgICBAc2V0dXBHbG9iYWxEb21haW5zKClcbiAgICAgICAgQHNldHVwUGVyc2lzdGVudERvbWFpbnMoKVxuICAgICAgICBcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIENoYW5nZXMgdGhlIGN1cnJlbnQgZG9tYWluLlxuICAgICpcbiAgICAqIEBkZXByZWNhdGVkXG4gICAgKiBAbWV0aG9kIGNoYW5nZURvbWFpblxuICAgICogQHBhcmFtIHtzdHJpbmd9IGRvbWFpbiAtIFRoZSBkb21haW4gdG8gY2hhbmdlIHRvLlxuICAgICMjIyBcbiAgICBjaGFuZ2VEb21haW46IChkb21haW4pIC0+XG4gICAgICAgIEBkb21haW4gPSBkb21haW5cbiAgICAgICAgZ2xvYmFsVmFyaWFibGVzID0gQGdsb2JhbFZhcmlhYmxlc0J5RG9tYWluW2RvbWFpbl1cbiAgICAgICAgcGVyc2lzdGVudFZhcmlhYmxlcyA9IEBwZXJzaXN0ZW50VmFyaWFibGVzQnlEb21haW5bZG9tYWluXVxuICAgICAgICBcbiAgICAgICAgaWYgIWdsb2JhbFZhcmlhYmxlc1xuICAgICAgICAgICAgZ2xvYmFsVmFyaWFibGVzID0gQGdsb2JhbFZhcmlhYmxlc0J5RG9tYWluW2RvbWFpbl0gPSB7IG51bWJlcnM6IG5ldyBBcnJheSg1MDApLCBzdHJpbmdzOiBuZXcgQXJyYXkoNTAwKSwgYm9vbGVhbnM6IG5ldyBBcnJheSg1MDApLCBsaXN0czogbmV3IEFycmF5KDUwMCkgfVxuICAgICAgICBpZiAhcGVyc2lzdGVudFZhcmlhYmxlc1xuICAgICAgICAgICAgcGVyc2lzdGVudFZhcmlhYmxlcyA9IEBwZXJzaXN0ZW50VmFyaWFibGVzQnlEb21haW5bZG9tYWluXSA9IHsgbnVtYmVyczogbmV3IEFycmF5KDUwMCksIHN0cmluZ3M6IG5ldyBBcnJheSg1MDApLCBib29sZWFuczogbmV3IEFycmF5KDUwMCksIGxpc3RzOiBuZXcgQXJyYXkoNTAwKSB9ICAgIFxuICAgICAgICBcbiAgICAgICAgQG51bWJlcnMgPSBnbG9iYWxWYXJpYWJsZXMubnVtYmVyc1xuICAgICAgICBAc3RyaW5ncyA9IGdsb2JhbFZhcmlhYmxlcy5zdHJpbmdzXG4gICAgICAgIEBib29sZWFucyA9IGdsb2JhbFZhcmlhYmxlcy5ib29sZWFuc1xuICAgICAgICBAbGlzdHMgPSBnbG9iYWxWYXJpYWJsZXMubGlzdHNcbiAgICAgICAgQHBlcnNpc3RlbnROdW1iZXJzID0gcGVyc2lzdGVudFZhcmlhYmxlcy5udW1iZXJzXG4gICAgICAgIEBwZXJzaXN0ZW50Qm9vbGVhbnMgPSBwZXJzaXN0ZW50VmFyaWFibGVzLmJvb2xlYW5zXG4gICAgICAgIEBwZXJzaXN0ZW50U3RyaW5ncyA9IHBlcnNpc3RlbnRWYXJpYWJsZXMuc3RyaW5nc1xuICAgICAgICBAcGVyc2lzdGVudExpc3RzID0gcGVyc2lzdGVudFZhcmlhYmxlcy5saXN0c1xuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDbGVhcnMgYWxsIGdsb2JhbCB2YXJpYWJsZXNcbiAgICAqXG4gICAgKiBAbWV0aG9kIGNsZWFyR2xvYmFsVmFyaWFibGVzXG4gICAgIyMjIFxuICAgIGNsZWFyQWxsR2xvYmFsVmFyaWFibGVzOiAtPlxuICAgICAgICBAc2V0dXBHbG9iYWxEb21haW5zKClcbiAgICAgICAgcmV0dXJuXG4gICAgICAgIFxuICAgICAgICBnbG9iYWxWYXJpYWJsZXMgPSBAZ2xvYmFsVmFyaWFibGVzQnlEb21haW5bQGRvbWFpbl1cbiAgICAgICAgQG51bWJlcnNCeURvbWFpbiA9IG5ldyBBcnJheSgxMDAwKVxuICAgICAgICBnbG9iYWxWYXJpYWJsZXMuYm9vbGVhbnMgPSBuZXcgQXJyYXkoMTAwMClcbiAgICAgICAgZ2xvYmFsVmFyaWFibGVzLnN0cmluZ3MgPSBuZXcgQXJyYXkoMTAwMClcbiAgICBcbiAgICAgICAgQG51bWJlcnMgPSBnbG9iYWxWYXJpYWJsZXMubnVtYmVyc1xuICAgICAgICBAc3RyaW5ncyA9IGdsb2JhbFZhcmlhYmxlcy5zdHJpbmdzXG4gICAgICAgIEBib29sZWFucyA9IGdsb2JhbFZhcmlhYmxlcy5ib29sZWFuc1xuICAgIFxuICAgICMjIypcbiAgICAqIENsZWFycyBhbGwgbG9jYWwgdmFyaWFibGVzIGZvciBhbGwgY29udGV4dHMvc2NlbmVzL2NvbW1vbi1ldmVudHMuXG4gICAgKlxuICAgICogQG1ldGhvZCBjbGVhckFsbExvY2FsVmFyaWFibGVzXG4gICAgIyMjIFxuICAgIGNsZWFyQWxsTG9jYWxWYXJpYWJsZXM6IC0+XG4gICAgICAgIEBsb2NhbE51bWJlcnMgPSB7fVxuICAgICAgICBAbG9jYWxTdHJpbmdzID0ge31cbiAgICAgICAgQGxvY2FsQm9vbGVhbnMgPSB7fVxuICAgICAgICBAbG9jYWxMaXN0cyA9IHt9XG4gICAgIFxuICAgICMjIypcbiAgICAqIENsZWFycyBzcGVjaWZpZWQgdmFyaWFibGVzLlxuICAgICpcbiAgICAqIEBtZXRob2QgY2xlYXJWYXJpYWJsZXNcbiAgICAqIEBwYXJhbSB7bnVtYmVyW119IG51bWJlcnMgLSBUaGUgbnVtYmVyIHZhcmlhYmxlcyB0byBjbGVhci5cbiAgICAqIEBwYXJhbSB7c3RyaW5nW119IHN0cmluZ3MgLSBUaGUgc3RyaW5nIHZhcmlhYmxlcyB0byBjbGVhci5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbltdfSBib29sZWFucyAtIFRoZSBib29sZWFuIHZhcmlhYmxlcyB0byBjbGVhci5cbiAgICAqIEBwYXJhbSB7QXJyYXlbXX0gbGlzdHMgLSBUaGUgbGlzdCB2YXJpYWJsZXMgdG8gY2xlYXIuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gdHlwZSAtIERldGVybWluZXMgd2hhdCBraW5kIG9mIHZhcmlhYmxlcyBzaG91bGQgYmUgY2xlYXJlZC5cbiAgICAqIDx1bD5cbiAgICAqIDxsaT4wID0gQWxsPC9saT5cbiAgICAqIDxsaT4xID0gU3dpdGNoZXMgLyBCb29sZWFuczwvbGk+XG4gICAgKiA8bGk+MiA9IE51bWJlcnM8L2xpPlxuICAgICogPGxpPjMgPSBUZXh0czwvbGk+XG4gICAgKiA8bGk+NCA9IExpc3RzPC9saT5cbiAgICAqIDwvdWw+XG4gICAgKiBAcGFyYW0ge09iamVjdH0gcmFuZ2UgLSBUaGUgdmFyaWFibGUgaWQtcmFuZ2UgdG8gY2xlYXIuIElmIDxiPm51bGw8L2I+IGFsbCBzcGVjaWZpZWQgdmFyaWFibGVzIGFyZSBjbGVhcmVkLlxuICAgICMjIyAgXG4gICAgY2xlYXJWYXJpYWJsZXM6IChudW1iZXJzLCBzdHJpbmdzLCBib29sZWFucywgbGlzdHMsIHR5cGUsIHJhbmdlKSAtPlxuICAgICAgICBzd2l0Y2ggdHlwZVxuICAgICAgICAgICAgd2hlbiAwICMgQWxsXG4gICAgICAgICAgICAgICAgbnVtYmVycz8uZmlsbCgwLCByYW5nZS5zdGFydCwgcmFuZ2UuZW5kKVxuICAgICAgICAgICAgICAgIHN0cmluZ3M/LmZpbGwoXCJcIiwgcmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZClcbiAgICAgICAgICAgICAgICBib29sZWFucz8uZmlsbChmYWxzZSwgcmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZClcbiAgICAgICAgICAgICAgICBsaXN0cz8uZmlsbChbXSwgcmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZClcbiAgICAgICAgICAgIHdoZW4gMSAjIFN3aXRjaFxuICAgICAgICAgICAgICAgIGJvb2xlYW5zPy5maWxsKGZhbHNlLCByYW5nZS5zdGFydCwgcmFuZ2UuZW5kKVxuICAgICAgICAgICAgd2hlbiAyICMgTnVtYmVyXG4gICAgICAgICAgICAgICAgbnVtYmVycz8uZmlsbCgwLCByYW5nZS5zdGFydCwgcmFuZ2UuZW5kKVxuICAgICAgICAgICAgd2hlbiAzICMgVGV4dFxuICAgICAgICAgICAgICAgIHN0cmluZ3M/LmZpbGwoXCJcIiwgcmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZClcbiAgICAgICAgICAgIHdoZW4gNCAjIExpc3RcbiAgICAgICAgICAgICAgICBsaXN0cz8uZmlsbChbXSwgcmFuZ2Uuc3RhcnQsIHJhbmdlLmVuZClcbiAgICAgICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDbGVhcnMgYWxsIGxvY2FsIHZhcmlhYmxlcyBmb3IgYSBzcGVjaWZpZWQgY29udGV4dC4gSWYgdGhlIGNvbnRleHQgaXMgbm90IHNwZWNpZmllZCwgYWxsXG4gICAgKiBsb2NhbCB2YXJpYWJsZXMgZm9yIGFsbCBjb250ZXh0cy9zY2VuZXMvY29tbW9uLWV2ZW50cyBhcmUgY2xlYXJlZC5cbiAgICAqXG4gICAgKiBAbWV0aG9kIGNsZWFyTG9jYWxWYXJpYWJsZXNcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0IC0gVGhlIGNvbnRleHQgdG8gY2xlYXIgdGhlIGxvY2FsIHZhcmlhYmxlcyBmb3IuIElmIDxiPm51bGw8L2I+LCBhbGxcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB0eXBlIC0gRGV0ZXJtaW5lcyB3aGF0IGtpbmQgb2YgdmFyaWFibGVzIHNob3VsZCBiZSBjbGVhcmVkLlxuICAgICogPHVsPlxuICAgICogPGxpPjAgPSBBbGw8L2xpPlxuICAgICogPGxpPjEgPSBTd2l0Y2hlcyAvIEJvb2xlYW5zPC9saT5cbiAgICAqIDxsaT4yID0gTnVtYmVyczwvbGk+XG4gICAgKiA8bGk+MyA9IFRleHRzPC9saT5cbiAgICAqIDxsaT40ID0gTGlzdHM8L2xpPlxuICAgICogPC91bD5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSByYW5nZSAtIFRoZSB2YXJpYWJsZSBpZC1yYW5nZSB0byBjbGVhci4gSWYgPGI+bnVsbDwvYj4gYWxsIHZhcmlhYmxlcyBhcmUgY2xlYXJlZC5cbiAgICAjIyMgIFxuICAgIGNsZWFyTG9jYWxWYXJpYWJsZXM6IChjb250ZXh0LCB0eXBlLCByYW5nZSkgLT5cbiAgICAgICAgaWYgY29udGV4dD9cbiAgICAgICAgICAgIGlkcyA9IFtjb250ZXh0LmlkXVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBpZHMgPSBPYmplY3Qua2V5cyhAbG9jYWxOdW1iZXJzKVxuICAgICAgICAgICAgXG4gICAgICAgIGlmIHJhbmdlP1xuICAgICAgICAgICAgcmFuZ2UgPSBzdGFydDogcmFuZ2Uuc3RhcnQsIGVuZDogcmFuZ2UuZW5kICsgMVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByYW5nZSA9IHN0YXJ0OiAwLCBlbmQ6IG51bGxcbiAgICAgICAgICAgIFxuICAgICAgICBmb3IgaWQgaW4gaWRzXG4gICAgICAgICAgICBAY2xlYXJWYXJpYWJsZXMoQGxvY2FsTnVtYmVyc1tpZF0sIEBsb2NhbFN0cmluZ3NbaWRdLCBAbG9jYWxCb29sZWFuc1tpZF0sIEBsb2NhbExpc3RzW2lkXSwgdHlwZSwgcmFuZ2UpXG4gXG4gICAgIyMjKlxuICAgICogQ2xlYXJzIGdsb2JhbCB2YXJpYWJsZXMuXG4gICAgKlxuICAgICogQG1ldGhvZCBjbGVhckdsb2JhbFZhcmlhYmxlc1xuICAgICogQHBhcmFtIHtudW1iZXJ9IHR5cGUgLSBEZXRlcm1pbmVzIHdoYXQga2luZCBvZiB2YXJpYWJsZXMgc2hvdWxkIGJlIGNsZWFyZWQuXG4gICAgKiA8dWw+XG4gICAgKiA8bGk+MCA9IEFsbDwvbGk+XG4gICAgKiA8bGk+MSA9IFN3aXRjaGVzIC8gQm9vbGVhbnM8L2xpPlxuICAgICogPGxpPjIgPSBOdW1iZXJzPC9saT5cbiAgICAqIDxsaT4zID0gVGV4dHM8L2xpPlxuICAgICogPGxpPjQgPSBMaXN0czwvbGk+XG4gICAgKiA8L3VsPlxuICAgICogQHBhcmFtIHtPYmplY3R9IHJhbmdlIC0gVGhlIHZhcmlhYmxlIGlkLXJhbmdlIHRvIGNsZWFyLiBJZiA8Yj5udWxsPC9iPiBhbGwgdmFyaWFibGVzIGFyZSBjbGVhcmVkLlxuICAgICMjIyBcbiAgICBjbGVhckdsb2JhbFZhcmlhYmxlczogKHR5cGUsIHJhbmdlKSAtPlxuICAgICAgICBpZiByYW5nZT9cbiAgICAgICAgICAgIHJhbmdlID0gc3RhcnQ6IHJhbmdlLnN0YXJ0LCBlbmQ6IHJhbmdlLmVuZCArIDFcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmFuZ2UgPSBzdGFydDogMCwgZW5kOiBudWxsXG4gICAgICAgICAgICBcbiAgICAgICAgQGNsZWFyVmFyaWFibGVzKEBudW1iZXJzLCBAc3RyaW5ncywgQGJvb2xlYW5zLCBAbGlzdHMsIHR5cGUsIHJhbmdlKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBDbGVhcnMgcGVyc2lzdGVudCB2YXJpYWJsZXMuXG4gICAgKlxuICAgICogQG1ldGhvZCBjbGVhclBlcnNpc3RlbnRWYXJpYWJsZXNcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB0eXBlIC0gRGV0ZXJtaW5lcyB3aGF0IGtpbmQgb2YgdmFyaWFibGVzIHNob3VsZCBiZSBjbGVhcmVkLlxuICAgICogPHVsPlxuICAgICogPGxpPjAgPSBBbGw8L2xpPlxuICAgICogPGxpPjEgPSBTd2l0Y2hlcyAvIEJvb2xlYW5zPC9saT5cbiAgICAqIDxsaT4yID0gTnVtYmVyczwvbGk+XG4gICAgKiA8bGk+MyA9IFRleHRzPC9saT5cbiAgICAqIDxsaT40ID0gTGlzdHM8L2xpPlxuICAgICogPC91bD5cbiAgICAqIEBwYXJhbSB7T2JqZWN0fSByYW5nZSAtIFRoZSB2YXJpYWJsZSBpZC1yYW5nZSB0byBjbGVhci4gSWYgPGI+bnVsbDwvYj4gYWxsIHZhcmlhYmxlcyBhcmUgY2xlYXJlZC5cbiAgICAjIyMgXG4gICAgY2xlYXJQZXJzaXN0ZW50VmFyaWFibGVzOiAodHlwZSwgcmFuZ2UpIC0+XG4gICAgICAgIGlmIHJhbmdlP1xuICAgICAgICAgICAgcmFuZ2UgPSBzdGFydDogcmFuZ2Uuc3RhcnQsIGVuZDogcmFuZ2UuZW5kICsgMVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByYW5nZSA9IHN0YXJ0OiAwLCBlbmQ6IG51bGxcbiAgICAgICAgICAgIFxuICAgICAgICBAY2xlYXJWYXJpYWJsZXMoQHBlcnNpc3RlbnROdW1iZXJzLCBAcGVyc2lzdGVudHN0cmluZ3MsIEBwZXJzaXN0ZW50Qm9vbGVhbnMsIEBwZXJzaXN0ZW50TGlzdHMsIHR5cGUsIHJhbmdlKVxuICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBJbml0aWFsaXplcyB0aGUgdmFyaWFibGVzLiBTaG91bGQgYmUgY2FsbGVkIHdoZW5ldmVyIHRoZSBjb250ZXh0IGNoYW5nZXMuIChMaWtlIGFmdGVyIGEgc2NlbmUgY2hhbmdlKVxuICAgICpcbiAgICAqIEBtZXRob2Qgc2V0dXBcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0IC0gVGhlIGNvbnRleHQoY3VycmVudCBzY2VuZSkgbmVlZGVkIGZvciBsb2NhbCB2YXJpYWJsZXMuIE5lZWRzIGhhdmUgYXQgbGVhc3QgYW4gaWQtcHJvcGVydHkuXG4gICAgIyMjICAgICBcbiAgICBzZXR1cDogKGNvbnRleHQpIC0+XG4gICAgICAgIEBzZXR1cExvY2FsVmFyaWFibGVzKGNvbnRleHQpXG4gICAgICAgIEBzZXR1cFRlbXBWYXJpYWJsZXMoY29udGV4dClcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBJbml0aWFsaXplcyB0aGUgbG9jYWwgdmFyaWFibGVzIGZvciB0aGUgc3BlY2lmaWVkIGNvbnRleHQuIFNob3VsZCBiZSBjYWxsZWQgb24gZmlyc3QgdGltZSB1c2UuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cExvY2FsVmFyaWFibGVzXG4gICAgKiBAcGFyYW0ge09iamVjdH0gY29udGV4dCAtIFRoZSBjb250ZXh0KGN1cnJlbnQgc2NlbmUpLiBOZWVkcyBoYXZlIGF0IGxlYXN0IGFuIGlkLXByb3BlcnR5LlxuICAgICMjI1xuICAgIHNldHVwTG9jYWxWYXJpYWJsZXM6IChjb250ZXh0KSAtPlxuICAgICAgICBAc2V0dXBWYXJpYWJsZXMoY29udGV4dCwgXCJsb2NhbE51bWJlcnNcIiwgMClcbiAgICAgICAgQHNldHVwVmFyaWFibGVzKGNvbnRleHQsIFwibG9jYWxTdHJpbmdzXCIsIFwiXCIpXG4gICAgICAgIEBzZXR1cFZhcmlhYmxlcyhjb250ZXh0LCBcImxvY2FsQm9vbGVhbnNcIiwgbm8pXG4gICAgICAgIEBzZXR1cFZhcmlhYmxlcyhjb250ZXh0LCBcImxvY2FsTGlzdHNcIiwgW10pXG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEluaXRpYWxpemVzIHRoZSBzcGVjaWZpZWQga2luZCBvZiB2YXJpYWJsZXMuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cFZhcmlhYmxlcyAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICogQHBhcmFtIHtPYmplY3R9IGNvbnRleHQgLSBUaGUgY29udGV4dChjdXJyZW50IHNjZW5lKS4gTmVlZHMgaGF2ZSBhdCBsZWFzdCBhbiBpZC1wcm9wZXJ0eS5cbiAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcm9wZXJ0eSAtIFRoZSBraW5kIG9mIHZhcmlhYmxlcyAocHJvcGVydHktbmFtZSkuXG4gICAgKiBAcGFyYW0ge09iamVjdH0gZGVmYXVsdFZhbHVlIC0gVGhlIGRlZmF1bHQgdmFsdWUgZm9yIGVhY2ggdmFyaWFibGUuXG4gICAgIyMjICBcbiAgICBzZXR1cFZhcmlhYmxlczogKGNvbnRleHQsIHByb3BlcnR5LCBkZWZhdWx0VmFsdWUpIC0+XG4gICAgICAgIGlmIG5vdCB0aGlzW3Byb3BlcnR5XVtjb250ZXh0LmlkXT9cbiAgICAgICAgICAgIHRoaXNbcHJvcGVydHldW2NvbnRleHQuaWRdID0gW11cbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBJbml0aWFsaXplcyB0aGUgY3VycmVudCB0ZW1wIHZhcmlhYmxlcyBmb3IgdGhlIHNwZWNpZmllZCBjb250ZXh0LiBTaG91bGQgYmUgY2FsbGVkIHdoZW5ldmVyIHRoZSBjb250ZXh0IGNoYW5nZWQuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXR1cFRlbXBWYXJpYWJsZXNcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb250ZXh0IC0gVGhlIGNvbnRleHQoY3VycmVudCBzY2VuZSkuIE5lZWRzIGhhdmUgYXQgbGVhc3QgYW4gaWQtcHJvcGVydHkuXG4gICAgIyMjICAgIFxuICAgIHNldHVwVGVtcFZhcmlhYmxlczogKGNvbnRleHQpIC0+XG4gICAgICAgIEBjb250ZXh0ID0gY29udGV4dFxuICAgICAgICBpZiAhQGxvY2FsTnVtYmVyc1tjb250ZXh0LmlkXVxuICAgICAgICAgICAgQHNldHVwTG9jYWxWYXJpYWJsZXMoY29udGV4dClcbiAgICAgICAgICAgIFxuICAgICAgICBAdGVtcE51bWJlcnMgPSBAbG9jYWxOdW1iZXJzW2NvbnRleHQuaWRdXG4gICAgICAgIEB0ZW1wU3RyaW5ncyA9IEBsb2NhbFN0cmluZ3NbY29udGV4dC5pZF1cbiAgICAgICAgQHRlbXBCb29sZWFucyA9IEBsb2NhbEJvb2xlYW5zW2NvbnRleHQuaWRdXG4gICAgICAgIEB0ZW1wTGlzdHMgPSBAbG9jYWxMaXN0c1tjb250ZXh0LmlkXVxuICAgICAgICBcbiAgICBjbGVhclRlbXBWYXJpYWJsZXM6IChjb250ZXh0KSAtPlxuICAgICAgICBcbiAgICBcbiAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgbnVtYmVyIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXROdW1iZXJWYWx1ZUF0SW5kZXhcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29wZSAtIFRoZSB2YXJpYWJsZSBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSB2YXJpYWJsZSdzIGluZGV4LlxuICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHNldC5cbiAgICAjIyMgICAgIFxuICAgIHNldE51bWJlclZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbikgLT5cbiAgICAgICAgaWYgc2NvcGUgPT0gMlxuICAgICAgICAgICAgQHBlcnNpc3RlbnROdW1iZXJzW2RvbWFpbl1baW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZSBpZiBzY29wZSA9PSAxXG4gICAgICAgICAgICBAbnVtYmVyc0J5RG9tYWluW2RvbWFpbnx8MF1baW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHRlbXBOdW1iZXJzW2luZGV4XSA9IHZhbHVlXG5cbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBudW1iZXIgdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXROdW1iZXJWYWx1ZUF0SW5kZXhcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YXJpYWJsZSAtIFRoZSB2YXJpYWJsZSB0byBzZXQuIFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHNldC5cbiAgICAjIyMgICAgIFxuICAgIHNldE51bWJlclZhbHVlVG86ICh2YXJpYWJsZSwgdmFsdWUpIC0+XG4gICAgICAgIGlmIHZhcmlhYmxlLnNjb3BlID09IDJcbiAgICAgICAgICAgIEBwZXJzaXN0ZW50TnVtYmVyc1t2YXJpYWJsZS5kb21haW58fDBdW3ZhcmlhYmxlLmluZGV4XSA9IHZhbHVlXG4gICAgICAgIGVsc2UgaWYgdmFyaWFibGUuc2NvcGUgPT0gMVxuICAgICAgICAgICAgQG51bWJlcnNCeURvbWFpblt2YXJpYWJsZS5kb21haW58fDBdW3ZhcmlhYmxlLmluZGV4XSA9IHZhbHVlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEB0ZW1wTnVtYmVyc1t2YXJpYWJsZS5pbmRleF0gPSB2YWx1ZVxuXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgbGlzdCB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldExpc3RPYmplY3RUb1xuICAgICogQHBhcmFtIHtPYmplY3R9IHZhcmlhYmxlIC0gVGhlIHZhcmlhYmxlIHRvIHNldC4gXG4gICAgKiBAcGFyYW0ge09iamVjdH0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gc2V0LlxuICAgICMjIyAgICAgICAgICAgICBcbiAgICBzZXRMaXN0T2JqZWN0VG86ICh2YXJpYWJsZSwgdmFsdWUpIC0+XG4gICAgICAgIGlmIHZhcmlhYmxlLnNjb3BlID09IDJcbiAgICAgICAgICAgIEBwZXJzaXN0ZW50TGlzdHNbdmFyaWFibGUuZG9tYWlufHwwXVt2YXJpYWJsZS5pbmRleF0gPSB2YWx1ZVxuICAgICAgICBlbHNlIGlmIHZhcmlhYmxlLnNjb3BlID09IDFcbiAgICAgICAgICAgIEBsaXN0c0J5RG9tYWluW3ZhcmlhYmxlLmRvbWFpbnx8MF1bdmFyaWFibGUuaW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHRlbXBMaXN0c1t2YXJpYWJsZS5pbmRleF0gPSB2YWx1ZVxuXG4gICAgXG4gICAgIyMjKlxuICAgICogU2V0cyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgYm9vbGVhbiB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIHNldEJvb2xlYW5WYWx1ZVRvXG4gICAgKiBAcGFyYW0ge09iamVjdH0gdmFyaWFibGUgLSBUaGUgdmFyaWFibGUgdG8gc2V0LiBcbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gc2V0LlxuICAgICMjIyAgICAgICAgICAgICAgIFxuICAgIHNldEJvb2xlYW5WYWx1ZVRvOiAodmFyaWFibGUsIHZhbHVlKSAtPlxuICAgICAgICBpZiB2YXJpYWJsZS5zY29wZSA9PSAyXG4gICAgICAgICAgICBAcGVyc2lzdGVudEJvb2xlYW5zW3ZhcmlhYmxlLmRvbWFpbl1bdmFyaWFibGUuaW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZSBpZiB2YXJpYWJsZS5zY29wZSA9PSAxXG4gICAgICAgICAgICBAYm9vbGVhbnNCeURvbWFpblt2YXJpYWJsZS5kb21haW5dW3ZhcmlhYmxlLmluZGV4XSA9IHZhbHVlXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIEB0ZW1wQm9vbGVhbnNbdmFyaWFibGUuaW5kZXhdID0gdmFsdWVcbiAgICAgICAgICAgIFxuICAgICMjIypcbiAgICAqIFNldHMgdGhlIHZhbHVlIG9mIHRoZSBib29sZWFuIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXRCb29sZWFuVmFsdWVBdEluZGV4XG4gICAgKiBAcGFyYW0ge251bWJlcn0gc2NvcGUgLSBUaGUgdmFyaWFibGUgc2NvcGUuXG4gICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBUaGUgdmFyaWFibGUncyBpbmRleC5cbiAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gdmFsdWUgLSBUaGUgdmFsdWUgdG8gc2V0LlxuICAgICMjIyAgICAgXG4gICAgc2V0Qm9vbGVhblZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbikgLT5cbiAgICAgICAgaWYgc2NvcGUgPT0gMlxuICAgICAgICAgICAgQHBlcnNpc3RlbnRCb29sZWFuc1tkb21haW5dW2luZGV4XSA9IHZhbHVlXG4gICAgICAgIGVsc2UgaWYgc2NvcGUgPT0gMVxuICAgICAgICAgICAgQGJvb2xlYW5zQnlEb21haW5bZG9tYWluXVtpbmRleF0gPSB2YWx1ZVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICBAdGVtcEJvb2xlYW5zW2luZGV4XSA9IHZhbHVlXG5cbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBzdHJpbmcgdmFyaWFibGUuXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXRTdHJpbmdWYWx1ZVRvXG4gICAgKiBAcGFyYW0ge09iamVjdH0gdmFyaWFibGUgLSBUaGUgdmFyaWFibGUgdG8gc2V0LiBcbiAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBzZXQuXG4gICAgIyMjICAgXG4gICAgc2V0U3RyaW5nVmFsdWVUbzogKHZhcmlhYmxlLCB2YWx1ZSkgLT5cbiAgICAgICAgaWYgdmFyaWFibGUuc2NvcGUgPT0gMlxuICAgICAgICAgICAgQHBlcnNpc3RlbnRTdHJpbmdzW3ZhcmlhYmxlLmRvbWFpbl1bdmFyaWFibGUuaW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZSBpZiB2YXJpYWJsZS5zY29wZSA9PSAxXG4gICAgICAgICAgICBAc3RyaW5nc0J5RG9tYWluW3ZhcmlhYmxlLmRvbWFpbl1bdmFyaWFibGUuaW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHRlbXBTdHJpbmdzW3ZhcmlhYmxlLmluZGV4XSA9IHZhbHVlXG4gICAgICAgICAgICBcbiAgICAjIyMqXG4gICAgKiBTZXRzIHRoZSB2YWx1ZSBvZiB0aGUgc3RyaW5nIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBzZXRTdHJpbmdWYWx1ZUF0SW5kZXhcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29wZSAtIFRoZSB2YXJpYWJsZSBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSB2YXJpYWJsZSdzIGluZGV4LlxuICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIHNldC5cbiAgICAjIyMgICAgIFxuICAgIHNldFN0cmluZ1ZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgdmFsdWUsIGRvbWFpbikgLT5cbiAgICAgICAgaWYgc2NvcGUgPT0gMlxuICAgICAgICAgICAgQHBlcnNpc3RlbnRTdHJpbmdzW2RvbWFpbl1baW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZSBpZiBzY29wZSA9PSAxXG4gICAgICAgICAgICBAc3RyaW5nc0J5RG9tYWluW2RvbWFpbl1baW5kZXhdID0gdmFsdWVcbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgQHRlbXBTdHJpbmdzW2luZGV4XSA9IHZhbHVlXG5cbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBsaXN0IHZhcmlhYmxlLlxuICAgICpcbiAgICAqIEBtZXRob2QgbGlzdE9iamVjdE9mXG4gICAgKiBAcGFyYW0ge09iamVjdH0gb2JqZWN0IC0gVGhlIGxpc3QtdmFyaWFibGUvb2JqZWN0IHRvIGdldCB0aGUgdmFsdWUgZnJvbS5cbiAgICAqIEByZXR1cm4ge09iamVjdH0gVGhlIGxpc3Qtb2JqZWN0LlxuICAgICMjIyAgIFxuICAgIGxpc3RPYmplY3RPZjogKG9iamVjdCkgLT5cbiAgICAgICAgcmVzdWx0ID0gMFxuICAgICAgICBpZiBvYmplY3Q/IGFuZCBvYmplY3QuaW5kZXg/XG4gICAgICAgICAgICBpZiBvYmplY3Quc2NvcGUgPT0gMlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBwZXJzaXN0ZW50TGlzdHNbb2JqZWN0LmRvbWFpbl1bb2JqZWN0LmluZGV4XVxuICAgICAgICAgICAgZWxzZSBpZiBvYmplY3Quc2NvcGUgPT0gMVxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBsaXN0c0J5RG9tYWluW29iamVjdC5kb21haW5dW29iamVjdC5pbmRleF1cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAdGVtcExpc3RzW29iamVjdC5pbmRleF1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmVzdWx0ID0gb2JqZWN0XG4gICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBbXVxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgbnVtYmVyIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBudW1iZXJWYWx1ZUF0SW5kZXhcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29wZSAtIFRoZSB2YXJpYWJsZSBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSB2YXJpYWJsZSdzIGluZGV4LlxuICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbnVtYmVyIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgICAgICBcbiAgICBudW1iZXJWYWx1ZUF0SW5kZXg6IChzY29wZSwgaW5kZXgsIGRvbWFpbikgLT5cbiAgICAgICAgcmVzdWx0ID0gMFxuICAgICAgICBcbiAgICAgICAgaWYgc2NvcGUgPT0gMlxuICAgICAgICAgICAgcmVzdWx0ID0gQHBlcnNpc3RlbnROdW1iZXJzW2RvbWFpbl1baW5kZXhdXG4gICAgICAgIGVsc2UgaWYgc2NvcGUgPT0gMVxuICAgICAgICAgICAgcmVzdWx0ID0gQG51bWJlcnNCeURvbWFpbltkb21haW5dW2luZGV4XVxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXN1bHQgPSBAdGVtcE51bWJlcnNbaW5kZXhdXG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdFxuICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgc3BlY2lmaWVkIG51bWJlciB2YXJpYWJsZS5cbiAgICAqXG4gICAgKiBAbWV0aG9kIG51bWJlclZhbHVlT2ZcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgdmFyaWFibGUgdG8gZ2V0IHRoZSB2YWx1ZSBmcm9tLlxuICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgbnVtYmVyIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgICAgIFxuICAgIG51bWJlclZhbHVlT2Y6IChvYmplY3QpIC0+XG4gICAgICAgIHJlc3VsdCA9IDBcbiAgICAgICAgaWYgb2JqZWN0PyBhbmQgb2JqZWN0LmluZGV4P1xuICAgICAgICAgICAgaWYgb2JqZWN0LnNjb3BlID09IDJcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAcGVyc2lzdGVudE51bWJlcnNbb2JqZWN0LmRvbWFpbl1bb2JqZWN0LmluZGV4XVxuICAgICAgICAgICAgZWxzZSBpZiBvYmplY3Quc2NvcGUgPT0gMVxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBudW1iZXJzQnlEb21haW5bb2JqZWN0LmRvbWFpbl1bb2JqZWN0LmluZGV4XVxuICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEB0ZW1wTnVtYmVyc1tvYmplY3QuaW5kZXhdXG5cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmVzdWx0ID0gb2JqZWN0XG4gICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCAwXG4gICAgXG4gICAgIyMjKlxuICAgICogR2V0cyB0aGUgdmFsdWUgb2YgYSBzcGVjaWZpZWQgc3RyaW5nIHZhcmlhYmxlLlxuICAgICpcbiAgICAqIEBtZXRob2Qgc3RyaW5nVmFsdWVPZlxuICAgICogQHBhcmFtIHtPYmplY3R9IG9iamVjdCAtIFRoZSB2YXJpYWJsZSB0byBnZXQgdGhlIHZhbHVlIGZyb20uXG4gICAgKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBzdHJpbmcgdmFsdWUgb2YgdGhlIHZhcmlhYmxlLlxuICAgICMjIyAgICAgICAgXG4gICAgc3RyaW5nVmFsdWVPZjogKG9iamVjdCkgLT5cbiAgICAgICAgcmVzdWx0ID0gXCJcIlxuICAgICAgICBpZiBvYmplY3Q/IGFuZCBvYmplY3QuaW5kZXg/XG4gICAgICAgICAgICBpZiBvYmplY3Quc2NvcGUgPT0gMlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBwZXJzaXN0ZW50U3RyaW5nc1tvYmplY3QuZG9tYWluXVtvYmplY3QuaW5kZXhdXG4gICAgICAgICAgICBlbHNlIGlmIG9iamVjdC5zY29wZSA9PSAxXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gQHN0cmluZ3NCeURvbWFpbltvYmplY3QuZG9tYWluXVtvYmplY3QuaW5kZXhdXG4gICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgcmVzdWx0ID0gQHRlbXBTdHJpbmdzW29iamVjdC5pbmRleF1cbiAgICAgICAgZWxzZVxuICAgICAgICAgICAgcmVzdWx0ID0gb2JqZWN0XG4gICAgICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdCB8fCBcIlwiXG4gICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgc3RyaW5nIHZhcmlhYmxlIGF0IHRoZSBzcGVjaWZpZWQgaW5kZXguXG4gICAgKlxuICAgICogQG1ldGhvZCBzdHJpbmdWYWx1ZUF0SW5kZXhcbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBzY29wZSAtIFRoZSB2YXJpYWJsZSBzY29wZS5cbiAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIFRoZSB2YXJpYWJsZSdzIGluZGV4LlxuICAgICogQHJldHVybiB7c3RyaW5nfSBUaGUgc3RyaW5nIHZhbHVlIG9mIHRoZSB2YXJpYWJsZS5cbiAgICAjIyMgICAgICAgIFxuICAgIHN0cmluZ1ZhbHVlQXRJbmRleDogKHNjb3BlLCBpbmRleCwgZG9tYWluKSAtPlxuICAgICAgICByZXN1bHQgPSBcIlwiXG4gICAgICAgIFxuICAgICAgICBpZiBzY29wZSA9PSAyXG4gICAgICAgICAgICByZXN1bHQgPSBAcGVyc2lzdGVudFN0cmluZ3NbZG9tYWluXVtpbmRleF1cbiAgICAgICAgZWxzZSBpZiBzY29wZSA9PSAxXG4gICAgICAgICAgICByZXN1bHQgPSBAc3RyaW5nc0J5RG9tYWluW2RvbWFpbl1baW5kZXhdXG4gICAgICAgIGVsc2VcbiAgICAgICAgICAgIHJlc3VsdCA9IEB0ZW1wU3RyaW5nc1tpbmRleF1cblxuICAgICAgICByZXR1cm4gcmVzdWx0IHx8IFwiXCJcbiAgICBcbiAgICAjIyMqXG4gICAgKiBHZXRzIHRoZSB2YWx1ZSBvZiBhIHNwZWNpZmllZCBib29sZWFuIHZhcmlhYmxlLlxuICAgICpcbiAgICAqIEBtZXRob2QgYm9vbGVhblZhbHVlT2ZcbiAgICAqIEBwYXJhbSB7T2JqZWN0fSBvYmplY3QgLSBUaGUgdmFyaWFibGUgdG8gZ2V0IHRoZSB2YWx1ZSBmcm9tLlxuICAgICogQHJldHVybiB7T2JqZWN0fSBUaGUgYm9vbGVhbiB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuXG4gICAgIyMjICAgICAgIFxuICAgIGJvb2xlYW5WYWx1ZU9mOiAob2JqZWN0KSAtPlxuICAgICAgICByZXN1bHQgPSBub1xuICAgICAgICBpZiBvYmplY3Q/IGFuZCBvYmplY3QuaW5kZXg/XG4gICAgICAgICAgICBpZiBvYmplY3Quc2NvcGUgPT0gMlxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBwZXJzaXN0ZW50Qm9vbGVhbnNbb2JqZWN0LmRvbWFpbl1bb2JqZWN0LmluZGV4XSB8fCBub1xuICAgICAgICAgICAgZWxzZSBpZiBvYmplY3Quc2NvcGUgPT0gMVxuICAgICAgICAgICAgICAgIHJlc3VsdCA9IEBib29sZWFuc0J5RG9tYWluW29iamVjdC5kb21haW5dW29iamVjdC5pbmRleF0gfHwgbm9cbiAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBAdGVtcEJvb2xlYW5zW29iamVjdC5pbmRleF0gfHwgbm9cblxuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXN1bHQgPSBpZiBvYmplY3QgdGhlbiB0cnVlIGVsc2UgZmFsc2VcbiAgICAgICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0XG4gICAgICAgIFxuICAgICMjIypcbiAgICAqIEdldHMgdGhlIHZhbHVlIG9mIGEgYm9vbGVhbiB2YXJpYWJsZSBhdCB0aGUgc3BlY2lmaWVkIGluZGV4LlxuICAgICpcbiAgICAqIEBtZXRob2QgYm9vbGVhblZhbHVlQXRJbmRleFxuICAgICogQHBhcmFtIHtudW1iZXJ9IHNjb3BlIC0gVGhlIHZhcmlhYmxlIHNjb3BlLlxuICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gVGhlIHZhcmlhYmxlJ3MgaW5kZXguXG4gICAgKiBAcmV0dXJuIHtib29sZWFufSBUaGUgYm9vbGVhbiB2YWx1ZSBvZiB0aGUgdmFyaWFibGUuXG4gICAgIyMjICAgICAgICBcbiAgICBib29sZWFuVmFsdWVBdEluZGV4OiAoc2NvcGUsIGluZGV4LCBkb21haW4pIC0+XG4gICAgICAgIHJlc3VsdCA9IG5vXG4gICAgICAgIFxuICAgICAgICBpZiBzY29wZSA9PSAyXG4gICAgICAgICAgICByZXN1bHQgPSBAcGVyc2lzdGVuQm9vbGVhbnNbZG9tYWluXVtpbmRleF0gfHwgbm9cbiAgICAgICAgZWxzZSBpZiBzY29wZSA9PSAxXG4gICAgICAgICAgICByZXN1bHQgPSBAYm9vbGVhbnNCeURvbWFpbltkb21haW5dW2luZGV4XSB8fCBub1xuICAgICAgICBlbHNlXG4gICAgICAgICAgICByZXN1bHQgPSBAdGVtcEJvb2xlYW5zW2luZGV4XSB8fCBub1xuXG4gICAgICAgIHJldHVybiByZXN1bHRcbiAgICAgICAgXG5ncy5WYXJpYWJsZVN0b3JlID0gVmFyaWFibGVTdG9yZSJdfQ==
//# sourceURL=VariableStore_82.js