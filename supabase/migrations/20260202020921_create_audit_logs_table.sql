/*
  # Create Audit Logs Table

  1. New Tables
    - `audit_logs`
      - `id` (uuid, primary key) - Unique identifier for each log entry
      - `user_id` (uuid, foreign key) - References auth.users, the user who performed the action
      - `action_type` (text) - Type of action performed (login, password_access, password_reveal)
      - `resource_id` (uuid, nullable) - References shared_passwords if applicable
      - `resource_name` (text, nullable) - Service name for easier searching
      - `metadata` (jsonb, nullable) - Additional metadata like IP address, user agent, etc.
      - `created_at` (timestamptz) - When the action occurred

  2. Security
    - Enable RLS on `audit_logs` table
    - Add policy for authenticated users to insert their own logs
    - Add policy for admins to read all logs
    - No one can update or delete logs (immutable audit trail)

  3. Indexes
    - Index on user_id for faster lookups
    - Index on action_type for filtering
    - Index on created_at for sorting
    - Index on resource_id for searching by resource
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_type text NOT NULL,
  resource_id uuid REFERENCES shared_passwords(id) ON DELETE SET NULL,
  resource_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Add check constraint for valid action types
ALTER TABLE audit_logs
ADD CONSTRAINT valid_action_type 
CHECK (action_type IN ('login', 'password_access', 'password_reveal'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_id ON audit_logs(resource_id);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can insert their own audit logs
CREATE POLICY "Users can insert own audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can read all audit logs
CREATE POLICY "Admins can read all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.is_admin = true
    )
  );

-- No update or delete policies - audit logs are immutable
