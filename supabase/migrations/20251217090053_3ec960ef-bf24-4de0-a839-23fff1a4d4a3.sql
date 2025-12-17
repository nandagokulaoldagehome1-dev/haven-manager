-- Create storage bucket for resident photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('resident_photos', 'resident_photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload resident photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'resident_photos');

-- Allow authenticated users to update files
CREATE POLICY "Authenticated users can update resident photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'resident_photos');

-- Allow authenticated users to delete files
CREATE POLICY "Authenticated users can delete resident photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'resident_photos');

-- Allow public read access (since bucket is public)
CREATE POLICY "Public read access for resident photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'resident_photos');