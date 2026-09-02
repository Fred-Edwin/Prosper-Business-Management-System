import{T as m}from"./text-input-DnKJZD6v.js";import"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./form-field-DkYjBilr.js";const{expect:t,within:u}=__STORYBOOK_MODULE_TEST__,h={title:"Kit/TextInput",component:m,parameters:{layout:"padded",docs:{description:{component:"C3 TextInput — `component-states.md §2 C3`. default / focus / filled / error /\ndisabled. §9.2 focus border + §9.8 error pattern (helper row + aria wiring via\n<FormField>)."}}},args:{label:"Product name",defaultValue:"Beef Fillet"}},a={},n={name:"Filled (value text — GLOBAL, same box)",args:{defaultValue:"Beef Fillet"}},o={name:"Focus ⇒ §9.2 accent border (any focus)",parameters:{interaction:{focus:"input",assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-accent"}]}}},s={name:"FocusVisible ⇒ §9.2 accent border (NO §9.1 ring — FLAG)",parameters:{docs:{description:{story:"FLAG (Session 10b, not fixed here): `design-principles.md §9.1` lists `input` / `textarea` among elements that get the keyboard-only accent ring, but `TextInput` and `Textarea` carry `.kit-field` (the §9.2 accent *border* on any focus) and NOT `.kit-focus-ring`. `Select` does have both. Adding a ring to the two field boxes is a visual change beyond this proof-harness session — routed to a design sprint. This story asserts what ships today: the §9.2 border only."}},interaction:{focus:"input",assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-accent"}]}}},i={name:"Error ⇒ §9.8 danger border + helper wired to aria-describedby",args:{error:!0,helperText:"Product name is required.",defaultValue:"Beef Fille"},parameters:{interaction:{assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-danger"}]}},play:async({canvasElement:e})=>{const r=u(e).getByRole("textbox");await t(r).toHaveAttribute("aria-invalid","true");const p=u(e).getByText("Product name is required.");await t(r).toHaveAttribute("aria-describedby",p.id)}},c={name:"Disabled (ARTBOARD — --surface-subtle, --text-disabled)",args:{disabled:!0,defaultValue:""},play:async({canvasElement:e})=>{await t(u(e).getByRole("textbox")).toBeDisabled()}},d={name:"Standalone (no label — caller must pass aria-label)",args:{label:void 0,"aria-label":"Product name"}},l={name:"startAdornment (KES currency marker — DDD-0 / DRN-0)",args:{label:"Amount",startAdornment:"KES",inputMode:"decimal",defaultValue:"500"},play:async({canvasElement:e})=>{const r=u(e);await t(r.getByText("KES")).toHaveAttribute("aria-hidden","true"),await t(r.getByRole("textbox")).toHaveValue("500")}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:"{}",...a.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "Filled (value text — GLOBAL, same box)",
  args: {
    defaultValue: "Beef Fillet"
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Focus ⇒ §9.2 accent border (any focus)",
  parameters: {
    interaction: {
      focus: "input",
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-accent"
      }]
    }
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.2 accent border (NO §9.1 ring — FLAG)",
  parameters: {
    docs: {
      description: {
        story: "FLAG (Session 10b, not fixed here): \`design-principles.md §9.1\` lists \`input\` / \`textarea\` among elements that get the keyboard-only accent ring, but \`TextInput\` and \`Textarea\` carry \`.kit-field\` (the §9.2 accent *border* on any focus) and NOT \`.kit-focus-ring\`. \`Select\` does have both. Adding a ring to the two field boxes is a visual change beyond this proof-harness session — routed to a design sprint. This story asserts what ships today: the §9.2 border only."
      }
    },
    interaction: {
      focus: "input",
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-accent"
      }]
    }
  }
}`,...s.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Error ⇒ §9.8 danger border + helper wired to aria-describedby",
  args: {
    error: true,
    helperText: "Product name is required.",
    defaultValue: "Beef Fille"
  },
  parameters: {
    interaction: {
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-danger"
      }]
    }
  },
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("textbox");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const msg = within(canvasElement).getByText("Product name is required.");
    await expect(input).toHaveAttribute("aria-describedby", msg.id);
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "Disabled (ARTBOARD — --surface-subtle, --text-disabled)",
  args: {
    disabled: true,
    defaultValue: ""
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("textbox")).toBeDisabled();
  }
}`,...c.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Standalone (no label — caller must pass aria-label)",
  args: {
    label: undefined,
    "aria-label": "Product name"
  }
}`,...d.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "startAdornment (KES currency marker — DDD-0 / DRN-0)",
  args: {
    label: "Amount",
    startAdornment: "KES",
    inputMode: "decimal",
    defaultValue: "500"
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // The marker is decorative (aria-hidden) — not part of the a11y name.
    await expect(c.getByText("KES")).toHaveAttribute("aria-hidden", "true");
    await expect(c.getByRole("textbox")).toHaveValue("500");
  }
}`,...l.parameters?.docs?.source}}};const A=["Rest","Filled","FocusBorder","FocusVisible_BorderOnly","Error","Disabled","Standalone","StartAdornment"];export{c as Disabled,i as Error,n as Filled,o as FocusBorder,s as FocusVisible_BorderOnly,a as Rest,d as Standalone,l as StartAdornment,A as __namedExportsOrder,h as default};
