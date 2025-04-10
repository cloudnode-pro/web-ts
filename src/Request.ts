import {IPAddress, IPv4, IPv6} from "@cldn/ip";
import {Multipart} from "multipart-ts";
import http, {OutgoingHttpHeader} from "node:http";
import stream from "node:stream";
import {Authenticator} from "./auth/Authenticator.js";
import {Authorisation} from "./auth/Authorisation.js";
import {AuthenticatedRequest} from "./auth/AuthenticatedRequest.js";
import {Server} from "./Server.js";

/**
 * An incoming HTTP request from a connected client.
 */
export class Request<A> {
    /**
     * The request method.
     */
    public readonly method: Request.Method;

    /**
     * The original request address, as sent by the last peer. The {@link !URL} `protocol` is always set to `http:` and
     * the `host` (and related) are always taken from the `HOST` environment variable or defaulted to `localhost`.
     *
     * If basic authentication is available to this request via headers, the `username` and `password` fields are
     * available in the {@link URL} object.
     */
    public readonly originalUrl: Readonly<URL>;

    /**
     * The address requested by the client (first peer). If the request originated from a trusted proxy, this address
     * will be constructed based on protocol and host provided by the proxy. If the proxy does not specify protocol,
     * `http:` will be used as a default. If the proxy does not specify host (or the proxy is not trusted), will use the
     * `Host` request header. If that is not specified either, will use the `HOST` environment variable or default to
     * `localhost`.
     *
     * If basic authentication is available to this request via headers, the `username` and `password` fields are
     * available in the {@link URL} object.
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
     * The IP address of the request sender (last peer). This might be a proxy.
     */
    public readonly originalIp: IPv4 | IPv6;

    /**
     * IP address of client (first peer). If the request originated from a trusted proxy, this will be the client IP
     * indicated by the proxy. Otherwise, if the proxy specifies no client IP, or the proxy is untrusted, this will be
     * the proxy IP and equivalent to {@link Request#originalIp}.
     */
    public readonly ip: IPv4 | IPv6;

    /**
     * The {@link Server} from which this request was received.
     */
    public readonly server: Server<A>;

    /**
     * The components of the request URL path name.
     */
    public readonly pathComponents: ReadonlyArray<string>;

    /**
     * The parsed request cookies from the {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cookie|Cookie} request header.
     */
    public readonly cookies: ReadonlyMap<string, string>;

    /**
     * Construct a new Request.
     * @param method See {@link Request#method}.
     * @param originalUrl See {@link Request#originalUrl}.
     * @param url See {@link Request#url}.
     * @param headers See {@link Request#headers}.
     * @param bodyStream See {@link Request#bodyStream}.
     * @param originalIp See {@link Request#originalIp}.
     * @param ip See {@link Request#ip}.
     * @param server See {@link Request#server}.
     * @throws {@link !URIError} If the request URL path name contains an invalid URI escape sequence.
     */
    public constructor(
        method: Request<A>["method"],
        originalUrl: Request<A>["originalUrl"],
        url: Request<A>["url"],
        headers: Request<A>["headers"],
        bodyStream: Request<A>["bodyStream"],
        originalIp: Request<A>["originalIp"],
        ip: Request<A>["ip"],
        server: Request<A>["server"]
    ) {
        this.method = method;
        this.originalUrl = originalUrl;
        this.url = url;
        this.headers = headers;
        this.bodyStream = bodyStream;
        this.originalIp = originalIp;
        this.ip = ip;
        this.server = server;

        this.pathComponents = this.url.pathname
            .split("/")
            .map(decodeURIComponent)
            .filter(component => component.length > 0);

        this.cookies = new Map(
            this.headers.get("cookie")
                ?.split("; ")
                .map(cookie => {
                    const separatorIndex = cookie.indexOf("=");
                    if (separatorIndex < 1)
                        return null;
                    const name = cookie.substring(0, separatorIndex);
                    const value = cookie.substring(separatorIndex + 1);
                    if (value.startsWith("\"") && value.endsWith("\""))
                        return [name, value.substring(1, value.length - 1)];
                    return [name, value];
                })
                .filter((cookie): cookie is [string, string] => cookie !== null)
        )
    }

