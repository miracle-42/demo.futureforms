# Release procedure

When the development has come to a new state where it is time for a new
release, these tasks will be done:

* Branch from development trunk
* Create a 'release branch'
* Bump version number
* Edit ChangeLog
* Fix last minute changes
* Push 'release branch' and test thoroughly 
* Checkout 'main'
* Merge 'dev'
* Push 'main'
* Pack binaries
* On GitHub
  - Release: 'Draft a new release'
  - Add new tag version
  - Add binaries
  - Release
* On local, pull Github
* Branch to 'dev'
* Merge 'release branch'
* Delete 'release branch'
* Push 'dev'

## Release tasks

Run the following commands on your local command line.

Get last minut changes

    git pull

Create a release branch which can be shared with other testers

    git checkout -b release-1.2.4 dev

Bump version with a script and an editor

    ./util/set-version.sh <new-version-number>
    vi ChangeLog.md playbooks/release/release.yml 

Run release playbook

    ansible-playbook playbooks/release/release.yml 

Pack the binaries which 

    git add -f download/*.zip

Publish the release branch to other testers

    git commit -a -m "Bumped version number to 1.2.4"
    git commit

Now the release is finished and can be merged in to
`main` and `dev`.
Tag `main` so it can be checked out agian.

    git checkout main
    git merge --no-ff release-1.2.4

Merge the last minute changes back into `dev`.

    git checkout dev
    git merge --no-ff release-1.2.4

The release is now finished and the branch can be deleted.

    git branch -d release-1.2.4

Make a pull in case the developers has added more code.

    git pull

Publish the release.

    git push

