import { getStorage } from '@/cache';
import { useCallStore } from '@/cache/cart.store';
import HelpFloatingButton from '@/components/FloatingButton/HelpFloatingButton';
import Loader from '@/components/Loader';
import { emptyOrder } from '@/constants';
import { GET_BRANCH } from '@/graphql/query';
import { AuthContext } from '@/providers/auth';
import Container from '@/template/container';
import { ICustomerTable } from '@/types';
import { useLazyQuery } from '@apollo/client';
import { router } from 'expo-router';
import { isEmpty } from 'lodash';
import { useContext, useEffect, useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';

const Private = () => {
  const [loading, setLoading] = useState(true);
  const { signOut } = useContext(AuthContext);
  const { setParticipant, order, load, setTables } = useCallStore();

  const [getBranch, { loading: loadBranch, data }] = useLazyQuery(GET_BRANCH, {
    fetchPolicy: 'network-only',
    onCompleted(data) {
      setParticipant(data.getParticipant);
      if (data.getParticipant.orderable && isEmpty(order)) {
        load(emptyOrder);
      }

      let incomingTables: ICustomerTable[] = [];

      if (data.getParticipant.table) {
        incomingTables = [
          {
            id: data.getParticipant.id,
            branchName: data.getParticipant.branch.name,
            branchId: data.getParticipant.branch.id,
            branchLogo: data.getParticipant.branch.logo,
            tableName: data.getParticipant.table.name,
            tableId: data.getParticipant.table.id,
            code: data.getParticipant.table.code,
          },
        ];

        setTables(incomingTables);
      }
    },
    onError(err) {
      console.log(err, 'error');
      signOut();
      router.navigate('/');
    },
  });

  const getParticipantId = async () => {
    return await getStorage('participantId');
  };

  useEffect(() => {
    const fetchParticipantId = async () => {
      const participantId = await getParticipantId();
      if (participantId) {
        getBranch({ variables: { id: participantId } });
      }
      setLoading(false);
    };

    fetchParticipantId();
  }, []);

  if (loading || loadBranch) return <Loader />;

  return (
    <SafeAreaView style={styles.safeArea}>
      {data && <Container participant={data.getParticipant} />}
      <HelpFloatingButton />
    </SafeAreaView>
  );
};

export default Private;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
