/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { map, Observable } from "rxjs";
import { chunkify, type Nullable } from "./utils";

export type DocumentData = { [key: string]: any };

export type BlazeResult<T extends DocumentData> = { data: T; id: string };

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

export type BlazeConstraint = [string, QueryConstraint, unknown];

export type BlazeOrdering = [string, "asc" | "desc"];

export type BlazeLimit = ["limit", number];

export type BlazeQuery = BlazeConstraint | BlazeOrdering | BlazeLimit;

export type BlazeCount = { total: number };

export const mapBlazeQuery = <C, O, L>(
  query: BlazeQuery,
  args: {
    onConstraint: (constraint: BlazeConstraint) => C;
    onOrdering: (ordering: BlazeOrdering) => O;
    onLimit: (limit: BlazeLimit) => L;
  }
): C | O | L => {
  if (query.length === 3) {
    return args.onConstraint(query as BlazeConstraint);
  } else if (query[0] === "limit") {
    return args.onLimit(query as BlazeLimit);
  }
  return args.onOrdering(query as BlazeOrdering);
};

export abstract class BlazeTransaction {
  abstract get<T extends DocumentData>(
    path: BlazePath<T>
  ): Promise<Nullable<BlazeResult<T>>>;

  abstract set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): void;

  abstract query<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeResult<T>[]>;

  abstract merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void;

  abstract update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void;

  abstract delete<T = never>(path: BlazePath<T>): void;

  async first<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<Nullable<BlazeResult<T>>> {
    const results = await this.query<T>(path, ...query, ["limit", 1]);
    return results.length > 0 ? results[0] : null;
  }
}

/**
 * The generic type param allows blaze to have type-safe paths. I.e. a type
 * can be associated with a path, which makes all blaze calls validate on that
 * type. The type T is never considered for actually looking up the path, and
 * you should not pass anything in other than strings.
 */
export type BlazePath<T = never> = string[] | string | T;

export function getPath<T>(path: BlazePath<T>): string {
  if (Array.isArray(path)) {
    return path.join("/");
  } else if (typeof path === "string") {
    return path;
  } else {
    return "";
  }
}

export abstract class BlazeBatch {
  abstract set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): void;

  abstract merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void;

  abstract update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): void;

  abstract delete<T = never>(path: BlazePath<T>): void;

  abstract commit(): Promise<void>;
}

export type BlazeBatchDelegate = (batch: BlazeBatch) => void;

export abstract class Blaze {
  abstract transaction<R = void>(
    fn: (tx: BlazeTransaction) => Promise<R>
  ): Promise<R>;

  abstract batch(): BlazeBatch;

  abstract set<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazeWithFieldValue<T>
  ): Promise<void>;

  abstract merge<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): Promise<void>;

  abstract get<T extends DocumentData>(
    path: BlazePath<T>
  ): Promise<Nullable<BlazeResult<T>>>;

  abstract getMany<T extends DocumentData>(
    paths: BlazePath<T>[]
  ): Promise<Nullable<BlazeResult<T>>[]>;

  abstract update<T extends DocumentData>(
    path: BlazePath<T>,
    data: BlazePartialWithFieldValue<T>
  ): Promise<void>;

  abstract delete<T = never>(path: BlazePath<T>): Promise<void>;

  async add<T extends DocumentData>(
    path: BlazePath<T>,
    data: T
  ): Promise<string> {
    const id = this.id();
    await this.set([getPath(path), id], data);
    return id;
  }

  abstract query<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeResult<T>[]>;

  abstract watch<T extends DocumentData>(
    path: BlazePath<T>
  ): Observable<Nullable<BlazeResult<T>>>;

  abstract watchQuery<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Observable<BlazeResult<T>[]>;

  async first<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<Nullable<BlazeResult<T>>> {
    const results = await this.query<T>(path, ...query, ["limit", 1]);
    return results.length > 0 ? results[0] : null;
  }

  watchFirst<T extends DocumentData>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Observable<Nullable<BlazeResult<T>>> {
    return this.watchQuery(path, ...query).pipe(
      map((results) => (results.length > 0 ? results[0] : null))
    );
  }

  abstract count<T = never>(
    path: BlazePath<T>,
    ...query: BlazeQuery[]
  ): Promise<BlazeCount>;

  abstract now(): BlazeTimestamp;

  abstract timestampFromDate(date: Date): BlazeTimestamp;

  abstract timestampFromMillis(millis: number): BlazeTimestamp;

  abstract timestamp(seconds: number, nanoseconds: number): BlazeTimestamp;

  abstract geoPoint(latitude: number, longitude: number): BlazeGeoPoint;

  abstract id(): string;

  abstract arrayUnion(...values: unknown[]): BlazeArrayUnion;

  abstract arrayRemove(...values: unknown[]): BlazeArrayRemove;

  abstract increment(value: number): BlazeFieldValue;

  abstract serverTimestamp(): BlazeServerTimestamp;

  abstract deleteField(): BlazeDeleteField;

  async executeBatchWrite(executors: BlazeBatchDelegate[]): Promise<void> {
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
    collectionPath: BlazePath<T>;
    queryValues: Q[];
    queryBuilder: (values: Q[]) => BlazeQuery[];
    chunkSize?: number;
  }): Promise<BlazeResult<T>[]> {
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

export type BlazeFieldKind =
  | "arrayUnion"
  | "increment"
  | "arrayRemove"
  | "serverTimestamp"
  | "deleteField"
  | "timestamp"
  | "geoPoint";

export abstract class BlazeFieldValue {
  constructor(kind: BlazeFieldKind) {
    this.__blazeFieldKind = kind;
  }

  private __blazeFieldKind: BlazeFieldKind;

  abstract toFirebase(): any;

  getKind(): BlazeFieldKind {
    return this.__blazeFieldKind;
  }
}

export abstract class BlazeTimestamp extends BlazeFieldValue {
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

export abstract class BlazeGeoPoint extends BlazeFieldValue {
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

export abstract class BlazeArrayUnion extends BlazeFieldValue {
  protected values: unknown[];
  constructor(values: unknown[]) {
    super("arrayUnion");
    this.values = values;
  }
}

export abstract class BlazeIncrement extends BlazeFieldValue {
  protected value: number;
  constructor(value: number) {
    super("increment");
    this.value = value;
  }
}

export abstract class BlazeArrayRemove extends BlazeFieldValue {
  protected values: unknown[];
  constructor(values: unknown[]) {
    super("arrayRemove");
    this.values = values;
  }
}

export abstract class BlazeServerTimestamp extends BlazeFieldValue {
  constructor() {
    super("serverTimestamp");
  }
}

export abstract class BlazeDeleteField extends BlazeFieldValue {
  constructor() {
    super("deleteField");
  }
}

type Primitive = string | number | boolean | undefined | null;

export type BlazeWithFieldValue<T> =
  | T
  | (T extends Primitive
    ? T
    : T extends {}
    ? {
      [K in keyof T]: BlazeWithFieldValue<T[K]> | BlazeFieldValue;
    }
    : never);

export type BlazePartialWithFieldValue<T> =
  | Partial<T>
  | (T extends Primitive
    ? T
    : T extends {}
    ? {
      [K in keyof T]?: BlazePartialWithFieldValue<T[K]> | BlazeFieldValue;
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

export const b2f = (data: any) => {
  return recursiveConvert(data, (value) => {
    const kind = tryGetObjectField(value, "__blazeFieldKind");
    if (kind) {
      return [true, value.toFirebase()];
    }
    return [false, value];
  });
};
