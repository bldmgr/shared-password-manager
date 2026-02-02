/*
  # Fix Shared Passwords Delete Policy

  ## Changes
  1. Drop existing delete policy for shared_passwords
  2. Create new delete policy that properly handles:
     - Passwords created by the current user
     - Passwords with NULL created_by (orphaned passwords)
     - Admin users who can delete any password

  ## Security
  - Maintains security while allowing proper deletion
  - Admins can delete any password
  - Users can delete their own passwords
  - Orphaned passwords (created_by = NULL) can be deleted by admins
*/

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Creator or admin can delete shared passwords" ON shared_passwords;

-- Create improved delete policy
CREATE POLICY "Creator or admin can delete shared passwords"
  ON shared_passwords FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() OR
    (created_by IS NULL AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )) OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );
