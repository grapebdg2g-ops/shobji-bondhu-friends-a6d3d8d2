import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listCrops from "./tools/list-crops";
import getCropGuide from "./tools/get-crop-guide";
import listMarketPrices from "./tools/list-market-prices";
import reportMarketPrice from "./tools/report-market-price";

// Vite inlines the stable ref; the published SUPABASE_URL may be a proxy.
const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "shobji-bondhu",
  title: "Shobji Bondhu",
  version: "0.1.0",
  instructions:
    "Bengali farming assistant tools: browse crop guides, read community market prices, and report a market price as the signed-in farmer.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listCrops, getCropGuide, listMarketPrices, reportMarketPrice],
});
