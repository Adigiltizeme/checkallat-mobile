import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useGetProfileQuery } from '../store/api/authApi';
import { refreshProfile } from '../store/slices/authSlice';
import { RootState } from '../store';

const POLL_INTERVAL = 30_000;

export const useDriverApprovalPolling = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);

  const isPending = user?.driver?.status === 'pending';

  const { data } = useGetProfileQuery(undefined, {
    skip: !isPending,
    pollingInterval: isPending ? POLL_INTERVAL : 0,
    refetchOnMountOrArgChange: true,
  });

  // Référence pour éviter de notifier plusieurs fois
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    if (notifiedRef.current) return;

    const wasApproved = data?.driver?.status === 'active';
    const wasRejected = data?.driver?.status === 'rejected';

    if (wasApproved || wasRejected) {
      notifiedRef.current = true;
      dispatch(refreshProfile(data));

      if (wasApproved) {
        Alert.alert(
          t('driver_apply.approved_title'),
          t('driver_apply.approved_msg'),
        );
      } else {
        Alert.alert(
          t('driver_apply.rejected_title'),
          t('driver_apply.rejected_msg'),
        );
      }
    }
  }, [data, dispatch, t]);
};
