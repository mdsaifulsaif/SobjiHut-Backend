import { Request, Response } from "express";
import { BrandServices } from "./brand.service";

// ক্রিয়েট ব্র্যান্ড
const createBrand = async (req: Request, res: Response) => {

  try {
    const result = await BrandServices.createBrandIntoDB(req.body, req.file);
    res
      .status(201)
      .json({
        success: true,
        message: "Brand created successfully!",
        data: result,
      });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// সব ব্র্যান্ড গেট করা (Pagination & Search)
const getAllBrands = async (req: Request, res: Response) => {
  try {
    const result = await BrandServices.getAllBrandsFromDB(req.query);
    res.status(200).json({
      success: true,
      message: "Brands fetched successfully!",
      meta: result.meta,
      data: result.data,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ব্র্যান্ড আপডেট করা
const updateBrand = async (req: Request, res: Response) => {
  try {
    const result = await BrandServices.updateBrandInDB(
      req.params.id as string,
      req.body,
      req.file,
    );
    res
      .status(200)
      .json({
        success: true,
        message: "Brand updated successfully!",
        data: result,
      });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getSingleBrand = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await BrandServices.getSingleBrandFromDB(id as string);
    
    res.status(200).json({
      success: true,
      message: "Brand retrieved successfully!",
      data: result,
    });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};



// ব্র্যান্ড ডিলিট করা
const deleteBrand = async (req: Request, res: Response) => {
  try {
    await BrandServices.deleteBrandFromDB(req.params.id as string);
    res
      .status(200)
      .json({ success: true, message: "Brand deleted successfully!" });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const BrandControllers = {
  createBrand,
  getAllBrands,
  updateBrand,
  getSingleBrand,
  deleteBrand,
};
