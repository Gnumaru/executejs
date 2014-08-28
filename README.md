EXECUTEJS
=========

Execute/run javascript files from within other javascript files from the browser easily!!!

The purpose of this library is to implement a minimalistic, execution time, code inclusion functionality in javascript (like it is done in compile time in C with "include", in Java with "import", in C# with "using" and in execution time in php with require and require_once), to prevent using several script tags into a html file. This is NOT suposed to be an asynchronous module loader like requirejs, or a synchronous module dependency resolver and build tool like browserify, it is intended to do at runtime exactly what a php interpreter would do when encountering the require and require_once function calls, or what a C compiler preprocessor would do with a include statement

There is not yet a greatly accepted standard for javascript code modularity handling (I'm not talking about code modules definitions and usage, that is already covered by Comonjs and AMD, but code modularity, the way by which code is separated into several files and executed as is or preprocessed and bundled into a single file). Many use several build tools like browserify or other tools to parse dependencies and preprocess/concatenate files accordingly. Others use libraries like require.js to load different module files at runtime, and others separate their code into several script files and add several include tags in the page header.

execute.js intend to address this problem in a very simple and minimalistic way. It is intended to be a minimalistc tool to execute a given in-domain script that may contain dependencies for the script which is calling it, or that contais simple procedures to be executed. Say you have a "Person" class (javascript constructor function) defined into "http://(websiteurl)/js/model/Person.js" and you want to use this class into several other files. Just execute once the file with executejs.executeOnce("model/Person.js"), and the class will be defined in whatever scope/namespace it was defined in the Person.js file by the application lifetime. Even if you executeOnce( ) the same file several times, the constructor function inside Person.js will not be overwritten because executejs has already executed it and executeOnce will prevent the file to be executed again. Or say you have a procedure that is schedulled (by whathever means) to be executed continuously every minute. you could just put a require("myAwesomeProcedure.js"); inside your scheduler and that's all

**execute.js does not address the scopping problem (handling conflicts due to using global variables) AT ALL** because that is something you already would be addressing by yourself when using several script tags or concatenating script files with GNU's cat command or other simple file concatenation tools.

Usage
=========
From within your index.html file, include just one script tag for executejs and any other for other scripts you will be loading.
```html
<head>
  <script root="js/" src="js/execute.js"></script>
  <script src="main.js"></script>
</head>
```
executejs creates then the global namespace object "executejs" with the functions "execute" and "executeOnce", wich will be used to load and execute the scripts synchronously. Provide the script tag for executejs before any script tag for scripts that rely on executejs.

If your browser for some reason load the script tags simultaneously instead of in a sequence, you can provide only the tag for executejs with a "main" attribute that tells execute js wich is the firs script to be loaded:
```html
<head>
  <script root="js/" main="main.js" src="js/execute.js"></script>
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

Folder Structure
=========

executejs expects a folder structure where all code is inside a root folder, specified in the executejs script tag, at the same level as index.html, and its subfolders. For example, if you specify
```html
<head>
  <script root="js/" main="main.js" src="js/execute.js"></script>
</head>
```
Your folder structure must be
```
index.html
js/
	main.js
	fileB.js
	someFolder/
		anotherFile.js
		otherFolder/
			justAnotherFile.js
```
Or if you don't provide a root attribute
```html
<head>
  <script main="main.js" src="js/execute.js"></script>
</head>
```
or provide it empty
```html
<head>
  <script root="" main="main.js" src="js/execute.js"></script>
</head>
```
The root folder will be the one where index.html is
```
index.html
main.js
fileB.js
someFolder/
	anotherFile.js
	otherFolder/
		justAnotherFile.js
```

In this scenario, you could call
```javascript
execute("someFolder/otherFolder/justAnotherFile.js");
```
to execute "justAnotherFile.js" script under "someFolder/otherFolder/".

The root attribute can be specified with or without leading or trailling slashes, like "src", "/src", "src/" or "/src/".

executejs uses only full paths (relative to the root folder), so you cannot use relative paths like './' and '../'.

FAQ
=========

* **Q: How are the scripts loaded?**

A: They are loaded with **synchronous** *XMLHttpRequest* and executed with *eval(xmlhttp.responseText)*;

* **Q: eval? Are you fucking crazy? What about security?**

A: executejs is not about protecting corporative data that could harness the world peace if leaked. It is about the most simple way to execute files without using script tags. It could be very usefull for games, for example, but it should not by large corporations where security is essential.

* **Q: But... JQuery already has this functionality, it is the *getScript* function, wich takes a string with the script path, executes it in the global context, and can even execute a callback uppon finishing the execution.**

A: That's right, JQuery already has this functionality. But if you don't need to use jquery (maybe because you are working only with canvas) it wouldn't be wise to use a 10300 lines of code long library just to get a functionality you could get with less than 50 lines of code.

* **Q: Can I load cross domain scripts?**

A: No. the browsers' same domain policies prevent cross domain scripts to be loaded by xmlhttprequest, and that is great because it is secure =). But you can load cross domain scripts inside the code adding programmatically another script tag with the src attribute referencing the desired cross domain script, something like this:
```javascript
var script = document.createElement('script');
script.src = "http://my.cross.domain/script.js";
script.onload = function () {
    //use script
};
```
* **Q: But why not include several script tags instead of using eval over an XMLHttpRequest.responseText? Evalling an XMLHttpRequest.responseText prevents debugging AT ALL**

A: Indeed, evalling a string prevents debugging **AT ALL**. But without eval, it is impossible to call code **within** code, just call code **between** code. Using eval, you can execute an entire javascript file within another javascript file. But adding script headers on the fly make the browser load the script **just after** it finishes executing the current script. For example, given folowing code:
```javascript
doSomething( );
executejs.execute("myfile.js");
doSomeOtherThing( );
```
the content of `"myfile.js"` will be executed exactly after doSomething( ) and exactly before doSomeOtherThing( ). Instead, if we had the folowing:
```javascript
doSomething( );
addAScriptTagToTheHtmlHeader("myfile.js");
doSomeOtherThing( );
```
the `addAScriptTagToTheHtmlHeader()` would add another script tag, but this another script tag would be executed only after completing the execution of the entire file where `addAScriptTagToTheHtmlHeader()` is called, wich is after `doSomeOtherThing()` and after every other statement in the file. Normaly, when you use includes/imports/usings/requires, you expect the required code to be available/executed right after the completion of the include/import/using/require call.

* **Q: Why you named it executejs?**

A: Because it reflects well the targeted functionality, to execute scripts. I wanted to use the name requirejs because thats the php's require and require_once methods what I wanted to mimic. But requirejs was already taken by a much bigger and well known project =(. I considered something like includejs, importjs and usingjs, but includejs was already taken, as so was importjs and usingjs. In fact, even executejs was already taken =O right here on github. But as the project's goal was something pretty different from my executejs, I thougth it would no be a big conflict name problem.
