/*
  # Create Shared Text Files Table

  1. New Tables
    - `shared_text_files`
      - `id` (uuid, primary key) - Unique identifier for each text file
      - `title` (text, required) - Title/name of the text file
      - `content` (text, required) - The actual text content (encrypted)
      - `description` (text, optional) - Description or notes about the file
      - `file_type` (text, default 'plaintext') - Type of content (plaintext, code, markdown, etc.)
      - `environment` (text, required) - Environment tag (dev, qa, prod)
      - `tags` (text array, optional) - Custom tags for organization
      - `created_by` (uuid, required) - User who created the file
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on `shared_text_files` table
    - Add policy for authenticated users to read all text files
    - Add policy for authenticated users to create text files
    - Add policy for creators and admins to update their text files
    - Add policy for creators and admins to delete their text files

  3. Important Notes
    - Text content will be encrypted for security
    - All authenticated users can view shared text files
    - Only creators and admins can modify/delete text files
    - Audit logs will track all access and modifications
*/

CREATE TABLE IF NOT EXISTS shared_text_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  description text,
  file_type text DEFAULT 'plaintext',
  environment text NOT NULL CHECK (environment IN ('dev', 'qa', 'prod')),
  tags text[],
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shared_text_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all text files"
  ON shared_text_files
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create text files"
  ON shared_text_files
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators and admins can update text files"
  ON shared_text_files
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Creators and admins can delete text files"
  ON shared_text_files
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_shared_text_files_created_by ON shared_text_files(created_by);
CREATE INDEX IF NOT EXISTS idx_shared_text_files_environment ON shared_text_files(environment);
CREATE INDEX IF NOT EXISTS idx_shared_text_files_created_at ON shared_text_files(created_at DESC);

DROP TRIGGER IF EXISTS update_shared_text_files_updated_at ON shared_text_files;
CREATE TRIGGER update_shared_text_files_updated_at
  BEFORE UPDATE ON shared_text_files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
