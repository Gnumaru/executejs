/*!
 * execute.js, planning version
 * https://github.com/Gnumaru/executejs
 *
 * Copyright 2014, gnumaru
 * Released under the MIT license
 * https://github.com/Gnumaru/executejs/blob/master/LICENSE
 * 
 * Read-me
 * https://github.com/Gnumaru/executejs/blob/master/README.md
 */

'use strict';
(function() {
	/*
	 * May the global namespace object "executejs" already exists, does nothing
	 */
	if (typeof window.executejs === "undefined") {
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
			if (executionStack.length > 0) {
				currentPath = getFilePath(executionStack[executionStack.length - 1]);
			} else {
				currentPath = scriptsSource;
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

		//function to normalize file path, including the .js suffix if omited, removing leading slash if provided
		//'use strict' does not permit function declarations inside other functions if it is not the first statement of the function, thus it is only possible to put int inside the "if" if it is an attribution to a variable;
		var normalizeFilePath = function(filePath) {
			if (filePath.lastIndexOf(jsFileSuffix) + jsFileSuffix.length !== filePath.length) {
				filePath += jsFileSuffix;//append '.js' suffix if already not being used
			}
			if (filePath.indexOf("://") === -1) {//if it is not already a full path (as in http:// or file://)
				filePath = resolveRelativePaths(filePath);
			}

			return filePath;
		};

		//create the "executejs" namespace object
		var executejs = {};
		//"hashmap" containing already executed scripts as functions an its file paths
		//every executedScriptsCache should be a string representing the full file path, and its value is a Object. This Object contains two properties, one Function cached from the evaluated script, and the cached result from the function execution (the actual module exports object);
		var executedScriptsCache = {};
		//stack containing the scripts that have been executed but had not already finished execution. It is necessary to prevent circular loops
		var executionStack = [];
		var jsFileSuffix = ".js";
		var moduleHeader = "var exports = {};\r\n";
		var moduleFooter = ";\r\nreturn exports;";
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
		if (root && root !== "") {//if root is not null of undefined and is different from empty string
			if (root.indexOf("/") === 0) {//if it has a leading slash
				root = root.substr(1);//remove leading slash
			}
			if (root.lastIndexOf("/") === root.length - 1) {//if it has a tralling slash
				root = root.substring(0, root.length - 1);//remove trailling slash
			}
		} else {
			root = "";
		}
		var scriptsSource = window.location.href.substring(0, window.location.href.lastIndexOf("/") + 1) + root;

		/*
		 * The function "execute" always executes synchronously the given
		 * script, similar to php's "require".
		 */
		executejs.execute = function(filePath) {
			filePath = normalizeFilePath(filePath);
			var shouldExecute = true;
			for ( var key in executionStack) {
				if (executionStack[key] === filePath) {
					shouldExecute = false;
					console.warn("Prevented execution of " + filePath + " due to previous execution not yet completed.");
				}
			}
			var returnValue;
			if (shouldExecute) {
				if (typeof executedScriptsCache[filePath] === "undefined") {//if script has already not been executed, retrieve it via xmlhttp and create a new function wit its content.
					console.log("Retrieving \"" + filePath + "\" through XMLHttpRequest.");
					xmlhttp.onload = function() {
						try {
							//cache the script into a function for later execution
							var func = new Function(moduleHeader + xmlhttp.responseText + moduleFooter);
							console.log("Executing " + filePath + ".");
							executionStack.push(filePath);
							//call the function setting "window" to "this" so every global defined there would still be defined as global.
							returnValue = func.call(window);
							executionStack.pop();
							executedScriptsCache[filePath] = {
								functionCache : func,
								resultCache : returnValue
							};
						} catch (err) {
							//the "try catch" catches the evaluation errors but hides the actual line the error ocurred in the evaluated file. if this "try catch" is ommited, firefox console tells an error occured in execute.js, but the line it tells the error ocurred is the line in the actual file whose content was evalled (the one retrieved by XMLHttpRequest). Chrome behaves differently =(
							var errorMessage = "Error trying to execute \"" + filePath + "\".\r\nJavascript engine's error message:\r\n==========\r\n" + err + "\r\n==========\r\n";
							throw new Error(errorMessage);
						}
					};

					//forces synchronous script execution with third parameter set to false
					xmlhttp.open("GET", filePath, false);
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
					returnValue = executedScriptsCache[filePath].resultCache;
				}
			}
			return returnValue;
		};

		/*
		 * The function "executeOnce" executes the given script just once, even
		 * if called multiple times, similar to php's "require_once".
		 */
		executejs.executeOnce = function(filePath) {
			filePath = normalizeFilePath(filePath);
			var shouldExecute = true;
			for ( var key in executedScriptsCache) {
				//if the executedScriptsCache hashmap contains the key and it is equal to the file path, tell to not execute the script again
				if (executedScriptsCache.hasOwnProperty(key) && key === filePath) {
					shouldExecute = false;
					break;
				}
			}
			if (shouldExecute) {
				return executejs.execute(filePath);
			} else {
				console.warn("Prevented execution of " + filePath + " by executeOnce(). " + filePath + " has already been executed.");
			}
		};

		//seals the namespace object. It can't be frozen because the "executedScriptsCache" Object still needs to be changed over the time
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
