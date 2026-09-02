import{j as n,c as d}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function b({tiles:a,className:s}){return n.jsx("div",{className:d("[font-synthesis:none] flex flex-wrap w-[300px] gap-(--sp-4) shrink-0 antialiased",s),children:a.map((e,p)=>n.jsxs("button",{type:"button",disabled:e.disabled,onClick:e.onClick,className:d("flex flex-col w-[142px] p-(--sp-5) rounded-md gap-(--sp-3) shrink-0 border border-solid [border-color:var(--border-subtle)] text-left","kit-interactive kit-focus-ring [--kit-hover-bg:var(--surface-hover)]"),children:[e.icon,n.jsx("div",{className:"font-ui font-(--weight-semibold) [color:var(--text-primary)] text-sm/sm",children:e.label}),n.jsx("div",{className:d("font-ui text-caption/micro",e.badge?"text-accent":"[color:var(--text-tertiary)]"),children:e.subLabel})]},p))})}b.__docgenInfo={description:"",methods:[],displayName:"ActionTileGrid",props:{tiles:{required:!0,tsType:{name:"Array",elements:[{name:"ActionTile"}],raw:"ActionTile[]"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:c,within:u}=__STORYBOOK_MODULE_TEST__,x={title:"Kit/Primitives/ActionTileGrid",component:b,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic low-contrast dimmed text — Session 10c): plain sub-labels are `--text-tertiary` on `--surface-page` ≈ 3.4:1, below WCAG AA — as drawn on `6YD-0`. `color-contrast` scoped off → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},t=n.jsx("svg",{width:"20",height:"20",viewBox:"0 0 20 20","aria-hidden":!0,children:n.jsx("rect",{x:"3",y:"3",width:"14",height:"14",rx:"2",fill:"none",stroke:"var(--text-secondary)",strokeWidth:"1.5"})}),o={name:"Default tiles (icon + label + sub-label) — ARTBOARD 6YD-0",args:{tiles:[{icon:t,label:"Issue Stock",subLabel:"To Restaurant / Canteen"},{icon:t,label:"Record Production",subLabel:"Dishes made today"}]},play:async({canvasElement:a})=>{await c(u(a).getByRole("button",{name:/Issue Stock/})).toBeEnabled()}},i={name:"Count badge (accent sub-label) — ARTBOARD",args:{tiles:[{icon:t,label:"Deliveries",subLabel:"1 Delivery Pending",badge:!0},{icon:t,label:"Transfers",subLabel:"None pending"}]}},r={name:"Disabled tile ⇒ §9.7 opacity, no pointer",args:{tiles:[{icon:t,label:"Reconcile",subLabel:"Admin only",disabled:!0}]},play:async({canvasElement:a})=>{const s=u(a).getByRole("button",{name:/Reconcile/});await c(s).toBeDisabled(),await c(getComputedStyle(s).pointerEvents).toBe("none"),await c(Number(getComputedStyle(s).opacity)).toBeLessThan(1)}},l={name:"FocusVisible ⇒ §9.1 ring on the tile",args:{tiles:[{icon:t,label:"Issue Stock",subLabel:"To Restaurant"}]},parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{focus:"button",assertFocusRing:"button"}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Default tiles (icon + label + sub-label) — ARTBOARD 6YD-0",
  args: {
    tiles: [{
      icon: box,
      label: "Issue Stock",
      subLabel: "To Restaurant / Canteen"
    }, {
      icon: box,
      label: "Record Production",
      subLabel: "Dishes made today"
    }]
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("button", {
      name: /Issue Stock/
    })).toBeEnabled();
  }
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Count badge (accent sub-label) — ARTBOARD",
  args: {
    tiles: [{
      icon: box,
      label: "Deliveries",
      subLabel: "1 Delivery Pending",
      badge: true
    }, {
      icon: box,
      label: "Transfers",
      subLabel: "None pending"
    }]
  }
}`,...i.parameters?.docs?.source}}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  name: "Disabled tile ⇒ §9.7 opacity, no pointer",
  args: {
    tiles: [{
      icon: box,
      label: "Reconcile",
      subLabel: "Admin only",
      disabled: true
    }]
  },
  play: async ({
    canvasElement
  }) => {
    const btn = within(canvasElement).getByRole("button", {
      name: /Reconcile/
    });
    await expect(btn).toBeDisabled();
    await expect(getComputedStyle(btn).pointerEvents).toBe("none");
    await expect(Number(getComputedStyle(btn).opacity)).toBeLessThan(1);
  }
}`,...r.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring on the tile",
  args: {
    tiles: [{
      icon: box,
      label: "Issue Stock",
      subLabel: "To Restaurant"
    }]
  },
  parameters: {
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    },
    interaction: {
      focus: "button",
      assertFocusRing: "button"
    }
  }
}`,...l.parameters?.docs?.source}}};const f=["Rest","WithCountBadge","Disabled","FocusVisible"];export{r as Disabled,l as FocusVisible,o as Rest,i as WithCountBadge,f as __namedExportsOrder,x as default};
