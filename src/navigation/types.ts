export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTP: { phone: string };
};

export type MainTabParamList = {
  // Client tabs
  Home: undefined;
  Search: undefined;
  Commandes: undefined;
  Messages: undefined;
  // Pro tabs
  Pro: undefined;
  ProDemandes: undefined;
  ProAgenda: undefined;
  ProMessages: undefined;
  // Driver tabs
  Transport: undefined;
  DriverAvailables: undefined;
  DriverAgenda: undefined;
  DriverMessages: undefined;
  // Shared
  History: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  Language: undefined;
  Appearance: undefined;
  Support: undefined;
  ChangePassword: undefined;
  ChangePhone: undefined;
  AddActivity: undefined;
  DriverApplication: undefined;
  DriverDocuments: undefined;
  ProApplication: undefined;
  MyProposals: undefined;
  ProposalDetail: { proposalId: string };
  SubmitProposal: undefined;
  PayoutAccounts: undefined;
  PayoutAccountForm: { accountId?: string } | undefined;
  ProOfferings: undefined;
};

export type ProStackParamList = {
  ProHome: undefined;
  ProBookingDetails: { bookingId: string };
  ProNavigation: { bookingId: string };
  ProOfferings: undefined;
  ProEarnings: undefined;
  ProReviews: { proId?: string };
  Support: undefined;
  BookingTracking: { bookingId: string; role: 'client' | 'pro' };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
  ProProofPhotos: { bookingId: string; type: 'before' | 'after'; nextAction: 'start' | 'complete'; isCash?: boolean };
  BookingDispute: { bookingId: string };
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  SearchPros: { category: string };
  ProDetail: { proId: string };
  CreateBooking: { proId: string; offeringId?: string };
  BookingDetails: { bookingId: string };
  MyBookings: undefined;
  MarketplaceHome: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  BookingRequestStep1: { categorySlug: string; categoryNameFr: string; categoryNameEn: string; categoryNameAr: string; prefill?: { clientDescription: string; categoryData: Record<string, string[]>; urgency?: 'normal' | 'urgent' }; step2Prefill?: BookingStep2Data };
  BookingRequestStep2: { categorySlug: string; step1Data: BookingStep1Data; step2Prefill?: BookingStep2Data };
  BookingRequestStep3: { categorySlug: string; step1Data: BookingStep1Data; step2Data: BookingStep2Data };
  BookingRequestStep4: { categorySlug: string; step1Data: BookingStep1Data; step2Data: BookingStep2Data; step3Data: BookingStep3Data };
  BookingRequestStep5: { categorySlug: string; step1Data: BookingStep1Data; step2Data: BookingStep2Data; step3Data: BookingStep3Data; step4Data: BookingStep4Data };
  BookingTracking: { bookingId: string; role: 'client' | 'pro' };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
  ProProofPhotos: { bookingId: string; type: 'before' | 'after'; nextAction: 'start' | 'complete'; isCash?: boolean };
  BookingDispute: { bookingId: string };
  TransportRequestStep1: { prefill?: { objectTypes: string[]; description: string; estimatedVolume: number }; step2Prefill?: Step2Data; step3Prefill?: Step3Data } | undefined;
  TransportRequestStep2: { step1Data: Step1Data; step2Prefill?: Step2Data; step3Prefill?: Step3Data };
  TransportRequestStep3: { step1Data: Step1Data; step2Data: Step2Data; step3Prefill?: Step3Data };
  TransportRequestStep4: { step1Data: Step1Data; step2Data: Step2Data; step3Data: Step3Data };
  TransportRequestStep5: { step1Data: Step1Data; step2Data: Step2Data; step3Data: Step3Data; step4Data: Step4Data };
  TransportTracking: { requestId: string };
  TransportDetails: { requestId: string };
  TransportCompletion: { requestId: string };
  CashValidation: { requestId: string; totalPrice: number };
  StripePayment: { requestId: string; amount: number; type: 'transport' | 'booking' | 'marketplace' };
  Dispute: { requestId: string };
};

// Import types for Transport
import { Step1Data, Step2Data, Step3Data, Step4Data } from '../types/transport';
import { BookingStep1Data, BookingStep2Data, BookingStep3Data, BookingStep4Data } from '../types/booking';

export type TransportStackParamList = {
  TransportList: undefined;
  TransportRequestStep1: undefined;
  TransportRequestStep2: { step1Data: Step1Data };
  TransportRequestStep3: { step1Data: Step1Data; step2Data: Step2Data };
  TransportRequestStep4: {
    step1Data: Step1Data;
    step2Data: Step2Data;
    step3Data: Step3Data;
  };
  TransportRequestStep5: {
    step1Data: Step1Data;
    step2Data: Step2Data;
    step3Data: Step3Data;
    step4Data: Step4Data;
  };
  TransportTracking: { requestId: string };
  TransportDetails: { requestId: string };
  TransportCompletion: { requestId: string };
  CashValidation: { requestId: string; totalPrice: number };
  StripePayment: {
    requestId: string;
    amount: number;
    type: 'transport' | 'booking' | 'marketplace';
  };
  PaymentHistory: undefined;
  PaymentDetails: { paymentId?: string; requestId?: string };
  Dispute: { requestId: string };
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
};



export type PaymentStackParamList = {
  PaymentHistory: undefined;
  PaymentDetails: { paymentId?: string; requestId?: string };
};

export type DriverStackParamList = {
  DriverHome: undefined;
  DriverAvailableRequests: undefined;
  DriverTransportDetails: { requestId: string };
  DriverDeliveryDetails: { requestId: string };
  DriverNavigation: { requestId: string };
  DriverProofPhotos: { requestId: string; type: 'before' | 'after'; nextStatus: string };
  DriverSignature: { requestId: string };
  DriverEarnings: undefined;
  DriverReviews: { driverId?: string };
  TransportCompletion: { requestId: string };
  CashValidation: { requestId: string; totalPrice: number };
  Dispute: { requestId: string };
  PaymentDetails: { paymentId?: string; requestId?: string };
  Support: undefined;
  BookingChat: { entityType: 'booking' | 'transport' | 'order'; entityId: string; otherPartyName: string };
};
