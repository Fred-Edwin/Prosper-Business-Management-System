import{j as a,c as g}from"./utils-_OH9Wn3f.js";import{r as m}from"./iframe-sMR_UR-7.js";import{E as V}from"./empty-state-DAojvcOU.js";import{S as z}from"./search-input-ClzrMgo3.js";import{B as M}from"./button-CREOhNf_.js";import{B as Y}from"./bottom-sheet-B9zES2lS.js";import{D as G}from"./date-picker-UxpDpjPQ.js";import{S as X}from"./select-BxT165p-.js";import{T as J}from"./toggle-switch-Bx766aMs.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";import"./index-D9EGGsYK.js";import"./overlay-a6Z6rMfP.js";import"./form-field-DkYjBilr.js";const Q={"--bp-md":"768px"},U=`(max-width: ${Number.parseInt(Q["--bp-md"],10)-1}px)`;function Z(){const[e,t]=m.useState(!1);return m.useEffect(()=>{if(!window.matchMedia)return;const n=window.matchMedia(U),s=()=>t(n.matches);return s(),n.addEventListener("change",s),()=>n.removeEventListener("change",s)},[]),e}function v(e){return e.value===e.default}function ee(e,t){return t===1&&e.endsWith("es")?e.slice(0,-2):t===1&&e.endsWith("s")?e.slice(0,-1):e}function H(e){if(e.kind==="select"){const t=e.options.find(n=>n.value===e.value);return`${e.label}: ${t?t.label:e.value}`}return e.kind==="date"?e.value??"All dates":e.label}function te({size:e=14}){return a.jsx("svg",{width:e,height:e,viewBox:"0 0 24 24","aria-hidden":!0,style:{flexShrink:0},children:a.jsx("polyline",{points:"6 9 12 15 18 9",fill:"none",stroke:"var(--text-tertiary)",strokeWidth:e<=12?2:1.5,strokeLinecap:"round",strokeLinejoin:"round"})})}function ae(e){return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function L({control:e,onChange:t}){if(e.kind==="select"){const s=e.options.map(o=>({value:o.value,label:`${e.label}: ${o.label}`}));return a.jsx(X,{"aria-label":e.label,options:s,value:e.value,onChange:o=>t(o),className:"w-max shrink-0"})}if(e.kind==="date")return a.jsx(G,{"aria-label":`${e.label}: ${H(e)}`,value:H(e),onSelect:s=>t(ae(s)),className:"w-max shrink-0"});const n=`ft-toggle-${e.id}`;return a.jsxs("div",{className:"flex items-center h-(--control-md) gap-(--sp-4) shrink-0",children:[a.jsx("span",{id:n,className:"font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm whitespace-nowrap",children:e.label}),a.jsx(J,{checked:e.value,onChange:s=>t(s),"aria-labelledby":n})]})}function ne({control:e,onOpen:t}){const n=v(e),s=e.kind==="toggle"||n?e.label:e.kind==="select"?e.options.find(l=>l.value===e.value)?.label??e.value:e.value??e.label,o=n&&e.kind!=="date"?"[color:var(--text-secondary)] font-(--weight-regular)":"[color:var(--text-primary)] font-(--weight-medium)";return a.jsxs("button",{type:"button",onClick:t,"aria-label":`${e.label}: ${H(e)}`,className:g("flex items-center h-[32px] shrink-0 px-(--sp-4) rounded-sm gap-(--sp-2) whitespace-nowrap","bg-(--surface-page) border border-solid [border-color:var(--border-strong)]","kit-field kit-focus-ring"),children:[a.jsx("span",{className:g("font-ui text-sm/sm w-max shrink-0",o),children:s}),e.kind!=="toggle"&&a.jsx(te,{size:12})]})}function w({controls:e,onChange:t,onReset:n,resultCount:s,resultNoun:o,"aria-label":l="Filters",search:i,layout:u="auto",className:d}){const j=Z(),b=u==="auto"?j:u==="mobile",I=e.some(c=>!v(c)),O=m.useCallback(()=>{if(n){n();return}for(const c of e)v(c)||t(c.id,c.default)},[n,e,t]),F=`${s} ${ee(o,s)}`,[$,E]=m.useState("closed");if(b){const c=[...e].sort((p,q)=>Number(v(p))-Number(v(q))),R=3,_=c.slice(0,R),K=c.slice(R);return a.jsxs("section",{role:"search","aria-label":l,className:g("flex flex-col w-full",d),children:[a.jsxs("div",{"data-ft-scroll":!0,className:g("flex items-center w-full overflow-x-auto","py-(--sp-4) px-(--sp-5) gap-(--sp-3)"),children:[i&&a.jsx("div",{className:"shrink-0",children:i}),_.map(p=>a.jsx(ne,{control:p,onOpen:()=>E("open")},p.id)),K.length>0&&a.jsx("button",{type:"button",onClick:()=>E("open"),className:g("flex items-center h-[32px] shrink-0 px-(--sp-4) rounded-sm whitespace-nowrap","bg-(--surface-page) border border-solid [border-color:var(--border-strong)]","font-ui text-sm/sm [color:var(--text-secondary)] font-(--weight-regular)","kit-field kit-focus-ring"),children:"More"})]}),a.jsxs("div",{className:"flex items-center justify-between pb-(--sp-3) px-(--sp-5)","aria-live":"polite",children:[a.jsx("span",{className:"font-ui [color:var(--text-tertiary)] text-caption/micro",children:F}),I&&a.jsx(M,{variant:"tertiary",size:"sm","data-ft-reset":!0,onClick:O,className:"h-auto px-0 [--kit-hover-bg:transparent]",children:"Reset"})]}),a.jsx(Y,{state:$,onStateChange:E,title:"Filters",children:a.jsxs("div",{className:"flex flex-col gap-(--sp-6) pb-(--sp-6)",children:[e.map(p=>a.jsx("div",{className:"flex flex-col gap-(--sp-3)",children:a.jsx(L,{control:p,onChange:q=>t(p.id,q)})},p.id)),I&&a.jsx(M,{variant:"tertiary",size:"sm",onClick:O,className:"self-start",children:"Reset"})]})})]})}return a.jsxs("section",{role:"search","aria-label":l,className:g("flex items-center w-full py-(--sp-6) gap-(--sp-4)",d),children:[i&&a.jsx("div",{className:"shrink-0",children:i}),e.map(c=>a.jsx(L,{control:c,onChange:R=>t(c.id,R)},c.id)),a.jsx("div",{className:"grow"}),a.jsxs("div",{className:"flex items-center gap-(--sp-4) shrink-0","aria-live":"polite",children:[a.jsx("span",{className:"font-ui [color:var(--text-tertiary)] text-sm/sm whitespace-nowrap",children:F}),I&&a.jsxs(a.Fragment,{children:[a.jsx("span",{className:"font-ui [color:var(--text-tertiary)] text-sm/micro","aria-hidden":!0,children:"·"}),a.jsx(M,{variant:"tertiary",size:"sm","data-ft-reset":!0,onClick:O,className:"h-auto px-0 [--kit-hover-bg:transparent]",children:"Reset"})]})]})]})}w.__docgenInfo={description:"",methods:[],displayName:"FilterToolbar",props:{controls:{required:!0,tsType:{name:"Array",elements:[{name:"union",raw:`| {
    id: string;
    label: string;
    kind: "select";
    options: { value: string; label: string }[];
    value: string;
    default: string;
  }
| {
    id: string;
    label: string;
    kind: "date";
    /** ISO-ish display string, e.g. "Today" / "Aug 24"; null = "all dates". */
    value: string | null;
    default: string | null;
  }
| { id: string; label: string; kind: "toggle"; value: boolean; default: boolean }`,elements:[{name:"signature",type:"object",raw:`{
  id: string;
  label: string;
  kind: "select";
  options: { value: string; label: string }[];
  value: string;
  default: string;
}`,signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"kind",value:{name:"literal",value:'"select"',required:!0}},{key:"options",value:{name:"Array",elements:[{name:"signature",type:"object",raw:"{ value: string; label: string }",signature:{properties:[{key:"value",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}}]}}],raw:"{ value: string; label: string }[]",required:!0}},{key:"value",value:{name:"string",required:!0}},{key:"default",value:{name:"string",required:!0}}]}},{name:"signature",type:"object",raw:`{
  id: string;
  label: string;
  kind: "date";
  /** ISO-ish display string, e.g. "Today" / "Aug 24"; null = "all dates". */
  value: string | null;
  default: string | null;
}`,signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"kind",value:{name:"literal",value:'"date"',required:!0}},{key:"value",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!0},description:'ISO-ish display string, e.g. "Today" / "Aug 24"; null = "all dates".'},{key:"default",value:{name:"union",raw:"string | null",elements:[{name:"string"},{name:"null"}],required:!0}}]}},{name:"signature",type:"object",raw:'{ id: string; label: string; kind: "toggle"; value: boolean; default: boolean }',signature:{properties:[{key:"id",value:{name:"string",required:!0}},{key:"label",value:{name:"string",required:!0}},{key:"kind",value:{name:"literal",value:'"toggle"',required:!0}},{key:"value",value:{name:"boolean",required:!0}},{key:"default",value:{name:"boolean",required:!0}}]}}]}],raw:"FilterControl[]"},description:""},onChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(id: string, value: string | boolean | null) => void",signature:{arguments:[{type:{name:"string"},name:"id"},{type:{name:"union",raw:"string | boolean | null",elements:[{name:"string"},{name:"boolean"},{name:"null"}]},name:"value"}],return:{name:"void"}}},description:"Called when a control changes. The screen updates its filter + re-queries."},onReset:{required:!1,tsType:{name:"signature",type:"function",raw:"() => void",signature:{arguments:[],return:{name:"void"}}},description:"Optional. When given, the toolbar's Reset calls this once. When omitted,\nReset loops `onChange(id, default)` over every non-default control."},resultCount:{required:!0,tsType:{name:"number"},description:""},resultNoun:{required:!0,tsType:{name:"string"},description:'"orders" | "customers" | "movements" | "rows" | "assets" | …'},"aria-label":{required:!1,tsType:{name:"string"},description:`Accessible name for the toolbar's role="search" region. Default "Filters".`,defaultValue:{value:'"Filters"',computed:!1}},search:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:`A screen's search field, when it has one (Assets, Customers). Rendered as
a SIBLING at the START of the toolbar row — it keeps its own state and
handler; it just shares the row and the Reset logic (the screen clears
its own search string when it handles reset). Not a FilterControl.`},layout:{required:!1,tsType:{name:"union",raw:'"auto" | "desktop" | "mobile"',elements:[{name:"literal",value:'"auto"'},{name:"literal",value:'"desktop"'},{name:"literal",value:'"mobile"'}]},description:`Layout override. "auto" (default) picks desktop / mobile from
\`matchMedia("< --bp-md")\`. "desktop" / "mobile" force one — used by the
Storybook stories so the visual-regression snapshot is deterministic
(the runner's viewport global does not resize the page).`,defaultValue:{value:'"auto"',computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:r,fn:P,userEvent:W,within:y}=__STORYBOOK_MODULE_TEST__,Re={title:"Kit/FilterToolbar",component:w,parameters:{layout:"padded",a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},docs:{description:{component:`FilterToolbar — NEW kit component (M2-3KIT-FILTER, ADR-42).
Spec: \`docs/design/filter-toolbar.md\`. Visual target: Paper artboard L9O-0
("Component Kit — Filter Toolbar [M2-3DF]"), 6 states. Model artboards:
IEA-0 (desktop, inside the shipped merged-Sales screen) / IKW-0 (mobile).

Composed from proven primitives (Select / DatePicker / ToggleSwitch /
Button) — no new primitive. Controlled: owns no filter state.

Stories (8): the 6 L9O-0 state rows + 2 dedicated §9.2 focus-ring proofs
(first Select trigger, Reset link).

DEVIATIONS from L9O-0, carried up to the orchestrator (also in the
component header):
 - select control label tone: the kit \`Select\` trigger always paints its
   value \`--text-primary\`; L9O-0 draws an at-default select label
   \`--text-secondary\`. Honouring that tone means forking \`Select\`
   (forbidden) or reimplementing an APG listbox here (a new primitive in
   spirit). Date + toggle controls, rendered by the toolbar itself, DO
   honour the tone rule.
 - date chip: \`DatePicker\` has a trailing calendar glyph + mono value;
   L9O-0 shows a leading glyph + ui-font value. Same trade-off.`}}}},re=[{value:"all",label:"All cashiers"},{value:"mary",label:"Mary Njeri"},{value:"john",label:"John Doe"}],se=[{value:"all",label:"All"},{value:"cash",label:"Cash"},{value:"mpesa",label:"M-Pesa"},{value:"credit",label:"Credit"}];function h(e={}){return[{id:"cashier",label:"Cashier",kind:"select",options:re,value:e.cashier??"all",default:"all"},{id:"payment",label:"Payment",kind:"select",options:se,value:e.payment??"all",default:"all"},{id:"date",label:"Date",kind:"date",value:e.date===void 0?"Today":e.date,default:"Today"},{id:"corrected",label:"Corrected only",kind:"toggle",value:e.corrected??!1,default:!1}]}function f({initial:e,onSpy:t,...n}){const[s,o]=m.useState(e),l=n.resultCount??s.filter(u=>u.value!==u.default).length+5,i=m.useCallback((u,d)=>{t?.(u,d),o(j=>j.map(b=>b.id===u?{...b,value:d}:b))},[t]);return a.jsx(w,{resultNoun:"orders",...n,controls:s,resultCount:l,onChange:i})}const T={name:"default — all controls at default (no Reset) — ARTBOARD L9O-0",render:()=>a.jsx(f,{initial:h(),resultCount:6}),parameters:{interaction:{assertColor:[{selector:'[role="combobox"] span',prop:"color",token:"--text-primary"},{selector:".kit-field",prop:"borderColor",token:"--border-strong"}]}},play:async({canvasElement:e})=>{const t=y(e);await r(t.queryByRole("button",{name:"Reset"})).not.toBeInTheDocument(),await r(t.getByText("6 orders")).toBeInTheDocument(),await r(t.getByRole("search",{name:"Filters"})).toBeInTheDocument()}},B={name:"one filter active — Payment set, Reset shown — ARTBOARD L9O-0",render:()=>a.jsx(f,{initial:h({payment:"mpesa"}),resultCount:2}),parameters:{interaction:{assertColor:[{selector:"[data-ft-reset] span",prop:"color",token:"--color-accent"}]}},play:async({canvasElement:e})=>{const t=y(e),n=t.getByRole("button",{name:"Reset"});await r(n).toBeInTheDocument(),await r(t.getByText("·")).toBeInTheDocument(),await r(t.getByText("2 orders")).toBeInTheDocument(),await r(t.getByRole("combobox",{name:"Payment"})).toHaveTextContent("Payment: M-Pesa")}},x=P(),k={name:"multiple active — Reset resets all — ARTBOARD L9O-0",render:()=>(x.mockClear(),a.jsx(f,{initial:h({cashier:"mary",payment:"cash",date:"Aug 23"}),resultCount:3,onSpy:x})),play:async({canvasElement:e})=>{const t=y(e),n=t.getByRole("button",{name:"Reset"});await r(n).toBeInTheDocument(),await r(t.getByRole("combobox",{name:"Cashier"})).toHaveTextContent("Cashier: Mary Njeri"),await W.click(n),await r(x).toHaveBeenCalledWith("cashier","all"),await r(x).toHaveBeenCalledWith("payment","all"),await r(x).toHaveBeenCalledWith("date","Today"),await r(t.queryByRole("button",{name:"Reset"})).not.toBeInTheDocument(),await r(t.getByRole("combobox",{name:"Cashier"})).toHaveTextContent("Cashier: All cashiers"),await r(t.getByRole("combobox",{name:"Payment"})).toHaveTextContent("Payment: All")}};function oe(){const e=P(),[t,n]=m.useState([{id:"hasBalance",label:"Has balance",kind:"toggle",value:!0,default:!1}]),[s,o]=m.useState("");return a.jsx(w,{resultNoun:"customers",resultCount:4,"aria-label":"Filters",controls:t,search:a.jsx(z,{value:s,onChange:o,placeholder:"Search name or phone","aria-label":"Search customers"}),onChange:(l,i)=>{e(l,i),n(u=>u.map(d=>d.id===l?{...d,value:i}:d))},onReset:()=>{n(l=>l.map(i=>({...i,value:i.default}))),o("")}})}const C={name:"toggle control — Search sibling + ToggleSwitch (A1) — ARTBOARD L9O-0",render:()=>a.jsx(oe,{}),play:async({canvasElement:e})=>{const t=y(e),n=t.getByRole("switch",{name:"Has balance"});await r(n).toHaveAttribute("aria-checked","true"),await r(t.getByRole("button",{name:"Reset"})).toBeInTheDocument(),await r(t.getByText("4 customers")).toBeInTheDocument();const s=t.getByRole("searchbox",{name:"Search customers"});await r(s).toBeInTheDocument(),await W.click(n),await r(n).toHaveAttribute("aria-checked","false"),await r(t.queryByRole("button",{name:"Reset"})).not.toBeInTheDocument()}},S={name:"mobile — chip row (overflow-x) + More + count/Reset row — ARTBOARD L9O-0 / IKW-0",render:()=>a.jsx(f,{initial:h({cashier:"mary",date:"Today"}),resultCount:2,layout:"mobile"}),play:async({canvasElement:e})=>{const t=y(e),n=e.querySelector("[data-ft-scroll]");await r(n).not.toBeNull(),await r(getComputedStyle(n).overflowX).toBe("auto"),await r(t.getByRole("button",{name:"More"})).toBeInTheDocument(),await r(t.getByText("2 orders")).toBeInTheDocument(),await r(t.getByRole("button",{name:"Reset"})).toBeInTheDocument()}},D={name:"filtered-empty — toolbar above EmptyState, --sp-8 gap — ARTBOARD L9O-0",render:()=>{const[e,t]=m.useState(h({cashier:"john",date:"Aug 20"}));return a.jsxs("div",{className:"flex flex-col",children:[a.jsx(w,{controls:e,resultCount:0,resultNoun:"orders",onChange:(n,s)=>t(o=>o.map(l=>l.id===n?{...l,value:s}:l))}),a.jsx("div",{"data-ft-empty-gap":!0,className:"mt-(--sp-8)",children:a.jsx(V,{variant:"filtered",title:"No orders match",description:"No orders for this cashier on the selected day. Try different filters or Reset.",actionLabel:"Reset filters"})})]})},play:async({canvasElement:e})=>{const t=y(e);await r(t.getByText("0 orders")).toBeInTheDocument(),await r(t.getByText("No orders match")).toBeInTheDocument();const n=e.querySelector("[data-ft-empty-gap]");await r(n).not.toBeNull(),await r(getComputedStyle(n).marginTop).toBe("24px")}},A={name:"§9.2 — first Select trigger paints a focus-visible ring",render:()=>a.jsx(f,{initial:h(),resultCount:6}),parameters:{interaction:{focus:'[role="combobox"]',assertFocusRing:'[role="combobox"]'}}},N={name:"§9.2 — Reset link paints a focus-visible ring",render:()=>a.jsx(f,{initial:h({payment:"cash"}),resultCount:3}),parameters:{interaction:{focus:"[data-ft-reset]",assertFocusRing:"[data-ft-reset]"}}};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  name: "default — all controls at default (no Reset) — ARTBOARD L9O-0",
  render: () => <Harness initial={ordersControls()} resultCount={6} />,
  parameters: {
    interaction: {
      assertColor: [
      // an at-default select label is recessive (see DEVIATION note — the
      // kit Select trigger renders it --text-primary; asserted as-built).
      {
        selector: '[role="combobox"] span',
        prop: "color",
        token: "--text-primary"
      },
      // the control box border is --border-strong
      {
        selector: ".kit-field",
        prop: "borderColor",
        token: "--border-strong"
      }
      // result-count text is --text-tertiary
      ]
    }
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // no Reset anywhere in the DOM
    await expect(c.queryByRole("button", {
      name: "Reset"
    })).not.toBeInTheDocument();
    // the count is present
    await expect(c.getByText("6 orders")).toBeInTheDocument();
    // role="search" region named "Filters"
    await expect(c.getByRole("search", {
      name: "Filters"
    })).toBeInTheDocument();
  }
}`,...T.parameters?.docs?.source}}};B.parameters={...B.parameters,docs:{...B.parameters?.docs,source:{originalSource:`{
  name: "one filter active — Payment set, Reset shown — ARTBOARD L9O-0",
  render: () => <Harness initial={ordersControls({
    payment: "mpesa"
  })} resultCount={2} />,
  parameters: {
    interaction: {
      assertColor: [
      // Reset link colour = --color-accent
      {
        selector: '[data-ft-reset] span',
        prop: "color",
        token: "--color-accent"
      }]
    }
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const reset = c.getByRole("button", {
      name: "Reset"
    });
    await expect(reset).toBeInTheDocument();
    // the · separator is only present alongside Reset
    await expect(c.getByText("·")).toBeInTheDocument();
    await expect(c.getByText("2 orders")).toBeInTheDocument();
    // the off-default Payment select shows its concrete value
    await expect(c.getByRole("combobox", {
      name: "Payment"
    })).toHaveTextContent("Payment: M-Pesa");
  }
}`,...B.parameters?.docs?.source}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  name: "multiple active — Reset resets all — ARTBOARD L9O-0",
  render: () => {
    multiSpy.mockClear();
    return <Harness initial={ordersControls({
      cashier: "mary",
      payment: "cash",
      date: "Aug 23"
    })} resultCount={3} onSpy={multiSpy} />;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // three off-default controls → Reset present
    const reset = c.getByRole("button", {
      name: "Reset"
    });
    await expect(reset).toBeInTheDocument();
    await expect(c.getByRole("combobox", {
      name: "Cashier"
    })).toHaveTextContent("Cashier: Mary Njeri");
    await userEvent.click(reset);

    // no \`onReset\` prop ⇒ Reset loops \`onChange(id, default)\` over each
    // non-default control (cashier, payment, date).
    await expect(multiSpy).toHaveBeenCalledWith("cashier", "all");
    await expect(multiSpy).toHaveBeenCalledWith("payment", "all");
    await expect(multiSpy).toHaveBeenCalledWith("date", "Today");

    // harness round-trip: every control is back at its default, so Reset
    // disappears and the labels return to "All cashiers" / "All".
    await expect(c.queryByRole("button", {
      name: "Reset"
    })).not.toBeInTheDocument();
    await expect(c.getByRole("combobox", {
      name: "Cashier"
    })).toHaveTextContent("Cashier: All cashiers");
    await expect(c.getByRole("combobox", {
      name: "Payment"
    })).toHaveTextContent("Payment: All");
  }
}`,...k.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: "toggle control — Search sibling + ToggleSwitch (A1) — ARTBOARD L9O-0",
  render: () => <CustomersHarness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // the switch reflects value=true
    const sw = c.getByRole("switch", {
      name: "Has balance"
    });
    await expect(sw).toHaveAttribute("aria-checked", "true");
    // toggle ON ⇒ Reset shown
    await expect(c.getByRole("button", {
      name: "Reset"
    })).toBeInTheDocument();
    await expect(c.getByText("4 customers")).toBeInTheDocument();
    // the search sibling is in the same row, keeps its own state
    const searchbox = c.getByRole("searchbox", {
      name: "Search customers"
    });
    await expect(searchbox).toBeInTheDocument();

    // flipping the switch calls onChange(id, boolean) — it goes to false, and
    // (via onReset path not hit here) the toggle is now at default ⇒ Reset gone
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(c.queryByRole("button", {
      name: "Reset"
    })).not.toBeInTheDocument();
  }
}`,...C.parameters?.docs?.source}}};S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  name: "mobile — chip row (overflow-x) + More + count/Reset row — ARTBOARD L9O-0 / IKW-0",
  render: () => <Harness initial={ordersControls({
    cashier: "mary",
    date: "Today"
  })} resultCount={2} layout="mobile" />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // the chip row scrolls horizontally
    const scroller = canvasElement.querySelector<HTMLElement>("[data-ft-scroll]");
    await expect(scroller).not.toBeNull();
    await expect(getComputedStyle(scroller as HTMLElement).overflowX).toBe("auto");
    // the More chip is present (4 controls, INLINE cap = 3)
    await expect(c.getByRole("button", {
      name: "More"
    })).toBeInTheDocument();
    // count + Reset sit in a row below the chips
    await expect(c.getByText("2 orders")).toBeInTheDocument();
    await expect(c.getByRole("button", {
      name: "Reset"
    })).toBeInTheDocument();
  }
}`,...S.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  name: "filtered-empty — toolbar above EmptyState, --sp-8 gap — ARTBOARD L9O-0",
  render: () => {
    const [controls, setControls] = React.useState<FilterControl[]>(ordersControls({
      cashier: "john",
      date: "Aug 20"
    }));
    return <div className="flex flex-col">
        <FilterToolbar controls={controls} resultCount={0} resultNoun="orders" onChange={(id, value) => setControls(p => p.map(c => c.id === id ? {
        ...c,
        value
      } as FilterControl : c))} />
        <div data-ft-empty-gap className="mt-(--sp-8)">
          <EmptyState variant="filtered" title="No orders match" description="No orders for this cashier on the selected day. Try different filters or Reset." actionLabel="Reset filters" />
        </div>
      </div>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByText("0 orders")).toBeInTheDocument();
    await expect(c.getByText("No orders match")).toBeInTheDocument();
    // the gap between toolbar and EmptyState is --sp-8 (24px)
    const gap = canvasElement.querySelector<HTMLElement>("[data-ft-empty-gap]");
    await expect(gap).not.toBeNull();
    await expect(getComputedStyle(gap as HTMLElement).marginTop).toBe("24px");
  }
}`,...D.parameters?.docs?.source}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  name: "§9.2 — first Select trigger paints a focus-visible ring",
  render: () => <Harness initial={ordersControls()} resultCount={6} />,
  parameters: {
    interaction: {
      focus: '[role="combobox"]',
      assertFocusRing: '[role="combobox"]'
    }
  }
}`,...A.parameters?.docs?.source}}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  name: "§9.2 — Reset link paints a focus-visible ring",
  render: () => <Harness initial={ordersControls({
    payment: "cash"
  })} resultCount={3} />,
  parameters: {
    interaction: {
      focus: "[data-ft-reset]",
      assertFocusRing: "[data-ft-reset]"
    }
  }
}`,...N.parameters?.docs?.source}}};const Te=["Default","OneFilterActive","MultipleActive","ToggleStyleControl","Mobile","FilteredEmptyConsequence","SelectTriggerFocusRing","ResetFocusRing"];export{T as Default,D as FilteredEmptyConsequence,S as Mobile,k as MultipleActive,B as OneFilterActive,N as ResetFocusRing,A as SelectTriggerFocusRing,C as ToggleStyleControl,Te as __namedExportsOrder,Re as default};
