import { ApolloClient, ApolloLink, createHttpLink, InMemoryCache } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { AuthOptions, AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { getToken } from './auth';
import { RetryLink } from '@apollo/client/link/retry';
import { DEFAULT_TOKEN } from '@/constants/token';

const url = 'https://graph.qmenu.mn/graphql';

const region = 'ap-east-1';

const auth: AuthOptions = {
  type: AUTH_TYPE.AWS_LAMBDA,
  token: async () => {
    const token = await getToken();
    return token || DEFAULT_TOKEN; // Ensure a string is always returned
  },
};

const httpLink = createHttpLink({ uri: url });

const authLink = createAuthLink({ url, region, auth });

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach((element: any, index: any) => {
      switch (element.errorType) {
        case 'UnauthorizedException': {
          return forward(operation);
        }
        case 'CE0004': {
          return forward(operation);
        }
      }
    });
  }
  if (networkError) {
    console.log(`[Network error]: ${networkError}`);
  }
});

const subscriptionLink = createSubscriptionHandshakeLink({ url: url, region, auth }, httpLink);

const retryLink = new RetryLink({
  delay: {
    initial: 1000,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => {
      return error.networkError || error.graphQLErrors;
    },
  },
});

const link = ApolloLink.from([retryLink, authLink, errorLink, subscriptionLink]);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache(),
});

export default client;
