// The help content, one HelpTopic per Admin section. Plain language, written
// for the business owner. When you change how a screen works, update its entry
// here in the same change.

import type { HelpTopic } from "./types";

export const HELP_TOPICS: HelpTopic[] = [
  // ── Dashboard ──────────────────────────────────────────────────────────
  {
    route: "/admin",
    title: "Dashboard",
    whatItIs:
      "Your morning screen and end-of-day check. The top of the page shows how the business is doing for the period you pick (today, this week, this month, or a custom range). The 'Right now' section always shows today's cash and stock position, whatever period is selected.",
    steps: [
      {
        title: "Pick the period",
        body: "Use the control at the top to switch between Today, This week, This month or a custom range. The profit figures and charts follow your choice.",
      },
      {
        title: "Check 'Needs attention'",
        body: "This lists things waiting on you — handovers not yet received, days left open, unusual entries. Tap an item to go straight to it.",
      },
      {
        title: "Review before closing the day",
        body: "Scroll to the Day Close row at the bottom. Once you're happy the day's figures are right, close it there.",
      },
    ],
    goodToKnow: [
      "Every money figure here is calculated live by adding up the underlying records. Nothing is a stored total that could drift.",
      "The 'Right now' section is always 'as of today' — it ignores the period control on purpose.",
    ],
    seeAlso: [
      { label: "Financials", route: "/admin/financials" },
      { label: "Day Close", route: "/admin/day-close" },
    ],
  },

  // ── Catalog ────────────────────────────────────────────────────────────
  {
    route: "/admin/catalog",
    title: "Catalog",
    whatItIs:
      "Your list of products and your locations (Restaurant, Canteen, Store). Products set the names, units and prices used everywhere else in the app.",
    tabs: {
      "": {
        title: "Products",
        steps: [
          {
            title: "Add or edit a product",
            body: "Use 'Add Product', or tap a row to edit. Set its name, unit (kg, pieces, etc.), category and selling price.",
          },
          {
            title: "Find a product",
            body: "Use the search box, or the kind sub-tabs to narrow the list.",
          },
        ],
        goodToKnow: [
          "Cashiers never see buying price or cost — only the selling price you set here.",
          "Changing a price affects new sales only. Past orders keep the price they were sold at.",
        ],
      },
      locations: {
        title: "Locations",
        steps: [
          {
            title: "Manage locations",
            body: "Add a location, edit its name, or deactivate one you no longer use. Deactivating hides it from new entries without deleting its history.",
          },
        ],
      },
    },
    seeAlso: [{ label: "Stock Ledger", route: "/admin/stock" }],
  },

  // ── Stock Ledger ───────────────────────────────────────────────────────
  {
    route: "/admin/stock",
    title: "Stock Ledger",
    whatItIs:
      "The full record of stock movement per product and location — what came in (purchases, production, transfers in) and what went out (kitchen use, sales, transfers out, spoilage). Opening and closing balances are worked out from these movements.",
    steps: [
      {
        title: "Choose what to look at",
        body: "Pick a date or date range at the top, and filter by location or category. A single day shows every movement; a week or month shows one summed row per product with a 'View days' drill-in.",
      },
      {
        title: "Read a row",
        body: "Each column is one type of movement. Opening plus everything in, minus everything out, equals closing.",
      },
      {
        title: "Correct a mistake",
        body: "Tap a movement cell to open the correction panel. A correction adds a new dated adjustment row — it never edits or deletes the original.",
      },
    ],
    goodToKnow: [
      "Balances are always the sum of the movement rows, never a number someone typed.",
      "Only you (Admin) can correct a movement on a day that's already closed. Staff fix their own same-day entries before close.",
      "The money figures at the top (Revenue, COGS, Gross Profit) follow the date range, not the location/category filters.",
    ],
    seeAlso: [
      { label: "Financials", route: "/admin/financials" },
      { label: "Audit trail", route: "/admin/audit-trail" },
    ],
  },

  // ── Sales ──────────────────────────────────────────────────────────────
  {
    route: "/admin/sales",
    title: "Sales",
    whatItIs:
      "Every sale, in two tabs. 'Restaurant Orders' are the individual orders cashiers take. 'Canteen Derived' are canteen sales worked out from stock counts, not entered order by order.",
    tabs: {
      "": {
        title: "Restaurant Orders",
        steps: [
          {
            title: "Filter the list",
            body: "Narrow by cashier, payment method, date, or show only corrected orders. The result count and a Reset link sit on the right.",
          },
          {
            title: "Open an order",
            body: "Tap a row to see its lines and payment. If it needs fixing, use the correction panel — it adds a correction, it doesn't overwrite the order.",
          },
        ],
        goodToKnow: [
          "Cashiers can fix their own orders only while the day is still open. After close, only you can correct them.",
          "A credit order creates a debt against the customer — repayments are handled on the Customers screen.",
        ],
      },
      derived: {
        title: "Canteen Derived",
        whatItIs:
          "Canteen sales are not entered one by one. The Canteen Attendant records a stock count, and the app treats the drop in stock since the last count as sales.",
        steps: [
          {
            title: "Check the counts",
            body: "Each row is a product with its last count time and the sales derived from it. Filter by product or date.",
          },
        ],
        goodToKnow: [
          "If sales look wrong here, the fix is usually a stock count correction, not an entry here.",
        ],
      },
    },
    seeAlso: [{ label: "Customers & Credit", route: "/admin/customers" }],
  },

  // ── Customers ──────────────────────────────────────────────────────────
  {
    route: "/admin/customers",
    title: "Customers & Credit",
    whatItIs:
      "Everyone who buys on credit, and what they owe. A balance in red means the customer owes money; 'Settled' means they're square; a green 'cr' balance means they've overpaid.",
    steps: [
      {
        title: "Add a customer",
        body: "Use 'Add customer' and enter their name and phone number.",
      },
      {
        title: "Record a repayment",
        body: "Tap a customer's row and use the repayment panel. The balance updates from the sum of their debts and repayments.",
      },
      {
        title: "See a customer's history",
        body: "Open a customer to see every credit order and repayment that makes up their balance.",
      },
    ],
    goodToKnow: [
      "A balance is always calculated from the customer's debt and repayment records — it's never a stored figure.",
      "Credit orders come from the Sales screen; you don't create debts by hand here.",
    ],
    seeAlso: [{ label: "Sales", route: "/admin/sales" }],
  },

  // ── Financials ─────────────────────────────────────────────────────────
  {
    route: "/admin/financials",
    title: "Financials",
    whatItIs:
      "Where you review the money going in and out, one type at a time. The tabs across the top are stock purchases, deliveries, handovers, expenses, owner draws and non-sale consumption. The profit statement itself lives on the Dashboard.",
    steps: [
      {
        title: "Set the period",
        body: "The range control at the top (Today / This week / This month / Custom) drives the figures and every table. The 'Debts owed' card is the exception — it's always 'as of today'.",
      },
      {
        title: "Switch tab by KPI tile",
        body: "The row of tiles under the header is also the tab switcher — tap a tile to jump to that tab.",
      },
    ],
    tabs: {
      "": {
        title: "Stock Purchases",
        steps: [
          {
            title: "Record a purchase",
            body: "Add what was bought, from whom, and the cost. Multi-item purchases are recorded as one receipt with several lines.",
          },
        ],
        goodToKnow: [
          "Purchases feed the stock ledger and the cost of goods figure. Money is always kept to the exact cent.",
        ],
      },
      deliveries: {
        title: "Deliveries",
        whatItIs:
          "Stock that has arrived. Use this to check what was delivered against what was ordered or paid for.",
      },
      handovers: {
        title: "Handovers",
        whatItIs:
          "End-of-day cash and M-Pesa reconciliation. Cashiers and the Canteen Attendant declare what they're handing over; you record what you actually received.",
        steps: [
          {
            title: "Receive a handover",
            body: "Each row shows what the staff member declared. Enter what you received in cash and M-Pesa; the app shows the variance.",
          },
          {
            title: "Read the variance",
            body: "Exact or not-yet-received shows neutral. A shortfall (less received than declared) shows red. An overage shows green.",
          },
        ],
        goodToKnow: [
          "The variance is stored on the receipt when you record it — it's not recalculated later, so it stays a true record of that day.",
          "A handover is reconciled for one day. If your range covers several days, this worksheet is for the last day of the range.",
        ],
      },
      expenses: {
        title: "Expenses",
        steps: [
          {
            title: "Record an expense",
            body: "Add what was spent, the category, and the amount. These reduce net profit for the period they fall in.",
          },
        ],
      },
      "owner-draws": {
        title: "Owner Draws",
        whatItIs:
          "Money the owner takes out of the business, and money the owner puts in. These are not expenses — they're tracked separately so profit isn't affected.",
      },
      "non-sale": {
        title: "Non-Sale Consumption",
        whatItIs:
          "Stock that left without being sold — spoilage, staff meals, and complimentary items — recorded by any staff member. This is shown as a separate figure, not mixed into normal cost of goods.",
        goodToKnow: [
          "For prepared dishes, the value here uses a percentage of the selling price as a stand-in for cost, because dishes don't have a purchase price.",
        ],
      },
    },
    seeAlso: [
      { label: "Dashboard", route: "/admin" },
      { label: "Stock Ledger", route: "/admin/stock" },
    ],
  },

  // ── Staff ──────────────────────────────────────────────────────────────
  {
    route: "/admin/staff",
    title: "Staff & Pay",
    whatItIs:
      "Your team list, daily attendance, and pay. Each tab has its own controls in the header.",
    tabs: {
      "": {
        title: "Roster",
        steps: [
          {
            title: "Add or edit staff",
            body: "Use 'Add staff' or tap a row. Set their name, role, location and daily rate.",
          },
        ],
      },
      attendance: {
        title: "Attendance",
        steps: [
          {
            title: "Mark who worked",
            body: "Pick the date (you can go back, but not forward past today) and mark each person. 'Mark all present' fills the list, then you adjust.",
          },
        ],
        goodToKnow: [
          "Attendance drives pay — a day marked present is a day owed at that person's daily rate.",
        ],
      },
      pay: {
        title: "Pay & advances",
        steps: [
          {
            title: "Choose the month",
            body: "Use the month picker in the header. Pay is worked out from attendance for that month.",
          },
          {
            title: "Record an advance or deduction",
            body: "Use the header button to log money paid early or an amount to hold back. It's applied against what's owed.",
          },
        ],
      },
    },
  },

  // ── Assets ─────────────────────────────────────────────────────────────
  {
    route: "/admin/assets",
    title: "Assets Register",
    whatItIs:
      "Equipment the business owns — name, location, purchase date, cost and condition. The Active tab is what's in use; the Archived tab is what's been retired.",
    steps: [
      {
        title: "Add an asset",
        body: "Record its name, location, purchase date, cost and condition.",
      },
      {
        title: "Update or retire one",
        body: "Tap a row to edit its condition or details. Retiring moves it to the Archived tab; it isn't deleted.",
      },
    ],
  },

  // ── Audit trail ────────────────────────────────────────────────────────
  {
    route: "/admin/audit-trail",
    title: "Audit trail",
    whatItIs:
      "A searchable log of who did what — corrections, deletions, day close and reopen, staff and pay changes. It only ever grows; nothing here can be edited.",
    steps: [
      {
        title: "Filter the log",
        body: "Use the controls to narrow by person, type of action, what was touched, or date.",
      },
      {
        title: "See what changed",
        body: "Expand a row to see the before and after values. A grouped row (like a multi-line purchase) expands to the individual entries.",
      },
      {
        title: "Show everything",
        body: "By default routine logins are hidden. Turn on 'Show everything' to include them.",
      },
    ],
  },

  // ── Day Close ──────────────────────────────────────────────────────────
  {
    route: "/admin/day-close",
    title: "Day Close",
    whatItIs:
      "Closing a business day locks its figures. After that, only you can make a correction to that day, and it's recorded as a correction rather than a silent edit.",
    steps: [
      {
        title: "Close or reopen a day",
        body: "The table shows this week, one row per day, with a switch. On = closed. Flip it either way — closing and reopening are the same gesture.",
      },
      {
        title: "Handle an older day",
        body: "A day older than this week that still needs attention shows as its own row above the table.",
      },
    ],
    goodToKnow: [
      "Reopening is deliberately quick — no confirmation step — because you'll sometimes need to reopen to fix something and close again.",
      "A day in the future can't be closed — there's nothing to close yet.",
    ],
    seeAlso: [{ label: "Audit trail", route: "/admin/audit-trail" }],
  },

  // ═══════════════════════════════════════════════════════════════════════
  //  STAFF SCREENS
  //  Phone-first. Staff only ever work "today" — there are no date pickers,
  //  and same-day entries can be fixed by the person who made them until
  //  the Admin closes the day.
  // ═══════════════════════════════════════════════════════════════════════

  // ── Cashier · Today ────────────────────────────────────────────────────
  {
    route: "/cashier",
    title: "Today",
    whatItIs:
      "Your own orders for today, newest first, with the running total for the day. This is your home screen.",
    steps: [
      {
        title: "Start a new order",
        body: "Tap 'New Order' at the bottom to take what a customer is buying.",
      },
      {
        title: "Fix an order you just took",
        body: "Tap the order in the list. While today is still open you can change it yourself. After the day is closed, only an administrator can.",
      },
    ],
    goodToKnow: [
      "You only ever see selling prices and totals — never buying price or cost.",
      "You see your own orders here, not other cashiers'.",
    ],
    seeAlso: [
      { label: "New Order", route: "/cashier/orders/new" },
      { label: "Handover", route: "/cashier/handover" },
    ],
  },

  // ── Cashier · New Order ────────────────────────────────────────────────
  {
    route: "/cashier/orders/new",
    title: "New Order",
    whatItIs:
      "Build a customer's order, then say how they're paying. Works one-handed on your phone.",
    steps: [
      {
        title: "Add items",
        body: "Search or tap the category tabs, then tap a product to add it. Use the + / − steppers to set quantities.",
      },
      {
        title: "Check out",
        body: "Tap the total bar at the bottom. Choose dine-in / takeaway / delivery and the payment method (cash, M-Pesa or credit).",
      },
      {
        title: "Credit sales",
        body: "For credit, attach a customer — search for them or add their name and phone on the spot. This creates a debt against them.",
      },
    ],
    goodToKnow: [
      "If an item doesn't have enough stock, the stepper blocks it and tells you.",
      "Prices come from the Catalog — you can't change a price here.",
    ],
    seeAlso: [{ label: "Customers", route: "/cashier/customers" }],
  },

  // ── Cashier · Order detail ─────────────────────────────────────────────
  {
    route: "/cashier/orders/[id]",
    title: "Order",
    whatItIs:
      "One order in detail. Whether you can edit it depends on whether it's yours and whether today's day is still open.",
    steps: [
      {
        title: "Edit (while it's allowed)",
        body: "If it's your order and the day is open, change the lines or the payment and tap 'Save changes'.",
      },
      {
        title: "After the day is closed",
        body: "The screen shows the order number. Give that number to an administrator — only they can correct a closed-day order, and it's recorded as a correction.",
      },
    ],
  },

  // ── Cashier · Customers ────────────────────────────────────────────────
  {
    route: "/cashier/customers",
    title: "Customers",
    whatItIs:
      "Everyone who buys on credit and what they owe. Red means they owe money; 'Settled' means they're square; a green 'cr' means they've paid ahead.",
    steps: [
      {
        title: "Find a customer",
        body: "Use the search box — name or phone.",
      },
      {
        title: "Take a repayment",
        body: "Tap a customer and record what they paid. Their balance updates straight away.",
      },
    ],
    goodToKnow: [
      "New credit customers are added during a credit order, not here.",
      "The balance is worked out from their orders and repayments — it's not a number anyone types.",
    ],
  },

  // ── Cashier / Canteen · Handover ───────────────────────────────────────
  {
    route: "/cashier/handover",
    title: "Handover",
    whatItIs:
      "At the end of your shift, declare the cash and M-Pesa you're handing over. The administrator then confirms what they received.",
    steps: [
      {
        title: "Enter your figures",
        body: "Fill in the cash amount and the M-Pesa amount and submit.",
      },
      {
        title: "Change it before it's received",
        body: "If you made a mistake, open the screen again and update it — as long as the administrator hasn't recorded it yet.",
      },
    ],
    goodToKnow: [
      "Once the administrator has recorded your handover, it locks. If it's wrong after that, ask them to correct it.",
      "Handover is today only — there's no date to pick.",
    ],
  },
  {
    route: "/canteen/handover",
    title: "Handover",
    whatItIs:
      "At the end of the day, declare the cash and M-Pesa you're handing over. The administrator then confirms what they received.",
    steps: [
      {
        title: "Enter your figures",
        body: "Fill in the cash amount and the M-Pesa amount and submit.",
      },
      {
        title: "Change it before it's received",
        body: "If you made a mistake, open the screen again and update it — as long as the administrator hasn't recorded it yet.",
      },
    ],
    goodToKnow: [
      "Once the administrator has recorded your handover, it locks. If it's wrong after that, ask them to correct it.",
    ],
  },

  // ── Cashier · Log Non-Sale ─────────────────────────────────────────────
  {
    route: "/cashier/flows/non-sale",
    title: "Log Non-Sale",
    whatItIs:
      "Record Restaurant stock that left without being sold — staff meals, spoilage or damage.",
    steps: [
      {
        title: "Pick the items",
        body: "Search and select each item, then set how much. The screen shows what's on hand.",
      },
      {
        title: "Say why",
        body: "Choose a reason (staff meal, spoilage, etc.) and add a note if it helps. Submit to record the whole list at once.",
      },
    ],
    goodToKnow: [
      "This reduces stock but is tracked separately from sales, so it doesn't look like income was lost.",
    ],
  },

  // ── Store Manager · Hub ────────────────────────────────────────────────
  {
    route: "/store-manager",
    title: "Store Hub",
    whatItIs:
      "Your home screen for the Store. Anything waiting for you — deliveries to receive, transfers coming in — shows as a banner at the top. Below that are the actions you can take and a log of today's stock movements.",
    steps: [
      {
        title: "Handle what's waiting",
        body: "Tap a delivery banner to check in what actually arrived. Tap a transfer banner to accept it, or flag it for the administrator if something's off.",
      },
      {
        title: "Record a movement",
        body: "Use the action tiles — Receive, Issue, Production, Transfer, Non-Sale — for whatever you're doing with stock.",
      },
    ],
    goodToKnow: [
      "Stock balances are always worked out by adding up movements — nothing is a stored figure.",
      "Fix a mistake the same day if you can. After the day closes, the administrator handles corrections.",
    ],
    seeAlso: [{ label: "Stock levels", route: "/store-manager/stock" }],
  },

  // ── Store Manager / Canteen · Stock levels ─────────────────────────────
  {
    route: "/store-manager/stock",
    title: "Stock Levels",
    whatItIs:
      "A stock card for each product: what you opened with today, what moved, and what you have now. A product that didn't move today still shows, so you can check it against the shelf.",
    steps: [
      {
        title: "Filter the list",
        body: "Use the pills to narrow by type of product.",
      },
      {
        title: "Read a card",
        body: "Opening, then today's movement (in or out), then closing. Opening is carried forward from yesterday's closing — it's never typed in.",
      },
    ],
  },
  {
    route: "/canteen/stock",
    title: "Stock Levels",
    whatItIs:
      "A stock card for each product: what you opened with today, what moved, and what you have now. A product that didn't move today still shows, so you can check it against the shelf.",
    steps: [
      {
        title: "Filter the list",
        body: "Use the pills to narrow by type of product.",
      },
      {
        title: "Read a card",
        body: "Opening, then today's movement (in or out), then closing. Opening is carried forward from yesterday's closing — it's never typed in.",
      },
    ],
  },

  // ── Store Manager · movement flows ────────────────────────────────────
  {
    route: "/store-manager/flows/receive",
    title: "Receive Goods",
    whatItIs:
      "Record what a supplier delivered. If the administrator already logged the purchase, the delivery shows here to match against — and a delivery can arrive short, so confirm what actually came.",
    steps: [
      {
        title: "Match or pick products",
        body: "Tap 'Match this delivery' on a waiting delivery, or search and select the products delivered.",
      },
      {
        title: "Set quantities and submit",
        body: "Enter how much of each arrived. Submit records the whole delivery and adds it to stock.",
      },
    ],
  },
  {
    route: "/store-manager/flows/issue",
    title: "Issue Ingredients",
    whatItIs:
      "Move ingredients from the Store to the Kitchen. This lowers Store stock.",
    steps: [
      {
        title: "Select ingredients",
        body: "Search the Store's ingredients and pick what's going to the kitchen. 'Avail' shows what's on hand.",
      },
      {
        title: "Set amounts and submit",
        body: "You can't issue more than is available — the row blocks it. Submit records the whole list.",
      },
    ],
  },
  {
    route: "/store-manager/flows/production",
    title: "Record Batch Production",
    whatItIs:
      "Record dishes the kitchen made. This adds finished dishes to the Restaurant.",
    steps: [
      {
        title: "Select dishes",
        body: "Search and pick the dishes produced.",
      },
      {
        title: "Set amounts and submit",
        body: "Enter how many of each were made and submit.",
      },
    ],
  },
  {
    route: "/store-manager/flows/transfer",
    title: "Transfer Stock",
    whatItIs:
      "Send sellable stock — cooked dishes and shop goods — from the Restaurant to the Canteen. The Canteen confirms it on their side.",
    steps: [
      {
        title: "Pick items and destination",
        body: "Search and select what's being sent; choose where it's going.",
      },
      {
        title: "Submit",
        body: "The transfer waits for the other side to accept. It only counts as received once they confirm.",
      },
    ],
  },
  {
    route: "/store-manager/flows/non-sale",
    title: "Log Non-Sale",
    whatItIs:
      "Record Store stock that left without being sold — spoilage, damage or staff meals.",
    steps: [
      {
        title: "Pick the items",
        body: "Search and select each item and set how much.",
      },
      {
        title: "Say why and submit",
        body: "Choose a reason, add a note if useful, and submit the whole list at once.",
      },
    ],
    goodToKnow: [
      "This reduces stock but is tracked separately from sales.",
    ],
  },

  // ── Canteen · Hub ─────────────────────────────────────────────────────
  {
    route: "/canteen",
    title: "Canteen Hub",
    whatItIs:
      "Your home screen for the Canteen. Deliveries and incoming transfers show as banners at the top. Below are the actions you can take and today's movement log.",
    steps: [
      {
        title: "Handle what's waiting",
        body: "Tap a delivery or transfer banner to review and receive it — confirm the quantities that actually arrived.",
      },
      {
        title: "Do the daily stock count",
        body: "Use the Stock Count tile. The drop in stock since your last count is what the app treats as sales.",
      },
      {
        title: "Other actions",
        body: "Receive Goods, Transfer Dispatch, Stock Levels and Non-Sale are the other tiles.",
      },
    ],
    goodToKnow: [
      "Canteen sales are not entered one by one — they come from your stock counts, so keep counts accurate and regular.",
      "Stock balances are always added up from movements, never stored.",
    ],
    seeAlso: [
      { label: "Stock Count", route: "/canteen/stock-count" },
      { label: "Handover", route: "/canteen/handover" },
    ],
  },

  // ── Canteen · Stock Count ─────────────────────────────────────────────
  {
    route: "/canteen/stock-count",
    title: "Stock Count",
    whatItIs:
      "Count what's actually left of a product. The app compares it to the last count and treats the difference as sales.",
    steps: [
      {
        title: "Pick a product",
        body: "Search or use the category tabs, then tap 'Select' on the product you're counting.",
      },
      {
        title: "Enter the count",
        body: "Set 'Counted remaining' to what's physically on the shelf. The preview shows the sales, revenue and closing stock that follows.",
      },
      {
        title: "Confirm",
        body: "Tap 'Confirm count'. If you already counted this product today, the app keeps the existing count — undo it from the hub if you need to redo it.",
      },
    ],
    goodToKnow: [
      "An accurate, honest count is what makes the sales figure right — there's no separate 'record a sale' step.",
    ],
  },

  // ── Canteen · Transfer Dispatch ──────────────────────────────────────
  {
    route: "/canteen/transfer",
    title: "Transfer Dispatch",
    whatItIs:
      "Send stock from the Canteen to the Store or Restaurant. The other side confirms what they received.",
    steps: [
      {
        title: "Pick items and destination",
        body: "Search and select what's leaving the Canteen; choose where it's going. 'Avail' shows what you can send.",
      },
      {
        title: "Submit",
        body: "The dispatch waits for the receiving side to accept. It's only received once they confirm.",
      },
    ],
  },

  // ── Canteen · Receive Transfer ───────────────────────────────────────
  {
    route: "/canteen/transfer/receive",
    title: "Receive Transfer",
    whatItIs:
      "Confirm a transfer coming into the Canteen. Each line is pre-filled with what was sent — adjust it to what actually arrived.",
    steps: [
      {
        title: "Check each line",
        body: "The stepper starts at the sent quantity. Change it if more or less arrived.",
      },
      {
        title: "Receive",
        body: "Tap Receive. Each line is added to Canteen stock at the quantity you confirmed.",
      },
    ],
  },

  // ── Canteen · Receive Goods / Non-Sale (shared flow) ─────────────────
  {
    route: "/canteen/flows/receive",
    title: "Receive Goods",
    whatItIs:
      "Record a supplier delivery that came straight to the Canteen. A delivery can arrive short, so confirm what actually came.",
    steps: [
      {
        title: "Match or pick products",
        body: "Tap 'Match this delivery' on a waiting delivery, or search and select the products delivered.",
      },
      {
        title: "Set quantities and submit",
        body: "Enter how much of each arrived and submit — it's added to Canteen stock.",
      },
    ],
  },
  {
    route: "/canteen/flows/non-sale",
    title: "Log Non-Sale",
    whatItIs:
      "Record Canteen stock that left without being sold — spoilage, damage or staff meals.",
    steps: [
      {
        title: "Pick the items",
        body: "Search and select each item and set how much.",
      },
      {
        title: "Say why and submit",
        body: "Choose a reason, add a note if useful, and submit the whole list at once.",
      },
    ],
    goodToKnow: [
      "This reduces stock but is tracked separately from sales.",
    ],
  },
];

