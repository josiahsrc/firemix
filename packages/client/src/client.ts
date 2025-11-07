/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  arrayRemove as clientArrayRemove,
  arrayUnion as clientArrayUnion,
  increment as clientIncrement,
  collection as clientCollection,
  deleteDoc as clientDeleteDoc,
  deleteField as clientDeleteField,
  doc as clientDoc,
  type DocumentData as ClientDocumentData,
  DocumentReference as ClientDocumentReference,
  GeoPoint as ClientGeoPoint,
  getCountFromServer as clientGetCountFromServer,
  getDoc as clientGetDoc,
  getDocs as clientGetDocs,
  limit as clientLimit,
  startAfter as clientStartAfter,
  orderBy as clientOrderBy,
  query as clientQuery,
  serverTimestamp as clientServerTimestamp,
  setDoc as clientSetDoc,
  type SnapshotOptions as ClientSnapshotOptions,
  Timestamp as ClientTimestamp,
  Transaction as ClientTransaction,
  updateDoc as clientUpdateDoc,
  where as clientWhere,
  writeBatch as clientWriteBatch,
  WriteBatch as ClientWriteBatch,
  getFirestore as getClientFirestore,
  onSnapshot as onClientSnapshot,
  runTransaction as runClientTransaction,
} from "firebase/firestore";
import { Observable } from "rxjs";
import {
  firemixToFirestore,
  Firemix,
  FiremixArrayRemove,
  FiremixArrayUnion,
  FiremixBatch,
  type FiremixCount,
  FiremixDeleteField,
  FiremixGeoPoint,
  FiremixIncrement,
  type FiremixPartialWithFieldValue,
  type FiremixPath,
  type FiremixQuery,
  type FiremixResult,
  FiremixServerTimestamp,
  FiremixTimestamp,
  FiremixTransaction,
  type FiremixRealtimeDatabase,
  type FiremixRealtimeReference,
  type FiremixRealtimeSnapshot,
  type FiremixWithFieldValue,
  type DocumentData,
  type Nullable,
  getPath,
  mapFiremixQuery,
  recursiveConvert,
} from "@firemix/core";
import {
  child as clientRealtimeChild,
  DataSnapshot as ClientRealtimeDataSnapshot,
  Database as ClientRealtimeDatabase,
  DatabaseReference as ClientRealtimeDatabaseReference,
  getDatabase as getClientRealtimeDatabase,
  get as clientRealtimeGet,
  goOffline as clientRealtimeGoOffline,
  goOnline as clientRealtimeGoOnline,
  onValue as onClientRealtimeValue,
  push as clientRealtimePush,
  ref as clientRealtimeRef,
  refFromURL as clientRealtimeRefFromURL,
  remove as clientRealtimeRemove,
  set as clientRealtimeSet,
  update as clientRealtimeUpdate,
  type ThenableReference,
} from "firebase/database";

const clientSnapshotSettings: ClientSnapshotOptions = {
  serverTimestamps: "estimate",
};

const buildResult = <T extends DocumentData>(
  id: string,
  data: ClientDocumentData
): FiremixResult<T> => {
  return {
    id,
    data: clientFirestoreToFiremix(data),
  };
};

class FiremixClientTransaction extends FiremixTransaction {
  private tx: ClientTransaction;
  constructor(tx: ClientTransaction) {
    super();
    this.tx = tx;
  }
  public async get<T extends DocumentData>(
    path: FiremixPath<T>
  ): Promise<Nullable<FiremixResult<T>>> {
    const ref = await this.tx.get(getClientReference(path));
    return ref.exists()
      ? buildResult(ref.id, ref.data(clientSnapshotSettings))
      : null;
  }

  public set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): void {
    this.tx.set(getClientReference(path), firemixToFirestore(data));
  }

  public async query<T extends DocumentData>(): Promise<FiremixResult<T>[]> {
    throw new Error("Method not implemented.");
  }

  public merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.tx.set(getClientReference(path), firemixToFirestore(data), {
      merge: true,
    });
  }

  public update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.tx.update(getClientReference<T>(path), firemixToFirestore(data));
  }

  public delete<T = never>(path: FiremixPath<T>): void {
    this.tx.delete(getClientReference(path));
  }
}

