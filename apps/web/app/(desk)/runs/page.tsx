import Link from "next/link";
import { RunList } from "@/components/run-list";
import { getDeskSource } from "@/lib/data";

export const metadata = {
  title: "Run history",
};

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ loan?: string }>;
}) {
  const { loan } = await searchParams;
  const source = getDeskSource();
  const book = await source.getBook();
  const runs = await source.listRuns(loan);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Run history</h1>
          <p>
            Append-only Opportunity Runs for a loan. Oldest stays. Void would need a reason. This
            list is the fixture book, not Postgres.
          </p>
        </div>
      </div>

      <div className="filters" aria-label="Loan filter">
        <Link href="/runs" aria-current={!loan ? "page" : undefined}>
          All loans
        </Link>
        {book.subjects.map((subject) => (
          <Link
            key={subject.loanPageId}
            href={`/runs?loan=${subject.loanPageId}`}
            aria-current={loan === subject.loanPageId ? "page" : undefined}
          >
            {subject.clientName} · {subject.loanLabel}
          </Link>
        ))}
      </div>

      <RunList runs={runs} subjects={book.subjects} />
    </>
  );
}
