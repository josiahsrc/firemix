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
  getDatabase as getAdminRealtimeDatabase,
  Database as AdminRealtimeDatabase,
  Reference as AdminDatabaseReference,
  DataSnapshot as AdminRealtimeDataSnapshot,
} from "firebase-admin/database";
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
import { Observable } from "rxjs";

const buildResult = <T extends DocumentData>(
  id: string,
  data: AdminDocumentData
): FiremixResult<T> => {
  return {
    id,
    data: adminFirestoreToFiremix(data),
  };
};

class FiremixAdminTransaction extends FiremixTransaction {
  private tx: AdminTransaction;
  constructor(tx: AdminTransaction) {
    super();
    this.tx = tx;
  }

  public async get<T extends DocumentData>(
    path: FiremixPath<T>
  ): Promise<Nullable<FiremixResult<T>>> {
    const ref = await this.tx.get(getAdminFirestore().doc(getPath(path)));
    const data = ref.data();
    return data ? buildResult(ref.id, data) : null;
  }

  public set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): void {
    this.tx.set(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      firemixToFirestore(data)
    );
  }

  public async query<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixResult<T>[]> {
    let ref: AdminQuery = getAdminFirestore().collection(getPath(path));
    query.forEach((v) => {
      ref = mapFiremixQuery(v, {
        onConstraint: ([, field, op, value]) => ref.where(field, op, firemixToFirestore(value)),
        onOrdering: ([, field, direction]) => ref.orderBy(field, direction),
        onLimit: ([, limit]) => ref.limit(limit),
        onStartAfter: ([, startAfter]) => ref.startAfter(startAfter),
      });
    });

    const snapshot = await ref.get();
    return snapshot.docs.map((doc) => buildResult(doc.id, doc.data()));
  }

  public merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.tx.set(getAdminFirestore().doc(getPath(path)), firemixToFirestore(data), {
      merge: true,
    });
  }

  public update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.tx.update(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      firemixToFirestore(data)
    );
  }

  public delete<T = never>(path: FiremixPath<T>): void {
    this.tx.delete(getAdminFirestore().doc(getPath(path)));
  }
}

class AdminBatch extends FiremixBatch {
  private batch: AdminWriteBatch;
  constructor(batch: AdminWriteBatch) {
    super();
    this.batch = batch;
  }

  set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): void {
    this.batch.set(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      firemixToFirestore(data)
    );
  }

  merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.batch.set(getAdminFirestore().doc(getPath(path)), firemixToFirestore(data), {
      merge: true,
    });
  }

  update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void {
    this.batch.update(
      getAdminFirestore().doc(getPath(path)) as AdminDocumentReference<T>,
      firemixToFirestore(data)
    );
  }

  delete<T = never>(path: FiremixPath<T>): void {
    this.batch.delete(getAdminFirestore().doc(getPath(path)));
  }

  async commit(): Promise<void> {
    await this.batch.commit();
  }
}

class AdminRealtimeSnapshot implements FiremixRealtimeSnapshot {
  constructor(private readonly snapshot: AdminRealtimeDataSnapshot) {}

  get key(): string | null {
    return this.snapshot.key;
  }

  child(path: string): FiremixRealtimeSnapshot {
    return new AdminRealtimeSnapshot(this.snapshot.child(path));
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
      const result = action(new AdminRealtimeSnapshot(child));
      if (result === true) {
        canceled = true;
        return true;
      }
      return false;
    });
    return canceled;
  }

  toFirebase(): AdminRealtimeDataSnapshot {
    return this.snapshot;
  }
}

class AdminRealtimeReferenceAdapter implements FiremixRealtimeReference {
  constructor(private readonly reference: AdminDatabaseReference) {}

  private wrap(reference: AdminDatabaseReference): FiremixRealtimeReference {
    return new AdminRealtimeReferenceAdapter(reference);
  }

  get key(): string | null {
    return this.reference.key;
  }

  get parent(): FiremixRealtimeReference | null {
    return this.reference.parent ? this.wrap(this.reference.parent) : null;
  }

