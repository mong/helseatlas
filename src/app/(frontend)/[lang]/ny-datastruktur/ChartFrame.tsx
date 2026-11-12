import { Box, Typography } from "@mui/material";
import type React from "react";

export type ChartFrameOptions = {
	author: "SKDE" | "Helse Førde";
	caption: string;
	graphRef: React.Ref<HTMLDivElement>;
	id: string;
	role?: "tabpanel";
	"aria-labelledby"?: string;
};

type ChartFrameProps = ChartFrameOptions & {
	children: React.ReactNode;
	warning?: React.ReactNode;
};

export function ChartFrame({
	author,
	caption,
	graphRef,
	id,
	role,
	warning,
	children,
}: ChartFrameProps) {
	return (
		<div className="px-0 md:px-8" ref={graphRef} id={id} role={role}>
			{warning}
			<Box
				sx={{
					width: "100%",
					height: "80vw",
					maxHeight: 700,
					minHeight: 370,
					position: "relative",
				}}
			>
				{children}
				<Box
					component="img"
					alt={`${author} logo`}
					src={
						author === "SKDE"
							? "/img/logo-skde-graa.svg"
							: "/img/helse-forde-graa.svg"
					}
					sx={{
						width: "15vw",
						maxWidth: author === "SKDE" ? 100 : 150,
						position: "absolute",
						bottom: 55,
						right: 30,
						pointerEvents: "none",
					}}
				/>
			</Box>
			<Typography
				variant="body2"
				sx={{ textAlign: "center", padding: 2, paddingBottom: 3 }}
			>
				{caption}
			</Typography>
		</div>
	);
}
