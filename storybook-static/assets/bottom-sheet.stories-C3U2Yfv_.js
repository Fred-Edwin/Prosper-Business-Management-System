import{j as a}from"./utils-_OH9Wn3f.js";import{r as w}from"./iframe-sMR_UR-7.js";import{B as g}from"./bottom-sheet-B9zES2lS.js";import{B as b}from"./button-CREOhNf_.js";import"./preload-helper-PPVm8Dsz.js";import"./index-D9EGGsYK.js";import"./overlay-a6Z6rMfP.js";import"./spinner-RChkOJRi.js";const{expect:o,userEvent:s,waitFor:n,within:t}=__STORYBOOK_MODULE_TEST__,S={title:"Kit/BottomSheet",component:g,parameters:{layout:"fullscreen",visual:{disable:!0},docs:{description:{component:"C19 BottomSheet — `component-states.md §2 C19`. peek / open / dragging /\nbackdrop. Same overlay contract as Drawer; slides up from the bottom. The\ngrab handle is a real <button> (Space/Enter steps down).\nPortals to <body> → `visual: { disable: true }`."}}}};function c({start:e="closed",titled:i=!0}){const[y,r]=w.useState(e);return a.jsxs("div",{style:{padding:24},children:[a.jsx(b,{onClick:()=>r("open"),children:"Open sheet"}),a.jsx(b,{variant:"secondary",onClick:()=>r("peek"),children:"Peek"}),a.jsx(g,{state:y,onStateChange:r,title:i?"Add product":void 0,ariaLabel:i?void 0:"Record repayment for Grace Wanjiru",peekContent:a.jsx("div",{style:{fontFamily:"var(--font-ui)"},children:"Quick lookup"}),children:a.jsx("div",{style:{fontFamily:"var(--font-ui)"},children:"Full task content"})})]})}const l={name:"Open (full task) — ARTBOARD",render:()=>a.jsx(c,{}),play:async()=>{await s.click(t(document.body).getByRole("button",{name:"Open sheet"}));const e=await n(()=>t(document.body).getByRole("dialog"));await o(e).toHaveAttribute("aria-modal","true"),await o(t(e).getByText("Full task content")).toBeVisible()}},d={name:"Peek (in-context lookup) — ARTBOARD",render:()=>a.jsx(c,{}),play:async()=>{await s.click(t(document.body).getByRole("button",{name:"Peek"}));const e=await n(()=>t(document.body).getByRole("dialog"));await o(t(e).getByText("Quick lookup")).toBeVisible()}},p={name:"Backdrop ⇒ scrim+blur; Esc closes; focus trapped",render:()=>a.jsx(c,{}),play:async()=>{const e=t(document.body).getByRole("button",{name:"Open sheet"});await s.click(e);const i=await n(()=>t(document.body).getByRole("dialog")),y=document.body.querySelector(".kit-scrim"),r=getComputedStyle(y);await o(r.backdropFilter||r.getPropertyValue("-webkit-backdrop-filter")).toContain("blur"),await n(()=>o(i.contains(document.activeElement)).toBe(!0)),await s.keyboard("{Escape}"),await n(()=>o(t(document.body).queryByRole("dialog")).toBeNull()),await n(()=>o(e).toHaveFocus())}},u={name:"Grab handle (button): Enter steps open → peek",render:()=>a.jsx(c,{start:"open"}),play:async()=>{const e=t(document.body).getByRole("dialog");t(e).getByRole("button",{name:"Collapse"}).focus(),await s.keyboard("{Enter}"),await n(()=>o(t(document.body).getByText("Quick lookup")).toBeVisible())}},m={name:"No title ⇒ dialog named via ariaLabel (DDD-0 pattern)",render:()=>a.jsx(c,{start:"open",titled:!1}),play:async()=>{const e=t(document.body).getByRole("dialog");await o(e).toHaveAttribute("aria-label","Record repayment for Grace Wanjiru"),await o(t(e).getByText("Full task content")).toBeVisible()}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Open (full task) — ARTBOARD",
  render: () => <Harness />,
  play: async () => {
    await userEvent.click(within(document.body).getByRole("button", {
      name: "Open sheet"
    }));
    const dialog = await waitFor(() => within(document.body).getByRole("dialog"));
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(within(dialog).getByText("Full task content")).toBeVisible();
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Peek (in-context lookup) — ARTBOARD",
  render: () => <Harness />,
  play: async () => {
    await userEvent.click(within(document.body).getByRole("button", {
      name: "Peek"
    }));
    const dialog = await waitFor(() => within(document.body).getByRole("dialog"));
    await expect(within(dialog).getByText("Quick lookup")).toBeVisible();
  }
}`,...d.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "Backdrop ⇒ scrim+blur; Esc closes; focus trapped",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Open sheet"
    });
    await userEvent.click(opener);
    const dialog = await waitFor(() => within(document.body).getByRole("dialog"));
    const scrim = document.body.querySelector(".kit-scrim")!;
    const cs = getComputedStyle(scrim);
    await expect(cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter")).toContain("blur");
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  }
}`,...p.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "Grab handle (button): Enter steps open → peek",
  render: () => <Harness start="open" />,
  play: async () => {
    const dialog = within(document.body).getByRole("dialog");
    const handle = within(dialog).getByRole("button", {
      name: "Collapse"
    });
    handle.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(within(document.body).getByText("Quick lookup")).toBeVisible());
  }
}`,...u.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "No title ⇒ dialog named via ariaLabel (DDD-0 pattern)",
  render: () => <Harness start="open" titled={false} />,
  play: async () => {
    const dialog = within(document.body).getByRole("dialog");
    // No visible h1, but the dialog is still accessibly named.
    await expect(dialog).toHaveAttribute("aria-label", "Record repayment for Grace Wanjiru");
    await expect(within(dialog).getByText("Full task content")).toBeVisible();
  }
}`,...m.parameters?.docs?.source}}};const F=["Open","Peek","BackdropAndContract","HandleKeyboardStepsDown","TitlelessAriaLabel"];export{p as BackdropAndContract,u as HandleKeyboardStepsDown,l as Open,d as Peek,m as TitlelessAriaLabel,F as __namedExportsOrder,S as default};
