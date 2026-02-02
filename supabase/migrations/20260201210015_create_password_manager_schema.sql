/*
  # Password Manager Schema

  ## New Tables
  
  ### `user_profiles`
  - `id` (uuid, primary key, references auth.users)
  - `email` (text, not null)
  - `is_admin` (boolean, default false)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  
  ### `shared_passwords`
  - `id` (uuid, primary key, auto-generated)
  - `service_name` (text, not null)
  - `service_url` (text)
  - `username` (text)
  - `password` (text, encrypted)
  - `token` (text, encrypted)
  - `description` (text)
  - `expiration_date` (date)
  - `two_factor_enabled` (boolean, default false)
  - `created_by` (uuid, references user_profiles)
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  
  ## Security
  
  1. Enable RLS on all tables
  2. Enable pgcrypto extension for encryption
  3. Policies for user_profiles:
     - Users can read all profiles
     - Only admins can insert/update/delete profiles
  4. Policies for shared_passwords:
     - Authenticated users can read all shared passwords
     - Authenticated users can create shared passwords
     - Only creator or admin can update shared passwords
     - Only creator or admin can delete shared passwords
*/

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create shared_passwords table
CREATE TABLE IF NOT EXISTS shared_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  service_url text,
  username text,
  password text,
  token text,
  description text,
  expiration_date date,
  two_factor_enabled boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE shared_passwords ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles

-- All authenticated users can read user profiles
CREATE POLICY "Authenticated users can read user profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert user profiles
CREATE POLICY "Admins can insert user profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can update user profiles
CREATE POLICY "Admins can update user profiles"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Only admins can delete user profiles
CREATE POLICY "Admins can delete user profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for shared_passwords

-- All authenticated users can read shared passwords
CREATE POLICY "Authenticated users can read shared passwords"
  ON shared_passwords FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create shared passwords
CREATE POLICY "Authenticated users can create shared passwords"
  ON shared_passwords FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Creator or admin can update shared passwords
CREATE POLICY "Creator or admin can update shared passwords"
  ON shared_passwords FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Creator or admin can delete shared passwords
CREATE POLICY "Creator or admin can delete shared passwords"
  ON shared_passwords FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin)
  VALUES (NEW.id, NEW.email, false);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_shared_passwords_updated_at ON shared_passwords;
CREATE TRIGGER update_shared_passwords_updated_at
  BEFORE UPDATE ON shared_passwords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();