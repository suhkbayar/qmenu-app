import { ApolloClient, ApolloLink, createHttpLink, InMemoryCache, Observable, Operation } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { AuthOptions, AUTH_TYPE, createAuthLink } from 'aws-appsync-auth-link';
import { createSubscriptionHandshakeLink } from 'aws-appsync-subscription-link';
import { endSession, getToken, isValidToken } from './auth';
import { RetryLink } from '@apollo/client/link/retry';
import { API_URL } from '@/src/constants';
import { DEFAULT_TOKEN } from '@/src/constants/token';
import { markNoAnswer, markOnline } from '@/src/lib/network';

const url = API_URL;
const region = 'ap-east-1';

const auth: AuthOptions = {
  type: AUTH_TYPE.AWS_LAMBDA,
  token: async () => {
    const token = await getToken();
    return token || DEFAULT_TOKEN;
  },
};

// React Native's requests never time out by themselves: on Wi-Fi without internet one could wait for
// minutes. AppSync gives up at 30 s anyway, so nothing that would have been answered is cut off.
const REQUEST_TIMEOUT_MS = 30 * 1000;

const fetchWithTimeout: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  // Apollo cancels a request it no longer needs through its own signal
  const cancel = init?.signal;
  if (cancel?.aborted) controller.abort();
  else cancel?.addEventListener('abort', () => controller.abort());
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
};

const httpLink = createHttpLink({ uri: url, fetch: fetchWithTimeout });
const authLink = createAuthLink({ url, region, auth });

const isSubscription = (operation: Operation) =>
  operation.query.definitions.some((d) => d.kind === 'OperationDefinition' && d.operation === 'subscription');

const sessionLink = setContext(async () => ({ sessionExpired: !(await isValidToken()) }));

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (operation.getContext().sessionExpired && graphQLErrors?.some((e: any) => e.errorType === 'CE0003')) {
    if (endSession()) return new Observable(() => {});
  }

  const retryable = graphQLErrors?.some(
    (e: any) => e.errorType === 'UnauthorizedException' || e.errorType === 'CE0004',
  );
  if (retryable && !operation.getContext().authRetried) {
    operation.setContext({ authRetried: true });
    return forward(operation);
  }

  if (networkError) {
    // Any answer from the server, an error status too, means the tablet is online; only no answer at
    // all (or the timeout) means it isn't. Error answers once kept the "no internet" banner up.
    if (!isSubscription(operation)) {
      if ('statusCode' in networkError) markOnline();
      else markNoAnswer(operation.getContext().sentAt ?? Date.now());
    }
    console.log(`[Network error]: ${networkError}`);
  }
});

const subscriptionLink = createSubscriptionHandshakeLink({ url, region, auth }, httpLink);

// When each request went out, so a late failure from before the internet came back is ignored
const networkStatusLink = new ApolloLink((operation, forward) => {
  operation.setContext({ sentAt: Date.now() });
  return forward(operation).map((result) => {
    markOnline();
    return result;
  });
});

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
  sessionLink,
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

const CACHE_CLEANUP_MS = 60 * 60 * 1000;
setInterval(() => client.cache.gc(), CACHE_CLEANUP_MS);

export default client;
