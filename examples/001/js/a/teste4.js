'use strict';
//try to execute an unexisting script on purpuse
//executejs.execute("sz08c7tgn0b8e7dgyw0");

//purposefully try to execute scripts that have not yet already finished execution:
executejs.execute("../teste2");
executejs.execute("../teste3");
executejs.execute("./teste4");
alert("teste4");

//write a syntax error on purpose
//var a = +;

//use commonjs style module exports
exports.test = "I have been retrieved from teste4.js!!!";

alert(require("./teste5").message);
//execute again previously execute files for testing function caching
executejs.execute("./teste5");
executejs.execute("./teste5");
executejs.execute("./teste5");
