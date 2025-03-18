import http from "node:http";
import {Request} from "../Request.js";
import {Response} from "./Response.js";

/**
 * A response that contains buffered data.
 */
export abstract class BufferResponse<A> extends Response<A> {
    /**
     * Fetch the buffer to send in the response body.
     */
    protected abstract readBuffer(): Uint8Array | Promise<Uint8Array>;

    protected override async send(res: http.ServerResponse, req?: Request<A>): Promise<void> {
        const buffer = await this.readBuffer();
        if (req !== undefined) {
            if (res.chunkedEncoding)
                req._responseHeaders.set("transfer-encoding", "chunked");
            else
                req._responseHeaders.set("content-length", buffer.byteLength.toString());
        }
        this.writeHead(res, req);
        res.end(buffer);
    }
}
