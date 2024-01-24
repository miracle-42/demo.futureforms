export class MSGGRP
{
	public static TRX:number = 5020; 			// Transactions
	public static SQL:number = 5030; 			// Propagate messages from database
	public static ORDB:number = 5010;			// Propagate messages from OpenRestDB
	public static FORM:number = 5040;			// Form messages
	public static BLOCK:number = 5050;			// Block messages
	public static FIELD:number = 5060;			// Field messages
	public static FRAMEWORK:number = 5000; 	// Internal framework messages
	public static VALIDATION:number = 5070;	// Validation
}