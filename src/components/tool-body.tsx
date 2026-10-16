import { EmiTool } from "@/components/tools/emi";
import { GstTool } from "@/components/tools/gst";
import { InvoiceTool } from "@/components/tools/invoice";
import { JsonTool } from "@/components/tools/json-tool";
import { QuoteTool } from "@/components/tools/quote";

export function ToolBody({ slug }: { slug: string }) {
  switch (slug) {
    case "gst-calculator":
      return <GstTool />;
    case "emi-calculator":
      return <EmiTool />;
    case "invoice":
      return <InvoiceTool />;
    case "json-formatter":
      return <JsonTool />;
    case "quote-calculator":
      return <QuoteTool />;
    default:
      return null;
  }
}
