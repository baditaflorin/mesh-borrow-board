import { type FormEvent, useState } from "react";
import {
  MeshButton,
  MeshNameInput,
  MeshPresence,
  MeshStatusPill,
  MeshSurface,
  useExpiringClaim,
  useNamedPeer,
  useSharedCollection,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

const CLAIM_TTL = 24 * 60 * 60 * 1000;

type Item = {
  id: string;
  title: string;
  ownerId: string;
  ownerDeviceId?: string;
  ownerName?: string;
  createdAt: number;
};

type Props = { room: YRoom | null; config: MeshConfig };

export function clean(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function validItem(item: Item): boolean {
  return (
    !!item &&
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    item.title.length > 0 &&
    typeof item.ownerId === "string" &&
    (item.ownerDeviceId === undefined || typeof item.ownerDeviceId === "string") &&
    (item.ownerName === undefined || typeof item.ownerName === "string") &&
    Number.isFinite(item.createdAt)
  );
}

function peerName(id: string, get: (id: string) => string | undefined): string {
  return get(id) || `Neighbor ${id.slice(0, 5)}`;
}

function ownerName(item: Item, nameOf: (id: string) => string | undefined): string {
  return nameOf(item.ownerId) || item.ownerName || peerName(item.ownerId, nameOf);
}

function ownsItem(item: Item, room: YRoom | null): boolean {
  if (!room) return false;
  if (item.ownerDeviceId && room.deviceId) return item.ownerDeviceId === room.deviceId;
  return item.ownerId === room.peerId;
}

function itemStatus(
  owned: boolean,
  claim: { isFree: boolean; isMine: boolean; claimedBy: string | null },
  nameOf: (id: string) => string | undefined,
) {
  const borrower = claim.claimedBy ? peerName(claim.claimedBy, nameOf) : null;

  if (claim.isFree) {
    return owned
      ? { label: "Your listing", tone: "info" as const, detail: "Ready for a neighbor." }
      : { label: "Ready to borrow", tone: "success" as const, detail: "Available now." };
  }

  if (claim.isMine) {
    return {
      label: "Borrowed by you",
      tone: "live" as const,
      detail: "Return it when you are finished.",
    };
  }

  if (owned) {
    return {
      label: borrower ? `With ${borrower}` : "On loan",
      tone: "warning" as const,
      detail: "The claim releases automatically after a day.",
    };
  }

  return {
    label: "On loan",
    tone: "warning" as const,
    detail: borrower ? `Borrowed by ${borrower}.` : "This item is currently claimed.",
  };
}

function BorrowItem({
  item,
  room,
  nameOf,
}: {
  item: Item;
  room: YRoom | null;
  nameOf: (id: string) => string | undefined;
}) {
  const claim = useExpiringClaim(room, `mesh-borrow-board:item:${item.id}`, CLAIM_TTL);
  const owned = ownsItem(item, room);
  const status = itemStatus(owned, claim, nameOf);

  return (
    <li
      className="shelf-item"
      data-borrow-state={claim.isFree ? "available" : claim.isMine ? "mine" : "loaned"}
      data-ownership={owned ? "mine" : "neighbor"}
    >
      <div className="shelf-item-heading">
        <div className="shelf-item-title">
          <h3>{item.title}</h3>
          <p>{owned ? "Listed by you" : `Listed by ${ownerName(item, nameOf)}`}</p>
        </div>
        <MeshStatusPill tone={status.tone} dot>
          {status.label}
        </MeshStatusPill>
      </div>
      <p className="shelf-item-detail">{status.detail}</p>
      <div className="shelf-item-action">
        {owned ? (
          <span className="shelf-item-owner-note">
            {claim.isFree ? "Your item is on the shelf." : "Your listing is being used."}
          </span>
        ) : claim.isMine ? (
          <MeshButton type="button" variant="secondary" size="sm" onClick={claim.release}>
            Return item
          </MeshButton>
        ) : claim.isFree ? (
          <MeshButton type="button" size="sm" onClick={claim.claim} disabled={!room}>
            Borrow item
          </MeshButton>
        ) : (
          <span className="shelf-item-owner-note">Unavailable until it is returned.</span>
        )}
      </div>
    </li>
  );
}

export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const items = useSharedCollection<Item>(room, "mesh-borrow-board:items", { validate: validItem });
  const [draft, setDraft] = useState("");
  const listedItems = items.items.filter(validItem);
  const roomPeople = room ? room.peerCount + 1 : 0;

  const add = (event: FormEvent) => {
    event.preventDefault();
    const title = clean(draft);
    if (!room || !title) return;
    if (
      items.add({
        id: `${room.peerId}:${crypto.randomUUID?.() ?? Date.now()}`,
        title,
        ownerId: room.peerId,
        ownerDeviceId: room.deviceId,
        ownerName: named.name.trim() || undefined,
        createdAt: Date.now(),
      })
    ) {
      setDraft("");
    }
  };

  return (
    <main className="borrow-page">
      <section
        className={`borrow-command${listedItems.length ? " borrow-command--has-items" : ""}`}
        aria-labelledby="borrow-board-title"
      >
        <header className="borrow-intro">
          <p className="borrow-kicker">Shared neighborhood shelf</p>
          <h1 id="borrow-board-title">Borrow well. Return trust.</h1>
          <p className="borrow-intro-copy">
            A live, peer-to-peer shelf for useful things. Every item has an owner, every borrow has
            a clear status, and abandoned claims release after a day.
          </p>
          <div className="borrow-intro-signals">
            <MeshPresence
              count={roomPeople}
              label={roomPeople === 1 ? "person in this shelf" : "people in this shelf"}
              state={room ? "connected" : "connecting"}
              announce="polite"
            />
            <MeshStatusPill tone={room ? "live" : "warning"} dot announce="polite">
              {room
                ? `${listedItems.length} live ${listedItems.length === 1 ? "listing" : "listings"}`
                : "Connecting shelf"}
            </MeshStatusPill>
          </div>
          <p className="borrow-trust-note">
            No marketplace account. No central lender. Just a clear handoff.
          </p>
        </header>

        <MeshSurface
          as="section"
          tone="raised"
          padding="lg"
          className="borrow-composer"
          aria-labelledby="list-item-title"
        >
          <div className="surface-heading">
            <div>
              <p className="borrow-kicker">Make an offer</p>
              <h2 id="list-item-title">List a useful item</h2>
            </div>
            <MeshStatusPill tone="info" dot>
              You own it
            </MeshStatusPill>
          </div>
          <p className="surface-copy">
            Your name travels with the listing, so everyone knows where to return it.
          </p>
          <MeshNameInput
            label="Your name"
            value={named.name}
            onChange={named.setName}
            placeholder="Name on your listings"
            maxLength={32}
          />
          <form onSubmit={add}>
            <label htmlFor="item-title">What can people borrow?</label>
            <div className="borrow-item-form-row">
              <input
                id="item-title"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Camping stove, drill, folding table…"
                maxLength={80}
              />
              <MeshButton type="submit" fullWidth disabled={!room || !clean(draft)}>
                List item
              </MeshButton>
            </div>
          </form>
        </MeshSurface>

        <MeshSurface
          as="section"
          tone="accent"
          padding="lg"
          className="borrow-shelf"
          aria-labelledby="shelf-title"
        >
          <div className="surface-heading borrow-shelf-heading">
            <div>
              <p className="borrow-kicker">Live shelf</p>
              <h2 id="shelf-title">
                {listedItems.length ? "Ready in this room" : "The shelf is ready"}
              </h2>
            </div>
            <span className="borrow-shelf-count" aria-label={`${listedItems.length} listings`}>
              {listedItems.length}
            </span>
          </div>
          {listedItems.length ? (
            <ul className="shelf-list">
              {listedItems.map((item) => (
                <BorrowItem key={item.id} item={item} room={room} nameOf={named.nameOf} />
              ))}
            </ul>
          ) : (
            <div className="shelf-empty">
              <p>No shared items yet.</p>
              <span>Start with the thing you would happily lend for a day.</span>
            </div>
          )}
        </MeshSurface>
      </section>
    </main>
  );
}
