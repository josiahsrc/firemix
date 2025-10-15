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
  b2f,
  Blaze,
  BlazeArrayRemove,
  BlazeArrayUnion,
  BlazeBatch,
  type BlazeCount,
  BlazeDeleteField,
  BlazeGeoPoint,
  BlazeIncrement,
  type BlazePartialWithFieldValue,
  type BlazePath,
  type BlazeQuery,
  type BlazeResult,
  BlazeServerTimestamp,
  BlazeTimestamp,
  BlazeTransaction,
  type BlazeWithFieldValue,
  type DocumentData,
  getPath,
  mapBlazeQuery,
  recursiveConvert,
} from "./base";
import type { Nullable } from "./utils";

const clientSnapshotSettings: ClientSnapshotOptions = {
  serverTimestamps: "estimate",
};

const buildResult = <T extends DocumentData>(
  id: string,
  data: ClientDocumentData
): BlazeResult<T> => {
  return {
    id,
    data: clientF2B(data),
  };
};

class BlazeClientTransaction extends BlazeTransaction {
  private tx: ClientTransaction;
  constructor(tx: ClientTransaction) {
    super();
    this.tx = tx;
  }
  public async get<T extends DocumentData>(
    path: BlazePath<T>
  ): Promise<Nullable<BlazeResult<T>>> {
    const ref = await this.tx.get(getClientReference(path));
    return ref.exists()
      ? buildResult(ref.id, ref.data(clientSnapshotSettings))
      : null;
  }

  public set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): void {
    this.tx.set(getClientReference(path), b2f(data));
  }

  public async query<T extends DocumentData>(): Promise<BlazeResult<T>[]> {
    throw new Error("Method not implemented.");
  }

  public merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.tx.set(getClientReference(path), b2f(data), {
      merge: true,
    });
  }

  public update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.tx.update(getClientReference<T>(path), b2f(data));
  }

  public delete<T = never>(path: BlazePath<T>): void {
    this.tx.delete(getClientReference(path));
  }
}

const getClientReference = <T>(path: BlazePath<T>) => {
  return clientDoc(
    getClientFirestore(),
    getPath(path)
  ) as ClientDocumentReference<T>;
};

class ClientBatch extends BlazeBatch {
  private batch: ClientWriteBatch;
  constructor(batch: ClientWriteBatch) {
    super();
    this.batch = batch;
  }

  set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): void {
    this.batch.set(getClientReference<T>(path), b2f(data));
  }

  merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    clientSetDoc(getClientReference<T>(path), b2f(data));
  }

  update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.batch.update(getClientReference<T>(path), b2f(data));
  }

  delete<T = never>(path: BlazePath<T>): void {
    this.batch.delete(getClientReference(path));
  }

  async commit(): Promise<void> {
    await this.batch.commit();
  }
}

export class ClientBlaze extends Blaze {
  getMany<T extends DocumentData>(): Promise<Nullable<BlazeResult<T>>[]> {
    throw new Error("Method not implemented.");
  }