    /**
     * Create a new Request from a Node.js incoming HTTP request.
     * @throws {@link Request.BadUrlError} If the request URL is invalid.
     * @throws {@link Request.SocketClosedError} If the request socket was closed before the request could be handled.
     */
    public static incomingMessage<A>(incomingMessage: http.IncomingMessage, server: Server<A>) {
        const remoteAddress = incomingMessage.socket.remoteAddress;
        if (remoteAddress === undefined)
            throw new Request.SocketClosedError();
        const ip = IPAddress.fromString(remoteAddress);
        const isTrustedProxy = server.trustedProxies.has(ip);

        const headers = Request.headersFromNodeDict(incomingMessage.headers);

        const proxy = isTrustedProxy ? this.getClientInfoFromTrustedProxy(headers) : {};

        const clientIp = proxy.ip ?? ip;

        const auth =
            incomingMessage.headers.authorization
                ?.toLowerCase()
                .startsWith("basic ")
            ? Buffer.from(
                incomingMessage.headers.authorization
                    .substring("basic ".length), "base64"
            ).toString()
            : null;

        const originalUrl = `http://${auth ? `${auth}@` : ""}${process.env.HOST ?? "localhost"}${incomingMessage.url ?? "/"}`;
        if (!URL.canParse(originalUrl))
            throw new Request.BadUrlError(incomingMessage.url);
        const clientUrl = new URL(originalUrl);
        if (proxy.protocol !== undefined)
            clientUrl.protocol = proxy.protocol + ":";

        const clientHost = proxy.host ?? headers.get("host");
        if (clientHost !== null)
            clientUrl.host = clientHost;

        try {
            return new Request<A>(
                incomingMessage.method as Request.Method,
                new URL(originalUrl),
                clientUrl,
                headers,
                incomingMessage,
                ip,
                clientIp,
                server
            );
        }
        catch (e) {
            if (e instanceof URIError)
                throw new Request.BadUrlError(incomingMessage.url);
            throw e;
        }
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
     * Extract client IP, protocol, and host, from the information provided by a trusted proxy.
     * @param headers The HTTP headers sent by a trusted proxy.
     */
    private static getClientInfoFromTrustedProxy(headers: Headers): {ip?: IPv4 | IPv6, host?: string, protocol?: "http" | "https"} {
        if (headers.has("forwarded")) {
            const forwarded = headers.get("forwarded")!.split(",")[0]!.trim();
            const forwardedPairs = forwarded.split(";");
            let ip: IPv4 | IPv6 | undefined = undefined;
            let host: string | undefined = undefined;
            let protocol: "http" | "https" | undefined = undefined;
            for (const pair of forwardedPairs) {
                let [key, value] = pair.split("=") as [key: string, value?: string];
                key = key.trim().toLowerCase();
                value = value?.trim();
                if (value === undefined || value === "")
                    continue;
                if (value.startsWith("\"") && value.endsWith("\""))
                    value = value.slice(1, -1);

                switch (key) {
                    case "for": {
                        if (ip !== undefined)
                            break;
                        const [address] = value.split(":") as [ip: string, port: `${number}`];
                        if (address.startsWith("[") && address.endsWith("]"))
                            ip = IPv6.fromString(address.slice(1, -1));
                        else
                            ip = IPv4.fromString(address);
                        break;
                    }
                    case "host": {
                        if (host !== undefined)
                            break;
                        host = value;
                        break;
                    }
                    case "proto": {
                        if (protocol !== undefined)
                            break;
                        if (value !== "http" && value !== "https")
                            break;
                        protocol = value;
                        break;
                    }
                }
            }

            return {ip, host, protocol};
        }

        let ip: IPv4 | IPv6 | undefined = undefined;
        if (headers.has("x-forwarded-for")) {
            const address = headers.get("x-forwarded-for")!.split(",")[0]!;
            ip = IPAddress.fromString(address.trim());
        }
        else if (headers.has("x-real-ip")) {
            ip = IPAddress.fromString(headers.get("x-real-ip")!.trim());
        }

        const host = headers.get("x-forwarded-host") ?? undefined;
        const proto = headers.get("x-forwarded-proto") ?? undefined;
        let protocol: "http" | "https" | undefined = undefined;
        if (proto !== undefined && proto !== "http" && proto !== "https")
            protocol = undefined;
        else
            protocol = proto;

        return {ip, host, protocol};
    }

    /**
     * Attempt to obtain authorisation for this request with one of the {@link Server}’s {@link Authenticator}s.
     * @returns `null` if the request lacks authorisation information.
     */
    public async getAuthorisation(): Promise<Authorisation<A> | null> {
        const authenticator = this.server._authenticators.find(a => a.canAuthenticate(this));
        if (authenticator === undefined) return null;
        return await authenticator.authenticate(this);
    }

    /**
     * Attempt to authenticate this request with one of the {@link Server}’s {@link Authenticator}s.
     * @returns `null` if the request lacks authorisation information.
     */
    public async authenticate(): Promise<AuthenticatedRequest<A> | null> {
        const authorisation = await this.getAuthorisation();
        if (authorisation === null) return null;
        return new AuthenticatedRequest<A>(
            authorisation,
            this.method,
            this.originalUrl,
            this.url,
            this.headers,
            this.bodyStream,
            this.originalIp,
            this.ip,
            this.server,
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

    /**
     * Response headers that the Response to this request should include.
     * @internal
     */
    public _responseHeaders = new Headers();
}

export namespace Request {
    export class BadUrlError extends Error {
        public constructor(public readonly path: string | undefined) {
            super(`${path} is not a valid URL or contains invalid URI escape sequences.`);
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
