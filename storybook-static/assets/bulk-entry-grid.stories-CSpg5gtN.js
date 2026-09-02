import{j as e,c as s}from"./utils-_OH9Wn3f.js";import{r as v}from"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function u({cell:t,label:a}){const o=t.error?"border border-solid border-danger":t.editable?"border border-solid border-accent":"[background-color:var(--surface-subtle)] border border-solid [border-color:var(--border-subtle)]",l=t.error?"font-mono font-(--weight-semibold) text-danger text-sm/micro":t.editable?"font-mono font-(--weight-semibold) [color:var(--text-primary)] text-sm/micro":"font-mono [color:var(--text-disabled)] text-sm/micro";return e.jsx("div",{role:"gridcell",className:s("flex items-center h-(--control-sm) w-[110px] shrink-0 px-(--sp-4) rounded-sm kit-field",o),"data-invalid":t.error||void 0,children:t.editable?e.jsx("input",{value:t.value,inputMode:"decimal","aria-label":a,"aria-invalid":t.error||void 0,onChange:r=>t.onChange?.(r.target.value),className:s("w-full bg-transparent outline-none",l)}):e.jsx("div",{className:l,children:t.value})})}function f({rows:t,footerTitle:a,footerSegments:o,className:l}){return e.jsxs("div",{className:s("[font-synthesis:none] flex flex-col [width:100%] antialiased",l),children:[e.jsxs("div",{role:"grid",className:"flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)]",children:[e.jsxs("div",{role:"row",className:"flex items-center h-[32px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600",children:[["Item name","Category","Unit","Store","Restaurant","Canteen"].map((r,n)=>e.jsx("div",{role:"columnheader",className:s("font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info",n===0?"grow min-w-[200px]":"shrink-0",n===2?"w-[60px]":n>0&&"w-[110px]"),children:r},r)),e.jsx("div",{role:"columnheader",className:"w-[120px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info",children:"Cost / Buying"}),e.jsx("div",{role:"columnheader",className:"w-[140px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase text-right shrink-0 leading-[12px] flex justify-end flex-wrap text-info",children:"Total Value (KES)"})]}),t.map(r=>e.jsxs("div",{role:"row",className:"flex items-center h-[48px] px-(--sp-6) gap-(--sp-5) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]",children:[e.jsx("div",{role:"rowheader",className:"grow min-w-[200px] font-ui font-(--weight-medium) whitespace-pre-wrap [color:var(--text-primary)] text-sm/micro",children:r.item}),e.jsx("div",{role:"gridcell",className:s("w-[110px] font-ui font-(--weight-medium) shrink-0 text-sm/micro",r.categoryTone==="warning"?"text-warning":"text-info"),children:r.category}),e.jsx("div",{role:"gridcell",className:"w-[60px] font-mono font-(--weight-regular) shrink-0 [color:var(--text-secondary)] text-sm/micro",children:r.unit}),e.jsx(u,{cell:r.store,label:`${r.item} — Store`}),e.jsx(u,{cell:r.restaurant,label:`${r.item} — Restaurant`}),e.jsx(u,{cell:r.canteen,label:`${r.item} — Canteen`}),e.jsx("div",{role:"gridcell",className:"w-[120px] font-mono font-(--weight-regular) text-right shrink-0 flex justify-end flex-wrap [color:var(--text-primary)] text-sm/micro",children:r.costBuying}),e.jsx("div",{role:"gridcell",className:"w-[140px] font-mono font-(--weight-semibold) text-right shrink-0 flex justify-end flex-wrap [color:var(--text-primary)] text-sm/micro",children:r.totalValue})]},r.id))]}),(a||o)&&e.jsxs("div",{className:"flex h-[44px] mt-(--sp-6) px-(--sp-6) rounded-md shrink-0 bg-gray-900",children:[a&&e.jsx("div",{className:"flex items-center font-ui font-(--weight-medium) pr-(--sp-8)",children:e.jsx("div",{className:"flex font-ui font-(--weight-medium) [letter-spacing:var(--tracking-caps)] uppercase text-(--nav-text-subtle) text-caption/micro",children:a})}),(o??[]).map((r,n)=>{const g=n===(o?.length??0)-1;return e.jsxs(v.Fragment,{children:[e.jsx("div",{className:"w-px self-stretch shrink-0 bg-(--nav-bg-divider-strong)"}),e.jsxs("div",{className:s("flex items-center gap-[6px]",n===0&&a?"px-(--sp-6)":g?"pl-(--sp-6)":"px-(--sp-6)",g&&"mr-0"),children:[e.jsx("div",{className:"font-ui text-(--nav-text-subtle) text-caption/micro",children:r.label}),e.jsx("div",{className:s("font-mono font-(--weight-semibold) text-sm/micro",r.tone==="success"?"text-success":"text-(--text-inverse)"),children:r.value})]})]},n)})]})]})}f.__docgenInfo={description:"",methods:[],displayName:"BulkEntryGrid",props:{rows:{required:!0,tsType:{name:"Array",elements:[{name:"BulkGridRow"}],raw:"BulkGridRow[]"},description:""},footerTitle:{required:!1,tsType:{name:"string"},description:'Leading uppercase label, e.g. "Consolidated Day 1 Valuation".'},footerSegments:{required:!1,tsType:{name:"Array",elements:[{name:"BulkGridFooterSegment"}],raw:"BulkGridFooterSegment[]"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:i,within:h}=__STORYBOOK_MODULE_TEST__,k={title:"Kit/BulkEntryGrid",component:f,parameters:{layout:"fullscreen",docs:{description:{component:"FLAG (systemic semantic-colour + dimmed text contrast — Session 10c): the category cell (`text-info` / `text-warning`), the non-editable cell value (`--text-disabled`), and the `--color-gray-900` footer's subtle labels fall below WCAG AA 4.5:1 — all as drawn on `6TT-0`. NOTE also (documented §9.8 exception): error cells show a danger border + danger value with NO per-cell helper row — the grid is too dense for one; the error is conveyed by border + colour + `aria-invalid`. `color-contrast` scoped off → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},b=t=>({value:t,editable:!0}),c=t=>({value:t,editable:!1}),w=t=>({value:t,editable:!0,error:!0}),x=[{id:"g1",item:"Beef Fillet",category:"Ingredient",categoryTone:"info",unit:"kg",store:b("120.0"),restaurant:c("0.0"),canteen:c("0.0"),costBuying:"580.00",totalValue:"69,600.00"},{id:"g2",item:"Beef Stew",category:"Dish (Finished)",categoryTone:"warning",unit:"portion",store:c("0.0"),restaurant:b("14.0"),canteen:c("0.0"),costBuying:"0.00 (Dish)",totalValue:"—"}],d={name:"Header + editable / non-editable / Dish row + footer — ARTBOARD 6TY-0",args:{rows:x,footerTitle:"Consolidated Day 1 Valuation",footerSegments:[{label:"Ingredients",value:"69,600.00"},{label:"Dishes",value:"0.00"},{label:"Consolidated",value:"69,600.00",tone:"success"}]},play:async({canvasElement:t})=>{const a=h(t);await i(a.getByRole("grid")).toBeInTheDocument(),await i(a.getAllByRole("columnheader")).toHaveLength(8),await i(a.getByRole("textbox",{name:"Beef Fillet — Store"})).toHaveValue("120.0"),await i(a.getByText("Consolidated")).toBeInTheDocument()}},m={name:"Cell error ⇒ danger border + danger value + aria-invalid — ARTBOARD 9TQ-0",args:{rows:[{...x[0],store:w("-4.0")}]},play:async({canvasElement:t})=>{const a=h(t).getByRole("textbox",{name:"Beef Fillet — Store"});await i(a).toHaveAttribute("aria-invalid","true");const o=a.closest("[data-invalid]");await i(o).toBeInTheDocument()}},p={name:"Editable cell focus ⇒ §9.2 accent border",args:{rows:[x[0]]},parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{focus:'input[aria-label="Beef Fillet — Store"]',assertColor:[{selector:'[role="row"]:last-child .kit-field',prop:"borderColor",token:"--color-accent"}]}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "Header + editable / non-editable / Dish row + footer — ARTBOARD 6TY-0",
  args: {
    rows: ROWS,
    footerTitle: "Consolidated Day 1 Valuation",
    footerSegments: [{
      label: "Ingredients",
      value: "69,600.00"
    }, {
      label: "Dishes",
      value: "0.00"
    }, {
      label: "Consolidated",
      value: "69,600.00",
      tone: "success"
    }]
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("grid")).toBeInTheDocument();
    await expect(c.getAllByRole("columnheader")).toHaveLength(8);
    // editable cell for Store on the Beef Fillet row
    await expect(c.getByRole("textbox", {
      name: "Beef Fillet — Store"
    })).toHaveValue("120.0");
    await expect(c.getByText("Consolidated")).toBeInTheDocument();
  }
}`,...d.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  name: "Cell error ⇒ danger border + danger value + aria-invalid — ARTBOARD 9TQ-0",
  args: {
    rows: [{
      ...ROWS[0],
      store: err("-4.0")
    }]
  },
  play: async ({
    canvasElement
  }) => {
    const input = within(canvasElement).getByRole("textbox", {
      name: "Beef Fillet — Store"
    });
    await expect(input).toHaveAttribute("aria-invalid", "true");
    const box = input.closest("[data-invalid]")!;
    await expect(box).toBeInTheDocument();
  }
}`,...m.parameters?.docs?.source}}};p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  name: "Editable cell focus ⇒ §9.2 accent border",
  args: {
    rows: [ROWS[0]]
  },
  parameters: {
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    },
    interaction: {
      focus: 'input[aria-label="Beef Fillet — Store"]',
      // the editable (non-error) cell box carries border-accent at rest and
      // on focus — assert the box's border resolves to the accent token
      assertColor: [{
        selector: '[role="row"]:last-child .kit-field',
        prop: "borderColor",
        token: "--color-accent"
      }]
    }
  }
}`,...p.parameters?.docs?.source}}};const T=["HeaderAndRows","CellError","EditableCellFocus"];export{m as CellError,p as EditableCellFocus,d as HeaderAndRows,T as __namedExportsOrder,k as default};
