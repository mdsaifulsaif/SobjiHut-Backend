import { uploadToCloudinary } from "../../utils/uploadToCloudinary";
import { Setting } from "./setting.model";

const updateSettingsIntoDB = async (payload: any, files: any) => {
  const updateData = { ...payload };

  if (files) {

    if (files.logo && files.logo[0]) {
      const logoUpload: any = await uploadToCloudinary(
        files.logo[0].buffer, 
        "logos"
      );
      updateData.logo = logoUpload.url; 
    }

  
    if (files.favicon && files.favicon[0]) {
      const faviconUpload: any = await uploadToCloudinary(
        files.favicon[0].buffer,
        "favicons"
      );
      updateData.favicon = faviconUpload.url;
    }
  }


  if (payload.socialLinks && typeof payload.socialLinks === "string") {
    try {
      updateData.socialLinks = JSON.parse(payload.socialLinks);
    } catch (error) {
      console.log("Social Links JSON error");
    }
  }


  const result = await Setting.findOneAndUpdate(
    {}, 
    updateData, 
    {
      returnDocument: 'after', 
      upsert: true,
      runValidators: true,
    }
  );
  
  return result;
};
export const SettingServices = {
  updateSettingsIntoDB,
};