const getClientReference = <T>(path: FiremixPath<T>) => {
  return clientDoc(
    getClientFirestore(),
    getPath(path)
  ) as ClientDocumentReference<T>;
};

class ClientBatch extends FiremixBatch {
  private batch: ClientWriteBatch;
  constructor(batch: ClientWriteBatch) {
    super();
    this.batch = batch;
  }

  set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): void {
    this.batch.set(getClientReference<T>(path), firemixToFirestore(data));
  }

  merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    clientSetDoc(getClientReference<T>(path), firemixToFirestore(data), { merge: true });
  }

  update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.batch.update(getClientReference<T>(path), firemixToFirestore(data));
  }

  delete<T = never>(path: FiremixPath<T>): void {
    this.batch.delete(getClientReference(path));
  }

  async commit(): Promise<void> {
    await this.batch.commit();
  }
}

class ClientRealtimeSnapshot implements FiremixRealtimeSnapshot {
  constructor(private readonly snapshot: ClientRealtimeDataSnapshot) {}

  get key(): string | null {
    return this.snapshot.key;
  }

  child(path: string): FiremixRealtimeSnapshot {
    return new ClientRealtimeSnapshot(this.snapshot.child(path));
  }

  exists(): boolean {
    return this.snapshot.exists();
  }

  val<T = unknown>(): T {
    return this.snapshot.val() as T;
  }

  forEach(
    action: (snapshot: FiremixRealtimeSnapshot) => boolean | void
  ): boolean {
    let canceled = false;
    this.snapshot.forEach((child) => {
      const result = action(new ClientRealtimeSnapshot(child));
      if (result === true) {
        canceled = true;
        return true;
      }
      return false;
    });
    return canceled;
  }

  toFirebase(): ClientRealtimeDataSnapshot {
    return this.snapshot;
  }
}

class ClientRealtimeReference implements FiremixRealtimeReference {
  constructor(private readonly reference: ClientRealtimeDatabaseReference) {}

  get key(): string | null {
    return this.reference.key;
  }

  get parent(): FiremixRealtimeReference | null {
    return this.reference.parent
      ? new ClientRealtimeReference(this.reference.parent)
      : null;
  }

  get root(): FiremixRealtimeReference {
    return new ClientRealtimeReference(this.reference.root);
  }

  child(path: string): FiremixRealtimeReference {
    return new ClientRealtimeReference(clientRealtimeChild(this.reference, path));
  }

  async get<T = unknown>(): Promise<FiremixRealtimeSnapshot<T>> {
    const snapshot = await clientRealtimeGet(this.reference);
    return new ClientRealtimeSnapshot(snapshot);
  }

  async set<T = unknown>(value: T): Promise<void> {
    await clientRealtimeSet(this.reference, value);
  }

  async update<T extends Record<string, unknown>>(value: T): Promise<void> {
    await clientRealtimeUpdate(this.reference, value);
  }

  async remove(): Promise<void> {
    await clientRealtimeRemove(this.reference);
  }

  async push<T = unknown>(value?: T): Promise<FiremixRealtimeReference> {
    const pushedRef: ThenableReference =
      value === undefined
        ? clientRealtimePush(this.reference)
        : clientRealtimePush(this.reference, value);
    if (value !== undefined) {
      await pushedRef;
    }
    return new ClientRealtimeReference(pushedRef);
  }

  onValue(
    callback: (snapshot: FiremixRealtimeSnapshot) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const unsubscribe = onClientRealtimeValue(
      this.reference,
      (snapshot) => callback(new ClientRealtimeSnapshot(snapshot)),
      errorCallback
    );
    return () => {
      unsubscribe();
    };
  }

  toFirebase(): ClientRealtimeDatabaseReference {
    return this.reference;
  }
}

class ClientRealtimeDatabaseAdapter implements FiremixRealtimeDatabase {
  constructor(private readonly db: ClientRealtimeDatabase) {}

