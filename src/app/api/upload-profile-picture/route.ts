import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    const data = await request.formData();
    console.log('FormData received:', data);

    const file: File | null = data.get('file') as unknown as File;
    console.log('File received:', file?.name, file?.size, file?.type);

    if (!file) {
      console.log('No file received');
      return NextResponse.json({ error: 'No file received' }, { status: 400 });
    }

    // Validate file type - allow common image types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type) && !file.type.startsWith('image/')) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ error: 'File must be an image (JPEG, PNG, GIF, WebP, SVG)' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    // Generate unique filename
    const fileNameParts = file.name.split('.');
    const extension = fileNameParts.length > 1 ? fileNameParts.pop() : 'jpg';
    const filename = `${randomUUID()}.${extension}`;
    console.log('Generated filename:', filename);

    // Ensure directory exists
    const uploadDir = join(process.cwd(), 'public', 'assets', 'images');
    console.log('Upload directory:', uploadDir);
    await mkdir(uploadDir, { recursive: true });

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(uploadDir, filename);
    console.log('Saving to:', filepath);

    await writeFile(filepath, buffer);
    console.log('File saved successfully');

    // Return the public URL
    const url = `/assets/images/${filename}`;
    console.log('Returning URL:', url);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}