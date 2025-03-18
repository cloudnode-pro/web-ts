import http from "node:http";
import {Request} from "../Request.js";
import {Response} from "./Response.js";

/**
 * A server response without body (204).
 */
export class EmptyResponse<A> extends Response<A> {
    /**
     * Construct a new EmptyResponse.
     * @param [headers] The HTTP response headers to send.
     * @param [status] The HTTP response status code to send.
     */
    public constructor(headers?: HeadersInit, status = 204) {
        super(status, headers);
    }

    protected override async send(res: http.ServerResponse, req?: Request<A>): Promise<void> {
        if (req !== undefined)
            req._responseHeaders.set("content-length", "0");
        this.writeHead(res, req);
        res.end();
    }
}
