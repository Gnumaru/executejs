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
		 * Retrieves the XMLHttpRequest object.
		 * 
		 * @return {Object} The XMLHttpRequest object.
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
		 * path.
		 * 
		 * @param {string}
		 *            path Path string, probably ending with a file, which
		 *            containing folder path is trying to be get.
		 * @return {string} A string containing the path without the file
		 */
		var getFilePath = function(path) {
			if (path) {//if not null or undefined or empty string
				path = path.substring(0, path.lastIndexOf("/"));//gets the file path, excluding trailling slash
			} else {
				path = "";
			}
			return path;
		};

		/**
		 * Given a relativePath, this functions returns its full path based on
		 * the script execution stack (or the root folder, if it is the first
		 * script being executed
		 * 
		 * @param {string}
		 *            relativePath Relative javascript file path wich is trying
		 *            to be derelativized (converted into full path)
		 * @return {string} The full path corresponding to the relative path
		 *         given as parameter
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
		 * Function to normalize file paths, including the .js suffix if omited,
		 * removing leading slash if provided and resolving relative paths to
		 * full paths.
		 * 
		 * @param {string}
		 *            filePath The file path which is trying to be normalized.
		 * @return {string} The normalized file path.
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

		/**
		 * Try to find already loaded modules from the given relative file path
		 * and return an array with the found candidates full paths.
		 * 
		 * @param {string}
		 *            relativePath Relative path of the module which is trying
		 *            to be found in the cache.
		 * @return {string[]} List of module candidate paths (module paths that
		 *         ends with the given relativePath).
		 */
		var getModuleCandidates = function(relativePath) {
			var lastRelativeIndex = relativePath.lastIndexOf("./");
			if (lastRelativeIndex !== -1) {//if a relative path does exist
				relativePath = relativePath.substring(lastRelativeIndex + 1);//yes, I DO want to keep the trailing slash
			}

			if (relativePath.lastIndexOf(jsFileSuffix) + jsFileSuffix.length !== relativePath.length) {
				relativePath += jsFileSuffix;//append '.js' suffix if already not being used
			}

			var candidates = [];
			for ( var key in executedScriptsCache) {
				if (key.lastIndexOf(relativePath) + relativePath.length === key.length) {
					candidates.push(key);
				}
			}
			return (candidates);
		}

		/**
		 * Converts a given path string with a parent chain to a pseudo-full
		 * path string (a path starting from the root provided to executejs,
		 * instead of a path starting with file:// or http://)
		 * 
		 * @param {string}
		 *            pathWithParentChain path suposed to having a parent chain,
		 *            like in "../../../js/model/entity/person.js" instead of
		 *            "./entity.js"
		 * @return {string} the path converted to a pseudo-full path (a path
		 *         starting from the root provided to executejs, instead of a
		 *         path starting with file:// or http://)
		 */
		var resolveParentChainLeadingToRoot = function(pathWithParentChain) {
			var lastRelativeIndex = pathWithParentChain.lastIndexOf("../");
			if (lastRelativeIndex !== -1) {//if there is a parent relation
				pathWithParentChain = pathWithParentChain.substring(lastRelativeIndex + 3);//yes, I DO want to keep the trailing slash
			}
			pathWithParentChain = scriptsPathRoot + "/" + pathWithParentChain;
			return pathWithParentChain
		}

		/**
		 * Retrieves synchronously the content of a file in the given URI.
		 * 
		 * @param {string}
		 *            filePath The full URI of the file whose content is trying
		 *            to be retrieved.
		 * @return {string} The string content of the retrieved file.
		 */
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
		 * 
		 * @param {string}
		 *            filePath The file path of the script trying to be
		 *            executed.
		 * @return {object<*, *>} The module.exports object of the executed
		 *         script. It the executed script does not exports any commonjs
		 *         module, the return value will be an empty object.
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
		 * 
		 * @parameter {string} filePath The URI of the script which is trying to
		 *            be executed.
		 * @return {object<*.*>} The exported commonjs module.exports of that
		 *         module. If the script does not exports any commonjs modules,
		 *         the return value will be an empty object.
		 */
		var executeOnce = function(filePath) {
			//in case of the execution stack being empty, such as when a require is made inside a function which is not executed directly by the execution stack, but by user interaction with the UI, then try to find candidates for that script on the cache
			if (executionStack.length === 0) {
				var candidates = getModuleCandidates(filePath);
				if (candidates.length === 1) {//if only one candidate was found, use it
					filePath = candidates[0];
				} else if (candidates.length > 1) {//if more than one candidate was found, it is not possible to determine the script
					throw new Error("Could not reliably determine required script");
				} else {//if there where any candidates, as a last resort, try assuming the path as a rootyfied relative path
					filePath = resolveParentChainLeadingToRoot(filePath);
				}
			}
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
		 * 
		 * @parameter {string} filePath The absolute file URI of the script
		 *            which is trying to be executed.
		 */
		var forceRetrievalAndExecution = function(filePath) {
			filePath = normalizeFilePath(filePath);
			var remoteContent = retrieveRemoteFileContent(filePath);//retrieve script via xmlhttp
			console.log("Forcing execution of \"" + filePath + "\".");
			(new Function(remoteContent))();//execute it in the global context
		};

		/**
		 * Return the full URI for the scripts root folder (the one where the
		 * entry point resides)
		 * 
		 * @return {string} The scripts root folder URI.
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
		var scriptsFullPathRoot;//index.html full URI + scriptsPathRoot 
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
