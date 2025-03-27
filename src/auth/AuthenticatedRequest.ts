import {Request} from "../Request.js";
import {Response, ThrowableResponse} from "../response/index.js";
import {ServerErrorRegistry} from "../ServerErrorRegistry.js";
import {Authorisation} from "./Authorisation.js";
import {Permissible} from "./Permissible.js";
import {Permission} from "./Permission.js";

/**
 * A request with available {@link Authorisation}.
 */
export class AuthenticatedRequest<A> extends Request<A> implements Permissible {
    /**
     * This request’s authorisation.
     */
    public readonly authorisation: Authorisation<A>;

    /**
     * Create a new authenticated request.
     * @param authorisation
     * @param args The arguments to pass to the {@link Request} constructor.
     */
    public constructor(
        authorisation: Authorisation<A>,
        ...args: ConstructorParameters<typeof Request<A>>
    ) {
        super(...args);
        this.authorisation = authorisation;
    }

    /**
     * Check if the request has the specified permission.
     * @param permission
     */
    public has(permission: Permission): boolean {
        return this.authorisation.has(permission);
    }

    /**
     * Require the request to have all the specified permissions.
     * @param permissions The required permission.
     * @param [response] Throw this response if the request does not have the permission. Defaults to 403 from
     *     {@link ServerErrorRegistry}.
     * @throws {@link ThrowableResponse} If the request does not have the permission.
     */
    public require(permissions: Iterable<Permission>, response?: Response<A>): void;

    /**
     * Require the request to have the specified permission.
     * @param permission The required permission.
     * @param [response] Throw this response if the request does not have the permission. Defaults to 403 from
     *     {@link ServerErrorRegistry}.
     * @throws {@link ThrowableResponse} If the request does not have the permission.
     */
    public require(permission: Permission, response?: Response<A>): void;
    public require(required: Permission | Iterable<Permission>, response?: Response<A>): void {
        if (required instanceof Permission) {
            if (!this.has(required))
                throw new ThrowableResponse(
                    response ?? this.server.errors._get(ServerErrorRegistry.ErrorCodes.NO_PERMISSION, this)
                );
        }
        else for (const permission of required) {
            if (!this.has(permission))
                throw new ThrowableResponse(
                    response ?? this.server.errors._get(ServerErrorRegistry.ErrorCodes.NO_PERMISSION, this)
                );
        }
    }
}
