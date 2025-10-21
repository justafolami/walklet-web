"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
} from "@chakra-ui/react";
import { API_URL } from "../../lib/api";
import { saveToken } from "../../lib/auth";

export default function AuthPage() {
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      saveToken(data.token);
      toast({ title: "Logged in!", status: "success" });
      router.push("/");
    } catch (e) {
      toast({ title: "Login error", description: e.message, status: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxW="container.sm" py={10}>
      <VStack spacing={6} align="stretch">
        <HStack>
          <Box fontSize="2xl">🚶🍎</Box>
          <Heading size="lg">Walklet</Heading>
        </HStack>
        <Text color="gray.600">Sign in to continue.</Text>

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
          <Button
            colorScheme="purple"
            onClick={handleLogin}
            isLoading={loading}
          >
            Sign In
          </Button>
        </VStack>

        <Box fontSize="sm" color="gray.500">
          Don’t have an account yet? We’ll add Sign up next.
        </Box>
      </VStack>
    </Container>
  );
}
