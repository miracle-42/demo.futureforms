# FutureForms featured demo installation

This Ansible script will install FutureForms with the extended demo.
This demo will show what a lot of the classes in FutureForms can do.

## Requirements

Read the requirements at the [frontpage](../../README.md).

## Clone repository

Then clone this repository.

```
git clone https://github.com/miracle-42/futureforms futureforms
cd futureforms
```

## Configure

In the top of [install-demo.yml](install-demo.yml) the
following changes might be required.

The `install_path` is set to `build` in the cloned directory.
This is where the installation will be located.

## Install

Run the `install-demo.yml` playbook:

```
ansible-playbook playbooks/demo/install-demo.yml 
```

The installation, download and compilation takes about 3 minutes
and will take up about 1.1GB disk space.

## Start openrestdb

`openrestdb` is a Java program which is the actual web server.
Go to the directory and start the webserver:

```
cd build/demo/
bin/openrestdb start
```

Now the web service is running on port 9002
and can be seen at http://127.0.0.1:9002/

Now the frontscreen can be seen.

![Frontscreen](img/ffscreenshot_1.png)

Mouse over the upper right corner to see the
keyboard shortcuts.

![Shortcut](img/ffscreenshot_20.png)

Click `Connection` in the menu bar and then `Connect`.

![Connect](img/ffscreenshot_2.png)

Enter demo user `hr`and demo password `hr` to login to the database.

![Login](img/ffscreenshot_3.png)

Click the *hamburger button* ☰ in upper left corner and then `Countries`

![BurgerMenu](img/ffscreenshot_4.png)

The empty Countries table is now shown.

![Countries](img/ffscreenshot_5.png)

Click `Query` and `Execute` in the top menu or press the key `F8`.

![Execute](img/ffscreenshot_6.png)

Now the table is filled with data from the database.

![CountryNames](img/ffscreenshot_7.png)

**Make changes** to the data.
When changes are made,
one can decide to *undo* (rollback) if it was a mistake,
or *enter* (commit) if it should be stored in the database.

Add a '1' after 'Denmark' and note the 'Transaction' becomes
active in the top menu..

![Denmark1](img/ffscreenshot_10.png)

If you don't do anything for 2 minutes then a dialog
will pop up and warn about it will be rolled back.

![Denmark1RollBack](img/ffscreenshot_11.png)

Now add a '2' to 'Denmark' and click
"Transaction -> Commit (F10)" in the top menu.

![Denmark2Commit](img/ffscreenshot_12.png)

Add en new record by clicking
"Record -> Insert -> Below"
and type 'DE' and 'Germany'.
Click 'Commit' to save it.

![Germany](img/ffscreenshot_13.png)

Open the form 'Locations' by clicking the
*burger* menu and 'Locations.

![Locations](img/ffscreenshot_14.png)

Press F8 (Query, Execute) to load data.

![LocationsData](img/ffscreenshot_15.png)

Change to row from 'Finland' to 'Germany'.
Place the cursor after 'Finland' and open
the Data Picker by clicking the dotted menu on the right.

![LocationsDataPicker](img/ffscreenshot_16.png)

The Data Picker is pre-filled with the current value.
Erase the current value.

![LocationsFinland](img/ffscreenshot_17.png)

When the top field is empty type 'd'
and you will see both 'Germany' and 'Denmark' in the list
as the two-letter-code 'DE' for Germany starts with a 'd'.

![LocationsD](img/ffscreenshot_18.png)

Select 'Germany' by clicking on it.

![LocationsPickDE](img/ffscreenshot_19.png)

Delete 'Germany' from the Countries list by clicking
"Record -> Delete" in the top menu.
Followed by Commit (F10).

![CountriesDelGermany](img/ffscreenshot_21.png)

Update the 'Locations' form by first set focus on it
and then click "Query -> Execute".
Note that 'Germany' is missing.

![LocationsNoGermany](img/ffscreenshot_22.png)

Change 'DE' to 'FI' and press 'Enter'.
Press F10 to save.

![LocationsSelDK](img/ffscreenshot_23.png)

---

## Database less

FutureForms also supports forms without a connection to a database.

### Phone Book

![Phonebook](img/ffscreenshot_8.png)

The *Phone Book* is an example of a hard coded in memory list
with a relational master/detail.

### Field Types

![Fieldtypes](img/ffscreenshot_9.png)

Field input can be limited and validated.

#### Numbers

**Integer**

Only numbers 0 to 9 can be entered.
First digit can only be 0 if the whole number is 0.

**Decimal**

Enter integer og decimal numbers.
Only one dot '.' can be entered.
Comma or other decimals delimiters are not allowed.
Only two decimals.

#### Text Case

**Upper**

Text entered will be converted to upper case.

**Lower**

Text entered will be converted to lower case.

**Initcap**

First letter in each word entered will be converted to upper case
and the rest to lower case.

#### Date

**Date**

Date can only be entered in the format 'DD-MM-YYYY'.

**DateTime**

Date and time can only be entered in the format 'DD-MM-YYYY hh:MM:SS'.

#### Radio and CheckBox

Radio and checkboxes can be selected by typing the value 
or clicking the circle or box.

#### Formatted input

Select a drop-down
and limit/validate 'move' with regular expression.

#### Data Mapper

Enter 'y' or 'n' and map to another field.

#### Drop Down Lists

Select one item from a list and get long name in another field.

Select multiple items from a list with Shift and Control key.

#### Any html

Any text entered displayed in another field.
