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
  type FiremixWithFieldValue,
  type DocumentData,
  type Nullable,
  getPath,
  mapFiremixQuery,
  recursiveConvert,
} from "@firemix/core";

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
    clientSetDoc(getClientReference<T>(path), firemixToFirestore(data));
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
    await clientSetDoc(getClientReference<T>(path), firemixToFirestore(data));
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
        onConstraint: ([field, op, value]) =>
          clientWhere(field, op, firemixToFirestore(value)),
        onOrdering: ([field, direction]) => clientOrderBy(field, direction),
        onLimit: ([, limit]) => clientLimit(limit),
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
