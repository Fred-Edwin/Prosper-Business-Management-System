import{j as e,c as t}from"./utils-_OH9Wn3f.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function u({toolbar:o,flush:a=!1,wide:n=!1,className:g,children:h}){return e.jsxs("div",{className:t("flex flex-col grow min-h-0 w-full",g),children:[o&&e.jsx("div",{className:t("sticky top-0 flex items-center gap-(--sp-4) shrink-0 min-h-(--control-lg) py-(--sp-4) bg-(--surface-page) border-b border-b-solid [border-bottom-color:var(--border-subtle)]","[z-index:var(--z-sticky)]",a?"px-(--sp-6)":"px-(--sp-8)"),children:e.jsx("div",{className:t("flex items-center gap-(--sp-4) w-full",!n&&"max-w-(--content-max) mx-auto"),children:o})}),e.jsx("div",{className:t("flex flex-col grow min-h-0 w-full",!a&&"py-(--sp-7) px-(--sp-8)"),children:e.jsx("div",{className:t("flex flex-col grow min-h-0 w-full",!n&&"max-w-(--content-max) mx-auto"),children:h})})]})}u.__docgenInfo={description:"",methods:[],displayName:"PageShell",props:{toolbar:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"Sticky toolbar content (title, filters, primary action). Omit for none."},flush:{required:!1,tsType:{name:"boolean"},description:"Remove the default inline/block page padding (edge-to-edge content).",defaultValue:{value:"false",computed:!1}},wide:{required:!1,tsType:{name:"boolean"},description:"Widen past --content-max for genuinely full-bleed screens (wide ledgers).",defaultValue:{value:"false",computed:!1}},className:{required:!1,tsType:{name:"string"},description:""},children:{required:!0,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:""}}};const{expect:p,within:b}=__STORYBOOK_MODULE_TEST__,w={title:"Kit/Primitives/PageShell — NEEDS OWNER REVIEW",component:u,parameters:{layout:"fullscreen",docs:{description:{component:`NEW primitive (Session 10 Deliverable 3d) — \`kit-audit.md §3\`, ADR-43 (DRAFT).

╔══════════════════════════════════════════════════════════════════════╗
║ OWNER SIGN-OFF NEEDED (kit-audit "Remaining gaps" #1)                 ║
║  · --content-max clamp = 1200px (the Paper admin Body frame)         ║
║  · page padding = --sp-7 block / --sp-8 inline (catalog reference)   ║
║  · sticky toolbar row: min-height --control-lg, --z-sticky,          ║
║    hairline bottom border, its content also clamped to --content-max ║
║  · \`wide\` escape hatch (full-bleed ledgers), \`flush\` (edge content)  ║
║ Session 11 adopts this in the screen rebuild — confirm before then.  ║
╚══════════════════════════════════════════════════════════════════════╝`}}}},r=()=>e.jsx("div",{style:{fontFamily:"var(--font-ui)",color:"var(--text-secondary)",border:"1px dashed var(--border-strong)",borderRadius:6,padding:16,minHeight:320},children:"Page content region — clamped to --content-max, centred."}),m=()=>e.jsxs(e.Fragment,{children:[e.jsx("h1",{style:{font:"var(--weight-semibold) var(--text-h1)/var(--leading-h1) var(--font-ui)",color:"var(--text-primary)",margin:0},children:"Product Catalog"}),e.jsx("span",{style:{marginLeft:"auto"}}),e.jsx("button",{className:"kit-interactive kit-focus-ring bg-accent text-(--text-inverse) h-(--control-md) px-(--sp-6) rounded-sm [--kit-hover-bg:var(--color-accent-hover)]",type:"button",children:"Add product"})]}),s={name:"With sticky toolbar (≥ md)",args:{toolbar:e.jsx(m,{}),children:e.jsx(r,{})},play:async({canvasElement:o})=>{const a=b(o).getByRole("heading",{level:1});await p(a).toBeInTheDocument();const n=a.closest("div.sticky");await p(n).not.toBeNull()}},l={name:"Without toolbar",args:{children:e.jsx(r,{})}},i={name:"wide (full-bleed — no --content-max clamp)",args:{toolbar:e.jsx(m,{}),children:e.jsx(r,{}),wide:!0}},c={name:"flush (no page padding)",args:{children:e.jsx(r,{}),flush:!0}},d={name:"< md viewport",args:{toolbar:e.jsx(m,{}),children:e.jsx(r,{})},globals:{viewport:{value:"mobile1",isRotated:!1}},parameters:{viewport:{defaultViewport:"mobile1"}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "With sticky toolbar (≥ md)",
  args: {
    toolbar: <Toolbar />,
    children: <Filler />
  },
  play: async ({
    canvasElement
  }) => {
    const heading = within(canvasElement).getByRole("heading", {
      level: 1
    });
    await expect(heading).toBeInTheDocument();
    // toolbar row is sticky
    const bar = heading.closest("div.sticky");
    await expect(bar).not.toBeNull();
  }
}`,...s.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Without toolbar",
  args: {
    children: <Filler />
  }
}`,...l.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "wide (full-bleed — no --content-max clamp)",
  args: {
    toolbar: <Toolbar />,
    children: <Filler />,
    wide: true
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "flush (no page padding)",
  args: {
    children: <Filler />,
    flush: true
  }
}`,...c.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "< md viewport",
  args: {
    toolbar: <Toolbar />,
    children: <Filler />
  },
  globals: {
    viewport: {
      value: "mobile1",
      isRotated: false
    }
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1"
    }
  }
}`,...d.parameters?.docs?.source}}};const y=["WithToolbar","NoToolbar","Wide","Flush","NarrowViewport"];export{c as Flush,d as NarrowViewport,l as NoToolbar,i as Wide,s as WithToolbar,y as __namedExportsOrder,w as default};
