'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Box,
  Heading,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Text,
  useToast,
  HStack,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tab,
} from '@chakra-ui/react';
import { API_URL } from '../../lib/api';
import { saveToken } from '../../lib/auth';

export default function AuthPage() {
  const router = useRouter();
  const toast = useToast();

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoginLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      saveToken(data.token);
      toast({ title: 'Logged in!', status: 'success' });
      router.push('/');
    } catch (e) {
      toast({ title: 'Login error', description: e.message, status: 'error' });
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleSignup() {
    try {
      setSignupLoading(true);
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');
      saveToken(data.token);
      toast({ title: 'Account created!', status: 'success' });
      router.push('/onboarding'); // redirect to onboarding page
    } catch (e) {
      toast({ title: 'Signup error', description: e.message, status: 'error' });
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={6} align="stretch">
        <HStack>
          <Box fontSize="2xl">🚶🍎</Box>
          <Heading size="lg">Walklet</Heading>
        </HStack>
        <Text color="gray.600">Log in or create an account to continue.</Text>

        <Tabs variant="soft-rounded" colorScheme="purple">
          <TabList>
            <Tab>Login</Tab>
            <Tab>Sign up</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </FormControl>
                <Button colorScheme="purple" onClick={handleLogin} isLoading={loginLoading}>
                  Log In
                </Button>
              </VStack>
            </TabPanel>

            <TabPanel>
              <VStack align="stretch" spacing={4}>
                <FormControl>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </FormControl>
                <Button colorScheme="purple" onClick={handleSignup} isLoading={signupLoading}>
                  Create Account
                </Button>
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Box fontSize="sm" color="gray.500">
          Your photo and GPS data will only be used in real-time for analysis and not stored.
        </Box>
      </VStack>
    </Container>
  );
}