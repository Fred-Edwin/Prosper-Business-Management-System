import{j as e,c as j}from"./utils-_OH9Wn3f.js";import{r as i}from"./iframe-sMR_UR-7.js";import{r as _}from"./index-D9EGGsYK.js";import{u as q,a as P,b as W,c as V,d as z,e as G}from"./overlay-a6Z6rMfP.js";import{B as E}from"./button-CREOhNf_.js";import{T as K}from"./text-input-DnKJZD6v.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";import"./form-field-DkYjBilr.js";function O({open:t,onClose:o,title:r,subtitle:s,variant:d="panel",children:C,footer:R,className:H}){const m=d==="rail",F=i.useRef(null),k=i.useRef(null),B=i.useId(),D=i.useId(),{mounted:S,phase:b,endExit:N}=q(t),y=S&&b!=="closing";P(y),W(S),V(F,y),z(k,y),G(y,o);const[T,I]=i.useState(null);return i.useEffect(()=>I(document.body),[]),!S||!T?null:_.createPortal(e.jsxs("div",{ref:F,className:"[font-synthesis:none] antialiased",children:[e.jsx("div",{className:"kit-scrim","data-state":b,onClick:o,"aria-hidden":!0}),e.jsxs("div",{className:j("kit-drawer-panel fixed flex flex-col bg-(--surface-raised) [box-shadow:var(--shadow-drawer)] [z-index:var(--z-drawer)] outline-none",m?"top-0 right-0 w-[420px] h-full border-l border-l-solid [border-left-color:var(--border-subtle)]":"top-1/2 right-(--sp-7) w-[380px] h-[560px] rounded-md border border-solid [border-color:var(--border-subtle)]",H),style:m?void 0:{"--kit-panel-y":"-50%"},"data-state":b,"data-side":"right",role:"dialog","aria-modal":"true","aria-labelledby":B,"aria-describedby":s?D:void 0,tabIndex:-1,ref:k,onTransitionEnd:L=>{L.target===k.current&&b==="closing"&&N()},children:[s?e.jsxs("div",{className:"flex items-start justify-between py-(--sp-6) shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]",children:[e.jsxs("div",{className:"flex flex-col gap-[2px]",children:[e.jsx("div",{id:B,className:"font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1",children:r}),e.jsx("div",{id:D,className:"font-ui [color:var(--text-secondary)] text-caption/micro",children:s})]}),e.jsx(A,{onClose:o})]}):e.jsxs("div",{className:"flex items-center justify-between h-[52px] shrink-0 px-(--sp-8) border-b border-b-solid [border-bottom-color:var(--border-subtle)]",children:[e.jsx("div",{id:B,className:"font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1",children:r}),e.jsx(A,{onClose:o})]}),e.jsx("div",{className:j("flex flex-col grow",m?"py-(--sp-6) px-(--sp-8) gap-(--sp-5) overflow-y-auto":"p-(--sp-8) gap-(--sp-6) overflow-y-auto"),children:C}),R&&e.jsx("div",{className:j("flex items-center shrink-0 gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]",m?"py-(--sp-6) px-(--sp-8) [background-color:var(--surface-subtle)]":"justify-end p-(--sp-8)"),children:R})]})]}),T)}function A({onClose:t}){return e.jsx("button",{type:"button",onClick:t,"aria-label":"Close",className:"shrink-0 kit-interactive kit-focus-ring rounded-sm [--kit-hover-bg:var(--surface-hover)]",children:e.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[e.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18",stroke:"var(--text-tertiary)",strokeWidth:"1.5",strokeLinecap:"round"}),e.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18",stroke:"var(--text-tertiary)",strokeWidth:"1.5",strokeLinecap:"round"})]})})}const{expect:a,userEvent:u,waitFor:l,within:n}=__STORYBOOK_MODULE_TEST__,te={title:"Kit/Drawer",component:O,parameters:{layout:"fullscreen",visual:{disable:!0},docs:{description:{component:"C18 Drawer — `component-states.md §2 C18`, `kit-audit.md §1`.\nshell / open (veil behind) / footer primary-disabled / submitting / scrolled.\nSession 10 gave it the full overlay contract (scrim + blur + opaque panel +\nfocus-trap + scroll-lock + inert bg + focus-restore + single-overlay guard +\nslide). `panel` and `rail` variants.\n\nThe overlay portals to <body>, outside #storybook-root — visual snapshot of\nthe root would miss it, so these stories `visual: { disable: true }` and\nprove the contract via `play` against document.body."}}}};function c({variant:t,footerDisabled:o,submitting:r}){const[s,d]=i.useState(!1);return e.jsxs("div",{style:{padding:24},children:[e.jsx(E,{onClick:()=>d(!0),children:"Open drawer"}),e.jsx(O,{open:s,onClose:()=>d(!1),title:"Edit product",subtitle:t==="rail"?"Store · Beef Fillet · Aug 24":void 0,variant:t,footer:e.jsxs(e.Fragment,{children:[e.jsx(E,{variant:"secondary",onClick:()=>d(!1),children:"Cancel"}),e.jsx(E,{loading:r,disabled:o,children:"Save changes"})]}),children:e.jsx(K,{label:"Product name",defaultValue:"Beef Fillet"})})]})}async function p(){return await u.click(n(document.body).getByRole("button",{name:"Open drawer"})),l(()=>n(document.body).getByRole("dialog"))}const h={name:"Shell (panel — header / body / footer)",render:()=>e.jsx(c,{}),play:async()=>{const t=await p();await a(t).toHaveAttribute("aria-modal","true"),await a(t).toHaveAttribute("aria-labelledby")}},f={name:"Rail variant (ADR-37b — docked, subtitle header)",render:()=>e.jsx(c,{variant:"rail"}),play:async()=>{const t=await p();await a(t).toHaveAttribute("aria-describedby")}},w={name:"Open ⇒ scrim+blur, focus trapped, <html> locked, Esc restores focus",render:()=>e.jsx(c,{}),play:async()=>{const t=n(document.body).getByRole("button",{name:"Open drawer"});await u.click(t);const o=await l(()=>n(document.body).getByRole("dialog")),r=document.body.querySelector(".kit-scrim");await a(r).toBeInTheDocument();const s=getComputedStyle(r);await a(s.backdropFilter||s.getPropertyValue("-webkit-backdrop-filter")).toContain("blur"),await l(()=>a(document.documentElement.style.overflow).toBe("hidden")),await l(()=>a(o.contains(document.activeElement)).toBe(!0)),await u.keyboard("{Escape}"),await l(()=>a(n(document.body).queryByRole("dialog")).toBeNull(),{timeout:4e3}),await l(()=>a(t).toHaveFocus()),await l(()=>a(document.documentElement.style.overflow).not.toBe("hidden"))}},v={name:"Tab past the last focusable wraps back into the panel (trap)",render:()=>e.jsx(c,{}),play:async()=>{await p();const t=n(document.body).getByRole("dialog"),o=[...t.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]')];o[o.length-1].focus(),await u.tab(),await a(t.contains(document.activeElement)).toBe(!0),o[0].focus(),await u.tab({shift:!0}),await a(t.contains(document.activeElement)).toBe(!0)}},g={name:"Footer: primary disabled (form invalid / no changes) — ARTBOARD",render:()=>e.jsx(c,{footerDisabled:!0}),play:async()=>{await p();const t=n(document.body).getByRole("button",{name:"Save changes"});await a(t).toBeDisabled()}},x={name:"Footer: submitting (primary-loading) — GLOBAL",render:()=>e.jsx(c,{submitting:!0}),play:async()=>{await p();const t=n(document.body).getByRole("button",{name:/Save changes/});await a(t).toHaveAttribute("aria-busy","true")}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: "Shell (panel — header / body / footer)",
  render: () => <Harness />,
  play: async () => {
    const dialog = await openDrawer();
    await expect(dialog).toHaveAttribute("aria-modal", "true");
    await expect(dialog).toHaveAttribute("aria-labelledby");
  }
}`,...h.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: "Rail variant (ADR-37b — docked, subtitle header)",
  render: () => <Harness variant="rail" />,
  play: async () => {
    const dialog = await openDrawer();
    await expect(dialog).toHaveAttribute("aria-describedby"); // subtitle wired
  }
}`,...f.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "Open ⇒ scrim+blur, focus trapped, <html> locked, Esc restores focus",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Open drawer"
    });
    await userEvent.click(opener);
    const dialog = await waitFor(() => within(document.body).getByRole("dialog"));

    // scrim present with a backdrop blur
    const scrim = document.body.querySelector(".kit-scrim")!;
    await expect(scrim).toBeInTheDocument();
    const scrimCS = getComputedStyle(scrim);
    await expect(scrimCS.backdropFilter || scrimCS.getPropertyValue("-webkit-backdrop-filter")).toContain("blur");

    // scroll-lock on <html> (assert the inline style the hook sets — the
    // \`overflow\` shorthand can compute to "visible" in Chromium even when set)
    await waitFor(() => expect(document.documentElement.style.overflow).toBe("hidden"));

    // focus is inside the panel
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // Esc starts the close (exit transition → unmount). Wait for full unmount,
    // then for focus-restore + scroll-lock release (both happen post-cleanup).
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull(), {
      timeout: 4000
    });
    await waitFor(() => expect(opener).toHaveFocus());
    await waitFor(() => expect(document.documentElement.style.overflow).not.toBe("hidden"));
  }
}`,...w.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "Tab past the last focusable wraps back into the panel (trap)",
  render: () => <Harness />,
  play: async () => {
    await openDrawer();
    const dialog = within(document.body).getByRole("dialog");
    const focusables = [...dialog.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]')];
    const last = focusables[focusables.length - 1];
    // Tab off the last focusable → focus stays inside the panel (wraps)
    last.focus();
    await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
    // Shift+Tab off the first → also stays inside
    focusables[0].focus();
    await userEvent.tab({
      shift: true
    });
    await expect(dialog.contains(document.activeElement)).toBe(true);
  }
}`,...v.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "Footer: primary disabled (form invalid / no changes) — ARTBOARD",
  render: () => <Harness footerDisabled />,
  play: async () => {
    await openDrawer();
    const save = within(document.body).getByRole("button", {
      name: "Save changes"
    });
    await expect(save).toBeDisabled();
  }
}`,...g.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "Footer: submitting (primary-loading) — GLOBAL",
  render: () => <Harness submitting />,
  play: async () => {
    await openDrawer();
    const save = within(document.body).getByRole("button", {
      name: /Save changes/
    });
    await expect(save).toHaveAttribute("aria-busy", "true");
  }
}`,...x.parameters?.docs?.source}}};const ae=["Shell","Rail","OverlayContract","FocusTrapWraps","FooterPrimaryDisabled","FooterSubmitting"];export{v as FocusTrapWraps,g as FooterPrimaryDisabled,x as FooterSubmitting,w as OverlayContract,f as Rail,h as Shell,ae as __namedExportsOrder,te as default};
