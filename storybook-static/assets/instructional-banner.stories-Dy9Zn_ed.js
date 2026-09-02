import{j as e,c as d}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function o({step:t,title:r,body:c,className:l}){return e.jsxs("div",{className:d("[font-synthesis:none] flex items-center py-(--sp-5) px-(--sp-6) rounded-md gap-(--sp-5) bg-(--surface-selected) antialiased",l),children:[e.jsx("div",{className:"flex items-center justify-center w-[28px] h-[28px] shrink-0 rounded-full bg-accent",children:e.jsx("div",{className:"font-ui font-(--weight-semibold) text-(--text-inverse) text-sm/micro",children:t})}),e.jsxs("div",{className:"flex flex-col gap-[2px]",children:[e.jsx("div",{className:"font-ui font-(--weight-semibold) text-accent text-sm/sm",children:r}),e.jsx("div",{className:"font-ui [color:var(--text-secondary)] text-caption/micro",children:c})]})]})}o.__docgenInfo={description:"",methods:[],displayName:"InstructionalBanner",props:{step:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"The number shown in the accent circle."},title:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},body:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:s,within:i}=__STORYBOOK_MODULE_TEST__,y={title:"Kit/Primitives/InstructionalBanner",component:o,parameters:{layout:"padded",docs:{description:{component:"C25 InstructionalBanner — `component-states.md §2 C25`. Display-only,\nsingle visual. Neutral `--surface-selected` tint (deliberately distinct\nfrom the amber CalculatedImpactBanner — §6 D6), accent numbered circle."}}}},n={name:"Default (numbered circle + title + body) — ARTBOARD 6Y2-0",args:{step:1,title:"Enter opening counts",body:"Type the physical quantity for each item at this location. Other locations stay read-only."},play:async({canvasElement:t})=>{await s(i(t).getByText("1")).toBeInTheDocument(),await s(i(t).getByText("Enter opening counts")).toBeInTheDocument()}},a={name:"Step 2 variant",args:{step:2,title:"Review the valuation",body:"The footer totals update as you type. Save when every editable cell is filled."}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "Default (numbered circle + title + body) — ARTBOARD 6Y2-0",
  args: {
    step: 1,
    title: "Enter opening counts",
    body: "Type the physical quantity for each item at this location. Other locations stay read-only."
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByText("1")).toBeInTheDocument();
    await expect(within(canvasElement).getByText("Enter opening counts")).toBeInTheDocument();
  }
}`,...n.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "Step 2 variant",
  args: {
    step: 2,
    title: "Review the valuation",
    body: "The footer totals update as you type. Save when every editable cell is filled."
  }
}`,...a.parameters?.docs?.source}}};const h=["Rest","StepTwo"];export{n as Rest,a as StepTwo,h as __namedExportsOrder,y as default};
