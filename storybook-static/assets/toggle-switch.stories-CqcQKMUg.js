import{j as t}from"./utils-_OH9Wn3f.js";import{r as h}from"./iframe-sMR_UR-7.js";import{T as l}from"./toggle-switch-Bx766aMs.js";import"./preload-helper-PPVm8Dsz.js";const{expect:s,userEvent:u,within:p}=__STORYBOOK_MODULE_TEST__,k={title:"Kit/ToggleSwitch",component:l,parameters:{layout:"centered",docs:{description:{component:'C7 ToggleSwitch — `component-states.md §2 C7`. on / off / disabled / focus.\nrole="switch", Space/Enter toggle (no arrow keys per APG).'}}},args:{"aria-label":"Available at Restaurant"}};function m(e){const[a,w]=h.useState(e.defaultChecked??!1);return t.jsx(l,{...e,checked:a,onChange:w,"aria-label":"Available at Restaurant"})}const r={render:()=>t.jsx(m,{defaultChecked:!0}),play:async({canvasElement:e})=>{await s(p(e).getByRole("switch")).toBeChecked()}},n={render:()=>t.jsx(m,{}),play:async({canvasElement:e})=>{await s(p(e).getByRole("switch")).not.toBeChecked()}},o={name:"FocusVisible ⇒ §9.1 ring around the track",render:()=>t.jsx(m,{}),parameters:{interaction:{focus:'[role="switch"]',assertFocusRing:'[role="switch"]'}}},c={name:"Disabled (on) — ARTBOARD",render:()=>t.jsx(l,{checked:!0,disabled:!0,"aria-label":"Locked on"}),play:async({canvasElement:e})=>{const a=p(e).getByRole("switch");await s(a).toBeDisabled(),await s(getComputedStyle(a).pointerEvents).toBe("none")}},i={name:"Disabled (off) — ARTBOARD",render:()=>t.jsx(l,{checked:!1,disabled:!0,"aria-label":"Locked off"})},d={name:"Space toggles aria-checked",render:()=>t.jsx(m,{}),play:async({canvasElement:e})=>{const a=p(e).getByRole("switch");a.focus(),await u.keyboard(" "),await s(a).toBeChecked(),await u.keyboard("{Enter}"),await s(a).not.toBeChecked()}};r.parameters={...r.parameters,docs:{...r.parameters?.docs,source:{originalSource:`{
  render: () => <Harness defaultChecked />,
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("switch")).toBeChecked();
  }
}`,...r.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("switch")).not.toBeChecked();
  }
}`,...n.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring around the track",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="switch"]',
      assertFocusRing: '[role="switch"]'
    }
  }
}`,...o.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "Disabled (on) — ARTBOARD",
  render: () => <ToggleSwitch checked disabled aria-label="Locked on" />,
  play: async ({
    canvasElement
  }) => {
    const sw = within(canvasElement).getByRole("switch");
    await expect(sw).toBeDisabled();
    await expect(getComputedStyle(sw).pointerEvents).toBe("none");
  }
}`,...c.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Disabled (off) — ARTBOARD",
  render: () => <ToggleSwitch checked={false} disabled aria-label="Locked off" />
}`,...i.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Space toggles aria-checked",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const sw = within(canvasElement).getByRole("switch");
    sw.focus();
    await userEvent.keyboard(" ");
    await expect(sw).toBeChecked();
    await userEvent.keyboard("{Enter}");
    await expect(sw).not.toBeChecked();
  }
}`,...d.parameters?.docs?.source}}};const B=["On","Off","FocusVisible","DisabledOn","DisabledOff","KeyboardToggle"];export{i as DisabledOff,c as DisabledOn,o as FocusVisible,d as KeyboardToggle,n as Off,r as On,B as __namedExportsOrder,k as default};
