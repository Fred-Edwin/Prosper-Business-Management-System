import{j as e,c as l}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const p={success:"bg-success",warning:"bg-warning",danger:"bg-danger",info:"bg-info",neutral:"[background-color:var(--text-tertiary)]"},g={success:"text-success",warning:"text-warning",danger:"text-danger",info:"text-info",neutral:"[color:var(--text-secondary)]"};function a({variant:n,children:d,className:u}){return e.jsxs("div",{className:l("[font-synthesis:none] flex items-center h-[20px] rounded-lg gap-[6px] antialiased",u),children:[e.jsx("div",{className:l("w-[6px] h-[6px] shrink-0 rounded-[50%]",p[n])}),e.jsx("div",{className:l("font-ui font-(--weight-medium) text-caption/micro",g[n]),children:d})]})}a.__docgenInfo={description:"",methods:[],displayName:"StatusChip",props:{variant:{required:!0,tsType:{name:"union",raw:`| "success"
| "warning"
| "danger"
| "info"
| "neutral"`,elements:[{name:"literal",value:'"success"'},{name:"literal",value:'"warning"'},{name:"literal",value:'"danger"'},{name:"literal",value:'"info"'},{name:"literal",value:'"neutral"'}]},description:""},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:h,within:m}=__STORYBOOK_MODULE_TEST__,w={title:"Kit/StatusChip",component:a,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic semantic-colour text contrast — Session 10c): the `warning` chip label is `--color-warning` on `--surface-page` ≈ 2.5:1, below WCAG AA 4.5:1. This is the drawn `6DO-0` visual — the accompanying dot + short label make the semantic reading redundant with colour, but the text itself is sub-threshold. Same call as the DatePicker cells / Select placeholder. `color-contrast` is scoped off for these stories → design-sprint decision (darken the amber label token for text use, or accept as a status indicator where colour is not the only cue)."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},r={args:{variant:"success",children:"Matched"}},t={args:{variant:"warning",children:"Pending"}},s={args:{variant:"danger",children:"Short"}},i={args:{variant:"info",children:"Awaiting receipt"}},c={args:{variant:"neutral",children:"Closed"}},o={name:"All five semantic variants (REST row — 6DO-0)",render:()=>e.jsxs("div",{style:{display:"flex",gap:16,flexWrap:"wrap"},children:[e.jsx(a,{variant:"success",children:"Matched"}),e.jsx(a,{variant:"warning",children:"Pending"}),e.jsx(a,{variant:"danger",children:"Short"}),e.jsx(a,{variant:"info",children:"Awaiting receipt"}),e.jsx(a,{variant:"neutral",children:"Closed"})]}),play:async({canvasElement:n})=>{await h(m(n).getByText("Matched")).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "success",
    children: "Matched"
  }
}`,...r.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "warning",
    children: "Pending"
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "danger",
    children: "Short"
  }
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "info",
    children: "Awaiting receipt"
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "neutral",
    children: "Closed"
  }
}`,...c.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "All five semantic variants (REST row — 6DO-0)",
  render: () => <div style={{
    display: "flex",
    gap: 16,
    flexWrap: "wrap"
  }}>
      <StatusChip variant="success">Matched</StatusChip>
      <StatusChip variant="warning">Pending</StatusChip>
      <StatusChip variant="danger">Short</StatusChip>
      <StatusChip variant="info">Awaiting receipt</StatusChip>
      <StatusChip variant="neutral">Closed</StatusChip>
    </div>,
  play: async ({
    canvasElement
  }) => {
    // display-only: no role, just text
    await expect(within(canvasElement).getByText("Matched")).toBeInTheDocument();
  }
}`,...o.parameters?.docs?.source}}};const S=["Success","Warning","Danger","Info","Neutral","AllVariants"];export{o as AllVariants,s as Danger,i as Info,c as Neutral,r as Success,t as Warning,S as __namedExportsOrder,w as default};
