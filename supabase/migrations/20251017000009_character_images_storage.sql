-- Character image storage setup
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'character-images') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('character-images', 'character-images', true);
    END IF;
END $$;

-- Allow authenticated users to manage their character images
CREATE POLICY "Allow authenticated users to read character images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'character-images' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to upload their character images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

CREATE POLICY "Allow users to update their character images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    )
    WITH CHECK (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    );

CREATE POLICY "Allow users to delete their character images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'character-images'
        AND auth.role() = 'authenticated'
        AND split_part(name, '/', 1) = auth.uid()::text
    );