  get root(): FiremixRealtimeReference {
    return this.wrap(this.reference.root);
  }

  child(path: string): FiremixRealtimeReference {
    return this.wrap(this.reference.child(path));
  }

  async get<T = unknown>(): Promise<FiremixRealtimeSnapshot<T>> {
    const snapshot = await this.reference.get();
    return new AdminRealtimeSnapshot(snapshot);
  }

  async set<T = unknown>(value: T): Promise<void> {
    await this.reference.set(value);
  }

  async update<T extends Record<string, unknown>>(value: T): Promise<void> {
    await this.reference.update(value);
  }

  async remove(): Promise<void> {
    await this.reference.remove();
  }

  async push<T = unknown>(value?: T): Promise<FiremixRealtimeReference> {
    const pushed = this.reference.push();
    if (value !== undefined) {
      await pushed.set(value);
    }
    return this.wrap(pushed);
  }

  onValue(
    callback: (snapshot: FiremixRealtimeSnapshot) => void,
    errorCallback?: (error: Error) => void
  ): () => void {
    const listener = this.reference.on(
      "value",
      (snapshot) => callback(new AdminRealtimeSnapshot(snapshot)),
      errorCallback
    );
    return () => {
      this.reference.off("value", listener);
    };
  }

  toFirebase(): AdminDatabaseReference {
    return this.reference;
  }
}

class AdminRealtimeDatabaseAdapter implements FiremixRealtimeDatabase {
  constructor(private readonly db: AdminRealtimeDatabase) {}

  ref(path?: string): FiremixRealtimeReference {
    return path
      ? new AdminRealtimeReferenceAdapter(this.db.ref(path))
      : new AdminRealtimeReferenceAdapter(this.db.ref());
  }

  refFromURL(url: string): FiremixRealtimeReference {
    return new AdminRealtimeReferenceAdapter(this.db.refFromURL(url));
  }

  goOffline(): void {
    this.db.goOffline();
  }

  goOnline(): void {
    this.db.goOnline();
  }

  toFirebase(): AdminRealtimeDatabase {
    return this.db;
  }
}

let cachedAdminRealtime: AdminRealtimeDatabaseAdapter | null = null;

export class FiremixAdmin extends Firemix {
  watch<T extends DocumentData>(): Observable<Nullable<FiremixResult<T>>> {
    throw new Error("Method not implemented.");
  }

  watchQuery<T extends DocumentData>(): Observable<FiremixResult<T>[]> {
    throw new Error("Method not implemented.");
  }

  watchCount(): Observable<FiremixCount> {
    throw new Error("Method not implemented.");
  }

  timestamp(seconds: number, nanoseconds: number): FiremixTimestamp {
    return new FiremixAdminTimestamp(new AdminTimestamp(seconds, nanoseconds));
  }

  geoPoint(latitude: number, longitude: number): FiremixGeoPoint {
    return new FiremixAdminGeoPoint(new AdminGeoPoint(latitude, longitude));
  }

  arrayUnion(...values: unknown[]): FiremixArrayUnion {
    return new FiremixAdminArrayUnion(values);
  }

  increment(value: number): FiremixIncrement {
    return new FiremixAdminIncrement(value);
  }

  arrayRemove(...values: unknown[]): FiremixArrayRemove {
    return new FiremixAdminArrayRemove(values);
  }

  serverTimestamp(): FiremixServerTimestamp {
    return new FiremixAdminServerTimestamp();
  }

  now(): FiremixTimestamp {
    return new FiremixAdminTimestamp(AdminTimestamp.now());
  }

  timestampFromDate(date: Date): FiremixTimestamp {
    return new FiremixAdminTimestamp(AdminTimestamp.fromDate(date));
  }

  timestampFromMillis(millis: number): FiremixTimestamp {
    return new FiremixAdminTimestamp(AdminTimestamp.fromMillis(millis));
  }

  deleteField(): FiremixDeleteField {
    return new FiremixAdminDeleteField();
  }

