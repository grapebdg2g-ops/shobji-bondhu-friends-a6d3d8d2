import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getAllCrops } from "@/data/master-crop-data";

export default defineTool({
  name: "list_crops",
  title: "List crops",
  description:
    "List the crops covered by this app's Bengali farming guide, with season, category, duration and profitability summary.",
  inputSchema: {
    season: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Season filter: রবি, খরিফ-১, খরিফ-২, সারা বছর."),
    category: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe("Category filter: ধান্য, সবজি, মসলা, তেল, কন্দাল."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ season, category }) => {
    const crops = getAllCrops()
      .filter((c) => (season ? c.seasons.includes(season as never) : true))
      .filter((c) => (category ? c.category === category : true))
      .map((c) => ({
        id: c.id,
        name: c.name,
        nameEn: c.nameEn,
        category: c.category,
        seasons: c.seasons,
        totalDays: c.totalDays,
        plantingMonths: c.plantingMonths,
        harvestMonths: c.harvestMonths,
        totalCostPerBigha: c.totalCost,
        yieldRange: [c.yieldMin, c.yieldMax],
        roiPercent: c.roi,
        riskLevel: c.riskLevel,
      }));
    return {
      content: [{ type: "text", text: JSON.stringify(crops) }],
      structuredContent: { crops },
    };
  },
});
