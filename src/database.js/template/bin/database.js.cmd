rem @echo off
set lib="%~dp0..\lib"
java -jar %lib%\database.js-2.1.jar %*
