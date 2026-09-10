// Shared helper for the staff-facing item pickers (Cashier New Order,
// Canteen Stock Count, the SM/Canteen MovementPickerFlow, the SM/Canteen
// Stock Levels view). The client asked for a category filter row on every
// screen where staff scroll a long list to add items (2026-09-10 feedback).
//
// `Product.category` is a free-text, optional column (schema §Product) —
// it has always existed and powers the C2 / K1 category tabs. This module
// derives the tab/pill set from whatever categories the in-scope products
// actually carry, so a new category in the Catalog shows up on the pickers
// with no code change. Items with no category fall under a single
// "Uncategorised" bucket and are never hidden.

/** The bucket key + label for products whose `category` is `null`/blank. */
export const UNCATEGORISED_KEY = "__uncat__";
export const UNCATEGORISED_LABEL = "Uncategorised";

/** The always-present "show everything" tab. */
export const ALL_CATEGORIES_KEY = "all";

export type CategoryTab = { key: string; label: string };

type HasCategory = { category?: string | null };

/**
 * Normalise a product's `category` to the key the tab row filters on:
 * a trimmed non-empty string stays itself; `null` / `""` / whitespace
 * collapse to `UNCATEGORISED_KEY`.
 */
export function categoryKey(product: HasCategory): string {
  const c = product.category?.trim();
  return c && c.length > 0 ? c : UNCATEGORISED_KEY;
}

/**
 * Build the category tab row for a set of products: `All` first, then one
 * tab per distinct category in first-seen order, then `Uncategorised`
 * last if some — but not all — products are uncategorised. Returns just
 * `[All]` when no product carries a category (an all-Uncategorised row is
 * the same list as `All`, so there is nothing to filter); callers hide
 * the row entirely when `length <= 1`.
 */
export function buildCategoryTabs(products: HasCategory[]): CategoryTab[] {
  const seen = new Set<string>();
  let hasUncat = false;
  const named: string[] = [];
  for (const p of products) {
    const key = categoryKey(p);
    if (key === UNCATEGORISED_KEY) {
      hasUncat = true;
      continue;
    }
    if (!seen.has(key)) {
      seen.add(key);
      named.push(key);
    }
  }
  const tabs: CategoryTab[] = [{ key: ALL_CATEGORIES_KEY, label: "All" }];
  for (const key of named) tabs.push({ key, label: key });
  // Only worth an "Uncategorised" tab when it partitions the list — i.e.
  // there is at least one named category to sit beside it.
  if (hasUncat && named.length > 0) {
    tabs.push({ key: UNCATEGORISED_KEY, label: UNCATEGORISED_LABEL });
  }
  return tabs;
}

/**
 * `true` if `product` belongs under the tab keyed `activeKey`. `all`
 * matches everything; otherwise the product's normalised category must
 * equal the key.
 */
export function matchesCategory(
  product: HasCategory,
  activeKey: string,
): boolean {
  if (activeKey === ALL_CATEGORIES_KEY) return true;
  return categoryKey(product) === activeKey;
}

/**
 * Distinct category strings currently in use across `products`, trimmed,
 * de-duplicated, first-seen order — for the Catalog drawer's autocomplete
 * `<datalist>`. Excludes the empty/uncategorised bucket (nothing to
 * suggest).
 */
export function usedCategoryNames(products: HasCategory[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of products) {
    const c = p.category?.trim();
    if (!c || seen.has(c)) continue;
    seen.add(c);
    out.push(c);
  }
  return out;
}
