import{j as s,c as p}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const m=s.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[s.jsx("line",{x1:"12",y1:"5",x2:"12",y2:"19",stroke:"var(--text-secondary)",strokeWidth:"1.5",strokeLinecap:"round"}),s.jsx("line",{x1:"5",y1:"12",x2:"19",y2:"12",stroke:"var(--text-secondary)",strokeWidth:"1.5",strokeLinecap:"round"})]});function u({children:t,className:e,disabled:i,...l}){return s.jsx("button",{type:"button",className:p("flex items-center justify-center w-(--control-sm) h-(--control-sm) shrink-0 rounded-sm [background-color:var(--surface-hover)]","kit-interactive kit-focus-ring",e),disabled:i,"aria-disabled":i||void 0,...l,children:t??m})}u.__docgenInfo={description:"",methods:[],displayName:"IconButton",props:{children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"The 16×16 icon. Defaults to the artboard's `+` sample glyph."},"aria-label":{required:!0,tsType:{name:"string"},description:"Accessible label — icon-only control, so this is required for a11y."}}};const{expect:c,within:d}=__STORYBOOK_MODULE_TEST__,g={title:"Kit/IconButton",component:u,parameters:{layout:"centered",docs:{description:{component:"C2 IconButton — `component-states.md §2 C2`. 32×32, --surface-hover fill."}}},args:{"aria-label":"Add product"}},n={play:async({canvasElement:t})=>{const e=d(t).getByRole("button",{name:"Add product"});await c(e).toBeInTheDocument()}},o={name:"Hover ⇒ --surface-hover (§9.5 icon-button)",parameters:{interaction:{hover:"button",assertColor:[{selector:"button",prop:"backgroundColor",token:"--surface-hover"}]}}},r={name:"FocusVisible ⇒ §9.1 accent ring",parameters:{interaction:{focus:"button",assertFocusRing:"button"}}},a={name:"Disabled ⇒ §9.7 (ARTBOARD — --text-disabled glyph)",args:{disabled:!0},play:async({canvasElement:t})=>{const e=d(t).getByRole("button");await c(e).toBeDisabled(),await c(getComputedStyle(e).pointerEvents).toBe("none")}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const btn = within(canvasElement).getByRole("button", {
      name: "Add product"
    });
    await expect(btn).toBeInTheDocument();
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Hover ⇒ --surface-hover (§9.5 icon-button)",
  parameters: {
    interaction: {
      hover: "button",
      assertColor: [{
        selector: "button",
        prop: "backgroundColor",
        token: "--surface-hover"
      }]
    }
  }
}`,...o.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 accent ring",
  parameters: {
    interaction: {
      focus: "button",
      assertFocusRing: "button"
    }
  }
}`,...r.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "Disabled ⇒ §9.7 (ARTBOARD — --text-disabled glyph)",
  args: {
    disabled: true
  },
  play: async ({
    canvasElement
  }) => {
    const btn = within(canvasElement).getByRole("button");
    await expect(btn).toBeDisabled();
    await expect(getComputedStyle(btn).pointerEvents).toBe("none");
  }
}`,...a.parameters?.docs?.source}}};const v=["Rest","Hover","FocusVisible","Disabled"];export{a as Disabled,r as FocusVisible,o as Hover,n as Rest,v as __namedExportsOrder,g as default};
