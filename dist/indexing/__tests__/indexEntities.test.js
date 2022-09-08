import { __makeTemplateObject } from "tslib";
import { gql } from "@apollo/client";
import { indexEntities } from "../indexEntities";
import * as data from "./response.json";
import { IndexedFields } from "../IndexedFields";
var document = gql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n  query operationReplyChainsQuery {\n    replyChains {\n      id\n      messages {\n        content\n        originalArrivalTime\n        imDisplayName\n        id\n        from\n        messageType\n        emotions {\n          __typename\n          key\n          users {\n            __typename\n            id\n          }\n        }\n        __typename\n      }\n      __typename\n    }\n  }\n"], ["\n  query operationReplyChainsQuery {\n    replyChains {\n      id\n      messages {\n        content\n        originalArrivalTime\n        imDisplayName\n        id\n        from\n        messageType\n        emotions {\n          __typename\n          key\n          users {\n            __typename\n            id\n          }\n        }\n        __typename\n      }\n      __typename\n    }\n  }\n"])));
describe("indexEntities", function () {
    it("indexes", function () {
        var indexFields = IndexedFields.fromOperation({
            document: document,
            variables: {}
        });
        var indexedEntities = indexEntities(data, indexFields);
        var expectedIds = [
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
        var messageChunks = indexedEntities.get("Message:1532189085375");
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
            originalArrivalTime: "2018-07-21T16:04:45.375Z"
        });
    });
});
var templateObject_1;
//# sourceMappingURL=indexEntities.test.js.map