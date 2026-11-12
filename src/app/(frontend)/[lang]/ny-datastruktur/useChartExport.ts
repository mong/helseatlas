import { snapdom } from "@zumer/snapdom";
import React from "react";
import type { Lang } from "@/types";
import type { AnalysisData } from "./chartData";

type UseChartExportOptions = {
	data: AnalysisData;
	title: string;
	imageFilename: string;
	messages: Record<string, string>;
	lang: Lang;
};

export function useChartExport({
	data,
	title,
	imageFilename,
	messages,
	lang,
}: UseChartExportOptions) {
	const graphRef = React.useRef<HTMLDivElement>(null);
	const [notification, setNotification] = React.useState<{
		message: string;
		error: boolean;
	}>();

	function closeNotification() {
		setNotification(undefined);
	}

	async function download(option: string) {
		try {
			if (option === messages.download_data) {
				const url = URL.createObjectURL(
					new Blob([JSON.stringify(data, null, 2)], {
						type: "application/json",
					}),
				);
				const link = document.createElement("a");
				link.href = url;
				link.download = `${title}.json`;
				document.body.appendChild(link);
				link.click();
				link.remove();
				setTimeout(() => URL.revokeObjectURL(url), 0);
				return;
			}
			if (!graphRef.current)
				throw new Error("The chart is not available for export");
			if (option === messages.copy_graph) {
				const blob = await snapdom.toBlob(graphRef.current, { type: "png" });
				if (!blob) throw new Error("Unable to create a chart image");
				await navigator.clipboard.write([
					new ClipboardItem({ [blob.type]: blob }),
				]);
				setNotification({
					message: messages.copy_graph_snackbar_message,
					error: false,
				});
			} else if (option === messages.download_graph) {
				const result = await snapdom(graphRef.current);
				await result.download({
					format: "png",
					backgroundColor: "white",
					filename: imageFilename,
				});
			}
		} catch (error) {
			console.error("Chart export failed", error);
			setNotification({
				message: `${lang === "en" ? "Export failed" : "Eksport feilet"}: ${error instanceof Error ? error.message : String(error)}`,
				error: true,
			});
		}
	}

	return { graphRef, download, notification, closeNotification };
}
