'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  // One QueryClient per browser session
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // History doesn’t change every millisecond; live updates come via WS
            staleTime: 60_000,            // 1 min
            refetchOnWindowFocus: true,   // good UX when tab regains focus
            refetchOnReconnect: true,
            retry: 2,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
