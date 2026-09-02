import{j as e,c as r}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const p={Good:{dot:"bg-success",label:"text-success"},"Needs Repair":{dot:"bg-warning",label:"text-warning"},Decommissioned:{dot:"bg-danger",label:"text-danger"}};function o({condition:n,className:c}){const d=p[n];return e.jsxs("div",{className:r("[font-synthesis:none] flex items-center h-[20px] rounded-lg gap-[6px] antialiased",c),children:[e.jsx("div",{className:r("w-[6px] h-[6px] shrink-0 rounded-[50%]",d.dot)}),e.jsx("div",{className:r("font-ui font-(--weight-medium) text-caption/micro",d.label),children:n})]})}o.__docgenInfo={description:"",methods:[],displayName:"ConditionChip",props:{condition:{required:!0,tsType:{name:"union",raw:'"Good" | "Needs Repair" | "Decommissioned"',elements:[{name:"literal",value:'"Good"'},{name:"literal",value:'"Needs Repair"'},{name:"literal",value:'"Decommissioned"'}]},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:l,within:m}=__STORYBOOK_MODULE_TEST__,h={title:"Kit/ConditionChip",component:o,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic semantic-colour text contrast — Session 10c): the `Needs Repair` label is `--color-warning` on `--surface-page` ≈ 2.5:1, below WCAG AA 4.5:1 — the drawn `6EC-0` visual, with a redundant coloured dot. Same call as StatusChip. `color-contrast` scoped off for these stories → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},s={args:{condition:"Good"}},i={args:{condition:"Needs Repair"}},a={args:{condition:"Decommissioned"}},t={name:"All three conditions (REST row — 6EC-0)",render:()=>e.jsxs("div",{style:{display:"flex",gap:16,flexWrap:"wrap"},children:[e.jsx(o,{condition:"Good"}),e.jsx(o,{condition:"Needs Repair"}),e.jsx(o,{condition:"Decommissioned"})]}),play:async({canvasElement:n})=>{await l(m(n).getByText("Good")).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    condition: "Good"
  }
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    condition: "Needs Repair"
  }
}`,...i.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    condition: "Decommissioned"
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "All three conditions (REST row — 6EC-0)",
  render: () => <div style={{
    display: "flex",
    gap: 16,
    flexWrap: "wrap"
  }}>
      <ConditionChip condition="Good" />
      <ConditionChip condition="Needs Repair" />
      <ConditionChip condition="Decommissioned" />
    </div>,
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByText("Good")).toBeInTheDocument();
  }
}`,...t.parameters?.docs?.source}}};const f=["Good","NeedsRepair","Decommissioned","AllVariants"];export{t as AllVariants,a as Decommissioned,s as Good,i as NeedsRepair,f as __namedExportsOrder,h as default};
