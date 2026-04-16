'use client';
import { use } from 'react';
import { SessionClient } from '@/components/SessionClient';

export default function SessionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  return <SessionClient code={code.toUpperCase()} />;
}
