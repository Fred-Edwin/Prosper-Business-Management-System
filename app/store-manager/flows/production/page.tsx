// Store Manager — Record Production flow (Kitchen → Restaurant). Session 12:
// composed from the kit + wired to POST /api/stock-movements
// { movementType: "production" }. ADR-44 — artboard 8XH-0 (right panel) superseded.
import { IssueProductionFlow } from "../issue-production-flow";

export default function ProductionFlowPage() {
  return <IssueProductionFlow mode="production" />;
}
