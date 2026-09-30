export type FulfillmentType = 'checkallpack' | 'transport' | 'seller_delivery' | 'pickup';

export type MarketplaceOrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'in_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled';

export interface MarketplaceDomain {
  id: string;
  slug: string;
  nameFr: string;
  nameEn: string;
  nameAr: string;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
  requiresHealthCertificate: boolean;
  requiresColdChain: boolean;
  children?: MarketplaceDomain[];
}

export type OpeningHours = Record<string, Array<{ open: string; close: string }>>;

export interface MarketplaceSection {
  id: string;
  name: string;
  nameEn: string | null;
  nameAr: string | null;
  order: number;
  isActive: boolean;
  _count?: { products: number };
}

export interface MarketplaceProduct {
  id: string;
  sellerId: string;
  name: string;
  nameAr: string;
  nameEn: string | null;
  description: string;
  descriptionAr: string;
  descriptionEn: string | null;
  categoryId: string | null;
  sectionId: string | null;
  images: string[];
  price: number;
  compareAtPrice: number | null;
  currency: string;
  hasStock: boolean;
  stockQuantity: number | null;
  lowStockThreshold: number | null;
  weight: number | null;
  isAvailable: boolean;
  isFeatured: boolean;
  allergens: string[];
  isVegetarian: boolean;
  isVegan: boolean;
  isHalal: boolean;
  averageRating: number;
  orderCount: number;
  section?: { id: string; name: string; nameEn?: string | null; nameAr?: string | null } | null;
  domain?: { id: string; nameFr: string; nameEn: string; nameAr: string; requiresColdChain?: boolean } | null;
  seller?: Partial<MarketplaceShop>;
  reviews?: Array<{ id: string; rating: number; comment: string | null; createdAt: string; sellerResponse: string | null }>;
}

export interface MarketplaceShop {
  id: string;
  businessName: string;
  businessType: string;
  description: string;
  logo: string | null;
  bannerUrl: string | null;
  address: string;
  addressLat: number;
  addressLng: number;
  offersPickup: boolean;
  offersDelivery: boolean;
  sellerDeliveryFee: number | null;
  deliveryRadius: number | null;
  preparationTimeMin: number;
  openingHours: OpeningHours | null;
  isTemporarilyClosed: boolean;
  pickupInstructions?: string | null;
  averageRating: number;
  totalSales: number;
  countryId: string | null;
  domains: Array<Pick<MarketplaceDomain, 'id' | 'slug' | 'nameFr' | 'nameEn' | 'nameAr' | 'icon'>>;
  sections?: MarketplaceSection[];
  products?: MarketplaceProduct[];
}

export interface SellerShop extends MarketplaceShop {
  userId: string;
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'deleted';
  rejectionReason: string | null;
  healthCertificate: string | null;
  licenseNumber: string | null;
  pendingPayoutAmount: number;
  totalPayoutReceived: number;
}

export interface SellerStats {
  pendingOrders: number;
  activeOrders: number;
  completedLast30Days: number;
  netRevenueLast30Days: number;
  pendingPayoutAmount: number;
  totalPayoutReceived: number;
  averageRating: number;
  totalSales: number;
}

export interface FulfillmentOption {
  type: FulfillmentType;
  available: boolean;
  fee: number;
  reason?: 'NOT_OFFERED' | 'ADDRESS_REQUIRED' | 'OUT_OF_RADIUS' | 'OUT_OF_COURIER_LIMITS' | 'WITHIN_COURIER_LIMITS' | 'PRICING_UNAVAILABLE';
}

export interface MarketplaceQuote {
  sellerId: string;
  subtotal: number;
  totalWeightKg: number;
  distanceKm: number | null;
  currency: string;
  fulfillmentOptions: FulfillmentOption[];
}

export interface CheckoutPayload {
  sellerId: string;
  items: Array<{ productId: string; quantity: number; specialNotes?: string }>;
  fulfillmentType: FulfillmentType;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryInstructions?: string;
}

