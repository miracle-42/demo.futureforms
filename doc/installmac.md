# Installation on Mac OS

### First follow the installation instructions in the install section of the following link:

[FutureForms Installation](../README.md#install-futureforms-featured-demo-and-tutorial-installation)

But instead of using the Ubuntu apt package manager to install ansible, use [Homebrew](https://brew.sh/)

After Homebrew is installed, you can install Ansible like this:
```
brew install ansible
```
Then you need to clone FutureForms from Github to your Mac:
```
git clone https://github.com/miracle-42/futureforms futureforms
```
Then go to your new futureforms directory:
```
cd futureforms
```
### Install the Postgres database on your Mac:
You have a couple of options regarding the way you install the Postgres database:
You can either install it as Option 1 describes, or you can run the database in a Docker container as Option 2 describes.
Option 1: Follow the instuctions on the following link:
https://www.enterprisedb.com/postgres-tutorials/installation-postgresql-mac-os

Option 2: Install the Docker Desktop app on your Mac by follwing the instructions on the following link:
[Install Docker Desktop](https://docs.docker.com/desktop/install/mac-install/)
Then go to the container directory:
```
cd container
```
And build the Postgres database image, that you will use for your FutureForms development:
```
docker build -t futureforms:latest .
```
Then run your Postgres database container with the following command:
```
docker run -d --name futureforms -p 5432:5432 -e POSTGRES_PASSWORD=postgres --rm futureforms:latest
```

### Install Maven
Next you need to install Maven on your Mac, if you don't already have it installed. Check that the Maven installation is using the same Java version that your are using on your Mac. If you don't already have Java installed, just let the Maven installation install it for you:

```
brew install maven
```
### Run the Ansible Playbook
This Ansible script will install FutureForms with the extended demo.
This demo will show what a lot of the classes in FutureForms can do.

Next run the Ansible Playbook in the FutureForms project, note that --ask-become-pass ensures that you will be prompted for you sudo password:
```
ansible-playbook playbooks/demo/install-demo.yml --ask-become-pass
```
If you want to run your postgres test database in a docker container, you will have to skip the create database user and create database part, to have the test data populated on the docker database.
If you don't do this, you will get an error, because the ansible script will try to become the postgres user on you developer laptop, which does not exist, since you have decided to run the postgres database in a docker container. Use the following command to run the playbook instead:
ansible-playbook playbooks/demo/install-demo.yml --ask-become-pass -v --skip-tags create-hr-user,create-hr-db
```
ansible-playbook playbooks/demo/install-demo.yml --ask-become-pass --skip-tags create-hr-user,create-hr-db
``````

The installation, download and compilation takes about 3 minutes
and will take up about 1.1GB disk space.

### Start OpenRESTDB
`openrestdb` is a Java program which is the actual web server.
Go to the directory and start the webserver:
```
cd build/demo
bin/openrestdb start
```
Check that openrestdb is runing correctly:
```
bin/openrestdb status
```
Now the web service is running on port 9002
and can be seen at http://127.0.0.1:9002/


### Live server setup for Visual Code IDEA
`Live server`detects changes in your project files and restarts the web server, so you can see the result of the changes imediately.

Live server has a problem with symbolic links in the code, which results in inifinite loop in the detection of changes. This can be addressed with following work around:

In Visual Code, delete the dist directory, which is a symbolic link, and build the code again. This will create a new dist directory whit the needed code, which is no a symbolic link.
```
npm run build
```

Now the web service is running on port 5500
and can be seen at http://127.0.0.1:5500/


## If you experience problems with you Maven installation
In my case I ran into the above mentioned problem where I already was running Java 11 on my Mac, and the Homebrew Maven was bundled with Java 21 and used Java 21 automatically. This can be fixed the following way:

First update the Path in you bash profile:
```
export PATH=/opt/homebrew/Cellar/openjdk/21/bin:$PATH
```
Then source your profile and check that you are using the Java that Maven installed for you:
```
echo $PATH
which java
```
Then build your Openrest DB Java code again with maven:
```
cd src/openrestdb
mvn package
[INFO] Scanning for projects...
[INFO]
[INFO] -----------------------< openrestdb:openrestdb >------------------------
[INFO] Building openrestdb 2.1
[INFO]   from pom.xml
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] --- resources:3.3.1:resources (default-resources) @ openrestdb ---
[INFO] Copying 3 resources from  to target/classes
[INFO] skip non existing resourceDirectory /Users/jaler/futureforms/src/openrestdb/src/main/resources
[INFO]
[INFO] --- compiler:3.8.1:compile (default-compile) @ openrestdb ---
[INFO] Changes detected - recompiling the module!
[INFO] Compiling 101 source files to /Users/jaler/futureforms/src/openrestdb/target/classes
[INFO]
[INFO] --- resources:3.3.1:testResources (default-testResources) @ openrestdb ---
[INFO] skip non existing resourceDirectory /Users/jaler/futureforms/src/openrestdb/src/test/resources
[INFO]
[INFO] --- compiler:3.8.1:testCompile (default-testCompile) @ openrestdb ---
[INFO] No sources to compile
[INFO]
[INFO] --- surefire:3.1.2:test (default-test) @ openrestdb ---
[INFO] No tests to run.
[INFO]
[INFO] --- jar:3.2.0:jar (default-jar) @ openrestdb ---
[INFO] Building jar: /Users/jaler/futureforms/src/openrestdb/target/openrestdb-2.1.jar
[INFO] ------------------------------------------------------------------------
[INFO] BUILD SUCCESS
[INFO] ------------------------------------------------------------------------
[INFO] Total time:  7.898 s
[INFO] Finished at: 2023-10-02T12:51:14+02:00
[INFO] ------------------------------------------------------------------------
```
Check that you now have a new oprestdb jar file and copy it the library directory:
```
ls -l target
total 640
drwxrwxr-x@ 8 jaler  staff     256 Sep 22 11:09 classes
drwxrwxr-x@ 3 jaler  staff      96 Sep 22 11:09 generated-sources
drwxrwxr-x@ 3 jaler  staff      96 Sep 22 11:09 maven-status
-rw-rw-r--@ 1 jaler  staff  270841 Oct  2 12:51 openrestdb-2.1.jar
```
```
cp -p target/openrestdb-2.1.jar ../../build/demo/lib
```
Now you are ready to start the new Mac compiled version of openrestdb:
```
cd -
~/futureforms/build/demo
bin/openrestdb start
```
Check that openrestdb is runing correctly:
```
bin/openrestdb status
```
