import React from 'react';
import { notFound } from 'next/navigation';
import DevComponentsView from './DevComponentsView';

export default function DevComponentsPage() {
  if (process.env.VERCEL_ENV === 'production') {
    notFound();
  }

  return <DevComponentsView />;
}
