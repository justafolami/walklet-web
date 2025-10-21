"use client";

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
} from "@chakra-ui/react";

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

export default function Home() {
  return (
    <Container maxW="container.md" py={10}>
      <VStack align="stretch" spacing={6}>
        <HStack justify="space-between">
          <HStack>
            <Box fontSize="2xl">🚶🍎</Box>
            <Heading size="lg">Walklet</Heading>
          </HStack>
          <Badge colorScheme="purple" variant="solid" rounded="md" p={2}>
            Alpha
          </Badge>
        </HStack>

        <Text color="gray.700">
          Welcome! Track your steps, analyze meals, and earn Stepic (STPC) as
          you build healthy habits.
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
            <Button size="lg" colorScheme="purple" w="full" isDisabled>
              Analyze Today’s Meal
            </Button>
            <Text fontSize="xs" color="gray.500">
              Camera access and AI analysis will come in a later step.
            </Text>
          </VStack>
        </Box>

        <Box p={6} bg="white" rounded="xl" boxShadow="md">
          <VStack spacing={3} align="stretch">
            <Heading size="md">Walk</Heading>
            <Text color="gray.600">
              Start a walk to track distance and steps.
            </Text>
            <HStack>
              <Button colorScheme="green" isDisabled>
                Start Walk
              </Button>
              <Button isDisabled>Stop</Button>
            </HStack>
            <Text fontSize="xs" color="gray.500">
              Live GPS tracking will be added later.
            </Text>
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
