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
  Progress,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from "@chakra-ui/react";
import { api } from "../lib/api";
import { getToken, clearToken } from "../lib/auth";
import ConnectWallet from "../components/ConnectWallet";
import WalkTracker from "../components/WalkTracker";
import WalkHistory from "../components/WalkHistory";
import DevToolsCard from "../components/DevToolsCard";
import MealAnalyzer from "../components/MealAnalyzer";
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
  // State
  const [user, setUser] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(6000);
  const [savingGoal, setSavingGoal] = useState(false);
  const toast = useToast();

  // Wallet connect (only show after login)
  const { address: connectedAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const onBaseSepolia = chainId === baseSepolia.id;

  const useConnected = isConnected && onBaseSepolia;
  const inUseAddress = useConnected
    ? connectedAddress
    : user?.walletAddress || null;

  // API helpers
  async function refreshMe() {
    const data = await api("/me");
    setUser(data.user);
    // get goal from backend (defaults server-side to 6000)
    setDailyGoal(data.user.dailyStepGoal ?? 6000);
  }

  async function loadTodayTotals() {
    try {
      const tzOffsetMin = -new Date().getTimezoneOffset(); // minutes east of UTC
      const t = await api(`/walks/today?tzOffsetMin=${tzOffsetMin}`);
      setStepsToday(t.stepsToday || 0);
    } catch {
      // ignore if not logged in yet
    }
  }

  async function saveDailyGoal() {
    try {
      setSavingGoal(true);
      const goal = Math.max(0, Number(dailyGoal) || 0);
      await api("/profile/goal", {
        method: "POST",
        body: { dailyStepGoal: goal },
      });
      setDailyGoal(goal);
      toast({ title: "Daily goal saved", status: "success" });
    } catch (e) {
      toast({
        title: "Failed to save goal",
        description: e.message,
        status: "error",
      });
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleDevReset() {
    await loadTodayTotals();
    setHistoryRefreshKey((k) => k + 1);
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
    setHistoryRefreshKey((k) => k + 1);
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

        {/* Daily Goal card */}
        {user && (
          <Box p={6} bg="white" rounded="xl" boxShadow="md">
            <VStack align="stretch" spacing={3}>
              <Heading size="md">Daily Goal</Heading>

              {/* Progress */}
              {(() => {
                const goal = Math.max(1, Number(dailyGoal) || 1);
                const pct = Math.min(
                  100,
                  Math.round((stepsToday / goal) * 100)
                );
                const color =
                  pct >= 100 ? "green" : pct >= 60 ? "purple" : "gray";
                return (
                  <VStack align="stretch" spacing={2}>
                    <HStack justify="space-between">
                      <Text color="gray.700">Progress</Text>
                      <Text fontSize="sm" color="gray.600">
                        {stepsToday.toLocaleString()} / {goal.toLocaleString()}{" "}
                        steps ({pct}%)
                      </Text>
                    </HStack>
                    <Progress
                      value={pct}
                      colorScheme={color}
                      rounded="md"
                      height="10px"
                    />
                  </VStack>
                );
              })()}

              {/* Goal editor */}
              <HStack>
                <Text color="gray.700">Set goal:</Text>
                <NumberInput
                  size="sm"
                  maxW="160px"
                  min={0}
                  step={500}
                  value={dailyGoal}
                  onChange={(v) => setDailyGoal(Number(v) || 0)}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Button
                  size="sm"
                  colorScheme="purple"
                  onClick={saveDailyGoal}
                  isLoading={savingGoal}
                >
                  Save
                </Button>
              </HStack>

              <Text fontSize="xs" color="gray.500">
                Tip: most people aim for 6,000–10,000 steps/day. Adjust to suit
                your goals.
              </Text>
            </VStack>
          </Box>
        )}

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
        {user && (
          <WalkTracker
            user={user}
            onStepsChange={(updater) => {
              setStepsToday((prev) =>
                typeof updater === "function" ? updater(prev) : updater
              );
              setHistoryRefreshKey((k) => k + 1);
            }}
          />
        )}

        {/* Today’s history */}
        {user && <WalkHistory refreshKey={stepsToday + historyRefreshKey} />}

        {/* Dev tools (dev only) */}
        {user && <DevToolsCard onReset={handleDevReset} />}

        {/* Meal analyzer */}
        {user ? (
          <MealAnalyzer />
        ) : (
          <Box p={6} bg="white" rounded="xl" boxShadow="md">
            <VStack spacing={4}>
              <Heading size="md">Today’s Meal</Heading>
              <Text color="gray.600">Sign in to analyze a meal.</Text>
              <Button
                as={Link}
                href="/auth"
                colorScheme="purple"
                w="fit-content"
              >
                Sign in
              </Button>
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
