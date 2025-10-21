"use client";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const theme = extendTheme({
  colors: {
    brand: {
      50: "#f2ebff",
      100: "#dacbff",
      200: "#c0a9ff",
      300: "#a787ff",
      400: "#8f68ff",
      500: "#6c5ce7",
      600: "#5749b5",
      700: "#423683",
      800: "#2c2452",
      900: "#161221",
    },
  },
});

const config = createConfig({
  chains: [baseSepolia], // Base Sepolia = current Base testnet
  transports: {
    [baseSepolia.id]: http(), // public RPC is fine for dev
  },
  connectors: [
    injected({ shimDisconnect: true }), // MetaMask/Injected
    coinbaseWallet({
      appName: "Walklet",
      preference: "all",
      chainId: baseSepolia.id,
    }),
  ],
});

const queryClient = new QueryClient();

export default function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider theme={theme}>{children}</ChakraProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
