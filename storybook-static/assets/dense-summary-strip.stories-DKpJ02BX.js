import{j as a,c as r}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const u={default:"text-(--text-inverse)",warning:"text-warning",danger:"text-danger",success:"text-success"};function i({items:e,className:c}){return a.jsx("div",{className:r("[font-synthesis:none] flex items-center h-[44px] px-(--sp-6) rounded-md gap-(--sp-8) shrink-0 bg-gray-900 antialiased",c),children:e.map((n,m)=>a.jsxs("div",{className:r("flex items-baseline gap-[6px]",n.alignEnd&&"ml-auto"),children:[a.jsx("div",{className:"font-ui font-(--weight-medium) text-(--nav-text-subtle) text-caption/micro",children:n.label}),a.jsx("div",{className:r("font-mono font-(--weight-semibold) text-sm/micro",u[n.tone??"default"]),children:n.value})]},m))})}i.__docgenInfo={description:"",methods:[],displayName:"DenseSummaryStrip",props:{items:{required:!0,tsType:{name:"Array",elements:[{name:"SummaryStripItem"}],raw:"SummaryStripItem[]"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:l,within:o}=__STORYBOOK_MODULE_TEST__,v={title:"Kit/Primitives/DenseSummaryStrip",component:i,parameters:{layout:"padded",backgrounds:{default:"nav-bg"},docs:{description:{component:"FLAG (systemic semantic-colour text contrast — Session 10c): tone values `--color-danger` / `--color-success` on the `--color-gray-900` strip (the drawn `6RT-0` treatment) fall below WCAG AA 4.5:1. The default white value and the label meet contrast. `color-contrast` scoped off for the emphasis story → design-sprint decision (on-dark danger/success value tokens)."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},t={name:"Default (label:value pairs) — ARTBOARD 6RT-0",args:{items:[{label:"Opening",value:"1,240.0 kg"},{label:"Movements",value:"-86.5 kg"},{label:"Closing",value:"1,153.5 kg",alignEnd:!0}]},play:async({canvasElement:e})=>{await l(o(e).getByText("Opening")).toBeInTheDocument(),await l(o(e).getByText("1,153.5 kg")).toBeInTheDocument()}},s={name:"± emphasis (warning / danger / success tone values)",args:{items:[{label:"Expected",value:"42,000 KES"},{label:"Variance",value:"-1,850 KES",tone:"danger"},{label:"Reconciled",value:"40,150 KES",tone:"success",alignEnd:!0}]}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "Default (label:value pairs) — ARTBOARD 6RT-0",
  args: {
    items: [{
      label: "Opening",
      value: "1,240.0 kg"
    }, {
      label: "Movements",
      value: "-86.5 kg"
    }, {
      label: "Closing",
      value: "1,153.5 kg",
      alignEnd: true
    }]
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByText("Opening")).toBeInTheDocument();
    await expect(within(canvasElement).getByText("1,153.5 kg")).toBeInTheDocument();
  }
}`,...t.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "± emphasis (warning / danger / success tone values)",
  args: {
    items: [{
      label: "Expected",
      value: "42,000 KES"
    }, {
      label: "Variance",
      value: "-1,850 KES",
      tone: "danger"
    }, {
      label: "Reconciled",
      value: "40,150 KES",
      tone: "success",
      alignEnd: true
    }]
  }
}`,...s.parameters?.docs?.source}}};const x=["Rest","EmphasisValues"];export{s as EmphasisValues,t as Rest,x as __namedExportsOrder,v as default};
