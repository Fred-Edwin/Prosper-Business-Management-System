import{j as t,c as b}from"./utils-_OH9Wn3f.js";import{r as g}from"./iframe-sMR_UR-7.js";import{B as Z}from"./button-CREOhNf_.js";import"./preload-helper-PPVm8Dsz.js";import"./spinner-RChkOJRi.js";function h(e){return Number.isInteger(e)?String(e):e.toFixed(1)}function L({productId:e,name:a,unit:n,available:l,selected:d,quantity:s,onSelect:x,onDeselect:Q,onQuantityChange:$,onQuantityString:P,onBlockedChange:w,availableLabelPrefix:K="Avail:",step:B=1,min:k=0,max:M,disabled:W=!1,className:H}){const F=l===0,q=M??l,i=d&&s>l,z=d&&!i&&s>=q,U=d&&s<=k,I=g.useRef(!1);g.useEffect(()=>{i!==I.current&&(I.current=i,w?.(e,i))},[i,e,w]),g.useEffect(()=>()=>{I.current&&w?.(e,!1)},[e,w]);const[J,O]=g.useState(null),V=J??h(s);function _(o){P?.(e,o);const m=Number.parseFloat(o);if(Number.isNaN(m)){O(null);return}m<=k?Q(e):$(e,m),O(null)}function S(o){const m=s+o;m<=k?Q(e):$(e,m)}const p=F?"None on hand":`${K} ${h(l)} ${n}`;return F||W?t.jsxs("div",{role:"group","aria-label":`${a}, ${p}`,"aria-disabled":"true",className:b("[font-synthesis:none] antialiased flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px]","bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]","opacity-[0.5]",H),children:[t.jsx("span",{className:"grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1",children:a}),t.jsx("span",{className:"shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-tertiary)] text-micro/micro",children:p}),t.jsx("span",{className:"shrink-0 basis-[108px] flex justify-end",children:t.jsx(Z,{size:"sm",variant:"secondary",disabled:!0,tabIndex:-1,children:"+ Select"})})]}):d?t.jsxs("div",{role:"group","aria-label":`${a}, ${p}, quantity ${h(s)} ${n}${i?", exceeds available stock":""}`,"data-selected":!i||void 0,"data-blocked":i||void 0,className:b("[font-synthesis:none] antialiased flex flex-col w-full min-h-[56px] p-[12px] rounded-lg gap-[6px] border border-solid",i?"bg-danger-bg border-danger":"bg-(--surface-selected) border-accent",H),children:[t.jsxs("div",{className:"flex items-center gap-[8px]",children:[t.jsx("span",{className:"grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1",children:a}),t.jsx("span",{className:"shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-micro/micro",children:p}),t.jsx("span",{className:"shrink-0 basis-[108px] flex justify-end",children:t.jsxs("div",{className:b("flex items-center h-[32px] rounded-md overflow-clip shrink-0 bg-(--surface-page) border border-solid",i?"border-danger":"[border-color:var(--border-strong)]"),children:[t.jsx("button",{type:"button",disabled:U,onClick:()=>S(-B),"aria-label":"Decrease",tabIndex:-1,className:"flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body",children:"−"}),t.jsx("span",{className:b("flex items-center justify-center min-w-[48px] h-[30px] px-[4px] shrink-0","border-x border-x-solid [border-color:var(--border-subtle)]"),children:t.jsx("input",{type:"text",inputMode:"decimal",role:"spinbutton","aria-label":`${a} quantity`,"aria-valuenow":s,"aria-valuemin":k,"aria-valuemax":Number.isFinite(q)?q:void 0,"aria-valuetext":`${h(s)} ${n}`,"aria-invalid":i||void 0,value:V,onChange:o=>{O(o.target.value),P?.(e,o.target.value)},onBlur:o=>_(o.target.value),onKeyDown:o=>{o.key==="ArrowUp"?(o.preventDefault(),S(B)):o.key==="ArrowDown"?(o.preventDefault(),S(-B)):o.key==="Enter"&&(o.preventDefault(),_(o.target.value))},className:b("w-max min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-medium) [font-feature-settings:'tnum'] text-sm/micro",i?"text-danger":"[color:var(--text-primary)]"),style:{width:`${Math.max(V.length,2)}ch`}})}),t.jsx("button",{type:"button",disabled:z,onClick:()=>S(B),"aria-label":"Increase",tabIndex:-1,className:"flex items-center justify-center w-[30px] h-[30px] shrink-0 kit-interactive kit-focus-ring font-ui font-(--weight-medium) [color:var(--text-primary)] text-h2/body",children:"+"})]})})]}),i&&t.jsxs("p",{className:"font-ui font-(--weight-regular) text-danger text-caption/micro",children:["Only ",h(l)," ",n," on hand — reduce or remove this line."]})]}):t.jsxs("div",{role:"group","aria-label":`${a}, ${p}`,className:b("[font-synthesis:none] antialiased flex items-center w-full min-h-[56px] py-[12px] px-[14px] rounded-lg gap-[12px]","bg-(--surface-page) border border-solid [border-color:var(--border-subtle)]",H),children:[t.jsx("span",{className:"grow min-w-0 font-ui font-(--weight-medium) [color:var(--text-primary)] text-body/body line-clamp-1",children:a}),t.jsx("span",{className:"shrink-0 basis-[96px] text-right whitespace-nowrap font-mono [font-feature-settings:'tnum'] [color:var(--text-secondary)] text-caption/micro",children:p}),t.jsx("span",{className:"shrink-0 basis-[108px] flex justify-end",children:t.jsx(Z,{size:"sm",variant:"secondary",onClick:()=>x(e),children:"+ Select"})})]})}L.__docgenInfo={description:"",methods:[],displayName:"SelectableProductRow",props:{productId:{required:!0,tsType:{name:"string"},description:""},name:{required:!0,tsType:{name:"string"},description:""},unit:{required:!0,tsType:{name:"string"},description:'Unit for the `Avail:` readout text only, e.g. "kg" | "pcs". Never rendered inside the stepper.'},available:{required:!0,tsType:{name:"number"},description:"Derived balance at the staff member's location. `0` ⇒ the zero-available (inert) state."},selected:{required:!0,tsType:{name:"boolean"},description:"In the batch."},quantity:{required:!0,tsType:{name:"number"},description:"Current stepped magnitude. Only meaningful when `selected`."},onSelect:{required:!0,tsType:{name:"signature",type:"function",raw:"(productId: string) => void",signature:{arguments:[{type:{name:"string"},name:"productId"}],return:{name:"void"}}},description:""},onDeselect:{required:!0,tsType:{name:"signature",type:"function",raw:"(productId: string) => void",signature:{arguments:[{type:{name:"string"},name:"productId"}],return:{name:"void"}}},description:""},onQuantityChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(productId: string, next: number) => void",signature:{arguments:[{type:{name:"string"},name:"productId"},{type:{name:"number"},name:"next"}],return:{name:"void"}}},description:""},onQuantityString:{required:!1,tsType:{name:"signature",type:"function",raw:"(productId: string, raw: string) => void",signature:{arguments:[{type:{name:"string"},name:"productId"},{type:{name:"string"},name:"raw"}],return:{name:"void"}}},description:"Raw typed string before parse — mirrors `QuantityStepper.onValueString`, for the parent's validation."},onBlockedChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(productId: string, blocked: boolean) => void",signature:{arguments:[{type:{name:"string"},name:"productId"},{type:{name:"boolean"},name:"blocked"}],return:{name:"void"}}},description:"Fires whenever this row's blocked signal changes. `true` ⇒ `quantity`\nexceeds `available` (§9.8): the row paints the danger treatment + a\nhelper line, and the parent flow MUST disable its sticky submit while\nANY row's signal is `true`. The parent owns the aggregate — this is a\nper-row notification, not a global flag."},availableLabelPrefix:{required:!1,tsType:{name:"string"},description:"`Avail:` default · `On hand:` (Receive) · `In Rest.:` (Production). See the flow doc.",defaultValue:{value:'"Avail:"',computed:!1}},step:{required:!1,tsType:{name:"number"},description:"Step / stepper default when `+ Select` is tapped.",defaultValue:{value:"1",computed:!1}},min:{required:!1,tsType:{name:"number"},description:"Lower bound for the stepper. Default `0` — stepping to `0` deselects the row.",defaultValue:{value:"0",computed:!1}},max:{required:!1,tsType:{name:"number"},description:"Upper bound for the stepper `+` button and the `aria-valuemax`. Defaults to\n`available` (the spend flows: Issue / Transfer / Non-sale / Dispatch). Pass\n`Infinity` for the additive flows (Receive / Production) where quantity is\nnot bounded by on-hand."},disabled:{required:!1,tsType:{name:"boolean"},description:"Hard-disable the whole row (distinct from the zero-available styling).",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:r,fn:v,userEvent:y,within:u}=__STORYBOOK_MODULE_TEST__,ae={title:"Kit/SelectableProductRow",component:L,parameters:{layout:"padded",docs:{description:{component:`SelectableProductRow (M2-3KIT) — the multi-row product picker row used by all
6 Store-Manager / Canteen movement flows. Visual acceptance target: Paper
artboard \`JL7-0\` ("Component Kit — Selectable Product Row [M2-3D]").

One story per drawn state:
  NotSelected · Selected · AtAvailable (+ disabled) · OverAvailableBlocked
  (§9.8, raises the blocked signal) · ZeroAvailable (row muted, + Select inert).
Plus TapToTypeQuantity (the ADR-48 inline-entry contract the stepper re-uses)
and DeselectBySteppingToZero.

DEVIATION from JL7-0 / the handover (documented in the component header +
kit-audit §1): the embedded stepper is authored inline, not \`<QuantityStepper>\`
— the kit C10 can't render at the compact 108px / 32px / no-unit size the
artboard draws without breaking the fixed-width slot alignment. The ADR-43 /
ADR-48 \`role="spinbutton"\` + tap-to-type contract is re-used verbatim.`}}},decorators:[e=>t.jsx("div",{style:{width:390},children:t.jsx(e,{})})]};function c(e){const[a,n]=g.useState(e.selected??!1),[l,d]=g.useState(e.quantity??0);return t.jsx(L,{productId:"p-beef",name:"Beef Fillet",unit:"kg",available:46.5,step:1,...e,selected:a,quantity:l,onSelect:s=>{n(!0),d(e.step??1),e.onSelect?.(s)},onDeselect:s=>{n(!1),d(0),e.onDeselect?.(s)},onQuantityChange:(s,x)=>{d(x),e.onQuantityChange?.(s,x)}})}const T={name:"1 · Not selected — ARTBOARD JL7-0",render:()=>t.jsx(c,{}),play:async({canvasElement:e})=>{const a=u(e);await r(a.getByRole("button",{name:"+ Select"})).toBeEnabled(),await r(a.getByText("Avail: 46.5 kg")).toBeInTheDocument(),await r(a.queryByRole("spinbutton")).not.toBeInTheDocument()}},D={name:"2 · Selected (in the batch) ⇒ §9.4 accent border + tint",render:()=>t.jsx(c,{selected:!0,quantity:24}),parameters:{interaction:{assertColor:[{selector:'[data-selected="true"]',prop:"borderColor",token:"--color-accent"},{selector:'[data-selected="true"]',prop:"backgroundColor",token:"--surface-selected"}]}},play:async({canvasElement:e})=>{const a=u(e).getByRole("spinbutton");await r(a).toHaveAttribute("aria-valuenow","24"),await r(a).toHaveAttribute("aria-valuetext","24 kg"),await r(a).toHaveAttribute("aria-valuemax","46.5")}},C={name:"3 · At available ⇒ + disabled (not an error)",render:()=>t.jsx(c,{selected:!0,quantity:46.5}),play:async({canvasElement:e})=>{const a=u(e);await r(a.getByRole("button",{name:"Increase"})).toBeDisabled(),await r(a.getByRole("button",{name:"Decrease"})).toBeEnabled(),await r(a.queryByText(/on hand — reduce/)).not.toBeInTheDocument(),await r(a.getByRole("spinbutton")).not.toHaveAttribute("aria-invalid","true")}},R={name:"4 · Over available — BLOCKED (§9.8) ⇒ danger + blocked signal raised",args:{onBlockedChange:v()},render:e=>t.jsx(c,{...e,selected:!0,quantity:53}),parameters:{interaction:{assertColor:[{selector:'[data-blocked="true"]',prop:"borderColor",token:"--color-danger"},{selector:'[data-blocked="true"]',prop:"backgroundColor",token:"--color-danger-bg"}]}},play:async({canvasElement:e,args:a})=>{const n=u(e);await r(n.getByText("Only 46.5 kg on hand — reduce or remove this line.")).toBeInTheDocument(),await r(n.getByRole("spinbutton")).toHaveAttribute("aria-invalid","true"),await r(a.onBlockedChange).toHaveBeenCalledWith("p-beef",!0)}},A={name:"5 · Zero available ⇒ row muted, + Select inert (onSelect must not fire)",args:{onSelect:v()},render:e=>t.jsx(c,{...e,available:0}),play:async({canvasElement:e,args:a})=>{const n=u(e),l=n.getByRole("button",{name:"+ Select"});await r(l).toBeDisabled(),await r(n.getByText("None on hand")).toBeInTheDocument(),await y.click(l,{pointerEventsCheck:0}),await r(a.onSelect).not.toHaveBeenCalled()}},f={name:"Value focused — type a quantity (30), blur commits",args:{onQuantityChange:v(),onQuantityString:v()},render:e=>t.jsx(c,{...e,selected:!0,quantity:5}),play:async({canvasElement:e,args:a})=>{const n=u(e).getByRole("spinbutton");await y.click(n),await y.clear(n),await y.type(n,"30"),await r(n).toHaveValue("30"),await r(a.onQuantityString).toHaveBeenLastCalledWith("p-beef","30"),await y.tab(),await r(a.onQuantityChange).toHaveBeenLastCalledWith("p-beef",30)}},j={name:"Stepper ↓ past the floor ⇒ deselect (row returns to + Select)",args:{onDeselect:v()},render:e=>t.jsx(c,{...e,selected:!0,quantity:1}),play:async({canvasElement:e,args:a})=>{const n=u(e);await y.click(n.getByRole("button",{name:"Decrease"})),await r(a.onDeselect).toHaveBeenCalledWith("p-beef"),await r(n.getByRole("button",{name:"+ Select"})).toBeInTheDocument()}},E={name:"+ Select focus-visible ⇒ §9.1 accent ring",render:()=>t.jsx(c,{}),parameters:{interaction:{focus:"button",assertFocusRing:"button"}}},N={name:"Long product name ⇒ ellipsis (min-w-0 name cell)",render:()=>t.jsx(c,{name:"Grass-fed Beef Fillet, Centre-cut, Trimmed, Portioned"})};T.parameters={...T.parameters,docs:{...T.parameters?.docs,source:{originalSource:`{
  name: "1 · Not selected — ARTBOARD JL7-0",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", {
      name: "+ Select"
    })).toBeEnabled();
    await expect(c.getByText("Avail: 46.5 kg")).toBeInTheDocument();
    await expect(c.queryByRole("spinbutton")).not.toBeInTheDocument();
  }
}`,...T.parameters?.docs?.source}}};D.parameters={...D.parameters,docs:{...D.parameters?.docs,source:{originalSource:`{
  name: "2 · Selected (in the batch) ⇒ §9.4 accent border + tint",
  render: () => <Harness selected quantity={24} />,
  parameters: {
    interaction: {
      assertColor: [{
        selector: '[data-selected="true"]',
        prop: "borderColor",
        token: "--color-accent"
      }, {
        selector: '[data-selected="true"]',
        prop: "backgroundColor",
        token: "--surface-selected"
      }]
    }
  },
  play: async ({
    canvasElement
  }) => {
    const spin = within(canvasElement).getByRole("spinbutton");
    await expect(spin).toHaveAttribute("aria-valuenow", "24");
    await expect(spin).toHaveAttribute("aria-valuetext", "24 kg");
    await expect(spin).toHaveAttribute("aria-valuemax", "46.5");
  }
}`,...D.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: "3 · At available ⇒ + disabled (not an error)",
  render: () => <Harness selected quantity={46.5} />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", {
      name: "Increase"
    })).toBeDisabled();
    await expect(c.getByRole("button", {
      name: "Decrease"
    })).toBeEnabled();
    // not the blocked treatment
    await expect(c.queryByText(/on hand — reduce/)).not.toBeInTheDocument();
    await expect(c.getByRole("spinbutton")).not.toHaveAttribute("aria-invalid", "true");
  }
}`,...C.parameters?.docs?.source}}};R.parameters={...R.parameters,docs:{...R.parameters?.docs,source:{originalSource:`{
  name: "4 · Over available — BLOCKED (§9.8) ⇒ danger + blocked signal raised",
  args: {
    onBlockedChange: fn()
  },
  render: args => <Harness {...args} selected quantity={53} />,
  parameters: {
    interaction: {
      assertColor: [{
        selector: '[data-blocked="true"]',
        prop: "borderColor",
        token: "--color-danger"
      }, {
        selector: '[data-blocked="true"]',
        prop: "backgroundColor",
        token: "--color-danger-bg"
      }]
    }
  },
  play: async ({
    canvasElement,
    args
  }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Only 46.5 kg on hand — reduce or remove this line.")).toBeInTheDocument();
    await expect(c.getByRole("spinbutton")).toHaveAttribute("aria-invalid", "true");
    // the parent-notifying blocked signal fired true
    await expect(args.onBlockedChange).toHaveBeenCalledWith("p-beef", true);
  }
}`,...R.parameters?.docs?.source}}};A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  name: "5 · Zero available ⇒ row muted, + Select inert (onSelect must not fire)",
  args: {
    onSelect: fn()
  },
  render: args => <Harness {...args} available={0} />,
  play: async ({
    canvasElement,
    args
  }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", {
      name: "+ Select"
    });
    await expect(btn).toBeDisabled();
    await expect(c.getByText("None on hand")).toBeInTheDocument();
    await userEvent.click(btn, {
      pointerEventsCheck: 0
    });
    await expect(args.onSelect).not.toHaveBeenCalled();
  }
}`,...A.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: "Value focused — type a quantity (30), blur commits",
  args: {
    onQuantityChange: fn(),
    onQuantityString: fn()
  },
  render: args => <Harness {...args} selected quantity={5} />,
  play: async ({
    canvasElement,
    args
  }) => {
    const spin = within(canvasElement).getByRole<HTMLInputElement>("spinbutton");
    await userEvent.click(spin);
    await userEvent.clear(spin);
    await userEvent.type(spin, "30");
    await expect(spin).toHaveValue("30");
    await expect(args.onQuantityString).toHaveBeenLastCalledWith("p-beef", "30");
    await userEvent.tab();
    await expect(args.onQuantityChange).toHaveBeenLastCalledWith("p-beef", 30);
  }
}`,...f.parameters?.docs?.source},description:{story:"The tap-to-type inline-entry path (ADR-48 / `DKR-0`) that the stepper re-uses:\nfocus the value, type a magnitude in one go, blur to commit.",...f.parameters?.docs?.description}}};j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  name: "Stepper ↓ past the floor ⇒ deselect (row returns to + Select)",
  args: {
    onDeselect: fn()
  },
  render: args => <Harness {...args} selected quantity={1} />,
  play: async ({
    canvasElement,
    args
  }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", {
      name: "Decrease"
    }));
    await expect(args.onDeselect).toHaveBeenCalledWith("p-beef");
    await expect(c.getByRole("button", {
      name: "+ Select"
    })).toBeInTheDocument();
  }
}`,...j.parameters?.docs?.source}}};E.parameters={...E.parameters,docs:{...E.parameters?.docs,source:{originalSource:`{
  name: "+ Select focus-visible ⇒ §9.1 accent ring",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: "button",
      assertFocusRing: "button"
    }
  }
}`,...E.parameters?.docs?.source}}};N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  name: "Long product name ⇒ ellipsis (min-w-0 name cell)",
  render: () => <Harness name="Grass-fed Beef Fillet, Centre-cut, Trimmed, Portioned" />
}`,...N.parameters?.docs?.source}}};const ne=["NotSelected","Selected","AtAvailable","OverAvailableBlocked","ZeroAvailable","TapToTypeQuantity","DeselectBySteppingToZero","FocusSelectButton","LongName"];export{C as AtAvailable,j as DeselectBySteppingToZero,E as FocusSelectButton,N as LongName,T as NotSelected,R as OverAvailableBlocked,D as Selected,f as TapToTypeQuantity,A as ZeroAvailable,ne as __namedExportsOrder,ae as default};
