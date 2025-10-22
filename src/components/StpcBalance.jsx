"use client";

import { useMemo } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  Badge,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { useReadContract } from "wagmi";
import { formatUnits } from "viem";

const ERC20_ABI = [
  {
    type: "function",
    stateMutability: "view",
    name: "balanceOf",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
];

const RAW_ADDR = (process.env.NEXT_PUBLIC_STPC_ADDRESS || "").trim();
const isValidTokenAddress = /^0x[a-fA-F0-9]{40}$/.test(RAW_ADDR);

export default function StpcBalance({ address, chainId = 84532 }) {
  const toast = useToast();

  const canRead = useMemo(() => isValidTokenAddress && !!address, [address]);

  const { data, refetch, isFetching, error } = useReadContract({
    abi: ERC20_ABI,
    address: isValidTokenAddress ? RAW_ADDR : undefined,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId,
    query: { enabled: canRead },
  });

  const balance = data ? formatUnits(data, 18) : "0";

  return (
    <Box p={6} bg="white" rounded="xl" boxShadow="md">
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between" align="center">
          <Heading size="md">STPC Balance</Heading>
          <Badge colorScheme="purple">Base Sepolia</Badge>
        </HStack>

        {!isValidTokenAddress && (
          <Text color="red.500" fontSize="sm">
            NEXT_PUBLIC_STPC_ADDRESS is not set or invalid. Add it to .env.local
            and restart:
            <br />
            NEXT_PUBLIC_STPC_ADDRESS=0xYourStepicToken
          </Text>
        )}

        {!address && (
          <Text color="orange.600" fontSize="sm">
            No wallet/app address to read from. Make sure you’re logged in (app
            wallet) or connect a wallet.
          </Text>
        )}

        <HStack justify="space-between" align="center" mt={1}>
          <Text fontSize="lg" fontFamily="mono">
            {canRead ? isFetching ? <Spinner size="sm" /> : balance : "—"}
          </Text>
          <HStack>
            <Button
              size="sm"
              onClick={() => refetch()}
              isLoading={isFetching}
              isDisabled={!canRead}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  if (!window.ethereum?.request) {
                    toast({ title: "No wallet found", status: "warning" });
                    return;
                  }
                  await window.ethereum.request({
                    method: "wallet_watchAsset",
                    params: {
                      type: "ERC20",
                      options: {
                        address: RAW_ADDR,
                        symbol: "STPC",
                        decimals: 18,
                        image: "",
                      },
                    },
                  });
                } catch (e) {
                  toast({
                    title: "Add token failed",
                    description: e.message,
                    status: "error",
                  });
                }
              }}
              isDisabled={!isValidTokenAddress}
            >
              Add to wallet
            </Button>
          </HStack>
        </HStack>

        <Text fontSize="xs" color="gray.500">
          Token: {RAW_ADDR || "—"}
        </Text>
        <Text fontSize="xs" color="gray.500">
          Reading for address: {address || "—"}
        </Text>

        {error && isValidTokenAddress && address && (
          <Text color="red.500" fontSize="sm">
            Read error: {error.message}
          </Text>
        )}
      </VStack>
    </Box>
  );
}
