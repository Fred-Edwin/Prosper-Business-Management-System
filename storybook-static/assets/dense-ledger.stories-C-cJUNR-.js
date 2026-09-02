import{j as t,c}from"./utils-_OH9Wn3f.js";import{r as O}from"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const j=[["product","Product","grow min-w-[140px]",!1],["opening","Opening","w-[90px]",!0],["purchases","Purchases (+)","w-[100px]",!0],["issues","Issues (-)","w-[90px]",!0],["production","Production (+)","w-[100px]",!0],["transferIn","Transfer In (+)","w-[110px]",!0],["transferOut","Transfer Out (-)","w-[120px]",!0],["sold","Sold (-)","w-[80px]",!0],["soldValue","Sold Value","w-[100px]",!0],["closing","Closing","w-[90px]",!0],["closingValue","Closing Value","w-[110px]",!0]],I=new Set(["closing","closingValue"]);function L(e){return e.dash?"[color:var(--text-tertiary)]":e.tone==="success"?"text-success":e.tone==="danger"?"text-danger":"[color:var(--text-primary)]"}function D({cell:e,colKey:n,widthCls:a,numeric:u,onClick:p,label:B}){const f=c("font-mono text-sm/micro shrink-0",I.has(n)?"font-(--weight-semibold)":"font-(--weight-regular)",a,u&&"text-right flex justify-end flex-wrap",L(e),e.corrected&&"underline [text-decoration-thickness:1px] underline-offset-2"),m=e.dash?"—":e.value;return p?t.jsx("button",{type:"button",onClick:p,"aria-label":B,className:c(f,"kit-interactive kit-focus-ring cursor-pointer bg-transparent"),children:m}):t.jsx("div",{className:f,children:m})}function N({rows:e,totals:n,emptyMessage:a="No movements recorded for this filter.",showLocation:u=!1,horizontalScroll:p=!1,loading:B=!1,loadingRows:f=3,onCellClick:m,className:S}){const x=p?"w-max min-w-full":"[width:100%]";return t.jsxs("div",{className:c("[font-synthesis:none] flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)] antialiased",S),children:[t.jsxs("div",{className:c("flex items-center h-[32px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600",x),children:[u&&t.jsx("div",{className:"w-[100px] shrink-0 font-ui font-(--weight-semibold) [letter-spacing:var(--tracking-caps)] uppercase inline-block text-info text-caption/micro",children:"Location"}),j.map(([o,i,l,g])=>t.jsx("div",{className:c("font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info shrink-0",l,g&&"text-right flex justify-end flex-wrap"),children:i},o)),t.jsx("div",{className:"w-[50px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase shrink-0 justify-start leading-[12px] text-info",children:"Edit"})]}),B?Array.from({length:f}).map((o,i)=>t.jsx("div",{className:c("flex items-center h-[38px] px-(--sp-6) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]",x),children:t.jsx("div",{className:"kit-skeleton h-[12px] w-full"})},i)):e.length===0?t.jsx("div",{className:"flex items-center h-[38px] px-(--sp-6) [width:100%] justify-center py-(--sp-7) shrink-0",children:t.jsx("div",{className:"font-ui font-(--weight-medium) min-w-[0px] text-center flex justify-center flex-wrap [color:var(--text-tertiary)] text-sm/micro",children:a})}):e.map(o=>t.jsxs("div",{className:c("flex items-center h-[38px] px-(--sp-6) gap-(--sp-5) shrink-0 border-b border-b-solid [border-bottom-color:var(--border-subtle)]",m&&"kit-row",x),children:[u&&t.jsx("div",{className:"w-[100px] shrink-0 font-ui inline-block [color:var(--text-secondary)] text-sm/sm",children:o.location}),t.jsx("div",{className:"font-ui font-(--weight-medium) grow min-w-[140px] [color:var(--text-primary)] text-sm/micro",children:o.product}),j.slice(1).map(([i,l,g,E])=>t.jsx(D,{cell:o[i],colKey:i,widthCls:g,numeric:E,label:`Correct ${l} for ${o.product}`,onClick:m?()=>m(o.id,i):void 0},i)),t.jsx("div",{className:"w-[50px] font-ui font-(--weight-medium) shrink-0 justify-start text-accent text-sm/micro",children:"Edit"})]},o.id)),n&&t.jsxs("div",{className:c("flex items-center h-[36px] px-(--sp-6) gap-(--sp-5) shrink-0 bg-gray-900",x),children:[u&&t.jsx("div",{className:"w-[100px] shrink-0"}),t.jsx("div",{className:"font-ui font-(--weight-semibold) grow min-w-[140px] text-(--text-inverse) text-sm/micro",children:n.label}),j.slice(1).map(([o,,i])=>{const l=n[o],g=l.tone==="success"?"text-success":l.tone==="danger"?"text-danger":"text-(--text-inverse)";return t.jsx("div",{className:c("font-ui font-(--weight-semibold) text-sm/micro text-right shrink-0 flex justify-end flex-wrap",i,g),children:l.dash?"—":l.value},o)}),t.jsx("div",{className:"w-[50px] font-ui font-(--weight-semibold) shrink-0 justify-start text-transparent text-sm/micro",children:"Edit"})]})]})}N.__docgenInfo={description:"",methods:[],displayName:"DenseLedger",props:{rows:{required:!0,tsType:{name:"Array",elements:[{name:"LedgerRow"}],raw:"LedgerRow[]"},description:""},totals:{required:!1,tsType:{name:"LedgerTotals"},description:""},emptyMessage:{required:!1,tsType:{name:"string"},description:"",defaultValue:{value:'"No movements recorded for this filter."',computed:!1}},loading:{required:!1,tsType:{name:"boolean"},description:"Render N `.kit-skeleton` rows instead of data (§9.10).",defaultValue:{value:"false",computed:!1}},loadingRows:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"3",computed:!1}},showLocation:{required:!1,tsType:{name:"boolean"},description:'When true, a leading Location column (`w-[100px]`) is rendered before Product, using\n`LedgerRow.location`. The Admin Stock ledger screens set this (ADR-37a); the base\ncatalog/reconciliation usages leave it off. Header label = "Location".',defaultValue:{value:"false",computed:!1}},horizontalScroll:{required:!1,tsType:{name:"boolean"},description:"When true, rows/header/footer are laid out `w-max min-w-full` so the table scrolls\nhorizontally inside its own `overflow-x-auto` wrapper instead of squashing to\n`[width:100%]`. The Admin Stock ledger screens set this.",defaultValue:{value:"false",computed:!1}},onCellClick:{required:!1,tsType:{name:"signature",type:"function",raw:"(rowId: string, columnKey: string) => void",signature:{arguments:[{type:{name:"string"},name:"rowId"},{type:{name:"string"},name:"columnKey"}],return:{name:"void"}}},description:"Called with (rowId, columnKey) when a data cell is clicked (correction target)."},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:d,userEvent:A,within:T}=__STORYBOOK_MODULE_TEST__,_={title:"Kit/DenseLedger",component:N,parameters:{layout:"fullscreen",docs:{description:{component:"FLAG (systemic semantic-colour + dimmed text contrast — Session 10c): `text-success` / `text-danger` movement values, the `--text-tertiary` dash / empty-row line, and the `--color-gray-900` footer's tone values fall below WCAG AA 4.5:1 — all as drawn on `6ET-0`. The mono value + sign is the primary cue. `color-contrast` scoped off → design-sprint decision."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}},s={dash:!0},r=(e,n,a)=>({value:e,tone:n,corrected:a}),C=[{id:"r1",product:"Beef Fillet",opening:r("120.0"),purchases:r("40.0","success"),issues:r("-18.5","danger"),production:s,transferIn:s,transferOut:r("-12.0","danger"),sold:s,soldValue:s,closing:r("129.5"),closingValue:r("64,750")},{id:"r2",product:"Cooking Oil",opening:r("80.0"),purchases:r("40.0","success"),issues:r("-22.0","danger",!0),production:s,transferIn:s,transferOut:s,sold:s,soldValue:s,closing:r("98.0"),closingValue:r("29,400")}],R={label:"Totals reconciled",opening:r("200.0"),purchases:r("80.0","success"),issues:r("-40.5","danger"),production:s,transferIn:s,transferOut:r("-12.0","danger"),sold:s,soldValue:s,closing:r("227.5"),closingValue:r("94,150")},h={name:"Header + data rows + sticky footer — ARTBOARD 6FR-0",args:{rows:C,totals:R},play:async({canvasElement:e})=>{const n=T(e);await d(n.getByText("Product")).toBeInTheDocument(),await d(n.getByText("Beef Fillet")).toBeInTheDocument(),await d(n.getByText("Totals reconciled")).toBeInTheDocument(),await d(n.queryByRole("button")).toBeNull()}},w={name:"Corrected cell ⇒ semantic colour + 1px underline (ADR-36a, no chip)",args:{rows:C,totals:R},play:async({canvasElement:e})=>{const n=T(e).getByText("-22.0"),a=getComputedStyle(n);await d(a.textDecorationLine).toContain("underline")}},y={name:"Row hover ⇒ §9.3 --surface-hover (only when onCellClick)",args:{rows:C,onCellClick:()=>{}},parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{hover:".kit-row",assertColor:[{selector:".kit-row",prop:"backgroundColor",token:"--surface-hover"}]}}},v={name:"Clickable cells are <button>, Enter fires onCellClick(rowId, colKey)",args:{rows:C},render:e=>{const[n,a]=O.useState("none");return t.jsxs("div",{children:[t.jsx(N,{...e,onCellClick:(u,p)=>a(`${u}:${p}`)}),t.jsx("p",{"data-testid":"hit",children:n})]})},play:async({canvasElement:e})=>{const n=T(e);n.getByRole("button",{name:"Correct Issues (-) for Beef Fillet"}).focus(),await A.keyboard("{Enter}"),await d(n.getByTestId("hit")).toHaveTextContent("r1:issues")}},b={name:"Empty ⇒ single centred tertiary line",args:{rows:[],emptyMessage:"No movements recorded for this filter."},play:async({canvasElement:e})=>{await d(T(e).getByText("No movements recorded for this filter.")).toBeInTheDocument()}},k={name:"Loading ⇒ §9.10 skeleton rows",args:{rows:[],loading:!0},play:async({canvasElement:e})=>{await d(e.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0)}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: "Header + data rows + sticky footer — ARTBOARD 6FR-0",
  args: {
    rows: ROWS,
    totals: TOTALS
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Product")).toBeInTheDocument();
    await expect(c.getByText("Beef Fillet")).toBeInTheDocument();
    await expect(c.getByText("Totals reconciled")).toBeInTheDocument();
    // not clickable → no buttons
    await expect(c.queryByRole("button")).toBeNull();
  }
}`,...h.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  name: "Corrected cell ⇒ semantic colour + 1px underline (ADR-36a, no chip)",
  args: {
    rows: ROWS,
    totals: TOTALS
  },
  play: async ({
    canvasElement
  }) => {
    // the corrected Issues value for Cooking Oil
    const corrected = within(canvasElement).getByText("-22.0");
    const cs = getComputedStyle(corrected);
    await expect(cs.textDecorationLine).toContain("underline");
  }
}`,...w.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Row hover ⇒ §9.3 --surface-hover (only when onCellClick)",
  args: {
    rows: ROWS,
    onCellClick: () => {}
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
      hover: ".kit-row",
      assertColor: [{
        selector: ".kit-row",
        prop: "backgroundColor",
        token: "--surface-hover"
      }]
    }
  }
}`,...y.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "Clickable cells are <button>, Enter fires onCellClick(rowId, colKey)",
  args: {
    rows: ROWS
  },
  render: args => {
    const [hit, setHit] = React.useState<string>("none");
    return <div>
        <DenseLedger {...args} onCellClick={(r, k) => setHit(\`\${r}:\${k}\`)} />
        <p data-testid="hit">{hit}</p>
      </div>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", {
      name: "Correct Issues (-) for Beef Fillet"
    });
    btn.focus();
    await userEvent.keyboard("{Enter}");
    await expect(c.getByTestId("hit")).toHaveTextContent("r1:issues");
  }
}`,...v.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: "Empty ⇒ single centred tertiary line",
  args: {
    rows: [],
    emptyMessage: "No movements recorded for this filter."
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByText("No movements recorded for this filter.")).toBeInTheDocument();
  }
}`,...b.parameters?.docs?.source}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  name: "Loading ⇒ §9.10 skeleton rows",
  args: {
    rows: [],
    loading: true
  },
  play: async ({
    canvasElement
  }) => {
    await expect(canvasElement.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  }
}`,...k.parameters?.docs?.source}}};const K=["HeaderRowsFooter","CorrectedCell","RowHoverClickable","KeyboardOperableCells","Empty","Loading"];export{w as CorrectedCell,b as Empty,h as HeaderRowsFooter,v as KeyboardOperableCells,k as Loading,y as RowHoverClickable,K as __namedExportsOrder,_ as default};
