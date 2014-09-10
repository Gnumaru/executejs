/*
 * execute.js, planning version https://github.com/Gnumaru/executejs
 * 
 * Copyright 2014, gnumaru Released under the MIT license (plus the "non evil
 * use" clause) https://github.com/Gnumaru/executejs/blob/master/LICENSE
 * 
 * Read-me https://github.com/Gnumaru/executejs/blob/master/README.md
 */

'use strict';
(function() {
	/*
	 * May the global namespace object "executejs" already exists, does nothing
	 */
	if (typeof window.executejs === "undefined") {
		/* FUNCTION DEFINITIONS */

		/**
		 * retrieves the XMLHttpRequest object
		 */
		var getXMLHttpRequest = function() {
			var xmlhttp;
			if (window.XMLHttpRequest) { // real browsers
				xmlhttp = new XMLHttpRequest();
			} else { // IE6
				xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
			}
			return xmlhttp;
		}

		/**
		 * Retrieves only the path, without the file name, from the given file
		 * path
		 */
		var getFilePath = function(path) {
			if (path) {//if not null or undefined
				path = path.substring(0, path.lastIndexOf("/"));//gets the file path;
			} else {
				path = "";
			}
			return path;
		};

		/**
		 * Given a relativePath, this functions returns its full path based on
		 * the script execution stack (or the root folder, if it is the first
		 * script being executed
		 */
		var resolveRelativePaths = function(relativePath) {
			while (relativePath.indexOf("/") === 0) {//while starts with a leading slash, removes it
				relativePath = relativePath.substring(1);
			}

			var currentPath;
			if (executionStack.length > 0) {//the path used to de-relativize is the absolute path for the last script succesfully execute
				currentPath = getFilePath(executionStack[executionStack.length - 1]);
			} else {//but if this is the first script, the entry point, then use the scriptsSource path.
				currentPath = scriptsFullPathRoot;
			}

			var timeOut = 100;//timeout to prevent bugs that lead to infinite loops
			while (relativePath.indexOf("./") !== -1) {//while still has relative paths
				if (relativePath.indexOf("./") === 0) {//if starts with a "current folder" relative path
					relativePath = relativePath.substring(2);//cut off the "current folder" relation
				} else if (relativePath.indexOf("../") === 0) {//if starts with a "parent folder" relative path
					currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));//removes the last folder in current path along with its trailling slash
					relativePath = relativePath.substring(3);//cut off the "parent folder" relation
				} else {//if "has" relations, but does not "start" with relation, means that folder names exists between the relations. in that case, move the folder names to "currentPath"
					currentPath += "/" + relativePath.substring(0, relativePath.indexOf("/"));
					relativePath = relativePath.substring(relativePath.indexOf("/") + 1);
				}

				timeOut--;
				if (timeOut > 99) {
					console.log("There's apparently a bug in resolveRelativePaths since its timeOut has been reached");
					break;
				}
			}
			return currentPath + "/" + relativePath;
		};

		/**
		 * function to normalize file path, including the .js suffix if omited,
		 * removing leading slash if provided
		 * 
		 * 'use strict' does not permit function declarations inside other
		 * functions if it is not the first statement of the function, thus it
		 * is only possible to put int inside the "if" if it is an attribution
		 * to a variable;
		 */
		var normalizeFilePath = function(filePath) {
			if (filePath.lastIndexOf(jsFileSuffix) + jsFileSuffix.length !== filePath.length) {
				filePath += jsFileSuffix;//append '.js' suffix if already not being used
			}
			if (filePath.indexOf("://") === -1) {//if it is not already a full path (as in http:// or file://)
				filePath = resolveRelativePaths(filePath);
			}

			return filePath;
		};

		var retrieveRemoteFileContent = function(filePath) {
			var responseText = null;
			console.log("Retrieving \"" + filePath + "\" through XMLHttpRequest.");
			//forces synchronous script execution with third parameter set to false
			xmlhttp.open("GET", filePath, false);
			try {
				xmlhttp.send();
				responseText = xmlhttp.responseText;
			} catch (err) {
				var errorMessage = "Error trying to request \"" + filePath + "\".\r\nJavascript engine's error message:\r\n==========\r\n" + err.message + "\r\n==========\r\n";
				if (err.message.indexOf("Access to restricted URI denied") !== -1) {
					errorMessage += "Probably the referenced script is mispelled or doesn't exist.";
				}
				throw new Error(errorMessage);
			}
			return responseText;
		}

		/**
		 * The function "execute" always executes synchronously the given
		 * script, similar to php's "require".
		 */
		var execute = function(filePath) {
			filePath = normalizeFilePath(filePath);
			var shouldExecute = true;
			for ( var key in executionStack) {
				if (executionStack[key] === filePath) {
					shouldExecute = false;
					console.warn("Prevented execution of " + filePath + " due to the previous execution has not been completed.");
				}
			}

			var returnValue;
			if (shouldExecute) {
				if (typeof executedScriptsCache[filePath] === "undefined") {//if script has already not been executed,
					var remoteContent = retrieveRemoteFileContent(filePath);//retrieve it via xmlhttp
					try {
						//cache the script into a function for later execution
						var func = new Function(moduleHeader + remoteContent + moduleFooter);
						console.log("Executing " + filePath + ".");
						executionStack.push(filePath);
						//call the function setting "window" to "this" so every global defined there would still be defined as global.
						returnValue = func.call(window);
						//global execution
						//eval.call(window, remoteContent);
						executionStack.pop();
						executedScriptsCache[filePath] = {
							originalScript : remoteContent,
							functionCache : func,
							resultCache : returnValue
						};
					} catch (err) {
						//the "try catch" catches the evaluation errors but hides the actual line the error ocurred in the evaluated file. if this "try catch" is ommited, firefox console tells an error occured in execute.js, but the line it tells the error ocurred is the line in the actual file whose content was evalled (the one retrieved by XMLHttpRequest). Chrome behaves differently =(
						var errorMessage = "Error trying to execute \"" + filePath + "\".\r\nJavascript engine's error message:\r\n==========\r\n" + err + "\r\n==========\r\n";
						throw new Error(errorMessage);
					}
				} else {//else, returns the cache from the first execution
					console.log("Executing cache for " + filePath + ".");
					returnValue = executedScriptsCache[filePath].resultCache;
				}
			}
			return returnValue;
		};

		/**
		 * The function "executeOnce" executes the given script just once, even
		 * if called multiple times, similar to php's "require_once".
		 */
		var executeOnce = function(filePath) {
			filePath = normalizeFilePath(filePath);
			var returnValue = null;
			var shouldExecute = true;
			for ( var key in executedScriptsCache) {
				//if the executedScriptsCache hashmap contains the key and it is equal to the file path, tell to not execute the script again
				if (executedScriptsCache.hasOwnProperty(key) && key === filePath) {
					shouldExecute = false;
					break;
				}
			}
			if (shouldExecute) {
				returnValue = executejs.execute(filePath);
			} else {
				console.warn("Prevented execution of " + filePath + " by executeOnce(). " + filePath + " has already been executed.");
				returnValue = executedScriptsCache[filePath].resultCache;
			}
			return returnValue;
		};

		/**
		 * The function "forceRetrievalAndExecution" executes the given script
		 * as many times as it is called directly in the global context, without
		 * taking advantage of any cache and without dealing with the execution
		 * stack. This is ideal for standalone scripts (those intended to be
		 * included in the html's head via script tags) whose cache is not
		 * wanted aniway and/or are proceduraly generated server side, by php or
		 * other server-side platform
		 */
		var forceRetrievalAndExecution = function(filePath) {
			filePath = normalizeFilePath(filePath);
			var remoteContent = retrieveRemoteFileContent(filePath);//retrieve script via xmlhttp
			console.log("Forcing execution of \"" + filePath + "\".");
			eval.call(window, remoteContent);//execute it in the global context
		};

		/**
		 * Return the full url for the scripts root folder (the one where the
		 * entry point resides)
		 */
		var getScriptsFullPathRoot = function() {
			if (scriptsPathRoot && scriptsPathRoot !== "") {//if root is not null of undefined and is different from empty string
				if (scriptsPathRoot.indexOf("/") === 0) {//if it has a leading slash
					scriptsPathRoot = scriptsPathRoot.substr(1);//remove leading slash
				}
				if (scriptsPathRoot.lastIndexOf("/") === scriptsPathRoot.length - 1) {//if it has a tralling slash
					scriptsPathRoot = scriptsPathRoot.substring(0, scriptsPathRoot.length - 1);//remove trailling slash
				}
			} else {
				scriptsPathRoot = "";
			}
			return window.location.href.substring(0, window.location.href.lastIndexOf("/")) + scriptsPathRoot;
		}

		/* INITIALIZATION CODE */

		//create the "executejs" namespace object
		var executejs = {};
		//"hashmap" containing already executed scripts as functions an its file paths
		//every executedScriptsCache should be a string representing the full file path, and its value is a Object. This Object contains two properties, one Function cached from the evaluated script, and the cached result from the function execution (the actual module exports object);
		var executedScriptsCache = {};
		//stack containing the scripts that have been executed but had not already finished execution. It is necessary to prevent circular loops
		var executionStack = [];
		var jsFileSuffix = ".js";
		var moduleHeader = "var module = {}; var exports = {}; module.exports = exports;";
		var moduleFooter = ";\r\nreturn module.exports;";
		var entryPoint;
		var scriptsPathRoot;
		var scriptsFullPathRoot;//index.html full url + scriptsPathRoot 
		var xmlhttp = getXMLHttpRequest();

		//gets the main script to be executed, if defined
		var scripts = document.getElementsByTagName("script");
		for (var i = 0, length = scripts.length; i < length; i++) {
			if (scripts[i].getAttribute("src") && scripts[i].getAttribute("src").indexOf("execute.js") !== -1) {
				entryPoint = scripts[i].getAttribute("main");
				scriptsPathRoot = scripts[i].getAttribute("root");
				break;
			}
		}

		scriptsFullPathRoot = getScriptsFullPathRoot();

		executejs.executeOnce = executeOnce;
		executejs.execute = execute;
		executejs.forceRetrievalAndExecution = forceRetrievalAndExecution;
		executejs.retrieveRemoteFileContent = retrieveRemoteFileContent;

		//seals the namespace object. It can't be frozen because the "executedScriptsCache" Object still needs to be changed over the time
		Object.seal(executejs);
		//exposes the "executejs" namespace object through the global window object
		window.executejs = executejs;
		//if there is no global require function defined, create it as a reference to "executejs.executeOnce()"
		if (typeof window.require === "undefined") {
			window.require = executejs.executeOnce;
		}

		/* APPLICATION START */
		if (entryPoint) {//if an application entry point was defined, run it now!
			executejs.executeOnce(entryPoint);
		}
	}
})();
