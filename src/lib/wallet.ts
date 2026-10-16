const KEY = "run.wallet";
export const WALLET_EVENT = "run-wallet";
export const RUN_CUT = 0.1;

type Slot = { balance: number; earnings: number; owned: string[] };
type Bag = Record<string, Slot>;

function empty(): Slot {
  return { balance: 0, earnings: 0, owned: [] };
}

function readBag(): Bag {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}") as Bag;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeBag(bag: Bag) {
  localStorage.setItem(KEY, JSON.stringify(bag));
  window.dispatchEvent(new Event(WALLET_EVENT));
}

function slot(userId: string): Slot {
  const bag = readBag();
  const current = bag[userId] ?? empty();
  return {
    balance: Number(current.balance) || 0,
    earnings: Number(current.earnings) || 0,
    owned: Array.isArray(current.owned) ? current.owned : [],
  };
}

export function writeSlot(userId: string, next: Slot) {
  const bag = readBag();
  bag[userId] = {
    balance: next.balance,
    earnings: next.earnings,
    owned: next.owned,
  };
  writeBag(bag);
}

export function readBalance(userId: string): number {
  return slot(userId).balance;
}

export function readEarnings(userId: string): number {
  return slot(userId).earnings;
}

export function ownsListing(userId: string, listingId: string): boolean {
  return slot(userId).owned.includes(listingId);
}

export function addMoney(userId: string, rupees: number): number {
  const bag = readBag();
  const current = slot(userId);
  current.balance = Math.round((current.balance + rupees) * 100) / 100;
  bag[userId] = current;
  writeBag(bag);
  return current.balance;
}

export function buyListing(
  buyerId: string,
  listing: { id: string; ownerId: string; amount: number },
): "ok" | "short" {
  if (buyerId === listing.ownerId || ownsListing(buyerId, listing.id)) return "ok";
  const bag = readBag();
  const buyer = slot(buyerId);
  if (buyer.balance < listing.amount) return "short";
  buyer.balance = Math.round((buyer.balance - listing.amount) * 100) / 100;
  buyer.owned = [...buyer.owned, listing.id];
  bag[buyerId] = buyer;
  const seller = slot(listing.ownerId);
  seller.earnings = Math.round((seller.earnings + listing.amount * (1 - RUN_CUT)) * 100) / 100;
  bag[listing.ownerId] = seller;
  writeBag(bag);
  return "ok";
}
