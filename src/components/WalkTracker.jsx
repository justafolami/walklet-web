"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Badge,
  useToast,
  Code,
  Switch,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";
import { api } from "../lib/api";

function toRad(d) {
  return (d * Math.PI) / 180;
}
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, String(m).padStart(2, "0"), String(s).padStart(2, "0")].join(":");
}
function formatDistance(m) {
  return m < 1000 ? `${m.toFixed(0)} m` : `${(m / 1000).toFixed(2)} km`;
}

export default function WalkTracker({ user, onStepsChange }) {
  const toast = useToast();

  // Tunables
  const ACC_MAX_M = 150; // accept fixes up to ~150m accuracy for distance accumulation
  const MIN_MOVE_M = 1; // ignore jitter under 1m
  const FIRST_FIX_HINT_MS = 30000;

  // State
  const [isTracking, setIsTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [steps, setSteps] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [permissionState, setPermissionState] = useState("unknown");

  const [fixCount, setFixCount] = useState(0);
  const [lastCoords, setLastCoords] = useState(null);

  // Simulated mode toggle
  const [simulated, setSimulated] = useState(false);

  // Refs
  const savedRef = useRef(false);
  const watchIdsRef = useRef([]);
  const startTimeRef = useRef(null); // ms since epoch
  const lastPosRef = useRef(null);
  const tickerRef = useRef(null);
  const firstFixTimerRef = useRef(null);
  const simTimerRef = useRef(null);
  const simPosRef = useRef(null);

  // Step length (meters) from height (fallback ~0.75m)
  const stepLen =
    typeof user?.heightCm === "number" && user.heightCm > 0
      ? (user.heightCm / 100) * 0.415
      : 0.75;

  function updateStepsFromDistance(nextDistance) {
    const est = Math.max(0, Math.round(nextDistance / stepLen));
    setSteps(est);
  }

  // Track permission (if supported)
  useEffect(() => {
    let cancelled = false;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "geolocation" })
        .then((res) => {
          if (!cancelled) setPermissionState(res.state);
          res.onchange = () => !cancelled && setPermissionState(res.state);
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, []);

  function startTicker() {
    tickerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const secs = Math.max(
        0,
        Math.floor((Date.now() - startTimeRef.current) / 1000)
      );
      setElapsed(secs);
    }, 1000);
  }
  function stopTicker() {
    if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }
  }

  function clearAllWatches() {
    watchIdsRef.current.forEach((id) => {
      try {
        navigator.geolocation.clearWatch(id);
      } catch {}
    });
    watchIdsRef.current = [];
  }

  function onFirstFix() {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
      startTicker();
      setIsTracking(true);
      setStatus(simulated ? "Simulating…" : "Tracking…");
      if (firstFixTimerRef.current) {
        clearTimeout(firstFixTimerRef.current);
        firstFixTimerRef.current = null;
      }
    }
  }

  function handlePos(pos) {
    const { latitude, longitude, accuracy } = pos.coords;
    setFixCount((c) => c + 1);
    setLastCoords({ latitude, longitude, accuracy });
    onFirstFix();

    const prev = lastPosRef.current;
    lastPosRef.current = { lat: latitude, lon: longitude, accuracy };

    if (!prev) return;
    if (!simulated && typeof accuracy === "number" && accuracy > ACC_MAX_M) {
      setStatus(`Improving GPS accuracy… (~${Math.round(accuracy)}m)`);
      return;
    }

    const d = haversine(prev.lat, prev.lon, latitude, longitude);
    if (d < MIN_MOVE_M) return;

    setDistance((prevD) => {
      const next = prevD + d;
      updateStepsFromDistance(next);
      return next;
    });
  }

  function handlePosError(err) {
    const map = {
      1: "Permission denied. Please allow location for this site.",
      2: "Position unavailable. Try near a window or enable Wi‑Fi.",
      3: "Location timeout. Try again.",
    };
    const msg = map[err?.code] || err?.message || "Location error";
    console.warn("Geolocation error:", err);
    setError(msg);
    setStatus("Idle");
    setIsTracking(false);
    stopTicker();
    clearAllWatches();
    toast({ title: "Location error", description: msg, status: "error" });
  }

  // Simulated path: move ~10m per tick in a simple pattern
  function simStep() {
    const metersPerDegLat = 111320;
    const metersPerDegLonAtLat = (lat) => Math.cos(toRad(lat)) * 111320;

    if (!simPosRef.current) {
      if (lastCoords)
        simPosRef.current = {
          lat: lastCoords.latitude,
          lon: lastCoords.longitude,
        };
      else simPosRef.current = { lat: 37.7749, lon: -122.4194 }; // default start
    }

    const phase = fixCount % 40;
    const dir = phase < 10 ? "E" : phase < 20 ? "S" : phase < 30 ? "W" : "N";
    const stepM = 10;

    let { lat, lon } = simPosRef.current;
    if (dir === "E") lon += stepM / metersPerDegLonAtLat(lat);
    if (dir === "W") lon -= stepM / metersPerDegLonAtLat(lat);
    if (dir === "N") lat += stepM / metersPerDegLat;
    if (dir === "S") lat -= stepM / metersPerDegLat;

    simPosRef.current = { lat, lon };
    handlePos({ coords: { latitude: lat, longitude: lon, accuracy: 20 } });
  }

  function startSim() {
    setStatus("Simulating…");
    onFirstFix();
    simTimerRef.current = setInterval(simStep, 1000);
  }
  function stopSim() {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
  }

  function startWatches() {
    try {
      const highId = navigator.geolocation.watchPosition(
        handlePos,
        handlePosError,
        { enableHighAccuracy: true, maximumAge: 0 }
      );
      const lowId = navigator.geolocation.watchPosition(
        handlePos,
        handlePosError,
        { enableHighAccuracy: false, maximumAge: 15000 }
      );
      watchIdsRef.current = [highId, lowId];
    } catch (e) {
      handlePosError(e);
    }
  }

  async function saveSession() {
    if (savedRef.current) return;
    savedRef.current = true;
    // Only save if we actually tracked something
    if (!startTimeRef.current || steps <= 0 || distance <= 0) return;

    const startedAt = new Date(startTimeRef.current).toISOString();
    const endedAt = new Date().toISOString();
    const durationSec = Math.max(
      0,
      Math.floor((Date.now() - startTimeRef.current) / 1000)
    );

    try {
      await api("/walks", {
        method: "POST",
        body: {
          startedAt,
          endedAt,
          durationSec,
          distanceM: Number(distance.toFixed(2)),
          steps,
        },
      });
      toast({ title: "Walk saved!", status: "success" });
    } catch (e) {
      toast({
        title: "Failed to save walk",
        description: e.message,
        status: "error",
      });
    }
  }

  function startWalk() {
    savedRef.current = false;
    setError("");
    setDistance(0);
    setSteps(0);
    setElapsed(0);
    setFixCount(0);
    setLastCoords(null);
    lastPosRef.current = null;
    startTimeRef.current = null;

    if (simulated) {
      startSim();
      return;
    }

    if (!navigator.geolocation) {
      setStatus("Idle");
      setError("Geolocation not supported in this browser.");
      toast({ title: "Geolocation not supported", status: "error" });
      return;
    }

    setStatus("Starting GPS…");
    startWatches();

    firstFixTimerRef.current = setTimeout(() => {
      if (!isTracking && !lastPosRef.current) {
        setStatus(
          "No GPS fix yet. Check site permission or try near a window."
        );
        toast({
          title: "Still waiting for GPS…",
          description:
            "Allow location for this site (padlock → Site settings → Location: Allow), then reload.",
          status: "warning",
        });
      }
    }, FIRST_FIX_HINT_MS);
  }

  async function stopWalk() {
    clearAllWatches();
    stopSim();
    stopTicker();
    setIsTracking(false);
    setStatus("Idle");
    if (firstFixTimerRef.current) {
      clearTimeout(firstFixTimerRef.current);
      firstFixTimerRef.current = null;
    }

    // Update UI immediately
    if (typeof onStepsChange === "function" && steps > 0) {
      onStepsChange((prev) => prev + steps);
    }

    // Persist to backend
    await saveSession();
  }

  function resetWalk() {
    setError("");
    setElapsed(0);
    setDistance(0);
    setSteps(0);
    setStatus("Idle");
    setFixCount(0);
    setLastCoords(null);
    lastPosRef.current = null;
    startTimeRef.current = null;
  }

  useEffect(() => {
    return () => {
      clearAllWatches();
      stopSim();
      stopTicker();
      if (firstFixTimerRef.current) clearTimeout(firstFixTimerRef.current);
    };
  }, []);

  return (
    <Box p={6} bg="white" rounded="xl" boxShadow="md">
      <VStack spacing={3} align="stretch">
        <HStack justify="space-between" align="center">
          <Heading size="md">Walk</Heading>
          {isTracking ? (
            <Badge colorScheme="green">Tracking</Badge>
          ) : (
            <Badge>Idle</Badge>
          )}
        </HStack>

        {/* Simulated Mode toggle */}
        <FormControl display="flex" alignItems="center" width="fit-content">
          <FormLabel htmlFor="sim" mb="0" fontSize="sm" color="gray.600">
            Simulated Mode (dev)
          </FormLabel>
          <Switch
            id="sim"
            isChecked={simulated}
            onChange={(e) => setSimulated(e.target.checked)}
          />
        </FormControl>

        <Text fontSize="sm" color="gray.700">
          Status: {status}{" "}
          {permissionState !== "unknown" && !simulated && (
            <Text as="span" ml={2} fontSize="xs" color="gray.500">
              (Permission: {permissionState})
            </Text>
          )}
        </Text>

        {/* Debug row */}
        <HStack spacing={6}>
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.500">
              Fixes
            </Text>
            <Text fontFamily="mono">{fixCount}</Text>
          </VStack>
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.500">
              Last accuracy
            </Text>
            <Text fontFamily="mono">
              {lastCoords ? `${Math.round(lastCoords.accuracy || 0)} m` : "-"}
            </Text>
          </VStack>
          <VStack align="start" spacing={0}>
            <Text fontSize="xs" color="gray.500">
              Last coords
            </Text>
            <Code fontSize="xs" whiteSpace="pre">
              {lastCoords
                ? `${lastCoords.latitude.toFixed(
                    5
                  )}, ${lastCoords.longitude.toFixed(5)}`
                : "-"}
            </Code>
          </VStack>
        </HStack>

        <HStack spacing={6}>
          <VStack spacing={0} align="start">
            <Text fontSize="xs" color="gray.500">
              Time
            </Text>
            <Text fontFamily="mono" fontSize="lg">
              {formatTime(elapsed)}
            </Text>
          </VStack>
          <VStack spacing={0} align="start">
            <Text fontSize="xs" color="gray.500">
              Distance
            </Text>
            <Text fontFamily="mono" fontSize="lg">
              {formatDistance(distance)}
            </Text>
          </VStack>
          <VStack spacing={0} align="start">
            <Text fontSize="xs" color="gray.500">
              Steps (est.)
            </Text>
            <Text fontFamily="mono" fontSize="lg">
              {steps}
            </Text>
          </VStack>
        </HStack>

        {user?.heightCm ? (
          <Text fontSize="xs" color="gray.500">
            Using your height ({user.heightCm} cm) for step length (~
            {(stepLen * 100).toFixed(0)} cm)
          </Text>
        ) : (
          <Text fontSize="xs" color="gray.500">
            Tip: add your height in onboarding to improve step estimates.
          </Text>
        )}

        {error && (
          <Text color="red.500" fontSize="sm">
            {error}
          </Text>
        )}

        <HStack>
          <Button
            colorScheme="green"
            onClick={startWalk}
            isDisabled={isTracking}
          >
            Start Walk
          </Button>
          <Button onClick={stopWalk} isDisabled={!isTracking}>
            Stop
          </Button>
          <Button
            variant="outline"
            onClick={resetWalk}
            isDisabled={isTracking || (distance === 0 && steps === 0)}
          >
            Reset
          </Button>
        </HStack>

        {!simulated && (
          <Text fontSize="xs" color="gray.500">
            If nothing happens after Start: allow location (padlock → Site
            settings → Location: Allow), ensure Windows Location is On, then
            reload. You can also try DevTools → More tools → Sensors →
            Geolocation to simulate movement.
          </Text>
        )}
      </VStack>
    </Box>
  );
}
