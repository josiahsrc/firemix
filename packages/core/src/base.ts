/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { map, Observable } from "rxjs";
import { chunkify, type Nullable } from "./utils";

export type DocumentData = { [key: string]: any };

export type FiremixResult<T extends DocumentData> = { data: T; id: string };

type QueryConstraint =
  | "<"
  | "<="
  | "=="
  | "!="
  | ">="
  | ">"
  | "array-contains"
  | "in"
  | "array-contains-any"
  | "not-in";

export type FiremixConstraint = ["where", string, QueryConstraint, unknown];

export type FiremixOrdering = ["orderBy", string, "asc" | "desc"];

export type FiremixLimit = ["limit", number];

export type FiremixStartAfter = ["startAfter", string]

export type FiremixQuery =
  | FiremixConstraint
  | FiremixOrdering
  | FiremixLimit
  | FiremixStartAfter;

export type FiremixCount = { total: number };

export type FiremixRealtimeUnsubscribe = () => void;

export interface FiremixRealtimeSnapshot<T = unknown> {
  key: string | null;
  child(path: string): FiremixRealtimeSnapshot;
  exists(): boolean;
  val(): T;
  forEach(
    action: (snapshot: FiremixRealtimeSnapshot) => boolean | void
  ): boolean;
  toFirebase(): unknown;
}

export interface FiremixRealtimeReference {
  readonly key: string | null;
  readonly parent: FiremixRealtimeReference | null;
  readonly root: FiremixRealtimeReference;
  child(path: string): FiremixRealtimeReference;
  get<T = unknown>(): Promise<FiremixRealtimeSnapshot<T>>;
  set<T = unknown>(value: T): Promise<void>;
  update<T extends Record<string, unknown>>(
    value: T
  ): Promise<void>;
  remove(): Promise<void>;
  push<T = unknown>(value?: T): Promise<FiremixRealtimeReference>;
  onValue(
    callback: (snapshot: FiremixRealtimeSnapshot) => void,
    errorCallback?: (error: Error) => void
  ): FiremixRealtimeUnsubscribe;
  toFirebase(): unknown;
}

export interface FiremixRealtimeDatabase {
  ref(path?: string): FiremixRealtimeReference;
  refFromURL(url: string): FiremixRealtimeReference;
  goOffline(): void;
  goOnline(): void;
  toFirebase(): unknown;
}

export const mapFiremixQuery = <C, O, L, F>(
  query: FiremixQuery,
  args: {
    onConstraint: (constraint: FiremixConstraint) => C;
    onOrdering: (ordering: FiremixOrdering) => O;
    onLimit: (limit: FiremixLimit) => L;
    onStartAfter: (offset: FiremixStartAfter) => F;
  }
): C | O | L | F => {
  if (query[0] === "where") {
    return args.onConstraint(query as FiremixConstraint);
  } else if (query[0] === "limit") {
    return args.onLimit(query as FiremixLimit);
  } else if (query[0] === "orderBy") {
    return args.onOrdering(query as FiremixOrdering);
  } else if (query[0] === "startAfter") {
    return args.onStartAfter(query as FiremixStartAfter);
  } else {
    throw new Error(`Unknown query type: ${query}`);
  }
};

export abstract class FiremixTransaction {
  abstract get<T extends DocumentData>(
    path: FiremixPath<T>
  ): Promise<Nullable<FiremixResult<T>>>;

  abstract set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): void;

  abstract query<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixResult<T>[]>;

  abstract merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void;

  abstract update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void;

  abstract delete<T = never>(path: FiremixPath<T>): void;

  async first<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<Nullable<FiremixResult<T>>> {
    const results = await this.query<T>(path, ...query, ["limit", 1]);
    return results.length > 0 ? results[0] : null;
  }
}

/**
 * The generic type param allows firemix to have type-safe paths. I.e. a type
 * can be associated with a path, which makes all firemix calls validate on that
 * type. The type T is never considered for actually looking up the path, and
 * you should not pass anything in other than strings.
 */
