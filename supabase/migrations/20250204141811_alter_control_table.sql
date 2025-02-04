alter table control_table
drop column value;


alter table control_table
add column if not exists min_threshold int not null default 0;


alter table control_table
add column if not exists max_threshold int not null default 0;