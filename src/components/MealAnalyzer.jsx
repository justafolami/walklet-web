"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Select,
  Image,
  Badge,
  useToast,
  Divider,
  Spinner,
} from "@chakra-ui/react";
import { detectFoodAndPerson, loadCoco } from "../lib/vision";
import { API_URL } from "../lib/api";
import { getToken } from "../lib/auth";

const MEAL_TYPES = ["breakfast", "lunch", "dinner"];
const LIVE_MAX_AGE_MS = 15_000; // capture must be analyzed within 15s

function tzOffsetMin() {
  return -new Date().getTimezoneOffset();
}
function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const a = crypto.getRandomValues(new Uint8Array(16));
  a[6] = (a[6] & 0x0f) | 0x40;
  a[8] = (a[8] & 0x3f) | 0x80;
  return [...a]
    .map(
      (x, i) =>
        (i === 4 || i === 6 || i === 8 || i === 10 ? "-" : "") +
        x.toString(16).padStart(2, "0")
    )
    .join("");
}

// Wait until the video element reports dimensions
async function waitForVideoReady(video, timeoutMs = 3000) {
  if (video && video.videoWidth && video.videoHeight) return true;
  return new Promise((resolve) => {
    let done = false;
    const onReady = () => {
      if (!done && video.videoWidth && video.videoHeight) {
        done = true;
        cleanup();
        resolve(true);
      }
    };
    const t = setTimeout(() => {
      if (!done) {
        done = true;
        cleanup();
        resolve(false); // fallback size later
      }
    }, timeoutMs);
    function cleanup() {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      clearTimeout(t);
    }
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
  });
}

async function canvasToJpegBlob(canvas, quality = 0.8) {
  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality)
  );
  if (blob) return blob;
  // Fallback via data URL for browsers that return null
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  return await (await fetch(dataUrl)).blob();
}

