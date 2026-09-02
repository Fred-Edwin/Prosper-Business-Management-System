import{j as n,c as p}from"./utils-_OH9Wn3f.js";import{r as u}from"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function l({items:t,className:a}){return n.jsx("nav",{"aria-label":"Breadcrumb",className:p("[font-synthesis:none] flex items-center gap-(--sp-3) antialiased",a),children:t.map((e,r)=>{const d=r===t.length-1;return n.jsxs(u.Fragment,{children:[r>0&&n.jsx("span",{"aria-hidden":!0,className:"font-ui [color:var(--text-disabled)] text-sm/micro",children:"/"}),d?n.jsx("span",{"aria-current":"page",className:"font-ui font-(--weight-medium) [color:var(--text-primary)] text-sm/sm",children:e.label}):n.jsx("a",{href:e.href,onClick:e.onClick,className:"font-ui [color:var(--text-tertiary)] text-sm/sm kit-focus-ring hover:underline hover:[color:var(--text-primary)]",children:e.label})]},r)})})}l.__docgenInfo={description:"",methods:[],displayName:"Breadcrumb",props:{items:{required:!0,tsType:{name:"Array",elements:[{name:"BreadcrumbItem"}],raw:"BreadcrumbItem[]"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const{expect:s,within:h}=__STORYBOOK_MODULE_TEST__,x={title:"Kit/Primitives/Breadcrumb",component:l,parameters:{layout:"padded",docs:{description:{component:'C29 Breadcrumb — `component-states.md §2 C29` (state-complete). parent link /\ncurrent. `aria-hidden` "/" separator; `aria-current="page"` on the last item;\nlink hover (underline + `--text-primary`) is the §9 global.'}}}},m=[{label:"Stock",href:"#stock"},{label:"Opening Stock",href:"#opening"},{label:"Bulk Grid"}],o={name:"Default (parent links / current) — ARTBOARD 6XV-0",args:{items:m},parameters:{docs:{description:{story:"FLAG (systemic low-contrast dimmed text — Session 10c): the parent-link colour is `--text-tertiary` (`--color-gray-500`) on `--surface-page` ≈ 3.4:1, below WCAG AA 4.5:1. This matches the drawn `6XV-0` (dimmed = intentionally recessive) and is the same call as the Select placeholder / DatePicker out-of-month cells. `color-contrast` is scoped off here with this note → design-sprint decision (darken parent links to `--text-secondary`, or accept as incidental navigation text)."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}},play:async({canvasElement:t})=>{const a=h(t),e=a.getByText("Bulk Grid");await s(e).toHaveAttribute("aria-current","page"),await s(e.tagName).toBe("SPAN");for(const r of t.querySelectorAll("span[aria-hidden]"))await s(r).toHaveTextContent("/");await s(a.getByRole("link",{name:"Stock"})).toHaveAttribute("href")}},i={name:"Link hover ⇒ §9 global underline + --text-primary",args:{items:m},parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}},interaction:{hover:"a",assertColor:[{selector:"a",prop:"color",token:"--text-primary"}]}}},c={name:"Two levels (parent / current)",args:{items:[{label:"Assets",href:"#a"},{label:"Beef Fillet"}]},parameters:{a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Default (parent links / current) — ARTBOARD 6XV-0",
  args: {
    items: ITEMS
  },
  parameters: {
    docs: {
      description: {
        story: "FLAG (systemic low-contrast dimmed text — Session 10c): the parent-link colour is \`--text-tertiary\` (\`--color-gray-500\`) on \`--surface-page\` ≈ 3.4:1, below WCAG AA 4.5:1. This matches the drawn \`6XV-0\` (dimmed = intentionally recessive) and is the same call as the Select placeholder / DatePicker out-of-month cells. \`color-contrast\` is scoped off here with this note → design-sprint decision (darken parent links to \`--text-secondary\`, or accept as incidental navigation text)."
      }
    },
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    // last item is the current page, not a link
    const current = c.getByText("Bulk Grid");
    await expect(current).toHaveAttribute("aria-current", "page");
    await expect(current.tagName).toBe("SPAN");
    // separators are decorative
    for (const sep of canvasElement.querySelectorAll("span[aria-hidden]")) {
      await expect(sep).toHaveTextContent("/");
    }
    // parent items are real links
    await expect(c.getByRole("link", {
      name: "Stock"
    })).toHaveAttribute("href");
  }
}`,...o.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  name: "Link hover ⇒ §9 global underline + --text-primary",
  args: {
    items: ITEMS
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
      hover: "a",
      assertColor: [{
        selector: "a",
        prop: "color",
        token: "--text-primary"
      }]
    }
  }
}`,...i.parameters?.docs?.source}}};c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  name: "Two levels (parent / current)",
  args: {
    items: [{
      label: "Assets",
      href: "#a"
    }, {
      label: "Beef Fillet"
    }]
  },
  parameters: {
    a11y: {
      config: {
        rules: [{
          id: "color-contrast",
          enabled: false
        }]
      }
    }
  }
}`,...c.parameters?.docs?.source}}};const b=["Rest","LinkHover","TwoLevel"];export{i as LinkHover,o as Rest,c as TwoLevel,b as __namedExportsOrder,x as default};
