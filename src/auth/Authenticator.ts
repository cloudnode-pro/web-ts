import {Request} from "../Request.js";
import {Authorisation} from "./Authorisation.js";

export interface Authenticator<A extends any> {
    authenticate(request: Request<A>): Promise<Authorisation<A> | null>;

    canAuthenticate(request: Request<A>): boolean;
}
