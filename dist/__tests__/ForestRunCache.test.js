import { __assign, __makeTemplateObject } from "tslib";
import { gql, ApolloClient } from "@apollo/client";
import { filter } from "graphql-anywhere";
import { OneBigHack as ForestRunCache } from "../ForestRunCache";
import { default as data } from "../indexing/__tests__/response.json";
import { cloneDeep } from "@apollo/client/utilities";
import { cloneDeepWith } from "lodash";
var document = gql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n  query operationReplyChainsQuery {\n    replyChains {\n      id\n      messages {\n        content\n        originalArrivalTime\n        imDisplayName\n        id\n        from\n        messageType\n        emotions {\n          __typename\n          key\n          users {\n            __typename\n            id\n          }\n        }\n        __typename\n      }\n      __typename\n    }\n  }\n"], ["\n  query operationReplyChainsQuery {\n    replyChains {\n      id\n      messages {\n        content\n        originalArrivalTime\n        imDisplayName\n        id\n        from\n        messageType\n        emotions {\n          __typename\n          key\n          users {\n            __typename\n            id\n          }\n        }\n        __typename\n      }\n      __typename\n    }\n  }\n"])));
var partial = gql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n  query operationReplyChainsPartialQuery {\n    replyChains {\n      id\n      messages {\n        id\n        imDisplayName\n        __typename\n      }\n      __typename\n    }\n  }\n"], ["\n  query operationReplyChainsPartialQuery {\n    replyChains {\n      id\n      messages {\n        id\n        imDisplayName\n        __typename\n      }\n      __typename\n    }\n  }\n"])));
describe("ForestRunCache", function () {
    // const data = { ...dataJSON };
    test("write", function () {
        var client = createClient();
        client.writeQuery({
            query: document,
            data: data
        });
        var nextData = cloneDeep(__assign({}, data));
        nextData.replyChains[0].messages[0].content = "Foo";
        client.writeQuery({
            query: document,
            data: nextData
        });
        var result = client.readQuery({
            query: document
        });
        expect(result).not.toBe(nextData);
        expect(result).toEqual(nextData);
    });
    test("watch", function () {
        var client = createClient();
        var watched = [];
        client.cache.watch({
            query: partial,
            optimistic: false,
            callback: function (next) {
                watched.push(next.result);
            }
        });
        var partialData = filter(partial, data);
        client.writeQuery({
            query: partial,
            data: partialData
        });
        expect(watched.length).toEqual(1);
        var nextData = cloneDeep(data);
        nextData.replyChains[0].messages[0].imDisplayName = "Foo";
        client.writeQuery({
            query: document,
            data: nextData
        });
        expect(watched.length).toEqual(2);
        expect(watched[1]).not.toEqual(partialData);
        expect(watched[1]).toEqual(filter(partial, nextData));
        var otherResult = client.readQuery({
            query: partial
        });
        expect(otherResult).not.toEqual(partialData);
        expect(otherResult).toEqual(filter(partial, nextData));
    });
    test("watch - no writes", function () {
        var client = createClient();
        var watched = [];
        client.cache.watch({
            query: partial,
            optimistic: false,
            callback: function (next) {
                watched.push(next.result);
            }
        });
        var partialData = filter(partial, data);
        var nextData = cloneDeep(data);
        nextData.replyChains[0].messages[0].imDisplayName = "Foo";
        client.writeQuery({
            query: document,
            data: nextData
        });
        expect(watched.length).toEqual(1);
        expect(watched[0]).not.toEqual(partialData);
        expect(watched[0]).toEqual(filter(partial, nextData));
        var otherResult = client.readQuery({
            query: partial
        });
        expect(otherResult).not.toEqual(partialData);
        expect(otherResult).toEqual(filter(partial, nextData));
    });
    test("update", function () {
        var client = createClient();
        client.writeQuery({
            query: document,
            data: data
        });
        var nextData = updateScalarFields(data);
        client.writeQuery({
            query: document,
            data: nextData
        });
        var result = client.readQuery({
            query: document
        });
        expect(result).not.toBe(nextData);
        expect(result).toEqual(nextData);
    });
    test("update - with watcher", function () {
        var client = createClient();
        var watched = [];
        client.cache.watch({
            query: partial,
            optimistic: false,
            callback: function (next) {
                watched.push(next.result);
            }
        });
        client.writeQuery({
            query: document,
            data: data
        });
        var nextData = updateScalarFields(data);
        client.writeQuery({
            query: document,
            data: nextData
        });
        var partialResult = filter(partial, nextData);
        expect(watched[1]).toEqual(partialResult);
    });
    test("read, same query shape", function () {
        var client = createClient();
        client.writeQuery({
            query: document,
            data: data
        });
        var equalDoc = cloneDeep(document);
        var result = client.readQuery({
            query: equalDoc
        });
        expect(result).toEqual(data);
    });
});
/**
 * Swaps out any scalar fields (except id and __typename), replacing them with
 * new values, in order to simulate an updated response.
 */
function updateScalarFields(response) {
    return cloneDeepWith(response, function (value, key) {
        if (key === "id")
            return;
        if (key === "__typename")
            return;
        if (typeof value === "string")
            return "new ".concat(value);
        if (typeof value === "number")
            return value + 1;
        if (typeof value === "boolean")
            return !value;
    });
}
function createClient() {
    return new ApolloClient({
        cache: new ForestRunCache()
    });
}
var templateObject_1, templateObject_2;
//# sourceMappingURL=ForestRunCache.test.js.map