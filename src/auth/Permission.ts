import {Permissible} from "./Permissible.js";

/**
 * Represents a permission with a unique name.
 */
export class Permission implements Permissible {
    private readonly name: string;

    /**
     * Create a new permission with the specified name.
     * @param name The name of the permission.
     */
    public constructor(name: string) {
        this.name = name;
    }

    /**
     * Get the name of this permission.
     */
    public getName(): string {
        return this.name;
    }

    /**
     * Checks if this permission matches another.
     * @param permission The permission to compare with.
     */
    public has(permission: Permission): boolean {
        return this.name === permission.name;
    }
}
