import{j as t,c as i}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function l({rows:e,emptyMessage:s="No movements logged today",className:d}){return t.jsx("div",{className:i("[font-synthesis:none] flex flex-col w-[340px] shrink-0 antialiased",d),children:e.length===0?t.jsx("div",{role:"status",className:"py-(--sp-5) font-ui [color:var(--text-tertiary)] text-caption/micro",children:s}):e.map((a,c)=>t.jsxs("div",{className:i("flex flex-col py-(--sp-5) gap-[2px]",c<e.length-1&&"border-b border-b-solid [border-bottom-color:var(--border-subtle)]"),children:[t.jsxs("div",{className:"flex items-center justify-between",children:[t.jsx("div",{className:"font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm",children:a.title}),t.jsx("div",{className:i("font-mono font-(--weight-semibold) text-sm/micro",a.sign==="negative"?"text-danger":"text-success"),children:a.value})]}),t.jsx("div",{className:"font-ui [color:var(--text-tertiary)] text-caption/micro",children:a.subtitle})]},c))})}l.__docgenInfo={description:"",methods:[],displayName:"ActivityTimeline",props:{rows:{required:!0,tsType:{name:"Array",elements:[{name:"ActivityTimelineRow"}],raw:"ActivityTimelineRow[]"},description:""},emptyMessage:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'"No movements logged today"',computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:r,within:m}=__STORYBOOK_MODULE_TEST__,v={title:"Kit/Primitives/ActivityTimeline",component:l,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic low-contrast dimmed text — Session 10c): the subtitle line is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1. Matches the drawn `6YS-0` (recessive metadata) and the Select-placeholder / DatePicker-cell call. `color-contrast` is scoped off for these stories → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},p=[{title:"Issue to Restaurant",subtitle:"Beef Fillet · 14:20 · by Amina",value:"-18.5 kg",sign:"negative"},{title:"Purchase received",subtitle:"Cooking Oil · 11:05 · by Store",value:"+40.0 L",sign:"positive"},{title:"Transfer from Canteen",subtitle:"Rice · 09:30 · by Joseph",value:"+12.0 kg",sign:"positive"}],o={name:"Default (movement log rows) — ARTBOARD 6YS-0",args:{rows:p},play:async({canvasElement:e})=>{const s=m(e);await r(s.getByText("-18.5 kg")).toBeInTheDocument(),await r(s.getByText("+40.0 L")).toBeInTheDocument()}},n={name:"Empty ⇒ role=status, 'No movements logged today'",args:{rows:[]},play:async({canvasElement:e})=>{const s=m(e).getByRole("status");await r(s).toHaveTextContent("No movements logged today")}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Default (movement log rows) — ARTBOARD 6YS-0",
  args: {
    rows: ROWS
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByText("-18.5 kg")).toBeInTheDocument();
    await expect(c.getByText("+40.0 L")).toBeInTheDocument();
  }
}`,...o.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "Empty ⇒ role=status, 'No movements logged today'",
  args: {
    rows: []
  },
  play: async ({
    canvasElement
  }) => {
    const status = within(canvasElement).getByRole("status");
    await expect(status).toHaveTextContent("No movements logged today");
  }
}`,...n.parameters?.docs?.source}}};const x=["Rest","Empty"];export{n as Empty,o as Rest,x as __namedExportsOrder,v as default};
