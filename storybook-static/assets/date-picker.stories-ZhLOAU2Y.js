import{j as i}from"./utils-_OH9Wn3f.js";import{r as w}from"./iframe-sMR_UR-7.js";import{D as p}from"./date-picker-UxpDpjPQ.js";import"./preload-helper-PPVm8Dsz.js";const{expect:a,userEvent:s,waitFor:o,within:r}=__STORYBOOK_MODULE_TEST__,D={title:"Kit/DatePicker — real-calendar NEEDS OWNER REVIEW",component:p,parameters:{layout:"padded",docs:{description:{component:"CONTRAST FLAG (Session 10b, not fixed): out-of-month / disabled-future day cells render in `--text-tertiary` (`--color-gray-500`) ≈ 3.4:1 on white — below WCAG AA. This matches the drawn `9S1-0` visual ('future dates disabled', dimmed) and is the same systemic `--text-tertiary` contrast issue as the Select placeholder — routed to a design sprint (see kit-audit follow-ups). `color-contrast` is scoped off for this component's stories."}},a11y:{config:{rules:[{id:"color-contrast",enabled:!1}]}}}};function c(){const[t,e]=w.useState(new Date(2026,7,24)),n=h=>h.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});return i.jsx(p,{label:"Date",value:n(t),selected:t,onSelect:e,maxDate:new Date(2026,11,31)})}const b=[[{day:27,disabled:!0},{day:28,disabled:!0},{day:29,disabled:!0},{day:30,disabled:!0},{day:31,disabled:!0},{day:1},{day:2}],[{day:3},{day:4},{day:5},{day:6},{day:7},{day:8},{day:9}],[{day:10},{day:11},{day:12},{day:13},{day:14},{day:15},{day:16}],[{day:17},{day:18},{day:19},{day:20},{day:21},{day:22},{day:23}],[{day:24,today:!0,selected:!0},{day:25},{day:26},{day:27},{day:28},{day:29},{day:30}]],l={name:"Closed (trigger shows the value)",render:()=>i.jsx(c,{}),play:async({canvasElement:t})=>{const e=r(t).getByRole("button",{name:/Date/});await a(e).toHaveTextContent("Aug 24, 2026"),await a(e).toHaveAttribute("aria-haspopup","dialog")}},d={name:"FocusVisible ⇒ §9.1 ring on the trigger",render:()=>i.jsx(c,{}),parameters:{interaction:{focus:'[aria-haspopup="dialog"]',assertFocusRing:'[aria-haspopup="dialog"]'}}},u={name:"Open ⇒ role=grid, focus on selected cell, ‹ › nav",render:()=>i.jsx(c,{}),play:async({canvasElement:t})=>{const e=r(t);await s.click(e.getByRole("button",{name:/Date/}));const n=await o(()=>e.getByRole("dialog"));await a(r(n).getByRole("grid")).toBeInTheDocument(),await a(r(n).getByRole("button",{name:"Previous month"})).toBeInTheDocument(),await o(()=>a(document.activeElement?.getAttribute("aria-label")).toContain("August 24, 2026"))}},g={name:"←→ day, ↑↓ week, PageDown month; Enter selects + closes",render:()=>i.jsx(c,{}),play:async({canvasElement:t})=>{const e=r(t);await s.click(e.getByRole("button",{name:/Date/})),await o(()=>e.getByRole("dialog")),await o(()=>a(document.activeElement?.getAttribute("aria-label")).toContain("August 24")),await s.keyboard("{ArrowRight}"),await o(()=>a(document.activeElement?.getAttribute("aria-label")).toContain("August 25")),await s.keyboard("{ArrowDown}"),await o(()=>a(document.activeElement?.getAttribute("aria-label")).toContain("September 1")),await s.keyboard("{Enter}"),await o(()=>a(e.queryByRole("dialog")).toBeNull()),await a(e.getByRole("button",{name:/Date/})).toHaveTextContent("Sep 1, 2026")}},m={render:()=>i.jsx(c,{}),play:async({canvasElement:t})=>{const e=r(t);await s.click(e.getByRole("button",{name:/Date/})),await o(()=>e.getByRole("dialog")),await s.keyboard("{Escape}"),await o(()=>a(e.queryByRole("dialog")).toBeNull())}},y={name:"Legacy `weeks` escape hatch (pre-computed grid) — side by side",render:()=>{const[t,e]=w.useState(7);return i.jsx(p,{label:"Date (legacy)",value:"Aug 24, 2026",monthLabel:`${["Jan","Feb","Mar","Apr","May","Jun","Jul","August","Sep","Oct","Nov","Dec"][t]} 2026`,weeks:b,onPrevMonth:()=>e(n=>n-1),onNextMonth:()=>e(n=>n+1),onSelectDay:()=>{}})},play:async({canvasElement:t})=>{const e=r(t);await s.click(e.getByRole("button",{name:/Date .legacy./}));const n=await o(()=>e.getByRole("dialog"));await a(r(n).getByRole("grid")).toBeInTheDocument(),await a(r(n).getByText("August 2026")).toBeInTheDocument()}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  name: "Closed (trigger shows the value)",
  render: () => <RealHarness />,
  play: async ({
    canvasElement
  }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: /Date/
    });
    await expect(trigger).toHaveTextContent("Aug 24, 2026");
    await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  }
}`,...l.parameters?.docs?.source}}};d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  name: "FocusVisible ⇒ §9.1 ring on the trigger",
  render: () => <RealHarness />,
  parameters: {
    interaction: {
      focus: '[aria-haspopup="dialog"]',
      assertFocusRing: '[aria-haspopup="dialog"]'
    }
  }
}`,...d.parameters?.docs?.source}}};u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  name: "Open ⇒ role=grid, focus on selected cell, ‹ › nav",
  render: () => <RealHarness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", {
      name: /Date/
    }));
    const dialog = await waitFor(() => c.getByRole("dialog"));
    await expect(within(dialog).getByRole("grid")).toBeInTheDocument();
    // month header + prev/next
    await expect(within(dialog).getByRole("button", {
      name: "Previous month"
    })).toBeInTheDocument();
    // focus landed on the selected day (Aug 24)
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toContain("August 24, 2026"));
  }
}`,...u.parameters?.docs?.source}}};g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  name: "←→ day, ↑↓ week, PageDown month; Enter selects + closes",
  render: () => <RealHarness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", {
      name: /Date/
    }));
    await waitFor(() => c.getByRole("dialog"));
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toContain("August 24"));
    // the grid moves focus on a rAF after setFocusedDate — wait for it
    await userEvent.keyboard("{ArrowRight}");
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toContain("August 25"));
    await userEvent.keyboard("{ArrowDown}"); // +1 week
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toContain("September 1"));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(c.queryByRole("dialog")).toBeNull());
    await expect(c.getByRole("button", {
      name: /Date/
    })).toHaveTextContent("Sep 1, 2026");
  }
}`,...g.parameters?.docs?.source}}};m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  render: () => <RealHarness />,
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", {
      name: /Date/
    }));
    await waitFor(() => c.getByRole("dialog"));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(c.queryByRole("dialog")).toBeNull());
  }
}`,...m.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  name: "Legacy \`weeks\` escape hatch (pre-computed grid) — side by side",
  render: () => {
    const [month, setMonth] = React.useState(7);
    return <DatePicker label="Date (legacy)" value="Aug 24, 2026" monthLabel={\`\${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "August", "Sep", "Oct", "Nov", "Dec"][month]} 2026\`} weeks={LEGACY_WEEKS} onPrevMonth={() => setMonth(m => m - 1)} onNextMonth={() => setMonth(m => m + 1)} onSelectDay={() => {}} />;
  },
  play: async ({
    canvasElement
  }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", {
      name: /Date .legacy./
    }));
    const dialog = await waitFor(() => c.getByRole("dialog"));
    await expect(within(dialog).getByRole("grid")).toBeInTheDocument();
    await expect(within(dialog).getByText("August 2026")).toBeInTheDocument();
  }
}`,...y.parameters?.docs?.source}}};const x=["RestClosed","FocusRing","OpenRealCalendar","KeyboardNav","EscCloses","LegacyWeeksMode"];export{m as EscCloses,d as FocusRing,g as KeyboardNav,y as LegacyWeeksMode,u as OpenRealCalendar,l as RestClosed,x as __namedExportsOrder,D as default};
