'use client';

import React from 'react';
import ASCIIMapEditor from '../components/ASCIIMapEditor';

export default function Home() {
  return (
    <main className="min-h-screen p-8 flex flex-col items-center">
      <ASCIIMapEditor />
    </main>
  );
} 