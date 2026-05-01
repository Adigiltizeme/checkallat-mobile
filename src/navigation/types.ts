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
  Home: undefined;
  Transport: undefined;
  History: undefined;
  Profile: undefined;
};

export type ProfileStackParamList = {
  ProfileHome: undefined;
  EditProfile: undefined;
  Addresses: undefined;
  Language: undefined;
  Support: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  SearchPros: { category?: string };
  ProDetail: { proId: string };
  CreateBooking: { proId: string };
  CreateTransport: undefined;
  MarketplaceHome: undefined;
  ProductDetail: { productId: string };
  Cart: undefined;
  Checkout: undefined;
};

// Import types for Transport
import { Step1Data, Step2Data, Step3Data, Step4Data } from '../types/transport';

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
  PaymentDetails: { paymentId?: string; requestId?: string };
  Support: undefined;
};
