import { Accordion, AccordionItem } from "@mong/material-ui";
import { JSONTree } from "react-json-tree";
import type {
	CategoryType,
	DimensionValues,
	Variable,
} from "@/app/(frontend)/[lang]/ny-datastruktur/chartData";
import analyseNew from "./autisme-barn-new.json";
import analyseOld from "./autisme-barn-old.json";

const jsonTreeTheme = {
	extend: "monokai",
	tree: {
		width: "40%",
		height: "100%",
		margin: 0,
		overflow: "auto",
		padding: "20px",
	},
};

type DebugDatastrukturProps = {
	state: {
		viewId: string;
		year: number;
		categoryType: CategoryType;
		dimensions: DimensionValues;
		selectedCategories: Record<string, string[]>;
		variable: Variable;
	};
};

const DebugDatastruktur = ({ state }: DebugDatastrukturProps) => {
	const {
		viewId,
		year,
		categoryType,
		dimensions,
		selectedCategories,
		variable,
	} = state;
	return (
		<div className="pt-2 pb-12 mt-1">
			<Accordion
				keyId="debug-datastruktur"
				gap="2"
				variant="text"
				type="allowMultiple"
			>
				<AccordionItem title="Orginal datastruktur">
					<div className="flex gap-8 w-full h-full overflow-auto">
						<JSONTree
							data={analyseOld}
							theme={jsonTreeTheme}
							invertTheme={false}
							hideRoot
						/>
					</div>
				</AccordionItem>

				<AccordionItem title="Ny datastruktur">
					<JSONTree
						data={analyseNew}
						theme={jsonTreeTheme}
						invertTheme={false}
						hideRoot
					/>
				</AccordionItem>

				<AccordionItem title="State">
					<JSONTree
						data={{
							viewId,
							year,
							categoryType,
							dimensions,
							selectedCategories,
							variable,
						}}
						theme={jsonTreeTheme}
						invertTheme={false}
						hideRoot
					/>
				</AccordionItem>
			</Accordion>
		</div>
	);
};

export default DebugDatastruktur;
