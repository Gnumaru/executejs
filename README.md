EXECUTEJS
=========

Execute/run javascript files from within other javascript files from the browser easily!!!

The purpose of this library is to implement a minimalistic, execution time, code inclusion functionality in javascript (like it is done in compile time in C with "include", in Java with "import", in C# with "using" and in execution time in php with require and require_once), to prevent using several script tags into a html file. This is NOT suposed to be an asynchronous module loader like requirejs, or a synchronous module dependency resolver and build tool like browserify, it is intended to do at runtime exactly what a php interpreter would do when encountering the require and require_once function calls, or what a C compiler preprocessor would do with a include statement

There is not yet a greatly accepted standard for javascript code modularity handling (I'm not talking about code modules definitions and usage, that is already covered by Comonjs and AMD, but code modularity, the way by which code is separated into several files and executed as is or preprocessed and bundled into a single file). Many use several build tools like browserify or other tools to parse dependencies and preprocess/concatenate files accordingly. Others use libraries like require.js to load different module files at runtime, and others separate their code into several script files and add several include tags in the page header.

execute.js intend to address this problem in a very simple and minimalistic way. It is intended to be a minimalistc tool to execute a given in-domain script that may contain dependencies for the script which is calling it, or that contais simple procedures to be executed. Say you have a "Person" class (javascript constructor function) defined into "http://(websiteurl)/js/model/Person.js" and you want to use this class into several other files. Just execute once the file with execute("model/Person.js"), and the class will be defined in whatever scope/namespace it was defined in the Person.js file by the application lifetime. Or say you have a procedure that is schedulled (by whathever means) to be executed continuously every minute. you could just put a require("myAwesomeProcedure.js"); inside your scheduler and that's all

execute.js does not address the scopping problem (handling conflicts due to using global variables) AT ALL because that is something you already would be addressing by yourself when using several script tags

From within your index file, include just one script tag for executejs and another one for your main js file (you wont need more than your main file anymore =)

Usage
=========
From within your index.html file, include just one script tag for executejs and any other for other scripts you will be loading.
```html
<head>
  <script src="js/execute.js"></script>
  <script src="js/main.js"></script>
</head>
```
executejs creates then the global namespace object "executejs" with the functions "execute" and "executeOnce", wich will be used to load and execute the scripts synchronously. Provide the script tag for executejs before any script tag for scripts that rely on executejs.

If your browser for some reason load the script tags simultaneously instead of in a sequence, you can provide only the tag for executejs with a "main" attribute that tells execute js wich is the firs script to be loaded:
```html
<head>
  <script main="main.js" src="js/execute.js"></script>
</head>
```

To execute a script file from within another, just use

```javascript
executejs.execute("myFile.js");
```
or
```javascript
executejs.executeOnce("myFile.js");
```

or without the filetype extension 
```javascript
executejs.execute("myFile");
```
or
```javascript
executejs.executeOnce("myFile");
```
The script name can start with a leading slash or not. This:
```javascript
executejs.executeOnce("/myFile");
```
works too.

execute( ) will always execute the file, whereas executeOnce( ) will execute it only if it was not already executed by either executeOnce( ) or execute( ). But any script, even if already executed by executeOnce( ), can always be executed again indefinitely by execute( ). The execution counts only if the script is succesfully executed, thus if the execution of a script fails, executeOnce( ) will try to execute it as many times as you tell it to do so.

executejs expects a folder structure where all code is inside a "js" folder (at the same level as index.html) and its subfolders.
```
index.html
js/
	fileA.js
	fileB.js
	someFolder/
		anotherFile.js
		otherFolder/
			justAnotherFile.js
```

For example, you could call
```javascript
execute("someFolder/otherFolder/justAnotherFile.js");
```
to execute "justAnotherFile.js" script under "js/someFolder/otherFolder/".

executejs uses only full paths (from within the js folder), so you cannot use relative paths like './' and '../'.

FAQ
=========

* Q: How are the scripts loaded?
R: They are loaded with **synchronous** *XMLHttpRequest* and executed with *eval(xmlhttp.responseText)*;

* Q: **eval**? Are you fucking crazy? What about security?
R: executejs is not about protecting corporative data that could harness the world peace if leaked. It is about the most simple way to execute files without using script tags. It could be very usefull for games, for example, but it should not by large corporations where security is essential.

* Q: But... JQuery already has this functionality, it is the *getScript* function, wich takes a string with the script path, executes it in the global context, and can even execute a callback uppon finishing the execution.
R: That's right, JQuery already has this functionality. But if you don't need to use jquery (maybe because you are working only with canvas) it wouldn't be wise to use a 10300 lines of code long library just to get a functionality you could get with less than 50 lines of code.
