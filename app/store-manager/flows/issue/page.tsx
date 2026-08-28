// Store Manager — Issue Ingredients flow (Store → Kitchen). Session 12:
// composed from the kit + wired to POST /api/stock-movements
// { movementType: "issue" }. ADR-44 — artboard 8XH-0 (left panel) superseded.
import { IssueProductionFlow } from "../issue-production-flow";

export default function IssueFlowPage() {
  return <IssueProductionFlow mode="issue" />;
}
