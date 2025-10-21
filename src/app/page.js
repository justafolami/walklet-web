'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Button,
  VStack,
  HStack,
  Badge,
  useToast,
} from '@chakra-ui/react';
import { api } from '../lib/api';
import { getToken, clearToken } from '../lib/auth';

function StatCard({ label, value, color = 'brand.500' }) {
  return (
    <Box
      p={5}
      bg="white"
      rounded="xl"
      boxShadow="md"
      borderLeft="6px solid"
      borderColor={color}
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.600">
          {label}
        </StatLabel>
        <StatNumber fontSize="3xl">{value}</StatNumber>
      </Stat>
    </Box>
  );
}

export default function Home() {
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    (async () => {
      try {
        const data = await api('/me');
        setUser(data.user);
      } catch (e) {
        clearToken();
        toast({ title: 'Session expired. Please log in again.', status: 'warning' });
      }
    })();
  }, [toast]);

  function handleLogout() {
    clearToken();
    setUser(null);
    toast({ title: 'Logged out', status: 'info' });
  }

  return (
    <Container maxW="container.md" py={10}>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between" align="center">
          <HStack>
            <Box fontSize="2xl">🚶🍎</Box>
            <Heading size="lg">Walklet</Heading>
            <Badge colorScheme="purple" variant="solid" rounded="md" p={2}>
              Alpha
            </Badge>
          </HStack>

          {user ? (
            <HStack spacing={3}>
              <Text color="gray.700" fontSize="sm">
                Logged in as <b>{user.email}</b>
              </Text>
              <Button size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </HStack>
          ) : (
            <Button as={Link} href="/auth" colorScheme="purple" size="sm">
              Sign in
            </Button>
          )}
        </HStack>

        <Text color="gray.700">
          Welcome! Track your steps, analyze meals, and earn Stepic (STPC) as you build healthy habits.
        </Text>

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <StatCard label="Steps Today" value="0" color="green.400" />
          <StatCard label="STPC Balance" value="0" color="purple.400" />
        </SimpleGrid>

        <Box p={6} bg="white" rounded="xl" boxShadow="md">
          <VStack spacing={4}>
            <Heading size="md">Today’s Meal</Heading>
            <Text color="gray.600">
              Analyze a meal photo for quick nutrition feedback.
            </Text>
            <Button size="lg" colorScheme="purple" w="full" isDisabled={!user}>
              Analyze Today’s Meal
            </Button>
            {!user && (
              <Text fontSize="xs" color="gray.500">
                Sign in to analyze today’s meal.
              </Text>
            )}
          </VStack>
        </Box>

        <Box p={6} bg="white" rounded="xl" boxShadow="md">
          <VStack spacing={3} align="stretch">
            <Heading size="md">Walk</Heading>
            <Text color="gray.600">Start a walk to track distance and steps.</Text>
            <HStack>
              <Button colorScheme="green" isDisabled={!user}>
                Start Walk
              </Button>
              <Button isDisabled={!user}>Stop</Button>
            </HStack>
            {!user && (
              <Text fontSize="xs" color="gray.500">
                Sign in to start a walk.
              </Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}