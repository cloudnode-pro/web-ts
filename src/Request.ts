import {IPAddress, IPv4, IPv6} from "@cldn/ip";
import {Multipart} from "multipart-ts";
import http, {OutgoingHttpHeader} from "node:http";
import stream from "node:stream";

/**
 * An incoming HTTP request from a connected client.
 */
export class Request {
    /**
     * The request method.
     */
    public readonly method: Request.Method;

    /**
     * The request URL.
     */
    public readonly url: Readonly<URL>;

    /**
     * The request headers.
     */
    public readonly headers: Readonly<Headers>;

    /**
     * Request body readable stream.
     */
    public readonly bodyStream: stream.Readable;

    /**
     * IP address of request sender.
     */
    public readonly ip: IPv4 | IPv6;

    /**
     * Construct a new Request.
     * @param method See {@link Request#method}.
     * @param url See {@link Request#url}.
     * @param headers See {@link Request#headers}.
     * @param bodyStream See {@link Request#bodyStream}.
     * @param ip See {@link Request#ip}.
     */
    protected constructor(
        method: Request["method"],
        url: Request["url"],
        headers: Request["headers"],
        bodyStream: Request["bodyStream"],
        ip: Request["ip"],
    ) {
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.bodyStream = bodyStream;
        this.ip = ip;
    }

    /**
     * Create a new Request from a Node.js incoming HTTP request.
     * @throws {@link Request.BadUrlError} If the request URL is invalid.
     * @throws {@link Request.SocketClosedError} If the request socket was closed before the request could be handled.
     */
    public static incomingMessage(incomingMessage: http.IncomingMessage) {
        const auth =
            incomingMessage.headers.authorization
                ?.toLowerCase()
                .startsWith("basic ")
            ? Buffer.from(
                incomingMessage.headers.authorization
                    .substring("basic ".length), "base64"
            ).toString()
            : null;

        const url = `http://${auth ? `${auth}@` : ""}${process.env.HOST ?? "localhost"}${incomingMessage.url ?? "/"}`;
        if (!URL.canParse(url))
            throw new Request.BadUrlError(incomingMessage.url);

        const headers = Request.headersFromNodeDict(incomingMessage.headers);

        const remoteAddress = incomingMessage.socket.remoteAddress;
        if (remoteAddress === undefined)
            throw new Request.SocketClosedError();

        return new Request(incomingMessage.method as Request.Method, new URL(url), headers, incomingMessage, IPAddress.fromString(remoteAddress));
    }

    /**
     * @internal
     */
    public static headersFromNodeDict(headers: Record<string, OutgoingHttpHeader | undefined>): Headers {
        return new Headers(Object.entries(headers)
            .filter((e) => e[1] !== undefined)
            .flatMap<[string, string]>(([key, value]) =>
                value instanceof Array
                ? value.map<[string, string]>(v => [key, v])
                : [[key, String(value)]]
            )
        );
    }

    /**
     * Returns a boolean value that declares whether the body has been read yet.
     */
    public bodyUsed(): boolean {
        return this.bodyStream.readable && !this.bodyStream.readableDidRead;
    }

    /**
     * Returns a promise that resolves with an ArrayBuffer representation of the request body.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     */
    public async arrayBuffer(): Promise<ArrayBuffer> {
        return (await this.blob()).arrayBuffer();
    }

    /**
     * Returns a promise that resolves with a Blob representation of the request body.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     */
    public async blob(): Promise<Blob> {
        if (this.bodyUsed()) throw new Request.BodyAlreadyConsumedError();
        const chunks: Uint8Array[] = [];
        for await (const chunk of this.bodyStream)
            chunks.push(chunk);
        return new Blob(chunks, {type: this.headers.get("Content-Type") ?? undefined});
    }

    /**
     * Returns a promise that resolves with a Uint8Array representation of the request body.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     */
    public async bytes(): Promise<Uint8Array> {
        return (await this.blob()).bytes();
    }

    /**
     * Returns a promise that resolves with a FormData representation of the request body.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     * @throws {@link !TypeError} If the request body cannot be parsed as multipart.
     */
    public async formData(): Promise<FormData> {
        return (await this.multipart()).formData();
    }

    /**
     * Returns a promise that resolves with the result of parsing the request body as JSON.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     * @throws {@link !SyntaxError} If the request body cannot be parsed as JSON.
     */
    public async json(): Promise<unknown> {
        return JSON.parse(await this.text());
    }

    /**
     * Returns a promise that resolves with a FormData representation of the request body.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     * @throws {@link !TypeError} If the request body cannot be parsed as multipart.
     */
    public async multipart(): Promise<Multipart> {
        const type = this.headers.get("Content-Type");
        if (!type)
            throw new TypeError("No Content-Type header; cannot determine multipart boundary");
        return Multipart.blob(await this.blob());
    }

    /**
     * Returns a promise that resolves with a text representation of the request body.
     * @throws {@link Request.BodyAlreadyConsumedError} If the request body has already been consumed.
     */
    public async text(): Promise<string> {
        return (await this.blob()).text();
    }
}

export namespace Request {
    export class BadUrlError extends Error {
        public constructor(public readonly path: string | undefined) {
            super(`${path} is not a valid URL.`);
        }
    }

    /**
     * The request body has already been consumed.
     */
    export class BodyAlreadyConsumedError extends Error {
        public constructor() {
            super("Body has already been consumed.");
        }
    }

    /**
     * HTTP request methods.
     */
    export const enum Method {
        ACL = "ACL",
        BIND = "BIND",
        CHECKOUT = "CHECKOUT",
        CONNECT = "CONNECT",
        COPY = "COPY",
        DELETE = "DELETE",
        GET = "GET",
        HEAD = "HEAD",
        LINK = "LINK",
        LOCK = "LOCK",
        "M-SEARCH" = "M-SEARCH",
        MERGE = "MERGE",
        MKACTIVITY = "MKACTIVITY",
        MKCALENDAR = "MKCALENDAR",
        MKCOL = "MKCOL",
        MOVE = "MOVE",
        NOTIFY = "NOTIFY",
        OPTIONS = "OPTIONS",
        PATCH = "PATCH",
        POST = "POST",
        PROPFIND = "PROPFIND",
        PROPPATCH = "PROPPATCH",
        PURGE = "PURGE",
        PUT = "PUT",
        REBIND = "REBIND",
        REPORT = "REPORT",
        SEARCH = "SEARCH",
        SOURCE = "SOURCE",
        SUBSCRIBE = "SUBSCRIBE",
        TRACE = "TRACE",
        UNBIND = "UNBIND",
        UNLINK = "UNLINK",
        UNLOCK = "UNLOCK",
        UNSUBSCRIBE = "UNSUBSCRIBE",
    }

    /**
     * Socket closed by peer.
     */
    export class SocketClosedError extends Error {
        public constructor() {
            super("The socker was closed by the peer.");
        }
    }
}
