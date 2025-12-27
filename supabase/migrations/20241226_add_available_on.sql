-- Add available_on column to store which streaming platform each recommendation is available on
ALTER TABLE recommendations 
ADD COLUMN available_on TEXT;


