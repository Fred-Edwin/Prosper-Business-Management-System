import{j as e,c as h}from"./utils-_OH9Wn3f.js";import{r as w}from"./iframe-sMR_UR-7.js";import{u as R}from"./roving-Cjyqwbnt.js";import"./preload-helper-PPVm8Dsz.js";function v({options:a,activeKey:r,onChange:n,className:s,...y}){const{onKeyDown:f,tabIndexFor:k,itemRef:x}=R({items:a,activeKey:r,onChange:n,orientation:"horizontal"});return e.jsx("div",{role:"radiogroup","aria-label":y["aria-label"],onKeyDown:f,className:h("[font-synthesis:none] flex items-center gap-[6px] antialiased",s),children:a.map(t=>{const g=t.key===r;return e.jsx("button",{ref:x(t.key),type:"button",role:"radio","aria-checked":g,tabIndex:k(t.key),disabled:t.disabled,onClick:()=>n?.(t.key),className:h("flex items-center justify-center h-(--control-sm) px-(--sp-6) rounded-lg kit-interactive kit-focus-ring",g&&"bg-(--surface-selected) [--kit-hover-bg:var(--surface-selected)] [--kit-active-bg:var(--surface-selected)]"),children:e.jsx("span",{className:h("font-ui text-sm/sm",g?"font-(--weight-medium) text-accent":"font-(--weight-regular) [color:var(--text-secondary)]"),children:t.label})},t.key)})})}v.__docgenInfo={description:"",methods:[],displayName:"PillFilter",props:{options:{required:!0,tsType:{name:"Array",elements:[{name:"PillFilterOption"}],raw:"PillFilterOption[]"},description:""},activeKey:{required:!0,tsType:{name:"string"},description:""},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(key: string) => void",signature:{arguments:[{type:{name:"string"},name:"key"}],return:{name:"void"}}},description:""},"aria-label":{required:!1,tsType:{name:"string"},description:'Accessible name for the group, e.g. "Filter by location".'},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:i,userEvent:A,within:b}=__STORYBOOK_MODULE_TEST__,j={title:"Kit/PillFilter — radiogroup NEEDS OWNER REVIEW",component:v,parameters:{layout:"padded",docs:{description:{component:'C12 PillFilter — `component-states.md §2 C12`.\n\nOWNER REVIEW (kit-audit "Remaining gaps" #7): moved from N× `aria-pressed`\ntoggle buttons to the APG **radiogroup** pattern (owner picked this in the\nSession 10 kickoff). `role="radiogroup"` / `role="radio"` / `aria-checked`,\nroving tabIndex, ArrowLeft/Right + Home/End select. Reverts to a toggle\ngroup only if pills ever become multi-select. Confirm to ratify.'}}}},S=[{key:"all",label:"All"},{key:"store",label:"Store"},{key:"restaurant",label:"Restaurant"},{key:"canteen",label:"Canteen",disabled:!0}];function o(){const[a,r]=w.useState("all");return e.jsx(v,{options:S,activeKey:a,onChange:r,"aria-label":"Filter by location"})}const c={render:()=>e.jsx(o,{})},l={name:"Hover (inactive pill) ⇒ --surface-hover",render:()=>e.jsx(o,{}),parameters:{interaction:{hover:'[role="radio"]:nth-child(2)',assertColor:[{selector:'[role="radio"]:nth-child(2)',prop:"backgroundColor",token:"--surface-hover"}]}}},d={name:"Selected (active) ⇒ --surface-selected (§9.4 wins over hover)",render:()=>e.jsx(o,{}),parameters:{interaction:{hover:'[role="radio"][aria-checked="true"]',assertColor:[{selector:'[role="radio"][aria-checked="true"]',prop:"backgroundColor",token:"--surface-selected"}]}}},u={name:"FocusVisible ⇒ §9.1 ring",render:()=>e.jsx(o,{}),parameters:{interaction:{focus:'[role="radio"][aria-checked="true"]',assertFocusRing:'[role="radio"][aria-checked="true"]'}}},m={name:"Disabled pill (ARTBOARD — location with no data)",render:()=>e.jsx(o,{}),play:async({canvasElement:a})=>{const r=b(a).getByRole("radio",{name:"Canteen"});await i(r).toBeDisabled()}},p={name:"ArrowRight moves aria-checked + focus (radiogroup)",render:()=>e.jsx(o,{}),play:async({canvasElement:a})=>{const r=b(a),n=r.getByRole("radio",{name:"All"}),s=r.getByRole("radio",{name:"Store"});await i(n).toHaveAttribute("tabindex","0"),await i(s).toHaveAttribute("tabindex","-1"),n.focus(),await A.keyboard("{ArrowRight}"),await i(s).toHaveAttribute("aria-checked","true"),await i(s).toHaveFocus()}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  render: () => <Harness />
}`,...c.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Hover (inactive pill) ⇒ --surface-hover",
  render: () => <Harness />,
  parameters: {
    interaction: {
      hover: '[role="radio"]:nth-child(2)',
      assertColor: [{
        selector: '[role="radio"]:nth-child(2)',
        prop: "backgroundColor",
        token: "--surface-hover"
      }]
    }
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Selected (active) ⇒ --surface-selected (§9.4 wins over hover)",
  render: () => <Harness />,
  parameters: {
    interaction: {
      hover: '[role="radio"][aria-checked="true"]',
      assertColor: [{
        selector: '[role="radio"][aria-checked="true"]',
        prop: "backgroundColor",
        token: "--surface-selected"
      }]
    }
  }
}`,...d.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="radio"][aria-checked="true"]',
      assertFocusRing: '[role="radio"][aria-checked="true"]'
    }
  }
}`,...u.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "Disabled pill (ARTBOARD — location with no data)",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const canteen = within(canvasElement).getByRole("radio", {
      name: "Canteen"
    });
    await expect(canteen).toBeDisabled();
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "ArrowRight moves aria-checked + focus (radiogroup)",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const all = c.getByRole("radio", {
      name: "All"
    });
    const store = c.getByRole("radio", {
      name: "Store"
    });
    await expect(all).toHaveAttribute("tabindex", "0");
    await expect(store).toHaveAttribute("tabindex", "-1");
    all.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(store).toHaveAttribute("aria-checked", "true");
    await expect(store).toHaveFocus();
  }
}`,...p.parameters?.docs?.source}}};const O=["Rest","HoverInactive","Selected","FocusVisible","Disabled","ArrowKeySelect"];export{p as ArrowKeySelect,m as Disabled,u as FocusVisible,l as HoverInactive,c as Rest,d as Selected,O as __namedExportsOrder,j as default};
