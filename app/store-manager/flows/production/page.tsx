// Store Manager — Record Batch Production flow (Kitchen → Restaurant).
// M2-3c (ADR-44 body reversal → Option A): the multi-row
// <SelectableProductRow> picker, wired to POST
// /api/stock-movements/production/batch. See ../movement-picker-flow.tsx.
import { IssueProductionFlow } from "../issue-production-flow";

export default function ProductionFlowPage() {
  return <IssueProductionFlow mode="production" />;
}
