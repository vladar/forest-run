import { gql, ApolloClient } from "@apollo/client";
import { filter } from "graphql-anywhere";
import { OneBigHack as ForestRunCache } from "../ForestRunCache";
import { default as data } from "../indexing/__tests__/response.json";
import { cloneDeep } from "@apollo/client/utilities";
import { cloneDeepWith } from "lodash";

const document = gql`
  query operationReplyChainsQuery {
    replyChains {
      id
      messages {
        content
        originalArrivalTime
        imDisplayName
        id
        from
        messageType
        emotions {
          __typename
          key
          users {
            __typename
            id
          }
        }
        __typename
      }
      __typename
    }
  }
`;

const partial = gql`
  query operationReplyChainsPartialQuery {
    replyChains {
      id
      messages {
        id
        imDisplayName
        __typename
      }
      __typename
    }
  }
`;

describe("ForestRunCache", () => {
  // const data = { ...dataJSON };

  test("write", () => {
    const client = createClient();
    client.writeQuery({
      query: document,
      data,
    });

    const nextData = cloneDeep({ ...data });
    nextData.replyChains[0].messages[0].content = "Foo";

    client.writeQuery({
      query: document,
      data: nextData,
    });

    const result = client.readQuery({
      query: document,
    });
    expect(result).not.toBe(nextData);
    expect(result).toEqual(nextData);
  });

  test("watch", () => {
    const client = createClient();

    const watched = [];

    client.cache.watch({
      query: partial,
      optimistic: false,
      callback(next) {
        watched.push(next.result);
      },
    });

    const partialData = filter(partial, data);
    client.writeQuery({
      query: partial,
      data: partialData,
    });
    expect(watched.length).toEqual(1);

    const nextData = cloneDeep(data);
    nextData.replyChains[0].messages[0].imDisplayName = "Foo";

    client.writeQuery({
      query: document,
      data: nextData,
    });
    expect(watched.length).toEqual(2);
    expect(watched[1]).not.toEqual(partialData);
    expect(watched[1]).toEqual(filter(partial, nextData));

    const otherResult = client.readQuery({
      query: partial,
    });
    expect(otherResult).not.toEqual(partialData);
    expect(otherResult).toEqual(filter(partial, nextData));
  });

  test("watch - no writes", () => {
    const client = createClient();

    const watched = [];
    client.cache.watch({
      query: partial,
      optimistic: false,
      callback(next) {
        watched.push(next.result);
      },
    });

    const partialData = filter(partial, data);

    const nextData = cloneDeep(data);
    nextData.replyChains[0].messages[0].imDisplayName = "Foo";

    client.writeQuery({
      query: document,
      data: nextData,
    });
    expect(watched.length).toEqual(1);
    expect(watched[0]).not.toEqual(partialData);
    expect(watched[0]).toEqual(filter(partial, nextData));

    const otherResult = client.readQuery({
      query: partial,
    });
    expect(otherResult).not.toEqual(partialData);
    expect(otherResult).toEqual(filter(partial, nextData));
  });

  test("update", () => {
    const client = createClient();
    client.writeQuery({
      query: document,
      data,
    });

    const nextData = updateScalarFields(data);

    client.writeQuery({
      query: document,
      data: nextData,
    });

    const result = client.readQuery({
      query: document,
    });
    expect(result).not.toBe(nextData);
    expect(result).toEqual(nextData);
  });

  test("update - with watcher", () => {
    const client = createClient();

    const watched = [];

    client.cache.watch({
      query: partial,
      optimistic: false,
      callback(next) {
        watched.push(next.result);
      },
    });

    client.writeQuery({
      query: document,
      data,
    });

    const nextData = updateScalarFields(data);

    client.writeQuery({
      query: document,
      data: nextData,
    });

    const partialResult = filter(partial, nextData);

    expect(watched[1]).toEqual(partialResult);
  });

  test("read, same query shape", () => {
    const client = createClient();
    client.writeQuery({
      query: document,
      data,
    });

    const equalDoc = cloneDeep(document);
    const result = client.readQuery({
      query: equalDoc,
    });
    expect(result).toEqual(data);
  });
});

/**
 * Swaps out any scalar fields (except id and __typename), replacing them with
 * new values, in order to simulate an updated response.
 */
function updateScalarFields(response: any) {
  return cloneDeepWith(response, (value, key) => {
    if (key === "id") return;
    if (key === "__typename") return;
    if (typeof value === "string") return `new ${value}`;
    if (typeof value === "number") return value + 1;
    if (typeof value === "boolean") return !value;
  });
}

function createClient(): ApolloClient<any> {
  return new ApolloClient({
    cache: new ForestRunCache(),
  });
}
