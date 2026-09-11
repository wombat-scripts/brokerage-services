import Link from "next/link";
import { DESK_TOOLS } from "@/lib/desk-tools";

export function ToolsHub() {
  return (
    <ul className="tool-grid">
      {DESK_TOOLS.map((tool) => {
        const body = (
          <>
            <span className={`stamp ${tool.href ? "stamp-yes" : "stamp-queued"}`}>
              {tool.href ? "Live" : "Coming soon"}
            </span>
            <h2>{tool.title}</h2>
            <p>{tool.blurb}</p>
            <span className="tool-cue">{tool.cue}</span>
          </>
        );

        if (tool.href) {
          return (
            <li key={tool.title}>
              <Link className="tool-card" href={tool.href}>
                {body}
              </Link>
            </li>
          );
        }

        return (
          <li key={tool.title}>
            <div className="tool-card soon" aria-disabled="true">
              {body}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
