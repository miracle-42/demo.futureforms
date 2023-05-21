# Development & release

This project has Git as primary project tool.
As Git is not a Version Control System (VCS) but a collaborative tool,
we have to manage the release manually.
Here is how it is done.

Inspired by
[A successful Git branching model](https://nvie.com/posts/a-successful-git-branching-model/)
by *Vincent Driessen*
we use a number of branches.
`git flow` is used to managed this way of doing it.
See also the [git flow cheat sheet](https://danielkummer.github.io/git-flow-cheatsheet/) .

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
* __feature-*bling*__
  This is an example of a short lived branch.
  It is a branch of __dev__.
  When it is roughly tested it will be merged back to __dev__.
  After merge it will be deleted.
* __v0.7.0__
  This is an example of the stable release of version `v0.7.0`.
  This branch will never be changed.
  Later on if this release is still maintained and a bug is dicovered,
  there will be made a hotfix like `hotfix-ssl`
  and a new release `v0.7.1` will be released.
  To upgrade from `v0.7.0` to `v0.7.1` you have to merge
  `v0.7.1` into your current `v0.7.0` release.
* __release-*v0.7.0*__
  This is an example of a short lived branch.
  This is also called the *Release Candidate* (RC).
  When the advisory board decide it is time for a new release
  this branch will be created.
  The branch name will also be decided.
  If the last release was `0.6.0` the next could be `v0.7.0`
  or it could be `1.0.0`.
  When the release is done this branch will be deleted.
* __hotfix-*ssl*__
  This is an example of a short lived branch.
  A bug is discovered in say release `v0.7.0` and a new branch is made to fix this.
  When the fix is ready it will be merged with `v0.7.0`
  and a new version `v0.7.1` will be released.
  If relevant this hotfix will be merged into `dev`.
  After merge and release this branch will be deleted.


## Teams of developers

You are not supposed to work alone.
You work in teams.

To make a new feature you will setup a temporary team for this.
In the beginning it might only be you alone but others could join in later.
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

For the *stable* you will use the say __v0.7.0__ tag.

    git clone https://miracle-42/futureforms
    cd futureforms
    git checkout v0.7.0

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

    git clone git@github.com:<joe>/futureforms.git
    cd futureforms
    git flow feature start my2cents
    echo My 2 cents. >> README.md
    git add README.md
    git commit -m 'My cents'
    git flow feature finish my2cents
    git push orgin dev

Now surf to your own fork
https://github.com/joe/futureforms/
and make a pull request against the origin repository.

After a *quick* review it will be merged into `dev`
and the branch `feature-my2cents` will be deleted.

If the pull request is rejected it will get a comment about what to be fixed.
Either you or an other collaborator will fix it
and a new pull request will be made.

## Hotfix

If a bug is dicovered in a previous release
a new hotfix has to be made for this.

A hotfix can be relevant for:
* Only latest release
* Only one release
* All releases

Steps for a hotfix:

* Create a new branch with this hotfix say `hotfix-v0.7.1' and checkout
* Edit the files to be fixed
* Add files, commit and push so another team members can verify the patch
* When the hotfix is tested it will be released with a tag say `v0.7.1`.
* Optional: If this hotfix applies to other releases, `main` and `dev`
  it should be merged in to these branches
* When all branches are updated the hotfix is deleted

To start a hotfix from the latest release.

    git flow hotfix start v0.7.1

If the hotfix applies to an old version it must be specified.

    git flow hotfix start v0.7.1 v0.7.0

Change files and add them.

    git add <files>
    git commit

If the team should review the hotfix it has to be published.

    git flow hotfix publish

    # wait for review and testing
    git flow hotfix finish

## Release

When the advisory board decide it is time for a new release
a new release will be made.

The `main` branch is always equal to the latest release.

To run with the latest stable release it can be done in two ways.

The simple way is to use the `main` branch.
Whenever you make a `git pull` you will get the latest release.

If you you want to lock a specific release then check that out.
The release will never be updated.

If the latest release is `v0.7.1`
the new release will either be `v0.8.0` or `v1.0.0` at your choice.
By default the base is `dev` which it should be.

First you will create a new branch based on `dev`.

    git flow release start v0.8.0

Fix some stuff before release and test all modules.
When the release is finished it should be 
commited, merged back to `main` and tagged.

    git flow release finish v0.8.0

Tags are not pushed then do this manually.

    git push origin --tags

<!--
vim: expandtab tabstop=4 shiftwidth=4 :
-->
