import {TextResponse} from "./TextResponse.js";

export class JsonResponse<T> extends TextResponse {
    /**
     * Construct a new JsonResponse.
     * @param json The JSON data to send in the response body.
     * @param [statusCode=200] The HTTP response status code to send.
     * @param [headers] The HTTP response headers to send.
     */
    public constructor(json: T, statusCode = 200, headers?: HeadersInit) {
        super(JsonResponse.serialise(json), statusCode, headers);
    }

    protected static serialise(value: any): string {
        return JSON.stringify(value, ((_, v) => {
            if (v instanceof Date)
                return v.toISOString();
            if (typeof v === "bigint")
                return v <= BigInt(Number.MAX_SAFE_INTEGER)
                       ? Number(v)
                       : v.toString();
            return v;
        }));
    }
}
