import {Authorisation} from "./auth/Authorisation.js";
import {Request} from "./Request.js";

export class AuthenticatedRequest<A> extends Request<A> {
    public readonly authorisation: Authorisation<A>;
    public constructor(
        authorisation: Authorisation<A>,
        ...args: ConstructorParameters<typeof Request<A>>
    ) {
        super(...args);
        this.authorisation = authorisation;
    }
}
