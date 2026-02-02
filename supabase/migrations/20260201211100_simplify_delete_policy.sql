/*
  # Simplify Delete Policy for Shared Passwords

  ## Changes
  1. Drop existing delete policy
  2. Create a simpler, more straightforward delete policy that:
     - Allows users to delete passwords they created (created_by = auth.uid())
     - Allows admins to delete any password
  
  ## Security
  - Maintains proper access control
  - Simplified logic for better reliability
*/

-- Drop the existing delete policy
DROP POLICY IF EXISTS "Creator or admin can delete shared passwords" ON shared_passwords;

-- Create simplified delete policy
CREATE POLICY "Users can delete own passwords, admins can delete any"
  ON shared_passwords FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR 
    (
      SELECT is_admin 
      FROM user_profiles 
      WHERE id = auth.uid()
    ) = true
  );
