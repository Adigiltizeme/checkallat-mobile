import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useTranslation } from 'react-i18next';
import { SellerStackParamList } from './types';
import { useAppTheme } from '../theme/ThemeProvider';
import { defaultStackScreenOptions } from './stackOptions';

import { SellerDashboardScreen } from '../screens/seller/SellerDashboardScreen';
import { SellerOrdersScreen } from '../screens/seller/SellerOrdersScreen';
import { SellerOrderDetailsScreen } from '../screens/seller/SellerOrderDetailsScreen';
import { SellerProductsScreen } from '../screens/seller/SellerProductsScreen';
import { SellerProductFormScreen } from '../screens/seller/SellerProductFormScreen';
import { SellerSectionsScreen } from '../screens/seller/SellerSectionsScreen';
import { SellerShopSettingsScreen } from '../screens/seller/SellerShopSettingsScreen';
import { MarketplaceShopScreen } from '../screens/marketplace/MarketplaceShopScreen';
import { ProductDetailScreen } from '../screens/marketplace/ProductDetailScreen';
import { TransportTrackingScreen } from '../screens/transport/TransportTrackingScreen';
import { BookingChatScreen } from '../screens/services/BookingChatScreen';

const Stack = createStackNavigator<SellerStackParamList>();

/** Écrans communs aux trois onglets vendeur ; seul l'écran d'accueil de l'onglet change */
const SellerStack = ({ initialRouteName }: { initialRouteName: keyof SellerStackParamList }) => {
  const { t } = useTranslation();
  const { tokens } = useAppTheme();
  return (
    <Stack.Navigator initialRouteName={initialRouteName} screenOptions={defaultStackScreenOptions(tokens)}>
      <Stack.Screen name="SellerDashboard" component={SellerDashboardScreen} options={{ title: t('seller.dashboard_title') }} />
      <Stack.Screen name="SellerOrdersList" component={SellerOrdersScreen} options={{ title: t('seller.orders_title') }} />
      <Stack.Screen name="SellerOrderDetails" component={SellerOrderDetailsScreen} options={{ title: t('seller.order_details_title') }} />
      <Stack.Screen name="SellerProducts" component={SellerProductsScreen} options={{ title: t('seller.products_title') }} />
      <Stack.Screen
        name="SellerProductForm"
        component={SellerProductFormScreen}
        options={({ route }) => ({ title: route.params?.productId ? t('seller.edit_product') : t('seller.add_product') })}
      />
      <Stack.Screen name="SellerSections" component={SellerSectionsScreen} options={{ title: t('seller.sections_title') }} />
      <Stack.Screen name="SellerShopSettings" component={SellerShopSettingsScreen} options={{ title: t('seller.menu_shop_settings') }} />
      <Stack.Screen name="MarketplaceShop" component={MarketplaceShopScreen} options={{ title: t('seller.menu_preview') }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: t('marketplace.product_title') }} />
      <Stack.Screen name="TransportTracking" component={TransportTrackingScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingChat" component={BookingChatScreen} options={({ route }) => ({ title: route.params.otherPartyName })} />
    </Stack.Navigator>
  );
};

export const SellerHomeStack = () => <SellerStack initialRouteName="SellerDashboard" />;
export const SellerOrdersStack = () => <SellerStack initialRouteName="SellerOrdersList" />;
export const SellerCatalogStack = () => <SellerStack initialRouteName="SellerProducts" />;