const BY_ROUTE = new Map(HELP_TOPICS.map((t) => [t.route, t]));

const EXACT_BASES = new Set(["/admin", "/cashier", "/store-manager", "/canteen"]);

/** Does `pathname` match a topic route, treating `[seg]` in the route as a wildcard? */
function routeMatches(route: string, pathname: string): boolean {
  if (!route.includes("[")) {
    return pathname === route || pathname.startsWith(route + "/");
  }
  const rSeg = route.split("/");
  const pSeg = pathname.split("/");
  // the route may be a prefix of the path (deeper routes still resolve here)
  if (pSeg.length < rSeg.length) return false;
  return rSeg.every((seg, i) => (seg.startsWith("[") && seg.endsWith("]") ? !!pSeg[i] : seg === pSeg[i]));
}

/**
 * Resolve the help topic for a pathname. Matches the longest topic route that
 * is a prefix of the path, so nested routes (e.g. /admin/customers/abc) resolve
 * to their section. A `[seg]` in a topic route is a single-segment wildcard
 * (e.g. /cashier/orders/[id]).
 */
export function helpTopicForPath(pathname: string): HelpTopic | undefined {
  // A base route ("/admin", "/cashier", …) is the section home — match it only
  // exactly, so it doesn't out-rank a deeper topic by being a prefix.
  if (EXACT_BASES.has(pathname.replace(/\/$/, ""))) {
    return BY_ROUTE.get(pathname.replace(/\/$/, ""));
  }
  // An exact literal match always wins (so /cashier/orders/new beats the
  // /cashier/orders/[id] wildcard).
  const exact = BY_ROUTE.get(pathname.replace(/\/$/, ""));
  if (exact && !EXACT_BASES.has(exact.route)) return exact;

  let best: HelpTopic | undefined;
  for (const t of HELP_TOPICS) {
    if (EXACT_BASES.has(t.route)) continue;
    if (routeMatches(t.route, pathname)) {
      if (!best || t.route.length > best.route.length) best = t;
    }
  }
  return best;
}

/** Merge a topic's top-level section with its per-tab override. */
export function resolveHelpSection(topic: HelpTopic, tab: string | null) {
  const key = tab ?? "";
  const override = topic.tabs?.[key];
  return {
    title: override?.title ?? topic.title,
    whatItIs: override?.whatItIs ?? topic.whatItIs,
    steps: override?.steps ?? topic.steps,
    goodToKnow: override?.goodToKnow ?? topic.goodToKnow,
  };
}
