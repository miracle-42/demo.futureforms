--
-- PostgreSQL database dump
--

-- Dumped from database version 15.2 (Debian 15.2-1.pgdg110+1)
-- Dumped by pg_dump version 15.2 (Debian 15.2-1.pgdg110+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: getsalarylimit(character varying, integer, integer); Type: PROCEDURE; Schema: public; Owner: hr
--

CREATE PROCEDURE public.getsalarylimit(IN job character varying, INOUT min integer, INOUT max integer)
    LANGUAGE plpgsql
    AS $$
begin  

  select min_salary, max_salary
  into   min, max
  from jobs
  where job_id = job;

end;$$;


ALTER PROCEDURE public.getsalarylimit(IN job character varying, INOUT min integer, INOUT max integer) OWNER TO hr;

--
-- Name: setprimaryemployeeid(); Type: FUNCTION; Schema: public; Owner: hr
--

CREATE FUNCTION public.setprimaryemployeeid() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
        IF (NEW.employee_id is null)
        then
            NEW.employee_id := nextval('employee_id');
        end if;

        Return NEW;
    END;
$$;


ALTER FUNCTION public.setprimaryemployeeid() OWNER TO hr;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: countries; Type: TABLE; Schema: public; Owner: hr
--

CREATE TABLE public.countries (
    country_id character(2) NOT NULL,
    country_name character varying(40)
);


ALTER TABLE public.countries OWNER TO hr;

--
-- Name: departments; Type: TABLE; Schema: public; Owner: hr
--

CREATE TABLE public.departments (
    department_id smallint NOT NULL,
    department_name character varying(30) NOT NULL,
    manager_id integer,
    loc_id smallint
);


ALTER TABLE public.departments OWNER TO hr;

--
-- Name: dept; Type: TABLE; Schema: public; Owner: hr
--

CREATE TABLE public.dept (
    department_id smallint NOT NULL,
    department_name character varying(30) NOT NULL,
    manager_id integer,
    street_address character varying(40),
    postal_code character varying(12),
    city character varying(30) NOT NULL,
    country_id character(2)
);


ALTER TABLE public.dept OWNER TO hr;

--
-- Name: employee_id; Type: SEQUENCE; Schema: public; Owner: hr
--

CREATE SEQUENCE public.employee_id
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.employee_id OWNER TO hr;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: hr
--

CREATE TABLE public.employees (
    employee_id integer NOT NULL,
    first_name character varying(40),
    last_name character varying(40) NOT NULL,
    email character varying(40) NOT NULL,
    phone_number character varying(20),
    hire_date date NOT NULL,
    job_id character varying(10) NOT NULL,
    salary numeric(8,2),
    manager_id integer,
    department_id smallint
);


ALTER TABLE public.employees OWNER TO hr;

--
-- Name: jobs; Type: TABLE; Schema: public; Owner: hr
--

CREATE TABLE public.jobs (
    job_id character varying(10) NOT NULL,
    job_title character varying(35) NOT NULL,
    min_salary integer,
    max_salary integer
);


ALTER TABLE public.jobs OWNER TO hr;

--
-- Name: locations; Type: TABLE; Schema: public; Owner: hr
--

CREATE TABLE public.locations (
    loc_id smallint NOT NULL,
    street_address character varying(40) NOT NULL,
    postal_code character varying(12) NOT NULL,
    city character varying(30) NOT NULL,
    country_id character(2)
);


ALTER TABLE public.locations OWNER TO hr;

--
-- Data for Name: countries; Type: TABLE DATA; Schema: public; Owner: hr
--

COPY public.countries (country_id, country_name) FROM stdin;
SE	Sweden
FI	Finland
DK	Denmark
\.


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: hr
--

COPY public.departments (department_id, department_name, manager_id, loc_id) FROM stdin;
100	M42 Consulting	5	3
200	M42 Testing	6	3
300	Emineo DB services	7	4
400	Miracle Finland Oy	9	1
500	Emineo sales	14	4
600	AddPro	16	5
700	Progressive	18	7
800	Mentor IT Esbjerg	21	6
900	Mentor IT Kolding	21	8
1000	M42 Hosting	22	2
1100	M42 AppSDev	24	3
\.


--
-- Data for Name: dept; Type: TABLE DATA; Schema: public; Owner: hr
--

COPY public.dept (department_id, department_name, manager_id, street_address, postal_code, city, country_id) FROM stdin;
100	M42 Consulting	5	Borupvang 5C	2750	Ballerup	DK
200	M42 Testing	6	Borupvang 5C	2750	Ballerup	DK
400	Miracle Finland Oy	9	Hermannin rantatie 12	580	Helsinki	FI
600	AddPro	16	Mileparken 22b	2740	Skovlunde	DK
800	Mentor IT Esbjerg	21	Lindevej 8	6710	Esbjerg	DK
1100	M42 AppSDev	24	Borupvang 5C	2750	Ballerup	DK
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: hr
--

COPY public.employees (employee_id, first_name, last_name, email, phone_number, hire_date, job_id, salary, manager_id, department_id) FROM stdin;
162	Tilde	Jensen	tilde.jensen@miracle42.dk	+45 01166208	2011-07-26	CONS	3330.00	52	1000
853	Alba	Jensen	alba.jensen@emineo.se	+46 64037382	2010-10-03	CONS	5330.00	39	300
534	Noah	Olsen	noah.olsen@emineo.se	+46 29702356	2020-07-24	CONS	3860.00	41	500
6	Marius	Nielsen	marius.nielsen@miracle42.dk	+45 92072460	1995-09-06	CONS	8260.00	5	200
7	Lauge	Nielsen	lauge.nielsen@emineo.se	+46 48775458	1995-06-14	CONS	8930.00	5	300
9	Line	Nielsen	line.nielsen@miracle.fi	+358 53175137	2009-01-11	CONS	9600.00	5	400
14	Mads	Pedersen	mads.pedersen@emineo.se	+46 89266552	2014-03-05	CONS	8130.00	5	500
16	Walter	Christensen 	walter.christensen@addpro.dk	+45 78872870	2005-04-09	CONS	9600.00	5	600
18	Victor	Andersen	victor.andersen@progressive.dk	+45 31171018	2002-09-17	CONS	8530.00	5	700
21	Michelle	Hansen	michelle.hansen@mentorit.dk	+45 08817564	2020-02-15	CONS	8530.00	5	800
22	Charlotte	Pedersen	charlotte.pedersen@mentorit.dk	+45 54671610	1990-10-29	CONS	9860.00	5	900
23	Naja	Pedersen	naja.pedersen@miracle42.dk	+45 71492490	2018-01-18	CONS	8260.00	5	1000
24	Josefine	Andersen	josefine.andersen@miracle42.dk	+45 27311479	2008-07-07	CONS	9600.00	5	1100
38	Jesper	Thomsen	jesper.thomsen@miracle42.dk	+45 76282467	2014-07-01	MGR	6530.00	6	200
39	Gustav	Petersen	gustav.petersen@emineo.se	+46 83881118	2016-02-13	MGR	7330.00	7	300
40	William	Nielsen	william.nielsen@miracle.fi	+358 79094039	1999-06-01	MGR	6260.00	9	400
41	Louise	Pedersen	louise.pedersen@emineo.se	+46 75150160	2002-10-28	MGR	5600.00	14	500
42	Rasmus	Larsen	rasmus.larsen@addpro.dk	+45 87993780	1994-05-17	MGR	5460.00	16	600
43	Merle	Nielsen	merle.nielsen@progressive.dk	+45 82296784	1995-11-13	MGR	5730.00	18	700
47	Anne	Hansen	anne.hansen@mentorit.dk	+45 44126106	2015-11-21	MGR	7600.00	21	800
51	Karina	Jensen	karina.jensen@mentorit.dk	+45 19149885	2002-03-27	MGR	7460.00	21	900
52	Adam	Jensen	adam.jensen@miracle42.dk	+45 41961103	1999-10-17	MGR	7460.00	22	1000
53	Sofia	Hansen	sofia.hansen@miracle42.dk	+45 60155046	1996-03-17	MGR	6400.00	24	1100
57	Arthur	Kristensen	arthur.kristensen@miracle42.dk	+45 10692845	2005-05-01	SNRMGR	8530.00	34	100
58	Caroline	Pedersen	caroline.pedersen@miracle42.dk	+45 20390580	2015-11-30	SNRMGR	7060.00	38	200
59	Eva	Hansen	eva.hansen@emineo.se	+46 51484581	2006-09-06	SNRMGR	8400.00	39	300
61	Elliot	Larsen	elliot.larsen@miracle.fi	+358 12399323	2008-09-16	SNRMGR	8130.00	40	400
63	Nohr	Andersen	nohr.andersen@emineo.se	+46 50114299	1996-01-04	SNRMGR	9200.00	41	500
64	Leonora	Hansen	leonora.hansen@addpro.dk	+45 17976647	1998-07-16	SNRMGR	8400.00	42	600
65	Simon	Madsen	simon.madsen@progressive.dk	+45 55940838	2003-02-28	SNRMGR	8530.00	43	700
66	Nanna	Petersen	nanna.petersen@mentorit.dk	+45 48207118	2008-08-18	SNRMGR	8930.00	47	800
67	Signe	Nielsen	signe.nielsen@mentorit.dk	+45 85508400	1997-01-23	SNRMGR	8260.00	51	900
74	Mark	Nielsen	mark.nielsen@miracle42.dk	+45 49677623	2010-03-27	SNRMGR	7730.00	52	1000
76	Ida	Olsen	ida.olsen@miracle42.dk	+45 29036338	2004-01-11	SNRMGR	7060.00	53	1100
77	Gry	Pedersen	gry.pedersen@emineo.se	+46 68379330	2017-12-30	TSC	2660.00	41	500
78	Signe	Petersen	signe.petersen@progressive.dk	+45 04842328	2004-10-29	SNRTSC	3730.00	43	700
79	Agnes	Jensen	agnes.jensen@miracle42.dk	+45 72262084	2015-08-06	CONS	4660.00	53	1100
83	Maja	Andersen	maja.andersen@miracle42.dk	+45 08650300	2016-03-20	SNRCONS	6130.00	34	100
84	Sigurd	Nielsen	sigurd.nielsen@miracle42.dk	+45 62645154	2013-11-28	CONS	4800.00	34	100
86	Emil	Nielsen	emil.nielsen@mentorit.dk	+45 87773223	2018-07-14	SNRCONS	5600.00	51	900
87	Ellie	Nielsen	ellie.nielsen@mentorit.dk	+45 94834040	1993-08-21	TSC	3600.00	47	800
88	Karla	Rasmussen	karla.rasmussen@emineo.se	+46 75518898	2014-05-08	SNRTSC	4000.00	41	500
89	Magnus	Pedersen	magnus.pedersen@emineo.se	+46 91798477	2002-11-15	CONS	4660.00	41	500
91	Nicklas	Madsen	nicklas.madsen@emineo.se	+46 78496212	2015-01-01	SNRCONS	5200.00	41	500
93	Anders	Nielsen	anders.nielsen@addpro.dk	+45 18979499	1991-03-26	TSC	2800.00	42	600
95	Patrick	Kristensen	patrick.kristensen@emineo.se	+46 29544044	1999-04-14	SNRTSC	4130.00	39	300
96	Walter	Nielsen	walter.nielsen@miracle.fi	+358 94084277	1993-06-03	CONS	5330.00	40	400
99	Anna	Petersen	anna.petersen@emineo.se	+46 77190868	2020-06-12	SNRCONS	5860.00	41	500
103	Ditte	Andersen	ditte.andersen@emineo.se	+46 45807114	2018-09-16	CONS	4660.00	39	300
105	Thomas	Pedersen	thomas.pedersen@miracle42.dk	+45 82347699	1996-10-08	SNRCONS	6260.00	53	1100
106	Lucas	Knudsen	lucas.knudsen@emineo.se	+46 79530589	1995-04-03	TSC	4130.00	39	300
107	Saga	Rasmussen	saga.rasmussen@miracle42.dk	+45 74940297	2018-04-02	SNRTSC	5330.00	34	100
108	Maja	Jensen	maja.jensen@miracle42.dk	+45 46360183	2002-01-28	CONS	5730.00	52	1000
115	Liva	Johansen	liva.johansen@mentorit.dk	+45 29988689	2005-06-05	SNRCONS	4800.00	51	900
116	Janni	Christensen 	janni.christensen@miracle42.dk	+45 02069994	1998-05-12	CONS	4660.00	38	200
117	Emma	Sørensen	emma.sorensen@emineo.se	+46 14470643	2004-04-21	SNRCONS	7060.00	41	500
123	Frida	Pedersen	frida.pedersen@mentorit.dk	+45 52642816	1994-01-20	TSC	4000.00	47	800
124	Aksel	Jensen	aksel.jensen@miracle42.dk	+45 94495949	2011-01-10	SNRTSC	4530.00	52	1000
127	Alma	Jensen	alma.jensen@mentorit.dk	+45 26705014	2001-01-30	CONS	5460.00	47	800
129	Karl	Rasmussen	karl.rasmussen@miracle42.dk	+45 75374072	1991-05-20	CONS	3330.00	53	1100
137	Frederik	Jørgensen 	frederik.jorgensen@miracle42.dk	+45 62277176	2010-03-01	SNRCONS	6530.00	53	1100
142	Ditte	Jensen	ditte.jensen@emineo.se	+46 83640156	2002-05-18	TSC	4000.00	41	500
143	Mikkel	Rasmussen	mikkel.rasmussen@mentorit.dk	+45 72306779	2015-08-18	SNRTSC	5330.00	47	800
150	Asta	Olsen	asta.olsen@addpro.dk	+45 18339540	1996-09-27	CONS	4260.00	42	600
652	Merle	Sørensen	merle.sorensen@miracle42.dk	+45 10318011	2013-11-05	SNRCONS	4930.00	34	100
188	Albert	Sørensen	albert.sorensen@miracle42.dk	+45 13548653	2005-08-22	TSC	4130.00	34	100
738	Sebastian	Jørgensen 	sebastian.jorgensen@miracle42.dk	+45 67692848	2009-02-20	SNRCONS	5060.00	53	1100
5	Mia	Andersen	mia.andersen@miracle42.dk	+45 01793823	2014-10-19	CEO	9200.00	0	100
151	Simone	Pedersen	simone.pedersen@mentorit.dk	+45 85755946	2012-10-12	SNRCONS	6800.00	47	800
153	Freja	Pedersen	freja.pedersen@progressive.dk	+45 98789903	2007-01-27	CONS	4660.00	43	700
157	Rebecca	Sørensen	rebecca.sorensen@mentorit.dk	+45 37041718	1994-03-03	TSC	3600.00	47	800
159	Nikolaj	Kristensen	nikolaj.kristensen@miracle42.dk	+45 35717061	1999-07-03	SNRTSC	4400.00	52	1000
160	Jonathan	Jensen	jonathan.jensen@mentorit.dk	+45 84612379	2020-01-04	CONS	5730.00	51	900
34	Alexander	Sørensen	alexander.sorensen@miracle42.dk	+45 19218321	2000-05-08	MGR	5600.00	5	100
154	Anders	Jørgensen 	anders.jorgensen@miracle42.dk	+45 77345847	1997-10-13	SNRCONS	4930.00	38	200
128	Andrea	Jørgensen 	andrea.jorgensen@mentorit.dk	+45 96845601	2005-01-30	SNRCONS	5200.00	47	800
161	Sofie	Kristensen	sofie.kristensen@miracle42.dk	+45 47410770	2018-05-21	SNRCONS	6000.00	53	1100
163	Matheo	Larsen	matheo.larsen@miracle.fi	+358 27769003	2008-03-22	SNRCONS	6530.00	40	400
165	Emilie	Nielsen	emilie.nielsen@miracle42.dk	+45 20025653	2018-06-29	TSC	3200.00	52	1000
166	Elias	Nielsen	elias.nielsen@progressive.dk	+45 12935690	2018-04-07	SNRTSC	3730.00	43	700
167	Victoria	Andersen	victoria.andersen@emineo.se	+46 95302013	2016-12-29	CONS	3730.00	41	500
168	Ella	Christensen 	ella.christensen@miracle.fi	+358 05780996	1995-01-11	SNRCONS	4930.00	40	400
169	Astrid	Hansen	astrid.hansen@mentorit.dk	+45 66704391	1992-05-02	TSC	3600.00	51	900
170	Sander	Nielsen	sander.nielsen@miracle42.dk	+45 00921974	2019-01-01	SNRTSC	3860.00	38	200
171	Anker	Nielsen	anker.nielsen@miracle.fi	+358 78875322	2013-06-07	CONS	4530.00	40	400
172	Christina	Jensen	christina.jensen@miracle.fi	+358 33144187	2010-06-16	SNRCONS	5060.00	40	400
177	Nicklas	Pedersen	nicklas.pedersen@emineo.se	+46 94552385	1991-01-29	CONS	4130.00	41	500
180	Marie	Christensen 	marie.christensen@miracle42.dk	+45 64874605	2003-02-03	SNRCONS	7060.00	52	1000
192	Jesper	Knudsen	jesper.knudsen@addpro.dk	+45 03447819	2006-12-19	SNRTSC	5730.00	42	600
194	Jesper	Petersen	jesper.petersen@addpro.dk	+45 95959103	1993-04-01	CONS	3860.00	42	600
196	Nicolai	Larsen	nicolai.larsen@emineo.se	+46 41066849	2018-05-07	SNRCONS	5200.00	39	300
197	Jeppe	Møller	jeppe.moller@progressive.dk	+45 85507505	2006-04-25	TSC	2800.00	43	700
198	Anker	Petersen	anker.petersen@miracle.fi	+358 80306256	2013-11-20	TSC	3330.00	40	400
199	Martin	Nielsen	martin.nielsen@addpro.dk	+45 63568174	1991-06-04	SNRTSC	5860.00	42	600
200	Anna	Pedersen	anna.pedersen@progressive.dk	+45 14876792	2004-11-22	CONS	5600.00	43	700
201	Sara	Nielsen	sara.nielsen@progressive.dk	+45 42014778	2009-06-24	SNRCONS	5060.00	43	700
202	Jonas	Rasmussen	jonas.rasmussen@addpro.dk	+45 88166516	1993-02-02	CONS	4930.00	42	600
204	Alfred	Rasmussen	alfred.rasmussen@addpro.dk	+45 01792102	2011-09-07	SNRCONS	4930.00	42	600
207	Oscar	Christensen 	oscar.christensen@miracle.fi	+358 52006887	2011-02-28	TSC	3460.00	40	400
209	Malene	Jensen	malene.jensen@addpro.dk	+45 91979224	2003-05-25	SNRTSC	3460.00	42	600
212	Andreas	Petersen	andreas.petersen@emineo.se	+46 28563193	2012-02-20	CONS	5860.00	41	500
217	Freja	Jørgensen 	freja.jorgensen@addpro.dk	+45 68445430	1995-03-06	SNRCONS	7060.00	42	600
220	Emily	Nielsen	emily.nielsen@emineo.se	+46 87040158	1994-07-01	TSC	2660.00	41	500
225	Luna	Jensen	luna.jensen@progressive.dk	+45 89029176	2001-01-21	SNRTSC	3460.00	43	700
226	Stine	Olsen	stine.olsen@miracle.fi	+358 67967085	2017-01-15	CONS	3860.00	40	400
231	Johan	Larsen	johan.larsen@addpro.dk	+45 38363115	2004-10-19	SNRCONS	4660.00	42	600
238	Thomas	Møller	thomas.moller@emineo.se	+46 06184670	1999-06-29	CONS	5330.00	41	500
240	Milas	Hansen	milas.hansen@mentorit.dk	+45 34393824	2013-06-03	SNRCONS	4800.00	47	800
242	Mia	Sørensen	mia.sorensen@miracle.fi	+358 24220314	2018-07-13	TSC	5200.00	40	400
244	Patrick	Larsen	patrick.larsen@progressive.dk	+45 43464246	2008-10-18	SNRTSC	5060.00	43	700
245	Thor	Pedersen	thor.pedersen@miracle.fi	+358 73245059	2004-09-13	CONS	4130.00	40	400
246	Kim	Nielsen	kim.nielsen@miracle42.dk	+45 99497765	1999-02-08	SNRCONS	4800.00	52	1000
249	Peter	Jensen	peter.jensen@miracle42.dk	+45 64907963	1991-02-01	TSC	4260.00	52	1000
251	Tilde	Pedersen	tilde.pedersen@miracle42.dk	+45 56696167	2005-08-01	SNRTSC	3330.00	38	200
259	Mikkel	Hansen	mikkel.hansen@miracle42.dk	+45 64182545	2010-08-10	CONS	3730.00	52	1000
260	Julie	Hansen	julie.hansen@emineo.se	+46 84875909	2015-07-11	SNRCONS	6130.00	41	500
262	Christoffer	Petersen	christoffer.petersen@emineo.se	+46 04454699	1998-04-11	CONS	3860.00	41	500
265	Laura	Kristensen	laura.kristensen@emineo.se	+46 32469970	2013-10-01	SNRCONS	5060.00	41	500
266	Johan	Jensen	johan.jensen@addpro.dk	+45 38411473	2006-04-29	TSC	3060.00	42	600
267	Christian	Pedersen	christian.pedersen@mentorit.dk	+45 66481788	1998-05-10	SNRTSC	4530.00	47	800
272	Erik	Hansen	erik.hansen@miracle.fi	+358 39057737	2006-01-14	CONS	3730.00	40	400
278	Mette	Sørensen	mette.sorensen@emineo.se	+46 84677221	1992-07-08	SNRCONS	6800.00	39	300
279	Jens	Christensen 	jens.christensen@emineo.se	+46 03818870	2015-12-03	SNRTSC	4660.00	41	500
284	Victor	Jensen	victor.jensen@miracle42.dk	+45 10556380	1999-02-08	CONS	5060.00	34	100
285	Liam	Olsen	liam.olsen@mentorit.dk	+45 55888147	2013-11-25	TSC	3460.00	51	900
286	Rasmus	Jensen	rasmus.jensen@miracle42.dk	+45 44429668	2013-10-01	SNRTSC	5200.00	52	1000
295	Marie	Nielsen	marie.nielsen@miracle.fi	+358 28533159	1996-05-26	CONS	4530.00	40	400
300	Stine	Andersen	stine.andersen@miracle42.dk	+45 51762218	2018-09-04	SNRCONS	6130.00	52	1000
301	Molly	Pedersen	molly.pedersen@mentorit.dk	+45 43972094	2016-09-26	CONS	4400.00	47	800
302	Vilma	Nielsen	vilma.nielsen@miracle42.dk	+45 62952190	2019-08-18	SNRCONS	6000.00	38	200
303	Christian	Jensen	christian.jensen@mentorit.dk	+45 28075774	2017-01-02	TSC	4660.00	47	800
304	Malou	Jensen	malou.jensen@miracle42.dk	+45 23029303	2012-01-26	SNRTSC	4930.00	53	1100
305	Philip	Sørensen	philip.sorensen@mentorit.dk	+45 67574692	2018-07-22	CONS	4130.00	51	900
306	Lasse	Kristensen	lasse.kristensen@miracle42.dk	+45 85155860	2013-03-15	SNRCONS	6530.00	34	100
315	Viggo	Andersen	viggo.andersen@addpro.dk	+45 00559647	2013-03-16	TSC	4400.00	42	600
316	Daniel	Jørgensen 	daniel.jorgensen@mentorit.dk	+45 08233349	2003-11-08	SNRTSC	4530.00	51	900
319	Johanne	Larsen	johanne.larsen@mentorit.dk	+45 80589028	2000-03-16	CONS	5730.00	47	800
322	Patrick	Møller	patrick.moller@mentorit.dk	+45 46668915	2013-02-01	SNRCONS	6400.00	47	800
323	Helle	Pedersen	helle.pedersen@miracle42.dk	+45 10772952	2019-06-22	CONS	4800.00	38	200
324	Asger	Hansen	asger.hansen@miracle42.dk	+45 65108335	1992-07-20	SNRCONS	6530.00	52	1000
325	Clara	Andersen	clara.andersen@miracle.fi	+358 11744819	2017-09-03	TSC	4400.00	40	400
326	Theo	Hansen	theo.hansen@mentorit.dk	+45 16638701	2015-10-17	SNRTSC	5330.00	47	800
314	Camilla	Møller	camilla.moller@miracle42.dk	+45 89125414	2003-01-07	SNRTSC	3600.00	34	100
330	Rosa	Rasmussen	rosa.rasmussen@miracle42.dk	+45 97500725	2020-05-26	CONS	4260.00	38	200
332	Oscar	Johansen	oscar.johansen@miracle42.dk	+45 83330580	2007-08-04	SNRCONS	4800.00	34	100
333	Michael	Hansen	michael.hansen@miracle42.dk	+45 70873441	1992-09-21	TSC	4260.00	52	1000
334	Viggo	Jensen	viggo.jensen@addpro.dk	+45 76106021	2004-08-15	SNRTSC	5730.00	42	600
341	Peter	Olsen	peter.olsen@addpro.dk	+45 97086935	2012-07-25	CONS	4130.00	42	600
343	Morten	Petersen	morten.petersen@addpro.dk	+45 42474169	2000-02-01	SNRCONS	5200.00	42	600
344	Hannah	Petersen	hannah.petersen@miracle42.dk	+45 03569998	2019-09-05	TSC	3460.00	53	1100
349	Lauge	Madsen	lauge.madsen@progressive.dk	+45 48217873	1991-08-03	SNRTSC	5600.00	43	700
351	Theo	Poulsen	theo.poulsen@miracle42.dk	+45 00700454	2020-02-17	CONS	4800.00	52	1000
359	Selma	Nielsen	selma.nielsen@emineo.se	+46 21419874	2001-05-25	SNRCONS	5860.00	41	500
362	Alfred	Jensen	alfred.jensen@mentorit.dk	+45 29593837	1998-07-14	CONS	4000.00	47	800
363	Tobias	Jensen	tobias.jensen@addpro.dk	+45 08229947	2010-06-24	SNRCONS	5860.00	42	600
370	Henrik	Kristensen	henrik.kristensen@emineo.se	+46 83140985	2016-01-20	TSC	5060.00	39	300
371	Eva	Sørensen	eva.sorensen@miracle42.dk	+45 53967909	2005-04-24	SNRTSC	4930.00	53	1100
372	Olivia	Christensen 	olivia.christensen@emineo.se	+46 42168117	2013-08-25	CONS	5200.00	41	500
373	Hugo	Andersen	hugo.andersen@emineo.se	+46 82628607	1998-06-08	SNRCONS	5860.00	41	500
374	Anders	Sørensen	anders.sorensen@miracle42.dk	+45 96435228	2002-08-12	CONS	5200.00	53	1100
376	Daniel	Jensen	daniel.jensen@miracle42.dk	+45 07468343	1993-03-10	SNRCONS	6260.00	38	200
384	Tina	Pedersen	tina.pedersen@miracle.fi	+358 38620167	2009-11-18	TSC	4660.00	40	400
390	Mathilde	Nielsen	mathilde.nielsen@miracle42.dk	+45 76801711	2014-02-07	SNRTSC	4660.00	52	1000
404	Camilla	Pedersen	camilla.pedersen@emineo.se	+46 63393124	2017-06-09	CONS	3600.00	39	300
405	Andreas	Jørgensen 	andreas.jorgensen@miracle42.dk	+45 68519385	1997-02-01	SNRCONS	7060.00	53	1100
406	Frederik	Rasmussen	frederik.rasmussen@mentorit.dk	+45 94495790	1994-11-09	CONS	5060.00	51	900
409	Emil	Larsen	emil.larsen@addpro.dk	+45 90203676	1999-10-01	SNRCONS	6530.00	42	600
411	Kasper	Rasmussen	kasper.rasmussen@emineo.se	+46 30143754	2000-11-16	TSC	4530.00	39	300
414	Otto	Christensen 	otto.christensen@mentorit.dk	+45 67015991	2012-11-02	SNRTSC	5060.00	47	800
417	Mathias	Nielsen	mathias.nielsen@mentorit.dk	+45 56088913	1999-03-30	CONS	5060.00	47	800
420	Alba	Sørensen	alba.sorensen@emineo.se	+46 06355330	2003-08-29	SNRCONS	4930.00	41	500
421	Storm	Olsen	storm.olsen@emineo.se	+46 24074553	2012-03-28	CONS	5060.00	39	300
422	Jakob	Thomsen	jakob.thomsen@miracle42.dk	+45 78651267	1995-07-12	SNRCONS	6530.00	52	1000
425	Stine	Hansen	stine.hansen@emineo.se	+46 41437051	2007-08-05	TSC	4930.00	41	500
426	Mathilde	Larsen	mathilde.larsen@addpro.dk	+45 89821545	1992-11-14	SNRTSC	5460.00	42	600
427	Clara	Jensen	clara.jensen@mentorit.dk	+45 48933740	2019-05-08	CONS	3730.00	51	900
428	Villum	Nielsen	villum.nielsen@miracle42.dk	+45 56229345	1994-07-01	SNRCONS	6930.00	34	100
429	Andreas	Nielsen	andreas.nielsen@miracle42.dk	+45 02447626	1997-04-21	CONS	5060.00	53	1100
430	Thea	Christiansen	thea.christiansen@miracle42.dk	+45 02930789	2012-02-19	SNRCONS	6000.00	53	1100
431	Maria	Christensen 	maria.christensen@miracle42.dk	+45 10145953	2016-05-22	TSC	3200.00	53	1100
432	Sarah	Pedersen	sarah.pedersen@mentorit.dk	+45 48046672	1990-05-08	SNRTSC	4000.00	47	800
433	Nikolaj	Andersen	nikolaj.andersen@miracle42.dk	+45 20275768	1993-09-02	CONS	4400.00	53	1100
434	Valdemar	Andersen	valdemar.andersen@miracle42.dk	+45 12615082	2001-08-01	SNRCONS	6800.00	53	1100
435	Nanna	Pedersen	nanna.pedersen@mentorit.dk	+45 69816689	2019-04-12	CONS	3730.00	51	900
445	Bertram	Hansen	bertram.hansen@emineo.se	+46 07722864	2007-07-27	SNRCONS	4660.00	39	300
450	Carl	Pedersen	carl.pedersen@mentorit.dk	+45 87134650	1990-05-25	TSC	3060.00	51	900
454	Malene	Andersen	malene.andersen@mentorit.dk	+45 76841104	1990-05-21	SNRTSC	3860.00	51	900
455	Valdemar	Jensen	valdemar.jensen@miracle.fi	+358 14792326	2001-01-26	CONS	3460.00	40	400
470	Jonas	Larsen	jonas.larsen@miracle42.dk	+45 46638993	2009-10-13	SNRCONS	4800.00	52	1000
476	Naja	Petersen	naja.petersen@addpro.dk	+45 95175264	1997-04-09	CONS	5200.00	42	600
477	Ellie	Christensen 	ellie.christensen@mentorit.dk	+45 78194998	2008-11-13	SNRCONS	7060.00	47	800
478	Olivia	Poulsen	olivia.poulsen@mentorit.dk	+45 63658156	2000-11-08	TSC	5200.00	47	800
479	Pernille	Hansen	pernille.hansen@mentorit.dk	+45 12113685	2013-09-05	SNRTSC	5330.00	51	900
480	Asta	Hansen	asta.hansen@emineo.se	+46 05476092	2010-03-19	CONS	4930.00	41	500
481	Liam	Hansen	liam.hansen@miracle42.dk	+45 29014540	2017-10-16	SNRCONS	6260.00	53	1100
482	Morten	Rasmussen	morten.rasmussen@miracle42.dk	+45 91770106	1996-01-19	CONS	5060.00	34	100
485	Peter	Larsen	peter.larsen@mentorit.dk	+45 23104015	2017-08-21	SNRCONS	4800.00	47	800
489	Mads	Jensen	mads.jensen@miracle.fi	+358 79371657	2010-11-30	SNRTSC	5730.00	40	400
492	Felix	Hansen	felix.hansen@addpro.dk	+45 10494666	2012-02-22	CONS	3330.00	42	600
495	Mathias	Larsen	mathias.larsen@emineo.se	+46 12554042	2000-12-15	SNRCONS	6930.00	41	500
496	Emil	Madsen	emil.madsen@addpro.dk	+45 92994434	2011-09-08	CONS	4130.00	42	600
499	Filippa	Rasmussen	filippa.rasmussen@addpro.dk	+45 39723503	1992-09-15	SNRCONS	5330.00	42	600
500	Kasper	Nielsen	kasper.nielsen@mentorit.dk	+45 36546975	1994-03-12	TSC	3730.00	47	800
502	Marius	Christensen 	marius.christensen@addpro.dk	+45 04287526	1990-10-19	SNRTSC	4660.00	42	600
503	Liv	Hansen	liv.hansen@addpro.dk	+45 03782195	2020-04-12	CONS	5200.00	42	600
504	Mark	Christensen 	mark.christensen@mentorit.dk	+45 77947154	2008-08-27	SNRCONS	6400.00	47	800
505	Konrad	Nielsen	konrad.nielsen@miracle.fi	+358 57108266	2014-06-24	CONS	4660.00	40	400
507	Kim	Jørgensen 	kim.jorgensen@miracle.fi	+358 78234594	2013-10-03	TSC	4930.00	40	400
508	Katrine	Hansen	katrine.hansen@miracle42.dk	+45 44378082	2009-08-01	SNRTSC	5200.00	53	1100
509	Pernille	Larsen	pernille.larsen@miracle.fi	+358 70733052	2003-01-08	CONS	3860.00	40	400
510	Michelle	Pedersen	michelle.pedersen@miracle42.dk	+45 56637358	2016-11-08	SNRCONS	6660.00	52	1000
511	Selma	Petersen	selma.petersen@miracle42.dk	+45 54606698	2013-04-15	CONS	5200.00	38	200
514	Jonas	Jensen	jonas.jensen@miracle42.dk	+45 99386755	2005-05-19	SNRCONS	5730.00	34	100
515	Jasmin	Christensen 	jasmin.christensen@miracle42.dk	+45 21420800	2007-01-01	TSC	4930.00	34	100
520	Maria	Nielsen	maria.nielsen@progressive.dk	+45 19779406	2005-07-20	SNRTSC	5460.00	43	700
522	Rikke	Sørensen	rikke.sorensen@progressive.dk	+45 05969754	2005-05-09	CONS	4400.00	43	700
523	Michael	Sørensen	michael.sorensen@mentorit.dk	+45 45508693	2012-03-23	SNRCONS	6800.00	51	900
524	Filippa	Hansen	filippa.hansen@miracle.fi	+358 78174893	2013-07-24	SNRTSC	5200.00	40	400
525	Arthur	Hansen	arthur.hansen@mentorit.dk	+45 36092522	2016-03-25	CONS	3330.00	51	900
526	Christian	Christensen 	christian.christensen@mentorit.dk	+45 39497716	2007-02-25	SNRCONS	5600.00	47	800
528	Michael	Madsen	michael.madsen@miracle.fi	+358 61722125	2013-01-06	TSC	5200.00	40	400
529	Esther	Hansen	esther.hansen@progressive.dk	+45 10077610	2017-04-20	SNRTSC	4660.00	43	700
535	Vilma	Christensen 	vilma.christensen@mentorit.dk	+45 07924176	2018-06-08	SNRCONS	6930.00	51	900
536	Emily	Larsen	emily.larsen@miracle42.dk	+45 35959256	2007-12-20	CONS	4530.00	38	200
539	Sofia	Kristensen	sofia.kristensen@mentorit.dk	+45 55474039	1997-09-30	SNRCONS	6530.00	51	900
543	Vigga	Jensen	vigga.jensen@emineo.se	+46 15607879	1994-11-22	TSC	3330.00	41	500
544	Lea	Hansen	lea.hansen@mentorit.dk	+45 77564501	2012-12-05	SNRTSC	5200.00	51	900
547	Lasse	Nielsen	lasse.nielsen@miracle42.dk	+45 82552022	2002-11-27	CONS	4130.00	52	1000
550	Alberte	Sørensen	alberte.sorensen@mentorit.dk	+45 91342671	1996-01-20	SNRCONS	5730.00	51	900
551	Villads	Christensen 	villads.christensen@miracle42.dk	+45 30121791	1993-05-28	CONS	4930.00	53	1100
553	Sarah	Jørgensen 	sarah.jorgensen@miracle42.dk	+45 34707940	1994-06-01	SNRCONS	5860.00	52	1000
562	Mikkel	Sørensen	mikkel.sorensen@mentorit.dk	+45 21268198	1994-04-01	TSC	2800.00	47	800
563	Frederikke	Hansen	frederikke.hansen@miracle42.dk	+45 18187002	2000-10-20	SNRTSC	5060.00	53	1100
568	Philip	Jensen	philip.jensen@miracle42.dk	+45 95264746	2018-05-15	CONS	4000.00	52	1000
572	Emma	Nielsen	emma.nielsen@miracle.fi	+358 32797391	2016-05-11	SNRCONS	5460.00	40	400
575	Theodor	Pedersen	theodor.pedersen@miracle42.dk	+45 81842592	2009-04-02	CONS	4930.00	52	1000
576	Benjamin	Christiansen	benjamin.christiansen@emineo.se	+46 88115958	1991-11-11	SNRCONS	5730.00	41	500
579	Heidi	Pedersen	heidi.pedersen@mentorit.dk	+45 48026877	2013-05-22	TSC	2930.00	51	900
589	Rebecca	Jensen	rebecca.jensen@addpro.dk	+45 38852878	2015-11-18	CONS	4260.00	42	600
592	Tobias	Pedersen	tobias.pedersen@miracle42.dk	+45 74661602	2000-05-04	SNRCONS	6930.00	38	200
596	Frederik	Hansen	frederik.hansen@mentorit.dk	+45 54381551	2013-07-15	CONS	4530.00	47	800
597	Julie	Jensen	julie.jensen@mentorit.dk	+45 17447686	1992-02-05	SNRCONS	4930.00	51	900
598	Camilla	Nielsen	camilla.nielsen@emineo.se	+46 50283338	2020-09-26	TSC	3330.00	39	300
601	Brian	Johansen	brian.johansen@mentorit.dk	+45 08826171	2006-03-17	SNRTSC	4130.00	47	800
602	Rosa	Jensen	rosa.jensen@mentorit.dk	+45 54237321	2000-10-13	CONS	4000.00	47	800
603	Vigga	Andersen	vigga.andersen@emineo.se	+46 75033580	1997-01-21	SNRCONS	6400.00	41	500
604	Asger	Kristensen	asger.kristensen@emineo.se	+46 34361343	2010-01-28	CONS	5460.00	39	300
605	Pernille	Jensen	pernille.jensen@progressive.dk	+45 62341885	2000-09-27	SNRCONS	6260.00	43	700
607	Kasper	Christensen 	kasper.christensen@miracle42.dk	+45 93516289	2005-03-21	TSC	3860.00	52	1000
608	Hannah	Pedersen	hannah.pedersen@progressive.dk	+45 34115010	1999-01-08	SNRTSC	4400.00	43	700
609	Bertram	Poulsen	bertram.poulsen@mentorit.dk	+45 43636866	2017-07-16	CONS	3860.00	51	900
610	Ida	Christensen 	ida.christensen@emineo.se	+46 52798684	1995-09-13	SNRCONS	6000.00	41	500
611	Andrea	Nielsen	andrea.nielsen@addpro.dk	+45 12254113	2019-07-03	CONS	4800.00	42	600
612	Lærke	Jensen	lerke.jensen@mentorit.dk	+45 70056461	1993-04-09	SNRCONS	6260.00	47	800
613	Jasmin	Poulsen	jasmin.poulsen@mentorit.dk	+45 57946845	2015-08-19	TSC	4260.00	51	900
614	Søren	Knudsen	soren.knudsen@emineo.se	+46 65204648	2007-08-10	SNRTSC	5600.00	41	500
622	Theodor	Johansen	theodor.johansen@miracle42.dk	+45 07001902	2011-08-15	CONS	5730.00	52	1000
623	Amalie	Rasmussen	amalie.rasmussen@miracle42.dk	+45 69971555	2000-01-24	SNRCONS	5460.00	52	1000
635	Ella	Nielsen	ella.nielsen@miracle.fi	+358 69099279	2005-07-22	SNRCONS	7060.00	40	400
640	Cecilie	Hansen	cecilie.hansen@miracle42.dk	+45 15769796	1997-12-24	TSC	3460.00	52	1000
642	Isabella	Olsen	isabella.olsen@miracle42.dk	+45 94393717	2013-02-05	SNRTSC	3730.00	38	200
645	Sigurd	Petersen	sigurd.petersen@emineo.se	+46 37387046	1996-05-01	CONS	4530.00	41	500
646	Oliver	Christiansen	oliver.christiansen@mentorit.dk	+45 29303269	1994-06-25	SNRCONS	5060.00	51	900
651	Louise	Nielsen	louise.nielsen@miracle42.dk	+45 22268583	1999-10-15	CONS	4930.00	52	1000
655	Mette	Hansen	mette.hansen@mentorit.dk	+45 80200479	2001-11-22	TSC	4400.00	47	800
656	Marie	Christensen 	marie.christensen@miracle42.dk	+45 98268141	1999-10-26	SNRTSC	4800.00	38	200
657	Brian	Pedersen	brian.pedersen@mentorit.dk	+45 86026170	1994-03-24	CONS	3460.00	47	800
667	Pelle	Larsen	pelle.larsen@miracle42.dk	+45 65812660	2019-08-05	SNRCONS	4800.00	53	1100
669	Kenneth	Jørgensen 	kenneth.jorgensen@miracle42.dk	+45 26259684	1995-10-17	CONS	3600.00	53	1100
672	Karina	Sørensen	karina.sorensen@progressive.dk	+45 51005574	2016-09-09	SNRCONS	6800.00	43	700
683	Alexander	Jensen	alexander.jensen@mentorit.dk	+45 78974361	2001-06-30	TSC	3600.00	47	800
686	Lærke	Pedersen	lerke.pedersen@emineo.se	+46 21652659	1990-10-04	SNRTSC	4660.00	41	500
689	Malthe	Jensen	malthe.jensen@miracle42.dk	+45 80110840	1995-12-08	CONS	4930.00	52	1000
690	Søren	Thomsen	soren.thomsen@progressive.dk	+45 76134898	2011-02-25	SNRCONS	6260.00	43	700
692	Emil	Poulsen	emil.poulsen@progressive.dk	+45 88972312	2013-09-07	CONS	4930.00	43	700
694	Mille	Jørgensen 	mille.jorgensen@miracle42.dk	+45 97732572	1992-12-11	SNRCONS	6000.00	38	200
633	Katrine	Jørgensen 	katrine.jorgensen@emineo.se	+46 27152249	1998-11-20	CONS	4260.00	39	300
584	Christina	Andersen	christina.andersen@miracle42.dk	+45 35125311	1993-11-15	SNRTSC	5460.00	34	100
695	Sander	Rasmussen	sander.rasmussen@emineo.se	+46 19267817	2019-01-27	TSC	3600.00	39	300
697	Helle	Madsen	helle.madsen@miracle.fi	+358 77023257	1993-10-16	SNRTSC	4930.00	40	400
698	Rikke	Jensen	rikke.jensen@miracle42.dk	+45 84759819	2014-11-16	CONS	5730.00	53	1100
699	Oliver	Christensen 	oliver.christensen@progressive.dk	+45 90526090	1993-06-03	SNRCONS	5330.00	43	700
702	Kristine	Nielsen	kristine.nielsen@mentorit.dk	+45 83338503	1993-06-08	CONS	4000.00	47	800
703	Victoria	Jensen	victoria.jensen@progressive.dk	+45 43863105	2019-11-14	SNRCONS	6660.00	43	700
705	Karl	Jensen	karl.jensen@progressive.dk	+45 68654849	2013-05-12	TSC	3460.00	43	700
710	Marcus	Jensen	marcus.jensen@miracle42.dk	+45 34869140	2001-07-20	SNRTSC	3730.00	38	200
711	Alberte	Jensen	alberte.jensen@miracle.fi	+358 70495640	2003-04-22	CONS	4530.00	40	400
713	Mathias	Larsen	mathias.larsen@miracle42.dk	+45 17252418	2004-07-08	SNRCONS	5200.00	52	1000
714	Nora	Andersen	nora.andersen@addpro.dk	+45 47353558	1991-01-27	CONS	5600.00	42	600
715	Isabella	Andersen	isabella.andersen@miracle.fi	+358 56045101	2015-11-13	SNRCONS	7200.00	40	400
716	Laura	Hansen	laura.hansen@miracle.fi	+358 17298090	1991-09-21	TSC	3330.00	40	400
717	Line	Hansen	line.hansen@emineo.se	+46 34934653	2019-07-16	SNRTSC	5200.00	39	300
718	Martin	Larsen	martin.larsen@miracle.fi	+358 21152250	1990-06-18	CONS	4130.00	40	400
719	Dennis	Andersen	dennis.andersen@mentorit.dk	+45 59471952	2016-12-21	SNRCONS	5460.00	47	800
720	Amalie	Nielsen	amalie.nielsen@miracle.fi	+358 71962996	2002-01-01	CONS	4260.00	40	400
721	Simon	Nielsen	simon.nielsen@progressive.dk	+45 20361814	2002-10-27	SNRCONS	5730.00	43	700
722	Molly	Jørgensen 	molly.jorgensen@miracle42.dk	+45 48509172	2015-09-20	TSC	3060.00	52	1000
723	Sara	Jørgensen 	sara.jorgensen@mentorit.dk	+45 84347587	2010-06-15	SNRTSC	4930.00	51	900
724	Adam	Larsen	adam.larsen@mentorit.dk	+45 45603489	1997-02-18	CONS	3730.00	51	900
726	Nora	Thomsen	nora.thomsen@emineo.se	+46 14648831	2009-01-07	SNRCONS	6000.00	39	300
728	Josefine	Jensen	josefine.jensen@emineo.se	+46 06628429	2016-03-18	CONS	5200.00	39	300
730	Carl	Knudsen	carl.knudsen@progressive.dk	+45 86669552	1998-12-25	SNRCONS	6530.00	43	700
731	Magnus	Jensen	magnus.jensen@miracle42.dk	+45 86834726	1993-01-04	TSC	3060.00	53	1100
735	Louise	Møller	louise.moller@emineo.se	+46 54133310	2007-10-23	SNRTSC	4660.00	41	500
737	Johanne	Jensen	johanne.jensen@mentorit.dk	+45 47309896	2005-10-01	CONS	3860.00	47	800
739	Tina	Jensen	tina.jensen@emineo.se	+46 87792845	1992-12-11	CONS	3860.00	41	500
740	Janni	Christiansen	janni.christiansen@progressive.dk	+45 77098926	2012-11-01	SNRCONS	6000.00	43	700
749	Kristine	Petersen	kristine.petersen@miracle42.dk	+45 22839200	2010-09-11	TSC	4260.00	52	1000
751	Trine	Jensen	trine.jensen@addpro.dk	+45 71806387	2007-11-04	SNRTSC	4530.00	42	600
752	Noah	Andersen	noah.andersen@miracle42.dk	+45 37003259	2002-03-13	CONS	5460.00	53	1100
768	Luna	Pedersen	luna.pedersen@miracle.fi	+358 89793209	2001-08-29	SNRCONS	7200.00	40	400
772	Mette	Hansen	mette.hansen@addpro.dk	+45 07993760	2002-05-11	CONS	4000.00	42	600
775	Frederikke	Jørgensen 	frederikke.jorgensen@progressive.dk	+45 66029189	2001-02-08	SNRCONS	6130.00	43	700
777	Storm	Hansen	storm.hansen@miracle42.dk	+45 80704813	2018-11-23	TSC	4130.00	52	1000
779	Nanna	Pedersen	nanna.pedersen@mentorit.dk	+45 58385812	2003-04-10	SNRTSC	5330.00	47	800
787	Sofie	Pedersen	sofie.pedersen@miracle42.dk	+45 69947935	2011-02-01	CONS	4000.00	52	1000
795	Jeppe	Christensen 	jeppe.christensen@miracle.fi	+358 30418619	2017-01-30	SNRCONS	4660.00	40	400
796	Alma	Rasmussen	alma.rasmussen@emineo.se	+46 72456061	2007-09-20	CONS	3860.00	41	500
797	Natasja	Madsen	natasja.madsen@emineo.se	+46 87331152	1995-11-16	SNRCONS	6000.00	39	300
804	Michael	Christiansen	michael.christiansen@addpro.dk	+45 01253581	2000-01-13	TSC	3060.00	42	600
806	Leonora	Olsen	leonora.olsen@miracle42.dk	+45 73070251	2000-09-03	SNRTSC	3460.00	52	1000
811	Pelle	Jensen	pelle.jensen@emineo.se	+46 00380859	2020-11-20	CONS	3860.00	41	500
813	Anton	Madsen	anton.madsen@miracle.fi	+358 07131838	2000-01-07	SNRCONS	6260.00	40	400
815	Rikke	Pedersen	rikke.pedersen@miracle42.dk	+45 02520208	2015-09-15	CONS	4130.00	34	100
817	Malthe	Andersen	malthe.andersen@miracle.fi	+358 09666015	2005-02-08	SNRCONS	7200.00	40	400
820	Elias	Christensen 	elias.christensen@miracle42.dk	+45 63544529	2016-02-28	TSC	4530.00	38	200
821	Saga	Jensen	saga.jensen@mentorit.dk	+45 31881713	2011-09-10	SNRTSC	4130.00	47	800
822	Silas	Nielsen	silas.nielsen@emineo.se	+46 61325957	2009-01-27	CONS	4660.00	41	500
824	Anne	Nielsen	anne.nielsen@emineo.se	+46 88428218	2007-09-22	SNRCONS	5200.00	41	500
825	Mohammad	Pedersen	mohammad.pedersen@miracle42.dk	+45 91970284	1995-06-01	CONS	3600.00	52	1000
826	Caroline	Jensen	caroline.jensen@miracle.fi	+358 43014425	2018-01-10	SNRCONS	7200.00	40	400
827	Ellen	Christensen 	ellen.christensen@miracle42.dk	+45 63449426	2017-11-23	TSC	3730.00	52	1000
828	Josefine	Sørensen	josefine.sorensen@progressive.dk	+45 88111131	2018-04-27	SNRTSC	5730.00	43	700
829	Lasse	Madsen	lasse.madsen@mentorit.dk	+45 99756286	1998-09-12	CONS	4660.00	51	900
830	Gustav	Pedersen	gustav.pedersen@progressive.dk	+45 37691965	1997-02-01	SNRCONS	5460.00	43	700
831	Rasmus	Sørensen	rasmus.sorensen@mentorit.dk	+45 50535118	1997-06-28	CONS	4400.00	51	900
832	Ellen	Nielsen	ellen.nielsen@emineo.se	+46 95929246	2018-01-28	SNRCONS	5460.00	41	500
833	Thomas	Petersen	thomas.petersen@addpro.dk	+45 22603564	1998-09-18	TSC	4400.00	42	600
835	Cecilie	Jensen	cecilie.jensen@miracle42.dk	+45 09241493	1991-09-09	SNRTSC	5060.00	53	1100
836	Matheo	Nielsen	matheo.nielsen@mentorit.dk	+45 16146115	1998-03-07	CONS	5460.00	47	800
841	Villum	Christensen 	villum.christensen@emineo.se	+46 51548306	2013-07-23	SNRCONS	4930.00	41	500
842	Emilie	Larsen	emilie.larsen@emineo.se	+46 04244259	2015-01-27	CONS	5730.00	41	500
843	Henrik	Andersen	henrik.andersen@miracle42.dk	+45 85899546	2018-03-10	SNRCONS	6530.00	52	1000
844	Katrine	Nielsen	katrine.nielsen@progressive.dk	+45 51357247	2013-06-30	TSC	2800.00	43	700
845	August	Hansen	august.hansen@progressive.dk	+45 50163377	2016-07-12	SNRTSC	4800.00	43	700
846	Sebastian	Nielsen	sebastian.nielsen@miracle42.dk	+45 19683447	1996-01-13	CONS	3860.00	53	1100
848	Malou	Andersen	malou.andersen@mentorit.dk	+45 78400535	2012-03-19	SNRCONS	5600.00	47	800
849	Lars	Petersen	lars.petersen@miracle42.dk	+45 15194580	1998-10-07	CONS	4130.00	38	200
850	Lucas	Pedersen	lucas.pedersen@addpro.dk	+45 83777639	2015-02-14	SNRCONS	5200.00	42	600
851	Mille	Hansen	mille.hansen@progressive.dk	+45 09641602	1994-10-25	TSC	4000.00	43	700
852	Dennis	Jensen	dennis.jensen@mentorit.dk	+45 45381382	1997-03-17	SNRTSC	5060.00	47	800
860	Jonathan	Sørensen	jonathan.sorensen@mentorit.dk	+45 54602750	2005-06-11	SNRCONS	5600.00	51	900
861	Line	Christiansen	line.christiansen@addpro.dk	+45 91306571	1996-09-12	CONS	4930.00	42	600
862	Mads	Sørensen	mads.sorensen@mentorit.dk	+45 63749268	2017-12-06	SNRCONS	5460.00	51	900
863	Jens	Johansen	jens.johansen@emineo.se	+46 53073836	2012-06-07	TSC	4000.00	41	500
864	Villads	Nielsen	villads.nielsen@mentorit.dk	+45 08467571	2017-12-06	SNRTSC	5060.00	51	900
865	Anna	Nielsen	anna.nielsen@progressive.dk	+45 51185376	2013-07-11	CONS	3330.00	43	700
866	Michelle	Rasmussen	michelle.rasmussen@emineo.se	+46 51631858	2014-04-14	SNRCONS	6260.00	41	500
873	Lily	Thomsen	lily.thomsen@addpro.dk	+45 41741435	2018-08-01	CONS	3460.00	42	600
874	Jakob	Andersen	jakob.andersen@progressive.dk	+45 55996601	2018-08-02	SNRCONS	5730.00	43	700
876	Trine	Andersen	trine.andersen@miracle42.dk	+45 71593399	2005-03-23	TSC	4530.00	52	1000
878	Sarah	Nielsen	sarah.nielsen@addpro.dk	+45 99641635	2012-10-01	SNRTSC	4000.00	42	600
881	Elliot	Nielsen	elliot.nielsen@miracle42.dk	+45 44412872	2011-07-02	CONS	3460.00	52	1000
882	Liva	Pedersen	liva.pedersen@miracle42.dk	+45 90159490	2004-05-27	SNRCONS	6000.00	52	1000
885	Silas	Madsen	silas.madsen@miracle42.dk	+45 46571519	2011-01-05	CONS	5600.00	52	1000
886	Nicoline	Kristensen	nicoline.kristensen@mentorit.dk	+45 82963756	1992-10-10	SNRCONS	5600.00	51	900
887	Daniel	Andersen	daniel.andersen@progressive.dk	+45 29998711	1994-04-25	TSC	3060.00	43	700
890	Sofie	Hansen	sofie.hansen@emineo.se	+46 54303209	1995-10-04	SNRTSC	3860.00	41	500
895	Karla	Jensen	karla.jensen@addpro.dk	+45 47275264	1991-10-18	CONS	4260.00	42	600
896	Felix	Rasmussen	felix.rasmussen@miracle42.dk	+45 44538899	1992-04-21	SNRCONS	5860.00	52	1000
898	Jesper	Larsen	jesper.larsen@emineo.se	+46 79101209	2000-12-10	CONS	5330.00	39	300
902	Lasse	Johansen	lasse.johansen@emineo.se	+46 13234188	2001-05-16	TSC	4400.00	39	300
905	Astrid	Olsen	astrid.olsen@mentorit.dk	+45 88229015	2012-05-13	SNRTSC	4130.00	47	800
906	Lily	Hansen	lily.hansen@emineo.se	+46 66582386	1996-09-25	CONS	4260.00	39	300
910	Nicoline	Andersen	nicoline.andersen@progressive.dk	+45 23366998	2014-09-16	SNRCONS	6930.00	43	700
911	August	Thomsen	august.thomsen@emineo.se	+46 34603105	1999-02-15	CONS	4400.00	41	500
912	Jacob	Sørensen	jacob.sorensen@miracle.fi	+358 95689865	2010-08-21	SNRCONS	6930.00	40	400
914	Milas	Rasmussen	milas.rasmussen@emineo.se	+46 49583595	2012-02-29	TSC	4660.00	41	500
915	Thea	Hansen	thea.hansen@mentorit.dk	+45 76142525	2006-07-16	SNRTSC	4530.00	51	900
916	Mohammad	Jørgensen 	mohammad.jorgensen@miracle42.dk	+45 76876438	2008-05-23	CONS	3600.00	52	1000
917	Simon	Rasmussen	simon.rasmussen@mentorit.dk	+45 49150569	2013-06-29	SNRCONS	4660.00	51	900
918	Lars	Nielsen	lars.nielsen@miracle42.dk	+45 76263013	2008-11-30	CONS	4260.00	34	100
919	Amanda	Nielsen	amanda.nielsen@emineo.se	+46 77246716	2009-10-15	SNRCONS	5460.00	41	500
923	Malene	Andersen	malene.andersen@emineo.se	+46 08020887	2015-05-07	TSC	3860.00	41	500
928	Søren	Hansen	soren.hansen@mentorit.dk	+45 29965993	2006-03-01	SNRTSC	3600.00	51	900
929	Esther	Sørensen	esther.sorensen@emineo.se	+46 38694026	2020-02-14	CONS	5600.00	41	500
930	Cecilie	Pedersen	cecilie.pedersen@miracle42.dk	+45 27869424	2001-02-28	SNRCONS	4930.00	34	100
931	Trine	Pedersen	trine.pedersen@emineo.se	+46 22658628	2018-02-18	CONS	3860.00	39	300
934	Benjamin	Hansen	benjamin.hansen@emineo.se	+46 44985424	1994-02-27	SNRCONS	5730.00	39	300
935	Natasja	Pedersen	natasja.pedersen@miracle.fi	+358 91091911	2018-12-17	TSC	5060.00	40	400
938	Morten	Pedersen	morten.pedersen@miracle42.dk	+45 46859444	2017-01-09	SNRTSC	4130.00	38	200
940	Maria	Nielsen	maria.nielsen@miracle42.dk	+45 86296693	2016-08-27	CONS	3460.00	38	200
941	Mia	Hansen	mia.hansen@progressive.dk	+45 18290593	2004-09-12	SNRCONS	4800.00	43	700
947	Anne	Madsen	anne.madsen@miracle.fi	+358 53029060	1991-10-25	CONS	4400.00	40	400
953	Martin	Larsen	martin.larsen@emineo.se	+46 49170434	1998-08-12	SNRCONS	6000.00	41	500
954	Thor	Knudsen	thor.knudsen@progressive.dk	+45 99737566	2019-05-24	TSC	4130.00	43	700
956	Charlotte	Jensen	charlotte.jensen@miracle42.dk	+45 48983493	2013-08-23	SNRTSC	3330.00	53	1100
964	Konrad	Petersen	konrad.petersen@miracle42.dk	+45 45755978	1996-09-15	CONS	3730.00	38	200
965	Otto	Møller	otto.moller@mentorit.dk	+45 92196340	1991-12-01	SNRCONS	5330.00	51	900
966	Aksel	Larsen	aksel.larsen@miracle.fi	+358 23304624	2016-06-28	CONS	3860.00	40	400
968	Amanda	Jørgensen 	amanda.jorgensen@progressive.dk	+45 15614343	1990-06-11	SNRCONS	6130.00	43	700
969	Lea	Kristensen	lea.kristensen@miracle.fi	+358 42761473	1992-03-29	TSC	3460.00	40	400
970	Liv	Poulsen	liv.poulsen@miracle42.dk	+45 56375567	2010-12-27	SNRTSC	4930.00	52	1000
976	Christina	Hansen	christina.hansen@miracle42.dk	+45 24116765	2020-09-30	CONS	5600.00	52	1000
981	Albert	Jensen	albert.jensen@mentorit.dk	+45 69165404	2005-01-27	SNRCONS	6000.00	51	900
982	Heidi	Madsen	heidi.madsen@emineo.se	+46 89396824	2006-03-28	CONS	4530.00	39	300
983	Marcus	Andersen	marcus.andersen@miracle42.dk	+45 82309264	2013-10-20	SNRCONS	6400.00	38	200
984	Kenneth	Nielsen	kenneth.nielsen@progressive.dk	+45 34206448	2003-10-12	TSC	4800.00	43	700
985	Anton	Nielsen	anton.nielsen@emineo.se	+46 19298750	1993-08-22	SNRTSC	5730.00	41	500
987	Nohr	Olsen	nohr.olsen@progressive.dk	+45 95348027	1995-02-03	CONS	5860.00	43	700
988	Julie	Sørensen	julie.sorensen@miracle42.dk	+45 80456943	2004-08-19	SNRCONS	6400.00	53	1100
991	Hugo	Kristensen	hugo.kristensen@emineo.se	+46 43693339	2014-04-01	CONS	3860.00	39	300
992	Agnes	Larsen	agnes.larsen@miracle42.dk	+45 97070564	1991-10-27	SNRCONS	6660.00	52	1000
993	Ida	Andersen	ida.andersen@miracle42.dk	+45 52305220	2017-09-04	TSC	4930.00	38	200
996	Søren	Olsen	soren.olsen@miracle42.dk	+45 74358770	2002-11-19	SNRTSC	4130.00	52	1000
997	William	Larsen	william.larsen@miracle.fi	+358 10698601	1992-10-18	CONS	4660.00	40	400
998	Patrick	Knudsen	patrick.knudsen@miracle42.dk	+45 63687210	1993-08-09	SNRCONS	6130.00	34	100
999	Gry	Petersen	gry.petersen@addpro.dk	+45 92898195	1992-10-20	CONS	4800.00	42	600
899	Erik	Sørensen	erik.sorensen@miracle42.dk	+45 73114304	1995-12-14	SNRCONS	5600.00	34	100
488	Frida	Jørgensen 	frida.jorgensen@miracle42.dk	+45 60429231	1994-01-19	TSC	5060.00	34	100
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: hr
--

COPY public.jobs (job_id, job_title, min_salary, max_salary) FROM stdin;
CONS	Consultant	3330	6000
SNRCONS	Senior Consultant	4660	7330
MGR	Manager	5330	8000
SNRMGR	Senior Manager	6660	9330
TSC	Test Consultant	2660	5330
SNRTSC	Senior Test Consultant	3330	6000
CMGR	Country Manager	7330	10000
CEO	Chief Executive Officer	8660	13330
\.


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: hr
--

COPY public.locations (loc_id, street_address, postal_code, city, country_id) FROM stdin;
5	Mileparken 22b	2740	Skovlunde	DK
6	Lindevej 8	6710	Esbjerg	DK
7	Lyskær 3B	2730	Herlev	DK
8	Kolding park 8A 5. sal	6000	Kolding	DK
4	Karlsbodavagen 41	16867	Bromma	SE
1	Hermannin rantatie 12	580	Helsinki	FI
2	Søndervangs Allé 20	8260	Viby J	DK
3	Borupvang 5C	2750	Ballerup	DK
\.


--
-- Name: employee_id; Type: SEQUENCE SET; Schema: public; Owner: hr
--

SELECT pg_catalog.setval('public.employee_id', 1052, true);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: hr
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (country_id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: hr
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (department_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: hr
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (employee_id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: hr
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (job_id);


--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: hr
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (loc_id);


--
-- Name: departments_locations; Type: INDEX; Schema: public; Owner: hr
--

CREATE INDEX departments_locations ON public.departments USING btree (loc_id);


--
-- Name: employees_departments; Type: INDEX; Schema: public; Owner: hr
--

CREATE INDEX employees_departments ON public.employees USING btree (department_id);


--
-- Name: locations_fkey_countries; Type: INDEX; Schema: public; Owner: hr
--

CREATE INDEX locations_fkey_countries ON public.locations USING btree (country_id);


--
-- Name: employees employeepreinsert; Type: TRIGGER; Schema: public; Owner: hr
--

CREATE TRIGGER employeepreinsert BEFORE INSERT ON public.employees FOR EACH ROW EXECUTE FUNCTION public.setprimaryemployeeid();


--
-- PostgreSQL database dump complete
--

