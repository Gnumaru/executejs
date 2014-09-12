EXECUTEJS
=========

**Execute arbitrary javascript files** or **write and load CommonJS modules** from the browser, without building everything into a single js file.

The main purpose of this library is to implement a simple, straightfoward, execution time, code inclusion/execution functionality in javascript (like it is done in compile time in C with "include", in Java with "import", in C# with "using" and in execution time in php with require and require_once), to prevent using several script tags into a html file. This is NOT suposed to be an asynchronous module loader like requirejs, or a synchronous module dependency resolver and build tool like browserify, it is intended to do at runtime exactly what a php interpreter would do when encountering the require and require_once function calls, or what a C compiler preprocessor would do with a include statement. Additionally, it support loading commonjs style modules on the browser without a build step, without bundling every js file into only one.

There is not yet a greatly accepted standard for javascript code modularity handling (I'm not talking about code modules definitions and usage, that is already covered by Comonjs and AMD, but code modularity, the way by which code is separated into several files and executed as is or preprocessed and bundled into a single file). Many use several build tools like browserify or other tools to parse dependencies and preprocess/concatenate files accordingly. Others use libraries like require.js to load different module files at runtime, and others separate their code into several script files and add several include tags in the page header.

execute.js intend to address this problem in a very simple and minimalistic way. It is intended to be a minimalistc tool to execute a given in-domain script that may contain dependencies for the script which is calling it, or that contais simple procedures to be executed. Say you have a "Person" class (javascript constructor function) defined into "http://(websiteurl)/js/model/Person.js" and you want to use this class into several other files. Just execute once the file with executejs.executeOnce("model/Person.js"), and the class will be defined in whatever scope/namespace it was defined in the Person.js file by the application lifetime. Even if you `executeOnce()` the same file several times, the constructor function inside Person.js will not be overwritten because executejs has already executed it and executeOnce will prevent the file to be executed again. Or say you have a procedure that is schedulled (by whathever means) to be executed continuously every minute. you could just put a require("myAwesomeProcedure.js"); inside your scheduler and that's all.

If not yet defined, executejs will also define a `require()` function for loading CommonJS style modules, with some limitations.

**execute.js does not address the scopping problem (handling conflicts due to using global variables) AT ALL** because that is something you already would be addressing by yourself when using several script tags or concatenating script files with GNU's cat command or other simple file concatenation tools.

Normal Usage
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

`execute()` will always execute the file, whereas `executeOnce()` will execute it only if it was not already executed by either `executeOnce()` or `execute()`. But any script, even if already executed by `executeOnce()`, can always be executed again indefinitely by `execute()`. The execution counts only if the script is succesfully executed, thus if the execution of a script fails, `executeOnce()` will try to execute it as many times as you tell it to do so.

CommonJS Style Modules
=========

If your scripts define modules in the commonjs style, executejs can load them, with some limitations. You can just define a module:
```javascript
//file a.js
exports.awesomeFunction = new function(){
	alert("This function is awesome!!!");
};
```
and require it into another js file:
```javascript
//file b.js
var func = require("a.js").awesomeFunction;
//this also works
func = require("a").awesomeFunction;
func();
```

executejs can not yet handle ciclic dependencies, it will just return undefined if you try to require or execute a file whose evaluation by an previous require has not yet completed.

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

Known Issues
=========
* Using `eval("//some code inside a string")` or `new Function("//some code inside a string")` instead of adding programatically new script tags to the html prevents debugging. That is not a problem at all in production environment, since the end user should not be debugging the application aniway, but it certainly is awfull for development. executejs is inspired in RequireJS in the sense that RequireJS doesn't impose a way of use. RequireJS apps can be bundled into one big js file, or can be distributed as separate files. This is the opposite of Browserify, wich imposes the build step and does'nt provide a runtime for module loading in the browser.
* Using separate files certainly impose performance penalties due to several http requests and probably preventing optmizations from the js engines. Of course bundling the entire code base into one js file is faster, as it its loaded with one single http request and "probably" be better optimized by the js engines. The question is not "It is slower?", but "How much slower?" or even better "It is perceptibly slower?". Since executejs supports module loading using commonjs style, you can try your application with executejs calling a main file, and afterwards bundle the application using browserify and compare the performance **as perceived by the user**. Without making any kind of benchmark, I would be inclined to say that bunbling everything is certainly better performancewise, but I would also be inclined to say that it would make no noticeable difference. That exists many kinds of software with many different goals, which could be more or less impacted by the penalties imposed for not bundling everything into one single js file. Since it is possible to easily test both, do it, and see what is better for your application.
* Browser-side javascript does not have any straightfoward functionality capable of telling one script in wich path it resides apart from retrieving the element's script tag from the html and merging the script src with the html location (and resolving any relative paths provided in the script "src" atribute). executejs script loading NEEDs such functionality for loading the scripts, and tries to do it in many ways. As long as one entry point is provided, ad it calls other scripts leading to a call stack, executejs uses the stack of paths to known where one script is relative to the other. However, when the execution stacks finish (and it will surely finish sometime, unles your code have a main, endless loop, like in games), it becomes very hard to know where one script is relatively to the other. executejs tries first to look for already loaded scripts and find a unique match with the script path. But in case the script was not loaded earlier, it is not possible to determine the script path, and a full path must be provided. If you only provide full paths in your require calls, executejs will always find the scripts you require. But this breaks compatibility will the commonjs full path expectations which are of paths starting from the root file system (as in "/home/user/www/mysite/js/main.js", for commonjs modules where planned for server-side module handling). The "full paths" executejs expects should be starting from the root folder of the site (as in "/mysite/js/main.js") or from one of it's subfoldes if executejs is provided with a root attribute. The whole point of this is that, if you want to use browserify to bundle your app, it will not parse the "full paths", as they are not "full paths" in the commonjs module meaning of the "full path" expression. One workaround, that allows your app to run exactly as expected, deploying multiple separated files and letting executejs do the loadings AND ALSO alows you to browserify your app is by providing what I call "parent-chain paths" in your require calls. Instead of using something like `require("/mysite/js/modules/mymodule_A")` (which surely will break browserify), and instead of calling `require("./mymodule_A")` from another module "mysite/js/modules/mymodule_B" (which can make executejs unable to find it's location), in this case, from inside "mymodule_B", you should call `require("../../../mysite/js/modules/mymodule_A")` which is guaranteed to work with both executejs and browserify =).

FAQ
=========

* **Q: How are the scripts loaded?**

A: Since javascript doesn't have such functionality built into the language (yet), there are currently **ONLY TWO** (cross browser, plugin independent) ways of loading one script file from another without adding several script tags "by hand". You can eval another file, or you can add programmatically another script tag in your html after the script tag belonging to the script being executed. executejs load the scripts with **purposefully synchronous** *XMLHttpRequest*, cache them into Functions using "new Function(xmlhttp.responseText)" and executes them;

* **Q: "new Function()" with a string? that's eval disguised! Are you fucking crazy? What about security?**

A: executejs is not about protecting corporative data that could harness the world peace if leaked. It is about the most simple way to execute files without using script tags. It could be usefull for games, for example, but it should not by large corporations where security is essential.

* **Q: But... JQuery already has this functionality, it is the *getScript* function, wich takes a string with the script path, executes it in the global context, and can even execute a callback uppon finishing the execution.**

A: That's right, JQuery already has this functionality. But if you don't need/want to use jquery (maybe because you are working only with canvas) it wouldn't be necessary to use a 10300 lines of code long library just to get a functionality you could get with a few lines.

* **Q: Can I load cross domain scripts?**

A: No. The browsers' same domain policies prevent cross domain scripts from being loaded by XMLHttpRequest, and that is great because it is secure =). It makes it hard to inject code into your own code that will redirect to code hosted in another domain. But you can load cross domain scripts inside the code adding programmatically another script tag with the src attribute referencing the desired cross domain script, something like this:
```javascript
var script = document.createElement('script');
script.src = "http://my.cross.domain/script.js";
script.onload = function () {
    //use script
};
```
* **Q: But why not include several script tags instead of using eval or "new Function()" over an XMLHttpRequest.responseText? Evalling an XMLHttpRequest.responseText prevents debugging AT ALL**

A: Indeed, evalling a string prevents debugging **AT ALL** (although firefox shows the error lines **inside** the evalled files if you do not use try-catches while evalling the string). But without eval, it is impossible to call code **within** code, just call code **between** code. Using eval, you can execute an entire javascript file within another javascript file, between two lines of your code for example. But adding script headers on the fly make the browser load the script **just after** it finishes executing the current script. For example, given folowing code:
```javascript
doSomething();
executejs.execute("myfile.js");
doSomeOtherThing();
```
the content of `"myfile.js"` will be executed entirely exactly after `doSomething()` and exactly before `doSomeOtherThing()`. Instead, if we had the folowing:
```javascript
doSomething();
addAScriptTagToHtmlHeader("myfile.js");
doSomeOtherThing();
```
the `addAScriptTagToHtmlHeader()` would add another script tag, but this another script tag would be executed **only after completing the execution of the entire file where `addAScriptTagToTheHtmlHeader()` is called**, wich is after `doSomeOtherThing()` and after every other statement in the file. Normaly, when you use includes/imports/usings/requires, you expect the required code to be available/executed right after the completion of the include/import/using/require call.

* **Q: Why you named it executejs?**

A: Because it reflects well the targeted functionality, to execute scripts. I wanted to use the name requirejs because thats the php's require and require_once methods what I wanted to mimic. But requirejs was already taken by a much bigger and well known project =(. I considered something like includejs, importjs and usingjs, but includejs was already taken, as so was importjs and usingjs. In fact, even executejs was already taken =O right here on github. But as the project's goal was something pretty different from my executejs, I thougth it would not be a big name conflict problem.
