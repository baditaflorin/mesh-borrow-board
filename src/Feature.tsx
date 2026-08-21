import { useState } from "react";
import {
  MeshNameInput,
  useExpiringClaim,
  useNamedPeer,
  useSharedCollection,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

const CLAIM_TTL = 24 * 60 * 60 * 1000;
type Item = { id: string; title: string; ownerId: string; createdAt: number };
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
    Number.isFinite(item.createdAt)
  );
}
function name(id: string, get: (id: string) => string | undefined) {
  return get(id) || `Neighbor ${id.slice(0, 5)}`;
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
  const owned = item.ownerId === room?.peerId;
  return (
    <li className="item-card">
      <div className="item-top">
        <div>
          <strong>{item.title}</strong>
          <small>offered by {name(item.ownerId, nameOf)}</small>
        </div>
        <span
          className={
            claim.isFree ? "status available" : claim.isMine ? "status mine" : "status borrowed"
          }
        >
          {claim.isFree ? "available" : claim.isMine ? "with you" : "borrowed"}
        </span>
      </div>
      <p>
        {claim.isFree
          ? "Take it for a day. The claim expires automatically if the borrower disappears."
          : claim.isMine
            ? "You are the only browser allowed to return this item early."
            : "This item is currently claimed. It becomes available again when returned or when its claim expires."}
      </p>
      {!owned &&
        (claim.isMine ? (
          <button className="quiet" onClick={claim.release}>
            Return item
          </button>
        ) : (
          <button className="primary" onClick={claim.claim} disabled={!claim.isFree || !room}>
            Borrow item
          </button>
        ))}
    </li>
  );
}

export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const items = useSharedCollection<Item>(room, "mesh-borrow-board:items", { validate: validItem });
  const [draft, setDraft] = useState("");
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const title = clean(draft);
    if (!room || !title) return;
    if (
      items.add({
        id: `${room.peerId}:${crypto.randomUUID?.() ?? Date.now()}`,
        title,
        ownerId: room.peerId,
        createdAt: Date.now(),
      })
    )
      setDraft("");
  };
  return (
    <main className="borrow-page">
      <section className="hero">
        <div>
          <p className="eyebrow">Mesh Borrow Board</p>
          <h1>Borrow useful things, without a middleman.</h1>
          <p>
            A small lending shelf for neighbours, friends, and events. Claims are peer-to-peer and
            automatically expire after a day.
          </p>
        </div>
        <span className="count">
          {items.items.filter(validItem).length}
          <small>listed</small>
        </span>
      </section>
      <section className="layout">
        <section className="panel add-panel">
          <p className="eyebrow">List something</p>
          <h2>Put an item on the shelf</h2>
          <MeshNameInput
            label="Your name"
            value={named.name}
            onChange={named.setName}
            placeholder="Name on your listings"
            maxLength={32}
          />
          <form onSubmit={add}>
            <label htmlFor="item">Item name</label>
            <div>
              <input
                id="item"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Camping stove, drill, folding table…"
                maxLength={80}
              />
              <button className="primary" disabled={!room || !clean(draft)}>
                List item
              </button>
            </div>
          </form>
        </section>
        <section className="panel shelf" aria-labelledby="shelf">
          <p className="eyebrow">Shared shelf</p>
          <h2 id="shelf">
            {items.items.length ? "Available around this room" : "Nothing listed yet"}
          </h2>
          {items.items.filter(validItem).length ? (
            <ul>
              {items.items.filter(validItem).map((item) => (
                <BorrowItem key={item.id} item={item} room={room} nameOf={named.nameOf} />
              ))}
            </ul>
          ) : (
            <p className="empty">List something that could make someone else’s day easier.</p>
          )}
        </section>
      </section>
    </main>
  );
}
