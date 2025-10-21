"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
} from "@chakra-ui/react";
import { api } from "../lib/api";
import { getToken, clearToken } from "../lib/auth";
import ConnectWallet from "../components/ConnectWallet";
import WalkHistory from "../components/WalkHistory";
import WalkTracker from "../components/WalkTracker";
import { useAccount, useChainId } from "wagmi";
import { baseSepolia } from "wagmi/chains";

function StatCard({ label, value, color = "brand.500" }) {
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

function shortAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function Home() {
  const [user, setUser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const toast = useToast();

  // Wallet connection (only show connect after login)
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const onBaseSepolia = chainId === baseSepolia.id;

  const useConnected = isConnected && onBaseSepolia;
  const inUseAddress = useConnected
    ? connectedAddress
    : user?.walletAddress || null;

  async function refreshMe() {
    const data = await api("/me");
    setUser(data.user);
  }

  // Load today's totals (local timezone)
  async function loadTodayTotals() {
    try {
      const tzOffsetMin = -new Date().getTimezoneOffset(); // minutes east of UTC
      const t = await api(`/walks/today?tzOffsetMin=${tzOffsetMin}`);
      setStepsToday(t.stepsToday || 0);
    } catch {
      // ignore if not logged in yet
    }
  }

  // Initial load after login
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    (async () => {
      try {
        await refreshMe();
        await loadTodayTotals();
      } catch {
        clearToken();
        setUser(null);
        toast({
          title: "Session expired. Please log in again.",
          status: "warning",
        });
      }
    })();
  }, [toast]);

  // Helper: ms until next local midnight
  function msUntilNextLocalMidnight() {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - now.getTime();
  }

  // Auto-refresh steps at midnight and periodically
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      loadTodayTotals();
      const intervalId = setInterval(loadTodayTotals, 15 * 60 * 1000);
      return () => clearInterval(intervalId);
    }, msUntilNextLocalMidnight());

    const intervalId2 = setInterval(loadTodayTotals, 15 * 60 * 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId2);
    };
  }, [user]);

  function handleLogout() {
    clearToken();
    setUser(null);
    setStepsToday(0);
    toast({ title: "Logged out", status: "info" });
  }

  async function handleCopy() {
    try {
      if (!inUseAddress) return;
      await navigator.clipboard.writeText(inUseAddress);
      toast({ title: "Wallet address copied!", status: "success" });
    } catch {
      toast({
        title: "Copy failed",
        description: "Please copy manually.",
        status: "error",
      });
    }
  }

  async function handleGenerateWallet() {
    try {
      setGenerating(true);
      await api("/debug/create-wallet", { method: "POST" });
      await refreshMe();
      toast({ title: "Wallet created!", status: "success" });
    } catch (e) {
      toast({
        title: "Wallet creation failed",
        description: e.message,
        status: "error",
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Container maxW="container.md" py={10}>
      <VStack align="stretch" spacing={6}>
        {/* Header */}
        <HStack justify="space-between" align="center">
          <HStack>
            <Box fontSize="2xl">🚶🍎</Box>
            <Heading size="lg">Walklet</Heading>
            <Badge colorScheme="purple" variant="solid" rounded="md" p={2}>
              Alpha
            </Badge>
          </HStack>

          <HStack spacing={3}>
            {/* Only show Connect Wallet after user is signed in */}
            {user && <ConnectWallet />}

            {/* App auth UI */}
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
                Sign in / Sign up
              </Button>
            )}
          </HStack>
        </HStack>

        <Text color="gray.700">
          Welcome! Track your steps, analyze meals, and earn Stepic (STPC) as
          you build healthy habits.
        </Text>

        {/* Stats */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={5}>
          <StatCard label="Steps Today" value={stepsToday} color="green.400" />
          <StatCard label="STPC Balance" value="0" color="purple.400" />
        </SimpleGrid>

        {/* Wallet card */}
        {user && (
          <Box p={6} bg="white" rounded="xl" boxShadow="md">
            <VStack align="stretch" spacing={3}>
              <Heading size="md">Your Wallet</Heading>

              {inUseAddress ? (
                <>
                  <HStack justify="space-between" align="center">
                    <Box
                      fontFamily="mono"
                      p={2}
                      bg="gray.50"
                      rounded="md"
                      overflowWrap="anywhere"
                    >
                      {inUseAddress}
                    </Box>
                    <Button
                      onClick={handleCopy}
                      colorScheme="purple"
                      variant="outline"
                    >
                      Copy
                    </Button>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    Using: {shortAddress(inUseAddress)} on Base
                  </Text>
                </>
              ) : (
                <HStack>
                  <Text color="gray.600">No wallet available yet.</Text>
                  <Button
                    colorScheme="purple"
                    onClick={handleGenerateWallet}
                    isLoading={generating}
                    size="sm"
                  >
                    Generate App Wallet
                  </Button>
                </HStack>
              )}
            </VStack>
          </Box>
        )}

        {/* Walk tracking */}
        {user && <WalkTracker user={user} onStepsChange={setStepsToday} />}
        {user && <WalkHistory refreshKey={stepsToday} />}

        {/* Meal card */}
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
      </VStack>
    </Container>
  );
}
