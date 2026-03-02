import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { Box, CssBaseline } from "@mui/material";
import skdeTheme from "@/themes/SkdeTheme";
import Footer from "@/components/Footer";
import MatomoTracker from "../MatomoTracker";
import { loginCredentials } from "@/lib/authorization";
import AdminBar from "@/components/AdminBar";
import { draftMode } from "next/headers";

import './globals.css'

export const metadata: Metadata = {
  title: "Helseatlas oppdaterte analyser",
  description: "Visning av oppdaterte analyser fra Helseatlas",
};

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { isEnabled } = await draftMode()
  const { lang } = await props.params;

  const credentials = await loginCredentials();

  return (
    <html lang={lang}>
      <MatomoTracker />
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={skdeTheme}>
            <CssBaseline />

            {credentials && <AdminBar {...credentials} preview={isEnabled} />}
            <Box
              sx={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {props.children}
              <Footer />
            </Box>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
