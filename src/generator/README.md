# forms42.generator

	Custom tags:

	<column-type>  : Each database-column is replaced by the appropiate <column-type>
	<column-types> : Container for <column-type> elements

	<column>  : Tag to be replaced by each database-column's html mapping
	<group>   : Tag to be replaced by each column in each group in the mapping
	<replace> : Tag will be replaced by the value of the attribute tag. The main usage of
		         replace is to obtain valid template html, which is mandatory for parsing.

	Custom attributes:

	foreach-group: the tag enclosed by this attribute will be repeated for each group
	foreach-column: the tag enclosed by this attribute will be repeated for each column

	Variables:

	Variables can be used anywhere in the html. But special rules apply when used as attributes.

	$id$ : Pseudo variable that generates a unique id for a given column.

	$var$ : Will be replaced by the value defined by either the column or the table.
			  As attribute $var$ will be replaced by var="$var$" if it exists.
			  The form ${var}$ will create an attribute named by the content of var if var exists.