export interface MarketplaceOrder {
  id: string;
  clientId: string;
  sellerId: string;
  status: MarketplaceOrderStatus;
  fulfillmentType: FulfillmentType;
  deliveryAddress: string | null;
  deliveryInstructions: string | null;
  deliveryFee: number;
  deliveryDistanceKm: number | null;
  totalWeightKg: number | null;
  pickupCode: string | null;
  subtotal: number;
  totalAmount: number;
  currency: string;
  sellerNetAmount: number;
  commissionAmount: number;
  cancellationReason: string | null;
  cancelledBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
  preparingAt: string | null;
  readyAt: string | null;
  deliveredAt: string | null;
  /** Clôture automatique si le client ne confirme pas (commande livrée) */
  autoCompleteAt?: string | null;
  /** Fin du délai de réclamation */
  claimDeadline?: string | null;
  hasOpenClaim?: boolean;
  completedAt: string | null;
  cancelledAt: string | null;
  transportRequestId: string | null;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    specialNotes: string | null;
    product: { id: string; name: string; nameAr: string; nameEn: string | null; images: string[]; weight: number | null };
  }>;
  seller: {
    id: string;
    businessName: string;
    logo: string | null;
    address: string;
    addressLat: number;
    addressLng: number;
    pickupInstructions: string | null;
    preparationTimeMin: number;
  };
  client: { id: string; firstName: string; lastName: string };
  transportRequest: {
    id: string;
    status: string;
    vehicleCategory: string;
    driver: {
      id: string;
      vehicleType: string;
      averageRating: number;
      currentLat: number | null;
      currentLng: number | null;
      user: { firstName: string; lastName: string; profilePicture: string | null };
    } | null;
  } | null;
}

export interface SellerApplicationPayload {
  businessName: string;
  businessType?: string;
  description: string;
  logo?: string;
  bannerUrl?: string;
  domainIds: string[];
  address: string;
  addressLat: number;
  addressLng: number;
  offersPickup?: boolean;
  offersDelivery?: boolean;
  sellerDeliveryFee?: number;
  deliveryRadius?: number;
  pickupInstructions?: string;
  preparationTimeMin?: number;
  openingHours?: OpeningHours;
  licenseNumber?: string;
  healthCertificate?: string;
  idDocumentType: string;
  idDocumentFront: string;
  idDocumentBack?: string;
  selfiePhoto: string;
  countryCode?: string;
}

export type ShopSettingsPayload = Partial<Omit<SellerApplicationPayload, 'idDocumentType' | 'idDocumentFront' | 'idDocumentBack' | 'selfiePhoto' | 'countryCode' | 'domainIds'>> & {
  isTemporarilyClosed?: boolean;
};

export interface ProductPayload {
  name: string;
  nameAr?: string;
  nameEn?: string;
  description: string;
  descriptionAr?: string;
  descriptionEn?: string;
  categoryId: string;
  sectionId?: string | null;
  images: string[];
  price: number;
  compareAtPrice?: number | null;
  hasStock: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  weight: number;
  isAvailable?: boolean;
  allergens?: string[];
  isVegetarian?: boolean;
  isVegan?: boolean;
  isHalal?: boolean;
}

/** Nom localisé d'un objet portant des variantes FR (par défaut) / EN / AR */
export function localizedName(
  item: { name?: string; nameFr?: string; nameEn?: string | null; nameAr?: string | null } | null | undefined,
  language: string,
): string {
  if (!item) return '';
  const base = item.nameFr ?? item.name ?? '';
  if (language === 'ar') return item.nameAr || base;
  if (language === 'en') return item.nameEn || base;
  return base;
}

export function localizedDescription(
  product: Pick<MarketplaceProduct, 'description' | 'descriptionAr' | 'descriptionEn'>,
  language: string,
): string {
  if (language === 'ar') return product.descriptionAr || product.description;
  if (language === 'en') return product.descriptionEn || product.description;
  return product.description;
}
