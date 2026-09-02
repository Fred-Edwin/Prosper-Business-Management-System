import{j as e,c as V}from"./utils-_OH9Wn3f.js";import{r as i}from"./iframe-sMR_UR-7.js";import{r as Y}from"./index-D9EGGsYK.js";import{B as j}from"./button-CREOhNf_.js";import{u as K,a as U,b as Z,c as G,d as J,e as Q}from"./overlay-a6Z6rMfP.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";const X="You are about to permanently delete this record. This will erase it and its history from every register and audit log. This cannot be undone.";function L({open:t,onClose:a,onConfirm:r,recordName:s,title:A="Delete Record",bodyCopy:O=X,cancelLabel:I="Cancel",confirmLabel:_="Permanently Delete",showArchiveLink:M=!0,onArchive:W,submitting:D=!1}){const[v,R]=i.useState(""),E=i.useRef(null),w=i.useRef(null),N=i.useId(),C=i.useId(),S=i.useId(),H=i.useId(),{mounted:k,phase:u,endExit:q}=K(t),p=k&&u!=="closing";U(p),Z(k),G(E,p),J(w,p),Q(p,a),i.useEffect(()=>{t&&R("")},[t]);const[P,z]=i.useState(null);if(i.useEffect(()=>z(document.body),[]),!k||!P)return null;const F=v===s,l=v.length>0&&!F;return Y.createPortal(e.jsxs("div",{ref:E,className:"[font-synthesis:none] antialiased",children:[e.jsx("div",{className:"kit-scrim","data-state":u,onClick:a,"aria-hidden":!0}),e.jsxs("div",{ref:w,className:"kit-dialog-panel fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[440px] max-w-[calc(100vw-var(--sp-8))] rounded-md bg-(--surface-raised) border border-solid [border-color:var(--border-subtle)] [box-shadow:var(--shadow-dialog)] [z-index:var(--z-dialog)] outline-none","data-state":u,role:"alertdialog","aria-modal":"true","aria-labelledby":N,"aria-describedby":C,tabIndex:-1,onTransitionEnd:B=>{B.target===w.current&&u==="closing"&&q()},children:[e.jsxs("div",{className:"flex items-start p-(--sp-8) gap-(--sp-5) border-b border-b-solid [border-bottom-color:var(--border-subtle)]",children:[e.jsx("div",{className:"w-[36px] h-[36px] flex items-center justify-center shrink-0 rounded-full bg-danger-bg",children:e.jsxs("svg",{width:"18",height:"18",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[e.jsx("path",{d:"M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z",fill:"none",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("line",{x1:"12",y1:"9",x2:"12",y2:"13",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("line",{x1:"12",y1:"17",x2:"12.01",y2:"17",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})]})}),e.jsxs("div",{className:"flex flex-col gap-[2px]",children:[e.jsx("div",{id:N,className:"font-ui font-(--weight-semibold) [color:var(--text-primary)] text-h1/h1",children:A}),e.jsx("div",{className:"font-ui font-(--weight-semibold) text-[10px] [letter-spacing:0.06em] uppercase leading-[12px] text-danger",children:"Permanent irreversible action"})]})]}),e.jsxs("div",{className:"flex flex-col p-(--sp-8) gap-(--sp-6)",children:[e.jsx("div",{id:C,className:"p-(--sp-5) rounded-sm bg-danger-bg",children:e.jsx("div",{className:"font-ui text-danger text-sm/sm",children:O})}),e.jsxs("div",{className:"flex flex-col gap-[6px]",children:[e.jsx("label",{htmlFor:S,className:"font-ui [color:var(--text-secondary)] text-sm/sm",children:"To confirm, type the exact record name below:"}),e.jsx("div",{className:V("flex items-center h-[36px] px-(--sp-5) rounded-sm shrink-0 border border-solid kit-field",l?"border-danger":"[border-color:var(--border-strong)]"),"data-invalid":l||void 0,children:e.jsx("input",{id:S,value:v,onChange:B=>R(B.target.value),placeholder:s,"aria-invalid":l||void 0,"aria-describedby":l?H:void 0,autoComplete:"off",className:"font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm w-full bg-transparent outline-none placeholder:font-(--weight-regular) placeholder:[color:var(--text-tertiary)]"})}),l&&e.jsx("div",{id:H,className:"font-ui text-danger text-caption/micro",children:"The name doesn’t match. Type it exactly to enable deletion."})]}),M&&e.jsxs("button",{type:"button",onClick:W,className:"flex items-center gap-[6px] kit-focus-ring rounded-sm self-start",children:[e.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[e.jsx("path",{d:"M21 8v13H3V8",fill:"none",stroke:"var(--color-accent)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("path",{d:"M1 3h22v5H1z",fill:"none",stroke:"var(--color-accent)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"}),e.jsx("line",{x1:"10",y1:"12",x2:"14",y2:"12",stroke:"var(--color-accent)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})]}),e.jsx("div",{className:"font-ui font-(--weight-medium) text-accent text-sm/sm",children:"Archive instead — hides it without data loss"})]})]}),e.jsxs("div",{className:"flex items-center justify-end p-(--sp-8) gap-(--sp-4) border-t border-t-solid [border-top-color:var(--border-subtle)]",children:[e.jsx(j,{variant:"secondary",onClick:a,disabled:D,children:I}),e.jsx(j,{variant:"destructive",onClick:r,disabled:!F,loading:D,children:_})]})]})]}),P)}const{expect:o,userEvent:c,waitFor:d,within:n}=__STORYBOOK_MODULE_TEST__,ie={title:"Kit/FrictionDeleteDialog",component:L,parameters:{layout:"fullscreen",visual:{disable:!0},docs:{description:{component:"C17 FrictionDeleteDialog — `component-states.md §2 C17`, `kit-audit.md §1`.\npending / confirmed / retype-mismatch / submitting. Full overlay contract;\nfield neutral→danger on mismatch; footer composes <Button>. ADR-36c props.\nPortals to <body> → `visual: { disable: true }`, proven via play."}}}},T="Commercial Deep Fryer Double";function m({submitting:t}){const[a,r]=i.useState(!1);return e.jsxs("div",{style:{padding:24},children:[e.jsx(j,{variant:"destructive",onClick:()=>r(!0),children:"Delete record"}),e.jsx(L,{open:a,onClose:()=>r(!1),onConfirm:()=>r(!1),recordName:T,submitting:t})]})}async function h(){return await c.click(n(document.body).getByRole("button",{name:"Delete record"})),d(()=>n(document.body).getByRole("alertdialog"))}const y={name:"Pending (retype empty → confirm disabled, field neutral)",render:()=>e.jsx(m,{}),play:async()=>{const t=await h(),a=n(t).getByRole("button",{name:"Permanently Delete"});await o(a).toBeDisabled();const r=n(t).getByRole("textbox");await o(r.closest("[data-invalid]")).toBeNull()}},b={name:"Retype mismatch ⇒ §9.8 danger field + helper, confirm stays disabled",render:()=>e.jsx(m,{}),play:async()=>{const t=await h(),a=n(t).getByRole("textbox");await c.type(a,"wrong name"),await o(a).toHaveAttribute("aria-invalid","true");const r=n(t).getByText(/name doesn.t match/i);await o(a).toHaveAttribute("aria-describedby",r.id),await o(n(t).getByRole("button",{name:"Permanently Delete"})).toBeDisabled()}},x={name:"Confirmed (typed string matches → confirm enabled)",render:()=>e.jsx(m,{}),play:async()=>{const t=await h(),a=n(t).getByRole("textbox");await c.type(a,T),await o(a).not.toHaveAttribute("aria-invalid"),await o(n(t).getByRole("button",{name:"Permanently Delete"})).toBeEnabled()}},g={name:"Submitting (destructive-loading, everything locks)",render:()=>e.jsx(m,{submitting:!0}),play:async()=>{const t=await h(),a=n(t).getByRole("button",{name:/Permanently Delete/});await o(a).toHaveAttribute("aria-busy","true"),await o(n(t).getByRole("button",{name:"Cancel"})).toBeDisabled()}},f={name:"Open ⇒ scrim+blur, focus on the field, Esc restores focus",render:()=>e.jsx(m,{}),play:async()=>{const t=n(document.body).getByRole("button",{name:"Delete record"});await c.click(t);const a=await d(()=>n(document.body).getByRole("alertdialog")),r=document.body.querySelector(".kit-scrim"),s=getComputedStyle(r);await o(s.backdropFilter||s.getPropertyValue("-webkit-backdrop-filter")).toContain("blur"),await d(()=>o(a.contains(document.activeElement)).toBe(!0)),await c.keyboard("{Escape}"),await d(()=>o(n(document.body).queryByRole("alertdialog")).toBeNull()),await d(()=>o(t).toHaveFocus())}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Pending (retype empty → confirm disabled, field neutral)",
  render: () => <Harness />,
  play: async () => {
    const d = await openDialog();
    const confirm = within(d).getByRole("button", {
      name: "Permanently Delete"
    });
    await expect(confirm).toBeDisabled();
    const field = within(d).getByRole("textbox");
    // neutral border (no data-invalid) until a non-matching value is typed
    await expect(field.closest("[data-invalid]")).toBeNull();
  }
}`,...y.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: "Retype mismatch ⇒ §9.8 danger field + helper, confirm stays disabled",
  render: () => <Harness />,
  play: async () => {
    const d = await openDialog();
    const field = within(d).getByRole("textbox");
    await userEvent.type(field, "wrong name");
    await expect(field).toHaveAttribute("aria-invalid", "true");
    const help = within(d).getByText(/name doesn.t match/i);
    await expect(field).toHaveAttribute("aria-describedby", help.id);
    await expect(within(d).getByRole("button", {
      name: "Permanently Delete"
    })).toBeDisabled();
  }
}`,...b.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "Confirmed (typed string matches → confirm enabled)",
  render: () => <Harness />,
  play: async () => {
    const d = await openDialog();
    const field = within(d).getByRole("textbox");
    await userEvent.type(field, NAME);
    await expect(field).not.toHaveAttribute("aria-invalid");
    await expect(within(d).getByRole("button", {
      name: "Permanently Delete"
    })).toBeEnabled();
  }
}`,...x.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "Submitting (destructive-loading, everything locks)",
  render: () => <Harness submitting />,
  play: async () => {
    const d = await openDialog();
    const confirm = within(d).getByRole("button", {
      name: /Permanently Delete/
    });
    await expect(confirm).toHaveAttribute("aria-busy", "true");
    await expect(within(d).getByRole("button", {
      name: "Cancel"
    })).toBeDisabled();
  }
}`,...g.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: "Open ⇒ scrim+blur, focus on the field, Esc restores focus",
  render: () => <Harness />,
  play: async () => {
    const opener = within(document.body).getByRole("button", {
      name: "Delete record"
    });
    await userEvent.click(opener);
    const d = await waitFor(() => within(document.body).getByRole("alertdialog"));
    const scrim = document.body.querySelector(".kit-scrim")!;
    const cs = getComputedStyle(scrim);
    await expect(cs.backdropFilter || cs.getPropertyValue("-webkit-backdrop-filter")).toContain("blur");
    await waitFor(() => expect(d.contains(document.activeElement)).toBe(true));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(document.body).queryByRole("alertdialog")).toBeNull());
    await waitFor(() => expect(opener).toHaveFocus());
  }
}`,...f.parameters?.docs?.source}}};const se=["Pending","RetypeMismatch","Confirmed","Submitting","OverlayContract"];export{x as Confirmed,f as OverlayContract,y as Pending,b as RetypeMismatch,g as Submitting,se as __namedExportsOrder,ie as default};
