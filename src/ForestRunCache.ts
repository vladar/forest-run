import { ApolloCache, Cache, Reference } from "@apollo/client";
import { DocumentNode } from "graphql";
import { addTypenameToDocument } from "./addTypenameToDocument";
import { IndexedFields } from "./indexing/IndexedFields";
import { EntityMap, indexEntities } from "./indexing/indexEntities";
import { diffEntity, Patch } from "./diffing/diff";
import { EntityAggregate } from "./diffing/ObjectAggregate";
import { applyPatches } from "./patching/applyPatches";

type QueryStoreForest = any;

/**
 * Not-even-a-proof-of-concept version of Apollo cache
 */
export class OneBigHack extends ApolloCache<QueryStoreForest> {
  private typenameDocumentCache = new Map<DocumentNode, DocumentNode>();
  private indexedFieldsCache = new Map<DocumentNode, IndexedFields>();
  private entityIndexes = new Map<DocumentNode, EntityMap>();
  private docResults = new Map<DocumentNode, object>();
  private dirtyDocs = new Map<DocumentNode, object>(); // lastDiff
  private watches = new Set<Cache.WatchOptions>();

  public constructor() {
    super();
  }

  public write(options: Cache.WriteOptions): Reference | undefined {
    if (options.dataId && options.dataId !== "ROOT_QUERY") {
      throw new Error("Not implemented");
    }

    const document = options.query;
    let indexedFields = this.indexedFieldsCache.get(document);

    if (!indexedFields) {
      indexedFields = IndexedFields.fromOperation({ document, variables: {} });
      this.indexedFieldsCache.set(document, indexedFields);
    }

    const entities = indexEntities(options.result, indexedFields);

    let docUpdated = false;
    const docPatchesMap = new Map<DocumentNode, Patch[]>();

    const hasIndexedEntity = (doc, id) =>
      Boolean(this.entityIndexes.get(doc)?.has(id));

    const diffDocEntity = (doc, model) => {
      const chunks = this.entityIndexes.get(doc).get(model.entityId);
      if (!chunks) {
        throw new Error(`No entity ${model.entityId} for this doc`);
      }
      const base = new EntityAggregate(model.entityId, chunks);
      const { patches } = diffEntity({ base, model });
      if (!patches.length) {
        return false;
      }
      let docPatches: Patch[] = docPatchesMap.get(doc);
      if (!docPatches) {
        docPatches = [];
        docPatchesMap.set(doc, docPatches);
      }
      docPatches.push(...patches);
      return true;
    };

    for (const [id, chunks] of entities.entries()) {
      const model = new EntityAggregate(id, chunks);

      // First, compare with the same doc: if there are no changes - no need to compare with others
      // Because all "unstale" docs are up-to-date
      if (hasIndexedEntity(document, id)) {
        if (!diffDocEntity(document, model)) {
          continue;
        }
      }
      for (const { query } of this.watches) {
        if (query !== document && hasIndexedEntity(query, id)) {
          diffDocEntity(query, model);
        }
      }
    }
    for (const [doc, patches] of docPatchesMap.entries()) {
      const currentResult = this.docResults.get(doc);
      const nextResult = applyPatches(currentResult, patches);
      if (currentResult !== nextResult) {
        this.docResults.set(doc, nextResult);
        this.dirtyDocs.set(doc, currentResult);

        if (doc === document) {
          docUpdated = true;
        }

        // TOOD: update indexes with patches too
        // this.entityIndexes.set(
        //   doc,
        //   indexEntities(nextResult as any, this.indexedFieldsCache.get(doc))
        // );
      }
    }

    this.entityIndexes.set(document, entities);
    if (!docUpdated && !this.docResults.has(document)) {
      this.docResults.set(document, options.result);
    }

    this.broadcastWatches(document, this.docResults.get(document));

    //
    // try {
    //     ++this.txCount;
    //     return this.storeWriter.writeToStore(this.data, options);
    // } finally {
    //     if (!--this.txCount && options.broadcast !== false) {
    //         this.broadcastWatches();
    //     }
    // }
    return undefined;
  }

  private broadcastWatches(document: DocumentNode, result: object) {
    // Temp hack: additionally execute and write all empty watch queries
    for (const watch of this.watches) {
      const doc = watch.query;
      if (document === doc) {
        watch.callback({ result }, { result: this.docResults.get(doc) });
        continue;
      }
      if (!this.docResults.has(doc)) {
        const indexedFields = this.indexedFieldsCache.get(doc)
        const watchQueryResult = filterResult(indexedFields, result) as any;
        // const entities = indexEntities(
        //   watchQueryResult,
        //   indexedFields
        // );
        // this.entityIndexes.set(doc, entities);
        // this.docResults.set(doc, watchQueryResult);
        // this.dirtyDocs.set(doc, watchQueryResult);
        watch.callback({ result: watchQueryResult });
        continue;
      }
      if (this.dirtyDocs.has(doc)) {
        const lastResult = this.dirtyDocs.get(doc);
        const currentResult = this.docResults.get(doc);
        if (currentResult) {
          watch.callback({ result: currentResult }, { result: lastResult });
        }
      }
    }

    this.dirtyDocs.clear();
  }

