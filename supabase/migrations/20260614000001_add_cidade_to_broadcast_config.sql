ALTER TABLE broadcast_config ADD COLUMN cidade TEXT REFERENCES city_config(slug) ON DELETE SET NULL;
