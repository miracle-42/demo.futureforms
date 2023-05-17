rem @echo off

set home="C:\DatabaseJS"
set java_home="C:\Program Files\Java\jdk-17.0.1"
%java_home%\bin\java -cp %home%\lib\openrestapi-2.1.jar openrestapi.control.Service
