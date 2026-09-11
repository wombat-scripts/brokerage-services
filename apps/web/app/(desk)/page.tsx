import { ToolsHub } from "@/components/tools-hub";

export const metadata = {
  title: "Tools",
};

export default function ToolsPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Desk tools</h1>
          <p>
            Live modules open the fixture book. Valuation, Pricing, and Opportunities wait here
            until they have a real screen.
          </p>
        </div>
      </div>
      <ToolsHub />
    </>
  );
}
