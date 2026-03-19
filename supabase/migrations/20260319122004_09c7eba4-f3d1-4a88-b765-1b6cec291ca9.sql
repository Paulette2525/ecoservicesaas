
CREATE POLICY "Authenticated users can upload demand attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'demand-attachments');

CREATE POLICY "Authenticated users can view demand attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'demand-attachments');

CREATE POLICY "Authenticated users can delete own demand attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'demand-attachments');
