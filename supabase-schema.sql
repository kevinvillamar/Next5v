-- Run this SQL in your Supabase SQL Editor to create the gallery_images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow anonymous read" ON gallery_images
  FOR SELECT USING (true);

-- Allow anonymous insert
CREATE POLICY "Allow anonymous insert" ON gallery_images
  FOR INSERT WITH CHECK (true);

-- Allow anonymous update
CREATE POLICY "Allow anonymous update" ON gallery_images
  FOR UPDATE USING (true);

-- Allow anonymous delete
CREATE POLICY "Allow anonymous delete" ON gallery_images
  FOR DELETE USING (true);