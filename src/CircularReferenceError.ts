/* istanbul ignore file */
import * as pointer from 'json-pointer';
import {CustomError} from 'ts-custom-error';

export default class CircularReferenceError extends CustomError {
    public readonly references: string[];
    public readonly path: string;

    public constructor (references: string[]) {
        super(`Circular reference found at "${pointer.compile(references)}"'`);

        this.references = references;
        this.path = pointer.compile(this.references);
    }
}
