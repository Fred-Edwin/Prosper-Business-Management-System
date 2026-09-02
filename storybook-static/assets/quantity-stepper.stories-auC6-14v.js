import{j as a,c as _}from"./utils-_OH9Wn3f.js";import{r as R}from"./iframe-sMR_UR-7.js";import{F as I}from"./form-field-DkYjBilr.js";import"./preload-helper-PPVm8Dsz.js";function h({label:t,value:e,unit:n,min:s,max:A,step:p=1,onChange:c,onValueString:E,error:B=!1,helperText:C,required:j,format:T=k=>String(k),className:q,id:N}){const k=s!==void 0&&e<=s,F=A!==void 0&&e>=A,[M,D]=R.useState(null),O=M??T(e);function H(m){E?.(m);const b=Number.parseFloat(m);Number.isNaN(b)||c?.(b),D(null)}return a.jsx(I,{label:t,error:B?C||" ":void 0,hint:B?void 0:C,required:j,id:N,className:"w-[220px]",children:({id:m,"aria-describedby":b,"aria-invalid":S})=>a.jsxs("div",{className:_("flex items-center h-(--control-md) rounded-sm shrink-0 border border-solid kit-field",B?"border-danger":"[border-color:var(--border-strong)]",q),"data-invalid":S||void 0,children:[a.jsx("button",{type:"button",disabled:k,onClick:()=>c?.(e-p),"aria-label":"Decrease",tabIndex:-1,className:"flex items-center justify-center w-(--control-sm) h-(--control-md) shrink-0 border-r border-r-solid [border-right-color:var(--border-subtle)] kit-interactive kit-focus-ring",children:a.jsx("span",{className:"font-ui font-(--weight-semibold) [color:var(--text-secondary)] text-body/sm",children:"−"})}),a.jsx("input",{id:m,type:"text",inputMode:"decimal",role:"spinbutton","aria-valuenow":e,"aria-valuemin":s,"aria-valuemax":A,"aria-valuetext":n?`${T(e)} ${n}`:void 0,"aria-describedby":b,"aria-invalid":S,value:O,onChange:o=>{D(o.target.value),E?.(o.target.value)},onBlur:o=>H(o.target.value),onKeyDown:o=>{o.key==="ArrowUp"?(o.preventDefault(),c?.(e+p)):o.key==="ArrowDown"?(o.preventDefault(),c?.(e-p)):o.key==="Enter"&&(o.preventDefault(),H(o.target.value))},className:"grow w-full min-w-0 bg-transparent outline-none text-center font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro"}),a.jsx("button",{type:"button",disabled:F,onClick:()=>c?.(e+p),"aria-label":"Increase",tabIndex:-1,className:"flex items-center justify-center w-(--control-sm) h-(--control-md) shrink-0 border-l border-l-solid [border-left-color:var(--border-subtle)] kit-interactive kit-focus-ring",children:a.jsx("span",{className:"font-ui font-(--weight-semibold) [color:var(--text-secondary)] text-body/sm",children:"+"})}),n&&a.jsx("div",{className:"flex items-center px-(--sp-4) shrink-0 border-l border-l-solid [border-left-color:var(--border-subtle)]",children:a.jsx("span",{className:"font-ui w-max shrink-0 [color:var(--text-tertiary)] text-sm/micro",children:n})})]})})}h.__docgenInfo={description:"",methods:[],displayName:"QuantityStepper",props:{label:{required:!1,tsType:{name:"string"},description:""},value:{required:!0,tsType:{name:"number"},description:""},unit:{required:!1,tsType:{name:"string"},description:""},min:{required:!1,tsType:{name:"number"},description:""},max:{required:!1,tsType:{name:"number"},description:""},step:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"1",computed:!1}},onChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: number) => void",signature:{arguments:[{type:{name:"number"},name:"value"}],return:{name:"void"}}},description:""},onValueString:{required:!1,tsType:{name:"signature",type:"function",raw:"(raw: string) => void",signature:{arguments:[{type:{name:"string"},name:"raw"}],return:{name:"void"}}},description:"Raw typed string (before parse) — for out-of-range / non-numeric checks."},error:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},helperText:{required:!1,tsType:{name:"string"},description:""},required:{required:!1,tsType:{name:"boolean"},description:""},format:{required:!1,tsType:{name:"signature",type:"function",raw:"(value: number) => string",signature:{arguments:[{type:{name:"number"},name:"value"}],return:{name:"string"}}},description:"Formats the numeric value for display. Default: `String(value)`.",defaultValue:{value:"(v) => String(v)",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""},id:{required:!1,tsType:{name:"string"},description:""}}};const{expect:r,fn:V,userEvent:l,within:i}=__STORYBOOK_MODULE_TEST__,W={title:"Kit/QuantityStepper",component:h,parameters:{layout:"padded",docs:{description:{component:"FLAG (systemic low-contrast dimmed text — Session 10c): the trailing unit label (`kg`) is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1 — as drawn on `6XC-0` (the unit is recessive; the editable value carries the meaning). Same call as the Select placeholder / DatePicker cells. `color-contrast` scoped off → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}};function u(t){const[e,n]=R.useState(t.value??70);return a.jsx(h,{label:"Quantity",unit:"kg",step:.5,...t,value:e,onChange:n})}const y={name:"Default (− 70.0 + kg) — ARTBOARD 6XC-0",render:()=>a.jsx(u,{}),play:async({canvasElement:t})=>{const e=i(t).getByRole("spinbutton");await r(e).toHaveAttribute("aria-valuenow","70"),await r(e).toHaveAttribute("aria-valuetext","70 kg")}},v={name:"At min bound ⇒ − disabled (ARTBOARD)",render:()=>a.jsx(u,{value:0,min:0,max:100}),play:async({canvasElement:t})=>{const e=i(t);await r(e.getByRole("button",{name:"Decrease"})).toBeDisabled(),await r(e.getByRole("button",{name:"Increase"})).toBeEnabled(),await r(e.getByRole("spinbutton")).toHaveAttribute("aria-valuemin","0")}},g={name:"At max bound ⇒ + disabled",render:()=>a.jsx(u,{value:100,min:0,max:100}),play:async({canvasElement:t})=>{const e=i(t);await r(e.getByRole("button",{name:"Increase"})).toBeDisabled(),await r(e.getByRole("spinbutton")).toHaveAttribute("aria-valuemax","100")}},w={name:"Focus (value field) ⇒ §9.2 accent border",render:()=>a.jsx(u,{}),parameters:{interaction:{focus:'[role="spinbutton"]',assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-accent"}]}}},f={name:"Error (out-of-range typed value) ⇒ §9.8 danger border + helper",render:()=>a.jsx(u,{value:70,error:!0,helperText:"Enter a value between 0 and 50."}),parameters:{interaction:{assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-danger"}]}},play:async({canvasElement:t})=>{const e=i(t).getByRole("spinbutton");await r(e).toHaveAttribute("aria-invalid","true");const n=i(t).getByText("Enter a value between 0 and 50.");await r(e.getAttribute("aria-describedby")).toContain(n.id)}},d={name:"Value focused — type a quantity (24), blur commits — ARTBOARD 6CG-0 / DKR-0",args:{onChange:V(),onValueString:V()},render:t=>{const[e,n]=R.useState(2);return a.jsx(h,{label:"Quantity",unit:"kg",min:1,step:1,...t,value:e,onChange:s=>{n(s),t.onChange?.(s)}})},play:async({canvasElement:t,args:e})=>{const n=i(t).getByRole("spinbutton");await l.click(n),await l.clear(n),await l.type(n,"24"),await r(n).toHaveValue("24"),await r(e.onValueString).toHaveBeenLastCalledWith("24"),await l.tab(),await r(e.onChange).toHaveBeenLastCalledWith(24),await r(n).toHaveValue("24")}},x={name:"↑ / ↓ step the value by `step`",render:()=>a.jsx(u,{value:70,step:.5}),play:async({canvasElement:t})=>{const e=i(t).getByRole("spinbutton");e.focus(),await l.keyboard("{ArrowUp}"),await r(e).toHaveAttribute("aria-valuenow","70.5"),await l.keyboard("{ArrowDown}{ArrowDown}"),await r(e).toHaveAttribute("aria-valuenow","69.5")}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Default (− 70.0 + kg) — ARTBOARD 6XC-0",
  render: () => <Harness />,
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("spinbutton");
    await expect(input).toHaveAttribute("aria-valuenow", "70");
    await expect(input).toHaveAttribute("aria-valuetext", "70 kg");
  }
}`,...y.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "At min bound ⇒ − disabled (ARTBOARD)",
  render: () => <Harness value={0} min={0} max={100} />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", {
      name: "Decrease"
    })).toBeDisabled();
    await expect(c.getByRole("button", {
      name: "Increase"
    })).toBeEnabled();
    await expect(c.getByRole("spinbutton")).toHaveAttribute("aria-valuemin", "0");
  }
}`,...v.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "At max bound ⇒ + disabled",
  render: () => <Harness value={100} min={0} max={100} />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", {
      name: "Increase"
    })).toBeDisabled();
    await expect(c.getByRole("spinbutton")).toHaveAttribute("aria-valuemax", "100");
  }
}`,...g.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "Focus (value field) ⇒ §9.2 accent border",
  render: () => <Harness />,
  parameters: {
    interaction: {
      focus: '[role="spinbutton"]',
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-accent"
      }]
    }
  }
}`,...w.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  name: "Error (out-of-range typed value) ⇒ §9.8 danger border + helper",
  render: () => <Harness value={70} error helperText="Enter a value between 0 and 50." />,
  parameters: {
    interaction: {
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-danger"
      }]
    }
  },
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("spinbutton");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const msg = within(canvasElement).getByText("Enter a value between 0 and 50.");
    await expect(input.getAttribute("aria-describedby")).toContain(msg.id);
  }
}`,...f.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Value focused — type a quantity (24), blur commits — ARTBOARD 6CG-0 / DKR-0",
  args: {
    onChange: fn(),
    onValueString: fn()
  },
  render: args => {
    const [value, setValue] = React.useState(2);
    return <QuantityStepper label="Quantity" unit="kg" min={1} step={1} {...args} value={value} onChange={n => {
      setValue(n);
      args.onChange?.(n);
    }} />;
  },
  play: async ({
    canvasElement,
    args
  }) => {
    const input = within(canvasElement).getByRole<HTMLInputElement>("spinbutton");
    await userEvent.click(input);
    await userEvent.clear(input);
    await userEvent.type(input, "24");
    // mid-type: the field shows the raw typed string, onValueString has fired
    await expect(input).toHaveValue("24");
    await expect(args.onValueString).toHaveBeenLastCalledWith("24");
    await userEvent.tab(); // blur commits
    await expect(args.onChange).toHaveBeenLastCalledWith(24);
    // the committed numeric value is now what the field shows
    await expect(input).toHaveValue("24");
  }
}`,...d.parameters?.docs?.source},description:{story:'Tap-to-type inline entry — the path the M2 order-line rows (C2/C3/C4) and the\nA3 correction editor depend on: focus the value, type a large quantity in one\ngo instead of tapping `+` 24 times, blur to commit. Maps to `6CG-0` section\n`DKR-0` "value focused — tap the number, type a quantity".',...d.parameters?.docs?.description}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "↑ / ↓ step the value by \`step\`",
  render: () => <Harness value={70} step={0.5} />,
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("spinbutton");
    input.focus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(input).toHaveAttribute("aria-valuenow", "70.5");
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await expect(input).toHaveAttribute("aria-valuenow", "69.5");
  }
}`,...x.parameters?.docs?.source}}};const U=["Rest","AtMinBound","AtMaxBound","FocusValueField","ErrorTypedValue","TypeALargeQuantity","ArrowKeysStep"];export{x as ArrowKeysStep,g as AtMaxBound,v as AtMinBound,f as ErrorTypedValue,w as FocusValueField,y as Rest,d as TypeALargeQuantity,U as __namedExportsOrder,W as default};
