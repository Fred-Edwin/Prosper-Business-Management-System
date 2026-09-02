import{j as a,c as s}from"./utils-_OH9Wn3f.js";import{B as f}from"./button-CREOhNf_.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";const T={awaiting:{box:"bg-(--surface-selected)",text:"text-accent",label:"Paid by Admin"},matched:{box:"bg-success-bg",text:"text-success",label:"Received"},flagged:{box:"bg-warning-bg",text:"text-warning",label:"Variance"}};function u({supplier:e,details:t,status:r,actionLabel:p,onAction:b,submitting:h=!1,resultLabel:x,className:y}){const g=T[r];return a.jsxs("div",{role:"listitem","aria-label":e,className:s("[font-synthesis:none] flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) border border-solid [border-color:var(--border-subtle)] antialiased",y),children:[a.jsxs("div",{className:"flex items-center justify-between",children:[a.jsx("div",{className:"font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm",children:e}),a.jsx("div",{className:s("flex items-center h-[20px] px-[6px] rounded-sm",g.box),children:a.jsx("div",{className:s("font-ui font-(--weight-medium) text-[10px] uppercase [letter-spacing:var(--tracking-caps)] leading-[12px]",g.text),children:g.label})})]}),a.jsx("div",{className:"flex flex-col gap-[2px]",children:t.map((v,w)=>a.jsx("div",{className:"font-ui whitespace-pre-wrap [color:var(--text-secondary)] text-sm/sm",children:v},w))}),r==="awaiting"?a.jsx(f,{variant:"primary",onClick:b,loading:h,className:"w-full",children:p}):a.jsx("div",{className:s("flex items-center justify-center h-[36px] rounded-sm shrink-0",r==="matched"?"bg-success-bg":"bg-warning-bg"),children:a.jsx("span",{className:s("font-ui font-(--weight-semibold) whitespace-pre-wrap text-sm/sm",r==="matched"?"text-success":"text-warning"),children:x})})]})}u.__docgenInfo={description:"",methods:[],displayName:"MatchCard",props:{supplier:{required:!0,tsType:{name:"string"},description:""},details:{required:!0,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:""},status:{required:!0,tsType:{name:"union",raw:'"awaiting" | "matched" | "flagged"',elements:[{name:"literal",value:'"awaiting"'},{name:"literal",value:'"matched"'},{name:"literal",value:'"flagged"'}]},description:""},actionLabel:{required:!1,tsType:{name:"string"},description:'awaiting: the button label, e.g. "1-Tap Match & Receive (+50.0 kg)".'},onAction:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},submitting:{required:!1,tsType:{name:"boolean"},description:"awaiting: 1-tap match in flight.",defaultValue:{value:"false",computed:!1}},resultLabel:{required:!1,tsType:{name:"string"},description:'matched / flagged: the result-bar text, e.g. "Matched & received  ·  +50.0 kg".'},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:n,within:m}=__STORYBOOK_MODULE_TEST__,N={title:"Kit/MatchCard",component:u,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic semantic-colour text contrast — Session 10c): the `flagged` result bar is `--color-warning` on `--color-warning-bg` (drawn `9RA-0`), below WCAG AA 4.5:1. Matched (`--color-success` on `--color-success-bg`) is borderline. `color-contrast` scoped off → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}},decorators:[e=>a.jsx("div",{role:"list",children:a.jsx(e,{})})]},i={supplier:"Mombasa Fresh Produce",details:["Invoice INV-5521","Expected  ·  50.0 kg"]},c={name:"Awaiting (1-Tap Match & Receive) — ARTBOARD 6ST-0",args:{...i,status:"awaiting",actionLabel:"1-Tap Match & Receive (+50.0 kg)"},play:async({canvasElement:e})=>{const t=m(e);await n(t.getByRole("listitem",{name:i.supplier})).toBeInTheDocument(),await n(t.getByRole("button",{name:/1-Tap Match & Receive/})).toBeEnabled(),await n(t.getByText("Paid by Admin")).toBeInTheDocument()}},o={name:"Submitting ⇒ <Button loading> (aria-busy)",args:{...i,status:"awaiting",actionLabel:"Matching…",submitting:!0},play:async({canvasElement:e})=>{await n(m(e).getByRole("button",{name:/Matching/})).toHaveAttribute("aria-busy","true")}},l={name:"Matched (success pill, action removed) — ARTBOARD 9QX-0",args:{...i,status:"matched",resultLabel:"Matched & received  ·  +50.0 kg"},play:async({canvasElement:e})=>{const t=m(e);await n(t.queryByRole("button")).toBeNull(),await n(t.getByText("Received")).toBeInTheDocument()}},d={name:"Flagged / variance — ARTBOARD 9RA-0",parameters:{visual:{disable:!0}},args:{...i,status:"flagged",details:["Invoice INV-5521",`Expected · 50.0 kg
Received · 46.5 kg`],resultLabel:"Variance flagged  ·  -3.5 kg"},play:async({canvasElement:e})=>{await n(m(e).getByText("Variance")).toBeInTheDocument()}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "Awaiting (1-Tap Match & Receive) — ARTBOARD 6ST-0",
  args: {
    ...base,
    status: "awaiting",
    actionLabel: "1-Tap Match & Receive (+50.0 kg)"
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("listitem", {
      name: base.supplier
    })).toBeInTheDocument();
    await expect(c.getByRole("button", {
      name: /1-Tap Match & Receive/
    })).toBeEnabled();
    await expect(c.getByText("Paid by Admin")).toBeInTheDocument();
  }
}`,...c.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Submitting ⇒ <Button loading> (aria-busy)",
  args: {
    ...base,
    status: "awaiting",
    actionLabel: "Matching…",
    submitting: true
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("button", {
      name: /Matching/
    })).toHaveAttribute("aria-busy", "true");
  }
}`,...o.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Matched (success pill, action removed) — ARTBOARD 9QX-0",
  args: {
    ...base,
    status: "matched",
    resultLabel: "Matched & received  ·  +50.0 kg"
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button")).toBeNull();
    await expect(c.getByText("Received")).toBeInTheDocument();
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Flagged / variance — ARTBOARD 9RA-0",
  // multiline pre-wrap detail line → height varies between baseline write and
  // diff; behaviour (pill + result bar) is the proof, not the pixels.
  parameters: {
    visual: {
      disable: true
    }
  },
  args: {
    ...base,
    status: "flagged",
    details: ["Invoice INV-5521", "Expected · 50.0 kg\\nReceived · 46.5 kg"],
    resultLabel: "Variance flagged  ·  -3.5 kg"
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByText("Variance")).toBeInTheDocument();
  }
}`,...d.parameters?.docs?.source}}};const j=["Awaiting","Submitting","Matched","Flagged"];export{c as Awaiting,d as Flagged,l as Matched,o as Submitting,j as __namedExportsOrder,N as default};
