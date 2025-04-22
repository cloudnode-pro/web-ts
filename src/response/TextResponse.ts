import http from "node:http";
import {Request} from "../Request.js";
import {BufferResponse} from "./BufferResponse.js";

/**
 * An HTTP response with a plain text body.
 */
export class TextResponse<A> extends BufferResponse<A> {
    protected override readonly buffer: Uint8Array;
    private readonly encoder = new TextEncoder();

    /**
     * Construct a new TextResponse.
     * @param text The plain text body of the response.
     * @param [statusCode=200] The HTTP response status code to send.
     * @param [headers] The HTTP response headers to send.
     */
    public constructor(text: string, statusCode = 200, headers?: HeadersInit) {
        super(statusCode, headers);
        this.buffer = this.encoder.encode(text);
    }

    public override allHeaders(res: http.ServerResponse, req?: Request<A>): Headers {
        const headers = super.allHeaders(res, req);
        if (!headers.has("content-type"))
            headers.set("content-type", "text/plain");
        return headers;
    }
}
