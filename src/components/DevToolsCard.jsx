"use client";

import { useEffect, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Divider,
  useToast,
  Badge,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { api, API_URL } from "../lib/api";

function tzOffsetMin() {
  return -new Date().getTimezoneOffset();
}

export default function DevToolsCard({ onReset }) {
  const toast = useToast();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [includeProfile, setIncludeProfile] = useState(false);
  const [includeWallet, setIncludeWallet] = useState(false);

  useEffect(() => {
    // Ask backend if dev tools are enabled
    (async () => {
      try {
        const res = await fetch(`${API_URL}/dev/info`);
        const data = await res.json().catch(() => ({}));
        setEnabled(Boolean(data?.enabled));
      } catch {
        setEnabled(false);
      }
    })();
  }, []);

  if (!enabled) return null;

  async function reset({ scope }) {
    try {
      setLoading(true);
      const types = ["walks", "meals"];
      if (includeProfile) types.push("profile");
      if (includeWallet) types.push("wallet");

      await api("/dev/reset", {
        method: "POST",
        body: { types, scope, tzOffsetMin: tzOffsetMin() },
      });

      toast({ title: `Reset ${scope} complete`, status: "success" });
      onReset && onReset(); // Let parent refresh steps/history
    } catch (e) {
      toast({ title: "Reset failed", description: e.message, status: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      p={6}
      bg="white"
      rounded="xl"
      boxShadow="md"
      borderLeft="6px solid"
      borderColor="purple.400"
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="center">
          <Heading size="md">Dev Tools</Heading>
          <Badge colorScheme="purple">DEV</Badge>
        </HStack>

        <Text color="gray.600">
          Reset data for the current user (dev only; guarded by DEV_TOOLS=1 on
          the backend).
        </Text>

        <HStack spacing={4}>
          <Button
            size="sm"
            colorScheme="purple"
            onClick={() => reset({ scope: "today" })}
            isLoading={loading}
          >
            Reset Today (Walks + Meals)
          </Button>
          <Button
            size="sm"
            onClick={() => reset({ scope: "all" })}
            isLoading={loading}
            variant="outline"
          >
            Reset ALL (Walks + Meals)
          </Button>
        </HStack>

        <Divider />

        <Text fontSize="sm" color="gray.600">
          Optional: also clear profile and app wallet (destructive)
        </Text>
        <HStack>
          <FormControl display="flex" alignItems="center" width="fit-content">
            <FormLabel mb="0" fontSize="sm">
              Clear Profile
            </FormLabel>
            <Switch
              isChecked={includeProfile}
              onChange={(e) => setIncludeProfile(e.target.checked)}
            />
          </FormControl>
          <FormControl display="flex" alignItems="center" width="fit-content">
            <FormLabel mb="0" fontSize="sm">
              Clear App Wallet
            </FormLabel>
            <Switch
              isChecked={includeWallet}
              onChange={(e) => setIncludeWallet(e.target.checked)}
            />
          </FormControl>
        </HStack>

        <HStack>
          <Button
            size="sm"
            colorScheme="red"
            variant="solid"
            onClick={() => reset({ scope: "all" })}
            isLoading={loading}
          >
            Reset ALL (Walks + Meals{includeProfile ? " + Profile" : ""}
            {includeWallet ? " + Wallet" : ""})
          </Button>
        </HStack>

        <Text fontSize="xs" color="gray.500">
          Note: Wallet reset only clears app-managed wallet fields in DB.
          On-chain tokens/connected wallets are unaffected.
        </Text>
      </VStack>
    </Box>
  );
}
