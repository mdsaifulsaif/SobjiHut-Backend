export interface IUnit {
  name: string;        // উদাহরণ: Kilogram, Gram, Piece, Litre
  shortName: string;   // উদাহরণ: kg, gm, pcs, L
  isDeleted: boolean;  // সফট ডিলিটের জন্য
}