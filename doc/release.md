# Release procedure

When the development has come to a new state where
it is time for a release, this will be done.

* Branch from development
* Fix last minute changes
* Test thoroughly 
* Pack binaries


    git pull
    git checkout -b release-1.2.4 dev
    git rm download/*.zip
    # Bump version with an editor
    vi ChangeLog.md playbooks/release/release.yml 
    ansible-playbook playbooks/release/release.yml 
    git add -f download/*.zip
    git commit -a -m "Bumped version number to 1.2.4"
    git commit

Now the release is finished and can be merged in to
`main` and `dev`.
Tag `main` so it can be checked out agian.

    git checkout main
    git merge --no-ff release-1.2.4
    git tag -a 1.2.4

Merge the last minute changes back into `dev`.

    git checkout dev
    git merge --no-ff release-1.2.4

The release is now finished and the branch can be deleted.

    git branch -d release-1.2.4

Make a pull in case the developers has added more code.

    git pull

Publish the release.

    git push