export default function MealAnalyzer() {
  const toast = useToast();

  // Daily summary
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [remaining, setRemaining] = useState(3);
  const [usedTypes, setUsedTypes] = useState([]);

  // Camera state
  const videoRef = useRef(null); // always in DOM (we hide it when off)
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [streamActive, setStreamActive] = useState(false);
  const [startingCam, setStartingCam] = useState(false);
  const [permissionState, setPermissionState] = useState("unknown");
  const [videoDims, setVideoDims] = useState({ w: 0, h: 0, ready: false });

  // Capture state
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [capturedAt, setCapturedAt] = useState(null);
  const [liveSessionId, setLiveSessionId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);

  // Meal type selection
  const defaultMealType = useMemo(() => {
    const next = MEAL_TYPES.find((t) => !usedTypes.includes(t));
    return next || "";
  }, [usedTypes]);
  const [mealType, setMealType] = useState("");
  useEffect(() => setMealType(defaultMealType), [defaultMealType]);

  // Warm up model once (faster first analyze)
  useEffect(() => {
    loadCoco().catch(() => {});
  }, []);

  // Load today summary
  async function loadSummary() {
    try {
      setSummaryLoading(true);
      const token = getToken();
      if (!token) return;
      const res = await fetch(
        `${API_URL}/meals/today?tzOffsetMin=${tzOffsetMin()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      if (res.ok) {
        setRemaining(data.remaining ?? Math.max(0, 3 - (data.count || 0)));
        setUsedTypes(data.used || []);
      }
    } finally {
      setSummaryLoading(false);
    }
  }
  useEffect(() => {
    loadSummary();
  }, []);

  // Optional: track camera permission state
  useEffect(() => {
    let cancelled = false;
    if (navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "camera" })
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

  function stopCamera() {
    try {
      streamRef.current?.getTracks()?.forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    setStreamActive(false);
    setVideoDims({ w: 0, h: 0, ready: false });
  }

  async function startCamera() {
    try {
      setStartingCam(true);
      // Ensure old stream is off
      stopCamera();
      // Mark active so <video> is definitely mounted
      setStreamActive(true);
      await new Promise((r) => requestAnimationFrame(r));

      const video = videoRef.current;
      if (!video) throw new Error("No video element found");

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback to user-facing
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
      }

      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      await video.play().catch(() => {});

      const ready = await waitForVideoReady(video, 2500);
      setVideoDims({
        w: video.videoWidth || 1280,
        h: video.videoHeight || 720,
        ready,
      });
      setLiveSessionId(uuid());
      setResult(null);
      setCapturedBlob(null);
      setPreviewUrl(null);
    } catch (e) {
      toast({
        title: "Camera error",
        description: e.message || "Unable to access camera",
        status: "error",
      });
      setStreamActive(false);
    } finally {
      setStartingCam(false);
    }
  }

  async function restartCamera() {
    stopCamera();
    await startCamera();
  }

  async function captureFrame() {
    try {
      const video = videoRef.current;
      if (!video || !streamActive) {
        toast({ title: "Start camera first", status: "warning" });
        return;
      }
      await waitForVideoReady(video, 1000);
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;

      if (!canvasRef.current)
        canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(vw, vh));
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);

      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const blob = await canvasToJpegBlob(canvas, 0.8);
      const url = URL.createObjectURL(blob);

      setCapturedBlob(blob);
      setPreviewUrl(url);
      setCapturedAt(new Date());
      setResult(null);
    } catch (e) {
      toast({
        title: "Capture error",
        description: e.message || "Could not capture frame",
        status: "error",
      });
    }
  }

  function captureIsFresh() {
    if (!capturedAt) return false;
    return Date.now() - capturedAt.getTime() <= LIVE_MAX_AGE_MS;
  }

  async function handleAnalyze() {
    try {
      if (remaining <= 0) {
        toast({ title: "Daily limit reached (3)", status: "info" });
        return;
      }
      if (!streamActive) {
        toast({ title: "Start camera first", status: "warning" });
        return;
      }
      if (!capturedBlob) {
        toast({ title: "Capture a live frame first", status: "warning" });
        return;
      }
      if (!captureIsFresh()) {
        toast({ title: "Capture too old — capture again", status: "warning" });
        return;
      }

      setAnalyzing(true);
      const token = getToken();
      if (!token) throw new Error("Not logged in");

      // On-device gating: reject person/selfie or non-food frames
      let canvas = canvasRef.current;
      if (!canvas && previewUrl) {
        // Rebuild from preview if needed
        canvas = document.createElement("canvas");
        const img = document.createElement("img");
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = rej;
          img.src = previewUrl;
        });
        const maxDim = 512;
        const scale = Math.min(
          1,
          maxDim / Math.max(img.naturalWidth, img.naturalHeight)
        );
        canvas.width = Math.round(img.naturalWidth * scale);
        canvas.height = Math.round(img.naturalHeight * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      if (canvas) {
        const { hasPerson, mealLikely } = await detectFoodAndPerson(canvas);
        if (hasPerson)
          throw new Error(
            "Person detected in frame. Please capture only the meal."
          );
        if (!mealLikely)
          throw new Error("No meal detected. Point the camera at your food.");
      }

      // Proceed to backend (still live-only, still 3/day)
      const form = new FormData();
      form.append("image", capturedBlob, "live.jpg");
      if (mealType) form.append("mealType", mealType);
      form.append("capturedAt", capturedAt.toISOString());
      form.append("liveSessionId", liveSessionId || "");

      const res = await fetch(
        `${API_URL}/meals/analyze?tzOffsetMin=${tzOffsetMin()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "X-Live-Capture": "1",
          },
          body: form,
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setResult(data.analysis || null);
      setRemaining(data.remaining ?? 0);
      setUsedTypes(data.used || []);
      toast({ title: "Meal analyzed!", status: "success" });
    } catch (e) {
      toast({
        title: "Analysis error",
        description: e.message,
        status: "error",
      });
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <Box p={6} bg="white" rounded="xl" boxShadow="md">
      <VStack align="stretch" spacing={4}>
        <HStack justify="space-between" align="center">
          <Heading size="md">Today’s Meal</Heading>
          <HStack>
            {summaryLoading && <Spinner size="sm" />}
            <Badge colorScheme={remaining <= 0 ? "red" : "purple"}>
              Remaining: {remaining}/3
            </Badge>
          </HStack>
        </HStack>

        <Text color="gray.600">
          Live camera only. Capture a frame and we’ll estimate protein, carbs,
          fats and give quick feedback. Photos are not stored.
        </Text>

        {/* Controls */}
        <HStack spacing={3}>
          {!streamActive ? (
            <Button
              colorScheme="purple"
              onClick={startCamera}
              isLoading={startingCam}
            >
              Start Camera
            </Button>
          ) : (
            <>
              <Button onClick={stopCamera} variant="outline">
                Stop Camera
              </Button>
              <Button onClick={restartCamera} variant="outline">
                Restart Camera
              </Button>
            </>
          )}

          <Select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            placeholder="Meal type (optional)"
            maxW="220px"
            isDisabled={remaining <= 0}
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t} disabled={usedTypes.includes(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}{" "}
                {usedTypes.includes(t) ? "• done" : ""}
              </option>
            ))}
          </Select>

          <Button
            onClick={captureFrame}
            isDisabled={!streamActive || remaining <= 0}
            variant="outline"
          >
            Capture
          </Button>

          <Button
            colorScheme="purple"
            onClick={handleAnalyze}
            isLoading={analyzing}
            isDisabled={!streamActive || !capturedBlob || remaining <= 0}
          >
            Analyze
          </Button>
        </HStack>

        {/* Always-rendered video (hidden when camera off) */}
        <Box
          position="relative"
          maxW="100%"
          overflow="hidden"
          rounded="md"
          border="1px solid #eee"
          style={{ display: streamActive ? "block" : "none" }}
        >
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            style={{ width: "100%", height: "auto" }}
            onLoadedMetadata={() => {
              const v = videoRef.current;
              if (v)
                setVideoDims({
                  w: v.videoWidth || 0,
                  h: v.videoHeight || 0,
                  ready: !!v.videoWidth,
                });
            }}
          />
          <Badge position="absolute" top="8px" left="8px" colorScheme="red">
            LIVE
          </Badge>
          <Badge
            position="absolute"
            top="8px"
            right="8px"
            colorScheme={videoDims.ready ? "green" : "yellow"}
          >
            {videoDims.ready ? `${videoDims.w}×${videoDims.h}` : "warming up…"}
          </Badge>
        </Box>

        {/* Captured preview */}
        {!streamActive && previewUrl && (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1}>
              Captured (analyze within {Math.floor(LIVE_MAX_AGE_MS / 1000)}s)
            </Text>
            <Image
              src={previewUrl}
              alt="captured meal frame"
              maxH="220px"
              objectFit="contain"
              rounded="md"
              border="1px solid #eee"
            />
          </Box>
        )}

        {result && (
          <>
            <Divider />
            <VStack align="stretch" spacing={1}>
              <Heading size="sm">Result</Heading>
              <Text color="gray.700">{result.feedback}</Text>
              <Text fontSize="sm" color="gray.600">
                Protein: {result.protein_g} g • Carbs: {result.carbs_g} g • Fat:{" "}
                {result.fat_g} g • Calories: {result.calories}
              </Text>
            </VStack>
          </>
        )}

        <Text fontSize="xs" color="gray.500">
          Permission: {permissionState}. Chrome supports camera on
          http://localhost. If it fails, try restarting the camera or your
          browser.
        </Text>
      </VStack>
    </Box>
  );
}
