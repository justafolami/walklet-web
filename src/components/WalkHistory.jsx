"use client";

import { useEffect, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Badge,
  Button,
  Divider,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import { api } from "../lib/api";

function formatDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}
function formatDistance(m) {
  return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
}

export default function WalkHistory({ refreshKey = 0 }) {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  async function load(showToast = false) {
    try {
      setLoading(true);
      const tzOffsetMin = -new Date().getTimezoneOffset();
      const res = await api(`/walks/list?tzOffsetMin=${tzOffsetMin}`);
      setItems(res.items || []);
      setLastRefreshed(new Date());
      if (showToast)
        toast({ title: "History refreshed", status: "info", duration: 1500 });
    } catch (e) {
      setItems([]);
      if (showToast)
        toast({
          title: "Failed to refresh",
          description: e.message,
          status: "error",
        });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(false);
  }, [refreshKey]);

  return (
    <Box p={6} bg="white" rounded="xl" boxShadow="md">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="center">
          <Heading size="md">Today’s Walks</Heading>
          <HStack>
            {lastRefreshed && (
              <Text fontSize="xs" color="gray.500">
                Updated{" "}
                {lastRefreshed.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            )}
            <Button size="sm" onClick={() => load(true)} isLoading={loading}>
              Refresh
            </Button>
          </HStack>
        </HStack>

        <Divider />

        {loading && (
          <HStack>
            <Spinner size="sm" />
            <Text>Loading…</Text>
          </HStack>
        )}

        {!loading && items.length === 0 && (
          <Text color="gray.600">No walks recorded today yet.</Text>
        )}

        {!loading &&
          items.map((w) => {
            const start = new Date(w.startedAt);
            const time = start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <HStack
                key={w.id}
                justify="space-between"
                p={2}
                bg="gray.50"
                rounded="md"
              >
                <HStack spacing={3}>
                  <Badge colorScheme="green">{time}</Badge>
                  <Text fontSize="sm" color="gray.700">
                    {formatDistance(w.distanceM)} • {w.steps} steps •{" "}
                    {formatDuration(w.durationSec)}
                  </Text>
                </HStack>
              </HStack>
            );
          })}
      </VStack>
    </Box>
  );
}
