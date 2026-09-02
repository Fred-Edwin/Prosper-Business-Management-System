import{j as o}from"./utils-_OH9Wn3f.js";import{S as c}from"./spinner-RChkOJRi.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";const{expect:r,within:i}=__STORYBOOK_MODULE_TEST__,u={title:"Kit/Primitives/Spinner",component:c,parameters:{layout:"centered",docs:{description:{component:'NEW primitive (Session 10 Deliverable 3d) — `kit-audit.md §3`.\nMechanical wrapper over the existing `.kit-spinner` §9.10 CSS + `role="status"`\n+ a visually-hidden label. No Paper artboard. ADR-43 treats it as accepted;\nthis story is the visible proof.'}}},args:{size:"sm",label:"Loading"},argTypes:{size:{control:"inline-radio",options:["sm","md"]}}},e={play:async({canvasElement:s})=>{const n=i(s).getByRole("status");await r(n).toBeInTheDocument(),await r(n).toHaveClass("kit-spinner"),await r(i(n).getByText("Loading")).toBeInTheDocument()}},a={name:"Size md (--icon-md)",args:{size:"md"}},t={name:"On a dark surface (currentColor)",parameters:{backgrounds:{default:"nav-bg"}},render:s=>o.jsx("span",{style:{color:"#FFFFFF"},children:o.jsx(c,{...s})})};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const status = within(canvasElement).getByRole("status");
    await expect(status).toBeInTheDocument();
    await expect(status).toHaveClass("kit-spinner");
    // visually-hidden label present for SR users
    await expect(within(status).getByText("Loading")).toBeInTheDocument();
  }
}`,...e.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  name: "Size md (--icon-md)",
  args: {
    size: "md"
  }
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  name: "On a dark surface (currentColor)",
  parameters: {
    backgrounds: {
      default: "nav-bg"
    }
  },
  render: args => <span style={{
    color: "#FFFFFF"
  }}>
      <Spinner {...args} />
    </span>
}`,...t.parameters?.docs?.source}}};const g=["Rest","SizeMd","OnDark"];export{t as OnDark,e as Rest,a as SizeMd,g as __namedExportsOrder,u as default};