export type FiremixPath<T = never> = string[] | string | T;

export function getPath<T>(path: FiremixPath<T>): string {
  if (Array.isArray(path)) {
    return path.join("/");
  } else if (typeof path === "string") {
    return path;
  } else {
    return "";
  }
}

export abstract class FiremixBatch {
  abstract set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): void;

  abstract merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void;

  abstract update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): void;

  abstract delete<T = never>(path: FiremixPath<T>): void;

  abstract commit(): Promise<void>;
}

export type FiremixBatchDelegate = (batch: FiremixBatch) => void;

export abstract class Firemix {
  abstract transaction<R = void>(
    fn: (tx: FiremixTransaction) => Promise<R>
  ): Promise<R>;

  abstract batch(): FiremixBatch;

  abstract set<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixWithFieldValue<T>
  ): Promise<void>;

  abstract merge<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): Promise<void>;

  abstract get<T extends DocumentData>(
    path: FiremixPath<T>
  ): Promise<Nullable<FiremixResult<T>>>;

  abstract getMany<T extends DocumentData>(
    paths: FiremixPath<T>[]
  ): Promise<Nullable<FiremixResult<T>>[]>;

  abstract update<T extends DocumentData>(
    path: FiremixPath<T>,
    data: FiremixPartialWithFieldValue<T>
  ): Promise<void>;

  abstract delete<T = never>(path: FiremixPath<T>): Promise<void>;

  async add<T extends DocumentData>(
    path: FiremixPath<T>,
    data: T
  ): Promise<string> {
    const id = this.id();
    await this.set([getPath(path), id], data);
    return id;
  }

  abstract query<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixResult<T>[]>;

  abstract watch<T extends DocumentData>(
    path: FiremixPath<T>
  ): Observable<Nullable<FiremixResult<T>>>;

  abstract watchQuery<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Observable<FiremixResult<T>[]>;

  async first<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<Nullable<FiremixResult<T>>> {
    const results = await this.query<T>(path, ...query, ["limit", 1]);
    return results.length > 0 ? results[0] : null;
  }

  watchFirst<T extends DocumentData>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Observable<Nullable<FiremixResult<T>>> {
    return this.watchQuery(path, ...query).pipe(
      map((results) => (results.length > 0 ? results[0] : null))
    );
  }

  abstract count<T = never>(
    path: FiremixPath<T>,
    ...query: FiremixQuery[]
  ): Promise<FiremixCount>;

  abstract now(): FiremixTimestamp;

  abstract timestampFromDate(date: Date): FiremixTimestamp;

  abstract timestampFromMillis(millis: number): FiremixTimestamp;

  abstract timestamp(seconds: number, nanoseconds: number): FiremixTimestamp;

  abstract geoPoint(latitude: number, longitude: number): FiremixGeoPoint;

  abstract id(): string;

  abstract arrayUnion(...values: unknown[]): FiremixArrayUnion;

  abstract arrayRemove(...values: unknown[]): FiremixArrayRemove;

  abstract increment(value: number): FiremixFieldValue;

  abstract serverTimestamp(): FiremixServerTimestamp;

  abstract deleteField(): FiremixDeleteField;

  abstract realtime(): FiremixRealtimeDatabase;

  async executeBatchWrite(executors: FiremixBatchDelegate[]): Promise<void> {
    if (executors.length === 0) {
      return;
    }

    const chunks = chunkify(executors, 500);
    for (const chunk of chunks) {
      if (chunk.length === 0) {
        continue;
      }

      const batch = this.batch();
      for (const executor of chunk) {
        executor(batch);
      }

      await batch.commit();
    }
  }

  async getManyWhereIn<T extends DocumentData, Q>({
    collectionPath,
    queryValues,
    queryBuilder,
    chunkSize = 10,
  }: {
    collectionPath: FiremixPath<T>;
    queryValues: Q[];
    queryBuilder: (values: Q[]) => FiremixQuery[];
    chunkSize?: number;
  }): Promise<FiremixResult<T>[]> {
    if (queryValues.length === 0) {
      return [];
    }
    const chunkedQueryValues = chunkify(queryValues, chunkSize);
    const results = await Promise.all(
      chunkedQueryValues.map(async (chunk) => {
        const query = queryBuilder(chunk);
        return this.query<T>(collectionPath, ...query);
      })
    );
    return results.flat();
  }
}

