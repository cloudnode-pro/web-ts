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
    protected abstract readonly buffer: Uint8Array;

    public override allHeaders(res: http.ServerResponse, req?: Request<A>) {
        const headers = super.allHeaders(res, req);
        if (req !== undefined) {
            if (res.chunkedEncoding) {
                if (!headers.has("transfer-encoding"))
                    headers.set("transfer-encoding", "chunked");
            }
            else if (!headers.has("content-length"))
                headers.set("content-length", this.buffer.byteLength.toString());
        }
        return headers;
    }

    protected override async send(res: http.ServerResponse, req?: Request<A>): Promise<void> {
        this.writeHead(res, req);
        res.end(this.buffer);
    }
}
