alter table items add column if not exists updated_at timestamptz;
update items set updated_at = created_at where updated_at is null;
alter table items alter column updated_at set not null;
alter table items alter column updated_at set default now();
