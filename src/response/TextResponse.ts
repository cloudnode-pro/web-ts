import {BufferResponse} from "./BufferResponse.js";

/**
 * An HTTP response with a plain text body.
 */
export class TextResponse<A> extends BufferResponse<A> {
    /**
     * The plain text body of the response.
     */
    protected readonly text: string;
    private readonly encoder = new TextEncoder();

    /**
     * Construct a new TextResponse.
     * @param text The plain text body of the response.
     * @param [statusCode=200] The HTTP response status code to send.
     * @param [headers] The HTTP response headers to send.
     */
    public constructor(text: string, statusCode = 200, headers?: HeadersInit) {
        super(statusCode, headers);
        this.text = text;
        if (!this.headers.has("content-type"))
            this.headers.set("content-type", "text/plain");
    }

    public override readBuffer() {
        return this.encoder.encode(this.text);
    }
}
