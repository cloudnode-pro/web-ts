import http from "node:http";
import {Request} from "../Request.js";
import {Server} from "../Server.js";
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

    /*protected override send(res: http.ServerResponse): void {
        this.writeHead(res);
        res.end();
    }*/

    protected override send(res: http.ServerResponse, server: Server, req?: Request): void {
        if (req !== undefined)
            req._responseHeaders.set("content-length", "0");
        this.writeHead(res, server, req);
        res.end();
    }
}
