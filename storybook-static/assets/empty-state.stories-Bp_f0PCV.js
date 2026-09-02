import{E as i}from"./empty-state-DAojvcOU.js";import"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./button-CREOhNf_.js";import"./spinner-RChkOJRi.js";const{expect:a,within:r}=__STORYBOOK_MODULE_TEST__,y={title:"Kit/Primitives/EmptyState",component:i,parameters:{layout:"padded",docs:{description:{component:'EmptyState (kit area 17, `9U3-0`, ADR-36d) — `component-states.md §8`.\ndefault / filtered-no-results. `role="status"` so a filter change is\nannounced; icon `aria-hidden`; the action composes the kit `<Button>`\n(primary for default, secondary for filtered).'}}}},e={name:"Default (no records yet) — ARTBOARD 9U9-0",args:{variant:"default",title:"No products yet",description:"Add your first product to start tracking stock movements.",actionLabel:"Add product"},play:async({canvasElement:t})=>{const s=r(t).getByRole("status");await a(s).toBeInTheDocument();const c=r(s).getByRole("button",{name:"Add product"});await a(c).toBeInTheDocument()}},n={name:"Filtered / no results — ARTBOARD 9UJ-0",args:{variant:"filtered",title:"No matches",description:"No products match “beeef”. Try a different search.",actionLabel:"Clear filters"},play:async({canvasElement:t})=>{await a(r(t).getByRole("status")).toBeInTheDocument(),await a(r(t).getByRole("button",{name:"Clear filters"})).toBeInTheDocument()}},o={name:"No action (message only)",args:{title:"Nothing logged today",description:"Movements will appear here as staff record them."}};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  name: "Default (no records yet) — ARTBOARD 9U9-0",
  args: {
    variant: "default",
    title: "No products yet",
    description: "Add your first product to start tracking stock movements.",
    actionLabel: "Add product"
  },
  play: async ({
    canvasElement
  }) => {
    const root = within(canvasElement).getByRole("status");
    await expect(root).toBeInTheDocument();
    const btn = within(root).getByRole("button", {
      name: "Add product"
    });
    await expect(btn).toBeInTheDocument();
  }
}`,...e.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "Filtered / no results — ARTBOARD 9UJ-0",
  args: {
    variant: "filtered",
    title: "No matches",
    description: "No products match “beeef”. Try a different search.",
    actionLabel: "Clear filters"
  },
  play: async ({
    canvasElement
  }) => {
    // filtered-no-results must be announced (role="status")
    await expect(within(canvasElement).getByRole("status")).toBeInTheDocument();
    await expect(within(canvasElement).getByRole("button", {
      name: "Clear filters"
    })).toBeInTheDocument();
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "No action (message only)",
  args: {
    title: "Nothing logged today",
    description: "Movements will appear here as staff record them."
  }
}`,...o.parameters?.docs?.source}}};const h=["Default","Filtered","NoAction"];export{e as Default,n as Filtered,o as NoAction,h as __namedExportsOrder,y as default};
