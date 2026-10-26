export interface AnswerDraftStore {
  get(key: string): Promise<Blob | null>;
  put(key: string, value: Blob): Promise<void>;
  delete(key: string): Promise<void>;
}

const DATABASE = "samvaad-practice";
const STORE = "answer-drafts";

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(
  mode: IDBTransactionMode,
  operation: (
    store: IDBObjectStore,
    done: (value: T) => void,
    fail: (error: unknown) => void
  ) => void
): Promise<T | null> {
  const database = await openDatabase();
  if (!database) return null;
  return new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(STORE, mode);
    let value!: T;
    let operationFinished = false;
    operation(
      transaction.objectStore(STORE),
      (result) => {
        value = result;
        operationFinished = true;
      },
      (error) => {
        reject(error);
        try {
          transaction.abort();
        } catch {
          /* transaction may already be inactive */
        }
      }
    );
    transaction.oncomplete = () => {
      database.close();
      if (operationFinished) resolve(value);
      else reject(new Error("IndexedDB operation completed without a result."));
    };
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("IndexedDB transaction aborted."));
  }).finally(() => database.close());
}

export const browserAnswerDraftStore: AnswerDraftStore = {
  async get(key) {
    try {
      return await transact<Blob | null>("readonly", (store, done, fail) => {
        const request = store.get(key);
        request.onsuccess = () => done(request.result instanceof Blob ? request.result : null);
        request.onerror = () => fail(request.error);
      });
    } catch {
      return null;
    }
  },
  async put(key, value) {
    const result = await transact<void>("readwrite", (store, done, fail) => {
      const request = store.put(value, key);
      request.onsuccess = () => done();
      request.onerror = () => fail(request.error);
    });
    void result;
  },
  async delete(key) {
    const result = await transact<void>("readwrite", (store, done, fail) => {
      const request = store.delete(key);
      request.onsuccess = () => done();
      request.onerror = () => fail(request.error);
    });
    void result;
  },
};
