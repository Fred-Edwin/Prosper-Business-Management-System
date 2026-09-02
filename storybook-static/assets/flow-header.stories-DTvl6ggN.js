import{j as t,c as s}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const m={info:"text-info",success:"text-success",danger:"text-danger",warning:"text-warning"};function c({title:n,direction:e,directionTone:l="info",onBack:d,className:u}){return t.jsxs("header",{className:s("[font-synthesis:none] flex items-center justify-between w-[390px] h-[48px] shrink-0 px-[16px] bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)] antialiased text-caption/micro",u),children:[t.jsxs("div",{className:"flex items-center gap-(--sp-4)",children:[t.jsx("button",{type:"button",onClick:d,"aria-label":"Back",className:"shrink-0 kit-interactive kit-focus-ring rounded-sm [--kit-hover-bg:var(--surface-hover)]",children:t.jsxs("svg",{width:"20",height:"20",viewBox:"0 0 24 24",xmlns:"http://www.w3.org/2000/svg",style:{flexShrink:0},children:[t.jsx("line",{x1:"19",y1:"12",x2:"5",y2:"12",stroke:"var(--text-primary)",strokeWidth:"1.5"}),t.jsx("polyline",{points:"12 19 5 12 12 5",fill:"none",stroke:"var(--text-primary)",strokeWidth:"1.5"})]})}),t.jsx("div",{role:"heading","aria-level":1,className:"font-ui font-(--weight-semibold) inline-block w-max shrink-0 [color:var(--text-primary)] text-h2/h2",children:n})]}),t.jsx("div",{className:s("font-ui font-(--weight-medium) inline-block w-max shrink-0 text-sm/micro",m[l],!e&&"hidden"),children:e})]})}c.__docgenInfo={description:"",methods:[],displayName:"FlowHeader",props:{title:{required:!0,tsType:{name:"string"},description:""},direction:{required:!1,tsType:{name:"string"},description:'e.g. "Store → Kitchen". Omit for flows with no origin→destination.'},directionTone:{required:!1,tsType:{name:"union",raw:'"info" | "success" | "danger" | "warning"',elements:[{name:"literal",value:'"info"'},{name:"literal",value:'"success"'},{name:"literal",value:'"danger"'},{name:"literal",value:'"warning"'}]},description:'Colour of the direction badge. Default "info" — the 9KI-0 kit artboard colour.',defaultValue:{value:'"info"',computed:!1}},onBack:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:r,within:g}=__STORYBOOK_MODULE_TEST__,x={title:"Kit/Primitives/FlowHeader",component:c,parameters:{layout:"padded",docs:{description:{component:'C31 FlowHeader — `component-states.md §2 C31`. default (back chevron +\ntitle + direction badge) / no-badge variant (title-only, e.g. Log Non-Sale) /\nback pressed (§9 global). `<header>` + `role="heading"`.'}}}},a={name:"Default (with direction badge) — ARTBOARD 9KI-0",args:{title:"Issue Stock",direction:"Store → Kitchen",directionTone:"danger"},play:async({canvasElement:n})=>{const e=g(n);await r(e.getByRole("heading",{level:1})).toHaveTextContent("Issue Stock"),await r(e.getByRole("button",{name:"Back"})).toBeInTheDocument(),await r(e.getByText("Store → Kitchen")).toBeVisible()}},i={name:"No direction badge (title-only) — ARTBOARD 9TI-0",args:{title:"Log Non-Sale Consumption"},play:async({canvasElement:n})=>{const e=n.querySelector("header > div:last-child");await r(e).not.toBeVisible()}},o={name:"Back button FocusVisible ⇒ §9.1 ring",args:{title:"Record Production"},parameters:{interaction:{focus:'button[aria-label="Back"]',assertFocusRing:'button[aria-label="Back"]'}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "Default (with direction badge) — ARTBOARD 9KI-0",
  args: {
    title: "Issue Stock",
    direction: "Store → Kitchen",
    directionTone: "danger"
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", {
      level: 1
    })).toHaveTextContent("Issue Stock");
    await expect(c.getByRole("button", {
      name: "Back"
    })).toBeInTheDocument();
    await expect(c.getByText("Store → Kitchen")).toBeVisible();
  }
}`,...a.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "No direction badge (title-only) — ARTBOARD 9TI-0",
  args: {
    title: "Log Non-Sale Consumption"
  },
  play: async ({
    canvasElement
  }) => {
    // the badge slot is present but \`hidden\` when no direction is passed
    const badge = canvasElement.querySelector("header > div:last-child");
    await expect(badge).not.toBeVisible();
  }
}`,...i.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Back button FocusVisible ⇒ §9.1 ring",
  args: {
    title: "Record Production"
  },
  parameters: {
    interaction: {
      focus: 'button[aria-label="Back"]',
      assertFocusRing: 'button[aria-label="Back"]'
    }
  }
}`,...o.parameters?.docs?.source}}};const f=["Rest","NoDirectionBadge","BackFocusVisible"];export{o as BackFocusVisible,i as NoDirectionBadge,a as Rest,f as __namedExportsOrder,x as default};
