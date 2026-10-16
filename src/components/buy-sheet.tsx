import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { readBalance, RUN_CUT, WALLET_EVENT, writeSlot } from "@/lib/wallet";
import { addTestMoney, purchaseListing } from "@/lib/ledger-api";

export function BuySheet({
  buyerId,
  listingId,
  sellerId,
  title,
  amount,
  onClose,
  onBought,
}: {
  buyerId: string | null;
  listingId: string;
  sellerId: string;
  title: string;
  amount: number;
  onClose: () => void;
  onBought: () => void;
}) {
  const [balance, setBalance] = useState(buyerId ? readBalance(buyerId) : 0);
  const [note, setNote] = useState("");

  useEffect(() => {
    function sync() {
      if (buyerId) setBalance(readBalance(buyerId));
    }
    sync();
    window.addEventListener(WALLET_EVENT, sync);
    return () => window.removeEventListener(WALLET_EVENT, sync);
  }, [buyerId]);

  function pay() {
    if (!buyerId) return;
    void purchaseListing({ data: listingId })
      .then((result) => {
        writeSlot(buyerId, { balance: result.ledger.balance, earnings: result.ledger.earnings, owned: result.ledger.owned });
        setBalance(result.ledger.balance);
        if (!result.ok) {
          setNote("Not enough in your wallet.");
          return;
        }
        onBought();
      })
      .catch(() => setNote("Could not complete the payment."));
  }

  const body = (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/60 sm:place-items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Buy ${title}`}
        className="w-full max-w-md rounded-t-3xl bg-card px-4 pt-4 pb-safe sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Buy</h2>
          <button type="button" aria-label="Close" onClick={onClose} className="grid size-9 place-items-center">
            <X className="size-5" strokeWidth={1.75} />
          </button>
        </div>
        <p className="mt-3 text-sm">{title}</p>
        <p className="mt-1 text-2xl font-semibold">₹{amount}</p>
        <p className="mt-2 text-sm text-muted">You pay Run. The seller cannot add their own payment link. Run keeps {Math.round(RUN_CUT * 100)}%.</p>
        {buyerId ? (
          <>
            <p className="mt-3 text-sm text-muted">Wallet ₹{balance}</p>
            {balance < amount ? (
              <div className="mt-3 flex gap-2">
                {[100, 500].map((rupees) => (
                  <button
                    key={rupees}
                    type="button"
                    onClick={() => {
                      void addTestMoney({ data: rupees })
                        .then((row) => {
                          writeSlot(buyerId, { balance: row.balance, earnings: row.earnings, owned: row.owned });
                          setBalance(row.balance);
                          setNote("Test money added. Real payment is not live yet.");
                        })
                        .catch(() => setNote("Could not add money."));
                    }}
                    className="h-10 flex-1 rounded-full text-sm ring-1 ring-line"
                  >
                    Add ₹{rupees}
                  </button>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={pay} disabled={balance < amount} className="mt-4 h-11 w-full rounded-full bg-fg text-sm font-medium text-bg disabled:opacity-40">
              Pay ₹{amount}
            </button>
          </>
        ) : (
          <Link to="/login" className="mt-4 grid h-11 place-items-center rounded-full bg-fg text-sm font-medium text-bg">
            Sign in to buy
          </Link>
        )}
        {note ? <p className="mt-3 text-sm text-muted">{note}</p> : null}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
