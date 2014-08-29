/*
 * ********** execute.js **********
 * 
 * The purpose of this library is to implement a minimalistic
 * "include/import/using" functionality in javascript, to prevent using several
 * script tags into a html file. This is NOT suposed to be an asynchronous
 * module loader like requirejs, or a synchronous module dependency resolver and
 * build tool like browserify, it is intended to do at runtime exactly what a
 * php interpreter would do when encountering the require and require_once
 * function calls, or what a C compiler preprocessor would do with a include
 * statement
 * 
 * There is not yet a greatly accepted standard for javascript code modularity
 * handling (I'm not talking about code modules definitions and usage, that is
 * covered by Comonjs and AMD, but code modularity, the way by which code is
 * separated into several files and run, be it preprocessed and bundled into a
 * single file or not). Some people use several build tools like browserify or
 * other tools to parse dependencies and preproces/concatenate files
 * accordingly. Others use libraries like require.js to load different module
 * files at runtime, and others separate their code into several script files
 * and add several <include> tags in the page header.
 * 
 * execute.js is intended to be a minimalistc tool to execute a given in-domain
 * script that contains dependencies for the script which is calling it, or that
 * contais procedures to be executed. Say you have a "Person" class (javascript
 * constructor function) defined into "http://(websiteurl)/js/model/Person.js"
 * and you want to use this class into several other files. Just execute once
 * the file, execute("model/Person.js"), and the class will be defined by the
 * application lifetime. Or say you have a procedure that is schedulled (by
 * whathever means) to be executed continuously every minute. you could just put
 * a require("myAwesomeProcedure.js"); inside your scheduler and that's all
 * 
 * execute.js does not address the scopping (handling conflicts because of using
 * global variables) problem AT ALL because that is something you already would
 * be addressing by yourself when using several <script> tags
 */

'use strict';
(function() {
  /*
   * May the global namespace object "executejs" already exists, doesn't create
   * it again.
   */
  if (typeof window.executejs === "undefined") {
    //function to normalize file path, including the .js suffix if omited, and removing leading slash if provided.
    //'use strict' dos not permit function declarations inside other functions if it is not the first statement of the function, thus it is only possible to put int inside the "if" if it is an attribution to a variable;
    var normalizeFilePath = function(filePath) {
      //append '.js' suffix if already not in use
      if (filePath.lastIndexOf(jsFileSuffix) + jsFileSuffix.length !== filePath.length) {
        filePath += jsFileSuffix;
      }
      //remove leading slash (/) if being used
      if (filePath.indexOf("/") === 0) {
        filePath = filePath.substr(1);
      }
      return filePath;
    };

    //create the "executejs" namespace object
    var executejs = {};
    //"hashmap" containing already executed scripts as functions an its file paths
    var alreadyExecutedScripts = {};
    var jsFileSuffix = ".js";
    var moduleHeader = "var exports = {};\r\n";
    var moduleFooter = "\r\nreturn exports;";
    var main;
    var root;
    var xmlhttp;
    if (window.XMLHttpRequest) { // real browsers
      xmlhttp = new XMLHttpRequest();
    } else { // IE6
      xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
    }

    //gets the main script to be executed, if defined
    var scripts = document.getElementsByTagName("script");
    for (var i = 0, length = scripts.length; i < length; i++) {
      if (scripts[i].getAttribute("src") && scripts[i].getAttribute("src").indexOf("execute.js") !== -1) {
        main = scripts[i].getAttribute("main");
        root = scripts[i].getAttribute("root");
        break;
      }
    }
    //sets the script root folder
    if (root && root !== "") {
      if (root.indexOf("/") === 0) {
        root = root.substr(1);
      }
      if (root.lastIndexOf("/") !== root.length - 1) {
        root += "/";
      }
    } else {
      root = "";
    }
    var scriptsSource = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1) + root;

    /*
     * The function "execute" always executes synchronously the given script,
     * similar to php's "require".
     */
    executejs.execute = function(filePath) {
      filePath = normalizeFilePath(filePath);
      var returnValue;
      if (typeof alreadyExecutedScripts[filePath] === "undefined") {
        //if script has already not been executed, retrieve it via xmlhttp and create a new function wit its content.
        console.log("Retrieving \"" + filePath + "\" through XMLHttpRequest.");
        xmlhttp.onload = function() {
          try {
            //call eval with window as 'this' so the script will be purpusefully executed in the global scope, as if it where executed via a <script> tag
            //eval.call(window, xmlhttp.responseText);
            //cache the script into a function for later execution
            var func = new Function(moduleHeader + xmlhttp.responseText + moduleFooter);
            console.log("Executing " + filePath + ".");
            //call the function setting "window" to "this" so every global defined there would still be defined as global.
            returnValue = func.call(window);
            alreadyExecutedScripts[filePath] = func;
            return returnValue;
          } catch (err) {
            //the "try catch" catches the evaluation errors but hides the actual line the error ocurred in the evaluated file. if this "try catch" is ommited, firefox console tells an error occured in execute.js, but the line it tells the error ocurred is the line in the actual file whose content was evalled (the one retrieved by XMLHttpRequest). Chrome behaves differently =(
            var errorMessage = "Error trying to execute \"" + filePath + "\".\r\nJavascript engine's error message:\r\n==========\r\n" + err + "\r\n==========\r\n";
            throw new Error(errorMessage);
          }
        };

        //forces synchronous script execution with third parameter set to false
        xmlhttp.open("GET", scriptsSource + filePath, false);
        try {
          xmlhttp.send();
        } catch (err) {
          var errorMessage = "Error trying to request \"" + filePath + "\".\r\nJavascript engine's error message:\r\n==========\r\n" + err.message + "\r\n==========\r\n";
          if (err.message.indexOf("Access to restricted URI denied") !== -1) {
            errorMessage += "Probably the referenced script is mispelled or doesn't exist.";
          }
          throw new Error(errorMessage);
        }
      } else {
        //else, execute the function already stored
        console.log("Executing cache for " + filePath + ".");
        returnValue = alreadyExecutedScripts[filePath].call(window);
      }
      return returnValue;
    };

    /*
     * The function "executeOnce" executes the given script just once, even if
     * called multiple times, similar to php's "require_once".
     */
    executejs.executeOnce = function(filePath) {
      filePath = normalizeFilePath(filePath);
      var shouldExecute = true;
      for ( var key in alreadyExecutedScripts) {
        //if the alreadyExecutedScripts hashmap contains the key and it is equal to the file path, tell to not execute the script again
        if (alreadyExecutedScripts.hasOwnProperty(key) && key === filePath) {
          shouldExecute = false;
          break;
        }
      }
      if (shouldExecute) {
        return executejs.execute(filePath);
      }
    };

    //seals the namespace object. It can't be frozen because the "alreadyExecutedScripts" array still needs to be changed over the time
    Object.seal(executejs);
    //exposes the "executejs" namespace object through the global window object
    window.executejs = executejs;
    //if there is no globa require function defined, create it as a reference to "executejs.executeOnce()"
    if (typeof window.require === "undefined") {
      window.require = executejs.executeOnce;
    }
    //if an application entry point was defined, run it now!
    if (main) {
      executejs.executeOnce(main);
    }
  }
})();
