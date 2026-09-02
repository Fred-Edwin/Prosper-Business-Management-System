import{j as i,c as v}from"./utils-_OH9Wn3f.js";import{F as h}from"./form-field-DkYjBilr.js";import"./iframe-sMR_UR-7.js";import"./preload-helper-PPVm8Dsz.js";function p({label:e,error:r=!1,helperText:a,required:u,disabled:m=!1,className:b,id:f,...x}){return i.jsx(h,{label:e,error:r?a||" ":void 0,hint:r?void 0:a,required:u,id:f,className:"w-[340px]",children:({id:g,"aria-describedby":y,"aria-invalid":c})=>i.jsx("div",{className:v("flex h-[72px] p-(--sp-5) rounded-sm shrink-0 border border-solid kit-field",r?"border-danger":"[border-color:var(--border-strong)]",b),"data-invalid":c||void 0,children:i.jsx("textarea",{id:g,disabled:m,"aria-describedby":y,"aria-invalid":c,className:"font-ui [color:var(--text-primary)] text-sm/sm w-full h-full resize-none bg-transparent outline-none",...x})})})}p.__docgenInfo={description:"",methods:[],displayName:"Textarea",props:{label:{required:!1,tsType:{name:"string"},description:""},error:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},helperText:{required:!1,tsType:{name:"string"},description:""},required:{required:!1,tsType:{name:"boolean"},description:""},disabled:{defaultValue:{value:"false",computed:!1},required:!1}}};const{expect:d,within:l}=__STORYBOOK_MODULE_TEST__,B={title:"Kit/Textarea",component:p,parameters:{layout:"padded",docs:{description:{component:`C4 Textarea — \`component-states.md §2 C4\`. default / focus / error / disabled.
§9.2 accent border on focus + §9.8 error pattern via <FormField>.
NOTE: like TextInput, no §9.1 keyboard ring (only .kit-field) — flagged in
the TextInput story; same design-sprint follow-up.`}}},args:{label:"Reason for adjustment",defaultValue:"Counted 2 fewer than the system after the spot check."}},t={},o={name:"Focus ⇒ §9.2 accent border",parameters:{interaction:{focus:"textarea",assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-accent"}]}}},s={name:"Error ⇒ §9.8 danger border + helper wired",args:{error:!0,helperText:"A reason is required."},parameters:{interaction:{assertColor:[{selector:".kit-field",prop:"borderColor",token:"--color-danger"}]}},play:async({canvasElement:e})=>{const r=l(e).getByRole("textbox");await d(r).toHaveAttribute("aria-invalid","true");const a=l(e).getByText("A reason is required.");await d(r).toHaveAttribute("aria-describedby",a.id)}},n={args:{disabled:!0,defaultValue:""},play:async({canvasElement:e})=>{await d(l(e).getByRole("textbox")).toBeDisabled()}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:"{}",...t.parameters?.docs?.source}}};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  name: "Focus ⇒ §9.2 accent border",
  parameters: {
    interaction: {
      focus: "textarea",
      assertColor: [{
        selector: ".kit-field",
        prop: "borderColor",
        token: "--color-accent"
      }]
    }
  }
}`,...o.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  name: "Error ⇒ §9.8 danger border + helper wired",
  args: {
    error: true,
    helperText: "A reason is required."
  },
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
    const ta = within(canvasElement).getByRole("textbox");
    await expect(ta).toHaveAttribute("aria-invalid", "true");
    const msg = within(canvasElement).getByText("A reason is required.");
    await expect(ta).toHaveAttribute("aria-describedby", msg.id);
  }
}`,...s.parameters?.docs?.source}}};n.parameters={...n.parameters,docs:{...n.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    defaultValue: ""
  },
  play: async ({
    canvasElement
  }) => {
    await expect(within(canvasElement).getByRole("textbox")).toBeDisabled();
  }
}`,...n.parameters?.docs?.source}}};const C=["Rest","FocusBorder","Error","Disabled"];export{n as Disabled,s as Error,o as FocusBorder,t as Rest,C as __namedExportsOrder,B as default};
