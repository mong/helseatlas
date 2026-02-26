import { cache, Suspense } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import Header from "@/components/Header";
import { Lang } from "@/types";
import { ChartContainer } from "@/components/Charts/ChartContainer";
import { getDictionary } from "@/lib/dictionaries";
import { getSubHeader, makeDateElem } from "@/lib/helpers";
import { BreadCrumbStop } from "@/components/Header/SkdeBreadcrumbs";
import TagList from "@/components/TagList";
import DownloadDataButton from "./DownloadDataButton";
import { notFound } from "next/navigation";
import { Compare } from "@/components/Compare";
import { draftMode } from "next/headers";
import { getPayload } from "payload";
import configPromise from "@payload-config";
import { LivePreviewListener } from "@/components/LivePreviewListener";
import RichText from "@/components/RichText";

import { createHash } from "crypto";

export async function generateStaticParams() {
  if (process.env.NODE_ENV === 'development') return [];

  const payload = await getPayload({ config: configPromise })
  const result = (await Promise.all((["en", "no"] as Lang[]).map(async (lang) =>
    (await payload.find({
      collection: 'analyser',
      draft: false,
      limit: 0,
      locale: lang,
      fallbackLocale: false,
      overrideAccess: false,
      pagination: false,
      where: {
        publiseringsStatus: { not_equals: "hidden" }
      },
      select: {
        slug: true,
      },
    })).docs.map(({ slug }) => ({ analyseName: slug, lang }))
  ))).flat();

  return result;
}



export const generateMetadata = async (props: {
  params: Promise<{ lang: Lang; analyseName: string; }>;
}) => {
  const { lang, analyseName } = await props.params;

  const analyse = await queryAnalyseBySlug({ slug: analyseName, lang });

  if (!analyse) notFound();

  const tags =
    analyse.tags?.filter((tag) => typeof tag === "object" && tag !== null) ||
    [];

  const dict = await getDictionary(lang);

  return {
    title: `${analyse.title} - ${dict.general.updated_health_atlas}`,
    description: `${dict.general.updated_health_atlas}`,
    keywords: `${tags
      .map((tag) => tag.title)
      .join(", ")}, ${dict.general.metadata_keywords}`,
  };
};

export default async function AnalysePage(props: {
  params: Promise<{ lang: Lang; analyseName: string; }>;
}) {
  const { lang, analyseName } = await props.params;
  const { isEnabled: draft } = await draftMode();

  const analyse = await queryAnalyseBySlug({ slug: analyseName, lang });

  if (!analyse || analyse.publiseringsStatus === "hidden" || !["en", "no"].includes(lang)) {
    notFound();
  }


  const oldAnalyse = draft && analyse._status === "draft"
    ? (await queryAnalyseBySlug({ slug: analyseName, lang, disableDraft: true }))
    : false;

  const dataHash = createHash("md5")
    .update(JSON.stringify(analyse.data || ""))
    .digest("hex");

  const oldDataHash = createHash("md5")
    .update(JSON.stringify(oldAnalyse && oldAnalyse.data || ""))
    .digest("hex");

  const dict = await getDictionary(lang);

  const breadcrumbs: BreadCrumbStop[] = [
    {
      link: "https://www.skde.no",
      text: dict.general.homepage,
    },
    {
      link: "https://www.skde.no/helseatlas",
      text: dict.general.health_atlas,
    },
    {
      link: `/${lang}`,
      text: dict.general.updated_health_atlas,
    },
    {
      link: `/${lang}/analyse/${analyse.slug}`,
      text: analyse.title,
    },
  ];

  return (
    <>
      <Header lang={lang} breadcrumbs={breadcrumbs} title={analyse.title}>
        <Typography variant="h6" sx={{ marginY: 2 }}>
          {getSubHeader(analyse.data, lang)}
        </Typography>
        <Stack
          direction={"row"}
          spacing={2}
          sx={{ marginTop: 2, justifyContent: "space-between" }}
        >
          {analyse.tags && (
            <TagList
              tags={analyse.tags.filter(
                (tag) => typeof tag === "object" && tag !== null,
              )}
              lang={lang}
            />
          )}
          <Typography variant="body2">
            {dict.general.updated}{" "}
            {makeDateElem(analyse.publishedAt || analyse.createdAt, lang)}
          </Typography>
        </Stack>
      </Header>
      <main>
        {draft && <LivePreviewListener />}
        <Container
          maxWidth="xxl"
          disableGutters={false}
          sx={{ paddingY: 4, paddingX: { xs: 2, md: 4 } }}
        >
          {analyse.publiseringsStatus === "test" && (
            <Alert severity="warning">
              Dette er en test-side! Denne analysen er fortsatt ikke publisert.
            </Alert>
          )}
          {analyse.publiseringsStatus === "test" && (
            <Paper
              elevation={0}
              sx={{
                marginTop: 2,
                padding: 2,
                paddingY: 4,
                boxShadow: "inset 0 0 25px #003087",
                background: "#F9F9F9",
              }}
            >
              <Compare
                newAnalyse={analyse.data}
                different={oldDataHash !== dataHash}
                oldAnalyse={oldAnalyse && oldAnalyse.data}
              />
            </Paper>)}
          <Suspense
            fallback={
              <Grid container justifyContent="center" sx={{ padding: 10 }}>
                <CircularProgress />
              </Grid>
            }
          >
            <Box sx={{ padding: 2 }}>
              <Typography variant="h3">{dict.analysebox.summary}</Typography>
              <RichText data={analyse.summary} enableGutter={true} />
            </Box>
            {analyse.data?.name && analyse.data.name === analyse.slug ? (
              <ChartContainer
                key={dataHash} // Providing key to update state when new files are uploaded in preview
                analyse={analyse}
                lang={lang}
                dict={dict}
              />
            ) : (
              <Alert severity="error">
                {analyse.data?.name !== analyse.slug
                  ? "Feil navn i JSON-fila (må være identisk med 'slug')"
                  : "JSON-fil mangler eller inneholder feil"}
              </Alert>
            )}

            <Typography variant="h3" sx={{ mt: 4 }}>
              {dict.analysebox.discussion}
            </Typography>
            <RichText data={analyse.discussion} enableGutter={true} />

            <Typography variant="h3" sx={{ mt: 4 }}>
              {dict.analysebox.info}
            </Typography>
            <RichText data={analyse.about} enableGutter={true} />
            <Typography variant="h3">Data</Typography>
            <Typography
              variant="body1"
              component="div"
              sx={{ "@media print": { fontSize: "1rem" } }}
            >
              <p>{dict.analysebox.download_data_text}</p>
            </Typography>
            <Box sx={{ displayPrint: "none" }}>
              <DownloadDataButton
                analyse={analyse.data}
                dict={dict}
              />
            </Box>
          </Suspense>
        </Container>
      </main>
    </>
  );
}

const queryAnalyseBySlug = cache(
  async ({ slug, lang, disableDraft = false }: { slug: string; lang: Lang, disableDraft?: boolean }) => {
    const { isEnabled: draft } = await draftMode();

    const payload = await getPayload({ config: configPromise });

    const result = await payload.find({
      collection: "analyser",
      draft: draft && !disableDraft,
      limit: 1,
      overrideAccess: draft,
      pagination: false,
      locale: lang,
      fallbackLocale: false,
      where: {
        slug: {
          equals: slug,
        },
      },
    });

    return result.docs?.[0] || null;
  },
);
