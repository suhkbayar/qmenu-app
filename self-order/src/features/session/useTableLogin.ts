import { ApolloError, useApolloClient, useMutation } from '@apollo/client';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { CURRENT_TOKEN } from '@/src/graphql/mutations/token';
import { checkConnection, isOffline } from '@/src/lib/network';
import { getDeviceId, setSession } from '@/src/providers/auth';
import { useValid } from '@/src/providers/ValidProvider';

/**
 * Logs this tablet in as a table by its code, then opens the menu. login() throws if the code is
 * wrong, or without internet (with a message saying so).
 */
export const useTableLogin = () => {
  const { t } = useTranslation('language');
  const apollo = useApolloClient();
  const { setValid } = useValid();
  const [getToken, { loading }] = useMutation(CURRENT_TOKEN);

  const login = async (code: string) => {
    // Offline the request would only fail after a long wait: try the server quickly first, as the
    // internet may be back before Android noticed
    if (isOffline() && !(await checkConnection())) throw new Error(t('mainPage.no_internet'));
    let data;
    try {
      ({ data } = await getToken({ variables: { code, type: 'TB', device: await getDeviceId() } }));
    } catch (err) {
      // The connection, not the code: it dropped or the request timed out
      if (err instanceof ApolloError && err.networkError) throw new Error(t('mainPage.no_internet'));
      throw err;
    }
    const { token, id } = data.getToken;
    await setSession(token, id);
    // A new table: drop the previous table's cached participant, menu and banners
    await apollo.clearStore();
    setValid(true);
    if (router.canDismiss()) router.dismissAll();
    router.replace({ pathname: '/', params: { pid: id } });
  };

  return { login, loading };
};
