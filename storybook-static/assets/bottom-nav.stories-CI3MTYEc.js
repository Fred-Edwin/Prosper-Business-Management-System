import{j as a,c as d}from"./utils-_OH9Wn3f.js";import{r as g}from"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function m({items:t,activeKey:e,onNavigate:l,className:y}){return a.jsx("nav",{"aria-label":"Primary",className:d("[font-synthesis:none] flex items-center w-[390px] h-[56px] shrink-0 bg-(--surface-page) border-t border-t-solid [border-top-color:var(--border-subtle)] antialiased text-caption/micro",y),children:t.map(n=>{const u=n.key===e;return a.jsxs("button",{type:"button","aria-current":u?"page":void 0,onClick:()=>l?.(n.key),className:"flex flex-col items-center justify-center grow h-full gap-[2px] kit-interactive kit-focus-ring",children:[u?n.activeIcon:n.inactiveIcon,a.jsx("span",{className:d("font-ui text-micro font-(--weight-medium) inline-block leading-[14px]",u?"text-accent":"[color:var(--text-tertiary)]"),children:n.label})]},n.key)})})}m.__docgenInfo={description:"",methods:[],displayName:"BottomNav",props:{items:{required:!0,tsType:{name:"Array",elements:[{name:"BottomNavItem"}],raw:"BottomNavItem[]"},description:""},activeKey:{required:!0,tsType:{name:"string"},description:""},onNavigate:{required:!1,tsType:{name:"signature",type:"function",raw:"(key: string) => void",signature:{arguments:[{type:{name:"string"},name:"key"}],return:{name:"void"}}},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:o,userEvent:b,within:v}=__STORYBOOK_MODULE_TEST__,w={title:"Kit/Primitives/BottomNav",component:m,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic low-contrast dimmed text — Session 10c): inactive item labels are `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1 — as drawn on `9J5-0`. Same call as the Select placeholder. `color-contrast` scoped off → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},r=t=>a.jsx("svg",{width:"20",height:"20",viewBox:"0 0 20 20","aria-hidden":!0,children:a.jsx("circle",{cx:"10",cy:"10",r:"6",fill:"none",stroke:t,strokeWidth:"1.5"})}),x=[{key:"hub",label:"Hub",activeIcon:r("var(--color-accent)"),inactiveIcon:r("var(--text-tertiary)")},{key:"stock",label:"Stock",activeIcon:r("var(--color-accent)"),inactiveIcon:r("var(--text-tertiary)")},{key:"history",label:"History",activeIcon:r("var(--color-accent)"),inactiveIcon:r("var(--text-tertiary)")}];function p({start:t="hub"}){const[e,l]=g.useState(t);return a.jsx(m,{items:x,activeKey:e,onNavigate:l})}const i={name:"Hub active / Stock+History inactive — ARTBOARD 9J5-0",render:()=>a.jsx(p,{}),play:async({canvasElement:t})=>{const e=v(t);await o(e.getByRole("navigation",{name:"Primary"})).toBeInTheDocument(),await o(e.getByRole("button",{name:"Hub"})).toHaveAttribute("aria-current","page"),await o(e.getByRole("button",{name:"Stock"})).not.toHaveAttribute("aria-current")}},c={name:"FocusVisible ⇒ §9.1 accent ring on the item hit area",render:()=>a.jsx(p,{}),parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{focus:'[aria-current="page"]',assertFocusRing:'[aria-current="page"]'}}},s={name:"Click an item ⇒ aria-current moves",render:()=>a.jsx(p,{}),play:async({canvasElement:t})=>{const e=v(t);await b.click(e.getByRole("button",{name:"Stock"})),await o(e.getByRole("button",{name:"Stock"})).toHaveAttribute("aria-current","page"),await o(e.getByRole("button",{name:"Hub"})).not.toHaveAttribute("aria-current")}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Hub active / Stock+History inactive — ARTBOARD 9J5-0",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("navigation", {
      name: "Primary"
    })).toBeInTheDocument();
    await expect(c.getByRole("button", {
      name: "Hub"
    })).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("button", {
      name: "Stock"
    })).not.toHaveAttribute("aria-current");
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 accent ring on the item hit area",
  render: () => <Harness />,
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
      focus: '[aria-current="page"]',
      assertFocusRing: '[aria-current="page"]'
    }
  }
}`,...c.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "Click an item ⇒ aria-current moves",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", {
      name: "Stock"
    }));
    await expect(c.getByRole("button", {
      name: "Stock"
    })).toHaveAttribute("aria-current", "page");
    await expect(c.getByRole("button", {
      name: "Hub"
    })).not.toHaveAttribute("aria-current");
  }
}`,...s.parameters?.docs?.source}}};const B=["Rest","FocusVisible","NavigateMovesCurrent"];export{c as FocusVisible,s as NavigateMovesCurrent,i as Rest,B as __namedExportsOrder,w as default};
