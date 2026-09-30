import type { Metadata } from "next";

import MatomoTracker from "../MatomoTracker";
import AdminBar from "@/components/AdminBar";
import { draftMode } from "next/headers";
import {
  SkdeThemeProvider,
  MainLayout,
  Footer,
} from "@mong/material-ui";

import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';

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

  return (
    <html lang={lang}>
      <MatomoTracker />
      <body>
        <AppRouterCacheProvider>
          <AdminBar preview={isEnabled} />
          <SkdeThemeProvider>
            <MainLayout>
              {props.children}
              <Footer lang={lang} />
            </MainLayout>
          </SkdeThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
