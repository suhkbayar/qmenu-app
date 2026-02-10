import React, { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const SubscriptionProvider: React.FC<Props> = ({ children }) => {
  return <>{children}</>;
};

export default SubscriptionProvider;
