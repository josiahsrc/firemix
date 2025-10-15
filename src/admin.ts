/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Transaction as AdminTransaction,
  getFirestore as getAdminFirestore,
  WriteBatch as AdminWriteBatch,
  DocumentReference as AdminDocumentReference,
  Query as AdminQuery,
  Timestamp as AdminTimestamp,
  FieldValue as AdminFieldValue,
  GeoPoint as AdminGeoPoint,
  type DocumentData as AdminDocumentData,
} from "firebase-admin/firestore";
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
import { Observable } from "rxjs";
import type { Nullable } from "./utils";

const buildResult = <T extends DocumentData>(
  id: string,
  data: AdminDocumentData
): BlazeResult<T> => {
  return {
    id,
    data: adminF2B(data),
  };
};

class BlazeAdminTransaction extends BlazeTransaction {
  private tx: AdminTransaction;
  constructor(tx: AdminTransaction) {
    super();
    this.tx = tx;
  }

  public async get<T extends DocumentData>(
    path: BlazePath<T>
  ): Promise<Nullable<BlazeResult<T>>> {
    const ref = await this.tx.get(getAdminFirestore().doc(getPath(path)));
    const data = ref.data();
    return data ? buildResult(ref.id, data) : null;
  }

  public set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): void {
    this.tx.set(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      b2f(data)
    );
  }

  public async query<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeResult<T>[]> {
    let ref: AdminQuery = getAdminFirestore().collection(getPath(path));
    query.forEach((v) => {
      ref = mapBlazeQuery(v, {
        onConstraint: ([field, op, value]) => ref.where(field, op, b2f(value)),
        onOrdering: ([field, direction]) => ref.orderBy(field, direction),
        onLimit: ([, limit]) => ref.limit(limit),
      });
    });

    const snapshot = await ref.get();
    return snapshot.docs.map((doc) => buildResult(doc.id, doc.data()));
  }

  public merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.tx.set(getAdminFirestore().doc(getPath(path)), b2f(data), {
      merge: true,
    });
  }

  public update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.tx.update(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      b2f(data)
    );
  }

  public delete<T = never>(path: BlazePath<T>): void {
    this.tx.delete(getAdminFirestore().doc(getPath(path)));
  }
}

class AdminBatch extends BlazeBatch {
  private batch: AdminWriteBatch;
  constructor(batch: AdminWriteBatch) {
    super();
    this.batch = batch;
  }

  set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): void {
    this.batch.set(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      b2f(data)
    );
  }

  merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.batch.set(getAdminFirestore().doc(getPath(path)), b2f(data), {
      merge: true,
    });
  }

  update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void {
    this.batch.update(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      b2f(data)
    );
  }

  delete<T = never>(path: BlazePath<T>): void {
    this.batch.delete(getAdminFirestore().doc(getPath(path)));
  }

  async commit(): Promise<void> {
    await this.batch.commit();
  }
}

export class AdminBlaze extends Blaze {
  watch<T extends DocumentData>(): Observable<Nullable<BlazeResult<T>>> {
    throw new Error("Method not implemented.");
  }

  watchQuery<T extends DocumentData>(): Observable<BlazeResult<T>[]> {
    throw new Error("Method not implemented.");
  }

  watchCount(): Observable<BlazeCount> {
    throw new Error("Method not implemented.");
  }

  timestamp(seconds: number, nanoseconds: number): BlazeTimestamp {
    return new BlazeAdminTimestamp(new AdminTimestamp(seconds, nanoseconds));
  }

  geoPoint(latitude: number, longitude: number): BlazeGeoPoint {
    return new BlazeAdminGeoPoint(new AdminGeoPoint(latitude, longitude));
  }

  arrayUnion(...values: unknown[]): BlazeArrayUnion {
    return new BlazeAdminArrayUnion(values);
  }

  increment(value: number): BlazeIncrement {
    return new BlazeAdminIncrement(value);
  }

  arrayRemove(...values: unknown[]): BlazeArrayRemove {
    return new BlazeAdminArrayRemove(values);
  }

  serverTimestamp(): BlazeServerTimestamp {
    return new BlazeAdminServerTimestamp();
  }

  now(): BlazeTimestamp {
    return new BlazeAdminTimestamp(AdminTimestamp.now());
  }

  timestampFromDate(date: Date): BlazeTimestamp {
    return new BlazeAdminTimestamp(AdminTimestamp.fromDate(date));
  }

  timestampFromMillis(millis: number): BlazeTimestamp {
    return new BlazeAdminTimestamp(AdminTimestamp.fromMillis(millis));
  }

