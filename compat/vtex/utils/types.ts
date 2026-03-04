export interface OrderFormItem {
  id: string;
  productId: string;
  name: string;
  skuName: string;
  imageUrl: string;
  detailUrl: string;
  price: number;
  listPrice: number;
  quantity: number;
  sellingPrice: number;
  seller: string;
  uniqueId: string;
  parentItemIndex?: number | null;
  parentAssemblyBinding?: string | null;
  availability?: string;
  measurementUnit?: string;
  unitMultiplier?: number;
  productRefId?: string;
  refId?: string;
}

export interface SimulationOrderForm {
  items: Array<{
    id: string;
    quantity: number;
    seller: string;
    price?: number;
    listPrice?: number;
    offerings?: any[];
    priceTags?: any[];
    availability?: string;
  }>;
  logisticsInfo?: Array<{
    itemIndex: number;
    slas: Sla[];
    selectedSla?: string;
    selectedDeliveryChannel?: string;
  }>;
  paymentData?: {
    installmentOptions?: any[];
  };
}

export interface Sla {
  id: string;
  name: string;
  price: number;
  shippingEstimate: string;
  deliveryChannel?: string;
}

export interface SKU {
  id: string;
  seller: string;
  quantity: number;
}

export interface Product {
  productId: string;
  productName: string;
  brand: string;
  categoryId: string;
  categories: string[];
  items: any[];
  [key: string]: any;
}
