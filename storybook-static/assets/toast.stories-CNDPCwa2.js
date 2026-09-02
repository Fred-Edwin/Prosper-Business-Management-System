import{j as t,c as D}from"./utils-_OH9Wn3f.js";import{r as n}from"./iframe-sMR_UR-7.js";import{r as P}from"./index-D9EGGsYK.js";import"./preload-helper-PPVm8Dsz.js";const j=n.createContext(null);function I(){const e=n.useContext(j);if(!e)throw new Error("useToast must be used within a <ToastProvider>");return e}const O={info:t.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[t.jsx("circle",{cx:"12",cy:"12",r:"10",fill:"none",stroke:"var(--color-info)",strokeWidth:"1.5"}),t.jsx("line",{x1:"12",y1:"11",x2:"12",y2:"16",stroke:"var(--color-info)",strokeWidth:"1.5",strokeLinecap:"round"}),t.jsx("line",{x1:"12",y1:"8",x2:"12.01",y2:"8",stroke:"var(--color-info)",strokeWidth:"1.5",strokeLinecap:"round"})]}),success:t.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:t.jsx("path",{d:"M20 6 9 17l-5-5",fill:"none",stroke:"var(--color-success)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})}),danger:t.jsxs("svg",{width:"16",height:"16",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[t.jsx("circle",{cx:"12",cy:"12",r:"10",fill:"none",stroke:"var(--color-danger)",strokeWidth:"1.5"}),t.jsx("line",{x1:"15",y1:"9",x2:"9",y2:"15",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round"}),t.jsx("line",{x1:"9",y1:"9",x2:"15",y2:"15",stroke:"var(--color-danger)",strokeWidth:"1.5",strokeLinecap:"round"})]})},W={info:"[border-left-color:var(--color-info)]",success:"[border-left-color:var(--color-success)]",danger:"[border-left-color:var(--color-danger)]"};function S({children:e,placement:s="top-right"}){const[i,u]=n.useState([]),b=n.useRef(1),l=n.useRef(!1),d=n.useRef(new Map),m=n.useCallback(o=>{u(p=>p.filter(k=>k.id!==o));const c=d.current.get(o);c&&(clearTimeout(c),d.current.delete(o))},[]),h=n.useCallback(o=>{if(o.duration<=0||l.current)return;const c=setTimeout(()=>m(o.id),o.duration);d.current.set(o.id,c)},[m]),T=n.useCallback((o,c)=>{const p={id:b.current++,message:o,tone:c?.tone??"info",duration:c?.duration??4e3};return u(k=>[...k,p].slice(-4)),h(p),p.id},[h]),B=n.useCallback(()=>{l.current=!0;for(const o of d.current.values())clearTimeout(o);d.current.clear()},[]),C=n.useCallback(()=>{l.current=!1;for(const o of i)h(o)},[i,h]);n.useEffect(()=>{const o=d.current;return()=>{for(const c of o.values())clearTimeout(c);o.clear()}},[]);const R=n.useMemo(()=>({toast:T,dismiss:m}),[T,m]),[E,A]=n.useState(!1);n.useEffect(()=>A(!0),[]);const N=s==="bottom-center"?"bottom-(--sp-7) left-1/2 -translate-x-1/2 items-center":"top-(--sp-7) right-(--sp-7) items-end";return t.jsxs(j.Provider,{value:R,children:[e,E&&P.createPortal(t.jsx("div",{"data-overlay-ignore-inert":!0,role:"status","aria-live":"polite","aria-atomic":"false",onMouseEnter:B,onMouseLeave:C,onFocusCapture:B,onBlurCapture:C,className:D("fixed flex flex-col gap-(--sp-4) [z-index:var(--z-toast)] pointer-events-none",N),children:i.map(o=>t.jsx(_,{record:o,placement:s,onDismiss:()=>m(o.id)},o.id))}),document.body)]})}function _({record:e,placement:s,onDismiss:i}){const[u,b]=n.useState(!1);n.useEffect(()=>{const d=requestAnimationFrame(()=>b(!0));return()=>cancelAnimationFrame(d)},[]);const l=s==="bottom-center"?u?"translate-y-0":"translate-y-[8px]":u?"translate-x-0":"translate-x-[8px]";return t.jsxs("div",{className:D("[font-synthesis:none] pointer-events-auto flex items-start gap-(--sp-4) w-[320px] max-w-[calc(100vw-var(--sp-8))] p-(--sp-5) rounded-md","bg-(--surface-raised) border border-solid [border-color:var(--border-subtle)] border-l-2","[box-shadow:var(--shadow-md)]","transition-[opacity,transform] duration-(--dur-base) ease-(--ease-standard)",u?"opacity-100":"opacity-0",l,W[e.tone]),children:[O[e.tone],t.jsx("div",{className:"font-ui [color:var(--text-primary)] text-sm/sm grow",children:e.message}),t.jsx("button",{type:"button",onClick:i,"aria-label":"Dismiss",className:"shrink-0 kit-focus-ring [color:var(--text-tertiary)]",children:t.jsxs("svg",{width:"14",height:"14",viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:[t.jsx("line",{x1:"18",y1:"6",x2:"6",y2:"18",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"}),t.jsx("line",{x1:"6",y1:"6",x2:"18",y2:"18",stroke:"currentColor",strokeWidth:"1.5",strokeLinecap:"round"})]})})]})}S.__docgenInfo={description:"",methods:[],displayName:"ToastProvider",props:{children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""},placement:{required:!1,tsType:{name:"union",raw:'"top-right" | "bottom-center"',elements:[{name:"literal",value:'"top-right"'},{name:"literal",value:'"bottom-center"'}]},description:"",defaultValue:{value:'"top-right"',computed:!1}}}};const{expect:r,userEvent:M,waitFor:H,within:a}=__STORYBOOK_MODULE_TEST__,K={title:"Kit/Primitives/Toast — NEEDS OWNER REVIEW",parameters:{layout:"fullscreen",visual:{disable:!0},docs:{description:{component:`NEW primitive (Session 10 Deliverable 3d) — \`kit-audit.md §3\`, ADR-43 (DRAFT).

╔══════════════════════════════════════════════════════════════════════╗
║ OWNER SIGN-OFF NEEDED (kit-audit "Remaining gaps" #2)                 ║
║  · placement: top-right (admin/desktop) vs bottom-center (staff)     ║
║  · stack cap = 4 visible, older ones drop                            ║
║  · auto-dismiss 4000ms, PAUSED on hover / focus (WCAG 2.2.1)         ║
║  · tone: info (neutral) / success / danger — hairline left border    ║
║  · slide + fade, no bounce, NO reduced-motion special-casing (D4)   ║
║ Approve as-is, or adjust any of the above.                           ║
╚══════════════════════════════════════════════════════════════════════╝`}}}};function g({placement:e,fire:s}){return t.jsxs(S,{placement:e,children:[t.jsx(L,{fire:s}),t.jsxs("div",{style:{padding:24,fontFamily:"var(--font-ui)"},children:["Toast demo — placement: ",t.jsx("strong",{children:e})]})]})}function L({fire:e}){const{toast:s}=I();return n.useEffect(()=>{for(const i of e)s(i.message,{tone:i.tone,duration:i.duration})},[]),null}const f={name:"Placement: top-right (admin) — info / success / danger",render:()=>t.jsx(g,{placement:"top-right",fire:[{message:"Draft saved.",tone:"info",duration:0},{message:"Correction saved.",tone:"success",duration:0},{message:"Could not reach the server.",tone:"danger",duration:0}]}),play:async()=>{const e=a(document.body),s=e.getByRole("status");await r(s).toHaveClass(/top-/),await r(s).toHaveClass(/right-/),await r(e.getByText("Correction saved.")).toBeInTheDocument(),await r(e.getByText("Could not reach the server.")).toBeInTheDocument()}},y={name:"Placement: bottom-center (staff)",render:()=>t.jsx(g,{placement:"bottom-center",fire:[{message:"Stock issued.",tone:"success",duration:0}]}),play:async()=>{const e=a(document.body).getByRole("status");await r(e).toHaveClass(/bottom-/),await r(e).toHaveClass(/items-center/)}},x={name:"Stack cap = 4 visible (6 fired → 4 shown)",render:()=>t.jsx(g,{placement:"top-right",fire:[1,2,3,4,5,6].map(e=>({message:`Message ${e}`,tone:"info",duration:0}))}),play:async()=>{const e=a(document.body).getByRole("status"),s=a(e).getAllByRole("button",{name:"Dismiss"});await r(s).toHaveLength(4),await r(a(e).queryByText("Message 1")).toBeNull(),await r(a(e).getByText("Message 6")).toBeInTheDocument()}},v={name:"Auto-dismiss after `duration`",render:()=>t.jsx(g,{placement:"top-right",fire:[{message:"Auto-goes away",tone:"info",duration:400}]}),play:async()=>{const e=a(document.body).getByRole("status");await r(a(e).getByText("Auto-goes away")).toBeInTheDocument(),await H(()=>r(a(e).queryByText("Auto-goes away")).toBeNull(),{timeout:3e3})}},w={name:"Paused while hovered (WCAG 2.2.1) — user can extend",render:()=>t.jsx(g,{placement:"top-right",fire:[{message:"Sticky while hovered",tone:"info",duration:400}]}),play:async()=>{const e=a(document.body).getByRole("status"),s=a(e).getByText("Sticky while hovered").closest("div");await M.hover(s),await new Promise(i=>setTimeout(i,1200)),await r(a(e).getByText("Sticky while hovered")).toBeInTheDocument()}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: "Placement: top-right (admin) — info / success / danger",
  render: () => <Demo placement="top-right" fire={[{
    message: "Draft saved.",
    tone: "info",
    duration: 0
  }, {
    message: "Correction saved.",
    tone: "success",
    duration: 0
  }, {
    message: "Could not reach the server.",
    tone: "danger",
    duration: 0
  }]} />,
  play: async () => {
    const body = within(document.body);
    const region = body.getByRole("status");
    await expect(region).toHaveClass(/top-/);
    await expect(region).toHaveClass(/right-/);
    await expect(body.getByText("Correction saved.")).toBeInTheDocument();
    await expect(body.getByText("Could not reach the server.")).toBeInTheDocument();
  }
}`,...f.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Placement: bottom-center (staff)",
  render: () => <Demo placement="bottom-center" fire={[{
    message: "Stock issued.",
    tone: "success",
    duration: 0
  }]} />,
  play: async () => {
    const region = within(document.body).getByRole("status");
    await expect(region).toHaveClass(/bottom-/);
    await expect(region).toHaveClass(/items-center/);
  }
}`,...y.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "Stack cap = 4 visible (6 fired → 4 shown)",
  render: () => <Demo placement="top-right" fire={[1, 2, 3, 4, 5, 6].map(n => ({
    message: \`Message \${n}\`,
    tone: "info" as const,
    duration: 0
  }))} />,
  play: async () => {
    const region = within(document.body).getByRole("status");
    // 4 toast items (each is a div with role button "Dismiss" inside)
    const dismissers = within(region).getAllByRole("button", {
      name: "Dismiss"
    });
    await expect(dismissers).toHaveLength(4);
    // newest kept, oldest dropped
    await expect(within(region).queryByText("Message 1")).toBeNull();
    await expect(within(region).getByText("Message 6")).toBeInTheDocument();
  }
}`,...x.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "Auto-dismiss after \`duration\`",
  render: () => <Demo placement="top-right" fire={[{
    message: "Auto-goes away",
    tone: "info",
    duration: 400
  }]} />,
  play: async () => {
    const region = within(document.body).getByRole("status");
    await expect(within(region).getByText("Auto-goes away")).toBeInTheDocument();
    await waitFor(() => expect(within(region).queryByText("Auto-goes away")).toBeNull(), {
      timeout: 3000
    });
  }
}`,...v.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "Paused while hovered (WCAG 2.2.1) — user can extend",
  render: () => <Demo placement="top-right" fire={[{
    message: "Sticky while hovered",
    tone: "info",
    duration: 400
  }]} />,
  play: async () => {
    const region = within(document.body).getByRole("status");
    // the stack container is pointer-events:none; hover an actual toast item
    // (pointer-events:auto) — onMouseEnter bubbles to the region and pauses.
    const item = within(region).getByText("Sticky while hovered").closest("div")!;
    await userEvent.hover(item);
    await new Promise(r => setTimeout(r, 1200));
    await expect(within(region).getByText("Sticky while hovered")).toBeInTheDocument();
  }
}`,...w.parameters?.docs?.source}}};const U=["TopRight_Admin","BottomCenter_Staff","StackCap","AutoDismiss","PauseOnHover"];export{v as AutoDismiss,y as BottomCenter_Staff,w as PauseOnHover,x as StackCap,f as TopRight_Admin,U as __namedExportsOrder,K as default};
