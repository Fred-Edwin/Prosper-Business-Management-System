import{j as r,c as p}from"./utils-_OH9Wn3f.js";import{r as y}from"./iframe-sMR_UR-7.js";import{u as k}from"./roving-Cjyqwbnt.js";import"./preload-helper-PPVm8Dsz.js";function v({tabs:s,activeKey:t,onChange:a,idBase:o,className:w}){const f=y.useId(),h=o??`tabs-${f}`,{onKeyDown:A,tabIndexFor:H,itemRef:R}=k({items:s,activeKey:t,onChange:a,orientation:"horizontal"});return r.jsx("div",{role:"tablist",onKeyDown:A,className:p("[font-synthesis:none] flex items-center border-b border-b-solid [border-bottom-color:var(--border-subtle)] antialiased",w),children:s.map(e=>{const u=e.key===t;return r.jsx("button",{ref:R(e.key),type:"button",role:"tab",id:`${h}-tab-${e.key}`,"aria-selected":u,"aria-controls":e.panelId,tabIndex:H(e.key),disabled:e.disabled,onClick:()=>a?.(e.key),className:p("flex items-center justify-center h-(--control-md) px-(--sp-5) border-b-2 border-b-solid kit-interactive kit-focus-ring [--kit-hover-bg:transparent]",u?"border-b-accent":"border-b-transparent"),children:r.jsx("span",{className:p("font-ui font-(--weight-medium) text-sm/sm",u?"text-accent":e.disabled?"[color:var(--text-disabled)]":"[color:var(--text-secondary)]"),children:e.label})},e.key)})})}v.__docgenInfo={description:"",methods:[],displayName:"Tabs",props:{tabs:{required:!0,tsType:{name:"Array",elements:[{name:"TabItem"}],raw:"TabItem[]"},description:""},activeKey:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(key: string) => void",signature:{arguments:[{type:{name:"string"},name:"key"}],return:{name:"void"}}},description:""},idBase:{required:!1,tsType:{name:"string"},description:"Prefix for the derived per-tab id (`${idBase}-tab-${key}`)."},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:n,userEvent:g,within:x}=__STORYBOOK_MODULE_TEST__,E={title:"Kit/Tabs",component:v,parameters:{layout:"padded",docs:{description:{component:"C11 Tabs — `component-states.md §2 C11` (state-complete visually).\nSession 10 added the APG tabs pattern: roving tabIndex, ArrowLeft/Right +\nHome/End move + select (selection follows focus)."}}}},T=[{key:"all",label:"All"},{key:"ingredients",label:"Ingredients"},{key:"dishes",label:"Dishes"},{key:"goods",label:"Goods",disabled:!0}];function i({start:s="all"}){const[t,a]=y.useState(s);return r.jsx(v,{tabs:T,activeKey:t,onChange:a})}const c={render:()=>r.jsx(i,{})},d={name:"Hover (inactive tab)",render:()=>r.jsx(i,{}),parameters:{interaction:{hover:'[role="tab"]:nth-child(2)'}}},l={name:"FocusVisible ⇒ §9.1 ring on the tab hit area",render:()=>r.jsx(i,{}),parameters:{interaction:{focus:'[role="tab"][aria-selected="true"]',assertFocusRing:'[role="tab"][aria-selected="true"]'}}},b={name:"Disabled tab (ARTBOARD — --text-disabled, out of tab sequence)",render:()=>r.jsx(i,{}),play:async({canvasElement:s})=>{const t=x(s).getByRole("tab",{name:"Goods"});await n(t).toBeDisabled()}},m={name:"ArrowRight moves aria-selected + DOM focus; roving tabIndex",render:()=>r.jsx(i,{}),play:async({canvasElement:s})=>{const t=x(s),a=t.getByRole("tab",{name:"All"}),o=t.getByRole("tab",{name:"Ingredients"});await n(a).toHaveAttribute("tabindex","0"),await n(o).toHaveAttribute("tabindex","-1"),a.focus(),await g.keyboard("{ArrowRight}"),await n(o).toHaveAttribute("aria-selected","true"),await n(o).toHaveFocus(),await n(o).toHaveAttribute("tabindex","0"),await n(a).toHaveAttribute("tabindex","-1"),await g.keyboard("{Home}"),await n(a).toHaveAttribute("aria-selected","true")}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <Harness />
}`,...c.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Hover (inactive tab)",
  render: () => <Harness />,
  parameters: {
    interaction: {
      hover: '[role="tab"]:nth-child(2)'
    }
  }
}`,...d.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring on the tab hit area",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="tab"][aria-selected="true"]',
      assertFocusRing: '[role="tab"][aria-selected="true"]'
    }
  }
}`,...l.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: "Disabled tab (ARTBOARD — --text-disabled, out of tab sequence)",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const goods = within(canvasElement).getByRole("tab", {
      name: "Goods"
    });
    await expect(goods).toBeDisabled();
  }
}`,...b.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "ArrowRight moves aria-selected + DOM focus; roving tabIndex",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const all = c.getByRole("tab", {
      name: "All"
    });
    const ingredients = c.getByRole("tab", {
      name: "Ingredients"
    });

    // only the selected tab is tabbable
    await expect(all).toHaveAttribute("tabindex", "0");
    await expect(ingredients).toHaveAttribute("tabindex", "-1");
    all.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(ingredients).toHaveAttribute("aria-selected", "true");
    await expect(ingredients).toHaveFocus();
    await expect(ingredients).toHaveAttribute("tabindex", "0");
    await expect(all).toHaveAttribute("tabindex", "-1");

    // Home jumps back to the first
    await userEvent.keyboard("{Home}");
    await expect(all).toHaveAttribute("aria-selected", "true");
  }
}`,...m.parameters?.docs?.source}}};const S=["Rest","HoverInactive","FocusVisible","Disabled","ArrowKeyNav"];export{m as ArrowKeyNav,b as Disabled,l as FocusVisible,d as HoverInactive,c as Rest,S as __namedExportsOrder,E as default};
