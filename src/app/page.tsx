"use client";
import React from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  // Redireciona para login sempre que acessar a raiz
  React.useEffect(() => {
    router.replace('/auth/login');
  }, [router]);
  return null;
}
