import type { JSX } from 'react';

import { WelcomeHeader } from '@/features/profile';
import { RecordingStudio } from '@/features/recording';

export function App(): JSX.Element {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-10">
      <WelcomeHeader />
      <RecordingStudio />
    </main>
  );
}
