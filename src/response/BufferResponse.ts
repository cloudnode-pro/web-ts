import http from "node:http";
import {Response} from "./Response.js";

/**
 * A response that contains buffered data.
 */
export abstract class BufferResponse extends Response {
    /**
     * Fetch the buffer to send in the response body.
     */
    protected abstract readBuffer(): Uint8Array | Promise<Uint8Array>;

    protected override async send(res: http.ServerResponse): Promise<void> {
        this.writeHead(res);
        const buffer = await this.readBuffer();
        res.end(buffer);
    }
}
