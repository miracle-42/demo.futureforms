# Development & release

This project has Git as primary project tool.
As Git is not a Version Control System (VCS) but a collaborative tool,
we have to manage the release manually.
Here is how it is done.

Inspired by
[A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)
by *Vincent Driessen*
we use a number of branches.

## Branches

Examples of branches.

* __main__
  The latest release.
  This version is equal to the latest release and it is the stable version.
  Use this branch for production and you can make an update with `git pull`.
  `main` is also known as `master`.
* __dev__
  The development branch.
  Commits to this branch is made by first making a `feature-bling` branch
  and then merge it when it is considered ready.
  Use branch if you want to develop against latest and newest libraries and backends.
* __0.7.0__
  This is an example of the stable release of version `0.7.0`.
  This branch will never be changed.
  Later on if this release is still maintained and a bug is dicovered,
  there will be made a hotfix like `hotfix-ssl`
  and a new release `0.7.1` will be released.
  To upgrade from `0.7.0` to `0.7.1` you have to merge
  `0.7.1` into your current `0.7.0` release.
* __release-*0.7.0*__
  This is an example of a short lived branch.
  This is also called the *Release Candidate* (RC).
  When the advisory board decide it is time for a new release
  this branch will be created.
  The branch name will also be decided.
  If the last release was `0.6.0` the next could be `0.7.0`
  or it could be `1.0.0`.
  When the release is done this branch will be deleted.
* __hotfix-*ssl*__
  This is an example of a short lived branch.
  A bug is discovered in say release `0.7.0` and a new branch is made to fix this.
  When the fix is ready it will be merged with `0.7.0`
  and a new version `0.7.1` will be released.
  If relevant this hotfix will be merged into `dev`.
  After merge and release this branch will be deleted.
* __feature-*bling*__
  This is an example of a short lived branch.
  It is a branch of __dev__.
  When it is roughly tested it will be merged back to __dev__.
  After merge it will be deleted.


## Teams of developers

You are not supposed to work alone.
You work in teams.

To make a new feature you will setup a team for this.
In the beginning it might only be you but others could join in later.
First you create a branch with `git checkout -b feature-bling dev`.
Add some code and push it back.
Then ask a collaborator to join in and to review
or help with something you are not an expert in.

When `feature-bling` is done and tested against latest `dev`,
it will be merged into `dev` and the branch `feature-bling`
will be deleted.

## Private project

To make a private project which is not part of this project,
you have to make a new repository for this.
You then have to decide if you will develop with the
*bleeding edge* or you will go with the latest stable release.

For the *bleeing edge* you will use the __dev__ branch.

    git clone https://miracle-42/futureforms
    cd futureforms
    git checkout dev

For the *stable* you will use the say __0.7.0__ branch.

    git clone https://miracle-42/futureforms
    cd futureforms
    git checkout 0.7.0

Then you make your own project and symlink to futureforms.

    mkdir ~/myproject
    cp -a ~/futureforms/src/template/* ~/myproject
    cd ~/myproject
    ln -s ~/futureforms/build/core/dist core

## Collaborate

To collaborate you should clone the project and
make *pull request*.
First you go to github and login with your own account (joe).
Then you surf to 
https://github.com/miracle-42/futureforms/
and make a fork.
Clone your own fork to your harddisk.

    git clone git@github.com:joe/futureforms.git
    cd futureforms
    git checkout -b feature-my2cents dev
    echo My 2 cents. >> README.md
    git add README.md
    git commit -m 'My cents'
    git push

Now surf to your own fork
https://github.com/joe/futureforms/
and make a pull request.

After a *quick* review it will be merged into `dev`
and the branch `feature-my2cents` will be deleted.

If the pull request is rejected it will get a comment about what to be fixed.
Either you or an other collaborator will fix it
and a new pull request will be made.

