import { useApolloClient, useMutation } from '@apollo/client';
import { router } from 'expo-router';
import { CURRENT_TOKEN } from '@/src/graphql/mutations/token';
import { getDeviceId, setSession } from '@/src/providers/auth';
import { useValid } from '@/src/providers/ValidProvider';

/** Logs this tablet in as a table by its code, then opens the menu. login() throws if the code is wrong. */
export const useTableLogin = () => {
  const apollo = useApolloClient();
  const { setValid } = useValid();
  const [getToken, { loading }] = useMutation(CURRENT_TOKEN);

  const login = async (code: string) => {
    const { data } = await getToken({ variables: { code, type: 'TB', device: await getDeviceId() } });
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
