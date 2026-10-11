import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { getAllCrops, getCrop } from "@/data/master-crop-data";

export default defineTool({
  name: "get_crop_guide",
  title: "Get crop guide",
  description:
    "Get the full Bengali cultivation guide for one crop: stages, tasks, fertilizer schedule, varieties, costs, risks and tips.",
  inputSchema: {
    crop: z
      .string()
      .trim()
      .min(1)
      .describe("Crop id, Bengali name, or English name, e.g. 'tomato' / 'টমেটো'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ crop }) => {
    const needle = crop.toLowerCase();
    const found =
      getCrop(crop) ??
      getAllCrops().find(
        (c) =>
          c.id.toLowerCase() === needle ||
          c.name === crop ||
          c.nameEn.toLowerCase() === needle ||
          c.nameEn.toLowerCase().includes(needle),
      );
    if (!found)
      return {
        content: [{ type: "text", text: `No crop guide found for "${crop}".` }],
        isError: true,
      };
    const guide = {
      id: found.id,
      name: found.name,
      nameEn: found.nameEn,
      category: found.category,
      seasons: found.seasons,
      plantingMonths: found.plantingMonths,
      harvestMonths: found.harvestMonths,
      totalDays: found.totalDays,
      soilTypes: found.soilTypes,
      waterRequirement: found.waterRequirement,
      phRange: found.phRange,
      costs: {
        seed: found.seedCostPerBigha,
        fertilizer: found.fertilizerCost,
        pesticide: found.pesticideCost,
        labor: found.laborCost,
        other: found.otherCost,
        total: found.totalCost,
      },
      yieldMin: found.yieldMin,
      yieldMax: found.yieldMax,
      avgMarketPrice: found.avgMarketPrice,
      profitMin: found.profitMin,
      profitMax: found.profitMax,
      roiPercent: found.roi,
      riskLevel: found.riskLevel,
      riskFactors: found.riskFactors,
      varieties: found.varieties,
      stages: found.stages,
      fertilizerGuide: found.fertilizerGuide,
      calendarEvents: found.calendarEvents,
      tips: found.tips,
      govtSupport: found.govtSupport,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(guide) }],
      structuredContent: { crop: guide },
    };
  },
});
