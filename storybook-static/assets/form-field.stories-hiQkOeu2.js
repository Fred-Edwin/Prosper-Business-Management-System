import{j as m}from"./utils-_OH9Wn3f.js";import{F as b}from"./form-field-DkYjBilr.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function y(t){const e=document.createElement("span");e.style.position="fixed",e.style.left="-9999px",e.style.color=`var(${t})`,document.body.appendChild(e);const r=getComputedStyle(e).color;return e.remove(),r}function u(t,e,r){const d=getComputedStyle(t)[e],p=y(r);if(d!==p)throw new Error(`expected ${e} to equal ${r} (${p}), got ${d}`)}const{expect:a,within:n}=__STORYBOOK_MODULE_TEST__,w={title:"Kit/Primitives/FormField",component:b,parameters:{layout:"padded",docs:{description:{component:"NEW primitive (Session 10 Deliverable 3d) — `kit-audit.md §3`, ADR-43.\nAuthors the §9.8 helper/error row ONCE: label + control slot + helper/error\n`<p>`, with `aria-describedby` / `aria-invalid` wired. Mechanical — accepted.\n`TextInput` / `Textarea` / `Select` / `QuantityStepper` compose it.\n\nThese stories prove the wiring; the field components' own stories prove the\ncomposed visual per §9.8."}}}},l=t=>m.jsx("input",{...t,className:"kit-field h-(--control-md) px-(--sp-4) rounded-sm border border-solid [border-color:var(--border-strong)]",defaultValue:"Beef Fillet"}),o={name:"Rest (label + control, no message)",args:{label:"Product name",children:l},play:async({canvasElement:t})=>{const e=n(t).getByRole("textbox");await a(e).not.toHaveAttribute("aria-describedby"),await a(e).not.toHaveAttribute("aria-invalid");const r=t.querySelector("label");await a(r).toHaveAttribute("for",e.id)}},i={name:"Hint (neutral helper text, --text-secondary)",args:{label:"Product name",hint:"Shown on receipts and reports.",children:l},play:async({canvasElement:t})=>{const e=n(t).getByRole("textbox"),r=n(t).getByText("Shown on receipts and reports.");await a(e).toHaveAttribute("aria-describedby",r.id),await a(e).not.toHaveAttribute("aria-invalid"),u(r,"color","--text-secondary")}},s={name:"Error ⇒ §9.8 danger message + aria-invalid + describedby",args:{label:"Product name",error:"Product name is required.",children:l},play:async({canvasElement:t})=>{const e=n(t).getByRole("textbox"),r=n(t).getByText("Product name is required.");await a(e).toHaveAttribute("aria-invalid","true"),await a(e).toHaveAttribute("aria-describedby",r.id),u(r,"color","--color-danger")}},c={name:"Required (asterisk, aria-hidden)",args:{label:"Product name",required:!0,children:l},play:async({canvasElement:t})=>{const e=t.querySelector("label span[aria-hidden]");await a(e).toHaveTextContent("*")}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Rest (label + control, no message)",
  args: {
    label: "Product name",
    children: Control
  },
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("textbox");
    await expect(input).not.toHaveAttribute("aria-describedby");
    await expect(input).not.toHaveAttribute("aria-invalid");
    // label points at the control
    const label = canvasElement.querySelector("label")!;
    await expect(label).toHaveAttribute("for", input.id);
  }
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Hint (neutral helper text, --text-secondary)",
  args: {
    label: "Product name",
    hint: "Shown on receipts and reports.",
    children: Control
  },
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("textbox");
    const msg = within(canvasElement).getByText("Shown on receipts and reports.");
    await expect(input).toHaveAttribute("aria-describedby", msg.id);
    await expect(input).not.toHaveAttribute("aria-invalid");
    expectComputedColor(msg, "color", "--text-secondary");
  }
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "Error ⇒ §9.8 danger message + aria-invalid + describedby",
  args: {
    label: "Product name",
    error: "Product name is required.",
    children: Control
  },
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("textbox");
    const msg = within(canvasElement).getByText("Product name is required.");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", msg.id);
    expectComputedColor(msg, "color", "--color-danger");
  }
}`,...s.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "Required (asterisk, aria-hidden)",
  args: {
    label: "Product name",
    required: true,
    children: Control
  },
  play: async ({
    canvasElement
  }) => {
    const star = canvasElement.querySelector("label span[aria-hidden]")!;
    await expect(star).toHaveTextContent("*");
  }
}`,...c.parameters?.docs?.source}}};const E=["Rest","Hint","Error","Required"];export{s as Error,i as Hint,c as Required,o as Rest,E as __namedExportsOrder,w as default};
