/* istanbul ignore file */
import * as pointer from 'json-pointer';
import {CustomError} from 'ts-custom-error';

export default class InvalidValueError extends CustomError {
    public readonly references: string[];
    public readonly value: any;
    public readonly path: string;

    public constructor (message: string, value: any, references: string[]) {
        super(`Invalid value at "${pointer.compile(references)}" (${message}})`);

        this.references = references;
        this.value = value;
        this.path = pointer.compile(this.references);
    }
}