  ref(path?: string): FiremixRealtimeReference {
    return new ClientRealtimeReference(
      clientRealtimeRef(this.db, path ?? undefined)
    );
  }

  refFromURL(url: string): FiremixRealtimeReference {
    return new ClientRealtimeReference(clientRealtimeRefFromURL(this.db, url));
  }

  goOffline(): void {
    clientRealtimeGoOffline(this.db);
  }

  goOnline(): void {
    clientRealtimeGoOnline(this.db);
  }

  toFirebase(): ClientRealtimeDatabase {
    return this.db;
  }
}

let cachedRealtimeDb: ClientRealtimeDatabaseAdapter | null = null;

export class FiremixClient extends Firemix {
  getMany<T extends DocumentData>(): Promise<Nullable<FiremixResult<T>>[]> {
    throw new Error("Method not implemented.");
  }

  watch<T extends DocumentData>(
    path: FiremixPath<T>
  ): Observable<Nullable<FiremixResult<T>>> {
    return new Observable<Nullable<FiremixResult<T>>>((subscriber) => {
      const doc = getClientReference<T>(path);
      const unsubscribe = onClientSnapshot(
        doc,
        (snapshot) => {
          if (snapshot.exists()) {
            subscriber.next(
              buildResult(snapshot.id, snapshot.data(clientSnapshotSettings))
            );
          } else {
            subscriber.next(null);
          }
        },
        (error) => {
          subscriber.error(error);
        }
      );
      return unsubscribe;
    });
  }

  watchQuery<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Observable<FiremixResult<T>[]> {
    return new Observable<FiremixResult<T>[]>((subscriber) => {
      const q = this.buildQuery(path, ...query);
      const unsubscribe = onClientSnapshot(q, (snapshots) => {
        subscriber.next(
          snapshots.docs.map((snapshot) =>
            buildResult(snapshot.id, snapshot.data(clientSnapshotSettings))
          )
        );
      });
      return unsubscribe;
    });
  }

  timestamp(seconds: number, nanoseconds: number): FiremixTimestamp {
    return new FiremixClientTimestamp(new ClientTimestamp(seconds, nanoseconds));
  }

  geoPoint(latitude: number, longitude: number): FiremixGeoPoint {
    return new FiremixClientGeoPoint(new ClientGeoPoint(latitude, longitude));
  }

  arrayUnion(...values: unknown[]): FiremixArrayUnion {
    return new FiremixClientArrayUnion(values);
  }

  increment(value: number): FiremixIncrement {
    return new FiremixClientIncrement(value);
  }

  arrayRemove(...values: unknown[]): FiremixArrayRemove {
    return new FiremixClientArrayRemove(values);
  }

  now(): FiremixTimestamp {
    return new FiremixClientTimestamp(ClientTimestamp.now());
  }

  timestampFromDate(date: Date): FiremixTimestamp {
    return new FiremixClientTimestamp(ClientTimestamp.fromDate(date));
  }

  timestampFromMillis(millis: number): FiremixTimestamp {
    return new FiremixClientTimestamp(ClientTimestamp.fromMillis(millis));
  }

  serverTimestamp(): FiremixServerTimestamp {
    return new FiremixClientServerTimestamp();
  }

  deleteField(): FiremixDeleteField {
    return new FiremixClientDeleteField();
  }

  id(): string {
    return clientDoc(clientCollection(getClientFirestore(), "doesnt-matter"))
      .id;
  }

