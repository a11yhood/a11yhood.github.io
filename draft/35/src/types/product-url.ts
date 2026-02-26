export interface ProductUrl {
  id: string;
  productId: string;
  url: string;
  description?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductUrlCreate {
  url: string;
  description?: string;
}

export interface ProductUrlUpdate {
  url?: string;
  description?: string;
}
