import { v2 as cloudinary } from 'cloudinary';

// Khởi tạo Cloudinary với cấu hình từ .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload buffer ảnh lên Cloudinary và sinh bộ ảnh 2 tầng:
 * 1. fullResUrl: Ảnh gốc độ phân giải cao phục vụ phóng to chẩn đoán lâm sàng
 * 2. thumbnailUrl: Ảnh tự động tối ưu WebP/AVIF (w_400, q_auto, f_auto) tải cực nhanh
 */
export async function uploadMedicalImage(buffer, { filename, folder = 'medical_quiz' } = {}) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        public_id: filename ? filename.replace(/\.[^/.]+$/, "") : undefined
      },
      (error, result) => {
        if (error) return reject(error);

        const secureUrl = result.secure_url;
        
        // Tạo URL thumbnail tối ưu qua Cloudinary URL transformation
        const thumbnailUrl = cloudinary.url(result.public_id, {
          width: 400,
          crop: 'limit',
          fetch_format: 'auto',
          quality: 'auto',
          secure: true
        });

        resolve({
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          fullResUrl: secureUrl,
          thumbnailUrl: thumbnailUrl
        });
      }
    );

    uploadStream.end(buffer);
  });
}

export { cloudinary };
