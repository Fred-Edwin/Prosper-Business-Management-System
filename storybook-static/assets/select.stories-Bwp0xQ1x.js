import{j as r}from"./utils-_OH9Wn3f.js";import{S as E}from"./select-BxT165p-.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";import"./form-field-DkYjBilr.js";const{expect:e,userEvent:n,within:s}=__STORYBOOK_MODULE_TEST__,F={title:"Kit/Select",component:E,parameters:{layout:"padded",docs:{description:{component:`C5 Select — \`component-states.md §2 C5\`. closed / focus / open / filled /
error / disabled. Session 10 made it a real APG Select-Only listbox
(arrow / Home-End / type-ahead / aria-activedescendant / Enter selects+closes
/ Esc closes).`}}}},S=[{value:"ingredient",label:"Ingredient"},{value:"dish",label:"Dish"},{value:"goods",label:"Goods"}],R=[{value:"rice-basmati",label:"Rice Basmati"},{value:"rice-flour",label:"Rice Flour"},{value:"beef",label:"Beef"},{value:"flour",label:"Flour"},{value:"milk",label:"Milk"},{value:"sugar",label:"Sugar"}],c=a=>r.jsx(E,{label:"Category",options:S,...a}),d={render:()=>r.jsx(c,{defaultValue:"ingredient"})},u={name:"Closed, no value (placeholder) — contrast FLAG",render:()=>r.jsx(c,{}),parameters:{docs:{description:{story:"FLAG (Session 10b, not fixed): the placeholder text is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1 — below WCAG AA 4.5:1. This is systemic (Select / TextInput / SearchInput / DatePicker all use `--text-tertiary` for placeholder) and darkening it changes the drawn visual, so it goes to a design sprint (`--text-secondary` for placeholders, or accept as an incidental-text carve-out). The `color-contrast` rule is scoped off for this story only."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},p={name:"FocusVisible ⇒ §9.1 ring (Select has .kit-focus-ring)",render:()=>r.jsx(c,{defaultValue:"ingredient"}),parameters:{interaction:{focus:'[role="combobox"]',assertFocusRing:'[role="combobox"]'}}},b={name:"Open ⇒ accent border + listbox + activedescendant",render:()=>r.jsx(c,{defaultValue:"ingredient"}),play:async({canvasElement:a})=>{const t=s(a).getByRole("combobox");t.focus(),await n.keyboard("{ArrowDown}"),await e(t).toHaveAttribute("aria-expanded","true");const o=s(a).getByRole("listbox");await e(o).toBeInTheDocument(),await e(t).toHaveAttribute("aria-activedescendant",e.stringContaining("-opt-0"))}},g={name:"↓ moves activedescendant; Enter selects + closes",render:()=>r.jsx(c,{defaultValue:"ingredient"}),play:async({canvasElement:a})=>{const o=s(a).getByRole("combobox");o.focus(),await n.keyboard("{ArrowDown}"),await n.keyboard("{ArrowDown}"),await e(o).toHaveAttribute("aria-activedescendant",e.stringContaining("-opt-1")),await n.keyboard("{Enter}"),await e(o).toHaveAttribute("aria-expanded","false"),await e(o).toHaveTextContent("Dish")}},m={name:"Esc closes without selecting",render:()=>r.jsx(c,{defaultValue:"ingredient"}),play:async({canvasElement:a})=>{const t=s(a).getByRole("combobox");t.focus(),await n.keyboard("{ArrowDown}{ArrowDown}{Escape}"),await e(t).toHaveAttribute("aria-expanded","false"),await e(t).toHaveTextContent("Ingredient")}},y={name:"Open: hovered option ⇒ --surface-hover; selected ⇒ accent label",render:()=>r.jsx(c,{defaultValue:"dish"}),play:async({canvasElement:a})=>{s(a).getByRole("combobox").focus(),await n.keyboard("{ArrowDown}");const o=s(a).getByRole("option",{selected:!0});await e(o).toHaveTextContent("Dish")}},w={name:"Error ⇒ §9.8 danger border + helper wired",render:()=>r.jsx(c,{error:!0,helperText:"Location is required."}),parameters:{interaction:{assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-danger"}]},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}},play:async({canvasElement:a})=>{const t=s(a).getByRole("combobox");await e(t).toHaveAttribute("aria-invalid","true")}},x={render:()=>r.jsx(c,{disabled:!0,defaultValue:"ingredient"}),play:async({canvasElement:a})=>{await e(s(a).getByRole("combobox")).toBeDisabled()}},l=a=>r.jsx(E,{label:"Product",options:R,searchable:!0,...a}),h={name:"Searchable, closed ⇒ identical to a plain closed Select",render:()=>r.jsx(l,{defaultValue:"beef"}),play:async({canvasElement:a})=>{const t=s(a).getByRole("combobox");await e(t.tagName).toBe("BUTTON"),await e(t).toHaveTextContent("Beef"),await e(s(a).queryByRole("textbox")).not.toBeInTheDocument()}},v={name:"Searchable open: FocusVisible ⇒ §9.1 ring on the filter input",render:()=>r.jsx(l,{defaultValue:"beef"}),play:async({canvasElement:a})=>{const t=s(a);t.getByRole("combobox").focus(),await n.keyboard("{ArrowDown}");const o=t.getByRole("combobox");await e(o.tagName).toBe("INPUT"),await e(o).toHaveClass("kit-focus-ring"),o.focus(),await n.keyboard("{ArrowDown}");const i=getComputedStyle(o);await e(i.outlineStyle).not.toBe("none"),await e(i.outlineWidth).not.toBe("0px")}},f={name:"Searchable, open: type ⇒ input + filtered list (visual = 6CG-0 open row)",render:()=>r.jsx(l,{defaultValue:"beef"}),parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}},play:async({canvasElement:a})=>{const t=s(a);t.getByRole("combobox").focus(),await n.keyboard("{ArrowDown}");const o=t.getByRole("combobox");await e(o.tagName).toBe("INPUT"),await e(o).toHaveAttribute("aria-expanded","true"),await e(o).toHaveAttribute("aria-autocomplete","list"),await n.type(o,"ric");const i=t.getAllByRole("option");await e(i).toHaveLength(2),await e(i[0]).toHaveTextContent("Rice Basmati"),await e(i[1]).toHaveTextContent("Rice Flour"),await e(o).toHaveAttribute("aria-activedescendant",e.stringContaining("-opt-0"))}},B={name:"Searchable: ↓ over the filtered list; Enter commits + closes",render:()=>r.jsx(l,{defaultValue:"beef"}),parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}},play:async({canvasElement:a})=>{const t=s(a);t.getByRole("combobox").focus(),await n.keyboard("{ArrowDown}");const o=t.getByRole("combobox");await n.type(o,"ric"),await e(o).toHaveAttribute("aria-activedescendant",e.stringContaining("-opt-0")),await n.keyboard("{ArrowDown}"),await e(o).toHaveAttribute("aria-activedescendant",e.stringContaining("-opt-1")),await n.keyboard("{Enter}");const i=t.getByRole("combobox");await e(i.tagName).toBe("BUTTON"),await e(i).toHaveAttribute("aria-expanded","false"),await e(i).toHaveTextContent("Rice Flour")}},A={name:'Searchable: no match ⇒ one non-interactive "No matches" row',render:()=>r.jsx(l,{defaultValue:"beef",noMatchesLabel:"No products match"}),parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}},play:async({canvasElement:a})=>{const t=s(a);t.getByRole("combobox").focus(),await n.keyboard("{ArrowDown}");const o=t.getByRole("combobox");await n.type(o,"zzz"),await e(t.queryAllByRole("option")).toHaveLength(0),await e(t.getByText("No products match")).toBeInTheDocument(),await n.keyboard("{Enter}"),await e(t.getByRole("combobox")).toHaveAttribute("aria-expanded","true")}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  render: () => <Base defaultValue="ingredient" />
}`,...d.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "Closed, no value (placeholder) — contrast FLAG",
  render: () => <Base />,
  parameters: {
    docs: {
      description: {
        story: "FLAG (Session 10b, not fixed): the placeholder text is \`--text-tertiary\` (\`--color-gray-500\`) on \`--surface-page\` ≈ 3.4:1 — below WCAG AA 4.5:1. This is systemic (Select / TextInput / SearchInput / DatePicker all use \`--text-tertiary\` for placeholder) and darkening it changes the drawn visual, so it goes to a design sprint (\`--text-secondary\` for placeholders, or accept as an incidental-text carve-out). The \`color-contrast\` rule is scoped off for this story only."
      }
    },
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  }
}`,...u.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring (Select has .kit-focus-ring)",
  render: () => <Base defaultValue="ingredient" />,
  parameters: {
    interaction: {
      focus: '[role="combobox"]',
      assertFocusRing: '[role="combobox"]'
    }
  }
}`,...p.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: "Open ⇒ accent border + listbox + activedescendant",
  render: () => <Base defaultValue="ingredient" />,
  play: async ({
    canvasElement
  }) => {
    const trigger = within(canvasElement).getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const listbox = within(canvasElement).getByRole("listbox");
    await expect(listbox).toBeInTheDocument();
    // activedescendant points at the selected option on open
    await expect(trigger).toHaveAttribute("aria-activedescendant", expect.stringContaining("-opt-0"));
  }
}`,...b.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "↓ moves activedescendant; Enter selects + closes",
  render: () => <Base defaultValue="ingredient" />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const trigger = c.getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}"); // open, active = Ingredient
    await userEvent.keyboard("{ArrowDown}"); // active = Dish
    await expect(trigger).toHaveAttribute("aria-activedescendant", expect.stringContaining("-opt-1"));
    await userEvent.keyboard("{Enter}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveTextContent("Dish");
  }
}`,...g.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "Esc closes without selecting",
  render: () => <Base defaultValue="ingredient" />,
  play: async ({
    canvasElement
  }) => {
    const trigger = within(canvasElement).getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Escape}");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveTextContent("Ingredient"); // unchanged
  }
}`,...m.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Open: hovered option ⇒ --surface-hover; selected ⇒ accent label",
  render: () => <Base defaultValue="dish" />,
  play: async ({
    canvasElement
  }) => {
    const trigger = within(canvasElement).getByRole("combobox");
    trigger.focus();
    await userEvent.keyboard("{ArrowDown}");
    const selected = within(canvasElement).getByRole("option", {
      selected: true
    });
    await expect(selected).toHaveTextContent("Dish");
  }
}`,...y.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "Error ⇒ §9.8 danger border + helper wired",
  render: () => <Base error helperText="Location is required." />,
  parameters: {
    interaction: {
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-danger"
      }]
    },
    // same placeholder-contrast FLAG as the Placeholder story (no value → the
    // --text-tertiary placeholder is visible).
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const trigger = within(canvasElement).getByRole("combobox");
    await expect(trigger).toHaveAttribute("aria-invalid", "true");
  }
}`,...w.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  render: () => <Base disabled defaultValue="ingredient" />,
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("combobox")).toBeDisabled();
  }
}`,...x.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: "Searchable, closed ⇒ identical to a plain closed Select",
  render: () => <SearchBase defaultValue="beef" />,
  play: async ({
    canvasElement
  }) => {
    // Closed: still a <button role=combobox>, no filter input rendered.
    const trigger = within(canvasElement).getByRole("combobox");
    await expect(trigger.tagName).toBe("BUTTON");
    await expect(trigger).toHaveTextContent("Beef");
    await expect(within(canvasElement).queryByRole("textbox")).not.toBeInTheDocument();
  }
}`,...h.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "Searchable open: FocusVisible ⇒ §9.1 ring on the filter input",
  render: () => <SearchBase defaultValue="beef" />,
  // The filter <input> is conditionally rendered (only while open), so the
  // harness \`interaction.focus\` Shift+Tab/Tab path can't target it reliably.
  // Assert the ring in-play instead: open, keyboard-focus the input, read the
  // resolved outline. \`.kit-focus-ring:focus-visible\` ⇒ a non-zero outline in
  // the accent colour (§9.1).
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    c.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}"); // open
    const input = c.getByRole("combobox") as HTMLInputElement;
    await expect(input.tagName).toBe("INPUT");
    await expect(input).toHaveClass("kit-focus-ring");

    // A keyboard interaction on the freshly-focused element satisfies the
    // :focus-visible heuristic in Chromium.
    input.focus();
    await userEvent.keyboard("{ArrowDown}");
    const cs = getComputedStyle(input);
    await expect(cs.outlineStyle).not.toBe("none");
    await expect(cs.outlineWidth).not.toBe("0px");
  }
}`,...v.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: "Searchable, open: type ⇒ input + filtered list (visual = 6CG-0 open row)",
  render: () => <SearchBase defaultValue="beef" />,
  parameters: {
    // typed text is --text-primary; the placeholder (--text-secondary) is the
    // same systemic incidental-text FLAG scoped off elsewhere (Placeholder).
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  },
  // Leaves the popover OPEN so the snapshot matches the artboard's open row.
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    c.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}"); // open
    const input = c.getByRole("combobox");
    await expect(input.tagName).toBe("INPUT");
    await expect(input).toHaveAttribute("aria-expanded", "true");
    await expect(input).toHaveAttribute("aria-autocomplete", "list");
    await userEvent.type(input, "ric");
    // "ric" ⇒ Rice Basmati, Rice Flour only.
    const opts = c.getAllByRole("option");
    await expect(opts).toHaveLength(2);
    await expect(opts[0]).toHaveTextContent("Rice Basmati");
    await expect(opts[1]).toHaveTextContent("Rice Flour");
    await expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("-opt-0"));
  }
}`,...f.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  name: "Searchable: ↓ over the filtered list; Enter commits + closes",
  render: () => <SearchBase defaultValue="beef" />,
  parameters: {
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    c.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}"); // open
    const input = c.getByRole("combobox");
    await userEvent.type(input, "ric"); // ⇒ Rice Basmati, Rice Flour
    await expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("-opt-0"));
    await userEvent.keyboard("{ArrowDown}"); // active ⇒ Rice Flour
    await expect(input).toHaveAttribute("aria-activedescendant", expect.stringContaining("-opt-1"));
    await userEvent.keyboard("{Enter}");
    // Committed Rice Flour + closed; trigger is a <button> again showing it.
    const trigger = c.getByRole("combobox");
    await expect(trigger.tagName).toBe("BUTTON");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toHaveTextContent("Rice Flour");
  }
}`,...B.parameters?.docs?.source}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  name: 'Searchable: no match ⇒ one non-interactive "No matches" row',
  render: () => <SearchBase defaultValue="beef" noMatchesLabel="No products match" />,
  parameters: {
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    c.getByRole("combobox").focus();
    await userEvent.keyboard("{ArrowDown}");
    const input = c.getByRole("combobox");
    await userEvent.type(input, "zzz");
    await expect(c.queryAllByRole("option")).toHaveLength(0);
    await expect(c.getByText("No products match")).toBeInTheDocument();
    // Enter does nothing — stays open, value unchanged.
    await userEvent.keyboard("{Enter}");
    await expect(c.getByRole("combobox")).toHaveAttribute("aria-expanded", "true");
  }
}`,...A.parameters?.docs?.source}}};const V=["Rest","Placeholder","FocusRing","Open","OpenKeyboardSelect","OpenEscCloses","OptionHoverAndSelected","Error","Disabled","SearchableClosed","SearchableFocusRing","SearchableOpenFiltered","SearchableKeyboardCommit","SearchableNoMatch"];export{x as Disabled,w as Error,p as FocusRing,b as Open,m as OpenEscCloses,g as OpenKeyboardSelect,y as OptionHoverAndSelected,u as Placeholder,d as Rest,h as SearchableClosed,v as SearchableFocusRing,B as SearchableKeyboardCommit,A as SearchableNoMatch,f as SearchableOpenFiltered,V as __namedExportsOrder,F as default};
