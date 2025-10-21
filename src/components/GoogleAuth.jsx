'use client';

import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useToast, Button, VStack, Text } from '@chakra-ui/react';
import { API_URL } from '../lib/api';
import { saveToken } from '../lib/auth';

export default function GoogleAuth() {
  const router = useRouter();
  const toast = useToast();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  if (!clientId) {
    return (
      <VStack>
        <Button isDisabled>Continue with Google</Button>
        <Text fontSize="xs" color="gray.500">Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID</Text>
      </VStack>
    );
  }

  async function exchangeToken(idToken) {
    const res = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Google auth failed');
    }
    return data;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <GoogleLogin
        onSuccess={async (cred) => {
          try {
            const idToken = cred?.credential;
            if (!idToken) throw new Error('No credential received');
            const data = await exchangeToken(idToken);
            saveToken(data.token);
            toast({ title: 'Signed in with Google!', status: 'success' });
            if (!data.user?.username) {
              router.push('/onboarding');
            } else {
              router.push('/');
            }
          } catch (e) {
            toast({ title: 'Google sign-in error', description: e.message, status: 'error' });
          }
        }}
        onError={() => toast({ title: 'Google sign-in failed', status: 'error' })}
        useOneTap
        theme="outline"
        shape="pill"
        width="300"
        text="continue_with"
      />
    </GoogleOAuthProvider>
  );
}