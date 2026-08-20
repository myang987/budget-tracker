import "dotenv/config";
import { db } from "./index";
import {
  profiles,
  accounts,
  categoryGroups,
  categories,
  payees,
  transactions,
  categoryMonths,
} from "./schema";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dateInMonth(monthsAgo: number, day: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
}

async function main() {
  console.log("Clearing existing data...");
  // Delete in FK-dependency order — better-sqlite3 doesn't enforce
  // ON DELETE CASCADE unless foreign_keys pragma is on, so do it by hand.
  await db.delete(categoryMonths);
  await db.delete(transactions);
  await db.delete(payees);
  await db.delete(categories);
  await db.delete(categoryGroups);
  await db.delete(accounts);
  await db.delete(profiles);

  console.log("Seeding profile...");
  const [profile] = await db.insert(profiles).values({ name: "My Budget" }).returning();

  console.log("Seeding accounts...");
  const [checking, savings, creditCard, retirement] = await db
    .insert(accounts)
    .values([
      { profileId: profile.id, name: "Checking", type: "checking", onBudget: true },
      { profileId: profile.id, name: "Savings", type: "savings", onBudget: true },
      { profileId: profile.id, name: "Credit Card", type: "credit", onBudget: true },
      { profileId: profile.id, name: "401k", type: "tracking", onBudget: false },
    ])
    .returning();

  console.log("Seeding category groups + categories...");
  const [immediateObligations, trueExpenses, qualityOfLife] = await db
    .insert(categoryGroups)
    .values([
      { profileId: profile.id, name: "Immediate Obligations", sortOrder: 0 },
      { profileId: profile.id, name: "True Expenses", sortOrder: 1 },
      { profileId: profile.id, name: "Quality of Life", sortOrder: 2 },
    ])
    .returning();

  const [rent, electric, groceries, carMaintenance, gifts, diningOut, entertainment] =
    await db
      .insert(categories)
      .values([
        { groupId: immediateObligations.id, name: "Rent", sortOrder: 0 },
        { groupId: immediateObligations.id, name: "Electric", sortOrder: 1 },
        { groupId: immediateObligations.id, name: "Groceries", sortOrder: 2 },
        { groupId: trueExpenses.id, name: "Car Maintenance", sortOrder: 0 },
        { groupId: trueExpenses.id, name: "Gifts", sortOrder: 1 },
        { groupId: qualityOfLife.id, name: "Dining Out", sortOrder: 0 },
        { groupId: qualityOfLife.id, name: "Entertainment", sortOrder: 1 },
      ])
      .returning();

  console.log("Seeding payees...");
  const [employer, landlord, electricCo, groceryStore, restaurant, amazon] = await db
    .insert(payees)
    .values([
      { profileId: profile.id, name: "Employer" },
      { profileId: profile.id, name: "Landlord" },
      { profileId: profile.id, name: "Electric Co" },
      { profileId: profile.id, name: "Grocery Store" },
      { profileId: profile.id, name: "Local Restaurant" },
      { profileId: profile.id, name: "Amazon" },
    ])
    .returning();

  console.log("Seeding category budgets...");
  const thisMonth = monthKey(dateInMonth(0, 1));
  const lastMonth = monthKey(dateInMonth(1, 1));

  await db.insert(categoryMonths).values([
    { categoryId: rent.id, month: lastMonth, assigned: 150000 },
    { categoryId: electric.id, month: lastMonth, assigned: 8000 },
    { categoryId: groceries.id, month: lastMonth, assigned: 50000 },
    { categoryId: carMaintenance.id, month: lastMonth, assigned: 5000 },
    { categoryId: gifts.id, month: lastMonth, assigned: 2000 },
    { categoryId: diningOut.id, month: lastMonth, assigned: 15000 },
    { categoryId: entertainment.id, month: lastMonth, assigned: 5000 },

    { categoryId: rent.id, month: thisMonth, assigned: 150000 },
    { categoryId: electric.id, month: thisMonth, assigned: 9000 },
    { categoryId: groceries.id, month: thisMonth, assigned: 50000 },
    { categoryId: carMaintenance.id, month: thisMonth, assigned: 5000 },
    { categoryId: gifts.id, month: thisMonth, assigned: 2000 },
    { categoryId: diningOut.id, month: thisMonth, assigned: 15000 },
    { categoryId: entertainment.id, month: thisMonth, assigned: 5000 },
  ]);

  console.log("Seeding transactions...");
  await db.insert(transactions).values([
    // last month
    { accountId: checking.id, payeeId: employer.id, date: dateInMonth(1, 1), amount: 320000, memo: "Paycheck", cleared: "reconciled" },
    { accountId: checking.id, categoryId: rent.id, payeeId: landlord.id, date: dateInMonth(1, 1), amount: -150000, memo: "Rent", cleared: "reconciled" },
    { accountId: checking.id, categoryId: electric.id, payeeId: electricCo.id, date: dateInMonth(1, 5), amount: -7800, cleared: "reconciled" },
    { accountId: checking.id, categoryId: groceries.id, payeeId: groceryStore.id, date: dateInMonth(1, 10), amount: -12300, cleared: "reconciled" },
    { accountId: creditCard.id, categoryId: diningOut.id, payeeId: restaurant.id, date: dateInMonth(1, 14), amount: -6200, cleared: "reconciled" },
    { accountId: creditCard.id, categoryId: entertainment.id, payeeId: amazon.id, date: dateInMonth(1, 20), amount: -3499, cleared: "cleared" },

    // this month
    { accountId: checking.id, payeeId: employer.id, date: dateInMonth(0, 1), amount: 320000, memo: "Paycheck", cleared: "cleared" },
    { accountId: checking.id, categoryId: rent.id, payeeId: landlord.id, date: dateInMonth(0, 1), amount: -150000, memo: "Rent", cleared: "cleared" },
    { accountId: checking.id, categoryId: electric.id, payeeId: electricCo.id, date: dateInMonth(0, 5), amount: -8900, cleared: "cleared" },
    { accountId: checking.id, categoryId: groceries.id, payeeId: groceryStore.id, date: dateInMonth(0, 8), amount: -15600, cleared: "uncleared" },
    { accountId: creditCard.id, categoryId: diningOut.id, payeeId: restaurant.id, date: dateInMonth(0, 12), amount: -4500, cleared: "uncleared" },
    { accountId: savings.id, date: dateInMonth(0, 1), amount: 20000, memo: "Transfer to savings", cleared: "cleared" },
    { accountId: retirement.id, date: dateInMonth(0, 1), amount: 50000, memo: "Employer match", cleared: "reconciled" },
  ]);

  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
