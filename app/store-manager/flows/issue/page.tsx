// Store Manager — Issue Ingredients flow (Store → Kitchen). M2-3c (ADR-44
// body reversal → Option A): the multi-row <SelectableProductRow> picker,
// wired to POST /api/stock-movements/issues/batch. See
// ../movement-picker-flow.tsx.
import { IssueProductionFlow } from "../issue-production-flow";

export default function IssueFlowPage() {
  return <IssueProductionFlow mode="issue" />;
}
