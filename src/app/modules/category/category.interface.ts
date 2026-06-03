import { Types } from "mongoose";

export interface ICategory {
  name: string;
  slug: string;
  description?: string;
  parentCategory?: Types.ObjectId | string | null;
  icon?: string;
  image: string;
  banner?: string;
  status?: "active" | "inactive";
  order?: number | string;
  isFeatured?: boolean;
  showInHome?: boolean;
  showInMenu?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  isDeleted: boolean;
}