  id(): string {
    return getAdminFirestore().collection("doesnt-matter").doc().id;
  }

  async merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): Promise<void> {
    await getAdminFirestore()
      .doc(getPath(path))
      .set(firemixToFirestore(data), { merge: true });
  }

  async transaction<R = void>(
    fn: (tx: FiremixTransaction) => Promise<R>
  ): Promise<R> {
    return getAdminFirestore().runTransaction(async (tx) => {
      return fn(new FiremixAdminTransaction(tx));
    });
  }

  async count<T = never>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixCount> {
    const ref = this.buildQuery(path, ...query);
    const res = await ref.count().get();
    return { total: res.data().count };
  }

  batch(): FiremixBatch {
    return new AdminBatch(getAdminFirestore().batch());
  }

  realtime(): FiremixRealtimeDatabase {
    if (!cachedAdminRealtime) {
      cachedAdminRealtime = new AdminRealtimeDatabaseAdapter(
        getAdminRealtimeDatabase()
      );
    }
    return cachedAdminRealtime;
  }

  async set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): Promise<void> {
    await getAdminFirestore().doc(getPath(path)).set(firemixToFirestore(data));
  }

  async get<T extends DocumentData>(
    path: FiremixPath<T>
  ): Promise<Nullable<FiremixResult<T>>> {
    return getAdminFirestore()
      .doc(getPath(path))
      .get()
      .then((doc) => {
        const data = doc.data();
        return data ? buildResult(doc.id, data) : null;
      });
  }

  async getMany<T extends DocumentData>(
    paths: FiremixPath<T>[]
  ): Promise<Nullable<FiremixResult<T>>[]> {
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
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): Promise<void> {
    await getAdminFirestore().doc(getPath(path)).update(firemixToFirestore(data));
  }

  async delete<T = never>(path: FiremixPath<T>): Promise<void> {
    await getAdminFirestore().doc(getPath(path)).delete();
  }

  private buildQuery<T>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): AdminQuery {
    let ref: AdminQuery = getAdminFirestore().collection(getPath(path));
    query.forEach((v) => {
      ref = mapFiremixQuery(v, {
        onConstraint: ([, field, op, value]) => ref.where(field, op, firemixToFirestore(value)),
        onOrdering: ([, field, direction]) => ref.orderBy(field, direction),
        onLimit: ([, limit]) => ref.limit(limit),
        onStartAfter: ([, startAfter]) => ref.startAfter(startAfter),
      });
    });
    return ref;
  }

  async query<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixResult<T>[]> {
    return this.buildQuery(path, ...query)
      .get()
      .then((snapshot) =>
        snapshot.docs.map((doc) => buildResult(doc.id, doc.data()))
      );
  }
}

class FiremixAdminTimestamp extends FiremixTimestamp {
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

class FiremixAdminGeoPoint extends FiremixGeoPoint {
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

class FiremixAdminArrayUnion extends FiremixArrayUnion {
  toFirebase(): any {
    return AdminFieldValue.arrayUnion(...this.values);
  }
}

class FiremixAdminIncrement extends FiremixIncrement {
  toFirebase(): any {
    return AdminFieldValue.increment(this.value);
  }
}

class FiremixAdminArrayRemove extends FiremixArrayRemove {
  toFirebase(): any {
    return AdminFieldValue.arrayRemove(...this.values);
  }
}

class FiremixAdminServerTimestamp extends FiremixServerTimestamp {
  toFirebase(): any {
    return AdminFieldValue.serverTimestamp();
  }
}

class FiremixAdminDeleteField extends FiremixDeleteField {
  toFirebase(): any {
    return AdminFieldValue.delete();
  }
}

export const adminFirestoreToFiremix = (data: any) => {
  return recursiveConvert(data, (value) => {
    if (value instanceof AdminTimestamp) {
      return [true, new FiremixAdminTimestamp(value)];
    } else if (value instanceof AdminGeoPoint) {
      return [true, new FiremixAdminGeoPoint(value)];
    }
    return [false, value];
  });
};
