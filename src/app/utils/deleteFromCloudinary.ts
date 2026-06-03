import cloudinary from '../config/cloudinary';

export const deleteFromCloudinary = async (public_id: string) => {
    try {
        await cloudinary.uploader.destroy(public_id);
    } catch (error) {
        console.error("Cloudinary Delete Error:", error);
    }
};