  public read<T>(options: Cache.ReadOptions): T | null {
    return this.diff(options).result;
  }

  public diff<TData, TVariables = any>(
    options: Cache.DiffOptions<TData, TVariables>
  ): Cache.DiffResult<TData> {
    if (options.rootId && options.rootId !== "ROOT_QUERY") {
      throw new Error("Not implemented");
    }
    const document = options.query;
    const result: unknown = this.docResults.get(document);

    if (result) {
      return { result: result as TData, complete: true };
    }
    if (!this.docResults.size) {
      return { result: null };
    }

    // Try to satisfy the read from another query result
    let indexedFields = this.indexedFieldsCache.get(document);

    if (!indexedFields) {
      indexedFields = IndexedFields.fromOperation({
        document: options.query,
        variables: {},
      });
      this.indexedFieldsCache.set(document, indexedFields);
    }

    // Find the first query that "includes" this query
    for (const otherDoc of this.docResults.keys()) {
      if (otherDoc === document) {
        continue;
      }
      const otherIndexedFields = this.indexedFieldsCache.get(otherDoc);

      if (IndexedFields.contains(otherIndexedFields, indexedFields)) {
        const result = filterResult(indexedFields, this.docResults.get(otherDoc)) as TData;
        // const entities = indexEntities(result, indexedFields);
        // this.docResults.set(document, result);
        // this.entityIndexes.set(document, entities);
        return { result, complete: true };
      }
    }

    return { result: null };
  }

  public watch<TData = any, TVariables = any>(
    watch: Cache.WatchOptions<TData, TVariables>
  ): () => void {
    // this.diff({ query: watch.query, optimistic: false });

    let indexedFields = this.indexedFieldsCache.get(watch.query);

    if (!indexedFields) {
      indexedFields = IndexedFields.fromOperation({
        document: watch.query,
        variables: {},
      });
      this.indexedFieldsCache.set(watch.query, indexedFields);
    }

    if (!this.docResults.has(watch.query) && this.docResults.size) {
      // TODO: instead run against aggregated Query:root Entity
      const doc = watch.query;
      const [sourceData] = this.docResults.values();

      const watchQueryResult = filterResult(indexedFields, sourceData) as any;
      const entities = indexEntities(watchQueryResult, indexedFields);
      this.entityIndexes.set(doc, entities);
      this.docResults.set(doc, watchQueryResult);
      this.dirtyDocs.set(doc, watchQueryResult);
    }

    this.watches.add(watch);
    return () => {
      this.watches.delete(watch);
    };
  }

  public restore(contents: any): this {
    if (!Array.isArray(contents)) {
      return this;
    }
    for (let { query, data } of contents) {
      this.write({
        query,
        result: data,
      });
    }
    return this;
  }

  public extract(optimistic: boolean = false): any {
    const result = {};
    for (let [doc, docResult] of this.docResults.entries()) {
      if (doc.definitions[0].kind === "OperationDefinition") {
        const value = doc.definitions[0]?.name?.value;
        if (value) {
          result[doc.definitions[0]?.name?.value] = docResult;
        }
      }
    }
    return result;
  }

  public evict(options: Cache.EvictOptions): boolean {
    throw new Error("Not implemented");
  }

  public reset(options?: Cache.ResetOptions): Promise<void> {
    throw new Error("Not implemented");
  }

  public removeOptimistic(idToRemove: string) {
    throw new Error("Not implemented");
  }

  public performTransaction(
    update: (cache: OneBigHack) => any,
    optimisticId?: string | null
  ) {
    return update(this);
    // const perform = (layer?: EntityStore): TUpdateResult => {
    //   const { data, optimisticData } = this;
    //   ++this.txCount;
    //   if (layer) {
    //     this.data = this.optimisticData = layer;
    //   }
    //   try {
    //     return updateResult = update(this);
    //   } finally {
    //     --this.txCount;
    //     this.data = data;
    //     this.optimisticData = optimisticData;
    //   }
    // };
    // perform()
  }

  public transformDocument(document: DocumentNode): DocumentNode {
    let result = this.typenameDocumentCache.get(document);
    if (!result) {
      result = addTypenameToDocument(document);
      this.typenameDocumentCache.set(document, result);
      // If someone calls transformDocument and then mistakenly passes the
      // result back into an API that also calls transformDocument, make sure
      // we don't keep creating new query documents.
      this.typenameDocumentCache.set(result, result);
    }
    return result;
  }
}

function filterResult(fields: IndexedFields, data: object) {
  if (data === null) {
    return null
  }
  const result = {}
  for (const fieldInfo of fields.fieldsByType(data["__typename"] ?? `Query`).values()) {
    for (const [dataKey, indexedFields] of fieldInfo.entries) {
      const value = data[dataKey]

      if (!indexedFields) {
        // Leaf
        result[dataKey] = value
        continue
      }

      if (Array.isArray(value)) {
        result[dataKey] = value.map(item => filterResult(indexedFields, item))
      } else {
        result[dataKey] = filterResult(indexedFields, value)
      }
    }
  }
  return result
}
