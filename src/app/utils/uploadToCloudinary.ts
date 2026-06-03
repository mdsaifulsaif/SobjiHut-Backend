
import sharp from 'sharp';
import cloudinary from '../config/cloudinary';

export const uploadToCloudinary = async (fileBuffer: Buffer, folder: string) => {
  
  const optimizedBuffer = await sharp(fileBuffer)
    .resize({ width: 800, withoutEnlargement: true }) 
    .jpeg({ quality: 80 }) 
    .toBuffer();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: `glowly/${folder}` },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          public_id: result?.public_id,
          url: result?.secure_url,
        });
      }
    );
    uploadStream.end(optimizedBuffer);
  });
};