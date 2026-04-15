# API Fixes Required

**Date:** 2026-03-10
**Priority:** Critical to Low
**Total Fixes:** 4 groups

---

## Table of Contents

1. [Priority 1: Critical Fixes](#priority-1-critical-fixes)
2. [Priority 2: High Priority Fixes](#priority-2-high-priority-fixes)
3. [Priority 3: Medium Priority Enhancements](#priority-3-medium-priority-enhancements)
4. [Testing Checklist](#testing-checklist)

---

## Priority 1: Critical Fixes

### Fix 1: Correct getBookingStats HTTP Method

**Issue:** Using GET request with body parameter, which violates HTTP standards.

**Files Affected:**
- `mobile/src/store/api/bookingsApi.ts`
- `backend_checkallat/src/modules/bookings/bookings.controller.ts`

#### Mobile Fix (bookingsApi.ts)

**Location:** Lines 102-108

**Current Code (INCORRECT):**
```typescript
getBookingStats: builder.query({
  query: (role: 'client' | 'pro') => ({
    url: '/stats/me',
    method: 'GET',
    body: { role },  // ❌ GET with body is incorrect
  }),
}),
```

**Fixed Code (Option 1 - Use Query Parameter - RECOMMENDED):**
```typescript
/**
 * Récupérer les statistiques de réservations
 */
getBookingStats: builder.query({
  query: (role: 'client' | 'pro') => ({
    url: '/stats/me',
    params: { role },  // ✅ Use query parameter instead
  }),
}),
```

**Alternative Fix (Option 2 - Convert to POST):**
```typescript
/**
 * Récupérer les statistiques de réservations
 */
getBookingStats: builder.mutation({  // Change to mutation
  query: (role: 'client' | 'pro') => ({
    url: '/stats/me',
    method: 'POST',
    body: { role },
  }),
}),
```

#### Backend Fix (bookings.controller.ts)

**Location:** Lines 125-133

**Current Code (INCORRECT):**
```typescript
@Get('stats/me')
@ApiOperation({ summary: 'Get my booking statistics' })
@ApiResponse({ status: 200, description: 'Stats retrieved' })
async getMyStats(
  @CurrentUser() user: { id: string },
  @Body('role') role: 'client' | 'pro',  // ❌ GET with @Body is incorrect
) {
  return this.bookingsService.getBookingStats(user.id, role);
}
```

**Fixed Code (RECOMMENDED):**
```typescript
@Get('stats/me')
@ApiOperation({ summary: 'Get my booking statistics' })
@ApiResponse({ status: 200, description: 'Stats retrieved' })
async getMyStats(
  @CurrentUser() user: { id: string },
  @Query('role') role: 'client' | 'pro',  // ✅ Use @Query decorator
) {
  return this.bookingsService.getBookingStats(user.id, role);
}
```

#### Testing Steps

1. Update mobile API file
2. Update backend controller file
3. Test the endpoint with both client and pro roles:
   ```
   GET /bookings/stats/me?role=client
   GET /bookings/stats/me?role=pro
   ```
4. Verify statistics are returned correctly
5. Update any existing mobile components using this endpoint

#### Hook Usage Update

If you were using:
```typescript
const { data: stats } = useGetBookingStatsQuery('client');
```

This remains the same - the implementation change is internal.

---

## Priority 2: High Priority Fixes

### Fix 2: Add Missing Pro Endpoints

**Issue:** Three backend endpoints are not exposed in the mobile API.

**File:** `mobile/src/store/api/prosApi.ts`

#### Current Endpoints (Lines 17-47)

**Add these new endpoints after line 46:**

```typescript
    updateProProfile: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
    }),

    // ========== ADD THESE NEW ENDPOINTS ==========

    /**
     * Delete pro profile
     */
    deleteProProfile: builder.mutation({
      query: (id: string) => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
    }),

    /**
     * Validate or reject pro profile (Admin only)
     */
    validateProProfile: builder.mutation({
      query: ({ id, validated, reason }: {
        id: string;
        validated: boolean;
        reason?: string
      }) => ({
        url: `/${id}/validate`,
        method: 'PUT',
        body: { validated, reason },
      }),
    }),

    /**
     * Get pro statistics
     */
    getProStats: builder.query({
      query: (id: string) => `/${id}/stats`,
    }),
  }),
});
```

#### Update Exports (Lines 50-55)

**Current exports:**
```typescript
export const {
  useSearchProsQuery,
  useGetProByIdQuery,
  useCreateProProfileMutation,
  useUpdateProProfileMutation,
} = prosApi;
```

**Updated exports (ADD these lines):**
```typescript
export const {
  useSearchProsQuery,
  useGetProByIdQuery,
  useCreateProProfileMutation,
  useUpdateProProfileMutation,
  // New exports
  useDeleteProProfileMutation,
  useValidateProProfileMutation,
  useGetProStatsQuery,
} = prosApi;
```

#### Usage Examples

**Delete Pro Profile:**
```typescript
const [deletePro] = useDeleteProProfileMutation();

const handleDelete = async (proId: string) => {
  try {
    await deletePro(proId).unwrap();
    console.log('Pro profile deleted');
  } catch (error) {
    console.error('Failed to delete pro:', error);
  }
};
```

**Validate Pro Profile (Admin):**
```typescript
const [validatePro] = useValidateProProfileMutation();

const handleValidation = async (proId: string, approved: boolean) => {
  try {
    await validatePro({
      id: proId,
      validated: approved,
      reason: approved ? undefined : 'Does not meet requirements',
    }).unwrap();
    console.log('Pro validation updated');
  } catch (error) {
    console.error('Failed to validate pro:', error);
  }
};
```

**Get Pro Stats:**
```typescript
const { data: stats, isLoading } = useGetProStatsQuery(proId);

if (isLoading) return <Loading />;

return (
  <View>
    <Text>Total Bookings: {stats?.totalBookings}</Text>
    <Text>Rating: {stats?.averageRating}</Text>
    <Text>Completion Rate: {stats?.completionRate}%</Text>
  </View>
);
```

---

## Priority 3: Medium Priority Enhancements

### Enhancement 1: Add JSDoc Documentation

Add comprehensive documentation to all endpoints for better developer experience.

**Example - Update bookingsApi.ts:**

```typescript
export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_URL}/bookings`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  tagTypes: ['Booking'],
  endpoints: (builder) => ({
    /**
     * Create a new booking for a service
     * @param body - Booking details including proId, serviceId, scheduledFor, etc.
     * @returns Created booking object with status 'pending'
     * @throws 404 - If pro or service not found
     * @throws 400 - If booking data is invalid
     */
    createBooking: builder.mutation({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Booking'],
    }),

    // Continue for all endpoints...
  }),
});
```

### Enhancement 2: Add Error Handling

Add centralized error handling for better error messages:

```typescript
// Create a new file: mobile/src/store/api/baseQuery.ts

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { RootState } from '../index';
import { API_CONFIG } from '../../config/api';

const baseQuery = fetchBaseQuery({
  baseUrl: API_CONFIG.BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseQueryWithErrorHandling: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);

  if (result.error) {
    // Handle common errors
    if (result.error.status === 401) {
      // Handle unauthorized - maybe refresh token or logout
      console.error('Unauthorized - redirecting to login');
    } else if (result.error.status === 403) {
      console.error('Forbidden - insufficient permissions');
    } else if (result.error.status === 404) {
      console.error('Resource not found');
    } else if (result.error.status === 500) {
      console.error('Server error - please try again later');
    }
  }

  return result;
};
```

Then update each API to use this base query:

```typescript
import { baseQueryWithErrorHandling } from './baseQuery';

export const bookingsApi = createApi({
  reducerPath: 'bookingsApi',
  baseQuery: baseQueryWithErrorHandling,  // Use enhanced base query
  tagTypes: ['Booking'],
  endpoints: (builder) => ({
    // ... endpoints
  }),
});
```

### Enhancement 3: Add Request/Response Types

Create proper TypeScript interfaces for all requests and responses.

**Create:** `mobile/src/types/api/bookings.ts`

```typescript
// Request types
export interface CreateBookingRequest {
  proId: string;
  serviceId: string;
  scheduledFor: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  notes?: string;
  estimatedPrice: number;
}

export interface UpdateBookingStatusRequest {
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
}

export interface CancelBookingRequest {
  role: 'client' | 'pro';
  reason: string;
}

// Response types
export interface Booking {
  id: string;
  clientId: string;
  proId: string;
  serviceId: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  scheduledFor: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  estimatedPrice: number;
  finalPrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  clientConfirmedCompletion?: string;
  proConfirmedCompletion?: string;
  completedAt?: string;
}

export interface BookingStats {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  averageRating?: number;
  totalRevenue?: number;
  completionRate: number;
}
```

**Update bookingsApi.ts to use types:**

```typescript
import {
  CreateBookingRequest,
  UpdateBookingStatusRequest,
  CancelBookingRequest,
  Booking,
  BookingStats,
} from '../../types/api/bookings';

export const bookingsApi = createApi({
  // ... configuration
  endpoints: (builder) => ({
    createBooking: builder.mutation<Booking, CreateBookingRequest>({
      query: (body) => ({
        url: '/',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Booking'],
    }),

    getBookingStats: builder.query<BookingStats, 'client' | 'pro'>({
      query: (role) => ({
        url: '/stats/me',
        params: { role },
      }),
    }),

    // ... other endpoints with proper types
  }),
});
```

---

## Testing Checklist

### Pre-Deployment Testing

- [ ] **Authentication Tests**
  - [ ] Login with valid credentials
  - [ ] Register new user
  - [ ] Verify OTP flow
  - [ ] Refresh token functionality
  - [ ] Get user profile

- [ ] **Bookings Tests**
  - [ ] Create new booking
  - [ ] Get my bookings as client
  - [ ] Get bookings as pro
  - [ ] Update booking status
  - [ ] Cancel booking
  - [ ] **Get booking stats with query parameter** (CRITICAL FIX)

- [ ] **Pros Tests**
  - [ ] Search pros with filters
  - [ ] Get pro by ID
  - [ ] Create pro profile
  - [ ] Update pro profile
  - [ ] **Delete pro profile** (NEW)
  - [ ] **Validate pro profile** (NEW)
  - [ ] **Get pro stats** (NEW)

- [ ] **Transport Tests**
  - [ ] Create transport request
  - [ ] Calculate price
  - [ ] Get tracking info
  - [ ] Update driver location
  - [ ] Upload photos before/after
  - [ ] Save signature
  - [ ] Get driver stats

- [ ] **Marketplace Tests**
  - [ ] Create seller profile
  - [ ] Create product
  - [ ] Search products
  - [ ] Create order
  - [ ] Update order status
  - [ ] Get my orders (client/seller)

- [ ] **Payments Tests**
  - [ ] Create payment intent
  - [ ] Get payment details
  - [ ] Calculate commission
  - [ ] Capture/release escrow (admin)
  - [ ] Process refund (admin)

### Integration Testing

- [ ] Test all endpoints with authentication token
- [ ] Test error handling for 401, 403, 404, 500
- [ ] Verify cache invalidation works correctly
- [ ] Test optimistic updates where applicable
- [ ] Verify loading states display correctly
- [ ] Test retry logic for failed requests

### Performance Testing

- [ ] Monitor network requests in dev tools
- [ ] Verify no duplicate requests
- [ ] Check cache hit rates
- [ ] Measure response times for critical endpoints
- [ ] Test with slow network conditions

---

## Implementation Order

1. **Day 1 (Critical):**
   - Fix `getBookingStats` endpoint (both mobile and backend)
   - Test thoroughly
   - Deploy to staging

2. **Day 2 (High Priority):**
   - Add missing pro endpoints to mobile
   - Test all three new endpoints
   - Update admin screens to use new endpoints

3. **Day 3 (Medium Priority):**
   - Add JSDoc documentation to all endpoints
   - Create TypeScript type definitions
   - Implement enhanced error handling

4. **Day 4 (Testing):**
   - Run full test suite
   - Perform integration testing
   - Fix any issues found

5. **Day 5 (Deployment):**
   - Final review
   - Deploy to production
   - Monitor for errors

---

## File Locations Reference

### Mobile Files to Modify

```
mobile/src/store/api/
├── authApi.ts          # No changes needed ✅
├── prosApi.ts          # Add 3 new endpoints
├── servicesApi.ts      # No changes needed ✅
├── bookingsApi.ts      # Fix getBookingStats endpoint
├── transportApi.ts     # No changes needed ✅
├── marketplaceApi.ts   # No changes needed ✅
└── paymentsApi.ts      # No changes needed ✅
```

### Backend Files to Modify

```
backend_checkallat/src/modules/
└── bookings/
    └── bookings.controller.ts  # Fix getMyStats method
```

---

## Risk Assessment

### Low Risk Changes
- Adding new endpoints to prosApi (doesn't affect existing functionality)
- Adding JSDoc documentation
- Adding TypeScript types

### Medium Risk Changes
- Fixing getBookingStats method (requires testing both mobile and backend)

### High Risk Changes
- None identified

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate Rollback:**
   - Revert getBookingStats changes
   - Use Git to rollback to previous commit
   - Redeploy previous version

2. **Partial Rollback:**
   - Keep new pro endpoints (non-breaking addition)
   - Only rollback getBookingStats fix if problematic

3. **Database:**
   - No database migrations required
   - No rollback needed for database

---

## Support & Questions

For questions about these fixes:
1. Review the audit report: `API_COHERENCE_AUDIT.md`
2. Check backend controller files for endpoint signatures
3. Refer to RTK Query documentation for implementation details

---

**Document Version:** 1.0
**Last Updated:** 2026-03-10
**Status:** Ready for Implementation
