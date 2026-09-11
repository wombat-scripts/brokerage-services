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
            Live modules open the fixture book or Andre&apos;s Desk API when{" "}
            <code>DESK_API_BASE_URL</code> is set. Valuation, Pricing, and Opportunities wait here
            until they have a real screen.
          </p>
        </div>
      </div>
      <ToolsHub />
    </>
  );
}
