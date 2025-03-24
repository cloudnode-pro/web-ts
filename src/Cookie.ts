/**
 * A cookie that the server wants to ask the client to set.
 */
class Cookie implements Cookie.CookieOptions {
    /**
     * ```abnf
     *
     *        token          = 1*<any CHAR except CTLs or separators>
     *        separators     = "(" | ")" | "<" | ">" | "@"
     *                       | "," | ";" | ":" | "\" | <">
     *                       | "/" | "[" | "]" | "?" | "="
     *                       | "{" | "}" | SP | HT
     * ```
     * @see {@link https://www.rfc-editor.org/rfc/rfc2616.html#section-2.2|RFC 2616, Section 2.2}
     */
    private static readonly TOKEN = /^[^\x00-\x1F\x7F\x20\x09\x28\x29\x3C\x3E\x40\x2C\x3B\x3A\x5C\x22\x2F\x5B\x5D\x3F\x3D\x7B\x7D]+$/;

    /**
     * ```abnf
     * cookie-octet      = %x21 / %x23-2B / %x2D-3A / %x3C-5B / %x5D-7E
     *                       ; US-ASCII characters excluding CTLs,
     *                       ; whitespace DQUOTE, comma, semicolon,
     *                       ; and backslash
     * ```
     * @see {@link https://httpwg.org/specs/rfc6265.html#sane-set-cookie-syntax|RFC 6265, Section 4.1.1}
     */
    private static readonly COOKIE_OCTET = /^[^\x00-\x1F\x7F\x20\x09\x22\x2C\x3B\x5C]+$/;

    public readonly domain?: string;
    public readonly expires?: Date;
    public readonly httpOnly: boolean;
    public readonly maxAge?: number;
    public readonly partitioned: boolean;
    public readonly path?: string;
    public readonly sameSite?: Cookie.SameSite;
    public readonly secure: boolean;

    /**
     * The name of this cookie.
     */
    public readonly name: string;

    /**
     * The value of this cookie.
     */
    public readonly value: string;

    /**
     * @param name The name of this cookie.
     * @param value The value of this cookie.
     * @param options Cookie options.
     */
    public constructor(name: string, value: string, options?: Partial<Cookie.CookieOptions>) {
        if (!Cookie.TOKEN.test(name))
            throw new SyntaxError(`Cookie name "${name}" is not a valid "token" as per RFC 2616, Section 2.2.`);
        if (!Cookie.COOKIE_OCTET.test(value))
            throw new SyntaxError(`Cookie "${name}" value "${value}" is not a valid "*cookie-octet" as per RFC 6265, Section 4.1.1.`);
        this.name = name;
        this.value = value;
        this.domain = options?.domain;
        this.expires = options?.expires;
        this.httpOnly = options?.httpOnly ?? false;
        this.maxAge = options?.maxAge;
        this.partitioned = options?.partitioned ?? false;
        this.path = options?.path;
        this.sameSite = options?.sameSite;
        this.secure = options?.secure ?? false;
    }

    public serialise() {
        return [
            [this.name, this.value].join("="),
            this.domain !== undefined ? ["Domain", this.domain].join("=") : null,
            this.expires !== undefined ? ["Expires", this.expires.toUTCString()].join("=") : null,
            this.httpOnly ? "HttpOnly" : null,
            this.maxAge !== undefined ? ["Max-Age", this.maxAge].join("=") : null,
            this.partitioned ? "Partitioned" : null,
            this.path !== undefined ? ["Path", this.path].join("=") : null,
            this.sameSite !== undefined ? ["SameSite", this.sameSite].join("=") : null,
            this.secure ? "Secure" : null
        ].filter(p => p !== null).join("; ");
    }
}

namespace Cookie {
    export const enum SameSite {
        /**
         * Send the cookie only for requests originating from the same
         * {@link https://developer.mozilla.org/en-US/docs/Glossary/Site|site} that set the cookie.
         */
        STRICT = "Strict",

        /**
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#lax|Cookie
         * `SameSite=Lax`}
         */
        LAX = "Lax",

        /**
         * Send the cookie with both cross-site and same-site requests. The `Secure` attribute must also be set when
         * using this value.
         */
        NONE = "None"
    }

    export interface CookieOptions {
        /**
         * Defines the host to which the cookie will be sent.
         * @see {@link
         * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#domaindomain-value|Cookie
         * `Domain=<domain-value>`}
         */
        domain?: string;

        /**
         * Indicates the maximum lifetime of the cookie.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#expiresdate|Cookie
         * `Expires=<date>`}
         */
        expires?: Date;

        /**
         * Forbids JavaScript from accessing the cookie.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#httponly|Cookie
         * `HttpOnly`}
         */
        httpOnly: boolean;

        /**
         * Indicates the number of seconds until the cookie expires.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#max-agenumber|Cookie
         * `Max-Age=<number>`}
         */
        maxAge?: number;

        /**
         * Indicates that the cookie should be stored using partitioned storage.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#partitioned|Cookie
         * `Partitioned`}
         */
        partitioned: boolean;

        /**
         * Indicates the path that must exist in the requested URL for the browser to send the `Cookie` header.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#pathpath-value|Cookie
         * `Path=<path-value>`}
         */
        path?: string;

        /**
         * Controls whether or not a cookie is sent with cross-site requests.
         * @see {@link
         * https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#samesitesamesite-value|Cookie
         * `SameSite=<samesite-value>`}
         */
        sameSite?: Cookie.SameSite;

        /**
         * Indicates that the cookie is sent to the server only when a request is made with the `https:` scheme (except on
         * localhost), and therefore, is more resistant
         * to {@link https://developer.mozilla.org/en-US/docs/Glossary/MitM|man-in-the-middle} attacks.
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#secure|Cookie
         * `Secure`}
         */
        secure: boolean;
    }
}

export {Cookie};
