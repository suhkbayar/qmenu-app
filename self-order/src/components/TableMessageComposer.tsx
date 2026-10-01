import React from 'react';
import { Portal } from 'react-native-paper';
import TableMessageModal from '@/src/components/modals/TableMessageModal';
import { useTableMessageStore } from '@/src/store/tableMessage.store';

const TableMessageComposer = () => {
  const composerOpen = useTableMessageStore((s) => s.composerOpen);
  const composerTarget = useTableMessageStore((s) => s.composerTarget);
  const composerMode = useTableMessageStore((s) => s.composerMode);
  const replyToGiftId = useTableMessageStore((s) => s.replyToGiftId);
  const closeComposer = useTableMessageStore((s) => s.closeComposer);

  if (!composerOpen) return null;

  return (
    <Portal>
      <TableMessageModal
        visible
        mode={composerMode}
        target={composerTarget}
        replyToGiftId={replyToGiftId}
        onClose={closeComposer}
      />
    </Portal>
  );
};

export default TableMessageComposer;