  watch<T extends DocumentData>(
    path: BlazePath<T>
  ): Observable<Nullable<BlazeResult<T>>> {
    return new Observable<Nullable<BlazeResult<T>>>((subscriber) => {
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
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Observable<BlazeResult<T>[]> {
    return new Observable<BlazeResult<T>[]>((subscriber) => {
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

  timestamp(seconds: number, nanoseconds: number): BlazeTimestamp {
    return new BlazeClientTimestamp(new ClientTimestamp(seconds, nanoseconds));
  }

  geoPoint(latitude: number, longitude: number): BlazeGeoPoint {
    return new BlazeClientGeoPoint(new ClientGeoPoint(latitude, longitude));
  }

  arrayUnion(...values: unknown[]): BlazeArrayUnion {
    return new BlazeClientArrayUnion(values);
  }

  increment(value: number): BlazeIncrement {
    return new BlazeClientIncrement(value);
  }

  arrayRemove(...values: unknown[]): BlazeArrayRemove {
    return new BlazeClientArrayRemove(values);
  }

  now(): BlazeTimestamp {
    return new BlazeClientTimestamp(ClientTimestamp.now());
  }

  timestampFromDate(date: Date): BlazeTimestamp {
    return new BlazeClientTimestamp(ClientTimestamp.fromDate(date));
  }

  timestampFromMillis(millis: number): BlazeTimestamp {
    return new BlazeClientTimestamp(ClientTimestamp.fromMillis(millis));
  }

  serverTimestamp(): BlazeServerTimestamp {
    return new BlazeClientServerTimestamp();
  }

  deleteField(): BlazeDeleteField {
    return new BlazeClientDeleteField();
  }

  id(): string {
    return clientDoc(clientCollection(getClientFirestore(), "doesnt-matter"))
      .id;
  }

  async merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): Promise<void> {
    await clientSetDoc(getClientReference<T>(path), b2f(data));
  }

  async update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): Promise<void> {
    return clientUpdateDoc(getClientReference<T>(path), b2f(data));
  }

  async delete<T = never>(path: BlazePath<T>): Promise<void> {
    await clientDeleteDoc(getClientReference(path));
  }

  async count<T = never>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeCount> {
    const q = this.buildQuery(path, ...query);
    const c = await clientGetCountFromServer(q);
    return { total: c.data().count };
  }

  private buildQuery<T>(path: BlazePath<T>, ...query: BlazeQuery[]) {
    const convertedQuery = query.map((v) => {
      return mapBlazeQuery(v, {
        onConstraint: ([field, op, value]) =>
          clientWhere(field, op, b2f(value)),
        onOrdering: ([field, direction]) => clientOrderBy(field, direction),
        onLimit: ([, limit]) => clientLimit(limit),
      });
    });

    const c = clientCollection(getClientFirestore(), getPath(path));
    return clientQuery(c, ...convertedQuery);
  }

  async query<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeResult<T>[]> {
    const q = this.buildQuery(path, ...query);
    const snaps = await clientGetDocs(q);
    return snaps.docs.map((snap) =>
      buildResult(snap.id, snap.data(clientSnapshotSettings))
    );
  }

  async transaction<R = void>(
    fn: (tx: BlazeTransaction) => Promise<R>
  ): Promise<R> {
    return runClientTransaction(getClientFirestore(), async (tx) => {
      return fn(new BlazeClientTransaction(tx));
    });
  }

  batch(): BlazeBatch {
    return new ClientBatch(clientWriteBatch(getClientFirestore()));
  }

  async set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): Promise<void> {
    await clientSetDoc(getClientReference<T>(path), b2f(data));
  }

  async get<T extends DocumentData>(
    path: BlazePath<T>
  ): Promise<Nullable<BlazeResult<T>>> {
    const res = await clientGetDoc(getClientReference<T>(path));
    if (!res.exists()) {
      return null;
    }

    return buildResult(res.id, res.data(clientSnapshotSettings));
  }
}

class BlazeClientTimestamp extends BlazeTimestamp {
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

class BlazeClientGeoPoint extends BlazeGeoPoint {
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

class BlazeClientArrayUnion extends BlazeArrayUnion {
  toFirebase(): any {
    return clientArrayUnion(...this.values);
  }
}

class BlazeClientIncrement extends BlazeIncrement {
  toFirebase(): any {
    return clientIncrement(this.value);
  }
}

class BlazeClientArrayRemove extends BlazeArrayRemove {
  toFirebase(): any {
    return clientArrayRemove(...this.values);
  }
}

class BlazeClientServerTimestamp extends BlazeServerTimestamp {
  toFirebase(): any {
    return clientServerTimestamp();
  }
}

class BlazeClientDeleteField extends BlazeDeleteField {
  toFirebase(): any {
    return clientDeleteField();
  }
}

export const clientF2B = (data: any) => {
  return recursiveConvert(data, (value) => {
    if (value instanceof ClientTimestamp) {
      return [true, new BlazeClientTimestamp(value)];
    } else if (value instanceof ClientGeoPoint) {
      return [true, new BlazeClientGeoPoint(value)];
    }
    return [false, value];
  });
};
