import http from "node:http";
import stream from "node:stream/promises";
import {Request} from "../Request.js";
import {Response} from "./Response.js";

/**
 * A response that streams data from a readable stream.
 */
export class StreamedResponse<A> extends Response<A> {
    private readonly stream: NodeJS.ReadableStream;

    /**
     * Construct a StreamedResponse.
     * @param stream The readable stream to send in the response body.
     * @param [statusCode=200] The HTTP response status code to send.
     * @param [headers] The HTTP response headers to send.
     */
    public constructor(stream: NodeJS.ReadableStream, statusCode = 200, headers?: HeadersInit) {
        super(statusCode, headers);
        this.stream = stream;
        if (!this.headers.has("transfer-encoding")) this.headers.set("transfer-encoding", "chunked");
    }

    protected override async send(res: http.ServerResponse, req?: Request<A>): Promise<void> {
        this.writeHead(res, req);
        await stream.pipeline(this.stream, res);
    }
}
