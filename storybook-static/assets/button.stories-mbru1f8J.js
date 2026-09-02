import{j as e}from"./utils-_OH9Wn3f.js";import{B as n}from"./button-CREOhNf_.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";const{expect:t,within:S}=__STORYBOOK_MODULE_TEST__,R={title:"Kit/Button",component:n,parameters:{layout:"centered",docs:{description:{component:'C1 Button — `component-states.md §2 C1`, `kit-audit.md §1`.\n\nOWNER REVIEW (kit-audit "Remaining gaps" #6): the `size` prop is NEW.\n`md` (36px) is byte-identical to the sole Paper artboard (`6BR-0`);\n`sm` (32) / `lg` (44) have no artboard. See the `Sizes` story.\n\nInteraction-state colour assertions run in `.storybook/test-runner.ts`\n`postVisit` via `parameters.interaction` — a real Playwright hover/focus\nplus a computed-style-vs-token check (the permanent form of Session 9\'s\nGate-2 probe). `play` here only covers non-CSS behaviour.'}}},args:{children:"Save changes",variant:"primary",size:"md"},argTypes:{variant:{control:"inline-radio",options:["primary","secondary","tertiary","destructive"]},size:{control:"inline-radio",options:["sm","md","lg"]}}},s={args:{variant:"primary"}},i={args:{variant:"secondary",children:"Cancel"}},c={args:{variant:"tertiary",children:"View details"}},d={args:{variant:"destructive",children:"Permanently delete"}},l={name:"Sizes (sm / md / lg) — NEW, needs owner review",parameters:{docs:{description:{story:"OWNER SIGN-OFF: `md` is the only drawn artboard and is byte-identical to it. `sm` (--control-sm, 32px) and `lg` (--control-lg, 44px) are proposed for Session 11 toolbar/sticky-bar density. Approve, adjust the two heights, or reject `sm`/`lg` entirely."}}},render:a=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16},children:[e.jsx(n,{...a,size:"sm",children:"Small"}),e.jsx(n,{...a,size:"md",children:"Medium"}),e.jsx(n,{...a,size:"lg",children:"Large"})]})},m={name:"All variants (REST row — matches 6BR-0)",render:()=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:12},children:[e.jsx(n,{variant:"primary",children:"Save changes"}),e.jsx(n,{variant:"secondary",children:"Cancel"}),e.jsx(n,{variant:"tertiary",children:"View details"}),e.jsx(n,{variant:"destructive",children:"Permanently delete"})]})},p={name:"Hover (primary) ⇒ --color-accent-hover",args:{variant:"primary"},parameters:{interaction:{hover:"button",assertColor:[{selector:"button",prop:"backgroundColor",token:"--color-accent-hover"}]}}},u={name:"Hover (destructive) ⇒ --color-danger-hover",args:{variant:"destructive",children:"Permanently delete"},parameters:{interaction:{hover:"button",assertColor:[{selector:"button",prop:"backgroundColor",token:"--color-danger-hover"}]}}},g={name:"Hover (secondary) ⇒ --surface-hover",args:{variant:"secondary",children:"Cancel"},parameters:{interaction:{hover:"button",assertColor:[{selector:"button",prop:"backgroundColor",token:"--surface-hover"}]}}},v={name:"FocusVisible ⇒ §9.1 accent ring",parameters:{interaction:{focus:"button",assertFocusRing:"button"}}},y={name:"Disabled ⇒ §9.7 opacity, no pointer",args:{disabled:!0},play:async({canvasElement:a})=>{const r=S(a).getByRole("button");await t(r).toBeDisabled();const o=getComputedStyle(r);await t(o.pointerEvents).toBe("none"),await t(Number(o.opacity)).toBeLessThan(1)}},h={name:"Loading (primary) ⇒ §9.10 dim + spinner, width held",args:{loading:!0},play:async({canvasElement:a})=>{const r=S(a).getByRole("button");await t(r).toHaveAttribute("aria-busy","true"),await t(r).toHaveAttribute("data-loading"),await t(S(r).getByRole("status")).toBeInTheDocument(),await t(getComputedStyle(r).pointerEvents).toBe("none");const o=r.querySelector("span:last-child");await t(getComputedStyle(o).display).not.toBe("none")}},b={name:"Loading (destructive)",args:{loading:!0,variant:"destructive",children:"Deleting…"}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "primary"
  }
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "secondary",
    children: "Cancel"
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "tertiary",
    children: "View details"
  }
}`,...c.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "destructive",
    children: "Permanently delete"
  }
}`,...d.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Sizes (sm / md / lg) — NEW, needs owner review",
  parameters: {
    docs: {
      description: {
        story: "OWNER SIGN-OFF: \`md\` is the only drawn artboard and is byte-identical to it. \`sm\` (--control-sm, 32px) and \`lg\` (--control-lg, 44px) are proposed for Session 11 toolbar/sticky-bar density. Approve, adjust the two heights, or reject \`sm\`/\`lg\` entirely."
      }
    }
  },
  render: args => <div style={{
    display: "flex",
    alignItems: "center",
    gap: 16
  }}>
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="md">
        Medium
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
}`,...l.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "All variants (REST row — matches 6BR-0)",
  render: () => <div style={{
    display: "flex",
    alignItems: "center",
    gap: 12
  }}>
      <Button variant="primary">Save changes</Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="tertiary">View details</Button>
      <Button variant="destructive">Permanently delete</Button>
    </div>
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "Hover (primary) ⇒ --color-accent-hover",
  args: {
    variant: "primary"
  },
  parameters: {
    interaction: {
      hover: "button",
      assertColor: [{
        selector: "button",
        prop: "backgroundColor",
        token: "--color-accent-hover"
      }]
    }
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "Hover (destructive) ⇒ --color-danger-hover",
  args: {
    variant: "destructive",
    children: "Permanently delete"
  },
  parameters: {
    interaction: {
      hover: "button",
      assertColor: [{
        selector: "button",
        prop: "backgroundColor",
        token: "--color-danger-hover"
      }]
    }
  }
}`,...u.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "Hover (secondary) ⇒ --surface-hover",
  args: {
    variant: "secondary",
    children: "Cancel"
  },
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
}`,...g.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 accent ring",
  parameters: {
    interaction: {
      focus: "button",
      assertFocusRing: "button"
    }
  }
}`,...v.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Disabled ⇒ §9.7 opacity, no pointer",
  args: {
    disabled: true
  },
  play: async ({
    canvasElement
  }) => {
    const btn = within(canvasElement).getByRole("button");
    await expect(btn).toBeDisabled();
    const cs = getComputedStyle(btn);
    await expect(cs.pointerEvents).toBe("none");
    await expect(Number(cs.opacity)).toBeLessThan(1);
  }
}`,...y.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: "Loading (primary) ⇒ §9.10 dim + spinner, width held",
  args: {
    loading: true
  },
  play: async ({
    canvasElement
  }) => {
    const btn = within(canvasElement).getByRole("button");
    await expect(btn).toHaveAttribute("aria-busy", "true");
    await expect(btn).toHaveAttribute("data-loading");
    await expect(within(btn).getByRole("status")).toBeInTheDocument();
    await expect(getComputedStyle(btn).pointerEvents).toBe("none");
    const label = btn.querySelector("span:last-child")!;
    await expect(getComputedStyle(label).display).not.toBe("none");
  }
}`,...h.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: "Loading (destructive)",
  args: {
    loading: true,
    variant: "destructive",
    children: "Deleting…"
  }
}`,...b.parameters?.docs?.source}}};const k=["Primary","Secondary","Tertiary","Destructive","Sizes","AllVariants","HoverPrimary","HoverDestructive","HoverSecondary","FocusVisible","Disabled","LoadingPrimary","LoadingDestructive"];export{m as AllVariants,d as Destructive,y as Disabled,v as FocusVisible,u as HoverDestructive,p as HoverPrimary,g as HoverSecondary,b as LoadingDestructive,h as LoadingPrimary,s as Primary,i as Secondary,l as Sizes,c as Tertiary,k as __namedExportsOrder,R as default};