  deleteField(): BlazeDeleteField {
    return new BlazeAdminDeleteField();
  }

  id(): string {
    return getAdminFirestore().collection("doesnt-matter").doc().id;
  }

  async merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): Promise<void> {
    await getAdminFirestore()
      .doc(getPath(path))
      .set(b2f(data), { merge: true });
  }

  async transaction<R = void>(
    fn: (tx: BlazeTransaction) => Promise<R>
  ): Promise<R> {
    return getAdminFirestore().runTransaction(async (tx) => {
      return fn(new BlazeAdminTransaction(tx));
    });
  }

  async count<T = never>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeCount> {
    const ref = this.buildQuery(path, ...query);
    const res = await ref.count().get();
    return { total: res.data().count };
  }

  batch(): BlazeBatch {
    return new AdminBatch(getAdminFirestore().batch());
  }

  async set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): Promise<void> {
    await getAdminFirestore().doc(getPath(path)).set(b2f(data));
  }

  async get<T extends DocumentData>(
    path: BlazePath<T>
  ): Promise<Nullable<BlazeResult<T>>> {
    return getAdminFirestore()
      .doc(getPath(path))
      .get()
      .then((doc) => {
        const data = doc.data();
        return data ? buildResult(doc.id, data) : null;
      });
  }

  async getMany<T extends DocumentData>(
    paths: BlazePath<T>[]
  ): Promise<Nullable<BlazeResult<T>>[]> {
    return getAdminFirestore()
      .getAll(...paths.map((p) => getAdminFirestore().doc(getPath(p))))
      .then((docs) =>
        docs.map((doc) => {
          const data = doc.data();
          return data ? buildResult(doc.id, data) : null;
        })
      );
  }

  async update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): Promise<void> {
    await getAdminFirestore().doc(getPath(path)).update(b2f(data));
  }

  async delete<T = never>(path: BlazePath<T>): Promise<void> {
    await getAdminFirestore().doc(getPath(path)).delete();
  }

  private buildQuery<T>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): AdminQuery {
    let ref: AdminQuery = getAdminFirestore().collection(getPath(path));
    query.forEach((v) => {
      ref = mapBlazeQuery(v, {
        onConstraint: ([field, op, value]) => ref.where(field, op, b2f(value)),
        onOrdering: ([field, direction]) => ref.orderBy(field, direction),
        onLimit: ([, limit]) => ref.limit(limit),
      });
    });
    return ref;
  }

  async query<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeResult<T>[]> {
    return this.buildQuery(path, ...query)
      .get()
      .then((snapshot) =>
        snapshot.docs.map((doc) => buildResult(doc.id, doc.data()))
      );
  }
}

class BlazeAdminTimestamp extends BlazeTimestamp {
  constructor(timestamp: AdminTimestamp) {
    super(timestamp.seconds, timestamp.nanoseconds);
  }

  private get timestamp() {
    return new AdminTimestamp(this.seconds, this.nanoseconds);
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

class BlazeAdminGeoPoint extends BlazeGeoPoint {
  constructor(geoPoint: AdminGeoPoint) {
    super(geoPoint.latitude, geoPoint.longitude);
  }

  private get geoPoint() {
    return new AdminGeoPoint(this.latitude, this.longitude);
  }

  toFirebase(): any {
    return this.geoPoint;
  }
}

class BlazeAdminArrayUnion extends BlazeArrayUnion {
  toFirebase(): any {
    return AdminFieldValue.arrayUnion(...this.values);
  }
}

class BlazeAdminIncrement extends BlazeIncrement {
  toFirebase(): any {
    return AdminFieldValue.increment(this.value);
  }
}

class BlazeAdminArrayRemove extends BlazeArrayRemove {
  toFirebase(): any {
    return AdminFieldValue.arrayRemove(...this.values);
  }
}

class BlazeAdminServerTimestamp extends BlazeServerTimestamp {
  toFirebase(): any {
    return AdminFieldValue.serverTimestamp();
  }
}

class BlazeAdminDeleteField extends BlazeDeleteField {
  toFirebase(): any {
    return AdminFieldValue.delete();
  }
}

export const adminF2B = (data: any) => {
  return recursiveConvert(data, (value) => {
    if (value instanceof AdminTimestamp) {
      return [true, new BlazeAdminTimestamp(value)];
    } else if (value instanceof AdminGeoPoint) {
      return [true, new BlazeAdminGeoPoint(value)];
    }
    return [false, value];
  });
};
