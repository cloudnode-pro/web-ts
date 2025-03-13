import http from "node:http";
import {Response} from "./Response.js";

/**
 * A server response without body (204).
 */
export class EmptyResponse extends Response {
    /**
     * Construct a new EmptyResponse.
     * @param [headers] The HTTP response headers to send.
     * @param [status] The HTTP response status code to send.
     */
    public constructor(headers?: HeadersInit, status = 204) {
        super(status, headers);
    }

    protected override send(res: http.ServerResponse): void {
        this.writeHead(res);
        res.end();
    }
}
