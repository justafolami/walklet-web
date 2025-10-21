"use client";

import { ChakraProvider, extendTheme } from "@chakra-ui/react";

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

export default function Providers({ children }) {
  return <ChakraProvider theme={theme}>{children}</ChakraProvider>;
}
