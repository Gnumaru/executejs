executejs
=========

Execute javascript files from within other javascript files from the browser
easily!!!


The purpose of this library is to implement a minimalistic
"include/import/using/require" functionality in javascript, to prevent using
several script tags into a html file. This is NOT suposed to be an
asynchronous module loader like requirejs, or a synchronous module dependency
resolver and build tool like browserify, it is intended to do at runtime
exactly what a php interpreter would do when encountering the require and
require_once function calls, or what a C compiler preprocessor would do with
a include statement

There is not yet a greatly accepted standard for javascript code modularity
handling (I'm not talking about code modules definitions and usage, that is
covered by Comonjs and AMD, but code modularity, the way by which code is
separated into several files and run, be it preprocessed and bundled into a
single file or not). Some people use several build tools like browserify or
other tools to parse dependencies and preproces/concatenate files
accordingly. Others use libraries like require.js to load different module
files at runtime, and others separate their code into several script files
and add several <include> tags in the page header.

execute.js is intended to be a minimalistc tool to execute a given in-domain
script that contains dependencies for the script which is calling it, or that
contais procedures to be executed. Say you have a "Person" class (javascript
constructor function) defined into "http://(websiteurl)/js/model/Person.js"
and you want to use this class into several other files. Just execute once
the file, execute("model/Person.js"), and the class will be defined by the
application lifetime. Or say you have a procedure that is schedulled (by
whathever means) to be executed continuously every minute. you could just put
a require("myAwesomeProcedure.js"); inside your scheduler and that's all

execute.js does not address the scopping (handling conflicts because of using
global variables) problem AT ALL because that is something you already would
be addressing by yourself when using several <script> tags