export type FiremixFieldKind =
  | "arrayUnion"
  | "increment"
  | "arrayRemove"
  | "serverTimestamp"
  | "deleteField"
  | "timestamp"
  | "geoPoint";

export abstract class FiremixFieldValue {
  constructor(kind: FiremixFieldKind) {
    this.__firemixFieldKind = kind;
  }

  private __firemixFieldKind: FiremixFieldKind;

  abstract toFirebase(): any;

  getKind(): FiremixFieldKind {
    return this.__firemixFieldKind;
  }
}

export abstract class FiremixTimestamp extends FiremixFieldValue {
  constructor(seconds: number, nanoseconds: number) {
    super("timestamp");
    this._seconds = seconds;
    this._nanoseconds = nanoseconds;
  }

  private _seconds: number;
  private _nanoseconds: number;

  get seconds(): number {
    return this._seconds;
  }

  get nanoseconds(): number {
    return this._nanoseconds;
  }

  abstract toDate(): Date;

  abstract toMillis(): number;

  abstract valueOf(): string;
}

export abstract class FiremixGeoPoint extends FiremixFieldValue {
  constructor(latitude: number, longitude: number) {
    super("geoPoint");
    this._latitude = latitude;
    this._longitude = longitude;
  }

  private _latitude: number;
  private _longitude: number;

  get latitude(): number {
    return this._latitude;
  }

  get longitude(): number {
    return this._longitude;
  }
}

export abstract class FiremixArrayUnion extends FiremixFieldValue {
  protected values: unknown[];
  constructor(values: unknown[]) {
    super("arrayUnion");
    this.values = values;
  }
}

export abstract class FiremixIncrement extends FiremixFieldValue {
  protected value: number;
  constructor(value: number) {
    super("increment");
    this.value = value;
  }
}

export abstract class FiremixArrayRemove extends FiremixFieldValue {
  protected values: unknown[];
  constructor(values: unknown[]) {
    super("arrayRemove");
    this.values = values;
  }
}

export abstract class FiremixServerTimestamp extends FiremixFieldValue {
  constructor() {
    super("serverTimestamp");
  }
}

export abstract class FiremixDeleteField extends FiremixFieldValue {
  constructor() {
    super("deleteField");
  }
}

type Primitive = string | number | boolean | undefined | null;

export type FiremixWithFieldValue<T> =
  | T
  | (T extends Primitive
    ? T
    : T extends {}
    ? {
      [K in keyof T]: FiremixWithFieldValue<T[K]> | FiremixFieldValue;
    }
    : never);

export type FiremixPartialWithFieldValue<T> =
  | Partial<T>
  | (T extends Primitive
    ? T
    : T extends {}
    ? {
      [K in keyof T]?: FiremixPartialWithFieldValue<T[K]> | FiremixFieldValue;
    }
    : never);

const tryGetObjectField = (obj: any, field: string): any => {
  if (obj === null || typeof obj !== "object") {
    return undefined;
  }

  return obj[field];
};

export const recursiveConvert = (
  data: any,
  convert: (value: any) => [boolean, any]
): any => {
  if (data === null || data === undefined || typeof data !== "object") {
    return data;
  }

  const [converted, out] = convert(data);
  if (converted) {
    return out;
  }

  if (Array.isArray(data)) {
    return data.map((item) => recursiveConvert(item, convert));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    result[key] = recursiveConvert(value, convert);
  }

  return result;
};

export const firemixToFirestore = (data: any) => {
  return recursiveConvert(data, (value) => {
    const kind = tryGetObjectField(value, "__firemixFieldKind");
    if (kind) {
      return [true, value.toFirebase()];
    }
    return [false, value];
  });
};
