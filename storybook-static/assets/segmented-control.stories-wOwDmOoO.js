import{j as i,c}from"./utils-_OH9Wn3f.js";import{r as b}from"./iframe-sMR_UR-7.js";import{u as C}from"./roving-Cjyqwbnt.js";import"./preload-helper-PPVm8Dsz.js";function k({label:a,options:e,value:r,defaultValue:s,onChange:y,disabled:n=!1,className:R,...S}){const w=`seg-${b.useId()}-label`,v=r!==void 0,[B,D]=b.useState(s??e[0]),f=v?r:B,x=b.useCallback(t=>{n||(v||D(t),y?.(t))},[n,v,y]),{onKeyDown:I,tabIndexFor:E,itemRef:T}=C({items:e.map(t=>({key:t,disabled:n})),activeKey:f??e[0],onChange:x,orientation:"both"});return i.jsxs("div",{className:c("flex flex-col gap-[6px]",R),children:[a&&i.jsx("div",{id:w,className:"font-ui font-(--weight-medium) uppercase [letter-spacing:var(--tracking-caps)] [color:var(--text-secondary)] text-caption/micro",children:a}),i.jsx("div",{role:"radiogroup","aria-label":S["aria-label"],"aria-labelledby":a?w:void 0,onKeyDown:I,className:c("flex items-center h-(--control-md) p-[2px] rounded-sm gap-[2px] shrink-0 [background-color:var(--surface-subtle)]",n&&"opacity-[0.5]"),children:e.map(t=>{const d=t===f;return i.jsx("button",{ref:T(t),type:"button",role:"radio","aria-checked":d,tabIndex:n?-1:E(t),disabled:n,onClick:()=>x(t),className:c("flex items-center justify-center h-(--control-sm) px-(--sp-5) rounded-[2px] kit-interactive kit-focus-ring",d&&"[box-shadow:var(--shadow-sm)] bg-(--surface-page) [--kit-hover-bg:var(--surface-page)] [--kit-active-bg:var(--surface-page)]"),children:i.jsx("span",{className:c("font-ui text-sm/sm",n?c(d?"font-(--weight-medium)":"font-(--weight-regular)","[color:var(--text-disabled)]"):d?"font-(--weight-medium) text-accent":"font-(--weight-regular) [color:var(--text-secondary)]"),children:t})},t)})})]})}k.__docgenInfo={description:"",methods:[],displayName:"SegmentedControl",props:{label:{required:!1,tsType:{name:"string"},description:""},options:{required:!0,tsType:{name:"Array",elements:[{name:"string"}],raw:"string[]"},description:""},value:{required:!1,tsType:{name:"string"},description:""},defaultValue:{required:!1,tsType:{name:"string"},description:""},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: string) => void",signature:{arguments:[{type:{name:"string"},name:"value"}],return:{name:"void"}}},description:""},disabled:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},"aria-label":{required:!1,tsType:{name:"string"},description:"Accessible name when `label` is not rendered."},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:o,userEvent:A,within:h}=__STORYBOOK_MODULE_TEST__,K={title:"Kit/SegmentedControl",component:k,parameters:{layout:"padded",docs:{description:{component:`C6 SegmentedControl — \`component-states.md §2 C6\`.
active = --shadow-sm lift + accent label (§4.5); resting = --text-secondary;
whole control disabled = opacity + --text-disabled. APG radiogroup +
roving tabIndex + arrow keys added in Session 10.`}}},args:{label:"Product Kind",options:["Ingredient","Dish","Goods"],defaultValue:"Ingredient"}},l={name:"Resting (segment 1 active, 2–3 inactive)"},m={name:"Active segment ⇒ --shadow-sm lift + accent label",play:async({canvasElement:a})=>{const e=h(a).getByRole("radio",{checked:!0}),r=getComputedStyle(e);await o(r.boxShadow).not.toBe("none")}},u={name:"FocusVisible ⇒ §9.1 ring",parameters:{interaction:{focus:'[role="radio"][aria-checked="true"]',assertFocusRing:'[role="radio"][aria-checked="true"]'}}},p={name:"Disabled whole control (ARTBOARD)",args:{disabled:!0},play:async({canvasElement:a})=>{const e=h(a).getAllByRole("radio");for(const r of e)await o(r).toBeDisabled()}},g={name:"Arrow keys move selection; roving tabIndex",play:async({canvasElement:a})=>{const e=h(a),r=e.getByRole("radio",{name:"Ingredient"}),s=e.getByRole("radio",{name:"Dish"});await o(r).toHaveAttribute("tabindex","0"),await o(s).toHaveAttribute("tabindex","-1"),r.focus(),await A.keyboard("{ArrowRight}"),await o(s).toHaveAttribute("aria-checked","true"),await o(s).toHaveFocus(),await A.keyboard("{ArrowDown}"),await o(e.getByRole("radio",{name:"Goods"})).toHaveAttribute("aria-checked","true")}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Resting (segment 1 active, 2–3 inactive)"
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "Active segment ⇒ --shadow-sm lift + accent label",
  play: async ({
    canvasElement
  }) => {
    const active = within(canvasElement).getByRole("radio", {
      checked: true
    });
    const cs = getComputedStyle(active);
    // shadow present (the one allowed small-control shadow)
    await expect(cs.boxShadow).not.toBe("none");
  }
}`,...m.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring",
  parameters: {
    interaction: {
      focus: '[role="radio"][aria-checked="true"]',
      assertFocusRing: '[role="radio"][aria-checked="true"]'
    }
  }
}`,...u.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "Disabled whole control (ARTBOARD)",
  args: {
    disabled: true
  },
  play: async ({
    canvasElement
  }) => {
    const radios = within(canvasElement).getAllByRole("radio");
    for (const r of radios) await expect(r).toBeDisabled();
  }
}`,...p.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "Arrow keys move selection; roving tabIndex",
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const ingredient = c.getByRole("radio", {
      name: "Ingredient"
    });
    const dish = c.getByRole("radio", {
      name: "Dish"
    });
    await expect(ingredient).toHaveAttribute("tabindex", "0");
    await expect(dish).toHaveAttribute("tabindex", "-1");
    ingredient.focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(dish).toHaveAttribute("aria-checked", "true");
    await expect(dish).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}"); // orientation "both"
    await expect(c.getByRole("radio", {
      name: "Goods"
    })).toHaveAttribute("aria-checked", "true");
  }
}`,...g.parameters?.docs?.source}}};const N=["Rest","ActiveSegmentLift","FocusVisible","Disabled","ArrowKeySelect"];export{m as ActiveSegmentLift,g as ArrowKeySelect,p as Disabled,u as FocusVisible,l as Rest,N as __namedExportsOrder,K as default};
