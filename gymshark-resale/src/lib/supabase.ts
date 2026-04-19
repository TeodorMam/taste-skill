export type Item = {
  id: string;
  title: string;
  image_url: string | null;
  size: string;
  price: number;
  condition: string;
  location: string;
  contact: string;
  is_sold: boolean;
  created_at: string;
};

export const BUCKET = "item-images";
