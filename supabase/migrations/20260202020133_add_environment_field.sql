/*
  # Add Environment Field to Shared Passwords

  1. Changes
    - Add `environment` column to `shared_passwords` table
    - Set default value to 'dev'
    - Add check constraint to ensure only valid values (dev, qa, prod)
  
  2. Security
    - No changes to RLS policies needed
    - Maintains existing security model
*/

-- Add environment column to shared_passwords table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shared_passwords' AND column_name = 'environment'
  ) THEN
    ALTER TABLE shared_passwords 
    ADD COLUMN environment text NOT NULL DEFAULT 'dev';
    
    -- Add check constraint for valid environment values
    ALTER TABLE shared_passwords
    ADD CONSTRAINT valid_environment 
    CHECK (environment IN ('dev', 'qa', 'prod'));
  END IF;
END $$;
