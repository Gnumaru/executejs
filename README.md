executejs
=========

Execute/run javascript files from within other javascript files from the
browser easily!!!

The purpose of this library is to implement a minimalistic, execution time,
code inclusion functionality in javascript (like it is done in compile time
in C with "include", in Java with "import", in C# with "using" and in
execution time in php with require and require_once), to prevent using
several <script> tags into a html file. This is NOT suposed to be an
asynchronous module loader like requirejs, or a synchronous module dependency
resolver and build tool like browserify, it is intended to do at runtime
exactly what a php interpreter would do when encountering the require and
require_once function calls, or what a C compiler preprocessor would do with
a include statement

There is not yet a greatly accepted standard for javascript code modularity
handling (I'm not talking about code modules definitions and usage, that is
already covered by Comonjs and AMD, but code modularity, the way by which
code is separated into several files and executed as is or preprocessed and
bundled into a single file). Many use several build tools like browserify or
other tools to parse dependencies and preprocess/concatenate files
accordingly. Others use libraries like require.js to load different module
files at runtime, and others separate their code into several script files
and add several <include> tags in the page header.

execute.js intend to address this problem in a very simple and minimalistic
way. It is intended to be a minimalistc tool to execute a given in-domain
script that may contain dependencies for the script which is calling it, or
that contais simple procedures to be executed. Say you have a "Person" class
(javascript constructor function) defined into
"http://(websiteurl)/js/model/Person.js" and you want to use this class into
several other files. Just execute once the file with
execute("model/Person.js"), and the class will be defined in whatever
scope/namespace it was defined in the Person.js file by the application
lifetime. Or say you have a procedure that is schedulled (by whathever means)
to be executed continuously every minute. you could just put a
require("myAwesomeProcedure.js"); inside your scheduler and that's all

execute.js does not address the scopping (handling conflicts due to using
global variables) problem AT ALL because that is something you already would
be addressing by yourself when using several <script> tags