  async merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): Promise<void> {
    await clientSetDoc(getClientReference<T>(path), firemixToFirestore(data), { merge: true });
  }

  async update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): Promise<void> {
    return clientUpdateDoc(getClientReference<T>(path), firemixToFirestore(data));
  }

  async delete<T = never>(path: FiremixPath<T>): Promise<void> {
    await clientDeleteDoc(getClientReference(path));
  }

  async count<T = never>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixCount> {
    const q = this.buildQuery(path, ...query);
    const c = await clientGetCountFromServer(q);
    return { total: c.data().count };
  }

  private buildQuery<T>(path: FiremixPath<T>, ...query: FiremixQuery[]) {
    const convertedQuery = query.map((v) => {
      return mapFiremixQuery(v, {
        onConstraint: ([, field, op, value]) =>
          clientWhere(field, op, firemixToFirestore(value)),
        onOrdering: ([, field, direction]) => clientOrderBy(field, direction),
        onLimit: ([, limit]) => clientLimit(limit),
        onStartAfter: ([, field]) => clientStartAfter(field),
      });
    });

    const c = clientCollection(getClientFirestore(), getPath(path));
    return clientQuery(c, ...convertedQuery);
  }

  async query<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixResult<T>[]> {
    const q = this.buildQuery(path, ...query);
    const snaps = await clientGetDocs(q);
    return snaps.docs.map((snap) =>
      buildResult(snap.id, snap.data(clientSnapshotSettings))
    );
  }

  async transaction<R = void>(
    fn: (tx: FiremixTransaction) => Promise<R>
  ): Promise<R> {
    return runClientTransaction(getClientFirestore(), async (tx) => {
      return fn(new FiremixClientTransaction(tx));
    });
  }

  batch(): FiremixBatch {
    return new ClientBatch(clientWriteBatch(getClientFirestore()));
  }

  realtime(): FiremixRealtimeDatabase {
    if (!cachedRealtimeDb) {
      cachedRealtimeDb = new ClientRealtimeDatabaseAdapter(
        getClientRealtimeDatabase()
      );
    }
    return cachedRealtimeDb;
  }

  async set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): Promise<void> {
    await clientSetDoc(getClientReference<T>(path), firemixToFirestore(data));
  }

  async get<T extends DocumentData>(
    path: FiremixPath<T>
  ): Promise<Nullable<FiremixResult<T>>> {
    const res = await clientGetDoc(getClientReference<T>(path));
    if (!res.exists()) {
      return null;
    }

    return buildResult(res.id, res.data(clientSnapshotSettings));
  }
}

class FiremixClientTimestamp extends FiremixTimestamp {
  constructor(timestamp: ClientTimestamp) {
    super(timestamp.seconds, timestamp.nanoseconds);
  }

  private get timestamp() {
    return new ClientTimestamp(this.seconds, this.nanoseconds);
  }

  toDate(): Date {
    return this.timestamp.toDate();
  }

  toMillis(): number {
    return this.timestamp.toMillis();
  }

  toFirebase(): any {
    return this.timestamp;
  }

  valueOf(): string {
    return this.timestamp.toDate().toISOString();
  }
}

class FiremixClientGeoPoint extends FiremixGeoPoint {
  constructor(geoPoint: ClientGeoPoint) {
    super(geoPoint.latitude, geoPoint.longitude);
  }

  private get geoPoint() {
    return new ClientGeoPoint(this.latitude, this.longitude);
  }

  toFirebase(): any {
    return this.geoPoint;
  }
}

class FiremixClientArrayUnion extends FiremixArrayUnion {
  toFirebase(): any {
    return clientArrayUnion(...this.values);
  }
}

class FiremixClientIncrement extends FiremixIncrement {
  toFirebase(): any {
    return clientIncrement(this.value);
  }
}

class FiremixClientArrayRemove extends FiremixArrayRemove {
  toFirebase(): any {
    return clientArrayRemove(...this.values);
  }
}

class FiremixClientServerTimestamp extends FiremixServerTimestamp {
  toFirebase(): any {
    return clientServerTimestamp();
  }
}

class FiremixClientDeleteField extends FiremixDeleteField {
  toFirebase(): any {
    return clientDeleteField();
  }
}

export const clientFirestoreToFiremix = (data: any) => {
  return recursiveConvert(data, (value) => {
    if (value instanceof ClientTimestamp) {
      return [true, new FiremixClientTimestamp(value)];
    } else if (value instanceof ClientGeoPoint) {
      return [true, new FiremixClientGeoPoint(value)];
    }
    return [false, value];
  });
};
