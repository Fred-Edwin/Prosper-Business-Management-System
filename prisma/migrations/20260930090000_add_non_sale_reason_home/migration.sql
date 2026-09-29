-- Non-sale reason "home": stock the owner takes home without paying.
-- Additive enum value; existing rows are untouched.
ALTER TYPE "NonSaleReason" ADD VALUE 'home';
