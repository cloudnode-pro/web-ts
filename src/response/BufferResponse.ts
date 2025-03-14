import http from "node:http";
import {Request} from "../Request.js";
import {Server} from "../Server.js";
import {Response} from "./Response.js";

/**
 * A response that contains buffered data.
 */
export abstract class BufferResponse extends Response {
    /**
     * Fetch the buffer to send in the response body.
     */
    protected abstract readBuffer(): Uint8Array | Promise<Uint8Array>;

    protected override async send(res: http.ServerResponse, server: Server, req?: Request): Promise<void> {
        const buffer = await this.readBuffer();
        if (req !== undefined) {
            if (res.chunkedEncoding)
                req._responseHeaders.set("transfer-encoding", "chunked");
            else
                req._responseHeaders.set("content-length", buffer.byteLength.toString());
        }
        this.writeHead(res, server, req);
        res.end(buffer);
    }
}
