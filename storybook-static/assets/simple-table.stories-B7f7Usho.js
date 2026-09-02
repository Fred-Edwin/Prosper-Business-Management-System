import{j as n,c as l}from"./utils-_OH9Wn3f.js";import{r as j}from"./iframe-sMR_UR-7.js";import{E as H}from"./empty-state-DAojvcOU.js";import"./preload-helper-PPVm8Dsz.js";import"./button-CREOhNf_.js";import"./spinner-RChkOJRi.js";const K=n.jsx("div",{className:"w-[24px] shrink-0 flex justify-end","aria-hidden":!0,children:n.jsx("svg",{width:"16",height:"16",viewBox:"0 0 24 24",xmlns:"http://www.w3.org/2000/svg",style:{flexShrink:0},children:n.jsx("polyline",{points:"9 18 15 12 9 6",fill:"none",stroke:"var(--text-tertiary)",strokeWidth:"1.5",strokeLinecap:"round",strokeLinejoin:"round"})})}),q={text:"font-ui [color:var(--text-secondary)] text-sm/sm",strong:"font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm",mono:"font-mono [color:var(--text-secondary)] text-sm/sm",accent:"font-ui font-(--weight-medium) text-accent text-sm/sm"};function f({columns:e,rows:t,rowKey:r,onRowClick:s,rowLabel:m,loading:A=!1,loadingRows:C=3,emptyState:E,sort:R,onSort:T,rowChevron:L=!1,className:O}){const N=L&&!!s;return n.jsxs("div",{role:"table",className:l("[font-synthesis:none] flex flex-col [width:100%] border border-solid [border-color:var(--border-subtle)] antialiased",O),children:[n.jsxs("div",{role:"row",className:"flex items-center h-[32px] px-(--sp-6) gap-(--sp-6) shrink-0 bg-info-bg border-b border-b-solid border-b-gray-600",children:[e.map(a=>{const c=R?.key===a.key,u=l("font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info shrink-0",a.width,a.align==="right"&&"text-right flex justify-end flex-wrap");return a.sortable&&T?n.jsx("div",{role:"columnheader","aria-sort":c?R.direction==="asc"?"ascending":"descending":"none",className:l(u,"p-0"),children:n.jsxs("button",{type:"button",onClick:()=>T(a.key),className:"kit-interactive kit-focus-ring inline-flex items-center gap-[4px] font-ui font-(--weight-semibold) text-[10px] [letter-spacing:var(--tracking-caps)] uppercase leading-[12px] text-info",children:[a.header,n.jsx("span",{"aria-hidden":!0,className:"[color:var(--text-tertiary)]",children:c?R.direction==="asc"?"▲":"▼":"↕"})]})},a.key):n.jsx("div",{role:"columnheader",className:u,children:a.header},a.key)}),N&&n.jsx("div",{className:"w-[24px] shrink-0","aria-hidden":!0})]}),A?Array.from({length:C}).map((a,c)=>n.jsx("div",{role:"row",className:l("flex items-center h-[44px] px-(--sp-6) shrink-0",c<C-1&&"border-b border-b-solid [border-bottom-color:var(--border-subtle)]"),children:n.jsx("div",{role:"cell",className:"kit-skeleton h-[14px] w-full"})},c)):t.length===0?E?n.jsx("div",{role:"row",children:n.jsx("div",{role:"cell",className:"p-(--sp-8)",children:n.jsx(H,{...E})})}):n.jsx("div",{role:"row",className:"flex items-center justify-center h-[44px] px-(--sp-6) shrink-0",children:n.jsx("div",{role:"cell",className:"font-ui [color:var(--text-tertiary)] text-sm/sm",children:"No records"})}):t.map((a,c)=>{const u=e.map(i=>n.jsx("div",{role:"cell",className:l("shrink-0",i.width,q[i.cell??"text"],i.align==="right"&&"text-right flex justify-end flex-wrap"),children:i.render(a)},i.key)),B=l("flex items-center h-[44px] px-(--sp-6) gap-(--sp-6) shrink-0 [width:100%] text-left",c<t.length-1&&"border-b border-b-solid [border-bottom-color:var(--border-subtle)]");return s?n.jsxs("div",{role:"row","aria-label":m?.(a),tabIndex:0,onClick:()=>s(a),onKeyDown:i=>{(i.key==="Enter"||i.key===" ")&&(i.preventDefault(),s(a))},className:l(B,"kit-row kit-focus-ring cursor-pointer"),children:[u,N&&K]},r(a)):n.jsx("div",{role:"row",className:B,children:u},r(a))})]})}f.__docgenInfo={description:"",methods:[],displayName:"SimpleTable",props:{columns:{required:!0,tsType:{name:"Array",elements:[{name:"SimpleTableColumn",elements:[{name:"Row"}],raw:"SimpleTableColumn<Row>"}],raw:"SimpleTableColumn<Row>[]"},description:""},rows:{required:!0,tsType:{name:"Array",elements:[{name:"Row"}],raw:"Row[]"},description:""},rowKey:{required:!0,tsType:{name:"signature",type:"function",raw:"(row: Row) => string",signature:{arguments:[{type:{name:"Row"},name:"row"}],return:{name:"string"}}},description:""},onRowClick:{required:!1,tsType:{name:"signature",type:"function",raw:"(row: Row) => void",signature:{arguments:[{type:{name:"Row"},name:"row"}],return:{name:"void"}}},description:""},rowLabel:{required:!1,tsType:{name:"signature",type:"function",raw:"(row: Row) => string",signature:{arguments:[{type:{name:"Row"},name:"row"}],return:{name:"string"}}},description:"Accessible name for each clickable row (e.g. r => `Edit ${r.name}`)."},loading:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},loadingRows:{required:!1,tsType:{name:"number"},description:"",defaultValue:{value:"3",computed:!1}},emptyState:{required:!1,tsType:{name:"EmptyStateProps"},description:"Shown when `rows` is empty and not loading."},sort:{required:!1,tsType:{name:"signature",type:"object",raw:'{ key: string; direction: "asc" | "desc" }',signature:{properties:[{key:"key",value:{name:"string",required:!0}},{key:"direction",value:{name:"union",raw:'"asc" | "desc"',elements:[{name:"literal",value:'"asc"'},{name:"literal",value:'"desc"'}],required:!0}}]}},description:""},onSort:{required:!1,tsType:{name:"signature",type:"function",raw:"(key: string) => void",signature:{arguments:[{type:{name:"string"},name:"key"}],return:{name:"void"}}},description:""},rowChevron:{required:!1,tsType:{name:"boolean"},description:"Render a trailing `›` chevron on each clickable row (and a matching header\nspacer). Opt-in — off by default and only active when `onRowClick` is set.",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:o,userEvent:S,within:p}=__STORYBOOK_MODULE_TEST__,d=[{key:"name",header:"Asset",width:"w-[180px]",cell:"strong",render:e=>e.name},{key:"location",header:"Location",width:"w-[120px]",render:e=>e.location},{key:"condition",header:"Condition",width:"w-[120px]",render:e=>e.condition}],w=[{id:"a1",name:"Chest Freezer",location:"Store",condition:"Good"},{id:"a2",name:"Deep Fryer",location:"Kitchen",condition:"Needs Repair"},{id:"a3",name:"Prep Table",location:"Kitchen",condition:"Good"}],W={title:"Kit/SimpleTable",component:f,parameters:{layout:"padded"}},y={name:"Header + body rows (non-clickable) — ARTBOARD 6EY-0",args:{columns:d,rows:w,rowKey:e=>e.id},play:async({canvasElement:e})=>{const t=p(e);await o(t.getByRole("table")).toBeInTheDocument(),await o(t.getAllByRole("columnheader")).toHaveLength(3),await o(t.queryByRole("button")).toBeNull()}},g={name:"Row hover ⇒ §9.3 --surface-hover (clickable rows only)",args:{columns:d,rows:w,rowKey:e=>e.id,onRowClick:()=>{},rowLabel:e=>`Edit ${e.name}`},parameters:{interaction:{hover:".kit-row",assertColor:[{selector:".kit-row",prop:"backgroundColor",token:"--surface-hover"}]}}},h={name:"Clickable rows are role=row, Enter/Space activate",parameters:{visual:{disable:!0}},args:{columns:d,rows:w,rowKey:e=>e.id,rowLabel:e=>`Edit ${e.name}`},render:e=>{const[t,r]=j.useState(null);return n.jsxs("div",{children:[n.jsx(f,{...e,onRowClick:s=>r(s.name)}),n.jsx("p",{"data-testid":"opened",children:t??"none"})]})},play:async({canvasElement:e})=>{const t=p(e),r=t.getByRole("row",{name:"Edit Deep Fryer"});await o(r).toHaveAttribute("tabindex","0"),r.focus(),await o(r).toHaveFocus(),await S.keyboard("{Enter}"),await o(t.getByTestId("opened")).toHaveTextContent("Deep Fryer"),r.focus(),await S.keyboard(" "),await o(t.getByTestId("opened")).toHaveTextContent("Deep Fryer")}},b={name:"rowChevron ⇒ trailing › on clickable rows + header spacer (M2 6b)",args:{columns:d,rows:w,rowKey:e=>e.id,onRowClick:()=>{},rowLabel:e=>`Open ${e.name}`,rowChevron:!0},play:async({canvasElement:e})=>{const t=p(e),r=t.getAllByRole("row",{name:/^Open /});await o(r).toHaveLength(3);for(const m of r)await o(m.querySelector("svg polyline")).toBeInTheDocument();const s=t.getAllByRole("row")[0];await o(s.lastElementChild).toHaveClass("w-[24px]")}},v={name:"Empty ⇒ <EmptyState> slot",args:{columns:d,rows:[],rowKey:e=>e.id,emptyState:{title:"No assets yet",description:"Register your first asset to start tracking condition.",actionLabel:"Add asset"}},play:async({canvasElement:e})=>{await o(p(e).getByRole("status")).toHaveTextContent("No assets yet")}},x={name:"Loading ⇒ §9.10 skeleton rows",args:{columns:d,rows:[],rowKey:e=>e.id,loading:!0},play:async({canvasElement:e})=>{await o(e.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0)}},k={name:"Sortable header ⇒ aria-sort toggles",parameters:{visual:{disable:!0}},args:{columns:d.map(e=>e.key==="name"?{...e,sortable:!0}:e),rows:w,rowKey:e=>e.id},render:e=>{const[t,r]=j.useState({key:"name",direction:"asc"});return n.jsx(f,{...e,sort:t,onSort:s=>r(m=>({key:s,direction:m.key===s&&m.direction==="asc"?"desc":"asc"}))})},play:async({canvasElement:e})=>{const r=p(e).getByRole("columnheader",{name:/Asset/});await o(r).toHaveAttribute("aria-sort","ascending"),await S.click(p(r).getByRole("button")),await o(r).toHaveAttribute("aria-sort","descending")}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Header + body rows (non-clickable) — ARTBOARD 6EY-0",
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: r => r.id
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table")).toBeInTheDocument();
    await expect(c.getAllByRole("columnheader")).toHaveLength(3);
    // non-clickable rows are not buttons / not tab stops
    await expect(c.queryByRole("button")).toBeNull();
  }
}`,...y.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "Row hover ⇒ §9.3 --surface-hover (clickable rows only)",
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: r => r.id,
    onRowClick: () => {},
    rowLabel: r => \`Edit \${r.name}\`
  },
  parameters: {
    interaction: {
      hover: ".kit-row",
      assertColor: [{
        selector: ".kit-row",
        prop: "backgroundColor",
        token: "--surface-hover"
      }]
    }
  }
}`,...g.parameters?.docs?.source}}};h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  name: "Clickable rows are role=row, Enter/Space activate",
  parameters: {
    visual: {
      disable: true
    }
  },
  // play focuses a row → not a pixel baseline
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: r => r.id,
    rowLabel: r => \`Edit \${r.name}\`
  },
  render: args => {
    const [opened, setOpened] = React.useState<string | null>(null);
    return <div>
        <SimpleTable {...args} onRowClick={r => setOpened(r.name)} />
        <p data-testid="opened">{opened ?? "none"}</p>
      </div>;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const row = c.getByRole("row", {
      name: "Edit Deep Fryer"
    });
    // clickable row: focusable role="row" with Enter/Space activation
    // (ARIA-valid — role="row" is not allowed on a native <button>)
    await expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await expect(row).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(c.getByTestId("opened")).toHaveTextContent("Deep Fryer");
    // Space also activates
    row.focus();
    await userEvent.keyboard(" ");
    await expect(c.getByTestId("opened")).toHaveTextContent("Deep Fryer");
  }
}`,...h.parameters?.docs?.source}}};b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  name: "rowChevron ⇒ trailing › on clickable rows + header spacer (M2 6b)",
  args: {
    columns: COLUMNS,
    rows: ROWS,
    rowKey: r => r.id,
    onRowClick: () => {},
    rowLabel: r => \`Open \${r.name}\`,
    rowChevron: true
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // one chevron slot per clickable body row (header spacer carries no svg)
    const rows = c.getAllByRole("row", {
      name: /^Open /
    });
    await expect(rows).toHaveLength(3);
    for (const row of rows) {
      await expect(row.querySelector("svg polyline")).toBeInTheDocument();
    }
    // header row gained a matching fixed-width spacer so lanes stay aligned
    const header = c.getAllByRole("row")[0];
    await expect(header.lastElementChild).toHaveClass("w-[24px]");
  }
}`,...b.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  name: "Empty ⇒ <EmptyState> slot",
  args: {
    columns: COLUMNS,
    rows: [],
    rowKey: r => r.id,
    emptyState: {
      title: "No assets yet",
      description: "Register your first asset to start tracking condition.",
      actionLabel: "Add asset"
    }
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("status")).toHaveTextContent("No assets yet");
  }
}`,...v.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: "Loading ⇒ §9.10 skeleton rows",
  args: {
    columns: COLUMNS,
    rows: [],
    rowKey: r => r.id,
    loading: true
  },
  play: async ({
    canvasElement
  }) => {
    await expect(canvasElement.querySelectorAll(".kit-skeleton").length).toBeGreaterThan(0);
  }
}`,...x.parameters?.docs?.source}}};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  name: "Sortable header ⇒ aria-sort toggles",
  parameters: {
    visual: {
      disable: true
    }
  },
  // play clicks/focuses the header
  args: {
    columns: COLUMNS.map(c => c.key === "name" ? {
      ...c,
      sortable: true
    } : c),
    rows: ROWS,
    rowKey: r => r.id
  },
  render: args => {
    const [sort, setSort] = React.useState<{
      key: string;
      direction: "asc" | "desc";
    }>({
      key: "name",
      direction: "asc"
    });
    return <SimpleTable {...args} sort={sort} onSort={key => setSort(s => ({
      key,
      direction: s.key === key && s.direction === "asc" ? "desc" : "asc"
    }))} />;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    const header = c.getByRole("columnheader", {
      name: /Asset/
    });
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    await userEvent.click(within(header).getByRole("button"));
    await expect(header).toHaveAttribute("aria-sort", "descending");
  }
}`,...k.parameters?.docs?.source}}};const $=["HeaderAndRows","RowHover","ClickableRowsKeyboard","RowChevron","Empty","Loading","Sortable"];export{h as ClickableRowsKeyboard,v as Empty,y as HeaderAndRows,x as Loading,b as RowChevron,g as RowHover,k as Sortable,$ as __namedExportsOrder,W as default};
