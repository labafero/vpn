update posts set cidade = 'Neon' where cidade is null;

alter table posts alter column cidade set not null;
