import{j as n,c as d}from"./utils-_OH9Wn3f.js";import{B as f}from"./button-CREOhNf_.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";const R={warning:{box:"bg-warning-bg border-warning",heading:"text-warning",primaryFill:"bg-success [--kit-hover-bg:var(--color-success-hover)] text-(--text-inverse)"},info:{box:"bg-info-bg border-info",heading:"text-info",primaryFill:"bg-info [--kit-hover-bg:var(--color-info-hover)] text-(--text-inverse)"}};function v({tone:e,title:r,detail:b,primaryLabel:x,onPrimary:B,onFlag:A,flagged:u=!1,flaggedLabel:T="Flagged — awaiting admin review",className:w}){const l=R[e];return n.jsxs("div",{role:"region","aria-label":r,className:d("[font-synthesis:none] flex flex-col p-(--sp-6) rounded-md gap-(--sp-5) border border-solid antialiased",l.box,u&&"opacity-[0.7]",w),children:[n.jsx("div",{className:"flex items-center justify-between",children:n.jsxs("div",{className:"flex flex-col gap-[2px]",children:[n.jsx("div",{className:d("font-ui font-(--weight-semibold) text-sm/sm",l.heading),children:r}),n.jsx("div",{className:"font-ui [color:var(--text-secondary)] text-caption/micro",children:b})]})}),u?n.jsx("div",{className:"font-ui font-(--weight-medium) [color:var(--text-secondary)] text-caption/micro",children:T}):n.jsxs("div",{className:"flex items-center gap-(--sp-4)",children:[n.jsx(f,{variant:"primary",onClick:B,className:d("grow",l.primaryFill),children:x}),n.jsx(f,{variant:"secondary",onClick:A,children:"Flag Variance"})]})]})}function y(e){return n.jsx(v,{tone:"warning",...e})}function m(e){return n.jsx(v,{tone:"info",...e})}y.__docgenInfo={description:"",methods:[],displayName:"TransferBanner"};m.__docgenInfo={description:"",methods:[],displayName:"PurchaseDeliveryBanner"};const{expect:a,within:g}=__STORYBOOK_MODULE_TEST__,C={title:"Kit/Banner — NEEDS OWNER REVIEW",component:y,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic semantic-colour text contrast — Session 10c): the banner heading is `--color-warning` / `--color-info` on its tinted background (the drawn `6SG-0` / `9Q9-0` visual), below WCAG AA 4.5:1 for the heading text. The detail line is `--text-secondary` (passes). `color-contrast` scoped off → design-sprint decision (darker on-tint heading tokens)."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},p={title:"Incoming transfer from Canteen",detail:"Rice · 12.0 kg · sent 09:30 by Joseph",primaryLabel:"Accept & Receive"},h={title:"Purchase delivery pending",detail:"Cooking Oil · 40.0 L · PO-2043",primaryLabel:"Accept & Receive"},t={name:"Transfer variant (amber) — pinned — ARTBOARD 6SG-0",args:p,play:async({canvasElement:e})=>{const r=g(e);await a(r.getByRole("region",{name:"Incoming transfer from Canteen"})).toBeInTheDocument(),await a(r.getByRole("button",{name:"Accept & Receive"})).toBeInTheDocument(),await a(r.getByRole("button",{name:"Flag Variance"})).toBeInTheDocument()}},o={name:"Purchase-Delivery variant (blue) — pinned — ARTBOARD 9Q9-0",render:e=>n.jsx(m,{...e}),args:h,play:async({canvasElement:e})=>{await a(g(e).getByRole("region",{name:"Purchase delivery pending"})).toBeInTheDocument()}},s={name:"Hover Accept (Transfer) ⇒ --color-success-hover",args:p,parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{hover:"button:first-of-type",assertColor:[{selector:"button:first-of-type",prop:"backgroundColor",token:"--color-success-hover"}]}}},c={name:"Hover Accept (Purchase-Delivery) ⇒ --color-info-hover",render:e=>n.jsx(m,{...e}),args:h,parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{hover:"button:first-of-type",assertColor:[{selector:"button:first-of-type",prop:"backgroundColor",token:"--color-info-hover"}]}}},i={name:"Flagged ⇒ actions removed, muted status line — ARTBOARD 9QL-0",args:{...p,flagged:!0},play:async({canvasElement:e})=>{const r=g(e);await a(r.queryByRole("button")).toBeNull(),await a(r.getByText(/Flagged — awaiting admin/)).toBeInTheDocument()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "Transfer variant (amber) — pinned — ARTBOARD 6SG-0",
  args: transferArgs,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", {
      name: "Incoming transfer from Canteen"
    })).toBeInTheDocument();
    await expect(c.getByRole("button", {
      name: "Accept & Receive"
    })).toBeInTheDocument();
    await expect(c.getByRole("button", {
      name: "Flag Variance"
    })).toBeInTheDocument();
  }
}`,...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Purchase-Delivery variant (blue) — pinned — ARTBOARD 9Q9-0",
  render: args => <PurchaseDeliveryBanner {...args} />,
  args: deliveryArgs,
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("region", {
      name: "Purchase delivery pending"
    })).toBeInTheDocument();
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "Hover Accept (Transfer) ⇒ --color-success-hover",
  args: transferArgs,
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
      hover: "button:first-of-type",
      assertColor: [{
        selector: "button:first-of-type",
        prop: "backgroundColor",
        token: "--color-success-hover"
      }]
    }
  }
}`,...s.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "Hover Accept (Purchase-Delivery) ⇒ --color-info-hover",
  render: args => <PurchaseDeliveryBanner {...args} />,
  args: deliveryArgs,
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
      hover: "button:first-of-type",
      assertColor: [{
        selector: "button:first-of-type",
        prop: "backgroundColor",
        token: "--color-info-hover"
      }]
    }
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Flagged ⇒ actions removed, muted status line — ARTBOARD 9QL-0",
  args: {
    ...transferArgs,
    flagged: true
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button")).toBeNull();
    await expect(c.getByText(/Flagged — awaiting admin/)).toBeInTheDocument();
  }
}`,...i.parameters?.docs?.source}}};const N=["Transfer","PurchaseDelivery","HoverAcceptTransfer","HoverAcceptDelivery","Flagged"];export{i as Flagged,c as HoverAcceptDelivery,s as HoverAcceptTransfer,o as PurchaseDelivery,t as Transfer,N as __namedExportsOrder,C as default};
