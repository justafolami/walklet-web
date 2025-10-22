"use client";

import { useEffect, useState } from "react";
import {
  Box,
  VStack,
  HStack,
  Heading,
  Text,
  Button,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Badge,
  useToast,
  Divider,
  Spinner,
} from "@chakra-ui/react";
import { API_URL, api } from "../lib/api";
import {
  useAccount,
  useChainId,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";

// Proper JSON ABI object (viem/wagmi expects objects, not strings)
const CLAIM_ABI = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "claimReward",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
];

// Hex for Base Sepolia chainId (84532)
const BASE_SEPOLIA_HEX = "0x14a74";

function toHexChain(chainId) {
  return "0x" + Number(chainId).toString(16);
}

export default function DevRewardsCard({ onClaimed }) {
  const toast = useToast();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [devEnabled, setDevEnabled] = useState(false);
  const [loadingDev, setLoadingDev] = useState(true);

  const [steps, setSteps] = useState(120);
  const [voucher, setVoucher] = useState(null);
  const [creating, setCreating] = useState(false);

  const {
    writeContract,
    data: txHash,
    isPending: isClaiming,
    error: claimError,
  } = useWriteContract();
  const { isLoading: waitingTx, isSuccess: claimSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_URL}/dev/info`);
        const d = await r.json().catch(() => ({}));
        setDevEnabled(Boolean(d?.enabled));
      } catch {
        setDevEnabled(false);
      } finally {
        setLoadingDev(false);
      }
    })();
  }, []);

  async function createVoucher() {
    try {
      if (!isConnected || !address) {
        toast({ title: "Connect wallet first", status: "warning" });
        return;
      }
      setCreating(true);
      const v = await api("/dev/rewards/voucher-walk", {
        method: "POST",
        body: { steps: Number(steps || 0), to: address },
      });
      setVoucher(v);
      toast({ title: `Voucher created: ${v.stpc} STPC`, status: "success" });
    } catch (e) {
      toast({
        title: "Voucher error",
        description: e.message,
        status: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  async function claim() {
    try {
      if (!voucher) {
        toast({ title: "Create a voucher first", status: "warning" });
        return;
      }
      // Ensure on the right chain
      if (window?.ethereum && chainId !== voucher.chainId) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [
            { chainId: toHexChain(voucher.chainId) || BASE_SEPOLIA_HEX },
          ],
        });
      }

      writeContract({
        address: voucher.contractAddress,
        abi: CLAIM_ABI,
        functionName: "claimReward",
        args: [
          voucher.user,
          BigInt(voucher.amount), // wei as BigInt
          BigInt(voucher.nonce), // uint256
          voucher.signature,
        ],
      });
    } catch (e) {
      toast({ title: "Claim error", description: e.message, status: "error" });
    }
  }

  useEffect(() => {
    if (claimError) {
      toast({
        title: "Claim failed",
        description: claimError.message,
        status: "error",
      });
    }
  }, [claimError, toast]);

  useEffect(() => {
    if (claimSuccess) {
      toast({ title: "Claimed on-chain! 🎉", status: "success" });
      setVoucher(null);
      onClaimed && onClaimed();
    }
  }, [claimSuccess, onClaimed, toast]);

  if (loadingDev) {
    return (
      <Box p={6} bg="white" rounded="xl" boxShadow="md">
        <HStack>
          <Spinner size="sm" />
          <Text>Loading dev tools…</Text>
        </HStack>
      </Box>
    );
  }
  if (!devEnabled) return null;

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
          <Heading size="md">Dev Rewards</Heading>
          <Badge colorScheme="purple">DEV</Badge>
        </HStack>

        <Text color="gray.600">
          Create a test voucher (1 STPC per {voucher?.stepsPerStpc ?? 10} steps)
          and claim on Base Sepolia.
        </Text>

        <HStack>
          <Text>Steps:</Text>
          <NumberInput
            size="sm"
            maxW="160px"
            min={0}
            step={10}
            value={steps}
            onChange={(v) => setSteps(Number(v) || 0)}
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
            onClick={createVoucher}
            isLoading={creating}
          >
            Create voucher
          </Button>
          <Button
            size="sm"
            onClick={claim}
            isLoading={isClaiming || waitingTx}
            isDisabled={!voucher}
          >
            Claim
          </Button>
        </HStack>

        {voucher && (
          <>
            <Divider />
            <VStack align="stretch" spacing={1}>
              <Text fontSize="sm" color="gray.700">
                Voucher: {voucher.stpc} STPC • Nonce {voucher.nonce}
              </Text>
              <Text fontSize="xs" color="gray.500">
                To: {voucher.user} • Contract: {voucher.contractAddress} •
                Chain: {voucher.chainId}
              </Text>
            </VStack>
          </>
        )}

        <Text fontSize="xs" color="gray.500">
          Make sure your wallet is on Base Sepolia and has a little test ETH for
          gas.
        </Text>
      </VStack>
    </Box>
  );
}
