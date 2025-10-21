"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  HStack,
  useToast,
  Box,
  Spinner,
  FormHelperText,
  FormErrorMessage,
} from "@chakra-ui/react";
import { api } from "../../lib/api";
import { getToken } from "../../lib/auth";

function sanitizeUsername(s) {
  return s.trim().toLowerCase().replace(/\s+/g, "_"); // spaces -> underscores, to lowercase
}

export default function OnboardingPage() {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uErr, setUErr] = useState(null);

  useEffect(() => {
    // Require login
    const token = getToken();
    if (!token) {
      router.replace("/auth");
      return;
    }

    // If profile already completed (username exists), go home
    (async () => {
      try {
        const data = await api("/me");
        if (data?.user?.username) {
          router.replace("/");
          return;
        }
      } catch {
        router.replace("/auth");
        return;
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function validateUsername(name) {
    const s = sanitizeUsername(name);
    if (!s || s.length < 3) return "Username must be at least 3 characters";
    if (s.length > 30) return "Username must be at most 30 characters";
    if (!/^[a-z0-9._-]+$/i.test(s)) {
      return "Only letters, numbers, underscores (_), dots (.), and hyphens (-) are allowed";
    }
    return null;
  }

  useEffect(() => {
    setUErr(validateUsername(username));
  }, [username]);

  async function handleSubmit() {
    const err = validateUsername(username);
    if (err) {
      toast({ title: "Invalid username", description: err, status: "error" });
      return;
    }

    try {
      setSubmitting(true);
      const body = {
        username: sanitizeUsername(username), // send sanitized, lowercased
        age: age ? Number(age) : null,
        weightKg: weightKg ? Number(weightKg) : null,
        heightCm: heightCm ? Number(heightCm) : null,
      };
      const res = await api("/profile", { method: "POST", body });
      if (res?.user) {
        toast({ title: "Profile saved!", status: "success" });
        router.push("/");
      } else {
        toast({ title: "Something went wrong", status: "error" });
      }
    } catch (e) {
      toast({
        title: "Profile update error",
        description: e.message || "Please try again",
        status: "error",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <Container maxW="container.sm" py={10}>
        <HStack>
          <Spinner />
          <Text>Loading…</Text>
        </HStack>
      </Container>
    );
  }

  const preview = username ? sanitizeUsername(username) : "";

  return (
    <Container maxW="container.md" py={{ base: 10, md: 16 }}>
      <VStack spacing={{ base: 8, md: 10 }} align="stretch">
        {/* Hero heading */}
        <Box textAlign="center">
          <Heading
            size="2xl"
            fontWeight="extrabold"
            letterSpacing="tight"
            bgGradient="linear(to-r, purple.500, pink.400)"
            bgClip="text"
          >
            I Move, Therefore I Am
          </Heading>
          <Text
            mt={3}
            color="gray.700"
            fontSize={{ base: "md", md: "lg" }}
            maxW="3xl"
            mx="auto"
          >
            You define the movement. Tell us what success looks like for you
            today, and we'll help you log your journey and earn your rewards
          </Text>
        </Box>

        {/* Form card */}
        <Box
          bg="white"
          p={{ base: 6, md: 8 }}
          rounded="2xl"
          boxShadow="xl"
          borderLeft="8px solid"
          borderColor="brand.500"
        >
          <VStack align="stretch" spacing={5}>
            <FormControl isRequired isInvalid={!!uErr}>
              <FormLabel>Preferred Username</FormLabel>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., move_master or john-doe"
                focusBorderColor="purple.400"
              />
              {uErr ? (
                <FormErrorMessage>{uErr}</FormErrorMessage>
              ) : (
                <FormHelperText>
                  3–30 chars. Letters, numbers, underscores (_), dots (.), and
                  hyphens (-). Spaces will become underscores.
                  {preview ? (
                    <Text as="span" ml={2} fontWeight="medium" color="gray.700">
                      Preview: {preview}
                    </Text>
                  ) : null}
                </FormHelperText>
              )}
            </FormControl>

            <HStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Age</FormLabel>
                <Input
                  type="number"
                  min="1"
                  max="120"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g., 25"
                  focusBorderColor="purple.400"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Weight (kg)</FormLabel>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="e.g., 70"
                  focusBorderColor="purple.400"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Height (cm)</FormLabel>
                <Input
                  type="number"
                  min="50"
                  max="250"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="e.g., 170"
                  focusBorderColor="purple.400"
                />
              </FormControl>
            </HStack>

            <Button
              size="lg"
              onClick={handleSubmit}
              isLoading={submitting}
              bgGradient="linear(to-r, purple.500, pink.400)"
              color="white"
              _hover={{ opacity: 0.9 }}
            >
              Save Profile
            </Button>

            <Text fontSize="sm" color="gray.500" textAlign="center">
              You can update these anytime later in Settings.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
