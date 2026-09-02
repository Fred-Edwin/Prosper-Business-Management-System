import{j as e,c as p}from"./utils-_OH9Wn3f.js";import{B as u}from"./button-CREOhNf_.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";function l({title:s="Couldn't load this",description:t="Something went wrong fetching the data. Check your connection and try again.",retryLabel:r="Retry",onRetry:d,className:m}){return e.jsxs("div",{role:"alert",className:p("[font-synthesis:none] flex flex-col items-center py-(--sp-10) px-(--sp-8) rounded-md gap-(--sp-4) bg-(--surface-page) border border-solid [border-color:var(--border-subtle)] antialiased",m),children:[e.jsxs("svg",{width:"28",height:"28",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[e.jsx("path",{d:"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",fill:"none",stroke:"var(--color-danger)",strokeWidth:"1.5"}),e.jsx("line",{x1:"12",y1:"9",x2:"12",y2:"13",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round"})]}),e.jsx("div",{className:"font-ui font-(--weight-semibold) text-center flex justify-center flex-wrap [color:var(--text-primary)] text-body/sm",children:s}),e.jsx("div",{className:"font-ui text-center flex justify-center flex-wrap [color:var(--text-secondary)] text-sm/sm",children:t}),r&&e.jsx(u,{variant:"secondary",onClick:d,className:"mt-(--sp-2)",children:r})]})}l.__docgenInfo={description:"",methods:[],displayName:"ErrorState",props:{title:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:`"Couldn't load this"`,computed:!1}},description:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'"Something went wrong fetching the data. Check your connection and try again."',computed:!1}},retryLabel:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'"Retry"',computed:!1}},onRetry:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:i,within:c}=__STORYBOOK_MODULE_TEST__,R={title:"Kit/Primitives/ErrorState",component:l,parameters:{layout:"padded",docs:{description:{component:'ErrorState (kit area 17, `9U3-0`/`9UT-0`) — `component-states.md §8`.\n`role="alert"` so the error is announced; icon `aria-hidden` stroked\n`--color-danger`; Retry composes `<Button variant="secondary">`.'}}}},a={name:"Default (load failed + Retry) — ARTBOARD 9UT-0",play:async({canvasElement:s})=>{const t=c(s).getByRole("alert");await i(t).toBeInTheDocument();const r=c(t).getByRole("button",{name:"Retry"});await i(r).toBeInTheDocument()}},n={name:"Custom title / description",args:{title:"Couldn't reconcile payments",description:"The financials service is unreachable. Retry in a moment.",retryLabel:"Try again"}},o={name:"No retry action",args:{retryLabel:""}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "Default (load failed + Retry) — ARTBOARD 9UT-0",
  play: async ({
    canvasElement
  }) => {
    const alert = within(canvasElement).getByRole("alert");
    await expect(alert).toBeInTheDocument();
    const retry = within(alert).getByRole("button", {
      name: "Retry"
    });
    await expect(retry).toBeInTheDocument();
  }
}`,...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "Custom title / description",
  args: {
    title: "Couldn't reconcile payments",
    description: "The financials service is unreachable. Retry in a moment.",
    retryLabel: "Try again"
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "No retry action",
  args: {
    retryLabel: ""
  }
}`,...o.parameters?.docs?.source}}};const v=["Rest","CustomCopy","NoRetry"];export{n as CustomCopy,o as NoRetry,a as Rest,v as __namedExportsOrder,R as default};
