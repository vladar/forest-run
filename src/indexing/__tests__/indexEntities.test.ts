import { gql } from "@apollo/client";

import { indexEntities } from "../indexEntities";
import * as data from "./response.json";
import { IndexedFields } from "../IndexedFields";

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

describe("indexEntities", () => {
  it("indexes", () => {
    const indexFields = IndexedFields.fromOperation({
      document,
      variables: {},
    });

    const indexedEntities = indexEntities(data as any, indexFields);

    const expectedIds = [
      "Query:root",
      "ReplyChains:1532047762553",
      "Message:1532189085375",
      "Message:1532188751172",
      "Message:1532188627453",
      "Message:1532188489625",
      "Message:1532136452575",
      "Message:1532136452075",
      "Message:1532135302916",
      "Message:1532047762553",
      "ReplyChains:1532134832960",
      "Message:1532134832960",
      "ReplyChains:1531943421121",
      "Message:1532073426574",
      "Message:1532027136712",
      "Message:1531943421121",
      "ReplyChains:1531940671824",
      "Message:1531940671824",
      "ReplyChains:1531940668590",
      "Message:1531940668590",
    ];

    expect(Array.from(indexedEntities.keys())).toEqual(expectedIds);

    const messageChunks = indexedEntities.get("Message:1532189085375");
    expect(messageChunks.length).toEqual(1);
    expect(messageChunks[0].dataPath).toEqual([
      "replyChains",
      0,
      "messages",
      0,
    ]);
    expect(messageChunks[0].reference).toMatchObject({
      __typename: "Message",
      emotions: null,
      id: "1532189085375",
      imDisplayName: "Brian MacDonald",
      messageType: "Text",
      originalArrivalTime: "2018-07-21T16:04:45.375Z",
    });
  });
});
