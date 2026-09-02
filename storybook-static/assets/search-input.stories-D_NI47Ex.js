import{j as r}from"./utils-_OH9Wn3f.js";import{r as u}from"./iframe-sMR_UR-7.js";import{S as m}from"./search-input-ClzrMgo3.js";import"./preload-helper-PPVm8Dsz.js";const{expect:c,userEvent:p,within:l}=__STORYBOOK_MODULE_TEST__,y={title:"Kit/SearchInput",component:m,parameters:{layout:"padded",docs:{description:{component:'C8 SearchInput — `component-states.md §2 C8`. default / focus / filled+clear.\nNever disabled in M1. Session 10: aria-label ("Search"), role="search"\nlandmark, Esc-to-clear.'}}}};function i({start:e=""}){const[a,d]=u.useState(e);return r.jsx(m,{value:a,onChange:d})}const t={name:"Default (placeholder)",render:()=>r.jsx(i,{}),play:async({canvasElement:e})=>{await c(l(e).getByRole("searchbox",{name:"Search"})).toBeInTheDocument()}},n={name:"Focus ⇒ §9.2 accent border",render:()=>r.jsx(i,{start:"beef"}),parameters:{interaction:{focus:"input",assertColor:[{selector:'[role="search"]',prop:"borderColor",token:"--color-accent"}]}}},s={name:"Filled ⇒ value + ✕ clear affordance",render:()=>r.jsx(i,{start:"Beef Fillet"}),play:async({canvasElement:e})=>{const a=l(e).getByRole("button",{name:"Clear search"});await c(a).toBeInTheDocument(),await p.click(a),await c(l(e).getByRole("searchbox")).toHaveValue("")}},o={name:"Esc clears when filled (APG search)",render:()=>r.jsx(i,{start:"rice"}),play:async({canvasElement:e})=>{const a=l(e).getByRole("searchbox");a.focus(),await p.keyboard("{Escape}"),await c(a).toHaveValue("")}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "Default (placeholder)",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    // has an accessible name even with no visible label
    await expect(within(canvasElement).getByRole("searchbox", {
      name: "Search"
    })).toBeInTheDocument();
  }
}`,...t.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  name: "Focus ⇒ §9.2 accent border",
  render: () => <Harness start="beef" />,
  parameters: {
    interaction: {
      focus: "input",
      assertColor: [{
        selector: '[role="search"]',
        prop: "borderColor",
        token: "--color-accent"
      }]
    }
  }
}`,...n.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "Filled ⇒ value + ✕ clear affordance",
  render: () => <Harness start="Beef Fillet" />,
  play: async ({
    canvasElement
  }) => {
    const clear = within(canvasElement).getByRole("button", {
      name: "Clear search"
    });
    await expect(clear).toBeInTheDocument();
    await userEvent.click(clear);
    await expect(within(canvasElement).getByRole("searchbox")).toHaveValue("");
  }
}`,...s.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Esc clears when filled (APG search)",
  render: () => <Harness start="rice" />,
  play: async ({
    canvasElement
  }) => {
    const box = within(canvasElement).getByRole("searchbox");
    box.focus();
    await userEvent.keyboard("{Escape}");
    await expect(box).toHaveValue("");
  }
}`,...o.parameters?.docs?.source}}};const E=["Rest","FocusBorder","FilledWithClear","EscClears"];export{o as EscClears,s as FilledWithClear,n as FocusBorder,t as Rest,E as __namedExportsOrder,y as default};
