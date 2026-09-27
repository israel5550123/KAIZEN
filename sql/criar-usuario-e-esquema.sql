create role kaizen login password :'senha' nosuperuser nocreatedb nocreaterole;
alter role kaizen set timezone = 'America/Fortaleza';
create schema kaizen authorization kaizen;
