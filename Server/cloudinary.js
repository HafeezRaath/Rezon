import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';

// Railway variables setup
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'rezon_products', // Cloudinary par ye folder ban jayega
    allowedFormats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 800, height: 600, crop: 'fill' }] // OLX ads ke liye standard size
  },
});

export const upload = multer({ storage: storage });
export { cloudinary };