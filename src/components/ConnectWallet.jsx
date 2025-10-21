"use client";

import { Button, HStack, Text, Badge } from "@chakra-ui/react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";

function shortAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export default function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, status } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Pick a sensible default connector
  const preferredConnector =
    connectors.find((c) => c.id === "injected" || c.name === "Injected") ||
    connectors.find((c) => c.name?.toLowerCase().includes("coinbase")) ||
    connectors[0];

  if (!isConnected) {
    return (
      <Button
        size="sm"
        colorScheme="purple"
        onClick={() => connect({ connector: preferredConnector })}
        isLoading={status === "pending"}
        isDisabled={!preferredConnector}
      >
        Connect Wallet
      </Button>
    );
  }

  const wrongNetwork = chainId !== baseSepolia.id;

  return (
    <HStack spacing={3}>
      <Badge colorScheme={wrongNetwork ? "red" : "green"}>
        {wrongNetwork ? "Wrong network" : "Base Sepolia"}
      </Badge>
      <Text fontSize="sm" fontFamily="mono">
        {shortAddress(address)}
      </Text>
      {wrongNetwork ? (
        <Button
          size="sm"
          colorScheme="purple"
          onClick={() => switchChain({ chainId: baseSepolia.id })}
        >
          Switch Network
        </Button>
      ) : (
        <Button size="sm" variant="outline" onClick={() => disconnect()}>
          Disconnect
        </Button>
      )}
    </HStack>
  );
}
