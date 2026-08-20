import { sqliteTable, text, integer, unique } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

const pk = () => text("id").primaryKey().$defaultFn(() => createId());
const now = () => integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date());

// AUTH SEAM — table exists now, wired up only after the MVP.
export const users = sqliteTable("users", {
  id: pk(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: now(),
});

export const profiles = sqliteTable("profiles", {
  id: pk(),
  // nullable until auth exists; then make it .notNull()
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: now(),
});

export const accounts = sqliteTable("accounts", {
  id: pk(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull().default("checking"), // checking|savings|credit|cash|loan|tracking
  onBudget: integer("on_budget", { mode: "boolean" }).notNull().default(true),
  closed: integer("closed", { mode: "boolean" }).notNull().default(false),
});

export const categoryGroups = sqliteTable("category_groups", {
  id: pk(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const categories = sqliteTable("categories", {
  id: pk(),
  groupId: text("group_id").notNull().references(() => categoryGroups.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const payees = sqliteTable("payees", {
  id: pk(),
  profileId: text("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
});

export const transactions = sqliteTable("transactions", {
  id: pk(),
  accountId: text("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  payeeId: text("payee_id").references(() => payees.id, { onDelete: "set null" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  amount: integer("amount").notNull(), // INTEGER CENTS (+inflow / -outflow)
  memo: text("memo"),
  cleared: text("cleared").notNull().default("uncleared"), // uncleared|cleared|reconciled
});

export const categoryMonths = sqliteTable(
  "category_months",
  {
    id: pk(),
    categoryId: text("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
    month: text("month").notNull(), // "YYYY-MM"
    assigned: integer("assigned").notNull().default(0), // INTEGER CENTS
  },
  (t) => ({ uniqCatMonth: unique().on(t.categoryId, t.month) })
);