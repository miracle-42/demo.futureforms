SET ECHO ON;
whenever sqlerror exit sql.sqlcode;

/* Check open cursors
 * 
	select  sql_text, count(*) as "OPEN CURSORS", user_name 
	from v$open_cursor
	WHERE user_name LIKE 'HR%'
	AND  sql_text NOT LIKE '%#%'
	AND  sql_text NOT LIKE '%$%'
	group by sql_text, user_name order by count(*) desc;
 * 
*/

SELECT USER FROM dual;


CREATE USER HR identified BY hr
DEFAULT TABLESPACE USERS;

GRANT CREATE SESSION, RESOURCE TO HR;
ALTER USER HR QUOTA UNLIMITED ON USERS;

CREATE USER HRPROXY identified BY hrproxy;
GRANT CREATE SESSION, RESOURCE TO HRPROXY;

CREATE USER HRUSER identified BY hruser;
GRANT CREATE SESSION, RESOURCE TO HRUSER;

ALTER USER HR GRANT CONNECT THROUGH HRPROXY;
ALTER USER HRUSER GRANT CONNECT THROUGH HRPROXY;


CREATE TABLE countries 
(
    country_id VARCHAR2(2) NOT NULL PRIMARY KEY,
    country_name VARCHAR2(40)
);

CREATE TABLE departments 
(
    department_id NUMBER NOT NULL PRIMARY KEY,
    department_name VARCHAR2(30) NOT NULL,
    manager_id NUMBER,
    loc_id NUMBER
);

CREATE TABLE employees 
(
    employee_id NUMBER NOT NULL PRIMARY KEY,
    first_name VARCHAR2(40),
    last_name VARCHAR2(40) NOT NULL,
    email VARCHAR2(40) NOT NULL,
    phone_number VARCHAR2(20),
    hire_date DATE NOT NULL,
    job_id VARCHAR2(10) NOT NULL,
    salary NUMBER(8,2),
    manager_id NUMBER,
    department_id NUMBER
);

CREATE SEQUENCE employee_id_seq;

CREATE OR REPLACE TRIGGER EMPPREINS
BEFORE INSERT ON employees
FOR EACH ROW
BEGIN
	:new.employee_id := employee_id_seq.nextval;
END;
/

CREATE TABLE jobs 
(
    job_id VARCHAR2(10) NOT NULL PRIMARY KEY,
    job_title VARCHAR2(35) NOT NULL,
    min_salary NUMBER,
    max_salary NUMBER
);

CREATE TABLE locations 
(
    loc_id NUMBER NOT NULL PRIMARY KEY,
    street_address VARCHAR2(40) NOT NULL,
    postal_code VARCHAR2(12) NOT NULL,
    city VARCHAR2(30) NOT NULL,
    country_id VARCHAR2(2)
);

CREATE OR REPLACE PROCEDURE getsalarylimit
(
    p_job VARCHAR2,
    p_min IN OUT INTEGER,
    p_max IN OUT INTEGER
) 
AS
BEGIN
    SELECT min_salary, max_salary
    INTO p_min, p_max
    FROM hr.jobs
    WHERE job_id = p_job;
END;
/


CREATE INDEX departments_locations ON departments (loc_id);
CREATE INDEX employees_departments ON employees (department_id);
CREATE INDEX locations_fkey_countries ON locations (country_id);

-- SELECT 'GRANT ALL ON '||table_name||' TO HRUSER;' FROM USER_TABLES; 

-- As HR

GRANT ALL ON COUNTRIES TO HRUSER;
GRANT ALL ON DEPARTMENTS TO HRUSER;
GRANT ALL ON EMPLOYEES TO HRUSER;
GRANT ALL ON JOBS TO HRUSER;
GRANT ALL ON LOCATIONS TO HRUSER;

GRANT EXECUTE ON getsalarylimit TO PUBLic;

-- SELECT 'CREATE PUBLIC SYNONYM '||table_name||' FOR HR.'||table_name||';' FROM USER_TABLES; 

-- As PRIV-USER

-- DROP  PUBLIC SYNONYM COUNTRIES;
-- DROP PUBLIC SYNONYM DEPARTMENTS;
-- DROP PUBLIC SYNONYM EMPLOYEES;
-- DROP PUBLIC SYNONYM JOBS;
-- DROP PUBLIC SYNONYM LOCATIONS;


CREATE PUBLIC SYNONYM COUNTRIES FOR HR.COUNTRIES;
CREATE PUBLIC SYNONYM DEPARTMENTS FOR HR.DEPARTMENTS;
CREATE PUBLIC SYNONYM EMPLOYEES FOR HR.EMPLOYEES;
CREATE PUBLIC SYNONYM JOBS FOR HR.JOBS;
CREATE PUBLIC SYNONYM LOCATIONS FOR HR.LOCATIONS;

CREATE PUBLIC SYNONYM GETSALARYLIMIT FOR HR.GETSALARYLIMIT;

/*
 * 
	SET SERVEROUTPUT ON
	DECLARE
	    v_min INTEGER;
	    v_max INTEGER;
	BEGIN
	    v_min := 0;
	    v_max := 0;
	
	    getsalarylimit('MGR', v_min, v_max);
	
	    DBMS_OUTPUT.PUT_LINE('Minimum Salary: ' || v_min);
	    DBMS_OUTPUT.PUT_LINE('Maximum Salary: ' || v_max);
	END;
 *
*/

ALTER PROCEDURE GETSALARYLIMIT COMPILE;

SELECT OBJECT_NAME, STATUS FROM	user_objects;









