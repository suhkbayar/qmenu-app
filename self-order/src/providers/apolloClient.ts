import { ApolloClient, ApolloLink, createHttpLink, InMemoryCache, Operation } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { AuthOptions, AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { getToken } from './auth';
import { RetryLink } from '@apollo/client/link/retry';
import { DEFAULT_TOKEN } from '@/src/constants/token';
import { setOffline } from '@/src/utils/network';

const url = 'https://graph.qmenu.mn/graphql';
const region = 'ap-east-1';

const auth: AuthOptions = {
  type: AUTH_TYPE.AWS_LAMBDA,
  token: async () => {
    const token = await getToken();
    return token || DEFAULT_TOKEN;
  },
};

const httpLink = createHttpLink({ uri: url });
const authLink = createAuthLink({ url, region, auth });

const isSubscription = (operation: Operation) =>
  operation.query.definitions.some((d) => d.kind === 'OperationDefinition' && d.operation === 'subscription');

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach((element: any) => {
      switch (element.errorType) {
        case 'UnauthorizedException':
          return forward(operation);
        case 'CE0004':
          return forward(operation);
      }
    });
  }
  if (networkError) {
    if (!isSubscription(operation)) setOffline(true);
    console.log(`[Network error]: ${networkError}`);
  }
});

const subscriptionLink = createSubscriptionHandshakeLink({ url, region, auth }, httpLink);

const networkStatusLink = new ApolloLink((operation, forward) =>
  forward(operation).map((result) => {
    setOffline(false);
    return result;
  }),
);

const retryLink = new RetryLink({
  delay: { initial: 1000, max: 8000, jitter: true },
  attempts: {
    max: 5,

    retryIf: (error) => !!error.networkError,
  },
});

const link = ApolloLink.from([
  networkStatusLink,
  ApolloLink.split((operation) => !isSubscription(operation), retryLink),
  authLink,
  errorLink,
  subscriptionLink,
]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          getBranch: {
            merge(_existing, incoming) {
              return incoming;
            },
          },
        },
      },
      Branch: { keyFields: ['id'] },
      Participant: { keyFields: ['id'] },
      Product: { keyFields: ['productId'] },
    },
  }),
});

export default client;
